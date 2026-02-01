import { listPending, markAsError, markAsSynced, generateIdempotencyKey } from '@/services/offlineQueue';
import { VehicleService } from '@/api/services/vehicleService';
import { VehicleType } from '@/types/parking';
import { ParkiuDB } from '@/db/schema';

const db = new ParkiuDB();

function isAuthError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const status = (e as { response?: { status?: number } })?.response?.status;
  return status === 401 || /token|auth|401|unauthorized/i.test(msg);
}

function getStatusCode(e: unknown): number | undefined {
  return (e as { response?: { status?: number } })?.response?.status;
}

export async function syncPendingOperations(runCtx: {
  getToken: () => Promise<string>;
}): Promise<{ synced: number; failed: number; conflicts: number }> {
  const pending = await listPending();
  if (pending.length === 0) {
    return { synced: 0, failed: 0, conflicts: 0 };
  }

  let token = await runCtx.getToken();
  if (!token) throw new Error('No se pudo obtener el token de autenticación');

  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  for (const op of pending) {
    const runOp = async (): Promise<void> => {
      if (op.type === 'entry') {
        const result = await VehicleService.registerEntry(
          token!,
          op.parkingLotId,
          {
            plate: op.payload.plate as string,
            vehicle_type: op.payload.vehicle_type as VehicleType,
            space_number: op.payload.space_number as string | undefined
          },
          { idempotencyKey: op.idempotencyKey, clientTime: op.payload.client_entry_time as string | undefined }
        );

        // Si el servicio retorna error, lanzar excepción
        if (result.error) {
          throw new Error(result.error);
        }
      } else if (op.type === 'exit') {
        const result = await VehicleService.registerExit(
          token!,
          op.parkingLotId,
          {
            plate: op.payload.plate as string,
            payment_amount: op.payload.payment_amount as number,
            payment_method: op.payload.payment_method as 'cash' | 'card' | 'digital'
          },
          { idempotencyKey: op.idempotencyKey, clientTime: op.payload.client_exit_time as string | undefined }
        );

        // Si el servicio retorna error, lanzar excepción
        if (result.error) {
          throw new Error(result.error);
        }
      }
    };

    try {
      await runOp();
      await markAsSynced(op.id!);
      synced += 1;
    } catch (e) {
      const status = getStatusCode(e);
      const msg = e instanceof Error ? e.message : String(e);

      // ✅ CASO 1: Respuestas exitosas (200 OK / 201 Created)
      // Backend retorna 200 OK para reintentos idempotentes
      if (status === 200 || status === 201) {
        await markAsSynced(op.id!);
        synced += 1;
        continue;
      }

      // ✅ CASO 2: Conflicto de idempotencia (409 Conflict)
      // Mismo UUID con diferente payload - Regenerar UUID y reintentar
      if (status === 409) {
        console.warn(`⚠️ Conflicto de idempotencia para operación ${op.id} (placa: ${op.plate})`);

        // Generar nuevo UUID y actualizar operación para siguiente intento
        const newUUID = generateIdempotencyKey();
        await db.operations.update(op.id!, {
          idempotencyKey: newUUID,
          errorMessage: 'Conflicto de idempotencia - UUID regenerado'
        });

        conflicts += 1;
        continue;
      }

      // ✅ CASO 3: Error de validación (422 Unprocessable Entity)
      // Timestamp inválido u otro error de validación - NO reintentar
      if (status === 422) {
        console.error(`❌ Error de validación para operación ${op.id} (placa: ${op.plate}): ${msg}`);
        await markAsError(op.id!, `Validación fallida: ${msg}`);
        failed += 1;
        continue;
      }

      // ✅ CASO 4: Recurso no encontrado (404 Not Found)
      // En salidas, podría significar que el vehículo ya salió
      if (status === 404) {
        if (op.type === 'exit') {
          console.warn(`⚠️ Vehículo ${op.plate} no encontrado en parking lot ${op.parkingLotId} - posiblemente ya procesado`);
          await markAsError(op.id!, 'Vehículo no encontrado - posiblemente ya procesado');
        } else {
          console.warn(`⚠️ Recurso no encontrado para operación ${op.id}`);
          await markAsError(op.id!, 'Recurso no encontrado');
        }
        failed += 1;
        continue;
      }

      // ✅ CASO 5: Error de autenticación (401 Unauthorized)
      // Intentar refrescar token y reintentar una vez
      if (isAuthError(e)) {
        const fresh = await runCtx.getToken();
        if (fresh) {
          token = fresh;
          try {
            await runOp();
            await markAsSynced(op.id!);
            synced += 1;
            continue;
          } catch (retryErr) {
            const retryStatus = getStatusCode(retryErr);
            const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);

            // Si falla de nuevo con 401, marcar como error de auth
            if (retryStatus === 401) {
              await markAsError(op.id!, 'Error de autenticación - sesión expirada');
            } else {
              await markAsError(op.id!, retryMsg);
            }
            failed += 1;
            continue;
          }
        }
      }

      // ✅ CASO 6: Errores de servidor (5xx) u otros errores
      // Mantener en cola para reintentar después
      console.error(`❌ Error sincronizando operación ${op.id} (placa: ${op.plate}):`, msg);
      await markAsError(op.id!, msg);
      failed += 1;
    }
  }

  return { synced, failed, conflicts };
}

import { listPending, markAsError, markAsSynced } from '@/services/offlineQueue';
import { VehicleService } from '@/api/services/vehicleService';
import { VehicleType } from '@/types/parking';

function isAuthError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const status = (e as { response?: { status?: number } })?.response?.status;
  return status === 401 || /token|auth|401|unauthorized/i.test(msg);
}

export async function syncPendingOperations(runCtx: {
  getToken: () => Promise<string>;
}): Promise<{ synced: number; failed: number }> {
  const pending = await listPending();
  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let token = await runCtx.getToken();
  if (!token) throw new Error('No se pudo obtener el token de autenticación');

  let synced = 0;
  let failed = 0;

  for (const op of pending) {
    const runOp = async (): Promise<void> => {
      if (op.type === 'entry') {
        await VehicleService.registerEntry(
          token!,
          op.parkingLotId,
          {
            plate: op.payload.plate as string,
            vehicle_type: op.payload.vehicle_type as VehicleType,
            space_number: op.payload.space_number as string | undefined
          },
          { idempotencyKey: op.idempotencyKey, clientTime: op.payload.client_entry_time as string | undefined }
        );
      } else if (op.type === 'exit') {
        await VehicleService.registerExit(
          token!,
          op.parkingLotId,
          {
            plate: op.payload.plate as string,
            payment_amount: op.payload.payment_amount as number,
            payment_method: op.payload.payment_method as 'cash' | 'card' | 'digital'
          },
          { idempotencyKey: op.idempotencyKey, clientTime: op.payload.client_exit_time as string | undefined }
        );
      }
    };

    try {
      await runOp();
      await markAsSynced(op.id!);
      synced += 1;
    } catch (e) {
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
            await markAsError(op.id!, retryErr instanceof Error ? retryErr.message : String(retryErr));
            failed += 1;
            continue;
          }
        }
      }
      await markAsError(op.id!, e instanceof Error ? e.message : String(e));
      failed += 1;
    }
  }

  return { synced, failed };
}

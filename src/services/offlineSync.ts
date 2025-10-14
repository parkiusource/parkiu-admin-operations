import { listPending, markAsError, markAsSynced } from '@/services/offlineQueue';
import { VehicleService } from '@/api/services/vehicleService';
import { VehicleType } from '@/types/parking';

export async function syncPendingOperations(runCtx: {
  getToken: () => Promise<string>;
}): Promise<{ synced: number; failed: number }> {
  const pending = await listPending();
  let synced = 0;
  let failed = 0;

  const token = await runCtx.getToken();

  for (const op of pending) {
    try {
      if (op.type === 'entry') {
        await VehicleService.registerEntry(
          token,
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
          token,
          op.parkingLotId,
          {
            plate: op.payload.plate as string,
            payment_amount: op.payload.payment_amount as number,
            payment_method: op.payload.payment_method as 'cash' | 'card' | 'digital'
          },
          { idempotencyKey: op.idempotencyKey, clientTime: op.payload.client_exit_time as string | undefined }
        );
      }

      await markAsSynced(op.id!);
      synced += 1;
    } catch (e) {
      await markAsError(op.id!, e instanceof Error ? e.message : String(e));
      failed += 1;
    }
  }

  return { synced, failed };
}

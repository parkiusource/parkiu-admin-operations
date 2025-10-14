import { ParkiuDB, OfflineOperation } from '@/db/schema';

const db = new ParkiuDB();

export function generateIdempotencyKey(seed?: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as unknown as { randomUUID: () => string }).randomUUID();
  }
  const base = `${Date.now()}-${Math.random().toString(36).slice(2)}-${seed || ''}`;
  return base;
}

export async function enqueueOperation(op: Omit<OfflineOperation, 'id' | 'createdAt' | 'status'>): Promise<number> {
  const record: OfflineOperation = {
    ...op,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  return db.operations.add(record);
}

export async function getPendingCount(): Promise<number> {
  return db.operations.where('status').equals('pending').count();
}

export async function listPending(): Promise<OfflineOperation[]> {
  return db.operations.where('status').equals('pending').toArray();
}

export async function markAsSynced(id: number): Promise<void> {
  await db.operations.update(id, { status: 'synced', errorMessage: undefined });
}

export async function markAsError(id: number, message: string): Promise<void> {
  await db.operations.update(id, { status: 'error', errorMessage: message });
}

// Generic sync runner; caller provides the function to execute per operation
export async function syncPending(
  handler: (op: OfflineOperation) => Promise<void>
): Promise<{ synced: number; failed: number }> {
  const pending = await listPending();
  let synced = 0;
  let failed = 0;
  for (const op of pending) {
    try {
      await handler(op);
      await markAsSynced(op.id!);
      synced += 1;
    } catch (e) {
      await markAsError(op.id!, e instanceof Error ? e.message : String(e));
      failed += 1;
    }
  }
  return { synced, failed };
}

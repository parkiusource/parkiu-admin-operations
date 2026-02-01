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
  try {
    const id = await db.operations.add(record);

    // 🆕 Trigger sincronización después de encolar (con debounce)
    // Solo si estamos online - importación dinámica para evitar dependencias circulares
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      // Importación dinámica asíncrona para evitar bloquear la operación
      import('./connectionService').then(({ connectionService }) => {
        connectionService.triggerSyncAfterEnqueue();
      }).catch(() => {
        // Silenciar error de importación - no es crítico
      });
    }

    return id;
  } catch (error) {
    console.error('Error guardando en IndexedDB:', error);
    throw error;
  }
}

export async function getPendingCount(): Promise<number> {
  return db.operations.where('status').equals('pending').count();
}

export async function listPending(): Promise<OfflineOperation[]> {
  return db.operations.where('status').equals('pending').toArray();
}

/** Placas con salida pendiente de sincronizar (por lot opcional) para no mostrarlas como activas desde backend */
export async function getPendingExitPlates(parkingLotId?: string): Promise<Set<string>> {
  const all = await db.operations.where('status').equals('pending').toArray();
  const exits = all.filter(op => op.type === 'exit' && (!parkingLotId || op.parkingLotId === parkingLotId));
  return new Set(exits.map(op => (op.plate || '').toUpperCase()).filter(Boolean));
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

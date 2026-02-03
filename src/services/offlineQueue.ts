import { ParkiuDB, OfflineOperation } from '@/db/schema';

const db = new ParkiuDB();

/**
 * Genera un UUID v4 usando crypto.randomUUID() (nativo del navegador)
 * Fallback mejorado para navegadores antiguos que no soporten crypto.randomUUID()
 */
export function generateIdempotencyKey(): string {
  // Usar crypto.randomUUID() si está disponible (navegadores modernos)
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }

  // Fallback mejorado para navegadores antiguos
  // Genera un UUID v4 válido según RFC 4122
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Valida que un string sea un UUID v4 válido
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Valida que un timestamp sea válido y no esté en el futuro ni sea muy antiguo
 */
export function validateTimestamp(timestamp: string, maxAgeHours: number = 48): { valid: boolean; error?: string } {
  try {
    const date = new Date(timestamp);
    const now = new Date();

    // Verificar formato válido
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Formato de timestamp inválido' };
    }

    // No futuro (con margen de 5 minutos para diferencias de reloj)
    if (date.getTime() > now.getTime() + (5 * 60 * 1000)) {
      return { valid: false, error: 'Timestamp no puede estar en el futuro' };
    }

    // No muy antiguo (max 48 horas según backend)
    const ageHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (ageHours > maxAgeHours) {
      return { valid: false, error: `Timestamp muy antiguo (máximo ${maxAgeHours}h)` };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Error al validar timestamp' };
  }
}

/**
 * Valida el payload de una operación de entrada
 */
function validateEntryPayload(payload: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!payload.plate || typeof payload.plate !== 'string' || payload.plate.trim().length === 0) {
    return { valid: false, error: 'Placa es requerida' };
  }

  const validVehicleTypes = ['car', 'motorcycle', 'truck', 'bicycle'];
  if (!payload.vehicle_type || !validVehicleTypes.includes(payload.vehicle_type as string)) {
    return { valid: false, error: 'Tipo de vehículo inválido' };
  }

  return { valid: true };
}

/**
 * Valida el payload de una operación de salida
 */
function validateExitPayload(payload: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!payload.plate || typeof payload.plate !== 'string' || payload.plate.trim().length === 0) {
    return { valid: false, error: 'Placa es requerida' };
  }

  // ✅ Permitir payment_amount = 0 para casos de cortesía/salida sin cobro
  if (payload.payment_amount == null || typeof payload.payment_amount !== 'number' || payload.payment_amount < 0) {
    return { valid: false, error: 'Monto de pago debe ser mayor o igual a 0' };
  }

  const validPaymentMethods = ['cash', 'card', 'digital'];
  if (!payload.payment_method || !validPaymentMethods.includes(payload.payment_method as string)) {
    return { valid: false, error: 'Método de pago inválido' };
  }

  return { valid: true };
}

export async function enqueueOperation(op: Omit<OfflineOperation, 'id' | 'createdAt' | 'status'>): Promise<number> {
  // ✅ VALIDACIÓN 1: UUID de idempotencia
  if (!validateUUID(op.idempotencyKey)) {
    throw new Error('Formato de UUID inválido para idempotency key');
  }

  // ✅ VALIDACIÓN 2: Payload según tipo de operación
  const payloadValidation = op.type === 'entry'
    ? validateEntryPayload(op.payload)
    : validateExitPayload(op.payload);

  if (!payloadValidation.valid) {
    throw new Error(`Payload inválido: ${payloadValidation.error}`);
  }

  // ✅ VALIDACIÓN 3: Timestamps
  if (op.type === 'entry' && op.payload.client_entry_time) {
    const validation = validateTimestamp(op.payload.client_entry_time as string);
    if (!validation.valid) {
      throw new Error(`Timestamp de entrada inválido: ${validation.error}`);
    }
  }

  if (op.type === 'exit' && op.payload.client_exit_time) {
    const validation = validateTimestamp(op.payload.client_exit_time as string);
    if (!validation.valid) {
      throw new Error(`Timestamp de salida inválido: ${validation.error}`);
    }
  }

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

/**
 * Lista operaciones pendientes Y con error (para mostrar en UI)
 * Útil para PendingOperationsList que necesita mostrar ambos estados
 */
export async function listPendingAndErrors(): Promise<OfflineOperation[]> {
  const pending = await db.operations.where('status').equals('pending').toArray();
  const errors = await db.operations.where('status').equals('error').toArray();
  return [...pending, ...errors].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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

/**
 * Limpia operaciones antiguas que superan el límite de edad del backend (48 horas)
 * Esto evita acumulación de operaciones obsoletas que ya no pueden sincronizarse
 */
export async function cleanupOldOperations(maxAgeHours: number = 48): Promise<number> {
  const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

  const old = await db.operations
    .where('createdAt')
    .below(cutoffDate)
    .toArray();

  let cleaned = 0;
  for (const op of old) {
    await db.operations.delete(op.id!);
    cleaned++;
  }

  if (cleaned > 0) {
    console.warn(`🧹 Limpiadas ${cleaned} operaciones con más de ${maxAgeHours}h de antigüedad`);
  }

  return cleaned;
}

/**
 * 🔄 Servicio de Caché Offline para Admin Dashboard
 *
 * Gestiona el almacenamiento y recuperación de datos en IndexedDB
 * para permitir funcionamiento offline cuando el backend no está disponible.
 */

import { ParkiuDB, CachedParkingLot, CachedParkingSpaces, CachedTransactionHistory } from '@/db/schema';
import { ParkingLot, ParkingSpot } from '@/services/parking/types';

const db = new ParkiuDB();

// Tiempo máximo de validez del caché (24 horas)
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// ===============================
// PARKING LOTS CACHE
// ===============================

/**
 * Guarda un parking lot en el caché local
 */
export async function cacheParkingLot(parkingLot: ParkingLot): Promise<void> {
  if (!parkingLot.id) return;

  try {
    const cached: CachedParkingLot = {
      id: parkingLot.id,
      data: parkingLot as unknown as Record<string, unknown>,
      cachedAt: new Date().toISOString()
    };

    await db.cachedParkingLots.put(cached);
  } catch (error) {
    console.error('Error caching parking lot:', error);
  }
}

/**
 * Guarda múltiples parking lots en el caché
 */
export async function cacheParkingLots(parkingLots: ParkingLot[]): Promise<void> {
  try {
    const cachedItems: CachedParkingLot[] = parkingLots
      .filter(lot => lot.id)
      .map(lot => ({
        id: lot.id!,
        data: lot as unknown as Record<string, unknown>,
        cachedAt: new Date().toISOString()
      }));

    if (cachedItems.length > 0) {
      await db.cachedParkingLots.bulkPut(cachedItems);
    }
  } catch (error) {
    console.error('Error caching parking lots:', error);
  }
}

/**
 * Obtiene todos los parking lots del caché
 */
export async function getCachedParkingLots(): Promise<ParkingLot[] | null> {
  try {
    const cached = await db.cachedParkingLots.toArray();

    if (cached.length === 0) {
      return null;
    }

    // Verificar si el caché más reciente no ha expirado
    const mostRecent = cached.reduce((a, b) =>
      new Date(a.cachedAt) > new Date(b.cachedAt) ? a : b
    );

    const cacheAge = Date.now() - new Date(mostRecent.cachedAt).getTime();
    if (cacheAge > CACHE_MAX_AGE_MS) {
      return null;
    }

    const parkingLots = cached.map(c => c.data as unknown as ParkingLot);

    return parkingLots;
  } catch (error) {
    console.error('Error getting cached parking lots:', error);
    return null;
  }
}

/**
 * Obtiene un parking lot específico del caché
 */
export async function getCachedParkingLot(id: string): Promise<ParkingLot | null> {
  try {
    const cached = await db.cachedParkingLots.get(id);

    if (!cached) {
      return null;
    }

    const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
    if (cacheAge > CACHE_MAX_AGE_MS) {
      return null;
    }

    return cached.data as unknown as ParkingLot;
  } catch (error) {
    console.error('Error getting cached parking lot:', error);
    return null;
  }
}

// ===============================
// PARKING SPACES CACHE
// ===============================

/**
 * Guarda los espacios de un parking lot en el caché
 */
export async function cacheParkingSpaces(
  parkingLotId: string,
  spaces: ParkingSpot[]
): Promise<void> {
  try {
    const cached: CachedParkingSpaces = {
      parkingLotId,
      spaces: spaces as unknown as Record<string, unknown>[],
      cachedAt: new Date().toISOString()
    };

    await db.cachedParkingSpaces.put(cached);
  } catch (error) {
    console.error('Error caching parking spaces:', error);
  }
}

/**
 * Obtiene los espacios de un parking lot del caché
 */
export async function getCachedParkingSpaces(
  parkingLotId: string
): Promise<ParkingSpot[] | null> {
  try {
    const cached = await db.cachedParkingSpaces.get(parkingLotId);

    if (!cached) {
      return null;
    }

    const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
    if (cacheAge > CACHE_MAX_AGE_MS) {
      return null;
    }

    const spaces = cached.spaces as unknown as ParkingSpot[];

    return spaces;
  } catch (error) {
    console.error('Error getting cached parking spaces:', error);
    return null;
  }
}

/**
 * 🔄 Actualiza el estado de un espacio específico en el caché persistente
 *
 * CRÍTICO para offline-first: Cuando se registran entradas/salidas offline,
 * necesitamos actualizar el estado del espacio en IndexedDB para que persista
 * en recargas de página.
 *
 * @param parkingLotId - ID del parking lot
 * @param spaceNumber - Número del espacio (ej: "A-1")
 * @param newStatus - Nuevo estado del espacio
 */
export async function updateCachedParkingSpaceStatus(
  parkingLotId: string,
  spaceNumber: string,
  newStatus: 'available' | 'occupied' | 'maintenance' | 'reserved'
): Promise<void> {
  try {
    const cached = await db.cachedParkingSpaces.get(parkingLotId);

    if (!cached) {
      console.warn(`⚠️ No cached spaces found for parking lot ${parkingLotId} - cannot update space ${spaceNumber}`);
      return;
    }

    const spaces = cached.spaces as unknown as ParkingSpot[];
    const spaceExists = spaces.some(space => space.number === spaceNumber);

    if (!spaceExists) {
      console.warn(`⚠️ Space ${spaceNumber} not found in cached spaces for parking lot ${parkingLotId}`);
      return;
    }

    const updatedSpaces = spaces.map(space =>
      space.number === spaceNumber
        ? {
            ...space,
            status: newStatus,
            last_status_change: new Date().toISOString()
          }
        : space
    );

    await db.cachedParkingSpaces.put({
      parkingLotId,
      spaces: updatedSpaces as unknown as Record<string, unknown>[],
      cachedAt: cached.cachedAt // Mantener fecha de caché original
    });

    console.log(`✅ Updated space ${spaceNumber} to ${newStatus} in persistent cache (parking lot: ${parkingLotId})`);
  } catch (error) {
    console.error(`❌ Error updating cached parking space status for ${spaceNumber}:`, error);
  }
}

// ===============================
// TRANSACTION HISTORY CACHE (offline-first historial)
// ===============================

export type TransactionHistoryFilters = {
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
  plate?: string;
  status?: 'active' | 'completed';
  payment_method?: 'cash' | 'card' | 'digital';
};

function transactionHistoryFilterKey(filters: TransactionHistoryFilters = {}): string {
  const normalized = {
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
    date_from: filters.date_from ?? '',
    date_to: filters.date_to ?? '',
    plate: (filters.plate ?? '').trim().toUpperCase(),
    status: filters.status ?? '',
    payment_method: filters.payment_method ?? ''
  };
  return JSON.stringify(normalized);
}

const MAX_HISTORY_CACHE_ENTRIES_PER_LOT = 15;

/**
 * Guarda historial de transacciones en IndexedDB para uso offline.
 * Mantiene como máximo MAX_HISTORY_CACHE_ENTRIES_PER_LOT entradas por parkingLotId (FIFO).
 */
export async function cacheTransactionHistory(
  parkingLotId: string,
  filters: TransactionHistoryFilters,
  transactions: Record<string, unknown>[]
): Promise<void> {
  try {
    const filterKey = transactionHistoryFilterKey(filters);
    const id = `${parkingLotId}_${filterKey}`;

    const entries = await db.cachedTransactionHistory
      .where('parkingLotId')
      .equals(parkingLotId)
      .sortBy('cachedAt');

    const isNewKey = !entries.some((e) => e.id === id);
    if (isNewKey && entries.length >= MAX_HISTORY_CACHE_ENTRIES_PER_LOT) {
      const toDelete = entries.slice(0, entries.length - MAX_HISTORY_CACHE_ENTRIES_PER_LOT + 1);
      for (const e of toDelete) {
        await db.cachedTransactionHistory.delete(e.id);
      }
    }

    const cached: CachedTransactionHistory = {
      id,
      parkingLotId,
      filterKey,
      transactions,
      cachedAt: new Date().toISOString()
    };
    await db.cachedTransactionHistory.put(cached);
  } catch (error) {
    console.error('Error caching transaction history:', error);
  }
}

/**
 * Obtiene historial de transacciones del caché (IndexedDB).
 * Retorna null si no hay datos o el caché expiró (TTL 24h).
 */
export async function getCachedTransactionHistory(
  parkingLotId: string,
  filters: TransactionHistoryFilters
): Promise<Record<string, unknown>[] | null> {
  try {
    const filterKey = transactionHistoryFilterKey(filters);
    const id = `${parkingLotId}_${filterKey}`;
    const cached = await db.cachedTransactionHistory.get(id);

    if (!cached) return null;

    const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
    if (cacheAge > CACHE_MAX_AGE_MS) return null;

    return cached.transactions;
  } catch (error) {
    console.error('Error getting cached transaction history:', error);
    return null;
  }
}

// ===============================
// UTILIDADES
// ===============================

/**
 * Limpia todo el caché (útil para debugging o logout)
 */
export async function clearAllCache(): Promise<void> {
  try {
    await db.cachedParkingLots.clear();
    await db.cachedParkingSpaces.clear();
    await db.cachedTransactionHistory.clear();
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Obtiene información del estado del caché
 */
export async function getCacheStats(): Promise<{
  parkingLotsCount: number;
  parkingSpacesEntries: number;
  transactionHistoryEntries: number;
  oldestEntry: string | null;
}> {
  try {
    const lots = await db.cachedParkingLots.count();
    const spaces = await db.cachedParkingSpaces.count();
    const transactionHistoryEntries = await db.cachedTransactionHistory.count();

    const allLots = await db.cachedParkingLots.toArray();
    const oldest = allLots.length > 0
      ? allLots.reduce((a, b) =>
          new Date(a.cachedAt) < new Date(b.cachedAt) ? a : b
        ).cachedAt
      : null;

    return {
      parkingLotsCount: lots,
      parkingSpacesEntries: spaces,
      transactionHistoryEntries,
      oldestEntry: oldest
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      parkingLotsCount: 0,
      parkingSpacesEntries: 0,
      transactionHistoryEntries: 0,
      oldestEntry: null
    };
  }
}

/**
 * Verifica si un error es de conexión al backend
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('err_connection') ||
      message.includes('failed to fetch') ||
      message.includes('timeout') ||
      message.includes('econnrefused')
    );
  }
  return false;
}

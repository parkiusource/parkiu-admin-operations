/**
 * 🚗 Servicio de Caché de Vehículos Activos (Offline-First)
 *
 * Gestiona el almacenamiento local de vehículos activos para permitir
 * operaciones de entrada/salida completamente offline.
 */

import { ParkiuDB, ActiveVehicleCache } from '@/db/schema';
import { ActiveVehicle } from '@/types/parking';

const db = new ParkiuDB();

// ===============================
// HELPERS
// ===============================

/**
 * Genera ID único para vehículo activo
 */
function getVehicleId(parkingLotId: string, plate: string): string {
  return `${parkingLotId}-${plate.toUpperCase()}`;
}

/**
 * Convierte ActiveVehicle (del backend) a ActiveVehicleCache (local)
 */
function toCache(
  parkingLotId: string,
  vehicle: ActiveVehicle,
  transactionId?: number
): ActiveVehicleCache {
  return {
    id: getVehicleId(parkingLotId, vehicle.plate),
    parkingLotId,
    plate: vehicle.plate.toUpperCase(),
    vehicleType: vehicle.vehicle_type,
    spotNumber: vehicle.spot_number,
    entryTime: vehicle.entry_time,
    transactionId,
    syncStatus: transactionId ? 'synced' : 'local',
    cachedAt: new Date().toISOString()
  };
}

/**
 * Convierte ActiveVehicleCache (local) a ActiveVehicle (formato frontend)
 */
function fromCache(cached: ActiveVehicleCache): ActiveVehicle {
  const now = new Date();
  const entry = new Date(cached.entryTime);
  const durationMinutes = Math.floor((now.getTime() - entry.getTime()) / (1000 * 60));

  return {
    plate: cached.plate,
    vehicle_type: cached.vehicleType,
    spot_number: cached.spotNumber,
    entry_time: cached.entryTime,
    duration_minutes: durationMinutes,
    current_cost: 0 // Se calculará por separado
  };
}

// ===============================
// OPERACIONES DE ENTRADA
// ===============================

/**
 * Cachea un vehículo que acaba de entrar
 */
export async function cacheVehicleEntry(
  parkingLotId: string,
  plate: string,
  vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'truck',
  spotNumber: string,
  transactionId?: number,
  entryTime?: string
): Promise<void> {
  try {
    const vehicle: ActiveVehicleCache = {
      id: getVehicleId(parkingLotId, plate),
      parkingLotId,
      plate: plate.toUpperCase(),
      vehicleType,
      spotNumber,
      entryTime: entryTime || new Date().toISOString(),
      transactionId,
      syncStatus: transactionId ? 'synced' : 'local',
      cachedAt: new Date().toISOString()
    };

    await db.activeVehicles.put(vehicle);
  } catch (error) {
    console.error('Error caching vehicle entry:', error);
  }
}

/**
 * Cachea múltiples vehículos activos (al cargar desde backend)
 */
export async function cacheActiveVehicles(
  parkingLotId: string,
  vehicles: ActiveVehicle[]
): Promise<void> {
  try {
    const cached = vehicles.map(v => toCache(parkingLotId, v));
    await db.activeVehicles.bulkPut(cached);
  } catch (error) {
    console.error('Error caching active vehicles:', error);
  }
}

// ===============================
// BÚSQUEDA
// ===============================

/**
 * Busca un vehículo activo por placa en un parqueadero
 */
export async function findCachedVehicle(
  parkingLotId: string,
  plate: string
): Promise<ActiveVehicle | null> {
  try {
    const id = getVehicleId(parkingLotId, plate);
    const cached = await db.activeVehicles.get(id);

    if (!cached) {
      return null;
    }

    const vehicle = fromCache(cached);
    return vehicle;
  } catch (error) {
    console.error('Error finding cached vehicle:', error);
    return null;
  }
}

/**
 * Obtiene todos los vehículos activos de un parqueadero
 */
export async function getCachedActiveVehicles(
  parkingLotId: string
): Promise<ActiveVehicle[]> {
  try {
    const cached = await db.activeVehicles
      .where('parkingLotId')
      .equals(parkingLotId)
      .toArray();

    const vehicles = cached.map(fromCache);
    return vehicles;
  } catch (error) {
    console.error('Error getting cached active vehicles:', error);
    return [];
  }
}

// ===============================
// OPERACIONES DE SALIDA
// ===============================

/**
 * Elimina un vehículo del caché cuando sale
 */
export async function removeVehicleFromCache(
  parkingLotId: string,
  plate: string
): Promise<void> {
  try {
    const id = getVehicleId(parkingLotId, plate);
    await db.activeVehicles.delete(id);
  } catch (error) {
    console.error('Error removing vehicle from cache:', error);
  }
}

// ===============================
// SINCRONIZACIÓN
// ===============================

/**
 * Actualiza el transaction_id cuando se sincroniza con el backend
 */
export async function updateVehicleTransactionId(
  parkingLotId: string,
  plate: string,
  transactionId: number
): Promise<void> {
  try {
    const id = getVehicleId(parkingLotId, plate);
    await db.activeVehicles.update(id, {
      transactionId,
      syncStatus: 'synced'
    });
  } catch (error) {
    console.error('Error updating vehicle transaction ID:', error);
  }
}

/**
 * Obtiene vehículos que solo están en caché local (no sincronizados)
 */
export async function getLocalOnlyVehicles(
  parkingLotId: string
): Promise<ActiveVehicleCache[]> {
  try {
    return await db.activeVehicles
      .where('[parkingLotId+syncStatus]')
      .equals([parkingLotId, 'local'])
      .toArray();
  } catch (error) {
    console.error('Error getting local-only vehicles:', error);
    return [];
  }
}

// ===============================
// UTILIDADES
// ===============================

/**
 * Limpia todos los vehículos activos del caché (útil para debugging)
 */
export async function clearActiveVehiclesCache(): Promise<void> {
  try {
    await db.activeVehicles.clear();
  } catch (error) {
    console.error('Error clearing active vehicles cache:', error);
  }
}

/**
 * Obtiene estadísticas del caché de vehículos activos
 */
export async function getActiveVehiclesCacheStats(): Promise<{
  total: number;
  localOnly: number;
  synced: number;
}> {
  try {
    const total = await db.activeVehicles.count();
    const localOnly = await db.activeVehicles.where('syncStatus').equals('local').count();
    const synced = await db.activeVehicles.where('syncStatus').equals('synced').count();

    return { total, localOnly, synced };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { total: 0, localOnly: 0, synced: 0 };
  }
}

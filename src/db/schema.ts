import Dexie, { Table } from 'dexie';

export interface Vehicle {
  id?: number;
  plate: string;
  type: 'car' | 'motorcycle' | 'truck';
  entryTime: Date;
  exitTime?: Date;
  status: 'parked' | 'exited';
  parkingSpotId: number;
  syncStatus: 'synced' | 'pending' | 'error';
}

export interface ParkingSpot {
  id?: number;
  number: string;
  type: 'car' | 'motorcycle' | 'truck' | 'bicycle';
  status: 'available' | 'occupied' | 'maintenance';
  floor: number;
  parking_lot_id?: string | number;
  syncStatus: 'synced' | 'pending' | 'error';
}

export interface Transaction {
  id?: number;
  vehicleId: number;
  entryTime: Date;
  exitTime?: Date;
  amount?: number;
  status: 'active' | 'completed' | 'cancelled';
  syncStatus: 'synced' | 'pending' | 'error';
}

// ===============================
// CACHÉ OFFLINE - PARKING LOTS
// ===============================
export interface CachedParkingLot {
  id: string; // Primary key
  data: Record<string, unknown>; // ParkingLot completo serializado
  cachedAt: string; // ISO timestamp
}

// ===============================
// CACHÉ OFFLINE - PARKING SPACES
// ===============================
export interface CachedParkingSpaces {
  parkingLotId: string; // Primary key
  spaces: Record<string, unknown>[]; // Array de ParkingSpot serializados
  cachedAt: string; // ISO timestamp
}

// ===============================
// CACHÉ OFFLINE - VEHÍCULOS ACTIVOS
// ===============================
export interface ActiveVehicleCache {
  id: string; // Primary key: `${parkingLotId}-${plate}`
  parkingLotId: string;
  plate: string;
  vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'truck';
  spotNumber: string;
  entryTime: string; // ISO timestamp
  transactionId?: number; // Del backend si se sincronizó
  syncStatus: 'local' | 'synced'; // 'local' = solo offline, 'synced' = en backend
  cachedAt: string; // Cuándo se guardó localmente
}

export class ParkiuDB extends Dexie {
  vehicles!: Table<Vehicle>;
  parkingSpots!: Table<ParkingSpot>;
  transactions!: Table<Transaction>;
  operations!: Table<OfflineOperation>;
  cachedParkingLots!: Table<CachedParkingLot>;
  cachedParkingSpaces!: Table<CachedParkingSpaces>;
  activeVehicles!: Table<ActiveVehicleCache>;

  constructor() {
    super('ParkiuDB');
    // v1: initial schema
    this.version(1).stores({
      vehicles: '++id, plate, status, parkingSpotId, syncStatus',
      parkingSpots: '++id, number, type, status, floor, syncStatus',
      transactions: '++id, vehicleId, status, syncStatus'
    });

    // v2: add offline operations queue
    this.version(2).stores({
      vehicles: '++id, plate, status, parkingSpotId, syncStatus',
      parkingSpots: '++id, number, type, status, floor, syncStatus',
      transactions: '++id, vehicleId, status, syncStatus',
      operations: '++id, type, plate, status, createdAt'
    });

    // v3: add offline cache tables for admin dashboard
    this.version(3).stores({
      vehicles: '++id, plate, status, parkingSpotId, syncStatus',
      parkingSpots: '++id, number, type, status, floor, syncStatus',
      transactions: '++id, vehicleId, status, syncStatus',
      operations: '++id, type, plate, status, createdAt',
      cachedParkingLots: 'id, cachedAt',
      cachedParkingSpaces: 'parkingLotId, cachedAt'
    });

    // v4: add active vehicles cache for offline entry/exit
    this.version(4).stores({
      vehicles: '++id, plate, status, parkingSpotId, syncStatus',
      parkingSpots: '++id, number, type, status, floor, syncStatus',
      transactions: '++id, vehicleId, status, syncStatus',
      operations: '++id, type, plate, status, createdAt',
      cachedParkingLots: 'id, cachedAt',
      cachedParkingSpaces: 'parkingLotId, cachedAt',
      activeVehicles: 'id, parkingLotId, plate, syncStatus, cachedAt'
    });
  }
}

export type OfflineOperationType = 'entry' | 'exit';

export interface OfflineOperation {
  id?: number;
  type: OfflineOperationType;
  parkingLotId: string;
  plate: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string; // ISO date
  status: 'pending' | 'synced' | 'error';
  errorMessage?: string;
}

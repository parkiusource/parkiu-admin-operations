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
  parking_lot_id?: string | number; // ✅ Agregado para asociar con parqueadero
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

export class ParkiuDB extends Dexie {
  vehicles!: Table<Vehicle>;
  parkingSpots!: Table<ParkingSpot>;
  transactions!: Table<Transaction>;
  operations!: Table<OfflineOperation>;

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

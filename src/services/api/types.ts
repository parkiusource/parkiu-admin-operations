import { Vehicle, ParkingSpot, Transaction } from '../../db/schema';

export type ApiResponse<T> = {
  data: T;
  error?: string;
};

export type ApiError = {
  code: string;
  message: string;
  userMessage: string;
};

export interface IVehicleService {
  registerVehicle(vehicle: Omit<Vehicle, 'id' | 'syncStatus'>): Promise<ApiResponse<Vehicle>>;
  getVehicle(id: number): Promise<ApiResponse<Vehicle>>;
  updateVehicle(id: number, vehicle: Partial<Vehicle>): Promise<ApiResponse<Vehicle>>;
  listVehicles(): Promise<ApiResponse<Vehicle[]>>;
}

export interface IParkingSpotService {
  getAvailableSpots(type?: Vehicle['type']): Promise<ApiResponse<ParkingSpot[]>>;
  updateSpotStatus(id: number, status: ParkingSpot['status']): Promise<ApiResponse<ParkingSpot>>;
  listSpots(): Promise<ApiResponse<ParkingSpot[]>>;
}

export interface ITransactionService {
  createTransaction(transaction: Omit<Transaction, 'id' | 'syncStatus'>): Promise<ApiResponse<Transaction>>;
  completeTransaction(id: number, exitTime: Date, amount: number): Promise<ApiResponse<Transaction>>;
  getActiveTransactions(): Promise<ApiResponse<Transaction[]>>;
}

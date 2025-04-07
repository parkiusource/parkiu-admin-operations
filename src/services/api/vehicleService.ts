import { ParkiuDB } from '../../db/schema';
import { IVehicleService, ApiResponse, ApiError } from './types';
import { Vehicle } from '../../db/schema';

export class VehicleService implements IVehicleService {
  private db: ParkiuDB;

  constructor() {
    this.db = new ParkiuDB();
  }

  private handleError(error: unknown): ApiError {
    console.error('VehicleService error:', error);
    return {
      code: 'VEHICLE_SERVICE_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      userMessage: 'Ha ocurrido un error al procesar la solicitud'
    };
  }

  async registerVehicle(vehicle: Omit<Vehicle, 'id' | 'syncStatus'>): Promise<ApiResponse<Vehicle>> {
    try {
      const id = await this.db.vehicles.add({
        ...vehicle,
        syncStatus: 'pending'
      });

      const newVehicle = await this.db.vehicles.get(id);
      if (!newVehicle) {
        throw new Error('Vehicle not found after creation');
      }

      return { data: newVehicle };
    } catch (error) {
      return { data: null as unknown as Vehicle, error: this.handleError(error).userMessage };
    }
  }

  async getVehicle(id: number): Promise<ApiResponse<Vehicle>> {
    try {
      const vehicle = await this.db.vehicles.get(id);
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }
      return { data: vehicle };
    } catch (error) {
      return { data: null as unknown as Vehicle, error: this.handleError(error).userMessage };
    }
  }

  async updateVehicle(id: number, vehicle: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    try {
      await this.db.vehicles.update(id, {
        ...vehicle,
        syncStatus: 'pending'
      });

      const updatedVehicle = await this.db.vehicles.get(id);
      if (!updatedVehicle) {
        throw new Error('Vehicle not found after update');
      }

      return { data: updatedVehicle };
    } catch (error) {
      return { data: null as unknown as Vehicle, error: this.handleError(error).userMessage };
    }
  }

  async listVehicles(): Promise<ApiResponse<Vehicle[]>> {
    try {
      const vehicles = await this.db.vehicles.toArray();
      return { data: vehicles };
    } catch (error) {
      return { data: [], error: this.handleError(error).userMessage };
    }
  }
}

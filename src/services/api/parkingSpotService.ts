import { ParkiuDB } from '../../db/schema';
import { IParkingSpotService, ApiResponse, ApiError } from './types';
import { ParkingSpot, Vehicle } from '../../db/schema';

export class ParkingSpotService implements IParkingSpotService {
  private db: ParkiuDB;

  constructor() {
    this.db = new ParkiuDB();
  }

  private handleError(error: unknown): ApiError {
    console.error('ParkingSpotService error:', error);
    return {
      code: 'PARKING_SPOT_SERVICE_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      userMessage: 'Ha ocurrido un error al procesar la solicitud'
    };
  }

  async getAvailableSpots(type?: Vehicle['type']): Promise<ApiResponse<ParkingSpot[]>> {
    try {
      let query = this.db.parkingSpots.where('status').equals('available');

      if (type) {
        query = query.and(spot => spot.type === type);
      }

      const spots = await query.toArray();
      return { data: spots };
    } catch (error) {
      return { data: [], error: this.handleError(error).userMessage };
    }
  }

  async updateSpotStatus(id: number, status: ParkingSpot['status']): Promise<ApiResponse<ParkingSpot>> {
    try {
      await this.db.parkingSpots.update(id, {
        status,
        syncStatus: 'pending'
      });

      const updatedSpot = await this.db.parkingSpots.get(id);
      if (!updatedSpot) {
        throw new Error('Parking spot not found after update');
      }

      return { data: updatedSpot };
    } catch (error) {
      return { data: null as unknown as ParkingSpot, error: this.handleError(error).userMessage };
    }
  }

  async listSpots(): Promise<ApiResponse<ParkingSpot[]>> {
    try {
      const spots = await this.db.parkingSpots.toArray();
      return { data: spots };
    } catch (error) {
      return { data: [], error: this.handleError(error).userMessage };
    }
  }
}

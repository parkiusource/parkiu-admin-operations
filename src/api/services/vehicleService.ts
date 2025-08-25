import { client } from '../client';
import { VehicleEntry, VehicleExit, VehicleTransaction } from '@/types/parking';

export class VehicleService {
  /**
   * ✅ Registrar entrada de vehículo
   * POST /vehicles/entry
   */
  static async registerEntry(token: string, entryData: VehicleEntry): Promise<{
    data?: VehicleTransaction;
    error?: string;
  }> {
    try {
      const response = await client.post('/vehicles/entry', entryData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return { data: response.data };
    } catch (error: unknown) {
      console.error('Error registering vehicle entry:', error);
      return {
        error: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error registrando entrada del vehículo'
      };
    }
  }

  /**
   * ✅ Registrar salida de vehículo
   * POST /vehicles/exit
   */
  static async registerExit(token: string, exitData: VehicleExit): Promise<{
    data?: VehicleTransaction;
    error?: string;
  }> {
    try {
      const response = await client.post('/vehicles/exit', exitData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return { data: response.data };
    } catch (error: unknown) {
      console.error('Error registering vehicle exit:', error);
      return {
        error: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error registrando salida del vehículo'
      };
    }
  }

  /**
   * ✅ Obtener transacciones activas (vehículos estacionados)
   * GET /vehicles/active
   */
  static async getActiveVehicles(token: string, parkingLotId?: string): Promise<{
    data?: VehicleTransaction[];
    error?: string;
  }> {
    try {
      const params = parkingLotId ? { parking_lot_id: parkingLotId } : {};
      const response = await client.get('/vehicles/active', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      return { data: response.data };
    } catch (error: unknown) {
      console.error('Error fetching active vehicles:', error);
      return {
        error: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error obteniendo vehículos activos'
      };
    }
  }

  /**
   * ✅ Obtener historial de transacciones
   * GET /vehicles/transactions
   */
  static async getTransactionHistory(token: string, filters?: {
    parking_lot_id?: string;
    plate?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    data?: VehicleTransaction[];
    error?: string;
  }> {
    try {
      const response = await client.get('/vehicles/transactions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: filters,
      });

      return { data: response.data };
    } catch (error: unknown) {
      console.error('Error fetching transaction history:', error);
      return {
        error: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error obteniendo historial de transacciones'
      };
    }
  }

  /**
   * ✅ Buscar vehículo por placa
   * GET /vehicles/search
   */
  static async searchVehicle(token: string, plate: string, parkingLotId?: string): Promise<{
    data?: VehicleTransaction | null;
    error?: string;
  }> {
    try {
      const params = parkingLotId ? { plate, parking_lot_id: parkingLotId } : { plate };
      const response = await client.get('/vehicles/search', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      return { data: response.data };
    } catch (error: unknown) {
      console.error('Error searching vehicle:', error);
      return {
        error: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error buscando vehículo'
      };
    }
  }
}

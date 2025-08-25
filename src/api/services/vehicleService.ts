import { client } from '../client';
import {
  VehicleEntry,
  VehicleExit,
  VehicleEntryResponse,
  VehicleExitResponse,
  ActiveVehicle,
  VehicleTransaction,
  CostCalculation,
  VehicleType,
  ParkingLot
} from '@/types/parking';

export class VehicleService {
  /**
   * 🚗 Registrar entrada de vehículo
   * POST /admin/parking-lots/{parking_lot_id}/vehicles/entry
   */
  static async registerEntry(
    token: string,
    parkingLotId: string,
    entryData: VehicleEntry
  ): Promise<{
    data?: VehicleEntryResponse;
    error?: string;
  }> {
    try {
      // Mapear payload para máxima compatibilidad con el backend
      const payload: Record<string, unknown> = {
        plate: entryData.plate,
        vehicle_type: entryData.vehicle_type,
      };
      if (entryData.space_number || entryData.parking_space_number || entryData.spot_number) {
        payload['space_number'] = entryData.space_number || entryData.parking_space_number || entryData.spot_number;
      }

      // Agregar aliases si existen para cubrir backends que esperan otros nombres
      if (payload['space_number'] && !payload['spot_number']) payload['spot_number'] = payload['space_number'];
      if (entryData.parking_space_number && !payload['parking_space_number']) payload['parking_space_number'] = entryData.parking_space_number;
      if (entryData.parking_space_id && !payload['parking_space_id']) payload['parking_space_id'] = entryData.parking_space_id;
      if (entryData.space_id && !payload['space_id']) payload['space_id'] = entryData.space_id;

      const response = await client.post(
        `/admin/parking-lots/${parkingLotId}/vehicles/entry`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Compatibilidad: algunas APIs envuelven la respuesta en { data: {...} }
      const body = (response?.data && typeof response.data === 'object' && 'data' in response.data)
        ? (response.data as { data: unknown }).data as Record<string, unknown>
        : (response.data as Record<string, unknown>);

      // Normalizar respuesta para asegurar spot_number
      const normalized: VehicleEntryResponse = {
        transaction_id: body.transaction_id as number,
        entry_time: body.entry_time as string,
        spot_number: (body.spot_number as string | undefined)
          || (body.space_number as string | undefined)
          || (payload['space_number'] as string | undefined)
          || (payload['spot_number'] as string | undefined)
          || '',
        estimated_cost: body.estimated_cost as number,
      };

      return { data: normalized };
    } catch (error: unknown) {
      console.error('Error registering vehicle entry:', error);
      return {
        error: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error registrando entrada del vehículo'
      };
    }
  }

  /**
   * 🚪 Registrar salida de vehículo
   * POST /admin/parking-lots/{parking_lot_id}/vehicles/exit
   */
  static async registerExit(
    token: string,
    parkingLotId: string,
    exitData: VehicleExit
  ): Promise<{
    data?: VehicleExitResponse;
    error?: string;
  }> {
    try {
      const response = await client.post(
        `/admin/parking-lots/${parkingLotId}/vehicles/exit`,
        exitData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const body = (response?.data && typeof response.data === 'object' && 'data' in response.data)
        ? (response.data as { data: unknown }).data as VehicleExitResponse
        : (response.data as VehicleExitResponse);

      return { data: body };
    } catch (error: unknown) {
      console.error('Error registering vehicle exit:', error);
      return {
        error: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error registrando salida del vehículo'
      };
    }
  }

  /**
   * 📋 Obtener vehículos activos en un parqueadero
   * GET /admin/parking-lots/{parking_lot_id}/vehicles/active
   */
  static async getActiveVehicles(
    token: string,
    parkingLotId: string
  ): Promise<{
    data?: ActiveVehicle[];
    error?: string;
  }> {
    try {
      const response = await client.get(
        `/admin/parking-lots/${parkingLotId}/vehicles/active`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const body = (response?.data && typeof response.data === 'object' && 'data' in response.data)
        ? (response.data as { data: unknown }).data as ActiveVehicle[]
        : (response.data as ActiveVehicle[]);

      return { data: body };
    } catch (error: unknown) {
      console.error('Error fetching active vehicles:', error);
      return {
        error: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error obteniendo vehículos activos'
      };
    }
  }

  /**
   * 📊 Obtener historial de transacciones (endpoint por definir)
   * GET /admin/parking-lots/{parking_lot_id}/vehicles/history
   */
  static async getTransactionHistory(
    token: string,
    parkingLotId: string,
    filters?: {
      plate?: string;
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    data?: VehicleTransaction[];
    error?: string;
  }> {
    try {
      const response = await client.get(
        `/admin/parking-lots/${parkingLotId}/vehicles/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: filters,
        }
      );

      const body = (response?.data && typeof response.data === 'object' && 'data' in response.data)
        ? (response.data as { data: unknown }).data as VehicleTransaction[]
        : (response.data as VehicleTransaction[]);

      return { data: body };
    } catch (error: unknown) {
      console.error('Error fetching transaction history:', error);
      return {
        error: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error obteniendo historial de transacciones'
      };
    }
  }

  /**
   * 🔍 Buscar vehículo por placa en un parqueadero
   * GET /admin/parking-lots/{parking_lot_id}/vehicles/search?plate=ABC123
   */
  static async searchVehicle(
    token: string,
    parkingLotId: string,
    plate: string
  ): Promise<{
    data?: ActiveVehicle | null;
    error?: string;
  }> {
    try {
      const normalizedPlate = (plate || '').toString().trim().toUpperCase();
      const response = await client.get(
        `/admin/parking-lots/${parkingLotId}/vehicles/search`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: { plate: normalizedPlate },
        }
      );

      const body = (response?.data && typeof response.data === 'object' && 'data' in response.data)
        ? (response.data as { data: unknown }).data as ActiveVehicle | null
        : (response.data as ActiveVehicle | null);

      return { data: body };
    } catch (error: unknown) {
      console.error('Error searching vehicle:', error);
      return {
        error: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error buscando vehículo'
      };
    }
  }

  // ===============================
  // 🧮 UTILIDADES DE CÁLCULO DE COSTOS
  // ===============================

  /**
   * 💰 Calcular costo actual de un vehículo
   * Implementa la lógica de tarifas colombianas del backend
   */
  static calculateCurrentCost(
    entryTime: string,
    vehicleType: VehicleType,
    parkingLot: ParkingLot
  ): CostCalculation {
    const now = new Date();
    const entry = new Date(entryTime);
    const durationMinutes = Math.floor((now.getTime() - entry.getTime()) / (1000 * 60));

    // Obtener tarifa por minuto según tipo de vehículo
    const getRatePerMinute = (): number => {
      switch (vehicleType) {
        case 'car': return parkingLot.car_rate_per_minute;
        case 'motorcycle': return parkingLot.motorcycle_rate_per_minute;
        case 'bicycle': return parkingLot.bicycle_rate_per_minute;
        case 'truck': return parkingLot.truck_rate_per_minute;
        default: return parkingLot.car_rate_per_minute;
      }
    };

    // Obtener tarifa fija según tipo de vehículo
    const getFixedRate = (): number => {
      switch (vehicleType) {
        case 'car': return parkingLot.fixed_rate_car;
        case 'motorcycle': return parkingLot.fixed_rate_motorcycle;
        case 'bicycle': return parkingLot.fixed_rate_bicycle;
        case 'truck': return parkingLot.fixed_rate_truck;
        default: return parkingLot.fixed_rate_car;
      }
    };

    const ratePerMinute = getRatePerMinute();
    const fixedRate = getFixedRate();
    const thresholdMinutes = parkingLot.fixed_rate_threshold_minutes;

    // Verificar si aplica tarifa fija
    const isFixedRate = durationMinutes >= thresholdMinutes;
    const calculatedCost = isFixedRate ? fixedRate : (durationMinutes * ratePerMinute);

    return {
      duration_minutes: durationMinutes,
      vehicle_type: vehicleType,
      rate_per_minute: ratePerMinute,
      is_fixed_rate: isFixedRate,
      calculated_cost: Math.round(calculatedCost),
      equivalent_hours: parseFloat((durationMinutes / 60).toFixed(1)),
      rate_description: isFixedRate ? 'Tarifa fija' : 'Tarifa por minuto'
    };
  }

  /**
   * 💵 Estimar costo por duración
   * Para mostrar estimaciones al usuario antes de confirmar
   */
  static estimateCost(
    durationMinutes: number,
    vehicleType: VehicleType,
    parkingLot: ParkingLot
  ): CostCalculation {
    const getRatePerMinute = (): number => {
      switch (vehicleType) {
        case 'car': return parkingLot.car_rate_per_minute;
        case 'motorcycle': return parkingLot.motorcycle_rate_per_minute;
        case 'bicycle': return parkingLot.bicycle_rate_per_minute;
        case 'truck': return parkingLot.truck_rate_per_minute;
        default: return parkingLot.car_rate_per_minute;
      }
    };

    const getFixedRate = (): number => {
      switch (vehicleType) {
        case 'car': return parkingLot.fixed_rate_car;
        case 'motorcycle': return parkingLot.fixed_rate_motorcycle;
        case 'bicycle': return parkingLot.fixed_rate_bicycle;
        case 'truck': return parkingLot.fixed_rate_truck;
        default: return parkingLot.fixed_rate_car;
      }
    };

    const ratePerMinute = getRatePerMinute();
    const fixedRate = getFixedRate();
    const thresholdMinutes = parkingLot.fixed_rate_threshold_minutes;

    const isFixedRate = durationMinutes >= thresholdMinutes;
    const calculatedCost = isFixedRate ? fixedRate : (durationMinutes * ratePerMinute);

    return {
      duration_minutes: durationMinutes,
      vehicle_type: vehicleType,
      rate_per_minute: ratePerMinute,
      is_fixed_rate: isFixedRate,
      calculated_cost: Math.round(calculatedCost),
      equivalent_hours: parseFloat((durationMinutes / 60).toFixed(1)),
      rate_description: isFixedRate ? 'Tarifa fija' : 'Tarifa por minuto'
    };
  }
}

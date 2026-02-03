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
import { getTariffs } from '@/services/offlineTariffs';

// ===============================
// 🛡️ HELPERS PRIVADOS CON VALIDACIÓN
// ===============================

/**
 * Obtener tarifas con fallback a localStorage y validación
 * @private
 */
function getTariffsWithFallback(
  parkingLot: ParkingLot,
  parkingLotId?: string
): {
  car_rate_per_minute: number;
  motorcycle_rate_per_minute: number;
  bicycle_rate_per_minute: number;
  truck_rate_per_minute: number;
  fixed_rate_car: number;
  fixed_rate_motorcycle: number;
  fixed_rate_bicycle: number;
  fixed_rate_truck: number;
  fixed_rate_threshold_minutes: number;
} {
  // Intentar obtener de localStorage si las tarifas no están en memoria
  let tariffs = parkingLot;

  // Si las tarifas no están definidas o son inválidas, buscar en localStorage
  const needsFallback = !tariffs ||
    !tariffs.car_rate_per_minute ||
    tariffs.car_rate_per_minute <= 0;

  if (needsFallback && parkingLotId) {
    const cached = getTariffs(parkingLotId);
    if (cached) {
      tariffs = { ...parkingLot, ...cached };
    }
  }

  // 🐛 FIX: Improved validation with safer defaults
  // Use Infinity for threshold if not configured to prevent unintended fixed rate application
  const hasValidThreshold = tariffs?.fixed_rate_threshold_minutes != null &&
                            tariffs.fixed_rate_threshold_minutes > 0;

  const validated = {
    car_rate_per_minute: Math.max(0, tariffs?.car_rate_per_minute || 0),
    motorcycle_rate_per_minute: Math.max(0, tariffs?.motorcycle_rate_per_minute || 0),
    bicycle_rate_per_minute: Math.max(0, tariffs?.bicycle_rate_per_minute || 0),
    truck_rate_per_minute: Math.max(0, tariffs?.truck_rate_per_minute || 0),
    fixed_rate_car: Math.max(0, tariffs?.fixed_rate_car || 0),
    fixed_rate_motorcycle: Math.max(0, tariffs?.fixed_rate_motorcycle || 0),
    fixed_rate_bicycle: Math.max(0, tariffs?.fixed_rate_bicycle || 0),
    fixed_rate_truck: Math.max(0, tariffs?.fixed_rate_truck || 0),
    // If threshold not configured, use Infinity so fixed rate never applies
    // This is safer than assuming a default like 12 hours
    fixed_rate_threshold_minutes: hasValidThreshold
      ? Math.max(0, tariffs.fixed_rate_threshold_minutes)
      : Infinity,
  };

  // Note: Configuration warnings handled by backend validation

  return validated;
}

export class VehicleService {
  /**
   * 🚗 Registrar entrada de vehículo
   * POST /admin/parking-lots/{parking_lot_id}/vehicles/entry
   */
  static async registerEntry(
    token: string,
    parkingLotId: string,
    entryData: VehicleEntry,
    options?: { idempotencyKey?: string; clientTime?: string }
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
      // Client timestamp for offline
      if (options?.clientTime) {
        payload['client_entry_time'] = options.clientTime;
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
            ...(options?.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
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
      const status = (error as { response?: { status?: number } })?.response?.status;
      const code = (error as { code?: string })?.code;
      const backendMsg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;

      // Mensajes específicos según tipo de error
      if (code === 'ERR_NETWORK' || !status) {
        return { error: 'Sin conexión. La operación se guardará localmente.' };
      }
      if (status === 401 || status === 403) {
        return { error: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }
      if (status === 422) {
        return { error: backendMsg || 'Datos inválidos. Verifica la información ingresada.' };
      }
      if (status && status >= 500) {
        return { error: 'Error del servidor. Reintentando automáticamente...' };
      }

      return { error: backendMsg || 'Error registrando entrada del vehículo' };
    }
  }

  /**
   * 🚪 Registrar salida de vehículo
   * POST /admin/parking-lots/{parking_lot_id}/vehicles/exit
   */
  static async registerExit(
    token: string,
    parkingLotId: string,
    exitData: VehicleExit,
    options?: { idempotencyKey?: string; clientTime?: string }
  ): Promise<{
    data?: VehicleExitResponse;
    error?: string;
  }> {
    try {
      const payload: Record<string, unknown> = {
        ...exitData,
      };
      if (options?.clientTime) {
        payload['client_exit_time'] = options.clientTime;
      }
      // Enviar costo calculado por el frontend para que el backend lo use
      // Esto evita discrepancias entre lo que el usuario confirmó y lo que aparece en el recibo
      if (exitData.calculated_cost != null) {
        payload['calculated_cost'] = exitData.calculated_cost;
        payload['total_cost'] = exitData.calculated_cost; // Alias para backends que esperan total_cost
      }
      if (exitData.duration_minutes != null) {
        payload['duration_minutes'] = exitData.duration_minutes;
      }

      const response = await client.post(
        `/admin/parking-lots/${parkingLotId}/vehicles/exit`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options?.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
          },
        }
      );

      const body = (response?.data && typeof response.data === 'object' && 'data' in response.data)
        ? (response.data as { data: unknown }).data as VehicleExitResponse
        : (response.data as VehicleExitResponse);

      return { data: body };
    } catch (error: unknown) {
      console.error('Error registering vehicle exit:', error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      const code = (error as { code?: string })?.code;
      const backendMsg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;

      // Mensajes específicos según tipo de error
      if (code === 'ERR_NETWORK' || !status) {
        return { error: 'Sin conexión. La operación se guardará localmente.' };
      }
      if (status === 401 || status === 403) {
        return { error: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }
      if (status === 422) {
        return { error: backendMsg || 'Datos inválidos. Verifica la información ingresada.' };
      }
      if (status && status >= 500) {
        return { error: 'Error del servidor. Reintentando automáticamente...' };
      }

      return { error: backendMsg || 'Error registrando salida del vehículo' };
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
      const status = (error as { response?: { status?: number } })?.response?.status;
      const code = (error as { code?: string })?.code;
      const backendMsg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;

      if (code === 'ERR_NETWORK' || !status) {
        return { error: 'Sin conexión. Mostrando datos en caché.' };
      }
      if (status === 401 || status === 403) {
        return { error: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }

      return { error: backendMsg || 'Error obteniendo vehículos activos' };
    }
  }

  /**
   * 📊 Obtener historial de transacciones
   * GET /admin/parking-lots/{parking_lot_id}/vehicles/history
   * Autenticación: Requerida (global_admin, local_admin)
   * Soporta filtros: date_from, date_to, plate, status, limit, offset
   */
  static async getTransactionHistory(
    token: string,
    parkingLotId: string,
    filters?: {
      limit?: number;
      offset?: number;
      date_from?: string;
      date_to?: string;
      plate?: string;
      status?: 'active' | 'completed';
      payment_method?: 'cash' | 'card' | 'digital';
    }
  ): Promise<{
    data?: VehicleTransaction[];
    error?: string;
  }> {
    try {
      // Construir parámetros de consulta
      const params = new URLSearchParams({
        limit: (filters?.limit || 50).toString(),
        offset: (filters?.offset || 0).toString(),
      });

      // Agregar filtros opcionales
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      if (filters?.plate) params.append('plate', filters.plate);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.payment_method) params.append('payment_method', filters.payment_method);

      const response = await client.get(
        `/admin/parking-lots/${parkingLotId}/vehicles/history?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // El endpoint retorna { data: [...] } según la documentación
      const body = response.data as { data: VehicleTransaction[] };
      return { data: body.data };
    } catch (error: unknown) {
      console.error('Error fetching transaction history:', error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      const code = (error as { code?: string })?.code;
      const backendMsg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;

      if (code === 'ERR_NETWORK' || !status) {
        return { error: 'Sin conexión. Mostrando datos en caché.' };
      }
      if (status === 401 || status === 403) {
        return { error: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }

      return { error: backendMsg || 'Error obteniendo historial de transacciones' };
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
      const status = (error as { response?: { status?: number } })?.response?.status;
      const code = (error as { code?: string })?.code;
      const backendMsg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;

      if (code === 'ERR_NETWORK' || !status) {
        return { error: 'Sin conexión. Buscando en caché local.' };
      }
      if (status === 404) {
        return { error: 'Vehículo no encontrado en el parqueadero.' };
      }
      if (status === 401 || status === 403) {
        return { error: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }

      return { error: backendMsg || 'Error buscando vehículo' };
    }
  }

  // ===============================
  // 🧮 UTILIDADES DE CÁLCULO DE COSTOS
  // ===============================

  /**
   * 💰 Calcular costo actual de un vehículo
   * Regla de cobro: si duración >= threshold_minutes → tarifa fija; si no → duración × tarifa/min.
   * Redondeo: Math.floor (nunca redondear hacia arriba en favor del parqueadero).
   * ✅ Duración y costo nunca negativos (reloj o entry_time erróneos).
   */
  static calculateCurrentCost(
    entryTime: string,
    vehicleType: VehicleType,
    parkingLot: ParkingLot
  ): CostCalculation {
    const now = new Date();
    const entry = new Date(entryTime);
    const rawMinutes = (now.getTime() - entry.getTime()) / (1000 * 60);
    const durationMinutes = Math.max(0, Math.floor(rawMinutes));

    const tariffs = getTariffsWithFallback(parkingLot, parkingLot.id);

    const getRatePerMinute = (): number => {
      switch (vehicleType) {
        case 'car': return tariffs.car_rate_per_minute;
        case 'motorcycle': return tariffs.motorcycle_rate_per_minute;
        case 'bicycle': return tariffs.bicycle_rate_per_minute;
        case 'truck': return tariffs.truck_rate_per_minute;
        default: return tariffs.car_rate_per_minute;
      }
    };

    const getFixedRate = (): number => {
      switch (vehicleType) {
        case 'car': return tariffs.fixed_rate_car;
        case 'motorcycle': return tariffs.fixed_rate_motorcycle;
        case 'bicycle': return tariffs.fixed_rate_bicycle;
        case 'truck': return tariffs.fixed_rate_truck;
        default: return tariffs.fixed_rate_car;
      }
    };

    const ratePerMinute = getRatePerMinute();
    const fixedRate = getFixedRate();
    const thresholdMinutes = tariffs.fixed_rate_threshold_minutes;

    const isFixedRate = durationMinutes >= thresholdMinutes;
    const rawCost = isFixedRate ? fixedRate : durationMinutes * ratePerMinute;
    const calculatedCost = Math.max(0, Math.floor(rawCost));

    return {
      duration_minutes: durationMinutes,
      vehicle_type: vehicleType,
      rate_per_minute: ratePerMinute,
      is_fixed_rate: isFixedRate,
      calculated_cost: calculatedCost,
      equivalent_hours: parseFloat((durationMinutes / 60).toFixed(1)),
      rate_description: isFixedRate ? 'Tarifa fija' : 'Tarifa por minuto'
    };
  }

  /**
   * 💵 Estimar costo por duración (misma regla que calculateCurrentCost)
   * Duración y costo se truncan a >= 0 para evitar valores inválidos.
   */
  static estimateCost(
    durationMinutes: number,
    vehicleType: VehicleType,
    parkingLot: ParkingLot
  ): CostCalculation {
    const safeDuration = Math.max(0, Math.floor(durationMinutes));
    const tariffs = getTariffsWithFallback(parkingLot, parkingLot.id);

    const getRatePerMinute = (): number => {
      switch (vehicleType) {
        case 'car': return tariffs.car_rate_per_minute;
        case 'motorcycle': return tariffs.motorcycle_rate_per_minute;
        case 'bicycle': return tariffs.bicycle_rate_per_minute;
        case 'truck': return tariffs.truck_rate_per_minute;
        default: return tariffs.car_rate_per_minute;
      }
    };

    const getFixedRate = (): number => {
      switch (vehicleType) {
        case 'car': return tariffs.fixed_rate_car;
        case 'motorcycle': return tariffs.fixed_rate_motorcycle;
        case 'bicycle': return tariffs.fixed_rate_bicycle;
        case 'truck': return tariffs.fixed_rate_truck;
        default: return tariffs.fixed_rate_car;
      }
    };

    const ratePerMinute = getRatePerMinute();
    const fixedRate = getFixedRate();
    const thresholdMinutes = tariffs.fixed_rate_threshold_minutes;

    const isFixedRate = safeDuration >= thresholdMinutes;
    const rawCost = isFixedRate ? fixedRate : safeDuration * ratePerMinute;
    const calculatedCost = Math.max(0, Math.floor(rawCost));

    return {
      duration_minutes: safeDuration,
      vehicle_type: vehicleType,
      rate_per_minute: ratePerMinute,
      is_fixed_rate: isFixedRate,
      calculated_cost: calculatedCost,
      equivalent_hours: parseFloat((safeDuration / 60).toFixed(1)),
      rate_description: isFixedRate ? 'Tarifa fija' : 'Tarifa por minuto'
    };
  }
}

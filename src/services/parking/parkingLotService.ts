import axios from 'axios';
import { API_CONFIG, buildApiUrl } from '@/config/backend';
import {
  ParkingLot,
  ParkingLotAPI,
  ParkingSpot,
  ParkingSpaceAPI,
  ParkingLotFilters,
  ParkingLotStats,
  ParkingApiResponse,
  ParkingApiError,
  toParkingLotAPI,
  toParkingLotCreatePayload,
  fromParkingLotAPI,
  fromParkingSpaceAPI,
  toParkingSpaceCreatePayload,
  ParkingSpaceWithVehicleAPI
} from './types';

/**
 * Servicio unificado para gestión completa de Parking Lots
 * Consolidates functionality from src/services/parking.ts and src/api/services/admin.ts
 */
export class ParkingLotService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    console.log('🔧 ParkingLotService initialized with URL:', this.baseUrl);
  }

  /**
   * Maneja errores de la API de forma consistente
   */
  private handleError(error: unknown, context: string): ParkingApiError {
    console.error(`ParkingLotService [${context}] error:`, error);

    if (axios.isAxiosError(error)) {
      return {
        code: error.code || 'AXIOS_ERROR',
        message: error.message,
        userMessage: error.response?.data?.message || 'Error de conexión con el servidor',
        details: error.response?.data
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      userMessage: 'Ha ocurrido un error inesperado'
    };
  }

  /**
   * Crea headers de autorización con token
   */
  private createAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // ===============================
  // CRUD OPERATIONS
  // ===============================

  /**
   * ✅ Obtiene todos los parking lots del administrador autenticado
   * Endpoint: GET /parking-lots/
   */
  async getParkingLots(token: string, filters?: ParkingLotFilters): Promise<ParkingApiResponse<ParkingLot[]>> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.status) params.append('status', filters.status);
        if (filters.minPrice) params.append('min_price', filters.minPrice.toString());
        if (filters.maxPrice) params.append('max_price', filters.maxPrice.toString());
        if (filters.minSpots) params.append('min_spots', filters.minSpots.toString());
        if (filters.is24h) params.append('is_24h', filters.is24h.toString());
      }

      const url = buildApiUrl(`/parking-lots/${params.toString() ? `?${params.toString()}` : ''}`);
      console.log('🌐 GET ParkingLots:', url);

      const response = await axios.get(url, {
        headers: this.createAuthHeaders(token),
        timeout: API_CONFIG.TIMEOUT
      });

      // ✅ Tu backend devuelve directamente el array, no envuelto en {data: ...}
      const apiLots = Array.isArray(response.data) ? response.data : [];
      const parkingLots = apiLots.map((apiLot: ParkingLotAPI) => fromParkingLotAPI(apiLot));

      console.log(`✅ Retrieved ${parkingLots.length} parking lots`);

      return {
        data: parkingLots,
        status: 'success'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'getParkingLots');
      console.error('❌ getParkingLots failed:', apiError);
      return {
        data: [],
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * ✅ Obtiene un parking lot específico por ID
   * Endpoint: GET /parking-lots/{id}
   */
  async getParkingLotById(token: string, id: string): Promise<ParkingApiResponse<ParkingLot | null>> {
    try {
      const url = buildApiUrl(`/parking-lots/${id}`);
      console.log('🌐 GET ParkingLot by ID:', url);

      const response = await axios.get(url, {
        headers: this.createAuthHeaders(token),
        timeout: API_CONFIG.TIMEOUT
      });

      // ✅ Tu backend devuelve directamente el objeto, no envuelto en {data: ...}
      const parkingLot = fromParkingLotAPI(response.data);

      console.log('✅ Retrieved parking lot:', parkingLot.name);

      return {
        data: parkingLot,
        status: 'success'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'getParkingLotById');
      console.error('❌ getParkingLotById failed:', apiError);
      return {
        data: null,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * ✅ Crea un nuevo parking lot
   * Endpoint: POST /parking-lots/
   */
  async createParkingLot(token: string, parkingLot: Omit<ParkingLot, 'id' | 'created_at' | 'updated_at'>): Promise<ParkingApiResponse<ParkingLot>> {
    try {
      // ✅ Usar el payload específico para crear (más simple)
      const createPayload = toParkingLotCreatePayload(parkingLot);

      const url = buildApiUrl('/parking-lots/');
      console.log('🌐 POST CreateParkingLot:', url);
      console.log('📤 Payload:', createPayload);

      const response = await axios.post(url, createPayload, {
        headers: this.createAuthHeaders(token),
        timeout: API_CONFIG.TIMEOUT
      });

      console.log('🔍 Raw backend response:', response.data);
      console.log('🔍 Response.data type:', typeof response.data);
      console.log('🔍 Response.data.id:', response.data?.id, 'type:', typeof response.data?.id);
      console.log('🔍 Response.data.admin_id:', response.data?.admin_id, 'type:', typeof response.data?.admin_id);

      // ✅ Tu backend devuelve directamente el objeto creado
      let createdParkingLot: ParkingLot;
      try {
        createdParkingLot = fromParkingLotAPI(response.data);
        console.log('✅ Successfully converted API response to frontend format');
      } catch (conversionError) {
        console.error('❌ Error converting API response:', conversionError);
        console.error('❌ Response data that failed to convert:', response.data);
        throw new Error(`Failed to process backend response: ${conversionError instanceof Error ? conversionError.message : 'Unknown conversion error'}`);
      }

      console.log('✅ Created parking lot:', createdParkingLot.name, 'with ID:', createdParkingLot.id);

      return {
        data: createdParkingLot,
        status: 'success',
        message: 'Parqueadero creado exitosamente'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'createParkingLot');
      console.error('❌ createParkingLot failed:', apiError);
      return {
        data: {} as ParkingLot,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * Actualiza un parking lot existente
   */
  async updateParkingLot(token: string, id: string, updates: Partial<ParkingLot>): Promise<ParkingApiResponse<ParkingLot>> {
    try {
      const apiData = toParkingLotAPI(updates as ParkingLot);

      const url = buildApiUrl(`/parking-lots/${id}`);
      const response = await axios.put(url, apiData, {
        headers: this.createAuthHeaders(token),
        timeout: API_CONFIG.TIMEOUT
      });

      const updatedParkingLot = fromParkingLotAPI(response.data);

      return {
        data: updatedParkingLot,
        status: 'success',
        message: 'Parqueadero actualizado exitosamente'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'updateParkingLot');
      return {
        data: {} as ParkingLot,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * Elimina (o desactiva) un parking lot
   */
  async deleteParkingLot(token: string, id: string): Promise<ParkingApiResponse<boolean>> {
    try {
      const url = buildApiUrl(`/parking-lots/${id}`);
      await axios.delete(url, {
        headers: this.createAuthHeaders(token),
        timeout: API_CONFIG.TIMEOUT
      });

      return {
        data: true,
        status: 'success',
        message: 'Parqueadero eliminado exitosamente'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'deleteParkingLot');
      return {
        data: false,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  // ===============================
  // REGISTRO Y ONBOARDING
  // ===============================

  /**
   * ✅ Registra un parking lot durante el onboarding del administrador
   * Endpoint: POST /parking-lots/ (mismo que createParkingLot)
   */
  async registerParkingLot(token: string, parkingLot: Omit<ParkingLot, 'id' | 'created_at' | 'updated_at'>): Promise<ParkingApiResponse<ParkingLot>> {
    try {
      // ✅ Reutilizar el mismo método de createParkingLot
      return await this.createParkingLot(token, parkingLot);
    } catch (error) {
      const apiError = this.handleError(error, 'registerParkingLot');
      console.error('❌ registerParkingLot failed:', apiError);
      return {
        data: {} as ParkingLot,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  // ===============================
  // ESTADÍSTICAS Y MÉTRICAS
  // ===============================

  /**
   * Obtiene estadísticas de un parking lot específico
   */
  async getParkingLotStats(token: string, id: string): Promise<ParkingApiResponse<ParkingLotStats>> {
    try {
      // ⚠️ Este endpoint aún no existe en tu backend, es para futuro
      const url = buildApiUrl(`/parking-lots/${id}/stats`);
      const response = await axios.get(url, {
        headers: this.createAuthHeaders(token),
        timeout: API_CONFIG.TIMEOUT
      });

      return {
        data: response.data,
        status: 'success'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'getParkingLotStats');
      return {
        data: {} as ParkingLotStats,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * Cambia el estado de un parking lot (activar/desactivar/mantenimiento)
   */
  async updateParkingLotStatus(token: string, id: string, status: ParkingLot['status']): Promise<ParkingApiResponse<ParkingLot>> {
    try {
      // ⚠️ Este endpoint aún no existe en tu backend, es para futuro
      const url = buildApiUrl(`/parking-lots/${id}/status`);
      const response = await axios.patch(url, { status }, {
        headers: this.createAuthHeaders(token),
        timeout: API_CONFIG.TIMEOUT
      });

      const updatedParkingLot = fromParkingLotAPI(response.data);

      return {
        data: updatedParkingLot,
        status: 'success',
        message: `Estado del parqueadero actualizado a: ${status}`
      };
    } catch (error) {
      const apiError = this.handleError(error, 'updateParkingLotStatus');
      return {
        data: {} as ParkingLot,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  // ===============================
  // BÚSQUEDA Y FILTROS PÚBLICOS
  // ===============================

  /**
   * Búsqueda pública de parking lots (para usuarios finales, no administradores)
   */
  async searchPublicParkingLots(filters: ParkingLotFilters): Promise<ParkingApiResponse<ParkingLot[]>> {
    try {
      const params = new URLSearchParams();

      if (filters.location) {
        params.append('latitude', filters.location.latitude.toString());
        params.append('longitude', filters.location.longitude.toString());
      }
      if (filters.radius) params.append('radius', filters.radius.toString());
      if (filters.minPrice) params.append('min_price', filters.minPrice.toString());
      if (filters.maxPrice) params.append('max_price', filters.maxPrice.toString());
      if (filters.minSpots) params.append('min_spots', filters.minSpots.toString());
      if (filters.is24h) params.append('is_24h', filters.is24h.toString());
      if (filters.type) params.append('vehicle_type', filters.type);

      // ⚠️ Este endpoint es para búsqueda pública, puede no existir aún
      const url = buildApiUrl(`/parking-lots/search?${params.toString()}`);
      const response = await axios.get(url, {
        timeout: API_CONFIG.TIMEOUT
      });

      const parkingLots = (response.data.parking_lots || response.data || [])
        .map((apiLot: ParkingLotAPI) => fromParkingLotAPI(apiLot));

      return {
        data: parkingLots,
        status: 'success'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'searchPublicParkingLots');
      return {
        data: [],
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  // ===============================
  // PARKING SPACES (ESPACIOS REALES)
  // ===============================

  /**
   * ✅ Obtiene todos los espacios de un parking lot específico
   * Endpoint: GET /parking-spaces/lot/{id}
   */
  async getParkingSpaces(token: string, parkingLotId: string): Promise<ParkingApiResponse<ParkingSpot[]>> {
    try {
      const url = buildApiUrl(`/parking-spaces/lot/${parkingLotId}`);
      console.log('🌐 GET ParkingSpaces:', url);

      const response = await axios.get(url, {
        headers: this.createAuthHeaders(token),
        timeout: API_CONFIG.TIMEOUT
      });

      // ✅ El backend responde con { parking_spaces: [...] }
      const apiSpaces = response.data.parking_spaces || [];
      const parkingSpots = apiSpaces.map((apiSpace: ParkingSpaceAPI) => fromParkingSpaceAPI(apiSpace));

      console.log(`✅ Retrieved ${parkingSpots.length} parking spaces`);
      return {
        data: parkingSpots,
        status: 'success'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'getParkingSpaces');
      return {
        data: [],
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * ✅ Obtiene todos los espacios de un parking lot con el vehículo activo (si aplica)
   * Endpoint: GET /parking-spaces/lot/{id}/with-vehicles
   */
  async getParkingSpacesWithVehicles(token: string, parkingLotId: string): Promise<ParkingApiResponse<ParkingSpot[]>> {
    try {
      const url = buildApiUrl(`/parking-spaces/lot/${parkingLotId}/with-vehicles`);
      const response = await axios.get(url, {
        headers: this.createAuthHeaders(token),
        timeout: API_CONFIG.TIMEOUT
      });
      const apiSpaces: ParkingSpaceWithVehicleAPI[] = response.data.parking_spaces || [];

      const mappedParkingSpots: ParkingSpot[] = apiSpaces.map((api) => {
        const base = fromParkingSpaceAPI(api as unknown as ParkingSpaceAPI);
        const active = api.active_vehicle
          ? {
              plate: api.active_vehicle.plate,
              vehicle_type: api.active_vehicle.vehicle_type,
              entry_time: api.active_vehicle.entry_time,
              duration_minutes: api.active_vehicle.duration_minutes,
            }
          : null;
        return { ...base, active_vehicle: active };
      });

      // ✅ Deduplicar por ID para evitar elementos con claves repetidas en UI
      const uniqueById = Array.from(
        new Map(mappedParkingSpots.map((spot) => [String(spot.id), spot])).values()
      );

      return { data: uniqueById, status: 'success' };
    } catch (error) {
      const apiError = this.handleError(error, 'getParkingSpacesWithVehicles');
      return { data: [], error: apiError.userMessage, status: 'error' };
    }
  }

  /**
   * ✅ Actualiza el estado de un espacio específico
   * Endpoint: PUT /parking-spaces/{spaceId}/status
   * Body: { "status": "available|occupied|out_of_service" }
   *
   * ✅ SECURITY: El backend valida que el espacio pertenece al admin autenticado.
   * Solo admins con permisos sobre el parking lot pueden actualizar sus espacios.
   */
  async updateParkingSpaceStatus(
    token: string,
    spaceId: number,
    status: 'available' | 'occupied' | 'maintenance' | 'reserved'
  ): Promise<ParkingApiResponse<ParkingSpot>> {
    try {
      const url = buildApiUrl(`/parking-spaces/${spaceId}/status`);
      console.log('🌐 PUT UpdateParkingSpaceStatus:', url);

      // ✅ Mapear nuestro status al formato esperado por el backend Go
      const backendStatus = status === 'maintenance' ? 'out_of_service' : status;
      const requestBody = {
        status: backendStatus
      };

      console.log('📤 Request body:', requestBody);

      const response = await axios.put(url, requestBody, {
        headers: this.createAuthHeaders(token),
        timeout: 5000 // ✅ Timeout optimizado para updates (5s vs 10s)
      });

      console.log('🔍 Update response from backend:', response.data);

      // ✅ El endpoint /status solo devuelve {status: 'success'}, no el objeto completo
      if (response.data.status === 'success') {
        console.log(`✅ Updated parking space ${spaceId} to ${status}`);

        // No tenemos el objeto actualizado, así que devolvemos un objeto mínimo
        // React Query invalidará las queries y volverá a fetch los datos actualizados
        const minimalSpace: ParkingSpot = {
          id: spaceId,
          status: status,
          number: `Space-${spaceId}`, // Placeholder
          parking_lot_id: '', // Placeholder - será actualizado por React Query
          type: 'car' as const, // Placeholder
          syncStatus: 'synced' as const
        };

        return {
          data: minimalSpace,
          status: 'success',
          message: `Espacio actualizado a ${status}`
        };
      } else {
        // Fallback por si el backend cambia y devuelve el objeto completo
        const responseSpaceData = response.data.parking_space || response.data;
        const updatedSpace = fromParkingSpaceAPI(responseSpaceData);
        console.log(`✅ Updated parking space ${spaceId} to ${status}`);

        return {
          data: updatedSpace,
          status: 'success',
          message: `Espacio actualizado a ${status}`
        };
      }
    } catch (error) {
      const apiError = this.handleError(error, 'updateParkingSpaceStatus');
      return {
        data: {} as ParkingSpot,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * ✅ Crea un nuevo espacio de parqueo
   * Endpoint: POST /parking-spaces/
   */
  async createParkingSpace(
    token: string,
    spaceData: Omit<ParkingSpot, 'id' | 'created_at' | 'updated_at' | 'syncStatus' | 'last_status_change'>,
    parkingLotId: string
  ): Promise<ParkingApiResponse<ParkingSpot>> {
    try {
      const createPayload = toParkingSpaceCreatePayload(spaceData, parkingLotId);
      const url = buildApiUrl('/parking-spaces/');
      console.log('🌐 POST CreateParkingSpace:', url);
      console.log('📤 Payload:', createPayload);

      const response = await axios.post(url, createPayload, {
        headers: this.createAuthHeaders(token),
        timeout: API_CONFIG.TIMEOUT
      });

      console.log('🔍 Create response from backend:', response.data);

      // ✅ Backend devuelve { parking_space: {...} }, extraer el objeto anidado
      const responseSpaceData = response.data.parking_space || response.data;
      const createdSpace = fromParkingSpaceAPI(responseSpaceData);
      console.log(`✅ Created parking space ${createdSpace.number}`);

      return {
        data: createdSpace,
        status: 'success',
        message: `Espacio ${createdSpace.number} creado exitosamente`
      };
    } catch (error) {
      const apiError = this.handleError(error, 'createParkingSpace');
      return {
        data: {} as ParkingSpot,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }
}

// Exporta una instancia singleton
export const parkingLotService = new ParkingLotService();

import axios from 'axios';
import {
  ParkingLot,
  ParkingLotAPI,
  ParkingLotFilters,
  ParkingLotStats,
  ParkingApiResponse,
  ParkingApiError,
  toParkingLotAPI,
  fromParkingLotAPI
} from './types';

/**
 * Servicio unificado para gestión completa de Parking Lots
 * Consolidates functionality from src/services/parking.ts and src/api/services/admin.ts
 */
export class ParkingLotService {
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_BACKEND_URL || 'http://localhost:8080/api';
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
   * Obtiene todos los parking lots del administrador autenticado
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

      const response = await axios.get(
        `${this.apiUrl}/admin/parking-lots?${params.toString()}`,
        { headers: this.createAuthHeaders(token) }
      );

      const parkingLots = (response.data.parking_lots || response.data || [])
        .map((apiLot: ParkingLotAPI) => fromParkingLotAPI(apiLot));

      return {
        data: parkingLots,
        status: 'success'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'getParkingLots');
      return {
        data: [],
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * Obtiene un parking lot específico por ID
   */
  async getParkingLotById(token: string, id: string): Promise<ParkingApiResponse<ParkingLot | null>> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/admin/parking-lots/${id}`,
        { headers: this.createAuthHeaders(token) }
      );

      const parkingLot = fromParkingLotAPI(response.data);

      return {
        data: parkingLot,
        status: 'success'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'getParkingLotById');
      return {
        data: null,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * Crea un nuevo parking lot
   */
  async createParkingLot(token: string, parkingLot: Omit<ParkingLot, 'id' | 'created_at' | 'updated_at'>): Promise<ParkingApiResponse<ParkingLot>> {
    try {
      const apiData = toParkingLotAPI({
        ...parkingLot,
        status: 'pending' // Los nuevos parking lots empiezan como pending
      });

      const response = await axios.post(
        `${this.apiUrl}/parking-lots`,
        apiData,
        { headers: this.createAuthHeaders(token) }
      );

      const createdParkingLot = fromParkingLotAPI(response.data);

      return {
        data: createdParkingLot,
        status: 'success',
        message: 'Parqueadero creado exitosamente'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'createParkingLot');
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

      const response = await axios.put(
        `${this.apiUrl}/admin/parking-lots/${id}`,
        apiData,
        { headers: this.createAuthHeaders(token) }
      );

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
      await axios.delete(
        `${this.apiUrl}/admin/parking-lots/${id}`,
        { headers: this.createAuthHeaders(token) }
      );

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
   * Registra un parking lot durante el onboarding del administrador
   */
  async registerParkingLot(token: string, parkingLot: Omit<ParkingLot, 'id' | 'created_at' | 'updated_at'>): Promise<ParkingApiResponse<ParkingLot>> {
    try {
      const apiData = toParkingLotAPI({
        ...parkingLot,
        status: 'pending'
      });

      const response = await axios.post(
        `${this.apiUrl}/admin/parking-lots`,
        apiData,
        { headers: this.createAuthHeaders(token) }
      );

      const registeredParkingLot = fromParkingLotAPI(response.data);

      return {
        data: registeredParkingLot,
        status: 'success',
        message: 'Parqueadero registrado exitosamente'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'registerParkingLot');
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
      const response = await axios.get(
        `${this.apiUrl}/admin/parking-lots/${id}/stats`,
        { headers: this.createAuthHeaders(token) }
      );

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
      const response = await axios.patch(
        `${this.apiUrl}/admin/parking-lots/${id}/status`,
        { status },
        { headers: this.createAuthHeaders(token) }
      );

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

      const response = await axios.get(
        `${this.apiUrl}/parking-lots/search?${params.toString()}`
      );

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
}

// Exporta una instancia singleton
export const parkingLotService = new ParkingLotService();

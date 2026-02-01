import { ParkiuDB, ParkingSpot } from '../../db/schema';
import {
  ParkingApiResponse,
  ParkingApiError
} from './types';

// Filtros específicos para parking spots DB
export interface ParkingSpotFilters {
  type?: ParkingSpot['type'];
  status?: ParkingSpot['status'];
  floor?: number;
}

/**
 * Servicio mejorado para gestión de Parking Spots individuales
 * Maneja espacios específicos dentro de parking lots (IndexedDB)
 * Migrado y mejorado desde src/services/api/parkingSpotService.ts
 */
export class ParkingSpotService {
  private db: ParkiuDB;

  constructor() {
    this.db = new ParkiuDB();
  }

  /**
   * Maneja errores de forma consistente
   */
  private handleError(error: unknown, context: string): ParkingApiError {
    console.error(`ParkingSpotService [${context}] error:`, error);
    return {
      code: 'PARKING_SPOT_SERVICE_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      userMessage: 'Ha ocurrido un error al procesar la solicitud de espacios de parqueo'
    };
  }

  // ===============================
  // CONSULTAS BÁSICAS
  // ===============================

  /**
   * Obtiene espacios disponibles con filtros opcionales
   */
  async getAvailableSpots(filters?: ParkingSpotFilters): Promise<ParkingApiResponse<ParkingSpot[]>> {
    try {
      let query = this.db.parkingSpots.where('status').equals('available');

      // Aplicar filtros
      if (filters?.type) {
        query = query.and(spot => spot.type === filters.type);
      }

      if (filters?.floor !== undefined) {
        query = query.and(spot => spot.floor === filters.floor);
      }

      const spots = await query.toArray();

      return {
        data: spots,
        status: 'success'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'getAvailableSpots');
      return {
        data: [],
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * Obtiene todos los espacios con filtros opcionales
   */
  async listSpots(filters?: ParkingSpotFilters): Promise<ParkingApiResponse<ParkingSpot[]>> {
    try {
      let query = this.db.parkingSpots.toCollection();

      if (filters?.status) {
        query = this.db.parkingSpots.where('status').equals(filters.status);
      }

      let spots = await query.toArray();

      // Aplicar filtros adicionales
      if (filters?.type) {
        spots = spots.filter(spot => spot.type === filters.type);
      }

      if (filters?.floor !== undefined) {
        spots = spots.filter(spot => spot.floor === filters.floor);
      }

      return {
        data: spots,
        status: 'success'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'listSpots');
      return {
        data: [],
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * Obtiene un espacio específico por ID
   */
  async getSpotById(id: number | string): Promise<ParkingApiResponse<ParkingSpot | null>> {
    try {
      const spot = await this.db.parkingSpots.get(id);
      return {
        data: spot || null,
        status: 'success'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'getSpotById');
      return {
        data: null,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  // ===============================
  // OPERACIONES DE ESTADO
  // ===============================

  /**
   * Actualiza el estado de un espacio de parqueo
   */
  async updateSpotStatus(id: number | string, status: ParkingSpot['status']): Promise<ParkingApiResponse<ParkingSpot>> {
    try {
      await this.db.parkingSpots.update(id, {
        status,
        syncStatus: 'pending'
      });

      const updatedSpot = await this.db.parkingSpots.get(id);
      if (!updatedSpot) {
        throw new Error('Parking spot not found after update');
      }

      return {
        data: updatedSpot,
        status: 'success',
        message: `Estado del espacio actualizado a: ${status}`
      };
    } catch (error) {
      const apiError = this.handleError(error, 'updateSpotStatus');
      return {
        data: {} as ParkingSpot,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * Ocupa un espacio de parqueo
   */
  async occupySpot(id: number | string): Promise<ParkingApiResponse<ParkingSpot>> {
    try {
      const updateData = {
        status: 'occupied' as const,
        syncStatus: 'pending' as const
      };

      await this.db.parkingSpots.update(id, updateData);

      const updatedSpot = await this.db.parkingSpots.get(id);
      if (!updatedSpot) {
        throw new Error('Parking spot not found after update');
      }

      return {
        data: updatedSpot,
        status: 'success',
        message: 'Espacio ocupado exitosamente'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'occupySpot');
      return {
        data: {} as ParkingSpot,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * Libera un espacio de parqueo
   */
  async releaseSpot(id: number | string): Promise<ParkingApiResponse<ParkingSpot>> {
    try {
      await this.db.parkingSpots.update(id, {
        status: 'available' as const,
        syncStatus: 'pending' as const
      });

      const updatedSpot = await this.db.parkingSpots.get(id);
      if (!updatedSpot) {
        throw new Error('Parking spot not found after update');
      }

      return {
        data: updatedSpot,
        status: 'success',
        message: 'Espacio liberado exitosamente'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'releaseSpot');
      return {
        data: {} as ParkingSpot,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  // ===============================
  // CRUD COMPLETO
  // ===============================

  /**
   * Crea un nuevo espacio de parqueo
   */
  async createSpot(spot: Omit<ParkingSpot, 'id' | 'syncStatus'>): Promise<ParkingApiResponse<ParkingSpot>> {
    try {
      const newSpot = {
        ...spot,
        status: spot.status || 'available' as const,
        syncStatus: 'pending' as const
      };

      const id = await this.db.parkingSpots.add(newSpot);
      const createdSpot = await this.db.parkingSpots.get(id);

      if (!createdSpot) {
        throw new Error('Failed to retrieve created parking spot');
      }

      return {
        data: createdSpot,
        status: 'success',
        message: 'Espacio de parqueo creado exitosamente'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'createSpot');
      return {
        data: {} as ParkingSpot,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * Actualiza un espacio de parqueo
   */
  async updateSpot(id: number | string, updates: Partial<ParkingSpot>): Promise<ParkingApiResponse<ParkingSpot>> {
    try {
      const updateData = {
        ...updates,
        syncStatus: 'pending' as const
      };

      await this.db.parkingSpots.update(id, updateData);

      const updatedSpot = await this.db.parkingSpots.get(id);
      if (!updatedSpot) {
        throw new Error('Parking spot not found after update');
      }

      return {
        data: updatedSpot,
        status: 'success',
        message: 'Espacio de parqueo actualizado exitosamente'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'updateSpot');
      return {
        data: {} as ParkingSpot,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  /**
   * Elimina un espacio de parqueo
   */
  async deleteSpot(id: number | string): Promise<ParkingApiResponse<boolean>> {
    try {
      await this.db.parkingSpots.delete(id);
      return {
        data: true,
        status: 'success',
        message: 'Espacio de parqueo eliminado exitosamente'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'deleteSpot');
      return {
        data: false,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  // ===============================
  // ESTADÍSTICAS
  // ===============================

  /**
   * Obtiene estadísticas de ocupación por parking lot
   */
  async getOccupancyStats(): Promise<ParkingApiResponse<{
    total: number;
    available: number;
    occupied: number;
    maintenance: number;
    occupancyRate: number;
  }>> {
    try {
      const spots = await this.db.parkingSpots.toArray();

      const stats = {
        total: spots.length,
        available: spots.filter(s => s.status === 'available').length,
        occupied: spots.filter(s => s.status === 'occupied').length,
        maintenance: spots.filter(s => s.status === 'maintenance').length,
        occupancyRate: 0
      };

      stats.occupancyRate = stats.total > 0
        ? Math.round((stats.occupied / stats.total) * 100 * 100) / 100
        : 0;

      return {
        data: stats,
        status: 'success'
      };
    } catch (error) {
      const apiError = this.handleError(error, 'getOccupancyStats');
      return {
        data: {
          total: 0,
          available: 0,
          occupied: 0,
          maintenance: 0,
          occupancyRate: 0
        },
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }

  // ===============================
  // UTILIDADES
  // ===============================

  /**
   * Sincroniza espacios pendientes con el backend (placeholder)
   */
  async syncPendingSpots(): Promise<ParkingApiResponse<number>> {
    try {
      const pendingSpots = await this.db.parkingSpots
        .where('syncStatus')
        .equals('pending')
        .toArray();

      // TODO: Implementar sincronización real con backend

      return {
        data: pendingSpots.length,
        status: 'success',
        message: `${pendingSpots.length} espacios sincronizados`
      };
    } catch (error) {
      const apiError = this.handleError(error, 'syncPendingSpots');
      return {
        data: 0,
        error: apiError.userMessage,
        status: 'error'
      };
    }
  }
}

// Exporta una instancia singleton
export const parkingSpotService = new ParkingSpotService();

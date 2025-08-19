// Barrel export para todos los servicios de parking
// Exportación centralizada de servicios, tipos y utilidades

// ===============================
// SERVICIOS
// ===============================
export { ParkingLotService, parkingLotService } from './parkingLotService';
export { ParkingSpotService, parkingSpotService } from './parkingSpotService';

// ===============================
// TIPOS
// ===============================
export type {
  // Core interfaces
  ParkingLot,
  ParkingLotAPI,
  ParkingSpot,

  // Response types
  ParkingApiResponse,
  ParkingApiError,

  // Filter types
  ParkingLotFilters,
  ParkingSpotFilters,

  // Stats types
  ParkingLotStats,
  ParkingSystemStats
} from './types';

// ===============================
// UTILIDADES Y ADAPTADORES
// ===============================
export {
  toParkingLotAPI,
  fromParkingLotAPI,
  calculateOccupancyRate,
  formatParkingLotStatus,
  formatSpotStatus
} from './types';

// ===============================
// CONSTANTES Y CONFIGURACIÓN
// ===============================

/**
 * Estados válidos para parking lots
 */
export const PARKING_LOT_STATUSES = ['active', 'inactive', 'pending', 'maintenance'] as const;

/**
 * Estados válidos para parking spots (basado en el esquema actual de la DB)
 */
export const PARKING_SPOT_STATUSES = ['available', 'occupied', 'maintenance'] as const;

/**
 * Tipos de vehículos soportados (basado en el esquema actual de la DB)
 */
export const VEHICLE_TYPES = ['car', 'motorcycle', 'truck'] as const;

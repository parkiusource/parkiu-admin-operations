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
  CreateParkingLotPayload, // ✅ Nuevo tipo para crear parking lots
  ParkingSpot,
  ParkingSpaceAPI, // ✅ Nuevo tipo para espacios del backend
  ParkingSpacesResponse, // ✅ Respuesta del backend para espacios
  CreateParkingSpacePayload, // ✅ Nuevo tipo para crear espacios

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
  // Parking Lot adapters
  toParkingLotAPI,
  toParkingLotCreatePayload, // ✅ Nueva función para crear payload de creación
  fromParkingLotAPI,

  // Parking Space adapters
  fromParkingSpaceAPI, // ✅ Adaptador para espacios del backend
  toParkingSpaceAPI, // ✅ Adaptador para enviar al backend
  toParkingSpaceCreatePayload, // ✅ Adaptador para crear espacios

  // Utilities
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

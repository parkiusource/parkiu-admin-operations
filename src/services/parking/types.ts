// Tipos centralizados para todo el sistema de parking
// Consolida tipos de src/types/parking.ts y otros archivos

import { Location } from '@/types/common';

// ===============================
// PARKING LOTS (Parqueaderos)
// ===============================

// ✅ Estructura que usa el frontend - ACTUALIZADA para compatibilidad con tarifas colombianas
export interface ParkingLot {
  id?: string;
  name: string;
  address: string;
  location: Location;
  total_spots: number;
  admin_uuid?: string;
  description?: string;
  opening_time?: string;
  closing_time?: string;
  contact_name?: string;
  contact_phone?: string;
  tax_id?: string;

  // 🇨🇴 TARIFAS COLOMBIANAS POR MINUTO
  car_rate_per_minute: number;
  motorcycle_rate_per_minute: number;
  bicycle_rate_per_minute: number;
  truck_rate_per_minute: number;

  // 🎯 TARIFAS FIJAS
  fixed_rate_car: number;
  fixed_rate_motorcycle: number;
  fixed_rate_bicycle: number;
  fixed_rate_truck: number;

  // ⏰ CONFIGURACIÓN
  fixed_rate_threshold_minutes: number;

  // 📊 CAMPOS LEGACY (compatibilidad)
  price_per_hour?: number;
  hourly_rate?: number;
  daily_rate?: number;
  monthly_rate?: number;

  // Estados y metadatos
  status?: 'active' | 'inactive' | 'pending' | 'maintenance';
  created_at?: string;
  updated_at?: string;

  // 📈 ESTADÍSTICAS (solo en responses)
  available_spaces?: number;
  available_car_spaces?: number;
  available_motorcycle_spaces?: number;
  available_bicycle_spaces?: number;
  is_active?: boolean;
}

// ✅ Estructura EXACTA que devuelve tu backend real
export interface ParkingLotAPI {
  id?: string | number; // Backend ahora puede devolver string
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  opening_time?: string;
  closing_time?: string;
  hourly_rate?: number;
  contact_name?: string;
  contact_phone?: string;
  tax_id?: string;
  admin_id?: number; // Puede ser undefined al crear
  total_spaces?: number;
  available_spaces?: number;
  created_at?: string;
  updated_at?: string;
  available_car_spaces?: number;
  available_motorcycle_spaces?: number;
  available_bicycle_spaces?: number;
  distance?: number;
  is_active?: boolean;

  // 🇨🇴 TARIFAS COLOMBIANAS POR MINUTO
  car_rate_per_minute?: number;
  motorcycle_rate_per_minute?: number;
  bicycle_rate_per_minute?: number;
  truck_rate_per_minute?: number;

  // 🎯 TARIFAS FIJAS
  fixed_rate_car?: number;
  fixed_rate_motorcycle?: number;
  fixed_rate_bicycle?: number;
  fixed_rate_truck?: number;

  // ⏰ UMBRAL DE TARIFA FIJA
  fixed_rate_threshold_minutes?: number;
}

// ✅ Payload para CREAR parking lots (lo que enviamos al POST) - Actualizado según backend
export interface CreateParkingLotPayload {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  admin_uuid?: string;
  description?: string;
  opening_time?: string;
  closing_time?: string;
  contact_name?: string;
  contact_phone?: string;
  tax_id?: string;

  // TARIFAS COLOMBIANAS POR MINUTO
  car_rate_per_minute: number;
  motorcycle_rate_per_minute?: number;
  bicycle_rate_per_minute?: number;
  truck_rate_per_minute?: number;

  // TARIFAS FIJAS
  fixed_rate_car?: number;
  fixed_rate_motorcycle?: number;
  fixed_rate_bicycle?: number;
  fixed_rate_truck?: number;

  // CONFIGURACIÓN TARIFA FIJA
  fixed_rate_threshold_minutes?: number;

  // CAMPOS LEGACY (mantener compatibilidad)
  hourly_rate?: number;
  daily_rate?: number;
  monthly_rate?: number;
}

// ===============================
// PARKING SPACES - BACKEND API REAL
// ===============================

export interface ParkingSpaceAPI {
  id: number;
  space_number: string;
  parking_lot_id: number;
  status: 'available' | 'occupied' | 'out_of_service' | 'reserved'; // ✅ Backend usa out_of_service
  vehicle_type: 'car' | 'motorcycle' | 'truck' | 'bicycle';
  is_reserved: boolean;
  reserved_for?: string; // ✅ Campo para reservas
  last_status_change: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ActiveVehicleAPI {
  id?: number;
  plate: string;
  vehicle_type: 'car' | 'motorcycle' | 'truck' | 'bicycle';
  entry_time: string;
  duration_minutes: number;
  entry_admin_uuid?: string;
}

export interface ParkingSpaceWithVehicleAPI extends ParkingSpaceAPI {
  active_vehicle?: ActiveVehicleAPI | null;
}

export interface ParkingSpacesResponse {
  parking_spaces: ParkingSpaceAPI[];
}

// ✅ Payload para CREAR espacios (lo que enviamos al POST)
export interface CreateParkingSpacePayload {
  space_number: string;
  parking_lot_id: string;
  vehicle_type: 'car' | 'motorcycle' | 'truck' | 'bicycle';
  is_reserved: boolean;
  reserved_for?: string;
}

// ===============================
// PARKING SPOTS (Espacios individuales) - FRONTEND COMPATIBLE
// ===============================

export interface ParkingSpot {
  id: number | string;
  parking_lot_id?: string;
  number?: string;
  name?: string;
  address?: string;
  type?: 'car' | 'motorcycle' | 'truck' | 'bicycle';
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  floor?: number;
  location?: Location;
  is_reserved?: boolean; // ✅ Agregar para compatibilidad con backend
  reserved_for?: string; // ✅ Para quien está reservado
  last_status_change?: string; // ✅ Agregar para compatibilidad con backend
  active_vehicle?: {
    plate: string;
    vehicle_type: 'car' | 'motorcycle' | 'truck' | 'bicycle';
    entry_time: string;
    duration_minutes: number;
  } | null;

  // Pricing (puede heredar del parking lot o tener precio específico)
  price_per_hour?: number;
  price_per_minute?: number;
  carRate?: number;
  motorcycleRate?: number;
  bikeRate?: number;

  // Metadata adicional
  distance?: number;
  isGooglePlace?: boolean;
  businessStatus?: string;
  available_spaces?: number;
  hasFullRate?: boolean;
  is24h?: boolean;
  operatingHours?: string;
  heightRestriction?: string;
  rating?: number;
  userRatingCount?: number;

  // Sync y estados
  syncStatus?: 'synced' | 'pending' | 'error';
  created_at?: string;
  updated_at?: string;
}

// ===============================
// RESPUESTAS DE API
// ===============================

export type ParkingApiResponse<T> = {
  data: T;
  error?: string;
  message?: string;
  status?: 'success' | 'error';
};

export type ParkingApiError = {
  code: string;
  message: string;
  userMessage: string;
  details?: Record<string, unknown>;
};

// ===============================
// FILTROS Y BÚSQUEDAS
// ===============================

export interface ParkingLotFilters {
  status?: ParkingLot['status'];
  location?: Location;
  radius?: number; // en km
  minPrice?: number;
  maxPrice?: number;
  minSpots?: number;
  is24h?: boolean;
  type?: ParkingSpot['type'];
}

export interface ParkingSpotFilters {
  type?: ParkingSpot['type'];
  status?: ParkingSpot['status'];
  parking_lot_id?: string;
  floor?: number;
  location?: Location;
  radius?: number;
}

// ===============================
// ESTADÍSTICAS Y MÉTRICAS
// ===============================

export interface ParkingLotStats {
  parking_lot_id: string;
  total_spots: number;
  available_spots: number;
  occupied_spots: number;
  maintenance_spots: number;
  occupancy_rate: number; // 0-100
  revenue_today: number;
  revenue_month: number;
  avg_duration: number; // en minutos
  peak_hours: string[];
}

export interface ParkingSystemStats {
  total_parking_lots: number;
  total_spots: number;
  total_available: number;
  total_occupied: number;
  overall_occupancy_rate: number;
  total_revenue_today: number;
  total_revenue_month: number;
  active_parking_lots: number;
}

// ===============================
// ADAPTADORES (Frontend ↔ Backend)
// ===============================

// ✅ Adaptador: Frontend ParkingLot -> Payload para CREAR (POST)
export function toParkingLotCreatePayload(parking: ParkingLot): CreateParkingLotPayload {
  // Usar la tarifa por minuto de carros como base, o calcular desde price_per_hour si no existe
  const carRatePerMinute = parking.car_rate_per_minute || (parking.price_per_hour || 5000) / 60;

  return {
    name: parking.name,
    address: parking.address,
    latitude: parking.location.latitude,
    longitude: parking.location.longitude,
    admin_uuid: parking.admin_uuid,
    description: parking.description || '',
    opening_time: parking.opening_time || '08:00',
    closing_time: parking.closing_time || '20:00',
    contact_name: parking.contact_name || '',
    contact_phone: parking.contact_phone || '',
    tax_id: parking.tax_id,
    // tax_id del parqueadero aún no soportado en payload de creación del backend actual

    // TARIFAS COLOMBIANAS POR MINUTO - Calcular automáticamente basándose en carros
    car_rate_per_minute: carRatePerMinute,
    motorcycle_rate_per_minute: parking.motorcycle_rate_per_minute || carRatePerMinute * 0.3,
    bicycle_rate_per_minute: parking.bicycle_rate_per_minute || carRatePerMinute * 0.06,
    truck_rate_per_minute: parking.truck_rate_per_minute || carRatePerMinute * 1.5,

    // TARIFAS FIJAS - Calcular automáticamente (10 horas como base)
    fixed_rate_car: parking.fixed_rate_car || carRatePerMinute * 600, // 10 horas
    fixed_rate_motorcycle: parking.fixed_rate_motorcycle || (carRatePerMinute * 600) * 0.4,
    fixed_rate_bicycle: parking.fixed_rate_bicycle || (carRatePerMinute * 600) * 0.2,
    fixed_rate_truck: parking.fixed_rate_truck || (carRatePerMinute * 600) * 1.4,

    // CONFIGURACIÓN TARIFA FIJA - 12 horas por defecto
    fixed_rate_threshold_minutes: parking.fixed_rate_threshold_minutes || 720,

    // CAMPOS LEGACY (mantener compatibilidad)
    hourly_rate: parking.price_per_hour || carRatePerMinute * 60,
    daily_rate: parking.daily_rate || 0,
    monthly_rate: parking.monthly_rate || 0,
  };
}

// ✅ Adaptador: Backend ParkingLotAPI -> Frontend ParkingLot
export function fromParkingLotAPI(api: ParkingLotAPI): ParkingLot {
  // Guard against null/undefined api object
  if (!api) {
    throw new Error('Invalid API response: parking lot data is missing');
  }

  return {
    id: api.id != null ? api.id.toString() : '', // Safely convert number to string
    name: api.name || '',
    address: api.address || '',
    location: {
      latitude: api.latitude || 0,
      longitude: api.longitude || 0,
    },
    total_spots: api.total_spaces || 0, // ⚠️ total_spaces -> total_spots
    admin_uuid: api.admin_id != null ? api.admin_id.toString() : '', // Safely convert admin_id
    description: api.description || '',
    opening_time: api.opening_time || '08:00',
    closing_time: api.closing_time || '20:00',
    contact_name: api.contact_name || '',
    contact_phone: api.contact_phone || '',
    tax_id: (api as unknown as { tax_id?: string })?.tax_id || '',

    // 🇨🇴 TARIFAS COLOMBIANAS - Usar valores del backend o calcular desde hourly_rate
    car_rate_per_minute: api.car_rate_per_minute ?? ((api.hourly_rate || 5000) / 60),
    motorcycle_rate_per_minute: api.motorcycle_rate_per_minute ?? (((api.hourly_rate || 5000) / 60) * 0.3),
    bicycle_rate_per_minute: api.bicycle_rate_per_minute ?? (((api.hourly_rate || 5000) / 60) * 0.06),
    truck_rate_per_minute: api.truck_rate_per_minute ?? (((api.hourly_rate || 5000) / 60) * 1.5),

    fixed_rate_car: api.fixed_rate_car ?? ((api.hourly_rate || 5000) * 10),
    fixed_rate_motorcycle: api.fixed_rate_motorcycle ?? (((api.hourly_rate || 5000) * 10) * 0.4),
    fixed_rate_bicycle: api.fixed_rate_bicycle ?? (((api.hourly_rate || 5000) * 10) * 0.2),
    fixed_rate_truck: api.fixed_rate_truck ?? (((api.hourly_rate || 5000) * 10) * 1.4),

    // ⏰ UMBRAL DE TARIFA FIJA - Usar valor del backend o default 12 horas
    fixed_rate_threshold_minutes: api.fixed_rate_threshold_minutes ?? 720,

    // 📊 CAMPOS LEGACY
    price_per_hour: api.hourly_rate || 0,
    hourly_rate: api.hourly_rate || 0,
    daily_rate: undefined,
    monthly_rate: undefined,

    status: api.is_active ? 'active' : 'inactive', // ⚠️ is_active -> status
    created_at: api.created_at || '',
    updated_at: api.updated_at || '',

    // 📈 ESTADÍSTICAS
    available_spaces: api.available_spaces,
    available_car_spaces: api.available_car_spaces,
    available_motorcycle_spaces: api.available_motorcycle_spaces,
    available_bicycle_spaces: api.available_bicycle_spaces,
    is_active: api.is_active,
  };
}

// ✅ Adaptador: Frontend ParkingLot -> Backend ParkingLotAPI (para compatibilidad)
export function toParkingLotAPI(parking: ParkingLot): Partial<ParkingLotAPI> {
  return {
    id: parking.id && parking.id !== '' ? parseInt(parking.id) : undefined,
    name: parking.name || '',
    address: parking.address || '',
    latitude: parking.location?.latitude || 0,
    longitude: parking.location?.longitude || 0,
    description: parking.description || '',
    opening_time: parking.opening_time || '08:00',
    closing_time: parking.closing_time || '20:00',
    hourly_rate: parking.price_per_hour || 0,
    contact_name: parking.contact_name || '',
    contact_phone: parking.contact_phone || '',
    tax_id: parking.tax_id || undefined,
    admin_id: parking.admin_uuid && parking.admin_uuid !== '' ? parseInt(parking.admin_uuid) : undefined,
    total_spaces: parking.total_spots || 0,
    is_active: parking.status === 'active',
    // Los campos de espacios disponibles los maneja el backend
    available_spaces: 0,
    available_car_spaces: 0,
    available_motorcycle_spaces: 0,
    available_bicycle_spaces: 0,
    distance: 0,
    created_at: parking.created_at || new Date().toISOString(),
    updated_at: parking.updated_at || new Date().toISOString(),
  };
}

// ===============================
// ADAPTADORES PARKING SPACES
// ===============================

// ✅ Adaptador: Backend ParkingSpaceAPI -> Frontend ParkingSpot
export function fromParkingSpaceAPI(apiSpace: ParkingSpaceAPI): ParkingSpot {
  // Guard against null/undefined apiSpace object
  if (!apiSpace) {
    throw new Error('Invalid API response: parking space data is missing');
  }

  // Validar que parking_lot_id tenga un valor válido
  if (apiSpace.parking_lot_id == null) {
    throw new Error('Invalid API response: parking_lot_id is required');
  }

  // Validar que id tenga un valor válido
  if (apiSpace.id == null) {
    throw new Error('Invalid API response: space id is required');
  }

  // Validar que status sea un valor válido (backend format)
  const validBackendStatuses = ['available', 'occupied', 'out_of_service', 'reserved'];
  if (!validBackendStatuses.includes(apiSpace.status)) {
    throw new Error(`Invalid API response: status '${apiSpace.status}' is not valid`);
  }

  // Validar que vehicle_type exista y sea válido (confiar en backend)
  const validVehicleTypes = ['car', 'motorcycle', 'truck', 'bicycle'] as const;
  type VehicleType = typeof validVehicleTypes[number];
  const vehicleType = apiSpace.vehicle_type as VehicleType;
  if (!vehicleType || !validVehicleTypes.includes(vehicleType)) {
    throw new Error(`Invalid API response: vehicle_type '${apiSpace.vehicle_type}' is not valid`);
  }

  // ✅ Mapear status del backend al frontend (out_of_service -> maintenance)
  const frontendStatus = apiSpace.status === 'out_of_service' ? 'maintenance' : apiSpace.status;

  return {
    id: apiSpace.id,
    number: apiSpace.space_number || '',
    parking_lot_id: apiSpace.parking_lot_id.toString(),
    type: vehicleType,
    status: frontendStatus as 'available' | 'occupied' | 'maintenance' | 'reserved',
    is_reserved: apiSpace.is_reserved || false,
    reserved_for: apiSpace.reserved_for || undefined,
    last_status_change: apiSpace.last_status_change || '',
    created_at: apiSpace.created_at || '',
    updated_at: apiSpace.updated_at || '',
    syncStatus: 'synced' as const,
    floor: 1 // Default, puede venir del backend en el futuro
  };
}

// ✅ Adaptador: Frontend ParkingSpot -> Backend para actualizaciones
export function toParkingSpaceAPI(spot: ParkingSpot): Partial<ParkingSpaceAPI> {
  // Mapear tipos del frontend al backend (solo tipos soportados por el backend)
  const validBackendTypes = ['car', 'motorcycle', 'truck', 'bicycle'] as const;
  const backendType = spot.type && validBackendTypes.includes(spot.type as typeof validBackendTypes[number])
    ? (spot.type as 'car' | 'motorcycle' | 'truck' | 'bicycle')
    : 'car';

  // ✅ Mapear status del frontend al backend (maintenance -> out_of_service)
  const backendStatus = spot.status === 'maintenance' ? 'out_of_service' : spot.status;

  return {
    id: typeof spot.id === 'string' ? parseInt(spot.id) : spot.id,
    space_number: spot.number || '',
    parking_lot_id: typeof spot.parking_lot_id === 'string' ? parseInt(spot.parking_lot_id) : spot.parking_lot_id || 1,
    status: backendStatus as 'available' | 'occupied' | 'out_of_service' | 'reserved',
    vehicle_type: backendType,
    is_reserved: spot.is_reserved || false,
    reserved_for: spot.reserved_for,
  };
}

// ✅ Adaptador: Frontend ParkingSpot -> Backend CreateParkingSpacePayload para crear
export function toParkingSpaceCreatePayload(
  spot: Omit<ParkingSpot, 'id' | 'created_at' | 'updated_at' | 'syncStatus' | 'last_status_change'>,
  parkingLotId: string
): CreateParkingSpacePayload {
  // Mapear tipos del frontend al backend (solo tipos soportados por el backend)
  const validBackendTypes = ['car', 'motorcycle', 'truck', 'bicycle'] as const;
  const backendType = spot.type && validBackendTypes.includes(spot.type as typeof validBackendTypes[number])
    ? (spot.type as 'car' | 'motorcycle' | 'truck' | 'bicycle')
    : 'car';

  return {
    space_number: spot.number || '',
    parking_lot_id: parkingLotId,
    vehicle_type: backendType,
    is_reserved: spot.is_reserved || false,
    reserved_for: spot.reserved_for || '',
  };
}

// ===============================
// UTILIDADES
// ===============================

export function calculateOccupancyRate(occupied: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((occupied / total) * 100 * 100) / 100; // 2 decimales
}

export function formatParkingLotStatus(status?: ParkingLot['status']): string {
  const statusLabels = {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    maintenance: 'Mantenimiento'
  };
  return statusLabels[status || 'pending'] || 'Desconocido';
}

export function formatSpotStatus(status: ParkingSpot['status']): string {
  const statusLabels = {
    available: 'Disponible',
    occupied: 'Ocupado',
    maintenance: 'Mantenimiento',
    reserved: 'Reservado'
  };
  return statusLabels[status] || 'Desconocido';
}

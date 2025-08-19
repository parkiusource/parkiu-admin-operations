// Tipos centralizados para todo el sistema de parking
// Consolida tipos de src/types/parking.ts y otros archivos

import { Location } from '@/types/common';

// ===============================
// PARKING LOTS (Parqueaderos)
// ===============================

// Estructura que usa el frontend
export interface ParkingLot {
  id?: string;
  name: string;
  address: string;
  location: Location;
  total_spots: number;
  price_per_hour: number;
  admin_uuid?: string;
  description?: string;
  opening_time?: string;
  closing_time?: string;
  daily_rate?: number;
  monthly_rate?: number;
  contact_name?: string;
  contact_phone?: string;
  // Estados y metadatos
  status?: 'active' | 'inactive' | 'pending' | 'maintenance';
  created_at?: string;
  updated_at?: string;
}

// Estructura que espera el backend API
export interface ParkingLotAPI {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  total_spots: number;
  hourly_rate: number;
  admin_uuid?: string;
  description?: string;
  opening_time?: string;
  closing_time?: string;
  daily_rate?: number;
  monthly_rate?: number;
  contact_name?: string;
  contact_phone?: string;
  status?: 'active' | 'inactive' | 'pending' | 'maintenance';
  created_at?: string;
  updated_at?: string;
}

// ===============================
// PARKING SPOTS (Espacios individuales)
// ===============================

export interface ParkingSpot {
  id: number | string;
  parking_lot_id?: string;
  number?: string;
  name?: string;
  address?: string;
  type?: 'car' | 'motorcycle' | 'truck' | 'disabled' | 'electric';
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  floor?: number;
  location?: Location;

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

// Adaptador: Frontend ParkingLot -> Backend ParkingLotAPI
export function toParkingLotAPI(parking: ParkingLot): ParkingLotAPI {
  return {
    id: parking.id,
    name: parking.name,
    address: parking.address,
    latitude: parking.location.latitude,
    longitude: parking.location.longitude,
    total_spots: parking.total_spots,
    hourly_rate: parking.price_per_hour,
    admin_uuid: parking.admin_uuid,
    description: parking.description,
    opening_time: parking.opening_time,
    closing_time: parking.closing_time,
    daily_rate: parking.daily_rate,
    monthly_rate: parking.monthly_rate,
    contact_name: parking.contact_name,
    contact_phone: parking.contact_phone,
    status: parking.status,
    created_at: parking.created_at,
    updated_at: parking.updated_at,
  };
}

// Adaptador: Backend ParkingLotAPI -> Frontend ParkingLot
export function fromParkingLotAPI(api: ParkingLotAPI): ParkingLot {
  return {
    id: api.id,
    name: api.name,
    address: api.address,
    location: {
      latitude: api.latitude,
      longitude: api.longitude,
    },
    total_spots: api.total_spots,
    price_per_hour: api.hourly_rate,
    admin_uuid: api.admin_uuid,
    description: api.description,
    opening_time: api.opening_time,
    closing_time: api.closing_time,
    daily_rate: api.daily_rate,
    monthly_rate: api.monthly_rate,
    contact_name: api.contact_name,
    contact_phone: api.contact_phone,
    status: api.status,
    created_at: api.created_at,
    updated_at: api.updated_at,
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

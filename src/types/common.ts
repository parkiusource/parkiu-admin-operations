// ============================================================================
// TIPOS CENTRALIZADOS - SINGLE SOURCE OF TRUTH
// ============================================================================

export interface Location {
  latitude: number;
  longitude: number;
}

export interface AdminProfile {
  id?: number;
  auth0_uuid?: string;
  email: string;
  name: string;
  nit: string;
  photo_url?: string | null;
  contact_phone: string;
  role: string;
  status?: 'initial' | 'pending_profile' | 'pending_parking' | 'pending_verify' | 'active' | 'rejected' | 'suspended' | 'inactive';
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface AdminProfilePayload {
  email: string;
  name: string;
  nit: string;
  contact_phone: string;
  role: string;
  photo_url: string;
}

export interface ProfileResponse {
  profile: AdminProfile;
}

// Parking Spot - Versión unificada y completa
export interface ParkingSpot {
  id: number | string;
  number?: string;
  name?: string;
  address?: string;
  type?: 'car' | 'motorcycle' | 'truck';
  status: 'available' | 'occupied' | 'maintenance';
  floor?: number;
  location?: Location;

  // Pricing
  price_per_hour?: number;
  price_per_minute?: number;
  carRate?: number;
  motorcycleRate?: number;
  bikeRate?: number;

  // Metadata
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

  // Sync
  syncStatus?: 'synced' | 'pending' | 'error';
}

// API Error estándar
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Respuestas API estándar
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

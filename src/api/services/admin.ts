import axios from 'axios';
import { AdminProfile as BaseAdminProfile, AdminProfilePayload } from '@/types/common';
import { ParkingLotAPI } from '@/types/parking';

// Extend for API response with parking lots
interface AdminProfile extends BaseAdminProfile {
  parkingLots: ParkingLotAPI[];
}

const API_URL = import.meta.env.VITE_API_BACKEND_URL;
// Obtener perfil del administrador
export const getAdminProfile = async (token: string): Promise<AdminProfile> => {
  const response = await axios.get(`${API_URL}/admins/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Completar perfil del administrador (Primer paso del onboarding)
export const completeAdminProfile = async (token: string, payload: AdminProfilePayload): Promise<AdminProfile> => {
  const response = await axios.post(`${API_URL}/admins/complete-profile`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

// Obtener parqueaderos del administrador
export const getParkingLots = async (token: string): Promise<ParkingLotAPI[]> => {
  const response = await axios.get(`${API_URL}/admin/parking-lots`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.parking_lots;
};

// Administrar nuevo parqueadero
export const registerParkingLot = async (token: string, data: ParkingLotAPI): Promise<ParkingLotAPI> => {
  const response = await axios.post(`${API_URL}/admin/parking-lots`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Obtener estado del onboarding
export const getOnboardingStatus = async (token: string): Promise<{ step: number; completed: boolean }> => {
  const response = await axios.get(`${API_URL}/admin/onboarding/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Actualizar paso del onboarding
export const updateOnboardingStep = async (step: number, token: string): Promise<{ step: number; completed: boolean }> => {
  const response = await axios.put(`${API_URL}/admin/onboarding/step`, { step }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createParking = async (token: string, data: ParkingLotAPI): Promise<ParkingLotAPI> => {
  const response = await axios.post(`${API_URL}/parking-lots`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// ===== CONFIGURACIÓN - NUEVOS ENDPOINTS =====

// Obtener perfil para configuración (GET /admins/me)
export const getAdminProfileForSettings = async (token: string) => {
  const response = await axios.get(`${API_URL}/admins/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // El backend devuelve { profile: { ... } }, extraemos y mapeamos los campos
  const profile = response.data.profile || response.data;

  // Mapear photo_url a avatar_url para consistencia con el frontend
  return {
    ...profile,
    avatar_url: profile.photo_url || profile.avatar_url
  };
};

// Actualizar perfil del admin (PATCH /admins/me)
export const updateAdminProfile = async (token: string, updates: Partial<{
  name: string;
  contact_phone: string;
  nit: string;
  avatar_url: string;
}>) => {
  // Mapear avatar_url a photo_url para el backend
  const backendUpdates: Record<string, string> = { ...updates };
  if (updates.avatar_url !== undefined) {
    backendUpdates.photo_url = updates.avatar_url;
    delete backendUpdates.avatar_url;
  }

  const response = await axios.patch(`${API_URL}/admins/me`, backendUpdates, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Mapear la respuesta de vuelta
  const profile = response.data.profile || response.data;
  return {
    ...profile,
    avatar_url: profile.photo_url || profile.avatar_url
  };
};

// Obtener parqueaderos para configuración (GET /admin/parking-lots)
export const getAdminParkingLotsForSettings = async (token: string) => {
  const response = await axios.get(`${API_URL}/admin/parking-lots`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // Manejar diferentes estructuras de respuesta del backend
  return response.data.parking_lots || response.data;
};

// Actualizar parqueadero (PATCH /admin/parking-lots/{parking_lot_id})
export const updateParkingLot = async (token: string, parkingLotId: string, updates: Partial<{
  name: string;
  address: string;
  contact_phone: string;
  tax_id: string;
}>) => {
  const response = await axios.patch(`${API_URL}/admin/parking-lots/${parkingLotId}`, updates, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Obtener configuración de tarifas (GET /admin/parking-lots/{parking_lot_id}/pricing)
export const getParkingLotPricing = async (token: string, parkingLotId: string) => {
  const response = await axios.get(`${API_URL}/admin/parking-lots/${parkingLotId}/pricing`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Actualizar configuración de tarifas (PATCH /admin/parking-lots/{parking_lot_id}/pricing)
export const updateParkingLotPricing = async (token: string, parkingLotId: string, updates: Partial<{
  car_rate_per_minute: number;
  motorcycle_rate_per_minute: number;
  bicycle_rate_per_minute: number;
  truck_rate_per_minute: number;
  fixed_rate_car: number;
  fixed_rate_motorcycle: number;
  fixed_rate_bicycle: number;
  fixed_rate_truck: number;
  fixed_rate_threshold_minutes: number;
  hourly_rate: number;
}>) => {
  const response = await axios.patch(`${API_URL}/admin/parking-lots/${parkingLotId}/pricing`, updates, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Obtener configuración de horarios (GET /admin/parking-lots/{parking_lot_id}/schedule)
export const getParkingLotSchedule = async (token: string, parkingLotId: string) => {
  const response = await axios.get(`${API_URL}/admin/parking-lots/${parkingLotId}/schedule`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Actualizar configuración de horarios (PATCH /admin/parking-lots/{parking_lot_id}/schedule)
export const updateParkingLotSchedule = async (token: string, parkingLotId: string, updates: {
  opening_time?: string;
  closing_time?: string;
  is_24h?: boolean;
  is_closed?: boolean;
  weekly_schedule?: Record<string, {
    is_24h: boolean;
    is_closed: boolean;
    opening_time: string;
    closing_time: string;
  }>;
}) => {
  const response = await axios.patch(`${API_URL}/admin/parking-lots/${parkingLotId}/schedule`, updates, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

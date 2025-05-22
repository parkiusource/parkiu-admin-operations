import axios from 'axios';
import type { AdminProfilePayload } from '../hooks/useAdminOnboarding';
import { ParkingLotAPI } from '@/types/parking';

interface AdminProfile {
  email: string;
  name: string;
  nit: string;
  contact_phone: string;
  photo_url: string | null;
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
  console.log('[completeAdminProfile] Payload:', payload);
  console.log('[completeAdminProfile] Headers:', {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
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

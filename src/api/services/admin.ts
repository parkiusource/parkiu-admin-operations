import { api } from './api';

interface AdminProfile {
  email: string;
  name: string;
  nit: string;
  contact_phone: string;
  photo_url: string | null;
  parkingLots: ParkingLot[];
}

interface ParkingLot {
  id?: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  total_spots: number;
  price_per_hour: number;
}

// Obtener perfil del administrador
export const getAdminProfile = async (token: string): Promise<AdminProfile> => {
  const response = await api.get('/admin/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Completar perfil del administrador (Primer paso del onboarding)
export const completeAdminProfile = async (token: string, formData: FormData): Promise<AdminProfile> => {
  const response = await api.post('/admin/profile', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Obtener parqueaderos del administrador
export const getParkingLots = async (token: string): Promise<ParkingLot[]> => {
  const response = await api.get('/admin/parking-lots', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.parking_lots;
};

// Administrar nuevo parqueadero
export const registerParkingLot = async (token: string, data: ParkingLot): Promise<ParkingLot> => {
  const response = await api.post('/admin/parking-lots', data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Obtener estado del onboarding
export const getOnboardingStatus = async (token: string): Promise<{ step: number; completed: boolean }> => {
  const response = await api.get('/admin/onboarding/status', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Actualizar paso del onboarding
export const updateOnboardingStep = async (step: number, token: string): Promise<{ step: number; completed: boolean }> => {
  const response = await api.put('/admin/onboarding/step', { step }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createParking = async (token: string, data: ParkingLot): Promise<ParkingLot> => {
  const response = await api.post('/admin/parking-lots', data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

import axios from 'axios';

export interface AdminProfile {
  id: number;
  email: string;
  name?: string;
  status: 'initial' | 'pending_profile' | 'pending_parking' | 'pending_verify' | 'active' | 'rejected' | 'suspended' | 'inactive';
  // ...otros campos relevantes
}

const API_URL = import.meta.env.VITE_API_BACKEND_URL;

export const getAdminProfile = async (token: string): Promise<AdminProfile> => {
  const response = await axios.get(`${API_URL}/admins/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

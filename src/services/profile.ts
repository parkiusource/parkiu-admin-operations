import axios from 'axios';

export interface AdminProfile {
  id: number;
  auth0_uuid: string;
  email: string;
  name: string;
  nit: string;
  photo_url: string;
  contact_phone: string;
  role: string;
  status: 'initial' | 'pending_profile' | 'pending_parking' | 'pending_verify' | 'active' | 'rejected' | 'suspended' | 'inactive';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProfileResponse {
  profile: AdminProfile;
}

const API_URL = import.meta.env.VITE_API_BACKEND_URL;

export const getAdminProfile = async (token: string): Promise<ProfileResponse> => {
  const response = await axios.get(`${API_URL}/admins/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

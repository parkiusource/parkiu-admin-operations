import axios from 'axios';
import { ProfileResponse } from '@/types/common';

const API_URL = import.meta.env.VITE_API_BACKEND_URL;

export const getAdminProfile = async (token: string): Promise<ProfileResponse> => {
  const response = await axios.get(`${API_URL}/admins/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

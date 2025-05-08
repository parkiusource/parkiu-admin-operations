import axios from 'axios';

export interface Parking {
  id: string;
  name: string;
  address: string;
  totalSpaces: number;
  availableSpaces: number;
  // Agrega más campos según tu modelo de datos
}

const API_URL = import.meta.env.VITE_API_BACKEND_URL;

export const getUserParkings = async (token: string): Promise<Parking[]> => {
  const response = await axios.get(`${API_URL}/parkings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

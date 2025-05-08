import axios from 'axios';
import { ParkiuDB } from '../db/schema';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  timeout: 10000,
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // El servidor respondió con un código de error
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta
      console.error('Network Error:', error.request);
    } else {
      // Algo sucedió en la configuración de la petición
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Función para sincronizar datos con el servidor
export async function syncWithServer() {
  const db = new ParkiuDB();

  try {
    // Obtener datos pendientes de sincronización
    const pendingVehicles = await db.vehicles
      .where('syncStatus')
      .equals('pending')
      .toArray();

    const pendingSpots = await db.parkingSpots
      .where('syncStatus')
      .equals('pending')
      .toArray();

    const pendingTransactions = await db.transactions
      .where('syncStatus')
      .equals('pending')
      .toArray();

    // Sincronizar vehículos
    if (pendingVehicles.length > 0) {
      await api.post('/vehicles/sync', pendingVehicles);
      const vehicleIds = pendingVehicles
        .map(v => v.id)
        .filter((id): id is number => id !== undefined);
      await db.vehicles
        .where('id')
        .anyOf(vehicleIds)
        .modify({ syncStatus: 'synced' });
    }

    // Sincronizar espacios
    if (pendingSpots.length > 0) {
      await api.post('/parking-spots/sync', pendingSpots);
      const spotIds = pendingSpots
        .map(s => s.id)
        .filter((id): id is number => id !== undefined);
      await db.parkingSpots
        .where('id')
        .anyOf(spotIds)
        .modify({ syncStatus: 'synced' });
    }

    // Sincronizar transacciones
    if (pendingTransactions.length > 0) {
      await api.post('/transactions/sync', pendingTransactions);
      const transactionIds = pendingTransactions
        .map(t => t.id)
        .filter((id): id is number => id !== undefined);
      await db.transactions
        .where('id')
        .anyOf(transactionIds)
        .modify({ syncStatus: 'synced' });
    }

    return true;
  } catch (error) {
    console.error('Sync error:', error);
    return false;
  }
}

export default api;

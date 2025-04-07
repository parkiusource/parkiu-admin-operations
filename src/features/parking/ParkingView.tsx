import { useState, useEffect } from 'react';
import { ParkiuDB } from '../../db/schema';
import { ParkingSpot, Vehicle } from '../../db/schema';

interface ParkingSpotWithVehicle extends ParkingSpot {
  vehicle?: Vehicle;
}

export default function ParkingView() {
  const [spots, setSpots] = useState<ParkingSpotWithVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = new ParkiuDB();

    async function loadParkingData() {
      try {
        // Obtener todos los espacios
        const parkingSpots = await db.parkingSpots.toArray();

        // Obtener vehículos estacionados
        const parkedVehicles = await db.vehicles
          .where('status')
          .equals('parked')
          .toArray();

        // Combinar datos
        const spotsWithVehicles = parkingSpots.map(spot => ({
          ...spot,
          vehicle: parkedVehicles.find(v => v.parkingSpotId === spot.id),
        }));

        setSpots(spotsWithVehicles);
      } catch (error) {
        console.error('Error al cargar datos del parqueadero:', error);
      } finally {
        setLoading(false);
      }
    }

    loadParkingData();
  }, []);

  const getSpotColor = (spot: ParkingSpotWithVehicle) => {
    if (spot.status === 'maintenance') return 'bg-red-100';
    if (spot.status === 'occupied') return 'bg-green-100';
    return 'bg-gray-100';
  };

  const getVehicleTypeIcon = (type: string) => {
    switch (type) {
      case 'car':
        return '🚗';
      case 'motorcycle':
        return '🏍️';
      case 'truck':
        return '🚛';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Estado del Parqueadero
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {spots.map((spot) => (
              <div
                key={spot.id}
                className={`relative rounded-lg border p-4 ${getSpotColor(spot)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      Espacio {spot.number}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {spot.type === 'car' ? 'Carro' : spot.type === 'motorcycle' ? 'Moto' : 'Camión'}
                    </p>
                  </div>
                  {spot.vehicle && (
                    <div className="text-2xl">
                      {getVehicleTypeIcon(spot.vehicle.type)}
                    </div>
                  )}
                </div>
                {spot.vehicle && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-900">
                      Placa: {spot.vehicle.plate}
                    </p>
                    <p className="text-sm text-gray-500">
                      Entrada: {new Date(spot.vehicle.entryTime).toLocaleTimeString()}
                    </p>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    spot.status === 'available' ? 'bg-green-100 text-green-800' :
                    spot.status === 'occupied' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {spot.status === 'available' ? 'Disponible' :
                     spot.status === 'occupied' ? 'Ocupado' :
                     'Mantenimiento'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

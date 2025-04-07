import { useState } from 'react';
import { useVehicles, useParkingSpots, useTransactions } from '../../hooks';
import { Vehicle, ParkingSpot } from '../../db/schema';

interface VehicleEntryForm {
  plate: string;
  type: Vehicle['type'];
  parkingSpotId: number;
}

export default function VehicleEntry() {
  const [form, setForm] = useState<VehicleEntryForm>({
    plate: '',
    type: 'car',
    parkingSpotId: 0,
  });

  const { registerVehicle, isLoading: isRegistering } = useVehicles();
  const { availableSpots, isLoading: isLoadingSpots } = useParkingSpots(form.type);
  const { createTransaction } = useTransactions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Registrar vehículo
      const vehicle = await registerVehicle.mutateAsync({
        plate: form.plate.toUpperCase(),
        type: form.type,
        entryTime: new Date(),
        status: 'parked',
        parkingSpotId: form.parkingSpotId,
      });

      // Crear transacción
      if (vehicle && vehicle.id) {
        await createTransaction.mutateAsync({
          vehicleId: vehicle.id,
          entryTime: new Date(),
          status: 'active',
        });
      }

      // Limpiar formulario
      setForm({
        plate: '',
        type: 'car',
        parkingSpotId: 0,
      });
    } catch (error) {
      console.error('Error al registrar vehículo:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Registro de Entrada
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Ingrese los datos del vehículo que está entrando al parqueadero.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-4">
                <label htmlFor="plate" className="block text-sm font-medium text-gray-700">
                  Placa
                </label>
                <input
                  type="text"
                  name="plate"
                  id="plate"
                  value={form.plate}
                  onChange={(e) => setForm({ ...form, plate: e.target.value })}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Tipo de Vehículo
                </label>
                <select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as Vehicle['type'] })}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="car">Carro</option>
                  <option value="motorcycle">Moto</option>
                  <option value="truck">Camión</option>
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="parkingSpot" className="block text-sm font-medium text-gray-700">
                  Espacio de Parqueo
                </label>
                <select
                  id="parkingSpot"
                  name="parkingSpot"
                  value={form.parkingSpotId}
                  onChange={(e) => setForm({ ...form, parkingSpotId: Number(e.target.value) })}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                  disabled={isLoadingSpots}
                >
                  <option value="">Seleccione un espacio</option>
                  {availableSpots?.map((spot: ParkingSpot) => (
                    <option key={spot.id} value={spot.id}>
                      {spot.number}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isRegistering || isLoadingSpots}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegistering ? 'Registrando...' : 'Registrar Entrada'}
          </button>
        </div>
      </form>
    </div>
  );
}

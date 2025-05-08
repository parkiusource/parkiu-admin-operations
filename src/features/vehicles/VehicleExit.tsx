import { useState } from 'react';
import { ParkiuDB } from '../../db/schema';
import { Vehicle } from '../../db/schema';

interface VehicleExitForm {
  plate: string;
  amount: number;
}

export default function VehicleExit() {
  const [form, setForm] = useState<VehicleExitForm>({
    plate: '',
    amount: 0,
  });
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);

  const searchVehicle = async () => {
    if (!form.plate) return;

    setLoading(true);
    const db = new ParkiuDB();

    try {
      const foundVehicle = await db.vehicles
        .where('plate')
        .equals(form.plate.toUpperCase())
        .and(item => item.status === 'parked')
        .first();

      if (foundVehicle) {
        setVehicle(foundVehicle);
        // Calcular tarifa (ejemplo simple)
        const entryTime = new Date(foundVehicle.entryTime);
        const now = new Date();
        const hours = Math.ceil((now.getTime() - entryTime.getTime()) / (1000 * 60 * 60));
        setForm(prev => ({ ...prev, amount: hours * 5000 })); // $5000 por hora
      } else {
        alert('Vehículo no encontrado o ya salió del parqueadero');
        setVehicle(null);
      }
    } catch (error) {
      console.error('Error al buscar vehículo:', error);
      alert('Error al buscar vehículo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !vehicle.id || !vehicle.parkingSpotId) return;

    const db = new ParkiuDB();

    try {
      // Actualizar vehículo
      await db.vehicles
        .where('id')
        .equals(vehicle.id)
        .modify({
          status: 'exited',
          exitTime: new Date(),
          syncStatus: 'pending',
        });

      // Actualizar transacción
      const transaction = await db.transactions
        .where('vehicleId')
        .equals(vehicle.id)
        .and(item => item.status === 'active')
        .first();

      if (transaction && transaction.id) {
        await db.transactions
          .where('id')
          .equals(transaction.id)
          .modify({
            status: 'completed',
            exitTime: new Date(),
            amount: form.amount,
            syncStatus: 'pending',
          });
      }

      // Liberar espacio
      await db.parkingSpots
        .where('id')
        .equals(vehicle.parkingSpotId)
        .modify({
          status: 'available',
          syncStatus: 'pending',
        });

      // Limpiar formulario
      setForm({
        plate: '',
        amount: 0,
      });
      setVehicle(null);

      alert('Salida registrada exitosamente');
    } catch (error) {
      console.error('Error al registrar salida:', error);
      alert('Error al registrar salida');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Registro de Salida
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Ingrese la placa del vehículo que está saliendo del parqueadero.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-4">
                <label htmlFor="plate" className="label">
                  Placa
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    name="plate"
                    id="plate"
                    value={form.plate}
                    onChange={(e) => setForm({ ...form, plate: e.target.value })}
                    className="input flex-1"
                    required
                  />
                  <button
                    type="button"
                    onClick={searchVehicle}
                    disabled={loading}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>

              {vehicle && (
                <>
                  <div className="col-span-6">
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-gray-900">Información del Vehículo</h4>
                      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Tipo</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {vehicle.type === 'car' ? 'Carro' : vehicle.type === 'motorcycle' ? 'Moto' : 'Camión'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Hora de Entrada</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {new Date(vehicle.entryTime).toLocaleString()}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="amount" className="label">
                      Monto a Pagar
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        name="amount"
                        id="amount"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                        className="input pl-7"
                        required
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {vehicle && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn"
            >
              Registrar Salida
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

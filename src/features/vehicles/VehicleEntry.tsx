import { VehicleEntryCard } from '@/components/vehicles/VehicleEntryCard';
import { useParkingLots } from '@/hooks/parking/useParkingLots';

export default function VehicleEntry() {
  const { parkingLots, isLoading } = useParkingLots();

  const handleEntrySuccess = (plate: string, spot: string) => {
    console.log(`✅ Entrada registrada: ${plate} en espacio ${spot}`);
  };

  const handleError = (error: string) => {
    console.error(`❌ Error: ${error}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!parkingLots || parkingLots.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay parqueaderos disponibles
          </h3>
          <p className="text-gray-500">
            Debes crear un parqueadero primero en la sección de Parqueaderos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🚗 Registro de Entrada de Vehículos
        </h1>
        <p className="text-gray-600">
          {parkingLots.length === 1
            ? `Parqueadero: ${parkingLots[0].name}`
            : `${parkingLots.length} parqueaderos disponibles`
          }
        </p>
      </div>

      <VehicleEntryCard
        parkingLots={parkingLots}
        onSuccess={handleEntrySuccess}
        onError={handleError}
      />
    </div>
  );
}

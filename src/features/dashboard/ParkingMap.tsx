interface ParkingSpot {
  id: number;
  number: string;
  status: 'available' | 'occupied' | 'maintenance' | string;
}

interface ParkingMapProps {
  spots: ParkingSpot[];
  onSpotClick?: (spot: ParkingSpot) => void;
}

export function ParkingMap({ spots, onSpotClick }: ParkingMapProps) {
  return (
    <div className="grid grid-cols-4 gap-3 p-4 bg-white rounded-lg shadow">
      {spots.map((spot) => (
        <button
          key={spot.id}
          className={`
            flex flex-col items-center justify-center p-3 rounded border font-semibold
            transition
            ${spot.status === 'available' ? 'bg-green-100 border-green-400 text-green-800' : ''}
            ${spot.status === 'occupied' ? 'bg-red-100 border-red-400 text-red-800' : ''}
            ${spot.status === 'maintenance' ? 'bg-primary/10 border-primary/30 text-primary' : ''}
          `}
          onClick={() => onSpotClick?.(spot)}
          title={`Espacio ${spot.number} - ${spot.status}`}
        >
          <span className="text-lg">{spot.number}</span>
          <span className="text-xs capitalize">{spot.status}</span>
        </button>
      ))}
    </div>
  );
}

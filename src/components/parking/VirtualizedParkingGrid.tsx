import React, { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ParkingSpot {
  id: string;
  number: string;
  status: 'available' | 'occupied' | 'maintenance';
  type: 'car' | 'motorcycle' | 'truck';
}

interface VirtualizedParkingGridProps {
  spots: ParkingSpot[];
  onSpotClick?: (spot: ParkingSpot) => void;
  itemHeight?: number;
  containerHeight?: number;
}

const SpotCard = React.memo(({ spot, onClick }: { spot: ParkingSpot; onClick?: (spot: ParkingSpot) => void }) => {
  const statusColors = {
    available: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    occupied: 'bg-red-50 border-red-200 text-red-700',
    maintenance: 'bg-amber-50 border-amber-200 text-amber-700'
  };

  const statusLabels = {
    available: 'Disponible',
    occupied: 'Ocupado',
    maintenance: 'Mantenimiento'
  };

  return (
    <div
      className={`
        p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
        hover:shadow-md hover:scale-105
        ${statusColors[spot.status]}
      `}
      onClick={() => onClick?.(spot)}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{spot.number}</h3>
          <p className="text-sm opacity-75">{spot.type}</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium">
            {statusLabels[spot.status]}
          </span>
        </div>
      </div>
    </div>
  );
});

SpotCard.displayName = 'SpotCard';

export const VirtualizedParkingGrid: React.FC<VirtualizedParkingGridProps> = ({
  spots,
  onSpotClick,
  itemHeight = 120,
  containerHeight = 600
}) => {
  // ✅ OPTIMIZACIÓN: Agrupar spots en filas para grid layout
  const rows = useMemo(() => {
    const itemsPerRow = 3; // 3 columnas por fila
    const rowCount = Math.ceil(spots.length / itemsPerRow);

    return Array.from({ length: rowCount }, (_, rowIndex) => {
      const startIndex = rowIndex * itemsPerRow;
      const endIndex = Math.min(startIndex + itemsPerRow, spots.length);
      return spots.slice(startIndex, endIndex);
    });
  }, [spots]);

  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5, // Renderizar 5 filas extra para scroll suave
  });

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ height: `${containerHeight}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {row.map((spot) => (
                  <SpotCard
                    key={spot.id}
                    spot={spot}
                    onClick={onSpotClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedParkingGrid;

import { forwardRef, useCallback } from 'react';
import { Badge } from '@/components/common/Badge';

interface ParkingSpot {
  id: string;
  name: string;
  address: string;
  total_spots: number;
  available_spots: number;
  price_per_hour: number;
}

interface ParkingSpotCardProps {
  spot: ParkingSpot;
  isSelected: boolean;
  onSelect: (spot: ParkingSpot) => void;
  onNavigate: (spot: ParkingSpot) => void;
  variant?: 'default' | 'compact';
}

export const ParkingSpotCard = forwardRef<HTMLDivElement, ParkingSpotCardProps>(
  ({ spot, isSelected, onSelect, onNavigate, variant = 'default' }, ref) => {
    const handleNavigateClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onNavigate(spot);
    }, [onNavigate, spot]);

    const handleClick = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      onSelect(spot);
    }, [onSelect, spot]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(spot);
      }
    }, [onSelect, spot]);

    const handleNavigateKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNavigate(spot);
      }
    }, [onNavigate, spot]);

    const handleExpandKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(spot);
      }
    }, [onSelect, spot]);

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          relative p-4 bg-white rounded-lg shadow-sm border border-gray-200
          transition-all duration-200 ease-in-out
          hover:shadow-md hover:border-primary/20
          focus:outline-none focus:ring-2 focus:ring-primary/30
          ${isSelected ? 'border-primary shadow-md' : ''}
          ${variant === 'compact' ? 'p-3' : ''}
        `}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold truncate">
                {spot.name}
              </h3>
              <Badge variant={spot.available_spots > 0 ? 'success' : 'error'}>
                {spot.available_spots} disponibles
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-600 truncate">
              {spot.address}
            </p>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">
                  ${spot.price_per_hour}/hora
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">
                  {spot.total_spots} espacios
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={handleNavigateClick}
              onKeyDown={handleNavigateKeyDown}
              className="p-2 text-gray-600 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-full"
              aria-label="Navegar al parqueadero"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleClick}
              onKeyDown={handleExpandKeyDown}
              className="p-2 text-gray-600 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-full"
              aria-label="Expandir detalles"
            >
              <svg
                className={`w-5 h-5 transform transition-transform duration-200 ${
                  isSelected ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }
);

ParkingSpotCard.displayName = 'ParkingSpotCard';

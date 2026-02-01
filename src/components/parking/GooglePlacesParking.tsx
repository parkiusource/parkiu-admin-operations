import { useCallback, useEffect, useState, memo } from 'react';
import { MapPin, DollarSign, Clock } from 'lucide-react';
import { useSearchState } from '@/hooks/useSearchState';

interface Location {
  lat: number;
  lng: number;
}

interface ParkingHeaderProps {
  name: string;
}

interface ParkingInfoProps {
  vicinity: string;
}

interface ParkingCTAProps {
  onJoinClick: () => void;
}

interface PlaceResult {
  place_id?: string;
  name?: string;
  vicinity?: string;
  geometry?: {
    location?: google.maps.LatLng;
  };
}

interface GooglePlacesParkingProps {
  mapRef: google.maps.Map;
  center: Location;
  radius?: number;
}

// Extraer componentes para mejor rendimiento
const ParkingHeader = memo(({ name }: ParkingHeaderProps) => (
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <h3 className="text-base font-semibold text-gray-800 group-hover:text-primary transition-colors">
        {name}
      </h3>
      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
        <img
          src="https://www.google.com/favicon.ico"
          alt="Google"
          className="w-3 h-3"
        />
        Google Places
      </span>
    </div>
  </div>
));

const ParkingInfo = memo(({ vicinity }: ParkingInfoProps) => (
  <div className="flex items-start gap-2 mb-3">
    <MapPin className="text-primary mt-1 flex-shrink-0 w-4 h-4" />
    <p className="text-sm text-gray-600 line-clamp-2">{vicinity}</p>
  </div>
));

const ParkingStats = memo(() => (
  <div className="grid grid-cols-1 gap-3">
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700">
      <DollarSign className="w-4 h-4 text-blue-600" />
      <div>
        <p className="text-sm font-medium">
          Información básica disponible
        </p>
        <p className="text-xs opacity-75">
          Para más detalles, contacta al establecimiento
        </p>
      </div>
    </div>
  </div>
));

const ParkingCTA = memo(({ onJoinClick }: ParkingCTAProps) => (
  <div className="mt-4 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 text-sm text-secondary">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>Información básica</span>
        </div>
      </div>
      <button
        onClick={onJoinClick}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
      >
        <span>¿Eres el dueño?</span>
        <span className="font-semibold">¡Únete a Parkiu!</span>
      </button>
    </div>
    <p className="text-xs text-muted mt-2">
      Gestiona tu parqueadero de manera inteligente y aumenta tus ingresos
    </p>
  </div>
));

// Componente principal optimizado
export const GooglePlacesParking = ({ mapRef, center, radius = 1000 }: GooglePlacesParkingProps) => {
  const [spots, setSpots] = useState<PlaceResult[]>([]);
  const { getCachedResult, setCachedResult, lastSearchLocationRef } = useSearchState();

  const searchNearbyParking = useCallback(() => {
    if (!mapRef || !center) return;

    const currentLocation = { lat: center.lat, lng: center.lng };
    const cachedResults = getCachedResult(currentLocation);

    if (cachedResults?.spots && cachedResults.spots.length > 0) {
      setSpots(cachedResults.spots);
      return;
    }

    const service = new google.maps.places.PlacesService(mapRef);
    service.nearbySearch({
      location: new google.maps.LatLng(center.lat, center.lng),
      radius,
      type: 'parking',
    }, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const formattedResults = results.map((result) => ({
          place_id: result.place_id || '',
          name: result.name || '',
          vicinity: result.vicinity || '',
          geometry: {
            location: result.geometry?.location || new google.maps.LatLng(0, 0),
          },
        }));
        setSpots(formattedResults);
        setCachedResult(currentLocation, formattedResults);
        lastSearchLocationRef.current = currentLocation;
      }
    });
  }, [mapRef, center, radius, getCachedResult, setCachedResult, lastSearchLocationRef]);

  useEffect(() => {
    if (mapRef && center) {
      searchNearbyParking();
    }
  }, [mapRef, center, searchNearbyParking]);

  const handleJoinParkiu = useCallback((place: PlaceResult) => {
  }, []);

  return (
    <div className="space-y-3">
      {spots.map((spot) => (
        <div
          key={spot.place_id}
          className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden"
        >
          <div className="p-4">
            <ParkingHeader name={spot.name || ''} />
            <ParkingInfo vicinity={spot.vicinity || ''} />
            <ParkingStats />
            <ParkingCTA onJoinClick={() => handleJoinParkiu(spot)} />
          </div>
        </div>
      ))}
    </div>
  );
};

// Agregar displayName a los componentes memoizados
ParkingHeader.displayName = 'ParkingHeader';
ParkingInfo.displayName = 'ParkingInfo';
ParkingStats.displayName = 'ParkingStats';
ParkingCTA.displayName = 'ParkingCTA';

import { useRef, useCallback } from 'react';

interface Location {
  lat: number;
  lng: number;
}

interface CachedResult {
  spots: google.maps.places.PlaceResult[];
  timestamp: number;
}

interface SearchState {
  getCachedResult: (location: Location) => CachedResult | null;
  setCachedResult: (location: Location, spots: google.maps.places.PlaceResult[]) => void;
  lastSearchLocationRef: React.RefObject<Location | null>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DISTANCE_THRESHOLD = 0.001; // Approximately 100 meters

const calculateDistance = (loc1: Location, loc2: Location): number => {
  const lat = loc1.lat - loc2.lat;
  const lng = loc1.lng - loc2.lng;
  return Math.sqrt(lat * lat + lng * lng);
};

export const useSearchState = (): SearchState => {
  const cache = useRef<Map<string, CachedResult>>(new Map());
  const lastSearchLocationRef = useRef<Location | null>(null);

  const getCachedResult = useCallback((location: Location): CachedResult | null => {
    for (const [key, value] of cache.current.entries()) {
      const cachedLocation = JSON.parse(key);
      if (
        calculateDistance(location, cachedLocation) < DISTANCE_THRESHOLD &&
        Date.now() - value.timestamp < CACHE_DURATION
      ) {
        return value;
      }
    }
    return null;
  }, []);

  const setCachedResult = useCallback((location: Location, spots: google.maps.places.PlaceResult[]): void => {
    const locationKey = JSON.stringify(location);
    cache.current.set(locationKey, {
      spots,
      timestamp: Date.now(),
    });
  }, []);

  return {
    getCachedResult,
    setCachedResult,
    lastSearchLocationRef,
  };
};

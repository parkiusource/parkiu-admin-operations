import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/api/base';
import { CACHE_CONFIG } from '@/context/queryClientUtils';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const DEFAULT_TEXT_DEBOUNCE = 500;

const optionalParams = [
  'includedType',
  'languageCode',
  'locationBias',
  'locationRestriction',
  'openNow',
  'minRating',
  'priceLevels',
  'strictTypeFiltering',
  'evOptions',
] as const;

export type SearchOptions = {
  languageCode?: string;
  fieldMask?: string[] | string;
  [key: string]: unknown;
};

type Place = {
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  [key: string]: unknown;
};

type SearchResult = {
  formattedAddress: string;
  location: { lat: number; lng: number };
};

type CacheConfig = {
  [key: string]: { staleTime: number }
};

const config: CacheConfig = CACHE_CONFIG as CacheConfig;

const normalizeText = (text: string): string => {
  if (!text) return '';
  return text.trim().toLowerCase();
};

const localCache = new Map<string, Place[]>();
const MAX_LOCAL_CACHE_SIZE = 20;

export const useSearchPlaces = (
  textQuery: string,
  options: SearchOptions = { languageCode: 'es' }
) => {
  const normalizedText = normalizeText(textQuery);
  const debouncedTextQuery = useDebounce(normalizedText, DEFAULT_TEXT_DEBOUNCE);

  console.log('[useSearchPlaces] debouncedTextQuery:', debouncedTextQuery);

  const cacheKey = `${debouncedTextQuery}-${JSON.stringify(options)}`;

  const params = new URLSearchParams();
  if (options.languageCode && typeof options.languageCode === 'string') {
    params.set('languageCode', options.languageCode || '');
  }

  const requestBody: Record<string, unknown> = {
    textQuery: debouncedTextQuery,
  };

  optionalParams.forEach((param) => {
    if (options[param] !== undefined) {
      requestBody[param] = options[param];
    }
  });

  const fieldMask = Array.isArray(options.fieldMask)
    ? options.fieldMask.join(',')
    : options.fieldMask ||
      'places.displayName,places.formattedAddress,places.location';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY || '',
    'X-Goog-FieldMask': fieldMask,
  };

  const fetchPlaces = async (): Promise<Place[]> => {
    if (!debouncedTextQuery) {
      console.log('[useSearchPlaces] fetchPlaces: debouncedTextQuery vacío');
      return [];
    }
    console.log('[useSearchPlaces] fetchPlaces: haciendo fetch con', debouncedTextQuery, requestBody, headers);
    const response = await fetch(
      `https://places.googleapis.com/v1/places:searchText?${params.toString()}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[useSearchPlaces] fetchPlaces: error response', response.status, errorText);
      throw new Error('Error fetching places');
    }
    const data = await response.json();
    console.log('[useSearchPlaces] fetchPlaces: data', data);
    return Array.isArray(data?.places) ? data.places : [];
  };

  const staleTime =
    config.SearchPlaces?.staleTime ??
    config.default?.staleTime ??
    60 * 1000;

  const query = useQuery<Place[]>({
    queryKey: ['SearchPlaces', debouncedTextQuery, options],
    queryFn: fetchPlaces,
    select: (places) => {
      if (places.length > 0) {
        if (localCache.size >= MAX_LOCAL_CACHE_SIZE) {
          const oldestKey = localCache.keys().next().value;
          if (oldestKey !== undefined) {
            localCache.delete(oldestKey);
          }
        }
        localCache.set(cacheKey, places);
      }
      return places;
    },
    enabled: !!debouncedTextQuery,
    staleTime,
    refetchOnWindowFocus: false,
    initialData: () => localCache.get(cacheKey) || [],
  });

  // Log para depuración
  console.log('[useSearchPlaces] debouncedTextQuery:', debouncedTextQuery, 'enabled:', !!debouncedTextQuery);

  // Map the places to the format expected by SearchBox
  const results: SearchResult[] = (query.data || []).map((place) => ({
    formattedAddress: place.formattedAddress || (place.displayName?.text ?? ''),
    location: {
      lat: place.location?.latitude ?? 0,
      lng: place.location?.longitude ?? 0,
    },
  }));

  console.log('[useSearchPlaces] results:', results);

  return { ...query, results, places: results };
};

export default useSearchPlaces;

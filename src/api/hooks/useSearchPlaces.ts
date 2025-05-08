import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { getQueryConfig } from '@/context/queryClientUtils';

interface Location {
  lat: number;
  lng: number;
}

interface SearchResult {
  formattedAddress: string;
  location: Location;
}

interface SearchHookResult {
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
}

interface SearchOptions {
  languageCode?: string;
}

interface PlaceResponse {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const useSearchPlaces = (textQuery: string, options: SearchOptions = {}) => {
  return useQuery<SearchHookResult>({
    queryKey: ['places', textQuery, options],
    queryFn: async () => {
      if (!textQuery) {
        return { results: [], isLoading: false, error: null };
      }

      const normalizedQuery = normalizeText(textQuery);
      const response = await api.get('/places/search', {
        params: {
          query: normalizedQuery,
          language: options.languageCode || 'es',
        },
      });

      return {
        results: response.data.results.map((place: PlaceResponse) => ({
          formattedAddress: place.formatted_address,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          },
        })),
        isLoading: false,
        error: null,
      };
    },
    ...getQueryConfig('googlePlaces'),
  });
};

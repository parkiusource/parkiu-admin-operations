import { useContext } from 'react';
import { QueryClientContext } from './QueryClientContext.tsx';
import { QueryKey } from '@tanstack/react-query';

// Configuración de caché por tipo de consulta
export const CACHE_CONFIG = {
  default: {
    staleTime: 1000 * 60, // 1 minuto
    cacheTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  }
};

export type QueryType = 'googlePlaces' | 'adminProfile' | 'adminParkingLots' | 'onboardingStatus';

export interface Location {
  lat: number;
  lng: number;
}

export interface QueryConfig {
  staleTime: number;
  cacheTime: number;
}

// Configuraciones específicas para diferentes tipos de consultas
export const getQueryConfig = (queryType: QueryType): QueryConfig => {
  const configs: Record<QueryType, QueryConfig> = {
    googlePlaces: {
      staleTime: 1000 * 60 * 5, // 5 minutos antes de considerar los datos obsoletos
      cacheTime: 1000 * 60 * 15, // Mantener en caché por 15 minutos
    },
    adminProfile: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 15,
    },
    adminParkingLots: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 15,
    },
    onboardingStatus: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 15,
    },
  };

  return configs[queryType];
};

export const useQueryClient = () => {
  const context = useContext(QueryClientContext);
  if (!context) {
    throw new Error(
      'useCustomQueryClient must be used within a CustomQueryClientProvider',
    );
  }
  return context;
};

// Función de utilidad para generar claves de caché para búsquedas de lugares
export const generatePlacesQueryKey = (location: Location, radius = 1000): QueryKey => {
  return ['googlePlaces', location, radius];
};

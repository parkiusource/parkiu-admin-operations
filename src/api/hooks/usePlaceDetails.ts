import { useState } from 'react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export interface PlaceDetailsResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
}

export const usePlaceDetails = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDetails = async (placeId: string): Promise<PlaceDetailsResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?key=${API_KEY}`,
        {
          headers: {
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
          },
        }
      );
      const data = await res.json();
      if (data && data.id) {
        return data;
      } else {
        setError(data.error?.message || 'No details found');
        return null;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { getDetails, isLoading, error };
};

import { useState, useEffect } from 'react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export interface AutocompleteSuggestion {
  placePrediction: {
    placeId: string;
    text: {
      text: string;
      matches?: unknown[];
    };
  };
}

export const useAutocompletePlaces = (
  input: string,
  locationBias?: { lat: number; lng: number; radius: number }
) => {
  const [results, setResults] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);

    const body: Record<string, unknown> = { input };
    if (locationBias) {
      body.locationBias = {
        circle: {
          center: {
            latitude: locationBias.lat,
            longitude: locationBias.lng,
          },
          radius: locationBias.radius,
        },
      };
    }

    fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
      },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        setResults(data.suggestions || []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [input, locationBias]);

  return { results, isLoading, error };
};

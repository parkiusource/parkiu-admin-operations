import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/api/base/useDebounce';

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

// Bogotá defaults
const BOGOTA_CENTER = { lat: 4.7110, lng: -74.0721 };
const BOGOTA_RADIUS_M = 40_000; // 40km bias
const MIN_CHARS = 3;
const AUTOCOMPLETE_DEBOUNCE_MS = 500;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SESSION_STORAGE_ENTRIES = 50; // Evitar llenar sessionStorage (buena práctica)

type Bias = { lat: number; lng: number; radius: number };

type CachedValue = { data: AutocompleteSuggestion[]; ts: number };
const memoryCache = new Map<string, CachedValue>();
const pendingRequests = new Map<string, Promise<AutocompleteSuggestion[]>>();
const sessionStorageKeys: string[] = []; // Orden de escritura para evict oldest

const makeKey = (q: string, bias: Bias | undefined): string =>
  `${q.toLowerCase()}|${bias ? `${bias.lat},${bias.lng},${bias.radius}` : 'none'}`;

export const useAutocompletePlaces = (
  input: string,
  locationBias?: Bias
) => {
  const [results, setResults] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce in the hook to protect other potential consumers
  const debounced = useDebounce(input.trim(), AUTOCOMPLETE_DEBOUNCE_MS);

  useEffect(() => {
    const query = debounced;
    const bias: Bias = locationBias || { lat: BOGOTA_CENTER.lat, lng: BOGOTA_CENTER.lng, radius: BOGOTA_RADIUS_M };

    if (!query || query.length < MIN_CHARS) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const key = makeKey(query, bias);

    // Check memory cache
    const mem = memoryCache.get(key);
    const now = Date.now();
    if (mem && now - mem.ts < CACHE_TTL_MS) {
      setResults(mem.data);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Check sessionStorage cache
    const ssKey = `places:auto:${key}`;
    try {
      const raw = sessionStorage.getItem(ssKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedValue;
        if (parsed && parsed.ts && now - parsed.ts < CACHE_TTL_MS) {
          memoryCache.set(key, parsed);
          setResults(parsed.data);
          setIsLoading(false);
          setError(null);
          return;
        }
      }
    } catch {
      // Ignore storage parsing errors gracefully
    }

    // Dedupe concurrent requests
    if (pendingRequests.has(key)) {
      setIsLoading(true);
      pendingRequests.get(key)!
        .then((data) => setResults(data))
        .catch((e) => setError(e.message || 'Error'))
        .finally(() => setIsLoading(false));
      return;
    }

    setIsLoading(true);
    setError(null);

    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const body: Record<string, unknown> = { input: query, languageCode: 'es-CO' };
    if (bias) {
      body.locationBias = {
        circle: {
          center: {
            latitude: bias.lat,
            longitude: bias.lng,
          },
          radius: bias.radius,
        },
      };
      // Using circular locationBias only (avoid combining with locationRestriction)
    }

    const fetchPromise = fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Places autocomplete error ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then((data) => (data.suggestions || []) as AutocompleteSuggestion[])
      .then((data) => {
        const value: CachedValue = { data, ts: Date.now() };
        memoryCache.set(key, value);
        try {
          while (sessionStorageKeys.length >= MAX_SESSION_STORAGE_ENTRIES && sessionStorageKeys.length > 0) {
            const oldest = sessionStorageKeys.shift();
            if (oldest) sessionStorage.removeItem(oldest);
          }
          sessionStorage.setItem(ssKey, JSON.stringify(value));
          sessionStorageKeys.push(ssKey);
        } catch {
          // Ignore quota/security errors
        }
        return data;
      });

    pendingRequests.set(key, fetchPromise);

    fetchPromise
      .then((data) => {
        setResults(data);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === 'AbortError') return; // ignore aborted
        setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        pendingRequests.delete(key);
        if (abortRef.current === controller) abortRef.current = null;
        setIsLoading(false);
      });
  }, [debounced, locationBias]);

  return { results, isLoading, error };
};

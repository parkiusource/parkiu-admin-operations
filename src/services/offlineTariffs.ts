import type { ParkingLot } from '@/types/parking';

const KEY = 'parkiu.tariffs.cache';

type TariffsCache = Record<string, Pick<ParkingLot,
  'car_rate_per_minute' | 'motorcycle_rate_per_minute' | 'bicycle_rate_per_minute' | 'truck_rate_per_minute' |
  'fixed_rate_car' | 'fixed_rate_motorcycle' | 'fixed_rate_bicycle' | 'fixed_rate_truck' |
  'fixed_rate_threshold_minutes'
>>;

export function saveTariffs(parkingLotId: string, lot: ParkingLot): void {
  try {
    const raw = localStorage.getItem(KEY);
    const cache: TariffsCache = raw ? JSON.parse(raw) : {};
    cache[parkingLotId] = {
      car_rate_per_minute: lot.car_rate_per_minute,
      motorcycle_rate_per_minute: lot.motorcycle_rate_per_minute,
      bicycle_rate_per_minute: lot.bicycle_rate_per_minute,
      truck_rate_per_minute: lot.truck_rate_per_minute,
      fixed_rate_car: lot.fixed_rate_car,
      fixed_rate_motorcycle: lot.fixed_rate_motorcycle,
      fixed_rate_bicycle: lot.fixed_rate_bicycle,
      fixed_rate_truck: lot.fixed_rate_truck,
      fixed_rate_threshold_minutes: lot.fixed_rate_threshold_minutes,
    };
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {}
}

export function getTariffs(parkingLotId: string): TariffsCache[string] | null {
  try {
    const raw = localStorage.getItem(KEY);
    const cache: TariffsCache = raw ? JSON.parse(raw) : {};
    return cache[parkingLotId] || null;
  } catch {
    return null;
  }
}

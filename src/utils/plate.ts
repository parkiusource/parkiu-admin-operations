export type PlateType = 'car' | 'motorcycle' | 'bicycle' | 'truck';

export interface PlateValidationResult {
  normalized: string;
  isValid: boolean;
  reason?: string;
}

// Common Colombian patterns (simplified):
// - Cars: ABC123 or ABC12D
// - Motorcycles: ABC12A or ABC12D (often 3 letters + 2 numbers + 1 letter)
// - Trucks: same as cars
// - Bicycles: allow alphanumeric up to 10 (less strict)

const CAR_TRUCK_REGEX = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{3}[0-9]{2}[A-Z]$/;
const MOTORCYCLE_REGEX = /^[A-Z]{3}[0-9]{2}[A-Z]$/;
const BICYCLE_REGEX = /^[A-Z0-9]{3,10}$/;

export function normalizePlate(input: string): string {
  return (input || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

export function validatePlate(input: string, vehicleType: PlateType): PlateValidationResult {
  const normalized = normalizePlate(input);
  if (!normalized) return { normalized, isValid: false, reason: 'Placa vacía' };

  switch (vehicleType) {
    case 'car':
    case 'truck':
      return {
        normalized,
        isValid: CAR_TRUCK_REGEX.test(normalized),
        reason: CAR_TRUCK_REGEX.test(normalized) ? undefined : 'Formato inválido (ABC123 o ABC12D)'
      };
    case 'motorcycle':
      return {
        normalized,
        isValid: MOTORCYCLE_REGEX.test(normalized),
        reason: MOTORCYCLE_REGEX.test(normalized) ? undefined : 'Formato inválido (ABC12D)'
      };
    case 'bicycle':
      return {
        normalized,
        isValid: BICYCLE_REGEX.test(normalized),
        reason: BICYCLE_REGEX.test(normalized) ? undefined : 'Solo letras y números (3-10)'
      };
    default:
      return { normalized, isValid: false, reason: 'Tipo de vehículo no soportado' };
  }
}

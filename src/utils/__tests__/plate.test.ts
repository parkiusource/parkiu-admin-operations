import { describe, it, expect } from 'vitest';
import { normalizePlate, validatePlate } from '../plate';

describe('plate utils', () => {
  it('normalizes plate by removing spaces and accents', () => {
    expect(normalizePlate(' aB c-123 ')).toBe('ABC123');
    expect(normalizePlate('ÁBÇ123')).toBe('ABC123');
  });

  it('validates car plate formats', () => {
    expect(validatePlate('ABC123', 'car').isValid).toBe(true);
    expect(validatePlate('ABC12D', 'car').isValid).toBe(true);
    expect(validatePlate('AB1234', 'car').isValid).toBe(false);
  });

  it('validates motorcycle plate formats', () => {
    expect(validatePlate('ABC12D', 'motorcycle').isValid).toBe(true);
    expect(validatePlate('ABC123', 'motorcycle').isValid).toBe(false);
  });
});

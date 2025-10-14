import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock por defecto para permisos operativos usados por componentes de vehículos
vi.mock('@/hooks', async (importOriginal: () => Promise<unknown>) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useOperationPermissions: () => ({
      canRegisterEntry: true,
      canRegisterExit: true,
      canOverrideOccupied: true,
    }),
  };
});

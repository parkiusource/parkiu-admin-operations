/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { useRegisterVehicleEntry, useRegisterVehicleExit } from '@/api/hooks/useVehicles';

vi.mock('@/services/connectionService', () => ({
  connectionService: {
    isOnline: () => false,
    isOffline: () => true,
    considerOffline: () => true,
    setOffline: () => {},
    initialize: () => () => void 0,
  }
}));

// Mock Dexie DB used by offline queue
vi.mock('@/db/schema', () => {
  class InMemoryTable<T extends { id?: number }> {
    private items: T[] = [];
    private autoId = 1;
    add = async (item: T): Promise<number> => {
      const id = this.autoId++;
      (item as T & { id: number }).id = id;
      this.items.push(item);
      return id;
    };
    update = async (id: number, updates: Partial<T>): Promise<void> => {
      const idx = this.items.findIndex((i) => (i as Record<string, unknown>).id === id);
      if (idx >= 0) this.items[idx] = { ...this.items[idx], ...updates } as T;
    };
    where = (field: keyof T & string) => ({
      equals: (value: unknown) => ({
        toArray: async () => this.items.filter((i) => (i as Record<string, unknown>)[field] === value),
        count: async () => this.items.filter((i) => (i as Record<string, unknown>)[field] === value).length,
      }),
    });
    toArray = async () => this.items.slice();
    get = async (id: number) => this.items.find((i) => (i as Record<string, unknown>).id === id) || null;
  }
  interface OfflineOperation {
    id?: number;
    type: string;
    parkingLotId: string;
    plate: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
    createdAt: string;
    status: string;
    errorMessage?: string;
  }
  class ParkiuDB {
    operations = new InMemoryTable<OfflineOperation>();
    parkingSpots = new InMemoryTable<Record<string, unknown>>();
    vehicles = new InMemoryTable<Record<string, unknown>>();
    transactions = new InMemoryTable<Record<string, unknown>>();
  }
  return { ParkiuDB };
});

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    getAccessTokenSilently: vi.fn(async () => 'token'),
  })
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useVehicles offline enqueue', () => {
  it('returns a temporary entry response when offline', async () => {
    const { result } = renderHook(() => useRegisterVehicleEntry(), { wrapper });
    const mutate = result.current.mutateAsync;
    const data = await act(async () => await mutate({ parkingLotId: 'pl1', vehicleData: { plate: 'ABC123', vehicle_type: 'car', space_number: 'A1' } }));
    // Temporary response has a transaction_id and entry_time
    expect((data as { transaction_id: number }).transaction_id).toBeTruthy();
  });

  it('returns a temporary exit response when offline', async () => {
    const { result } = renderHook(() => useRegisterVehicleExit(), { wrapper });
    const mutate = result.current.mutateAsync;
    const data = await act(async () => await mutate({ parkingLotId: 'pl1', vehicleData: { plate: 'ABC123', payment_amount: 1000, payment_method: 'cash' } }));
    expect((data as { total_cost: number }).total_cost).toBe(1000);
  });
});

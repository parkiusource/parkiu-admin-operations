import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enqueueOperation, listPending, getPendingCount } from '@/services/offlineQueue';

// Mock in-memory Dexie schema to avoid IndexedDB in Node test env
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
  }
  return { ParkiuDB };
});

describe('offlineQueue basic operations', () => {
  beforeEach(async () => {
    // best-effort: no dedicated clear, list and delete by id would be better; for now just read count
  });

  it('enqueues and lists pending operations', async () => {
    const id = await enqueueOperation({
      type: 'entry',
      parkingLotId: 'pl_test',
      plate: 'TEST123',
      payload: { plate: 'TEST123', vehicle_type: 'car', client_entry_time: new Date().toISOString() },
      idempotencyKey: 'entry-TEST123-1',
    });
    expect(id).toBeTypeOf('number');

    const count = await getPendingCount();
    expect(count).toBeGreaterThanOrEqual(1);

    const all = await listPending();
    const found = all.find(o => o.id === id);
    expect(found?.plate).toBe('TEST123');
  });
});

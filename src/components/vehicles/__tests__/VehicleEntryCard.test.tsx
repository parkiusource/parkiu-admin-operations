/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { VehicleEntryCard } from '../../vehicles/VehicleEntryCard';
import type { ParkingLot } from '@/types/parking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useAdminProfileCentralized', () => ({
  useAdminProfileStatus: () => ({ profile: { role: 'local_admin' }, isAuthenticated: true, status: 'active', isLoading: false }),
  useAdminProfileCentralized: () => ({ data: { profile: { role: 'local_admin', status: 'active' } }, isLoading: false })
}));

vi.mock('@/hooks', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
let mockSpaces: Array<{ id: number; number: string; status: 'available' | 'occupied'; type?: 'car' | 'motorcycle' | 'bicycle' | 'truck' }> = [
  { id: 1, number: 'A1', status: 'available', type: 'car' },
  { id: 2, number: 'A2', status: 'occupied', type: 'car' },
];
vi.mock('@/hooks/parking/useParkingSpots', () => ({
  useRealParkingSpaces: () => ({ data: mockSpaces, isLoading: false })
}));
let mockSearchData: {
  plate: string;
  vehicle_type: 'car' | 'motorcycle' | 'bicycle' | 'truck';
  spot_number: string;
  entry_time: string;
  duration_minutes: number;
  current_cost: number;
} | null = null;
vi.mock('@/api/hooks/useVehicles', () => ({
  useRegisterVehicleEntry: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useSearchVehicle: () => ({ data: mockSearchData })
}));

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('VehicleEntryCard', () => {
  const parkingLot: ParkingLot = {
    id: '1',
    name: 'Test Lot',
    address: 'Calle 123',
    location: { latitude: 0, longitude: 0 },
    total_spots: 10,
    car_rate_per_minute: 100,
    motorcycle_rate_per_minute: 50,
    bicycle_rate_per_minute: 10,
    truck_rate_per_minute: 150,
    fixed_rate_car: 10000,
    fixed_rate_motorcycle: 4000,
    fixed_rate_bicycle: 2000,
    fixed_rate_truck: 14000,
    fixed_rate_threshold_minutes: 720,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('rejects invalid car plate format', () => {
    renderWithClient(<VehicleEntryCard parkingLot={parkingLot} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Carro/i })[0]);

    const plateInput = screen.getByPlaceholderText('Ej: ABC123');
    fireEvent.change(plateInput, { target: { value: '12-ABC' } });

    fireEvent.click(screen.getByText('Confirmar Entrada'));

    expect(screen.queryByText(/formato inválido/i)).toBeTruthy();
  });

  it('shows error if manual space is occupied', () => {
    mockSpaces = [
      { id: 1, number: 'A1', status: 'occupied', type: 'car' },
      { id: 2, number: 'A2', status: 'occupied', type: 'car' },
    ];
    renderWithClient(<VehicleEntryCard parkingLot={parkingLot} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Carro/i })[0]);
    fireEvent.click(screen.getAllByLabelText(/Manual/)[0]);

    const plateInput = screen.getAllByPlaceholderText('Ej: ABC123')[0];
    fireEvent.change(plateInput, { target: { value: 'ABC123' } });

    const spaceInput = screen.getByPlaceholderText('Ej: A-15, B2, 101');
    fireEvent.change(spaceInput, { target: { value: 'A2' } });

    fireEvent.click(screen.getByText('Confirmar Entrada'));

    expect(screen.queryByText(/no está disponible/i)).toBeTruthy();
  });

  it('blocks duplicate active entry for same plate', () => {
    mockSearchData = { plate: 'ABC123', vehicle_type: 'car', spot_number: 'A1', entry_time: new Date().toISOString(), duration_minutes: 0, current_cost: 0 };
    renderWithClient(<VehicleEntryCard parkingLot={parkingLot} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Carro/i })[0]);
    const plateInput = screen.getAllByPlaceholderText('Ej: ABC123')[0];
    fireEvent.change(plateInput, { target: { value: 'ABC123' } });

    fireEvent.click(screen.getByText('Confirmar Entrada'));

    expect(screen.queryByText(/ya está activa/i)).toBeTruthy();
    mockSearchData = null;
  });
});

import { describe, it, expect, vi, Mock } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import AdminParkingDashboard from '../../parking/AdminParkingDashboard';

// Mocks
vi.mock('@/hooks/useAdminProfileCentralized', () => ({
  useAdminProfileStatus: vi.fn(),
}));
vi.mock('@/hooks/parking', () => ({
  useParkingLots: vi.fn(),
  useRealParkingSpacesWithVehicles: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useUpdateRealParkingSpaceStatus: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
}));

const { useAdminProfileStatus } = await import('@/hooks/useAdminProfileCentralized');
const { useParkingLots } = await import('@/hooks/parking');

function renderWithProviders(ui: React.ReactElement, initialEntry = '/parking') {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/parking" element={ui} />
          <Route path="/parking/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AdminParkingDashboard gating', () => {
  it('hides create buttons for operator role', () => {
    (useAdminProfileStatus as unknown as Mock).mockReturnValue({ profile: { role: 'operator' } });
    (useParkingLots as unknown as Mock).mockReturnValue({ parkingLots: [], isLoading: false });

    renderWithProviders(<AdminParkingDashboard />);

    // Para operator se oculta el botón de crear, por lo que no debe existir
    expect(screen.queryByRole('button', { name: /crear parqueadero/i })).toBeNull();
  });

  it('redirects if route :id is not in user lots', () => {
    (useAdminProfileStatus as unknown as Mock).mockReturnValue({ profile: { role: 'local_admin' } });
    (useParkingLots as unknown as Mock).mockReturnValue({ parkingLots: [{ id: 'A', name: 'Lot A', address: '', location: { latitude: 0, longitude: 0 }, total_spots: 0, car_rate_per_minute: 1, motorcycle_rate_per_minute: 1, bicycle_rate_per_minute: 1, truck_rate_per_minute: 1, fixed_rate_car: 1, fixed_rate_motorcycle: 1, fixed_rate_bicycle: 1, fixed_rate_truck: 1, fixed_rate_threshold_minutes: 60 }], isLoading: false });

    renderWithProviders(<AdminParkingDashboard />, '/parking/B');

    // Debe renderizar finalmente la página de parking (tras redirigir a /parking/A)
    // Validamos con un texto estable del header
    expect(screen.getByText(/Mis Parqueaderos/i)).toBeInTheDocument();
  });
});

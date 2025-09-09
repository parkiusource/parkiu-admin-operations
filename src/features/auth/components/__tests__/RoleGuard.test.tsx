import { describe, it, expect, vi, Mock } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import RoleGuard from '../RoleGuard';

// Mock centralized profile hook
vi.mock('@/hooks/useAdminProfileCentralized', () => {
  return {
    useAdminProfileCentralized: vi.fn(),
  };
});

const { useAdminProfileCentralized } = await import('@/hooks/useAdminProfileCentralized');

const TestPage = () => <div>OK</div>;
const RedirectPage = () => <div>REDIRECT</div>;

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
  );
}

describe('RoleGuard', () => {
  it('allows access for allowed role and active status', async () => {
    (useAdminProfileCentralized as unknown as Mock).mockReturnValue({
      data: { profile: { role: 'global_admin', status: 'active' } },
      isLoading: false,
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<RoleGuard allowed={["global_admin", "local_admin"]} /> }>
            <Route path="/" element={<TestPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('redirects when role not allowed', async () => {
    (useAdminProfileCentralized as unknown as Mock).mockReturnValue({
      data: { profile: { role: 'operator', status: 'active' } },
      isLoading: false,
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/redirect" element={<RedirectPage />} />
          <Route element={<RoleGuard allowed={["global_admin", "local_admin"]} redirectTo="/redirect" /> }>
            <Route path="/" element={<TestPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('REDIRECT')).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './features/dashboard/Dashboard';
import VehicleEntry from './features/vehicles/VehicleEntry';
import VehicleExit from './features/vehicles/VehicleExit';
import ParkingView from './features/parking/ParkingView';
import { LoginForm } from './features/auth/components/LoginForm';
import { OnboardingForm } from './features/onboarding/components/OnboardingForm';
import { AuthProvider } from './features/auth/components/AuthProvider';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { useConnectionStatus } from './hooks';
import { ToastContainer } from './components/Toast';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (antes era cacheTime)
      retry: 1,
    },
  },
});

function App() {
  // Inicializar el hook de estado de conexión
  useConnectionStatus();

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/onboarding" element={<OnboardingForm />} />
            <Route path="/callback" element={<div>Loading...</div>} />

            {/* Rutas protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/parking" element={<ParkingView />} />
                <Route path="/vehicles/entry" element={<VehicleEntry />} />
                <Route path="/vehicles/exit" element={<VehicleExit />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
      <ToastContainer />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './features/auth/components/AuthProvider';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { OnboardingGuard } from './features/onboarding/components/OnboardingGuard';
import { useConnectionStatus } from './hooks';
import { ToastProvider } from './context/ToastProvider';
import { ToastContainer } from './components/Toast';
import { BackendStatus } from './components/common/BackendStatus';
import './index.css';

// Lazy load components
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const VehicleEntry = lazy(() => import('./features/vehicles/VehicleEntry'));
const VehicleExit = lazy(() => import('./features/vehicles/VehicleExit'));
const ParkingView = lazy(() => import('./features/parking/ParkingView'));
const ParkingViewEnhanced = lazy(() => import('./features/parking/ParkingViewEnhanced'));
const ParkingTestView = lazy(() => import('./features/parking/ParkingTestView'));
const AdminParkingDashboard = lazy(() => import('./features/parking/AdminParkingDashboard'));
const LoginForm = lazy(() => import('./features/auth/components/LoginForm').then(module => ({ default: module.LoginForm })));
const EnhancedOnboardingForm = lazy(() => import('./features/onboarding/components/EnhancedOnboardingForm'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error: Error & { code?: string }) => {
        // No retry para errores de red cuando el backend no está disponible
        if (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_CONNECTION_REFUSED') {
          return false;
        }
        // Solo reintentar hasta 2 veces para otros errores
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Evitar refetch automático
      refetchOnMount: 'always', // Solo refetch al montar si es necesario
    },
  },
});

function App() {
  // Inicializar el hook de estado de conexión
  useConnectionStatus();

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Router>
          <AuthProvider>
            <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/login" element={<LoginForm />} />
              <Route
                path="/onboarding"
                element={
                  <OnboardingGuard>
                    <EnhancedOnboardingForm />
                  </OnboardingGuard>
                }
              />
              <Route path="/callback" element={<LoadingSpinner />} />

              {/* Rutas protegidas */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* ✅ NUEVA ESTRUCTURA DE RUTAS PROFESIONAL */}
                  <Route path="/parking" element={<AdminParkingDashboard />} />
                  <Route path="/parking/:id" element={<AdminParkingDashboard />} />

                  {/* Rutas de desarrollo y testing */}
                  <Route path="/parking-legacy" element={<ParkingView />} />
                  <Route path="/parking-enhanced" element={<ParkingViewEnhanced />} />
                  <Route path="/parking-test" element={<ParkingTestView />} />

                  <Route path="/vehicles/entry" element={<VehicleEntry />} />
                  <Route path="/vehicles/exit" element={<VehicleExit />} />
                </Route>
              </Route>
            </Routes>
            </Suspense>
          </AuthProvider>
        </Router>
        <ToastContainer />
      </ToastProvider>
      <BackendStatus />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;

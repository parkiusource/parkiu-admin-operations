import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransactionsHistory from '@/features/parking/TransactionsHistory';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AuthProvider } from './features/auth/components/AuthProvider';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { connectionService } from './services/connectionService';
import { ToastProvider } from './context/ToastProvider';
import { ToastContainer } from './components/Toast';
import { BackendStatus } from './components/common/BackendStatus';
import { RootRedirect } from './components/common/RootRedirect';
import './index.css';
import RoleGuard from './features/auth/components/RoleGuard';

// Lazy load components
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const Dashboard = lazy(() => import('./features/dashboard/DashboardWithRealData'));
const VehicleEntry = lazy(() => import('./features/vehicles/VehicleEntry'));
const VehicleExit = lazy(() => import('./features/vehicles/VehicleExit'));
const ParkingView = lazy(() => import('./features/parking/ParkingView'));
const ParkingViewEnhanced = lazy(() => import('./features/parking/ParkingViewEnhanced'));
const ParkingTestView = lazy(() => import('./features/parking/ParkingTestView'));
const AdminParkingDashboard = lazy(() => import('./features/parking/AdminParkingDashboard'));
const Settings = lazy(() => import('./features/settings/Settings'));
const LoginForm = lazy(() => import('./features/auth/components/LoginForm').then(module => ({ default: module.LoginForm })));
const CallbackPage = lazy(() => import('./features/auth/components/CallbackPage').then(module => ({ default: module.CallbackPage })));
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
      // ✅ OPTIMIZACIÓN: Configuración mejorada para performance
      networkMode: 'offlineFirst', // Priorizar cache offline
      refetchOnReconnect: 'always', // Refetch cuando se reconecte
    },
    mutations: {
      // ✅ OPTIMIZACIÓN: Configuración para mutaciones
      networkMode: 'offlineFirst',
      retry: 1, // Solo 1 reintento para mutaciones
    },
  },
});

function App() {
  // Initialize connection status monitoring
  useEffect(() => {
    const cleanup = connectionService.initialize();
    return cleanup;
  }, []);

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
                element={<EnhancedOnboardingForm />}
              />
              <Route path="/callback" element={<CallbackPage />} />

              {/* Ruta raíz - redirección inteligente basada en estado del usuario */}
              <Route path="/" element={<RootRedirect />} />

              {/* Rutas protegidas */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* ✅ Parking (visualización) permite también temp_admin */}
                  <Route element={<RoleGuard allowed={["global_admin", "local_admin", "operator", "temp_admin"]} /> }>
                    <Route path="/parking" element={<AdminParkingDashboard />} />
                    <Route path="/parking/:id" element={<AdminParkingDashboard />} />
                    <Route path="/parking/:id/history" element={<TransactionsHistory />} />
                  </Route>

                  {/* ✅ Vehicles (operación) sin temp_admin */}
                  <Route element={<RoleGuard allowed={["global_admin", "local_admin", "operator"]} /> }>
                    <Route path="/vehicles/entry" element={<VehicleEntry />} />
                    <Route path="/vehicles/exit" element={<VehicleExit />} />
                  </Route>

                  {/* Rutas de desarrollo y testing */}
                  <Route path="/parking-legacy" element={<ParkingView />} />
                  <Route path="/parking-enhanced" element={<ParkingViewEnhanced />} />
                  <Route path="/parking-test" element={<ParkingTestView />} />

                  {/* Configuración básica */}
                  <Route path="/settings" element={<Settings />} />
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

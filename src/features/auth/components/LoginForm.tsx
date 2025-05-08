import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/common';
import { LogIn } from 'lucide-react';

export const LoginForm = () => {
  const { loginWithRedirect } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-8">
              Panel de Administración
            </h1>

            <div className="flex flex-col items-center space-y-6">
              <Button
                onClick={() => {
                  loginWithRedirect({
                    appState: { returnTo: '/onboarding' }
                  });
                }}
                className="flex items-center gap-2 bg-white text-primary-900 hover:bg-white/90 px-8 py-3 text-base font-semibold shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105"
              >
                <LogIn className="w-6 h-6" />
                Iniciar Sesión
              </Button>

              <p className="text-sm text-white/60">
                Accede a todas las funcionalidades de administración
              </p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-primary-500 to-primary-300 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
        </div>
      </div>
    </div>
  );
};

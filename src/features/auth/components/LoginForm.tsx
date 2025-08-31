import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/common';
import { LogIn, Shield, MapPin, Car } from 'lucide-react';

export const LoginForm = () => {
  const { loginWithRedirect } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-parkiu-900 via-parkiu-800 to-parkiu-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 animate-bounce delay-1000">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
          <Car className="w-8 h-8 text-white/60" />
        </div>
      </div>
      <div className="absolute top-40 right-20 animate-bounce delay-2000">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
          <MapPin className="w-6 h-6 text-white/60" />
        </div>
      </div>
      <div className="absolute bottom-40 left-20 animate-bounce">
        <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
          <Shield className="w-7 h-7 text-white/60" />
        </div>
      </div>

      <div className="relative isolate px-6 pt-8 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Logo Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20">
                <img
                  src="/logo/primary.svg"
                  alt="ParkiU"
                  className="h-16 w-auto object-contain"
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="text-center py-16 sm:py-24">
            <div className="mb-8">
              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl mb-4 drop-shadow-lg">
                Panel de
              </h1>
              <h2 className="text-4xl font-bold tracking-tight text-parkiu-200 sm:text-6xl mb-8">
                Administración
              </h2>
            </div>

            <div className="max-w-2xl mx-auto">
              <p className="text-xl text-white/80 mb-12 leading-relaxed">
                Gestiona de forma inteligente todos los aspectos de tu sistema de parqueaderos con
                <span className="font-semibold text-white"> ParkiU</span>
              </p>

              <div className="flex flex-col items-center space-y-8">
                <Button
                  onClick={() => {
                    loginWithRedirect({
                      appState: { returnTo: '/onboarding' }
                    });
                  }}
                  className="group flex items-center gap-3 bg-white text-parkiu-900 hover:bg-parkiu-50 px-10 py-4 text-lg font-semibold shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl rounded-xl border-2 border-transparent hover:border-parkiu-200"
                >
                  <LogIn className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                  Iniciar Sesión
                </Button>

                <div className="flex items-center space-x-8 text-white/60">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span className="text-sm">Seguro</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span className="text-sm">Inteligente</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Car className="w-5 h-5" />
                    <span className="text-sm">Eficiente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Decorative elements */}
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-parkiu-400 to-cyan-300 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
        </div>
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-parkiu-300 to-parkiu-500 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
      </div>
    </div>
  );
};

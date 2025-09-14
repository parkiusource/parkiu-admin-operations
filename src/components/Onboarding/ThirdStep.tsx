import { motion } from 'framer-motion';
import { Shield, Clock, CheckCircle, Info, ArrowRight } from 'lucide-react';
import type { AdminProfile } from '@/types/common';

interface ThirdStepProps {
  onGoToDashboard?: () => void;
  status?: AdminProfile['status'];
  profile?: AdminProfile;
}

const ThirdStep = ({ onGoToDashboard, status, profile }: ThirdStepProps = {}) => {
  return (
    <div className="relative p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Casi terminamos!</h2>
        <p className="text-gray-600">Tu cuenta está siendo verificada por nuestro equipo</p>
      </div>

      {/* Neutral verification visual */}
      <div className="flex justify-center mb-4">
        <div className="w-24 h-24 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
          <Shield className="w-10 h-10 text-blue-600" />
        </div>
      </div>

      {/* Status Cards */}
      <div className="space-y-3 mb-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl"
        >
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-green-800">Información básica completada</h3>
            <p className="text-sm text-green-600">Tu perfil ha sido registrado exitosamente</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl"
        >
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-green-800">Parqueadero registrado</h3>
            <p className="text-sm text-green-600">Tu parqueadero está listo para ser activado</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-3 p-3 bg-parkiu-50 border border-parkiu-200 rounded-xl"
        >
          <div className="w-10 h-10 bg-parkiu-500 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-parkiu-800">Verificación en proceso</h3>
            <p className="text-sm text-parkiu-600">Nuestro equipo está validando tu información</p>
          </div>
        </motion.div>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-blue-50 to-parkiu-50 border border-blue-200 rounded-xl p-4"
      >
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
            <Info className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">¿Qué sigue?</h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Nuestro equipo verificará tu información en 1-2 días hábiles
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Te notificaremos por email cuando tu cuenta esté activa
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Podrás acceder al dashboard completo una vez aprobado
              </li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Dashboard Access Button - Solo mostrar si es temp_admin con status pending_verify */}
      {profile?.role === 'temp_admin' && status === 'pending_verify' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mt-6"
        >
          <button
            onClick={onGoToDashboard}
            className="w-full bg-gradient-to-r from-parkiu-600 to-parkiu-700 hover:from-parkiu-700 hover:to-parkiu-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 group"
          >
            <span>Acceder al Dashboard (Modo Temporal)</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
          </button>

          <p className="text-xs text-gray-500 text-center mt-3 px-4">
            💡 Como administrador temporal, puedes explorar el dashboard con funciones limitadas mientras verificamos tu cuenta
          </p>
        </motion.div>
      )}
    </div>
  );
};

ThirdStep.displayName = 'ThirdStep';

export { ThirdStep };

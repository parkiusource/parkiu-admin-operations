import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, ShieldCheck } from 'lucide-react';
import { CircleParking } from 'lucide-react';
import { FirstStep, SecondStep, ThirdStep } from '@/components/Onboarding';
import { useAdminProfileStatus, useAdminProfileCentralized } from '@/hooks/useAdminProfileCentralized';
import { useNavigate } from 'react-router-dom';

interface StepFormRef {
  submitForm: () => Promise<void>;
}

const steps = [
  { id: 1, title: 'Información Básica', icon: User },
  { id: 2, title: 'Parqueadero', icon: CircleParking },
  { id: 3, title: 'Verificación', icon: ShieldCheck },
];

const statusToStep: Record<string, number> = {
  initial: 1,
  pending_profile: 1,
  pending_parking: 2,
  pending_verify: 3,
  active: 3, // El guard ya redirige si está activo
};

export default function EnhancedOnboardingForm() {
  const { profile, status, isLoading: isProfileLoading } = useAdminProfileStatus();
  const { refetch: refetchProfile } = useAdminProfileCentralized();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const firstStepRef = useRef<StepFormRef>(null);
  const secondStepRef = useRef<StepFormRef>(null);

  // Función para ir al dashboard
  const handleGoToDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  // Sincroniza el paso con el status del perfil solo en la carga inicial
  useEffect(() => {
    if (status && !hasInitialized) {
      const targetStep = statusToStep[status] || 1;
      setCurrentStep(targetStep);
      setHasInitialized(true);
    }
  }, [status, hasInitialized]);

  // Barra de progreso visual mejorada
  const ProgressBar = () => (
    <div className="relative">
      {/* Progress line background */}
      <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 rounded-full"></div>

      {/* Animated progress line */}
      <motion.div
        className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-parkiu-500 to-parkiu-600 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <motion.div
              key={step.id}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              {/* Step circle */}
              <motion.div
                className={`relative w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-500 text-white shadow-lg'
                    : isActive
                    ? 'bg-gradient-to-r from-parkiu-500 to-parkiu-600 border-parkiu-500 text-white shadow-lg shadow-parkiu-500/25'
                    : 'bg-white border-gray-300 text-gray-400 shadow-sm'
                }`}
                whileHover={{ scale: 1.05 }}
                animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Icon className="w-5 h-5" />
                )}

                {/* Active pulse effect */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-parkiu-500/20"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>

              {/* Step title */}
              <motion.span
                className={`mt-3 text-sm font-medium text-center transition-colors duration-300 ${
                  isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'
                }`}
                animate={{ opacity: isActive || isCompleted ? 1 : 0.7 }}
              >
                {step.title}
              </motion.span>

              {/* Step number */}
              <span className={`text-xs mt-1 transition-colors duration-300 ${
                isActive || isCompleted ? 'text-parkiu-600' : 'text-gray-400'
              }`}>
                Paso {step.id}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  // Función para refrescar perfil y sincronizar step
  const refreshProfileAndSyncStep = useCallback(async (completedStep: number) => {
    console.log(`Refrescando perfil después de completar step ${completedStep}...`);
    const refreshedData = await refetchProfile();

    if (refreshedData?.data?.profile?.status) {
      const newStatus = refreshedData.data.profile.status;
      const expectedStep = statusToStep[newStatus] || completedStep + 1;

      console.log(`Status actualizado: ${newStatus}, step esperado: ${expectedStep}`);

      // Sincronizar el step con el nuevo status del servidor
      setCurrentStep(expectedStep);
    } else {
      // Si no hay datos actualizados, avanzar al siguiente step normalmente
      setCurrentStep(completedStep + 1);
    }
  }, [refetchProfile]);

  // Manejo de pasos
  const handleNext = async () => {
    try {
      if (currentStep === 1) {
        await firstStepRef.current?.submitForm();
        await refreshProfileAndSyncStep(1);
      } else if (currentStep === 2) {
        await secondStepRef.current?.submitForm();
        await refreshProfileAndSyncStep(2);
      }
    } catch (error) {
      console.error('Error al avanzar al siguiente paso:', error);
      // El error ya se maneja en los componentes individuales
      // No avanzamos al siguiente paso si hay error
    }
  };
  const handleBack = async () => {
    if (currentStep > 1) {
      // Refrescar el perfil al navegar hacia atrás para asegurar sincronización
      console.log('Refrescando perfil al navegar hacia atrás...');
      await refetchProfile();
      setCurrentStep(currentStep - 1);
    }
  };

  // Callback para cuando se completa el segundo step
  const handleSecondStepComplete = useCallback(async () => {
    await refreshProfileAndSyncStep(2);
  }, [refreshProfileAndSyncStep]);

  // Renderizado de pasos
  const StepComponent = useMemo(() => {
    if (currentStep === 1) return <FirstStep ref={firstStepRef} setLoading={setLoading} profile={profile} status={status} />;
    if (currentStep === 2) return <SecondStep ref={secondStepRef} onComplete={handleSecondStepComplete} />;
    if (currentStep === 3) return <ThirdStep onGoToDashboard={handleGoToDashboard} status={status} profile={profile} />;
    return null;
  }, [currentStep, profile, status, handleGoToDashboard, handleSecondStepComplete]);

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-parkiu-50 via-sky-50 to-blue-50 flex items-center justify-center p-3">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-parkiu-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-sky-400/20 to-parkiu-400/20 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        className="relative w-full max-w-lg lg:max-w-xl bg-white/90 backdrop-blur-xl rounded-xl lg:rounded-2xl shadow-xl border border-white/20 overflow-hidden"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Header with gradient background */}
        <div className="relative bg-gradient-to-r from-parkiu-600 via-parkiu-500 to-blue-600 px-4 lg:px-6 py-6 lg:py-8 text-center">
          <div className="absolute inset-0 bg-black/10"></div>
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <img src="/logo-parkiu.svg" alt="ParkiÜ" className="w-10 h-10" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">¡Bienvenido a ParkiÜ!</h1>
            <p className="text-parkiu-100 text-base lg:text-lg max-w-sm mx-auto leading-relaxed">
              Configura tu cuenta en pocos pasos y comienza a gestionar tu parqueadero
            </p>
          </motion.div>
        </div>

        {/* Progress section */}
        <div className="px-4 lg:px-6 py-4 lg:py-6 bg-gray-50/50">
          <ProgressBar />
        </div>

        {/* Content section */}
        <div className="px-4 lg:px-6 pb-4 lg:pb-6">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-lg lg:rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            {StepComponent}
          </motion.div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center mt-4 lg:mt-6 gap-3">
            <motion.button
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              className={`px-4 lg:px-5 py-2 lg:py-2.5 rounded-lg font-medium transition-all duration-200 ${
                currentStep === 1 || loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
              }`}
              whileHover={currentStep > 1 && !loading ? { scale: 1.02 } : {}}
              whileTap={currentStep > 1 && !loading ? { scale: 0.98 } : {}}
            >
              Atrás
            </motion.button>

            {currentStep < 3 && (
              <motion.button
                onClick={handleNext}
                disabled={loading}
                className={`px-6 lg:px-7 py-2 lg:py-2.5 rounded-lg font-semibold text-white transition-all duration-200 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-parkiu-600 to-parkiu-700 hover:from-parkiu-700 hover:to-parkiu-800 shadow-lg hover:shadow-xl'
                }`}
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Procesando...
                  </div>
                ) : currentStep === 1 ? (
                  'Continuar'
                ) : (
                  '¡Comenzar ahora!'
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

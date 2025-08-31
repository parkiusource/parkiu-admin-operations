import { useState, useRef, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, ShieldCheck } from 'lucide-react';
import { CircleParking } from 'lucide-react';
import { FirstStep, SecondStep, ThirdStep } from '@/components/Onboarding';
import { useAdminProfileStatus } from '@/hooks/useAdminProfileCentralized';

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

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const firstStepRef = useRef<StepFormRef>(null);
  const secondStepRef = useRef<StepFormRef>(null);

  // Sincroniza el paso con el status del perfil
  useEffect(() => {
    if (status) {
      setCurrentStep(statusToStep[status] || 1);
    }
  }, [status]);

  // Barra de progreso visual
  const ProgressBar = () => (
    <div className="mb-10">
      <div className="relative flex justify-between items-center mb-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all duration-300
                  ${isCompleted ? 'bg-parkiu-500 border-parkiu-500 text-white' :
                    isActive ? 'bg-white border-parkiu-500 text-parkiu-500 ring-4 ring-parkiu-100' :
                    'bg-white border-gray-200 text-gray-400'}
                `}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className={`mt-2 text-xs font-medium ${isActive || isCompleted ? 'text-parkiu-600' : 'text-gray-400'}`}>{step.title}</span>
            </div>
          );
        })}
      </div>
      <div className="relative h-1 bg-gray-200 rounded-full">
        <div
          className="absolute h-1 bg-parkiu-500 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );

  // Manejo de pasos
  const handleNext = async () => {
    if (currentStep === 1) {
      await firstStepRef.current?.submitForm();
      setCurrentStep(2);
    } else if (currentStep === 2) {
      await secondStepRef.current?.submitForm();
      setCurrentStep(3);
    }
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Renderizado de pasos
  const StepComponent = useMemo(() => {
    if (currentStep === 1) return <FirstStep ref={firstStepRef} setLoading={setLoading} profile={profile} />;
    if (currentStep === 2) return <SecondStep ref={secondStepRef} onComplete={() => setCurrentStep(3)} />;
    if (currentStep === 3) return <ThirdStep />;
    return null;
  }, [currentStep, profile]);

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-parkiu-50 to-white">
      <motion.div
        className="w-full max-w-md bg-white/95 rounded-2xl shadow-2xl shadow-primary/10 p-4 sm:p-6 border-t-4 border-primary"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col items-center mb-3">
          <img src="/logo-parkiu.svg" alt="ParkiÜ" className="w-20 h-20 drop-shadow-md mb-2" />
          <h1 className="text-2xl font-extrabold text-primary text-center mb-1">¡Bienvenido a ParkiÜ!</h1>
          <p className="text-sm text-secondary text-center max-w-xs">Configura tu cuenta para aprovechar todos los beneficios de la plataforma y gestiona tu parqueadero de manera inteligente.</p>
        </div>
        <div className="mb-4">
          <ProgressBar />
        </div>
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 border border-background">
            {StepComponent}
          </div>
          <div className="flex justify-between mt-4">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              className="btn-secondary"
            >
              Atrás
            </button>
            {currentStep < 3 && (
              <button
                onClick={handleNext}
                disabled={loading}
                className="btn text-lg font-bold shadow-lg"
              >
                {loading ? 'Cargando...' : '¡Comenzar ahora!'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

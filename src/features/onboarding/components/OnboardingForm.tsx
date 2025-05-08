import { motion } from 'framer-motion';
import { useOnboarding } from '../hooks/useOnboarding';
import { Button } from '@/components/common';
import { CheckCircle, User, ShieldCheck, LucideIcon } from 'lucide-react';
import { CircleParking } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      when: 'beforeChildren',
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stepIcons: Record<number, LucideIcon> = {
  1: User,
  2: CircleParking,
  3: ShieldCheck,
};

export const OnboardingForm = () => {
  const {
    currentStep,
    nextStep,
  } = useOnboarding();

  const steps = [
    {
      id: 0,
      buttonLabel: 'Comenzar',
    },
    {
      id: 1,
      title: 'Información Básica',
      description: 'Completa tu perfil de administrador',
      buttonLabel: 'Guardar y Continuar',
    },
    {
      id: 2,
      title: 'Parqueadero',
      description: 'Registra tu primer parqueadero',
      buttonLabel: 'Guardar y Continuar',
    },
    {
      id: 3,
      title: 'Verificación',
      description: 'Verificaremos tu identidad para continuar',
      buttonLabel: 'Ir al Dashboard',
    },
  ];

  const currentStepData = steps.find((s) => s.id === currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg shadow-blue-100/50 p-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Bienvenido a Parkiu
            </h1>
            <p className="text-gray-500 mb-12">
              Configura tu cuenta en unos sencillos pasos
            </p>
          </motion.div>

          <div className="mb-12">
            <div className="relative">
              <div className="absolute left-0 top-2 w-full h-0.5 bg-gray-100">
                <div
                  className="h-full bg-blue-400 transition-all duration-500"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>
              <div className="relative flex justify-between">
                {steps.slice(1).map(({ id, title }) => {
                  const StepIcon = stepIcons[id];
                  const isCompleted = currentStep > id;
                  const isCurrent = currentStep === id;

                  return (
                    <div key={id} className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                          isCompleted
                            ? 'bg-blue-400 border-blue-400 text-white'
                            : isCurrent
                            ? 'bg-white border-blue-400 text-blue-500 ring-4 ring-blue-50'
                            : 'bg-white border-gray-200 text-gray-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <StepIcon className="w-6 h-6" />
                        )}
                      </div>
                      <span
                        className={`mt-3 text-sm font-medium ${
                          isCompleted || isCurrent ? 'text-blue-600' : 'text-gray-400'
                        }`}
                      >
                        {title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Button
              onClick={nextStep}
              className="w-full"
            >
              {currentStepData?.buttonLabel}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

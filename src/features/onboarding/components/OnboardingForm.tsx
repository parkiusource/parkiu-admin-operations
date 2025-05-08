import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FirstStep, SecondStep, ThirdStep } from '@/components/Onboarding';

interface StepRef {
  submitForm: () => Promise<void>;
}

const OnboardingForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const firstStepRef = useRef<StepRef>(null);
  const secondStepRef = useRef<StepRef>(null);

  const handleNext = async () => {
    if (currentStep === 1) {
      try {
        await firstStepRef.current?.submitForm();
        setCurrentStep(2);
      } catch (error) {
        console.error('Error en el primer paso:', error);
      }
    } else if (currentStep === 2) {
      try {
        await secondStepRef.current?.submitForm();
        setCurrentStep(3);
      } catch (error) {
        console.error('Error en el segundo paso:', error);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Configuración Inicial
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Paso {currentStep} de 3
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <FirstStep ref={firstStepRef} setLoading={setLoading} />
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SecondStep ref={secondStepRef} onComplete={() => setCurrentStep(3)} />
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ThirdStep />
                </motion.div>
              )}
            </AnimatePresence>

            {currentStep < 3 && (
              <div className="mt-8 flex justify-between">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 1 || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Atrás
                </button>
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Cargando...' : 'Siguiente'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { OnboardingForm };

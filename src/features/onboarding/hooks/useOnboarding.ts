import { useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const useOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { isAuthenticated } = useAuth();

  const nextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const updateProfile = (data: any) => {
    // TODO: Implementar actualización de perfil
    console.log('Updating profile:', data);
  };

  const updateParking = (data: any) => {
    // TODO: Implementar actualización de parqueadero
    console.log('Updating parking:', data);
  };

  return {
    currentStep,
    nextStep,
    isAuthenticated,
    updateProfile,
    updateParking,
    isProfileComplete: false, // TODO: Implementar verificación real
    hasParking: false, // TODO: Implementar verificación real
  };
};

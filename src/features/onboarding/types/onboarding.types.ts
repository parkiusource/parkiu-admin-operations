export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  buttonLabel: string;
  isCompleted?: boolean;
}

export interface OnboardingState {
  currentStep: number;
  isProfileComplete: boolean;
  hasParking: boolean;
}

export interface OnboardingContextType extends OnboardingState {
  setStep: (step: number) => void;
  nextStep: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  updateParking: (data: any) => Promise<void>;
}

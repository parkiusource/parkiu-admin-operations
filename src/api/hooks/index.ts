// ===============================
// EXPORTACIONES CENTRALIZADAS DE HOOKS DE API
// ===============================

// ✅ Hooks para Parking Lots (Parqueaderos)
export { useParkingLots } from './useParkingLots';

// ✅ Hooks para Vehicles (Vehículos)
export {
  useActiveVehicles,
  useTransactionHistory,
  useSearchVehicle,
  useRegisterVehicleEntry,
  useRegisterVehicleExit,
  useVehicleStats,
} from './useVehicles';

// ✅ Hooks que ya existían en el proyecto
export {
  useAdminProfile,
  useCompleteProfile,
  useAdminParkingLots,
  useRegisterParkingLot,
  useOnboardingStatus,
  useUpdateOnboardingStep,
} from './useAdminOnboarding';
export { useAutocompletePlaces } from './useAutocompletePlaces';
export { useCreateParking } from './useCreateParking';
export { usePlaceDetails } from './usePlaceDetails';
export { useSearchPlaces } from './useSearchPlaces';

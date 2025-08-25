// ===============================
// EXPORTACIONES CENTRALIZADAS DE SERVICIOS DE API
// ===============================

// ✅ Servicio para Vehículos
export { VehicleService } from './vehicleService';

// ✅ Servicios que ya existían en el proyecto
export {
  getAdminProfile,
  completeAdminProfile,
  getParkingLots,
  registerParkingLot,
  getOnboardingStatus,
  updateOnboardingStep,
  createParking,
} from './admin';
export { api } from './api';

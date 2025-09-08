// ===============================
// HOOKS PRINCIPALES
// ===============================
export { useVehicles } from './useVehicles';
export { useTransactions } from './useTransactions';
// Note: useConnectionStatus replaced with connectionService
export * from './useToast';

// ===============================
// PARKING HOOKS (NUEVO - REORGANIZADO)
// ===============================
// Exportar todos los hooks de parking desde la nueva estructura
export * from './parking';

// ===============================
// COMPATIBILIDAD HACIA ATRÁS
// ===============================
// Mantener export del hook original para compatibilidad
// @deprecated - Use hooks from './parking' instead
export { useAvailableParkingSpots } from './useParkingSpots';

// ===============================
// HOOKS PRINCIPALES
// ===============================
export { useVehicles } from './useVehicles';
export { useTransactions } from './useTransactions';
export * from './useConnectionStatus';
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
export { useParkingSpots } from './useParkingSpots';

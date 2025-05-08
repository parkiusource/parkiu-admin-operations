import { createContext, useContext } from 'react';

export const ParkingContext = createContext();
ParkingContext.displayName = 'ParkingContext';

export const useParkingContext = () => {
  const context = useContext(ParkingContext);
  if (!context) {
    throw new Error('useParkingContext must be used within a ParkingProvider');
  }
  return context;
};

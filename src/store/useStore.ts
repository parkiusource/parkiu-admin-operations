import { create } from 'zustand';
import { Vehicle, ParkingSpot, Transaction } from '../db/schema';

interface ParkiuState {
  // UI State
  isOffline: boolean;
  isSyncing: boolean;
  currentView: 'dashboard' | 'parking' | 'vehicles' | 'transactions';

  // Data State
  vehicles: Vehicle[];
  parkingSpots: ParkingSpot[];
  transactions: Transaction[];

  // Actions
  setOffline: (status: boolean) => void;
  setSyncing: (status: boolean) => void;
  setCurrentView: (view: ParkiuState['currentView']) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  setParkingSpots: (spots: ParkingSpot[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
}

export const useStore = create<ParkiuState>((set) => ({
  // Initial State
  isOffline: false,
  isSyncing: false,
  currentView: 'dashboard',
  vehicles: [],
  parkingSpots: [],
  transactions: [],

  // Actions
  setOffline: (status) => set({ isOffline: status }),
  setSyncing: (status) => set({ isSyncing: status }),
  setCurrentView: (view) => set({ currentView: view }),
  setVehicles: (vehicles) => set({ vehicles }),
  setParkingSpots: (spots) => set({ parkingSpots: spots }),
  setTransactions: (transactions) => set({ transactions }),
}));

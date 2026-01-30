import { create } from 'zustand';
import { Vehicle, ParkingSpot, Transaction } from '../db/schema';

export type LastSyncResult = { synced: number; failed: number } | null;
export type LastSyncError = 'auth' | null;

interface ParkiuState {
  // UI State
  isOffline: boolean;
  isSyncing: boolean;
  lastSyncResult: LastSyncResult;
  lastSyncError: LastSyncError;
  currentView: 'dashboard' | 'parking' | 'vehicles' | 'transactions';

  // Data State
  vehicles: Vehicle[];
  parkingSpots: ParkingSpot[];
  transactions: Transaction[];

  // Actions
  setOffline: (status: boolean) => void;
  setSyncing: (status: boolean) => void;
  setLastSyncResult: (result: LastSyncResult) => void;
  setLastSyncError: (error: LastSyncError) => void;
  setCurrentView: (view: ParkiuState['currentView']) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  setParkingSpots: (spots: ParkingSpot[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
}

export const useStore = create<ParkiuState>((set) => ({
  // Initial State
  isOffline: false,
  isSyncing: false,
  lastSyncResult: null,
  lastSyncError: null,
  currentView: 'dashboard',
  vehicles: [],
  parkingSpots: [],
  transactions: [],

  // Actions
  setOffline: (status) => set({ isOffline: status }),
  setSyncing: (status) => set({ isSyncing: status }),
  setLastSyncResult: (result) => set({ lastSyncResult: result, lastSyncError: null }),
  setLastSyncError: (error) => set({ lastSyncError: error }),
  setCurrentView: (view) => set({ currentView: view }),
  setVehicles: (vehicles) => set({ vehicles }),
  setParkingSpots: (spots) => set({ parkingSpots: spots }),
  setTransactions: (transactions) => set({ transactions }),
}));

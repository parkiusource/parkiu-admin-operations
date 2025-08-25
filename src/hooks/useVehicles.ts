import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VehicleService } from '../services/api/vehicleService';
import { Vehicle } from '../db/schema';
import { useToast } from './useToast';

const vehicleService = new VehicleService();

export const useVehicles = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: vehicles, isLoading, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const response = await vehicleService.listVehicles();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    }
  });

  const registerVehicle = useMutation({
    mutationFn: async (vehicle: Omit<Vehicle, 'id' | 'syncStatus'>) => {
      const response = await vehicleService.registerVehicle(vehicle);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      addToast('Vehículo registrado exitosamente', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message, 'error');
    }
  });

  const updateVehicle = useMutation({
    mutationFn: async ({ id, vehicle }: { id: number; vehicle: Partial<Vehicle> }) => {
      const response = await vehicleService.updateVehicle(id, vehicle);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      addToast('Vehículo actualizado exitosamente', 'success');
    },
    onError: (error: Error) => {
      addToast(error.message, 'error');
    }
  });

  const registerVehicleEntry = useMutation({
    mutationFn: async (entryData: { plate: string; vehicle_type: string; space_number: string }) => {
      // Simular registro de entrada usando el servicio local
      const vehicle = {
        plate: entryData.plate,
        type: entryData.vehicle_type as 'car' | 'motorcycle' | 'truck',
        status: 'parked' as const,
        entryTime: new Date(),
        parkingSpotId: 1 // ID genérico para el espacio
      };

      const response = await vehicleService.registerVehicle(vehicle);
      if (response.error) {
        throw new Error(response.error);
      }

      // Invalidar queries aquí para asegurar que se actualicen los datos
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      return {
        spot_number: entryData.space_number,
        entry_time: new Date().toISOString(),
        plate: entryData.plate
      };
    }
  });

  const registerVehicleExit = useMutation({
    mutationFn: async (exitData: { plate: string }) => {
      // Simular registro de salida
      const cost = Math.floor(Math.random() * 15000) + 5000; // Costo aleatorio entre $5,000 y $20,000

      // Invalidar queries aquí para asegurar que se actualicen los datos
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      // Aquí podrías actualizar el vehículo a status 'exited' si necesitas
      return {
        total_cost: cost,
        exit_time: new Date().toISOString(),
        plate: exitData.plate
      };
    }
  });

  return {
    vehicles,
    isLoading,
    error,
    registerVehicle,
    updateVehicle,
    registerVehicleEntry,
    registerVehicleExit
  };
};

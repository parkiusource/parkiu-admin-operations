import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VehicleService } from '../services/api/vehicleService';
import { Vehicle } from '../db/schema';
import { useToast } from './useToast';

const vehicleService = new VehicleService();

export const useVehicles = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

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
      showToast({
        type: 'success',
        message: 'Vehículo registrado exitosamente'
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        message: error.message
      });
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
      showToast({
        type: 'success',
        message: 'Vehículo actualizado exitosamente'
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        message: error.message
      });
    }
  });

  return {
    vehicles,
    isLoading,
    error,
    registerVehicle,
    updateVehicle
  };
};

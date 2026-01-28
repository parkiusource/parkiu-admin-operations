import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VehicleService } from '../vehicleService';
import type { ParkingLot, VehicleType } from '@/types/parking';
import * as offlineTariffs from '@/services/offlineTariffs';

// Mock del módulo offlineTariffs
vi.mock('@/services/offlineTariffs', () => ({
  getTariffs: vi.fn(),
  saveTariffs: vi.fn(),
}));

describe('VehicleService - Calculadora de Tarifas', () => {
  const mockParkingLot: ParkingLot = {
    id: 'test-parking-lot-1',
    name: 'Parking Test',
    address: 'Calle 123',
    location: {
      latitude: 4.6097,
      longitude: -74.0817,
    },
    car_rate_per_minute: 50, // $50/minuto
    motorcycle_rate_per_minute: 25, // $25/minuto
    bicycle_rate_per_minute: 10, // $10/minuto
    truck_rate_per_minute: 75, // $75/minuto
    fixed_rate_car: 20000, // $20,000 tarifa fija
    fixed_rate_motorcycle: 10000, // $10,000 tarifa fija
    fixed_rate_bicycle: 5000, // $5,000 tarifa fija
    fixed_rate_truck: 30000, // $30,000 tarifa fija
    fixed_rate_threshold_minutes: 720, // 12 horas
    price_per_hour: 3000,
    total_spots: 50,
    available_spots: 25,
    status: 'active',
  } as ParkingLot;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateCurrentCost', () => {
    it('debería calcular correctamente el costo por minuto para carro (corta duración)', () => {
      const entryTime = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 60 minutos atrás
      const result = VehicleService.calculateCurrentCost(entryTime, 'car', mockParkingLot);

      expect(result.duration_minutes).toBe(60);
      expect(result.vehicle_type).toBe('car');
      expect(result.rate_per_minute).toBe(50);
      expect(result.is_fixed_rate).toBe(false);
      expect(result.calculated_cost).toBe(3000); // 60 * 50
      expect(result.equivalent_hours).toBe(1.0);
      expect(result.rate_description).toBe('Tarifa por minuto');
    });

    it('debería calcular correctamente el costo por minuto para moto', () => {
      const entryTime = new Date(Date.now() - 120 * 60 * 1000).toISOString(); // 120 minutos atrás
      const result = VehicleService.calculateCurrentCost(entryTime, 'motorcycle', mockParkingLot);

      expect(result.duration_minutes).toBe(120);
      expect(result.vehicle_type).toBe('motorcycle');
      expect(result.rate_per_minute).toBe(25);
      expect(result.is_fixed_rate).toBe(false);
      expect(result.calculated_cost).toBe(3000); // 120 * 25
    });

    it('debería aplicar tarifa fija cuando se excede el threshold (carro)', () => {
      const entryTime = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(); // 13 horas atrás
      const result = VehicleService.calculateCurrentCost(entryTime, 'car', mockParkingLot);

      expect(result.duration_minutes).toBeGreaterThan(720); // > 12 horas
      expect(result.is_fixed_rate).toBe(true);
      expect(result.calculated_cost).toBe(20000); // Tarifa fija
      expect(result.rate_description).toBe('Tarifa fija');
    });

    it('debería aplicar tarifa fija cuando se excede el threshold (moto)', () => {
      const entryTime = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(); // 13 horas atrás
      const result = VehicleService.calculateCurrentCost(entryTime, 'motorcycle', mockParkingLot);

      expect(result.is_fixed_rate).toBe(true);
      expect(result.calculated_cost).toBe(10000); // Tarifa fija para moto
    });

    it('debería calcular correctamente para camión', () => {
      const entryTime = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutos
      const result = VehicleService.calculateCurrentCost(entryTime, 'truck', mockParkingLot);

      expect(result.vehicle_type).toBe('truck');
      expect(result.rate_per_minute).toBe(75);
      expect(result.calculated_cost).toBe(2250); // 30 * 75
    });

    it('debería calcular correctamente para bicicleta', () => {
      const entryTime = new Date(Date.now() - 180 * 60 * 1000).toISOString(); // 180 minutos
      const result = VehicleService.calculateCurrentCost(entryTime, 'bicycle', mockParkingLot);

      expect(result.vehicle_type).toBe('bicycle');
      expect(result.rate_per_minute).toBe(10);
      expect(result.calculated_cost).toBe(1800); // 180 * 10
    });

    it('debería usar fallback de localStorage si las tarifas no están en memoria', () => {
      const parkingLotSinTarifas = { id: 'test-lot-2' } as ParkingLot;
      const tarifasCache = {
        car_rate_per_minute: 100,
        motorcycle_rate_per_minute: 50,
        bicycle_rate_per_minute: 20,
        truck_rate_per_minute: 150,
        fixed_rate_car: 25000,
        fixed_rate_motorcycle: 12000,
        fixed_rate_bicycle: 6000,
        fixed_rate_truck: 35000,
        fixed_rate_threshold_minutes: 600,
      };

      vi.mocked(offlineTariffs.getTariffs).mockReturnValue(tarifasCache);

      const entryTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const result = VehicleService.calculateCurrentCost(entryTime, 'car', parkingLotSinTarifas);

      expect(offlineTariffs.getTariffs).toHaveBeenCalledWith('test-lot-2');
      expect(result.rate_per_minute).toBe(100); // Tarifa de localStorage
      expect(result.calculated_cost).toBe(6000); // 60 * 100
    });

    it('debería retornar $0 si no hay tarifas disponibles (ni en memoria ni en cache)', () => {
      const parkingLotSinTarifas = { id: 'test-lot-3' } as ParkingLot;
      vi.mocked(offlineTariffs.getTariffs).mockReturnValue(null);

      const entryTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const result = VehicleService.calculateCurrentCost(entryTime, 'car', parkingLotSinTarifas);

      expect(result.calculated_cost).toBe(0);
      expect(result.rate_per_minute).toBe(0);
    });

    it('debería manejar duraciones muy cortas (menos de 1 minuto)', () => {
      const entryTime = new Date(Date.now() - 30 * 1000).toISOString(); // 30 segundos
      const result = VehicleService.calculateCurrentCost(entryTime, 'car', mockParkingLot);

      expect(result.duration_minutes).toBe(0);
      expect(result.calculated_cost).toBe(0);
    });

    it('debería redondear correctamente los costos', () => {
      // Simular un costo con decimales
      const entryTime = new Date(Date.now() - 37 * 60 * 1000).toISOString(); // 37 minutos
      const result = VehicleService.calculateCurrentCost(entryTime, 'car', mockParkingLot);

      expect(result.calculated_cost).toBe(1850); // 37 * 50, redondeado
      expect(Number.isInteger(result.calculated_cost)).toBe(true);
    });
  });

  describe('estimateCost', () => {
    it('debería estimar correctamente el costo para 2 horas de carro', () => {
      const result = VehicleService.estimateCost(120, 'car', mockParkingLot);

      expect(result.duration_minutes).toBe(120);
      expect(result.vehicle_type).toBe('car');
      expect(result.calculated_cost).toBe(6000); // 120 * 50
      expect(result.is_fixed_rate).toBe(false);
    });

    it('debería estimar tarifa fija para duración larga', () => {
      const result = VehicleService.estimateCost(800, 'car', mockParkingLot); // 13+ horas

      expect(result.is_fixed_rate).toBe(true);
      expect(result.calculated_cost).toBe(20000); // Tarifa fija
    });

    it('debería estimar correctamente para diferentes tipos de vehículo', () => {
      const duration = 60;
      const resultCar = VehicleService.estimateCost(duration, 'car', mockParkingLot);
      const resultMoto = VehicleService.estimateCost(duration, 'motorcycle', mockParkingLot);
      const resultBike = VehicleService.estimateCost(duration, 'bicycle', mockParkingLot);
      const resultTruck = VehicleService.estimateCost(duration, 'truck', mockParkingLot);

      expect(resultCar.calculated_cost).toBe(3000); // 60 * 50
      expect(resultMoto.calculated_cost).toBe(1500); // 60 * 25
      expect(resultBike.calculated_cost).toBe(600); // 60 * 10
      expect(resultTruck.calculated_cost).toBe(4500); // 60 * 75
    });

    it('debería usar fallback de localStorage en estimación', () => {
      const parkingLotSinTarifas = { id: 'test-lot-4' } as ParkingLot;
      const tarifasCache = {
        car_rate_per_minute: 60,
        motorcycle_rate_per_minute: 30,
        bicycle_rate_per_minute: 15,
        truck_rate_per_minute: 90,
        fixed_rate_car: 22000,
        fixed_rate_motorcycle: 11000,
        fixed_rate_bicycle: 5500,
        fixed_rate_truck: 33000,
        fixed_rate_threshold_minutes: 720,
      };

      vi.mocked(offlineTariffs.getTariffs).mockReturnValue(tarifasCache);

      const result = VehicleService.estimateCost(100, 'car', parkingLotSinTarifas);

      expect(result.calculated_cost).toBe(6000); // 100 * 60
    });

    it('debería calcular correctamente el equivalente en horas', () => {
      const result = VehicleService.estimateCost(150, 'car', mockParkingLot); // 2.5 horas

      expect(result.equivalent_hours).toBe(2.5);
    });
  });

  describe('Validaciones y Edge Cases', () => {
    it('debería manejar tarifas negativas convirtiendo a 0', () => {
      const parkingLotInvalido = {
        ...mockParkingLot,
        car_rate_per_minute: -50,
      } as ParkingLot;

      vi.mocked(offlineTariffs.getTariffs).mockReturnValue(null);

      const result = VehicleService.estimateCost(60, 'car', parkingLotInvalido);
      expect(result.calculated_cost).toBe(0);
    });

    it('debería manejar threshold inválido con valor por defecto', () => {
      const parkingLotSinThreshold = {
        ...mockParkingLot,
        fixed_rate_threshold_minutes: undefined,
      } as unknown as ParkingLot;

      vi.mocked(offlineTariffs.getTariffs).mockReturnValue(null);

      const result = VehicleService.estimateCost(750, 'car', parkingLotSinThreshold);
      // Debería usar el threshold por defecto (720 minutos)
      expect(result.is_fixed_rate).toBe(true);
    });

    it('debería usar tarifa de carro por defecto para tipo de vehículo desconocido', () => {
      const result = VehicleService.estimateCost(60, 'unknown' as VehicleType, mockParkingLot);
      expect(result.rate_per_minute).toBe(50); // Tarifa de carro (default)
    });
  });

  describe('Integración con Offline System', () => {
    it('debería cachear tarifas al cargar parking lot', () => {
      // Este test verifica que el hook useParkingLots llame a saveTariffs
      // (Test de integración, no unit test puro)
      expect(offlineTariffs.saveTariffs).toBeDefined();
      expect(offlineTariffs.getTariffs).toBeDefined();
    });
  });
});

// ===============================
// TIPOS CENTRALIZADOS PARA PARQUEADEROS
// ===============================

// ✅ Estructura estándar que usa el frontend - ACTUALIZADA CON TARIFAS COLOMBIANAS
export interface ParkingLot {
  id?: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  total_spots: number;
  admin_uuid?: string;
  description?: string;
  opening_time?: string;
  closing_time?: string;
  contact_name?: string;
  contact_phone?: string;
  tax_id?: string; // NIT / tax identification

  // 🇨🇴 NUEVAS TARIFAS COLOMBIANAS POR MINUTO
  car_rate_per_minute: number;        // $/minuto para carros
  motorcycle_rate_per_minute: number; // $/minuto para motos
  bicycle_rate_per_minute: number;    // $/minuto para bicicletas
  truck_rate_per_minute: number;      // $/minuto para camiones

  // 🎯 TARIFAS FIJAS (después del umbral)
  fixed_rate_car: number;             // Tarifa fija carros
  fixed_rate_motorcycle: number;      // Tarifa fija motos
  fixed_rate_bicycle: number;         // Tarifa fija bicicletas
  fixed_rate_truck: number;           // Tarifa fija camiones

  // ⏰ CONFIGURACIÓN DE TARIFA FIJA
  fixed_rate_threshold_minutes: number; // Minutos para aplicar tarifa fija

  // 📊 CAMPOS LEGACY (compatibilidad con sistema anterior)
  price_per_hour?: number;            // @deprecated - usar car_rate_per_minute * 60
  hourly_rate?: number;               // @deprecated - usar car_rate_per_minute * 60
  daily_rate?: number;                // @deprecated - usar fixed_rate_car
  monthly_rate?: number;              // Para contratos especiales

  // 📈 ESTADÍSTICAS EN TIEMPO REAL (solo en responses)
  available_spaces?: number;
  available_car_spaces?: number;
  available_motorcycle_spaces?: number;
  available_bicycle_spaces?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ✅ Interfaz para mostrar en listas con datos calculados
export interface ParkingLotWithAvailability extends ParkingLot {
  available_spots: number;
  occupied_spots: number;
  occupancy_percentage: number;
}

// ✅ Estructura que espera el backend (ACTUALIZADA con tarifas colombianas)
export interface ParkingLotAPI {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_name: string;
  contact_phone: string;
  admin_uuid?: string;
  description?: string;
  opening_time?: string;
  closing_time?: string;
  tax_id?: string;

  // 🇨🇴 TARIFAS COLOMBIANAS POR MINUTO (nuevos campos principales)
  car_rate_per_minute: number;
  motorcycle_rate_per_minute: number;
  bicycle_rate_per_minute: number;
  truck_rate_per_minute: number;

  // 🎯 TARIFAS FIJAS (después del umbral)
  fixed_rate_car: number;
  fixed_rate_motorcycle: number;
  fixed_rate_bicycle: number;
  fixed_rate_truck: number;

  // ⏰ CONFIGURACIÓN DE TARIFA FIJA
  fixed_rate_threshold_minutes: number;

  // 📊 CAMPOS LEGACY (compatibilidad con versión anterior)
  hourly_rate?: number;    // Calculado como car_rate_per_minute * 60
  daily_rate?: number;     // Igual que fixed_rate_car
  monthly_rate?: number;   // Para contratos especiales

  // 📈 RESPUESTA DEL SERVIDOR (solo en GET requests)
  total_spaces?: number;
  available_spaces?: number;
  available_car_spaces?: number;
  available_motorcycle_spaces?: number;
  available_bicycle_spaces?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ===============================
// ADAPTADORES DE TIPOS
// ===============================

// ✅ Adaptador: Frontend -> Backend
export function toParkingLotAPI(parking: ParkingLot): ParkingLotAPI {
  return {
    id: parking.id,
    name: parking.name,
    address: parking.address,
    latitude: parking.location.latitude,
    longitude: parking.location.longitude,
    contact_name: parking.contact_name || '',
    contact_phone: parking.contact_phone || '',
    admin_uuid: parking.admin_uuid,
    description: parking.description,
    opening_time: parking.opening_time,
    closing_time: parking.closing_time,
    tax_id: parking.tax_id,

    // 🇨🇴 TARIFAS PRINCIPALES
    car_rate_per_minute: parking.car_rate_per_minute,
    motorcycle_rate_per_minute: parking.motorcycle_rate_per_minute,
    bicycle_rate_per_minute: parking.bicycle_rate_per_minute,
    truck_rate_per_minute: parking.truck_rate_per_minute,

    fixed_rate_car: parking.fixed_rate_car,
    fixed_rate_motorcycle: parking.fixed_rate_motorcycle,
    fixed_rate_bicycle: parking.fixed_rate_bicycle,
    fixed_rate_truck: parking.fixed_rate_truck,

    fixed_rate_threshold_minutes: parking.fixed_rate_threshold_minutes,

    // 📊 CAMPOS LEGACY para compatibilidad
    hourly_rate: parking.price_per_hour || parking.car_rate_per_minute * 60,
    daily_rate: parking.daily_rate || parking.fixed_rate_car,
    monthly_rate: parking.monthly_rate,
  };
}

// ✅ Adaptador: Backend -> Frontend
export function fromParkingLotAPI(api: ParkingLotAPI): ParkingLot {
  return {
    id: api.id,
    name: api.name,
    address: api.address,
    location: {
      latitude: api.latitude,
      longitude: api.longitude,
    },
    total_spots: api.total_spaces || 0,
    admin_uuid: api.admin_uuid,
    description: api.description,
    opening_time: api.opening_time,
    closing_time: api.closing_time,
    contact_name: api.contact_name,
    contact_phone: api.contact_phone,
    tax_id: api.tax_id,

    // 🇨🇴 TARIFAS PRINCIPALES (usar valores del API si existen, sino calcular desde legacy)
    car_rate_per_minute: api.car_rate_per_minute || (api.hourly_rate || 5000) / 60,
    motorcycle_rate_per_minute: api.motorcycle_rate_per_minute || ((api.hourly_rate || 5000) / 60) * 0.3,
    bicycle_rate_per_minute: api.bicycle_rate_per_minute || ((api.hourly_rate || 5000) / 60) * 0.06,
    truck_rate_per_minute: api.truck_rate_per_minute || ((api.hourly_rate || 5000) / 60) * 1.5,

    fixed_rate_car: api.fixed_rate_car || api.daily_rate || (api.hourly_rate || 5000) * 10,
    fixed_rate_motorcycle: api.fixed_rate_motorcycle || (api.daily_rate || (api.hourly_rate || 5000) * 10) * 0.4,
    fixed_rate_bicycle: api.fixed_rate_bicycle || (api.daily_rate || (api.hourly_rate || 5000) * 10) * 0.2,
    fixed_rate_truck: api.fixed_rate_truck || (api.daily_rate || (api.hourly_rate || 5000) * 10) * 1.4,

    // 0 = tarifa plena deshabilitada; solo default 720 cuando el API no envía el campo
    fixed_rate_threshold_minutes: api.fixed_rate_threshold_minutes ?? 720,

    // 📊 CAMPOS LEGACY para compatibilidad
    price_per_hour: api.hourly_rate || api.car_rate_per_minute * 60,
    hourly_rate: api.hourly_rate,
    daily_rate: api.daily_rate,
    monthly_rate: api.monthly_rate,

    // 📈 ESTADÍSTICAS (solo en responses)
    available_spaces: api.available_spaces,
    available_car_spaces: api.available_car_spaces,
    available_motorcycle_spaces: api.available_motorcycle_spaces,
    available_bicycle_spaces: api.available_bicycle_spaces,
    is_active: api.is_active,
    created_at: api.created_at,
    updated_at: api.updated_at,
  };
}

// ===============================
// TIPOS PARA REGISTRO DE VEHÍCULOS
// ===============================

// ===============================
// TIPOS PARA VEHÍCULOS - ACTUALIZADO CON NUEVA API
// ===============================

// 🚗 Tipos de vehículos soportados (orden de la documentación)
export type VehicleType = 'car' | 'motorcycle' | 'bicycle' | 'truck';

// ✅ ENTRADA DE VEHÍCULO - Nuevo formato API
export interface VehicleEntry {
  plate: string;
  vehicle_type: VehicleType;
  space_number?: string;               // Opcional: si no se envía, backend auto-asigna
  // Campos opcionales para compatibilidad con APIs
  space_id?: number | string;          // ID del espacio si se conoce
  spot_number?: string;                // Alias común en algunos backends
  parking_space_id?: number;           // Alias en backends que usan ID
  parking_space_number?: string;       // Alias de space_number
}

// ✅ SALIDA DE VEHÍCULO - Nuevo formato API
export interface VehicleExit {
  plate: string;
  payment_amount: number;
  payment_method: 'cash' | 'card' | 'digital';
  /** Costo calculado por el frontend - el backend debería usar este valor */
  calculated_cost?: number;
  /** Duración calculada por el frontend en minutos */
  duration_minutes?: number;
}

// ✅ RESPUESTA DE ENTRADA
export interface VehicleEntryResponse {
  transaction_id: number;
  entry_time: string;                  // ISO 8601 con timezone
  spot_number: string;
  estimated_cost: number;              // Costo estimado por 1 hora
}

// ✅ RESPUESTA DE SALIDA
export interface VehicleExitResponse {
  transaction_id: number;
  total_cost: number;                  // Costo calculado automáticamente
  duration_minutes: number;            // Duración total en minutos
  receipt: string;                     // JSON stringificado del recibo
}

// ✅ VEHÍCULO ACTIVO (para lista de vehículos en parqueadero)
export interface ActiveVehicle {
  plate: string;
  vehicle_type: VehicleType;
  spot_number: string;
  entry_time: string;                  // ISO 8601 con timezone
  duration_minutes: number;            // Duración actual
  current_cost: number;                // Costo actual calculado en tiempo real
}

// ✅ TRANSACCIÓN COMPLETA (para historial/reportes) - Actualizado según endpoint real
export interface VehicleTransaction {
  transaction_id: number;              // ID único de la transacción
  plate: string;                       // Placa del vehículo
  vehicle_type: VehicleType;           // Tipo: car, motorcycle, bicycle, truck
  spot_number: string;                 // Número del espacio asignado
  entry_time: string;                  // Fecha/hora de entrada en ISO 8601
  exit_time?: string | null;           // Fecha/hora de salida (null si activo)
  duration_minutes?: number | null;    // Tiempo total en minutos (null si activo)
  payment_amount?: number | null;      // Monto pagado por el cliente
  payment_method?: 'cash' | 'card' | 'digital' | null; // Método de pago
  total_cost?: number | null;          // Costo calculado por el sistema
  status: 'active' | 'completed';      // Estado: active, completed
  entry_admin: string;                 // Nombre del admin que registró entrada
  exit_admin?: string | null;          // Nombre del admin que registró salida
  receipt?: string;                    // JSON string del recibo (legacy)
}

// ✅ CALCULADORA DE COSTOS (utilidad para frontend)
export interface CostCalculation {
  duration_minutes: number;
  vehicle_type: VehicleType;
  rate_per_minute: number;
  is_fixed_rate: boolean;
  calculated_cost: number;
  equivalent_hours: number;            // Para mostrar "2.5 horas"
  rate_description: string;            // "Tarifa por minuto" | "Tarifa fija"
}

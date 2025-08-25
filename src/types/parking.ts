// ===============================
// TIPOS CENTRALIZADOS PARA PARQUEADEROS
// ===============================

// ✅ Estructura estándar que usa el frontend
export interface ParkingLot {
  id?: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  total_spots: number;
  price_per_hour: number;
  admin_uuid?: string;
  description?: string;
  opening_time?: string;
  closing_time?: string;
  daily_rate?: number;
  monthly_rate?: number;
  contact_name?: string;
  contact_phone?: string;
}

// ✅ Interfaz para mostrar en listas con datos calculados
export interface ParkingLotWithAvailability extends ParkingLot {
  available_spots: number;
  occupied_spots: number;
  occupancy_percentage: number;
}

// ✅ Estructura que espera el backend (snake_case y campos específicos)
export interface ParkingLotAPI {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  total_spots: number;
  hourly_rate: number;
  admin_uuid?: string;
  description?: string;
  opening_time?: string;
  closing_time?: string;
  daily_rate?: number;
  monthly_rate?: number;
  contact_name?: string;
  contact_phone?: string;
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
    total_spots: parking.total_spots,
    hourly_rate: parking.price_per_hour,
    admin_uuid: parking.admin_uuid,
    description: parking.description,
    opening_time: parking.opening_time,
    closing_time: parking.closing_time,
    daily_rate: parking.daily_rate,
    monthly_rate: parking.monthly_rate,
    contact_name: parking.contact_name,
    contact_phone: parking.contact_phone,
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
    total_spots: api.total_spots,
    price_per_hour: api.hourly_rate,
    admin_uuid: api.admin_uuid,
    description: api.description,
    opening_time: api.opening_time,
    closing_time: api.closing_time,
    daily_rate: api.daily_rate,
    monthly_rate: api.monthly_rate,
    contact_name: api.contact_name,
    contact_phone: api.contact_phone,
  };
}

// ===============================
// TIPOS PARA REGISTRO DE VEHÍCULOS
// ===============================

// ✅ Tipos para el nuevo sistema de registro/salida de vehículos
export interface VehicleEntry {
  plate: string;
  vehicle_type: 'car' | 'motorcycle' | 'truck' | 'bicycle';
  parking_lot_id: string;
  parking_space_id?: string;
  entry_time: string; // ISO 8601
  admin_uuid?: string;
}

export interface VehicleExit {
  plate: string;
  parking_lot_id: string;
  exit_time: string; // ISO 8601
  admin_uuid?: string;
}

export interface VehicleTransaction {
  id?: string;
  plate: string;
  vehicle_type: 'car' | 'motorcycle' | 'truck' | 'bicycle';
  parking_lot_id: string;
  parking_space_id?: string;
  entry_time: string;
  exit_time?: string;
  duration_minutes?: number;
  amount_charged?: number;
  status: 'active' | 'completed' | 'cancelled';
  admin_uuid?: string;
  created_at?: string;
  updated_at?: string;
}

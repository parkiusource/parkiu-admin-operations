import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert, AlertDescription } from '@/components/common/Alert';
import {
  Car,
  Bike,
  Truck,
  Clock,
  DollarSign,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Users,
  TrendingUp,
  Eye
} from 'lucide-react';
import { ParkingLot, ActiveVehicle, VehicleType } from '@/types/parking';
import { useActiveVehicles, useVehicleStats, useCostCalculator } from '@/api/hooks/useVehicles';

interface ActiveVehiclesViewProps {
  parkingLot: ParkingLot;
  onVehicleSelect?: (vehicle: ActiveVehicle) => void;
}

const vehicleIcons = {
  car: Car,
  motorcycle: Bike,
  bicycle: Bike,
  truck: Truck,
} as const;

const vehicleColors = {
  car: 'bg-blue-50 border-blue-200 text-blue-700',
  motorcycle: 'bg-green-50 border-green-200 text-green-700',
  bicycle: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  truck: 'bg-red-50 border-red-200 text-red-700',
} as const;

const vehicleLabels = {
  car: 'Carro 🚗',
  motorcycle: 'Moto 🏍️',
  bicycle: 'Bicicleta 🚲',
  truck: 'Camión 🚛',
} as const;

export const ActiveVehiclesView: React.FC<ActiveVehiclesViewProps> = ({
  parkingLot,
  onVehicleSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<VehicleType | 'all'>('all');

  const {
    data: activeVehicles = [],
    isLoading,
    error,
    refetch
  } = useActiveVehicles(parkingLot.id!);

  const { stats } = useVehicleStats(parkingLot.id!);
  const costCalculator = useCostCalculator(parkingLot);

  const filteredVehicles = activeVehicles.filter(vehicle => {
    const matchesSearch = vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.spot_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || vehicle.vehicle_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const getTimeStatus = (minutes: number): 'normal' | 'warning' | 'critical' => {
    const hours = minutes / 60;
    if (hours >= 8) return 'critical';
    if (hours >= 4) return 'warning';
    return 'normal';
  };

  const VehicleCard: React.FC<{ vehicle: ActiveVehicle }> = ({ vehicle }) => {
    const Icon = vehicleIcons[vehicle.vehicle_type];
    const colorClass = vehicleColors[vehicle.vehicle_type];
    const costInfo = costCalculator.calculateCost(vehicle.entry_time, vehicle.vehicle_type);
    const timeStatus = getTimeStatus(vehicle.duration_minutes);

    return (
      <div
        className={`cursor-pointer transition-all hover:shadow-lg ${colorClass} border-2 rounded-lg border bg-card text-card-foreground shadow-sm`}
        style={{ cursor: 'pointer' }}
        onMouseDown={() => onVehicleSelect?.(vehicle)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/70 rounded-lg">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <Badge className="font-mono text-sm font-bold">
                  {vehicle.plate}
                </Badge>
                <p className="text-xs opacity-75 mt-1">
                  {vehicleLabels[vehicle.vehicle_type]}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 text-sm">
                <MapPin className="w-3 h-3" />
                <span className="font-mono font-bold">{vehicle.spot_number}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Tiempo:
              </span>
              <span className={`font-medium ${
                timeStatus === 'critical' ? 'text-red-600' :
                timeStatus === 'warning' ? 'text-orange-600' :
                'text-gray-700'
              }`}>
                {formatDuration(vehicle.duration_minutes)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Costo:
              </span>
              <span className="font-bold text-lg">
                ${costInfo.calculated_cost.toLocaleString()}
              </span>
            </div>

            {costInfo.is_fixed_rate && (
              <div className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                <AlertTriangle className="w-3 h-3" />
                Tarifa fija aplicada
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-white/50">
            <div className="flex items-center justify-between text-xs opacity-75">
              <span>Entrada:</span>
              <span className="font-mono">
                {new Date(vehicle.entry_time).toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>

          <div className="absolute top-2 right-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onVehicleSelect?.(vehicle);
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Cargando vehículos activos...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar vehículos: {error.message}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-2">
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Vehículos Activos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalActive}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Ingresos Actuales</p>
                <p className="text-lg font-bold text-green-600">
                  ${Math.round(stats.totalRevenue).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Tiempo Promedio</p>
                <p className="text-lg font-bold text-orange-600">
                  {formatDuration(stats.averageDuration)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Por Tipo</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-1 text-xs">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span>{vehicleLabels[type as VehicleType]}</span>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles de Búsqueda y Filtro */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Vehículos Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por placa o espacio..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value as VehicleType | 'all')}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">Todos</option>
                <option value="car">Carros</option>
                <option value="motorcycle">Motos</option>
                <option value="bicycle">Bicicletas</option>
                <option value="truck">Camiones</option>
              </select>
            </div>
          </div>

          {/* Lista de Vehículos */}
          {filteredVehicles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {activeVehicles.length === 0
                  ? 'No hay vehículos activos'
                  : 'No se encontraron vehículos con esos criterios'
                }
              </p>
              <p className="text-sm">
                {activeVehicles.length === 0
                  ? 'Cuando se registre un vehículo aparecerá aquí'
                  : 'Intenta con otros términos de búsqueda'
                }
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Mostrando {filteredVehicles.length} de {activeVehicles.length} vehículos
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredVehicles.map((vehicle) => (
                  <VehicleCard key={`${vehicle.plate}-${vehicle.spot_number}`} vehicle={vehicle} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/common/Dialog';
// import { Alert, AlertDescription } from '@/components/common/Alert';
import {
  Car,
  LogIn,
  LogOut,
  Settings,
  Calculator,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Bell,
  RefreshCw,
  Eye,
  CheckCircle,
  // AlertCircle,
  Zap
} from 'lucide-react';
import { ParkingLot, ActiveVehicle } from '@/types/parking';
import { TariffConfigCard } from '@/components/tariffs/TariffConfigCard';
import { VehicleEntryCard } from '@/components/vehicles/VehicleEntryCard';
import { VehicleExitCard } from '@/components/vehicles/VehicleExitCard';
import { ActiveVehiclesView } from '@/components/vehicles/ActiveVehiclesView';
import { CostCalculatorWidget } from '@/components/calculators/CostCalculatorWidget';
import { useActiveVehicles, useVehicleStats } from '@/api/hooks/useVehicles';


interface VehicleManagementDashboardProps {
  parkingLot: ParkingLot;
  onTariffsUpdate?: (tariffs: {
    car_rate_per_minute: number;
    motorcycle_rate_per_minute: number;
    bicycle_rate_per_minute: number;
    truck_rate_per_minute: number;
    fixed_rate_car: number;
    fixed_rate_motorcycle: number;
    fixed_rate_bicycle: number;
    fixed_rate_truck: number;
    fixed_rate_threshold_minutes: number;
  }) => void;
}

export const VehicleManagementDashboard: React.FC<VehicleManagementDashboardProps> = ({
  parkingLot,
  onTariffsUpdate
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVehicle, setSelectedVehicle] = useState<ActiveVehicle | null>(null);
  const [showTariffConfig, setShowTariffConfig] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);

  const { refetch } = useActiveVehicles(parkingLot.id!);
  const { stats } = useVehicleStats(parkingLot.id!);

  const handleVehicleEntry = (plate: string, spot: string) => {
    // toast.success(`✅ Entrada registrada: ${plate} en espacio ${spot}`); // TODO: Add toast notification
    const message = `Vehículo ${plate} ingresó al espacio ${spot}`;
    setNotifications(prev => [message, ...prev.slice(0, 4)]);
    refetch();
  };

  const handleVehicleExit = (plate: string, cost: number) => {
    // toast.success(`🚗💨 Salida registrada: ${plate} - $${cost.toLocaleString()}`); // TODO: Add toast notification
    const message = `Vehículo ${plate} salió - Cobrado: $${cost.toLocaleString()}`;
    setNotifications(prev => [message, ...prev.slice(0, 4)]);
    refetch();
  };



  const handleTariffsSave = (tariffs: {
    car_rate_per_minute: number;
    motorcycle_rate_per_minute: number;
    bicycle_rate_per_minute: number;
    truck_rate_per_minute: number;
    fixed_rate_car: number;
    fixed_rate_motorcycle: number;
    fixed_rate_bicycle: number;
    fixed_rate_truck: number;
    fixed_rate_threshold_minutes: number;
  }) => {
    onTariffsUpdate?.(tariffs);
    setShowTariffConfig(false);
    // toast.success('📋 Tarifas actualizadas correctamente'); // TODO: Add toast notification
  };

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatTime = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  // Estadísticas principales
  const quickStats = [
    {
      icon: Users,
      label: 'Vehículos Activos',
      value: stats.totalActive,
      color: 'text-parkiu-600',
      bgColor: 'bg-parkiu-50',
    },
    {
      icon: DollarSign,
      label: 'Ingresos Actuales',
      value: formatCurrency(Math.round(stats.totalRevenue)),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Clock,
      label: 'Tiempo Promedio',
      value: formatTime(stats.averageDuration),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: TrendingUp,
      label: 'Ocupación',
      value: `${Math.round((stats.totalActive / parkingLot.total_spots) * 100)}%`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🚗 Gestión de Vehículos
            </h1>
            <p className="text-gray-600 mt-1">
              {parkingLot.name} - Sistema de Tarifas Colombiano 🇨🇴
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCalculator(true)}
              className="flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Calculadora
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowTariffConfig(true)}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Configurar Tarifas
            </Button>

            <Button
              variant="outline"
              onClick={() => refetch()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className={`flex items-center gap-3 ${stat.bgColor} rounded-lg p-3`}>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Notificaciones Recientes */}
        {notifications.length > 0 && (
          <Card className="border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Bell className="w-5 h-5" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notifications.map((notification, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-gray-700">{notification}</span>
                    <Badge variant="info" className="text-xs">
                      hace {index + 1} min
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs Principales */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full lg:w-auto grid-cols-4 lg:grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Vista General</span>
            </TabsTrigger>
            <TabsTrigger value="entry" className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-green-600" />
              <span className="hidden sm:inline">Entrada</span>
            </TabsTrigger>
            <TabsTrigger value="exit" className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-red-600" />
              <span className="hidden sm:inline">Salida</span>
            </TabsTrigger>
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline">Calculadora</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="mt-0">
              <ActiveVehiclesView
                parkingLot={parkingLot}
                onVehicleSelect={setSelectedVehicle}
              />
            </TabsContent>

            <TabsContent value="entry" className="mt-0">
              <div className="max-w-4xl mx-auto">
                <VehicleEntryCard
                  parkingLot={parkingLot}
                  onSuccess={handleVehicleEntry}
                  onError={(error: string) => console.error('Vehicle Entry Error:', error)}
                />
              </div>
            </TabsContent>

            <TabsContent value="exit" className="mt-0">
              <div className="max-w-4xl mx-auto">
                <VehicleExitCard
                  parkingLot={parkingLot}
                  onSuccess={handleVehicleExit}
                  onError={(error: string) => console.error('Vehicle Entry Error:', error)}
                />
              </div>
            </TabsContent>

            <TabsContent value="calculator" className="mt-0">
              <div className="max-w-4xl mx-auto">
                <CostCalculatorWidget parkingLot={parkingLot} />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Tips y Ayuda */}
        <Card className="border-parkiu-200 bg-parkiu-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-parkiu-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-parkiu-900 mb-2">💡 Tips del Sistema</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-parkiu-700">
                  <div>
                    <p className="font-medium">✨ Funcionalidades:</p>
                    <ul className="text-xs mt-1 space-y-1">
                      <li>• Tarifas automáticas por tipo de vehículo</li>
                      <li>• Tarifa fija después de {Math.round(parkingLot.fixed_rate_threshold_minutes / 60)} horas</li>
                      <li>• Cálculos en tiempo real</li>
                      <li>• Múltiples métodos de pago</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">⚡ Optimizaciones:</p>
                    <ul className="text-xs mt-1 space-y-1">
                      <li>• UI se actualiza instantáneamente</li>
                      <li>• Cache inteligente para mejor performance</li>
                      <li>• Búsqueda en tiempo real de vehículos</li>
                      <li>• Estadísticas actualizadas automáticamente</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <Dialog open={showTariffConfig} onOpenChange={setShowTariffConfig}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuración de Tarifas</DialogTitle>
          </DialogHeader>
          <TariffConfigCard
            parkingLot={parkingLot}
            onSave={handleTariffsSave}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Calculadora de Costos</DialogTitle>
          </DialogHeader>
          <CostCalculatorWidget parkingLot={parkingLot} />
        </DialogContent>
      </Dialog>

      {/* Vehicle Detail Dialog */}
      <Dialog open={!!selectedVehicle} onOpenChange={() => setSelectedVehicle(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Detalle del Vehículo
            </DialogTitle>
          </DialogHeader>

          {selectedVehicle && (
            <div className="space-y-4">
              <div className="text-center">
                <Badge className="text-lg font-mono px-4 py-2">
                  {selectedVehicle.plate}
                </Badge>
                <p className="text-gray-600 mt-2">{selectedVehicle.vehicle_type}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Espacio:</p>
                  <p className="font-mono font-bold">{selectedVehicle.spot_number}</p>
                </div>
                <div>
                  <p className="text-gray-600">Duración:</p>
                  <p className="font-bold">{formatTime(selectedVehicle.duration_minutes)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Entrada:</p>
                  <p className="font-mono text-sm">
                    {new Date(selectedVehicle.entry_time).toLocaleString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Costo actual:</p>
                  <p className="font-bold text-green-600 text-lg">
                    {formatCurrency(selectedVehicle.current_cost)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

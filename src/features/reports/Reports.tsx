import { useState, useMemo } from 'react';
import { useTransactionHistory } from '@/api/hooks/useVehicles';
import { useParkingLots } from '@/hooks/parking/useParkingLots';
import {
  Calendar,
  DollarSign,
  Download,
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  FileText,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

type TabType = 'daily' | 'monthly' | 'custom';

interface ReportSummary {
  totalTransactions: number;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  digitalRevenue: number;
  averageTicket: number;
  byVehicleType: {
    car: { count: number; revenue: number };
    motorcycle: { count: number; revenue: number };
    bicycle: { count: number; revenue: number };
    truck: { count: number; revenue: number };
  };
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [selectedParkingLot, setSelectedParkingLot] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const { parkingLots, isLoading: lotsLoading } = useParkingLots();

  // Auto-select first parking lot
  useState(() => {
    if (parkingLots && parkingLots.length > 0 && !selectedParkingLot) {
      setSelectedParkingLot(parkingLots[0].id || '');
    }
  });

  // Fetch transactions based on active tab
  const filters = useMemo(() => {
    if (activeTab === 'daily') {
      return {
        date_from: `${selectedDate}T00:00:00`,
        date_to: `${selectedDate}T23:59:59`,
        status: 'completed' as const
      };
    } else if (activeTab === 'monthly') {
      const monthStart = startOfMonth(new Date(selectedDate));
      const monthEnd = endOfMonth(new Date(selectedDate));
      return {
        date_from: format(monthStart, "yyyy-MM-dd'T'00:00:00"),
        date_to: format(monthEnd, "yyyy-MM-dd'T'23:59:59"),
        status: 'completed' as const
      };
    } else {
      return {
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
        status: 'completed' as const
      };
    }
  }, [activeTab, selectedDate, dateRange]);

  const { data: transactions = [], isLoading: transactionsLoading } = useTransactionHistory(
    selectedParkingLot,
    filters,
    { enabled: !!selectedParkingLot }
  );

  // Calculate report summary
  const summary: ReportSummary = useMemo(() => {
    const completed = transactions.filter(t => t.status === 'completed');

    const totalRevenue = completed.reduce((sum, t) => sum + (t.total_cost || 0), 0);
    const cashRevenue = completed
      .filter(t => t.payment_method === 'cash')
      .reduce((sum, t) => sum + (t.total_cost || 0), 0);
    const cardRevenue = completed
      .filter(t => t.payment_method === 'card')
      .reduce((sum, t) => sum + (t.total_cost || 0), 0);
    const digitalRevenue = completed
      .filter(t => t.payment_method === 'digital')
      .reduce((sum, t) => sum + (t.total_cost || 0), 0);

    const byVehicleType = {
      car: {
        count: completed.filter(t => t.vehicle_type === 'car').length,
        revenue: completed.filter(t => t.vehicle_type === 'car').reduce((sum, t) => sum + (t.total_cost || 0), 0)
      },
      motorcycle: {
        count: completed.filter(t => t.vehicle_type === 'motorcycle').length,
        revenue: completed.filter(t => t.vehicle_type === 'motorcycle').reduce((sum, t) => sum + (t.total_cost || 0), 0)
      },
      bicycle: {
        count: completed.filter(t => t.vehicle_type === 'bicycle').length,
        revenue: completed.filter(t => t.vehicle_type === 'bicycle').reduce((sum, t) => sum + (t.total_cost || 0), 0)
      },
      truck: {
        count: completed.filter(t => t.vehicle_type === 'truck').length,
        revenue: completed.filter(t => t.vehicle_type === 'truck').reduce((sum, t) => sum + (t.total_cost || 0), 0)
      }
    };

    return {
      totalTransactions: completed.length,
      totalRevenue,
      cashRevenue,
      cardRevenue,
      digitalRevenue,
      averageTicket: completed.length > 0 ? totalRevenue / completed.length : 0,
      byVehicleType
    };
  }, [transactions]);

  // Export to CSV
  const exportToCSV = () => {
    const completed = transactions.filter(t => t.status === 'completed');

    const headers = [
      'ID Transacción',
      'Placa',
      'Tipo Vehículo',
      'Espacio',
      'Entrada',
      'Salida',
      'Duración (min)',
      'Costo Total',
      'Método Pago',
      'Admin Entrada',
      'Admin Salida'
    ];

    const rows = completed.map(t => [
      t.transaction_id,
      t.plate,
      t.vehicle_type,
      t.spot_number,
      format(new Date(t.entry_time), 'dd/MM/yyyy HH:mm', { locale: es }),
      t.exit_time ? format(new Date(t.exit_time), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
      t.duration_minutes || 0,
      t.total_cost || 0,
      t.payment_method || '',
      t.entry_admin,
      t.exit_admin || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const filename = `reporte_${activeTab}_${selectedDate}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (lotsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-parkiu-600" />
      </div>
    );
  }

  if (!parkingLots || parkingLots.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay parqueaderos disponibles
          </h3>
          <p className="text-gray-500">
            Debes crear un parqueadero primero para ver reportes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📊 Reportes e Ingresos
        </h1>
        <p className="text-gray-600">
          Visualiza y exporta reportes de ingresos y transacciones
        </p>
      </div>

      {/* Parking Lot Selector */}
      {parkingLots.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Parqueadero
          </label>
          <select
            value={selectedParkingLot}
            onChange={(e) => setSelectedParkingLot(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-parkiu-500 focus:border-transparent"
          >
            {parkingLots.map(lot => (
              <option key={lot.id} value={lot.id}>
                {lot.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('daily')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'daily'
                ? 'border-parkiu-500 text-parkiu-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="w-5 h-5 inline-block mr-2" />
            Cierre Diario
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'monthly'
                ? 'border-parkiu-500 text-parkiu-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="w-5 h-5 inline-block mr-2" />
            Reporte Mensual
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'custom'
                ? 'border-parkiu-500 text-parkiu-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-5 h-5 inline-block mr-2" />
            Rango Personalizado
          </button>
        </nav>
      </div>

      {/* Date Selector */}
      <div className="mb-6 flex items-center gap-4">
        {activeTab === 'custom' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-parkiu-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-parkiu-500"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {activeTab === 'daily' ? 'Fecha' : 'Mes'}
            </label>
            <input
              type={activeTab === 'daily' ? 'date' : 'month'}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-parkiu-500"
            />
          </div>
        )}
        <Button
          onClick={exportToCSV}
          variant="outline"
          disabled={transactions.length === 0}
          className="mt-6"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Loading State */}
      {transactionsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-parkiu-600" />
        </div>
      )}

      {/* Summary Cards */}
      {!transactionsLoading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Total Revenue */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Ingresos Totales</span>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary.totalRevenue.toLocaleString('es-CO')}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {summary.totalTransactions} transacciones
              </div>
            </div>

            {/* Cash */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Efectivo</span>
                <Banknote className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary.cashRevenue.toLocaleString('es-CO')}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round((summary.cashRevenue / summary.totalRevenue) * 100) || 0}% del total
              </div>
            </div>

            {/* Card */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Tarjeta</span>
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary.cardRevenue.toLocaleString('es-CO')}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round((summary.cardRevenue / summary.totalRevenue) * 100) || 0}% del total
              </div>
            </div>

            {/* Digital */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Digital</span>
                <Smartphone className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${summary.digitalRevenue.toLocaleString('es-CO')}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round((summary.digitalRevenue / summary.totalRevenue) * 100) || 0}% del total
              </div>
            </div>
          </div>

          {/* By Vehicle Type */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Tipo de Vehículo</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(summary.byVehicleType).map(([type, data]) => (
                <div key={type} className="border rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600 capitalize mb-2">
                    {type === 'car' ? '🚗 Carros' : type === 'motorcycle' ? '🏍️ Motos' : type === 'bicycle' ? '🚲 Bicicletas' : '🚛 Camiones'}
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    ${data.revenue.toLocaleString('es-CO')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {data.count} vehículos
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Detalle de Transacciones</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Placa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrada</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salida</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.filter(t => t.status === 'completed').map((transaction) => (
                    <tr key={transaction.transaction_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-medium">
                        {transaction.plate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {transaction.vehicle_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {format(new Date(transaction.entry_time), 'dd/MM HH:mm', { locale: es })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {transaction.exit_time ? format(new Date(transaction.exit_time), 'dd/MM HH:mm', { locale: es }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {transaction.duration_minutes ? `${transaction.duration_minutes} min` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                          transaction.payment_method === 'card' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {transaction.payment_method === 'cash' ? 'Efectivo' :
                           transaction.payment_method === 'card' ? 'Tarjeta' : 'Digital'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                        ${(transaction.total_cost || 0).toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.filter(t => t.status === 'completed').length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No hay transacciones para el período seleccionado
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

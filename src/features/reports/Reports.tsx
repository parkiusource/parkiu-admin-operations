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
  Loader2,
  Car,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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
        date_from: selectedDate,
        date_to: selectedDate,
        status: 'completed' as const
      };
    } else if (activeTab === 'monthly') {
      // Para input type="month", el valor viene como "2026-01"
      // Parseamos el año y mes para evitar problemas de timezone
      const [year, month] = selectedMonth.split('-').map(Number);

      // Construir fechas directamente sin conversión de timezone
      const from = `${year}-${String(month).padStart(2, '0')}-01`;

      // Calcular el último día del mes
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      return {
        date_from: from,
        date_to: to,
        status: 'completed' as const
      };
    } else {
      return {
        date_from: dateRange.from,
        date_to: dateRange.to,
        status: 'completed' as const
      };
    }
  }, [activeTab, selectedDate, selectedMonth, dateRange]);

  const { data: transactions = [], isLoading: transactionsLoading } = useTransactionHistory(
    selectedParkingLot,
    filters,
    { enabled: !!selectedParkingLot }
  );

  // Resetear página cuando cambian los filtros
  useState(() => {
    setCurrentPage(1);
  });

  // Calcular transacciones paginadas
  const completedTransactions = useMemo(() =>
    transactions.filter(t => t.status === 'completed'),
    [transactions]
  );

  const totalPages = Math.ceil(completedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = completedTransactions.slice(startIndex, endIndex);

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

  // Export to PDF
  const exportToPDF = () => {
    const completed = transactions.filter(t => t.status === 'completed');
    const doc = new jsPDF();

    // Configuración de colores - Azul ParkiU
    const primaryColor: [number, number, number] = [37, 99, 235]; // blue-600 (parkiu)
    const darkColor: [number, number, number] = [17, 24, 39]; // gray-900
    const lightGray: [number, number, number] = [243, 244, 246]; // gray-100

    // Header con logo y título
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('ParkiU', 15, 20);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de Ingresos', 15, 30);

    // Información del reporte
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(10);
    const parkingLotName = parkingLots.find(lot => lot.id === selectedParkingLot)?.name || 'N/A';
    doc.text(`Parqueadero: ${parkingLotName}`, 15, 50);

    const reportType = activeTab === 'daily' ? 'Cierre Diario' : activeTab === 'monthly' ? 'Reporte Mensual' : 'Rango Personalizado';
    doc.text(`Tipo: ${reportType}`, 15, 56);

    // Calcular período sin desfase de timezone
    let dateText = '';
    if (activeTab === 'daily') {
      // Para diario, usar directamente la fecha seleccionada
      const [year, month, day] = selectedDate.split('-').map(Number);
      dateText = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    } else if (activeTab === 'monthly') {
      // Para mensual, parsear año y mes sin crear Date object
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      dateText = `${monthNames[month - 1]} ${year}`;
    } else {
      // Para rango personalizado
      const [yearFrom, monthFrom, dayFrom] = dateRange.from.split('-').map(Number);
      const [yearTo, monthTo, dayTo] = dateRange.to.split('-').map(Number);
      dateText = `${String(dayFrom).padStart(2, '0')}/${String(monthFrom).padStart(2, '0')}/${yearFrom} - ${String(dayTo).padStart(2, '0')}/${String(monthTo).padStart(2, '0')}/${yearTo}`;
    }
    doc.text(`Período: ${dateText}`, 15, 62);
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 15, 68);

    // Resumen de totales
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(15, 75, 180, 35, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Financiero', 20, 83);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total Transacciones: ${summary.totalTransactions}`, 20, 90);
    doc.text(`Ingresos Totales: $${summary.totalRevenue.toLocaleString('es-CO')}`, 20, 96);
    doc.text(`Efectivo: $${summary.cashRevenue.toLocaleString('es-CO')}`, 100, 90);
    doc.text(`Tarjeta: $${summary.cardRevenue.toLocaleString('es-CO')}`, 100, 96);
    doc.text(`Digital: $${summary.digitalRevenue.toLocaleString('es-CO')}`, 100, 102);
    doc.text(`Ticket Promedio: $${summary.averageTicket.toLocaleString('es-CO')}`, 20, 102);

    // Tabla de transacciones
    const tableData = completed.map(t => {
      // Parsear fechas UTC manualmente para evitar conversión de timezone
      const parseUTCDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        return `${day}/${month} ${hours}:${minutes}`;
      };

      return [
        t.plate,
        t.vehicle_type === 'car' ? 'Carro' : t.vehicle_type === 'motorcycle' ? 'Moto' : t.vehicle_type === 'bicycle' ? 'Bici' : 'Camión',
        parseUTCDate(t.entry_time),
        t.exit_time ? parseUTCDate(t.exit_time) : '-',
        `${t.duration_minutes || 0} min`,
        t.payment_method === 'cash' ? 'Efectivo' : t.payment_method === 'card' ? 'Tarjeta' : 'Digital',
        `$${(t.total_cost || 0).toLocaleString('es-CO')}`
      ];
    });

    autoTable(doc, {
      startY: 115,
      head: [['Placa', 'Tipo', 'Entrada', 'Salida', 'Duración', 'Pago', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: darkColor
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { left: 15, right: 15 },
      didDrawPage: (data) => {
        // Footer en cada página
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
    });

    // Guardar PDF
    const filename = `reporte_${activeTab}_${activeTab === 'daily' ? selectedDate : activeTab === 'monthly' ? selectedMonth : `${dateRange.from}_${dateRange.to}`}.pdf`;
    doc.save(filename);
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
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Premium Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-parkiu-500/10 to-parkiu-700/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-8 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-parkiu-500 to-parkiu-700 flex items-center justify-center shadow-xl">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Reportes e Ingresos
              </h1>
              <p className="text-gray-600 mt-1">
                Análisis financiero y operacional de tu parqueadero
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Parking Lot Selector */}
      {parkingLots.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Seleccionar Parqueadero
          </label>
          <select
            value={selectedParkingLot}
            onChange={(e) => setSelectedParkingLot(e.target.value)}
            className="w-full md:w-96 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-parkiu-500 focus:border-transparent transition-all"
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <nav className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-4 px-6 font-semibold text-sm transition-all ${
              activeTab === 'daily'
                ? 'bg-parkiu-50 text-parkiu-700 border-b-2 border-parkiu-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-5 h-5 inline-block mr-2" />
            Cierre Diario
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 py-4 px-6 font-semibold text-sm transition-all ${
              activeTab === 'monthly'
                ? 'bg-parkiu-50 text-parkiu-700 border-b-2 border-parkiu-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-5 h-5 inline-block mr-2" />
            Reporte Mensual
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-4 px-6 font-semibold text-sm transition-all ${
              activeTab === 'custom'
                ? 'bg-parkiu-50 text-parkiu-700 border-b-2 border-parkiu-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <FileText className="w-5 h-5 inline-block mr-2" />
            Rango Personalizado
          </button>
        </nav>

        {/* Date Selector */}
        <div className="p-6 bg-gray-50 flex items-end gap-4">
          {activeTab === 'custom' ? (
            <>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Desde</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-parkiu-500 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hasta</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-parkiu-500 transition-all"
                />
              </div>
            </>
          ) : (
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {activeTab === 'daily' ? 'Fecha' : 'Mes'}
              </label>
              <input
                type={activeTab === 'daily' ? 'date' : 'month'}
                value={activeTab === 'daily' ? selectedDate : selectedMonth}
                onChange={(e) => activeTab === 'daily' ? setSelectedDate(e.target.value) : setSelectedMonth(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-parkiu-500 transition-all"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              disabled={transactions.length === 0}
              className="px-6 py-3"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              onClick={exportToPDF}
              variant="outline"
              disabled={transactions.length === 0}
              className="px-6 py-3"
            >
              <FileDown className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {transactionsLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-parkiu-600 mb-4" />
          <p className="text-gray-600">Cargando reportes...</p>
        </div>
      )}

      {/* Summary Cards */}
      {!transactionsLoading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Revenue - Premium Card */}
            <div className="group relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl border border-green-200/50 p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-green-400/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/10 rounded-full -ml-16 -mb-16 group-hover:scale-125 transition-transform duration-700"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Ingresos Totales</span>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-4xl font-black text-gray-900 mb-2">
                  ${summary.totalRevenue.toLocaleString('es-CO')}
                </div>
                <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  {summary.totalTransactions} transacciones
                </div>
              </div>
            </div>

            {/* Cash - Premium Card */}
            <div className="group relative bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-2xl border border-amber-200/50 p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Efectivo</span>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Banknote className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-4xl font-black text-gray-900 mb-3">
                  ${summary.cashRevenue.toLocaleString('es-CO')}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-amber-700">Participación</span>
                    <span className="text-amber-900">{Math.round((summary.cashRevenue / summary.totalRevenue) * 100) || 0}%</span>
                  </div>
                  <div className="h-2.5 bg-amber-200/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full transition-all duration-1000 ease-out"
                      style={{width: `${Math.round((summary.cashRevenue / summary.totalRevenue) * 100) || 0}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card - Premium Card */}
            <div className="group relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-200/50 p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Tarjeta</span>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-4xl font-black text-gray-900 mb-3">
                  ${summary.cardRevenue.toLocaleString('es-CO')}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-blue-700">Participación</span>
                    <span className="text-blue-900">{Math.round((summary.cardRevenue / summary.totalRevenue) * 100) || 0}%</span>
                  </div>
                  <div className="h-2.5 bg-blue-200/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
                      style={{width: `${Math.round((summary.cardRevenue / summary.totalRevenue) * 100) || 0}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Digital - Premium Card */}
            <div className="group relative bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 rounded-2xl border border-purple-200/50 p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-purple-400/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Digital</span>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-4xl font-black text-gray-900 mb-3">
                  ${summary.digitalRevenue.toLocaleString('es-CO')}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-purple-700">Participación</span>
                    <span className="text-purple-900">{Math.round((summary.digitalRevenue / summary.totalRevenue) * 100) || 0}%</span>
                  </div>
                  <div className="h-2.5 bg-purple-200/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full transition-all duration-1000 ease-out"
                      style={{width: `${Math.round((summary.digitalRevenue / summary.totalRevenue) * 100) || 0}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* By Vehicle Type - Premium Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-parkiu-500 to-parkiu-700 flex items-center justify-center shadow-lg">
                <Car className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Análisis por Tipo de Vehículo</h3>
                <p className="text-sm text-gray-600">Desglose de ingresos por categoría</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(summary.byVehicleType).map(([type, data]) => {
                const maxRevenue = Math.max(...Object.values(summary.byVehicleType).map(v => v.revenue));
                const percentage = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
                const config = {
                  car: { emoji: '🚗', label: 'Carros', gradient: 'from-blue-500 to-blue-700', bg: 'from-blue-50 to-blue-100' },
                  motorcycle: { emoji: '🏍️', label: 'Motos', gradient: 'from-green-500 to-green-700', bg: 'from-green-50 to-green-100' },
                  bicycle: { emoji: '🚲', label: 'Bicicletas', gradient: 'from-yellow-500 to-yellow-700', bg: 'from-yellow-50 to-yellow-100' },
                  truck: { emoji: '🚛', label: 'Camiones', gradient: 'from-red-500 to-red-700', bg: 'from-red-50 to-red-100' }
                }[type] || { emoji: '🚗', label: type, gradient: 'from-gray-500 to-gray-700', bg: 'from-gray-50 to-gray-100' };

                return (
                  <div key={type} className={`group relative bg-gradient-to-br ${config.bg} border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-4xl">{config.emoji}</span>
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{config.label}</span>
                    </div>
                    <div className="text-3xl font-black text-gray-900 mb-2">
                      ${data.revenue.toLocaleString('es-CO')}
                    </div>
                    <div className="text-sm text-gray-600 font-medium mb-4">
                      {data.count} vehículos
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                        <span>Proporción</span>
                        <span>{percentage.toFixed(0)}%</span>
                      </div>
                      <div className="h-3 bg-gray-200/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${config.gradient} rounded-full transition-all duration-1000 ease-out`}
                          style={{width: `${percentage}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transactions Table - Premium */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-parkiu-500 to-parkiu-700 flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Detalle de Transacciones</h3>
                  <p className="text-sm text-gray-600">Registro completo del período seleccionado</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Placa</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Entrada</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Salida</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Duración</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Pago</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedTransactions.map((transaction) => (
                    <tr key={transaction.transaction_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-gray-900">{transaction.plate}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 capitalize">{transaction.vehicle_type}</span>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          transaction.payment_method === 'cash' ? 'bg-amber-100 text-amber-800' :
                          transaction.payment_method === 'card' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {transaction.payment_method === 'cash' ? 'Efectivo' :
                           transaction.payment_method === 'card' ? 'Tarjeta' : 'Digital'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-black text-gray-900">
                          ${(transaction.total_cost || 0).toLocaleString('es-CO')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {completedTransactions.length === 0 && (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No hay transacciones para el período seleccionado</p>
                  <p className="text-sm text-gray-400 mt-2">Selecciona otra fecha o rango para ver resultados</p>
                </div>
              )}
            </div>

            {/* Paginación */}
            {completedTransactions.length > 0 && (
              <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-semibold">{startIndex + 1}</span> a{' '}
                    <span className="font-semibold">{Math.min(endIndex, completedTransactions.length)}</span> de{' '}
                    <span className="font-semibold">{completedTransactions.length}</span> transacciones
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Por página:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-parkiu-500"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Primera
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-parkiu-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Última
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

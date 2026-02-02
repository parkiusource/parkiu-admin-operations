import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useParkingLots } from '@/api/hooks/useParkingLots';
import { useTransactionHistory } from '@/api/hooks';
import { Button } from '@/components/common/Button';
import ReceiptModal from '@/components/vehicles/ReceiptModal';
import { useStore } from '@/store/useStore';
import type { VehicleTransaction } from '@/types/parking';

// Skeleton component for loading states
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

// Stats card component
function StatCard({
  label,
  value,
  icon,
  color = 'blue',
  loading = false
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'amber';
  loading?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]} transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-16 mt-1 bg-current opacity-20" />
          ) : (
            <p className="text-2xl font-bold mt-1">{value}</p>
          )}
        </div>
        <div className="text-3xl opacity-60">{icon}</div>
      </div>
    </div>
  );
}

// Transaction card for mobile view
function TransactionCard({
  transaction,
  onView
}: {
  transaction: VehicleTransaction;
  onView: () => void;
}) {
  const vehicleIcons: Record<string, string> = {
    car: '🚗',
    motorcycle: '🏍️',
    bicycle: '🚲',
    truck: '🚛',
  };

  const paymentLabels: Record<string, { label: string; class: string }> = {
    cash: { label: 'Efectivo', class: 'bg-green-100 text-green-800' },
    card: { label: 'Tarjeta', class: 'bg-blue-100 text-blue-800' },
    digital: { label: 'Digital', class: 'bg-purple-100 text-purple-800' },
  };

  const isActive = !transaction.exit_time;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{vehicleIcons[transaction.vehicle_type || 'car'] || '🚗'}</span>
          <div>
            <p className="font-mono font-bold text-gray-900 text-lg">
              {transaction.plate?.toUpperCase()}
            </p>
            <p className="text-sm text-gray-500 capitalize">{transaction.vehicle_type}</p>
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          T-{transaction.transaction_id}
        </span>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-500 mb-0.5">Espacio</p>
          <p className="font-semibold text-gray-900">{transaction.spot_number || '-'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-500 mb-0.5">Total</p>
          <p className="font-semibold text-gray-900">
            {typeof transaction.total_cost === 'number'
              ? `$${transaction.total_cost.toLocaleString('es-CO')}`
              : '-'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-500 mb-0.5">Entrada</p>
          <p className="font-medium text-gray-900 text-sm">
            {transaction.entry_time
              ? new Date(transaction.entry_time).toLocaleString('es-CO', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                })
              : '-'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-500 mb-0.5">Salida</p>
          {isActive ? (
            <span className="inline-flex items-center gap-1 text-green-700 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Activo
            </span>
          ) : (
            <p className="font-medium text-gray-900 text-sm">
              {transaction.exit_time
                ? new Date(transaction.exit_time).toLocaleString('es-CO', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })
                : '-'}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {transaction.payment_method && paymentLabels[transaction.payment_method] && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${paymentLabels[transaction.payment_method].class}`}>
              {paymentLabels[transaction.payment_method].label}
            </span>
          )}
          {isActive && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              En parqueadero
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onView}
          className="flex items-center gap-1.5 hover:bg-blue-50 hover:border-blue-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Ver detalle
        </Button>
      </div>
    </div>
  );
}

// Loading skeleton for cards
function TransactionCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-24 mb-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-2.5">
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

// Table row skeleton
function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      {[...Array(9)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className="h-5 w-full max-w-[80px]" />
        </td>
      ))}
    </tr>
  );
}

// Filter badge component
function FilterBadge({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="ml-0.5 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
        aria-label={`Quitar filtro: ${label}`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

// Empty state component
function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {hasFilters ? 'Sin resultados' : 'Sin transacciones'}
      </h3>
      <p className="text-gray-500 text-center max-w-sm mb-4">
        {hasFilters
          ? 'No se encontraron transacciones con los filtros aplicados. Intenta ajustar los criterios de búsqueda.'
          : 'Aún no hay transacciones registradas en este parqueadero.'}
      </p>
      {hasFilters && (
        <Button type="button" variant="outline" onClick={onClearFilters}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

export default function TransactionsHistory() {
  const { id: parkingLotId } = useParams<{ id: string }>();
  const { parkingLots } = useParkingLots();
  const lot = useMemo(() => parkingLots?.find(p => p.id === parkingLotId) || null, [parkingLots, parkingLotId]);

  const [selected, setSelected] = useState<VehicleTransaction | null>(null);
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [plate, setPlate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'card' | 'digital'>('all');

  const LIMIT = 50;
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<VehicleTransaction[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const lastProcessedOffsetRef = useRef<number>(-1);

  // Check if any filters are active
  const hasActiveFilters = plate.trim() !== '' || dateFrom !== '' || dateTo !== '' || status !== 'all' || paymentMethod !== 'all';
  const activeFilterCount = [plate.trim(), dateFrom, dateTo, status !== 'all' ? status : '', paymentMethod !== 'all' ? paymentMethod : ''].filter(Boolean).length;

  // Reset pagination when filters or lot change
  useEffect(() => {
    setOffset(0);
    setItems([]);
    setHasMore(true);
    lastProcessedOffsetRef.current = -1;
  }, [parkingLotId, plate, dateFrom, dateTo, status, paymentMethod]);

  const filters = useMemo(() => ({
    limit: LIMIT,
    offset,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    plate: plate.trim() || undefined,
    status: status === 'all' ? undefined : status,
    payment_method: paymentMethod === 'all' ? undefined : paymentMethod,
  }), [offset, dateFrom, dateTo, plate, status, paymentMethod]);

  const queryClient = useQueryClient();
  const isOffline = useStore((s) => s.isOffline);
  const historyQuery = useTransactionHistory(parkingLotId || '', filters, {
    enabled: !!parkingLotId,
    staleTime: 1000 * 60 * 2,
  });
  const page = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);
  const isLoading = historyQuery.isLoading;

  // Process received page
  useEffect(() => {
    if (!page) return;
    if (page.length === 0) {
      setHasMore(false);
      if (offset === 0) setItems([]);
      lastProcessedOffsetRef.current = offset;
      return;
    }

    if (offset === 0) {
      setItems(page);
      lastProcessedOffsetRef.current = offset;
    } else if (offset !== lastProcessedOffsetRef.current) {
      setItems(prev => [...prev, ...page]);
      lastProcessedOffsetRef.current = offset;
    }

    if (page.length < LIMIT) setHasMore(false);
  }, [page, offset]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const itemsLengthRef = useRef(0);
  itemsLengthRef.current = items.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry.isIntersecting || !hasMore || isLoading) return;
      const currentItemsLen = itemsLengthRef.current;
      setOffset((o) => {
        if (o === 0 && currentItemsLen === 0) return o;
        return o + LIMIT;
      });
    }, { rootMargin: '100px', threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, isLoading]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeCount = items.filter(t => !t.exit_time).length;
    const completedCount = items.filter(t => t.exit_time).length;
    const totalRevenue = items.reduce((sum, t) => sum + (t.total_cost || 0), 0);
    return { activeCount, completedCount, totalRevenue, total: items.length };
  }, [items]);

  const exportCsv = () => {
    const rows = [
      ['ticket','plate','type','space','entry_time','exit_time','duration_minutes','total_cost','payment_method','entry_admin','exit_admin'],
      ...items.map(t => [
        String(t.transaction_id ?? ''),
        t.plate?.toUpperCase() ?? '',
        String(t.vehicle_type ?? ''),
        String(t.spot_number ?? ''),
        String(t.entry_time ?? ''),
        String(t.exit_time ?? ''),
        String(t.duration_minutes ?? ''),
        String(t.total_cost ?? ''),
        String(t.payment_method ?? ''),
        String(t.entry_admin ?? ''),
        String(t.exit_admin ?? ''),
      ])
    ];
    const csv = rows.map(r => r.map(field => `"${String(field).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${parkingLotId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${parkingLotId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const refreshHistory = () => {
    lastProcessedOffsetRef.current = -1;
    setItems([]);
    setHasMore(true);
    setOffset(0);
    if (parkingLotId) {
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'transactions', parkingLotId] });
    }
  };

  const clearFilters = () => {
    setPlate('');
    setDateFrom('');
    setDateTo('');
    setStatus('all');
    setPaymentMethod('all');
  };

  const applyQuickFilter = (preset: 'today' | 'yesterday' | 'week' | 'month') => {
    const now = new Date();
    const formatDateLocal = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    switch (preset) {
      case 'today': {
        setDateFrom(formatDateLocal(now));
        setDateTo(formatDateLocal(now));
        break;
      }
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        setDateFrom(formatDateLocal(yesterday));
        setDateTo(formatDateLocal(yesterday));
        break;
      }
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        setDateFrom(formatDateLocal(weekAgo));
        setDateTo(formatDateLocal(now));
        break;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        setDateFrom(formatDateLocal(monthAgo));
        setDateTo(formatDateLocal(now));
        break;
      }
    }
  };

  const vehicleIcons: Record<string, string> = {
    car: '🚗',
    motorcycle: '🏍️',
    bicycle: '🚲',
    truck: '🚛',
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 pb-safe">
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <header className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-3" aria-label="Breadcrumb">
            <Link to="/parking" className="hover:text-gray-700 transition-colors">
              Parqueaderos
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {lot && (
              <>
                <Link to={`/parking/${parkingLotId}`} className="hover:text-gray-700 transition-colors truncate max-w-[150px]">
                  {lot.name}
                </Link>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
            <span className="text-gray-900 font-medium">Historial</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Historial de Transacciones
              </h1>
              <p className="text-gray-600 mt-1">
                {lot ? lot.name : 'Seleccione un parqueadero'}
              </p>
            </div>
            <Link
              to={`/parking/${parkingLotId}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al panel
            </Link>
          </div>
        </header>

        {/* Offline indicator */}
        {isOffline && items.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <p className="text-sm text-amber-700">
              <strong>Modo offline:</strong> Mostrando datos en caché. Se actualizarán al reconectar.
            </p>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            label="Total"
            value={stats.total}
            icon="📋"
            color="blue"
            loading={isLoading && offset === 0}
          />
          <StatCard
            label="Activos"
            value={stats.activeCount}
            icon="🚗"
            color="green"
            loading={isLoading && offset === 0}
          />
          <StatCard
            label="Completados"
            value={stats.completedCount}
            icon="✅"
            color="purple"
            loading={isLoading && offset === 0}
          />
          <StatCard
            label="Ingresos"
            value={`$${stats.totalRevenue.toLocaleString('es-CO')}`}
            icon="💰"
            color="amber"
            loading={isLoading && offset === 0}
          />
        </div>

        {/* Filters section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
          {/* Filter header - always visible */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 text-gray-700 font-medium"
                >
                  <svg className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <span className="hidden lg:flex items-center gap-2 text-gray-700 font-medium">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filtros de Búsqueda
                </span>
              </div>

              {/* Quick filters */}
              <div className="flex flex-wrap gap-2">
                {(['today', 'yesterday', 'week', 'month'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyQuickFilter(preset)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {preset === 'today' ? 'Hoy' : preset === 'yesterday' ? 'Ayer' : preset === 'week' ? '7 días' : '30 días'}
                  </button>
                ))}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Active filter badges */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                {plate.trim() && (
                  <FilterBadge label={`Placa: ${plate}`} onClear={() => setPlate('')} />
                )}
                {dateFrom && (
                  <FilterBadge label={`Desde: ${dateFrom}`} onClear={() => setDateFrom('')} />
                )}
                {dateTo && (
                  <FilterBadge label={`Hasta: ${dateTo}`} onClear={() => setDateTo('')} />
                )}
                {status !== 'all' && (
                  <FilterBadge
                    label={`Estado: ${status === 'active' ? 'Activo' : 'Completado'}`}
                    onClear={() => setStatus('all')}
                  />
                )}
                {paymentMethod !== 'all' && (
                  <FilterBadge
                    label={`Pago: ${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Digital'}`}
                    onClear={() => setPaymentMethod('all')}
                  />
                )}
              </div>
            )}
          </div>

          {/* Filter inputs - collapsible on mobile, always visible on desktop */}
          <div className={`p-4 bg-gray-50 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label htmlFor="filter-plate" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Placa
                </label>
                <input
                  id="filter-plate"
                  type="text"
                  placeholder="ABC123"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm transition-shadow"
                  maxLength={8}
                />
              </div>

              <div>
                <label htmlFor="filter-date-from" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Desde
                </label>
                <input
                  id="filter-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                />
              </div>

              <div>
                <label htmlFor="filter-date-to" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Hasta
                </label>
                <input
                  id="filter-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                />
              </div>

              <div>
                <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Estado
                </label>
                <select
                  id="filter-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'all' | 'active' | 'completed')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow bg-white"
                >
                  <option value="all">Todos</option>
                  <option value="active">En parqueadero</option>
                  <option value="completed">Completadas</option>
                </select>
              </div>

              <div>
                <label htmlFor="filter-payment" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Método de pago
                </label>
                <select
                  id="filter-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'all' | 'cash' | 'card' | 'digital')}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow bg-white"
                >
                  <option value="all">Todos</option>
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="digital">Digital</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Actions bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Transacciones</h2>
                {items.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {items.length}{hasMore ? '+' : ''}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {hasMore ? 'Desplázate para cargar más' : items.length > 0 ? 'Todas las transacciones cargadas' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={refreshHistory}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <svg className={`w-4 h-4 ${isLoading && offset === 0 ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">{isLoading && offset === 0 ? 'Actualizando...' : 'Actualizar'}</span>
              </Button>
              <Button
                type="button"
                onClick={exportCsv}
                disabled={items.length === 0}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">CSV</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={exportJson}
                disabled={items.length === 0}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">JSON</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Transactions list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Desktop table view */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Vehículo
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Espacio
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Entrada
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Salida
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Método
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Operadores
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {offset === 0 && isLoading ? (
                  [...Array(5)].map((_, i) => <TableRowSkeleton key={i} />)
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} />
                    </td>
                  </tr>
                ) : (
                  items.map((t, index) => (
                    <tr
                      key={t.transaction_id ? `tx-${t.transaction_id}` : `idx-${index}`}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          T-{t.transaction_id}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{vehicleIcons[t.vehicle_type || 'car'] || '🚗'}</span>
                          <div>
                            <p className="font-mono font-semibold text-gray-900">{t.plate?.toUpperCase()}</p>
                            <p className="text-sm text-gray-500 capitalize">{t.vehicle_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
                          {t.spot_number}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {t.entry_time ? new Date(t.entry_time).toLocaleDateString('es-CO') : '-'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t.entry_time ? new Date(t.entry_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {t.exit_time ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(t.exit_time).toLocaleDateString('es-CO')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(t.exit_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            En parqueadero
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        {typeof t.total_cost === 'number' ? (
                          <span className="font-semibold text-gray-900">
                            ${t.total_cost.toLocaleString('es-CO')}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {t.payment_method ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            t.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                            t.payment_method === 'card' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {t.payment_method === 'cash' ? 'Efectivo' :
                             t.payment_method === 'card' ? 'Tarjeta' :
                             'Digital'}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="text-gray-900">{t.entry_admin || '-'}</p>
                          {t.exit_admin && (
                            <p className="text-xs text-gray-500">Salida: {t.exit_admin}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelected(t); setOpen(true); }}
                          className="hover:bg-blue-50 hover:border-blue-300"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="lg:hidden">
            {offset === 0 && isLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => <TransactionCardSkeleton key={i} />)}
              </div>
            ) : items.length === 0 ? (
              <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} />
            ) : (
              <div className="p-4 space-y-4">
                {items.map((t, index) => (
                  <TransactionCard
                    key={t.transaction_id ? `tx-${t.transaction_id}` : `idx-${index}`}
                    transaction={t}
                    onView={() => { setSelected(t); setOpen(true); }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Infinite scroll sentinel */}
          <div
            ref={sentinelRef}
            className="p-4 text-center border-t border-gray-200 bg-gray-50"
          >
            {hasMore ? (
              isLoading && offset > 0 ? (
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Cargando más transacciones...</span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Desplázate hacia abajo para cargar más
                </p>
              )
            ) : items.length > 0 ? (
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">Todas las transacciones cargadas</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ReceiptModal
        open={open}
        onOpenChange={setOpen}
        transaction={selected}
        parkingLot={lot || undefined}
      />
    </div>
  );
}

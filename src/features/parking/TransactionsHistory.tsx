import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useParkingLots } from '@/api/hooks/useParkingLots';
import { useTransactionHistory } from '@/api/hooks';
import { Button } from '@/components/common/Button';
import ReceiptModal from '@/components/vehicles/ReceiptModal';
import type { VehicleTransaction } from '@/types/parking';

export default function TransactionsHistory() {
  const { id: parkingLotId } = useParams<{ id: string }>();
  const { parkingLots } = useParkingLots();
  const lot = useMemo(() => parkingLots?.find(p => p.id === parkingLotId) || null, [parkingLots, parkingLotId]);

  const [selected, setSelected] = useState<VehicleTransaction | null>(null);
  const [open, setOpen] = useState(false);

  // Estados de filtros
  const [plate, setPlate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'card' | 'digital'>('all');

  const LIMIT = 50;
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<VehicleTransaction[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Reset pagination when filters or lot change
  useEffect(() => {
    setOffset(0);
    setItems([]);
    setHasMore(true);
  }, [parkingLotId, plate, dateFrom, dateTo, status, paymentMethod]);

  // Memoizar filtros para evitar que cambie la identidad en cada render y dispare refetch infinito
  const filters = useMemo(() => ({
    limit: LIMIT,
    offset,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    plate: plate.trim() || undefined,
    status: status === 'all' ? undefined : status,
    payment_method: paymentMethod === 'all' ? undefined : paymentMethod,
  }), [offset, dateFrom, dateTo, plate, status, paymentMethod]);

  const historyQuery = useTransactionHistory(parkingLotId || '', filters, { enabled: !!parkingLotId });
  const page = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);
  const isLoading = historyQuery.isLoading;

  useEffect(() => {
    if (!page) return;
    setItems(prev => (offset === 0 ? page : [...prev, ...page]));
    if (page.length < LIMIT) setHasMore(false);
  }, [page, offset]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        setOffset((o) => o + LIMIT);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, isLoading]);

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
    setOffset(0);
    setItems([]);
    setHasMore(true);
    // El query se refrescará automáticamente cuando cambien los filtros
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
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (preset) {
      case 'today': {
        setDateFrom(formatDate(now));
        setDateTo(formatDate(now));
        break;
      }
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        setDateFrom(formatDate(yesterday));
        setDateTo(formatDate(yesterday));
        break;
      }
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        setDateFrom(formatDate(weekAgo));
        setDateTo(formatDate(now));
        break;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        setDateFrom(formatDate(monthAgo));
        setDateTo(formatDate(now));
        break;
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Historial de Transacciones</h1>
          <p className="text-gray-600">{lot ? `${lot.name} — ${lot.address}` : 'Seleccione un parqueadero'}</p>
        </div>
        <Link to={`/parking/${parkingLotId}`}>Volver</Link>
      </div>

      {/* Filtros avanzados */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Filtros de Búsqueda</h3>
            <p className="text-sm text-gray-600">Filtra las transacciones por fecha, placa, estado o método de pago</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => applyQuickFilter('today')} size="sm">
              Hoy
            </Button>
            <Button type="button" variant="outline" onClick={() => applyQuickFilter('yesterday')} size="sm">
              Ayer
            </Button>
            <Button type="button" variant="outline" onClick={() => applyQuickFilter('week')} size="sm">
              7 días
            </Button>
            <Button type="button" variant="outline" onClick={() => applyQuickFilter('month')} size="sm">
              30 días
            </Button>
            <Button type="button" variant="outline" onClick={clearFilters} size="sm" className="text-red-600 hover:text-red-700">
              Limpiar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Placa</label>
            <input
              type="text"
              placeholder="ABC123"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              maxLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'all' | 'active' | 'completed')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="active">En parqueadero</option>
              <option value="completed">Completadas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'all' | 'cash' | 'card' | 'digital')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="digital">Digital</option>
            </select>
          </div>
        </div>
      </div>

      {/* Acciones y exportación */}
      <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Historial de Transacciones</h3>
            <p className="text-sm text-gray-600">
              {items.length > 0 ? `${items.length} transacciones encontradas` : 'Registro completo de entradas y salidas'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={refreshHistory} className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </Button>
            <Button type="button" onClick={exportCsv} className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </Button>
            <Button type="button" variant="outline" onClick={exportJson} className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar JSON
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ticket</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vehículo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Espacio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Entrada</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Salida</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Método</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Operadores</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {offset === 0 && isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Cargando transacciones...
                </div>
              </td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>No hay transacciones registradas</span>
                </div>
              </td></tr>
            ) : (
              items.map((t, index) => (
                <tr key={String(t.transaction_id)} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        T-{t.transaction_id}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {t.vehicle_type === 'car' && '🚗'}
                        {t.vehicle_type === 'motorcycle' && '🏍️'}
                        {t.vehicle_type === 'bicycle' && '🚲'}
                        {t.vehicle_type === 'truck' && '🚛'}
                      </div>
                      <div>
                        <div className="font-mono font-semibold text-gray-900">{t.plate?.toUpperCase()}</div>
                        <div className="text-sm text-gray-500 capitalize">{t.vehicle_type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
                      {t.spot_number}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      {t.entry_time ? new Date(t.entry_time).toLocaleDateString('es-CO') : '-'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t.entry_time ? new Date(t.entry_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {t.exit_time ? (
                      <div>
                        <div className="text-sm text-gray-900">
                          {new Date(t.exit_time).toLocaleDateString('es-CO')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(t.exit_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        En parqueadero
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {typeof t.total_cost === 'number' ? (
                      <div className="font-semibold text-gray-900">
                        ${t.total_cost.toLocaleString('es-CO')}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {t.payment_method ? (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        t.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                        t.payment_method === 'card' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {t.payment_method === 'cash' ? '💵 Efectivo' :
                         t.payment_method === 'card' ? '💳 Tarjeta' :
                         '📱 Digital'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">{t.entry_admin || '-'}</div>
                      {t.exit_admin && (
                        <div className="text-gray-500 text-xs">Salida: {t.exit_admin}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelected(t); setOpen(true); }}
                      className="flex items-center gap-1 hover:bg-blue-50 hover:border-blue-300"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="p-4 text-center border-t bg-gray-50">
          {hasMore ? (
            isLoading ? (
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Cargando más transacciones...
              </div>
            ) : (
              <div className="text-gray-600">
                <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Desplázate para cargar más
              </div>
            )
          ) : (
            <div className="text-gray-500 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Todas las transacciones cargadas
            </div>
          )}
        </div>
      </div>

      <ReceiptModal open={open} onOpenChange={setOpen} transaction={selected} parkingLot={lot || undefined} />
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useParkingLots } from '@/api/hooks/useParkingLots';
import { useTransactionHistory } from '@/api/hooks';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import ReceiptModal from '@/components/vehicles/ReceiptModal';
import type { VehicleTransaction } from '@/types/parking';

export default function TransactionsHistory() {
  const { id: parkingLotId } = useParams<{ id: string }>();
  const { parkingLots } = useParkingLots();
  const lot = useMemo(() => parkingLots?.find(p => p.id === parkingLotId) || null, [parkingLots, parkingLotId]);

  const [plate, setPlate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selected, setSelected] = useState<VehicleTransaction | null>(null);
  const [open, setOpen] = useState(false);

  const LIMIT = 50;
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<VehicleTransaction[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [minTotal, setMinTotal] = useState<string>('');
  const [maxTotal, setMaxTotal] = useState<string>('');

  // Reset pagination when filters or lot change
  useEffect(() => {
    setOffset(0);
    setItems([]);
    setHasMore(true);
  }, [parkingLotId, plate, start, end, paymentMethod, minTotal, maxTotal]);

  const { data: page = [], isLoading } = useTransactionHistory(parkingLotId || '', {
    plate: plate.trim() || undefined,
    start_date: start || undefined,
    end_date: end || undefined,
    limit: LIMIT,
    offset,
    payment_method: paymentMethod as 'cash' | 'card' | 'digital' || undefined,
    min_total: minTotal ? Number(minTotal) : undefined,
    max_total: maxTotal ? Number(maxTotal) : undefined,
  }, { enabled: !!parkingLotId });

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
      ['ticket','plate','type','space','entry_time','exit_time','duration_minutes','total_cost','payment_method','operator'],
      ...items.map(t => [
        String(t.id ?? ''),
        t.plate?.toUpperCase() ?? '',
        String(t.vehicle_type ?? ''),
        String(t.spot_number ?? ''),
        String(t.entry_time ?? ''),
        String(t.exit_time ?? ''),
        String(t.duration_minutes ?? ''),
        String(t.total_cost ?? ''),
        String((t as { payment_method?: string }).payment_method ?? ''),
        String(t.admin_uuid ?? ''),
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

  // Presets de rango rápido
  const formatLocal = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const applyPreset = (preset: 'today' | 'yesterday' | '7d' | '30d') => {
    const now = new Date();
    if (preset === 'today') {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      setStart(formatLocal(from));
      setEnd(formatLocal(now));
      return;
    }
    if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const from = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
      const to = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 0);
      setStart(formatLocal(from));
      setEnd(formatLocal(to));
      return;
    }
    if (preset === '7d') {
      const from = new Date(now);
      from.setDate(now.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      setStart(formatLocal(from));
      setEnd(formatLocal(now));
      return;
    }
    // 30d
    const from = new Date(now);
    from.setDate(now.getDate() - 30);
    from.setHours(0, 0, 0, 0);
    setStart(formatLocal(from));
    setEnd(formatLocal(now));
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

      <div className="bg-white rounded-lg border p-4 mb-4">
        <div className="flex flex-wrap gap-2 mb-3 text-sm">
          <span className="text-gray-600 mr-2">Rango rápido:</span>
          <Button type="button" variant="outline" onClick={() => applyPreset('today')}>Hoy</Button>
          <Button type="button" variant="outline" onClick={() => applyPreset('yesterday')}>Ayer</Button>
          <Button type="button" variant="outline" onClick={() => applyPreset('7d')}>7 días</Button>
          <Button type="button" variant="outline" onClick={() => applyPreset('30d')}>30 días</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-sm">Placa</label>
            <Input value={plate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlate(e.target.value.toUpperCase())} placeholder="ABC123" />
          </div>
          <div>
            <label className="text-sm">Desde</label>
            <Input type="datetime-local" value={start} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Hasta</label>
            <Input type="datetime-local" value={end} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnd(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Método</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-2 border rounded">
              <option value="">Todos</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="digital">Digital</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Monto mín</label>
            <Input type="number" inputMode="numeric" value={minTotal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinTotal(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="text-sm">Monto máx</label>
            <Input type="number" inputMode="numeric" value={maxTotal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxTotal(e.target.value)} placeholder="" />
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" onClick={exportCsv}>Exportar CSV</Button>
            <Button type="button" onClick={exportJson}>Exportar JSON</Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Ticket</th>
              <th className="px-3 py-2 text-left">Placa</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Espacio</th>
              <th className="px-3 py-2 text-left">Entrada</th>
              <th className="px-3 py-2 text-left">Salida</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-left">Método</th>
              <th className="px-3 py-2 text-left">Operador</th>
              <th className="px-3 py-2">Recibo</th>
            </tr>
          </thead>
          <tbody>
            {offset === 0 && isLoading ? (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-500">Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-500">Sin resultados</td></tr>
            ) : (
              items.map((t) => (
                <tr key={String(t.id)} className="border-t">
                  <td className="px-3 py-2">T-{t.id}</td>
                  <td className="px-3 py-2 font-mono">{t.plate?.toUpperCase()}</td>
                  <td className="px-3 py-2">{t.vehicle_type}</td>
                  <td className="px-3 py-2 font-mono">{t.spot_number}</td>
                  <td className="px-3 py-2">{t.entry_time ? new Date(t.entry_time).toLocaleString('es-CO') : '-'}</td>
                  <td className="px-3 py-2">{t.exit_time ? new Date(t.exit_time).toLocaleString('es-CO') : '-'}</td>
                  <td className="px-3 py-2 text-right">{typeof t.total_cost === 'number' ? `$${t.total_cost.toLocaleString('es-CO')}` : '-'}</td>
                  <td className="px-3 py-2">{(t as { payment_method?: string }).payment_method || '-'}</td>
                  <td className="px-3 py-2">{(t as { admin_uuid?: string }).admin_uuid || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <Button type="button" onClick={() => { setSelected(t); setOpen(true); }}>Ver</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="p-3 text-center text-xs text-gray-500">
          {hasMore ? (isLoading ? 'Cargando…' : 'Cargar más…') : 'Fin del historial'}
        </div>
      </div>

      <ReceiptModal open={open} onOpenChange={setOpen} transaction={selected} parkingLot={lot || undefined} />
    </div>
  );
}

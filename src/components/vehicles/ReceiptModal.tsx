import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/common/Dialog';
import { Button } from '@/components/common/Button';
import { tryPrintViaQZ, selectQZPrinter } from '@/services/printing/qz';
import type { ParkingLot, VehicleTransaction } from '@/types/parking';

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: VehicleTransaction | null;
  parkingLot?: ParkingLot | null;
}

function safeLocaleString(value: number | undefined): string {
  if (!Number.isFinite(value as number)) return '-';
  try {
    return (value as number).toLocaleString('es-CO');
  } catch {
    return String(value);
  }
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ open, onOpenChange, transaction, parkingLot }) => {
  if (!transaction) return null;

  const parsed: Record<string, unknown> | null = (() => {
    try {
      return transaction.receipt ? JSON.parse(transaction.receipt) : null;
    } catch {
      return null;
    }
  })();

  const ticketNo = transaction.transaction_id ?? transaction.transaction_id;
  const plate = transaction.plate?.toUpperCase() || '';
  const entry = transaction.entry_time || (parsed && (parsed['entry_time'] as string)) || '';
  const exitT = transaction.exit_time || (parsed && (parsed['exit_time'] as string)) || '';
  const space = (parsed && 'space_number' in parsed) ? String(parsed['space_number']) : (transaction.spot_number || '');
  const vt = (transaction.vehicle_type || (parsed && (parsed['vehicle_type'] as string)) || '') as string;
  const duration = transaction.duration_minutes ?? (parsed ? Number(parsed['duration_minutes']) : undefined);
  const total = transaction.total_cost ?? (parsed ? Number(parsed['total_cost']) : undefined);

  const handlePrint = async () => {
    try {
      const ok = await tryPrintViaQZ({
        transactionId: ticketNo ?? '-',
        plate,
        entryTime: entry || undefined,
        exitTime: exitT || undefined,
        durationMinutes: Number.isFinite(duration as number) ? (duration as number) : 0,
        space: space || undefined,
        vehicleType: vt || undefined,
        baseAmount: 0,
        additionalAmount: 0,
        totalAmount: Number.isFinite(total as number) ? (total as number) : 0,
        company: parkingLot ? {
          name: parkingLot.name,
          address: parkingLot.address,
          phone: parkingLot.contact_phone,
          taxId: parkingLot.tax_id,
        } : undefined,
      });
      if (ok) return;
      await selectQZPrinter();

      const html = buildHtml();
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();

        // Hacer la impresión asíncrona para no bloquear la aplicación
        setTimeout(() => {
          win.focus();
          win.print();
          // Opcional: cerrar automáticamente después de imprimir
          // win.close();
        }, 100);
      }
    } catch (e) {
      console.error('Print error:', e);
    }
  };

  const buildHtml = (): string => {
    return `<!doctype html><html><head><meta charset="utf-8"/><title>Recibo ${plate}</title><style>
      @page { size: 80mm auto; margin: 0; }
      body { width: 80mm; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 12px; }
      .ticket { padding: 6mm 4mm; }
      .center { text-align: center; }
      .row { display: flex; justify-content: space-between; margin: 2px 0; }
      .mono { font-family: inherit; }
      hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
      h3 { margin: 0 0 2mm; }
    </style></head><body><div class="ticket">
      <div class="center">
        <h3>${parkingLot ? parkingLot.name : 'PARKIU S.A.S.'}</h3>
        <div>${parkingLot ? parkingLot.address : ''}</div>
        ${parkingLot?.contact_phone ? `<div>Tel: ${parkingLot.contact_phone}</div>` : ''}
        ${parkingLot?.tax_id ? `<div><strong>NIT:</strong> ${parkingLot.tax_id}</div>` : ''}
      </div>
      <hr />
      <div class="row"><div>Ticket:</div><div class="mono">T-${ticketNo ?? '-'}</div></div>
      <div class="row"><div>Placa:</div><div class="mono">${plate}</div></div>
      ${vt ? `<div class="row"><div>Tipo:</div><div>${vt}</div></div>` : ''}
      ${space ? `<div class="row"><div>Espacio:</div><div class="mono">${space}</div></div>` : ''}
      ${entry ? `<div class="row"><div>Entrada:</div><div>${new Date(entry).toLocaleString('es-CO')}</div></div>` : ''}
      ${exitT ? `<div class="row"><div>Salida:</div><div>${new Date(exitT).toLocaleString('es-CO')}</div></div>` : ''}
      ${Number.isFinite(duration as number) ? `<div class="row"><div>Tiempo:</div><div>${Math.floor((duration as number)/60)}h ${(duration as number)%60}m</div></div>` : ''}
      ${Number.isFinite(total as number) ? `<hr /><div class="row"><div><strong>TOTAL:</strong></div><div><strong>$${(total as number).toLocaleString('es-CO')}</strong></div></div>` : ''}
      <hr />
      <div class="center">¡Gracias por su preferencia!<br/>Powered by ParkiU</div>
    </div></body></html>`;
  };

  const downloadHtml = () => {
    const html = buildHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-${plate}-T-${ticketNo}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    const data = parsed || transaction;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-${plate}-T-${ticketNo}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recibo T-{ticketNo}</DialogTitle>
          <DialogDescription>
            Vista del recibo para impresión o descarga
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-gray-600">Ticket:</div>
            <div className="text-right font-mono">T-{ticketNo}</div>
            <div className="text-gray-600">Placa:</div>
            <div className="text-right font-mono">{plate}</div>
            {vt && (
              <>
                <div className="text-gray-600">Tipo:</div>
                <div className="text-right">{vt}</div>
              </>
            )}
            {space && (
              <>
                <div className="text-gray-600">Espacio:</div>
                <div className="text-right font-mono">{space}</div>
              </>
            )}
            {entry && (
              <>
                <div className="text-gray-600">Entrada:</div>
                <div className="text-right">{new Date(entry).toLocaleString('es-CO')}</div>
              </>
            )}
            {exitT && (
              <>
                <div className="text-gray-600">Salida:</div>
                <div className="text-right">{new Date(exitT).toLocaleString('es-CO')}</div>
              </>
            )}
            {Number.isFinite(duration as number) && (
              <>
                <div className="text-gray-600">Tiempo:</div>
                <div className="text-right">{Math.floor((duration as number)/60)}h {(duration as number)%60}m</div>
              </>
            )}
            {Number.isFinite(total as number) && (
              <>
                <div className="text-gray-600">Total:</div>
                <div className="text-right font-bold">${safeLocaleString(total as number)}</div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">Imprimir</Button>
          <Button type="button" onClick={downloadHtml}>Descargar HTML</Button>
          <Button type="button" onClick={downloadJson}>Descargar JSON</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptModal;

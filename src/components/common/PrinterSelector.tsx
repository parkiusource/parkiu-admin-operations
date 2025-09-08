import React, { useEffect, useState } from 'react';
import { Label } from './Label';
import { Button } from './Button';
import { listQZPrinters, getFavoritePrinterName, setFavoritePrinterName } from '@/services/printing/qz';

interface PrinterSelectorProps {
  onSelected?: (name: string | null) => void;
  className?: string;
}

export const PrinterSelector: React.FC<PrinterSelectorProps> = ({ onSelected, className }) => {
  const [printers, setPrinters] = useState<string[]>([]);
  const [favorite, setFavorite] = useState<string | ''>(getFavoritePrinterName() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    const { printers: list } = await listQZPrinters();
    setPrinters(list);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleSave = () => {
    const value = favorite || null;
    setFavoritePrinterName(value);
    onSelected?.(value);
  };

  return (
    <div className={className}>
      <Label className="text-sm font-medium mb-2 block">Impresora favorita (QZ Tray)</Label>
      <div className="flex gap-2 items-center">
        <select
          value={favorite}
          onChange={(e) => setFavorite(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">(Ninguna)</option>
          {printers.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <Button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Guardar</Button>
        <Button type="button" onClick={() => void refresh()} className="bg-gray-100">{loading ? 'Actualizando…' : 'Actualizar'}</Button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
};

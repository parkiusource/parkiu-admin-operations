import React, { useEffect, useState } from 'react';
import { Label } from './Label';
import { Button } from './Button';
import { listQZPrinters, getFavoritePrinterName, setFavoritePrinterName } from '@/services/printing/qz';

interface PrinterSelectorProps {
  onSelected?: (name: string | null) => void;
  className?: string;
  /** En modales: una sola línea, aviso reducido */
  compact?: boolean;
}

export const PrinterSelector: React.FC<PrinterSelectorProps> = ({ onSelected, className, compact = false }) => {
  const [printers, setPrinters] = useState<string[]>([]);
  const [favorite, setFavorite] = useState<string | ''>(getFavoritePrinterName() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideWarning, setHideWarning] = useState(() => {
    return localStorage.getItem('qz-warning-hidden') === 'true';
  });

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const { printers: list } = await listQZPrinters();
      setPrinters(list);
      if (list.length === 0) {
        setError('El servicio de impresión no está disponible o no hay impresoras instaladas');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error de QZ Tray: ${message}`);
      setPrinters([]);
    }
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

  const handleHideWarning = () => {
    setHideWarning(true);
    localStorage.setItem('qz-warning-hidden', 'true');
  };

  const getStatusIndicator = () => {
    if (loading) {
      return <span className="text-blue-600 text-xs">🔄 Conectando...</span>;
    }
    if (error) {
      return <span className="text-yellow-600 text-xs">⚠️ QZ Tray no disponible</span>;
    }
    if (printers.length > 0) {
      return <span className="text-green-600 text-xs">✅ QZ Tray conectado ({printers.length} impresoras)</span>;
    }
    return <span className="text-yellow-600 text-xs">⚠️ Sin impresoras</span>;
  };

  if (compact) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 whitespace-nowrap">Impresora</span>
          <select
            value={favorite}
            onChange={(e) => setFavorite(e.target.value)}
            className="flex-1 min-w-0 max-w-[180px] py-1.5 px-2 border border-gray-200 rounded text-xs bg-white"
            disabled={loading || printers.length === 0}
          >
            <option value="">(Ninguna)</option>
            {printers.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSave}
            className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1.5 border border-gray-200 rounded hover:bg-gray-50"
            disabled={loading}
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
            disabled={loading}
            title="Actualizar"
          >
            {loading ? (
              <span className="inline-block w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <span className="text-xs">↻</span>
            )}
          </button>
          {error && (
            <span className="text-amber-600 text-xs" title={error}>
              {hideWarning ? (
                <button type="button" onClick={() => { setHideWarning(false); localStorage.removeItem('qz-warning-hidden'); }}>⚠</button>
              ) : (
                <button type="button" onClick={handleHideWarning} className="text-amber-600" title="Ocultar">⚠ ·</button>
              )}
            </span>
          )}
        </div>
        {error && !hideWarning && (
          <div className="mt-1.5 p-2 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800 flex justify-between items-start gap-2">
            <span>{error}</span>
            <button type="button" onClick={handleHideWarning} className="text-amber-500 shrink-0">✕</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium">Impresora favorita (QZ Tray)</Label>
        {getStatusIndicator()}
      </div>

      <div className="flex gap-2 items-center">
        <select
          value={favorite}
          onChange={(e) => setFavorite(e.target.value)}
          className="w-full p-2 border rounded text-sm"
          disabled={loading || printers.length === 0}
        >
          <option value="">(Ninguna)</option>
          {printers.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <Button
          type="button"
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2"
          disabled={loading}
        >
          Guardar
        </Button>
        <Button
          type="button"
          onClick={() => void refresh()}
          className="bg-gray-100 hover:bg-gray-200 text-xs px-3 py-2"
          disabled={loading}
        >
          {loading ? '🔄' : '🔄'}
        </Button>
        {error && hideWarning && (
          <Button
            type="button"
            onClick={() => {
              setHideWarning(false);
              localStorage.removeItem('qz-warning-hidden');
            }}
            className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs px-2 py-2"
            title="Mostrar ayuda de QZ Tray"
          >
            ⚠️
          </Button>
        )}
      </div>

      {error && !hideWarning && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs relative">
          <button
            onClick={handleHideWarning}
            className="absolute top-2 right-2 text-yellow-400 hover:text-yellow-600 transition-colors"
            title="Ocultar aviso"
          >
            ✕
          </button>
          <p className="text-yellow-800 font-medium pr-6">⚠️ {error}</p>

          {navigator.platform.toUpperCase().indexOf('MAC') >= 0 && error.includes('barra de menú') && (
            <div className="mt-2 space-y-2">
              <p className="text-yellow-700 font-medium">🍎 Pasos para macOS:</p>
              <div className="space-y-1 text-yellow-700">
                <p>1. Busca el ícono 🖨️ en la barra de menú superior (esquina derecha)</p>
                <p>2. Si no está visible, abre "Aplicaciones" → "QZ Tray"</p>
                <p>3. Permite que se ejecute en segundo plano</p>
                <p>4. Haz clic en "Actualizar" aquí arriba</p>
              </div>
            </div>
          )}

          {!error.includes('barra de menú') && (
            <p className="text-yellow-700 mt-2">
              💡 <strong>Solución:</strong> Instale y ejecute QZ Tray desde{' '}
              <a
                href="https://qz.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-900 font-medium"
              >
                qz.io/download
              </a>
            </p>
          )}

          <p className="text-yellow-600 mt-2 text-xs">
            ℹ️ La impresión funcionará con el navegador si QZ Tray no está disponible
          </p>
        </div>
      )}

      {!error && printers.length === 0 && !loading && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <p className="text-yellow-700">⚠️ QZ Tray está conectado pero no hay impresoras instaladas</p>
        </div>
      )}
    </div>
  );
};

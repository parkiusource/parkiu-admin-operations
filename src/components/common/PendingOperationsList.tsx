import React, { useState, useEffect } from 'react';
import { listPendingAndErrors } from '@/services/offlineQueue';
import { OfflineOperation } from '@/db/schema';
import { Clock, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { connectionService } from '@/services/connectionService';

export const PendingOperationsList: React.FC = () => {
  const [operations, setOperations] = useState<OfflineOperation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const loadOperations = async () => {
      const ops = await listPendingAndErrors();
      setOperations(ops);
    };

    loadOperations();
    const interval = setInterval(loadOperations, 5000);
    return () => clearInterval(interval);
  }, []);

  if (operations.length === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'synced':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'error': return 'Error';
      case 'synced': return 'Sincronizada';
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    return type === 'entry' ? 'Entrada' : 'Salida';
  };

  const getTypeColor = (type: string) => {
    return type === 'entry' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await connectionService.retrySync();
      // Esperar un momento para que se actualice el estado
      setTimeout(async () => {
        const ops = await listPendingAndErrors();
        setOperations(ops);
        setIsSyncing(false);
      }, 1000);
    } catch (error) {
      console.error('Error sincronizando:', error);
      setIsSyncing(false);
    }
  };

  return (
    <>
      {/* Botón flotante: izquierda inferior para no solaparse con Entrada/Salida/Buscar (derecha) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 z-40 flex items-center gap-2"
      >
        <AlertCircle className="w-5 h-5" />
        {operations.length} pendiente{operations.length > 1 ? 's' : ''}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-semibold">Operaciones Pendientes</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {operations.length} operación{operations.length > 1 ? 'es' : ''} esperando sincronización
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Lista de operaciones */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-3">
                {operations.map((op) => (
                  <div
                    key={op.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(op.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(op.type)}`}>
                              {getTypeLabel(op.type)}
                            </span>
                            <span className="font-mono font-medium text-lg">
                              {op.plate}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {new Date(op.createdAt).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium px-2 py-1 rounded ${
                          op.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          op.status === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {getStatusLabel(op.status)}
                        </div>
                      </div>
                    </div>

                    {/* Detalles de la operación */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Parking Lot:</span>
                        <span className="font-mono">{op.parkingLotId}</span>
                      </div>

                      {op.type === 'exit' && op.payload.payment_amount ? (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Monto:</span>
                          <span className="font-medium">
                            ${(op.payload.payment_amount as number).toLocaleString('es-CO')}
                          </span>
                        </div>
                      ) : null}

                      {op.type === 'exit' && op.payload.payment_method ? (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Método de pago:</span>
                          <span className="capitalize">{op.payload.payment_method as string}</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Mensaje de error */}
                    {op.errorMessage && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded p-2">
                        <div className="text-xs text-red-800 font-medium">Error:</div>
                        <div className="text-xs text-red-600 mt-1">{op.errorMessage}</div>
                      </div>
                    )}

                    {/* UUID (colapsable) */}
                    <details className="mt-3">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        Ver UUID de idempotencia
                      </summary>
                      <div className="mt-2 text-xs bg-gray-100 p-2 rounded">
                        <code className="font-mono break-all">{op.idempotencyKey}</code>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer con botón de sincronización */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Sincronizar Ahora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PendingOperationsList;

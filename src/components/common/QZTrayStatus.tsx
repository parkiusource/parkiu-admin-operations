import React from 'react';
import { useQZTrayStatus } from '@/hooks/useQZTrayStatus';

interface QZTrayStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const QZTrayStatusIndicator: React.FC<QZTrayStatusIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const { statusInfo, checkStatus } = useQZTrayStatus();

  const getStatusIcon = () => {
    switch (statusInfo.status) {
      case 'checking':
        return '🔄';
      case 'available':
        return '✅';
      case 'not-installed':
      case 'not-running':
        return '❌';
      case 'no-printers':
        return '⚠️';
      case 'error':
        return '🔴';
      default:
        return '❓';
    }
  };

  const getStatusColor = () => {
    switch (statusInfo.status) {
      case 'checking':
        return 'text-blue-600';
      case 'available':
        return 'text-green-600';
      case 'not-installed':
      case 'not-running':
      case 'error':
        return 'text-red-600';
      case 'no-printers':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`text-xs ${getStatusColor()}`}>
        {getStatusIcon()} {statusInfo.message}
      </span>

      <button
        onClick={checkStatus}
        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        title="Actualizar estado"
      >
        🔄
      </button>

      {showDetails && statusInfo.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <p className="text-red-700 font-medium">Error: {statusInfo.error}</p>
          {statusInfo.status === 'not-installed' && (
            <p className="text-red-600 mt-1">
              💡 <strong>Solución:</strong> Descarga e instala QZ Tray desde{' '}
              <a
                href="https://qz.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-800"
              >
                qz.io/download
              </a>
            </p>
          )}
          {statusInfo.status === 'not-running' && (
            <p className="text-red-600 mt-1">
              💡 <strong>Solución:</strong> Inicia la aplicación QZ Tray desde tu escritorio
            </p>
          )}
        </div>
      )}
    </div>
  );
};

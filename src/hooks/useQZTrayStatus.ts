import { useEffect, useState } from 'react';
import { listQZPrinters } from '@/services/printing/qz';
import type { QZTrayStatusInfo } from '@/types/qz';

export const useQZTrayStatus = () => {
  const [statusInfo, setStatusInfo] = useState<QZTrayStatusInfo>({
    status: 'checking',
    message: 'Verificando QZ Tray...',
    printerCount: 0
  });

  const checkStatus = async () => {
    setStatusInfo({
      status: 'checking',
      message: 'Verificando QZ Tray...',
      printerCount: 0
    });

    try {
      const { printers } = await listQZPrinters();

      if (printers.length > 0) {
        setStatusInfo({
          status: 'available',
          message: `QZ Tray conectado con ${printers.length} impresora${printers.length > 1 ? 's' : ''}`,
          printerCount: printers.length
        });
      } else {
        setStatusInfo({
          status: 'no-printers',
          message: 'QZ Tray conectado pero sin impresoras',
          printerCount: 0
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      if (errorMessage.includes('no está instalado')) {
        setStatusInfo({
          status: 'not-installed',
          message: 'QZ Tray no está instalado',
          printerCount: 0,
          error: errorMessage
        });
      } else if (errorMessage.includes('no está ejecutándose')) {
        setStatusInfo({
          status: 'not-running',
          message: 'QZ Tray no está ejecutándose',
          printerCount: 0,
          error: errorMessage
        });
      } else {
        setStatusInfo({
          status: 'error',
          message: 'Error al conectar con QZ Tray',
          printerCount: 0,
          error: errorMessage
        });
      }
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return { statusInfo, checkStatus };
};

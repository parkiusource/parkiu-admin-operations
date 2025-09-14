/**
 * 🖨️ Utilidades de Impresión No Bloqueante
 *
 * Funciones para manejar impresión sin bloquear la aplicación principal
 */

export interface PrintOptions {
  /** Título de la ventana de impresión */
  title?: string;
  /** Si debe cerrar automáticamente la ventana después de imprimir */
  autoClose?: boolean;
  /** Delay antes de ejecutar la impresión (ms) */
  delay?: number;
}

/**
 * 🖨️ Imprime HTML en una nueva ventana sin bloquear la aplicación
 *
 * @param html - Contenido HTML a imprimir
 * @param options - Opciones de impresión
 * @returns Promise que se resuelve cuando se abre la ventana de impresión
 */
export const printHtmlNonBlocking = async (
  html: string,
  options: PrintOptions = {}
): Promise<void> => {
  const {
    title = 'Imprimir',
    autoClose = false,
    delay = 100
  } = options;

  return new Promise((resolve, reject) => {
    try {
      // Abrir nueva ventana
      const win = window.open('', '_blank', 'width=800,height=600');

      if (!win) {
        reject(new Error('No se pudo abrir la ventana de impresión. Verifica que no esté bloqueada por el navegador.'));
        return;
      }

      // Escribir contenido
      win.document.write(html);
      win.document.close();
      win.document.title = title;

      // Impresión asíncrona para no bloquear la aplicación principal
      setTimeout(() => {
        try {
          win.focus();
          win.print();

          // Opcional: cerrar automáticamente después de imprimir
          if (autoClose) {
            // Esperar un poco más antes de cerrar para que termine la impresión
            setTimeout(() => {
              win.close();
            }, 1000);
          }

          resolve();
        } catch (printError) {
          console.error('Error durante la impresión:', printError);
          reject(printError);
        }
      }, delay);

    } catch (error) {
      console.error('Error abriendo ventana de impresión:', error);
      reject(error);
    }
  });
};

/**
 * 🎫 Imprime un ticket de entrada
 */
export const printEntryTicket = async (html: string): Promise<void> => {
  return printHtmlNonBlocking(html, {
    title: 'Ticket de Entrada - ParkiU',
    autoClose: false, // Dejar que el usuario cierre manualmente
    delay: 100
  });
};

/**
 * 🧾 Imprime un recibo de salida
 */
export const printExitReceipt = async (html: string): Promise<void> => {
  return printHtmlNonBlocking(html, {
    title: 'Recibo de Salida - ParkiU',
    autoClose: false, // Dejar que el usuario cierre manualmente
    delay: 100
  });
};

/**
 * 📄 Genera estilos CSS base para impresión de tickets
 */
export const getTicketPrintStyles = (): string => {
  return `
    <style>
      @page {
        size: 80mm auto;
        margin: 0;
      }
      body {
        width: 80mm;
        margin: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.4;
      }
      .ticket {
        padding: 6mm 4mm;
      }
      .center {
        text-align: center;
      }
      .mono {
        font-family: inherit;
      }
      .row {
        display: flex;
        justify-content: space-between;
        margin: 2px 0;
      }
      hr {
        border: none;
        border-top: 1px dashed #333;
        margin: 4px 0;
      }
      .bold {
        font-weight: bold;
      }
      .large {
        font-size: 14px;
        font-weight: bold;
      }
    </style>
  `;
};

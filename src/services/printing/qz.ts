/*
  QZ Tray integration (optional, silent printing for 80mm thermal printers)
  - Attempts to connect to a locally-installed QZ Tray agent
  - Uses raw ESC/POS commands for wide compatibility
  - Falls back to HTML printing if unavailable

  NOTE: For production, configure certificate/signature per QZ docs.
  Temporarily, enabling "Allow unsigned requests" in QZ settings lets this work without signing.
*/

declare global {
  // Minimal subset of QZ Tray typings for our usage
  interface Window {
    qz?: {
      security?: {
        setCertificatePromise: (fn: () => Promise<string>) => void;
        setSignaturePromise: (fn: (toSign: string) => Promise<string | null>) => void;
      };
      websocket: {
        isActive: () => boolean;
        connect: (opts?: { retries?: number; delay?: number }) => Promise<void>;
      };
      printers: {
        getDefault: () => Promise<string | null>;
        find: () => Promise<string[]>;
      };
      configs: {
        create: (
          printer: string,
          opts?: { size?: { width?: number; units?: string }; margins?: number; copies?: number; density?: number }
        ) => unknown;
      };
      print: (cfg: unknown, data: Array<{ type: 'raw' | 'html'; format?: string; data: string }>) => Promise<void>;
    };
  }
}

export interface ThermalReceiptData {
  transactionId: number | string;
  plate: string;
  entryTime?: string;
  exitTime?: string;
  durationMinutes: number;
  space?: string;
  vehicleType?: string;
  // New: explicit per-minute rate for the selected vehicle type (for entry tickets)
  ratePerMinute?: number;
  baseAmount: number;
  additionalAmount: number;
  totalAmount: number;
  company?: {
    name?: string;
    address?: string;
    phone?: string;
    taxId?: string;
    website?: string;
  };
}

const QZ_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/qz-tray/2.2.4/qz-tray.js';

let qzLoadedPromise: Promise<Window['qz']> | null = null;

async function loadQZ(): Promise<Window['qz']> {
  if (window.qz) return window.qz;
  if (!qzLoadedPromise) {
    qzLoadedPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = QZ_CDN;
      script.async = true;
      script.onload = () => resolve(window.qz as Window['qz']);
      script.onerror = () => reject(new Error('Failed to load QZ Tray library'));
      document.head.appendChild(script);
    });
  }
  return qzLoadedPromise;
}

async function connectQZ(): Promise<Window['qz']> {
  const qz = await loadQZ();

  // Security setup (unsigned/dev mode). Configure properly for production builds.
  try {
    if (qz && qz.security) {
      // If you have a certificate string, set it via VITE_QZ_CERT
      const cert = (import.meta as unknown as { env?: Record<string, string> })?.env?.['VITE_QZ_CERT'];
      qz.security.setCertificatePromise(() => Promise.resolve(cert || ''));
      // If you have a signing endpoint, plug it here and return the signature
      qz.security.setSignaturePromise(() => {
        const allowUnsigned = ((import.meta as unknown as { env?: Record<string, string> })?.env?.['VITE_QZ_ALLOW_UNSIGNED'] === '1');
        if (allowUnsigned) return Promise.resolve(null);
        console.warn('QZ signature not configured. Set VITE_QZ_ALLOW_UNSIGNED=1 for dev or implement signing.');
        return Promise.reject(new Error('QZ signature not configured'));
      });
    }
  } catch (e) {
    // Non-fatal; connection may still work if QZ allows unsigned
    console.warn('QZ security setup warning:', e);
  }

  if (!qz || !qz.websocket || !qz.websocket.isActive()) {
    const connectPromise = qz!.websocket.connect({ retries: 3, delay: 1000 });
    const timeoutMs = 10000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('QZ Tray no responde. Reinicia la aplicación QZ Tray.')), timeoutMs)
    );
    await Promise.race([connectPromise, timeoutPromise]).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Connection refused') || message.includes('ECONNREFUSED')) {
        throw new Error('QZ Tray no está ejecutándose. Busca el ícono 🖨️ en la barra de menú superior y ábrelo');
      }
      if (message.includes('timeout') || message.includes('ETIMEDOUT') || message.includes('no responde')) {
        throw new Error('QZ Tray no responde. Reinicia la aplicación QZ Tray desde Aplicaciones');
      }
      throw new Error(`QZ Tray no disponible: ${message}`);
    });
  }

  return qz;
}

function padRight(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  return text + ' '.repeat(width - text.length);
}

function padLeft(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  return ' '.repeat(width - text.length) + text;
}

function formatMoney(value: number): string {
  try {
    return value.toLocaleString('es-CO');
  } catch {
    return String(value);
  }
}

/** ESC/POS commands for 80mm thermal; output is ASCII + basic Latin. For printers that need CP437, configure QZ encoding. */
function buildEscPos(data: ThermalReceiptData): string {
  const esc = '\x1B';
  const gs = '\x1D';
  const initialize = `${esc}@`;
  const alignCenter = `${esc}a\x01`;
  const alignLeft = `${esc}a\x00`;
  const boldOn = `${esc}E\x01`;
  const boldOff = `${esc}E\x00`;
  const doubleOn = `${gs}!\x11`;
  const doubleOff = `${gs}!\x00`;
  const cut = `${gs}V\x42\x00`;

  const width = 42; // ~80mm common char width

  const headerName = data.company?.name || 'PARKIU S.A.S.';
  const headerAddr = data.company?.address || 'Calle Principal #123, Ciudad';
  const headerPhone = data.company?.phone || 'Tel: (601) 123-4567';
  const headerNit = data.company?.taxId ? `NIT: ${data.company.taxId}` : '';
  const website = data.company?.website || 'www.parkiu.com';

  const entry = data.entryTime || '';
  const exitT = data.exitTime || '';
  const timeStr = `${Math.floor(data.durationMinutes / 60)}h ${data.durationMinutes % 60}m`;

  // Build body lines
  let out = '';
  out += initialize;
  out += alignCenter + boldOn + doubleOn + headerName + '\n' + doubleOff + boldOff;
  out += alignCenter + headerAddr + '\n';
  out += alignCenter + headerPhone + '\n';
  if (headerNit) out += alignCenter + headerNit + '\n';
  out += '-'.repeat(width) + '\n';
  const now = new Date();
  const dateStrCol = now.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
  const timeStrCol = now.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true });
  out += alignLeft + padRight('Ticket:', 12) + padLeft(`T-${String(data.transactionId)}`, width - 12) + '\n';
  out += padRight('Fecha:', 12) + padLeft(dateStrCol, width - 12) + '\n';
  out += padRight('Hora:', 12) + padLeft(timeStrCol, width - 12) + '\n';
  out += padRight('Placa:', 12) + padLeft(data.plate.toUpperCase(), width - 12) + '\n';
  if (data.space) out += padRight('Espacio:', 12) + padLeft(data.space, width - 12) + '\n';
  if (data.vehicleType) out += padRight('Tipo:', 12) + padLeft(data.vehicleType, width - 12) + '\n';
  if (typeof data.ratePerMinute === 'number' && !isNaN(data.ratePerMinute)) {
    const rate = `$${formatMoney(data.ratePerMinute)}/min`;
    out += padRight('Tarifa:', 12) + padLeft(rate, width - 12) + '\n';
  }
  if (entry) out += padRight('Entrada:', 12) + padLeft(entry, width - 12) + '\n';
  if (exitT) out += padRight('Salida:', 12) + padLeft(exitT, width - 12) + '\n';
  if (data.durationMinutes > 0) {
    out += padRight('Tiempo:', 12) + padLeft(timeStr, width - 12) + '\n';
  }
  out += '-'.repeat(width) + '\n';
  if (data.baseAmount > 0 || data.additionalAmount > 0 || data.totalAmount > 0) {
    out += padRight('Tarifa base:', 20) + padLeft(`$${formatMoney(data.baseAmount)}`, width - 20) + '\n';
    out += padRight('Tiempo adicional:', 20) + padLeft(`$${formatMoney(data.additionalAmount)}`, width - 20) + '\n';
    out += '-'.repeat(width) + '\n';
    out += boldOn + padRight('TOTAL:', 10) + padLeft(`$${formatMoney(data.totalAmount)}`, width - 10) + boldOff + '\n';
    out += '-'.repeat(width) + '\n';
  }
  out += alignCenter + '¡Gracias por su preferencia!' + '\n';
  out += alignCenter + website + '\n';
  out += alignCenter + 'Powered by ParkiU' + '\n';
  out += '\n\n\n';
  out += cut;
  return out;
}

export async function tryPrintViaQZ(receipt: ThermalReceiptData): Promise<boolean> {
  try {
    const qz = await connectQZ();
    if (!qz) throw new Error('QZ not loaded');
    const saved = localStorage.getItem('qz.printerName');
    const list: string[] = await qz.printers.find();
    const defaultName = await qz.printers.getDefault();
    // Use saved only if it still exists in the system (avoids "printer not found" when disconnected)
    const printer = (saved && list.includes(saved)) ? saved : (defaultName || list[0] || null);
    if (!printer) throw new Error('No hay impresoras disponibles. Conecta una impresora o selecciona una en Configuración.');

    const cfg = qz.configs.create(printer, {
      size: { width: 80, units: 'mm' },
      margins: 0,
      copies: 1,
      density: 2
    });

    const data: Array<{ type: 'raw' | 'html'; format?: string; data: string }> = [
      { type: 'raw', format: 'command', data: buildEscPos(receipt) }
    ];
    await qz.print(cfg, data);
    return true;
  } catch (e) {
    console.warn('QZ print failed, falling back to HTML:', e);
    return false;
  }
}

export async function selectQZPrinter(): Promise<string | null> {
  try {
    const qz = await connectQZ();
    if (!qz) return null;
    const printers: string[] = await qz.printers.find();
    if (!printers || printers.length === 0) return null;
    // For now, pick default; a UI picker can be added later
    const def = await qz.printers.getDefault();
    const name = def || printers[0];
    localStorage.setItem('qz.printerName', name);
    return name;
  } catch (e) {
    console.warn('QZ printer selection failed:', e);
    return null;
  }
}

export async function listQZPrinters(): Promise<{ printers: string[]; defaultPrinter: string | null }> {
  try {
    const qz = await connectQZ();
    if (!qz) {
      throw new Error('QZ Tray no está disponible');
    }
    const printers: string[] = await qz.printers.find();
    const def = await qz.printers.getDefault();
    return { printers, defaultPrinter: def };
  } catch (e) {
    console.warn('QZ list printers failed:', e);
    // Re-throw with more user-friendly message
    if (e instanceof Error) {
      if (e.message.includes('Failed to load QZ Tray library')) {
        // Detect macOS vs other platforms
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        if (isMac) {
          throw new Error('QZ Tray instalado pero no ejecutándose. Busca el ícono 🖨️ en la barra de menú superior');
        } else {
          throw new Error('QZ Tray no está instalado. Descárgalo desde qz.io/download');
        }
      }
      if (e.message.includes('QZ Tray not available') || e.message.includes('no está ejecutándose')) {
        throw new Error(e.message);
      }
      throw e;
    }
    throw new Error('Error desconocido al conectar con QZ Tray');
  }
}

export function getFavoritePrinterName(): string | null {
  return localStorage.getItem('qz.printerName');
}

export function setFavoritePrinterName(name: string | null): void {
  if (!name) {
    localStorage.removeItem('qz.printerName');
  } else {
    localStorage.setItem('qz.printerName', name);
  }
}

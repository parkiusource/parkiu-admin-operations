/**
 * Logger Profesional para ParkiU Admin
 *
 * Características:
 * - En desarrollo: muestra todo en consola con formato
 * - En producción: solo errores críticos
 * - Buffer interno para debugging
 * - Preparado para integración con servicios externos (Sentry, LogRocket)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: unknown;
  context?: string;
}

const LOG_COLORS = {
  debug: '#9CA3AF', // gray
  info: '#3B82F6',  // blue
  warn: '#F59E0B',  // amber
  error: '#EF4444', // red
};

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private readonly maxLogs = 100;

  private createEntry(
    level: LogLevel,
    message: string,
    data?: unknown,
    context?: string
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      data,
      context,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    // En producción solo errores y warnings críticos
    return level === 'error';
  }

  private formatPrefix(entry: LogEntry): string {
    const time = entry.timestamp.toLocaleTimeString();
    const ctx = entry.context ? `[${entry.context}]` : '';
    return `${time} ${entry.level.toUpperCase()} ${ctx}`;
  }

  private addToBuffer(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  debug(message: string, data?: unknown, context?: string): void {
    const entry = this.createEntry('debug', message, data, context);
    this.addToBuffer(entry);

    if (this.shouldLog('debug')) {
      console.log(
        `%c${this.formatPrefix(entry)}`,
        `color: ${LOG_COLORS.debug}`,
        message,
        data !== undefined ? data : ''
      );
    }
  }

  info(message: string, data?: unknown, context?: string): void {
    const entry = this.createEntry('info', message, data, context);
    this.addToBuffer(entry);

    if (this.shouldLog('info')) {
      console.log(
        `%c${this.formatPrefix(entry)}`,
        `color: ${LOG_COLORS.info}`,
        message,
        data !== undefined ? data : ''
      );
    }
  }

  warn(message: string, data?: unknown, context?: string): void {
    const entry = this.createEntry('warn', message, data, context);
    this.addToBuffer(entry);

    if (this.shouldLog('warn')) {
      console.warn(this.formatPrefix(entry), message, data !== undefined ? data : '');
    }
  }

  error(message: string, error?: unknown, context?: string): void {
    const entry = this.createEntry('error', message, error, context);
    this.addToBuffer(entry);

    // Siempre loguear errores
    console.error(this.formatPrefix(entry), message, error !== undefined ? error : '');

    // En producción, enviar a servicio de logging
    if (!this.isDevelopment) {
      this.sendToRemoteLogger(entry);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private sendToRemoteLogger(_entry: LogEntry): void {
    // TODO: Integrar con Sentry, LogRocket, etc.
    // Implementar cuando se configure el servicio de logging
    // El parámetro _entry se usará cuando se integre el servicio
  }

  /**
   * Obtener logs recientes para debugging
   */
  getRecentLogs(count = 20): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Exportar logs como JSON para debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Limpiar buffer
   */
  clear(): void {
    this.logs = [];
  }
}

// Singleton
export const logger = new Logger();

export default logger;

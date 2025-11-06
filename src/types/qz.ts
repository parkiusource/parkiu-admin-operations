export type QZTrayStatus = 'checking' | 'available' | 'not-installed' | 'not-running' | 'no-printers' | 'error';

export interface QZTrayStatusInfo {
  status: QZTrayStatus;
  message: string;
  printerCount: number;
  error?: string;
}

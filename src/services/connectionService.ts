import { useStore } from '../store/useStore';
import { syncPendingOperations } from './offlineSync';

/**
 * Connection status service that monitors network connectivity
 * This runs outside of React's context to avoid hook call issues
 * ✅ CON SINCRONIZACIÓN AUTOMÁTICA AL VOLVER ONLINE
 */
class ConnectionService {
  private initialized = false;
  private syncTimeoutId: NodeJS.Timeout | null = null;

  /**
   * Initialize the connection status monitoring
   * This should be called once when the app starts
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    const store = useStore.getState();

    const handleOnline = async () => {
      console.log('🌐 Conexión restablecida - Actualizando estado...');
      store.setOffline(false);

      // 🔄 SINCRONIZACIÓN AUTOMÁTICA con debounce de 2 segundos
      // (esperar a que la conexión se estabilice)
      if (this.syncTimeoutId) {
        clearTimeout(this.syncTimeoutId);
      }

      this.syncTimeoutId = setTimeout(async () => {
        try {
          console.log('🔄 Iniciando sincronización automática de operaciones offline...');
          store.setSyncing(true);
          await syncPendingOperations();
          console.log('✅ Sincronización automática completada');
        } catch (error) {
          console.error('❌ Error en sincronización automática:', error);
        } finally {
          store.setSyncing(false);
          this.syncTimeoutId = null;
        }
      }, 2000);
    };

    const handleOffline = () => {
      console.log('📡 Conexión perdida - Activando modo offline...');
      store.setOffline(true);
      // Cancelar sincronización pendiente si hay una
      if (this.syncTimeoutId) {
        clearTimeout(this.syncTimeoutId);
        this.syncTimeoutId = null;
      }
    };

    // Set initial state
    store.setOffline(!navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    this.initialized = true;

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (this.syncTimeoutId) {
        clearTimeout(this.syncTimeoutId);
      }
      this.initialized = false;
    };
  }

  /**
   * Get current connection status
   * Uses store state as source of truth (synced with navigator.onLine)
   */
  isOnline(): boolean {
    return !useStore.getState().isOffline;
  }

  /**
   * Get current offline status from store
   */
  isOffline(): boolean {
    return useStore.getState().isOffline;
  }

  /**
   * Manually set offline status (useful for testing)
   */
  setOffline(offline: boolean): void {
    console.log(`🔧 Manually setting offline status to: ${offline}`);
    useStore.getState().setOffline(offline);
  }
}

// Export singleton instance
export const connectionService = new ConnectionService();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { connectionService: ConnectionService }).connectionService = connectionService;
}

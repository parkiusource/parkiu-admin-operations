import { useStore } from '../store/useStore';
import { syncPendingOperations } from './offlineSync';
import { getToken, getAuth0Client } from '@/api/client';

/**
 * Connection status service that monitors network connectivity
 * This runs outside of React's context to avoid hook call issues
 * ✅ CON SINCRONIZACIÓN AUTOMÁTICA AL VOLVER ONLINE
 */
class ConnectionService {
  private initialized = false;
  private syncTimeoutId: NodeJS.Timeout | null = null;
  private syncRetryCount = 0;
  private maxSyncRetries = 3;

  /**
   * Check if Auth0 client is ready
   */
  private isAuth0Ready(): boolean {
    return getAuth0Client() !== null;
  }

  /**
   * Attempt to sync with exponential backoff retry
   */
  private async attemptSync(store: ReturnType<typeof useStore.getState>): Promise<void> {
    // Check if Auth0 is ready
    if (!this.isAuth0Ready()) {
      console.log('⏳ Auth0 not ready yet, will retry sync...');

      // Retry with exponential backoff
      if (this.syncRetryCount < this.maxSyncRetries) {
        this.syncRetryCount++;
        const retryDelay = Math.min(2000 * Math.pow(2, this.syncRetryCount - 1), 10000); // Max 10s
        console.log(`⏱️ Retrying sync in ${retryDelay}ms (attempt ${this.syncRetryCount}/${this.maxSyncRetries})`);

        this.syncTimeoutId = setTimeout(() => {
          this.attemptSync(store);
        }, retryDelay);
        return;
      } else {
        console.warn('⚠️ Max sync retries reached. Auth0 still not ready. Will try again on next online event.');
        this.syncRetryCount = 0;
        return;
      }
    }

    // Auth0 is ready, proceed with sync (no resetear syncRetryCount aquí para que el contador de reintentos por token persista)
    try {
      console.log('🔄 Iniciando sincronización automática de operaciones offline...');
      store.setSyncing(true);

      const result = await syncPendingOperations({
        getToken: async () => {
          const token = await getToken();
          if (!token) {
            throw new Error('No se pudo obtener el token de autenticación');
          }
          return token;
        }
      });

      console.log(`✅ Sincronización completada: ${result.synced} sincronizadas, ${result.failed} fallidas`);
      store.setLastSyncResult({ synced: result.synced, failed: result.failed });
      store.setLastSyncError(null);
      this.syncRetryCount = 0; // Solo resetear en éxito
    } catch (error) {
      console.error('❌ Error en sincronización automática:', error);
      const msg = error instanceof Error ? error.message : String(error);
      const isTokenError = /token|autenticación|auth/i.test(msg);
      if (isTokenError && this.syncRetryCount < this.maxSyncRetries) {
        this.syncRetryCount++;
        const retryDelay = Math.min(3000 * Math.pow(2, this.syncRetryCount - 1), 15000); // 3s, 6s, 12s (más tiempo para que Auth0 refresque)
        console.log(`⏱️ Reintentando sync en ${retryDelay}ms (token no listo, intento ${this.syncRetryCount}/${this.maxSyncRetries})`);
        this.syncTimeoutId = setTimeout(() => {
          this.syncTimeoutId = null;
          this.attemptSync(store);
        }, retryDelay);
        return;
      }
      this.syncRetryCount = 0;
      store.setLastSyncError('auth');
    } finally {
      if (!this.syncTimeoutId) {
        store.setSyncing(false);
        this.syncTimeoutId = null;
      }
    }
  }

  /**
   * Reintentar sincronización manualmente (p. ej. tras volver a iniciar sesión)
   */
  retrySync(): void {
    const store = useStore.getState();
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
      this.syncTimeoutId = null;
    }
    this.syncRetryCount = 0;
    this.attemptSync(store);
  }

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
      this.syncRetryCount = 0; // Nuevo ciclo de reintentos al reconectar

      // 🔄 SINCRONIZACIÓN AUTOMÁTICA con debounce de 5s para dar tiempo a Auth0 a refrescar el token
      if (this.syncTimeoutId) {
        clearTimeout(this.syncTimeoutId);
      }

      this.syncTimeoutId = setTimeout(() => {
        this.syncTimeoutId = null;
        this.attemptSync(store);
      }, 5000);
    };

    const handleOffline = () => {
      console.log('📡 Conexión perdida - Activando modo offline...');
      store.setOffline(true);
      store.setLastSyncError(null);
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
   * Consider offline if navigator says so OR store says offline.
   * Use before attempting backend to avoid hanging when network is down but store hasn't updated.
   */
  considerOffline(): boolean {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    return this.isOffline();
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

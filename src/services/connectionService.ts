import { useStore } from '../store/useStore';
import { syncPendingOperations } from './offlineSync';
import { getToken, getAuth0Client } from '@/api/client';
import { getPendingCount, cleanupOldOperations } from './offlineQueue';

/**
 * Connection status service that monitors network connectivity
 * This runs outside of React's context to avoid hook call issues
 * ✅ CON SINCRONIZACIÓN AUTOMÁTICA MEJORADA:
 * - Al volver online
 * - Al iniciar app si hay operaciones pendientes
 * - Periódicamente cada 2 minutos
 * - Después de encolar operaciones (con debounce)
 */
class ConnectionService {
  private initialized = false;
  private syncTimeoutId: NodeJS.Timeout | null = null;
  private periodicSyncIntervalId: NodeJS.Timeout | null = null;
  private debounceSyncTimeoutId: NodeJS.Timeout | null = null;
  private syncRetryCount = 0;
  private maxSyncRetries = 3;
  private lastSyncAttemptTime = 0;
  private minTimeBetweenSyncs = 30000; // 🔥 FIX LOOP: 30 segundos mínimo entre sincronizaciones (antes 10s)

  /**
   * Check if Auth0 client is ready
   */
  private isAuth0Ready(): boolean {
    return getAuth0Client() !== null;
  }

  /**
   * Attempt to sync with exponential backoff retry
   */
  private async attemptSync(store: ReturnType<typeof useStore.getState>, skipChecks = false): Promise<void> {
    // Evitar sincronizaciones muy frecuentes (rate limiting)
    if (!skipChecks) {
      const now = Date.now();
      if (now - this.lastSyncAttemptTime < this.minTimeBetweenSyncs) {
        return; // Muy pronto desde la última sincronización
      }
    }

    // No sincronizar si ya hay una sincronización en progreso
    if (store.isSyncing && !skipChecks) {
      return;
    }

    // No sincronizar si estamos offline
    if (store.isOffline) {
      return;
    }

    // Verificar si hay operaciones pendientes antes de continuar
    const pendingCount = await getPendingCount();
    if (pendingCount === 0) {
      return; // No hay nada que sincronizar
    }

    this.lastSyncAttemptTime = Date.now();

    // Check if Auth0 is ready
    if (!this.isAuth0Ready()) {
      // Retry with exponential backoff
      if (this.syncRetryCount < this.maxSyncRetries) {
        this.syncRetryCount++;
        const retryDelay = Math.min(2000 * Math.pow(2, this.syncRetryCount - 1), 10000); // Max 10s

        this.syncTimeoutId = setTimeout(() => {
          this.attemptSync(store, true);
        }, retryDelay);
        return;
      } else {
        // Auth0 no está listo después de múltiples reintentos
        this.syncRetryCount = 0;
        store.setLastSyncError('auth');
        return;
      }
    }

    // Auth0 is ready, proceed with sync
    try {
      store.setSyncing(true);
      store.setLastSyncError(null); // Limpiar error anterior al iniciar nueva sincronización

      const result = await syncPendingOperations({
        getToken: async () => {
          const token = await getToken();
          if (!token) {
            throw new Error('No se pudo obtener el token de autenticación. La sesión puede haber expirado.');
          }
          return token;
        }
      });

      // Solo mostrar resultado si se sincronizó algo
      if (result.synced > 0 || result.failed > 0) {
        store.setLastSyncResult({ synced: result.synced, failed: result.failed });
      }

      // Log conflictos para debugging (no mostrar al usuario)
      if (result.conflicts > 0) {
        console.info(`ℹ️ ${result.conflicts} conflicto(s) de idempotencia resueltos automáticamente`);
      }

      store.setLastSyncError(null);
      this.syncRetryCount = 0; // Solo resetear en éxito
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isTokenError = /token|autenticación|auth|sesión|expirado/i.test(msg);

      // Solo reintentar automáticamente si es error de token y no hemos excedido reintentos
      if (isTokenError && this.syncRetryCount < this.maxSyncRetries) {
        this.syncRetryCount++;
        const retryDelay = Math.min(3000 * Math.pow(2, this.syncRetryCount - 1), 15000); // 3s, 6s, 12s

        this.syncTimeoutId = setTimeout(() => {
          this.syncTimeoutId = null;
          this.attemptSync(store, true);
        }, retryDelay);
        return;
      }

      // Si agotamos reintentos o es error no relacionado con auth, mostrar error
      this.syncRetryCount = 0;
      if (isTokenError) {
        store.setLastSyncError('auth');
      }
    } finally {
      // Solo marcar como no sincronizando si no hay un timeout pendiente
      if (!this.syncTimeoutId) {
        store.setSyncing(false);
      }
    }
  }

  /**
   * Trigger sync after enqueueing an operation (with debounce)
   * Se llama desde offlineQueue cuando se agrega una operación
   */
  triggerSyncAfterEnqueue(): void {
    // Si ya hay un debounce pendiente, cancelarlo
    if (this.debounceSyncTimeoutId) {
      clearTimeout(this.debounceSyncTimeoutId);
    }

    // Programar sincronización con debounce de 2 segundos
    // (permite que se acumulen varias operaciones antes de sincronizar)
    this.debounceSyncTimeoutId = setTimeout(() => {
      this.debounceSyncTimeoutId = null;
      const store = useStore.getState();

      // Solo sincronizar si estamos online y no estamos sincronizando
      if (!store.isOffline && !store.isSyncing) {
        this.attemptSync(store);
      }
    }, 2000);
  }

  /**
   * Iniciar sincronización periódica en background
   */
  private startPeriodicSync(): void {
    // Limpiar intervalo existente si hay uno
    if (this.periodicSyncIntervalId) {
      clearInterval(this.periodicSyncIntervalId);
    }

    // 🔥 FIX LOOP: Sincronización periódica cada 5 minutos (antes 2 min)
    this.periodicSyncIntervalId = setInterval(async () => {
      const store = useStore.getState();

      // Solo sincronizar si:
      // - Estamos online
      // - No estamos sincronizando
      // - Hay operaciones pendientes
      if (!store.isOffline && !store.isSyncing) {
        const pendingCount = await getPendingCount();
        if (pendingCount > 0) {
          console.log(`🔄 [PeriodicSync] Sincronizando ${pendingCount} operación(es) pendiente(s)...`);
          this.attemptSync(store);
        }
      }

      // 🧹 Limpieza de operaciones antiguas cada 5 minutos
      // (silenciosamente elimina operaciones con más de 48h que ya no pueden sincronizarse)
      try {
        await cleanupOldOperations(48);
      } catch (error) {
        console.error('Error limpiando operaciones antiguas:', error);
      }
    }, 300000); // 🔥 FIX LOOP: 5 minutos (antes 2 min)
  }

  /**
   * Sincronización inicial al cargar la app si hay operaciones pendientes
   */
  private async checkAndSyncOnStartup(): Promise<void> {
    const store = useStore.getState();

    // Solo si estamos online
    if (store.isOffline) {
      console.log('⚠️ [CheckAndSyncOnStartup] Offline - Saltando sincronización inicial');
      return;
    }

    // Verificar si hay operaciones pendientes
    const pendingCount = await getPendingCount();
    if (pendingCount > 0) {
      console.log(`🔄 [CheckAndSyncOnStartup] ${pendingCount} operación(es) pendiente(s) - Programando sincronización...`);
      // 🔥 FIX LOOP: Esperar 5 segundos para dar tiempo a que Auth0 y toda la app se inicialice
      setTimeout(() => {
        console.log('🔄 [CheckAndSyncOnStartup] Iniciando sincronización...');
        this.attemptSync(store, true);
      }, 5000); // Antes 3s, ahora 5s
    } else {
      console.log('✅ [CheckAndSyncOnStartup] No hay operaciones pendientes');
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
      console.log('🌐 [ConnectionService] Conexión restaurada - Volviendo online...');
      store.setOffline(false);
      this.syncRetryCount = 0; // Nuevo ciclo de reintentos al reconectar

      // 🔄 SINCRONIZACIÓN AUTOMÁTICA con debounce de 8s para dar tiempo a Auth0 a refrescar el token
      // 🔥 FIX LOOP: Aumentar delay para evitar sincronización múltiple al reconectar
      if (this.syncTimeoutId) {
        clearTimeout(this.syncTimeoutId);
      }

      this.syncTimeoutId = setTimeout(async () => {
        this.syncTimeoutId = null;
        const pendingCount = await getPendingCount();
        if (pendingCount > 0) {
          console.log(`🔄 [HandleOnline] Sincronizando ${pendingCount} operación(es) tras reconexión...`);
          this.attemptSync(store, true);
        } else {
          console.log('✅ [HandleOnline] No hay operaciones pendientes para sincronizar');
        }
      }, 8000); // 🔥 FIX LOOP: 8 segundos (antes 5s)
    };

    const handleOffline = () => {
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

    // 🆕 Iniciar sincronización periódica
    this.startPeriodicSync();

    // 🆕 Sincronizar operaciones pendientes al iniciar (si las hay)
    this.checkAndSyncOnStartup();

    this.initialized = true;

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      // Limpiar todos los timers
      if (this.syncTimeoutId) {
        clearTimeout(this.syncTimeoutId);
        this.syncTimeoutId = null;
      }
      if (this.periodicSyncIntervalId) {
        clearInterval(this.periodicSyncIntervalId);
        this.periodicSyncIntervalId = null;
      }
      if (this.debounceSyncTimeoutId) {
        clearTimeout(this.debounceSyncTimeoutId);
        this.debounceSyncTimeoutId = null;
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
    useStore.getState().setOffline(offline);
  }
}

// Export singleton instance
export const connectionService = new ConnectionService();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { connectionService: ConnectionService }).connectionService = connectionService;
}

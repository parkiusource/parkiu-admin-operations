import { useStore } from '../store/useStore';

/**
 * Connection status service that monitors network connectivity
 * This runs outside of React's context to avoid hook call issues
 */
class ConnectionService {
  private initialized = false;

  /**
   * Initialize the connection status monitoring
   * This should be called once when the app starts
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    const store = useStore.getState();

    const handleOnline = () => {
      store.setOffline(false);
    };

    const handleOffline = () => {
      store.setOffline(true);
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
      this.initialized = false;
    };
  }

  /**
   * Get current connection status
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Get current offline status from store
   */
  isOffline(): boolean {
    return useStore.getState().isOffline;
  }
}

// Export singleton instance
export const connectionService = new ConnectionService();

/**
 * 🔐 Servicio de Sesión Offline
 *
 * Gestiona la persistencia de sesión para permitir operaciones offline
 * cuando Auth0 no puede validar el token (sin conexión a internet).
 *
 * ARQUITECTURA OFFLINE-FIRST:
 * 1. Al autenticarse online, guardamos datos mínimos de sesión en localStorage
 * 2. Al recargar offline, usamos estos datos para permitir acceso al dashboard
 * 3. Las operaciones se encolan en IndexedDB y se sincronizan al reconectar
 */

const OFFLINE_SESSION_KEY = 'parkiu_offline_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

export interface OfflineSessionData {
  userId: string;
  email: string;
  role: string;
  status: string;
  parkingLotIds: string[];
  savedAt: string; // ISO timestamp
}

/**
 * Guarda datos de sesión para uso offline
 * Llamar después de autenticación exitosa y carga de perfil
 */
export function saveOfflineSession(data: Omit<OfflineSessionData, 'savedAt'>): void {
  try {
    const session: OfflineSessionData = {
      ...data,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(session));
    console.log('✅ [OfflineSession] Sesión guardada para uso offline');
  } catch (error) {
    console.error('❌ [OfflineSession] Error guardando sesión:', error);
  }
}

/**
 * Resultado de verificación de sesión offline
 */
export interface OfflineSessionResult {
  session: OfflineSessionData | null;
  expired: boolean;
  hoursRemaining: number;
}

/**
 * Obtiene datos de sesión offline si existen y no han expirado
 */
export function getOfflineSession(): OfflineSessionData | null {
  const result = getOfflineSessionWithStatus();
  return result.session;
}

/**
 * Obtiene datos de sesión offline con información de estado (expiración)
 * Útil para mostrar mensajes al usuario sobre el estado de la sesión
 */
export function getOfflineSessionWithStatus(): OfflineSessionResult {
  try {
    const stored = localStorage.getItem(OFFLINE_SESSION_KEY);
    if (!stored) {
      return { session: null, expired: false, hoursRemaining: 0 };
    }

    const session: OfflineSessionData = JSON.parse(stored);

    // Verificar que no haya expirado (24 horas)
    const savedAt = new Date(session.savedAt).getTime();
    const now = Date.now();
    const ageMs = now - savedAt;

    if (ageMs > SESSION_MAX_AGE_MS) {
      console.warn('⚠️ [OfflineSession] Sesión expirada después de 24 horas');
      clearOfflineSession();
      return { session: null, expired: true, hoursRemaining: 0 };
    }

    // Calcular horas restantes
    const remainingMs = SESSION_MAX_AGE_MS - ageMs;
    const hoursRemaining = Math.floor(remainingMs / (1000 * 60 * 60));

    return { session, expired: false, hoursRemaining };
  } catch (error) {
    console.error('❌ [OfflineSession] Error leyendo sesión:', error);
    return { session: null, expired: false, hoursRemaining: 0 };
  }
}

/**
 * Verifica si hay una sesión offline válida
 */
export function hasValidOfflineSession(): boolean {
  return getOfflineSession() !== null;
}

/**
 * Limpia la sesión offline (al hacer logout)
 */
export function clearOfflineSession(): void {
  try {
    localStorage.removeItem(OFFLINE_SESSION_KEY);
    console.log('🗑️ [OfflineSession] Sesión offline eliminada');
  } catch (error) {
    console.error('❌ [OfflineSession] Error eliminando sesión:', error);
  }
}

/**
 * Actualiza los parking lot IDs en la sesión (cuando se cargan nuevos)
 */
export function updateOfflineSessionParkingLots(parkingLotIds: string[]): void {
  const session = getOfflineSession();
  if (session) {
    saveOfflineSession({
      ...session,
      parkingLotIds
    });
  }
}

/**
 * Verifica si el usuario puede operar offline
 * Requiere: sesión válida + estar offline + tener datos en caché
 */
export function canOperateOffline(): boolean {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const hasSession = hasValidOfflineSession();
  return isOffline && hasSession;
}

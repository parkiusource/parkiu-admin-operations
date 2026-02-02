# Dónde se guarda cada dato (Cache vs IndexedDB vs localStorage)

En el proyecto hay **tres tipos de almacenamiento** usados para offline y caché. Este doc aclara qué va en cada uno y por qué.

---

## 1. IndexedDB (ParkiuDB / Dexie)

**Qué es:** Base de datos en el navegador, persistente entre recargas y entre sesiones.
**Dónde:** `src/db/schema.ts` → base `ParkiuDB`.
**Cuándo usar:** Datos que deben **sobrevivir a recargas** y ser la fuente de verdad offline (listas, cola de operaciones, caché de datos del backend).

| Tabla | Contenido | Servicio | Motivo |
|-------|-----------|----------|--------|
| `operations` | Cola de entradas/salidas pendientes de sincronizar | `offlineQueue.ts` | Persistir la cola aunque el usuario cierre la pestaña; idempotencia con UUID. |
| `cachedParkingLots` | Parking lots completos (por id) | `offlineCache.ts` | Fallback offline al listar parqueaderos; TTL 24h. |
| `cachedParkingSpaces` | Espacios por `parkingLotId` | `offlineCache.ts` | Fallback offline al cargar espacios; se actualiza con entradas/salidas. |
| `activeVehicles` | Vehículos activos por parqueadero (placa, espacio, entrada) | `activeVehiclesCache.ts` | Búsqueda por placa y lista de activos offline. |
| `cachedTransactionHistory` | Historial de transacciones por parqueadero + filtros | `offlineCache.ts` | Offline-first: última consulta guardada; al volver online se recupera del backend. |

**Resumen:** Todo lo que es "caché offline" de datos del backend (espacios, lots, vehículos, historial) y la **cola de operaciones** está en IndexedDB para que siga disponible después de recargar.

---

## 2. localStorage

**Qué es:** Almacenamiento clave-valor (string), persistente, limitado en tamaño (~5–10 MB según navegador).
**Cuándo usar:** Preferencias de usuario y datos pequeños que no requieren índices ni consultas complejas.

| Clave / Uso | Contenido | Dónde se usa |
|-------------|-----------|---------------|
| `parkiu.tariffs.cache` | Tarifas por `parkingLotId` (rates, fixed rates) | `offlineTariffs.ts`; `vehicleService` y hooks para calcular costos offline. |
| `qz.printerName` | Nombre de la impresora seleccionada | `services/printing/qz.ts`. |
| `qz-warning-hidden` | Si el usuario ocultó el aviso de QZ | `PrinterSelector.tsx`. |
| `onboarding_step1` / `onboarding_step2` | Datos del onboarding | Componentes de onboarding. |

**Por qué tarifas en localStorage y no en IndexedDB:** Las tarifas son un objeto pequeño por parqueadero (un JSON por clave). localStorage es suficiente, evita tocar IndexedDB para algo tan simple y mantiene la API de `getTariffs`/`saveTariffs` sencilla.

---

## 3. "Cache" en memoria (React Query)

**Qué es:** Estado en memoria que React Query asocia a cada `queryKey`. **No es persistente**: se pierde al recargar la página.
**Cuándo usar:** Solo para que la UI sea reactiva (evitar loading innecesario, actualizaciones optimistas). La persistencia real la llevan IndexedDB y, en su caso, localStorage.

Ejemplos de uso:

- `queryClient.setQueryData(['vehicles', 'active', parkingLotId], ...)` → lista de vehículos activos en pantalla.
- `queryClient.setQueryData(['realParkingSpaces', parkingLotId], ...)` → espacios del parqueadero en pantalla.

Al hacer una entrada/salida:

1. Se escribe en **IndexedDB** (cola `operations` + `activeVehicles` o `cachedParkingSpaces`).
2. Se actualiza el **cache de React Query** con `setQueryData` para que la UI cambie al instante.
3. Si el usuario recarga, los datos se vuelven a leer desde **IndexedDB** (y/o backend si hay red).

**Resumen:** "Cache" en el código a veces significa "caché de React Query" (memoria, volátil) y otras "datos cacheados en IndexedDB" (persistente). La regla: lo que debe seguir disponible tras recargar → IndexedDB (o localStorage si es poco y simple).

---

## Flujo resumido

```
Usuario hace entrada/salida offline
         │
         ▼
┌─────────────────────┐     ┌──────────────────────────┐
│ IndexedDB           │     │ React Query (memoria)     │
│ - operations        │     │ - setQueryData(...)      │
│ - activeVehicles    │     │ → UI se actualiza ya      │
│ - cachedParkingSpaces │   │ → Se pierde al recargar   │
└─────────────────────┘     └──────────────────────────┘
         │
         │ (al reconectar)
         ▼
   offlineSync.ts vacía la cola → backend
```

- **IndexedDB:** persistencia y fuente de verdad offline (operaciones + caché de espacios/lots/vehículos).
- **localStorage:** preferencias y tarifas (datos pequeños y simples).
- **React Query cache:** solo estado en memoria para la UI; la persistencia la aportan IndexedDB y localStorage.

Si en el futuro quisieras unificar: se podría migrar las tarifas a IndexedDB (por ejemplo una tabla `cachedTariffs`) para tener todo el "caché offline" en un solo sitio, pero no es obligatorio; la división actual es coherente (poco volumen → localStorage, resto → IndexedDB).

---

## Buenas prácticas y recomendaciones

### Reglas aplicadas en el proyecto

1. **Nunca guardar tokens de autenticación en localStorage**
   Riesgo: XSS puede leer `localStorage` y robar el token. Uso: Auth0 `getAccessTokenSilently()` en memoria. Corregido: `useDashboardData` ya no usa `localStorage.getItem('auth_token')`.

2. **IndexedDB** para datos que deben persistir entre recargas (cola `operations`, caché de espacios/lots/vehículos). TTL donde aplique (ej. 24h en `offlineCache`).

3. **localStorage** solo para datos pequeños y no sensibles (tarifas, preferencias de impresora, onboarding draft, flags de UI).

4. **sessionStorage** para caché de sesión (autocomplete: TTL 10 min, max 50 entradas; flag `hasPendingOperations`).

5. **React Query** solo como caché en memoria; la persistencia real está en IndexedDB o localStorage.

### Auditoría de uso

| Ubicación | Uso | Estado |
|-----------|-----|--------|
| `useDashboardData.ts` | Auth0 en lugar de localStorage auth_token | Corregido |
| `offlineTariffs.ts` | localStorage parkiu.tariffs.cache | OK |
| `qz.ts` / `PrinterSelector.tsx` | localStorage impresora y aviso | OK |
| Onboarding | localStorage step1/step2 | OK |
| `useAutocompletePlaces.ts` | sessionStorage, max 50 entradas | OK |
| `useSearchPlaces.ts` | Map en memoria | OK |
| SyncErrorBanner / AuthProvider | sessionStorage hasPendingOperations | OK |
| IndexedDB operations, cached*, activeVehicles | Offline-first | OK |
| Historial de transacciones | IndexedDB `cachedTransactionHistory` (offline-first) | OK |

### Historial de transacciones (offline-first)

- **IndexedDB** (no localStorage): el historial puede ser grande (paginación, muchos filtros). Se guarda por `parkingLotId` + clave de filtros; TTL 24h; máximo 15 entradas por parqueadero (FIFO).
- **Flujo:** Online → se pide al backend y se guarda en IndexedDB. Offline → se lee de IndexedDB y se muestra (con aviso "Datos en caché"). Al volver online, "Actualizar" o refetch trae datos frescos.

### Dos fuentes de espacios en IndexedDB

- **Flujo backend + offline-first:** `cachedParkingSpaces`, hooks `useRealParkingSpaces`, `useRealParkingSpacesWithVehicles`.
- **Tablas legacy:** `parkingSpots`, `vehicles`, `transactions` (schema v1), usadas por `parkingSpotService` y `useAvailableParkingSpots`. Para nueva funcionalidad usar el flujo con `cachedParkingSpaces` y cola `operations`.

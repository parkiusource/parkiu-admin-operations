# 🔍 Análisis del Flujo de Sincronización

## ⚠️ PROBLEMA IDENTIFICADO

**La sincronización solo se activa cuando hay un cambio de estado offline → online, NO cuando hay operaciones pendientes mientras el usuario está online.**

---

## 📊 Diagrama de Flujo Actual

```
┌─────────────────────────────────────────────────────────────────┐
│                    INICIALIZACIÓN (App.tsx)                      │
│  connectionService.initialize() configura listeners online/offline│
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  USUARIO REGISTRA OPERACIÓN                      │
│         (Entrada/Salida en useVehicles.ts hooks)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  ¿Está offline? │
                    └────┬──────┬────┘
                         │      │
                    SÍ   │      │   NO
                         │      │
                         ▼      ▼
              ┌──────────────────────────┐
              │   enqueueOperation()     │ ← Guarda en IndexedDB
              │   (offlineQueue.ts)      │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │ Operación queda PENDIENTE│
              │   en IndexedDB (status:  │
              │      'pending')          │
              └──────────┬───────────────┘
                         │
                         │ 🚨 AQUÍ ESTÁ EL PROBLEMA
                         │
                         ▼
              ┌──────────────────────────┐
              │  ¿Qué dispara la sync?   │
              └──────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   SOLO cuando hay evento       │
        │   window.addEventListener      │
        │      ('online', ...)           │ ← Solo cuando el navegador
        └────────┬───────────────────────┘   detecta cambio offline→online
                 │
                 ▼
        ┌────────────────────────────┐
        │ Espera 5 segundos          │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │ connectionService          │
        │   .attemptSync()           │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │ ¿Auth0Client listo?        │
        └────┬──────────┬────────────┘
             │          │
          NO │          │ SÍ
             │          │
             ▼          ▼
     ┌───────────┐  ┌──────────────────────┐
     │ Reintentar│  │ syncPendingOperations│
     │con backoff│  │   (offlineSync.ts)   │
     └───────────┘  └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Para cada operación  │
                    │  pendiente en cola:  │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Obtener token        │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Llamar VehicleService│
                    │ .registerEntry/Exit  │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ ¿Éxito?              │
                    └─────┬────────┬───────┘
                          │        │
                       SÍ │        │ NO
                          │        │
                          ▼        ▼
              ┌─────────────┐  ┌──────────────┐
              │ markAsSynced│  │ markAsError  │
              │ (status:    │  │ (status:     │
              │ 'synced')   │  │ 'error')     │
              └─────────────┘  └──────────────┘
```

---

## 🔥 Escenarios Problemáticos

### Escenario 1: Usuario siempre online
```
1. Usuario abre app → Está ONLINE
2. Usuario registra entrada → enqueueOperation() ✅
3. Backend falla temporalmente → Operación queda pendiente
4. Usuario sigue ONLINE (no hay cambio de estado)
5. ❌ NUNCA SE SINCRONIZA porque no hay evento 'online'
```

### Escenario 2: Error de token mientras online
```
1. Usuario está ONLINE
2. Registra salida → enqueueOperation() ✅
3. Token expira después
4. Usuario sigue ONLINE
5. ❌ NO SE SINCRONIZA porque no hay cambio de estado
6. Usuario ve banner de "error de token"
7. Presiona "Reintentar" → connectionService.retrySync() ✅
8. ✅ Ahora SÍ se sincroniza (llamada manual)
```

### Escenario 3: Operaciones pendientes de sesión anterior
```
1. Usuario cierra app con operaciones pendientes
2. Usuario abre app al día siguiente
3. Ya está ONLINE desde el inicio
4. ❌ NUNCA SE SINCRONIZA porque no hay evento 'online'
5. Operaciones quedan en limbo hasta que presione "Reintentar"
```

---

## 📝 Componentes Involucrados

### 1. **offlineQueue.ts** (Cola de operaciones)
- `enqueueOperation()` - Guarda operación en IndexedDB
- `listPending()` - Lista operaciones pendientes
- `markAsSynced()` / `markAsError()` - Marca estado

### 2. **offlineSync.ts** (Procesador de cola)
- `syncPendingOperations()` - Procesa todas las operaciones pendientes
- Obtiene token para cada operación
- Llama al backend
- Maneja reintentos en caso de error de auth

### 3. **connectionService.ts** (Orquestador)
- `initialize()` - Configura listeners de online/offline
- `attemptSync()` - Ejecuta sincronización con reintentos
- `retrySync()` - Sincronización manual
- ⚠️ **Solo sincroniza en evento 'online'**

### 4. **SyncErrorBanner.tsx** (UI)
- Muestra banner cuando hay error
- Botón "Reintentar" llama a `retrySync()` ✅
- Botón "Iniciar Sesión" fuerza logout/login ✅

### 5. **useVehicles.ts** (Hooks de entrada/salida)
- `useRegisterVehicleEntry()` - Registra entrada
- `useRegisterVehicleExit()` - Registra salida
- Ambos llaman a `enqueueOperation()` cuando offline o error

---

## ✅ ¿Qué SÍ Funciona?

1. ✅ Guardar operaciones offline en IndexedDB
2. ✅ Sincronización cuando cambia de offline → online
3. ✅ Sincronización manual con botón "Reintentar"
4. ✅ Reintentos automáticos con backoff exponencial
5. ✅ Manejo de errores de token
6. ✅ UI clara con banners informativos

---

## ❌ ¿Qué NO Funciona?

1. ❌ **Sincronización automática cuando hay operaciones pendientes mientras está online**
2. ❌ **Sincronización al iniciar app si hay operaciones pendientes**
3. ❌ **Sincronización después de recuperar sesión Auth0**
4. ❌ **Sincronización periódica en background**

---

## 🔧 Soluciones Propuestas

### Opción 1: Sincronización al cargar operaciones pendientes (RECOMENDADA)
```typescript
// En connectionService.initialize()
useEffect(() => {
  const checkPendingOnStartup = async () => {
    const count = await getPendingCount();
    if (count > 0 && !isOffline) {
      // Esperar a que Auth0 esté listo
      setTimeout(() => attemptSync(), 3000);
    }
  };

  checkPendingOnStartup();
}, []);
```

### Opción 2: Sincronización periódica en background
```typescript
// En connectionService.initialize()
setInterval(async () => {
  const count = await getPendingCount();
  if (count > 0 && !isOffline && !isSyncing) {
    attemptSync();
  }
}, 30000); // Cada 30 segundos
```

### Opción 3: Sincronización después de cada operación (AGRESIVA)
```typescript
// En useVehicles.ts después de enqueueOperation()
if (!connectionService.isOffline()) {
  // Intentar sincronizar inmediatamente
  setTimeout(() => connectionService.retrySync(), 2000);
}
```

### Opción 4: Combinar todas (ÓPTIMA)
- Sincronización al inicio si hay pendientes
- Sincronización después de cada operación con debounce
- Sincronización periódica cada 2 minutos
- Sincronización en evento online (ya existe)

---

## 📌 Recomendación Final

Implementar **Opción 4 (Combinar todas)** para garantizar que:

1. **Al iniciar app**: Sincroniza operaciones de sesiones anteriores
2. **Después de registrar**: Intenta sincronizar (con debounce)
3. **Periódicamente**: Verifica y sincroniza pendientes cada 2min
4. **Al volver online**: Sincroniza inmediatamente (ya existe)

Esto garantiza que las operaciones se sincronicen lo más pronto posible sin importar el escenario.

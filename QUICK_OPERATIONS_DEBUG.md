# 🔧 Debug: Entrada y Salida Rápida No Funcionan

## 📋 Problema Reportado

Los atajos de **"Entrada rápida"** y **"Salida rápida"** no están funcionando:
- ❌ **Ctrl + E** (Entrada rápida) no hace nada
- ❌ **Ctrl + S** (Salida rápida) no hace nada
- ❌ **F1** (Entrada) no funciona
- ❌ **F2** (Salida) no funciona

## 🔍 Qué Deberían Hacer

### **Entrada Rápida (Ctrl + E o F1):**
1. **Abrir modal** de registro de entrada de vehículo
2. **Mostrar formulario** con campos:
   - Placa del vehículo
   - Tipo de vehículo (Auto/Moto/Bicicleta/Camión)
   - Espacio de parqueo (auto-asignado o manual)
3. **Auto-focus** en el campo de placa
4. **Permitir registro rápido** sin salir del panel principal

### **Salida Rápida (Ctrl + S o F2):**
1. **Abrir modal** de registro de salida de vehículo
2. **Mostrar formulario** con campos:
   - Placa del vehículo (con búsqueda automática)
   - Información del vehículo encontrado
   - Cálculo automático del costo
   - Método de pago
3. **Auto-focus** en el campo de placa
4. **Búsqueda con debounce** mientras se escribe
5. **Permitir salida rápida** con confirmación

## 🔍 Análisis del Código

### **Flujo de Funcionamiento:**
```
AdminParkingDashboard.tsx
├── useParkingOperationShortcuts() ← Configura atajos
├── window.quickOperations ← Objeto global para comunicación
└── QuickVehicleOperations ← Componente que maneja modales
    ├── setActiveOperation('entry') ← Abre modal entrada
    ├── setActiveOperation('exit') ← Abre modal salida
    └── VehicleEntryCard/VehicleExitCard ← Formularios
```

### **Condiciones para Renderizado:**
```typescript
// QuickVehicleOperations solo se renderiza si:
{!isListView && currentParking && (
  <QuickVehicleOperations selectedParkingLot={currentParking} />
)}

// Donde:
const isListView = !parkingId; // Si no hay ID en URL
const currentParking = parkingLots?.find(lot => lot.id === parkingId);
```

## 🐛 Posibles Causas del Problema

### **1. Componente No Se Renderiza:**
- ❓ `isListView = true` (no hay parkingId en URL)
- ❓ `currentParking = null` (no se encuentra el parqueadero)
- ❓ Condición de renderizado no se cumple

### **2. window.quickOperations No Se Crea:**
- ❓ `useEffect` en `QuickVehicleOperations` no se ejecuta
- ❓ Objeto `operations` no se asigna correctamente
- ❓ Timing issue entre creación y uso

### **3. Atajos de Teclado No Se Registran:**
- ❓ `useParkingOperationShortcuts` no se ejecuta
- ❓ Event listeners no se agregan
- ❓ Conflicto con otros atajos del navegador

## 🔧 Debug Agregado

### **Logs en AdminParkingDashboard:**
```typescript
// Al activar entrada rápida
console.log('🔍 Entrada rápida activada - window.quickOperations:', window.quickOperations);

// Al activar salida rápida
console.log('🔍 Salida rápida activada - window.quickOperations:', window.quickOperations);

// Al renderizar QuickVehicleOperations
console.log('🔍 Renderizando QuickVehicleOperations con:', { isListView, currentParking });
```

### **Logs Existentes en QuickVehicleOperations:**
```typescript
// Debug de props y estado
console.log('🔍 QuickVehicleOperations - selectedParkingLot:', selectedParkingLot);
console.log('🔍 QuickVehicleOperations - activeOperation:', activeOperation);
```

## 🧪 Pasos para Debuggear

### **1. Verificar Renderizado:**
1. Ir a `/parking/{id}` (Panel de Control específico)
2. Abrir **DevTools → Console**
3. Buscar log: `🔍 Renderizando QuickVehicleOperations`
4. ✅ Si aparece → Componente se renderiza
5. ❌ Si no aparece → Problema en condiciones

### **2. Verificar window.quickOperations:**
1. En la consola, escribir: `window.quickOperations`
2. ✅ Si retorna objeto → Está creado correctamente
3. ❌ Si retorna `undefined` → No se está creando

### **3. Probar Atajos:**
1. Presionar **Ctrl + E** (Entrada rápida)
2. Presionar **Ctrl + S** (Salida rápida)
3. Presionar **F1** (Entrada)
4. Presionar **F2** (Salida)
5. Verificar logs en consola

### **4. Probar Botones Manuales:**
1. Hacer clic en botón **"Entrada"** (esquina inferior derecha)
2. Hacer clic en botón **"Salida"** (esquina inferior derecha)
3. ✅ Si funcionan → Problema solo en atajos
4. ❌ Si no funcionan → Problema en lógica general

## 🎯 Soluciones Esperadas

### **Si window.quickOperations es undefined:**
- Verificar que `QuickVehicleOperations` se renderiza
- Revisar `useEffect` que asigna el objeto
- Verificar timing de creación vs uso

### **Si atajos no se registran:**
- Verificar que `useParkingOperationShortcuts` se ejecuta
- Revisar event listeners en `useKeyboardShortcuts`
- Verificar que no hay conflictos con navegador

### **Si modales no se abren:**
- Verificar `setActiveOperation` en callbacks
- Revisar estado `activeOperation` en componente
- Verificar renderizado condicional de modales

## 📊 Estado Actual

- ✅ **Código implementado** - Lógica parece correcta
- ❓ **Debug agregado** - Logs para identificar problema
- ⏳ **Esperando pruebas** - Necesita verificación en navegador
- 🎯 **Objetivo** - Atajos funcionando correctamente

Una vez identificada la causa raíz con los logs, se puede implementar la solución específica.

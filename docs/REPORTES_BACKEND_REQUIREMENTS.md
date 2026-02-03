# 📊 Requisitos de Backend para Módulo de Reportes

## Resumen
Este documento detalla los endpoints y funcionalidades del backend necesarias para soportar el módulo de **Reportes Básicos** implementado en el frontend.

---

## ✅ Endpoints Existentes (Ya Funcionan)

### 1. **GET /admin/parking-lots/{parking_lot_id}/vehicles/history**
**Estado:** ✅ Implementado y funcionando

**Descripción:** Obtiene el historial de transacciones de un parqueadero con filtros.

**Query Parameters:**
- `date_from` (string, opcional): Fecha/hora de inicio en formato ISO 8601 (ej: `2024-01-15T00:00:00`)
- `date_to` (string, opcional): Fecha/hora de fin en formato ISO 8601 (ej: `2024-01-15T23:59:59`)
- `plate` (string, opcional): Filtrar por placa específica
- `status` (string, opcional): Filtrar por estado (`active` | `completed`)
- `limit` (number, opcional): Número máximo de resultados
- `offset` (number, opcional): Offset para paginación

**Response:**
```json
{
  "data": [
    {
      "transaction_id": 123,
      "plate": "ABC123",
      "vehicle_type": "car",
      "spot_number": "A1",
      "entry_time": "2024-01-15T08:30:00Z",
      "exit_time": "2024-01-15T12:45:00Z",
      "duration_minutes": 255,
      "payment_amount": 15000,
      "payment_method": "cash",
      "total_cost": 15000,
      "status": "completed",
      "entry_admin": "Juan Pérez",
      "exit_admin": "María García"
    }
  ]
}
```

**Uso en Frontend:**
- El componente `Reports.tsx` usa este endpoint con filtros de fecha para obtener transacciones del día/mes/rango personalizado
- Calcula totales, promedios y desglose por método de pago en el frontend

---

## 🟡 Endpoints Recomendados (Optimización Futura)

### 2. **GET /admin/parking-lots/{parking_lot_id}/reports/summary**
**Estado:** 🟡 Recomendado (no crítico para MVP)

**Descripción:** Endpoint optimizado que retorna resumen agregado de transacciones para evitar procesar grandes volúmenes de datos en el frontend.

**Query Parameters:**
- `date_from` (string, requerido): Fecha de inicio
- `date_to` (string, requerido): Fecha de fin
- `group_by` (string, opcional): Agrupar por `day` | `week` | `month`

**Response Propuesto:**
```json
{
  "summary": {
    "total_transactions": 150,
    "total_revenue": 2250000,
    "average_ticket": 15000,
    "by_payment_method": {
      "cash": { "count": 80, "revenue": 1200000 },
      "card": { "count": 50, "revenue": 750000 },
      "digital": { "count": 20, "revenue": 300000 }
    },
    "by_vehicle_type": {
      "car": { "count": 100, "revenue": 1800000 },
      "motorcycle": { "count": 40, "revenue": 360000 },
      "bicycle": { "count": 8, "revenue": 72000 },
      "truck": { "count": 2, "revenue": 18000 }
    },
    "by_day": [
      {
        "date": "2024-01-15",
        "transactions": 50,
        "revenue": 750000
      }
    ]
  }
}
```

**Ventajas:**
- Reduce carga en el frontend
- Más rápido para rangos de fechas grandes
- Permite reportes históricos sin transferir miles de transacciones

---

## 📋 Validaciones Requeridas en Backend

### Transacciones Completadas
- ✅ **Validar que `status = 'completed'`** para incluir en reportes de ingresos
- ✅ **Validar que `exit_time` no sea null** para transacciones completadas
- ✅ **Validar que `payment_amount` y `total_cost` sean consistentes**

### Filtros de Fecha
- ✅ **Soportar formato ISO 8601** con timezone (ej: `2024-01-15T00:00:00-05:00`)
- ✅ **Validar que `date_from` <= `date_to`**
- ⚠️ **Limitar rango máximo** (ej: máximo 1 año) para evitar queries muy pesadas

---

## 🔧 Funcionalidades Actuales del Frontend

### Cálculos Implementados en Frontend
El componente `Reports.tsx` actualmente calcula:

1. **Totales:**
   - Total de transacciones completadas
   - Ingresos totales
   - Ticket promedio

2. **Desglose por Método de Pago:**
   - Efectivo (cash)
   - Tarjeta (card)
   - Digital (digital)
   - Porcentaje de cada método

3. **Desglose por Tipo de Vehículo:**
   - Carros, motos, bicicletas, camiones
   - Cantidad y revenue por tipo

4. **Exportación:**
   - CSV con todas las transacciones del período
   - Incluye: ID, placa, tipo, entrada, salida, duración, costo, método de pago, admins

### Tabs Disponibles
- **Cierre Diario:** Transacciones de un día específico
- **Reporte Mensual:** Transacciones de un mes completo
- **Rango Personalizado:** Transacciones entre dos fechas

---

## 🚀 Roadmap de Mejoras Backend

### Fase 1 (Actual - MVP)
- ✅ Endpoint de historial con filtros básicos
- ✅ Cálculos en frontend

### Fase 2 (Optimización)
- 🟡 Endpoint `/reports/summary` con agregaciones
- 🟡 Índices en base de datos para queries de reportes
- 🟡 Cache de reportes frecuentes (día actual, mes actual)

### Fase 3 (Avanzado)
- 🔵 Reportes programados (envío por email)
- 🔵 Exportación a PDF desde backend
- 🔵 Gráficas de tendencias (datos históricos)
- 🔵 Comparativas período vs período

---

## 📝 Notas de Implementación

### Consideraciones de Performance
- Para rangos de fechas grandes (>1 mes), considerar paginación o límite de resultados
- El frontend actualmente carga todas las transacciones del período en memoria
- Para parqueaderos con alto volumen (>1000 transacciones/día), se recomienda implementar endpoint de summary

### Timezone
- Todas las fechas deben manejarse en timezone de Colombia (`America/Bogota`)
- El frontend envía fechas en formato ISO 8601 con hora local
- Backend debe interpretar correctamente el timezone

### Seguridad
- ✅ Validar que el admin autenticado tenga permisos sobre el parking_lot_id
- ✅ Solo admins (global_admin, local_admin) pueden acceder a reportes
- ✅ Operadores NO tienen acceso a reportes financieros

---

## 🎯 Conclusión

**Para MVP:** El endpoint actual de historial es suficiente. El frontend maneja todos los cálculos.

**Para Producción:** Se recomienda implementar endpoint de summary para mejorar performance con grandes volúmenes de datos.

**Prioridad:** 🟢 Baja (funcionalidad completa con endpoints actuales)

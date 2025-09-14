# 🤖 Prompt para IA: Implementar Sistema de Horarios Avanzados - Backend ParkiU

## 📋 Contexto del Proyecto

Soy desarrollador de **ParkiU**, una plataforma de gestión de parqueaderos en Colombia. Necesito implementar un sistema de horarios avanzados en el backend que permita:

1. **Horarios uniformes** para todos los días
2. **Horarios diferentes** por día de la semana
3. **Días cerrados** (parqueadero no opera)
4. **Modo 24 horas** por día específico

## 🎯 Requerimientos Técnicos

### **Stack Actual:**
- **Backend**: Node.js + Express
- **Base de datos**: MySQL/PostgreSQL
- **Autenticación**: JWT tokens
- **Arquitectura**: REST API

### **Endpoints Existentes (que ya funcionan):**
```javascript
// ✅ YA IMPLEMENTADOS
GET /admin/parking-lots/{parking_lot_id}/schedule
PATCH /admin/parking-lots/{parking_lot_id}/schedule

// Estructura actual simple:
{
  "opening_time": "08:00",
  "closing_time": "20:00",
  "is_24h": false
}
```

## 🚀 Lo que Necesito Implementar

### **1. Estructura de Base de Datos Mejorada**

Necesito que modifiques/crees las tablas para soportar horarios por día:

```sql
-- Tabla principal de horarios (puede ser nueva o modificar existente)
CREATE TABLE parking_schedules (
    id VARCHAR(255) PRIMARY KEY,
    parking_lot_id VARCHAR(255) NOT NULL,

    -- Modo de operación
    schedule_type ENUM('uniform', 'weekly') DEFAULT 'uniform',

    -- Horarios uniformes (cuando schedule_type = 'uniform')
    uniform_opening_time TIME,
    uniform_closing_time TIME,
    uniform_is_24h BOOLEAN DEFAULT FALSE,

    -- Horarios por día (cuando schedule_type = 'weekly')
    monday_opening TIME,
    monday_closing TIME,
    monday_is_24h BOOLEAN DEFAULT FALSE,
    monday_is_closed BOOLEAN DEFAULT FALSE,

    tuesday_opening TIME,
    tuesday_closing TIME,
    tuesday_is_24h BOOLEAN DEFAULT FALSE,
    tuesday_is_closed BOOLEAN DEFAULT FALSE,

    wednesday_opening TIME,
    wednesday_closing TIME,
    wednesday_is_24h BOOLEAN DEFAULT FALSE,
    wednesday_is_closed BOOLEAN DEFAULT FALSE,

    thursday_opening TIME,
    thursday_closing TIME,
    thursday_is_24h BOOLEAN DEFAULT FALSE,
    thursday_is_closed BOOLEAN DEFAULT FALSE,

    friday_opening TIME,
    friday_closing TIME,
    friday_is_24h BOOLEAN DEFAULT FALSE,
    friday_is_closed BOOLEAN DEFAULT FALSE,

    saturday_opening TIME,
    saturday_closing TIME,
    saturday_is_24h BOOLEAN DEFAULT FALSE,
    saturday_is_closed BOOLEAN DEFAULT FALSE,

    sunday_opening TIME,
    sunday_closing TIME,
    sunday_is_24h BOOLEAN DEFAULT FALSE,
    sunday_is_closed BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE
);
```

### **2. Endpoints Mejorados**

#### **GET /admin/parking-lots/{parking_lot_id}/schedule**
Debe retornar tanto horarios uniformes como por día:

```javascript
// Respuesta para horarios uniformes
{
  "schedule_type": "uniform",
  "opening_time": "08:00",
  "closing_time": "20:00",
  "is_24h": false
}

// Respuesta para horarios por día
{
  "schedule_type": "weekly",
  "weekly_schedule": {
    "monday": { "opening_time": "08:00", "closing_time": "20:00", "is_24h": false, "is_closed": false },
    "tuesday": { "opening_time": "08:00", "closing_time": "20:00", "is_24h": false, "is_closed": false },
    "wednesday": { "opening_time": "08:00", "closing_time": "20:00", "is_24h": false, "is_closed": false },
    "thursday": { "opening_time": "08:00", "closing_time": "20:00", "is_24h": false, "is_closed": false },
    "friday": { "opening_time": "08:00", "closing_time": "20:00", "is_24h": false, "is_closed": false },
    "saturday": { "opening_time": "09:00", "closing_time": "18:00", "is_24h": false, "is_closed": false },
    "sunday": { "opening_time": "00:00", "closing_time": "00:00", "is_24h": false, "is_closed": true }
  }
}
```

#### **PATCH /admin/parking-lots/{parking_lot_id}/schedule**
Debe aceptar ambos formatos:

```javascript
// Formato 1: Horarios uniformes
{
  "schedule_type": "uniform",
  "opening_time": "08:00",
  "closing_time": "20:00",
  "is_24h": false
}

// Formato 2: Horarios por día
{
  "schedule_type": "weekly",
  "weekly_schedule": {
    "monday": { "opening_time": "08:00", "closing_time": "20:00", "is_24h": false, "is_closed": false },
    "tuesday": { "opening_time": "08:00", "closing_time": "20:00", "is_24h": false, "is_closed": false },
    // ... resto de días
  }
}
```

### **3. Lógica de Negocio Requerida**

#### **Validaciones:**
- Si `is_24h = true`, ignorar `opening_time` y `closing_time`
- Si `is_closed = true`, ignorar `opening_time`, `closing_time` e `is_24h`
- `opening_time` debe ser menor que `closing_time` (excepto si cruza medianoche)
- Formato de tiempo: "HH:MM" (24 horas)

#### **Compatibilidad hacia atrás:**
- Si recibo el formato antiguo (sin `schedule_type`), asumir `uniform`
- Mantener compatibilidad con frontend actual

#### **Defaults inteligentes:**
- Nuevos parqueaderos: horarios uniformes 8:00-20:00
- Domingo cerrado por defecto en modo weekly
- Sábados con horarios reducidos por defecto

### **4. Middleware y Validación**

```javascript
// Validación de entrada
const scheduleValidation = {
  schedule_type: ['uniform', 'weekly'],
  opening_time: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  closing_time: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  is_24h: 'boolean',
  is_closed: 'boolean'
};

// Middleware de autenticación
- JWT token válido
- Usuario debe ser admin del parking_lot_id
- Rate limiting: 10 requests/minute para updates
```

## 📝 Estructura de Archivos Sugerida

```
/controllers/admin/
  - scheduleController.js

/models/
  - ParkingSchedule.js

/validators/
  - scheduleValidator.js

/services/
  - scheduleService.js

/migrations/
  - 001_create_parking_schedules_table.js
  - 002_migrate_existing_schedules.js
```

## 🧪 Casos de Prueba Requeridos

### **Test Cases:**
1. **Crear horario uniforme** nuevo parqueadero
2. **Actualizar de uniforme a weekly** y viceversa
3. **Validar horarios inválidos** (apertura > cierre)
4. **Manejar días cerrados** correctamente
5. **Modo 24h** por día específico
6. **Compatibilidad** con formato anterior
7. **Permisos** - solo admin del parqueadero puede modificar

## 🎯 Criterios de Éxito

### **Funcional:**
- ✅ Frontend puede cambiar entre modos uniform/weekly
- ✅ Se guardan correctamente horarios por día
- ✅ Validaciones funcionan correctamente
- ✅ Compatibilidad hacia atrás mantenida

### **Técnico:**
- ✅ Código limpio y bien documentado
- ✅ Manejo de errores robusto
- ✅ Tests unitarios incluidos
- ✅ Migraciones de BD seguras

## 🚨 Consideraciones Importantes

### **Performance:**
- Usar índices en `parking_lot_id`
- Cachear horarios frecuentemente consultados

### **Seguridad:**
- Validar ownership del parqueadero
- Sanitizar inputs de tiempo
- Rate limiting en updates

### **Migración:**
- Script para migrar horarios existentes
- No romper funcionalidad actual durante deploy

## 📋 Entregables Esperados

1. **Migración de BD** con la nueva estructura
2. **Controladores** actualizados con nueva lógica
3. **Modelos** para manejar horarios complejos
4. **Validadores** para inputs de horarios
5. **Tests** unitarios y de integración
6. **Documentación** de los endpoints actualizados

## 🔧 Comando para Ejecutar

Por favor, genera el código completo para implementar esta funcionalidad, incluyendo:
- Migraciones de base de datos
- Controladores y rutas
- Modelos y servicios
- Validadores
- Tests básicos
- Documentación de API

**Importante:** Mantén compatibilidad con el sistema actual y asegúrate de que no se rompa nada existente.

---

**¿Necesitas alguna aclaración sobre la estructura actual del proyecto o algún detalle específico de implementación?**

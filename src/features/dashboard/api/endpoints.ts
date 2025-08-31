// ===================================
// ENDPOINTS REQUERIDOS PARA EL DASHBOARD
// ===================================

/**
 * Documentación completa de los endpoints que necesita el backend
 * para soportar el dashboard con estadísticas reales
 */

export const DASHBOARD_ENDPOINTS = {
  // ===================================
  // 1. ESTADÍSTICAS GENERALES DEL SISTEMA
  // ===================================
  SYSTEM_STATS: '/api/dashboard/stats',
  /**
   * GET /api/dashboard/stats?timeRange=today&timezone=America/Bogota
   *
   * Respuesta esperada:
   * {
   *   "totalParkings": 12,
   *   "activeParkings": 10,
   *   "totalSpaces": 450,
   *   "occupiedSpaces": 287,
   *   "todayRevenue": 2850000,
   *   "todayTransactions": 156,
   *   "activeUsers": 1247,
   *   "systemHealth": "good",
   *   "lastUpdated": "2024-01-15T10:30:00Z"
   * }
   *
   * Lógica del backend:
   * - Contar parqueaderos totales y activos
   * - Sumar espacios de todos los parqueaderos
   * - Calcular ocupación actual
   * - Sumar ingresos del día actual
   * - Contar transacciones del día
   * - Contar usuarios activos (últimos 30 días)
   * - Evaluar salud del sistema basado en sensores, errores, etc.
   */

  // ===================================
  // 2. VISTA GENERAL DE PARQUEADEROS
  // ===================================
  PARKING_OVERVIEW: '/api/dashboard/parkings',
  /**
   * GET /api/dashboard/parkings?page=1&limit=10&status=active&sortBy=occupancy&sortOrder=desc
   *
   * Respuesta esperada:
   * {
   *   "parkings": [
   *     {
   *       "id": "parking_123",
   *       "name": "Centro Comercial Plaza",
   *       "location": "Zona Rosa",
   *       "address": "Calle 123 #45-67",
   *       "totalSpaces": 120,
   *       "occupiedSpaces": 95,
   *       "availableSpaces": 25,
   *       "todayRevenue": 850000,
   *       "todayTransactions": 45,
   *       "status": "active",
   *       "occupancyRate": 79.17,
   *       "lastActivity": "2024-01-15T10:25:00Z"
   *     }
   *   ],
   *   "totalCount": 12,
   *   "page": 1,
   *   "limit": 10
   * }
   *
   * Lógica del backend:
   * - Obtener lista de parqueaderos con paginación
   * - Para cada parqueadero calcular ocupación actual
   * - Calcular ingresos del día
   * - Contar transacciones del día
   * - Determinar última actividad
   * - Aplicar filtros y ordenamiento
   */

  // ===================================
  // 3. ACTIVIDAD RECIENTE DEL SISTEMA
  // ===================================
  RECENT_ACTIVITY: '/api/dashboard/activity',
  /**
   * GET /api/dashboard/activity?limit=20&types=parking_created,system_alert&since=2024-01-15T00:00:00Z
   *
   * Respuesta esperada:
   * {
   *   "activities": [
   *     {
   *       "id": "activity_456",
   *       "type": "parking_created",
   *       "title": "Nuevo parqueadero creado",
   *       "description": "Centro Comercial Norte ha sido agregado al sistema",
   *       "timestamp": "2024-01-15T09:45:00Z",
   *       "status": "success",
   *       "metadata": {
   *         "parkingId": "parking_789",
   *         "parkingName": "Centro Comercial Norte"
   *       }
   *     },
   *     {
   *       "id": "activity_457",
   *       "type": "system_alert",
   *       "title": "Sensor desconectado",
   *       "description": "Sensor A15 en Parqueadero Central no responde",
   *       "timestamp": "2024-01-15T09:30:00Z",
   *       "status": "warning",
   *       "metadata": {
   *         "parkingId": "parking_123",
   *         "parkingName": "Parqueadero Central",
   *         "sensorId": "sensor_A15"
   *       }
   *     }
   *   ],
   *   "totalCount": 156,
   *   "hasMore": true
   * }
   *
   * Lógica del backend:
   * - Mantener log de actividades del sistema
   * - Filtrar por tipos de actividad
   * - Ordenar por timestamp descendente
   * - Incluir metadata relevante para cada tipo
   * - Implementar paginación
   */

  // ===================================
  // 4. ESTADÍSTICAS DE OCUPACIÓN
  // ===================================
  OCCUPANCY_STATS: '/api/dashboard/occupancy',
  /**
   * GET /api/dashboard/occupancy?timeRange=today&timezone=America/Bogota&parkingId=parking_123
   *
   * Respuesta esperada:
   * {
   *   "current": {
   *     "occupied": 287,
   *     "available": 163,
   *     "total": 450,
   *     "rate": 63.78
   *   },
   *   "hourly": [
   *     { "hour": 8, "occupancyRate": 45.2, "transactions": 23 },
   *     { "hour": 9, "occupancyRate": 67.8, "transactions": 34 },
   *     { "hour": 10, "occupancyRate": 78.9, "transactions": 28 }
   *   ],
   *   "daily": [
   *     { "date": "2024-01-14", "averageOccupancy": 65.4, "peakOccupancy": 89.2, "transactions": 145 },
   *     { "date": "2024-01-15", "averageOccupancy": 63.8, "peakOccupancy": 78.9, "transactions": 156 }
   *   ]
   * }
   *
   * Lógica del backend:
   * - Calcular ocupación actual en tiempo real
   * - Generar estadísticas por hora del día actual
   * - Calcular promedios y picos por día
   * - Contar transacciones por período
   * - Si parkingId no se especifica, agregar todos los parqueaderos
   */

  // ===================================
  // 5. ESTADÍSTICAS DE INGRESOS
  // ===================================
  REVENUE_STATS: '/api/dashboard/revenue',
  /**
   * GET /api/dashboard/revenue?timeRange=month&timezone=America/Bogota
   *
   * Respuesta esperada:
   * {
   *   "today": 2850000,
   *   "yesterday": 2650000,
   *   "thisWeek": 18500000,
   *   "lastWeek": 17200000,
   *   "thisMonth": 75600000,
   *   "lastMonth": 68900000,
   *   "growth": {
   *     "daily": 7.55,
   *     "weekly": 7.56,
   *     "monthly": 9.72
   *   }
   * }
   *
   * Lógica del backend:
   * - Sumar ingresos por períodos específicos
   * - Calcular porcentajes de crecimiento
   * - Manejar zonas horarias correctamente
   * - Considerar solo transacciones completadas
   */

  // ===================================
  // 6. SALUD DEL SISTEMA
  // ===================================
  SYSTEM_HEALTH: '/api/dashboard/health',
  /**
   * GET /api/dashboard/health
   *
   * Respuesta esperada:
   * {
   *   "overall": "good",
   *   "components": {
   *     "database": "healthy",
   *     "sensors": {
   *       "total": 450,
   *       "online": 445,
   *       "offline": 5,
   *       "status": "good"
   *     },
   *     "payments": "healthy",
   *     "notifications": "healthy"
   *   },
   *   "alerts": [
   *     {
   *       "id": "alert_123",
   *       "type": "sensor_offline",
   *       "message": "5 sensores desconectados en diferentes parqueaderos",
   *       "severity": "medium",
   *       "timestamp": "2024-01-15T09:30:00Z",
   *       "resolved": false
   *     }
   *   ]
   * }
   *
   * Lógica del backend:
   * - Verificar estado de componentes críticos
   * - Contar sensores online/offline
   * - Verificar conectividad de servicios externos
   * - Mantener registro de alertas activas
   * - Calcular salud general basada en componentes
   */

  // ===================================
  // 7. ESTADÍSTICAS DE USUARIOS
  // ===================================
  USER_STATS: '/api/dashboard/users',
  /**
   * GET /api/dashboard/users?timeRange=month
   *
   * Respuesta esperada:
   * {
   *   "total": 12470,
   *   "active": 8945,
   *   "new": 23,
   *   "growth": {
   *     "daily": 2.1,
   *     "weekly": 5.8,
   *     "monthly": 12.4
   *   }
   * }
   *
   * Lógica del backend:
   * - Contar usuarios totales registrados
   * - Definir "activo" como login en últimos 30 días
   * - Contar registros del día actual
   * - Calcular tasas de crecimiento
   */

} as const;

// ===================================
// CONSIDERACIONES TÉCNICAS IMPORTANTES
// ===================================

/**
 * 1. AUTENTICACIÓN Y AUTORIZACIÓN
 * - Todos los endpoints requieren autenticación JWT
 * - Solo usuarios con rol 'admin' o 'super_admin' pueden acceder
 * - Implementar rate limiting para prevenir abuso
 *
 * 2. CACHÉ Y PERFORMANCE
 * - Cachear estadísticas por 5-15 minutos según criticidad
 * - Usar Redis para caché distribuido
 * - Implementar agregaciones pre-calculadas para datos históricos
 *
 * 3. TIEMPO REAL
 * - Considerar WebSockets para actualizaciones en tiempo real
 * - Implementar Server-Sent Events para notificaciones
 *
 * 4. MANEJO DE ERRORES
 * - Retornar códigos HTTP apropiados
 * - Incluir mensajes de error descriptivos
 * - Implementar fallbacks para datos críticos
 *
 * 5. PAGINACIÓN Y FILTROS
 * - Implementar paginación consistente
 * - Soportar múltiples criterios de filtrado
 * - Validar parámetros de entrada
 *
 * 6. ZONAS HORARIAS
 * - Manejar correctamente zonas horarias
 * - Permitir configuración por usuario/organización
 * - Usar UTC internamente, convertir en presentación
 *
 * 7. ESCALABILIDAD
 * - Diseñar para múltiples organizaciones/tenants
 * - Implementar índices de base de datos apropiados
 * - Considerar particionamiento de datos históricos
 */

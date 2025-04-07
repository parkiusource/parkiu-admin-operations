# ParkiU Admin

Sistema de gestión de parqueaderos con soporte offline y sincronización en tiempo real.

## Características

- 🚗 Gestión de entrada/salida de vehículos
- 📊 Visualización y gestión de espacios de parqueo
- 🔄 Trabajo offline con sincronización online
- 📈 Estadísticas en tiempo real
- 📱 Interfaz responsive y moderna
- ⚡ Rendimiento optimizado para punto de venta

## Requisitos Técnicos

- Node.js >= 18
- npm >= 9

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/parkiu-admin.git
cd parkiu-admin
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

4. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

## Estructura del Proyecto

```
src/
├── components/     # Componentes reutilizables
├── features/       # Características principales
│   ├── dashboard/  # Dashboard y estadísticas
│   ├── parking/    # Gestión de espacios
│   └── vehicles/   # Gestión de vehículos
├── hooks/          # Custom hooks
├── services/       # Servicios y API
├── store/          # Estado global
├── utils/          # Utilidades
└── db/            # Base de datos local
```

## Tecnologías Utilizadas

- React + TypeScript
- Vite
- TailwindCSS
- Dexie.js (IndexedDB)
- React Query
- Zustand
- Socket.io

## Desarrollo

### Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo
- `npm run build`: Construye la aplicación para producción
- `npm run preview`: Vista previa de la build
- `npm run lint`: Ejecuta el linter
- `npm run test`: Ejecuta los tests

### Convenciones de Código

- Usar TypeScript para todo el código
- Seguir las convenciones de ESLint
- Usar componentes funcionales con hooks
- Implementar manejo de errores apropiado
- Documentar componentes y funciones importantes

## Despliegue

1. Construir la aplicación:
```bash
npm run build
```

2. Los archivos generados estarán en el directorio `dist/`

## Contribución

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

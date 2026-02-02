import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { assertValidEnvironment } from './config/validateEnv'

// ====================================
// VALIDACIÓN DE VARIABLES DE ENTORNO
// ====================================
try {
  assertValidEnvironment();
} catch (error) {
  // Mostrar error en la UI si faltan variables
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #FEF2F2; color: #991B1B; font-family: system-ui, sans-serif; padding: 20px; text-align: center;">
        <div style="max-width: 500px;">
          <h1 style="font-size: 24px; margin-bottom: 16px;">❌ Error de Configuración</h1>
          <p style="margin-bottom: 16px;">${(error as Error).message}</p>
          <p style="font-size: 14px; color: #6B7280;">Contacta al administrador del sistema</p>
        </div>
      </div>
    `;
  }
  throw error;
}

// ====================================
// SERVICE WORKER - Solo desarrollo
// ====================================
// Deshabilitar SW en desarrollo para evitar caché de módulos y React duplicado
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) {
      reg.unregister();
    }
  });
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

// ====================================
// RENDER APP
// ====================================
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

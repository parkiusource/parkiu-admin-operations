/**
 * Validación de Variables de Entorno
 *
 * Se ejecuta al inicio de la aplicación para garantizar
 * que todas las variables requeridas están presentes.
 */

const REQUIRED_ENV_VARS = [
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID',
  'VITE_AUTH0_AUDIENCE',
  'VITE_API_BACKEND_URL',
] as const;

type RequiredEnvVar = typeof REQUIRED_ENV_VARS[number];

interface ValidationResult {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
}

/**
 * Valida que todas las variables de entorno requeridas estén presentes
 */
export function validateEnvironmentVariables(): ValidationResult {
  const missingVars: string[] = [];
  const warnings: string[] = [];

  REQUIRED_ENV_VARS.forEach((envVar: RequiredEnvVar) => {
    const value = import.meta.env[envVar];
    if (!value || value.trim() === '') {
      missingVars.push(envVar);
    }
  });

  // Validaciones adicionales
  const backendUrl = import.meta.env.VITE_API_BACKEND_URL;
  if (backendUrl) {
    try {
      new URL(backendUrl);
    } catch {
      warnings.push(`VITE_API_BACKEND_URL no es una URL válida: ${backendUrl}`);
    }
  }

  const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
  if (auth0Domain && !auth0Domain.includes('.')) {
    warnings.push(`VITE_AUTH0_DOMAIN parece inválido: ${auth0Domain}`);
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
    warnings,
  };
}

/**
 * Ejecuta validación y lanza error si falla
 * Usar en main.tsx antes de renderizar la app
 */
export function assertValidEnvironment(): void {
  const result = validateEnvironmentVariables();

  // Mostrar warnings en desarrollo
  if (import.meta.env.DEV && result.warnings.length > 0) {
    result.warnings.forEach((warning) => {
      console.warn(`⚠️ ENV Warning: ${warning}`);
    });
  }

  if (!result.isValid) {
    const errorMessage = `
❌ ERROR: Variables de entorno faltantes

Las siguientes variables son requeridas pero no están definidas:
${result.missingVars.map((v) => `  - ${v}`).join('\n')}

Para configurar:
  • Local: Crear archivo .env.local con las variables
  • Netlify: Site Settings > Environment Variables
    `;

    console.error(errorMessage);
    throw new Error(`Missing environment variables: ${result.missingVars.join(', ')}`);
  }

  if (import.meta.env.DEV) {
    console.log('✅ Environment variables validated');
  }
}

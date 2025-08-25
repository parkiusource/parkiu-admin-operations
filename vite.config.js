/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        strictPort: false, // Si 5173 está ocupado, usar el siguiente disponible
        open: false, // No abrir browser automáticamente
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    },
    build: {
        target: 'esnext',
        minify: 'terser',
        cssMinify: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'ui-vendor': ['@mui/material', '@emotion/react', '@emotion/styled'],
                    'query-vendor': ['@tanstack/react-query'],
                    'utils-vendor': ['date-fns', 'axios']
                }
            },
            // ✅ Suprimir warning de eval en lottie-web (dependencia de lottie-react)
            onwarn: function (warning, warn) {
                var _a;
                // Ignorar warnings de eval en lottie-web
                if (warning.code === 'EVAL' && ((_a = warning.id) === null || _a === void 0 ? void 0 : _a.includes('lottie'))) {
                    return;
                }
                warn(warning);
            }
        },
        chunkSizeWarningLimit: 1000,
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        }
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom']
    }
});

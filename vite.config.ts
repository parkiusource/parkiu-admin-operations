/// <reference types="node" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    open: false, // No abrir browser automáticamente
    // Performance optimizations for development
    hmr: {
      overlay: false // Disable error overlay for better performance
    },
    fs: {
      strict: false // Allow serving files from outside root
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    },
    // Deduplicate React to avoid multiple copies causing "Invalid hook call"
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime']
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
          'utils-vendor': ['date-fns', 'axios'],
          // ✅ OPTIMIZACIÓN: Separar dependencias pesadas
          'auth-vendor': ['@auth0/auth0-react'],
          'animation-vendor': ['framer-motion', 'lottie-react'],
          'icons-vendor': ['lucide-react', 'react-icons', '@heroicons/react'],
          'forms-vendor': ['react-hook-form'],
          'db-vendor': ['dexie']
        }
      },
      // ✅ Suprimir warning de eval en lottie-web (dependencia de lottie-react)
      onwarn(warning, warn) {
        // Ignorar warnings de eval en lottie-web
        if (warning.code === 'EVAL' && warning.id?.includes('lottie')) {
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
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime'
    ],
    // Force pre-bundling of React to ensure single instance
    force: true
  }
})

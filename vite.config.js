import { defineConfig } from 'vite'
import { env } from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react';
          if (id.includes('node_modules/recharts')) return 'charts';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/xlsx')) return 'xlsx';
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) return 'pdf';
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) return 'maps';
          if (id.includes('node_modules/@tanstack')) return 'tanstack';
        },
      },
    },
  },
  server: {
    host: true,
    port: Number(env.VITE_PORT || 6677),
    cors: true,
    watch: {
      ignored: ['**/data/**']
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4174',
        changeOrigin: true,
        ws: false,
      },
    },
  },
})

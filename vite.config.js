import { defineConfig } from 'vite'
import { env } from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt', 'icon-192x192.png', 'icon-512x512.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'KG2School',
        short_name: 'KG2School',
        description: 'KG2School — Sistem Informasi Akademik dan Monitoring Kehadiran Sekolah',
        theme_color: '#84cc16',
        background_color: '#052e16',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'id',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime — most cached chunk
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react';
          // React Router
          if (id.includes('node_modules/react-router')) return 'router';
          // Zustand state management
          if (id.includes('node_modules/zustand')) return 'zustand';
          // Chart library
          if (id.includes('node_modules/recharts')) return 'charts';
          // Icon library
          if (id.includes('node_modules/lucide-react')) return 'icons';
          // Heavy Excel/file libs — split into 2 to reduce individual chunk size
          if (id.includes('node_modules/exceljs') || id.includes('node_modules/file-saver')) return 'fileHelper-excel';
          if (id.includes('node_modules/xlsx')) return 'fileHelper-xlsx';
          // PDF generation
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) return 'pdf';
          // Map libraries
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) return 'maps';
          // TanStack virtual list
          if (id.includes('node_modules/@tanstack')) return 'tanstack';
          // DOMPurify for sanitization
          if (id.includes('node_modules/dompurify') || id.includes('node_modules/purify')) return 'dompurify';
          // QR code
          if (id.includes('node_modules/qrcode')) return 'qrcode';
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


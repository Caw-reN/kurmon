import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Register Service Worker for PWA with auto-update
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Versi baru tersedia, memperbarui cache...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[PWA] Aplikasi siap offline');
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Cek update berkala setiap 15 menit
      setInterval(() => {
        registration.update().catch(() => {});
      }, 15 * 60 * 1000);

      // Cek update otomatis saat tab aktif kembali
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });
      window.addEventListener('focus', () => {
        registration.update().catch(() => {});
      });
    }
  }
});

// Otomatis refresh browser saat ada pembaruan versi (chunk hash lama sudah berganti)
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event?.reason?.message || '');
  console.error("Unhandled Rejection:", msg, event.reason);
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Importing a module script failed')) {
    event.preventDefault();
    const lastReload = sessionStorage.getItem('chunk_unhandled_reload');
    if (!lastReload || Date.now() - parseInt(lastReload) > 5000) {
      sessionStorage.setItem('chunk_unhandled_reload', Date.now().toString());
      console.error("RELOADING DUE TO CHUNK ERROR");
      window.location.reload();
    } else {
      console.error("PREVENTED INFINITE RELOAD LOOP FROM UNHANDLED REJECTION");
    }
  }
});


createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>,
);

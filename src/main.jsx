import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA
registerSW({ immediate: true });

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

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { 
    console.error('EB Caught:', error, errorInfo);
    
    // Auto-recover from React DOM corruption (e.g. removeChild errors from Google Translate)
    const errorMsg = String(error?.message || '');
    if (errorMsg.includes('removeChild') || errorMsg.includes('Node')) {
      const lastCrash = sessionStorage.getItem('dom_crash_recovery');
      if (!lastCrash || (Date.now() - parseInt(lastCrash)) > 5000) {
        sessionStorage.setItem('dom_crash_recovery', Date.now().toString());
        // Since they were trying to navigate when this unmount error happened,
        // we can just reload the page to clear the corrupted DOM and complete the navigation.
        console.warn("DOM corruption detected, recovering via reload...");
        window.location.reload();
      }
    }
  }
  render() {
    if (this.state.hasError) {
      // If we are recovering from a DOM crash, just show nothing momentarily
      const isRecovering = sessionStorage.getItem('dom_crash_recovery') && (Date.now() - parseInt(sessionStorage.getItem('dom_crash_recovery'))) < 5000;
      if (isRecovering) return null;

      return (
        <div style={{ padding: 40, background: '#fee2e2', color: '#991b1b', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontWeight: 'bold', fontSize: 24, marginBottom: 10 }}>Aplikasi Mengalami Crash</h2>
          <pre style={{ background: '#f87171', padding: 15, color: 'white', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>,
);

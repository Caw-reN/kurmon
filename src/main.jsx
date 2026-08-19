import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { StrictMode } from 'react';
import App from './App.jsx';

// Otomatis refresh browser saat ada pembaruan versi (chunk hash lama sudah berganti)
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event?.reason?.message || '');
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Importing a module script failed')) {
    event.preventDefault();
    window.location.reload();
  }
});

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { 
    console.error('EB Caught:', error, errorInfo);
    if (String(error?.message || '').includes('Failed to fetch dynamically imported module')) {
      window.location.reload();
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 24, fontFamily: 'sans-serif' }}>
          <div style={{ maxWidth: 440, width: '100%', background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Pembaruan Aplikasi Tersedia</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Sistem telah diperbarui ke versi terbaru. Silakan muat ulang halaman.</p>
            <button onClick={() => window.location.reload()} style={{ width: '100%', padding: '10px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              Muat Ulang Sekarang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
);

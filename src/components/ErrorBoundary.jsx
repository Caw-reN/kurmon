import React from"react";
import { getDatabaseSnapshot } from"../utils/dataSource.js";
import { AlertTriangle, Rocket } from "lucide-react";

/**
 * ErrorBoundary - Mencegah seluruh app blank saat komponen crash.
 * Wrap komponen/halaman yang berpotensi error untuk tampilkan UI recovery.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidMount() {
    // Hapus flag penanda hanya jika aplikasi berhasil berjalan dengan normal selama beberapa detik,
    // untuk mencegah infinite loop jika error terjadi segera setelah reload.
    this.reloadTimeout = setTimeout(() => {
      sessionStorage.removeItem('chunk_failed_reload');
    }, 5000);
  }

  componentWillUnmount() {
    if (this.reloadTimeout) clearTimeout(this.reloadTimeout);
  }

  componentDidCatch(error, errorInfo) {
    const errorMsg = String(error?.message || '');
    const isChunkError = 
      errorMsg.includes('Failed to fetch dynamically imported module') || 
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('error loading dynamically imported module') ||
      error?.name === 'ChunkLoadError';

    if (isChunkError) {
      const hasReloaded = sessionStorage.getItem('chunk_failed_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_failed_reload', 'true');
        window.location.reload();
        return;
      }
    }

    this.setState({ errorInfo });
    console.error("[ErrorBoundary] Komponen mengalami crash:", error, errorInfo);
  }

  handleReload = () => {
    const errorMsg = String(this.state.error?.message || '');
    if (
      errorMsg.includes('Failed to fetch dynamically imported module') || 
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('error loading dynamically imported module')
    ) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleHardReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const snapshot = getDatabaseSnapshot();
    const primaryColor = snapshot?.appSettings?.primaryColor || "#064e3b";
    const appName = snapshot?.appSettings?.appName || "KG2 School";
    const isDev = import.meta.env?.DEV;

    const errorMsg = String(this.state.error?.message || '');
    const isChunkError = 
      errorMsg.includes('Failed to fetch dynamically imported module') || 
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('error loading dynamically imported module');

    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)", fontFamily: '"Plus Jakarta Sans",sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 480, width: "100%", background: "#fff", borderRadius: 24, padding: "40px 32px", boxShadow: "0 20px 60px -10px rgba(0,0,0,.10)", border: "1px solid #f1f5f9", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: isChunkError ? "#ecfdf5" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>
            {isChunkError ? <Rocket size={28} color="#10b981" /> : <AlertTriangle size={28} color="#f43f5e" />}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#1e293b", marginBottom: 8, letterSpacing: "-0.5px" }}>
            {isChunkError ? "Pembaruan Aplikasi Tersedia" : "Halaman Mengalami Kesalahan"}
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", fontWeight: 500, lineHeight: 1.6, marginBottom: 24 }}>
            {isChunkError 
              ? `Versi baru dari ${appName} telah terpasang di server. Silakan muat ulang halaman untuk memuat fitur terbaru.`
              : `Terjadi error tak terduga pada halaman ${appName}. Anda dapat mencoba muat ulang atau kembali ke halaman utama.`
            }
          </p>
          <div style={{ background: isChunkError ? "#f8fafc" : "#fef2f2", border: `1px solid ${isChunkError ? '#e2e8f0' : '#fecaca'}`, borderRadius: 12, padding: "12px 16px", marginBottom: 24, textAlign: "left" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: isChunkError ? "#475569" : "#dc2626", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              {isChunkError ? "Info Sistem" : "Detail Error"}
            </p>
            <p style={{ fontSize: 12, color: isChunkError ? "#334155" : "#b91c1c", fontWeight: 600, wordBreak: "break-word", margin: 0 }}>
              {isChunkError ? "Modul versi terbaru siap dimuat ke browser." : (this.state.error?.message || "Unknown error")}
            </p>
          </div>
          {isDev && this.state.errorInfo && (
            <details style={{ marginBottom: 24, textAlign: "left" }}>
              <summary style={{ fontSize: 11, color: "#94a3b8", cursor: "pointer", fontWeight: 700 }}>Stack Trace (dev only)</summary>
              <pre style={{ fontSize: 10, color: "#64748b", background: "#f8fafc", borderRadius: 8, padding: "8px 12px", overflow: "auto", maxHeight: 160, marginTop: 8, lineHeight: 1.5 }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
            <button onClick={this.handleHardReload} style={{ padding: "12px 24px", background: primaryColor, color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
              Muat Ulang Halaman
            </button>
            {!isChunkError && (
              <button onClick={this.handleReload} style={{ padding: "12px 24px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
                Coba Lagi
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

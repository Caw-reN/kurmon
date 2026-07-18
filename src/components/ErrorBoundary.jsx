import React from"react";
import { getDatabaseSnapshot } from"../utils/dataSource.js";

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

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary] Komponen mengalami crash:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleHardReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const snapshot = getDatabaseSnapshot();
    const primaryColor = snapshot?.appSettings?.primaryColor ||"#064e3b";
    const appName = snapshot?.appSettings?.appName ||"KG2 School";
    const isDev = import.meta.env?.DEV;

    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)", fontFamily:"\"Plus Jakarta Sans\",sans-serif", padding:24 }}>
        <div style={{ maxWidth:480, width:"100%", background:"#fff", borderRadius:24, padding:"40px 32px", boxShadow:"0 20px 60px -10px rgba(0,0,0,.10)", border:"1px solid #f1f5f9", textAlign:"center" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:"#fef2f2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:28 }}>⚠️</div>
          <h1 style={{ fontSize:20, fontWeight:900, color:"#1e293b", marginBottom:8, letterSpacing:"-0.5px" }}>Halaman Mengalami Kesalahan</h1>
          <p style={{ fontSize:13, color:"#64748b", fontWeight:500, lineHeight:1.6, marginBottom:24 }}>
            Terjadi error tak terduga pada halaman {appName}. Anda dapat mencoba muat ulang atau kembali ke halaman utama.
          </p>
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:12, padding:"12px 16px", marginBottom:24, textAlign:"left" }}>
            <p style={{ fontSize:11, fontWeight:800, color:"#dc2626", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>Detail Error</p>
            <p style={{ fontSize:12, color:"#b91c1c", fontWeight:600, wordBreak:"break-word", margin:0 }}>{this.state.error?.message ||"Unknown error"}</p>
          </div>
          {isDev && this.state.errorInfo && (
            <details style={{ marginBottom:24, textAlign:"left" }}>
              <summary style={{ fontSize:11, color:"#94a3b8", cursor:"pointer", fontWeight:700 }}>Stack Trace (dev only)</summary>
              <pre style={{ fontSize:10, color:"#64748b", background:"#f8fafc", borderRadius:8, padding:"8px 12px", overflow:"auto", maxHeight:160, marginTop:8, lineHeight:1.5 }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <div style={{ display:"flex", gap:12, flexDirection:"column" }}>
            <button onClick={this.handleReload} style={{ padding:"12px 24px", background:primaryColor, color:"#fff", border:"none", borderRadius:12, fontWeight:800, fontSize:13, cursor:"pointer", width:"100%", fontFamily:"inherit" }}>
              Coba Lagi
            </button>
            <button onClick={this.handleHardReload} style={{ padding:"12px 24px", background:"#f1f5f9", color:"#475569", border:"none", borderRadius:12, fontWeight:700, fontSize:13, cursor:"pointer", width:"100%", fontFamily:"inherit" }}>
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      </div>
    );
  }
}

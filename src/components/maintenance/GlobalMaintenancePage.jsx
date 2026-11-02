import { useState } from 'react';
import { Wrench, Shield, Clock, Phone, RefreshCw, LogIn, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function GlobalMaintenancePage({ maintenance, appSettings, onAdminLoginSuccess }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const title = maintenance?.title || "Sistem Sedang Dalam Pemeliharaan";
  const message = maintenance?.message || "Aplikasi sedang melakukan peningkatan performa dan sinkronisasi server berkala. Silakan kembali lagi nanti.";
  const estimatedEnd = maintenance?.estimatedEnd || "";
  const contactInfo = maintenance?.contactInfo || "";
  const schoolName = appSettings?.schoolName || appSettings?.siteTitle || "Sistem Informasi Sekolah";
  const appName = appSettings?.appName || "KG2 School";
  const primaryColor = appSettings?.primaryColor || "#064e3b";

  const handleRefresh = () => {
    setIsChecking(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) {
      setLoginError("Silakan masukkan username dan password admin.");
      return;
    }
    setLoginError('');
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword,
          role: "admin"
        })
      });
      const data = await res.json();
      if (data.ok && data.token) {
        const sessionPayload = {
          authToken: data.token,
          role: data.role || 'admin',
          username: data.username || adminUsername,
          name: data.name || 'Administrator',
          userId: data.userId || 'admin',
          extraData: data.extraData || {}
        };
        const SESSION_KEY = "school_schedule_session_v1";
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
        if (typeof onAdminLoginSuccess === 'function') {
          onAdminLoginSuccess(sessionPayload);
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        setLoginError(data.error || "Gagal masuk. Pastikan akun memiliki hak akses Administrator.");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setLoginError("Gagal terhubung ke server autentikasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none"
      style={{
        background: "radial-gradient(ellipse at 50% 20%, #f0fdf4 0%, #f8fafc 60%, #e2e8f0 100%)"
      }}
    >
      {/* Background Subtle Gear Watermarks */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-teal-100/40 blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-lg relative z-10 bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-[var(--ui-radius-card,1.25rem)] shadow-xl p-6 sm:p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        
        {/* Animated Maintenance Icon Badge */}
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-400/40 text-amber-600 flex items-center justify-center shadow-xs">
            <Wrench size={38} strokeWidth={2.2} className="animate-bounce" style={{ animationDuration: '2.5s' }} />
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Clock size={13} strokeWidth={2.5} />
          </span>
        </div>

        {/* Live Pill Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black tracking-wide uppercase shadow-2xs mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Mode Pemeliharaan Sistem Aktif</span>
        </div>

        {/* Titles */}
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-snug mb-2">
          {title}
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed max-w-md mb-6">
          {message}
        </p>

        {/* Info Grid (Estimated Time & Contact) */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-left">
          {estimatedEnd ? (
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Clock size={16} strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimasi Selesai</span>
                <span className="text-xs font-black text-slate-700 truncate block mt-0.5">{estimatedEnd}</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={16} strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Proses Berjalan</span>
                <span className="text-xs font-black text-slate-700 truncate block mt-0.5">Pembaruan Rutin</span>
              </div>
            </div>
          )}

          {contactInfo ? (
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                <Phone size={16} strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kontak Bantuan</span>
                <span className="text-xs font-black text-slate-700 truncate block mt-0.5">{contactInfo}</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                <Shield size={16} strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Keamanan Data</span>
                <span className="text-xs font-black text-slate-700 truncate block mt-0.5">Data Aman Terjaga</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Button: Refresh */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isChecking}
          className="w-full h-11 px-4 rounded-[var(--ui-radius-control)] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-60"
          style={{ background: primaryColor }}
        >
          <RefreshCw size={15} className={isChecking ? "animate-spin" : ""} />
          <span>{isChecking ? "Memeriksa Status..." : "Muat Ulang / Cek Status Sistem"}</span>
        </button>

        {/* Admin Login Prompt */}
        <div className="mt-6 pt-4 border-t border-slate-100 w-full flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold text-slate-400">
            {schoolName} • {appName}
          </span>
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 font-black text-xs transition-colors cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-[var(--ui-radius-control)] shadow-2xs"
          >
            <LogIn size={13} strokeWidth={2.5} />
            <span>Login Admin</span>
          </button>
        </div>
      </div>

      {/* Admin Login Modal (Bypass during maintenance) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-[var(--ui-radius-card)] border border-slate-200 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => { setShowLoginModal(false); setLoginError(''); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} strokeWidth={2.5} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <Shield size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">Akses Administrator</h3>
                <p className="text-[11px] font-semibold text-slate-400">Masuk untuk mengelola &amp; mematikan maintenance</p>
              </div>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-[var(--ui-radius-control)] bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1 ml-0.5">Username Admin</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full h-10 px-3.5 rounded-[var(--ui-radius-control)] border border-slate-200 bg-slate-50/80 hover:bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs font-bold text-slate-800 outline-none transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1 ml-0.5">Password</label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3.5 rounded-[var(--ui-radius-control)] border border-slate-200 bg-slate-50/80 hover:bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs font-bold text-slate-800 outline-none transition-all shadow-2xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 h-10 px-4 rounded-[var(--ui-radius-control)] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-60"
                style={{ background: primaryColor }}
              >
                <LogIn size={15} strokeWidth={2.4} />
                <span>{isSubmitting ? "Memverifikasi..." : "Masuk ke Panel Admin"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


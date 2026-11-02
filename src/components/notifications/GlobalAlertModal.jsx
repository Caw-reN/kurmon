import { useState, useEffect } from 'react';
import { AlertTriangle, AlertOctagon, Info, CheckCircle2, X, Bell, ShieldCheck } from 'lucide-react';

export default function GlobalAlertModal({ broadcastAlert, currentUser }) {
  const [isOpen, setIsOpen] = useState(false);

  const isActive = Boolean(broadcastAlert?.isActive);
  const isPopup = Boolean(broadcastAlert?.isPopup);
  const title = broadcastAlert?.title || "Pemberitahuan Penting";
  const message = broadcastAlert?.message || "";
  const type = broadcastAlert?.type || "warning";
  const target = broadcastAlert?.target || "all";
  const alertId = broadcastAlert?.updatedAt || `${title}-${message}`;

  useEffect(() => {
    if (!isActive || !isPopup || !message.trim()) {
      setIsOpen(false);
      return;
    }

    // Filter target audience
    if (target !== 'all') {
      const userRole = String(currentUser?.role || '').toLowerCase();
      const isWalas = Boolean(currentUser?.isWalas || currentUser?.walasClass);
      if (target === 'guru' && userRole !== 'guru' && userRole !== 'teacher' && userRole !== 'admin') {
        return;
      }
      if (target === 'siswa' && userRole !== 'siswa' && userRole !== 'student' && userRole !== 'admin') {
        return;
      }
      if (target === 'walas' && !isWalas && userRole !== 'admin') {
        return;
      }
    }

    try {
      const seen = sessionStorage.getItem(`broadcast_modal_seen_${alertId}`);
      if (!seen) {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }
  }, [isActive, isPopup, message, alertId, target, currentUser]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem(`broadcast_modal_seen_${alertId}`, 'true');
    } catch {}
  };

  const THEMES = {
    warning: {
      accent: "text-amber-600 bg-amber-50 border-amber-200",
      btn: "bg-amber-600 hover:bg-amber-700 text-white",
      pill: "bg-amber-100 text-amber-900 border-amber-200",
      icon: AlertTriangle,
      label: "Peringatan Admin"
    },
    danger: {
      accent: "text-rose-600 bg-rose-50 border-rose-200",
      btn: "bg-rose-600 hover:bg-rose-700 text-white",
      pill: "bg-rose-100 text-rose-900 border-rose-200",
      icon: AlertOctagon,
      label: "Pemberitahuan Mendesak"
    },
    info: {
      accent: "text-sky-600 bg-sky-50 border-sky-200",
      btn: "bg-sky-600 hover:bg-sky-700 text-white",
      pill: "bg-sky-100 text-sky-900 border-sky-200",
      icon: Info,
      label: "Pengumuman Resmi"
    },
    success: {
      accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
      btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
      pill: "bg-emerald-100 text-emerald-900 border-emerald-200",
      icon: CheckCircle2,
      label: "Pemberitahuan Khusus"
    }
  };

  const currentTheme = THEMES[type] || THEMES.warning;
  const IconComponent = currentTheme.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 sm:p-7 relative animate-in zoom-in-95 duration-200 text-center flex flex-col items-center">
        
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-4 shadow-2xs ${currentTheme.accent}`}>
          <IconComponent size={32} strokeWidth={2.4} />
        </div>

        {/* Pill Badge */}
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs mb-2.5 ${currentTheme.pill}`}>
          {currentTheme.label}
        </span>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight mb-2">
          {title}
        </h2>

        {/* Message */}
        <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar px-1 mb-6 text-left whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100 w-full">
          {message}
        </p>

        {/* Confirm Button */}
        <button
          type="button"
          onClick={handleClose}
          className={`w-full py-3 px-5 rounded-xl font-black text-xs sm:text-sm tracking-wide shadow-xs active:scale-98 transition-all cursor-pointer ${currentTheme.btn}`}
        >
          Saya Mengerti
        </button>
      </div>
    </div>
  );
}


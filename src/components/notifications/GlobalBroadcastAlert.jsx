import { useState, useEffect } from 'react';
import { AlertTriangle, AlertOctagon, Info, CheckCircle2, X } from 'lucide-react';

export default function GlobalBroadcastAlert({ broadcastAlert, currentUser }) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Check alert active & targets
  const isActive = Boolean(broadcastAlert?.isActive);
  const title = broadcastAlert?.title || "Pemberitahuan Admin";
  const message = broadcastAlert?.message || "";
  const type = broadcastAlert?.type || "warning"; // warning | danger | info | success
  const target = broadcastAlert?.target || "all"; // all | guru | siswa | walas
  const dismissible = broadcastAlert?.dismissible !== false;
  const alertId = broadcastAlert?.updatedAt || `${title}-${message}`;

  // Check dismissed state in sessionStorage for this specific alert version
  useEffect(() => {
    if (!alertId) return;
    try {
      const dismissed = sessionStorage.getItem(`broadcast_alert_dismissed_${alertId}`);
      if (dismissed === 'true') {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, [alertId]);

  if (!isActive || !message.trim() || isDismissed) {
    return null;
  }

  // Filter target audience
  if (target !== 'all') {
    const userRole = String(currentUser?.role || '').toLowerCase();
    const isWalas = Boolean(currentUser?.isWalas || currentUser?.walasClass);
    if (target === 'guru' && userRole !== 'guru' && userRole !== 'teacher' && userRole !== 'admin') {
      return null;
    }
    if (target === 'siswa' && userRole !== 'siswa' && userRole !== 'student' && userRole !== 'admin') {
      return null;
    }
    if (target === 'walas' && !isWalas && userRole !== 'admin') {
      return null;
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(`broadcast_alert_dismissed_${alertId}`, 'true');
    } catch {}
  };

  // Color schemes conforming to strict pastel & UI compliance
  const THEMES = {
    warning: {
      bg: "bg-amber-500/10 border-amber-300 text-amber-950",
      iconBg: "bg-amber-100 text-amber-700",
      pill: "bg-amber-100 text-amber-800 border-amber-300",
      closeBtn: "text-amber-700 hover:bg-amber-200/50",
      icon: AlertTriangle,
      label: "Peringatan"
    },
    danger: {
      bg: "bg-rose-500/10 border-rose-300 text-rose-950",
      iconBg: "bg-rose-100 text-rose-700",
      pill: "bg-rose-100 text-rose-800 border-rose-300",
      closeBtn: "text-rose-700 hover:bg-rose-200/50",
      icon: AlertOctagon,
      label: "Pemberitahuan Penting"
    },
    info: {
      bg: "bg-sky-500/10 border-sky-300 text-sky-950",
      iconBg: "bg-sky-100 text-sky-700",
      pill: "bg-sky-100 text-sky-800 border-sky-300",
      closeBtn: "text-sky-700 hover:bg-sky-200/50",
      icon: Info,
      label: "Informasi Resmi"
    },
    success: {
      bg: "bg-emerald-500/10 border-emerald-300 text-emerald-950",
      iconBg: "bg-emerald-100 text-emerald-700",
      pill: "bg-emerald-100 text-emerald-800 border-emerald-300",
      closeBtn: "text-emerald-700 hover:bg-emerald-200/50",
      icon: CheckCircle2,
      label: "Pengumuman"
    }
  };

  const currentTheme = THEMES[type] || THEMES.warning;
  const IconComponent = currentTheme.icon;

  return (
    <div className="w-full px-3 sm:px-6 pt-2 pb-1 shrink-0 z-30 animate-in fade-in slide-in-from-top-2 duration-300">
      <div 
        className={`w-full max-w-7xl mx-auto rounded-[var(--ui-radius-small,0.75rem)] border px-3 sm:px-4 py-2.5 sm:py-3 shadow-xs flex items-center justify-between gap-3 ${currentTheme.bg}`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
          {/* Icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${currentTheme.iconBg}`}>
            <IconComponent size={18} strokeWidth={2.4} />
          </div>

          {/* Text and Title */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`px-2 py-0.5 rounded-[var(--ui-radius-small,0.375rem)] text-[10px] font-black uppercase tracking-wider border shadow-2xs ${currentTheme.pill}`}>
                {currentTheme.label}
              </span>
              <strong className="text-xs sm:text-sm font-black tracking-tight truncate">
                {title}
              </strong>
              <span className="hidden sm:inline font-bold text-slate-400">•</span>
            </div>
            <p className="text-xs font-semibold leading-snug truncate">
              {message}
            </p>
          </div>
        </div>

        {/* Close button if dismissible */}
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            title="Tutup pemberitahuan ini"
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer ${currentTheme.closeBtn}`}
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}


import { useState } from 'react';
import { 
  CheckCircle2, BookOpen, MapPin, FileBarChart2, BadgeCheck, UserCog, 
  Users, GraduationCap, Settings, LayoutDashboard, MessageSquare, KeyRound, 
  DatabaseBackup, ShieldCheck
} from 'lucide-react';
import useFiturStore, { FITUR_CONFIG } from '../../../store/monitoring/fiturStore';

/**
 * admin/FiturManagement.jsx
 * Halaman Admin: kontrol fitur mana yang aktif/nonaktif di seluruh sistem.
 * Perubahan langsung berdampak ke Panel Siswa dan Guru.
 */

const ICON_MAP = {
  CheckCircle2, BookOpen, MapPin, FileBarChart2, BadgeCheck, UserCog,
};

const ROLE_BADGE = {
  siswa:  { label: 'Siswa', bg: 'bg-sky-50 text-sky-700 border-sky-200/80', icon: Users },
  guru:   { label: 'Guru', bg: 'bg-purple-50 text-purple-700 border-purple-200/80', icon: GraduationCap },
  admin:  { label: 'Admin', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', icon: ShieldCheck },
};

const FiturManagement = ({ hideHeader = false, activeTab, setActiveTab }) => {
  const { fitur, toggleFitur, resetFitur } = useFiturStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [confirmKey, setConfirmKey] = useState(null); // fitur key yang perlu konfirmasi disable

  const totalFitur = FITUR_CONFIG.length;
  const activeCount = Object.values(fitur).filter(Boolean).length;
  const inactiveCount = totalFitur - activeCount;

  const handleToggle = (key, critical) => {
    if (critical && fitur[key]) {
      setConfirmKey(key);
      return;
    }
    toggleFitur(key);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const handleConfirmDisable = () => {
    toggleFitur(confirmKey);
    setConfirmKey(null);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const handleReset = () => {
    resetFitur();
    setConfirmReset(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <div className="space-y-6">
      {!hideHeader ? (
        <PageHeader
          icon={Settings}
          title="Manajemen Fitur"
          description="Aktifkan atau nonaktifkan fitur untuk Panel Siswa dan Guru secara real-time."
          tabs={[
            { id: "fitur", label: "Fitur", icon: Settings },
            { id: "tampilan", label: "Tampilan Web", icon: LayoutDashboard },
            { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
            { id: "api_keys", label: "API Key", icon: KeyRound },
            { id: "gdrive_backup", label: "Backup", icon: DatabaseBackup }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ) : (
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Bidang Hubin &amp; Fitur PKL</h2>
            <p className="text-xs font-semibold text-slate-500">Kontrol fitur aktif untuk Guru, Siswa, dan Admin</p>
          </div>
          {savedMsg && (
            <span className="text-xs text-emerald-600 font-extrabold animate-fade-in-up flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-[var(--ui-radius-small)] border border-emerald-200">
              <CheckCircle2 size={14} />
              Tersimpan Otomatis
            </span>
          )}
        </div>
      )}

      {/* KPI Overview Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-[var(--ui-radius-card)] bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">Total Fitur Modul</p>
            <p className="text-xl font-black text-slate-900 leading-tight">{totalFitur} <span className="text-xs font-bold text-slate-400">Modul</span></p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-[var(--ui-radius-card)] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <ToggleRight size={20} />
          </div>
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-600">Status Fitur Aktif</p>
            <p className="text-xl font-black text-slate-900 leading-tight">{activeCount} <span className="text-xs font-bold text-slate-400">/ {totalFitur}</span></p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-[var(--ui-radius-card)] bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-rose-600">Fitur Nonaktif</p>
            <p className="text-xl font-black text-slate-900 leading-tight">{inactiveCount} <span className="text-xs font-bold text-slate-400">Modul</span></p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-[var(--ui-radius-card)] bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-sky-600">Sinkronisasi Realtime</p>
            <p className="text-xs font-extrabold text-slate-700 leading-snug">Langsung Aktif Tanpa Reload</p>
          </div>
        </div>
      </div>

      {/* Info Tip Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-[var(--ui-radius-card)] p-4 text-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-white/10 text-emerald-400 flex items-center justify-center shrink-0 border border-white/10">
            <Info size={18} />
          </div>
          <p className="text-xs font-semibold text-slate-200 leading-relaxed">
            Sakelar fitur berlaku secara terpusat. Ketika opsi dimatikan, ikon dan akses navigasi di Panel Siswa maupun Guru akan otomatis disembunyikan.
          </p>
        </div>
        {savedMsg && (
          <span className="text-xs text-emerald-400 font-extrabold animate-fade-in-up flex items-center gap-1.5 shrink-0 bg-white/10 px-3 py-1.5 rounded-[var(--ui-radius-small)]">
            <CheckCircle2 size={14} />
            Sistem Diperbarui
          </span>
        )}
      </div>

      {/* Feature Cards Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FITUR_CONFIG.map((cfg) => {
          const Icon = ICON_MAP[cfg.icon] || CheckCircle2;
          const isActive = fitur[cfg.key] ?? true;

          return (
            <div
              key={cfg.key}
              className={`group relative bg-white border rounded-[var(--ui-radius-card)] p-5 transition-all duration-200 flex flex-col justify-between ${
                isActive 
                  ? 'border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300' 
                  : 'border-slate-200/60 bg-slate-50/50 shadow-none opacity-85'
              }`}
            >
              <div>
                {/* Header Card: Icon + Title + Switch */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-[var(--ui-radius-card)] flex items-center justify-center shrink-0 transition-colors ${
                      isActive 
                        ? 'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border border-[var(--ui-primary)]/20 shadow-2xs' 
                        : 'bg-slate-100 text-slate-400 border border-slate-200/60'
                    }`}>
                      <Icon size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h3 className={`font-black text-sm tracking-tight leading-snug ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                        {cfg.label}
                      </h3>
                      {cfg.critical && (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-[var(--ui-radius-small)] mt-1">
                          <AlertTriangle size={10} className="text-amber-600" />
                          Fitur Utama
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Real Accessible Custom Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => handleToggle(cfg.key, cfg.critical)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isActive ? 'bg-[var(--ui-primary,#064e3b)]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs font-medium text-slate-500 leading-relaxed mb-4 min-h-[36px]">
                  {cfg.description}
                </p>
              </div>

              {/* Footer Metadata: Affected Roles & Warning if disabled */}
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Akses Panel:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {cfg.affectedRoles.map((role) => {
                      const rb = ROLE_BADGE[role];
                      const RoleIcon = rb.icon;
                      return (
                        <span 
                          key={role}
                          className={`inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-[var(--ui-radius-small)] border ${rb.bg}`}
                        >
                          {RoleIcon && <RoleIcon size={11} />}
                          {rb.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {!isActive && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] p-2 leading-tight">
                    <AlertTriangle size={13} className="shrink-0 text-rose-500" />
                    <span>Fitur disembunyikan dari {cfg.affectedRoles.join(' & ')}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Footer */}
      <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--ui-radius-card)] bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <RotateCcw size={16} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-800">Reset Setelan Fitur</p>
            <p className="text-[11px] font-medium text-slate-400">Kembalikan semua modul ke kondisi aktif bawaan pabrik.</p>
          </div>
        </div>

        {confirmReset ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-rose-600 font-bold">Yakin reset semua?</span>
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="bg-rose-600 text-white hover:bg-rose-700 border-none font-bold text-xs px-3.5 py-2"
            >
              Ya, Reset
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setConfirmReset(false)}
              className="text-slate-600 hover:bg-slate-100 text-xs px-3.5 py-2"
            >
              Batal
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RotateCcw size={14} />
            Reset ke Kondisi Awal
          </Button>
        )}
      </div>

      {/* Confirm Disable Modal */}
      {confirmKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setConfirmKey(null)} />
          <div className="relative bg-white rounded-[var(--ui-radius-card)] p-6 max-w-sm w-full shadow-lg z-10 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-amber-50 border border-amber-200/80 rounded-[var(--ui-radius-card)] flex items-center justify-center mb-4 text-amber-600">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-black text-slate-900 text-base mb-1 tracking-tight">Nonaktifkan Fitur Utama?</h3>
            <p className="text-xs font-medium text-slate-500 leading-relaxed mb-6">
              Mematikan modul <strong>{FITUR_CONFIG.find(f => f.key === confirmKey)?.label}</strong> dapat 
              membatasi fungsi penting bagi pengguna.
            </p>
            <div className="flex gap-2.5">
              <Button 
                variant="outline" 
                onClick={() => setConfirmKey(null)}
                className="flex-1 text-xs font-bold text-slate-600 hover:bg-slate-100 border-slate-200"
              >
                Batal
              </Button>
              <button 
                onClick={handleConfirmDisable}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-[var(--ui-radius-card)] py-2.5 transition-colors border-none cursor-pointer shadow-xs"
              >
                Nonaktifkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiturManagement;

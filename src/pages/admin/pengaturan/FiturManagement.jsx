import { Button } from '../../../components/ui.jsx';
import { useState } from'react';
import { CheckCircle2, BookOpen, MapPin, FileBarChart2, BadgeCheck, UserCog, Users, GraduationCap, Settings, LayoutDashboard, MessageSquare, KeyRound, DatabaseBackup } from'lucide-react';
import useFiturStore, { FITUR_CONFIG } from'../../../store/monitoring/fiturStore';
import { Info, AlertTriangle, RotateCcw } from'lucide-react';
import { PageHeader } from'../../../components/monitoring/ui/index.js';


/**
 * admin/FiturManagement.jsx
 * Halaman Admin: kontrol fitur mana yang aktif/nonaktif di seluruh sistem.
 * Perubahan langsung berdampak ke Panel Siswa dan Guru.
 */





const ICON_MAP = {
  CheckCircle2, BookOpen, MapPin, FileBarChart2, BadgeCheck, UserCog,
};

const ROLE_BADGE = {
  siswa:  { label:'Siswa', bg:'bg-sky-100', text:'text-sky-700', icon: Users },
  guru:   { label:'Guru', bg:'bg-purple-100', text:'text-purple-700', icon: GraduationCap },
  admin:  { label:'Admin', bg:'bg-[var(--ui-primary)]/10', text:'text-[var(--ui-primary)]', icon: null },
};

const FiturManagement = ({ hideHeader = false, activeTab, setActiveTab }) => {
  const { fitur, toggleFitur, resetFitur } = useFiturStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [confirmKey, setConfirmKey] = useState(null); // fitur key yang perlu konfirmasi disable

  const activeCount = Object.values(fitur).filter(Boolean).length;

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
    <div className="space-y-4">
      {!hideHeader ? (
        <PageHeader
          icon={Settings}
          title="Manajemen Fitur"
          description="Aktifkan atau nonaktifkan fitur untuk Panel Siswa dan Guru secara real-time."
          tabs={[
            { id:"fitur", label:"Fitur", icon: Settings },
            { id:"tampilan", label:"Tampilan Web", icon: LayoutDashboard },
            { id:"whatsapp", label:"WhatsApp", icon: MessageSquare },
            { id:"api_keys", label:"API Key", icon: KeyRound },
            { id:"gdrive_backup", label:"Backup", icon: DatabaseBackup }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ) : (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Bidang Hubin (PKL)</h2>
            <p className="text-xs text-slate-400">Fitur untuk Guru, Siswa, dan Instruktur PKL</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {savedMsg && (
              <span className="text-xs text-[var(--ui-primary)] font-semibold animate-fade-in-up flex items-center gap-1">
                <CheckCircle2 size={13} />
                Tersimpan
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-1 rounded-[var(--ui-radius-small)] ${
              activeCount === FITUR_CONFIG.length
                ?'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]'
                :'bg-amber-100 text-amber-700'
            }`}>
              {activeCount}/{FITUR_CONFIG.length} aktif
            </span>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-sky-50 border border-sky-200 rounded-[var(--ui-radius-small)] p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-sky-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-sky-800 leading-relaxed">
            Perubahan di halaman ini berlaku <strong>langsung</strong> tanpa perlu reload.
            Fitur yang dinonaktifkan tidak akan tampil di navigasi Panel Siswa maupun Panel Guru.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 sm:self-center">
          {savedMsg && (
            <span className="text-xs text-emerald-600 font-extrabold animate-fade-in-up flex items-center gap-1">
              <CheckCircle2 size={14} />
              Tersimpan
            </span>
          )}
          <span className={`text-xs font-black px-3 py-1.5 rounded-[var(--ui-radius-small)] border shadow-xs ${
            activeCount === FITUR_CONFIG.length
              ?'bg-emerald-500 text-white border-emerald-500'
              :'bg-amber-500 text-white border-amber-500'
          }`}>
            {activeCount}/{FITUR_CONFIG.length} fitur aktif
          </span>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="space-y-3">
        {FITUR_CONFIG.map((cfg) => {
          const Icon = ICON_MAP[cfg.icon] || CheckCircle2;
          const isActive = fitur[cfg.key] ?? true;

          return (
            <div
              key={cfg.key}
              className={`bg-white border rounded-[var(--ui-radius-small)] transition-all duration-200 ${
                isActive ?'border-slate-200' :'border-gray-200 opacity-75'
              }`}
            >
              <div className="flex items-start gap-4 p-5">
                {/* Icon */}
                <div className={`w-11 h-11 rounded-[var(--ui-radius-small)] flex items-center justify-center flex-shrink-0 transition-colors ${
                  isActive ?'bg-[var(--ui-primary)]/10' :'bg-gray-100'
                }`}>
                  <Icon size={20} className={isActive ?'text-[var(--ui-primary)]' :'text-gray-400'} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className={`font-bold text-sm ${isActive ?'text-slate-800' :'text-gray-500'}`}>
                      {cfg.label}
                    </p>
                    {cfg.critical && (
                      <span className="text-[10px] bg-amber-100/90 text-amber-800 font-extrabold px-2.5 py-0.5 rounded-md border border-amber-200/80 inline-flex items-center gap-1 shadow-2xs">
                        <AlertTriangle size={11} className="text-amber-600" />
                        FITUR UTAMA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-2.5">{cfg.description}</p>

                  {/* Affected roles */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium">Berdampak ke:</span>
                    {cfg.affectedRoles.map((role) => {
                      const rb = ROLE_BADGE[role];
                      const RoleIcon = rb.icon;
                      return (
                        <span key={role}
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-[var(--ui-radius-small)] ${rb.bg} ${rb.text}`}>
                          {RoleIcon && <RoleIcon size={9} />}
                          {rb.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Toggle */}
                <Button variant="outline"
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() =>handleToggle(cfg.key, cfg.critical)}
                  className={`relative flex-shrink-0 mt-1 ${isActive ?'bg-[var(--ui-primary)]' :'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm
                    transition-transform duration-300 ${isActive ?'translate-x-7' :'translate-x-1'}`}
                  /></Button>
              </div>

              {/* Warning saat dimatikan */}
              {!isActive && (
                <div className="mx-5 mb-4 flex items-center gap-2 text-xs text-amber-700
                  bg-amber-50 border border-amber-200 rounded-[var(--ui-radius-small)] px-3 py-2">
                  <AlertTriangle size={13} className="flex-shrink-0" />
                  Fitur ini tidak tampil di panel {cfg.affectedRoles.join(' dan')}.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reset */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">Atur ulang semua fitur ke kondisi awal (semua aktif)</p>
        {confirmReset ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-700 font-medium">Yakin reset semua?</span>
            <Button variant="outline" onClick={handleReset} >Ya, Reset</Button>
            <Button variant="outline" onClick={() =>setConfirmReset(false)}
              >
              Batal</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() =>setConfirmReset(true)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500
              hover:text-danger transition-colors">
            <RotateCcw size={14} />
            Reset ke Default</Button>
        )}
      </div>

      {/* Confirm disable critical feature modal */}
      {confirmKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmKey(null)} />
          <div className="relative bg-white rounded-[var(--ui-radius-card)] p-6 max-w-sm w-full shadow-xl z-10">
            <div className="w-12 h-12 bg-amber-100 rounded-[var(--ui-radius-small)] flex items-center justify-center mb-4">
              <AlertTriangle size={24} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Nonaktifkan Fitur Utama Sistem?</h3>
            <p className="text-sm text-slate-400 mb-5">
              Mematikan fitur <strong>{FITUR_CONFIG.find(f => f.key === confirmKey)?.label}</strong> akan
              berdampak signifikan. Siswa tidak akan bisa menggunakannya hingga diaktifkan kembali.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() =>setConfirmKey(null)}
                className="flex-1">
                Batal</Button>
              <button onClick={handleConfirmDisable}
                className="flex-1">
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

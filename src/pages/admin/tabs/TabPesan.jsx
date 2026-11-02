import { useState } from 'react';
import { Button } from '../../../components/ui.jsx';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { 
  MessageSquare, Send, LayoutTemplate, Pin, Calendar, User, EyeOff, Eye, Trash2, Edit2,
  AlertTriangle, AlertOctagon, Info, CheckCircle2, Wrench, Shield, Clock, Phone,
  Sparkles, Megaphone, Power, Award, Monitor, Lock, ShieldCheck, Sliders, RefreshCw, LogIn, Check
} from 'lucide-react';
import { UISelect } from '../../../components/ui.jsx';
import { useAppStore } from '../../../store/useAppStore.js';
import { useDataStore } from '../../../store/useDataStore.js';

export default function TabPesan(props) {
  const { 
    getTabPermissionLevel, 
    activeUserRole, 
    dashboardMessageForm, 
    setDashboardMessageForm, 
    DASHBOARD_MESSAGE_TARGETS, 
    DASHBOARD_MESSAGE_PRIORITIES, 
    handleSaveDashboardMessage, 
    dashboardMessages = [], 
    handleToggleDashboardMessageSafe, 
    handleRemoveDashboardMessageSafe, 
    updateDashboardMessage,
    appSettings: propAppSettings,
    setAppSettings: propSetAppSettings,
    saveDatabaseNow,
    showNotification
  } = props;

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState('pesan'); // 'pesan' | 'siaran' | 'maintenance'

  // Access global appSettings with fallback
  const storeAppSettings = useAppStore(state => state.appSettings) || useDataStore.getState().appSettings || {};
  const appSettings = propAppSettings || storeAppSettings;
  const setAppSettings = propSetAppSettings || useAppStore.getState().setAppSettings;

  // ── 1. State Broadcast Alert Form ──
  const defaultBroadcast = {
    isActive: false,
    type: "warning", // warning | danger | info | success
    title: "Peringatan Dari Admin",
    message: "",
    target: "all", // all | guru | siswa | walas
    isPopup: false,
    dismissible: true,
    updatedAt: ""
  };

  const currentBroadcast = appSettings?.broadcastAlert || defaultBroadcast;
  const [broadcastForm, setBroadcastForm] = useState({
    isActive: Boolean(currentBroadcast.isActive),
    type: currentBroadcast.type || "warning",
    title: currentBroadcast.title || "Peringatan Dari Admin",
    message: currentBroadcast.message || "",
    target: currentBroadcast.target || "all",
    isPopup: Boolean(currentBroadcast.isPopup),
    dismissible: currentBroadcast.dismissible !== false
  });
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);

  // ── 2. State Maintenance Form ──
  const defaultMaintenance = {
    isActive: false,
    title: "Sistem Sedang Dalam Pemeliharaan",
    message: "Aplikasi sedang melakukan peningkatan performa dan sinkronisasi server berkala. Silakan kembali lagi nanti.",
    estimatedEnd: "",
    contactInfo: "",
    allowAdminBypass: true
  };

  const currentMaintenance = appSettings?.maintenance || defaultMaintenance;
  const [maintenanceForm, setMaintenanceForm] = useState({
    isActive: Boolean(currentMaintenance.isActive),
    title: currentMaintenance.title || "Sistem Sedang Dalam Pemeliharaan",
    message: currentMaintenance.message || "Aplikasi sedang melakukan peningkatan performa dan sinkronisasi server berkala. Silakan kembali lagi nanti.",
    estimatedEnd: currentMaintenance.estimatedEnd || "",
    contactInfo: currentMaintenance.contactInfo || "",
    allowAdminBypass: currentMaintenance.allowAdminBypass !== false
  });
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);

  // Permission
  const permLevel = getTabPermissionLevel ? getTabPermissionLevel("pesan") : "edit";
  const canEdit = permLevel === "edit" || (permLevel === "otomatis" && activeUserRole !== "kepsek");

  // Save Broadcast Alert
  const handleSaveBroadcast = async (e) => {
    if (e) e.preventDefault();
    if (broadcastForm.isActive && !broadcastForm.message.trim()) {
      if (showNotification) showNotification("Isi pesan siaran peringatan tidak boleh kosong!", "warning");
      return;
    }

    setIsSavingBroadcast(true);
    try {
      const nextSettings = {
        ...appSettings,
        broadcastAlert: {
          ...broadcastForm,
          updatedAt: new Date().toISOString()
        }
      };

      if (setAppSettings) setAppSettings(nextSettings);
      try {
        useDataStore.getState().setAppSettings(nextSettings);
      } catch {}

      if (saveDatabaseNow) {
        await saveDatabaseNow({ appSettings: nextSettings }, "memperbarui siaran peringatan admin");
      }

      if (showNotification) {
        showNotification(
          broadcastForm.isActive 
            ? "Peringatan siaran admin berhasil diaktifkan ke pengguna!" 
            : "Siaran peringatan admin berhasil dinonaktifkan.",
          "success"
        );
      }
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("Gagal menyimpan siaran peringatan.", "error");
    } finally {
      setIsSavingBroadcast(false);
    }
  };

  // Save Maintenance Mode
  const handleSaveMaintenance = async (e) => {
    if (e) e.preventDefault();
    setIsSavingMaintenance(true);
    try {
      const nextSettings = {
        ...appSettings,
        maintenance: {
          ...maintenanceForm,
          updatedAt: new Date().toISOString()
        }
      };

      if (setAppSettings) setAppSettings(nextSettings);
      try {
        useDataStore.getState().setAppSettings(nextSettings);
      } catch {}

      if (saveDatabaseNow) {
        await saveDatabaseNow({ appSettings: nextSettings }, "memperbarui mode pemeliharaan sistem");
      }

      if (showNotification) {
        showNotification(
          maintenanceForm.isActive
            ? "Mode Pemeliharaan (Maintenance Mode) telah AKTIF untuk seluruh pengguna umum!"
            : "Mode Pemeliharaan telah DINONAKTIFKAN. Aplikasi kembali online normal.",
          maintenanceForm.isActive ? "warning" : "success"
        );
      }
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("Gagal menyimpan mode pemeliharaan.", "error");
    } finally {
      setIsSavingMaintenance(false);
    }
  };

  // Apply broadcast presets
  const applyBroadcastPreset = (title, message, type) => {
    setBroadcastForm(prev => ({
      ...prev,
      title,
      message,
      type
    }));
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full animate-in fade-in duration-300">
      <PageHeader
        title="Pusat Pesan & Informasi Sistem"
        icon={MessageSquare}
        description="Kelola pengumuman dashboard, siaran peringatan instan (alert banner), dan kontrol mode pemeliharaan (maintenance) aplikasi."
      />

      {/* Modern Sub-Tab Pill Navigation (Mengikuti Standar Kustomisasi Web) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-[var(--ui-radius-card)] border border-slate-200/80 w-fit shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('pesan')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-[var(--ui-radius-control)] text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'pesan'
              ? 'bg-white text-slate-800 shadow-xs border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
          }`}
        >
          <MessageSquare size={15} className="shrink-0" />
          <span>Pengumuman Dashboard</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
            {dashboardMessages.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('siaran')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-[var(--ui-radius-control)] text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'siaran'
              ? 'bg-white text-slate-800 shadow-xs border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
          }`}
        >
          <Megaphone size={15} className="shrink-0" />
          <span>Pita Peringatan &amp; Siaran</span>
          {broadcastForm.isActive && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('maintenance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-[var(--ui-radius-control)] text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'maintenance'
              ? 'bg-white text-slate-800 shadow-xs border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
          }`}
        >
          <Wrench size={15} className="shrink-0" />
          <span>Mode Pemeliharaan</span>
          {maintenanceForm.isActive && (
            <span className="px-2 py-0.5 rounded-[var(--ui-radius-pill)] bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-black uppercase tracking-wider">
              Aktif
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PENGUMUMAN DASHBOARD (ORIGINAL LOGIC)                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'pesan' && (
        <div
          className={`grid grid-cols-1 ${canEdit ? "lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]" : "lg:grid-cols-1"} gap-6 w-full animate-in fade-in duration-200`}
        >
          {/* Form Buat Pesan */}
          {canEdit && (
            <section className="ui-card h-fit flex flex-col bg-white border border-slate-200 rounded-[var(--ui-radius-card)] shadow-xs overflow-hidden">
              <div className="p-4 md:p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">
                      Buat Pengumuman
                    </h2>
                    <p className="text-[11px] md:text-xs text-slate-500 font-medium">
                      Pesan akan tayang di dasbor pengguna.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                    Judul Pesan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={dashboardMessageForm.title}
                    onChange={(e) =>
                      setDashboardMessageForm({
                        ...dashboardMessageForm,
                        title: e.target.value
                      })
                    }
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all outline-none"
                    placeholder="Contoh: Rapat evaluasi pekan ini"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                    Isi Pesan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={dashboardMessageForm.body}
                    onChange={(e) =>
                      setDashboardMessageForm({
                        ...dashboardMessageForm,
                        body: e.target.value
                      })
                    }
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-sm font-semibold focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 min-h-[100px] transition-all resize-y outline-none"
                    placeholder="Tulis pengumuman singkat dan jelas..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                      Target
                    </label>
                    <UISelect
                      value={dashboardMessageForm.target}
                      onChange={(e) =>
                        setDashboardMessageForm({
                          ...dashboardMessageForm,
                          target: e.target.value
                        })
                      }
                      className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:border-[var(--ui-primary)] outline-none"
                    >
                      {DASHBOARD_MESSAGE_TARGETS.map((target) => (
                        <option key={target.value} value={target.value}>
                          {target.label}
                        </option>
                      ))}
                    </UISelect>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                      Prioritas
                    </label>
                    <UISelect
                      value={dashboardMessageForm.priority}
                      onChange={(e) =>
                        setDashboardMessageForm({
                          ...dashboardMessageForm,
                          priority: e.target.value
                        })
                      }
                      className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:border-[var(--ui-primary)] outline-none"
                    >
                      {DASHBOARD_MESSAGE_PRIORITIES.map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </UISelect>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                      Mulai Tampil
                    </label>
                    <input
                      type="date"
                      value={dashboardMessageForm.startDate}
                      onChange={(e) =>
                        setDashboardMessageForm({
                          ...dashboardMessageForm,
                          startDate: e.target.value
                        })
                      }
                      className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                      Selesai Tampil
                    </label>
                    <input
                      type="date"
                      value={dashboardMessageForm.endDate}
                      onChange={(e) =>
                        setDashboardMessageForm({
                          ...dashboardMessageForm,
                          endDate: e.target.value
                        })
                      }
                      className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between gap-3 bg-slate-50/50 border border-slate-200 rounded-[var(--ui-radius-small)] px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors mt-2">
                  <span className="text-xs font-bold text-slate-700">
                    Sematkan (Pin) di Dashboard
                  </span>
                  <div className="relative inline-block w-9 h-5">
                    <input
                      type="checkbox"
                      checked={!!dashboardMessageForm.pinned}
                      onChange={(e) =>
                        setDashboardMessageForm({
                          ...dashboardMessageForm,
                          pinned: e.target.checked
                        })
                      }
                      className="peer sr-only"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--ui-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--ui-primary)]"></div>
                  </div>
                </label>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleSaveDashboardMessage}
                    className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-[var(--ui-radius-small)] text-white font-bold text-sm tracking-wide shadow-sm hover:opacity-90 hover:-translate-y-0.5 transition-all outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--ui-primary)' }}
                  >
                    <Send size={16} /> Publikasikan Pengumuman
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Daftar Pesan */}
          <section className="ui-card flex flex-col h-full min-h-[400px] bg-white border border-slate-200 rounded-[var(--ui-radius-card)] shadow-xs overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">
                  Daftar Pengumuman
                </h2>
                <p className="text-[11px] md:text-xs text-slate-500 font-medium">
                  {dashboardMessages.length} pesan tersimpan dalam sistem.
                </p>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-[var(--ui-radius-small)] bg-slate-50 border flex items-center justify-center text-slate-400 shrink-0">
                <LayoutTemplate size={16} />
              </div>
            </div>

            <div className="p-4 md:p-5 space-y-3 md:space-y-4 flex-1 bg-slate-50/30">
              {dashboardMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6 bg-white border border-dashed border-slate-300 rounded-[var(--ui-radius-small)]">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-slate-700">
                    Belum Ada Pengumuman
                  </h3>
                  <p className="text-[11px] md:text-sm font-medium text-slate-500 mt-2 max-w-sm">
                    Buat pesan baru menggunakan form di sebelah kiri untuk
                    menampilkannya di dashboard pengguna.
                  </p>
                </div>
              ) : (
                dashboardMessages.map((message) => {
                  const priority =
                    DASHBOARD_MESSAGE_PRIORITIES.find(
                      (item) => item.value === message.priority,
                    ) || DASHBOARD_MESSAGE_PRIORITIES[0];
                  const isActive = message.isActive !== false;

                  return (
                    <article
                      key={message.id}
                      className={`relative border bg-white rounded-[var(--ui-radius-card)] ${isActive ? "border-slate-200 shadow-sm" : "border-slate-100 opacity-60 bg-slate-50/50"} p-4 md:p-5 transition-all group`}
                    >
                      {message.pinned && isActive && (
                        <div 
                          className="absolute -top-2 -right-2 w-7 h-7 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center shadow-sm z-10 cursor-pointer transition-colors" 
                          title="Disematkan (Pinned). Klik untuk melepaskan sematan."
                          onClick={() => {
                            if (updateDashboardMessage) {
                              updateDashboardMessage(message.id, { ...message, pinned: false });
                              const nextMsgs = dashboardMessages.map(m => m.id === message.id ? { ...m, pinned: false } : m);
                              if (props.saveDatabaseNow) {
                                props.saveDatabaseNow({ dashboardMessages: nextMsgs }, "melepas sematan pesan dashboard");
                              }
                            }
                          }}
                        >
                          <Pin size={13} fill="currentColor" />
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-4 md:gap-5">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-[var(--ui-radius-small)] border text-[10px] font-bold tracking-wide ${priority.className}`}
                            >
                              {priority.label}
                            </span>
                            <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 tracking-wide">
                              Untuk: {DASHBOARD_MESSAGE_TARGETS.find(
                                (t) => t.value === message.target,
                              )?.label || "Semua"}
                            </span>
                            {!isActive && (
                              <span className="px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-200 text-slate-600 text-[10px] font-bold uppercase border border-slate-300 tracking-wide">
                                Nonaktif
                              </span>
                            )}
                          </div>

                          <h3 className="text-base md:text-lg font-bold text-slate-800 leading-snug">
                            {message.title}
                          </h3>
                          <p className="text-[13px] md:text-sm text-slate-600 mt-1.5 leading-relaxed whitespace-pre-wrap break-words">
                            {message.body}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-semibold text-slate-500">
                              <Calendar size={12} />
                              <span>{message.startDate || "Sekarang"}</span>
                              <span className="text-slate-300">&rarr;</span>
                              <span>{message.endDate || "Seterusnya"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-semibold text-slate-500">
                              <User size={12} />
                              <span>Oleh {message.createdBy || "Sistem"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row sm:flex-col gap-2 shrink-0 sm:w-[130px] sm:border-l sm:border-slate-100 sm:pl-4 justify-start pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {canEdit && (
                            <>
                              <Button variant="outline" size="sm"
                                onClick={() => {
                                  setDashboardMessageForm({
                                    id: message.id,
                                    title: message.title,
                                    body: message.body,
                                    target: message.target || "semua",
                                    priority: message.priority || "normal",
                                    startDate: message.startDate || "",
                                    endDate: message.endDate || "",
                                    pinned: !!message.pinned
                                  });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-8 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-100 hover:border-indigo-200"
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </Button>
                              <Button variant="outline" size="sm"
                                onClick={() => handleToggleDashboardMessageSafe(
                                    message.id,
                                    !isActive,
                                  )
                                }
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-8 text-[11px] ${isActive ? "bg-white border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50" : "bg-[var(--ui-primary)] text-white border-transparent shadow-sm"}`}
                              >
                                {isActive ? (
                                  <>
                                    <EyeOff size={14} /> Sembunyikan
                                  </>
                                ) : (
                                  <>
                                    <Eye size={14} /> Tampilkan
                                  </>
                                )}
                              </Button>
                              <Button variant="outline" size="sm"
                                onClick={() => handleRemoveDashboardMessageSafe(message.id)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-8 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100 hover:border-rose-200"
                              >
                                <Trash2 size={13} />
                                <span>Hapus</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PITA PERINGATAN & SIARAN INSTAN                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'siaran' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 w-full animate-in fade-in duration-200">
          {/* Form Konfigurasi Siaran */}
          <section className="ui-card bg-white border border-[var(--ui-card-border-color,var(--ui-border-soft))] rounded-[var(--ui-radius-card)] shadow-[var(--ui-card-shadow,var(--ui-shadow-card))] p-5 md:p-6 space-y-6 overflow-hidden">
            
            {/* Header Box & Toggle Status Switch */}
            <div className={`p-4 sm:p-5 rounded-[var(--ui-radius-card)] border transition-all ${
              broadcastForm.isActive 
                ? 'bg-gradient-to-r from-amber-50/90 via-yellow-50/30 to-amber-50/90 border-amber-200/90 ring-1 ring-amber-400/20 shadow-xs' 
                : 'bg-slate-50/80 border-slate-200/90'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-[var(--ui-radius-control)] flex items-center justify-center shrink-0 shadow-sm ${
                    broadcastForm.isActive ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Megaphone size={22} strokeWidth={2.4} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wider border ${
                        broadcastForm.isActive 
                          ? 'bg-amber-100/90 text-amber-900 border-amber-300' 
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}>
                        <span className="relative flex h-2 w-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${broadcastForm.isActive ? 'bg-amber-400' : 'bg-slate-400'} opacity-75`} />
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${broadcastForm.isActive ? 'bg-amber-500' : 'bg-slate-500'}`} />
                        </span>
                        <span>{broadcastForm.isActive ? "Siaran Aktif Tayang" : "Siaran Nonaktif"}</span>
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 mt-1 leading-snug">
                      {broadcastForm.isActive ? "Pita pengumuman saat ini SEDANG TAYANG di atas aplikasi pengguna." : "Pita pengumuman saat ini MATI (tidak ditayangkan ke pengguna)."}
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer self-start sm:self-center shrink-0">
                  <span className={`text-[11px] font-black uppercase tracking-wider ${broadcastForm.isActive ? 'text-amber-700' : 'text-slate-400'}`}>
                    {broadcastForm.isActive ? 'Tayang' : 'Mati'}
                  </span>
                  <div className="relative inline-block w-12 h-7">
                    <input
                      type="checkbox"
                      checked={broadcastForm.isActive}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, isActive: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="w-12 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
                  </div>
                </label>
              </div>
            </div>

            {/* Template Rekomendasi Cepat (Zero Emoji - 100% SVG Icon Compliance) */}
            <div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                Pilihan Pesan Cepat (Preset)
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyBroadcastPreset("Batas Input Jurnal KBM", "Harap seluruh bapak/ibu guru melengkapi pengisian jurnal KBM hari ini sebelum jam 15.00 WIB.", "warning")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-control)] bg-amber-50 hover:bg-amber-100/80 border border-amber-200/90 text-amber-900 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Clock size={13} className="text-amber-600 shrink-0" />
                  <span>Batas Input Jurnal</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyBroadcastPreset("Pemberitahuan Mendesak", "Jadwal KBM hari ini dipadatkan sampai pukul 12.00 WIB sehubungan dengan agenda rapat dinas.", "danger")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-control)] bg-rose-50 hover:bg-rose-100/80 border border-rose-200/90 text-rose-900 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <AlertOctagon size={13} className="text-rose-600 shrink-0" />
                  <span>Pengumuman Pulang Cepat</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyBroadcastPreset("Agenda Upacara Hari Senin", "Seluruh siswa dan dewan guru diwajibkan mengenakan seragam dinas lengkap dan hadir tepat waktu pukul 06.45 WIB.", "info")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-control)] bg-sky-50 hover:bg-sky-100/80 border border-sky-200/90 text-sky-900 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Info size={13} className="text-sky-600 shrink-0" />
                  <span>Agenda Upacara</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyBroadcastPreset("Selamat & Sukses", "Selamat atas prestasi Juara 1 LKS tingkat wilayah yang diraih oleh perwakilan siswa sekolah kita!", "success")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-control)] bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/90 text-emerald-900 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Award size={13} className="text-emerald-600 shrink-0" />
                  <span>Berita Prestasi</span>
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tipe Notifikasi */}
                <div>
                  <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                    Jenis Siaran (Tingkat Urgensi)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "warning", label: "Peringatan", icon: AlertTriangle, color: "text-amber-700 border-amber-300 bg-amber-50" },
                      { value: "danger", label: "Darurat / Penting", icon: AlertOctagon, color: "text-rose-700 border-rose-300 bg-rose-50" },
                      { value: "info", label: "Informasi Resmi", icon: Info, color: "text-sky-700 border-sky-300 bg-sky-50" },
                      { value: "success", label: "Sukses / Berita", icon: CheckCircle2, color: "text-emerald-700 border-emerald-300 bg-emerald-50" }
                    ].map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setBroadcastForm({ ...broadcastForm, type: t.value })}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          broadcastForm.type === t.value ? `${t.color} ring-2 ring-slate-800 shadow-2xs` : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <t.icon size={15} />
                        <span className="truncate">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Audiens */}
                <div>
                  <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                    Target Penerima
                  </label>
                  <UISelect
                    value={broadcastForm.target}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, target: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-xs font-bold focus:bg-white outline-none"
                  >
                    <option value="all">Semua Pengguna (Civitas Akademika)</option>
                    <option value="guru">Khusus Bapak/Ibu Guru Saja</option>
                    <option value="siswa">Khusus Siswa Saja</option>
                    <option value="walas">Khusus Wali Kelas Saja</option>
                  </UISelect>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 ml-0.5">
                    Hanya pengguna yang sesuai target yang akan melihat pita pemberitahuan ini.
                  </p>
                </div>
              </div>

              {/* Judul Peringatan */}
              <div>
                <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                  Judul Singkat Siaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  placeholder="Misal: Batas Akhir Input Nilai"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                />
              </div>

              {/* Isi Pesan Peringatan */}
              <div>
                <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                  Isi Pesan Peringatan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  placeholder="Tulis pesan lengkap yang ingin disiarkan ke pengguna..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-y"
                />
              </div>

              {/* Opsi Tambahan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={broadcastForm.isPopup}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, isPopup: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Tampilkan sebagai Pop-up Modal</span>
                    <span className="text-[10px] font-semibold text-slate-400 block">Dialog peringatan akan langsung muncul begitu pengguna membuka aplikasi.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={broadcastForm.dismissible}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, dismissible: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Dapat Ditutup Pengguna</span>
                    <span className="text-[10px] font-semibold text-slate-400 block">Pengguna dapat menekan tombol silang (X) untuk menyembunyikan banner.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveBroadcast}
                disabled={isSavingBroadcast}
                className="h-10 px-6 rounded-[var(--ui-radius-control)] bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <Send size={14} strokeWidth={2.4} />
                <span>{isSavingBroadcast ? "Menyimpan & Menyiarkan..." : "Simpan & Siarkan Pengumuman"}</span>
              </button>
            </div>
          </section>

          {/* Pratinjau Tampilan Siaran Langsung */}
          <aside className="space-y-4">
            <div className="ui-card bg-slate-50/80 border border-slate-200/90 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 text-slate-700">
                <Sparkles size={16} className="text-amber-500" />
                <h4 className="text-xs font-black uppercase tracking-wider">Pratinjau Siaran (Live Preview)</h4>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">
                Beginilah tampilan pita pemberitahuan yang akan muncul di layar seluruh pengguna target:
              </p>

              {/* Preview Pita Banner */}
              <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                  Pita Atas (Top Alert Ribbon)
                </span>
                <div className={`p-3 rounded-lg border text-left flex items-start gap-2.5 ${
                  broadcastForm.type === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-950' :
                  broadcastForm.type === 'info' ? 'bg-sky-50 border-sky-200 text-sky-950' :
                  broadcastForm.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-950' :
                  'bg-amber-50 border-amber-200 text-amber-950'
                }`}>
                  <div className="shrink-0 mt-0.5">
                    {broadcastForm.type === 'danger' ? <AlertOctagon size={16} className="text-rose-600" /> :
                     broadcastForm.type === 'info' ? <Info size={16} className="text-sky-600" /> :
                     broadcastForm.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> :
                     <AlertTriangle size={16} className="text-amber-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-xs font-black block leading-tight">
                      {broadcastForm.title || "Judul Peringatan"}
                    </strong>
                    <p className="text-[11px] font-medium leading-snug mt-1 opacity-90">
                      {broadcastForm.message || "Tuliskan isi pesan siaran Anda di formulir sebelah kiri untuk melihat pratinjaunya di sini."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview Pop-Up Modal */}
              {broadcastForm.isPopup && (
                <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    Dialog Pop-Up (Modal View)
                  </span>
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                      <AlertTriangle size={18} />
                    </div>
                    <strong className="text-xs font-black text-slate-800">{broadcastForm.title || "Judul"}</strong>
                    <p className="text-[10px] text-slate-600 leading-snug">{broadcastForm.message || "Isi pesan..."}</p>
                    <div className="w-full mt-1 py-1.5 rounded-lg bg-amber-600 text-white text-[10px] font-bold">
                      Saya Mengerti
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MODE PEMELIHARAAN SISTEM (MAINTENANCE MODE)                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 w-full animate-in fade-in duration-200">
          {/* Form Konfigurasi Maintenance */}
          <section className="ui-card bg-white border border-[var(--ui-card-border-color,var(--ui-border-soft))] rounded-[var(--ui-radius-card)] shadow-[var(--ui-card-shadow,var(--ui-shadow-card))] p-5 md:p-6 space-y-6 overflow-hidden">
            
            {/* Status Switch Box (Card Pastel Modern) */}
            <div className={`p-4 sm:p-5 rounded-[var(--ui-radius-card)] border transition-all ${
              maintenanceForm.isActive 
                ? 'bg-gradient-to-r from-rose-50/90 via-amber-50/40 to-rose-50/90 border-rose-200/90 ring-1 ring-rose-400/20 shadow-xs' 
                : 'bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-emerald-50/90 border-emerald-200/90 shadow-xs'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-[var(--ui-radius-control)] flex items-center justify-center shrink-0 shadow-sm ${
                    maintenanceForm.isActive ? 'bg-rose-500 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {maintenanceForm.isActive ? <Wrench size={22} className="animate-spin" style={{ animationDuration: '6s' }} /> : <ShieldCheck size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wider border ${
                        maintenanceForm.isActive 
                          ? 'bg-rose-100/90 text-rose-800 border-rose-300' 
                          : 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                      }`}>
                        <span className="relative flex h-2 w-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${maintenanceForm.isActive ? 'bg-rose-400' : 'bg-emerald-400'} opacity-75`} />
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${maintenanceForm.isActive ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                        </span>
                        <span>{maintenanceForm.isActive ? "Mode Maintenance Aktif" : "Sistem Normal (Online)"}</span>
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 mt-1 leading-snug">
                      {maintenanceForm.isActive 
                        ? "Hanya Administrator yang dapat mengakses dashboard. Pengguna lain (Guru, Siswa, Tamu) otomatis dialihkan ke layar pemeliharaan."
                        : "Seluruh civitas akademika dan masyarakat dapat mengakses aplikasi sekolah secara penuh tanpa hambatan."}
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer self-start sm:self-center shrink-0">
                  <span className={`text-[11px] font-black uppercase tracking-wider ${maintenanceForm.isActive ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {maintenanceForm.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <div className="relative inline-block w-12 h-7">
                    <input
                      type="checkbox"
                      checked={maintenanceForm.isActive}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, isActive: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className={`w-12 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all ${
                      maintenanceForm.isActive ? 'peer-checked:bg-rose-600' : 'peer-checked:bg-emerald-600'
                    } shadow-inner`}></div>
                  </div>
                </label>
              </div>
            </div>

            {/* Form Fields Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <Sliders size={14} className="text-slate-400" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Konten &amp; Tampilan Layar Pengguna
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                  Judul Layar Pemeliharaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={maintenanceForm.title}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                  placeholder="Misal: Sistem Sedang Dalam Pemeliharaan Berkala"
                  className="w-full h-10 px-3.5 rounded-[var(--ui-radius-control)] border border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-800 focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 outline-none transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                  Pesan / Penjelasan untuk Pengguna <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={maintenanceForm.message}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, message: e.target.value })}
                  placeholder="Tulis alasan atau instruksi selama pemeliharaan berlangsung..."
                  className="w-full px-3.5 py-2.5 rounded-[var(--ui-radius-control)] border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-800 focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 outline-none transition-all resize-y shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                    Perkiraan Selesai (Estimasi Waktu)
                  </label>
                  <div className="relative">
                    <Clock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={maintenanceForm.estimatedEnd}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, estimatedEnd: e.target.value })}
                      placeholder="Contoh: Pukul 15:00 WIB"
                      className="w-full h-10 pl-9 pr-3.5 rounded-[var(--ui-radius-control)] border border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-800 focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 ml-0.5 mb-1.5 block">
                    Kontak Bantuan / WhatsApp Admin
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={maintenanceForm.contactInfo}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, contactInfo: e.target.value })}
                      placeholder="Contoh: 0812-3456-7890 (Admin IT)"
                      className="w-full h-10 pl-9 pr-3.5 rounded-[var(--ui-radius-control)] border border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-800 focus:bg-white focus:border-[var(--ui-primary)] focus:ring-2 focus:ring-[var(--ui-primary)]/20 outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Admin Bypass Guarantee Notice */}
              <div className="p-3.5 rounded-[var(--ui-radius-control)] bg-slate-50/80 border border-slate-200/90 text-slate-600 text-xs flex items-start gap-2.5 shadow-2xs">
                <Shield size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed text-[11px] font-medium">
                  <strong className="text-slate-800 font-bold">Akses Khusus Administrator:</strong> Selama pemeliharaan aktif, Super Admin tetap dapat masuk dan membuka menu pengelolaan sistem tanpa terhalang.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveMaintenance}
                disabled={isSavingMaintenance}
                className={`h-10 px-6 rounded-[var(--ui-radius-control)] font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60 text-white ${
                  maintenanceForm.isActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)]'
                }`}
              >
                {maintenanceForm.isActive ? <Power size={14} strokeWidth={2.4} /> : <CheckCircle2 size={14} strokeWidth={2.4} />}
                <span>
                  {isSavingMaintenance 
                    ? "Menyimpan Perubahan..." 
                    : maintenanceForm.isActive 
                      ? "Terapkan Mode Pemeliharaan" 
                      : "Simpan Pengaturan"}
                </span>
              </button>
            </div>
          </section>

          {/* Pratinjau Layar Pemeliharaan (Browser Device Mockup) */}
          <aside className="space-y-4">
            <div className="ui-card bg-slate-50/80 border border-slate-200/90 rounded-[var(--ui-radius-card)] p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 text-slate-700">
                <Monitor size={16} className="text-[var(--ui-primary)]" />
                <h4 className="text-xs font-black uppercase tracking-wider">Pratinjau Layar Maintenance</h4>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">
                Miniatur tampilan responsif yang dilihat guru, siswa, dan pengunjung saat mode pemeliharaan aktif:
              </p>

              {/* Browser Window Mockup Frame */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden text-center flex flex-col">
                
                {/* Browser Window Top Bar */}
                <div className="bg-slate-100/90 px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="flex items-center justify-center gap-1 bg-white/90 px-2.5 py-0.5 rounded-full border border-slate-200/80 text-[9.5px] font-bold text-slate-500 max-w-[180px] truncate">
                    <Lock size={10} className="text-emerald-600 shrink-0" />
                    <span className="truncate">sekolah.sch.id</span>
                  </div>
                  <div className="w-7 shrink-0" />
                </div>

                {/* Live Preview Canvas */}
                <div 
                  className="p-5 flex flex-col items-center gap-3 relative select-none"
                  style={{
                    background: "radial-gradient(ellipse at 50% 20%, #f0fdf4 0%, #f8fafc 60%, #e2e8f0 100%)"
                  }}
                >
                  {/* Maintenance Icon Badge with Clock Sub-badge */}
                  <div className="relative mt-1">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-600 flex items-center justify-center shadow-xs">
                      <Wrench size={26} strokeWidth={2.2} />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Clock size={11} strokeWidth={2.5} />
                    </span>
                  </div>

                  {/* Status Pill Badge */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-black tracking-wide uppercase shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Mode Pemeliharaan Sistem Aktif</span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1 max-w-[280px]">
                    <h5 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight leading-snug">
                      {maintenanceForm.title || "Sistem Sedang Dalam Pemeliharaan"}
                    </h5>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed line-clamp-3">
                      {maintenanceForm.message || "Aplikasi sedang melakukan peningkatan performa dan sinkronisasi server berkala. Silakan kembali lagi nanti."}
                    </p>
                  </div>

                  {/* 2 Feature Cards (Matching Live Screen) */}
                  <div className="grid grid-cols-2 gap-2 w-full max-w-[290px] text-left">
                    <div className="bg-white/90 border border-slate-200/80 rounded-xl p-2 flex items-center gap-2 shadow-2xs">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={13} strokeWidth={2.4} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Proses</span>
                        <span className="text-[9.5px] font-black text-slate-700 truncate block">Pembaruan Rutin</span>
                      </div>
                    </div>

                    <div className="bg-white/90 border border-slate-200/80 rounded-xl p-2 flex items-center gap-2 shadow-2xs">
                      <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Shield size={13} strokeWidth={2.4} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Keamanan</span>
                        <span className="text-[9.5px] font-black text-slate-700 truncate block">Data Aman</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Info Rows if filled */}
                  {maintenanceForm.estimatedEnd && (
                    <div className="w-full max-w-[290px] bg-white/90 border border-slate-200/80 rounded-xl p-2 flex items-center gap-2 text-left shadow-2xs">
                      <Clock size={13} className="text-emerald-600 shrink-0" />
                      <div className="min-w-0 text-[10px]">
                        <span className="text-slate-400 font-bold mr-1">Selesai:</span>
                        <span className="text-slate-800 font-black">{maintenanceForm.estimatedEnd}</span>
                      </div>
                    </div>
                  )}

                  {maintenanceForm.contactInfo && (
                    <div className="w-full max-w-[290px] bg-white/90 border border-slate-200/80 rounded-xl p-2 flex items-center gap-2 text-left shadow-2xs">
                      <Phone size={13} className="text-sky-600 shrink-0" />
                      <div className="min-w-0 text-[10px]">
                        <span className="text-slate-400 font-bold mr-1">Bantuan:</span>
                        <span className="text-slate-800 font-black truncate">{maintenanceForm.contactInfo}</span>
                      </div>
                    </div>
                  )}

                  {/* Refresh Button Mock */}
                  <div className="w-full max-w-[290px]">
                    <div className="w-full py-2 px-3 rounded-xl bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center gap-1.5 shadow-xs">
                      <RefreshCw size={11} strokeWidth={2.5} />
                      <span>Muat Ulang / Cek Status Sistem</span>
                    </div>
                  </div>

                  {/* Mini Footer */}
                  <div className="w-full max-w-[290px] pt-2 border-t border-slate-200/60 flex items-center justify-between text-[9px] text-slate-400 font-bold">
                    <span>Sekolah • KG2 School</span>
                    <span className="inline-flex items-center gap-1 text-slate-600 bg-white/80 border border-slate-200/70 px-1.5 py-0.5 rounded shadow-2xs font-extrabold">
                      <LogIn size={9} />
                      <span>Login Admin</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

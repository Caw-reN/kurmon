import { Button } from '../../components/ui.jsx';
import { useState, useEffect, useRef } from'react';
import { Clock, MessageSquare,
  LayoutDashboard, SlidersHorizontal, Users, GraduationCap,
  BookOpen, DoorOpen, Calendar, FileSpreadsheet, CalendarDays,
  CheckCircle2, Briefcase, Wand2, FileText, Settings,
  MonitorSmartphone, UserCog, User, HardDrive,
  HelpCircle, Menu, Bell, LogOut, PanelLeftClose, PanelLeftOpen
} from'lucide-react';
import { useAppStore } from'../../store/useAppStore.js';
;
import { requestPushPermissionAndSubscribe, checkPushSubscription, testPushNotification } from'../../utils/pushUtils.js';


const GuidePortalButton = ({ onClick }) => {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title="Panduan"
      className="text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border flex items-center gap-1.5 px-3 py-2 rounded-[var(--ui-radius-small)] text-xs font-bold shrink-0 active:translate-y-[1px] shadow-sm transition-all"
    >
      <HelpCircle size={14} />
      <span>Panduan</span>
    </Button>
  );
};

// Avatar initials helper
function getInitials(name ="Admin") {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words[0].length >= 2) return words[0].slice(0, 2).toUpperCase();
  return"AD";
}

const getTabLabel = (tabId) => {
  const labels = {
    dashboard:"Dashboard Utama",
    jurusan:"Data Jurusan",
    kelas:"Data Kelas",
    siswa:"Data Siswa",
    guru:"Data Guru",
    karyawan:"Data Karyawan",
    mapel:"Kelola Mata Pelajaran",
    ruangan:"Fasilitas & Ruangan",
    denah:"Denah Ruangan",
    generate:"Generate Jadwal",
    ketersediaan:"Ketersediaan Guru",
    beban:"Beban Mengajar",
    pengaturan:"Konfigurasi Waktu",
    advanced_rules:"Aturan Penjadwalan",
    silabus:"RPP atau Modul Pembelajaran",
    absensi:"Kehadiran Guru",
    hikvision_report_siswa:"Rekap Absensi Siswa",
    pkl_dashboard:"Monitoring PKL",
    pkl_data_siswa:"Data Siswa PKL",
    pkl_data_perusahaan:"Data Perusahaan PKL",
    pkl_penugasan:"Penugasan Guru Hubin",
    pkl_administrasi:"Administrasi PKL",
    pkl_jurnal:"Jurnal Siswa PKL",
    pkl_absensi_setting:"Absensi GPS PKL",
    hikvision:"Dashboard Mesin Absensi",
    akademik:"Kalender Akademik",
    pesan:"Pusat Pesan Dashboard",
    fitur:"Kontrol Fitur Sistem",
    tampilan:"Kustomisasi Tampilan Web",
    hak_akses:"Hak Akses & Keamanan",
    pengaturanuser:"Pengaturan Pengguna",
    api_keys:"Manajemen API Key",
    whatsapp:"Integrasi WhatsApp Gateway",
    gdrive_backup:"Backup Google Drive",
    audit_log:"Log Aktivitas (Audit)",
    esurat:"Administrasi E-Surat",
    kenaikan_kelas:"Kenaikan Kelas",
    profil_sekolah:"Profil Instansi Sekolah"
  };
  return labels[tabId] ||"Sistem Akademik & Absensi";
};

const getParentGroupLabel = (tabId) => {
  const tabGroups = {
    // Data Sekolah group
    jurusan:"Data Sekolah",
    kelas:"Data Sekolah",
    siswa:"Data Sekolah",
    guru:"Data Sekolah",
    karyawan:"Data Sekolah",
    kenaikan_kelas:"Data Sekolah",

    // Kurikulum group
    mapel:"Manajemen Kurikulum",
    ruangan:"Manajemen Kurikulum",
    denah:"Manajemen Kurikulum",
    generate:"Manajemen Kurikulum",
    ketersediaan:"Manajemen Kurikulum",
    beban:"Manajemen Kurikulum",
    silabus:"Manajemen Kurikulum",
    akademik:"Manajemen Kurikulum",

    // Kesiswaan group
    absensi:"Kesiswaan & Absensi",

    // Hubungan Industri (PKL) group
    pkl_dashboard:"Hubungan Industri (PKL)",
    pkl_data_siswa:"Hubungan Industri (PKL)",
    pkl_data_perusahaan:"Hubungan Industri (PKL)",
    pkl_penugasan:"Hubungan Industri (PKL)",
    pkl_administrasi:"Hubungan Industri (PKL)",
    pkl_jurnal:"Hubungan Industri (PKL)",
    pkl_absensi_setting:"Hubungan Industri (PKL)",

    // Sarana & Prasarana group
    hikvision:"Sarana & Prasarana",

    // Pengaturan group
    fitur:"Pengaturan Sistem",
    tampilan:"Pengaturan Sistem",
    hak_akses:"Pengaturan Sistem",
    pengaturanuser:"Pengaturan Sistem",
    api_keys:"Pengaturan Sistem",
    whatsapp:"Pengaturan Sistem",
    gdrive_backup:"Pengaturan Sistem",
    audit_log:"Pengaturan Sistem",
    esurat:"Pengaturan Sistem",
    profil_sekolah:"Pengaturan Sistem"
  };

  return tabGroups[tabId] ||"Dashboard Utama";
};




const getTabIcon = (tabId) => {
  const icons = {
    dashboard: LayoutDashboard,
    jurusan: SlidersHorizontal,
    kelas: Users,
    siswa: GraduationCap,
    guru: Users,
    karyawan: Users,
    mapel: BookOpen,
    fasilitas: DoorOpen,
    denah: DoorOpen,
    kenaikan_kelas: GraduationCap,
    generate: Calendar,
    ketersediaan: Clock,
    beban: FileSpreadsheet,
    akademik: CalendarDays,
    absensi: CheckCircle2,
    pkl_dashboard: LayoutDashboard,
    pkl_data_siswa: Users,
    pkl_data_perusahaan: Briefcase,
    pkl_penugasan: Wand2,
    pkl_administrasi: FileText,
    pkl_jurnal: BookOpen,
    pkl_absensi_setting: Settings,
    esurat: FileText,
    profil_sekolah: Settings,
    fitur: SlidersHorizontal,
    tampilan: MonitorSmartphone,
    hak_akses: UserCog,
    pengaturanuser: User,
    whatsapp: MessageSquare,
    gdrive_backup: HardDrive,
    audit_log: FileText
  };
  return icons[tabId] || LayoutDashboard;
};

const GlobalHeaderPortals = ({ onOpenMobileMenu, toggleSidebar, isSidebarCollapsed, onOpenProfile, currentUser, activeRoleLabel, appSettings, workspaceGuide, onOpenGuide, activeTab, dashboardMessages, schedule, handleLogout }) => {
  const IconComponent = getTabIcon(activeTab);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifBtnRef = useRef(null);
  const notifDropdownRef = useRef(null);
  const [notifPermission, setNotifPermission] = useState(() => {
    return typeof window !=="undefined" &&"Notification" in window ? Notification.permission :"unsupported";
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showNotifDropdown) return;
    const handleClickOutside = (e) => {
      if (
        notifDropdownRef.current && !notifDropdownRef.current.contains(e.target) &&
        notifBtnRef.current && !notifBtnRef.current.contains(e.target)
      ) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifDropdown]);

  const requestPushPermission = async () => {
    if (typeof window ==="undefined" || !("Notification" in window)) return;
    try {
      if (notifPermission ==="granted") {
        const isSubscribed = await checkPushSubscription();
        if (!isSubscribed) {
          await requestPushPermissionAndSubscribe();
          await testPushNotification();
        } else {
          await testPushNotification();
        }
        return;
      }

      await requestPushPermissionAndSubscribe();
      setNotifPermission("granted");
      await testPushNotification();
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      if (err.message.includes('ditolak')) {
        setNotifPermission("denied");
      }
    }
  };

  const getTodayClasses = () => {
    if (!schedule || !currentUser?.code) return [];
    
    const dayIdx = new Date().getDay();
    const days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    const todayName = days[dayIdx];
    
    const normalizeText = (val) => String(val ??"").trim().toLowerCase();
    
    const rawMatches = schedule.filter(item => {
      const isToday = normalizeText(item.day) === normalizeText(todayName);
      const isMyTeacher = normalizeText(item.teacherCode) === normalizeText(currentUser.code);
      return isToday && isMyTeacher;
    });

    const timeSlots = useAppStore.getState().getTimeSlots ? useAppStore.getState().getTimeSlots() : {};
    const todaySlots = timeSlots[todayName] || [];
    
    const nonBreakSlots = todaySlots.filter(s => !s.isBreak);
    
    const enriched = rawMatches.map(item => {
      const slot = todaySlots.find(s => String(s.id) === String(item.slotId));
      let jamKe = null;
      if (slot && !slot.isBreak) {
        const idx = nonBreakSlots.findIndex(s => String(s.id) === String(slot.id));
        if (idx !== -1) jamKe = idx + 1;
      }
      return { ...item, jamKe, slotOrder: slot ? todaySlots.indexOf(slot) : 999 };
    }).filter(item => item.jamKe !== null);
    
    enriched.sort((a, b) => a.slotOrder - b.slotOrder);

    const grouped = [];
    for (const item of enriched) {
      if (grouped.length === 0) {
        grouped.push({ subject: item.subject, className: item.className, room: item.roomId, jamStart: item.jamKe, jamEnd: item.jamKe });
      } else {
        const last = grouped[grouped.length - 1];
        if (last.subject === item.subject && last.className === item.className && item.jamKe === last.jamEnd + 1) {
          last.jamEnd = item.jamKe;
        } else {
          grouped.push({ subject: item.subject, className: item.className, room: item.roomId, jamStart: item.jamKe, jamEnd: item.jamKe });
        }
      }
    }
    
    return grouped;
  };

  const todayClasses = getTodayClasses();

  return (
    <header className="app-header flex h-14 bg-background px-3 sm:px-5 md:px-8 items-center justify-between shrink-0 relative z-[60] border-none shadow-none !border-none !shadow-none print:hidden">
      
      {/* Left: Mobile Menu Button & Desktop Sidebar Toggle & Brand/Keterangan */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex lg:hidden p-2 text-foreground hover:bg-muted active:translate-y-[1px] border border-border rounded-[var(--ui-radius-small)] items-center justify-center cursor-pointer transition-all shrink-0"
          title="Buka Menu Mobile"
        >
          <Menu size={18} strokeWidth={2.5} />
        </button>


        
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {IconComponent && (
            <div className="flex items-center justify-center shrink-0 text-primary">
              <IconComponent size={18} strokeWidth={2.5} />
            </div>
          )}
          {getParentGroupLabel(activeTab) !== getTabLabel(activeTab) ? (
            <h1 className="text-sm md:text-xl font-black flex items-center gap-1 select-none tracking-tight animate-in fade-in duration-200 min-w-0 truncate">
              <span className="text-slate-400 font-medium hidden sm:inline">{getParentGroupLabel(activeTab)}</span>
              <span className="text-slate-300 font-light hidden sm:inline">/</span>
              <span className="text-primary font-black truncate">{getTabLabel(activeTab)}</span>
            </h1>
          ) : (
            <h1 className="text-sm md:text-xl font-black text-primary tracking-tight leading-tight animate-in fade-in duration-200 min-w-0 truncate">
              {getTabLabel(activeTab)}
            </h1>
          )}
        </div>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {workspaceGuide && (
          <Button
            type="button"
            variant="ghost"
            onClick={onOpenGuide}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border flex items-center gap-1.5 px-3 py-2 rounded-[var(--ui-radius-small)] text-xs font-bold shrink-0 active:translate-y-[1px] transition-all w-fit h-9.5"
            title="Bantuan / Panduan Penggunaan"
          >
            <HelpCircle size={14} />
            <span className="hidden sm:inline">Panduan</span>
          </Button>
        )}

        {/* Bell button */}
        <div className="relative">
          <button
            ref={notifBtnRef}
            type="button"
            onClick={() => setShowNotifDropdown(prev => !prev)}
            className="relative flex items-center justify-center w-9 h-9 bg-white border border-slate-200/90 rounded-[var(--ui-radius-small)] text-slate-700 hover:text-[var(--ui-primary)] hover:bg-slate-50 transition-all shadow-xs shrink-0 cursor-pointer"
            style={{ color: '#334155' }}
            title="Notifikasi"
          >
            <Bell size={18} strokeWidth={2.2} style={{ color: '#334155' }} />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white ring-1 ring-rose-400" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <div
              ref={notifDropdownRef}
              className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[60px] sm:top-11 sm:w-80 max-h-[70vh] sm:max-h-[420px] overflow-y-auto bg-card border border-slate-200/80 shadow-sm rounded-[var(--ui-radius-card)] p-4 z-[999] flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
                <span className="font-extrabold text-xs text-slate-800 tracking-tight">Notifikasi &amp; Informasi</span>
                <button 
                  onClick={() => setShowNotifDropdown(false)} 
                  className="text-slate-400 hover:text-slate-600 text-[10px] font-black bg-transparent border-none p-0 cursor-pointer uppercase tracking-wider"
                >
                  Tutup
                </button>
              </div>

              {/* Realtime Notification Consent Prompt */}
              {notifPermission ==="default" && (
                <div className="bg-primary/10 border border-primary/20 rounded-[var(--ui-radius-small)] p-3 flex flex-col gap-2 shrink-0">
                  <div className="flex items-start gap-2.5">
                    <Bell className="text-primary w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-800 leading-tight">Aktifkan Notifikasi Realtime</span>
                      <span className="text-[9.5px] font-semibold text-slate-500 mt-0.5 leading-tight">Terima info absensi &amp; piket langsung di layar Anda secara instan.</span>
                    </div>
                  </div>
                  <button
                    onClick={requestPushPermission}
                    className="w-full py-1.5 text-white font-bold text-[10px] rounded-[var(--ui-radius-small)] active:scale-98 transition-all border-none cursor-pointer flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: appSettings?.primaryColor ||"var(--ui-primary)" }}
                  >
                    <span>Izinkan Sekarang</span>
                  </button>
                </div>
              )}

              {/* TODAY'S CLASS REMINDERS */}
              <div className="flex flex-col gap-2 shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Jadwal Mengajar Hari Ini
                </span>
                {todayClasses.length === 0 ? (
                  <div className="text-[11px] font-bold text-slate-400 py-2 text-center bg-slate-50 rounded-[var(--ui-radius-small)]">
                    Tidak ada jadwal mengajar hari ini.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {todayClasses.map((item, idx) => (
                      <div key={idx} className="flex gap-2.5 p-2.5 bg-primary/5 border border-primary/10 rounded-[var(--ui-radius-small)]">
                        <Clock className="text-primary w-4 h-4 mt-0.5 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-extrabold text-slate-800 truncate">
                            {item.subject}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                            Kelas: {item.className} â€¢ Jam Ke-{item.jamStart === item.jamEnd ? item.jamStart : `${item.jamStart} - ${item.jamEnd}`}
                          </span>
                          {item.room && (
                            <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
                              Ruang: {item.room}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ANNOUNCEMENTS / MESSAGES */}
              <div className="flex flex-col gap-2 shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Pengumuman Terbaru
                </span>
                {!dashboardMessages || dashboardMessages.length === 0 ? (
                  <div className="text-[11px] font-bold text-slate-400 py-2 text-center bg-slate-50 rounded-[var(--ui-radius-small)]">
                    Belum ada pengumuman terbaru.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {dashboardMessages.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex gap-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-[var(--ui-radius-small)]">
                        <MessageSquare className="text-slate-500 w-4 h-4 mt-0.5 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-extrabold text-slate-800 truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 mt-0.5 line-clamp-2">
                            {item.content}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
                            {item.author ||"Administrator"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-border shrink-0" />

        <div
          onClick={onOpenProfile}
          className="flex items-center gap-1.5 sm:gap-2.5 rounded-[var(--ui-radius-small)] cursor-pointer min-w-0 transition-colors hover:bg-muted/80 p-0.5 sm:p-1 pr-1.5 sm:pr-2.5 shrink-0"
          title="Profil Pengguna"
        >
          <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs shrink-0 border border-primary/20">
            {getInitials(currentUser?.name)}
          </div>
          <div className="flex flex-col hidden sm:flex min-w-0 max-w-[140px]">
            <span className="text-[12px] font-bold text-foreground leading-tight truncate">
              {currentUser?.name || appSettings.appName}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold leading-tight mt-0.5 truncate">{activeRoleLabel}</span>
          </div>
        </div>

        {handleLogout && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex sm:hidden p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 rounded-[var(--ui-radius-small)] items-center justify-center cursor-pointer transition-all shrink-0 active:translate-y-[1px] w-8 h-8"
            title="Keluar"
          >
            <LogOut size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

    </header>
  );
};

export { GlobalHeaderPortals as AdminHeader, GuidePortalButton };

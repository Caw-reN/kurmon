import { Button } from '../../components/ui.jsx';
import { cn } from '../../lib/utils';
import { useState, useEffect, useRef } from'react';
import { Clock, MessageSquare,
  LayoutDashboard, SlidersHorizontal, Users, GraduationCap,
  BookOpen, DoorOpen, Calendar, FileSpreadsheet, CalendarDays,
  CheckCircle2, Briefcase, Wand2, FileText, Settings,
  MonitorSmartphone, UserCog, User, HardDrive, KeyRound,
  HelpCircle, Bell, LogOut, Wrench, Activity, ClipboardList, Trophy, UserMinus, Shield, ShieldCheck,
  Menu, ChevronsUpDown, ChevronDown
} from'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { requestPushPermissionAndSubscribe, checkPushSubscription, testPushNotification, testScheduleReminderNotification } from '../../utils/pushUtils.js';


const GuidePortalButton = ({ onClick }) => {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title="Panduan"
      className="text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shrink-0 active:translate-y-[1px] transition-all"
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
    ruangan:"Data Ruangan",
    fasilitas:"Data Fasilitas & Sarana",
    denah:"Denah Ruangan",
    kedisiplinan_hub:"Pusat Kedisiplinan & EWS",
    kedisiplinan_bpbk:"Bimbingan Konseling (BK)",
    kedisiplinan_piket:"Piket & Pelanggaran",
    tatib_skor:"Aturan Tatib & Skor",
    keterangan_massal:"Keterangan Massal Siswa",
    rekap_jurnal_kelas:"Rekap Jurnal Kelas",
    jurnal_harian:"Jurnal Harian Guru",
    modul_ajar:"Perangkat Ajar",
    rpp_guru:"Silabus & Perangkat Guru",
    silabusguru:"Modul Saya",
    absensiguru:"Absen Mandiri Guru",
    riwayat_prestasi:"Riwayat Prestasi Siswa",
    siswa_keluar:"Mutasi & Alumni Siswa",
    laporan_absensi:"Laporan Kehadiran",
    hikvision_report_guru:"Presensi Guru & Karyawan",
    kartu_pelajar:"Cetak Kartu Pelajar",
    manajemen_role:"Struktur & Jabatan Staf",
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
    status_password:"Log Status Ganti Password",
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
    status_password:"Pengaturan Sistem",
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
    kedisiplinan_hub: Activity,
    kedisiplinan_bpbk: ShieldCheck,
    kedisiplinan_piket: ClipboardList,
    tatib_skor: BookOpen,
    keterangan_massal: FileSpreadsheet,
    rekap_jurnal_kelas: BookOpen,
    jurnal_harian: BookOpen,
    modul_ajar: FileText,
    rpp_guru: FileSpreadsheet,
    silabusguru: FileText,
    absensiguru: CheckCircle2,
    riwayat_prestasi: Trophy,
    siswa_keluar: UserMinus,
    laporan_absensi: ClipboardList,
    hikvision_report_guru: FileText,
    manajemen_role: Shield,
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
    status_password: KeyRound,
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

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileBtnRef = useRef(null);
  const profileMenuRef = useRef(null);

  const [notifPermission, setNotifPermission] = useState(() => {
    return typeof window !=="undefined" &&"Notification" in window ? Notification.permission :"unsupported";
  });

  const [isTestingPush, setIsTestingPush] = useState(false);
  const [testFeedback, setTestFeedback] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showNotifDropdown && !showProfileMenu) return;
    const handleClickOutside = (e) => {
      if (
        showNotifDropdown &&
        notifDropdownRef.current && !notifDropdownRef.current.contains(e.target) &&
        notifBtnRef.current && !notifBtnRef.current.contains(e.target)
      ) {
        setShowNotifDropdown(false);
      }
      if (
        showProfileMenu &&
        profileMenuRef.current && !profileMenuRef.current.contains(e.target) &&
        profileBtnRef.current && !profileBtnRef.current.contains(e.target)
      ) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifDropdown, showProfileMenu]);

  // Cek apakah permission sudah granted saat dropdown dibuka
  useEffect(() => {
    if (showNotifDropdown && typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
      if (Notification.permission === "granted") {
        checkPushSubscription().then(isSub => {
          if (!isSub) {
            requestPushPermissionAndSubscribe().catch(() => {});
          }
        });
      }
    }
  }, [showNotifDropdown]);

  const requestPushPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      if (notifPermission === "granted") {
        const isSubscribed = await checkPushSubscription();
        if (!isSubscribed) {
          await requestPushPermissionAndSubscribe();
        }
        await handleTestGenericPush();
        return;
      }

      await requestPushPermissionAndSubscribe();
      setNotifPermission("granted");
      await handleTestGenericPush();
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      if (err.message && err.message.includes('ditolak')) {
        setNotifPermission("denied");
      }
      setTestFeedback({ ok: false, message: err.message || 'Gagal mengaktifkan notifikasi.' });
    }
  };

  const handleTestGenericPush = async () => {
    setIsTestingPush(true);
    setTestFeedback(null);
    try {
      const res = await testPushNotification();
      setTestFeedback({ ok: res.ok, message: res.message || 'Notifikasi test terkirim!' });
    } catch (e) {
      setTestFeedback({ ok: false, message: e.message || 'Gagal mengirim notifikasi test.' });
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleTestSchedulePush = async () => {
    setIsTestingPush(true);
    setTestFeedback(null);
    try {
      const res = await testScheduleReminderNotification();
      setTestFeedback({ ok: res.ok, message: res.message || 'Pengingat jadwal berhasil dikirim ke HP!' });
    } catch (e) {
      setTestFeedback({ ok: false, message: e.message || 'Gagal mengirim pengingat jadwal.' });
    } finally {
      setIsTestingPush(false);
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
  const isPrimaryHeader = (appSettings?.headerStyle || 'primary') === 'primary';
  const unreadMessagesCount = Array.isArray(dashboardMessages) ? dashboardMessages.length : 0;
  const notifCount = (todayClasses?.length || 0) + unreadMessagesCount;

  return (
    <header className="app-header flex h-14 bg-background px-3 sm:px-5 md:px-8 items-center justify-between shrink-0 relative z-[60] border-none shadow-none !border-none !shadow-none print:hidden">
      
      {/* Left: Desktop Sidebar Toggle & Brand/Keterangan */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
        {/* Mobile menu trigger */}
        {typeof onOpenMobileMenu === 'function' && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className={cn(
              "lg:hidden p-2 rounded-lg cursor-pointer flex items-center justify-center transition-colors shrink-0",
              isPrimaryHeader
                ? "bg-white/15 hover:bg-white/25 text-white border border-white/25"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80"
            )}
            title="Buka Menu"
            aria-label="Buka Menu"
          >
            <Menu size={18} strokeWidth={2} />
          </button>
        )}
        
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {IconComponent && (
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all",
              isPrimaryHeader
                ? "bg-white/15 text-white border-white/25"
                : "bg-primary/10 text-primary border-primary/20"
            )}>
              <IconComponent size={16} strokeWidth={2.4} />
            </div>
          )}
          {getParentGroupLabel(activeTab) !== getTabLabel(activeTab) ? (
            <h1 className="text-sm md:text-base font-bold flex items-center gap-1.5 select-none tracking-tight animate-in fade-in duration-200 min-w-0 truncate">
              <span className={cn(
                "font-medium text-xs hidden sm:inline truncate",
                isPrimaryHeader ? "text-white/70" : "text-slate-400"
              )}>
                {getParentGroupLabel(activeTab)}
              </span>
              <span className={cn(
                "font-light text-xs hidden sm:inline",
                isPrimaryHeader ? "text-white/40" : "text-slate-300"
              )}>/</span>
              <span className={cn(
                "font-bold truncate",
                isPrimaryHeader ? "text-white" : "text-primary"
              )}>
                {getTabLabel(activeTab)}
              </span>
            </h1>
          ) : (
            <h1 className={cn(
              "text-sm md:text-base font-bold tracking-tight leading-tight animate-in fade-in duration-200 min-w-0 truncate",
              isPrimaryHeader ? "text-white" : "text-primary"
            )}>
              {getTabLabel(activeTab)}
            </h1>
          )}
        </div>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {appSettings?.maintenance?.isActive && (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.__setActiveTab) {
                window.__setActiveTab('pesan');
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 text-rose-800 border border-rose-300 text-[10px] sm:text-[11px] font-black tracking-tight uppercase hover:bg-white active:scale-95 transition-all cursor-pointer shrink-0"
            title="Mode Pemeliharaan sedang aktif untuk pengguna lain. Klik untuk kelola."
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
            </span>
            <Wrench size={12} className="text-rose-600 shrink-0" />
            <span className="hidden md:inline">Maintenance Aktif</span>
            <span className="md:hidden">Maintenance</span>
          </button>
        )}

        {workspaceGuide && (
          <Button
            type="button"
            variant="ghost"
            onClick={onOpenGuide}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all w-fit",
              isPrimaryHeader
                ? "bg-white/15 hover:bg-white/25 text-white border border-white/25"
                : "bg-white hover:bg-primary/10 text-slate-600 hover:text-primary border border-slate-200/80"
            )}
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
            onClick={() => {
              setShowNotifDropdown(prev => !prev);
              setShowProfileMenu(false);
            }}
            className={cn(
              "relative flex items-center justify-center w-9 h-9 rounded-xl transition-all shrink-0 cursor-pointer shadow-xs active:scale-95",
              isPrimaryHeader
                ? "bg-white/15 hover:bg-white/25 text-white border border-white/25 hover:border-white/40"
                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs"
            )}
            title="Pusat Pemberitahuan & Pengumuman"
            aria-label="Pusat Pemberitahuan"
          >
            <Bell size={16} strokeWidth={2.2} />
            {notifCount > 0 ? (
              <span className={cn(
                "absolute -top-1 -right-1 px-1 min-w-[17px] h-[17px] rounded-full bg-rose-500 text-white text-[9.5px] font-black border-2 flex items-center justify-center shadow-xs animate-in zoom-in-75",
                isPrimaryHeader ? "border-emerald-800" : "border-white"
              )}>
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            ) : null}
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <div
              ref={notifDropdownRef}
              className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[60px] sm:top-12 sm:w-84 max-h-[75vh] sm:max-h-[460px] bg-white border border-slate-200/90 rounded-2xl shadow-xl z-[999] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {/* Fixed Popover Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60">
                    <Bell size={13} strokeWidth={2.4} />
                  </div>
                  <span className="font-extrabold text-xs text-slate-800 tracking-tight">Notifikasi &amp; Informasi</span>
                </div>
                <button 
                  onClick={() => setShowNotifDropdown(false)} 
                  className="text-slate-400 hover:text-slate-700 text-[10px] font-bold bg-transparent border-none px-2 py-1 rounded-md hover:bg-slate-100 cursor-pointer uppercase tracking-wider transition-colors"
                >
                  Tutup
                </button>
              </div>

              {/* Scrollable Content Body with Sleek Scrollbar */}
              <div className="overflow-y-auto max-h-[380px] p-3.5 flex flex-col gap-3.5 popover-custom-scrollbar">
                {/* Realtime Notification Status / Prompt */}
                {notifPermission === "granted" && (
                  <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 flex flex-col gap-2 shrink-0">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[11px] font-black text-emerald-950 leading-tight">Push Notifikasi HP Aktif</span>
                        </div>
                        <span className="text-[9.5px] font-semibold text-emerald-800/80 mt-0.5 leading-snug">
                          Pengingat jam mengajar otomatis akan masuk ke HP Anda saat waktu KBM tiba.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <button
                        type="button"
                        disabled={isTestingPush}
                        onClick={handleTestGenericPush}
                        className="flex-1 py-1.5 px-2 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-md text-emerald-900 text-[10px] font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isTestingPush ? 'Mengirim...' : 'Tes Notif HP'}
                      </button>
                      <button
                        type="button"
                        disabled={isTestingPush}
                        onClick={handleTestSchedulePush}
                        className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-black transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isTestingPush ? 'Mengirim...' : 'Uji Pengingat Jadwal'}
                      </button>
                    </div>

                    {testFeedback && (
                      <div className={`text-[9.5px] font-bold px-2 py-1 rounded-md ${testFeedback.ok ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-800'}`}>
                        {testFeedback.message}
                      </div>
                    )}
                  </div>
                )}

                {notifPermission === "default" && (
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 flex flex-col gap-2 shrink-0">
                    <div className="flex items-start gap-2.5">
                      <Bell className="text-emerald-600 w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-800 leading-tight">Aktifkan Notifikasi Realtime</span>
                        <span className="text-[9.5px] font-semibold text-slate-500 mt-0.5 leading-tight">Terima pengingat jadwal mengajar &amp; info absensi langsung di HP Anda.</span>
                      </div>
                    </div>
                    <button
                      onClick={requestPushPermission}
                      className="w-full py-1.5 text-white font-bold text-[10px] rounded-lg active:scale-98 transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <span>Izinkan Sekarang</span>
                    </button>
                  </div>
                )}

                {notifPermission === "denied" && (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex flex-col gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                      <Bell size={13} className="text-amber-600 shrink-0" />
                      <span>Izin Notifikasi Diblokir Browser</span>
                    </div>
                    <span className="text-[9.5px] text-amber-800 leading-snug">
                      Klik ikon gembok di sebelah kiri alamat web browser, ubah Notifikasi menjadi Izinkan (Allow), lalu klik tombol di bawah.
                    </span>
                    <button
                      type="button"
                      onClick={requestPushPermission}
                      className="mt-1 w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer border-none"
                    >
                      Coba Aktifkan Ulang
                    </button>
                  </div>
                )}

                {/* TODAY'S CLASS REMINDERS */}
                <div className="flex flex-col gap-2 shrink-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Jadwal Mengajar Hari Ini
                  </span>
                  {todayClasses.length === 0 ? (
                    <div className="text-[11px] font-bold text-slate-400 py-2.5 text-center bg-slate-50 rounded-xl border border-slate-100">
                      Tidak ada jadwal mengajar hari ini.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {todayClasses.map((item, idx) => (
                        <div key={idx} className="flex gap-2.5 p-2.5 bg-emerald-50/40 border border-emerald-100/80 rounded-xl">
                          <Clock className="text-emerald-600 w-4 h-4 mt-0.5 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-extrabold text-slate-800 truncate">
                              {item.subject}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                              Kelas: {item.className} • Jam Ke-{item.jamStart === item.jamEnd ? item.jamStart : `${item.jamStart} - ${item.jamEnd}`}
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
                    <div className="text-[11px] font-bold text-slate-400 py-2.5 text-center bg-slate-50 rounded-xl border border-slate-100">
                      Belum ada pengumuman terbaru.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {dashboardMessages.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex gap-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
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
            </div>
          )}
        </div>

        {/* Subtle Vertical Divider */}
        <div className={cn(
          "w-px h-5 shrink-0 hidden sm:block mx-0.5",
          isPrimaryHeader ? "bg-white/20" : "bg-slate-200"
        )} />

        {/* User Profile Pill Capsule with Interactive Popover */}
        <div className="relative">
          <div
            ref={profileBtnRef}
            onClick={() => {
              setShowProfileMenu(prev => !prev);
              setShowNotifDropdown(false);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowProfileMenu(prev => !prev);
              }
            }}
            className={cn(
              "flex items-center gap-2 sm:gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer min-w-0 transition-all select-none shadow-xs border active:scale-[0.98]",
              isPrimaryHeader
                ? (showProfileMenu ? "bg-white/25 border-white/40 text-white ring-2 ring-white/20" : "bg-white/15 hover:bg-white/25 border-white/25 hover:border-white/40 text-white")
                : (showProfileMenu ? "bg-slate-100 border-slate-300 text-slate-900 ring-2 ring-primary/20" : "bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800")
            )}
            title="Profil Pengguna & Opsi Akun"
          >
            {/* Avatar with Status Dot */}
            <div className="relative shrink-0">
              <div className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 overflow-hidden shadow-2xs transition-all",
                isPrimaryHeader 
                  ? "bg-white text-emerald-900 border border-white/80" 
                  : "bg-primary/10 text-primary border border-primary/25"
              )}>
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{getInitials(currentUser?.name)}</span>
                )}
              </div>
              {/* Online Indicator Dot */}
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2",
                isPrimaryHeader ? "border-emerald-800" : "border-white"
              )} />
            </div>

            {/* User Name & Role */}
            <div className="flex flex-col hidden sm:flex min-w-0 max-w-[180px] md:max-w-[240px] xl:max-w-[320px] text-left">
              <span 
                className={cn(
                  "text-[12px] font-bold leading-tight truncate tracking-tight",
                  isPrimaryHeader ? "text-white" : "text-slate-900"
                )}
                title={currentUser?.name || appSettings?.appName}
              >
                {currentUser?.name || appSettings?.appName}
              </span>
              <div className="flex items-center gap-1 mt-0.5 min-w-0">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  isPrimaryHeader ? "bg-emerald-300" : "bg-primary"
                )} />
                <span 
                  className={cn(
                    "text-[10px] font-medium leading-tight truncate",
                    isPrimaryHeader ? "text-emerald-100/90" : "text-slate-500"
                  )}
                  title={activeRoleLabel}
                >
                  {activeRoleLabel}
                </span>
              </div>
            </div>

            {/* Interactive Chevron indicator */}
            <div className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-transform duration-200 hidden sm:flex ml-0.5",
              isPrimaryHeader ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-500"
            )}>
              <ChevronDown 
                size={12} 
                strokeWidth={2.6} 
                className={cn("transition-transform duration-200", showProfileMenu ? "rotate-180" : "")} 
              />
            </div>
          </div>

          {/* Profile Popover Dropdown */}
          {showProfileMenu && (
            <div
              ref={profileMenuRef}
              className="absolute right-0 top-12 w-72 bg-white text-slate-800 border border-slate-200/90 rounded-2xl shadow-xl p-2 z-[9999] animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col gap-1.5"
            >
              {/* Header inside popover */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/80 flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0 overflow-hidden border border-emerald-200/70">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(currentUser?.name)}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-black text-slate-900 truncate leading-tight">
                    {currentUser?.name || "Pengguna"}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md truncate max-w-[140px]">
                      {activeRoleLabel}
                    </span>
                  </div>
                  {(currentUser?.nip || currentUser?.code || currentUser?.username) && (
                    <span className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">
                      ID: {currentUser?.nip || currentUser?.code || currentUser?.username}
                    </span>
                  )}
                </div>
              </div>

              {/* Action list */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenProfile?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer border-none bg-transparent text-left"
                >
                  <UserCog size={15} className="text-slate-500 shrink-0" strokeWidth={2.2} />
                  <div className="flex flex-col min-w-0">
                    <span className="leading-tight">Edit Profil &amp; Akun</span>
                    <span className="text-[9.5px] text-slate-400 font-normal leading-tight">Ganti nama, avatar, atau kata sandi</span>
                  </div>
                </button>

                {workspaceGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenGuide?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer border-none bg-transparent text-left"
                  >
                    <HelpCircle size={15} className="text-slate-500 shrink-0" strokeWidth={2.2} />
                    <div className="flex flex-col min-w-0">
                      <span className="leading-tight">Panduan Sistem</span>
                      <span className="text-[9.5px] text-slate-400 font-normal leading-tight">Bantuan cara penggunaan fitur</span>
                    </div>
                  </button>
                )}

                <div className="h-px bg-slate-100 my-0.5" />

                {typeof handleLogout === 'function' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors text-xs font-semibold cursor-pointer border-none bg-transparent text-left"
                  >
                    <LogOut size={15} className="text-rose-500 shrink-0" strokeWidth={2.2} />
                    <div className="flex flex-col min-w-0">
                      <span className="leading-tight font-bold">Keluar Sistem</span>
                      <span className="text-[9.5px] text-rose-400 font-normal leading-tight">Akhiri sesi login saat ini</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Header Logout Button (Desktop & Mobile) */}
        {typeof handleLogout === 'function' && (
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-xl transition-all cursor-pointer shrink-0 shadow-xs active:scale-95",
              isPrimaryHeader
                ? "bg-white/15 hover:bg-rose-500 text-white border border-white/25 hover:border-rose-400"
                : "bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/90 hover:border-rose-200 shadow-2xs"
            )}
            title="Keluar Sistem"
            aria-label="Keluar Sistem"
          >
            <LogOut size={15} strokeWidth={2.4} />
          </button>
        )}
      </div>

    </header>
  );
};

export { GlobalHeaderPortals as AdminHeader, GuidePortalButton };

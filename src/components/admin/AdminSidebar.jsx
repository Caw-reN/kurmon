import React, { useRef, useState, useEffect } from'react';
import { cn } from'@/lib/utils';
import { Calendar, CalendarDays, Users, BookOpen, LayoutDashboard, Settings, MessageSquare, History, SlidersHorizontal, Clock, FileText, FileSpreadsheet, DoorOpen, User, UserPlus, AppWindow, PieChart, Wand2, MonitorSmartphone, CheckCircle2, FolderOpen, Phone, Briefcase, Shield, ShieldAlert, Activity, HardDrive, GraduationCap, Building2, DatabaseBackup, UserCog, ClipboardList, Trophy, UserMinus, ChevronDown, X, RefreshCw, LogOut, PanelLeftClose, PanelLeftOpen } from'lucide-react';


export default function AdminSidebar({
  isMobileMenuOpen, setIsMobileMenuOpen,
  isSidebarCollapsed, toggleSidebar,
  appSettings, currentUser, uiFontClass,
  activeTab, setActiveTab,
  renderNavItem,
  hasAnyConfigAccess,
  handleLogout,
  expandedGroups,
  toggleGroup,
  isSuperAdminRole,
  activeUserRole,
  handleBackupExport,
  isBackingUp,
  sidebarScrollRef,
  sidebarScrollPos
}) {
  
  const isCollapsed = isSidebarCollapsed && !isMobileMenuOpen;
  const fallbackScrollRef = useRef(null);
  const fallbackScrollPos = useRef(0);
  const refToUse = sidebarScrollRef || fallbackScrollRef;
  const posToUse = sidebarScrollPos || fallbackScrollPos;
  const [hasPiket, setHasPiket] = useState(false);

  // Restore scroll position on mount
  useEffect(() => {
    const savedPos = sessionStorage.getItem("admin_sidebar_scroll_top");
    if (savedPos && refToUse.current) {
      refToUse.current.scrollTop = parseInt(savedPos, 10);
    }
  }, [refToUse]);

  // Scroll active item into view on mount or tab change
  useEffect(() => {
    if (refToUse.current) {
      const timer = setTimeout(() => {
        if (!refToUse.current) return;
        const activeEl = refToUse.current.querySelector(".bg-primary\\/10, .bg-accent\\/15");
        if (activeEl) {
          activeEl.scrollIntoView({ block:"nearest", behavior:"smooth" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, refToUse]);

  useEffect(() => {
    if (activeUserRole ==="guru" && (currentUser?.code || currentUser?.id)) {
      const storageSession = localStorage.getItem('school_schedule_session_v1') || sessionStorage.getItem('school_schedule_session_v1');
      if (storageSession) {
        try {
          const session = JSON.parse(storageSession);
          const authToken = session?.authToken;
          if (authToken) {
            const controller = new AbortController();
            fetch('/api/kedisiplinan/jadwal', {
              headers: {'Authorization': `Bearer ${authToken}` },
              signal: controller.signal
            })
            .then(r => r.json())
            .then(res => {
              if (res.ok && Array.isArray(res.data)) {
                const teacherCode = currentUser.code || currentUser.id;
                const hasSched = res.data.some(s => {
                  let ids = s.guru_ids;
                  if (typeof ids ==="string") {
                    try { ids = JSON.parse(ids); } catch { /* intentionally ignore invalid JSON */ }
                  }
                  return Array.isArray(ids) && ids.some(id => String(id).trim().toLowerCase() === String(teacherCode).trim().toLowerCase());
                });
                setHasPiket(hasSched);
              }
            })
            .catch(err => { if (err.name !=='AbortError') console.error(err); });
            return () => controller.abort();
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [activeUserRole, currentUser]);


  const activeUserDivision = (currentUser?.division ||"kurikulum").toLowerCase();
  const SidebarSection = ({ label }) => {
    if (isCollapsed) return null;
    return (
      <div className="mt-2.5 mb-1 px-3 flex items-center">
        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
          {label}
        </span>
      </div>
    );
  };

  const SidebarGroup = ({ label, icon: Icon, isOpen, onToggle, children }) => {
    return (
      <div className="mb-1 w-full">
        <button
          onClick={onToggle}
          type="button"
          className={cn("group relative mb-1 flex w-full items-center justify-between rounded-md border-none","px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all cursor-pointer","hover:bg-muted hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2.5">
            {Icon && <Icon size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />}
            <span>{label}</span>
          </div>
          <ChevronDown
            size={14}
            className={cn("text-muted-foreground group-hover:text-foreground transition-transform duration-200", isOpen ?"rotate-0" :"-rotate-90")}
          />
        </button>
        <div
          className="overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out ml-5.5 pl-3 border-l border-slate-200/60 flex flex-col gap-1 sidebar-submenus"
          style={{
            maxHeight: isOpen ?"1000px" :"0px",
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ?"auto" :"none",
            marginTop: isOpen ?"2px" :"0px",
            marginBottom: isOpen ?"2px" :"0px",
          }}
        >
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { isSubMenu: true });
            }
            return child;
          })}
        </div>
      </div>
    );
  };

  return (
    <aside
      className={cn("app-sidebar border-r border-border bg-card flex flex-col shrink-0 relative transition-all duration-300 ease-in-out",
        isCollapsed ?"w-[68px]" :"w-[268px]",
        isMobileMenuOpen ?"fixed inset-y-0 left-0 z-50 shadow-sm translate-x-0" :"hidden lg:flex z-30 -translate-x-full lg:translate-x-0"
      )}
    >
      <div className={cn("flex items-center shrink-0 relative z-10 bg-transparent transition-all h-[80px] border-none px-[18px]",
        isCollapsed &&"justify-center px-4"
      )}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity min-w-0 w-full justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {appSettings.sidebarLogoMode !=="text" && (
                <img
                  src={appSettings.logoWebUrl || appSettings.logoUrl || appSettings.faviconImage ||"/favicon.svg"}
                  alt="Brand Logo"
                  className="w-11 h-11 object-contain shrink-0 rounded-[var(--ui-radius-small)]"
                />
              )}
              {appSettings.sidebarLogoMode !=="logo" && (
                <div className="flex flex-col min-w-0 leading-tight select-none">
                  <span className="font-extrabold text-slate-800 text-[14px] tracking-tight truncate">
                    {appSettings.appName ||"My Workspace"}
                  </span>
                  {appSettings.appSubtitle && (
                    <span className="text-[10px] font-semibold text-slate-400 tracking-tight truncate mt-0.5">
                      {appSettings.appSubtitle}
                    </span>
                  )}
                </div>
              )}
            </div>
            {isMobileMenuOpen ? (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200/80 rounded-[var(--ui-radius-small)] lg:hidden border-none cursor-pointer flex items-center justify-center"
                title="Tutup Menu"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-[var(--ui-radius-small)] hidden lg:flex border border-slate-200/60 cursor-pointer items-center justify-center transition-all shrink-0 active:scale-95 shadow-2xs"
                title="Sembunyikan Sidebar"
              >
                <PanelLeftClose size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <img
              src={appSettings.logoWebUrl || appSettings.logoUrl || appSettings.faviconImage ||"/favicon.svg"}
              alt="Brand Logo"
              className="w-11 h-11 object-contain shrink-0 rounded-[var(--ui-radius-small)] cursor-pointer hover:opacity-85 transition-opacity"
              onClick={toggleSidebar}
            />
          </div>
        )}
      </div>

      <nav
        ref={refToUse}
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop;
          posToUse.current = scrollTop;
          sessionStorage.setItem("admin_sidebar_scroll_top", scrollTop);
        }}
        className="flex-1 px-[18px] overflow-y-auto hide-scrollbar pt-3 pb-6 relative z-10 transition-all"
      >
        {activeUserRole ==="guru" ? (
          <>
            {renderNavItem({
              id:"dashboard",
              icon: LayoutDashboard,
              label:"Dashboard"
            })}
            <SidebarSection label="Jadwal & Agenda" />
            {renderNavItem({
              id:"generate",
              icon: Calendar,
              label:"Jadwal Mengajar"
            })}
            {renderNavItem({
              id:"akademik",
              icon: CalendarDays,
              label:"Kalender Akademik"
            })}
            {renderNavItem({
              id:"ketersediaan",
              icon: Clock,
              label:"Ketersediaan Saya"
            })}
            <SidebarSection label="Pembelajaran" />
            {renderNavItem({
              id:"silabus",
              icon: FileText,
              label:"Silabus Akademik"
            })}
            {renderNavItem({
              id:"rpp_guru",
              icon: FileSpreadsheet,
              label:"Silabus & Perangkat Guru"
            })}
            {renderNavItem({
              id:"modul_ajar",
              icon: FileText,
              label:"Modul Ajar"
            })}
            {renderNavItem({
              id:"jurnal_harian",
              icon: BookOpen,
              label:"Jurnal Harian KBM"
            })}
            {renderNavItem({
              id:"beban",
              icon: FileSpreadsheet,
              label:"Beban Mengajar"
            })}

            <SidebarSection label="Kehadiran" />
            {renderNavItem({
              id:"absensiguru",
              icon: CheckCircle2,
              label:"Absensi Fingerprint",
              featureKey:"attendance"
            })}
            {currentUser?.isWalas && (
              <>
                <SidebarSection label="Wali Kelas" />
                {renderNavItem({
                  id:"hikvision_report_siswa",
                  icon: FileText,
                  label: `Laporan ${currentUser.walasClass}`
                })}
                {renderNavItem({
                  id:"catatan_walikelas",
                  icon: MessageSquare,
                  label:"Catatan Wali Kelas"
                })}
              </>
            )}
            <SidebarSection label="Kesiswaan & Piket" />
            {renderNavItem({
              id:"siswa",
              icon: GraduationCap,
              label:"Data Siswa"
            })}
            {renderNavItem({
              id:"riwayat_prestasi",
              icon: History,
              label:"Riwayat Prestasi"
            })}
            {renderNavItem({
              id:"siswa_keluar",
              icon: UserMinus,
              label:"Mutasi & Alumni Siswa"
            })}
            {renderNavItem({
              id:"kedisiplinan_bpbk",
              icon: BookOpen,
              label:"Bimbingan Konseling"
            })}
            {renderNavItem({
              id:"kedisiplinan_piket",
              icon: ClipboardList,
              label:"Piket & Pelanggaran"
            })}
            {renderNavItem({
              id:"tatib_skor",
              icon: BookOpen,
              label:"Skor Kredit & Tatib"
            })}
            {renderNavItem({
              id:"walas_report",
              icon: FileText,
              label:"Laporan Rekap Wali Kelas"
            })}
            <SidebarSection label="Komunikasi" />
            {renderNavItem({
              id:"pesan",
              icon: MessageSquare,
              label:"Pesan Dashboard",
              featureKey:"dashboardMessages"
            })}
          </>
        ) : activeUserRole ==="kepsek" ? (
          <>
            {renderNavItem({
              id:"dashboard",
              icon: LayoutDashboard,
              label:"Dashboard",
              roles: ["kepsek"]
            })}
            <SidebarSection label="Monitoring Sekolah" />
            {renderNavItem({
              id:"siswa",
              icon: GraduationCap,
              label:"Data Siswa",
              roles: ["kepsek"]
            })}
            {renderNavItem({
              id:"guru",
              icon: Users,
              label:"Data Guru",
              roles: ["kepsek"]
            })}
            {renderNavItem({
              id:"kelas",
              icon: Users,
              label:"Data Kelas",
              roles: ["kepsek"]
            })}
            {renderNavItem({
              id:"generate",
              icon: Calendar,
              label:"Jadwal Pelajaran",
              roles: ["kepsek"]
            })}
            {renderNavItem({
              id:"modul_ajar",
              icon: FileText,
              label:"Modul Ajar Guru",
              roles: ["kepsek"]
            })}
            {renderNavItem({
              id:"absensi",
              icon: CheckCircle2,
              label:"Rekap Absensi",
              roles: ["kepsek"],
              featureKey:"attendance"
            })}
            <SidebarSection label="Monitoring PKL & Hubin" />
            {renderNavItem({
              id:"pkl_dashboard",
              icon: LayoutDashboard,
              label:"Monitoring",
              roles: ["kepsek"],
              featureKey:"pkl_dashboard"
            })}
            {renderNavItem({
              id:"pkl_data_siswa",
              icon: Users,
              label:"Data Siswa PKL",
              roles: ["kepsek"],
              featureKey:"pkl_data_siswa"
            })}
            {renderNavItem({
              id:"pkl_data_perusahaan",
              icon: Briefcase,
              label:"Data Perusahaan",
              roles: ["kepsek"],
              featureKey:"pkl_data_perusahaan"
            })}
            {renderNavItem({
              id:"pkl_penugasan",
              icon: Wand2,
              label:"Penugasan Guru",
              roles: ["kepsek"],
              featureKey:"pkl_penugasan"
            })}

            {renderNavItem({
              id:"pkl_administrasi",
              icon: FileText,
              label:"Administrasi PKL",
              roles: ["kepsek"],
              featureKey:"pkl_administrasi"
            })}
            {renderNavItem({
              id:"pkl_jurnal",
              icon: BookOpen,
              label:"Jurnal Siswa",
              roles: ["kepsek"],
              featureKey:"pkl_jurnal"
            })}

            <SidebarSection label="Monitoring Kesiswaan" />
            {renderNavItem({
              id:"kedisiplinan_absensi",
              icon: ClipboardList,
              label:"Kehadiran Siswa",
              roles: ["kepsek"]
            })}
            {renderNavItem({
              id:"kedisiplinan_bpbk",
              icon: ShieldAlert,
              label:"Rekap BK",
              roles: ["kepsek"]
            })}
            {renderNavItem({
              id:"kedisiplinan_piket",
              icon: ClipboardList,
              label:"Piket & Pelanggaran",
              roles: ["kepsek"]
            })}
            {renderNavItem({
              id:"riwayat_prestasi",
              icon: History,
              label:"Riwayat Prestasi",
              roles: ["kepsek"]
            })}
            <SidebarSection label="Laporan Kelas" />
            {renderNavItem({
              id:"catatan_walikelas",
              icon: MessageSquare,
              label:"Catatan Wali Kelas",
              roles: ["kepsek"]
            })}
            {renderNavItem({
              id:"walas_report",
              icon: FileText,
              label:"Laporan Rekap Walas",
              roles: ["kepsek"]
            })}
            <SidebarSection label="Komunikasi" />
            {renderNavItem({
              id:"pesan",
              icon: MessageSquare,
              label:"Pesan Dashboard",
              roles: ["kepsek"],
              featureKey:"dashboardMessages"
            })}
          </>
        ) : activeUserRole ==="tu" ? (
          <>
            {renderNavItem({
              id:"dashboard",
              icon: LayoutDashboard,
              label:"Dashboard",
              roles: ["tu"]
            })}
            <SidebarSection label="Data Master" />
            {renderNavItem({
              id:"jurusan",
              icon: SlidersHorizontal,
              label:"Data Jurusan",
              roles: ["tu"]
            })}
            {renderNavItem({
              id:"kelas",
              icon: Users,
              label:"Data Kelas",
              roles: ["tu"]
            })}
            {renderNavItem({
              id:"siswa",
              icon: GraduationCap,
              label:"Data Siswa",
              roles: ["tu"]
            })}
            {renderNavItem({
              id:"guru",
              icon: Users,
              label:"Data Guru",
              roles: ["tu"]
            })}
            {renderNavItem({
              id:"karyawan",
              icon: Briefcase,
              label:"Data Karyawan",
              roles: ["tu"]
            })}
            <SidebarSection label="Administrasi & Absensi" />
            {renderNavItem({
              id:"laporan_absensi",
              icon: ClipboardList,
              label:"Laporan Absensi",
              roles: ["tu"]
            })}
            {renderNavItem({
              id:"absensi",
              icon: CheckCircle2,
              label:"Absensi Mesin",
              roles: ["tu"],
              featureKey:"attendance"
            })}
            {renderNavItem({
              id:"kedisiplinan_absensi",
              icon: ClipboardList,
              label:"Kehadiran Siswa",
              roles: ["tu"]
            })}
            {renderNavItem({
              id:"esurat",
              icon: FileText,
              label:"E-Surat",
              roles: ["tu"]
            })}
            {renderNavItem({
              id:"kartu_pelajar",
              icon: Users,
              label:"Kartu Pelajar",
              roles: ["tu"]
            })}
            {renderNavItem({
              id:"siswa_keluar",
              icon: UserMinus,
              label:"Mutasi & Alumni Siswa",
              roles: ["tu"]
            })}
            {renderNavItem({
              id:"riwayat_prestasi",
              icon: History,
              label:"Riwayat Prestasi",
              roles: ["tu"]
            })}
          </>
        ) : activeUserRole ==="karyawan" ? (
          <>
            {renderNavItem({
              id:"dashboard",
              icon: LayoutDashboard,
              label:"Dashboard"
            })}
            <SidebarSection label="Kehadiran & Laporan" />
            {renderNavItem({
              id:"absensiguru",
              icon: CheckCircle2,
              label:"Absensi Fingerprint Saya",
              featureKey:"attendance"
            })}
            {renderNavItem({
              id:"laporan_absensi",
              icon: ClipboardList,
              label:"Laporan Absensi"
            })}
          </>
        ) : activeUserRole ==="waka" ? (
          <>
            {renderNavItem({
              id:"dashboard",
              icon: LayoutDashboard,
              label:"Dashboard",
              roles: ["waka"]
            })}
            {(currentUser?.isWalas || currentUser?.walasClass) && (
              <>
                <SidebarSection label={`Wali Kelas (${currentUser.walasClass || 'Kelas Ampuan'})`} />
                {renderNavItem({
                  id: "hikvision_report_siswa",
                  icon: ClipboardList,
                  label: `Laporan ${currentUser.walasClass || 'Kelas Saya'}`,
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id: "catatan_walikelas",
                  icon: MessageSquare,
                  label: `Catatan ${currentUser.walasClass || 'Kelas Saya'}`,
                  roles: ["waka"]
                })}
              </>
            )}
            {activeUserDivision ==="kesiswaan" ? (
              <>
                <SidebarSection label="Kesiswaan & BK" />
                {renderNavItem({
                  id:"siswa",
                  icon: GraduationCap,
                  label:"Data Siswa",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"hikvision_report_siswa",
                  icon: CheckCircle2,
                  label:"Kehadiran Siswa",
                  roles: ["waka"],
                  featureKey:"attendance"
                })}
                {renderNavItem({
                  id:"riwayat_prestasi",
                  icon: History,
                  label:"Riwayat Prestasi",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"akademik",
                  icon: CalendarDays,
                  label:"Kalender Akademik",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"pesan",
                  icon: MessageSquare,
                  label:"Pesan Dashboard",
                  roles: ["waka"],
                  featureKey:"dashboardMessages"
                })}
                <SidebarSection label="Kedisiplinan" />
                {renderNavItem({
                  id:"kedisiplinan_piket",
                  icon: UserPlus,
                  label:"Piket & Pelanggaran",
                  roles: ["waka"]
                })}
                 {renderNavItem({
                   id:"kedisiplinan_bpbk",
                   icon: ShieldAlert,
                   label:"Catatan BP/BK",
                   roles: ["waka"]
                 })}
                 {renderNavItem({
                   id:"catatan_walikelas",
                   icon: MessageSquare,
                   label:"Catatan Wali Kelas",
                   roles: ["waka"]
                 })}

                 {renderNavItem({
                   id:"siswa_keluar",
                   icon: UserMinus,
                   label:"Siswa Keluar",
                   roles: ["waka"]
                 })}
                 {renderNavItem({
                   id:"tatib_skor",
                   icon: BookOpen,
                   label:"Skor Kredit & Tatib",
                   roles: ["waka"]
                 })}
              </>
            ) : activeUserDivision ==="sarpras" ? (
              <>
                <SidebarSection label="Sarana Prasarana" />
                {renderNavItem({
                  id:"ruangan",
                  icon: DoorOpen,
                  label:"Data Ruangan",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"denah",
                  icon: DoorOpen,
                  label:"Denah Ruangan",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"kelas",
                  icon: Users,
                  label:"Data Kelas",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"siswa",
                  icon: GraduationCap,
                  label:"Data Siswa",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"generate",
                  icon: Calendar,
                  label:"Jadwal Pelajaran",
                  roles: ["waka"]
                })}
                <SidebarSection label="Laporan & Komunikasi" />
                {renderNavItem({
                  id:"walas_report",
                  icon: FileText,
                  label:"Laporan Rekap Walas",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"catatan_walikelas",
                  icon: MessageSquare,
                  label:"Catatan Wali Kelas",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"akademik",
                  icon: CalendarDays,
                  label:"Kalender Akademik",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"pesan",
                  icon: MessageSquare,
                  label:"Pesan Dashboard",
                  roles: ["waka"],
                  featureKey:"dashboardMessages"
                })}
              </>
            ) : activeUserDivision ==="humas" ? (
              <>
                <SidebarSection label="Humas" />
                {renderNavItem({
                  id:"pesan",
                  icon: MessageSquare,
                  label:"Pesan Dashboard",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"tampilan",
                  icon: AppWindow,
                  label:"Tampilan Web",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"akademik",
                  icon: CalendarDays,
                  label:"Kalender Akademik",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"modul_ajar",
                  icon: FileText,
                  label:"Modul Ajar",
                  roles: ["waka"]
                })}
              </>
            ) : activeUserDivision ==="hubin" ? (
              <>
                <SidebarSection label="Monitoring PKL" />
                {renderNavItem({
                  id:"pkl_dashboard",
                  icon: LayoutDashboard,
                  label:"Monitoring",
                  roles: ["waka"],
                  featureKey:"pkl_dashboard"
                })}
                {renderNavItem({
                  id:"pkl_data_siswa",
                  icon: Users,
                  label:"Data Siswa PKL",
                  roles: ["waka"],
                  featureKey:"pkl_data_siswa"
                })}
                {renderNavItem({
                  id:"pkl_data_perusahaan",
                  icon: Briefcase,
                  label:"Data Perusahaan",
                  roles: ["waka"],
                  featureKey:"pkl_data_perusahaan"
                })}
                {renderNavItem({
                  id:"pkl_penugasan",
                  icon: Wand2,
                  label:"Penugasan Guru",
                  roles: ["waka"],
                  featureKey:"pkl_penugasan"
                })}

                {renderNavItem({
                  id:"pkl_administrasi",
                  icon: FileText,
                  label:"Administrasi PKL",
                  roles: ["waka"],
                  featureKey:"pkl_administrasi"
                })}
                {renderNavItem({
                  id:"pkl_jurnal",
                  icon: BookOpen,
                  label:"Jurnal Siswa",
                  roles: ["waka"],
                  featureKey:"pkl_jurnal"
                })}
                {renderNavItem({
                  id:"pkl_laporan",
                  icon: PieChart,
                  label:"Laporan PKL",
                  roles: ["waka"],
                  featureKey:"pkl_laporan"
                })}

                {renderNavItem({
                  id:"pkl_absensi_setting",
                  icon: Settings,
                  label:"Absensi GPS",
                  roles: ["waka"],
                  featureKey:"pkl_absensi_setting"
                })}
                <SidebarSection label="Komunikasi" />
                {renderNavItem({
                  id:"pesan",
                  icon: MessageSquare,
                  label:"Pesan Dashboard",
                  roles: ["waka"],
                  featureKey:"dashboardMessages"
                })}
              </>
            ) : (
              <>
                <SidebarSection label="Kurikulum" />
                {renderNavItem({
                  id:"generate",
                  icon: Calendar,
                  label:"Jadwal Pelajaran",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"ketersediaan",
                  icon: Clock,
                  label:"Ketersediaan Guru",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"beban",
                  icon: FileSpreadsheet,
                  label:"Beban Mengajar",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"pengaturan",
                  icon: Settings,
                  label:"Konfigurasi Waktu",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"advanced_rules",
                  icon: SlidersHorizontal,
                  label:"Aturan Penjadwalan",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"modul_ajar",
                  icon: FileText,
                  label:"Modul Ajar",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"jurnal_harian",
                  icon: BookOpen,
                  label:"Jurnal Harian Guru",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"akademik",
                  icon: CalendarDays,
                  label:"Kalender Akademik",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"kelas",
                  icon: Users,
                  label:"Data Kelas",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"siswa",
                  icon: GraduationCap,
                  label:"Data Siswa",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"guru",
                  icon: Users,
                  label:"Data Guru",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"karyawan",
                  icon: Users,
                  label:"Data Karyawan",
                  roles: ["waka"]
                })}
                {renderNavItem({
                  id:"mapel",
                  icon: BookOpen,
                  label:"Mata Pelajaran",
                  roles: ["waka"]
                })}
              </>
            )}
          </>
        ) : (
          <>
            {isSidebarCollapsed ? (
              <>
                {renderNavItem({
                  id:"dashboard",
                  icon: LayoutDashboard,
                  label:"Dashboard"
                })}

                {renderNavItem({
                  id:"jurusan",
                  icon: SlidersHorizontal,
                  label:"Data Jurusan"
                })}
                {renderNavItem({
                  id:"kelas",
                  icon: Users,
                  label:"Data Kelas"
                })}
                {renderNavItem({
                  id:"siswa",
                  icon: GraduationCap,
                  label:"Data Siswa"
                })}
                {renderNavItem({
                  id:"guru",
                  icon: Users,
                  label:"Data Guru"
                })}
                {renderNavItem({
                  id:"karyawan",
                  icon: Users,
                  label:"Data Karyawan"
                })}
                {renderNavItem({
                  id:"mapel",
                  icon: BookOpen,
                  label:"Mata Pelajaran"
                })}
                {renderNavItem({
                  id:"ruangan",
                  icon: DoorOpen,
                  label:"Data Ruangan"
                })}

                {renderNavItem({
                  id:"generate",
                  icon: Calendar,
                  label:"Generate Jadwal"
                })}
                {renderNavItem({
                  id:"ketersediaan",
                  icon: Clock,
                  label:"Ketersediaan Guru"
                })}
                {renderNavItem({
                  id:"beban",
                  icon: FileSpreadsheet,
                  label:"Beban Mengajar"
                })}
                {renderNavItem({
                  id:"pengaturan",
                  icon: Settings,
                  label:"Konfigurasi Waktu"
                })}
                {renderNavItem({
                  id:"advanced_rules",
                  icon: SlidersHorizontal,
                  label:"Aturan Penjadwalan"
                })}

                {renderNavItem({
                  id:"modul_ajar",
                  icon: FileText,
                  label:"Modul Ajar"
                })}
                {renderNavItem({
                  id:"absensi",
                  icon: CheckCircle2,
                  label:"Kehadiran Guru"
                })}



                {/* PKL */}
                {renderNavItem({
                  id:"pkl_dashboard",
                  icon: LayoutDashboard,
                  label:"Monitoring",
                  featureKey:"pkl_dashboard"
                })}
                {renderNavItem({
                  id:"pkl_data_siswa",
                  icon: Users,
                  label:"Data Siswa PKL",
                  featureKey:"pkl_data_siswa"
                })}
                {renderNavItem({
                  id:"pkl_data_perusahaan",
                  icon: Briefcase,
                  label:"Data Perusahaan",
                  featureKey:"pkl_data_perusahaan"
                })}
                {renderNavItem({
                  id:"pkl_penugasan",
                  icon: Wand2,
                  label:"Penugasan Guru",
                  featureKey:"pkl_penugasan"
                })}

                {renderNavItem({
                  id:"pkl_administrasi",
                  icon: FileText,
                  label:"Administrasi PKL",
                  featureKey:"pkl_administrasi"
                })}
                {renderNavItem({
                  id:"pkl_jurnal",
                  icon: BookOpen,
                  label:"Jurnal Siswa",
                  featureKey:"pkl_jurnal"
                })}

                {renderNavItem({
                  id:"pkl_absensi_setting",
                  icon: Settings,
                  label:"Absensi GPS",
                  featureKey:"pkl_absensi_setting"
                })}


                {/* PENGATURAN */}
                {renderNavItem({
                  id:"hikvision",
                  icon: LayoutDashboard,
                  label:"Dashboard Mesin"
                })}

                {renderNavItem({
                  id:"hikvision_students",
                  icon: Users,
                  label:"Data Pengguna Mesin"
                })}
                {renderNavItem({
                  id:"hikvision_devices",
                  icon: HardDrive,
                  label:"Pengaturan Alat"
                })}


                {renderNavItem({
                  id:"akademik",
                  icon: CalendarDays,
                  label:"Kalender Akademik"
                })}
                {renderNavItem({
                  id:"pesan",
                  icon: MessageSquare,
                  label:"Pengumuman Dashboard"
                })}
                {renderNavItem({
                  id:"fitur",
                  icon: SlidersHorizontal,
                  label:"Kontrol Fitur"
                })}
                {renderNavItem({
                  id:"hak_akses",
                  icon: UserCog,
                  label:"Hak Akses Role"
                })}
                {renderNavItem({
                  id:"tampilan",
                  icon: MonitorSmartphone,
                  label:"Tampilan Web"
                })}
                {renderNavItem({
                  id:"pengaturanuser",
                  icon: User,
                  label:"Pengaturan User"
                })}
              </>
            ) : (
              <>
                {renderNavItem({
                  id:"dashboard",
                  icon: LayoutDashboard,
                  label:"Dashboard"
                })}



                {/* --- DATA UTAMA --- */}
                <SidebarSection label="DATA UTAMA" />

                <SidebarGroup
                  label="Data Sekolah"
                  icon={FolderOpen}
                  isOpen={expandedGroups.dataMaster}
                  onToggle={() => toggleGroup("dataMaster")}
                >
                  {renderNavItem({
                    id:"jurusan",
                    icon: SlidersHorizontal,
                    label:"Data Jurusan"
                  })}
                  {renderNavItem({
                    id:"kelas",
                    icon: Users,
                    label:"Data Kelas"
                  })}
                  {renderNavItem({
                    id:"siswa",
                    icon: GraduationCap,
                    label:"Data Siswa"
                  })}
                  {renderNavItem({
                    id:"guru",
                    icon: Users,
                    label:"Data Guru",
                    roles: ["admin","superadmin","waka"]
                  })}
                  {renderNavItem({
                    id:"karyawan",
                    icon: Users,
                    label:"Data Karyawan",
                    roles: ["admin","superadmin","waka"]
                  })}
                  {renderNavItem({
                    id:"mapel",
                    icon: BookOpen,
                    label:"Mata Pelajaran"
                  })}

                  {renderNavItem({
                    id:"kenaikan_kelas",
                    icon: GraduationCap,
                    label:"Kenaikan Kelas"
                  })}
                </SidebarGroup>



                {/* --- MANAJEMEN SEKOLAH --- */}
                <SidebarSection label="MANAJEMEN SEKOLAH" />

                <SidebarGroup
                  label="Tata Usaha"
                  icon={Briefcase}
                  isOpen={expandedGroups.tataUsaha}
                  onToggle={() => toggleGroup("tataUsaha")}
                >
                  {renderNavItem({
                    id:"laporan_absensi",
                    icon: ClipboardList,
                    label:"Laporan Presensi & Absensi",
                    activeIds: ["laporan_absensi", "hikvision_report_guru", "hikvision_report_karyawan"],
                    roles: ["admin","superadmin","tata_usaha","waka"]
                  })}
                  {renderNavItem({ id:"struktur", icon: Briefcase, label:"Struktur Organisasi" })}
                  {renderNavItem({ id:"esurat", icon: FileText, label:"Administrasi E-Surat" })}
                  {renderNavItem({
                    id:"kartu_pelajar",
                    icon: Shield,
                    label:"Kartu Pelajar",
                    roles: ["admin","superadmin","waka","tata_usaha"]
                  })}
                </SidebarGroup>

                <SidebarGroup
                  label="Kurikulum"
                  icon={BookOpen}
                  isOpen={expandedGroups.kurikulum}
                  onToggle={() => toggleGroup("kurikulum")}
                >
                  {renderNavItem({
                    id:"generate",
                    icon: Calendar,
                    label:"Generate Jadwal"
                  })}
                  {renderNavItem({
                    id:"ketersediaan",
                    icon: Clock,
                    label:"Ketersediaan Guru"
                  })}
                  {renderNavItem({
                    id:"beban",
                    icon: FileSpreadsheet,
                    label:"Beban Mengajar"
                  })}
                  {renderNavItem({
                    id:"pengaturan",
                    icon: Settings,
                    label:"Konfigurasi Waktu"
                  })}
                  {renderNavItem({
                    id:"advanced_rules",
                    icon: SlidersHorizontal,
                    label:"Aturan Penjadwalan"
                  })}

                  {renderNavItem({
                    id:"modul_ajar",
                    icon: FileText,
                    label:"Modul Ajar"
                  })}
                  {renderNavItem({
                    id:"jurnal_harian",
                    icon: BookOpen,
                    label:"Jurnal Harian Guru"
                  })}
                </SidebarGroup>

                <SidebarGroup
                  label="Kesiswaan"
                  icon={Users}
                  isOpen={expandedGroups.kesiswaan}
                  onToggle={() => toggleGroup("kesiswaan")}
                >
                  {renderNavItem({
                    id:"hikvision_report_siswa",
                    icon: FileText,
                    label:"Absensi Siswa",
                    roles: ["admin","superadmin","waka","tata_usaha","guru"]
                  })}
                  {renderNavItem({
                    id:"kedisiplinan_piket",
                    icon: ShieldAlert,
                    label:"Piket & Pelanggaran",
                    roles: ["admin","superadmin","waka","guru"]
                  })}
                  {renderNavItem({
                    id:"kedisiplinan_bpbk",
                    icon: BookOpen,
                    label:"Bimbingan Konseling",
                    roles: ["admin","superadmin","waka","guru"]
                  })}
                  {renderNavItem({
                    id:"riwayat_prestasi",
                    icon: Trophy,
                    label:"Riwayat Prestasi",
                    roles: ["admin","superadmin","waka","guru","tata_usaha"]
                  })}
                  {renderNavItem({
                    id:"catatan_walikelas",
                    icon: MessageSquare,
                    label:"Catatan Wali Kelas",
                    roles: ["admin","superadmin","waka","guru"]
                  })}


                   {renderNavItem({
                     id:"siswa_keluar",
                     icon: UserMinus,
                     label:"Siswa Keluar",
                     roles: ["admin","superadmin","waka","tata_usaha"]
                   })}
                   {renderNavItem({
                     id:"tatib_skor",
                     icon: BookOpen,
                     label:"Skor Kredit & Tatib",
                     roles: ["admin","superadmin","waka","guru"]
                   })}
                </SidebarGroup>

                <SidebarGroup
                  label="Hubungan Industri"
                  icon={Briefcase}
                  isOpen={expandedGroups.hubin}
                  onToggle={() => toggleGroup("hubin")}
                >
                  {renderNavItem({
                    id:"pkl_dashboard",
                    icon: LayoutDashboard,
                    label:"Monitoring",
                    featureKey:"pkl_dashboard"
                  })}
                  {renderNavItem({
                    id:"pkl_data_siswa",
                    icon: Users,
                    label:"Data Siswa PKL",
                    featureKey:"pkl_data_siswa"
                  })}
                  {renderNavItem({
                    id:"pkl_data_perusahaan",
                    icon: Briefcase,
                    label:"Data Perusahaan",
                    featureKey:"pkl_data_perusahaan"
                  })}
                  {renderNavItem({
                    id:"pkl_penugasan",
                    icon: Wand2,
                    label:"Penugasan Guru",
                    featureKey:"pkl_penugasan"
                  })}

                  {renderNavItem({
                    id:"pkl_administrasi",
                    icon: FileText,
                    label:"Administrasi PKL",
                    featureKey:"pkl_administrasi"
                  })}
                  {renderNavItem({
                    id:"pkl_jurnal",
                    icon: BookOpen,
                    label:"Jurnal Siswa",
                    featureKey:"pkl_jurnal"
                  })}

                  {renderNavItem({
                    id:"pkl_absensi_setting",
                    icon: Settings,
                    label:"Absensi GPS",
                    featureKey:"pkl_absensi_setting"
                  })}
                </SidebarGroup>

                <SidebarGroup
                  label="Sarana & Prasarana"
                  icon={DoorOpen}
                  isOpen={expandedGroups.sarpras}
                  onToggle={() => toggleGroup("sarpras")}
                >
                  {renderNavItem({
                    id:"fasilitas",
                    icon: DoorOpen,
                    label:"Fasilitas & Ruangan"
                  })}
                </SidebarGroup>



                {/* --- PENGATURAN --- */}
                <SidebarSection label="PENGATURAN" />

                <SidebarGroup
                  label="Mesin Absensi"
                  icon={MonitorSmartphone}
                  isOpen={expandedGroups.absensi}
                  onToggle={() => toggleGroup("absensi")}
                >
                  {renderNavItem({
                    id:"hikvision",
                    icon: LayoutDashboard,
                    label:"Dashboard Mesin"
                  })}


                  {renderNavItem({
                    id:"hikvision_students",
                    icon: Users,
                    label:"Data Pengguna Mesin"
                  })}
                  {renderNavItem({
                    id:"hikvision_devices",
                    icon: HardDrive,
                    label:"Pengaturan Alat"
                  })}
                </SidebarGroup>

                <SidebarGroup
                  label="Informasi Umum"
                  icon={MessageSquare}
                  isOpen={expandedGroups.informasiUmum}
                  onToggle={() => toggleGroup("informasiUmum")}
                >
                  {renderNavItem({ id:"profil_sekolah", icon: Building2, label:"Profil Instansi" })}
                  {renderNavItem({ id:"akademik", icon: CalendarDays, label:"Kalender Akademik" })}
                  {renderNavItem({ id:"pesan", icon: MessageSquare, label:"Pusat Pesan" })}

                </SidebarGroup>


                <SidebarGroup
                  label="Konfigurasi Sistem"
                  icon={Settings}
                  isOpen={expandedGroups.sistem}
                  onToggle={() => toggleGroup("sistem")}
                >
                  {renderNavItem({
                    id: "manajemen_role",
                    icon: Shield,
                    label: "Struktur & Jabatan Staf",
                    roles: ["admin"]
                  })}
                  {renderNavItem({
                    id: "hak_akses",
                    icon: UserCog,
                    label: "Hak Akses & Matriks Izin",
                    activeIds: ["hak_akses", "pengaturanuser", "audit_log"],
                    roles: ["admin"]
                  })}
                  {renderNavItem({
                    id: "fitur",
                    icon: SlidersHorizontal,
                    label: "Sistem & Integrasi",
                    activeIds: ["fitur", "tampilan", "api_keys", "whatsapp", "gdrive_backup"],
                    roles: ["admin"]
                  })}
                </SidebarGroup>
              </>
            )}
          </>
        )}

        {hasAnyConfigAccess() && (
          <>

            <SidebarGroup
              label="Konfigurasi Sistem"
              icon={Settings}
              isOpen={expandedGroups.sistem}
              onToggle={() => toggleGroup("sistem")}
            >
              {renderNavItem({
                id:"fitur",
                icon: SlidersHorizontal,
                label:"Kontrol Fitur",
                roles: ["admin"]
              })}
              {renderNavItem({
                id:"hak_akses",
                icon: UserCog,
                label:"Hak Akses Role",
                roles: ["admin"]
              })}
              {renderNavItem({
                id:"tampilan",
                icon: MonitorSmartphone,
                label:"Tampilan Web",
                roles: ["admin"]
              })}
              {renderNavItem({
                id:"pengaturanuser",
                icon: User,
                label:"Pengaturan User",
                roles: ["admin"]
              })}
              <div className="h-px bg-slate-100/50 my-1 mx-2"></div>
              {renderNavItem({
                id:"api_keys",
                icon: Shield,
                label:"Manajemen API Key",
                roles: ["admin"]
              })}
              {renderNavItem({
                id:"whatsapp",
                icon: Phone,
                label:"Integrasi WhatsApp",
                roles: ["admin"]
              })}
              {renderNavItem({
                id:"gdrive_backup",
                icon: DatabaseBackup,
                label:"Backup Google Drive",
                roles: ["admin"]
              })}
              {renderNavItem({
                id:"audit_log",
                icon: Activity,
                label:"Log Aktivitas (Audit)",
                roles: ["admin"]
              })}
            </SidebarGroup>
          </>
        )}
      </nav>



      {/* Backup / Export Data - hanya untuk Admin/Superadmin */}
      {isSuperAdminRole(activeUserRole) && (
        <div
          className={`px-4 pb-2 shrink-0 ${isSidebarCollapsed ?"flex justify-center" :""}`}
        >
          {isSidebarCollapsed ? (
            <button
              onClick={handleBackupExport}
              disabled={isBackingUp}
              type="button"
              className="ui-control flex items-center justify-center p-3 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer bg-white w-11 h-11 rounded-[var(--ui-radius-small)] -[16px] disabled:opacity-50"
              title="Backup & Export Data"
            >
              {isBackingUp ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <DatabaseBackup size={18} />
              )}
            </button>
          ) : (
            <button
              onClick={handleBackupExport}
              disabled={isBackingUp}
              type="button"
              className="w-full flex items-center justify-center gap-2 p-2.5 text-secondary-foreground font-bold text-xs hover:bg-secondary/80 transition-all cursor-pointer bg-secondary rounded-[var(--ui-radius-small)] disabled:opacity-50 border-none"
            >
              {isBackingUp ? (
                <RefreshCw
                  size={15}
                  strokeWidth={2.5}
                  className="animate-spin"
                />
              ) : (
                <DatabaseBackup size={15} strokeWidth={2.5} />
              )}
              <span>
                {isBackingUp ?"Membackup..." :"Backup & Export Data"}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Footer Logout Button inside Sidebar */}
      <div className={cn("p-3 pt-2 border-t border-border/40 bg-card/80 shrink-0",
        isSidebarCollapsed ?"flex justify-center" :""
      )}>
        {isSidebarCollapsed ? (
          <button
            onClick={handleLogout}
            type="button"
            className="flex items-center justify-center p-2.5 text-rose-600 hover:text-red-700 hover:bg-red-100 transition-all cursor-pointer bg-red-50 w-10 h-10 rounded-[var(--ui-radius-small)] border-none"
            title="Keluar Sistem"
          >
            <LogOut size={16} />
          </button>
        ) : (
          <button
            onClick={handleLogout}
            type="button"
            className="w-full flex items-center justify-center gap-2 p-2.5 text-rose-600 font-bold text-xs hover:bg-red-100 hover:text-red-700 transition-all cursor-pointer bg-red-50 rounded-[var(--ui-radius-small)] border-none"
          >
            <LogOut size={15} strokeWidth={2.5} />
            <span>Keluar Sistem</span>
          </button>
        )}
      </div>
    </aside>
  );
}

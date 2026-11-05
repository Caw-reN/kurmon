import React from 'react';
import { 
  BookOpen, 
  PieChart, 
  ClipboardList, 
  MoreHorizontal,
  FileText,
  GraduationCap,
  Briefcase,
  Users,
  CheckCircle2,
  Calendar,
  Shield,
  MessageSquare,
  DoorOpen,
  School
} from 'lucide-react';
import { isSuperAdminRole } from '../../utils/constants.js';

/**
 * Solid Home Icon matching the screenshot exactly:
 * Vibrant filled green silhouette with rounded peak and corners when active,
 * clean slate outline when inactive.
 */
function HomeTabIcon({ isActive, size = 22, primaryColor = '#16a34a' }) {
  if (isActive) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        style={{ color: primaryColor, fill: primaryColor }}
        className="transition-all duration-200"
      >
        <path d="M12 2.69a1.75 1.75 0 0 1 1.13.41l7.2 6.01A1.75 1.75 0 0 1 21 10.43V19.5A2.5 2.5 0 0 1 18.5 22h-13A2.5 2.5 0 0 1 3 19.5v-9.07a1.75 1.75 0 0 1 .67-1.38l7.2-6.01a1.75 1.75 0 0 1 1.13-.35z" />
      </svg>
    );
  }
  return (
    <svg 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      fill="none" 
      stroke="#64748b" 
      strokeWidth={1.85} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="text-slate-500 transition-all duration-200"
    >
      <path d="M3 9.5l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

/**
 * AdminMobileNav — Native Mobile Bottom TabBar
 * Sesuai referensi: Beranda, Jurnal, Laporan, Piket, Menu
 * dengan rounded-t kurva halus, background putih, active solid green, dan label presisi.
 */
export default function AdminMobileNav({
  activeTab,
  setActiveTab,
  activeUserRole,
  activeUserDivision,
  currentUser,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  appSettings,
  checkIsAllowed,
}) {
  const primaryColor = appSettings?.primaryColor || '#16a34a';

  const getRoleTabs = () => {
    const role = (activeUserRole || currentUser?.role || '').toLowerCase();
    const div = (activeUserDivision || currentUser?.division || '').toLowerCase();
    const subrole = (currentUser?.subrole || '').toLowerCase();
    const isWalas = Boolean(currentUser?.isWalas || currentUser?.walasClass || subrole === 'walikelas');

    const isBKTeam = role === 'bpbk' || role === 'bk' || subrole === 'bpbk' || subrole === 'bk' ||
      div === 'bk' || div === 'bpbk' || Boolean(currentUser?.isBK || currentUser?.isBPBK);
    const isKesiswaanTeam = Boolean(currentUser?.isKesiswaan) || (
      (role === 'waka' && div === 'kesiswaan') ||
      role === 'kesiswaan' ||
      role === 'waka_kesiswaan' ||
      ['waka_kesiswaan', 'sekretaris_kesiswaan', 'anggota_kesiswaan', 'pembina_osis', 'sekretaris_osis'].includes(subrole) ||
      subrole.includes('kesiswaan') ||
      subrole.includes('osis') ||
      (role === 'guru' && (div === 'kesiswaan' || div === 'osis')) ||
      div === 'kesiswaan' ||
      div === 'osis'
    );
    const isKurikulumTeam = Boolean(currentUser?.isKurikulum) || (
      (role === 'waka' && (div === 'kurikulum' || !div)) ||
      role === 'kurikulum' ||
      role === 'waka_kurikulum' ||
      ['waka_kurikulum', 'sekretaris_kurikulum', 'anggota_kurikulum'].includes(subrole) ||
      subrole.includes('kurikulum') ||
      (role === 'guru' && div === 'kurikulum') ||
      div === 'kurikulum'
    );
    const isHubinTeam = (role === 'waka' && div === 'hubin') || role === 'hubin' || role === 'waka_hubin' ||
      ['waka_hubin', 'sekretaris_hubin', 'anggota_hubin'].includes(subrole) || div === 'hubin';
    const isSarprasTeam = (role === 'waka' && div === 'sarpras') || role === 'sarpras' || role === 'waka_sarpras' ||
      ['waka_sarpras', 'sekretaris_sarpras', 'anggota_sarpras'].includes(subrole) || div === 'sarpras';

    // Default 3 menu utama (Jurnal, Laporan, Piket/Jadwal)
    const canAccessPiket = typeof checkIsAllowed === 'function' ? checkIsAllowed('kedisiplinan_piket') : false;
    const defaultGuruAdminTabs = [
      { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
      { id: 'walas_report', icon: PieChart, label: 'Laporan' },
      canAccessPiket
        ? { id: 'kedisiplinan_piket', icon: ClipboardList, label: 'Piket' }
        : { id: 'generate', icon: Calendar, label: 'Jadwal' },
    ];

    if (isSuperAdminRole(role) || role === 'admin' || role === 'superadmin' || role === 'kepsek') {
      if (activeTab === 'absensiguru') {
        return [
          { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
          { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
          { id: 'walas_report', icon: PieChart, label: 'Laporan' },
        ];
      }
      return defaultGuruAdminTabs;
    }

    if (isBKTeam) {
      return [
        { id: 'kedisiplinan_bpbk', icon: Shield, label: 'Layanan BK' },
        { id: 'kedisiplinan_absensi', icon: CheckCircle2, label: 'Izin Siswa' },
        { id: 'hikvision_report_siswa', icon: ClipboardList, label: 'Presensi' },
      ];
    }

    if (isKesiswaanTeam) {
      return [
        { id: 'hikvision_report_siswa', icon: ClipboardList, label: 'Presensi' },
        { id: 'kedisiplinan_piket', icon: ClipboardList, label: 'Piket' },
        { id: 'kedisiplinan_absensi', icon: CheckCircle2, label: 'Izin Siswa' },
      ];
    }

    if (isHubinTeam) {
      return [
        { id: 'pkl_dashboard', icon: PieChart, label: 'PKL' },
        { id: 'pkl_data_perusahaan', icon: Briefcase, label: 'DUDI' },
        { id: 'pkl_jurnal', icon: BookOpen, label: 'Jurnal' },
      ];
    }

    if (isSarprasTeam) {
      return [
        { id: 'ruangan', icon: DoorOpen, label: 'Ruangan' },
        { id: 'denah', icon: School, label: 'Denah' },
        { id: 'generate', icon: Calendar, label: 'Jadwal' },
      ];
    }

    if (isKurikulumTeam) {
      return [
        { id: 'generate', icon: Calendar, label: 'Jadwal' },
        { id: 'rekap_jurnal_kelas', icon: BookOpen, label: 'Rekap Jurnal' },
        { id: 'hikvision_report_guru', icon: FileText, label: 'Absen Guru' },
      ];
    }

    if (role === 'tu' || role === 'tata_usaha') {
      return [
        { id: 'esurat', icon: FileText, label: 'E-Surat' },
        { id: 'siswa', icon: GraduationCap, label: 'Siswa' },
        { id: 'laporan_absensi', icon: PieChart, label: 'Laporan' },
      ];
    }

    if (role === 'karyawan') {
      return [
        { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
        { id: 'laporan_absensi', icon: PieChart, label: 'Laporan' },
        { id: 'akademik', icon: Calendar, label: 'Kalender' },
      ];
    }

    if (isWalas) {
      return [
        { id: 'catatan_walikelas', icon: MessageSquare, label: 'Catatan' },
        { id: 'walas_report', icon: PieChart, label: 'Laporan' },
        { id: 'kedisiplinan_absensi', icon: CheckCircle2, label: 'Izin Siswa' },
      ];
    }

    if (role === 'guru') {
      return [
        { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
        { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
        canAccessPiket
          ? { id: 'kedisiplinan_piket', icon: ClipboardList, label: 'Piket' }
          : { id: 'walas_report', icon: PieChart, label: 'Laporan' },
      ];
    }

    return defaultGuruAdminTabs;
  };

  const middleTabs = getRoleTabs();

  // 5 Tab Tetap: [Beranda, Jurnal, Laporan, Piket, Menu]
  const allTabs = [
    { id: 'dashboard', label: 'Beranda', isHome: true },
    ...middleTabs,
    { id: '__menu__', icon: MoreHorizontal, label: 'Menu', isMenuTrigger: true },
  ];

  const isAnyDirectTabActive = allTabs.some(
    t => !t.isMenuTrigger && (
      activeTab === t.id ||
      (t.id === 'dashboard' && (activeTab === 'overview' || activeTab === 'dashboard'))
    )
  );

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 w-full z-[100] print:hidden select-none pointer-events-auto"
      role="navigation"
      aria-label="Navigasi Mobile"
    >
      {/* Container TabBar: Lengkung halus atas (rounded-t-[26px]), putih murni, shadow lembut */}
      <div
        className="w-full bg-white rounded-t-[26px] border-t border-slate-100/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] px-2 pt-2.5 pb-[max(0.65rem,calc(env(safe-area-inset-bottom,0px)+0.4rem))]"
      >
        <div className="grid grid-cols-5 items-center">
          {allTabs.map(tab => {
            const isMenuTrigger = tab.isMenuTrigger;
            const isHome = tab.isHome;
            const isActive = isMenuTrigger
              ? (isMobileMenuOpen || !isAnyDirectTabActive)
              : (
                  activeTab === tab.id ||
                  (tab.id === 'dashboard' && (activeTab === 'overview' || activeTab === 'dashboard'))
                );

            const IconComponent = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  if (isMenuTrigger) {
                    if (setIsMobileMenuOpen) setIsMobileMenuOpen(prev => !prev);
                  } else {
                    setActiveTab(tab.id);
                    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
                  }
                }}
                className="flex flex-col items-center justify-center py-1 group cursor-pointer border-none bg-transparent min-w-0 transition-transform duration-150 active:scale-95 touch-manipulation focus:outline-none"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Icon Container */}
                <div className="h-6 w-6 flex items-center justify-center relative">
                  {isHome ? (
                    <HomeTabIcon isActive={isActive} size={22} primaryColor={primaryColor} />
                  ) : (
                    IconComponent && (
                      <IconComponent
                        size={21}
                        strokeWidth={isActive ? 2.2 : 1.85}
                        style={{
                          color: isActive ? primaryColor : '#64748b',
                        }}
                        className="transition-colors duration-200"
                      />
                    )
                  )}
                </div>

                {/* Label Text */}
                <span
                  className={`mt-1 block text-center text-[11px] leading-tight tracking-tight transition-colors duration-200 ${
                    isActive 
                      ? 'text-slate-900 font-extrabold' 
                      : 'text-slate-500 font-medium'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

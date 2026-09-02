import React from 'react';
import { 
  Home, 
  Calendar, 
  BookOpen, 
  PieChart, 
  Users, 
  CheckCircle2, 
  FileText, 
  GraduationCap, 
  Briefcase, 
  ClipboardList,
  MoreHorizontal
} from 'lucide-react';
import { isSuperAdminRole } from '../../utils/constants.js';

/**
 * AdminMobileNav — Floating or Fixed Bottom Navigation Dock / TabBar
 * Supports user preference switch: 'floating' (default) vs 'stay' (fixed full width).
 */
export default function AdminMobileNav({
  activeTab,
  setActiveTab,
  activeUserRole,
  activeUserDivision,
  currentUser,
  hasFeature,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  hasPiket,
  appSettings,
  checkIsAllowed,
}) {
  const [navStyle, setNavStyle] = React.useState(() => {
    return localStorage.getItem('kurmon_tabbar_nav_style') || appSettings?.tabbarStyle || 'top_line';
  });

  React.useEffect(() => {
    const handleStyleChange = () => {
      const saved = localStorage.getItem('kurmon_tabbar_nav_style') || appSettings?.tabbarStyle || 'top_line';
      setNavStyle(saved);
    };
    window.addEventListener('kurmon_tabbar_style_changed', handleStyleChange);
    return () => window.removeEventListener('kurmon_tabbar_style_changed', handleStyleChange);
  }, [appSettings?.tabbarStyle]);
  const getRoleTabs = () => {
    const role = (activeUserRole || currentUser?.role || '').toLowerCase();
    const div = (activeUserDivision || currentUser?.division || '').toLowerCase();
    const subrole = (currentUser?.subrole || '').toLowerCase().trim();

    let rawTabs = [];

    if (role === 'guru') {
      if (subrole === 'bpbk') {
        rawTabs = [
          { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
          { id: 'kedisiplinan_bpbk', icon: ClipboardList, label: 'BK' },
          { id: 'riwayat_prestasi', icon: FileText, label: 'Prestasi' },
          { id: 'modul_ajar', icon: FileText, label: 'Modul' },
        ];
      } else if (subrole === 'walikelas' || currentUser?.isWalas) {
        rawTabs = [
          { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
          { id: 'catatan_walikelas', icon: FileText, label: 'Catatan' },
          { id: 'walas_report', icon: PieChart, label: 'Laporan' },
          { id: 'kedisiplinan_piket', icon: ClipboardList, label: 'Piket' },
        ];
      } else if (subrole === 'sekretaris_kurikulum' || subrole === 'anggota_kurikulum') {
        rawTabs = [
          { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
          { id: 'silabus', icon: FileText, label: 'Silabus' },
          { id: 'modul_ajar', icon: FileText, label: 'Modul' },
          { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
        ];
      } else {
        rawTabs = [
          { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
          { id: 'generate', icon: Calendar, label: 'Jadwal' },
          { id: 'modul_ajar', icon: FileText, label: 'Modul' },
          { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
        ];
      }
    } else if (role === 'tu' || role === 'tata_usaha') {
      if (subrole === 'sekretaris_tu') {
        rawTabs = [
          { id: 'esurat', icon: FileText, label: 'E-Surat' },
          { id: 'siswa', icon: GraduationCap, label: 'Siswa' },
          { id: 'laporan_absensi', icon: ClipboardList, label: 'Absensi' },
          { id: 'kartu_pelajar', icon: Users, label: 'Kartu' },
        ];
      } else if (subrole === 'bendahara') {
        rawTabs = [
          { id: 'siswa', icon: GraduationCap, label: 'Siswa' },
          { id: 'guru', icon: Users, label: 'Guru' },
          { id: 'karyawan', icon: Briefcase, label: 'Karyawan' },
          { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
        ];
      } else {
        rawTabs = [
          { id: 'siswa', icon: GraduationCap, label: 'Siswa' },
          { id: 'laporan_absensi', icon: ClipboardList, label: 'Absensi' },
          { id: 'esurat', icon: FileText, label: 'E-Surat' },
          { id: 'kartu_pelajar', icon: Users, label: 'Kartu' },
        ];
      }
    } else if (role === 'karyawan') {
      rawTabs = [
        { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
        { id: 'laporan_absensi', icon: ClipboardList, label: 'Laporan' },
        { id: 'akademik', icon: Calendar, label: 'Kalender' },
        { id: 'pesan', icon: FileText, label: 'Pesan' },
      ];
    } else if (role === 'kepsek') {
      rawTabs = [
        { id: 'absensi', icon: CheckCircle2, label: 'Absensi' },
        { id: 'pkl_dashboard', icon: PieChart, label: 'PKL' },
        { id: 'walas_report', icon: PieChart, label: 'Laporan' },
        { id: 'pesan', icon: FileText, label: 'Pesan' },
      ];
    } else if (role === 'waka') {
      if (div === 'hubin') {
        rawTabs = [
          { id: 'pkl_dashboard', icon: PieChart, label: 'PKL' },
          { id: 'pkl_data_perusahaan', icon: Briefcase, label: 'DUDI' },
          { id: 'pkl_jurnal', icon: BookOpen, label: 'Jurnal' },
          { id: 'pesan', icon: FileText, label: 'Pesan' },
        ];
      } else if (div === 'kesiswaan') {
        rawTabs = [
          { id: 'absensi', icon: CheckCircle2, label: 'Absensi' },
          { id: 'kedisiplinan_piket', icon: ClipboardList, label: 'Piket' },
          { id: 'siswa', icon: GraduationCap, label: 'Siswa' },
          { id: 'tatib_skor', icon: FileText, label: 'Tatib' },
        ];
      } else if (div === 'sarpras') {
        rawTabs = [
          { id: 'ruangan', icon: Home, label: 'Ruangan' },
          { id: 'denah', icon: FileText, label: 'Denah' },
          { id: 'generate', icon: Calendar, label: 'Jadwal' },
          { id: 'siswa', icon: GraduationCap, label: 'Siswa' },
        ];
      } else if (div === 'humas') {
        rawTabs = [
          { id: 'pesan', icon: FileText, label: 'Pesan' },
          { id: 'akademik', icon: Calendar, label: 'Kalender' },
          { id: 'tampilan', icon: FileText, label: 'Tampilan' },
          { id: 'modul_ajar', icon: BookOpen, label: 'Modul' },
        ];
      } else {
        // Waka Kurikulum (default)
        rawTabs = [
          { id: 'generate', icon: Calendar, label: 'Jadwal' },
          { id: 'silabus', icon: BookOpen, label: 'Silabus' },
          { id: 'beban', icon: FileText, label: 'Beban' },
          { id: 'jurnal_harian', icon: ClipboardList, label: 'Jurnal' },
        ];
      }
    } else if (isSuperAdminRole(role)) {
      rawTabs = [
        { id: 'data_pegawai', icon: Users, label: 'Pegawai' },
        { id: 'generate', icon: Calendar, label: 'Jadwal' },
        { id: 'absensi', icon: CheckCircle2, label: 'Absensi' },
      ];
    } else {
      rawTabs = [
        { id: 'generate', icon: Calendar, label: 'Jadwal' },
        { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
        { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
      ];
    }

    if (checkIsAllowed) {
      return rawTabs.filter(tab => checkIsAllowed(tab.id, null));
    }
    return rawTabs;
  };

  const primaryRoleTabs = getRoleTabs().slice(0, 3);

  const allTabs = [
    { id: 'dashboard', icon: Home, label: 'Beranda' },
    ...primaryRoleTabs,
    { id: '__menu__', icon: MoreHorizontal, label: 'Menu', isMenuTrigger: true },
  ];

  const isAnyDirectTabActive = allTabs.some(
    t => !t.isMenuTrigger && (
      activeTab === t.id ||
      (t.id === 'dashboard' && (activeTab === 'overview' || activeTab === 'dashboard'))
    )
  );

  const isTopLineStyle = navStyle !== 'minimal';

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 w-full z-[100] print:hidden"
      role="navigation"
      aria-label="Navigasi Mobile"
    >
      <div
        className="flex items-stretch justify-around px-2 rounded-t-[20px]"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
          backgroundColor: 'var(--ui-card-bg, #ffffff)',
          borderTop: '1px solid var(--ui-border-soft, #e2e8f0)',
          boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.06)',
        }}
      >
        {allTabs.map(tab => {
          const isMenuTrigger = tab.isMenuTrigger;
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
              className="relative flex-1 flex flex-col items-center justify-start border-none cursor-pointer bg-transparent min-w-0 select-none touch-manipulation active:opacity-70 transition-opacity"
              style={{
                minHeight: '58px',
                paddingTop: '0px',
                paddingBottom: '4px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Gaya 2: Top Line Active Indicator */}
              {isTopLineStyle ? (
                <div className="w-full flex justify-center h-[3px] mb-2">
                  <div
                    style={{
                      height: '3px',
                      width: isActive ? '32px' : '0px',
                      backgroundColor: isActive ? 'var(--ui-primary, #059669)' : 'transparent',
                      borderRadius: '999px',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isActive ? '0 1px 6px color-mix(in srgb, var(--ui-primary, #059669) 50%, transparent)' : 'none',
                    }}
                  />
                </div>
              ) : (
                <div className="h-[7px] w-full" />
              )}

              {/* Icon Container with spacious margins */}
              <div className="flex items-center justify-center mb-1.5 mt-0.5">
                <IconComponent
                  size={21}
                  strokeWidth={isActive ? 2.3 : 1.75}
                  fill={isActive ? 'currentColor' : 'none'}
                  style={{
                    color: isActive ? 'var(--ui-primary, #059669)' : '#64748b',
                    transition: 'color 0.15s ease, transform 0.15s ease',
                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Label */}
              <span
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '10.5px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive
                    ? (isTopLineStyle ? 'var(--ui-primary, #059669)' : 'var(--ui-text-main, #0f172a)')
                    : '#64748b',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  paddingLeft: '2px',
                  paddingRight: '2px',
                  transition: 'color 0.15s ease',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

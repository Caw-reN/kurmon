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
}) {


  const getRoleTabs = () => {
    const role = (activeUserRole || currentUser?.role || '').toLowerCase();
    const div = (activeUserDivision || currentUser?.division || '').toLowerCase();
    const subrole = (currentUser?.subrole || '').toLowerCase().trim();

    if (role === 'guru') {
      // BP/BK: tampilkan menu kesiswaan
      if (subrole === 'bpbk') {
        return [
          { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
          { id: 'kedisiplinan_bpbk', icon: ClipboardList, label: 'BK' },
          { id: 'riwayat_prestasi', icon: FileText, label: 'Prestasi' },
          { id: 'modul_ajar', icon: FileText, label: 'Modul' },
        ];
      }
      // Wali Kelas: tambahkan menu kelas
      if (subrole === 'walikelas' || currentUser?.isWalas) {
        return [
          { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
          { id: 'catatan_walikelas', icon: FileText, label: 'Catatan' },
          { id: 'walas_report', icon: PieChart, label: 'Laporan' },
          { id: 'kedisiplinan_piket', icon: ClipboardList, label: 'Piket' },
        ];
      }
      // Guru Kurikulum subroles
      if (subrole === 'sekretaris_kurikulum' || subrole === 'anggota_kurikulum') {
        return [
          { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
          { id: 'silabus', icon: FileText, label: 'Silabus' },
          { id: 'modul_ajar', icon: FileText, label: 'Modul' },
          { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
        ];
      }
      // Guru umum default
      return [
        { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
        { id: 'generate', icon: Calendar, label: 'Jadwal' },
        { id: 'modul_ajar', icon: FileText, label: 'Modul' },
        { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
      ];
    }

    if (role === 'tu' || role === 'tata_usaha') {
      if (subrole === 'sekretaris_tu') {
        return [
          { id: 'esurat', icon: FileText, label: 'E-Surat' },
          { id: 'siswa', icon: GraduationCap, label: 'Siswa' },
          { id: 'laporan_absensi', icon: ClipboardList, label: 'Absensi' },
          { id: 'kartu_pelajar', icon: Users, label: 'Kartu' },
        ];
      }
      if (subrole === 'bendahara') {
        return [
          { id: 'siswa', icon: GraduationCap, label: 'Siswa' },
          { id: 'guru', icon: Users, label: 'Guru' },
          { id: 'karyawan', icon: Briefcase, label: 'Karyawan' },
          { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
        ];
      }
      return [
        { id: 'siswa', icon: GraduationCap, label: 'Siswa' },
        { id: 'laporan_absensi', icon: ClipboardList, label: 'Absensi' },
        { id: 'esurat', icon: FileText, label: 'E-Surat' },
        { id: 'kartu_pelajar', icon: Users, label: 'Kartu' },
      ];
    }

    if (role === 'karyawan') {
      return [
        { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
        { id: 'laporan_absensi', icon: ClipboardList, label: 'Laporan' },
        { id: 'akademik', icon: Calendar, label: 'Kalender' },
        { id: 'pesan', icon: FileText, label: 'Pesan' },
      ];
    }

    if (role === 'kepsek') {
      return [
        { id: 'absensi', icon: CheckCircle2, label: 'Absensi' },
        { id: 'pkl_dashboard', icon: PieChart, label: 'PKL' },
        { id: 'walas_report', icon: PieChart, label: 'Laporan' },
        { id: 'pesan', icon: FileText, label: 'Pesan' },
      ];
    }

    if (role === 'waka') {
      if (div === 'hubin') {
        return [
          { id: 'pkl_dashboard', icon: PieChart, label: 'PKL' },
          { id: 'pkl_data_perusahaan', icon: Briefcase, label: 'DUDI' },
          { id: 'pkl_jurnal', icon: BookOpen, label: 'Jurnal' },
          { id: 'pesan', icon: FileText, label: 'Pesan' },
        ];
      }
      if (div === 'kesiswaan') {
        return [
          { id: 'absensi', icon: CheckCircle2, label: 'Absensi' },
          { id: 'kedisiplinan_piket', icon: ClipboardList, label: 'Piket' },
          { id: 'siswa', icon: GraduationCap, label: 'Siswa' },
          { id: 'tatib_skor', icon: FileText, label: 'Tatib' },
        ];
      }
      if (div === 'sarpras') {
        return [
          { id: 'ruangan', icon: Home, label: 'Ruangan' },
          { id: 'denah', icon: FileText, label: 'Denah' },
          { id: 'generate', icon: Calendar, label: 'Jadwal' },
          { id: 'siswa', icon: GraduationCap, label: 'Siswa' },
        ];
      }
      if (div === 'humas') {
        return [
          { id: 'pesan', icon: FileText, label: 'Pesan' },
          { id: 'akademik', icon: Calendar, label: 'Kalender' },
          { id: 'tampilan', icon: FileText, label: 'Tampilan' },
          { id: 'modul_ajar', icon: BookOpen, label: 'Modul' },
        ];
      }
      // Waka Kurikulum (default)
      return [
        { id: 'generate', icon: Calendar, label: 'Jadwal' },
        { id: 'silabus', icon: BookOpen, label: 'Silabus' },
        { id: 'beban', icon: FileText, label: 'Beban' },
        { id: 'jurnal_harian', icon: ClipboardList, label: 'Jurnal' },
      ];
    }

    if (isSuperAdminRole(role)) return [
      { id: 'data_pegawai', icon: Users, label: 'Pegawai' },
      { id: 'generate', icon: Calendar, label: 'Jadwal' },
      { id: 'absensi', icon: CheckCircle2, label: 'Absensi' },
    ];

    return [
      { id: 'generate', icon: Calendar, label: 'Jadwal' },
      { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
      { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
    ];
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

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 w-full z-50 print:hidden"
      role="navigation"
      aria-label="Navigasi Mobile"
    >
      {/* Glass bar */}
      <div
        className="flex items-center justify-around gap-0 px-2 pt-2"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)',
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          borderTop: '0.5px solid rgba(0,0,0,0.1)',
          boxShadow: '0 -1px 0 rgba(0,0,0,0.04), 0 -8px 32px rgba(0,0,0,0.07)',
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
              className="relative flex-1 flex flex-col items-center justify-center border-none cursor-pointer bg-transparent min-w-0 select-none touch-manipulation"
              style={{
                minHeight: '50px',
                gap: '3px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Pill chip — icon container */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isActive ? '56px' : '40px',
                  height: '30px',
                  borderRadius: '999px',
                  background: isActive
                    ? 'var(--ui-primary, #059669)'
                    : 'transparent',
                  boxShadow: isActive
                    ? '0 2px 12px color-mix(in srgb, var(--ui-primary, #059669) 38%, transparent)'
                    : 'none',
                  transition: 'width 0.22s cubic-bezier(0.34,1.56,0.64,1), background 0.2s, box-shadow 0.2s',
                  willChange: 'width',
                }}
              >
                <IconComponent
                  size={isActive ? 19 : 22}
                  strokeWidth={isActive ? 2.5 : 1.7}
                  style={{
                    color: isActive ? '#ffffff' : '#9ca3af',
                    transition: 'color 0.18s, size 0.18s',
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
                  fontSize: isActive ? '10.5px' : '10px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--ui-primary, #059669)' : '#9ca3af',
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  paddingLeft: '2px',
                  paddingRight: '2px',
                  transition: 'color 0.18s, font-weight 0.18s',
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

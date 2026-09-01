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
      <div
        className="flex items-center justify-around px-1 pt-2"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)',
          backgroundColor: 'var(--ui-card-bg, #ffffff)',
          borderTop: '1px solid var(--ui-border-soft, #e2e8f0)',
          boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.04)',
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
              className="relative flex-1 flex flex-col items-center justify-center border-none cursor-pointer bg-transparent min-w-0 py-1 select-none touch-manipulation active:opacity-70 transition-opacity"
              style={{
                minHeight: '48px',
                gap: '4px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Icon */}
              <div className="flex items-center justify-center">
                <IconComponent
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  fill={isActive ? 'currentColor' : 'none'}
                  style={{
                    color: isActive ? 'var(--ui-primary, #059669)' : '#64748b',
                    transition: 'color 0.15s ease, transform 0.15s ease',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
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
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--ui-primary, #059669)' : '#64748b',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.1,
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

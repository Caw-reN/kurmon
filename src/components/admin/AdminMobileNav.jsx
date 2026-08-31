import React, { useState, useEffect } from 'react';
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
  Menu
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
  const [tabbarStyle, setTabbarStyle] = useState(() => {
    return localStorage.getItem('kurmon_tabbar_style') || 'floating';
  });

  useEffect(() => {
    const handleStyleChange = () => {
      const saved = localStorage.getItem('kurmon_tabbar_style') || 'floating';
      setTabbarStyle(saved);
    };
    window.addEventListener('kurmon_tabbar_style_changed', handleStyleChange);
    return () => window.removeEventListener('kurmon_tabbar_style_changed', handleStyleChange);
  }, []);

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

    if (isSuperAdminRole(role)) {
      return [
        { id: 'data_pegawai', icon: Users, label: 'Pegawai' },
        { id: 'generate', icon: Calendar, label: 'Jadwal' },
        { id: 'absensi', icon: CheckCircle2, label: 'Absensi' },
        { id: 'hak_akses', icon: FileText, label: 'Akses' },
      ];
    }

    return [
      { id: 'generate', icon: Calendar, label: 'Jadwal' },
      { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
      { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
      { id: 'walas_report', icon: PieChart, label: 'Laporan' },
    ];
  };

  const roleTabs = getRoleTabs();
  const primaryRoleTabs = roleTabs.slice(0, 3);

  const allTabs = [
    { id: 'dashboard', icon: Home, label: 'Beranda' },
    ...primaryRoleTabs,
    { id: '__menu__', icon: Menu, label: 'Menu', isMenuTrigger: true },
  ];

  const isAnyDirectTabActive = allTabs.some(t => !t.isMenuTrigger && (activeTab === t.id || (t.id === 'dashboard' && (activeTab === 'overview' || activeTab === 'dashboard'))));

  const containerClasses = tabbarStyle === 'stay'
    ? "lg:hidden fixed bottom-0 left-0 right-0 w-full bg-white/98 backdrop-blur-xl border-t border-slate-200/90 pt-1.5 px-2 pb-[calc(10px+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_24px_rgba(15,23,42,0.08)] z-50 flex items-center justify-around gap-1 text-center transition-all duration-300 pointer-events-auto select-none touch-manipulation"
    : "lg:hidden fixed bottom-[calc(10px+env(safe-area-inset-bottom,0px))] left-3 right-3 max-w-md mx-auto bg-white/98 backdrop-blur-xl border border-slate-200/90 rounded-[24px] p-1.5 shadow-[0_12px_36px_rgba(15,23,42,0.16),0_2px_8px_rgba(15,23,42,0.06)] z-50 flex items-center justify-around gap-1 text-center transition-all duration-300 pointer-events-auto select-none touch-manipulation";

  return (
    <div className={containerClasses} role="navigation" aria-label="Mobile Navigation">
      {allTabs.map(tab => {
        const isMenuTrigger = tab.isMenuTrigger;
        const isActive = isMenuTrigger
          ? (isMobileMenuOpen || !isAnyDirectTabActive)
          : (activeTab === tab.id || (tab.id === 'dashboard' && (activeTab === 'overview' || activeTab === 'dashboard')));

        const IconComponent = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (isMenuTrigger) {
                if (setIsMobileMenuOpen) {
                  setIsMobileMenuOpen(prev => !prev);
                }
              } else {
                setActiveTab(tab.id);
                if (setIsMobileMenuOpen) {
                  setIsMobileMenuOpen(false);
                }
              }
            }}
            className={`relative flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-[16px] transition-all duration-200 border-none cursor-pointer bg-transparent min-w-0 group active:scale-90 select-none ${
              isActive ? 'text-[var(--ui-primary)]' : 'text-slate-400 hover:text-slate-600'
            }`}
            style={{ minHeight: '50px' }}
          >
            {/* Pill Capsule Active Indicator */}
            <div className={`px-3 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
              isActive ? 'bg-[var(--ui-primary)]/12 shadow-2xs' : 'group-active:bg-slate-100'
            }`}>
              <IconComponent
                size={21}
                style={{ color: isActive ? 'var(--ui-primary)' : 'currentColor' }}
                className={`shrink-0 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`}
              />
            </div>
            <span className={`text-[10px] tracking-tight truncate w-full text-center leading-tight mt-0.5 ${
              isActive ? 'text-[var(--ui-primary)] font-black' : 'text-slate-500 font-semibold'
            }`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

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
  Menu,
  Sparkles,
  Zap,
  LogIn
} from 'lucide-react';
import { isSuperAdminRole } from '../../utils/constants.js';

/**
 * AdminMobileNav — Modern Floating Mobile TabBar with Elevated Center Action Button
 * Matches Landing Page mobile navigation aesthetic.
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
  const role = (activeUserRole || currentUser?.role || '').toLowerCase();
  const div = (activeUserDivision || currentUser?.division || '').toLowerCase();
  const subrole = (currentUser?.subrole || '').toLowerCase().trim();

  // Tentukan Tab Kiri (Slot 2), Tab Tengah (Elevated Center CTA), dan Tab Kanan (Slot 3) berdasarkan peran pengguna
  let leftTab = { id: 'generate', icon: Calendar, label: 'Jadwal' };
  let centerTab = { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' };
  let rightTab = { id: 'absensi', icon: CheckCircle2, label: 'Absensi' };

  if (role === 'guru') {
    if (subrole === 'bpbk') {
      leftTab = { id: 'kedisiplinan_bpbk', icon: ClipboardList, label: 'Buku BK' };
      centerTab = { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' };
      rightTab = { id: 'riwayat_prestasi', icon: FileText, label: 'Prestasi' };
    } else if (subrole === 'walikelas' || currentUser?.isWalas) {
      leftTab = { id: 'catatan_walikelas', icon: FileText, label: 'Catatan' };
      centerTab = { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' };
      rightTab = { id: 'walas_report', icon: PieChart, label: 'Laporan' };
    } else if (subrole === 'sekretaris_kurikulum' || subrole === 'anggota_kurikulum') {
      leftTab = { id: 'generate', icon: Calendar, label: 'Jadwal' };
      centerTab = { id: 'silabus', icon: FileText, label: 'Silabus' };
      rightTab = { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' };
    } else {
      leftTab = { id: 'generate', icon: Calendar, label: 'Jadwal' };
      centerTab = { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' };
      rightTab = { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' };
    }
  } else if (role === 'kepsek') {
    leftTab = { id: 'generate', icon: Calendar, label: 'Jadwal' };
    centerTab = { id: 'absensi', icon: CheckCircle2, label: 'Presensi' };
    rightTab = { id: 'walas_report', icon: PieChart, label: 'Laporan' };
  } else if (role === 'tu' || role === 'tata_usaha') {
    leftTab = { id: 'siswa', icon: GraduationCap, label: 'Siswa' };
    centerTab = { id: 'esurat', icon: FileText, label: 'E-Surat' };
    rightTab = { id: 'laporan_absensi', icon: ClipboardList, label: 'Absensi' };
  } else if (role === 'karyawan') {
    leftTab = { id: 'laporan_absensi', icon: ClipboardList, label: 'Laporan' };
    centerTab = { id: 'absensiguru', icon: CheckCircle2, label: 'Presensi' };
    rightTab = { id: 'akademik', icon: Calendar, label: 'Kalender' };
  } else if (role === 'waka') {
    if (div === 'hubin') {
      leftTab = { id: 'pkl_dashboard', icon: PieChart, label: 'PKL' };
      centerTab = { id: 'pkl_jurnal', icon: BookOpen, label: 'Jurnal' };
      rightTab = { id: 'pkl_data_perusahaan', icon: Briefcase, label: 'DUDI' };
    } else if (div === 'kesiswaan') {
      leftTab = { id: 'siswa', icon: GraduationCap, label: 'Siswa' };
      centerTab = { id: 'absensi', icon: CheckCircle2, label: 'Presensi' };
      rightTab = { id: 'tatib_skor', icon: FileText, label: 'Tatib' };
    } else {
      leftTab = { id: 'generate', icon: Calendar, label: 'Jadwal' };
      centerTab = { id: 'silabus', icon: BookOpen, label: 'Silabus' };
      rightTab = { id: 'beban', icon: FileText, label: 'Beban' };
    }
  } else if (isSuperAdminRole(role)) {
    leftTab = { id: 'data_pegawai', icon: Users, label: 'Pegawai' };
    centerTab = { id: 'generate', icon: Calendar, label: 'Jadwal' };
    rightTab = { id: 'absensi', icon: CheckCircle2, label: 'Presensi' };
  }

  const isDashboardActive = !isMobileMenuOpen && (activeTab === 'dashboard' || activeTab === 'overview');
  const isLeftTabActive = !isMobileMenuOpen && activeTab === leftTab.id;
  const isCenterTabActive = !isMobileMenuOpen && activeTab === centerTab.id;
  const isRightTabActive = !isMobileMenuOpen && activeTab === rightTab.id;
  const isMenuActive = isMobileMenuOpen;

  const LeftIcon = leftTab.icon;
  const CenterIcon = centerTab.icon;
  const RightIcon = rightTab.icon;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 w-full z-[100] print:hidden select-none"
      role="navigation"
      aria-label="Navigasi Mobile Utama"
    >
      <div 
        className="h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/70 flex items-center justify-around px-2 pb-safe-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      >
        
        {/* 1. Tab Beranda */}
        <button
          type="button"
          aria-label="Beranda"
          onClick={() => {
            setActiveTab('dashboard');
            if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
          }}
          className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer border-none bg-transparent active:scale-95 transition-all"
        >
          <div className="relative flex flex-col items-center">
            <Home 
              size={19} 
              strokeWidth={isDashboardActive ? 2.5 : 2} 
              className={isDashboardActive ? 'text-emerald-600' : 'text-slate-400'} 
            />
            <span className={`text-[9.5px] mt-0.5 ${isDashboardActive ? 'font-black text-emerald-600' : 'font-bold text-slate-500'}`}>
              Beranda
            </span>
            {isDashboardActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5 animate-in zoom-in duration-150" />
            )}
          </div>
        </button>

        {/* 2. Tab Kiri (Fitur Primer 1) */}
        <button
          type="button"
          aria-label={leftTab.label}
          onClick={() => {
            setActiveTab(leftTab.id);
            if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
          }}
          className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer border-none bg-transparent active:scale-95 transition-all"
        >
          <div className="relative flex flex-col items-center">
            <LeftIcon 
              size={19} 
              strokeWidth={isLeftTabActive ? 2.5 : 2} 
              className={isLeftTabActive ? 'text-emerald-600' : 'text-slate-400'} 
            />
            <span className={`text-[9.5px] mt-0.5 ${isLeftTabActive ? 'font-black text-emerald-600' : 'font-bold text-slate-500'}`}>
              {leftTab.label}
            </span>
            {isLeftTabActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5 animate-in zoom-in duration-150" />
            )}
          </div>
        </button>

        {/* 3. Center Elevated Floating Button (Aksi Utama / Quick Action) */}
        <div className="flex flex-col items-center justify-center -mt-6 px-1">
          <button
            type="button"
            aria-label={centerTab.label}
            title={centerTab.label}
            onClick={() => {
              setActiveTab(centerTab.id);
              if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
            }}
            className={`w-13 h-13 rounded-full text-white flex items-center justify-center shadow-lg border-4 border-white active:scale-90 transition-all cursor-pointer ${
              isCenterTabActive
                ? 'bg-emerald-600 shadow-emerald-600/50 ring-4 ring-emerald-500/20 scale-105'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/40 ring-4 ring-emerald-500/10'
            }`}
          >
            <CenterIcon size={22} strokeWidth={2.4} />
          </button>
        </div>

        {/* 4. Tab Kanan (Fitur Primer 2) */}
        <button
          type="button"
          aria-label={rightTab.label}
          onClick={() => {
            setActiveTab(rightTab.id);
            if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
          }}
          className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer border-none bg-transparent active:scale-95 transition-all"
        >
          <div className="relative flex flex-col items-center">
            <RightIcon 
              size={19} 
              strokeWidth={isRightTabActive ? 2.5 : 2} 
              className={isRightTabActive ? 'text-emerald-600' : 'text-slate-400'} 
            />
            <span className={`text-[9.5px] mt-0.5 ${isRightTabActive ? 'font-black text-emerald-600' : 'font-bold text-slate-500'}`}>
              {rightTab.label}
            </span>
            {isRightTabActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5 animate-in zoom-in duration-150" />
            )}
          </div>
        </button>

        {/* 5. Tab Menu (Drawer Menu Trigger) */}
        <button
          type="button"
          aria-label="Menu"
          onClick={() => {
            if (setIsMobileMenuOpen) setIsMobileMenuOpen(prev => !prev);
          }}
          className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer border-none bg-transparent active:scale-95 transition-all"
        >
          <div className="relative flex flex-col items-center">
            <Menu 
              size={19} 
              strokeWidth={isMenuActive ? 2.5 : 2} 
              className={isMenuActive ? 'text-emerald-600' : 'text-slate-400'} 
            />
            <span className={`text-[9.5px] mt-0.5 ${isMenuActive ? 'font-black text-emerald-600' : 'font-bold text-slate-500'}`}>
              Menu
            </span>
            {isMenuActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5 animate-in zoom-in duration-150" />
            )}
          </div>
        </button>

      </div>
    </nav>
  );
}

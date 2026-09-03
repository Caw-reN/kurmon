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
  Calendar
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

    // Default 3 menu utama (Jurnal, Laporan, Piket) sesuai referensi screenshot
    const defaultGuruAdminTabs = [
      { id: 'jurnal_harian', icon: BookOpen, label: 'Jurnal' },
      { id: 'walas_report', icon: PieChart, label: 'Laporan' },
      { id: 'kedisiplinan_piket', icon: ClipboardList, label: 'Piket' },
    ];

    if (role === 'guru' || isSuperAdminRole(role) || role === 'admin' || role === 'superadmin' || role === 'kepsek') {
      return defaultGuruAdminTabs;
    }

    if (role === 'tu' || role === 'tata_usaha') {
      return [
        { id: 'esurat', icon: FileText, label: 'E-Surat' },
        { id: 'siswa', icon: GraduationCap, label: 'Siswa' },
        { id: 'laporan_absensi', icon: PieChart, label: 'Laporan' },
      ];
    }

    if (role === 'waka') {
      if (div === 'hubin') {
        return [
          { id: 'pkl_dashboard', icon: PieChart, label: 'PKL' },
          { id: 'pkl_data_perusahaan', icon: Briefcase, label: 'DUDI' },
          { id: 'pkl_jurnal', icon: BookOpen, label: 'Jurnal' },
        ];
      }
      return defaultGuruAdminTabs;
    }

    if (role === 'karyawan') {
      return [
        { id: 'absensiguru', icon: CheckCircle2, label: 'Absensi' },
        { id: 'laporan_absensi', icon: PieChart, label: 'Laporan' },
        { id: 'akademik', icon: Calendar, label: 'Kalender' },
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

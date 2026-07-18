import { LayoutDashboard, Calendar, Users, BookOpen, CheckCircle2, FileText, GraduationCap, Briefcase, Building2, UserPlus, MoreVertical, ClipboardList, MessageSquare, Clock } from 'lucide-react';
import { isSuperAdminRole } from '../../utils/constants.js';


/**
 * AdminMobileNav — Fixed bottom navigation bar untuk layar kecil.
 * Extracted dari AdminApp.jsx untuk mengurangi ukuran file utama.
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
  const getTabColorConfig = () => ({
    activeColor:'text-primary',
    activeBg:'bg-primary/10',
    iconColor:'var(--ui-primary)',
  });

  const isMenuOpen = isMobileMenuOpen;

  const getRoleTabs = () => {
    if (activeUserRole ==='guru') {
      const tabs = [
        { id:'generate',          icon: Calendar,      label:'Jadwal' },
      ];
      tabs.push({ id:'jurnal_harian', icon: BookOpen, label:'Jurnal' });
      tabs.push(
        currentUser?.isWalas
          ? { id:'walas_report', icon: FileText,  label:'Laporan' }
          : { id:'modul_ajar',  icon: FileText,  label:'Modul Ajar', featureKey:'teacherSyllabus' }
      );
      tabs.push({ id:'absensiguru', icon: CheckCircle2, label:'Absen', featureKey:'attendance' });
      return tabs;
    }

    if (activeUserRole ==='tu' || activeUserRole ==='tata_usaha') {
      return [
        { id:'siswa',    icon: GraduationCap, label:'Siswa' },
        { id:'guru',     icon: Users,         label:'Guru' },
        { id:'karyawan', icon: Briefcase,      label:'Karyawan' },
      ];
    }

    if (activeUserRole ==='karyawan') {
      return [{ id:'absensiguru', icon: CheckCircle2, label:'Absen', featureKey:'attendance' }];
    }

    if (activeUserRole ==='kepsek') {
      return [
        { id:'generate',      icon: Calendar, label:'Jadwal' },
        { id:'pkl_dashboard', icon: LayoutDashboard, label:'PKL', featureKey:'pkl_dashboard' },
      ];
    }

    if (activeUserRole ==='waka') {
      if (activeUserDivision ==='hubin') {
        return [
          { id:'pkl_dashboard',       icon: LayoutDashboard,  label:'PKL',  featureKey:'pkl_dashboard' },
          { id:'pkl_data_perusahaan', icon: Briefcase,  label:'DUDI' },
        ];
      }
      if (activeUserDivision ==='kesiswaan') {
        return [
          { id:'absensi',             icon: CheckCircle2, label:'Rekap Absensi' },
          { id:'kedisiplinan_piket',  icon: ClipboardList,     label:'Piket & Pelanggaran' },
        ];
      }
      return [
        { id:'generate', icon: Calendar,     label:'Jadwal' },
        { id:'guru',     icon: Users, label:'Guru' },
      ];
    }

    if (isSuperAdminRole(activeUserRole)) {
      return [
        { id:'siswa', icon: GraduationCap,        label:'Siswa' },
        { id:'guru',  icon: Users, label:'Guru' },
      ];
    }

    return [];
  };

  const allTabs = [
    { id:'dashboard', icon: LayoutDashboard, label:'Beranda' },
    ...getRoleTabs(),
  ].filter(tab => !tab.featureKey || hasFeature(tab.featureKey));

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center px-2 py-2 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)] z-40 w-full overflow-hidden pb-[calc(8px+env(safe-area-inset-bottom))]">
      {allTabs.map(tab => {
        const isActive = activeTab === tab.id;
        const config = getTabColorConfig(tab.id);
        return (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id !=='dashboard') setIsMobileMenuOpen(false);
            }}
            className={`flex-1 flex flex-col items-center justify-center h-11 gap-0.5 rounded-xl transition-all duration-200 border-none cursor-pointer bg-transparent px-1 min-w-0 ${
              isActive ? `${config.activeColor} scale-105` :'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all duration-200 ${
              isActive ? `${config.activeBg} shadow-sm scale-110` :'bg-transparent hover:bg-slate-50'
            }`}>
              <tab.icon
                size={18}
                style={{ color: isActive ? config.iconColor :'inherit' }}
                className={`shrink-0 ${isActive ?'stroke-[2.5]' :'stroke-[2]'}`}
              />
            </div>
            <span className={`text-[8.5px] font-black tracking-tight truncate w-full text-center ${
              isActive ?'opacity-100 font-black' :'opacity-60 font-semibold'
            }`}>
              {tab.label}
            </span>
          </button>
        );
      })}

      {activeUserRole !=='guru' && (
        <button
          onClick={() => setIsMobileMenuOpen(!isMenuOpen)}
          className={`flex-1 flex flex-col items-center justify-center h-11 gap-0.5 rounded-xl transition-all duration-200 border-none cursor-pointer bg-transparent px-1 min-w-0 ${
            isMenuOpen ?'text-primary scale-105 font-bold' :'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-200 ${
            isMenuOpen ?'bg-primary/10 shadow-sm scale-110' :'bg-transparent hover:bg-slate-50'
          }`}>
            <MoreVertical
              size={18}
              style={{ color: isMenuOpen ?'var(--ui-primary)' :'inherit' }}
              className={`shrink-0 ${isMenuOpen ?'stroke-[2.5]' :'stroke-[2]'}`}
            />
          </div>
          <span className={`text-[8.5px] font-black tracking-tight truncate w-full text-center ${
            isMenuOpen ?'opacity-100 font-black' :'opacity-60 font-semibold'
          }`}>
            Menu
          </span>
        </button>
      )}
    </div>
  );
}

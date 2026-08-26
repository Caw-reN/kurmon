import { useEffect } from'react';
import { useNavigate } from'react-router-dom';
import { LayoutDashboard, BookCheck, Users, MapPin, FolderOpen, BarChart2 } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore';
import useFiturStore from'../../../store/monitoring/fiturStore';
import { NavLink, Outlet } from'react-router-dom';
import { GraduationCap, LogOut } from'lucide-react';


/**
 * TeacherLayout.jsx — Updated, reads fiturStore to show/hide nav items
 */







const TeacherLayout = () => {
  const { user, logout } = useAuthStore();
  const { isFiturAktif, fetchFiturFromServer } = useFiturStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFiturFromServer();
  }, [fetchFiturFromServer]);

  const handleLogout = async () => {
    if (await window.confirmAsync("Yakin ingin keluar dari akun?")) {
      try {
        const session = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') ||'{}');
        if (session?.authToken) {
          await fetch('/api/auth/logout', { method:'POST', headers: {'Authorization': `Bearer ${session.authToken}` } });
        }
      } catch (e) {}
      logout();
      navigate('/');
    }
  };

  const allNavItems = [
    { to:'/pkl-teacher',             label:'Beranda',       icon: LayoutDashboard, end: true,  fiturKey: null },
    { to:'/pkl-teacher/kunjungan',    label:'Kunjungan',     icon: MapPin,                      fiturKey: null },
    { to:'/pkl-teacher/validasi',     label:'Validasi',      icon: BookCheck,                  fiturKey:'validasi_jurnal' },
    { to:'/pkl-teacher/siswa',        label:'Binaan',        icon: Users,                      fiturKey: null },
    { to:'/pkl-teacher/administrasi', label:'Berkas',        icon: FolderOpen,                  fiturKey: null },
    { to:'/pkl-teacher/laporan',      label:'Laporan',       icon: BarChart2,                   fiturKey:'laporan' },
  ];

  const navItems = allNavItems.filter(
    (n) => n.fiturKey === null || isFiturAktif(n.fiturKey)
  );

  const initials = (user?.nama ||'Guru').substring(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-[var(--ui-bg-page,#eef2f7)] overflow-hidden w-full relative">
      
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[var(--ui-border-soft)] flex-shrink-0 z-10 shadow-[4px_0_30px_rgba(15,23,42,0.06)]">
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)] flex items-center justify-center flex-shrink-0 shadow-sm">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <p className="font-extrabold text-[15px] text-[var(--ui-primary)] leading-tight">PKL Monitor</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Panel Guru</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5 custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => ['flex items-center gap-3 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-[13px] font-bold transition-all',
                isActive 
                  ?'bg-[var(--ui-primary)] text-white' 
                  :'text-slate-600 hover:bg-slate-50 hover:text-[var(--ui-primary)]'
              ].join('')}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} className={isActive ?'text-white' :'text-slate-400'} />
                  <span>{item.label ==='Beranda' ?'Dashboard' : item.label ==='Berkas' ?'Administrasi' : item.label ==='Binaan' ?'Siswa Binaan' : item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)] flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
               {initials}
             </div>
             <div className="min-w-0 flex-1">
               <p className="text-[13px] font-bold text-slate-800 truncate">{user?.nama ||'Guru'}</p>
               <p className="text-[11px] text-slate-500 truncate mt-0.5">Pembimbing PKL</p>
             </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 rounded-[var(--ui-radius-small)] hover:bg-rose-100 transition-colors border border-rose-100 h-10 px-4 text-sm font-bold">
            <LogOut size={14} /> Keluar Akun
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden relative">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-shrink-0 z-10">
          <div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">PKL Monitor</p>
            <p className="text-sm font-bold text-[var(--ui-primary)] leading-tight">
              {user?.nama ||'Guru Pembimbing'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)] flex items-center justify-center">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-600 rounded-[var(--ui-radius-small)] border border-rose-100">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[var(--ui-bg-page,#eef2f7)]">
          <div className="max-w-3xl mx-auto w-full p-4 md:p-6 pb-24 md:pb-6">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Tab Bar (Hidden on Desktop) */}
        <nav className="md:hidden bg-white border-t border-slate-200 flex-shrink-0 z-10 pb-safe">
          <div className="flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => ['flex-1 flex flex-col items-center justify-center py-2.5 gap-1','text-[9px] font-black transition-colors duration-150',
                  isActive ?'text-[var(--ui-primary)]' :'text-slate-400',
                ].join('')}
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-8 h-8 rounded-[var(--ui-radius-small)] flex items-center justify-center transition-all
                      ${isActive ?'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]' :'text-slate-400'}`}>
                      <item.icon size={17} />
                    </div>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default TeacherLayout;

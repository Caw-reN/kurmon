import { useState, useEffect } from'react';
import { useNavigate } from'react-router-dom';
import { LayoutDashboard, Upload, Settings2, Users, Building2, GraduationCap, BookOpen, FileBarChart2, ToggleLeft, UserCheck, MapPinCheck } from'lucide-react';
import { cn } from'@/lib/utils';
import useAuthStore from'../../../store/monitoring/authStore';
import useFiturStore from'../../../store/monitoring/fiturStore';
import { NavLink, Outlet } from'react-router-dom';
import { LogOut, Menu, Bell, ChevronDown } from'lucide-react';
import { Avatar, Button } from'../ui/index.js';


/**
 * AdminLayout.jsx — Updated dengan menu Manajemen Fitur + Penugasan Guru + Lokasi PKL
 */







const navItems = [
  {
    group:'Utama',
    items: [
      { to:'/monitoring',                 label:'Dashboard',           icon: LayoutDashboard, end: true },
      { to:'/monitoring/import',          label:'Import Data PKL',     icon: Upload },
    ],
  },
  {
    group:'Manajemen Siswa',
    items: [
      { to:'/monitoring/siswa',           label:'Data Siswa',          icon: Users },
      { to:'/monitoring/penugasan-guru',  label:'Penugasan Guru',      icon: UserCheck },
      { to:'/monitoring/approval-lokasi', label:'Approval Lokasi PKL', icon: MapPinCheck },
    ],
  },
  {
    group:'Data Master',
    items: [
      { to:'/monitoring/perusahaan',      label:'Data Perusahaan',     icon: Building2 },
      { to:'/monitoring/guru',            label:'Data Guru',           icon: GraduationCap },
    ],
  },
  {
    group:'Monitoring',
    items: [
      { to:'/monitoring/jurnal',          label:'Jurnal Siswa',        icon: BookOpen },
      { to:'/monitoring/laporan',         label:'Laporan',             icon: FileBarChart2 },
    ],
  },
  {
    group:'Pengaturan',
    items: [
      { to:'/monitoring/absensi-settings', label:'Pengaturan Absensi', icon: Settings2 },
      { to:'/monitoring/fitur',            label:'Manajemen Fitur',    icon: ToggleLeft },
    ],
  },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { fetchFiturFromServer } = useFiturStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFiturFromServer();
  }, [fetchFiturFromServer]);

  const handleLogout = () => { logout(); navigate('/'); };

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-card">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 flex-shrink-0 border-b border-border h-[72px]",
        sidebarOpen || mobile ?"px-4" :"justify-center px-3"
      )}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <GraduationCap size={16} className="text-primary-foreground" />
        </div>
        {(sidebarOpen || mobile) && (
          <div className="min-w-0">
            <p className="font-bold text-sm text-foreground leading-tight">PKL Monitor</p>
            <p className="text-xs text-muted-foreground truncate">SMK Karya Guna 2</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
        {navItems.map((group) => (
          <div key={group.group}>
            {(sidebarOpen || mobile) && (
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.15em] px-2.5 mb-1.5">
                {group.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => mobile && setMobileSidebarOpen(false)}
                    title={!sidebarOpen && !mobile ? item.label : undefined}
                    className={({ isActive }) => cn('flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-all duration-150',
                      isActive
                        ?'bg-primary text-primary-foreground shadow-sm'
                        :'text-muted-foreground hover:bg-muted hover:text-foreground',
                      !sidebarOpen && !mobile &&'justify-center px-0'
                    )}
                  >
                    <item.icon size={15} className="flex-shrink-0" />
                    {(sidebarOpen || mobile) && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User bottom */}
      {(sidebarOpen || mobile) && (
        <div className="p-3 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-2.5 px-1">
            <Avatar name={user?.nama ||'Admin'} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user?.nama ||'Administrator'}</p>
              <p className="text-[10px] text-muted-foreground">Admin HUBIN</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={cn("flex items-center gap-2 text-xs text-destructive font-semibold","hover:bg-destructive/10 px-2.5 py-2 rounded-md w-full transition-colors border-none cursor-pointer bg-transparent"
            )}
          >
            <LogOut size={13} /> Keluar dari Akun
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className={cn("hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out","border-r border-border shadow-sm",
        sidebarOpen ?'w-60' :'w-[60px]'
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 shadow-lg border-r border-border z-50">
            <SidebarContent mobile />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className={cn("border-b border-border px-4 md:px-5 h-[72px] flex items-center gap-3 flex-shrink-0","bg-card/95 backdrop-blur-xl shadow-sm"
        )}>
          {/* Sidebar toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => window.innerWidth < 768
              ? setMobileSidebarOpen(!mobileSidebarOpen)
              : setSidebarOpen(!sidebarOpen)
            }
            aria-label="Toggle sidebar"
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu size={17} />
          </Button>

          <div className="flex-1" />

          {/* Notification */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-primary hover:bg-primary/10"
            aria-label="Notifikasi"
          >
            <Bell size={17} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full ring-2 ring-background" />
          </Button>

          {/* User */}
          <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer border-none bg-transparent">
            <Avatar name={user?.nama ||'Admin'} size="xs" />
            <span className="text-xs font-semibold text-foreground hidden sm:block">
              {user?.nama ||'Administrator'}
            </span>
            <ChevronDown size={12} className="text-muted-foreground hidden sm:block" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

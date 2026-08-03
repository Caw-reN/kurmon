import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/monitoring/authStore';
import useFiturStore from '../../../store/monitoring/fiturStore';
import { NavLink, Outlet } from 'react-router-dom';
import { GraduationCap, LogOut } from 'lucide-react';


/**
 * StudentLayout.jsx — Responsive layout: Desktop Sidebar + Mobile Bottom Tabs
 * Mobile and Desktop nav items are now synchronized (same 5 items)
 */

const navItems = [
  { to: '/student',              label: 'Beranda',       icon: '/icons/008-warehouse.svg',            end: true },
  { to: '/student/absensi',      label: 'Absensi',       icon: '/icons/084-fingerprint scan.svg' },
  { to: '/student/logbook',      label: 'Jurnal',        icon: '/icons/023-pencil.svg' },
  { to: '/student/lokasi',       label: 'Lokasi',        icon: '/icons/016-map pin.svg' },
  { to: '/student/administrasi', label: 'Administrasi',  icon: '/icons/092-file.svg' },
  { to: '/student/profil',       label: 'Profil',        icon: '/icons/045-account.svg' },
];

// Mobile: show 5 most important items (excluding Profil to avoid crowding, or all 5 core)
const mobileNavItems = [
  { to: '/student',              label: 'Beranda',  icon: '/icons/008-warehouse.svg',           end: true },
  { to: '/student/absensi',      label: 'Absensi',  icon: '/icons/084-fingerprint scan.svg' },
  { to: '/student/logbook',      label: 'Jurnal',   icon: '/icons/023-pencil.svg' },
  { to: '/student/administrasi', label: 'Admin',    icon: '/icons/092-file.svg' },
  { to: '/student/profil',       label: 'Profil',   icon: '/icons/045-account.svg' },
];

const StudentLayout = () => {
  const { user, logout } = useAuthStore();
  const { fetchFiturFromServer } = useFiturStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFiturFromServer();
  }, [fetchFiturFromServer]);

  const handleLogout = async () => {
    if (await window.confirmAsync('Yakin ingin keluar dari akun?')) {
      try {
        const session = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}');
        if (session?.authToken) {
          await fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': `Bearer ${session.authToken}` } });
        }
      } catch (e) {}
      logout();
      navigate('/login');
    }
  };

  const initials = (user?.name || user?.username || 'S').substring(0, 2).toUpperCase();
  const namaDisplay = user?.name || user?.username || 'Siswa PKL';
  const kelasDisplay = user?.kelas || user?.class_name || user?.class || '';

  return (
    <div className="flex h-screen bg-[var(--ui-bg-page,#eef2f7)] overflow-hidden w-full">

      {/* ── Desktop Sidebar (hidden on mobile) ────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[var(--ui-border-soft)] flex-shrink-0 z-10 shadow-[2px_0_12px_rgba(15,23,42,0.05)]">

        {/* Brand */}
        <div className="p-5 border-b border-[var(--ui-border-soft)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)] flex items-center justify-center flex-shrink-0 shadow-sm">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <p className="font-black text-[14px] text-[var(--ui-primary)] leading-tight">PKL Monitor</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">Panel Siswa</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-[var(--ui-radius-small)] text-[13px] font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--ui-primary)] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-primary)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <img
                    src={item.icon}
                    alt={item.label}
                    className={`w-[18px] h-[18px] object-contain transition-all duration-200 ${
                      isActive ? 'brightness-0 invert' : 'opacity-50 grayscale'
                    }`}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User profile + logout */}
        <div className="p-4 border-t border-[var(--ui-border-soft)] bg-[var(--ui-surface-muted)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)] flex items-center justify-center text-[11px] font-black text-white shadow-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-slate-800 truncate leading-tight">{namaDisplay}</p>
              {kelasDisplay && (
                <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{kelasDisplay}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-[var(--ui-radius-small)] transition-colors border border-red-100 h-9 px-4 text-[12px] font-bold cursor-pointer"
          >
            <LogOut size={14} />
            Keluar Akun
          </button>
        </div>
      </aside>

      {/* ── Main Content Column ────────────────────────────────────── */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">

        {/* Mobile Header (hidden on desktop) */}
        <header className="md:hidden bg-white border-b border-[var(--ui-border-soft)] px-4 py-3 flex items-center justify-between flex-shrink-0 z-10 shadow-[0_1px_8px_rgba(15,23,42,0.06)]">
          {/* Brand left */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)] flex items-center justify-center shrink-0">
              <GraduationCap size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-black text-[var(--ui-primary)] leading-tight">PKL Monitor</p>
              <p className="text-[10px] text-slate-400 font-semibold leading-tight truncate max-w-[130px]">{namaDisplay}</p>
            </div>
          </div>

          {/* Actions right */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)] flex items-center justify-center cursor-default">
              <span className="text-[10px] font-black text-white">{initials}</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-[var(--ui-radius-small)] border border-red-100 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[var(--ui-bg-page,#eef2f7)]">
          <div className="w-full h-full p-4 md:p-6 pb-24 md:pb-6">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Tab Bar (hidden on desktop) */}
        <nav className="md:hidden bg-white border-t border-[var(--ui-border-soft)] flex-shrink-0 z-10 shadow-[0_-1px_12px_rgba(15,23,42,0.06)]">
          <div className="flex">
            {mobileNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[9px] font-black transition-colors duration-150 ${
                    isActive ? 'text-[var(--ui-primary)]' : 'text-slate-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-8 h-8 rounded-[var(--ui-radius-small)] flex items-center justify-center transition-all duration-200 ${
                      isActive ? 'bg-[color-mix(in_srgb,var(--ui-primary)_12%,transparent)]' : ''
                    }`}>
                      <img
                        src={item.icon}
                        alt={item.label}
                        className={`w-[18px] h-[18px] object-contain transition-all duration-200 ${
                          isActive ? 'brightness-0 saturate-100' : 'opacity-40 grayscale'
                        }`}
                        style={isActive ? { filter: 'brightness(0) saturate(100%) invert(25%) sepia(80%) saturate(500%) hue-rotate(100deg)' } : {}}
                      />
                    </div>
                    <span className="leading-tight">{item.label}</span>
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

export default StudentLayout;

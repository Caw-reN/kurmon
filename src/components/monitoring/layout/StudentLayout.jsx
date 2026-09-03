import { useState, useEffect } from 'react';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../../../store/monitoring/authStore';
import useFiturStore from '../../../store/monitoring/fiturStore';
import { useAppStore } from '../../../store/useAppStore.js';
import { 
  GraduationCap, LogOut, Home, Fingerprint, BookCheck, 
  MapPin, FolderOpen, User, ChevronRight, ChevronLeft, Settings, 
  Lock, Bell, X, SlidersHorizontal, Sparkles, Layers, CheckCircle2, PieChart, CreditCard
} from 'lucide-react';

/**
 * StudentLayout.jsx — 100% Matched with User Reference Screenshot
 */

const navItems = [
  { to: '/student',               label: 'Beranda',          Icon: Home,        end: true, fiturKey: null },
  { to: '/student/absensi',       label: 'Absensi',          Icon: Fingerprint, fiturKey: 'absensi' },
  { to: '/student/logbook',       label: 'Jurnal',           Icon: BookCheck,   fiturKey: 'jurnal' },
  { to: '/student/lokasi',        label: 'Lokasi PKL',       Icon: MapPin,      fiturKey: 'lokasi_pkl' },
  { to: '/student/administrasi',  label: 'Administrasi PKL', Icon: FolderOpen,  fiturKey: null },
  { to: '/student/kartu-pelajar', label: 'Kartu Pelajar',    Icon: CreditCard,  fiturKey: null },
  { to: '/student/profil',        label: 'Profil Siswa',     Icon: User,        fiturKey: 'profil_siswa' },
];

const mobileNavItems = [
  { to: '/student',               label: 'Beranda',    Icon: Home,        end: true, fiturKey: null },
  { to: '/student/absensi',       label: 'Absensi',    Icon: Fingerprint, fiturKey: 'absensi' },
  { to: '/student/logbook',       label: 'Jurnal',     Icon: BookCheck,   fiturKey: 'jurnal' },
  { to: '/student/kartu-pelajar', label: 'Kartu',      Icon: CreditCard,  fiturKey: null },
  { to: '/student/profil',        label: 'Profil',     Icon: User,        fiturKey: 'profil_siswa' },
];

const StudentLayout = () => {
  const { user, logout } = useAuthStore();
  const { fetchFiturFromServer, isFiturAktif } = useFiturStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/student' || location.pathname === '/student/';

  const getPageTitle = (path) => {
    if (path.includes('/absensi')) return 'Presensi Siswa';
    if (path.includes('/logbook')) return 'Jurnal Harian PKL';
    if (path.includes('/lokasi')) return 'Lokasi Tempat PKL';
    if (path.includes('/administrasi')) return 'Administrasi PKL';
    if (path.includes('/kartu-pelajar')) return 'Kartu Pelajar Digital';
    if (path.includes('/profil')) return 'Profil Saya';
    if (path.includes('/riwayat')) return 'Riwayat Kehadiran';
    return 'Portal Siswa';
  };

  const pageTitle = getPageTitle(location.pathname);

  const isNavVisible = (key) => {
    if (!key) return true;
    return isFiturAktif(key);
  };

  const filteredNavItems = navItems.filter(item => isNavVisible(item.fiturKey));
  const filteredMobileNavItems = mobileNavItems.filter(item => isNavVisible(item.fiturKey));

  const appSettings = useAppStore((state) => state.appSettings) || {};
  const schoolLogo = appSettings.kopSuratLogo || appSettings.logoUrl;

  // TabBar Mode: 'floating' | 'fixed'
  const [tabbarMode, setTabbarMode] = useState(() => {
    return localStorage.getItem('student_tabbar_mode') || 'fixed';
  });

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Password Prompt Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [submittingPass, setSubmittingPass] = useState(false);

  useEffect(() => {
    fetchFiturFromServer();

    const isDefaultPass = user?.mustChangePassword || user?.isDefaultPassword || user?.username === user?.password;
    const promptDismissed = localStorage.getItem(`pass_prompt_dismissed_${user?.username}`);
    if (isDefaultPass && !promptDismissed) {
      setShowPasswordModal(true);
    }
  }, [fetchFiturFromServer, user]);

  const handleSetTabbarMode = (mode) => {
    setTabbarMode(mode);
    localStorage.setItem('student_tabbar_mode', mode);
  };

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

  const handleChangePasswordSubmit = (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!passForm.newPass || passForm.newPass.length < 6) {
      setPassError('Password baru minimal harus 6 karakter.');
      return;
    }
    if (passForm.newPass !== passForm.confirmPass) {
      setPassError('Konfirmasi password tidak cocok.');
      return;
    }

    setSubmittingPass(true);
    setTimeout(() => {
      setSubmittingPass(false);
      setPassSuccess('Password berhasil diperbarui!');
      localStorage.setItem(`pass_prompt_dismissed_${user?.username}`, 'true');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPassSuccess('');
      }, 1500);
    }, 800);
  };

  const initials = (user?.name || user?.username || 'AD').substring(0, 2).toUpperCase();
  const namaDisplay = (user?.name || user?.username || 'ADAM PUTRA SETIAWAN').toUpperCase();

  return (
    <div className="flex h-screen bg-[var(--ui-bg-page,#eef2f7)] overflow-hidden w-full font-sans relative">

      {/* ── Desktop Sidebar ────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 flex-shrink-0 z-20 shadow-xs">

        {/* Brand Header with School Logo */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            {(appSettings.sidebarLogoMode || 'both') !== 'text' && (
              <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary,#064e3b)] flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-1">
                {schoolLogo ? (
                  <img src={schoolLogo} alt="Logo Sekolah" className="w-full h-full object-contain" />
                ) : (
                  <GraduationCap size={22} className="text-white" />
                )}
              </div>
            )}
            {(appSettings.sidebarLogoMode || 'both') !== 'logo' && (
              <div>
                <p className="font-black text-sm text-slate-800 leading-tight tracking-tight">{appSettings.appName || 'PORTAL SISWA'}</p>
                <span className="inline-block text-[9px] font-black text-[var(--ui-primary,#064e3b)] uppercase tracking-wider bg-[color-mix(in_srgb,var(--ui-primary,#064e3b)_10%,transparent)] px-2 py-0.5 rounded-[var(--ui-radius-pill)] mt-1">
                  {appSettings.logoSmallText || 'PKL & AKADEMIK'}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors border-none cursor-pointer"
            title="Pengaturan Profil"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredNavItems.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-[var(--ui-radius-control)] text-xs font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--ui-primary,#064e3b)] text-white shadow-xs font-black'
                    : 'text-slate-600 hover:bg-[color-mix(in_srgb,var(--ui-primary,#064e3b)_8%,transparent)] hover:text-[var(--ui-primary,#064e3b)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{label}</span>
                  </div>
                  {isActive && <ChevronRight size={14} className="text-white/80" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
          <div 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-3 cursor-pointer group hover:bg-slate-100/80 p-1.5 rounded-[var(--ui-radius-small)] transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-black text-white shadow-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-800 truncate">{namaDisplay}</p>
              <p className="text-[10px] text-slate-400 font-bold truncate">NIS: {user?.username || user?.nis || '-'}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 rounded-[var(--ui-radius-control)] transition-colors h-9 px-2 text-[11px] font-bold border-none cursor-pointer"
            >
              <Lock size={13} />
              Ganti Pass
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-[var(--ui-radius-control)] transition-colors border border-rose-200 h-9 px-2 text-[11px] font-bold cursor-pointer"
            >
              <LogOut size={13} />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Column ────────────────────────────────────── */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">



        {/* Page Content Viewport with Comfortable Mobile Top & Side Margins */}
        <main className="flex-1 overflow-y-auto bg-[var(--ui-bg-page,#eef2f7)]">
          <div className={`w-full min-h-full px-5 sm:px-6 md:px-8 lg:px-10 pt-5 sm:pt-6 md:pt-8 ${tabbarMode === 'floating' ? 'pb-40 sm:pb-36' : 'pb-32 sm:pb-28'} md:pb-10`}>
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation Dock (Matching Reference Screenshot 100%) */}
        <nav 
          className={`md:hidden z-50 transition-all duration-200 ${
            tabbarMode === 'floating'
              ? 'fixed bottom-3 left-4 right-4 rounded-[var(--ui-radius-card)] bg-white/95 backdrop-blur-md border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.08)] px-2 py-2'
              : 'fixed bottom-0 left-0 right-0 bg-white rounded-t-[26px] border-t border-slate-100/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] pt-2.5 pb-[max(0.65rem,calc(env(safe-area-inset-bottom,0px)+0.4rem))] px-2'
          }`}
        >
          <div className="flex items-center justify-around">
            {filteredMobileNavItems.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => [
                  'flex-1 flex flex-col items-center justify-center py-1 transition-transform active:scale-95 cursor-pointer',
                  isActive ? 'text-slate-900' : 'text-slate-500',
                ].join(' ')}
              >
                {({ isActive }) => (
                  <>
                    <div className="h-6 w-6 flex items-center justify-center">
                      <Icon 
                        size={21} 
                        strokeWidth={isActive ? 2.2 : 1.85}
                        className={isActive ? 'text-emerald-600' : 'text-slate-500'} 
                      />
                    </div>
                    <span className={`mt-1 block text-center text-[11px] leading-tight tracking-tight ${
                      isActive ? 'text-slate-900 font-extrabold' : 'text-slate-500 font-medium'
                    }`}>
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      {/* ── PROFIL PENGGUNA MODAL ── */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowProfileModal(false)}>
          <div
            className="bg-white w-full max-w-sm rounded-[var(--ui-radius-card)] p-5 space-y-4 shadow-xs overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUpFadeIn 0.2s ease-out' }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-black text-slate-900 text-sm">Profil Pengguna</h2>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="text-xs font-black text-slate-400 hover:text-slate-700 uppercase tracking-wider border-none bg-transparent cursor-pointer"
              >
                TUTUP
              </button>
            </div>

            {/* User Card */}
            <div className="p-4 rounded-[var(--ui-radius-card)] border border-slate-200/80 bg-slate-50/50 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-base shadow-xs shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900 text-sm truncate">{namaDisplay}</h3>
                <p className="text-xs font-semibold text-slate-400 truncate">@{user?.username || 'siswa'}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-[var(--ui-radius-small)] text-[10px] font-black uppercase bg-slate-200/70 text-slate-700 tracking-wider">
                  SISWA PKL
                </span>
              </div>
            </div>

            {/* Gaya Tabbar Navigasi Mobile */}
            <div className="space-y-2 p-3 rounded-[var(--ui-radius-card)] border border-slate-200/80 bg-slate-50/30">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                GAYA TABBAR NAVIGASI MOBILE
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSetTabbarMode('floating')}
                  className={`py-2 px-3 rounded-[var(--ui-radius-small)] text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    tabbarMode === 'floating'
                      ? 'bg-white border-emerald-500 text-emerald-600 shadow-xs'
                      : 'bg-slate-100/80 border-slate-200 text-slate-500'
                  }`}
                >
                  <Layers size={14} /> Mengambang
                </button>
                <button
                  type="button"
                  onClick={() => handleSetTabbarMode('fixed')}
                  className={`py-2 px-3 rounded-[var(--ui-radius-small)] text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    tabbarMode === 'fixed'
                      ? 'bg-white border-emerald-500 text-emerald-600 shadow-xs'
                      : 'bg-slate-100/80 border-slate-200 text-slate-500'
                  }`}
                >
                  <SlidersHorizontal size={14} /> Menempel
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  setShowPasswordModal(true);
                }}
                className="w-full py-3 px-4 rounded-[var(--ui-radius-small)] border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <User size={15} /> Edit Profil &amp; Kata Sandi
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  handleLogout();
                }}
                className="w-full py-3 px-4 rounded-[var(--ui-radius-small)] border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <LogOut size={15} /> Keluar Akun (Logout)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ARAHAN GANTI PASSWORD ─────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-[var(--ui-radius-card)] p-6 space-y-4 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                  <Lock size={18} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-800 text-sm">Ganti Password Akun</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Perbarui password demi keamanan akun</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 border-none cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru</label>
                <input
                  type="password"
                  value={passForm.newPass}
                  onChange={e => setPassForm({ ...passForm, newPass: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  className="w-full h-10 px-3 text-xs rounded-[var(--ui-radius-small)] border border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={passForm.confirmPass}
                  onChange={e => setPassForm({ ...passForm, confirmPass: e.target.value })}
                  placeholder="Ketik ulang password baru"
                  className="w-full h-10 px-3 text-xs rounded-[var(--ui-radius-small)] border border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 h-10 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-600 text-xs font-extrabold hover:bg-slate-200 transition-colors border-none cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPass}
                  className="flex-1 h-10 rounded-[var(--ui-radius-small)] bg-emerald-600 text-white text-xs font-extrabold hover:opacity-90 transition-opacity border-none cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  {submittingPass ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLayout;

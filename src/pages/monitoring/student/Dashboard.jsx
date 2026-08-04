import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/monitoring/authStore';
import { useAppStore } from '../../../store/useAppStore.js';
import { 
  CheckCircle2, Clock, Calendar, MapPin, Building2, UserCheck, 
  Sparkles, Fingerprint, BookCheck, FolderOpen, ArrowRight, ShieldCheck, User, Info, Building, Bell, LogOut
} from 'lucide-react';
import { SharedDashboardLogs } from '../../../components/monitoring/ui/SharedDashboardLogs.jsx';

/**
 * student/Dashboard.jsx
 * Exact 100% match with User Reference Screenshot:
 * - Top Greeting Row: Date + "Halo, Adam! ✌️" + Notification Bell & Mobile Logout Button
 * - Section Title: "Kartu Pelajar ✔"
 * - Compact Green Hero Card: White Avatar Box + Student Info + Inset Status Lokasi Box (PT. Astra Motor / Real Company Name)
 */

const StudentDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const appSettings = useAppStore((state) => state.appSettings) || {};
  const primaryColor = appSettings.primaryColor || appSettings.themeColor || 'var(--ui-primary, #064e3b)';
  const themeColorCSS = primaryColor.startsWith('var') ? 'var(--ui-primary, #064e3b)' : primaryColor;

  const [pklData, setPklData] = useState(null);
  const [perusahaanData, setPerusahaanData] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayDate = new Date();
  const hari = todayDate.toLocaleDateString('id-ID', { weekday: 'long' });
  const tanggal = todayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const dateFormatted = `${hari}, ${tanggal}`;

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const token = user?.authToken || JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;

    Promise.all([
      fetch('/api/monitoring/pkl-students', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      }).then(r => r.json()),
      fetch('/api/monitoring/lokasi-pkl/public').then(r => r.json())
    ])
    .then(([studentsRes, perusahaanRes]) => {
      if (studentsRes.ok && Array.isArray(studentsRes.data)) {
        const myRecord = studentsRes.data.find(s => s.nis === user?.username || s.nis === user?.nis);
        setPklData(myRecord || null);
      }
      if (perusahaanRes.ok && Array.isArray(perusahaanRes.data)) {
        setPerusahaanData(perusahaanRes.data);
      }
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, [user]);

  const perusahaan = (pklData?.location_id && Array.isArray(perusahaanData))
    ? perusahaanData.find(p => p.id === pklData.location_id)
    : null;

  // Pintasan Cepat Modules Grid
  const quickActionModules = [
    { label: 'Absensi', iconSrc: '/icons/084-fingerprint scan.svg', route: '/student/absensi', bg: 'bg-emerald-50 border-emerald-100/80' },
    { label: 'Lokasi PKL', iconSrc: '/icons/016-map pin.svg', route: '/student/lokasi', bg: 'bg-sky-50 border-sky-100/80' },
    { label: 'Administrasi', iconSrc: '/icons/092-file.svg', route: '/student/administrasi', bg: 'bg-emerald-50 border-emerald-100/80' },
    { label: 'Kartu Pelajar', iconSrc: '/icons/045-account.svg', route: '/student/kartu-pelajar', bg: 'bg-indigo-50 border-indigo-100/80' },
    { label: 'Jurnal', iconSrc: '/icons/023-pencil.svg', route: '/student/logbook', bg: 'bg-purple-50 border-purple-100/80' },
    { label: 'Riwayat', iconSrc: '/icons/035-graph bar.svg', route: '/student/riwayat', bg: 'bg-amber-50 border-amber-100/80' },
  ];

  const rawName = user?.name || user?.nama || user?.username || 'Adam Putra Setiawan';
  const firstName = rawName.split(' ')[0];
  const studentNis = user?.username || user?.nis || '242510001';
  const studentClass = user?.class_name || user?.kelas || 'XII TKR 1';
  const studentPhoto = user?.photo || pklData?.photo_url || null;
  const initials = rawName.substring(0, 2).toUpperCase();

  const pklLocationName = perusahaan?.nama_perusahaan || pklData?.company_name || pklData?.nama_perusahaan || (pklData?.location_id ? `Lokasi PKL #${pklData.location_id}` : 'Belum Diplot Perusahaan');

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

  return (
    <div className="space-y-5 w-full pb-20 font-sans text-slate-800 pt-1">

      {/* ── 1. TOP GREETING & MOBILE CONTROLS ROW ── */}
      <div className="flex items-start justify-between gap-3 pt-1 pb-1">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-500">{dateFormatted}</p>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            Halo, {firstName}! <span>✌️</span>
          </h1>
        </div>

        {/* Top Right Buttons: Notification Bell + Mobile Logout Button */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-white shadow-2xs border border-slate-200/80 flex items-center justify-center text-slate-700 relative hover:bg-slate-50 transition-colors cursor-pointer"
            title="Notifikasi"
          >
            <Bell size={18} />
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white absolute top-2 right-2" />
          </button>

          {/* Mobile Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
            title="Keluar Akun"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* ── 2. SECTION HEADING & COMPACT HERO CARD (DYNAMICALY MATCHED TO WEB APPEARANCE SETTINGS) ── */}
      <div className="space-y-3">
        {/* Section Heading: "Kartu Pelajar ✔" */}
        <div className="flex items-center gap-2">
          <h2 className="font-black text-slate-900 text-base sm:text-lg">Kartu Pelajar</h2>
          <CheckCircle2 size={18} style={{ color: themeColorCSS }} />
        </div>

        {/* Compact Dynamic Theme Hero Card */}
        <div 
          className="rounded-[24px] p-5 text-white space-y-4 relative overflow-hidden transition-all shadow-md"
          style={{ 
            background: `linear-gradient(135deg, ${themeColorCSS} 0%, color-mix(in srgb, ${themeColorCSS} 80%, #000) 100%)`
          }}
        >
          {/* Decorative Ambient Curve */}
          <div className="absolute -top-16 -right-16 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none" />

          {/* Top Row: Avatar Box + Student Info */}
          <div className="flex items-center gap-3.5 relative z-10">
            {/* White Rounded Square Avatar Container */}
            <div 
              className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm font-black text-xl overflow-hidden p-1"
              style={{ color: themeColorCSS }}
            >
              {studentPhoto ? (
                <img src={studentPhoto} alt="Foto Siswa" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <User size={30} className="text-slate-300" />
              )}
            </div>

            {/* Student Details Column */}
            <div className="min-w-0 flex-1 space-y-0.5">
              <h3 className="font-bold text-base sm:text-lg text-white tracking-wide truncate leading-tight">
                {rawName}
              </h3>
              <p className="text-xs text-white/90 font-medium truncate">
                NIS: <strong className="font-extrabold text-white">{studentNis}</strong>
              </p>
              <p className="text-xs text-white/90 font-medium truncate">
                Kelas: <strong className="font-extrabold text-white">{studentClass}</strong>
              </p>
            </div>
          </div>

          {/* Inset Status Lokasi Box (Bottom of Card) */}
          <div 
            onClick={() => navigate('/student/lokasi')}
            className="bg-white/20 backdrop-blur-md border border-white/25 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/25 transition-all relative z-10"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Round White Icon Container */}
              <div 
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-2xs"
                style={{ color: themeColorCSS }}
              >
                <Building2 size={18} />
              </div>

              {/* Status Lokasi Typography */}
              <div className="min-w-0">
                <span className="text-[9px] font-black text-white/80 uppercase tracking-widest block leading-none">
                  STATUS LOKASI
                </span>
                <p className="font-extrabold text-xs sm:text-sm text-white truncate mt-0.5">
                  {pklLocationName}
                </p>
              </div>
            </div>

            {/* Right Pill Badge */}
            <span className="bg-white/20 border border-white/30 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0">
              Aktif PKL
            </span>
          </div>

        </div>
      </div>

      {/* ── 3. PINTASAN CEPAT SECTION (Responsive Grid) ── */}
      <div className="space-y-3 pt-1">
        <h2 className="font-black text-slate-900 text-base sm:text-lg">Pintasan Cepat</h2>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3.5 sm:gap-4">
          {quickActionModules.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.route)}
              className="bg-white rounded-3xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-md cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-3 group"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border p-3.5 transition-transform group-hover:scale-105 ${item.bg}`}>
                <img src={item.iconSrc} alt={item.label} className="w-full h-full object-contain" />
              </div>
              <span className="text-xs font-black text-slate-800 group-hover:text-emerald-700 transition-colors">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. LIVE LOGS & AKTIVITAS PEMANTAUAN SYSTEM ── */}
      <SharedDashboardLogs title="Aktivitas Pemantauan Presensi &amp; PKL" />

    </div>
  );
};

export default StudentDashboard;

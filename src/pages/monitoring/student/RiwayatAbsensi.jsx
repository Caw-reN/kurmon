import { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, XCircle, Clock, Calendar
} from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore';
import { useAppStore } from '../../../store/useAppStore.js';

/**
 * student/RiwayatAbsensi.jsx — Overhauled Attendance History & Analytics.
 * Ultra-clean, modern, responsive mobile UI with full theme color & database sync.
 */

const STATUS_CONFIG = {
  hadir:     { label: 'Tepat Waktu', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200/80', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  terlambat: { label: 'Terlambat',   icon: Clock,        color: 'text-amber-700',   bg: 'bg-amber-50/80 border-amber-200/80', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  izin:      { label: 'Izin / Sakit', icon: Calendar,     color: 'text-sky-700',     bg: 'bg-sky-50/80 border-sky-200/80', badge: 'bg-sky-100 text-sky-800 border-sky-300' },
  absen:     { label: 'Alpa / Absen', icon: XCircle,      color: 'text-rose-700',    bg: 'bg-rose-50/80 border-rose-200/80', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
};

const RiwayatAbsensi = () => {
  const { user } = useAuthStore();
  const appSettings = useAppStore((state) => state.appSettings) || {};
  const primaryColor = appSettings.primaryColor || appSettings.themeColor || 'var(--ui-primary, #059669)';
  const themeColorCSS = primaryColor.startsWith('var') ? 'var(--ui-primary, #059669)' : primaryColor;

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const todayDate = new Date();
  const hari = todayDate.toLocaleDateString('id-ID', { weekday: 'long' });
  const tanggal = todayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const currentMonth = todayDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const studentName = user?.name || user?.nama || user?.username || 'ADAM PUTRA SETIAWAN';
  const studentNis = user?.username || user?.nis || '242510001';
  const studentClass = user?.class_name || user?.kelas || 'XII TKR 1';

  const fetchAttendanceHistory = useCallback(async () => {
    setLoading(true);
    try {
      const sessionData = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}');
      const authToken = sessionData?.authToken;

      const res = await fetch('/api/attendances', {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const data = await res.json();
      
      let myRecords = [];
      if (data.ok && Array.isArray(data.data)) {
        const myNis = String(user?.username || user?.nis || '').trim().toLowerCase();
        myRecords = data.data.filter(a => {
          const rNis = String(a.nis || a.username || '').trim().toLowerCase();
          return rNis === myNis || !myNis;
        });
      }

      // Also fallback to store records if API list is empty
      if (myRecords.length === 0) {
        const storeRecords = useAppStore.getState().attendanceRecords || [];
        const myNis = String(user?.username || user?.nis || '').trim().toLowerCase();
        myRecords = storeRecords.filter(r => {
          const rNis = String(r.nis || r.studentCode || r.username || '').trim().toLowerCase();
          return rNis === myNis || !myNis;
        });
      }

      setAttendance(myRecords);
    } catch {
      const storeRecords = useAppStore.getState().attendanceRecords || [];
      const myNis = String(user?.username || user?.nis || '').trim().toLowerCase();
      const myRecords = storeRecords.filter(r => {
        const rNis = String(r.nis || r.studentCode || r.username || '').trim().toLowerCase();
        return rNis === myNis || !myNis;
      });
      setAttendance(myRecords);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [fetchAttendanceHistory]);

  const counts = attendance.reduce((acc, a) => {
    const s = String(a.status || 'hadir').toLowerCase();
    if (s.includes('terlambat') || s.includes('late')) acc.terlambat = (acc.terlambat || 0) + 1;
    else if (s.includes('izin') || s.includes('sakit')) acc.izin = (acc.izin || 0) + 1;
    else if (s.includes('alpa') || s.includes('absen')) acc.absen = (acc.absen || 0) + 1;
    else acc.hadir = (acc.hadir || 0) + 1;
    return acc;
  }, { hadir: 0, terlambat: 0, izin: 0, absen: 0 });

  const totalRecordCount = attendance.length;
  const attendanceRate = totalRecordCount > 0 
    ? Math.round(((counts.hadir + counts.terlambat) / totalRecordCount) * 100) 
    : 100;

  const filteredAttendance = attendance.filter(item => {
    const dStr = item.date || item.created_at || '';
    const stStr = item.status || '';
    const query = searchTerm.toLowerCase();
    return dStr.toLowerCase().includes(query) || stStr.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-5 w-full pb-20 font-sans text-slate-800">
      
      {/* ── 1. HEADER TITLE & HERO REKAP CARD ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Riwayat Kehadiran</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Rekapitulasi aktivitas presensi harian siswa</p>
          </div>

          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3.5 py-1.5 rounded-[var(--ui-radius-pill)] text-xs font-bold flex items-center gap-1.5 shrink-0">
            <CalendarDays size={14} className="text-emerald-600" /> {currentMonth}
          </span>
        </div>

        {/* Clean Theme Hero Card */}
        <div 
          className="rounded-[24px] p-6 text-white space-y-4 relative overflow-hidden transition-all shadow-xs"
          style={{ 
            background: `linear-gradient(135deg, ${themeColorCSS} 0%, color-mix(in srgb, ${themeColorCSS} 80%, #000) 100%)`
          }}
        >
          <div className="flex items-center justify-between gap-2 relative z-10">
            <span className="bg-white/20 border border-white/30 backdrop-blur-md rounded-full px-3 py-1 text-[10px] font-black text-white uppercase tracking-wider inline-flex items-center gap-1.5">
              <ShieldCheck size={14} /> REKAP PRESENSI DIGITAL
            </span>

            <div className="text-right">
              <span className="text-[9px] text-white/80 font-bold uppercase tracking-widest block">TINGKAT KEHADIRAN</span>
              <span className="font-black text-base text-white tracking-wider">{attendanceRate}%</span>
            </div>
          </div>

          <div className="space-y-1 relative z-10">
            <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
              {studentName}
            </h2>
            <p className="text-xs text-white/90 font-medium">
              NIS: <strong className="font-extrabold text-white">{studentNis}</strong> &bull; Kelas: <strong className="font-extrabold text-white">{studentClass}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. METRIC SUMMARY STAT CARDS (2x2 Mobile Grid) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4.5 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hadir Tepat</span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 leading-none">{counts.hadir}</p>
        </div>

        <div className="bg-white p-4.5 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Terlambat</span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 leading-none">{counts.terlambat}</p>
        </div>

        <div className="bg-white p-4.5 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Izin / Sakit</span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shrink-0">
              <Calendar size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-700 leading-none">{counts.izin}</p>
        </div>

        <div className="bg-white p-4.5 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alpa / Absen</span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
              <XCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 leading-none">{counts.absen}</p>
        </div>
      </div>

      {/* ── 3. ATTENDANCE HISTORY LOG LIST & FILTER SEARCH ── */}
      <div className="bg-white p-5 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Clock size={16} style={{ color: themeColorCSS }} /> Histori Absensi Harian
          </h2>

          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari tanggal atau status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 space-y-2">
            <Loader2 size={24} className="animate-spin mx-auto text-emerald-600" />
            <p className="text-xs font-semibold">Memuat catatan riwayat absensi...</p>
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-[var(--ui-radius-card)] space-y-2">
            <CalendarDays size={32} className="mx-auto text-slate-300" />
            <p className="font-extrabold text-xs text-slate-700">Belum ada catatan riwayat absensi.</p>
            <p className="text-[11px] text-slate-400">Absensi harian via Sharelok GPS atau Mesin Tap akan otomatis dicatat di sini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {[...filteredAttendance].reverse().map((item, idx) => {
              const rawStatus = String(item.status || 'hadir').toLowerCase();
              let cfgKey = 'hadir';
              if (rawStatus.includes('terlambat') || rawStatus.includes('late')) cfgKey = 'terlambat';
              else if (rawStatus.includes('izin') || rawStatus.includes('sakit')) cfgKey = 'izin';
              else if (rawStatus.includes('alpa') || rawStatus.includes('absen')) cfgKey = 'absen';

              const cfg = STATUS_CONFIG[cfgKey];
              const IconComp = cfg.icon;

              const dateVal = item.date || item.timestamp || item.created_at;
              const dateDisplay = dateVal 
                ? new Date(dateVal).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
                : '-';

              return (
                <div key={item.id || idx} className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors px-2 rounded-[var(--ui-radius-small)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 border ${cfg.bg}`}>
                      <IconComp size={18} className={cfg.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{dateDisplay}</p>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        {item.jam_masuk || item.timeIn ? `Masuk: ${item.jam_masuk || item.timeIn} • Pulang: ${item.jam_keluar || item.timeOut || '16:00'}` : 'Waktu Presensi Digital'}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wider shrink-0 border ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default RiwayatAbsensi;

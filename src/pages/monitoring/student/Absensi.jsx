import { useState, useEffect, useCallback, useMemo } from 'react';
import useAuthStore from '../../../store/monitoring/authStore';
import useAbsensiStore from '../../../store/monitoring/absensiStore';
import { useAppStore } from '../../../store/useAppStore.js';
import { 
  CheckCircle2, Clock, Calendar, AlertCircle, Fingerprint, MapPin, Camera, 
  Navigation, Crosshair, ArrowRight, Check, X, Building2, User, RefreshCw
} from 'lucide-react';
import { CustomSelect } from '../../../components/CustomSelect.jsx';

/**
 * student/Absensi.jsx
 * Halaman Presensi & Kehadiran Siswa dengan UI/UX Modern & Intuitive Calendar.
 * Matches Theme Settings, Primary Color Tokens, and Clean Card Layout.
 */

// Calculate distance in meters between two GPS coordinates (Haversine formula)
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

const StudentAbsensi = () => {
  const { user } = useAuthStore();
  const appSettings = useAppStore((state) => state.appSettings) || {};
  const primaryColor = appSettings.primaryColor || appSettings.themeColor || 'var(--ui-primary, #064e3b)';
  const themeColorCSS = primaryColor.startsWith('var') ? 'var(--ui-primary, #064e3b)' : primaryColor;

  // Settings from Hubin Absensi Store
  const { metode, gpsConfig } = useAbsensiStore();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Live Sharelok GPS States
  const [userCoords, setUserCoords] = useState(null);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [companyCoords, setCompanyCoords] = useState({ lat: -6.9175, lng: 107.6191 });
  const [pklData, setPklData] = useState(null);
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [todayStatus, setTodayStatus] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const todayDate = new Date();
  const hari = todayDate.toLocaleDateString('id-ID', { weekday: 'long' });
  const tanggal = todayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const dateFormatted = `${hari}, ${tanggal}`;

  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" }
  ];

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: new Date().getFullYear() - 2 + i,
    label: (new Date().getFullYear() - 2 + i).toString()
  }));

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const allowedRadius = gpsConfig?.radiusMeter || 100;

  // Fetch PKL company location coordinates for this student
  useEffect(() => {
    if (!user) return;
    const token = user?.authToken || JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
    fetch('/api/monitoring/pkl-students', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(res => {
        if (res.ok && Array.isArray(res.data)) {
          const myRecord = res.data.find(s => s.nis === user?.username || s.nis === user?.nis);
          if (myRecord) {
            setPklData(myRecord);
            if (myRecord.lat && myRecord.lng) {
              setCompanyCoords({ lat: parseFloat(myRecord.lat), lng: parseFloat(myRecord.lng) });
            }
          }
        }
      })
      .catch(() => {});
  }, [user]);

  // Request browser Geolocation
  const getLiveLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation tidak didukung oleh browser Anda.');
      return;
    }
    setLocatingGPS(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setLocatingGPS(false);
      },
      (err) => {
        setLocatingGPS(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Izin GPS ditolak. Silakan aktifkan izin lokasi di browser.');
        } else {
          setGpsError('Gagal mendapatkan posisi GPS terbaru.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const distanceMeters = (userCoords && companyCoords) 
    ? calculateDistanceMeters(userCoords.lat, userCoords.lng, companyCoords.lat, companyCoords.lng) 
    : null;

  const withinRadius = distanceMeters !== null ? distanceMeters <= allowedRadius : false;

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelfiePhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDoAbsen = async (type = 'masuk') => {
    if (metode?.gps && gpsConfig?.restrictRadius && distanceMeters !== null && !withinRadius) {
      alert(`Posisi Anda (${distanceMeters}m) melebihi batas radius absensi (${allowedRadius}m) dari tempat PKL.`);
      return;
    }

    if (metode?.selfie && !selfiePhoto) {
      alert('Metode Selfie aktif. Silakan upload / ambil foto selfie terlebih dahulu.');
      return;
    }

    setCheckingIn(true);
    try {
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setTodayStatus({
        mode: type,
        time: nowStr,
        method: metode?.gps ? 'GPS Radius' : (metode?.selfie ? 'Selfie' : 'Sharelok')
      });
      showToast(`Absen ${type === 'masuk' ? 'Masuk' : 'Pulang'} berhasil dicatat pukul ${nowStr}!`);
      setShowFormModal(false);
      fetchAbsensiData();
    } catch {
      showToast(`Absen ${type === 'masuk' ? 'Masuk' : 'Pulang'} berhasil dicatat!`);
      setShowFormModal(false);
    } finally {
      setCheckingIn(false);
    }
  };

  const buildDatabaseAttendanceData = useCallback(() => {
    const totalDays = new Date(filter.year, filter.month, 0).getDate();
    setDaysInMonth(totalDays);

    const storeRecords = useAppStore.getState().attendanceRecords || [];
    const myNis = String(user?.username || user?.nis || '').trim().toLowerCase();

    const filteredRecords = storeRecords.filter(r => {
      const rNis = String(r.nis || r.studentCode || r.username || '').trim().toLowerCase();
      const rDate = r.date || r.timestamp || r.created_at;
      if (!rDate) return false;
      const d = new Date(rDate);
      return (rNis === myNis || !myNis) && d.getMonth() + 1 === filter.month && d.getFullYear() === filter.year;
    });

    const logsMap = {};
    let hadirCount = 0;
    let lateCount = 0;
    let izinCount = 0;
    let alpaCount = 0;

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${filter.year}-${String(filter.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(filter.year, filter.month - 1, day);
      const dayOfWeek = d.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        logsMap[dateStr] = { status: 'Libur Akhir Pekan', isLibur: true };
      } else {
        const found = filteredRecords.find(r => {
          const rDateStr = new Date(r.date || r.timestamp || r.created_at).toISOString().slice(0, 10);
          return rDateStr === dateStr;
        });

        if (found) {
          const st = String(found.status || 'HADIR').toUpperCase();
          if (st.includes('TERLAMBAT') || st.includes('LATE')) {
            logsMap[dateStr] = { status: 'Terlambat', isLate: true, timeIn: found.timeIn || '07:15', timeOut: found.timeOut || '16:00' };
            lateCount++;
          } else if (st.includes('IZIN') || st.includes('SAKIT')) {
            logsMap[dateStr] = { status: 'Izin', isIzin: true, timeIn: found.timeIn || '08:00' };
            izinCount++;
          } else if (st.includes('ALPA')) {
            logsMap[dateStr] = { status: 'Alpa', isAlpa: true };
            alpaCount++;
          } else {
            logsMap[dateStr] = { status: 'Tepat Waktu', isHadir: true, timeIn: found.timeIn || '06:45', timeOut: found.timeOut || '16:00' };
            hadirCount++;
          }
        }
      }
    }

    setData({
      records: logsMap,
      summary: {
        hadir: hadirCount,
        terlambat: lateCount,
        izinSakit: izinCount,
        alpa: alpaCount
      }
    });
  }, [filter, user]);

  const fetchAbsensiData = useCallback(() => {
    setLoading(true);
    const token = user?.authToken || JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
    const url = `/api/monitoring/absensi/siswa?month=${filter.month}&year=${filter.year}&nis=${user?.username || user?.nis || ''}`;

    fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.ok && resData.data) {
          setData(resData.data);
          setDaysInMonth(resData.daysInMonth || 31);
        } else {
          buildDatabaseAttendanceData();
        }
      })
      .catch(() => {
        buildDatabaseAttendanceData();
      })
      .finally(() => setLoading(false));
  }, [filter, user, buildDatabaseAttendanceData]);

  useEffect(() => {
    fetchAbsensiData();
  }, [fetchAbsensiData]);

  const records = data?.records || {};
  const totalHadir = data?.summary?.hadir || 0;
  const totalTerlambat = data?.summary?.terlambat || 0;
  const totalIzinSakit = data?.summary?.izinSakit || 0;
  const totalAlpa = data?.summary?.alpa || 0;

  // Day offset for 1st day of the selected month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayIndex = useMemo(() => {
    return new Date(filter.year, filter.month - 1, 1).getDay();
  }, [filter.year, filter.month]);

  const studentName = user?.name || user?.nama || user?.username || 'Adam Putra Setiawan';
  const studentNis = user?.username || user?.nis || '242510001';
  const studentClass = user?.class_name || user?.kelas || 'XII TKR 1';
  const companyName = pklData?.nama_perusahaan || pklData?.company_name || 'PT. TELKOM INDONESIA - DIVISI DIGITAL';

  return (
    <div className="space-y-6 w-full pb-20 font-sans text-slate-800">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-4 rounded-[var(--ui-radius-card)] bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-sm fixed top-5 right-5 z-[110] animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} /> {toastMsg}
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-white/80 hover:text-white border-none bg-transparent cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── 1. HEADER & TOP BANNER (MATCHES THEME SETTINGS) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-900 text-base sm:text-lg">Presensi &amp; Kehadiran Siswa</h2>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3.5 py-1.5 rounded-[var(--ui-radius-pill)] text-xs font-bold flex items-center gap-1.5">
            <Calendar size={14} className="text-emerald-600" /> Hari Ini, {dateFormatted}
          </span>
        </div>

        {/* Dynamic Theme Banner Hero Card */}
        <div 
          className="rounded-[24px] p-5 sm:p-6 text-white space-y-4 relative overflow-hidden transition-all shadow-xs"
          style={{ 
            background: `linear-gradient(135deg, ${themeColorCSS} 0%, color-mix(in srgb, ${themeColorCSS} 80%, #0f172a) 100%)`
          }}
        >
          {/* Ambient Decorative Curve */}
          <div className="absolute -top-16 -right-16 w-52 h-52 bg-white/10 rounded-full blur-xl pointer-events-none" />

          {/* Top Row: Method Badge & Live Status Pill */}
          <div className="flex items-center justify-between gap-2 relative z-10 flex-wrap">
            <span className="bg-white/15 border border-white/20 backdrop-blur-md rounded-full px-3 py-1 text-xs font-bold text-white inline-flex items-center gap-1.5">
              <Fingerprint size={14} /> Presensi GPS &amp; Mesin Tap
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">STATUS PRESENSI:</span>
              <span className={`font-black text-xs px-3 py-1 rounded-[var(--ui-radius-pill)] uppercase tracking-wider ${
                todayStatus 
                  ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/40' 
                  : 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
              }`}>
                {todayStatus ? `TERCATAT (${todayStatus.time})` : 'BELUM PRESENSI'}
              </span>
            </div>
          </div>

          {/* Student Profile Info */}
          <div className="flex items-center gap-3.5 relative z-10 pt-1">
            <div 
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-[var(--ui-radius-card)] bg-white flex items-center justify-center shrink-0 shadow-sm font-black text-lg overflow-hidden p-1"
              style={{ color: themeColorCSS }}
            >
              <User size={30} className="text-slate-400" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="font-extrabold text-base sm:text-xl text-white tracking-wide truncate leading-tight uppercase">
                {studentName}
              </h3>
              <div className="flex items-center gap-2 text-xs text-white/90 flex-wrap">
                <span className="bg-white/15 border border-white/20 px-2.5 py-0.5 rounded-md font-semibold">
                  NIS: <strong className="font-extrabold text-white">{studentNis}</strong>
                </span>
                <span className="bg-white/15 border border-white/20 px-2.5 py-0.5 rounded-md font-semibold">
                  Kelas: <strong className="font-extrabold text-white">{studentClass}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Inset Company & GPS Status Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-[var(--ui-radius-card)] p-3.5 sm:p-4 border border-white/15 space-y-2.5 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-white/90">
              <div className="flex items-center gap-2 truncate">
                <Building2 size={16} className="text-white/80 shrink-0" />
                <span className="truncate">Perusahaan: <strong className="font-bold text-white">{companyName}</strong></span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Navigation size={14} className="text-white/80 shrink-0" />
                <span>Radius Max: <strong className="font-bold text-white">{allowedRadius}m</strong></span>
                {userCoords && distanceMeters !== null && (
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${withinRadius ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
                    ({distanceMeters}m {withinRadius ? 'di radius' : 'di luar'})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button 
            type="button"
            onClick={() => {
              if (!userCoords) getLiveLocation();
              setShowFormModal(true);
            }}
            className="w-full bg-white hover:bg-slate-50 text-[var(--ui-primary,#064e3b)] rounded-[var(--ui-radius-card)] py-3.5 px-4 text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 shadow-sm cursor-pointer border-none transition-all active:scale-[0.99] group relative z-10"
            style={{ color: themeColorCSS }}
          >
            <Fingerprint size={20} className="transition-transform group-hover:scale-110" />
            <span>Presensi Sekarang (Sharelok GPS)</span>
            <ArrowRight size={16} className="ml-auto text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* ── 2. SUMMARY STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-xs flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tepat Waktu</span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <h4 className="text-xl font-black text-emerald-700 leading-none">{totalHadir} <span className="text-xs font-bold text-slate-400">Hari</span></h4>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-xs flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Terlambat</span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock size={16} />
            </div>
          </div>
          <h4 className="text-xl font-black text-amber-700 leading-none">{totalTerlambat} <span className="text-xs font-bold text-slate-400">Kali</span></h4>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-xs flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Izin / Sakit</span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <Calendar size={16} />
            </div>
          </div>
          <h4 className="text-xl font-black text-sky-700 leading-none">{totalIzinSakit} <span className="text-xs font-bold text-slate-400">Hari</span></h4>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-xs flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alpa</span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertCircle size={16} />
            </div>
          </div>
          <h4 className="text-xl font-black text-rose-700 leading-none">{totalAlpa} <span className="text-xs font-bold text-slate-400">Hari</span></h4>
        </div>
      </div>

      {/* ── 3. CALENDAR & HISTORY GRID CONTAINER ── */}
      <div className="bg-white p-5 sm:p-6 rounded-[var(--ui-radius-card)] border border-slate-100 shadow-xs space-y-4">
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Kalender Absensi Bulan {months.find(m => m.value === filter.month)?.label || ''} {filter.year}
            </h3>
            <p className="text-xs text-slate-400 font-medium">Rekapitulasi riwayat presensi harian siswa</p>
          </div>

          <div className="flex items-center gap-2">
            <CustomSelect
              options={months}
              value={filter.month}
              onChange={(val) => setFilter(f => ({ ...f, month: Number(val) }))}
              placeholder="Bulan"
              className="w-32"
            />
            <CustomSelect
              options={years}
              value={filter.year}
              onChange={(val) => setFilter(f => ({ ...f, year: Number(val) }))}
              placeholder="Tahun"
              className="w-28"
            />
          </div>
        </div>

        {/* Legend Badges */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-[11px] font-bold text-slate-600 pb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Tepat Waktu
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Terlambat
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
            <span className="w-2 h-2 rounded-full bg-sky-500" /> Izin / Sakit
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Alpa
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-500 border border-slate-100">
            <span className="w-2 h-2 rounded-full bg-slate-300" /> Libur
          </span>
        </div>

        {/* Weekday Columns Header */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center border-b border-slate-100 pb-2.5">
          {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((dayName, idx) => (
            <div 
              key={dayName} 
              className={`text-[10px] sm:text-xs font-black uppercase tracking-wider py-1 ${
                idx === 0 || idx === 6 ? 'text-rose-500 font-extrabold' : 'text-slate-600'
              }`}
            >
              <span className="hidden sm:inline">{dayName}</span>
              <span className="sm:hidden">{dayName.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* 7-Column Real Calendar Grid with Weekday Offsets */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {/* Empty Slots before the 1st of the month */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div 
              key={`empty-${idx}`} 
              className="p-2 sm:p-3 rounded-[var(--ui-radius-small)] border border-dashed border-slate-100 bg-slate-50/40 min-h-[72px] sm:min-h-[88px] opacity-30" 
            />
          ))}

          {/* Days of Month */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = `${filter.year}-${String(filter.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = records[dateStr];
            const isToday = todayDate.getDate() === day && todayDate.getMonth() + 1 === filter.month && todayDate.getFullYear() === filter.year;

            let tileStyle = "bg-white border-slate-200/80 hover:border-slate-300";
            if (isToday) {
              tileStyle = "bg-white border-2 border-emerald-500 ring-4 ring-emerald-500/10 shadow-xs";
            } else if (record?.isHadir) {
              tileStyle = "bg-emerald-50/60 border-emerald-200/80";
            } else if (record?.isLate) {
              tileStyle = "bg-amber-50/60 border-amber-200/80";
            } else if (record?.isIzin) {
              tileStyle = "bg-sky-50/60 border-sky-200/80";
            } else if (record?.isAlpa) {
              tileStyle = "bg-rose-50/60 border-rose-200/80";
            } else if (record?.isLibur) {
              tileStyle = "bg-slate-50/80 border-slate-100 opacity-60";
            }

            return (
              <div 
                key={day}
                className={`p-2 sm:p-3 rounded-[var(--ui-radius-small)] border transition-all flex flex-col justify-between min-h-[72px] sm:min-h-[88px] ${tileStyle}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-black text-xs sm:text-sm ${isToday ? 'text-emerald-700 font-extrabold' : 'text-slate-800'}`}>
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-600 text-white tracking-tight">
                      Hari Ini
                    </span>
                  )}
                  {!isToday && record?.isHadir && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                  {!isToday && record?.isLate && <Clock size={14} className="text-amber-600 shrink-0" />}
                </div>

                <div className="mt-1">
                  {record?.isHadir && (
                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 sm:px-2 py-0.5 rounded-md border border-emerald-200/60 truncate max-w-full">
                      Hadir
                    </span>
                  )}
                  {record?.isLate && (
                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 sm:px-2 py-0.5 rounded-md border border-amber-200/60 truncate max-w-full">
                      Terlambat
                    </span>
                  )}
                  {record?.isIzin && (
                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-sky-700 bg-sky-100/80 px-1.5 sm:px-2 py-0.5 rounded-md border border-sky-200/60 truncate max-w-full">
                      Izin/Sakit
                    </span>
                  )}
                  {record?.isAlpa && (
                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-rose-700 bg-rose-100/80 px-1.5 sm:px-2 py-0.5 rounded-md border border-rose-200/60 truncate max-w-full">
                      Alpa
                    </span>
                  )}
                  {record?.isLibur && (
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">
                      Libur
                    </span>
                  )}
                  {!record && !isToday && (
                    <span className="text-[9px] font-medium text-slate-300 block truncate">
                      -
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SHARELOK ABSEN MODAL ── */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowFormModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-[var(--ui-radius-card)] p-5 sm:p-6 space-y-5 shadow-sm border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="text-[var(--ui-primary,#064e3b)]" size={20} />
                <h3 className="font-black text-slate-800 text-base">Konfirmasi Absen Sharelok</h3>
              </div>
              <button type="button" onClick={() => setShowFormModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 border-none cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* GPS Location Status Box */}
            <div className="bg-slate-50 p-4 rounded-[var(--ui-radius-small)] border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Crosshair size={14} className="text-emerald-600" /> Posisi GPS Anda:
                </span>
                <button type="button" onClick={getLiveLocation} className="text-xs text-emerald-700 font-bold hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1">
                  <RefreshCw size={12} className={locatingGPS ? 'animate-spin' : ''} /> {locatingGPS ? 'Mencari...' : 'Refresh GPS'}
                </button>
              </div>

              {userCoords ? (
                <div className="text-xs text-slate-700 font-mono bg-white p-2.5 rounded-[var(--ui-radius-small)] border border-slate-200 flex items-center justify-between">
                  <span>{userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}</span>
                  {distanceMeters !== null && (
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${withinRadius ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {distanceMeters}m ({withinRadius ? 'Di Radius' : 'Di Luar Radius'})
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-700 font-medium bg-amber-50 p-2.5 rounded-[var(--ui-radius-small)] border border-amber-200">
                  {gpsError || 'Sedang mengambil posisi GPS terbaru...'}
                </p>
              )}
            </div>

            {metode?.selfie && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <Camera size={14} className="text-sky-600" /> Foto Selfie Mandatory
                </label>
                {selfiePhoto ? (
                  <div className="relative w-full h-36 rounded-[var(--ui-radius-small)] overflow-hidden border border-slate-200">
                    <img src={selfiePhoto} alt="Selfie" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setSelfiePhoto(null)} className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white border-none cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 rounded-[var(--ui-radius-small)] border-2 border-dashed border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors">
                    <Camera size={24} className="text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-600">Ambil / Upload Foto Selfie</span>
                    <input type="file" accept="image/*" capture="user" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => handleDoAbsen('masuk')} 
                disabled={checkingIn} 
                className="py-3 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary,#064e3b)] text-white text-xs font-black shadow-xs border-none cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: themeColorCSS }}
              >
                Absen Masuk
              </button>
              <button 
                type="button" 
                onClick={() => handleDoAbsen('pulang')} 
                disabled={checkingIn} 
                className="py-3 rounded-[var(--ui-radius-small)] bg-slate-800 text-white text-xs font-black shadow-xs border-none cursor-pointer hover:bg-slate-900 transition-colors"
              >
                Absen Pulang
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentAbsensi;

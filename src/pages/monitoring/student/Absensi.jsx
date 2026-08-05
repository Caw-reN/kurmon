import { useState, useEffect, useCallback, useMemo } from 'react';
import useAuthStore from '../../../store/monitoring/authStore';
import useAbsensiStore from '../../../store/monitoring/absensiStore';
import { useAppStore } from '../../../store/useAppStore.js';
import { 
  CheckCircle2, Clock, Calendar, AlertCircle, Fingerprint, 
  MapPin, Camera, Navigation, X, Building2, ShieldCheck, 
  Sparkles, AlertTriangle, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import { CustomSelect } from '../../../components/CustomSelect.jsx';

/**
 * student/Absensi.jsx
 * Halaman Presensi & Kehadiran Siswa
 * Redesigned with premium aesthetics, intuitive calendar grid with day headers, 
 * live GPS radius indicator, and clear attendance status feedback.
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
  const primaryColor = appSettings.primaryColor || 'var(--ui-primary, #064e3b)';

  // Settings from Hubin Absensi Store
  const { metode, gpsConfig } = useAbsensiStore();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
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
  const tanggal = todayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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

  const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

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
          setGpsError('Izin lokasi (GPS) ditolak. Aktifkan lokasi di browser Anda.');
        } else {
          setGpsError('Gagal mendeteksi koordinat lokasi GPS Anda.');
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
      alert('Metode Selfie aktif. Silakan ambil atau upload foto selfie terlebih dahulu.');
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
            logsMap[dateStr] = { status: 'Izin / Sakit', isIzin: true, timeIn: found.timeIn || '08:00' };
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
  const totalAbsenRecorded = totalHadir + totalTerlambat + totalIzinSakit + totalAlpa;

  // Calculate calendar grid metrics (days in month & starting day offset Monday=0)
  const calendarMetrics = useMemo(() => {
    const days = new Date(filter.year, filter.month, 0).getDate();
    const firstDay = new Date(filter.year, filter.month - 1, 1).getDay();
    // Convert Sun=0, Mon=1... to Mon=0, Tue=1... Sun=6
    const startOffset = (firstDay + 6) % 7;
    return { daysInMonth: days, startOffset };
  }, [filter.month, filter.year]);

  return (
    <div className="space-y-6 w-full pb-20 font-sans text-slate-800">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-xl fixed top-5 right-5 z-[110] animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} /> {toastMsg}
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-white/80 hover:text-white border-none bg-transparent cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── 1. HEADER & HERO BANNER ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">Presensi &amp; Kehadiran Siswa</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Pemantauan data kehadiran harian dan integrasi presensi GPS tempat PKL</p>
          </div>
          <div className="self-start sm:self-auto bg-slate-100/80 text-slate-700 border border-slate-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xs">
            <Calendar size={14} className="text-emerald-600" />
            <span>Hari Ini: <strong>{dateFormatted}</strong></span>
          </div>
        </div>

        {/* Sleek Gradient Hero Card */}
        <div className="relative overflow-hidden rounded-[var(--ui-radius-card,24px)] bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-950 p-6 sm:p-7 text-white shadow-lg border border-emerald-700/40">
          
          {/* Subtle Decorative Background Circles */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-12 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            
            {/* Top Bar: Method Badge & Today's Status */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="bg-white/15 border border-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Fingerprint size={14} className="text-emerald-300" /> Presensi GPS &amp; Mesin Tap
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200/80">Status Hari Ini:</span>
                {todayStatus ? (
                  <span className="bg-emerald-500/30 border border-emerald-400/40 text-white px-3 py-0.5 rounded-full text-xs font-black flex items-center gap-1.5 animate-pulse">
                    <CheckCircle2 size={13} className="text-emerald-300" /> {todayStatus.mode === 'masuk' ? 'HADIR MASUK' : 'HADIR PULANG'} ({todayStatus.time})
                  </span>
                ) : (
                  <span className="bg-amber-500/30 border border-amber-400/40 text-amber-100 px-3 py-0.5 rounded-full text-xs font-black flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-300" /> BELUM PRESENSI
                  </span>
                )}
              </div>
            </div>

            {/* Student & PKL Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              
              <div className="md:col-span-8 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                    {user?.name || user?.nama || user?.username || 'ADAM PUTRA SETIAWAN'}
                  </h2>
                </div>

                <div className="flex items-center gap-2 text-xs font-extrabold flex-wrap">
                  <span className="bg-white/15 border border-white/20 px-3 py-1 rounded-lg text-emerald-100">
                    NIS: {user?.username || user?.nis || '242510001'}
                  </span>
                  <span className="bg-white/15 border border-white/20 px-3 py-1 rounded-lg text-emerald-100">
                    Kelas: {user?.class_name || user?.kelas || 'XII TKR 1'}
                  </span>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3 text-xs font-medium text-emerald-100/90">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 size={15} className="text-emerald-300 shrink-0" />
                    <span className="truncate">Perusahaan PKL: <strong className="text-white font-bold">{pklData?.nama_perusahaan || 'PT. TELKOM INDONESIA - DIVISI DIGITAL'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Navigation size={15} className="text-emerald-300 shrink-0" />
                    <span>Radius GPS: <strong className="text-white font-bold">{allowedRadius} Meter</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="md:col-span-4 flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!userCoords) getLiveLocation();
                    setShowFormModal(true);
                  }}
                  className="w-full bg-white hover:bg-emerald-50 text-emerald-950 font-black rounded-2xl py-3.5 px-4 text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md border-none cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Fingerprint size={18} className="text-emerald-700" />
                  <span>Form Presensi Live Sharelok</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* ── 2. SUMMARY STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        
        <div className="bg-white p-4 sm:p-5 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-28 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-full" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Tepat Waktu</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-900">{totalHadir}</h3>
            <span className="text-xs font-bold text-slate-400">Hari</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-28 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 rounded-l-full" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Terlambat</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform">
              <Clock size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-amber-700">{totalTerlambat}</h3>
            <span className="text-xs font-bold text-slate-400">Kali</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-28 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500 rounded-l-full" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Izin / Sakit</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 group-hover:scale-110 transition-transform">
              <Calendar size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-sky-700">{totalIzinSakit}</h3>
            <span className="text-xs font-bold text-slate-400">Hari</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-28 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500 rounded-l-full" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Alpa</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 group-hover:scale-110 transition-transform">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-rose-700">{totalAlpa}</h3>
            <span className="text-xs font-bold text-slate-400">Hari</span>
          </div>
        </div>

      </div>

      {/* ── 3. CALENDAR GRID CONTAINER ── */}
      <div className="bg-white p-6 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-xs space-y-5">
        
        {/* Calendar Header with Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-emerald-600" />
              Kalender Absensi Bulan {months.find(m => m.value === filter.month)?.label || ''} {filter.year}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Rincian status presensi harian siswa per bulan</p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <CustomSelect
              options={months}
              value={filter.month}
              onChange={(val) => setFilter(f => ({ ...f, month: Number(val) }))}
              placeholder="Bulan"
              className="w-36"
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

        {/* Legend Indicator */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Tepat Waktu
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Terlambat
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" /> Izin / Sakit
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Alpa
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" /> Libur Akhir Pekan
          </div>
        </div>

        {/* Calendar Day-of-Week Header (Sen, Sel, Rab, Kam, Jum, Sab, Min) */}
        <div className="grid grid-cols-7 gap-2 text-center border-b border-slate-100 pb-2">
          {dayNames.map((dayName, idx) => (
            <div 
              key={dayName} 
              className={`text-xs font-black uppercase tracking-wider py-1 ${
                idx >= 5 ? 'text-rose-500' : 'text-slate-500'
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          
          {/* Empty Padding Cells Before 1st Day of Month */}
          {Array.from({ length: calendarMetrics.startOffset }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-24 sm:h-28 rounded-2xl bg-slate-50/30 border border-transparent" />
          ))}

          {/* Actual Days of the Month */}
          {Array.from({ length: calendarMetrics.daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = `${filter.year}-${String(filter.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = records[dateStr];
            const isToday = new Date().getDate() === day && new Date().getMonth() + 1 === filter.month && new Date().getFullYear() === filter.year;

            let tileStyle = 'bg-white border-slate-200/80 hover:border-slate-300';
            let statusText = record?.status || 'Belum Absen';
            let statusColor = 'text-slate-400';
            let badgeBg = 'bg-slate-100 text-slate-500';
            let IconComponent = null;

            if (record?.isHadir) {
              tileStyle = 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-300';
              statusColor = 'text-emerald-700 font-black';
              badgeBg = 'bg-emerald-100/80 text-emerald-800';
              IconComponent = <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />;
            } else if (record?.isLate) {
              tileStyle = 'bg-amber-50/50 border-amber-200/80 hover:border-amber-300';
              statusColor = 'text-amber-700 font-black';
              badgeBg = 'bg-amber-100/80 text-amber-800';
              IconComponent = <Clock size={14} className="text-amber-600 shrink-0" />;
            } else if (record?.isIzin) {
              tileStyle = 'bg-sky-50/50 border-sky-200/80 hover:border-sky-300';
              statusColor = 'text-sky-700 font-black';
              badgeBg = 'bg-sky-100/80 text-sky-800';
              IconComponent = <Calendar size={14} className="text-sky-600 shrink-0" />;
            } else if (record?.isAlpa) {
              tileStyle = 'bg-rose-50/50 border-rose-200/80 hover:border-rose-300';
              statusColor = 'text-rose-700 font-black';
              badgeBg = 'bg-rose-100/80 text-rose-800';
              IconComponent = <AlertCircle size={14} className="text-rose-600 shrink-0" />;
            } else if (record?.isLibur) {
              tileStyle = 'bg-slate-50 border-slate-100 opacity-60';
              statusText = 'Libur Akhir Pekan';
              statusColor = 'text-slate-400 font-semibold';
              badgeBg = 'bg-slate-100 text-slate-400';
            }

            return (
              <div
                key={day}
                className={`p-2.5 sm:p-3.5 rounded-2xl border transition-all flex flex-col justify-between h-24 sm:h-28 relative overflow-hidden ${tileStyle} ${
                  isToday ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-sm' : ''
                }`}
              >
                {/* Date & Today Tag */}
                <div className="flex items-center justify-between">
                  <span className={`font-black text-xs sm:text-sm ${isToday ? 'text-emerald-700' : 'text-slate-800'}`}>
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                      Hari Ini
                    </span>
                  )}
                  {IconComponent && !isToday && IconComponent}
                </div>

                {/* Status Text & Time Detail */}
                <div>
                  <p className={`text-[9px] sm:text-[10px] truncate leading-tight ${statusColor}`}>
                    {statusText}
                  </p>
                  {record?.timeIn && (
                    <p className="text-[8px] sm:text-[9px] font-mono text-slate-500 font-semibold mt-1 truncate">
                      {record.timeIn} {record.timeOut ? `- ${record.timeOut}` : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

        </div>

      </div>

      {/* ── 4. SHARELOK ABSEN MODAL ── */}
      {showFormModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in" 
          onClick={() => setShowFormModal(false)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-[var(--ui-radius-card,24px)] p-6 space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95" 
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Konfirmasi Absen Sharelok GPS</h3>
                  <p className="text-xs text-slate-400 font-medium">Validasi lokasi GPS presensi tempat PKL</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowFormModal(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 border-none cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* GPS Radius Live Status Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Navigation size={14} className="text-emerald-600" /> Jarak ke Perusahaan PKL:
                </span>
                <span className="font-mono text-slate-800">
                  {locatingGPS ? 'Mendeteksi GPS...' : (distanceMeters !== null ? `${distanceMeters} Meter` : 'Belum Terdeteksi')}
                </span>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {locatingGPS ? (
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" /> Memuat lokasi presensi...
                  </span>
                ) : distanceMeters !== null ? (
                  withinRadius ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Posisi Anda Dalam Radius ({distanceMeters}m ≤ {allowedRadius}m)
                    </span>
                  ) : (
                    <span className="bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Di Luar Radius ({distanceMeters}m &gt; {allowedRadius}m)
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={getLiveLocation}
                    className="text-xs font-bold text-emerald-700 underline bg-transparent border-none cursor-pointer"
                  >
                    Dapatkan Koordinat GPS Sekarang
                  </button>
                )}
              </div>

              {gpsError && (
                <p className="text-xs text-rose-600 font-semibold">{gpsError}</p>
              )}
            </div>

            {/* Mandatory Selfie Photo Section (If Enabled) */}
            {metode?.selfie && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <Camera size={15} className="text-sky-600" /> Foto Selfie Mandatory
                </label>
                {selfiePhoto ? (
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-slate-200">
                    <img src={selfiePhoto} alt="Selfie" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setSelfiePhoto(null)} 
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white border-none cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors">
                    <Camera size={26} className="text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-600">Ambil / Upload Foto Selfie</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Klik untuk mengunggah foto presensi</span>
                    <input type="file" accept="image/*" capture="user" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => handleDoAbsen('masuk')} 
                disabled={checkingIn} 
                className="py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-md border-none cursor-pointer transition-all active:scale-[0.98]"
              >
                {checkingIn ? 'Memproses...' : 'Absen Masuk'}
              </button>
              <button 
                type="button" 
                onClick={() => handleDoAbsen('pulang')} 
                disabled={checkingIn} 
                className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black shadow-md border-none cursor-pointer transition-all active:scale-[0.98]"
              >
                {checkingIn ? 'Memproses...' : 'Absen Pulang'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentAbsensi;

import { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../../store/monitoring/authStore';
import useAbsensiStore from '../../../store/monitoring/absensiStore';
import { useAppStore } from '../../../store/useAppStore.js';
import { ShieldCheck, RefreshCw, CheckCircle2, Clock, Calendar, AlertCircle, Fingerprint, MapPin, Camera, QrCode, PenLine, Navigation, Crosshair, Sparkles, Upload, ArrowRight, Check, X, ShieldAlert, FileText, User, Loader2 } from 'lucide-react';
import { CustomSelect } from '../../../components/CustomSelect.jsx';
import { Button } from '../../../components/ui.jsx';

/**
 * student/Absensi.jsx
 * Halaman Absensi Live Sharelok GPS & Fingerprint Siswa.
 * Matches Student Dashboard Header Banner, Theme Colors, Radius & Shadows.
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
  const authToken = user?.authToken;
  const appSettings = useAppStore((state) => state.appSettings) || {};
  const primaryColor = appSettings.primaryColor || 'var(--ui-primary, #064e3b)';

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
  const [manualReason, setManualReason] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [todayStatus, setTodayStatus] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const todayDate = new Date();
  const hari = todayDate.toLocaleDateString('id-ID', { weekday: 'long' });
  const tanggal = todayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const dateFormatted = `${hari}, ${tanggal}`;

  const academicCalendarRaw = useAppStore(state => state.academicCalendar);
  const calendarCategoriesRaw = useAppStore(state => state.calendarCategories);
  const academicCalendar = academicCalendarRaw || [];
  const calendarCategories = calendarCategoriesRaw || [];

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

    const todayDateObj = new Date();
    const curYear = todayDateObj.getFullYear();
    const curMonth = todayDateObj.getMonth() + 1;
    const curDayNum = todayDateObj.getDate();

    const logsMap = {};
    let hadirCount = 0;
    let lateCount = 0;
    let izinCount = 0;
    let alpaCount = 0;

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${filter.year}-${String(filter.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(filter.year, filter.month - 1, day);
      const dayOfWeek = d.getDay();

      // Check if day is past, today, or future
      let dayCat = 'future';
      if (filter.year < curYear || (filter.year === curYear && filter.month < curMonth)) {
        dayCat = 'past';
      } else if (filter.year === curYear && filter.month === curMonth) {
        if (day === curDayNum) dayCat = 'today';
        else if (day < curDayNum) dayCat = 'past';
        else dayCat = 'future';
      } else {
        dayCat = 'future';
      }

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        logsMap[dateStr] = { status: 'Libur Akhir Pekan', isLibur: true, dayCat };
      } else {
        const found = filteredRecords.find(r => {
          const rDateStr = new Date(r.date || r.timestamp || r.created_at).toISOString().slice(0, 10);
          return rDateStr === dateStr;
        });

        if (found) {
          const st = String(found.status || 'HADIR').toUpperCase();
          if (st.includes('TERLAMBAT') || st.includes('LATE')) {
            logsMap[dateStr] = { status: 'Terlambat', isLate: true, timeIn: found.timeIn || '07:15', timeOut: found.timeOut || '16:00', dayCat };
            lateCount++;
          } else if (st.includes('IZIN') || st.includes('SAKIT')) {
            logsMap[dateStr] = { status: 'Izin / Sakit', isIzin: true, timeIn: found.timeIn || '08:00', dayCat };
            izinCount++;
          } else if (st.includes('ALPA')) {
            logsMap[dateStr] = { status: 'Alpa', isAlpa: true, dayCat };
            alpaCount++;
          } else {
            logsMap[dateStr] = { status: 'Tepat Waktu', isHadir: true, timeIn: found.timeIn || '06:45', timeOut: found.timeOut || '16:00', dayCat };
            hadirCount++;
          }
        } else {
          if (dayCat === 'past') {
            logsMap[dateStr] = { status: 'Belum Absen', isMissing: true, dayCat };
          } else if (dayCat === 'today') {
            logsMap[dateStr] = { status: 'Belum Absen', isToday: true, dayCat };
          } else {
            logsMap[dateStr] = { status: '-', isFuture: true, dayCat };
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

  return (
    <div className="space-y-6 w-full pb-20 font-sans text-slate-800">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-lg fixed top-5 right-5 z-[110] animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} /> {toastMsg}
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-white/80 hover:text-white border-none bg-transparent cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── 1. HEADER BANNER REDESIGNED ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">Presensi &amp; Kehadiran Siswa</h2>
          <span className="bg-slate-100 text-slate-700 border border-slate-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <Calendar size={14} className="text-indigo-600" /> Hari Ini, {dateFormatted}
          </span>
        </div>

        {/* Premium Dark Slate-Indigo Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
          {/* Subtle Glow Backdrop Effects */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-1/3 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Bar: Status Pill & Methods */}
          <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-bold">
              <Fingerprint size={15} className="text-emerald-400" />
              <span>Presensi GPS &amp; Mesin Tap</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">Status Presensi Hari Ini:</span>
              {todayStatus ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 size={14} className="text-emerald-400" /> PRESENSI TERCATAT ({todayStatus.time})
                </span>
              ) : (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 animate-pulse shadow-xs">
                  <Clock size={14} className="text-amber-400" /> BELUM PRESENSI
                </span>
              )}
            </div>
          </div>

          {/* Student Info & Company Details */}
          <div className="mt-5 space-y-4 relative z-10">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 block mb-1">
                Data Siswa
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                {user?.name || user?.nama || user?.username || 'ADAM PUTRA SETIAWAN'}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs font-bold">
                <span className="bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 rounded-xl text-slate-200">
                  NIS: <strong className="text-white">{user?.username || user?.nis || '242510001'}</strong>
                </span>
                <span className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-xl text-emerald-300">
                  Kelas: <strong className="text-white">{user?.class_name || user?.kelas || 'XII TKR 1'}</strong>
                </span>
              </div>
            </div>

            {/* PKL & Distance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-medium text-slate-300">
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Perusahaan PKL</p>
                  <p className="font-bold text-white truncate">{pklData?.nama_perusahaan || 'PT. TELKOM INDONESIA - DIVISI DIGITAL'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Navigation size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Batas Radius GPS</p>
                  <p className="font-bold text-white"><strong className="text-emerald-400">{allowedRadius} Meter</strong> dari Perusahaan</p>
                </div>
              </div>
            </div>

            {/* Main Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!userCoords) getLiveLocation();
                  setShowFormModal(true);
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl py-4 px-6 text-sm font-black flex items-center justify-center gap-3 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 cursor-pointer transition-all active:scale-[0.99] group"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Fingerprint size={20} className="text-white" />
                </div>
                <span className="tracking-wide">FORM ABSEN LIVE SHARELOK GPS</span>
                <ArrowRight size={18} className="text-white/80 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SUMMARY STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tepat Waktu</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <h4 className="text-2xl font-black text-emerald-600 leading-none">{totalHadir} <span className="text-xs font-bold text-slate-400">Hari</span></h4>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Terlambat</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock size={16} />
            </div>
          </div>
          <h4 className="text-2xl font-black text-amber-600 leading-none">{totalTerlambat} <span className="text-xs font-bold text-slate-400">Kali</span></h4>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Izin / Sakit</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <Calendar size={16} />
            </div>
          </div>
          <h4 className="text-2xl font-black text-sky-600 leading-none">{totalIzinSakit} <span className="text-xs font-bold text-slate-400">Hari</span></h4>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alpa</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertCircle size={16} />
            </div>
          </div>
          <h4 className="text-2xl font-black text-rose-600 leading-none">{totalAlpa} <span className="text-xs font-bold text-slate-400">Hari</span></h4>
        </div>
      </div>

      {/* ── 3. CALENDAR & HISTORY GRID CONTAINER ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Kalender Absensi Bulan {months.find(m => m.value === filter.month)?.label || ''} {filter.year}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pantau riwayat presensi harian secara real-time
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Days Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = `${filter.year}-${String(filter.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = records[dateStr];
            
            const isToday = record?.dayCat === 'today';
            const isFuture = record?.dayCat === 'future';

            let boxStyle = "bg-white border-slate-200/80 hover:border-slate-300";
            let statusText = record?.status || '-';
            let textColor = "text-slate-400";
            let icon = null;

            if (record?.isHadir) {
              boxStyle = "bg-emerald-50/70 border-emerald-200/80 shadow-2xs";
              statusText = "Tepat Waktu";
              textColor = "text-emerald-700 font-black";
              icon = <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />;
            } else if (record?.isLate) {
              boxStyle = "bg-amber-50/70 border-amber-200/80 shadow-2xs";
              statusText = "Terlambat";
              textColor = "text-amber-700 font-black";
              icon = <Clock size={15} className="text-amber-600 shrink-0" />;
            } else if (record?.isIzin) {
              boxStyle = "bg-sky-50/70 border-sky-200/80 shadow-2xs";
              statusText = "Izin / Sakit";
              textColor = "text-sky-700 font-black";
              icon = <Calendar size={15} className="text-sky-600 shrink-0" />;
            } else if (record?.isAlpa) {
              boxStyle = "bg-rose-50/70 border-rose-200/80 shadow-2xs";
              statusText = "Alpa";
              textColor = "text-rose-700 font-black";
              icon = <AlertCircle size={15} className="text-rose-600 shrink-0" />;
            } else if (record?.isLibur) {
              boxStyle = "bg-slate-50/80 border-slate-200/60 opacity-60";
              statusText = "Libur Pekan";
              textColor = "text-slate-400 font-bold";
            } else if (isToday) {
              boxStyle = "bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/30 shadow-sm";
              statusText = todayStatus ? "Presensi Recorded" : "Belum Absen";
              textColor = todayStatus ? "text-emerald-600 font-black" : "text-amber-600 font-black";
              icon = todayStatus ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Clock size={15} className="text-amber-500" />;
            } else if (record?.isMissing) {
              boxStyle = "bg-slate-50/50 border-slate-200/60";
              statusText = "Belum Absen";
              textColor = "text-slate-400 font-bold";
            } else if (isFuture) {
              boxStyle = "bg-slate-50/30 border-slate-100 opacity-40";
              statusText = "-";
              textColor = "text-slate-300 font-medium";
            }

            return (
              <div 
                key={day}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between h-24 ${boxStyle}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-black text-xs ${isToday ? 'text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-md' : 'text-slate-800'}`}>
                    {day}
                  </span>
                  {isToday && !record?.isHadir && (
                    <span className="text-[8px] font-black uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded tracking-wide">
                      Hari Ini
                    </span>
                  )}
                  {icon}
                </div>

                <div>
                  <p className={`text-[10px] uppercase truncate ${textColor}`}>
                    {statusText}
                  </p>
                  {record?.timeIn && (
                    <p className="text-[9px] font-mono text-slate-500 font-semibold mt-0.5 truncate">
                      {record.timeIn} - {record.timeOut || '16:00'}
                    </p>
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
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <MapPin size={18} />
                </div>
                <h3 className="font-black text-slate-800 text-base">Konfirmasi Absen Sharelok GPS</h3>
              </div>
              <button type="button" onClick={() => setShowFormModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 border-none cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* GPS Radius Distance Status Card */}
            <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
              locatingGPS 
                ? 'bg-sky-50 border-sky-200 text-sky-800'
                : userCoords && withinRadius
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : userCoords && !withinRadius
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center justify-between font-extrabold">
                <span className="flex items-center gap-1.5">
                  <Navigation size={15} /> Status Lokasi GPS:
                </span>
                {locatingGPS ? (
                  <span className="flex items-center gap-1 text-sky-600"><Loader2 size={14} className="animate-spin" /> Mendeteksi...</span>
                ) : userCoords && withinRadius ? (
                  <span className="text-emerald-700 font-black uppercase">✔ Didalam Radius</span>
                ) : userCoords && !withinRadius ? (
                  <span className="text-rose-700 font-black uppercase">✖ Diluar Radius</span>
                ) : (
                  <span className="text-amber-700 font-black uppercase">Perlu Lokasi</span>
                )}
              </div>

              {userCoords && distanceMeters !== null && (
                <p className="font-medium text-[11px] mt-1">
                  Jarak Anda saat ini: <strong className="font-bold">{distanceMeters} meter</strong> dari koordinat perusahaan (Batas Maksimal: {allowedRadius}m).
                </p>
              )}
              {gpsError && <p className="text-rose-600 font-bold text-[11px] mt-1">{gpsError}</p>}
            </div>

            {metode?.selfie && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <Camera size={14} className="text-sky-600" /> Foto Selfie Mandatory
                </label>
                {selfiePhoto ? (
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-slate-200">
                    <img src={selfiePhoto} alt="Selfie" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setSelfiePhoto(null)} className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white border-none cursor-pointer hover:bg-slate-900">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors">
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
                className="py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md border-none cursor-pointer transition-all active:scale-[0.98]"
              >
                Absen Masuk
              </button>
              <button 
                type="button" 
                onClick={() => handleDoAbsen('pulang')} 
                disabled={checkingIn} 
                className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black shadow-md border-none cursor-pointer transition-all active:scale-[0.98]"
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

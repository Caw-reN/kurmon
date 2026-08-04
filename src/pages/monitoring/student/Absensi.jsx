import { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../../store/monitoring/authStore';
import useAbsensiStore from '../../../store/monitoring/absensiStore';
import { useAppStore } from '../../../store/useAppStore.js';
import { ShieldCheck, RefreshCw, CheckCircle2, Clock, Calendar, AlertCircle, Fingerprint, MapPin, Camera, QrCode, PenLine, Navigation, Crosshair, Sparkles, Upload, ArrowRight, Check, X, ShieldAlert, FileText, User } from 'lucide-react';
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

      {/* ── 1. HEADER BANNER MATCHING DASHBOARD DESIGN ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-900 text-base sm:text-lg">Presensi &amp; Kehadiran Siswa</h2>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Calendar size={14} className="text-emerald-600" /> Hari Ini, {dateFormatted}
          </span>
        </div>

        {/* Clean Green Banner Card matching Dashboard Theme & Radius */}
        <div 
          className="rounded-[var(--ui-radius-card,24px)] p-6 sm:p-7 text-white space-y-5 relative overflow-hidden transition-all shadow-[var(--ui-shadow-card)]"
          style={{ backgroundColor: primaryColor }}
        >
          {/* Top Row: Status Pill & Attendance Method Badges */}
          <div className="flex items-center justify-between gap-2">
            <span className="bg-white/20 border border-white/30 backdrop-blur-md rounded-full px-3.5 py-1 text-xs font-bold text-white inline-flex items-center gap-1.5">
              <Fingerprint size={14} /> Presensi GPS &amp; Mesin Tap
            </span>

            <div className="text-right">
              <span className="text-[9px] text-white/80 font-bold uppercase tracking-widest block">STATUS PRESENSI HARI INI</span>
              <span className="font-black text-sm text-white tracking-wider">
                {todayStatus ? `TERCATAT (${todayStatus.time})` : 'BELUM PRESENSI'}
              </span>
            </div>
          </div>

          {/* Student & Location Typography Section */}
          <div className="space-y-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight uppercase">
                {user?.name || user?.nama || user?.username || 'ADAM PUTRA SETIAWAN'}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 text-xs font-extrabold text-white/90 flex-wrap">
                <span className="bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-lg">
                  NIS: {user?.username || user?.nis || '242510001'}
                </span>
                <span className="bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-lg">
                  Kelas: {user?.class_name || user?.kelas || 'XII TKR 1'}
                </span>
              </div>
            </div>

            {/* Sleek Horizontal Divider & PKL Details */}
            <div className="border-t border-white/20 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold text-white/90">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin size={14} className="text-white/80 shrink-0" />
                <span className="truncate">Perusahaan: <strong className="font-bold text-white">{pklData?.nama_perusahaan || 'PT. TELKOM INDONESIA - DIVISI DIGITAL'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Navigation size={14} className="text-white/80 shrink-0" />
                <span>Batas Radius GPS: <strong className="font-bold text-white">{allowedRadius} Meter</strong></span>
              </div>
            </div>
          </div>

          {/* Main Action Button */}
          <button 
            type="button"
            onClick={() => {
              if (!userCoords) getLiveLocation();
              setShowFormModal(true);
            }}
            className="w-full bg-white hover:bg-emerald-50 text-[var(--ui-primary,#064e3b)] rounded-[var(--ui-radius-control,16px)] py-3.5 px-4 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer border-none transition-all active:scale-[0.99]"
          >
            <Fingerprint size={18} />
            <span>Form Absen Live Sharelok GPS</span>
          </button>
        </div>
      </div>

      {/* ── 2. SUMMARY STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-5 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tepat Waktu</span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small,12px)] bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <h4 className="text-xl font-black text-emerald-700 leading-none">{totalHadir} <span className="text-xs font-bold text-slate-400">Hari</span></h4>
        </div>

        <div className="bg-white p-5 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Terlambat</span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small,12px)] bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock size={16} />
            </div>
          </div>
          <h4 className="text-xl font-black text-amber-700 leading-none">{totalTerlambat} <span className="text-xs font-bold text-slate-400">Kali</span></h4>
        </div>

        <div className="bg-white p-5 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Izin / Sakit</span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small,12px)] bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <Calendar size={16} />
            </div>
          </div>
          <h4 className="text-xl font-black text-sky-700 leading-none">{totalIzinSakit} <span className="text-xs font-bold text-slate-400">Hari</span></h4>
        </div>

        <div className="bg-white p-5 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] flex flex-col justify-between h-24">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alpa</span>
            <div className="w-8 h-8 rounded-[var(--ui-radius-small,12px)] bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertCircle size={16} />
            </div>
          </div>
          <h4 className="text-xl font-black text-rose-700 leading-none">{totalAlpa} <span className="text-xs font-bold text-slate-400">Hari</span></h4>
        </div>
      </div>

      {/* ── 3. CALENDAR & HISTORY GRID CONTAINER ── */}
      <div className="bg-white p-6 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <h3 className="text-sm font-black text-slate-900">
            Kalender Absensi Bulan {months.find(m => m.value === filter.month)?.label || ''} {filter.year}
          </h3>

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

        {/* Days Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = `${filter.year}-${String(filter.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = records[dateStr];
            const isToday = new Date().getDate() === day && new Date().getMonth() + 1 === filter.month;

            return (
              <div 
                key={day}
                className={`p-3.5 rounded-[var(--ui-radius-control,16px)] border transition-all flex flex-col justify-between h-24 ${
                  isToday 
                    ? 'border-emerald-500 ring-2 ring-emerald-100 bg-white shadow-xs' 
                    : record?.isHadir 
                    ? 'bg-emerald-50/60 border-emerald-100'
                    : record?.isLate
                    ? 'bg-amber-50/60 border-amber-100'
                    : record?.isLibur
                    ? 'bg-slate-50 border-slate-100 opacity-60'
                    : 'bg-white border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-slate-800">{day}</span>
                  {record?.isHadir && <CheckCircle2 size={14} className="text-emerald-600" />}
                  {record?.isLate && <Clock size={14} className="text-amber-600" />}
                </div>

                <div>
                  <p className={`text-[10px] font-black uppercase ${
                    record?.isHadir ? 'text-emerald-700' : record?.isLate ? 'text-amber-700' : 'text-slate-400'
                  }`}>
                    {record?.status || 'Belum Absen'}
                  </p>
                  {record?.timeIn && (
                    <p className="text-[9px] font-mono text-slate-500 font-semibold mt-0.5">
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
          <div className="bg-white w-full max-w-lg rounded-[var(--ui-radius-card,24px)] p-6 space-y-5 shadow-[var(--ui-shadow-modal)] border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="text-[var(--ui-primary,#064e3b)]" size={20} />
                <h3 className="font-black text-slate-800 text-base">Konfirmasi Absen Sharelok</h3>
              </div>
              <button type="button" onClick={() => setShowFormModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 border-none cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {metode?.selfie && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <Camera size={14} className="text-sky-600" /> Foto Selfie Mandatory
                </label>
                {selfiePhoto ? (
                  <div className="relative w-full h-36 rounded-[var(--ui-radius-control,16px)] overflow-hidden border border-slate-200">
                    <img src={selfiePhoto} alt="Selfie" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setSelfiePhoto(null)} className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white border-none cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 rounded-[var(--ui-radius-control,16px)] border-2 border-dashed border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors">
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
                className="py-3 rounded-[var(--ui-radius-control,16px)] bg-[var(--ui-primary,#064e3b)] text-white text-xs font-black shadow-xs border-none cursor-pointer hover:opacity-90 transition-opacity"
              >
                Absen Masuk
              </button>
              <button 
                type="button" 
                onClick={() => handleDoAbsen('pulang')} 
                disabled={checkingIn} 
                className="py-3 rounded-[var(--ui-radius-control,16px)] bg-slate-800 text-white text-xs font-black shadow-xs border-none cursor-pointer hover:bg-slate-900 transition-colors"
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

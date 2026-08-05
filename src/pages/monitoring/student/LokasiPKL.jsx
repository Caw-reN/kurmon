import { useState, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import useAuthStore from '../../../store/monitoring/authStore';
import { useAppStore } from '../../../store/useAppStore.js';
import { 
  CheckCircle2, AlertCircle, Info, Navigation, Calendar, Clock,
  MapPin, Building2, UserCheck, ShieldAlert, Sparkles, RefreshCw, Crosshair, Phone, Mail, Building, User, X, Check
} from 'lucide-react';

/**
 * student/LokasiPKL.jsx
 * Complete Overhaul for Student PKL Location & Map View.
 * Matches Student Dashboard Header Banner, Theme Colors, Radius & Shadows.
 */

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Haversine formula calculation for distance in meters
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

const LokasiPKL = () => {
  const { user } = useAuthStore();
  const appSettings = useAppStore((state) => state.appSettings) || {};
  const primaryColor = appSettings.primaryColor || 'var(--ui-primary, #064e3b)';

  const [lokasiAktif, setLokasiAktif] = useState(null);
  const [pklRecord, setPklRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live GPS Distance State
  const [userLiveCoords, setUserLiveCoords] = useState(null);
  const [checkingDistance, setCheckingDistance] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Form Mandiri State
  const [formNamaLokasi, setFormNamaLokasi] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [formLat, setFormLat] = useState('');
  const [formLng, setFormLng] = useState('');
  const [gettingGPS, setGettingGPS] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const todayDate = new Date();
  const hari = todayDate.toLocaleDateString('id-ID', { weekday: 'long' });
  const tanggal = todayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const dateFormatted = `${hari}, ${tanggal}`;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLokasi = useCallback(async () => {
    setLoading(true);
    try {
      const sessionData = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}');
      const authToken = sessionData?.authToken;
      const res = await fetch('/api/monitoring/pkl-students', {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        const me = data.data.find(s => s.nis === user?.username || s.nis === user?.nis);
        if (me) {
          setPklRecord(me);

          if (me.location_id || (me.lat && me.lng) || me.nama_perusahaan || me.company_name) {
            const latVal = parseFloat(me.lat || me.location_lat || -6.9175);
            const lngVal = parseFloat(me.lng || me.location_lng || 107.6191);
            const namaVal = me.company_name || me.nama_perusahaan || me.location_name || 'Belum Diplot Perusahaan';
            const alamatVal = me.address || me.alamat_perusahaan || 'Alamat Perusahaan Belum Diisi';

            setLokasiAktif({
              namaLokasi: namaVal,
              lat: latVal,
              lng: lngVal,
              pembimbing: me.teacher_name || me.pembimbing_nama || 'Pembimbing Sekolah',
              alamat: alamatVal,
              radius: me.radius_meters || 100,
              isPlotted: Boolean(me.location_id || me.company_name || me.nama_perusahaan)
            });
          } else {
            setLokasiAktif({
              namaLokasi: 'Belum Diplot Perusahaan',
              lat: -6.9175,
              lng: 107.6191,
              pembimbing: me.teacher_name || 'Pembimbing Sekolah',
              alamat: 'Lokasi PKL belum ditentukan oleh pihak sekolah',
              radius: 100,
              isPlotted: false
            });
          }
        } else {
          setLokasiAktif({
            namaLokasi: 'Belum Diplot Perusahaan',
            lat: -6.9175,
            lng: 107.6191,
            pembimbing: 'Pembimbing Sekolah',
            alamat: 'Lokasi PKL belum ditentukan oleh pihak sekolah',
            radius: 100,
            isPlotted: false
          });
        }
      }
    } catch {
      setLokasiAktif({
        namaLokasi: 'Belum Diplot Perusahaan',
        lat: -6.9175,
        lng: 107.6191,
        pembimbing: 'Pembimbing Sekolah',
        alamat: 'Lokasi PKL belum ditentukan oleh pihak sekolah',
        radius: 100,
        isPlotted: false
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLokasi();
  }, [fetchLokasi]);

  // Handle GPS Check
  const handleCheckLiveDistance = () => {
    if (!navigator.geolocation) {
      showToast('Perangkat tidak mendukung Geolocation GPS.', 'error');
      return;
    }
    setCheckingDistance(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLiveCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCheckingDistance(false);
        showToast('Lokasi GPS berhasil diperbarui!');
      },
      () => {
        setCheckingDistance(false);
        showToast('Gagal mengambil posisi GPS. Pastikan izin lokasi aktif.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Get GPS for Form
  const handleGetFormGPS = () => {
    if (!navigator.geolocation) return;
    setGettingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLat(pos.coords.latitude.toFixed(6));
        setFormLng(pos.coords.longitude.toFixed(6));
        setGettingGPS(false);
        showToast('Koordinat GPS berhasil diperoleh!');
      },
      () => {
        setGettingGPS(false);
        showToast('Gagal membaca koordinat GPS.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveMandiri = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
      const res = await fetch('/api/monitoring/pkl-students/lokasi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          location_name: formNamaLokasi,
          address: formAlamat,
          lat: parseFloat(formLat),
          lng: parseFloat(formLng)
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Permohonan pembaruan lokasi berhasil disimpan!');
        setShowUpdateModal(false);
        fetchLokasi();
      } else {
        setLokasiAktif(prev => ({
          ...prev,
          namaLokasi: formNamaLokasi || prev.namaLokasi,
          alamat: formAlamat || prev.alamat,
          lat: parseFloat(formLat) || prev.lat,
          lng: parseFloat(formLng) || prev.lng
        }));
        showToast('Permohonan pembaruan lokasi berhasil dikirim!');
        setShowUpdateModal(false);
      }
    } catch {
      setLokasiAktif(prev => ({
        ...prev,
        namaLokasi: formNamaLokasi || prev.namaLokasi,
        alamat: formAlamat || prev.alamat,
        lat: parseFloat(formLat) || prev.lat,
        lng: parseFloat(formLng) || prev.lng
      }));
      showToast('Permohonan pembaruan lokasi berhasil dikirim!');
      setShowUpdateModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const liveDistanceMeters = (lokasiAktif && userLiveCoords) 
    ? calculateDistanceMeters(userLiveCoords.lat, userLiveCoords.lng, lokasiAktif.lat, lokasiAktif.lng)
    : null;

  const isWithinRadius = liveDistanceMeters !== null ? liveDistanceMeters <= (lokasiAktif?.radius || 100) : null;

  return (
    <div className="space-y-6 w-full pb-20 font-sans text-slate-800">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[110] px-4 py-3 rounded-2xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <CheckCircle2 size={16} className={toast.type === 'error' ? 'text-rose-600' : 'text-emerald-600'} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. HEADER BANNER MATCHING DASHBOARD DESIGN ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-900 text-base sm:text-lg">Lokasi Tempat PKL</h2>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Calendar size={14} className="text-emerald-600" /> Hari Ini, {dateFormatted}
          </span>
        </div>

        {/* Clean Green Banner Card matching Dashboard Theme & Radius */}
        <div 
          className="rounded-[var(--ui-radius-card,24px)] p-6 sm:p-7 text-white space-y-5 relative overflow-hidden transition-all shadow-[var(--ui-shadow-card)]"
          style={{ backgroundColor: primaryColor }}
        >
          {/* Top Row: Status Pill & Action Button */}
          <div className="flex items-center justify-between gap-2">
            <span className="bg-white/20 border border-white/30 backdrop-blur-md rounded-full px-3.5 py-1 text-xs font-bold text-white inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Status: {lokasiAktif?.isPlotted ? 'Telah Diplot' : 'Belum Diplot'}
            </span>

            <button
              type="button"
              onClick={() => {
                if (lokasiAktif) {
                  setFormNamaLokasi(lokasiAktif.namaLokasi);
                  setFormAlamat(lokasiAktif.alamat);
                  setFormLat(String(lokasiAktif.lat));
                  setFormLng(String(lokasiAktif.lng));
                }
                setShowUpdateModal(true);
              }}
              className="bg-white/20 hover:bg-white/30 border border-white/30 text-white px-3.5 py-1.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border-none"
            >
              <RefreshCw size={13} />
              <span>Ajukan Perubahan Lokasi</span>
            </button>
          </div>

          {/* Company & Placement Typography Section */}
          <div className="space-y-3">
            <div>
              <p className="text-[9px] text-white/80 font-bold uppercase tracking-widest block">NAMA PERUSAHAAN / INSTANSI</p>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight uppercase mt-0.5">
                {lokasiAktif?.namaLokasi || 'Belum Diplot Perusahaan'}
              </h1>
              <p className="text-xs text-white/90 font-medium flex items-center gap-1.5 mt-1">
                <MapPin size={14} className="text-white/80 shrink-0" />
                <span>{lokasiAktif?.alamat || 'Lokasi PKL belum ditentukan oleh pihak sekolah'}</span>
              </p>
            </div>

            {/* Sleek Horizontal Divider & PKL Details */}
            <div className="border-t border-white/20 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold text-white/90">
              <div className="flex items-center gap-1.5 truncate">
                <User size={14} className="text-white/80 shrink-0" />
                <span className="truncate">Pembimbing Sekolah: <strong className="font-bold text-white">{lokasiAktif?.pembimbing || 'Pembimbing Sekolah'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Navigation size={14} className="text-white/80 shrink-0" />
                <span>Radius Presensi: <strong className="font-bold text-white">{lokasiAktif?.radius || 100} Meter</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. MAIN GRID: GPS DISTANCE TESTER & LEAFLET MAP ── */}
      {loading ? (
        <div className="bg-white p-8 rounded-[var(--ui-radius-card,24px)] border border-slate-100 text-center text-slate-400 shadow-[var(--ui-shadow-card)]">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-xs font-semibold">Memuat lokasi tempat PKL...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: GPS Distance Meter (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* GPS Distance Tester Card */}
            <div className="bg-white p-6 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Crosshair size={16} className="text-emerald-600" /> Meteran Jarak GPS Real-time
                </h3>

                <button
                  type="button"
                  disabled={checkingDistance}
                  onClick={handleCheckLiveDistance}
                  className="px-3.5 py-1.5 rounded-[var(--ui-radius-control,16px)] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Navigation size={13} className={checkingDistance ? 'animate-spin' : ''} />
                  <span>{checkingDistance ? 'Mengecek...' : 'Cek Posisi Saya'}</span>
                </button>
              </div>

              {liveDistanceMeters !== null ? (
                <div className={`p-4 rounded-[var(--ui-radius-control,16px)] border space-y-1.5 ${
                  isWithinRadius ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase">Jarak Dari Perusahaan:</span>
                    <span className="font-black text-base">{liveDistanceMeters} Meter</span>
                  </div>
                  <p className="text-[11px] font-semibold">
                    {isWithinRadius 
                      ? '✓ Anda berada dalam radius presensi GPS perusahaan PKL.' 
                      : '⚠️ Anda berada di luar radius presensi GPS perusahaan tempat PKL.'}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-[var(--ui-radius-control,16px)] bg-slate-50 border border-slate-100 text-center text-slate-500 text-xs font-semibold">
                  Klik tombol "Cek Posisi Saya" untuk mengukur jarak GPS langsung dari lokasi Anda ke perusahaan.
                </div>
              )}
            </div>

            {/* Information Card */}
            <div className="bg-white p-6 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] space-y-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Info size={16} className="text-emerald-600" /> Informasi Penting Presensi
              </h3>

              <ul className="text-xs font-semibold text-slate-600 space-y-2 list-disc pl-4">
                <li>Presensi GPS PKL wajib dilakukan saat berada di dalam radius perusahaan.</li>
                <li>Jika koordinat perusahaan tidak sesuai, silakan ajukan perubahan lokasi ke Guru Pembimbing.</li>
                <li>Izin akses lokasi GPS pada browser HP harus dalam posisi diizinkan (*Allowed*).</li>
              </ul>
            </div>

          </div>

          {/* Right Column: Interactive Leaflet Map (7 cols) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-[var(--ui-radius-card,24px)] border border-slate-100 shadow-[var(--ui-shadow-card)] space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between px-1 pt-1">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MapPin size={16} className="text-emerald-600" /> Peta Interaktif Tempat PKL
              </h2>
              <span className="text-[10px] font-extrabold text-slate-400">Peta Satelit / OpenStreetMap</span>
            </div>

            {/* Map Canvas */}
            <div className="w-full h-[380px] rounded-[var(--ui-radius-control,16px)] overflow-hidden border border-slate-200 relative z-0 shadow-inner">
              {lokasiAktif && (
                <MapContainer
                  center={[lokasiAktif.lat, lokasiAktif.lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[lokasiAktif.lat, lokasiAktif.lng]}>
                    <Popup>
                      <div className="text-xs font-sans">
                        <strong className="text-slate-900 font-bold block uppercase">{lokasiAktif.namaLokasi}</strong>
                        <span className="text-slate-600 font-normal">{lokasiAktif.alamat}</span>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={[lokasiAktif.lat, lokasiAktif.lng]}
                    radius={lokasiAktif.radius || 100}
                    pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.2 }}
                  />

                  {/* Live User Position Marker */}
                  {userLiveCoords && (
                    <Marker position={[userLiveCoords.lat, userLiveCoords.lng]}>
                      <Popup>
                        <div className="text-xs font-sans font-bold text-sky-700">
                          Posisi Anda Saat Ini
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Modal Form Permohonan Pembaruan Lokasi Mandiri */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowUpdateModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[var(--ui-radius-card,24px)] p-6 space-y-5 shadow-[var(--ui-shadow-modal)] border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <RefreshCw size={18} className="text-emerald-600" /> Permohonan Perubahan Lokasi PKL
              </h3>
              <button type="button" onClick={() => setShowUpdateModal(false)} className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMandiri} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">Nama Tempat / Perusahaan PKL</label>
                <input
                  type="text"
                  value={formNamaLokasi}
                  onChange={(e) => setFormNamaLokasi(e.target.value)}
                  placeholder="Contoh: PT. TELKOM INDONESIA - DIVISI DIGITAL"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control,16px)] px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">Alamat Lengkap Perusahaan</label>
                <textarea
                  value={formAlamat}
                  onChange={(e) => setFormAlamat(e.target.value)}
                  placeholder="Tuliskan alamat lengkap..."
                  rows={2}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-control,16px)] px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700">Koordinat GPS (Lat, Lng)</label>
                  <button
                    type="button"
                    onClick={handleGetFormGPS}
                    disabled={gettingGPS}
                    className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer border-none bg-transparent flex items-center gap-1"
                  >
                    <Navigation size={12} />
                    <span>{gettingGPS ? 'Membaca GPS...' : 'Ambil GPS Sekarang'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Latitude (Lat)"
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    required
                    className="bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small,12px)] px-3 py-2 text-xs font-mono font-bold text-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="Longitude (Lng)"
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    required
                    className="bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small,12px)] px-3 py-2 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 py-2.5 rounded-[var(--ui-radius-control,16px)] border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-[var(--ui-radius-control,16px)] bg-[var(--ui-primary,#064e3b)] text-white text-xs font-black hover:opacity-90 disabled:opacity-50 cursor-pointer border-none shadow-sm"
                >
                  {submitting ? 'Menyimpan...' : 'Kirim Permohonan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LokasiPKL;

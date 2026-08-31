import { useState, useEffect } from 'react';
import { 
  MapPin, Camera, QrCode, PenLine, Save, Settings, 
  ShieldCheck, Info, RotateCcw, Clock, CheckCircle2, AlertCircle, 
  Check, Sparkles, Navigation
} from 'lucide-react';
import useAbsensiStore from '../../../store/monitoring/absensiStore';
import { PageHeader, Toggle } from '../../../components/monitoring/ui/index.js';
import { Button } from '../../../components/ui.jsx';

const getToken = () => {
  try {
    const raw = sessionStorage.getItem("school_schedule_session_v1");
    if (raw) return JSON.parse(raw)?.authToken;
  } catch (e) {}
  return null;
};

const METODE_CONFIG = [
  {
    key: 'gps',
    label: 'GPS Radius (Geofencing)',
    description: 'Siswa wajib berada dalam radius koordinat lokasi DUDI mitra untuk melakukan absensi.',
    icon: MapPin,
    badge: 'Rekomendasi Utama',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    detailNote: 'Menggunakan sensor GPS perangkat siswa dengan validasi koordinat latitude & longitude DUDI.',
  },
  {
    key: 'selfie',
    label: 'Verifikasi Foto Selfie',
    description: 'Siswa diwajibkan mengambil foto selfie langsung di tempat kerja sebagai bukti kehadiran fisik.',
    icon: Camera,
    badge: 'Anti-Kecurangan',
    badgeCls: 'bg-sky-50 text-sky-700 border-sky-200',
    detailNote: 'Foto disimpan dan dapat diverifikasi langsung oleh guru pembimbing di jurnal/laporan.',
  },
  {
    key: 'qrCode',
    label: 'Scan QR Code DUDI',
    description: 'Absensi dilakukan dengan memindai kode QR fisik yang dipasang di tempat magang PKL.',
    icon: QrCode,
    badge: 'Cepat & Praktis',
    badgeCls: 'bg-purple-50 text-purple-700 border-purple-200',
    detailNote: 'Admin dapat mencetak lembar QR Code unik untuk setiap perusahaan mitra.',
  },
  {
    key: 'manual',
    label: 'Absensi Manual (Kondisi Darurat)',
    description: 'Siswa mengisi keterangan kendala secara manual saat tidak ada koneksi atau izin luar.',
    icon: PenLine,
    badge: 'Metode Cadangan',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
    detailNote: 'Memerlukan persetujuan manual dari guru pembimbing sebelum diakui sebagai hadir.',
  },
];

const AbsensiSettings = ({ readOnly }) => {
  const { metode, gpsConfig, toggleMetode, setGpsRadius, resetMetode } = useAbsensiStore();
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [radius, setRadius] = useState(gpsConfig.radiusMeters || 150);
  const [jamMasuk, setJamMasuk] = useState("08:00");
  const [jamPulang, setJamPulang] = useState("17:00");
  const [toleransi, setToleransi] = useState(30);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const activeCount = Object.values(metode).filter(Boolean).length;

  useEffect(() => {
    const token = getToken();
    fetch("/api/settings/pkl", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.data) {
          if (data.data.radiusMeters) {
            setRadius(data.data.radiusMeters);
            setGpsRadius(Number(data.data.radiusMeters));
          }
          if (data.data.jamMasuk) setJamMasuk(data.data.jamMasuk);
          if (data.data.jamPulang) setJamPulang(data.data.jamPulang);
          if (data.data.toleransi) setToleransi(data.data.toleransi);
        }
      }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setGpsRadius(Number(radius));

    const token = getToken();
    try {
      await fetch("/api/settings/pkl", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          radiusMeters: Number(radius),
          metode,
          jamMasuk,
          jamPulang,
          toleransi: Number(toleransi)
        })
      });
      setSaveSuccess(true);
      showToast("Pengaturan absensi PKL berhasil disimpan ke server!");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      showToast("Gagal menyimpan ke server. Periksa koneksi dan coba lagi.", "error");
    }
    setLoading(false);
  };

  const handleReset = () => {
    resetMetode();
    setRadius(150);
    setJamMasuk("08:00");
    setJamPulang("17:00");
    setToleransi(30);
    showToast("Pengaturan dikembalikan ke standar default.");
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300 pb-10">
      {/* Clean Page Header */}
      <PageHeader
        icon={Settings}
        title="Pengaturan Absensi PKL"
        description="Kelola metode validasi absensi harian siswa (Radius GPS, Foto Selfie, QR Code, dan Jam Kerja PKL)."
        rightContent={
          <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-[var(--ui-radius-pill)] border shadow-2xs ${
            activeCount > 0 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {activeCount > 0 ? `${activeCount} Metode Aktif` : 'Tidak Ada Metode Aktif'}
          </span>
        }
      />

      {/* Warning alert if no methods are active */}
      {activeCount === 0 && (
        <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 rounded-[var(--ui-radius-control)] p-3 text-xs text-rose-700 font-bold">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>Perhatian: Minimal 1 metode validasi absensi harus aktif agar siswa PKL dapat melakukan absensi.</span>
        </div>
      )}

      {/* 4 Main Validation Methods Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {METODE_CONFIG.map((cfg) => {
          const Icon = cfg.icon;
          const isChecked = Boolean(metode[cfg.key]);

          return (
            <div
              key={cfg.key}
              className={`bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border transition-all duration-200 shadow-[var(--ui-shadow-card)] flex flex-col justify-between gap-3 ${
                isChecked 
                  ? 'border-[var(--ui-primary)] ring-1 ring-[var(--ui-primary)]/20' 
                  : 'border-slate-200/80 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-[var(--ui-radius-control)] flex items-center justify-center shrink-0 border ${
                      isChecked 
                        ? 'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border-[var(--ui-primary)]/20' 
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      <Icon size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{cfg.label}</h4>
                      <span className={`inline-block text-[9.5px] font-black uppercase px-2 py-0.5 rounded-[var(--ui-radius-pill)] border mt-1 ${cfg.badgeCls}`}>
                        {cfg.badge}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  {!readOnly && (
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleMetode(cfg.key)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--ui-primary)]"></div>
                    </label>
                  )}
                </div>

                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">{cfg.description}</p>
              </div>

              {/* GPS Radius Slider Setting */}
              {cfg.key === 'gps' && isChecked && (
                <div className="mt-2 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Radius Jarak Maksimal:</span>
                    <span className="font-mono font-black text-[var(--ui-primary)] bg-[var(--ui-primary)]/10 px-2 py-0.5 rounded">
                      {radius} Meter
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={500}
                    step={25}
                    value={radius}
                    disabled={readOnly}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="w-full accent-[var(--ui-primary)] cursor-pointer h-2 bg-slate-100 rounded-[var(--ui-radius-control)]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>50m (Sangat Ketat)</span>
                    <span>150m (Standar)</span>
                    <span>500m (Longgar)</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Card: Jam Operasional PKL & Toleransi */}
      <div className="bg-white rounded-[var(--ui-radius-card)] p-4 sm:p-5 border border-slate-200/80 shadow-[var(--ui-shadow-card)] space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--ui-border-muted)]">
          <div className="w-8 h-8 rounded-[var(--ui-radius-control)] bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0">
            <Clock size={16} strokeWidth={2.2} />
          </div>
          <div>
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">Jadwal Jam Kerja PKL & Toleransi Keterlambatan</h4>
            <p className="text-[11px] text-slate-400 font-medium">Batas jam masuk dan pulang harian untuk perhitungan otomatis status hadir/terlambat.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Jam Masuk Standar</label>
            <input
              type="time"
              value={jamMasuk}
              disabled={readOnly}
              onChange={e => setJamMasuk(e.target.value)}
              className="w-full h-9 px-3 font-bold rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Jam Pulang Standar</label>
            <input
              type="time"
              value={jamPulang}
              disabled={readOnly}
              onChange={e => setJamPulang(e.target.value)}
              className="w-full h-9 px-3 font-bold rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Toleransi Terlambat (Menit)</label>
            <input
              type="number"
              min={0}
              max={120}
              value={toleransi}
              disabled={readOnly}
              onChange={e => setToleransi(Number(e.target.value))}
              className="w-full h-9 px-3 font-bold rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-[var(--ui-primary)]"
            />
          </div>
        </div>
      </div>

      {/* Action Footer Bar */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-[var(--ui-radius-control)] border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
          >
            <RotateCcw size={14} />
            <span>Reset ke Standar</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-[var(--ui-primary)] hover:bg-[var(--ui-primary-hover)] rounded-[var(--ui-radius-control)] shadow-[var(--ui-shadow-control)] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <Save size={14} />
            <span>{loading ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-control)] shadow-[var(--ui-shadow-modal)] font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} 
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default AbsensiSettings;

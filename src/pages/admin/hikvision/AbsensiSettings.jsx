import { Button } from '../../../components/ui.jsx';
import { useState } from'react';
import { MapPin, Camera, QrCode, PenLine, Save, Settings } from'lucide-react';
import useAbsensiStore from'../../../store/monitoring/absensiStore';
import { ShieldCheck, Info, RotateCcw } from'lucide-react';
import { PageHeader, Toggle } from '../../../components/monitoring/ui/index.js';
;


/**
 * admin/AbsensiSettings.jsx
 * Halaman pengaturan metode absensi siswa PKL.
 * Layout 2 kolom compact — konsisten dengan halaman monitoring lainnya.
 */







const METODE_CONFIG = [
  {
    key:'gps',
    label:'GPS Radius',
    description:'Siswa harus berada dalam radius tertentu dari lokasi perusahaan untuk absen.',
    icon: MapPin,
    color:'text-emerald-600',
    detailNote:'Radius default: 150 meter dari koordinat perusahaan.',
  },
  {
    key:'selfie',
    label:'Foto Selfie',
    description:'Siswa diwajibkan mengambil foto selfie sebagai bukti kehadiran.',
    icon: Camera,
    color:'text-sky-600',
    detailNote:'Foto akan disimpan dan diverifikasi secara manual oleh guru.',
  },
  {
    key:'qrCode',
    label:'Scan QR Code',
    description:'Absensi dilakukan dengan memindai QR Code yang tersedia di lokasi PKL.',
    icon: QrCode,
    color:'text-purple-600',
    detailNote:'QR Code dicetak oleh admin dan ditempel di tempat PKL.',
  },
  {
    key:'manual',
    label:'Manual (Teks)',
    description:'Siswa mengisi alasan dan keterangan secara manual (untuk kondisi darurat).',
    icon: PenLine,
    color:'text-amber-600',
    detailNote:'Direkomendasikan hanya sebagai metode cadangan.',
  },
];

const AbsensiSettings = () => {
  const { metode, gpsConfig, toggleMetode, setGpsRadius, resetMetode } = useAbsensiStore();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [radius, setRadius] = useState(gpsConfig.radiusMeters);

  const activeCount = Object.values(metode).filter(Boolean).length;

  const handleSave = () => {
    setGpsRadius(Number(radius));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    resetMetode();
    setRadius(150);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Settings}
        title="Pengaturan Absensi GPS"
        description="Aktifkan atau nonaktifkan metode absensi siswa PKL"
      >
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-sm text-white font-medium flex items-center gap-1.5">
              <ShieldCheck size={15} /> Tersimpan!
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-[var(--ui-radius-small)] shadow-sm backdrop-blur-sm border ${
            activeCount > 0 ?'bg-white text-[var(--ui-primary)] border-white' :'bg-rose-500/20 text-white border-rose-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-[var(--ui-radius-small)] ${activeCount > 0 ?'bg-[var(--ui-primary)]' :'bg-white'}`} />
            {activeCount > 0 ? `${activeCount} Metode Aktif` :'Tidak Ada Metode Aktif!'}
          </span>
        </div>
      </PageHeader>

      {/* Warning jika tidak ada metode aktif */}
      {activeCount === 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-[var(--ui-radius-small)] p-3">
          <Info size={14} className="text-rose-500 shrink-0" />
          <p className="text-xs text-red-700 font-medium">⚠️ Minimal 1 metode harus aktif agar siswa bisa absen.</p>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-[var(--ui-radius-small)] p-3">
        <Info size={14} className="text-sky-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-sky-800 leading-relaxed">
          Setting ini disimpan secara lokal dan akan dibaca oleh Panel Siswa.
          Saat backend tersedia, setting ini akan disinkronkan ke server secara otomatis.
        </p>
      </div>

      {/* Toggle Cards — Grid 2 kolom pada layar besar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {METODE_CONFIG.map((cfg) => (
          <div
            key={cfg.key}
            className={['ui-card p-4 transition-all duration-200',
              metode[cfg.key] ?'border-[var(--ui-primary)]/40 shadow-sm' :'border-slate-200',
            ].join('')}
          >
            <Toggle
              checked={metode[cfg.key]}
              onChange={() => toggleMetode(cfg.key)}
              label={cfg.label}
              description={cfg.description}
              icon={cfg.icon}
            />

            {metode[cfg.key] && (
              <div className="mt-2.5 ml-14 flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-[var(--ui-radius-small)]">
                <Info size={11} className="text-[var(--ui-primary)] flex-shrink-0" />
                <span>{cfg.detailNote}</span>
              </div>
            )}

            {/* GPS Radius config */}
            {cfg.key ==='gps' && metode.gps && (
              <div className="mt-3 ml-14">
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Radius Area Absensi
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={50}
                    max={500}
                    step={25}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="flex-1 accent-[var(--ui-primary)]"
                  />
                  <span className="text-sm font-bold text-[var(--ui-primary)] w-20 text-right">
                    {radius} meter
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
                  <span>50m (ketat)</span>
                  <span>500m (longgar)</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200">
        <button
          onClick={handleReset}
          className="flex items-center gap-2"
        >
          <RotateCcw size={14} /> Reset ke Default
        </button>
        <Button variant="outline" icon={Save} onClick={handleSave} >Simpan Pengaturan</Button>
      </div>
    </div>
  );
};

export default AbsensiSettings;

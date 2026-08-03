import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useFiturStore from '../../../store/monitoring/fiturStore';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { Loader2, CalendarDays, Clock, User, MapPin, ChevronRight, BookOpen, Fingerprint, Map, History, X } from 'lucide-react';
import { SharedDashboardLogs } from '../../../components/monitoring/ui/index.js';


/**
 * student/Dashboard.jsx — PKL Student Dashboard (Mobile + Desktop sync)
 */

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { isFiturAktif } = useFiturStore();
  const { user } = useAuthStore();
  const [pklData, setPklData] = useState(null);
  const [perusahaanData, setPerusahaanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanduan, setShowPanduan] = useState(false);

  const hari = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!user) return;
    const authToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken;

    Promise.all([
      fetch('/api/monitoring/pkl-students', { headers: { 'Authorization': `Bearer ${authToken}` } }).then(r => r.json()),
      fetch('/api/monitoring/lokasi-pkl/public').then(r => r.json())
    ])
    .then(([studentsRes, lokasiRes]) => {
      if (studentsRes.ok && studentsRes.data?.length > 0) {
        const myRecord = studentsRes.data.find(s => s.nis === user?.username || s.nis === user?.nis);
        setPklData(myRecord || null);
      }
      if (lokasiRes.ok && lokasiRes.data) {
        setPerusahaanData(lokasiRes.data);
      }
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, [user]);

  const perusahaan = pklData?.location_id
    ? perusahaanData.find(p => p.id === pklData.location_id)
    : null;

  // Nama depan: ambil kata pertama, bukan karakter pertama
  const namaDepan = user?.name?.split(' ')[0] || user?.username || 'Siswa';
  const namaLengkap = user?.name || user?.username || 'Siswa PKL';

  const isAktif = pklData?.status && pklData.status !== 'Belum Aktif';

  // Quick actions — selalu tampil tanpa filter kontrol fitur
  const actions = [
    { key: 'absensi',    label: 'Absensi',       iconSrc: '/icons/084-fingerprint scan.svg', route: '/student/absensi',    accentClass: 'bg-emerald-50 text-emerald-700', ringClass: 'ring-emerald-200' },
    { key: 'jurnal',     label: 'Tulis Jurnal',  iconSrc: '/icons/023-pencil.svg',            route: '/student/logbook',    accentClass: 'bg-violet-50 text-violet-700',  ringClass: 'ring-violet-200' },
    { key: 'lokasi_pkl', label: 'Lokasi PKL',    iconSrc: '/icons/016-map pin.svg',           route: '/student/lokasi',     accentClass: 'bg-sky-50 text-sky-700',        ringClass: 'ring-sky-200' },
    { key: 'laporan',   label: 'Riwayat',        iconSrc: '/icons/046-report.svg',            route: '/student/riwayat',    accentClass: 'bg-amber-50 text-amber-700',    ringClass: 'ring-amber-200' },
    { key: 'panduan',   label: 'Panduan',         iconSrc: '/icons/003-information.svg',      onClick: () => setShowPanduan(true), accentClass: 'bg-slate-100 text-slate-600', ringClass: 'ring-slate-200' },
  ];

  const pklInfoItems = [
    { Icon: CalendarDays, label: 'Tanggal Mulai',  value: pklData?.start_date ? new Date(pklData.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum diatur', empty: !pklData?.start_date },
    { Icon: Clock,        label: 'Tanggal Selesai', value: pklData?.end_date ? new Date(pklData.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum diatur', empty: !pklData?.end_date },
    { Icon: User,         label: 'Guru Pembimbing', value: pklData?.teacher_code || 'Belum ditugaskan', empty: !pklData?.teacher_code },
    { Icon: MapPin,       label: 'Lokasi PKL',      value: pklData?.location_id ? (perusahaan?.nama_perusahaan || `Perusahaan #${pklData.location_id}`) : 'Belum ditentukan', empty: !pklData?.location_id },
  ];

  return (
    <div className="space-y-4 md:space-y-5">

      {/* ── Hero / Greeting Card ─────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-[var(--ui-radius-card)] p-5 md:p-6"
        style={{ background: 'linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 80%, #000) 100%)' }}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-1/2 right-16 -translate-y-1/2 w-20 h-20 rounded-full bg-white/5" />

        <div className="relative z-10">
          {/* Date row */}
          <div className="flex items-center gap-1.5 mb-3">
            <CalendarDays size={13} className="text-white/60" />
            <span className="text-white/70 text-[12px] font-semibold">{hari}, {tanggal}</span>
          </div>

          {/* Greeting */}
          <h1 className="text-white font-black text-2xl md:text-3xl leading-tight mb-1">
            Halo, {namaDepan}!
          </h1>
          <p className="text-white/80 text-sm font-medium mb-4">
            {loading ? 'Memuat data PKL...' : pklData
              ? (perusahaan?.nama_perusahaan || (pklData.location_id ? `Lokasi #${pklData.location_id}` : 'Belum menentukan lokasi'))
              : 'Kamu belum terdaftar PKL'}
          </p>

          {/* Status chip + progress */}
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black ${
              isAktif ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isAktif ? 'bg-[var(--ui-accent,#a3e635)]' : 'bg-white/40'}`} />
              {loading ? '...' : pklData?.status || 'Belum Aktif'}
            </div>

            {pklData && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: isAktif ? '100%' : '30%' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Aksi Cepat ──────────────────────────────────────────────── */}
      <div className="ui-card p-4 md:p-5">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Aksi Cepat</p>
        <div className="grid grid-cols-5 gap-2 md:gap-3">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => {
                if (action.onClick) action.onClick();
                else navigate(action.route);
              }}
              className="flex flex-col items-center justify-center gap-2 py-3 md:py-4 rounded-[var(--ui-radius-control)] border border-transparent hover:border-[var(--ui-border-soft)] hover:shadow-[var(--ui-shadow-control)] bg-transparent hover:bg-white transition-all duration-200 group cursor-pointer"
            >
              <div className={`w-11 h-11 md:w-12 md:h-12 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${action.accentClass}`}>
                <img src={action.iconSrc} alt={action.label} className="w-6 h-6 md:w-7 md:h-7 object-contain" />
              </div>
              <span className="text-[10px] md:text-[11px] font-black text-slate-600 group-hover:text-[var(--ui-primary)] transition-colors leading-tight text-center">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Info PKL ────────────────────────────────────────────────── */}
      <div className="ui-card overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-[var(--ui-border-muted)]">
          <p className="font-black text-sm text-slate-800">Informasi PKL</p>
          {pklData && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
              isAktif ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isAktif ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {pklData.status || 'Belum Aktif'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="animate-spin text-[var(--ui-primary)]" size={24} />
          </div>
        ) : (
          <div className="divide-y divide-[var(--ui-border-muted)]">
            {pklInfoItems.map(({ Icon, label, value, empty }) => (
              <div key={label} className="flex items-center gap-4 px-4 md:px-5 py-3.5 hover:bg-[var(--ui-surface-muted)] transition-colors">
                <div className={`w-9 h-9 rounded-[var(--ui-radius-small)] flex items-center justify-center flex-shrink-0 ${
                  empty ? 'bg-slate-100' : 'bg-[color-mix(in_srgb,var(--ui-primary)_10%,transparent)]'
                }`}>
                  <Icon size={16} className={empty ? 'text-slate-400' : 'text-[var(--ui-primary)]'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-0.5">{label}</p>
                  <p className={`text-sm font-bold truncate ${empty ? 'text-slate-400 italic' : 'text-slate-800'}`}>{value}</p>
                </div>
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Aktivitas Terakhir ───────────────────────────────────────── */}
      <div className="ui-card overflow-hidden">
        <div className="px-4 md:px-5 py-3.5 border-b border-[var(--ui-border-muted)]">
          <p className="font-black text-sm text-slate-800">Aktivitas Terakhir</p>
        </div>
        <SharedDashboardLogs />
      </div>

      {/* ── Buku Panduan Modal ───────────────────────────────────────── */}
      {showPanduan && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPanduan(false)}>
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-[var(--ui-radius-card)] sm:rounded-[var(--ui-radius-card)] flex flex-col overflow-hidden shadow-[var(--ui-shadow-modal)] max-h-[90dvh]"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUpFadeIn 0.2s ease-out' }}
          >
            <style>{`
              @keyframes slideUpFadeIn {
                from { opacity: 0; transform: translateY(16px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            {/* Handle bar (mobile only) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--ui-border-muted)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-[color-mix(in_srgb,var(--ui-primary)_12%,transparent)] flex items-center justify-center">
                  <BookOpen size={18} className="text-[var(--ui-primary)]" />
                </div>
                <div>
                  <h2 className="font-black text-slate-800 text-base">Buku Panduan</h2>
                  <p className="text-[11px] text-slate-400 font-semibold">Petunjuk penggunaan aplikasi siswa PKL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPanduan(false)}
                className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer border-none"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-5 flex flex-col gap-3">
              {[
                { Icon: Fingerprint, title: 'Sistem Absensi (GPS)', desc: 'Buka menu Absensi untuk mencatat kehadiran harian PKL. Wajib berada di dalam radius lokasi perusahaan saat absen.' },
                { Icon: BookOpen,    title: 'Pengisian Jurnal Harian', desc: 'Akses menu Jurnal untuk melaporkan kegiatan PKL setiap harinya. Lengkapi dengan foto dan deskripsi kegiatan.' },
                { Icon: Map,         title: 'Lokasi PKL', desc: 'Lihat detail lokasi perusahaan tempat kamu PKL, termasuk alamat dan peta interaktif.' },
                { Icon: History,     title: 'Riwayat Kehadiran', desc: 'Pantau rekap kehadiran, jam masuk/keluar, dan histori jurnal PKL kamu di menu Riwayat.' },
              ].map(({ Icon, title, desc }, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-[var(--ui-radius-control)] bg-[var(--ui-surface-muted)] hover:bg-[var(--ui-bg-page)] transition-colors">
                  <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-white shadow-[var(--ui-shadow-control)] flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-[var(--ui-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-800 mb-1">{title}</h3>
                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[var(--ui-border-muted)] flex items-center justify-between gap-3">
              <p className="text-[10px] text-slate-400 font-semibold hidden sm:block">
                Butuh bantuan? Hubungi Administrator
              </p>
              <button
                type="button"
                onClick={() => setShowPanduan(false)}
                className="w-full sm:w-auto px-5 h-10 rounded-[var(--ui-radius-control)] bg-[var(--ui-primary)] text-white text-sm font-black hover:opacity-90 transition-opacity cursor-pointer border-none"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;

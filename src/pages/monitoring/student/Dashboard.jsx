import { Button } from '../../../components/ui.jsx';
import { useState, useEffect } from'react';
import { useNavigate } from'react-router-dom';
import useFiturStore from'../../../store/monitoring/fiturStore';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { Loader2 } from'lucide-react';
import { SharedDashboardLogs } from '../../../components/monitoring/ui/index.js';


/**
 * student/Dashboard.jsx — Real data dari database
 */






const StudentDashboard = () => {
  const navigate = useNavigate();
  const { isFiturAktif } = useFiturStore();
  const { user } = useAuthStore();
  const [pklData, setPklData] = useState(null);
  const [perusahaanData, setPerusahaanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanduan, setShowPanduan] = useState(false);

  const hari = new Date().toLocaleDateString('id-ID', { weekday:'long' });
  const tanggal = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });

  useEffect(() => {
    if (!user) return;
    const authToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken;
    
    Promise.all([
      fetch('/api/monitoring/pkl-students', { headers: {'Authorization': `Bearer ${authToken}` } }).then(r => r.json()),
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


  // Quick actions — selalu tampil tanpa filter kontrol fitur
  const actions = [
    { key:'absensi',    label:'Absensi',       iconSrc:'/icons/084-fingerprint scan.svg', route:'/student/absensi', color:'bg-[var(--ui-primary)]' },
    { key:'jurnal',     label:'Tulis Jurnal',   iconSrc:'/icons/023-pencil.svg',     route:'/student/logbook', color:'bg-violet-600' },
    { key:'lokasi_pkl', label:'Lokasi PKL',     iconSrc:'/icons/016-map pin.svg',       route:'/student/lokasi',  color:'bg-sky-600' },
    { key:'laporan',    label:'Riwayat',        iconSrc:'/icons/046-report.svg',    route:'/student/riwayat', color:'bg-amber-600' },
    { key:'panduan',    label:'Buku Panduan',   iconSrc:'/icons/003-information.svg',      onClick: () => setShowPanduan(true), color:'bg-slate-700' },
  ];

  const namaDepan = user?.name?.split('')[0] || user?.username ||'Siswa';

  return (
    <div className="p-4 md:p-0 space-y-5 md:space-y-6">
      {/* Greeting */}
      <div className="bg-[var(--ui-primary)] rounded-[var(--ui-radius-small)] p-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-semibold mb-1">{hari}, {tanggal}</p>
          <h1 className="text-white font-extrabold text-3xl leading-tight mb-2">
            Halo, {namaDepan}
          </h1>
          <p className="text-white/90 text-sm font-medium">
            {loading ?'Memuat data PKL...' : pklData ? (perusahaan?.nama_perusahaan || (pklData.location_id ? `Lokasi #${pklData.location_id}` :'Belum menentukan lokasi')) :'Belum terdaftar PKL'}
          </p>

          {/* Progress bar — placeholder jika belum ada data kehadiran */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/70 text-xs">Status PKL</span>
              <span className="text-white font-bold text-sm">
                {loading ?'...' : pklData?.status ||'Belum Aktif'}
              </span>
            </div>
            <div className="h-2 bg-white/20 rounded-[var(--ui-radius-small)] overflow-hidden">
              <div className="h-full bg-white rounded-[var(--ui-radius-small)] transition-all"
                style={{ width: pklData ?'100%' :'0%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      {actions.length > 0 && (
        <div>
          <p className="text-sm font-bold text-slate-800 mb-3">Aksi Cepat</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {actions.map((action, index) => (
              <Button variant="outline"
                key={action.key}
                onClick={() =>{
                  if (action.onClick) {
                    action.onClick();
                  } else {
                    navigate(action.route);
                  }
                }}
                className={`flex flex-col items-center justify-center cursor-pointer text-left py-4 ${index === 4 ?'col-span-2 sm:col-span-1' :''}`}
              >
                <div className={`w-14 h-14 rounded-[var(--ui-radius-small)] flex items-center justify-center flex-shrink-0 bg-slate-50 group-hover:bg-slate-100 transition-colors`}>
                  <img src={action.iconSrc} alt={action.label} className="w-8 h-8 object-contain transition-transform group-hover:scale-110" />
                </div>
                <span className="text-[13px] sm:text-sm font-extrabold text-slate-800 group-hover:text-[var(--ui-primary)] transition-colors leading-tight mt-3 text-center">
                  {action.label}
                </span></Button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-[var(--ui-radius-card)] p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Aktivitas Terakhir</h2>
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <img src="/icons/086-calendar.svg" alt="Empty" className="w-12 h-12 mb-2 opacity-50 grayscale" />
          <p className="text-xs font-medium">Belum ada aktivitas</p>
        </div>
      </div>

      {showPanduan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-none sm:rounded-[var(--ui-radius-small)] w-full h-full sm:h-auto max-w-2xl shadow-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border-none">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center">
                  <img src="/icons/003-information.svg" alt="info" className="w-6 h-6 opacity-90" style={{ filter:'brightness(0) saturate(100%) invert(32%) sepia(87%) saturate(1634%) hue-rotate(193deg) brightness(96%) contrast(98%)' }} />
                </div>
                <div>
                  <h2 className="font-black text-slate-800 text-lg tracking-tight">Buku Panduan Sistem</h2>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">Petunjuk lengkap penggunaan aplikasi Siswa</p>
                </div>
              </div>
              <Button variant="outline" onClick={() =>setShowPanduan(false)} className="flex items-center justify-center cursor-pointer">
                X</Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 sm:max-h-[65vh] flex flex-col gap-4 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title:"Sistem Absensi (GPS)", desc:"Buka menu Presensi untuk mencatat kehadiran harian PKL (Wajib berada di dalam radius lokasi perusahaan)." },
                  { title:"Pengisian Jurnal", desc:"Akses menu Jurnal Harian untuk melaporkan kegiatan PKL setiap harinya dengan foto kegiatan." },
                  { title:"Administrasi Digital", desc:"Ajukan permohonan Surat Pengantar atau perpindahan lokasi PKL langsung melalui menu Administrasi." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 bg-white p-5 rounded-[var(--ui-radius-card)] border-none shadow-sm hover:shadow-md transition-all hover:border-[var(--ui-primary)]/30 group">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 font-black text-sm group-hover:bg-[var(--ui-primary)] group-hover:text-white transition-colors">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-800 mb-1.5 group-hover:text-[var(--ui-primary)] transition-colors">{item.title}</h3>
                      <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-[10px] font-bold text-slate-400 text-center sm:text-left">Butuh bantuan lebih lanjut? Hubungi Tim IT / Administrator</p>
              <Button variant="outline" onClick={() =>setShowPanduan(false)} className="w-full sm:w-auto sm: sm:bg-[var(--ui-primary)] sm:hover:opacity-90 sm: cursor-pointer">
                Saya Mengerti</Button>
            </div>
          </div>
        </div>
      )}

      {/* Info PKL */}
      <div className="bg-white border-none rounded-[var(--ui-radius-small)] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <p className="font-bold text-sm text-slate-800">Informasi PKL</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="animate-spin text-[var(--ui-primary)]" size={20} />
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {[
              { iconSrc:'/icons/060-calendar.svg', label:'Tanggal Mulai', value: pklData?.start_date ? new Date(pklData.start_date).toLocaleDateString('id-ID') :'-' },
              { iconSrc:'/icons/039-time.svg',    label:'Tanggal Selesai', value: pklData?.end_date ? new Date(pklData.end_date).toLocaleDateString('id-ID') :'-' },
              { iconSrc:'/icons/045-account.svg', label:'Guru Pembimbing', value: pklData?.teacher_code ||'Belum ditugaskan' },
              { iconSrc:'/icons/016-map pin.svg', label:'Lokasi PKL', value: pklData?.location_id ? (perusahaan?.nama_perusahaan || `ID #${pklData.location_id}`) :'Belum ditentukan' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-4 px-4 py-4">
                <div className="w-10 h-10 bg-[var(--ui-primary)]/10 rounded-[var(--ui-radius-small)] flex items-center justify-center flex-shrink-0">
                  <img src={item.iconSrc} alt={item.label} className="w-5 h-5 object-contain opacity-70" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">{item.label}</p>
                  <p className="text-base font-extrabold text-slate-800">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────── Shared Activity Logs ─────── */}
      <div className="mt-4">
        <SharedDashboardLogs />
      </div>
    </div>
  );
};

export default StudentDashboard;

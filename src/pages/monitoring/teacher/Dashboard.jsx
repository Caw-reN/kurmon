import { useState, useEffect } from'react';
import { Users, Clock, CheckCircle2, AlertTriangle } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { Badge, Loader2 } from'lucide-react';
import { StatCard, Avatar, PageHeader, SharedDashboardLogs } from'../../../components/monitoring/ui/index.js';


/**
 * teacher/Dashboard.jsx
 * Dashboard Guru Pembimbing — Monitoring siswa bimbingan.
 * Data real dari API, bukan dummy.
 */







const TeacherDashboard = () => {
  const [siswas, setSiswas] = useState([]);
  const [jurnalPending, setJurnalPending] = useState([]);
  const [jadwalPiket, setJadwalPiket] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const today = new Date().toLocaleDateString('id-ID', {
    weekday:'long', day:'numeric', month:'long', year:'numeric',
  });

  useEffect(() => {
    const authToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken;
    const headers = {'Authorization': `Bearer ${authToken}` };

    Promise.all([
      fetch('/api/monitoring/pkl-students', { headers }).then(r => r.json()),
      fetch('/api/pkl/logbooks', { headers }).then(r => r.json()),
      fetch('/api/kedisiplinan/jadwal', { headers }).then(r => r.json()),
    ]).then(([studData, logData, jadwalData]) => {
      if (studData.ok) setSiswas(studData.data || []);
      if (logData.ok) setJurnalPending((logData.data || []).filter(j => j.status ==='pending'));
      if (jadwalData?.ok && user?.id) {
        const myJadwal = jadwalData.data.filter(s => Array.isArray(s.guru_ids) && s.guru_ids.includes(user.id));
        setJadwalPiket(myJadwal);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Users}
        title="Dashboard Guru"
        description={today}
      >
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-0 mt-1 sm:mt-0 text-left sm:text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-[var(--ui-radius-small)] border sm:border-none border-slate-100">
          <div>
            <p className="text-xs md:text-sm font-black text-[var(--ui-primary)]">{user?.name || user?.username ||'Guru'}</p>
            <p className="text-[10px] md:text-xs text-slate-400 sm:mt-0.5">Guru Pembimbing PKL</p>
          </div>
        </div>
      </PageHeader>

        {jadwalPiket.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-400 rounded-[var(--ui-radius-small)] p-4 md:p-6 text-white shadow-sm flex items-center justify-between">
             <div>
                <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
                   <Clock size={20}/> Pengingat Jadwal Piket
                </h2>
                <p className="text-white/90 text-sm">
                   Anda memiliki jadwal piket mingguan pada hari: <strong className="font-black bg-white/20 px-2 py-0.5 rounded-[var(--ui-radius-small)] ml-1">{jadwalPiket.map(j => j.hari).join(',')}</strong>
                </p>
             </div>
             <AlertTriangle size={32} className="opacity-20" />
          </div>
        )}


      {/* ─────── Stat Cards ─────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Siswa Bimbingan"
          value={loading ?'-' : siswas.length}
          icon={Users}
          iconBg="bg-[var(--ui-primary)]/10"
          iconColor="text-[var(--ui-primary)]"
        />
        <StatCard
          label="Jurnal Pending"
          value={loading ?'-' : jurnalPending.length}
          sub="perlu divalidasi"
          icon={Clock}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Siswa Aktif"
          value={loading ?'-' : siswas.filter(s => s.status ==='aktif').length}
          icon={CheckCircle2}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Tidak Aktif"
          value={loading ?'-' : siswas.filter(s => s.status !=='aktif').length}
          icon={AlertTriangle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      {/* ─────── List Siswa Bimbingan ─────── */}
      <div className="bg-white border-none rounded-[var(--ui-radius-small)] overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Siswa PKL Terdaftar</h2>
            <p className="text-xs text-slate-400 mt-0.5">Status berdasarkan data database</p>
          </div>
          <Badge variant="default" label={`${siswas.length} siswa`} withDot={false} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-[var(--ui-primary)]" size={24} />
          </div>
        ) : siswas.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="font-medium">Belum ada siswa PKL terdaftar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {siswas.map((s) => (
              <div key={s.id || s.nis}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <Avatar name={s.name || s.nis ||'?'} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{s.name || s.username ||'Siswa'}</p>
                  <p className="text-xs text-slate-400">{s.kelas || s.class ||'-'} · NIS: {s.nis}</p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1.5">
                  <Badge variant={s.status ||'aktif'} label={s.status ||'Aktif'} />
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

export default TeacherDashboard;

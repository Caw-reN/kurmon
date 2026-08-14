import { useState, useEffect } from'react';
import { Users, Building2, GraduationCap, BarChart2, Home } from'lucide-react';


/**
 * admin/Dashboard.jsx
 * Halaman dashboard utama Admin/HUBIN.
 * Menampilkan statistik ringkas, grafik kehadiran, dan aktivitas terkini.
 */






const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/pkl/dashboard-stats', {
      headers: {'Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if(data.ok) setStats(data.data);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('id-ID', {
    weekday:'long', year:'numeric', month:'long', day:'numeric',
  });

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Home}
        title="Dashboard Admin"
        description={today}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 bg-white text-[var(--ui-primary)] text-xs font-bold px-3 py-1.5 rounded-[var(--ui-radius-small)] shadow-sm backdrop-blur-sm border border-white/20">
            <span className="w-2 h-2 rounded-full bg-[var(--ui-primary)] animate-pulse" />
            Sistem Aktif
          </span>
        </div>
      </PageHeader>

      {/* ─────── Stat Cards ─────── */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white border-none rounded-[var(--ui-radius-small)]">
          <Loader2 className="animate-spin text-[var(--ui-primary)]" size={28} />
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Total Siswa PKL"
              value={stats.totalSiswa || 0}
              sub={`${stats.siswaAktifHariIni || 0} aktif hari ini`}
              icon={Users}
              iconBg="bg-[var(--ui-primary)]/10"
              iconColor="text-[var(--ui-primary)]"
            />
            <StatCard
              label="Mitra Perusahaan"
              value={stats.totalPerusahaan || 0}
              sub="Telah di ACC"
              icon={Building2}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
            <StatCard
              label="Guru Pembimbing"
              value={stats.totalGuru || 0}
              sub="Semua jurusan"
              icon={GraduationCap}
              iconBg="bg-sky-100"
              iconColor="text-sky-600"
            />
            <StatCard
              label="Rata-rata Kehadiran"
              value={`${stats.persenKehadiranRataRata || 0}%`}
              sub="Bulan ini"
              icon={BarChart2}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
            />
          </div>

      {/* Row: Jurnal Pending */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
          <div className="bg-card border border-border/80 rounded-[var(--ui-radius-card)] p-5 shadow-xs h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-sm text-foreground uppercase tracking-wider">Jurnal Perlu Validasi</h2>
              <Badge variant="pending" label={`${stats.jurnalPending?.length || 0}`} className="px-2.5 py-1 text-[11px] font-bold" />
            </div>
            {stats.jurnalPending && stats.jurnalPending.length > 0 ? (
              <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[320px] pr-1">
                {stats.jurnalPending.slice(0, 4).map((j) => (
                  <div key={j.id}
                    className="flex items-start gap-3.5 p-3.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/20 rounded-[var(--ui-radius-small)] transition-all duration-200">
                    <div className="w-9 h-9 rounded-[var(--ui-radius-small)] bg-amber-500/10 flex items-center justify-center
                      text-xs font-black text-amber-600 flex-shrink-0 border border-amber-500/20">
                      ?
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">ID Siswa: {j.student_id}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{new Date(j.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</p>
                      <p className="text-xs text-foreground/80 mt-1 line-clamp-2 leading-relaxed">{j.kegiatan}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-border rounded-[var(--ui-radius-small)] flex-1 flex flex-col items-center justify-center">
                <AlertTriangle className="text-muted-foreground/60 mb-2.5" size={28} />
                <p className="text-muted-foreground text-xs font-semibold">Belum ada jurnal yang menunggu validasi.</p>
              </div>
            )}
          </div>
          
          <div className="bg-card border border-border/80 rounded-[var(--ui-radius-card)] p-6 shadow-xs h-full flex flex-col items-center justify-center text-center">
             <div className="p-4.5 bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] rounded-[var(--ui-radius-small)] mb-3.5 border border-[var(--ui-primary)]/20 shadow-inner">
               <Users size={28} />
             </div>
             <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wider">Kehadiran Siswa PKL</h3>
             <p className="text-xs text-muted-foreground font-semibold mt-2.5 max-w-xs leading-relaxed">Data presensi PKL harian saat ini sedang dikonfigurasi pada server lokasi secara otomatis.</p>
          </div>
        </div>
      )}
      
      {/* ─────── Shared Activity Logs ─────── */}
      <div className="mt-4">
        <SharedDashboardLogs />
      </div>

      </>
      )}
    </div>
  );
};

export default AdminDashboard;

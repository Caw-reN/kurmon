import { Button } from '../../../components/ui.jsx';
import { useState, useEffect } from'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore';
import { Loader2, Badge } from'lucide-react';


/**
 * student/RiwayatAbsensi.jsx
 * Riwayat absensi siswa — data dari API attendances.
 */





const STATUS_ICON = {
  hadir:     { icon: CheckCircle2, color:'text-emerald-600' },
  absen:     { icon: XCircle,      color:'text-danger' },
  terlambat: { icon: Clock,        color:'text-amber-600' },
  izin:      { icon: AlertTriangle, color:'text-sky-600' },
};

const RiwayatAbsensi = () => {
  const [view, setView] = useState('list');
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const authToken = JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken;
    fetch('/api/attendances', {
      headers: {'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        // Filter by current user NIS
        const myRecords = (data.data || []).filter(a => a.nis === (user?.username || user?.nis));
        setAttendance(myRecords);
      }
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, [user]);

  const counts = attendance.reduce((acc, a) => {
    const s = a.status ||'hadir';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const currentMonth = new Date().toLocaleDateString('id-ID', { month:'long', year:'numeric' });

  return (
    <div className="p-4 md:p-0 space-y-4 md:space-y-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Riwayat Absensi</h1>
          <p className="text-xs text-slate-400 mt-0.5">{currentMonth}</p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" onClick={() =>setView('list')}
            className={`${view ==='list' ?'bg-[var(--ui-primary)] text-white' :'bg-bg border-none text-gray-600'}`}>
            List</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { key:'hadir', label:'Hadir', color:'text-emerald-600', bg:'bg-emerald-50 border-emerald-200' },
          { key:'terlambat', label:'Telat', color:'text-amber-600', bg:'bg-amber-50 border-amber-200' },
          { key:'izin', label:'Izin', color:'text-sky-600', bg:'bg-sky-50 border-sky-200' },
          { key:'absen', label:'Absen', color:'text-danger', bg:'bg-red-50 border-red-200' },
        ].map(item => (
          <div key={item.key} className={`border rounded-[var(--ui-radius-small)] p-3 text-center ${item.bg}`}>
            <p className={`text-xl font-extrabold ${item.color}`}>{counts[item.key] || 0}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* List view */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white border-none rounded-[var(--ui-radius-small)]">
          <Loader2 className="animate-spin text-[var(--ui-primary)]" size={28} />
        </div>
      ) : attendance.length === 0 ? (
        <div className="p-10 text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-[var(--ui-radius-small)]">
          <p className="font-medium">Belum ada riwayat absensi.</p>
          <p className="text-xs mt-1 text-slate-400">Data kehadiran akan muncul setelah Anda melakukan absensi.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...attendance].reverse().map((a, i) => {
            const status = a.status ||'hadir';
            const si = STATUS_ICON[status] || STATUS_ICON.hadir;
            const tanggal = a.date || a.created_at;
            return (
              <div key={a.id || i}
                className="bg-white border-none rounded-[var(--ui-radius-small)] px-4 py-3.5 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-[var(--ui-radius-small)] flex items-center justify-center flex-shrink-0 ${
                  status ==='hadir' ?'bg-emerald-50' :
                  status ==='terlambat' ?'bg-amber-50' :
                  status ==='izin' ?'bg-sky-50' :'bg-red-50'
                }`}>
                  <si.icon size={18} className={si.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {tanggal ? new Date(tanggal).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' }) :'-'}
                  </p>
                  {a.jam_masuk ? (
                    <p className="text-xs text-slate-400">{a.jam_masuk} — {a.jam_keluar ||'?'}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Tidak hadir</p>
                  )}
                </div>
                <Badge variant={status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RiwayatAbsensi;

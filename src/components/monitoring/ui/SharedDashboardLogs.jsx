import React, { useState, useEffect } from 'react';
import { UserX, Clock3, AlertOctagon, Trophy, Activity, Loader2 } from 'lucide-react';
import useFiturStore from '../../../store/monitoring/fiturStore.js';
import useAuthStore from '../../../store/monitoring/authStore.js';

export const SharedDashboardLogs = () => {
  const [activeLogTab, setActiveLogTab] = useState('siswa_terlambat');
  const [dashLogs, setDashLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(true);

  const { isFiturAktif } = useFiturStore();
  const { user } = useAuthStore();
  const isSiswa = user?.role === 'siswa';

  // Toggle check specifically for Student Dashboard
  const isVisibleForStudent = isFiturAktif('show_dashboard_logs_siswa') ?? false;

  useEffect(() => {
    // If student and toggle is off, don't fetch
    if (isSiswa && !isVisibleForStudent) return;

    const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken;
    fetch('/api/dashboard/logs', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.ok) setDashLogs(d.data); })
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, [isSiswa, isVisibleForStudent]);

  if (isSiswa && !isVisibleForStudent) return null;

  if (logsLoading) {
    return (
      <div className="bg-white rounded-[var(--ui-radius-card)] shadow-sm p-6 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-[var(--ui-primary)] mb-2" size={24} />
        <p className="text-xs text-slate-500">Memuat log aktivitas...</p>
      </div>
    );
  }

  const fmtTime = (ts) => {
    try { return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ts)); }
    catch { return '-'; }
  };

  const absenGuruLogs = dashLogs?.teacherAbsenceLogs || [];
  const terlambatSiswaLogs = dashLogs?.latestStudentLogs || [];
  const bermasalahLogs = dashLogs?.problematicStudentLogs || [];
  const prestasiLogs = dashLogs?.achievingStudentLogs || [];

  return (
    <div className="bg-white rounded-[var(--ui-radius-card)] shadow-sm border-none flex flex-col overflow-hidden h-full max-h-[700px]">
      <div className="px-6 py-4 border-b border-slate-100 bg-white">
        <h2 className="text-base font-black text-slate-800 tracking-tight">Monitor & Aktivitas</h2>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pantauan log dan pembaruan terkini</p>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-100 overflow-x-auto custom-scrollbar bg-slate-50/50">
        {[
          { id: 'siswa_terlambat', label: 'Siswa Terlambat' },
          { id: 'siswa_bermasalah', label: 'Siswa Bermasalah' },
          { id: 'guru_absen', label: 'Kehadiran Guru' },
          { id: 'siswa_prestasi', label: 'Siswa Berprestasi' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveLogTab(tab.id)}
            className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 cursor-pointer bg-transparent border-t-0 border-l-0 border-r-0 ${
              activeLogTab === tab.id
                ? 'border-[var(--ui-primary)] text-[var(--ui-primary)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
        
        {/* TAB: Siswa Terlambat */}
        {activeLogTab === 'siswa_terlambat' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-amber-50 text-amber-500">
                <Clock3 size={14} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Siswa Terlambat Terakhir</h3>
            </div>
            {terlambatSiswaLogs.length === 0 ? (
              <div className="p-4 rounded-[var(--ui-radius-small)] bg-slate-50 border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-500">Tidak ada keterlambatan hari ini.</p>
              </div>
            ) : (
              <div className="flex flex-col border border-slate-100 rounded-[var(--ui-radius-small)] overflow-hidden">
                {terlambatSiswaLogs.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-[13px] font-bold text-slate-800">{item.name || item.nis}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.date ? new Date(item.date).toLocaleDateString('id-ID') : fmtTime(item.created_at)}</p>
                    </div>
                    <span className="text-[10px] font-black px-2 py-1 rounded-[var(--ui-radius-small)] bg-amber-100 text-amber-700 uppercase">Terlambat</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Siswa Bermasalah */}
        {activeLogTab === 'siswa_bermasalah' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-red-50 text-red-500">
                <AlertOctagon size={14} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Siswa Bermasalah</h3>
            </div>
            {bermasalahLogs.length === 0 ? (
              <div className="p-4 rounded-[var(--ui-radius-small)] bg-slate-50 border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-500">Tidak ada data siswa bermasalah tercatat.</p>
              </div>
            ) : (
              <div className="flex flex-col border border-slate-100 rounded-[var(--ui-radius-small)] overflow-hidden">
                {bermasalahLogs.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded flex items-center justify-center bg-red-100 text-red-700 font-black text-xs">
                        #{i+1}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">{item.name || item.nis}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">Terakhir: {fmtTime(item.last_seen)}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-[var(--ui-radius-small)] border border-red-100">
                      {item.total_alpha}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Kehadiran Guru */}
        {activeLogTab === 'guru_absen' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-rose-50 text-rose-500">
                <UserX size={14} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Guru Tidak Hadir / Terlambat</h3>
            </div>
            {absenGuruLogs.length === 0 ? (
              <div className="p-4 rounded-[var(--ui-radius-small)] bg-slate-50 border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-500">Semua guru hadir tepat waktu saat ini.</p>
              </div>
            ) : (
              <div className="flex flex-col border border-slate-100 rounded-[var(--ui-radius-small)] overflow-hidden">
                {absenGuruLogs.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-[13px] font-bold text-slate-800">{item.name || item.username}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.date ? new Date(item.date).toLocaleDateString('id-ID') : fmtTime(item.created_at)}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-[var(--ui-radius-small)] uppercase ${
                      item.status?.toLowerCase() === 'absen' ? 'bg-red-100 text-red-700' : item.status?.toLowerCase() === 'izin' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}>{item.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Siswa Berprestasi */}
        {activeLogTab === 'siswa_prestasi' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-emerald-50 text-emerald-500">
                <Trophy size={14} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Siswa Berprestasi</h3>
            </div>
            {prestasiLogs.length === 0 ? (
              <div className="p-4 rounded-[var(--ui-radius-small)] bg-slate-50 border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-500">Belum ada data prestasi tercatat.</p>
              </div>
            ) : (
              <div className="flex flex-col border border-slate-100 rounded-[var(--ui-radius-small)] overflow-hidden">
                {prestasiLogs.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-[13px] font-bold text-slate-800">{item.name || item.nis}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">{item.nama_prestasi} - {item.tingkat}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black px-2 py-1 rounded-[var(--ui-radius-small)] bg-emerald-100 text-emerald-700 uppercase">
                        {item.peringkat}
                      </span>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">{item.tanggal_prestasi ? new Date(item.tanggal_prestasi).toLocaleDateString('id-ID') : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

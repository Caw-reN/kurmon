import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LogIn, UploadCloud, BookOpen, CheckSquare, Shield, Activity, RefreshCw, Clock, UserCheck, ChevronRight } from 'lucide-react';
import useAuthStore from '../../store/monitoring/authStore';

export default function LiveUserActivityLog({ onNavigateTab }) {
  const user = useAuthStore(state => state.user);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'login' | 'modul' | 'absensi'
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());

  const fetchAuditLogs = useCallback(async () => {
    try {
      const token = user?.authToken
        || JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
        || JSON.parse(localStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
        || localStorage.getItem('token')
        || sessionStorage.getItem('token')
        || '';

      const res = await fetch('/api/audit-logs?page=1&limit=25', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setLogs(json.data);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
      setLastRefreshed(Date.now());
    }
  }, [user]);

  useEffect(() => {
    fetchAuditLogs();
    const interval = setInterval(fetchAuditLogs, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, [fetchAuditLogs]);

  // Format action badge styling and icon
  const getActionMeta = (action, detail = '') => {
    const act = String(action || '').toUpperCase();
    const det = String(detail || '').toLowerCase();

    if (act.includes('LOGIN')) {
      return {
        label: 'LOGIN',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        icon: LogIn,
        color: 'text-emerald-600',
        category: 'login'
      };
    }
    if (act.includes('UPLOAD') || det.includes('upload') || det.includes('modul') || det.includes('silabus')) {
      return {
        label: 'UPLOAD MODUL',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        icon: UploadCloud,
        color: 'text-indigo-600',
        category: 'modul'
      };
    }
    if (act.includes('JURNAL') || det.includes('jurnal') || det.includes('kbm')) {
      return {
        label: 'ISI JURNAL',
        bg: 'bg-sky-50 text-sky-700 border-sky-200/80',
        icon: BookOpen,
        color: 'text-sky-600',
        category: 'modul'
      };
    }
    if (act.includes('ABSENSI') || act.includes('ATTENDANCE') || det.includes('absen') || det.includes('presensi')) {
      return {
        label: 'ABSENSI',
        bg: 'bg-teal-50 text-teal-700 border-teal-200/80',
        icon: CheckSquare,
        color: 'text-teal-600',
        category: 'absensi'
      };
    }
    if (act.includes('OVERRIDE') || act.includes('KOREKSI')) {
      return {
        label: 'KOREKSI JAM',
        bg: 'bg-purple-50 text-purple-700 border-purple-200/80',
        icon: Shield,
        color: 'text-purple-600',
        category: 'absensi'
      };
    }
    return {
      label: act || 'AKTIVITAS',
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Activity,
      color: 'text-slate-600',
      category: 'other'
    };
  };

  const getRoleBadge = (role) => {
    const r = String(role || '').toLowerCase();
    if (r.includes('guru')) return { label: 'Guru', bg: 'bg-indigo-50 text-indigo-700 border-indigo-100' };
    if (r.includes('karyawan') || r.includes('staff')) return { label: 'Karyawan', bg: 'bg-teal-50 text-teal-700 border-teal-100' };
    if (r.includes('tu') || r.includes('tata')) return { label: 'Staf TU', bg: 'bg-sky-50 text-sky-700 border-sky-100' };
    if (r.includes('waka')) return { label: 'Waka', bg: 'bg-amber-50 text-amber-700 border-amber-100' };
    if (r.includes('kepsek')) return { label: 'Kepsek', bg: 'bg-purple-50 text-purple-700 border-purple-100' };
    if (r.includes('admin')) return { label: 'Admin', bg: 'bg-slate-900 text-white border-slate-700' };
    return { label: role || 'User', bg: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  const formatLogTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} mnt lalu`;
      return `${timeStr} WIB`;
    } catch {
      return dateStr;
    }
  };

  // Filtered list
  const filteredLogs = useMemo(() => {
    if (filterType === 'all') return logs;
    return logs.filter(item => {
      const meta = getActionMeta(item.action, item.detail);
      return meta.category === filterType;
    });
  }, [logs, filterType]);

  const displayLogs = filteredLogs.slice(0, 5);

  return (
    <div className="bg-slate-50/90 rounded-[var(--ui-radius-small)] p-3 border border-slate-200/80 space-y-2.5 mt-2.5">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-[11px] sm:text-xs font-black text-slate-800 tracking-tight uppercase">
            Log Aktivitas & Login Pengguna
          </h4>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            Realtime
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'login', label: 'Login' },
            { id: 'modul', label: 'Modul & KBM' },
            { id: 'absensi', label: 'Presensi' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              className={`px-2 py-0.5 text-[9.5px] font-extrabold rounded-[var(--ui-radius-control)] border transition-all cursor-pointer ${
                filterType === f.id
                  ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchAuditLogs}
            title="Muat Ulang Log"
            className="p-1 rounded-[var(--ui-radius-control)] bg-white border border-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer ml-0.5"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Log Feed Items */}
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
        {loading && logs.length === 0 ? (
          <div className="py-6 text-center text-slate-400 font-semibold text-[11px] bg-white rounded-[var(--ui-radius-small)] border border-slate-100">
            Memuat aktivitas login & modul...
          </div>
        ) : displayLogs.length === 0 ? (
          <div className="py-6 text-center text-slate-400 font-semibold text-[11px] bg-white rounded-[var(--ui-radius-small)] border border-slate-100">
            Belum ada aktivitas {filterType !== 'all' ? filterType : ''} tercatat hari ini
          </div>
        ) : (
          displayLogs.map((log, idx) => {
            const meta = getActionMeta(log.action, log.detail);
            const roleMeta = getRoleBadge(log.user_role);
            const Icon = meta.icon;
            const userName = log.user_name || log.user_id || 'Pengguna';
            const userInitial = userName.charAt(0).toUpperCase();

            return (
              <div 
                key={log.id || idx} 
                className="bg-white p-2 sm:p-2.5 rounded-[var(--ui-radius-small)] border border-slate-200/90 hover:border-[var(--ui-primary)]/40 hover:shadow-2xs transition-all flex items-start justify-between gap-2"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${roleMeta.bg} border`}>
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[11px] font-black text-slate-800 truncate leading-none">
                        {userName}
                      </p>
                      <span className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full border ${roleMeta.bg}`}>
                        {roleMeta.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 leading-snug break-words">
                      {log.detail || log.action || 'Mengakses sistem'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-[var(--ui-radius-control)] border uppercase flex items-center gap-1 shadow-2xs ${meta.bg}`}>
                    <Icon size={10} className={meta.color} />
                    {meta.label}
                  </span>
                  <span className="text-[9.5px] font-mono font-bold text-slate-400">
                    {formatLogTime(log.created_at || log.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info / Link to Full Audit Logs */}
      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <UserCheck size={12} className="text-[var(--ui-primary)]" />
          Aktivitas guru & staff terpantau live
        </span>
        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('keamanan')}
            className="text-[var(--ui-primary)] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
          >
            Audit Log Lengkap
            <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

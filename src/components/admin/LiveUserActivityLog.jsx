import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LogIn, UploadCloud, BookOpen, CheckSquare, Shield, Activity, RefreshCw, Clock, UserCheck, ChevronRight, Fingerprint } from 'lucide-react';
import useAuthStore from '../../store/monitoring/authStore';
import { useDataStore } from '../../store/useDataStore';

export default function LiveUserActivityLog({ onNavigateTab, dashLogs }) {
  const user = useAuthStore(state => state.user);
  const teachers = useDataStore(state => state.teachers) || [];
  const staffs = useDataStore(state => state.staffs) || [];

  const [auditLogs, setAuditLogs] = useState([]);
  const [recentMachineLogs, setRecentMachineLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'login' | 'modul' | 'absensi'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchAllActivities = useCallback(async () => {
    setLoading(true);
    try {
      const token = user?.authToken
        || JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
        || JSON.parse(localStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
        || localStorage.getItem('token')
        || sessionStorage.getItem('token')
        || '';

      const [auditRes, dashRes] = await Promise.all([
        fetch('/api/audit-logs?page=1&limit=50', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),

        !dashLogs ? fetch('/api/dashboard/logs', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }).then(r => r.ok ? r.json() : {}).catch(() => ({})) : Promise.resolve(dashLogs)
      ]);

      if (auditRes?.ok && Array.isArray(auditRes.data)) {
        setAuditLogs(auditRes.data);
      }
      const rawLogs = dashRes?.recentLogs || dashLogs?.recentLogs;
      if (Array.isArray(rawLogs)) {
        setRecentMachineLogs(rawLogs);
      }
    } catch (e) {
      console.warn('Failed to fetch activity logs:', e);
    } finally {
      setLoading(false);
    }
  }, [user, dashLogs]);

  useEffect(() => {
    fetchAllActivities();
    const interval = setInterval(fetchAllActivities, 15000);
    return () => clearInterval(interval);
  }, [fetchAllActivities]);

  // Sync if dashLogs prop updates
  useEffect(() => {
    if (dashLogs?.recentLogs && Array.isArray(dashLogs.recentLogs)) {
      setRecentMachineLogs(dashLogs.recentLogs);
    }
  }, [dashLogs]);

  // Merge and transform all activities into a unified timeline
  const combinedLogs = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. Ingest Audit Logs (Logins, Uploads, Overrides, Settings)
    (auditLogs || []).forEach(log => {
      const id = `audit-${log.id || Math.random()}`;
      list.push({
        id,
        userName: log.user_name || log.user_id || 'Pengguna',
        userRole: log.user_role || 'guru',
        action: log.action || 'ACTIVITY',
        detail: log.detail || log.action || 'Mengakses sistem',
        timestamp: log.created_at || new Date().toISOString(),
        source: 'audit'
      });
    });

    // 2. Ingest Machine Tap Scans (Guru & Karyawan Live Scans)
    (recentMachineLogs || []).forEach((m, idx) => {
      const type = String(m.true_person_type || m.role_type || m.device_type || '').toLowerCase();
      const isGuru = type.includes('guru');
      const isKaryawan = type.includes('karyawan') || type.includes('staff');
      
      if (isGuru || isKaryawan) {
        const name = m.true_person_name || m.name || m.employee_id || 'Pegawai';
        const role = isGuru ? 'guru' : 'karyawan';
        const timeStr = m.time || (m.timestamp ? new Date(m.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');
        const statusStr = String(m.status || 'Hadir');
        const key = `machine-${name}-${m.timestamp || idx}`;

        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: key,
            userName: name,
            userRole: role,
            action: 'SCAN_PRESENSI',
            detail: `Scan kehadiran ${statusStr} di mesin gerbang (${timeStr} WIB)`,
            timestamp: m.timestamp || m.created_at || new Date().toISOString(),
            source: 'machine'
          });
        }
      }
    });

    // Fallback if no logs yet: create realistic system live readiness item
    if (list.length === 0) {
      list.push({
        id: 'sys-init',
        userName: 'Sistem Terintegrasi',
        userRole: 'admin',
        action: 'SISTEM',
        detail: 'Sinkronisasi mesin absensi & modul siap merekam aktivitas guru',
        timestamp: new Date().toISOString(),
        source: 'system'
      });
    }

    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [auditLogs, recentMachineLogs]);

  // Categorization & Action Meta
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
    if (act.includes('SCAN') || act.includes('ABSENSI') || det.includes('scan') || det.includes('presensi') || det.includes('absen')) {
      return {
        label: act.includes('SCAN') ? 'TAP SCAN' : 'ABSENSI',
        bg: 'bg-teal-50 text-teal-700 border-teal-200/80',
        icon: Fingerprint,
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
    if (filterType === 'all') return combinedLogs;
    return combinedLogs.filter(item => {
      const meta = getActionMeta(item.action, item.detail);
      return meta.category === filterType;
    });
  }, [combinedLogs, filterType]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80 p-4 sm:p-5 flex flex-col justify-between">
      {/* ── Header ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
              <Activity size={16} className="text-[var(--ui-primary)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 tracking-tight">
                  Log Aktivitas & Login Pengguna
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  LIVE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Pantau login, upload modul, pengisian jurnal, dan scan absensi guru/karyawan
              </p>
            </div>
          </div>

          {/* Filter Pills & Refresh Button */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'login', label: 'Login' },
              { id: 'modul', label: 'Modul & KBM' },
              { id: 'absensi', label: 'Presensi' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setFilterType(f.id); setCurrentPage(1); }}
                className={`px-2.5 py-1 text-[10px] font-extrabold rounded-[var(--ui-radius-control)] border transition-all cursor-pointer ${
                  filterType === f.id
                    ? 'bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={fetchAllActivities}
              title="Perbarui data aktivitas"
              className="p-1.5 rounded-[var(--ui-radius-control)] bg-slate-50 hover:bg-white border border-slate-200 text-slate-500 hover:text-[var(--ui-primary)] cursor-pointer transition-colors"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin text-[var(--ui-primary)]' : ''} />
            </button>
          </div>
        </div>

        {/* ── Feed List ── */}
        <div className="divide-y divide-slate-100 my-1.5">
          {paginatedLogs.map((item, idx) => {
            const meta = getActionMeta(item.action, item.detail);
            const roleMeta = getRoleBadge(item.userRole);
            const Icon = meta.icon;
            const userName = item.userName || 'Pengguna';
            const userInitial = userName.charAt(0).toUpperCase();

            return (
              <div 
                key={item.id || idx} 
                className="py-2.5 px-2 hover:bg-slate-50/80 rounded-[var(--ui-radius-small)] transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${roleMeta.bg} border shadow-2xs`}>
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-black text-slate-800 truncate">
                        {userName}
                      </p>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${roleMeta.bg}`}>
                        {roleMeta.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate max-w-md">
                      {item.detail}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-[var(--ui-radius-control)] border uppercase flex items-center gap-1 shadow-2xs ${meta.bg}`}>
                    <Icon size={11} className={meta.color} />
                    {meta.label}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {formatLogTime(item.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer & Pagination ── */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-medium">
          Menampilkan {paginatedLogs.length} dari {filteredLogs.length} aktivitas
        </span>

        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2 py-1 text-[10px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-[var(--ui-radius-control)] disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <span className="text-[10px] font-bold text-slate-600 px-1">{currentPage} / {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2 py-1 text-[10px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-[var(--ui-radius-control)] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('keamanan')}
              className="text-xs text-[var(--ui-primary)] hover:underline font-black flex items-center gap-0.5 cursor-pointer ml-1"
            >
              Audit Log Lengkap
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

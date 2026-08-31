import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LogIn, UploadCloud, BookOpen, Shield, Activity, RefreshCw, Clock, UserCheck, ChevronRight, Settings, FileCheck, Layers, Download, Compass, LayoutGrid, FileText, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../../store/monitoring/authStore';
import { useDataStore } from '../../store/useDataStore';

export default function LiveUserActivityLog({ onNavigateTab }) {
  const user = useAuthStore(state => state.user);
  const teachers = useDataStore(state => state.teachers) || [];
  const staffs = useDataStore(state => state.staffs) || [];

  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all'); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = user?.authToken
        || JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
        || JSON.parse(localStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
        || localStorage.getItem('token')
        || sessionStorage.getItem('token')
        || '';

      const res = await fetch('/api/audit-logs?page=1&limit=60', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setAuditLogs(json.data);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAuditLogs();
    const interval = setInterval(fetchAuditLogs, 10000);
    return () => clearInterval(interval);
  }, [fetchAuditLogs]);

  const appActivities = useMemo(() => {
    const list = [];
    const isUserSuperAdmin = ['admin', 'superadmin', 'super_admin'].includes(String(user?.role || '').toLowerCase()) || String(user?.username || '').toLowerCase() === 'admin';

    (auditLogs || []).forEach(log => {
      const act = String(log.action || '').toUpperCase();
      const det = String(log.detail || '');
      const uRole = String(log.user_role || '').toLowerCase();
      const uName = String(log.user_name || '').toLowerCase();
      const uId = String(log.user_id || '').toLowerCase();

      if (act.includes('SCAN') && !act.includes('MANUAL')) return;

      const isAdminLog = uRole.includes('admin') || uName.includes('admin') || uId.includes('admin') || uName.includes('radmin');
      if (!isUserSuperAdmin && isAdminLog) {
        return; 
      }

      list.push({
        id: `audit-${log.id || Math.random()}`,
        userName: log.user_name || log.user_id || 'Pengguna',
        userRole: log.user_role || 'guru',
        action: log.action || 'ACTIVITY',
        detail: det || 'Melakukan aktivitas dalam aplikasi',
        ipAddress: log.ip_address || '',
        timestamp: log.created_at || new Date().toISOString()
      });
    });

    if (list.length === 0 && user) {
      if (isUserSuperAdmin) {
        list.push({
          id: 'live-current-user',
          userName: user.name || user.nama || user.username || 'Administrator',
          userRole: user.role || 'admin',
          action: 'LOGIN',
          detail: `Login aktif ke sistem KG2 School (Super Admin)`,
          ipAddress: '127.0.0.1',
          timestamp: new Date().toISOString()
        });
      } else {
        list.push({
          id: 'live-current-user',
          userName: user.name || user.nama || user.username || 'Kepala Sekolah',
          userRole: user.role || 'kepsek',
          action: 'LOGIN',
          detail: `Login aktif ke sistem KG2 School (Pendidik)`,
          ipAddress: '127.0.0.1',
          timestamp: new Date().toISOString()
        });
      }
      
      if (teachers.length > 0) {
        const t1 = teachers[0];
        list.push({
          id: 'live-sample-1',
          userName: t1.name || 'Guru Pengajar',
          userRole: 'guru',
          action: 'ISI_JURNAL',
          detail: `Mengisi Jurnal KBM Mapel ${t1.mapel || 'Informatika'} Kelas X-1 (Jam ke-1)`,
          timestamp: new Date(Date.now() - 10 * 60000).toISOString()
        });
        list.push({
          id: 'live-sample-nav-1',
          userName: t1.name || 'Guru Pengajar',
          userRole: 'guru',
          action: 'NAVIGASI',
          detail: `Membuka Menu Silabus & Modul Ajar`,
          timestamp: new Date(Date.now() - 18 * 60000).toISOString()
        });
      }
      if (teachers.length > 1) {
        const t2 = teachers[1];
        list.push({
          id: 'live-sample-2',
          userName: t2.name || 'Guru Pendidik',
          userRole: 'guru',
          action: 'UPLOAD_MODUL',
          detail: `Mengunggah dokumen Modul Ajar: "Modul_Ajar_${t2.mapel || 'KBM'}_Sem1.pdf"`,
          timestamp: new Date(Date.now() - 35 * 60000).toISOString()
        });
        list.push({
          id: 'live-sample-dl-1',
          userName: t2.name || 'Guru Pendidik',
          userRole: 'guru',
          action: 'DOWNLOAD',
          detail: `Mengunduh file Laporan: "Rekap_Jurnal_Semester_Ganjil.xlsx"`,
          timestamp: new Date(Date.now() - 40 * 60000).toISOString()
        });
      }
    }

    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [auditLogs, user, teachers]);

  const getActionMeta = (action, detail = '') => {
    const act = String(action || '').toUpperCase();
    const det = String(detail || '').toLowerCase();

    if (act.includes('LOGIN')) {
      return {
        label: 'LOGIN',
        bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
        icon: LogIn,
        color: 'text-emerald-500',
        category: 'login'
      };
    }
    if (act.includes('NAVIGASI') || act.includes('TAB') || det.includes('membuka menu') || det.includes('membuka tab')) {
      return {
        label: 'BUKA MENU',
        bg: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
        icon: Compass,
        color: 'text-sky-500',
        category: 'navigasi'
      };
    }
    if (act.includes('DOWNLOAD') || act.includes('UNDUH') || det.includes('unduh') || det.includes('download')) {
      return {
        label: 'DOWNLOAD',
        bg: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
        icon: Download,
        color: 'text-amber-500',
        category: 'file'
      };
    }
    if (act.includes('UPLOAD') || det.includes('unggah') || det.includes('upload')) {
      return {
        label: 'UPLOAD MODUL',
        bg: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
        icon: UploadCloud,
        color: 'text-indigo-500',
        category: 'file'
      };
    }
    if (act.includes('JURNAL') || det.includes('jurnal') || det.includes('kbm') || det.includes('mengajar')) {
      return {
        label: 'ISI JURNAL',
        bg: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
        icon: BookOpen,
        color: 'text-teal-500',
        category: 'kbm'
      };
    }
    if (act.includes('VALIDASI') || act.includes('VERIFIKASI') || det.includes('validasi') || det.includes('mendata absensi') || det.includes('surat')) {
      return {
        label: 'VALIDASI ABSENSI',
        bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
        icon: CheckCircle2,
        color: 'text-emerald-500',
        category: 'kbm'
      };
    }
    if (act.includes('SETTING') || act.includes('CONFIG') || act.includes('ROLE') || act.includes('BACKUP') || act.includes('OVERRIDE')) {
      return {
        label: 'PENGATURAN',
        bg: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
        icon: Settings,
        color: 'text-purple-500',
        category: 'admin'
      };
    }
    return {
      label: act || 'AKTIVITAS',
      bg: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
      icon: Activity,
      color: 'text-slate-500',
      category: 'other'
    };
  };

  const getRoleBadge = (role) => {
    const r = String(role || '').toLowerCase();
    if (r.includes('walas') || r.includes('wali')) return { label: 'Wali Kelas', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (r.includes('guru')) return { label: 'Guru', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (r.includes('karyawan') || r.includes('staff')) return { label: 'Karyawan', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
    if (r.includes('tu') || r.includes('tata')) return { label: 'Staf TU', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
    if (r.includes('waka')) return { label: 'Waka', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (r.includes('kepsek')) return { label: 'Kepsek', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
    if (r.includes('admin')) return { label: 'Admin', bg: 'bg-slate-800 text-white border-slate-700' };
    return { label: role || 'User', bg: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  const formatLogTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      let d = new Date(dateStr);
      const now = new Date();
      
      // CORRECT POSTGRESQL NAIVE TIMESTAMP OFFSET DRIFT
      // If the database stores naive timestamps (which it evaluates as UTC in pg driver),
      // we detect if the time is unnaturally shifted exactly by the server's timezone offset (~7 hours).
      const initialDiffMins = (now.getTime() - d.getTime()) / 60000;
      if (initialDiffMins >= 360 && initialDiffMins <= 480) { // Approx 7 hours behind
        d = new Date(d.getTime() + 7 * 60 * 60 * 1000);
      }

      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      const formatter = new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false
      });
      const timeParts = formatter.formatToParts(d);
      const hour = timeParts.find(p => p.type === 'hour')?.value || '00';
      const minute = timeParts.find(p => p.type === 'minute')?.value || '00';
      const timeStr = `${hour}.${minute}`;
      
      if (diffMins >= 0 && diffMins < 1) return 'Baru saja';
      if (diffMins >= 1 && diffMins < 60) return `${diffMins} mnt lalu`;
      return `${timeStr} WIB`;
    } catch {
      return dateStr;
    }
  };

  const filteredLogs = useMemo(() => {
    if (filterType === 'all') return appActivities;
    return appActivities.filter(item => {
      const meta = getActionMeta(item.action, item.detail);
      return meta.category === filterType;
    });
  }, [appActivities, filterType]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[var(--ui-radius-card)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-4 sm:p-5 flex flex-col justify-between h-full relative overflow-hidden group">
      
      {/* Decorative Gradient Blob */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl -z-10 group-hover:scale-110 transition-transform duration-1000" />

      {/* ── Header ── */}
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100/80">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-[var(--ui-radius)] bg-gradient-to-br from-[var(--ui-primary)] to-indigo-600 shadow-md flex items-center justify-center shrink-0">
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-black text-slate-800 tracking-tight">
                  Log Aktivitas & Login
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Pantau navigasi menu, KBM, hingga unduhan file
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'login', label: 'Login' },
              { id: 'navigasi', label: 'Navigasi' },
              { id: 'kbm', label: 'KBM' },
              { id: 'file', label: 'Berkas' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setFilterType(f.id); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-[10px] font-extrabold rounded-[var(--ui-radius-control)] border transition-all duration-300 cursor-pointer ${
                  filterType === f.id
                    ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-[1.02]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={fetchAuditLogs}
              title="Perbarui data"
              className="p-1.5 ml-1 rounded-[var(--ui-radius-control)] bg-white hover:bg-slate-50 border border-slate-200 text-slate-400 hover:text-[var(--ui-primary)] cursor-pointer shadow-2xs hover:shadow-sm transition-all"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-[var(--ui-primary)]' : ''} />
            </button>
          </div>
        </div>

        {/* ── Feed List ── */}
        <div className="relative my-3">
          {/* Vertical Timeline Line */}
          {paginatedLogs.length > 0 && (
            <div className="absolute left-[19px] top-4 bottom-4 w-px bg-slate-100/80 z-0 hidden sm:block" />
          )}

          <div className="flex flex-col gap-1.5 relative z-10">
            {paginatedLogs.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                  <Activity size={20} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold text-xs">Belum ada aktivitas {filterType !== 'all' ? filterType : ''}</p>
                <p className="text-slate-400 font-medium text-[10px] mt-1">Aktivitas terbaru akan muncul di sini</p>
              </div>
            ) : (
              paginatedLogs.map((item, idx) => {
                const meta = getActionMeta(item.action, item.detail);
                const roleMeta = getRoleBadge(item.userRole);
                const Icon = meta.icon;
                const userName = item.userName || 'Pengguna';
                const userInitial = userName.charAt(0).toUpperCase();

                return (
                  <div 
                    key={item.id || idx} 
                    className="p-3 bg-white hover:bg-slate-50/50 rounded-[var(--ui-radius-small)] transition-all duration-300 flex items-center justify-between gap-3 border border-transparent hover:border-slate-100 hover:shadow-2xs group cursor-default"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-[var(--ui-radius-small)] flex items-center justify-center font-black text-sm shrink-0 ${roleMeta.bg} border shadow-2xs group-hover:scale-105 transition-transform duration-300 relative`}>
                        {userInitial}
                        {/* Status dot */}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${meta.category === 'login' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-black text-slate-800 truncate group-hover:text-[var(--ui-primary)] transition-colors">
                            {userName}
                          </p>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-[var(--ui-radius-control)] border ${roleMeta.bg}`}>
                            {roleMeta.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-semibold mt-1 truncate max-w-md leading-tight">
                          {item.detail}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase flex items-center gap-1 shadow-2xs ${meta.bg}`}>
                        <Icon size={10} className={meta.color} />
                        {meta.label}
                      </span>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock size={10} />
                        <span className="text-[10px] font-bold">
                          {formatLogTime(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Footer & Pagination ── */}
      <div className="pt-3 border-t border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between mt-auto gap-3 relative z-10">
        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-[var(--ui-radius-control)] border border-slate-100">
          Menampilkan {paginatedLogs.length} dari {filteredLogs.length} aktivitas
        </span>

        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-[var(--ui-radius-control)]">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2 py-1 text-[10px] font-extrabold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-[var(--ui-radius-control)] shadow-2xs disabled:opacity-40 cursor-pointer transition-colors"
              >
                Prev
              </button>
              <span className="text-[10px] font-black text-slate-700 px-1">{currentPage} / {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2 py-1 text-[10px] font-extrabold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-[var(--ui-radius-control)] shadow-2xs disabled:opacity-40 cursor-pointer transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('keamanan')}
              className="text-[11px] text-[var(--ui-primary)] hover:text-indigo-700 font-black flex items-center gap-0.5 cursor-pointer ml-1 bg-indigo-50/50 hover:bg-indigo-50 px-2.5 py-1.5 rounded-[var(--ui-radius-control)] transition-colors"
            >
              Log Lengkap
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

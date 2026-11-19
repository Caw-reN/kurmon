import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LogIn, UploadCloud, BookOpen, Shield, Activity, RefreshCw, Clock, 
  ChevronRight, ChevronLeft, Settings, Download, Compass, 
  FileText, CheckCircle2, User, ArrowUpRight, Sparkles
} from 'lucide-react';
import useAuthStore from '../../store/monitoring/authStore';
import { useDataStore } from '../../store/useDataStore';

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
export function getActionMeta(action, detail = '') {
  const act = String(action || '').toUpperCase();
  const det = String(detail || '').toLowerCase();

  // 1. LOGIN / LOGOUT
  if (act.includes('LOGIN') || act.includes('MASUK') || det.includes('masuk ke sistem') || det.includes('login')) {
    return {
      label: 'LOGIN',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      icon: LogIn,
      color: 'text-emerald-600',
      category: 'login'
    };
  }

  // 2. UPDATE / SIMPAN / PERUBAHAN DATA
  if (
    act.includes('UPDATE') || act.includes('SIMPAN') || act.includes('EDIT') || 
    act.includes('SAVE') || act.includes('UBAH') || det.includes('menyimpan') || 
    det.includes('memperbarui') || det.includes('mengubah') || det.includes('update')
  ) {
    return {
      label: 'UPDATE',
      bg: 'bg-teal-50 text-teal-700 border-teal-200/80',
      icon: RefreshCw,
      color: 'text-teal-600',
      category: 'update'
    };
  }

  // 3. BUKA MENU / NAVIGASI
  if (act.includes('NAVIGASI') || act.includes('TAB') || act.includes('MENU') || det.includes('membuka') || det.includes('navigasi') || det.includes('melihat tab')) {
    return {
      label: 'BUKA MENU',
      bg: 'bg-sky-50 text-sky-700 border-sky-200/80',
      icon: Compass,
      color: 'text-sky-600',
      category: 'navigasi'
    };
  }

  // 4. UPLOAD & UNDUH / FILE
  if (
    act.includes('DOWNLOAD') || act.includes('UNDUH') || act.includes('UPLOAD') || 
    act.includes('UNGGAH') || act.includes('IMPORT') || act.includes('EXPORT') || 
    act.includes('CETAK') || act.includes('FILE') || det.includes('unduh') || 
    det.includes('download') || det.includes('unggah') || det.includes('upload') || 
    det.includes('modul') || det.includes('silabus') || det.includes('excel') || 
    det.includes('pdf') || det.includes('cetak') || det.includes('import') || det.includes('ekspor')
  ) {
    const isUpload = act.includes('UPLOAD') || act.includes('UNGGAH') || act.includes('IMPORT') || det.includes('unggah') || det.includes('upload');
    return {
      label: isUpload ? 'FILE / UPLOAD' : 'DOWNLOAD',
      bg: isUpload ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80' : 'bg-amber-50 text-amber-700 border-amber-200/80',
      icon: isUpload ? UploadCloud : Download,
      color: isUpload ? 'text-indigo-600' : 'text-amber-600',
      category: 'file'
    };
  }

  // 5. JURNAL KBM & KESISWAAN
  if (
    act.includes('JURNAL') || act.includes('KBM') || act.includes('ABSENSI') || 
    act.includes('PRESENSI') || act.includes('NILAI') || act.includes('VALIDASI') || 
    act.includes('BK') || act.includes('BPBK') || act.includes('PIKET') || 
    det.includes('jurnal') || det.includes('kbm') || det.includes('mengajar') || 
    det.includes('absensi') || det.includes('binaan') || det.includes('tatib') ||
    det.includes('pelanggaran') || det.includes('konseling') || det.includes('sesi')
  ) {
    return {
      label: act.includes('VALIDASI') ? 'VALIDASI KBM' : (act.includes('JURNAL') ? 'ISI JURNAL' : 'JURNAL & KBM'),
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      icon: BookOpen,
      color: 'text-emerald-600',
      category: 'kbm'
    };
  }

  // 6. PENGATURAN / KELOLA DATA
  if (act.includes('SETTING') || act.includes('CONFIG') || act.includes('ROLE') || act.includes('BACKUP') || act.includes('OVERRIDE')) {
    return {
      label: 'PENGATURAN',
      bg: 'bg-purple-50 text-purple-700 border-purple-200/80',
      icon: Settings,
      color: 'text-purple-600',
      category: 'file'
    };
  }

  return {
    label: act || 'AKTIVITAS',
    bg: 'bg-slate-100 text-slate-700 border-slate-200/80',
    icon: Activity,
    color: 'text-slate-600',
    category: 'other'
  };
}

export function getRoleBadge(role) {
  const r = String(role || '').toLowerCase();
  if (r.includes('walas') || r.includes('wali')) {
    return { 
      label: 'Wali Kelas', 
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      avatarBg: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    };
  }
  if (r.includes('guru')) {
    return { 
      label: 'Guru', 
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      avatarBg: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
  }
  if (r.includes('karyawan') || r.includes('staff')) {
    return { 
      label: 'Karyawan', 
      bg: 'bg-teal-50 text-teal-700 border-teal-200/80',
      avatarBg: 'bg-teal-100 text-teal-800 border-teal-200'
    };
  }
  if (r.includes('tu') || r.includes('tata')) {
    return { 
      label: 'Staf TU', 
      bg: 'bg-sky-50 text-sky-700 border-sky-200/80',
      avatarBg: 'bg-sky-100 text-sky-800 border-sky-200'
    };
  }
  if (r.includes('waka')) {
    return { 
      label: 'Waka', 
      bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      avatarBg: 'bg-amber-100 text-amber-800 border-amber-200'
    };
  }
  if (r.includes('kepsek')) {
    return { 
      label: 'Kepsek', 
      bg: 'bg-purple-50 text-purple-700 border-purple-200/80',
      avatarBg: 'bg-purple-100 text-purple-800 border-purple-200'
    };
  }
  if (r.includes('admin')) {
    return { 
      label: 'Admin', 
      bg: 'bg-slate-800 text-white border-slate-700 shadow-2xs',
      avatarBg: 'bg-slate-800 text-white border-slate-700'
    };
  }
  return { 
    label: role || 'User', 
    bg: 'bg-slate-100 text-slate-700 border-slate-200/80',
    avatarBg: 'bg-slate-100 text-slate-700 border-slate-200'
  };
}

export function formatLogTime(dateStr) {
  if (!dateStr) return '-';
  try {
    let d = new Date(dateStr);
    const now = new Date();
    
    const initialDiffMins = (now.getTime() - d.getTime()) / 60000;
    if (initialDiffMins >= 360 && initialDiffMins <= 480) {
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
    
    if (diffMins >= 0 && diffMins < 1) {
      return 'Baru saja';
    }
    if (diffMins >= 1 && diffMins < 60) {
      return `${diffMins} mnt lalu`;
    }
    return `${timeStr} WIB`;
  } catch {
    return String(dateStr);
  }
}

export function getDuration(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins <= 0) return '';
    if (diffMins < 60) return `${diffMins} mnt`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}j ${mins}m`;
  } catch {
    return '';
  }
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function LiveUserActivityLog({ onNavigateTab }) {
  const user = useAuthStore(state => state.user);
  const teachers = useDataStore(state => state.teachers) || [];
  const staffs = useDataStore(state => state.staffs) || [];
  const classes = useDataStore(state => state.classes) || [];

  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'update' | 'login' | 'navigasi' | 'kbm' | 'file'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const userRole = (user?.role || '').toLowerCase();
  const isAllowed = ['admin', 'superadmin', 'kepsek'].includes(userRole);

  const fetchAuditLogs = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    try {
      const token = user?.authToken
        || JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
        || JSON.parse(localStorage.getItem('school_schedule_session_v1') || '{}')?.authToken
        || localStorage.getItem('token')
        || sessionStorage.getItem('token')
        || '';

      const res = await fetch('/api/audit-logs?page=1&limit=300', {
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
  }, [user, isAllowed]);

  useEffect(() => {
    fetchAuditLogs();
    const interval = setInterval(fetchAuditLogs, 10000);
    return () => clearInterval(interval);
  }, [fetchAuditLogs]);

  // Clean, dedicated in-app activity timeline (NO machine attendance scans)
  const appActivities = useMemo(() => {
    const list = [];
    const isUserSuperAdmin = ['admin', 'superadmin', 'super_admin'].includes(String(user?.role || '').toLowerCase()) || String(user?.username || '').toLowerCase() === 'admin';

    // 1. Process server audit logs
    (auditLogs || []).forEach(log => {
      const act = String(log.action || '').toUpperCase();
      const det = String(log.detail || '');
      const uRole = String(log.user_role || '').toLowerCase();
      const uName = String(log.user_name || '').toLowerCase();
      const uId = String(log.user_id || '').toLowerCase();

      // Exclude raw hardware device scans
      if (act.includes('SCAN') && !act.includes('MANUAL')) return;

      // HANYA ADMIN YANG BISA MELIHAT LOG ADMIN
      const isAdminLog = uRole.includes('admin') || uName.includes('admin') || uId.includes('admin') || uName.includes('radmin');
      if (!isUserSuperAdmin && isAdminLog) {
        return; // Sembunyikan log aktivitas admin untuk Kepsek / Guru / Karyawan
      }

      list.push({
        id: `audit-${log.id || Math.random()}`,
        userName: log.user_name || log.user_id || 'Pengguna',
        userId: log.user_id,
        userRole: log.user_role || 'guru',
        action: log.action || 'ACTIVITY',
        detail: det || 'Melakukan aktivitas dalam aplikasi',
        ipAddress: log.ip_address || '',
        timestamp: log.created_at || new Date().toISOString()
      });
    });

    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [auditLogs, user]);

  const onlineStats = useMemo(() => {
    const today = new Date().toDateString();
    const uniqueLogins = new Set();
    appActivities.forEach(log => {
      if (String(log.action).toUpperCase().includes('LOGIN') && new Date(log.timestamp).toDateString() === today) {
        uniqueLogins.add(String(log.userName).toLowerCase());
      }
    });
    const totalUsers = (teachers?.length || 0) + (staffs?.length || 0);
    const activeCount = uniqueLogins.size;
    const percentage = totalUsers > 0 ? Math.round((activeCount / totalUsers) * 100) : 0;
    return { activeCount, totalUsers, percentage };
  }, [appActivities, teachers, staffs]);

  // Filtered list & Category Counts
  const categoryCounts = useMemo(() => {
    const counts = { all: appActivities.length, update: 0, login: 0, navigasi: 0, kbm: 0, file: 0 };
    appActivities.forEach(item => {
      const meta = getActionMeta(item.action, item.detail);
      if (meta.category && counts[meta.category] !== undefined) {
        counts[meta.category]++;
      }
    });
    return counts;
  }, [appActivities]);

  const filteredLogs = useMemo(() => {
    if (filterType === 'all') return appActivities;
    return appActivities.filter(item => {
      const meta = getActionMeta(item.action, item.detail);
      return meta.category === filterType;
    });
  }, [appActivities, filterType]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (!isAllowed) return null;

  return (
    <div className="bg-[var(--ui-card-bg,white)] rounded-2xl border border-[var(--ui-card-border-color,theme(colors.slate.200/80))] shadow-xs flex flex-col justify-between h-full overflow-hidden transition-all duration-200">
      {/* ── Header ── */}
      <div className="px-4 pt-3.5 pb-3 border-b border-slate-100 bg-slate-50/60 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0 text-emerald-600">
              <Activity size={16} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight truncate">
                  Log Aktivitas Pengguna
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {onlineStats.totalUsers > 0 && (
            <div className="inline-flex items-center gap-1.5 text-[9.5px] font-bold text-indigo-700 bg-indigo-50/90 px-2.5 py-1 rounded-full border border-indigo-200/70 shadow-2xs whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span><span className="font-extrabold">{onlineStats.activeCount}</span>/{onlineStats.totalUsers} Aktif ({onlineStats.percentage}%)</span>
            </div>
          )}
        </div>

        {/* Filter Pills & Refresh Button */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none pb-0.5 shrink-0 w-full">
          {[
            { id: 'all', label: 'Semua', count: categoryCounts.all },
            { id: 'update', label: 'Pembaruan', count: categoryCounts.update },
            { id: 'login', label: 'Login', count: categoryCounts.login },
            { id: 'navigasi', label: 'Buka Menu', count: categoryCounts.navigasi },
            { id: 'kbm', label: 'Jurnal KBM', count: categoryCounts.kbm },
            { id: 'file', label: 'Upload & File', count: categoryCounts.file }
          ].map(f => {
            const isActive = filterType === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => { setFilterType(f.id); setCurrentPage(1); }}
                className={`whitespace-nowrap px-2.5 py-1 text-[10px] font-bold rounded-full border transition-all duration-150 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50/80 hover:text-slate-800'
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold leading-none ${
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}>
                  {f.count}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={fetchAuditLogs}
            title="Segarkan data aktivitas"
            className="p-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-500 hover:text-emerald-600 cursor-pointer transition-colors shrink-0 shadow-2xs ml-auto"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-emerald-600' : ''} />
          </button>
        </div>
      </div>

      {/* ── Feed List Container ── */}
      <div className="p-3 bg-white flex-1 flex flex-col justify-between">
        <div className="divide-y divide-slate-100/90 flex-1 flex flex-col justify-around">
          {paginatedLogs.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                <Activity size={18} />
              </div>
              <p className="font-semibold text-xs text-slate-500">
                Belum ada aktivitas {filterType !== 'all' ? `kategori ${filterType}` : ''} tercatat
              </p>
              <p className="text-[10px] text-slate-400">
                Aktivitas pengguna akan muncul secara langsung di sini
              </p>
            </div>
          ) : (
            paginatedLogs.map((item, idx) => {
              const meta = getActionMeta(item.action, item.detail);
              const roleMeta = getRoleBadge(item.userRole);
              const Icon = meta.icon;
              const userName = item.userName || 'Pengguna';
              const userInitial = userName.charAt(0).toUpperCase();
              const timeText = formatLogTime(item.timestamp);
              const isRecent = timeText === 'Baru saja';

              // Cek apakah guru adalah wali kelas
              let isWaliKelas = false;
              let waliKelasLabel = "Wali Kelas";
              if (['guru', 'waka', 'kepsek'].includes(String(item.userRole).toLowerCase())) {
                const foundTeacher = teachers.find(t => 
                  String(t.name).toLowerCase() === String(userName).toLowerCase() || 
                  (item.userId && String(t.code).toLowerCase() === String(item.userId).toLowerCase())
                );
                if (foundTeacher) {
                  const homeroomClass = classes.find(c => String(c.homeroom).toLowerCase() === String(foundTeacher.code).toLowerCase());
                  if (homeroomClass) {
                    isWaliKelas = true;
                    waliKelasLabel = `Wali ${homeroomClass.name || homeroomClass.id}`;
                  }
                }
              }

              return (
                <div 
                  key={item.id || idx}
                  className="py-2.5 px-2 flex items-center justify-between gap-3 group hover:bg-slate-50/90 rounded-xl transition-all duration-150"
                >
                  {/* Kiri: Avatar & Info Pengguna */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-full border shadow-2xs flex items-center justify-center font-bold text-xs shrink-0 transition-transform group-hover:scale-105 ${roleMeta.avatarBg}`}>
                      {userInitial}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 tracking-tight truncate max-w-[140px] sm:max-w-[200px]">
                          {userName}
                        </span>
                        
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${roleMeta.bg}`}>
                          {roleMeta.label}
                        </span>

                        {isWaliKelas && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                            {waliKelasLabel}
                          </span>
                        )}
                      </div>

                      <p className="text-[10.5px] text-slate-500 font-medium truncate mt-0.5 leading-snug" title={item.detail}>
                        {item.detail}
                      </p>
                    </div>
                  </div>

                  {/* Kanan: Badge Aksi & Timestamp */}
                  <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-2xs whitespace-nowrap ${meta.bg}`}>
                      <Icon size={10} className={meta.color} />
                      {meta.label}
                    </span>
                    <div className="flex items-center gap-1 text-[9.5px] text-slate-400 font-medium whitespace-nowrap">
                      {isRecent ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Baru saja
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">
                          {timeText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer Pagination & Audit Log Link ── */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] mt-auto">
          <span className="font-medium text-slate-500">
            Menampilkan <span className="font-bold text-slate-700">{paginatedLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> dari <span className="font-bold text-slate-700">{filteredLogs.length}</span> aktivitas
          </span>

          <div className="flex items-center gap-2">
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 text-[10px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs text-slate-600"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-[10px] font-bold text-slate-600 px-1.5 py-0.5 bg-slate-50 rounded-md border border-slate-200/80">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 text-[10px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs text-slate-600"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}

            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('keamanan')}
                className="text-[10.5px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer ml-1 py-1 px-2 rounded-lg hover:bg-emerald-50/60 transition-colors"
              >
                <span>Audit Log Lengkap</span>
                <ArrowUpRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

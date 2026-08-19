import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, ExternalLink, MessageCircle } from 'lucide-react';
import useFiturStore from '../../../store/monitoring/fiturStore.js';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore.js';
import { getDatabaseSnapshot } from '../../../utils/dataSource.js';

export const getClassBadge = (className) => {
  if (!className || className === '-') return 'bg-slate-100 text-slate-600 border-slate-200';
  const upper = String(className).toUpperCase().trim();
  
  if (upper.includes('TKJ') || upper.includes('TJKT')) {
    return 'bg-blue-100/90 text-blue-800 border-blue-300 font-extrabold shadow-2xs';
  }
  if (upper.includes('TKR') || upper.includes('TKRO') || upper.includes('OTOMOTIF')) {
    return 'bg-orange-100/90 text-orange-800 border-orange-300 font-extrabold shadow-2xs';
  }
  if (upper.includes('MP') || upper.includes('MPLB') || upper.includes('OTKP') || upper.includes('PERKANTORAN')) {
    return 'bg-emerald-100/90 text-emerald-800 border-emerald-300 font-extrabold shadow-2xs';
  }
  if (upper.includes('AK') || upper.includes('AKL') || upper.includes('AKUNTANSI')) {
    return 'bg-pink-100/90 text-pink-800 border-pink-300 font-extrabold shadow-2xs';
  }
  if (upper.includes('RPL') || upper.includes('PPLG')) {
    return 'bg-cyan-100/90 text-cyan-800 border-cyan-300 font-extrabold shadow-2xs';
  }
  if (upper.includes('DKV') || upper.includes('MM') || upper.includes('MULTIMEDIA')) {
    return 'bg-purple-100/90 text-purple-800 border-purple-300 font-extrabold shadow-2xs';
  }
  if (upper.includes('PM') || upper.includes('BDP') || upper.includes('PEMASARAN')) {
    return 'bg-amber-100/90 text-amber-800 border-amber-300 font-extrabold shadow-2xs';
  }
  if (upper.includes('TB') || upper.includes('BOGA')) {
    return 'bg-rose-100/90 text-rose-800 border-rose-300 font-extrabold shadow-2xs';
  }
  if (upper.includes('BS') || upper.includes('BUSANA')) {
    return 'bg-fuchsia-100/90 text-fuchsia-800 border-fuchsia-300 font-extrabold shadow-2xs';
  }

  return 'bg-indigo-100/90 text-indigo-800 border-indigo-300 font-extrabold shadow-2xs';
};

export const SharedDashboardLogs = () => {
  const { isFiturAktif } = useFiturStore();
  const { user } = useAuthStore();
  const isSiswa = user?.role === 'siswa';

  const [activeLogTab, setActiveLogTab] = useState(isSiswa ? 'kehadiran_siswa' : 'siswa_terlambat');
  const [dashLogs, setDashLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeLogTab, searchQuery]);

  // Store fallbacks
  const storeAttendanceRecords = useAppStore(state => state.attendanceRecords) || [];
  const storeTeachers = useAppStore(state => state.teachers) || [];
  const storeStudents = useAppStore(state => state.students) || [];
  const snapshotStudents = getDatabaseSnapshot()?.students || [];
  const allStudents = storeStudents.length > 0 ? storeStudents : snapshotStudents;

  const studentLookupMap = useMemo(() => {
    const nisMap = new Map();
    const nameMap = new Map();
    (allStudents || []).forEach(s => {
      const nis = String(s.nis || s.code || s.id || '').trim().toLowerCase();
      const name = String(s.name || s.nama || '').trim().toLowerCase();
      if (nis) nisMap.set(nis, s);
      if (name) nameMap.set(name, s);
    });
    return { nisMap, nameMap };
  }, [allStudents]);

  // Toggle check specifically for Student Dashboard
  const isVisibleForStudent = isFiturAktif('show_dashboard_logs_siswa') ?? true;

  useEffect(() => {
    const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
    
    // Fetch both dashboard logs and recent hikvision logs concurrently
    Promise.all([
      fetch('/api/dashboard/logs', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json()).catch(() => ({ ok: false })),
      fetch('/api/hikvision/dashboard', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json()).catch(() => ({ ok: false }))
    ])
      .then(([d1, d2]) => {
        let combined = {};
        if (d1.ok) combined = { ...combined, ...d1.data };
        if (d2.ok) combined.recentLogs = d2.recentLogs || [];
        setDashLogs(combined);
      })
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, []);

  const fmtTime = (ts) => {
    try { 
      return new Intl.DateTimeFormat('id-ID', { 
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
      }).format(new Date(ts)); 
    } catch { return '-'; }
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    const jkt = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return jkt.toISOString().slice(0, 10);
  }, []);

  const dedupeFront = (arr) => {
    const seen = new Set();
    const seenName = new Set();
    const result = [];
    const sorted = [...arr].sort((a, b) => new Date(a.timestamp || a.created_at || a.date || 0) - new Date(b.timestamp || b.created_at || b.date || 0));
    
    for (const item of sorted) {
      const rawName = String(item.student_name || item.name || '').trim().toLowerCase();
      const rawNis = String(item.employee_id || item.username || item.nis || '').trim().toLowerCase();
      const role = String(item.role_type || item.true_person_type || '').toLowerCase();
      const idKey = `${role}_${rawNis || rawName}`;

      if (rawName && seenName.has(rawName)) continue;
      if (idKey && seen.has(idKey)) continue;

      if (rawName) seenName.add(rawName);
      if (idKey) seen.add(idKey);
      result.push(item);
    }
    return result;
  };

  const guruKaryawanLogs = useMemo(() => {
    let logs = [];
    if (dashLogs?.teacherLogs && dashLogs.teacherLogs.length > 0) {
      logs = [...dashLogs.teacherLogs];
    } else {
      const recentGuruKaryawan = (dashLogs?.recentLogs || []).filter(item => {
        const type = String(item.true_person_type || item.role_type || item.person_type || '').toLowerCase();
        return type.includes('guru') || type.includes('karyawan');
      });
      if (recentGuruKaryawan.length > 0) {
        logs = recentGuruKaryawan.map(r => ({
          name: r.student_name || r.name || r.employee_id,
          username: r.employee_id,
          role_type: String(r.true_person_type || r.role_type || 'GURU').toUpperCase(),
          status: r.status || 'hadir',
          date: r.timestamp || r.created_at,
          created_at: r.timestamp || r.created_at
        }));
      } else {
        logs = storeAttendanceRecords
          .filter(r => {
            const d = r.date ? String(r.date).slice(0, 10) : '';
            return d === todayStr;
          })
          .map(r => {
            const teacher = storeTeachers.find(t => t.code === r.teacherCode || t.username === r.teacherCode);
            return {
              name: teacher?.name || r.teacherCode || 'Guru / Karyawan',
              username: r.teacherCode,
              role_type: 'GURU',
              status: r.status || 'Hadir',
              date: r.date,
              created_at: r.date
            };
          });
      }
    }

    logs = dedupeFront(logs);

    // Diurutkan dari jam absen tercepat (ASC)
    logs.sort((a, b) => new Date(a.date || a.timestamp || a.created_at || 0) - new Date(b.date || b.timestamp || b.created_at || 0));

    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(item => (item.name || item.username || '').toLowerCase().includes(q));
  }, [dashLogs, storeAttendanceRecords, storeTeachers, todayStr, searchQuery]);

  const terlambatGuruLogs = useMemo(() => {
    let logs = guruKaryawanLogs.filter(item => 
      String(item.status || '').toLowerCase().includes('terlambat') || 
      String(item.status || '').toLowerCase().includes('late')
    );
    // Diurutkan dari jam absen terakhir (DESC)
    logs.sort((a, b) => new Date(b.date || b.timestamp || b.created_at || 0) - new Date(a.date || a.timestamp || a.created_at || 0));
    return logs;
  }, [guruKaryawanLogs]);

  const kehadiranSiswaLogs = useMemo(() => {
    let logs = dashLogs?.hikvisionStudentToday || dashLogs?.recentLogs || [];
    logs = logs.filter(item => {
      const type = String(item.true_person_type || item.person_type || 'siswa').toLowerCase();
      return type.includes('siswa');
    });

    logs = dedupeFront(logs);

    // Diurutkan dari jam absen tercepat (ASC)
    logs.sort((a, b) => new Date(a.timestamp || a.created_at || a.date || 0) - new Date(b.timestamp || b.created_at || b.date || 0));

    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(item => (item.student_name || item.name || item.employee_id || item.nis || '').toLowerCase().includes(q));
  }, [dashLogs, searchQuery]);

  const terlambatSiswaLogs = useMemo(() => {
    let logs = kehadiranSiswaLogs.filter(item => {
      const s = String(item.status || '').toLowerCase();
      return s === 'terlambat' || s === 'late';
    });
    // Diurutkan dari jam absen terakhir (DESC)
    logs.sort((a, b) => new Date(b.timestamp || b.created_at || b.date || 0) - new Date(a.timestamp || a.created_at || a.date || 0));
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(item => (item.name || item.nis || item.student_name || '').toLowerCase().includes(q));
  }, [kehadiranSiswaLogs, searchQuery]);

  const bermasalahLogs = useMemo(() => {
    let logs = [...(dashLogs?.problematicStudentLogs || [])];
    // Update Terkini (DESC)
    logs.sort((a, b) => new Date(b.last_seen || b.created_at || 0) - new Date(a.last_seen || a.created_at || 0));
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(item => (item.name || item.nis || '').toLowerCase().includes(q));
  }, [dashLogs, searchQuery]);

  const siswaPrestasiLogs = useMemo(() => {
    let logs = [...(dashLogs?.achievingStudentLogs || [])];
    // Update Terkini (DESC)
    logs.sort((a, b) => new Date(b.created_at || b.tanggal_prestasi || 0) - new Date(a.created_at || a.tanggal_prestasi || 0));
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(item => (item.name || item.nis || item.nama_prestasi || '').toLowerCase().includes(q));
  }, [dashLogs, searchQuery]);

  const tabsConfig = useMemo(() => {
    const all = [
      { 
        id: 'guru_karyawan', 
        label: 'Guru/Karyawan', 
        count: guruKaryawanLogs.length, 
        icon: '/icons/045-account.svg',
        badgeBg: 'bg-indigo-100/90 text-indigo-800'
      },
      { 
        id: 'guru_terlambat', 
        label: 'Guru/Karyawan Terlambat', 
        count: terlambatGuruLogs.length, 
        icon: '/icons/099-alert.svg',
        badgeBg: 'bg-orange-100/90 text-orange-800'
      },
      { 
        id: 'kehadiran_siswa', 
        label: 'Siswa', 
        count: kehadiranSiswaLogs.length, 
        icon: '/icons/066-education.svg',
        badgeBg: 'bg-purple-100/90 text-purple-800'
      },
      { 
        id: 'siswa_terlambat', 
        label: 'Siswa Terlambat', 
        count: terlambatSiswaLogs.length, 
        icon: '/icons/039-time.svg',
        badgeBg: 'bg-amber-100/90 text-amber-800'
      },
      { 
        id: 'siswa_bermasalah', 
        label: 'Siswa Bermasalah', 
        count: bermasalahLogs.length, 
        icon: '/icons/099-alert.svg',
        badgeBg: 'bg-rose-100/90 text-rose-800'
      },
      { 
        id: 'siswa_prestasi', 
        label: 'Siswa Berprestasi', 
        count: siswaPrestasiLogs.length, 
        icon: '/icons/063-follow.svg',
        badgeBg: 'bg-emerald-100/90 text-emerald-800'
      }
    ];

    if (isSiswa) {
      return all.filter(t => ['kehadiran_siswa', 'siswa_terlambat', 'siswa_prestasi'].includes(t.id));
    }
    
    // Filter siswa bermasalah: hanya kesiswaan, kepsek, admin, dan guru (wali kelas) yang bisa melihat
    const isKesiswaanOrAdmin = ['admin', 'superadmin', 'kepsek'].includes(user?.role) || 
                              (user?.role === 'waka' && (user?.division || "").toLowerCase() === 'kesiswaan') || 
                              (user?.role || "").includes('kesiswaan');
    const isGuru = user?.role === 'guru';
    
    if (!isKesiswaanOrAdmin && !isGuru) {
      return all.filter(t => t.id !== 'siswa_bermasalah');
    }
    
    return all;
  }, [isSiswa, user, guruKaryawanLogs.length, terlambatGuruLogs.length, kehadiranSiswaLogs.length, terlambatSiswaLogs.length, bermasalahLogs.length, siswaPrestasiLogs.length]);

  const renderListItem = (item, type, index) => {
    const absoluteIndex = (currentPage - 1) * itemsPerPage + index + 1;

    let resolvedStudent = null;
    if (type !== 'guru_karyawan' && type !== 'guru_terlambat') {
      const empId = String(item.employee_id || item.nis || item.username || '').trim().toLowerCase();
      const empName = String(item.student_name || item.name || '').trim().toLowerCase();

      if (empId) {
        resolvedStudent = studentLookupMap.nisMap.get(empId);
        if (!resolvedStudent) {
          for (const [sNis, sObj] of studentLookupMap.nisMap.entries()) {
            if (sNis.length >= 5 && empId.length >= 5 && (sNis.endsWith(empId) || empId.endsWith(sNis))) {
              resolvedStudent = sObj;
              break;
            }
          }
        }
      }
      if (!resolvedStudent && empName) {
        resolvedStudent = studentLookupMap.nameMap.get(empName);
      }
    }

    let name = item.student_name || item.name || resolvedStudent?.name || resolvedStudent?.nama || item.username || item.employee_id || item.nis || '-';
    let className = item.class_name && item.class_name !== '-' && item.class_name !== 'siswa' 
      ? item.class_name 
      : (resolvedStudent?.kelas || resolvedStudent?.class_name || '');

    let subtitleBadge = null;
    let subtitleText = '';
    let rightBadgeBg = '';
    let rightBadgeText = '';
    let avatarChar = String(name).charAt(0).toUpperCase();
    let avatarBg = '';
    
    let ts = item.timestamp || item.created_at || item.last_seen || item.date || new Date();
    let timeText = fmtTime(ts).replace(':', '.');

    if (type === 'guru_karyawan' || type === 'guru_terlambat') {
      const isKaryawan = String(item.role_type || item.true_person_type || '').toUpperCase().includes('KARYAWAN');
      const badgeRole = isKaryawan ? 'KARYAWAN' : 'GURU';
      avatarBg = isKaryawan ? 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200/80' : 'bg-indigo-50 text-indigo-800 border-indigo-200/80';
      subtitleBadge = <span className={`font-black uppercase px-1.5 py-0.5 rounded-[3px] text-[8px] whitespace-nowrap shrink-0 ${isKaryawan ? 'bg-fuchsia-100/80 text-fuchsia-700' : 'bg-indigo-100/80 text-indigo-700'}`}>{badgeRole}</span>;
      subtitleText = item.division && item.division !== '-' ? item.division : '';
      
      const s = String(item.status || 'HADIR').toLowerCase();
      if (type === 'guru_terlambat' || s.includes('terlambat') || s.includes('late')) {
        rightBadgeBg = 'bg-amber-50 text-amber-700 border-amber-200/80';
        rightBadgeText = 'TERLAMBAT';
      } else if (s.includes('absen') || s.includes('alpa')) {
        rightBadgeBg = 'bg-rose-50 text-rose-700 border-rose-200/80';
        rightBadgeText = 'ALPA';
      } else {
        rightBadgeBg = 'bg-purple-50 text-purple-700 border-purple-200/80';
        rightBadgeText = 'HADIR';
      }
    } else {
      subtitleBadge = className && className !== '-' ? (
        <span className={`font-black uppercase px-2 py-0.5 rounded-[4px] text-[9px] tracking-wide whitespace-nowrap shrink-0 border ${getClassBadge(className)}`}>
          {className}
        </span>
      ) : null;

      subtitleText = `NIS / ID: ${item.employee_id || item.nis || resolvedStudent?.nis || '-'}`;
      
      if (type === 'siswa_terlambat') {
        avatarBg = 'bg-amber-50 text-amber-800 border-amber-200/60';
        rightBadgeBg = 'bg-amber-50 text-amber-700 border-amber-200/80';
        rightBadgeText = 'TERLAMBAT';
      } else if (type === 'siswa_bermasalah') {
        avatarBg = 'bg-rose-50 text-rose-800 border-rose-200/60';
        rightBadgeBg = 'bg-rose-50 text-rose-700 border-rose-200/80';
        rightBadgeText = item.total_alpha || item.poin || 'PEMBINAAN';
      } else if (type === 'siswa_prestasi') {
        avatarBg = 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
        rightBadgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
        rightBadgeText = item.peringkat || item.tingkat || 'PRESTASI';
        subtitleText = item.nama_prestasi ? `${item.nama_prestasi} (${item.penyelenggara || '-'})` : `NIS: ${item.nis}`;
      } else {
        avatarBg = 'bg-purple-50 text-purple-800 border-purple-200/60';
        rightBadgeBg = 'bg-purple-50 text-purple-700 border-purple-200/80';
        rightBadgeText = String(item.status || item.true_person_type || 'HADIR').toUpperCase();
        if (rightBadgeText.includes('TERLAMBAT') || rightBadgeText.includes('LATE')) {
          rightBadgeBg = 'bg-amber-50 text-amber-700 border-amber-200/80';
          rightBadgeText = 'TERLAMBAT';
        } else if (rightBadgeText.includes('ALPA')) {
          rightBadgeBg = 'bg-rose-50 text-rose-700 border-rose-200/80';
          rightBadgeText = 'ALPA';
        } else {
          rightBadgeText = 'HADIR';
        }
      }
    }

    return (
      <div key={index} className="flex justify-between items-center py-2.5 px-3 hover:bg-slate-50/80 transition-colors group">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="text-[10px] sm:text-[11px] font-black text-slate-500 w-4 sm:w-5 text-right shrink-0">{absoluteIndex}.</div>
          <div className={`w-9 h-9 rounded-full font-black text-sm flex items-center justify-center shrink-0 border shadow-xs ${avatarBg}`}>
            {avatarChar}
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate uppercase tracking-tight">{name}</p>
              {subtitleBadge}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate flex items-center gap-1.5">
              {subtitleText && <span className="font-semibold text-slate-500">{subtitleText}</span>}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-[var(--ui-radius-small)] border uppercase block shadow-xs tracking-wider ${rightBadgeBg}`}>
            {rightBadgeText}
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200 mt-1 inline-block text-center shadow-xs tracking-tight">
            {timeText}
          </span>
        </div>
      </div>
    );
  };

  const renderPagination = (totalItems) => {
    if (totalItems <= itemsPerPage) return null;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    

  return (
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-t border-slate-100 mt-auto">
        <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
          Data {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems}
        </span>
        <div className="flex items-center gap-1.5">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-2.5 py-1.5 rounded-[var(--ui-radius-small)] bg-white border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
          >
            Prev
          </button>
          <span className="px-2.5 text-[10px] font-bold text-slate-700">{currentPage} / {totalPages}</span>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="px-2.5 py-1.5 rounded-[var(--ui-radius-small)] bg-white border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  if (logsLoading) {
    return (
      <div className="bg-white rounded-[var(--ui-radius-card)] shadow-xs p-8 flex flex-col items-center justify-center min-h-[380px] border border-slate-200/80">
        <Loader2 className="animate-spin text-[var(--ui-primary)] mb-3" size={28} />
        <p className="text-xs font-bold text-slate-600">Memuat Log Monitor & Aktivitas...</p>
        <p className="text-[11px] text-slate-400 mt-1">Mengambil sinkronisasi terbaru dari sistem</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80 flex flex-col overflow-hidden h-auto transition-all duration-300">
      
      {/* Dynamic Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img src="/icons/031-monitor.svg" alt="Monitor" className="w-5 h-5 opacity-90 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">Monitor & Aktivitas</h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--ui-radius-pill)] text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 hidden sm:block">Pemantauan log kehadiran dan aktivitas terpadu</p>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative w-full sm:w-52">
          <img src="/icons/042-search.svg" alt="Search" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
          <input 
            type="text" 
            placeholder="Cari nama / NIS / kelas..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)] placeholder:text-slate-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold border-none bg-transparent cursor-pointer">×</button>
          )}
        </div>
      </div>
      
      {/* Navigation Tabs Bar - Box Grid Style */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 p-3 sm:p-4 bg-slate-50/50 border-b border-slate-100">
        {tabsConfig.map(tab => {
          const isActive = activeLogTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveLogTab(tab.id)}
              className={`py-2 px-1 rounded-[var(--ui-radius-card)] border flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer text-center w-full min-h-[70px] relative ${
                isActive
                  ? 'bg-white border-[var(--ui-primary)]/40 shadow-sm ring-1 ring-[var(--ui-primary)]/20'
                  : 'bg-white border-slate-200/60 shadow-xs hover:-translate-y-0.5 hover:shadow-xs'
              }`}
            >
              <div className="relative mt-1">
                <img src={tab.icon} alt={tab.label} className={`w-5 h-5 sm:w-6 sm:h-6 object-contain transition-transform duration-300 ${isActive ? 'scale-110' : 'opacity-80'}`} />
                <span className={`absolute -top-1.5 -right-2.5 px-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-black leading-none shadow-xs border border-white ${tab.badgeBg}`}>
                  {tab.count}
                </span>
              </div>
              <span className={`text-[9px] sm:text-[10px] font-bold leading-tight px-1 mt-0.5 w-full ${isActive ? 'text-[var(--ui-primary)]' : 'text-slate-600'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="p-3.5 bg-white min-h-[460px] h-auto [&>div]:h-full">
        
        {/* TAB 1: Kehadiran Guru & Karyawan */}
        {activeLogTab === 'guru_karyawan' && (
          <div className="animate-in fade-in duration-200">
            {guruKaryawanLogs.length === 0 ? (
              <div className="p-8 rounded-[var(--ui-radius-small)] bg-slate-50/50 border border-dashed border-slate-200 text-center">
                <img src="/icons/079-checklist.svg" alt="Guru Hadir" className="w-9 h-9 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-bold text-slate-600">Belum Ada Kehadiran</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Belum ada guru atau karyawan yang scan absen hari ini</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex flex-col border border-slate-200/80 rounded-[var(--ui-radius-small)] overflow-hidden divide-y divide-slate-100 flex-1 min-h-[290px]">
                  {guruKaryawanLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, i) => renderListItem(item, 'guru_karyawan', i))}
                </div>
                {renderPagination(guruKaryawanLogs.length)}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Kehadiran Siswa */}
        {activeLogTab === 'kehadiran_siswa' && (
          <div className="animate-in fade-in duration-200">
            {kehadiranSiswaLogs.length === 0 ? (
              <div className="p-8 rounded-[var(--ui-radius-small)] bg-slate-50/50 border border-dashed border-slate-200 text-center">
                <img src="/icons/066-education.svg" alt="Kehadiran Siswa" className="w-9 h-9 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-bold text-slate-600">Belum Ada Data Kehadiran Siswa</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Scan absensi siswa untuk menampilkan log live</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex flex-col border border-slate-200/80 rounded-[var(--ui-radius-small)] overflow-hidden divide-y divide-slate-100 flex-1 min-h-[290px]">
                  {kehadiranSiswaLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, i) => renderListItem(item, 'kehadiran_siswa', i))}
                </div>
                {renderPagination(kehadiranSiswaLogs.length)}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Siswa Terlambat */}
        {activeLogTab === 'siswa_terlambat' && (
          <div className="animate-in fade-in duration-200">
            {terlambatSiswaLogs.length === 0 ? (
              <div className="p-8 rounded-[var(--ui-radius-small)] bg-slate-50/50 border border-dashed border-slate-200 text-center">
                <img src="/icons/079-checklist.svg" alt="Tepat Waktu" className="w-9 h-9 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-bold text-slate-600">Tidak Ada Keterlambatan Siswa</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Seluruh siswa tercatat tepat waktu hari ini</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex flex-col border border-slate-200/80 rounded-[var(--ui-radius-small)] overflow-hidden divide-y divide-slate-100 flex-1 min-h-[290px]">
                  {terlambatSiswaLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, i) => renderListItem(item, 'siswa_terlambat', i))}
                </div>
                {renderPagination(terlambatSiswaLogs.length)}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Guru Terlambat */}
        {activeLogTab === 'guru_terlambat' && (
          <div className="animate-in fade-in duration-200">
            {terlambatGuruLogs.length === 0 ? (
              <div className="p-8 rounded-[var(--ui-radius-small)] bg-slate-50/50 border border-dashed border-slate-200 text-center">
                <img src="/icons/079-checklist.svg" alt="Tepat Waktu" className="w-9 h-9 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-bold text-slate-600">Tidak Ada Keterlambatan Guru & Karyawan</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Seluruh guru dan karyawan tercatat hadir tepat waktu hari ini</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex flex-col border border-slate-200/80 rounded-[var(--ui-radius-small)] overflow-hidden divide-y divide-slate-100 flex-1 min-h-[290px]">
                  {terlambatGuruLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, i) => renderListItem(item, 'guru_terlambat', i))}
                </div>
                {renderPagination(terlambatGuruLogs.length)}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Siswa Bermasalah */}
        {activeLogTab === 'siswa_bermasalah' && (
          <div className="animate-in fade-in duration-200">
            {bermasalahLogs.length === 0 ? (
              <div className="p-8 rounded-[var(--ui-radius-small)] bg-slate-50/50 border border-dashed border-slate-200 text-center">
                <img src="/icons/079-checklist.svg" alt="Aman" className="w-9 h-9 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-bold text-slate-600">Tidak Ada Catatan Siswa Bermasalah</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Kedisiplinan siswa dalam kondisi kondusif</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex flex-col border border-slate-200/80 rounded-[var(--ui-radius-small)] overflow-hidden divide-y divide-slate-100 flex-1 min-h-[290px]">
                  {bermasalahLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, i) => renderListItem(item, 'siswa_bermasalah', i))}
                </div>
                {renderPagination(bermasalahLogs.length)}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: Siswa Berprestasi */}
        {activeLogTab === 'siswa_prestasi' && (
          <div className="animate-in fade-in duration-200">
            {siswaPrestasiLogs.length === 0 ? (
              <div className="p-8 rounded-[var(--ui-radius-small)] bg-slate-50/50 border border-dashed border-slate-200 text-center">
                <img src="/icons/063-follow.svg" alt="Prestasi" className="w-9 h-9 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-bold text-slate-600">Belum Ada Data Siswa Berprestasi</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Catatan pencapaian dan prestasi siswa akan muncul di sini</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex flex-col border border-slate-200/80 rounded-[var(--ui-radius-small)] overflow-hidden divide-y divide-slate-100 flex-1 min-h-[290px]">
                  {siswaPrestasiLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, i) => renderListItem(item, 'siswa_prestasi', i))}
                </div>
                {renderPagination(siswaPrestasiLogs.length)}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default SharedDashboardLogs;

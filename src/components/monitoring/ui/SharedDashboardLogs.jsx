import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, ExternalLink, MessageCircle } from 'lucide-react';
import useFiturStore from '../../../store/monitoring/fiturStore.js';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { useAppStore } from '../../../store/useAppStore.js';
import { useDataStore } from '../../../store/useDataStore.js';
import { getDatabaseSnapshot } from '../../../utils/dataSource.js';
import { CustomSelect } from '../../CustomSelect.jsx';
import { Shield } from 'lucide-react';
import SuperAdminAttendanceOverrideModal from '../../admin/SuperAdminAttendanceOverrideModal.jsx';

export const getClassBadge = (className) => {
  if (!className || className === '-') return 'bg-slate-100 text-slate-600 border-slate-200';
  const upper = String(className).toUpperCase().trim();
  
  if (upper.includes('TKJ') || upper.includes('TJKT')) {
    return 'bg-indigo-100/90 text-indigo-800 border-indigo-300 font-extrabold shadow-xs';
  }
  if (upper.includes('TKR') || upper.includes('TKRO') || upper.includes('OTOMOTIF')) {
    return 'bg-orange-100/90 text-orange-800 border-orange-300 font-extrabold shadow-xs';
  }
  if (upper.includes('MP') || upper.includes('MPLB') || upper.includes('OTKP') || upper.includes('PERKANTORAN')) {
    return 'bg-emerald-100/90 text-emerald-800 border-emerald-300 font-extrabold shadow-xs';
  }
  if (upper.includes('AK') || upper.includes('AKL') || upper.includes('AKUNTANSI')) {
    return 'bg-pink-100/90 text-pink-800 border-pink-300 font-extrabold shadow-xs';
  }
  if (upper.includes('RPL') || upper.includes('PPLG')) {
    return 'bg-cyan-100/90 text-cyan-800 border-cyan-300 font-extrabold shadow-xs';
  }
  if (upper.includes('DKV') || upper.includes('MM') || upper.includes('MULTIMEDIA')) {
    return 'bg-purple-100/90 text-purple-800 border-purple-300 font-extrabold shadow-xs';
  }
  if (upper.includes('PM') || upper.includes('BDP') || upper.includes('PEMASARAN')) {
    return 'bg-amber-100/90 text-amber-800 border-amber-300 font-extrabold shadow-xs';
  }
  if (upper.includes('TB') || upper.includes('BOGA')) {
    return 'bg-rose-100/90 text-rose-800 border-rose-300 font-extrabold shadow-xs';
  }
  if (upper.includes('BS') || upper.includes('BUSANA')) {
    return 'bg-fuchsia-100/90 text-fuchsia-800 border-fuchsia-300 font-extrabold shadow-xs';
  }

  return 'bg-indigo-100/90 text-indigo-800 border-indigo-300 font-extrabold shadow-xs';
};

export const SharedDashboardLogs = ({ onLogsFetched }) => {
  const { isFiturAktif } = useFiturStore();
  const { user } = useAuthStore();
  const isSiswa = user?.role === 'siswa';

  const [activeLogTab, setActiveLogTab] = useState(isSiswa ? 'kehadiran_siswa' : 'siswa_terlambat');
  const [dashLogs, setDashLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [subFilter, setSubFilter] = useState('all');
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeLogTab, searchQuery, subFilter]);

  useEffect(() => {
    setSubFilter('all');
  }, [activeLogTab]);

  // Store fallbacks
  const storeAttendanceRecords = useAppStore(state => state.attendanceRecords) || [];
  const storeTeachers = useDataStore(state => state.teachers) || useAppStore(state => state.teachers) || [];
  const dataStoreStudents = useDataStore(state => state.students) || [];
  const storeStudents = useAppStore(state => state.students) || [];
  const snapshotStudents = getDatabaseSnapshot()?.students || [];
  const allStudents = dataStoreStudents.length > 0 ? dataStoreStudents : (storeStudents.length > 0 ? storeStudents : snapshotStudents);

  const studentLookupMap = useMemo(() => {
    const nisMap = new Map();
    const nameMap = new Map();
    (allStudents || []).forEach(s => {
      const nis = String(s.nis || s.code || s.id || '').trim().toLowerCase();
      const name = String(s.name || s.nama || '').trim().toLowerCase();
      if (nis) {
        nisMap.set(nis, s);
        if (nis.length > 6) {
          nisMap.set(nis.slice(-8), s);
        }
      }
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
        if (d2.ok) {
          combined.recentLogs = d2.recentLogs || [];
          if (d2.staffLogs) combined.staffLogs = d2.staffLogs;
          if (d2.teacherLogs) {
            combined.teacherLogs = combined.teacherLogs 
              ? [...combined.teacherLogs, ...d2.teacherLogs] 
              : d2.teacherLogs;
          }
        }
        setDashLogs(combined);
        if (onLogsFetched) onLogsFetched(combined);
      })
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, []);

  const fmtTime = (ts) => {
    // A5 FIX: Selalu gunakan timezone WIB agar jam tidak bergeser di browser luar WIB
    try { 
      return new Intl.DateTimeFormat('id-ID', { 
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      }).format(new Date(ts)); 
    } catch { return '-'; }
  };

  const todayStr = useMemo(() => {
    // Gunakan sv-SE locale dengan timezone Asia/Jakarta untuk format YYYY-MM-DD yang benar
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  }, []);


  const dedupeFront = (arr) => {
    const seenId = new Set();
    // Dedup HANYA berdasarkan ID (employee_id/nis), bukan nama
    // karena nama bisa sama untuk orang berbeda
    const result = [];
    const sorted = [...arr].sort((a, b) => new Date(a.timestamp || a.created_at || a.date || 0) - new Date(b.timestamp || b.created_at || b.date || 0));
    
    for (const item of sorted) {
      const rawId = String(item.employee_id || item.nis || item.username || '').trim().toLowerCase();
      const role = String(item.role_type || item.true_person_type || '').toLowerCase();
      // Hanya dedup jika ada ID — jangan dedup berdasarkan nama
      const idKey = rawId ? `${role}_${rawId}` : null;

      if (idKey) {
        if (seenId.has(idKey)) continue;
        seenId.add(idKey);
      }
      result.push(item);
    }
    return result;
  };



  const uniqueSiswaOptions = useMemo(() => {
    const defaultOption = { label: 'Semua Jurusan', value: 'all' };
    if (!allStudents || allStudents.length === 0) return [defaultOption];
    
    const majorSet = new Set();
    allStudents.forEach(s => {
      let cls = String(s.class_name || s.kelas || '').trim().toUpperCase();
      if (cls && cls !== '-' && cls !== 'UNDEFINED' && cls !== 'NULL') {
        // Hapus tingkat (X/XI/XII) dan rombel angka
        let major = cls.replace(/^(X|XI|XII|XIII)\s+/i, '').replace(/\s+\d+$/i, '').trim();
        if (major) {
          majorSet.add(major);
        }
      }
    });

    const majorOptions = Array.from(majorSet).sort().map(m => ({ label: m, value: m }));
    return [defaultOption, ...majorOptions];
  }, [allStudents]);

  const guruKaryawanLogs = useMemo(() => {
    let logs = [];
    if ((dashLogs?.teacherLogs && dashLogs.teacherLogs.length > 0) || (dashLogs?.staffLogs && dashLogs.staffLogs.length > 0)) {
      logs = [...(dashLogs.teacherLogs || []), ...(dashLogs.staffLogs || [])].filter(item => {
        if(item.name?.toLowerCase().includes('rosyidah')) console.log("ROSYIDAH FOUND IN teacherLogs:", item);
        const logDate = item.timestamp || item.created_at || item.date || '';
        if (!logDate) return true;
        return new Date(logDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }) === todayStr;
      });
    } else {
      const recentGuruKaryawan = (dashLogs?.recentLogs || []).filter(item => {
        const type = String(item.true_person_type || item.role_type || item.person_type || '').toLowerCase();
        const empId = String(item.employee_id || item.username || item.nis || '');
        return type.includes('guru') || type.includes('karyawan') || empId.toUpperCase().startsWith('K');
      });
      if (recentGuruKaryawan.length > 0) {
        logs = recentGuruKaryawan.map(r => ({
          name: r.student_name || r.name || r.employee_id,
          username: r.employee_id,
          role_type: String(r.true_person_type || r.role_type || (String(r.employee_id).toUpperCase().startsWith('K') ? 'KARYAWAN' : 'GURU')).toUpperCase(),
          status: r.status || 'hadir',
          date: r.timestamp || r.created_at,
          created_at: r.timestamp || r.created_at
        }));
      }
    }

    // Selalu gabungkan dengan data manual (Piket/Aplikasi)
    const manualLogs = storeAttendanceRecords
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
      
    logs = [...logs, ...manualLogs];

    logs = dedupeFront(logs);

    // Diurutkan dari jam absen tercepat (ASC)
    logs.sort((a, b) => new Date(a.date || a.timestamp || a.created_at || 0) - new Date(b.date || b.timestamp || b.created_at || 0));

    if (subFilter !== 'all') {
      logs = logs.filter(item => String(item.role_type || '').toLowerCase().includes(subFilter));
    }

    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(item => (item.name || item.username || '').toLowerCase().includes(q));
  }, [dashLogs, storeAttendanceRecords, storeTeachers, todayStr, searchQuery, subFilter]);

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
    // Prioritas: gunakan hikvisionStudentToday jika ada, fallback ke recentLogs HANYA siswa hari ini
    let logs = [];
    if (dashLogs?.hikvisionStudentToday && dashLogs.hikvisionStudentToday.length > 0) {
      logs = [...dashLogs.hikvisionStudentToday];
    } else {
      logs = (dashLogs?.recentLogs || []).filter(item => {
        const type = String(item.true_person_type || item.person_type || 'siswa').toLowerCase();
        const empId = String(item.employee_id || item.nis || item.username || '');
        if (empId.toUpperCase().startsWith('K')) return false;
        if (type.includes('guru') || type.includes('karyawan')) return false;
        // Pastikan log adalah hari ini (WIB)
        const logDate = item.timestamp || item.created_at || item.date || '';
        if (!logDate) return true; // Kalau tidak ada tanggal, tetap tampilkan
        const logDateStr = new Date(logDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
        return logDateStr === todayStr;
      });
    }

    // Filter ketat: Jangan biarkan kode guru (1-3 digit) atau staf (K...) masuk ke tab siswa
    logs = logs.filter(item => {
      const empId = String(item.employee_id || item.nis || item.username || '').trim();
      if (!empId) return true;
      if (empId.toUpperCase().startsWith('K')) return false;
      const type = String(item.true_person_type || item.role_type || '').toLowerCase();
      if (type === 'guru' || type === 'karyawan') return false;
      return true;
    });

    logs = dedupeFront(logs);

    // Merge manual attendances/absences
    if (dashLogs?.studentAbsenceLogs) {
      dashLogs.studentAbsenceLogs.forEach(a => {
        const k = String(a.siswa_nis || '').trim().toLowerCase();
        if (k) {
          const existing = logs.find(l => String(l.employee_id || l.nis || '').trim().toLowerCase() === k);
          if (!existing) {
            logs.push({
              employee_id: k,
              status: a.status,
              timestamp: a.tanggal,
              true_person_type: 'siswa',
              is_manual: true
            });
          }
        }
      });
    }

    // Diurutkan dari jam absen tercepat (ASC)
    logs.sort((a, b) => new Date(a.timestamp || a.created_at || a.date || 0) - new Date(b.timestamp || b.created_at || b.date || 0));

    if (subFilter !== 'all') {
      logs = logs.filter(item => {
        const student = studentLookupMap.nisMap.get(item.nis || item.username || item.employee_id) || studentLookupMap.nameMap.get(item.name?.toLowerCase() || item.student_name?.toLowerCase());
        const className = String(student?.class_name || student?.kelas || item.class_name || item.kelas || '').toUpperCase();
        return className.includes(subFilter.toUpperCase());
      });
    }

    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(item => (item.student_name || item.name || item.employee_id || item.nis || '').toLowerCase().includes(q));
  }, [dashLogs, todayStr, searchQuery, subFilter, studentLookupMap]);


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

    if (subFilter !== 'all') {
      logs = logs.filter(item => {
        const student = studentLookupMap.nisMap.get(item.nis || item.username || item.employee_id) || studentLookupMap.nameMap.get(item.name?.toLowerCase() || item.student_name?.toLowerCase());
        const className = String(student?.class_name || student?.kelas || item.class_name || item.kelas || '').toUpperCase();
        return className.includes(subFilter.toUpperCase());
      });
    }

    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(item => (item.name || item.nis || '').toLowerCase().includes(q));
  }, [dashLogs, searchQuery, subFilter, studentLookupMap]);

  const siswaPrestasiLogs = useMemo(() => {
    let logs = [...(dashLogs?.achievingStudentLogs || [])];
    // Update Terkini (DESC)
    logs.sort((a, b) => new Date(b.created_at || b.tanggal_prestasi || 0) - new Date(a.created_at || a.tanggal_prestasi || 0));

    if (subFilter !== 'all') {
      logs = logs.filter(item => {
        const student = studentLookupMap.nisMap.get(item.nis || item.username || item.employee_id) || studentLookupMap.nameMap.get(item.name?.toLowerCase() || item.student_name?.toLowerCase());
        const className = String(student?.class_name || student?.kelas || item.class_name || item.kelas || '').toUpperCase();
        return className.includes(subFilter.toUpperCase());
      });
    }

    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(item => (item.name || item.nis || item.nama_prestasi || '').toLowerCase().includes(q));
  }, [dashLogs, searchQuery, subFilter, studentLookupMap]);

  const siswaRankingLogs = useMemo(() => {
    let logs = [...(dashLogs?.studentAttendanceRankings || [])].filter(r => r.total_absen > 0);
    if (subFilter !== 'all') {
      logs = logs.filter(item => {
        const className = String(item.class_name || '').toUpperCase();
        return className.includes(subFilter.toUpperCase());
      });
    }
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(item => (item.name || item.nis || '').toLowerCase().includes(q));
  }, [dashLogs, searchQuery, subFilter]);

  const guruRankingLogs = useMemo(() => {
    let logs = [...(dashLogs?.teacherAttendanceRankings || [])].filter(r => r.total_absen > 0);
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(item => (item.name || item.code || '').toLowerCase().includes(q));
  }, [dashLogs, searchQuery]);

  const tabsConfig = useMemo(() => {
    const all = [
      { 
        id: 'guru_karyawan', 
        label: 'Guru/Karyawan',
        labelShort: 'Guru/Staf',
        count: guruKaryawanLogs.length, 
        icon: '/icons/045-account.svg',
        badgeBg: 'bg-indigo-100/90 text-indigo-800'
      },
      { 
        id: 'guru_terlambat', 
        label: 'Guru/Karyawan Terlambat',
        labelShort: 'Guru Telat',
        count: terlambatGuruLogs.length, 
        icon: '/icons/099-alert.svg',
        badgeBg: 'bg-orange-100/90 text-orange-800'
      },
      { 
        id: 'kehadiran_siswa', 
        label: 'Kehadiran Siswa',
        labelShort: 'Siswa Hadir',
        count: kehadiranSiswaLogs.length, 
        icon: '/icons/066-education.svg',
        badgeBg: 'bg-purple-100/90 text-purple-800'
      },
      { 
        id: 'siswa_terlambat', 
        label: 'Siswa Terlambat',
        labelShort: 'Siswa Telat',
        count: terlambatSiswaLogs.length, 
        icon: '/icons/039-time.svg',
        badgeBg: 'bg-amber-100/90 text-amber-800'
      },
      { 
        id: 'siswa_bermasalah', 
        label: 'Siswa Bermasalah',
        labelShort: 'Bermasalah',
        count: bermasalahLogs.length, 
        icon: '/icons/099-alert.svg',
        badgeBg: 'bg-rose-100/90 text-rose-800'
      },
      { 
        id: 'siswa_prestasi', 
        label: 'Siswa Berprestasi',
        labelShort: 'Prestasi',
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
  }, [isSiswa, user, guruKaryawanLogs.length, terlambatGuruLogs.length, kehadiranSiswaLogs.length, terlambatSiswaLogs.length, bermasalahLogs.length, siswaPrestasiLogs.length, siswaRankingLogs.length]);

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

    let name = resolvedStudent?.name || resolvedStudent?.nama || item.student_name || item.name || item.username || item.employee_id || item.nis || '-';
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
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-[var(--ui-radius-control)] border uppercase block shadow-xs tracking-wider ${rightBadgeBg}`}>
            {rightBadgeText}
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-600 bg-[var(--ui-surface-muted)] px-2 py-0.5 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-muted)] mt-1 inline-block text-center shadow-[var(--ui-shadow-control)] tracking-tight">
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
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--ui-surface-muted)] border-t border-[var(--ui-border-muted)] mt-auto">
        <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
          Data {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems}
        </span>
        <div className="flex items-center gap-1.5">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-2.5 py-1.5 rounded-[var(--ui-radius-control)] bg-white border border-[var(--ui-border-soft)] text-slate-600 text-[10px] font-bold hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[var(--ui-shadow-control)]"
          >
            Prev
          </button>
          <span className="px-2.5 text-[10px] font-bold text-slate-700">{currentPage} / {totalPages}</span>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="px-2.5 py-1.5 rounded-[var(--ui-radius-control)] bg-white border border-[var(--ui-border-soft)] text-slate-600 text-[10px] font-bold hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[var(--ui-shadow-control)]"
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
    <div className="bg-white rounded-[var(--ui-radius-card)] shadow-[var(--ui-shadow-card)] border border-[var(--ui-border-muted)] flex flex-col overflow-hidden h-auto transition-all duration-300">
      
      {/* Dynamic Header */}
      <div className="px-4 py-3.5 border-b border-[var(--ui-border-muted)] bg-[var(--ui-surface-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
            <img src="/icons/031-monitor.svg" alt="Monitor" className="w-4 h-4 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">Monitor & Aktivitas</h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 hidden sm:block">Pemantauan log kehadiran dan aktivitas terpadu</p>
          </div>
        </div>

        {/* Search & Filter Input Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {activeLogTab.includes('guru') && (
            <div className="w-full sm:w-36 relative z-50">
              <CustomSelect
                value={subFilter}
                onChange={setSubFilter}
                options={[
                  { label: 'Semua Tipe', value: 'all' },
                  { label: 'Guru', value: 'guru' },
                  { label: 'Karyawan', value: 'karyawan' }
                ]}
                searchable={false}
                className="[&>[data-slot=select-trigger]]:h-[34px] [&>[data-slot=select-trigger]]:min-h-[34px] [&>[data-slot=select-trigger]]:py-1 [&>[data-slot=select-trigger]]:text-xs"
              />
            </div>
          )}
          {(activeLogTab.includes('siswa') || activeLogTab === 'analisa_absensi') && (
            <div className="w-full sm:w-40 relative z-50">
              <CustomSelect
                value={subFilter}
                onChange={setSubFilter}
                options={uniqueSiswaOptions}
                searchable={true}
                className="[&>[data-slot=select-trigger]]:h-[34px] [&>[data-slot=select-trigger]]:min-h-[34px] [&>[data-slot=select-trigger]]:py-1 [&>[data-slot=select-trigger]]:text-xs"
              />
            </div>
          )}
          <div className="relative w-full sm:w-52">
            <img src="/icons/042-search.svg" alt="Search" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input 
              type="text" 
              placeholder="Cari nama / NIS / kelas..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-[34px] pl-8 pr-3 bg-white border border-[var(--ui-border-soft)] rounded-[var(--ui-radius-control)] shadow-[var(--ui-shadow-control)] text-xs font-semibold text-slate-700 focus:outline-none focus:border-[var(--ui-primary)] focus:shadow-[var(--ui-focus-ring)] placeholder:text-slate-400 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-[var(--ui-primary)] font-bold border-none bg-transparent cursor-pointer transition-colors">×</button>
            )}
          </div>

          {/* Super Admin Secret Override Button */}
          {(['admin', 'superadmin', 'super_admin'].includes(String(user?.role || '').toLowerCase()) || String(user?.username || '').toLowerCase() === 'admin') && (
            <button
              type="button"
              onClick={() => setShowSuperAdminModal(true)}
              className="h-[34px] px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-[var(--ui-radius-control)] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0 border border-slate-700"
              title="Koreksi Jam Absensi (Khusus Admin / Super Admin)"
            >
              <Shield size={13} className="text-amber-400 shrink-0" />
              <span className="hidden xl:inline font-bold">Koreksi Jam</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Navigation Tabs Bar - Responsive Mobile 3-Column Grid / Desktop 6-Column Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 p-2.5 sm:p-3.5 bg-[var(--ui-surface-muted)] border-b border-[var(--ui-border-muted)] select-none">
        {tabsConfig.map(tab => {
          const isActive = activeLogTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveLogTab(tab.id)}
              className={`py-2 px-1.5 sm:px-2 rounded-[var(--ui-radius-control)] border flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer text-center w-full min-h-[56px] sm:min-h-[68px] relative touch-manipulation active:scale-95 ${
                isActive
                  ? 'text-white shadow-md ring-2 ring-[var(--ui-primary)]/30'
                  : 'bg-white border-[var(--ui-border-soft)] text-slate-700 shadow-xs hover:-translate-y-0.5 hover:border-slate-300'
              }`}
              style={isActive ? {
                backgroundColor: "var(--ui-primary)",
                borderColor: "var(--ui-primary)",
                color: "#ffffff"
              } : {}}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <img 
                  src={tab.icon} 
                  alt={tab.label} 
                  className={`w-5 h-5 sm:w-6 sm:h-6 object-contain transition-transform duration-300 ${isActive ? 'scale-110' : 'opacity-85'}`} 
                  style={isActive ? { filter: 'brightness(0) invert(1)' } : {}}
                />
                <span className={`absolute -top-1.5 -right-3 px-1 min-w-[17px] h-[17px] flex items-center justify-center rounded-full text-[9px] font-black leading-none shadow-xs border ${
                  isActive ? 'bg-white text-slate-900 border-white' : `border-white ${tab.badgeBg}`
                }`}>
                  {tab.count}
                </span>
              </div>
              <span className={`text-[9.5px] sm:text-[10px] leading-tight truncate max-w-full px-0.5 ${isActive ? 'text-white font-black' : 'text-slate-600 font-bold'}`}>
                <span className="sm:hidden">{tab.labelShort || tab.label}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
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
              <div className="p-8 rounded-[var(--ui-radius-card)] bg-[var(--ui-surface-muted)] border border-dashed border-[var(--ui-border-soft)] text-center">
                <img src="/icons/079-checklist.svg" alt="Guru Hadir" className="w-9 h-9 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-bold text-slate-600">Belum Ada Kehadiran</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Belum ada guru atau karyawan yang scan absen hari ini</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex flex-col border border-[var(--ui-border-muted)] rounded-[var(--ui-radius-card)] overflow-hidden divide-y divide-[var(--ui-border-muted)] flex-1 ">
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
              <div className="p-8 rounded-[var(--ui-radius-card)] bg-[var(--ui-surface-muted)] border border-dashed border-[var(--ui-border-soft)] text-center">
                <img src="/icons/066-education.svg" alt="Kehadiran Siswa" className="w-9 h-9 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-bold text-slate-600">Belum Ada Data Kehadiran Siswa</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Scan absensi siswa untuk menampilkan log live</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex flex-col border border-[var(--ui-border-muted)] rounded-[var(--ui-radius-card)] overflow-hidden divide-y divide-[var(--ui-border-muted)] flex-1 ">
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
              <div className="p-8 rounded-[var(--ui-radius-card)] bg-[var(--ui-surface-muted)] border border-dashed border-[var(--ui-border-soft)] text-center">
                <img src="/icons/079-checklist.svg" alt="Tepat Waktu" className="w-9 h-9 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-bold text-slate-600">Tidak Ada Keterlambatan Siswa</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Seluruh siswa tercatat tepat waktu hari ini</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex flex-col border border-[var(--ui-border-muted)] rounded-[var(--ui-radius-card)] overflow-hidden divide-y divide-[var(--ui-border-muted)] flex-1">
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
              <div className="p-8 rounded-[var(--ui-radius-card)] bg-[var(--ui-surface-muted)] border border-dashed border-[var(--ui-border-soft)] text-center">
                <img src="/icons/079-checklist.svg" alt="Tepat Waktu" className="w-9 h-9 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-bold text-slate-600">Tidak Ada Keterlambatan Guru & Karyawan</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Seluruh guru dan karyawan tercatat hadir tepat waktu hari ini</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex flex-col border border-[var(--ui-border-muted)] rounded-[var(--ui-radius-card)] overflow-hidden divide-y divide-[var(--ui-border-muted)] flex-1">
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
              <div className="p-8 rounded-[var(--ui-radius-card)] bg-[var(--ui-surface-muted)] border border-dashed border-[var(--ui-border-soft)] text-center">
                <img src="/icons/079-checklist.svg" alt="Aman" className="w-9 h-9 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-bold text-slate-600">Tidak Ada Catatan Siswa Bermasalah</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Kedisiplinan siswa dalam kondisi kondusif</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex flex-col border border-[var(--ui-border-muted)] rounded-[var(--ui-radius-card)] overflow-hidden divide-y divide-[var(--ui-border-muted)] flex-1">
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
              <div className="p-8 rounded-[var(--ui-radius-card)] bg-[var(--ui-surface-muted)] border border-dashed border-[var(--ui-border-soft)] text-center">
                <img src="/icons/063-follow.svg" alt="Prestasi" className="w-9 h-9 mx-auto opacity-35 mb-2" />
                <p className="text-xs font-bold text-slate-600">Belum Ada Data Siswa Berprestasi</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Catatan pencapaian dan prestasi siswa akan muncul di sini</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex flex-col border border-[var(--ui-border-muted)] rounded-[var(--ui-radius-card)] overflow-hidden divide-y divide-[var(--ui-border-muted)] flex-1">
                  {siswaPrestasiLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, i) => renderListItem(item, 'siswa_prestasi', i))}
                </div>
                {renderPagination(siswaPrestasiLogs.length)}
              </div>
            )}
          </div>
        )}


      </div>
      {/* Super Admin Exclusive Attendance Override Modal */}
      {showSuperAdminModal && (
        <SuperAdminAttendanceOverrideModal
          isOpen={showSuperAdminModal}
          onClose={() => setShowSuperAdminModal(false)}
          onSuccess={() => {
            // Trigger background reload
            window.location.reload();
          }}
          currentUser={user}
        />
      )}
    </div>
  );
};

export default SharedDashboardLogs;

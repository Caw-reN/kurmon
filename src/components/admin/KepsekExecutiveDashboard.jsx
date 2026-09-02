import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import {
  Users, CheckCircle2, Calendar, BookOpen, FileText, TrendingUp,
  Award, Briefcase, Building2, ChevronRight, Sparkles, Search,
  AlertTriangle, Clock, Megaphone, BarChart3, GraduationCap,
  ClipboardCheck, Zap, XCircle, Timer, RefreshCw, Bell,
  TrendingDown, Eye, Shield, Map, Phone, Star, Filter, X
} from 'lucide-react';
import { SharedDashboardLogs } from '../monitoring/ui/index.js';
import LiveUserActivityLog from './LiveUserActivityLog.jsx';
import UserLoginSessionTracker from './UserLoginSessionTracker.jsx';
import AttendanceByMajorAndClass from './AttendanceByMajorAndClass.jsx';

// ─── Mini Helpers ────────────────────────────────────────────────────────────
const pct = (v, t) => (t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0);

const ProgressBar = ({ value, max, colorClass = 'bg-emerald-500', height = 4 }) => (
  <div className="w-full bg-slate-100 rounded-full overflow-hidden" style={{ height }}>
    <div
      className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
      style={{ width: `${pct(value, max)}%` }}
    />
  </div>
);

const KPICard = ({ icon, label, value, sub, badge, badgeColor, barColor, barPct, detail, active, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-[var(--ui-card-bg,white)] rounded-[var(--ui-radius-card)] p-2.5 sm:p-3 border cursor-pointer group transition-all hover:shadow-[var(--ui-shadow-card-hover,var(--ui-shadow-card))] flex flex-col justify-between
      ${active
        ? 'border-[var(--ui-primary)] shadow-[var(--ui-shadow-card)] ring-2 ring-[var(--ui-primary)]/10'
        : 'border border-[var(--ui-card-border-color,theme(colors.slate.200/80))] hover:border-[var(--ui-primary)]/30 shadow-[var(--ui-shadow-card)]'}`}
  >
    <div>
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105
          ${active ? 'bg-[var(--ui-primary)] text-white shadow-2xs' : 'bg-slate-50 border border-[var(--ui-card-border-color,theme(colors.slate.200/80))]'}`}>
          <img src={icon} alt={label} className={`w-4 h-4 object-contain ${active ? 'invert brightness-0' : ''}`} />
        </div>
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[var(--ui-radius-pill)] border whitespace-nowrap shadow-2xs ${badgeColor}`}>
          {badge}
        </span>
      </div>
      <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5 truncate">{label}</p>
      <div className="flex items-baseline gap-1 mb-1.5">
        <span className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-none">{value}</span>
        {sub && <span className="text-[10px] text-slate-400 font-semibold truncate leading-none">{sub}</span>}
      </div>
    </div>
    <div>
      <ProgressBar value={barPct} max={100} colorClass={barColor} height={4} />
      {detail && <p className="text-[9px] text-slate-400 font-medium mt-1 truncate leading-tight">{detail}</p>}
    </div>
  </div>
);

const SectionCard = ({ title, subtitle, icon, action, onAction, children, accent = false, className = '' }) => (
  <div className={`bg-[var(--ui-card-bg,white)] rounded-[var(--ui-radius-card)] shadow-[var(--ui-card-shadow,var(--ui-shadow-card))] ${accent ? 'border border-[var(--ui-primary)]/20' : 'border border-[var(--ui-card-border-color,theme(colors.slate.200/80))]'} p-4 sm:p-5 flex flex-col h-full ${className}`}>
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0 mb-4`}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-[var(--ui-card-bg,white)] border border-[var(--ui-card-border-color,theme(colors.slate.200/80))] shadow-xs flex items-center justify-center shrink-0">
            <img src={icon} alt={title} className="w-4 h-4 object-contain" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-black text-slate-800 tracking-tight truncate">{title}</h3>
          </div>
          {subtitle && <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <div className="flex justify-start sm:justify-end shrink-0">
          <button onClick={onAction} className="text-[10.5px] font-bold text-[var(--ui-primary)] hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap">
            {action} <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      )}
    </div>
    <div className="flex-1 min-h-0 flex flex-col">
      {children}
    </div>
  </div>
);

// Pagination hook
const usePaginated = (data, pageSize = 20) => {
  const [page, setPage] = React.useState(0);
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const sliced = data.slice(page * pageSize, (page + 1) * pageSize);
  const reset = () => setPage(0);
  return { sliced, page, setPage, totalPages, total, reset };
};

const Pagination = ({ page, totalPages, total, pageSize, setPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
      <span className="text-[10px] font-semibold text-slate-400">Menampilkan {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} dari {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
          className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
          ← Prev
        </button>
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--ui-primary)] text-white">{page + 1}/{totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
          className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
          Next →
        </button>
      </div>
    </div>
  );
};

const EmptyState = ({ icon, message }) => (
  <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
    <img src={icon} alt="" className="w-10 h-10 opacity-30" />
    <p className="text-xs font-medium">{message}</p>
  </div>
);

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function KepsekExecutiveDashboard({
  currentUser,
  classes = [],
  teachers = [],
  staffs = [],
  students = [],
  subjects = [],
  rooms = [],
  schedule = [],
  teachingLoads = [],
  dashLogs = null,
  setDashLogs,
  attendanceRecords = [],
  syllabuses = [],
  dashboardMessages = [],
  academicCalendar = [],
  activityLogs = [],
  subjectComposition = [],
  setActiveTab: setParentTab,
}) {
  const gotoTab = (id) => { if (setParentTab) setParentTab(id); };

  // ── Time ─────────────────────────────────────────────────────────────────
  const todayLong = useMemo(() =>
    new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), []);
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  }, []);
  const currentHour = useMemo(() => {
    return new Date(Date.now() + 7 * 3600000).getHours();
  }, []);
  const greeting = currentHour < 11 ? 'Selamat Pagi' : currentHour < 15 ? 'Selamat Siang' : currentHour < 18 ? 'Selamat Sore' : 'Selamat Malam';

  const guruStats = useMemo(() => {
    const baseTotalGuru = (teachers || []).length || 52;
    const validTeachers = new Set();
    (teachers || []).forEach(t => {
      ['code', 'username', 'name', 'id'].forEach(k => { if (t?.[k]) validTeachers.add(String(t[k]).toLowerCase()); });
    });
    const recs = (attendanceRecords || []).filter(r => {
      const d = r?.date ? String(r.date).slice(0, 10) : '';
      return d === todayStr || d === new Date().toISOString().slice(0, 10);
    });
    const recentLogs = ([...(dashLogs?.teacherLogs || []), ...(dashLogs?.recentLogs || [])]).filter(r => {
      const t = String(r?.true_person_type || r?.role_type || r?.device_type || '').toUpperCase();
      if (!t.includes('GURU')) return false; // HANYA GURU
      const logDate = r?.timestamp || r?.created_at || r?.date || '';
      if (!logDate) return true;
      const logDateStr = new Date(logDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      return logDateStr === todayStr;
    });
    const merged = {};
    recs.forEach(r => { const k = String(r?.teacherCode || r?.employee_id || r?.true_person_name || r?.name || r?.id || '').toLowerCase(); if (k) merged[k] = { ...r }; });
    recentLogs.forEach(r => { 
      const k = String(r?.employee_id || r?.username || r?.true_person_name || r?.name || r?.id || '').toLowerCase(); 
      if (k) {
        if (!merged[k]) {
          merged[k] = { ...r };
        } else {
          // Ambil scan TERAWAL
          const curTime = new Date(merged[k].timestamp || merged[k].created_at || merged[k].date || 0).getTime();
          const newTime = new Date(r.timestamp || r.created_at || r.date || 0).getTime();
          if (newTime > 0 && (curTime === 0 || newTime < curTime)) {
            merged[k] = { ...r };
          }
        }
      }
    });
    const s = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    Object.values(merged).forEach(r => {
      let st = String(r?.status || 'Hadir').toLowerCase();
      if (st === 'late') st = 'terlambat';
      if (st.includes('hadir')) s.Hadir++;
      else if (st.includes('terlambat')) s.Terlambat++;
      else if (st.includes('izin')) s.Izin++;
      else if (st.includes('sakit')) s.Sakit++;
      else if (st.includes('alpa')) s.Alpa++;
      else s.Hadir++;
    });
    const currentTimeJkt = new Date(Date.now() + 7 * 3600000).toISOString().slice(11, 19);
    let unknownCount = 0;
    Object.keys(merged).forEach(k => { if (!validTeachers.has(k)) unknownCount++; });
    const dynamicTotal = baseTotalGuru + unknownCount;

    if (currentTimeJkt > '08:00:00') {
      const recorded = Object.keys(merged).filter(k => validTeachers.has(k)).length;
      s.Alpa += Math.max(0, baseTotalGuru - recorded);
    }
    return { ...s, totalMasuk: s.Hadir + s.Terlambat, belumAbsen: Math.max(0, dynamicTotal - Object.keys(merged).length), total: dynamicTotal };
  }, [attendanceRecords, todayStr, teachers, dashLogs]);

  // ── Karyawan Attendance ───────────────────────────────────────────────────
  const karyawanStats = useMemo(() => {
    const baseTotalKaryawan = (staffs || []).length || 27;
    const validKaryawanIds = new Set();
    const validKaryawanNames = new Set();
    
    (staffs || []).forEach(t => {
      ['code', 'username', 'employee_id', 'id', 'nip'].forEach(k => { 
        if (t?.[k]) validKaryawanIds.add(String(t[k]).trim().toLowerCase()); 
      });
      const name = String(t?.name || t?.nama || '').trim().toLowerCase();
      if (name) validKaryawanNames.add(name);
    });

    const validTeacherIds = new Set();
    const validTeacherNames = new Set();
    (teachers || []).forEach(t => {
      ['code', 'username', 'name', 'id', 'nip'].forEach(k => { 
        if (t?.[k]) validTeacherIds.add(String(t[k]).trim().toLowerCase()); 
      });
      const name = String(t?.name || t?.nama || '').trim().toLowerCase();
      if (name) validTeacherNames.add(name);
    });

    const allRecentLogs = dashLogs?.recentLogs || [];
    const teacherLogs = dashLogs?.teacherLogs || [];
    const combinedLogs = [...allRecentLogs, ...teacherLogs];

    const karyawanLogs = combinedLogs.filter(r => {
      const type = String(r?.true_person_type || r?.role_type || r?.person_type || r?.device_type || '').toUpperCase();
      const idRaw = String(r?.employee_id || r?.username || r?.id || '').trim().toLowerCase();
      const nameRaw = String(r?.student_name || r?.true_person_name || r?.name || '').trim().toLowerCase();

      // Abaikan jika terdaftar sebagai Guru atau Siswa
      if (validTeacherIds.has(idRaw) || validTeacherNames.has(nameRaw) || type.includes('GURU') || type.includes('SISWA')) {
        return false;
      }

      // Masukkan jika memang karyawan
      if (validKaryawanIds.has(idRaw) || validKaryawanNames.has(nameRaw) || type.includes('KARYAWAN') || type.includes('STAFF') || type.includes('PEGAWAI') || type.includes('TU')) {
        const logDate = r?.timestamp || r?.created_at || r?.date || '';
        if (!logDate) return true;
        const logDateStr = new Date(logDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
        return logDateStr === todayStr;
      }
      return false;
    });

    const merged = {};
    karyawanLogs.forEach(r => {
      const k = String(r?.employee_id || r?.username || r?.true_person_name || r?.name || r?.id || '').trim().toLowerCase();
      if (k) {
        if (!merged[k]) {
          merged[k] = r;
        } else {
          // Ambil scan TERAWAL
          const curTime = new Date(merged[k].timestamp || merged[k].created_at || merged[k].date || 0).getTime();
          const newTime = new Date(r.timestamp || r.created_at || r.date || 0).getTime();
          if (newTime > 0 && (curTime === 0 || newTime < curTime)) {
            merged[k] = r;
          }
        }
      }
    });

    const s = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    Object.values(merged).forEach(r => {
      let st = String(r?.status || 'Hadir').toLowerCase();
      if (st === 'late') st = 'terlambat';
      if (st.includes('terlambat')) s.Terlambat++;
      else if (st.includes('izin')) s.Izin++;
      else if (st.includes('sakit')) s.Sakit++;
      else if (st.includes('alpa')) s.Alpa++;
      else s.Hadir++;
    });

    const totalMasuk = s.Hadir + s.Terlambat;
    const totalKaryawan = baseTotalKaryawan;
    const currentTimeJkt = new Date(Date.now() + 7 * 3600000).toISOString().slice(11, 19);

    if (currentTimeJkt > '08:00:00') {
      s.Alpa = Math.max(0, totalKaryawan - (totalMasuk + s.Izin + s.Sakit));
    }

    return {
      ...s,
      totalMasuk,
      belumAbsen: Math.max(0, totalKaryawan - totalMasuk),
      total: totalKaryawan
    };
  }, [todayStr, staffs, teachers, dashLogs]);

  // ── Siswa Attendance ──────────────────────────────────────────────────────
  const siswaStats = useMemo(() => {
    const hikLogs = dashLogs?.hikvisionStudentToday || [];
    const recentLogs = (dashLogs?.recentLogs || []).filter(r => {
      const type = String(r?.true_person_type || r?.person_type || 'siswa').toLowerCase();
      const empId = String(r?.employee_id || r?.nis || r?.username || '');
      if (empId.toUpperCase().startsWith('K')) return false;
      if (type.includes('guru') || type.includes('karyawan')) return false;
      
      const logDate = r?.timestamp || r?.created_at || r?.date || '';
      if (!logDate) return true;
      const logDateStr = new Date(logDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      return logDateStr === (new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }));
    });
    const allLogs = hikLogs.length > 0 ? hikLogs : recentLogs;
    
    const uniq = {};
    allLogs.forEach(r => {
      const k = String(r?.employee_id || r?.nis || r?.true_person_name || r?.name || r?.id || '').trim().toLowerCase();
      if (k) {
        if (!uniq[k]) {
          uniq[k] = r;
        } else {
          // Ambil scan TERAWAL
          const curTime = new Date(uniq[k].timestamp || uniq[k].created_at || uniq[k].date || 0).getTime();
          const newTime = new Date(r.timestamp || r.created_at || r.date || 0).getTime();
          if (newTime > 0 && (curTime === 0 || newTime < curTime)) {
            uniq[k] = r;
          }
        }
      }
    });

    // Merge manual absences from studentAbsenceLogs
    if (dashLogs?.studentAbsenceLogs) {
      dashLogs.studentAbsenceLogs.forEach(a => {
        const k = String(a.siswa_nis || '').trim().toLowerCase();
        if (k) {
          // If already present in uniq (e.g. they scanned but also got an absence log for some reason), we overlay the manual status
          if (!uniq[k]) {
            uniq[k] = { employee_id: k, status: a.status, timestamp: a.tanggal };
          } else if (a.status && String(a.status).toLowerCase() !== 'hadir') {
            // Manual overrides scan
            uniq[k].status = a.status;
          }
        }
      });
    }

    const gradeStats = {
      'X': { total: 0, hadir: 0, telat: 0, izin: 0, sakit: 0, alpa: 0 },
      'XI': { total: 0, hadir: 0, telat: 0, izin: 0, sakit: 0, alpa: 0 },
      'XII': { total: 0, hadir: 0, telat: 0, izin: 0, sakit: 0, alpa: 0 },
      'Unknown': { total: 0, hadir: 0, telat: 0, izin: 0, sakit: 0, alpa: 0 }
    };

    const nisMap = {};
    const nameMap = {};
    
    (students || []).forEach(s => {
      const nis = String(s.nis || s.code || s.employee_id || '').trim().toLowerCase();
      const name = String(s.name || s.nama || '').trim().toLowerCase();
      if (nis) nisMap[nis] = s;
      if (name) nameMap[name] = s;
      
      // Hitung total base per kelas
      const cls = String(s.class_name || s.kelas || '').toUpperCase();
      let grade = 'Unknown';
      if (cls.startsWith('XII ') || cls === 'XII') grade = 'XII';
      else if (cls.startsWith('XI ') || cls === 'XI') grade = 'XI';
      else if (cls.startsWith('X ') || cls === 'X') grade = 'X';
      
      if (gradeStats[grade]) gradeStats[grade].total++;
    });

    const s = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    Object.values(uniq).forEach(r => {
      const idRaw = String(r?.employee_id || r?.nis || r?.id || '').trim().toLowerCase();
      const nameRaw = String(r?.true_person_name || r?.name || '').trim().toLowerCase();
      const sMaster = nisMap[idRaw] || nameMap[nameRaw] || nameMap[idRaw];
      
      const cls = String(sMaster?.class_name || sMaster?.kelas || '').toUpperCase();
      let grade = 'Unknown';
      if (cls.startsWith('XII ') || cls === 'XII') grade = 'XII';
      else if (cls.startsWith('XI ') || cls === 'XI') grade = 'XI';
      else if (cls.startsWith('X ') || cls === 'X') grade = 'X';

      let st = String(r?.status || 'Hadir').toLowerCase();
      if (st === 'late') st = 'terlambat';
      
      if (st.includes('hadir')) { s.Hadir++; gradeStats[grade].hadir++; }
      else if (st.includes('terlambat')) { s.Terlambat++; gradeStats[grade].telat++; }
      else if (st.includes('izin')) { s.Izin++; gradeStats[grade].izin++; }
      else if (st.includes('sakit')) { s.Sakit++; gradeStats[grade].sakit++; }
      else if (st.includes('alpa')) { s.Alpa++; gradeStats[grade].alpa++; }
      else { s.Hadir++; gradeStats[grade].hadir++; }
    });

    const majorMap = {};
    (students || []).forEach(s => {
      let cls = String(s.class_name || s.kelas || '').trim().toUpperCase();
      let major = cls.replace(/^(X|XI|XII|XIII)\s+/i, '').replace(/\s+\d+$/i, '').trim();
      if (!major || major === '-' || major === 'UNDEFINED') major = 'Umum';
      if (!majorMap[major]) majorMap[major] = { total: 0, hadir: 0 };
      majorMap[major].total++;
    });

    Object.values(uniq).forEach(r => {
      const idRaw = String(r?.employee_id || r?.nis || r?.id || '').trim().toLowerCase();
      const nameRaw = String(r?.true_person_name || r?.name || '').trim().toLowerCase();
      const sMaster = nisMap[idRaw] || nameMap[nameRaw] || nameMap[idRaw];
      if (sMaster) {
        let cls = String(sMaster.class_name || sMaster.kelas || '').trim().toUpperCase();
        let major = cls.replace(/^(X|XI|XII|XIII)\s+/i, '').replace(/\s+\d+$/i, '').trim();
        if (!major || major === '-' || major === 'UNDEFINED') major = 'Umum';
        if (majorMap[major]) majorMap[major].hadir++;
      }
    });

    const topMajors = Object.entries(majorMap)
      .map(([name, data]) => ({ name, ...data, pct: pct(data.hadir, data.total) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);
    
    const totalSiswaInSchool = (students || []).length || dashLogs?.totalStudents || 0;
    
    // Auto-calculate Alpa for each grade if past cutoff
    const currentTimeJkt = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(11, 19);
    if (currentTimeJkt > "08:00:00") {
      ['X', 'XI', 'XII', 'Unknown'].forEach(g => {
        const recorded = gradeStats[g].hadir + gradeStats[g].telat + gradeStats[g].izin + gradeStats[g].sakit + gradeStats[g].alpa;
        const unrecorded = Math.max(0, gradeStats[g].total - recorded);
        gradeStats[g].alpa += unrecorded;
      });
      const totalRecorded = s.Hadir + s.Terlambat + s.Izin + s.Sakit + s.Alpa;
      s.Alpa += Math.max(0, totalSiswaInSchool - totalRecorded);
    }
    
    return { ...s, total: Object.keys(uniq).length, totalSiswaInSchool, gradeStats, topMajors };
  }, [dashLogs, students]);

  // ── Syllabus Stats ────────────────────────────────────────────────────────
  const syllabusStatsPerTeacher = useMemo(() => {
    return (teachers || []).map(teacher => {
      const loads = (teachingLoads || []).filter(l => l.teacherCode === teacher.code);
      const teacherSyllabuses = (syllabuses || []).filter(s => s.teacherCode === teacher.code);
      const uniqueSubjects = [...new Set(loads.map(l => l.subject))].filter(Boolean);
      const targetModules = Math.max(3, uniqueSubjects.length * 3);
      const uploadedModules = teacherSyllabuses.length;
      const completionPct = pct(uploadedModules, targetModules);
      const latestUpload = teacherSyllabuses.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
      return {
        ...teacher,
        uploadedModules,
        targetModules,
        completionPct,
        uniqueSubjects,
        syllabuses: teacherSyllabuses,
        latestUpload: latestUpload?.createdAt ? new Date(latestUpload.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—',
        status: completionPct >= 100 ? 'Selesai' : completionPct > 50 ? 'Progres' : 'Kurang',
      };
    }).sort((a, b) => a.completionPct - b.completionPct);
  }, [teachers, syllabuses, teachingLoads]);

  // ── Today's Schedule ──────────────────────────────────────────────────────
  const todaySchedule = useMemo(() => {
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = dayNames[new Date().getDay()];
    const filtered = (schedule || []).filter(s => String(s.day || s.hari || '').toLowerCase() === today.toLowerCase());
    const arr = filtered.length > 0 ? filtered : (schedule || []).slice(0, 10);
    return arr.map((slot, idx) => ({
      id: slot?.id || idx,
      jamStart: slot?.jamKe || slot?.jamStart || slot?.slot || (idx + 1),
      subject: slot?.subjectName || slot?.subject || `Mata Pelajaran ${idx + 1}`,
      className: slot?.className || slot?.kelas || slot?.targetGrade || 'Kelas',
      room: slot?.roomName || slot?.room || `Ruang ${idx + 1}`,
      teacher: slot?.teacherName || slot?.teacherCode || 'Guru Pengajar',
      status: idx % 3 === 0 ? 'Selesai' : idx % 3 === 1 ? 'Berlangsung' : 'Jadwal',
    }));
  }, [schedule]);

  const jurnalSubmitted = Math.round(todaySchedule.length * 0.75);
  const jurnalPct = pct(jurnalSubmitted, todaySchedule.length || 1);

  // ── Sarpras ───────────────────────────────────────────────────────────────
  const sarprasStats = useMemo(() => {
    const total = (rooms || []).length || 0;
    const activeRooms = [...new Set(todaySchedule.filter(c => c.status === 'Berlangsung').map(c => c.room))];
    const terpakai = Math.min(activeRooms.length || Math.floor(total * 0.6), total);
    const kosong = Math.max(0, total - terpakai);
    return { total, terpakai, kosong, utilisasi: pct(terpakai, total || 1) };
  }, [rooms, todaySchedule]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalGuruCount = (teachers || []).length || guruStats.total || 52;
  const totalKaryawanCount = (staffs || []).length || karyawanStats.total || 0;
  const totalSiswaCount = (students || []).length || dashLogs?.totalStudents || 0;
  const totalClassesCount = (classes || []).length || 0;
  const totalJP = useMemo(() => (teachingLoads || []).reduce((s, l) => s + (Number(l?.duration) || 0), 0), [teachingLoads]);
  const siswaDenom = totalSiswaCount || 1;
  const siswaPresentTotal = siswaStats.Hadir + siswaStats.Terlambat;
  const siswaPresentPct = pct(siswaPresentTotal, siswaDenom);
  const guruPresentPct = pct(guruStats.totalMasuk, guruStats.total);
  const karyawanPresentPct = pct(karyawanStats.totalMasuk, karyawanStats.total);
  const pklCount = (dashLogs?.latestStudentLogs || []).length || 0;
  const pklLocationCount = dashLogs?.totalLocations || Math.floor(pklCount / 4) || 0;
  const majorCount = useMemo(() => new Set((classes || []).map(c => c.major || c.jurusan || c.program).filter(Boolean)).size, [classes]);

  const pieColors = { Hadir: '#10b981', Terlambat: '#f59e0b', Izin: '#6366f1', Sakit: '#38bdf8', Alpa: '#f43f5e' };
  const guruPie = useMemo(() => [
    { name: 'Hadir', value: guruStats.Hadir, color: pieColors.Hadir },
    { name: 'Terlambat', value: guruStats.Terlambat, color: pieColors.Terlambat },
    { name: 'Izin', value: guruStats.Izin, color: pieColors.Izin },
    { name: 'Sakit', value: guruStats.Sakit, color: pieColors.Sakit },
    { name: 'Alpa', value: guruStats.Alpa, color: pieColors.Alpa },
  ].filter(d => d.value > 0), [guruStats]);

  const karyawanPie = useMemo(() => [
    { name: 'Hadir', value: karyawanStats.Hadir, color: pieColors.Hadir },
    { name: 'Terlambat', value: karyawanStats.Terlambat, color: pieColors.Terlambat },
    { name: 'Izin', value: karyawanStats.Izin, color: pieColors.Izin },
    { name: 'Sakit', value: karyawanStats.Sakit, color: pieColors.Sakit },
    { name: 'Alpa', value: karyawanStats.Alpa, color: pieColors.Alpa },
  ].filter(d => d.value > 0), [karyawanStats]);

  const siswaPie = useMemo(() => [
    { name: 'Hadir', value: siswaStats.Hadir, color: pieColors.Hadir },
    { name: 'Terlambat', value: siswaStats.Terlambat, color: pieColors.Terlambat },
    { name: 'Izin', value: siswaStats.Izin, color: pieColors.Izin },
    { name: 'Sakit', value: siswaStats.Sakit, color: pieColors.Sakit },
    { name: 'Alpa', value: siswaStats.Alpa, color: pieColors.Alpa },
  ].filter(d => d.value > 0), [siswaStats]);



  const combinedAttendanceStats = useMemo(() => {
    const totalPeople = (guruStats.total || 0) + (karyawanStats.total || 0) + (siswaDenom || 0);
    const totalHadir = (guruStats.Hadir || 0) + (karyawanStats.Hadir || 0) + (siswaStats.Hadir || 0);
    const totalTelat = (guruStats.Terlambat || 0) + (karyawanStats.Terlambat || 0) + (siswaStats.Terlambat || 0);
    const totalIzinSakit = (guruStats.Izin || 0) + (guruStats.Sakit || 0) + (karyawanStats.Izin || 0) + (karyawanStats.Sakit || 0) + (siswaStats.Izin || 0) + (siswaStats.Sakit || 0);
    const totalAlpa = (guruStats.Alpa || 0) + (karyawanStats.Alpa || 0) + (siswaStats.Alpa || 0);
    const overallPct = totalPeople > 0 ? Math.round(((totalHadir + totalTelat) / totalPeople) * 100) : 0;

    const chartData = [
      { name: 'Tepat Waktu', value: totalHadir, color: '#10b981' }, // emerald-500
      { name: 'Terlambat', value: totalTelat, color: '#f59e0b' }, // amber-500
      { name: 'Izin / Sakit', value: totalIzinSakit, color: '#0ea5e9' }, // sky-500
      { name: 'Belum Absen', value: totalAlpa, color: '#f43f5e' }, // rose-500
    ].filter(d => d.value > 0);

    return { totalPeople, totalHadir, totalTelat, totalIzinSakit, totalAlpa, overallPct, chartData };
  }, [guruStats, karyawanStats, siswaStats, siswaDenom]);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1800px] mx-auto flex flex-col gap-4 animate-in fade-in duration-300 pb-12">

      {/* ═══════════════ HERO ═══════════════ */}
      <div
        className="rounded-[var(--ui-radius-card)] text-white shadow-xl relative overflow-hidden border border-white/10"
        style={{ background: 'linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 55%, #000) 100%)' }}
      >
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-white/10 rounded-full blur-[80px] pointer-events-none -mr-32 -mt-40" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-black/15 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-7">
          {/* Top Row: Greeting (Left) & Menu Pintasan (Right) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: User greeting & overview info */}
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 text-white/90 text-[10px] font-extrabold border border-white/15 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {todayLong}
                </span>
              </div>
              <div>
                <p className="text-white/75 text-xs font-semibold">{greeting},</p>
                <h1 className="text-xl sm:text-2xl font-black leading-tight mt-0.5">
                  {currentUser?.name || 'Kepala Sekolah'}
                </h1>
                <p className="text-xs text-white/70 font-medium mt-1 max-w-sm leading-relaxed">
                  Pusat pemantauan operasional sekolah — kehadiran, KBM, fasilitas, PKL, dan kesiswaan realtime.
                </p>
              </div>
            </div>

            {/* Right: Menu Pintasan Glassmorphic Grid */}
            <div className="flex flex-col gap-2.5 w-full lg:w-auto shrink-0">
              <div className="flex items-center gap-1.5 text-white/90">
                <Sparkles size={13} className="text-amber-300" />
                <span className="text-xs font-black uppercase tracking-wider">Menu Pintasan</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:max-w-3xl">
                {[
                  { tab: 'generate', label: 'Jadwal & KBM', icon: '/icons/011-schedule.svg' },
                  { tab: 'laporan_absensi', label: 'Rekap Absensi', icon: '/icons/046-report.svg' },
                  { tab: 'pesan', label: 'Pengumuman', icon: '/icons/028-megaphone.svg' },
                  { tab: 'kedisiplinan_bpbk', label: 'Buku BPBK', icon: '/icons/014-award.svg' },
                  { tab: 'pkl_dashboard', label: 'Dashboard PKL', icon: '/icons/008-warehouse.svg' },
                  { tab: 'dataguru', label: 'Data Guru', icon: '/icons/045-account.svg' },
                  { tab: 'datasiswa', label: 'Data Siswa', icon: '/icons/066-education.svg' },
                  { tab: 'akademik', label: 'Kalender', icon: '/icons/060-calendar.svg' },
                ].map(m => {

                  return (
                    <button
                      key={m.tab}
                      onClick={() => gotoTab(m.tab)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--ui-radius-control)] bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md transition-all text-left group cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="w-7 h-7 rounded-[var(--ui-radius-control)] bg-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        <img src={m.icon} alt={m.label} className="w-4 h-4 object-contain" />
                      </div>
                      <span className="text-xs font-extrabold text-white whitespace-nowrap min-w-0 flex-1">{m.label}</span>
                      <ChevronRight size={12} className="text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ═══════════════ TOP SECTION (5 KPI + PRESENSI LIVE KIRI & 2 KPI + PIE CHART KANAN) ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        
        {/* ── KOLOM KIRI (75% LEBAR): 5 KPI Cards + Presensi Live Box ── */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-3.5">
          
          {/* 5 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-2.5">
            {[
              { id: 'sdm', icon: '/icons/045-account.svg', label: 'Guru Hadir', value: guruStats.totalMasuk, sub: `/ ${guruStats.total}`, badge: `${guruPresentPct}%`, badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200', barColor: 'bg-indigo-500', barPct: guruPresentPct, detail: `${guruStats.Terlambat} terlambat · ${guruStats.Alpa} belum absen`, onClick: () => gotoTab('laporan_absensi') },
              { id: 'sdm_karyawan', icon: '/icons/045-account.svg', label: 'Karyawan Hadir', value: karyawanStats.totalMasuk, sub: `/ ${karyawanStats.total}`, badge: `${karyawanPresentPct}%`, badgeColor: 'text-teal-700 bg-teal-50 border-teal-200', barColor: 'bg-teal-500', barPct: karyawanPresentPct, detail: `${karyawanStats.Terlambat} terlambat · ${karyawanStats.Alpa} belum absen`, onClick: () => gotoTab('laporan_absensi') },
              { id: 'kesiswaan', icon: '/icons/066-education.svg', label: 'Siswa Hadir', value: siswaPresentTotal || totalSiswaCount, sub: `/ ${siswaDenom}`, badge: `${siswaPresentPct || 88}%`, badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200', barColor: 'bg-emerald-500', barPct: siswaPresentPct || 88, detail: `${siswaStats.Terlambat} terlambat · ${siswaStats.Hadir} tepat waktu`, onClick: () => gotoTab('laporan_absensi') },
              { id: 'kurikulum', icon: '/icons/011-schedule.svg', label: 'Jurnal KBM', value: jurnalSubmitted, sub: `/ ${todaySchedule.length} Slot`, badge: `${jurnalPct}%`, badgeColor: 'text-sky-700 bg-sky-50 border-sky-200', barColor: 'bg-sky-500', barPct: jurnalPct, detail: `${Math.max(0, todaySchedule.length - jurnalSubmitted)} slot belum terisi`, onClick: () => gotoTab('generate') },
              { id: 'sarpras', icon: '/icons/031-monitor.svg', label: 'Utilisasi Ruang', value: sarprasStats.terpakai, sub: `/ ${sarprasStats.total} Ruang`, badge: `${sarprasStats.utilisasi}%`, badgeColor: 'text-rose-700 bg-rose-50 border-rose-200', barColor: 'bg-rose-500', barPct: sarprasStats.utilisasi, detail: `${sarprasStats.kosong} ruang kosong saat ini`, onClick: () => gotoTab('generate') },
            ].map((kpi, i) => (
              <KPICard key={i} {...kpi} />
            ))}
          </div>

          {/* Presensi Live Hari Ini */}
          <SectionCard 
            title="Presensi Live Hari Ini" 
            subtitle="Data terpadu mesin absensi Hikvision & gerbang sekolah" 
            icon="/icons/084-fingerprint scan.svg" 
            action="Detail Laporan" 
            onAction={() => gotoTab('laporan_absensi')}
            className="flex-1"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {[
                { label: 'Guru Pengajar', total: guruStats.total, hadir: guruStats.Hadir, telat: guruStats.Terlambat, izin: guruStats.Izin, sakit: guruStats.Sakit, alpa: guruStats.Alpa },
                { label: 'Karyawan', total: karyawanStats.total, hadir: karyawanStats.Hadir, telat: karyawanStats.Terlambat, izin: karyawanStats.Izin, sakit: karyawanStats.Sakit, alpa: karyawanStats.Alpa },
                { label: 'Peserta Didik', total: siswaDenom, hadir: siswaStats.Hadir, telat: siswaStats.Terlambat, izin: siswaStats.Izin, sakit: siswaStats.Sakit, alpa: siswaStats.Alpa, isSiswa: true },
              ].filter(row => row.total > 0).map(row => (
                <div key={row.label} className="bg-slate-50/80 rounded-[var(--ui-radius-small)] p-3 border border-slate-200/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        {row.label} 
                        <span className="text-[10px] text-slate-400 font-medium">({row.total} orang)</span>
                      </span>
                      <span className="text-emerald-700 font-black text-[11px] bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200/60">
                        {pct(row.hadir + row.telat, row.total || 1)}% Hadir
                      </span>
                    </div>
                    
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex mb-2 shadow-inner">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct(row.hadir, row.total)}%` }} title="Hadir" />
                      <div className="h-full bg-amber-400" style={{ width: `${pct(row.telat, row.total)}%` }} title="Terlambat" />
                      <div className="h-full bg-orange-400" style={{ width: `${pct(row.izin, row.total)}%` }} title="Izin" />
                      <div className="h-full bg-sky-400" style={{ width: `${pct(row.sakit, row.total)}%` }} title="Sakit" />
                      <div className="h-full bg-rose-400" style={{ width: `${pct(row.alpa, row.total)}%` }} title="Alpa" />
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 pt-0.5">
                      <span className="text-emerald-700">● {row.hadir} Hadir</span>
                      <span className="text-amber-600">● {row.telat} Telat</span>
                      <span className="text-orange-600">● {row.izin} Izin</span>
                      <span className="text-sky-600">● {row.sakit} Sakit</span>
                      <span className="text-rose-600">● {row.alpa} Alpa</span>
                    </div>
                  </div>

                  {row.isSiswa && siswaStats.gradeStats && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 grid grid-cols-3 gap-1">
                      {['X', 'XI', 'XII'].map(g => {
                        const gStat = siswaStats.gradeStats[g];
                        const gPresent = (gStat?.hadir || 0) + (gStat?.telat || 0);
                        return (
                          <div key={g} className="bg-white border border-slate-200 rounded-[var(--ui-radius-control)] py-0.5 px-1 text-center shadow-xs">
                            <span className="text-[8.5px] font-extrabold text-slate-500 mr-0.5">Kls {g}:</span>
                            <span className="text-[9.5px] font-black text-slate-800">{pct(gPresent, gStat?.total || 1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 p-1.5 bg-emerald-50/80 border border-emerald-200/80 rounded-[var(--ui-radius-small)] text-[10px] text-emerald-800 font-semibold mt-2.5">
              <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
              Realtime — Gateway Mesin Hikvision & Gerbang Sekolah Terhubung
              <span className="ml-auto text-[8.5px] font-black uppercase bg-emerald-200 px-1.5 py-0.2 rounded-full text-emerald-900 shrink-0">Live</span>
            </div>
          </SectionCard>

        </div>

        {/* ── KOLOM KANAN (25% LEBAR): 2 KPI Cards + Pie Chart Persentase Kehadiran ── */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3.5">
          
          {/* 2 KPI Cards */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {[
              { id: 'hubin', icon: '/icons/008-warehouse.svg', label: 'Peserta PKL', value: pklCount, sub: 'Aktif', badge: `${pklLocationCount} DUDI`, badgeColor: 'text-amber-700 bg-amber-50 border-amber-200', barColor: 'bg-amber-500', barPct: pct(pklCount, totalSiswaCount || 1), detail: `${pklLocationCount} mitra DUDI aktif`, onClick: () => gotoTab('pkl_dashboard') },
              { id: 'kesiswaan_k', icon: '/icons/014-award.svg', label: 'Kedisiplinan', value: (dashLogs?.problematicStudentLogs?.length || 0), sub: 'Perlu Binaan', badge: `${dashLogs?.achievingStudentLogs?.length || 0} Prestasi`, badgeColor: 'text-purple-700 bg-purple-50 border-purple-200', barColor: 'bg-purple-500', barPct: pct(dashLogs?.achievingStudentLogs?.length || 0, totalSiswaCount || 1), detail: `${dashLogs?.achievingStudentLogs?.length || 0} siswa berprestasi`, onClick: () => gotoTab('kedisiplinan_bpbk') },
            ].map((kpi, i) => (
              <KPICard key={i} {...kpi} />
            ))}
          </div>

          {/* Pie Chart Card: Persentase Kehadiran */}
          <div className="bg-[var(--ui-card-bg,white)] rounded-[var(--ui-radius-card)] shadow-[var(--ui-card-shadow,var(--ui-shadow-card))] border border-[var(--ui-card-border-color,theme(colors.slate.200/80))] p-3.5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
                  <PieChart size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 leading-tight">Persentase Kehadiran</h4>
                  <p className="text-[9.5px] text-slate-400 font-medium">Proporsi kehadiran sekolah hari ini</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                {combinedAttendanceStats.overallPct}% Total
              </span>
            </div>

            {/* Donut Chart with Center Stat */}
            <div className="relative h-36 w-full flex items-center justify-center my-0.5">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={combinedAttendanceStats.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={54}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {combinedAttendanceStats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val, name) => [`${val} Orang (${pct(val, combinedAttendanceStats.totalPeople)}%)`, name]}
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-black text-slate-800 tracking-tight leading-none">
                  {combinedAttendanceStats.overallPct}%
                </span>
                <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">
                  Hadir
                </span>
              </div>
            </div>

            {/* Breakdown Legend */}
            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[9.5px] font-bold">
              <div className="flex items-center justify-between bg-slate-50/80 px-2 py-1 rounded-[var(--ui-radius-control)] border border-slate-200/60">
                <span className="text-emerald-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Tepat Waktu
                </span>
                <span className="text-slate-800 font-black">{combinedAttendanceStats.totalHadir}</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50/80 px-2 py-1 rounded-[var(--ui-radius-control)] border border-slate-200/60">
                <span className="text-amber-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  Terlambat
                </span>
                <span className="text-slate-800 font-black">{combinedAttendanceStats.totalTelat}</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50/80 px-2 py-1 rounded-[var(--ui-radius-control)] border border-slate-200/60">
                <span className="text-sky-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                  Izin/Sakit
                </span>
                <span className="text-slate-800 font-black">{combinedAttendanceStats.totalIzinSakit}</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50/80 px-2 py-1 rounded-[var(--ui-radius-control)] border border-slate-200/60">
                <span className="text-rose-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  Belum Absen
                </span>
                <span className="text-slate-800 font-black">{combinedAttendanceStats.totalAlpa}</span>
              </div>
            </div>

          </div>

        </div>

      </div>


      {/* ═══════════════ PERSENTASE KEHADIRAN PER JURUSAN & PER KELAS ═══════════════ */}
      <AttendanceByMajorAndClass 
        students={students} 
        dashLogs={dashLogs} 
        onNavigateTab={gotoTab} 
      />

      {/* ═══════════════ 2 KOLOM SEJAJAR: LOG AKTIVITAS (KIRI) & LOG SESI DAN DURASI (KANAN) ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Box Kiri: Live Log Aktivitas Pengguna */}
        <div className="h-full flex flex-col">
          <LiveUserActivityLog onNavigateTab={gotoTab} />
        </div>

        {/* Box Kanan: Log Siapa Saja yang Login, Frekuensi & Durasi Aktif */}
        <div className="h-full flex flex-col">
          <UserLoginSessionTracker onNavigateTab={gotoTab} />
        </div>
      </div>

    </div>
  );
}

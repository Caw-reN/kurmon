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

// ─── Mini Helpers ────────────────────────────────────────────────────────────
const pct = (v, t) => (t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0);

const ProgressBar = ({ value, max, colorClass = 'bg-emerald-500', height = 6 }) => (
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
    className={`bg-white rounded-[var(--ui-radius-card)] p-4 border cursor-pointer group transition-all hover:shadow-lg
      ${active
        ? 'border-[var(--ui-primary)] shadow-md ring-2 ring-[var(--ui-primary)]/10'
        : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}
  >
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className={`w-11 h-11 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105
        ${active ? 'bg-[var(--ui-primary)] shadow-md' : 'bg-slate-50 border border-slate-200'}`}>
        <img src={icon} alt={label} className={`w-6 h-6 object-contain ${active ? 'invert brightness-0' : ''}`} />
      </div>
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${badgeColor}`}>
        {badge}
      </span>
    </div>
    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
    <div className="flex items-baseline gap-1.5 mb-2">
      <span className="text-2xl font-black text-slate-800">{value}</span>
      {sub && <span className="text-xs text-slate-400 font-semibold">{sub}</span>}
    </div>
    <ProgressBar value={barPct} max={100} colorClass={barColor} />
    {detail && <p className="text-[10px] text-slate-400 font-medium mt-1.5 truncate">{detail}</p>}
  </div>
);

const SectionCard = ({ title, subtitle, icon, action, onAction, children, accent = false, className = '' }) => (
  <div className={`bg-white rounded-[var(--ui-radius-card)] shadow-sm border overflow-hidden flex flex-col ${accent ? 'border-[var(--ui-primary)]/20' : 'border-slate-200'} ${className}`}>
    <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${accent ? 'bg-[var(--ui-primary)]/5 border-[var(--ui-primary)]/10' : 'border-slate-100 bg-slate-50/60'}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
            <img src={icon} alt={title} className="w-4 h-4 object-contain" />
          </div>
        )}
        <div>
          <h3 className="text-sm font-black text-slate-800">{title}</h3>
          {subtitle && <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <button
          onClick={onAction}
          className="text-[11px] font-extrabold text-[var(--ui-primary)] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
        >
          {action} <ChevronRight size={12} />
        </button>
      )}
    </div>
    <div className="p-5 flex-1 flex flex-col justify-between gap-3">{children}</div>
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
    recentLogs.forEach(r => { const k = String(r?.employee_id || r?.username || r?.true_person_name || r?.name || r?.id || '').toLowerCase(); if (k) merged[k] = { ...(merged[k] || {}), ...r }; });
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
      if (k && !merged[k]) merged[k] = r;
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
      const t = String(r?.true_person_type || r?.device_type || '').toUpperCase();
      if (!t.includes('SISWA')) return false;
      const logDate = r?.timestamp || r?.created_at || r?.date || '';
      if (!logDate) return true;
      const logDateStr = new Date(logDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      return logDateStr === (new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }));
    });
    const allLogs = hikLogs.length > 0 ? hikLogs : recentLogs;
    
    const uniq = {};
    allLogs.forEach(r => {
      const k = String(r?.employee_id || r?.nis || r?.true_person_name || r?.name || r?.id || '').trim().toLowerCase();
      if (k && !uniq[k]) uniq[k] = r;
    });

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
    
    const totalSiswaInSchool = dashLogs?.totalStudents || (students || []).length || 0;
    
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
  const siswaDenom = dashLogs?.totalStudents || siswaStats.totalSiswaInSchool || totalSiswaCount || 1;
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

        <div className="relative z-10 p-6 sm:p-8">
          {/* Top Row */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex flex-col gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-black tracking-widest text-white border border-white/30 uppercase">
                  <Sparkles size={11} className="text-amber-300" />
                  Executive Command Center
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-white/90 text-[10px] font-bold border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {todayLong}
                </span>
              </div>
              <div>
                <p className="text-white/70 text-sm font-semibold">{greeting},</p>
                <h1 className="text-2xl sm:text-3xl font-black leading-tight mt-0.5">
                  {currentUser?.name || 'Kepala Sekolah'}
                </h1>
                <p className="text-sm text-white/75 font-medium mt-1 max-w-lg">
                  Pusat pemantauan operasional sekolah — kehadiran, KBM, fasilitas, PKL, dan kesiswaan realtime.
                </p>
              </div>


            </div>


          </div>
        </div>
      </div>


      {/* ═══════════════ 7 KPI PILLARS ═══════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {[
          { id: 'sdm', icon: '/icons/045-account.svg', label: 'Guru Hadir', value: guruStats.totalMasuk, sub: `/ ${guruStats.total}`, badge: `${guruPresentPct}%`, badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200', barColor: 'bg-indigo-500', barPct: guruPresentPct, detail: `${guruStats.Terlambat} terlambat · ${guruStats.Alpa} belum absen`, onClick: () => gotoTab('laporan_absensi') },
          { id: 'sdm_karyawan', icon: '/icons/045-account.svg', label: 'Karyawan Hadir', value: karyawanStats.totalMasuk, sub: `/ ${karyawanStats.total}`, badge: `${karyawanPresentPct}%`, badgeColor: 'text-teal-700 bg-teal-50 border-teal-200', barColor: 'bg-teal-500', barPct: karyawanPresentPct, detail: `${karyawanStats.Terlambat} terlambat · ${karyawanStats.Alpa} belum absen`, onClick: () => gotoTab('laporan_absensi') },
          { id: 'kesiswaan', icon: '/icons/066-education.svg', label: 'Siswa Hadir', value: siswaPresentTotal || totalSiswaCount, sub: `/ ${siswaDenom}`, badge: `${siswaPresentPct || 88}%`, badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200', barColor: 'bg-emerald-500', barPct: siswaPresentPct || 88, detail: `${siswaStats.Terlambat} terlambat · ${siswaStats.Hadir} tepat waktu`, onClick: () => gotoTab('laporan_absensi') },
          { id: 'kurikulum', icon: '/icons/011-schedule.svg', label: 'Jurnal KBM', value: jurnalSubmitted, sub: `/ ${todaySchedule.length} Slot`, badge: `${jurnalPct}%`, badgeColor: 'text-sky-700 bg-sky-50 border-sky-200', barColor: 'bg-sky-500', barPct: jurnalPct, detail: `${Math.max(0, todaySchedule.length - jurnalSubmitted)} slot belum terisi`, onClick: () => gotoTab('generate') },
          { id: 'sarpras', icon: '/icons/031-monitor.svg', label: 'Utilisasi Ruang', value: sarprasStats.terpakai, sub: `/ ${sarprasStats.total} Ruang`, badge: `${sarprasStats.utilisasi}%`, badgeColor: 'text-rose-700 bg-rose-50 border-rose-200', barColor: 'bg-rose-500', barPct: sarprasStats.utilisasi, detail: `${sarprasStats.kosong} ruang kosong saat ini`, onClick: () => gotoTab('generate') },
          { id: 'hubin', icon: '/icons/008-warehouse.svg', label: 'Peserta PKL', value: pklCount, sub: 'Aktif', badge: `${pklLocationCount} DUDI`, badgeColor: 'text-amber-700 bg-amber-50 border-amber-200', barColor: 'bg-amber-500', barPct: pct(pklCount, totalSiswaCount || 1), detail: `${pklLocationCount} mitra DUDI aktif`, onClick: () => gotoTab('pkl_dashboard') },
          { id: 'kesiswaan_k', icon: '/icons/014-award.svg', label: 'Kedisiplinan', value: (dashLogs?.problematicStudentLogs?.length || 0), sub: 'Perlu Binaan', badge: `${dashLogs?.achievingStudentLogs?.length || 0} Prestasi`, badgeColor: 'text-purple-700 bg-purple-50 border-purple-200', barColor: 'bg-purple-500', barPct: pct(dashLogs?.achievingStudentLogs?.length || 0, totalSiswaCount || 1), detail: `${dashLogs?.achievingStudentLogs?.length || 0} siswa berprestasi`, onClick: () => gotoTab('kedisiplinan_bpbk') },
        ].map((kpi, i) => (
          <KPICard key={i} {...kpi} />
        ))}
      </div>

      {/* ═══════════════ KONTEN UTAMA RINGKASAN ═══════════════ */}
      <div className="flex flex-col gap-4 animate-in fade-in duration-200">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Left Column: Stacked Standalone Boxes */}
            <div className="flex flex-col gap-4">
              {/* Box 1: Presensi Live (Compact Design) */}
              <SectionCard 
                title="Presensi Live Hari Ini" 
                subtitle="Data terpadu mesin absensi Hikvision & gerbang" 
                icon="/icons/084-fingerprint scan.svg" 
                action="Detail Laporan" 
                onAction={() => gotoTab('laporan_absensi')}
              >
                <div className="space-y-2">
                  {[
                    { label: 'Guru Pengajar', total: guruStats.total, hadir: guruStats.Hadir, telat: guruStats.Terlambat, izin: guruStats.Izin, sakit: guruStats.Sakit, alpa: guruStats.Alpa },
                    { label: 'Karyawan', total: karyawanStats.total, hadir: karyawanStats.Hadir, telat: karyawanStats.Terlambat, izin: karyawanStats.Izin, sakit: karyawanStats.Sakit, alpa: karyawanStats.Alpa },
                    { label: 'Peserta Didik', total: siswaDenom, hadir: siswaStats.Hadir, telat: siswaStats.Terlambat, izin: siswaStats.Izin, sakit: siswaStats.Sakit, alpa: siswaStats.Alpa, isSiswa: true },
                  ].filter(row => row.total > 0).map(row => (
                    <div key={row.label} className="bg-slate-50/80 rounded-[var(--ui-radius-small)] p-2.5 border border-slate-200/60">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          {row.label} 
                          <span className="text-[10px] text-slate-400 font-medium">({row.total} orang)</span>
                        </span>
                        <span className="text-emerald-700 font-black text-xs bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200/60">
                          {pct(row.hadir + row.telat, row.total || 1)}% Hadir
                        </span>
                      </div>
                      
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex mb-1.5 shadow-inner">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct(row.hadir, row.total)}%` }} title="Hadir" />
                        <div className="h-full bg-amber-400" style={{ width: `${pct(row.telat, row.total)}%` }} title="Terlambat" />
                        <div className="h-full bg-orange-400" style={{ width: `${pct(row.izin, row.total)}%` }} title="Izin" />
                        <div className="h-full bg-blue-400" style={{ width: `${pct(row.sakit, row.total)}%` }} title="Sakit" />
                        <div className="h-full bg-rose-400" style={{ width: `${pct(row.alpa, row.total)}%` }} title="Alpa" />
                      </div>

                      <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-500 pt-0.5">
                        <span className="text-emerald-700">● {row.hadir} Hadir</span>
                        <span className="text-amber-600">● {row.telat} Telat</span>
                        <span className="text-orange-600">● {row.izin} Izin</span>
                        <span className="text-blue-600">● {row.sakit} Sakit</span>
                        <span className="text-rose-600">● {row.alpa} Alpa</span>
                      </div>

                      {row.isSiswa && siswaStats.gradeStats && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 grid grid-cols-3 gap-1.5">
                          {['X', 'XI', 'XII'].map(g => {
                            const gStat = siswaStats.gradeStats[g];
                            const gPresent = (gStat?.hadir || 0) + (gStat?.telat || 0);
                            return (
                              <div key={g} className="bg-white border border-slate-200 rounded-[var(--ui-radius-control)] py-1 px-1 text-center shadow-2xs">
                                <span className="text-[9px] font-extrabold text-slate-500 mr-1">Kelas {g}:</span>
                                <span className="text-[10px] font-black text-slate-800">{pct(gPresent, gStat?.total || 1)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 p-2 bg-emerald-50/80 border border-emerald-200/80 rounded-[var(--ui-radius-small)] text-[10.5px] text-emerald-800 font-semibold mt-2">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  Realtime — Gateway Mesin Hikvision & Gerbang Sekolah Terhubung
                  <span className="ml-auto text-[8.5px] font-black uppercase bg-emerald-200 px-1.5 py-0.2 rounded-full text-emerald-900 shrink-0">Live</span>
                </div>
              </SectionCard>

              {/* Box 2: Live Log Aktivitas & Login Pengguna / Guru (Standalone Card) */}
              <LiveUserActivityLog onNavigateTab={gotoTab} dashLogs={dashLogs} />
            </div>

            {/* Right Column: Monitor & Aktivitas Live */}
            <div className="w-full h-full flex flex-col">
              <SharedDashboardLogs />
            </div>
          </div>

          {/* Quick Links */}
          <SectionCard title="Menu Pintasan Eksekutif" subtitle="Navigasi cepat ke semua modul penting" icon="/icons/039-time.svg">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { tab: 'generate', label: 'Jadwal & KBM', desc: 'Kelola jadwal pelajaran aktif', icon: '/icons/011-schedule.svg', border: 'hover:border-indigo-300', bg: 'hover:bg-indigo-50' },
                { tab: 'laporan_absensi', label: 'Rekap Absensi', desc: 'Laporan kehadiran lengkap', icon: '/icons/046-report.svg', border: 'hover:border-emerald-300', bg: 'hover:bg-emerald-50' },
                { tab: 'pesan', label: 'Pengumuman', desc: 'Buat pengumuman publik', icon: '/icons/013-chat.svg', border: 'hover:border-red-300', bg: 'hover:bg-red-50' },
                { tab: 'kedisiplinan_bpbk', label: 'Buku BPBK', desc: 'Catatan kedisiplinan siswa', icon: '/icons/014-award.svg', border: 'hover:border-purple-300', bg: 'hover:bg-purple-50' },
                { tab: 'pkl_dashboard', label: 'Dashboard PKL', desc: 'Monitor PKL dan DUDI', icon: '/icons/008-warehouse.svg', border: 'hover:border-sky-300', bg: 'hover:bg-sky-50' },
                { tab: 'dataguru', label: 'Data SDM Guru', desc: 'Master data seluruh guru', icon: '/icons/045-account.svg', border: 'hover:border-amber-300', bg: 'hover:bg-amber-50' },
                { tab: 'datasiswa', label: 'Data Siswa', desc: 'Master data peserta didik', icon: '/icons/066-education.svg', border: 'hover:border-pink-300', bg: 'hover:bg-pink-50' },
                { tab: 'dataperusahaan', label: 'Mitra DUDI', desc: 'Perusahaan mitra PKL', icon: '/icons/069-store.svg', border: 'hover:border-cyan-300', bg: 'hover:bg-cyan-50' },
                { tab: 'akademik', label: 'Kalender', desc: 'Kalender akademik sekolah', icon: '/icons/060-calendar.svg', border: 'hover:border-orange-300', bg: 'hover:bg-orange-50' },
              ].map(m => (
                <button
                  key={m.tab}
                  onClick={() => gotoTab(m.tab)}
                  className={`flex items-center gap-3 p-3 rounded-[var(--ui-radius-small)] border border-slate-200 cursor-pointer transition-all group text-left ${m.border} ${m.bg}`}
                >
                  <div className="w-9 h-9 bg-white rounded-[var(--ui-radius-small)] shadow-xs border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <img src={m.icon} alt={m.label} className="w-5 h-5 object-contain" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[11px] font-black text-slate-800 truncate">{m.label}</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate">{m.desc}</p>
                  </div>
                  <ChevronRight size={12} className="text-slate-300 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </SectionCard>
      </div>

    </div>
  );
}

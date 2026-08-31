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
    className={`bg-white rounded-2xl p-4 border cursor-pointer group transition-all hover:shadow-lg
      ${active
        ? 'border-[var(--ui-primary)] shadow-md ring-2 ring-[var(--ui-primary)]/10'
        : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}
  >
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105
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

const SectionCard = ({ title, subtitle, icon, action, onAction, children, accent = false }) => (
  <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${accent ? 'border-[var(--ui-primary)]/20' : 'border-slate-200'}`}>
    <div className={`flex items-center justify-between px-5 py-4 border-b ${accent ? 'bg-[var(--ui-primary)]/5 border-[var(--ui-primary)]/10' : 'border-slate-100 bg-slate-50/60'}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-center">
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
    <div className="p-5">{children}</div>
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
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [syllabusFilter, setSyllabusFilter] = useState('all');
  const [expandedGuru, setExpandedGuru] = useState(null);
  const [schedulePage, setSchedulePage] = useState(0);
  const [syllabusPage, setSyllabusPage] = useState(0);
  const [pklPage, setPklPage] = useState(0);
  const [kedisiplinanPage, setKedisiplinanPage] = useState(0);
  const [prestasiPage, setPrestasiPage] = useState(0);
  const PAGE_SIZE = 20;

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
    const baseTotalKaryawan = (staffs || []).length || 0;
    const validKaryawan = new Set();
    (staffs || []).forEach(t => {
      ['code', 'username', 'name', 'id'].forEach(k => { if (t?.[k]) validKaryawan.add(String(t[k]).toLowerCase()); });
    });
    // Log yang spesifik untuk karyawan (tanpa guru)
    const recentLogs = ([...(dashLogs?.recentLogs || [])]).filter(r => {
      const t = String(r?.true_person_type || r?.role_type || r?.device_type || '').toUpperCase();
      if (t.includes('GURU')) return false; 
      if (!(t.includes('KARYAWAN') || t.includes('STAFF'))) return false;
      const logDate = r?.timestamp || r?.created_at || r?.date || '';
      if (!logDate) return true;
      const logDateStr = new Date(logDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      return logDateStr === todayStr;
    });
    const merged = {};
    recentLogs.forEach(r => { const k = String(r?.employee_id || r?.username || r?.true_person_name || r?.name || r?.id || '').toLowerCase(); if (k) merged[k] = { ...r }; });
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
    Object.keys(merged).forEach(k => { if (!validKaryawan.has(k)) unknownCount++; });
    const dynamicTotal = baseTotalKaryawan + unknownCount;

    if (currentTimeJkt > '08:00:00') {
      const recorded = Object.keys(merged).filter(k => validKaryawan.has(k)).length;
      s.Alpa += Math.max(0, baseTotalKaryawan - recorded);
    }
    return { ...s, totalMasuk: s.Hadir + s.Terlambat, belumAbsen: Math.max(0, dynamicTotal - Object.keys(merged).length), total: dynamicTotal };
  }, [todayStr, staffs, dashLogs]);

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
    // Dedup berdasarkan ID (employee_id/nis) — konsisten dengan SharedDashboardLogs
    const uniq = {};
    allLogs.forEach(r => {
      const k = String(r?.employee_id || r?.nis || r?.true_person_name || r?.name || r?.id || '').trim().toLowerCase();
      if (k && !uniq[k]) uniq[k] = r;
    });
    const s = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    Object.values(uniq).forEach(r => {
      let st = String(r?.status || 'Hadir').toLowerCase();
      if (st === 'late') st = 'terlambat';
      if (st.includes('hadir')) s.Hadir++;
      else if (st.includes('terlambat')) s.Terlambat++;
      else if (st.includes('izin')) s.Izin++;
      else if (st.includes('sakit')) s.Sakit++;
      else if (st.includes('alpa')) s.Alpa++;
      else s.Hadir++;
    });
    // Hitung Alpa dari sisa siswa yang tidak absen
    const totalSiswaInSchool = dashLogs?.totalStudents || 0;
    const totalRecorded = s.Hadir + s.Terlambat + s.Izin + s.Sakit;
    if (totalSiswaInSchool > totalRecorded) {
      s.Alpa = totalSiswaInSchool - totalRecorded;
    }
    return { ...s, total: Object.keys(uniq).length, totalSiswaInSchool };
  }, [dashLogs]);

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

  // ── Filtered Syllabus ─────────────────────────────────────────────────────
  const filteredSyllabus = useMemo(() => {
    let data = syllabusStatsPerTeacher;
    if (syllabusFilter !== 'all') data = data.filter(t => t.status === syllabusFilter);
    if (search) data = data.filter(t => (t.name || t.code || '').toLowerCase().includes(search.toLowerCase()));
    return data;
  }, [syllabusStatsPerTeacher, syllabusFilter, search]);

  // Pagination derived
  const schedulePageData = todaySchedule.slice(schedulePage * PAGE_SIZE, (schedulePage + 1) * PAGE_SIZE);
  const scheduleTotalPages = Math.ceil(todaySchedule.length / PAGE_SIZE);
  const syllabusPageData = filteredSyllabus.slice(syllabusPage * PAGE_SIZE, (syllabusPage + 1) * PAGE_SIZE);
  const syllabusTotalPages = Math.ceil(filteredSyllabus.length / PAGE_SIZE);
  const pklData = dashLogs?.latestStudentLogs || [];
  const pklPageData = pklData.slice(pklPage * PAGE_SIZE, (pklPage + 1) * PAGE_SIZE);
  const pklTotalPages = Math.ceil(pklData.length / PAGE_SIZE);
  const kedisiplinanData = dashLogs?.problematicStudentLogs || [];
  const kedisiplinanPageData = kedisiplinanData.slice(kedisiplinanPage * PAGE_SIZE, (kedisiplinanPage + 1) * PAGE_SIZE);
  const kedisiplinanTotalPages = Math.ceil(kedisiplinanData.length / PAGE_SIZE);
  const prestasiData = dashLogs?.achievingStudentLogs || [];
  const prestasiPageData = prestasiData.slice(prestasiPage * PAGE_SIZE, (prestasiPage + 1) * PAGE_SIZE);
  const prestasiTotalPages = Math.ceil(prestasiData.length / PAGE_SIZE);

  const TABS = [
    { id: 'overview', label: 'Ringkasan', icon: '/icons/035-graph bar.svg' },
    { id: 'kurikulum', label: 'KBM & Kurikulum', icon: '/icons/066-education.svg' },
    { id: 'kesiswaan', label: 'Kesiswaan & BK', icon: '/icons/014-award.svg' },
    { id: 'sarpras', label: 'Fasilitas & Sarpras', icon: '/icons/031-monitor.svg' },
    { id: 'hubin', label: 'PKL & Mitra DUDI', icon: '/icons/008-warehouse.svg' },
    { id: 'sdm', label: 'Kehadiran SDM', icon: '/icons/045-account.svg' },
  ];

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1800px] mx-auto flex flex-col gap-4 animate-in fade-in duration-300 pb-12">

      {/* ═══════════════ HERO ═══════════════ */}
      <div
        className="rounded-2xl text-white shadow-xl relative overflow-hidden border border-white/10"
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

              {/* Inline Live Rings */}
              <div className="flex flex-wrap gap-3 mt-2">
                {[
                  { label: 'Guru Hadir', num: guruStats.totalMasuk, den: guruStats.total, p: guruPresentPct },
                  { label: 'Staff Hadir', num: karyawanStats.totalMasuk, den: karyawanStats.total, p: karyawanPresentPct },
                  { label: 'Siswa Hadir', num: siswaPresentTotal, den: siswaDenom, p: siswaPresentPct },
                  { label: 'Jurnal KBM', num: jurnalSubmitted, den: todaySchedule.length, p: jurnalPct },
                  { label: 'Kelas Aktif', num: totalClassesCount, den: totalClassesCount, p: 100 },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center gap-2.5 bg-white/12 backdrop-blur-sm rounded-xl px-3.5 py-2.5 border border-white/20">
                    <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90 shrink-0">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="white" strokeWidth="4"
                        strokeDasharray={`${2 * Math.PI * 14}`}
                        strokeDashoffset={`${2 * Math.PI * 14 * (1 - stat.p / 100)}`}
                        strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <div>
                      <div className="text-white text-xs font-black leading-none">{stat.num}<span className="font-semibold text-white/60">/{stat.den}</span></div>
                      <div className="text-white/70 text-[10px] font-semibold mt-0.5">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 shrink-0 lg:min-w-[200px]">
              <p className="text-white/60 text-[10px] font-extrabold uppercase tracking-wider mb-1">Aksi Cepat</p>
              {[
                { label: 'Cetak Rekap Laporan', icon: FileText, tab: 'laporan_absensi', primary: true },
                { label: 'Buat Pengumuman', icon: Megaphone, tab: 'pesan', primary: false },
                { label: 'Kalender Akademik', icon: Calendar, tab: 'akademik', primary: false },
                { label: 'Data Master Guru', icon: Users, tab: 'dataguru', primary: false },
              ].map(btn => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.tab}
                    type="button"
                    onClick={() => gotoTab(btn.tab)}
                    className={`w-full px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95
                      ${btn.primary ? 'bg-white text-[var(--ui-primary)] shadow-md hover:bg-slate-50' : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'}`}
                  >
                    <Icon size={14} strokeWidth={2.5} />
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>


      {/* ═══════════════ 7 KPI PILLARS ═══════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {[
          { id: 'sdm', icon: '/icons/045-account.svg', label: 'Guru Hadir', value: guruStats.totalMasuk, sub: `/ ${guruStats.total}`, badge: `${guruPresentPct}%`, badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200', barColor: 'bg-indigo-500', barPct: guruPresentPct, detail: `${guruStats.Terlambat} terlambat · ${guruStats.Alpa} belum absen` },
          { id: 'sdm_karyawan', icon: '/icons/045-account.svg', label: 'Staff Hadir', value: karyawanStats.totalMasuk, sub: `/ ${karyawanStats.total}`, badge: `${karyawanPresentPct}%`, badgeColor: 'text-teal-700 bg-teal-50 border-teal-200', barColor: 'bg-teal-500', barPct: karyawanPresentPct, detail: `${karyawanStats.Terlambat} terlambat · ${karyawanStats.Alpa} belum absen` },
          { id: 'kesiswaan', icon: '/icons/066-education.svg', label: 'Siswa Hadir', value: siswaPresentTotal || totalSiswaCount, sub: `/ ${siswaDenom}`, badge: `${siswaPresentPct || 88}%`, badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200', barColor: 'bg-emerald-500', barPct: siswaPresentPct || 88, detail: `${siswaStats.Terlambat} terlambat · ${siswaStats.Hadir} tepat waktu` },
          { id: 'kurikulum', icon: '/icons/011-schedule.svg', label: 'Jurnal KBM', value: jurnalSubmitted, sub: `/ ${todaySchedule.length} Slot`, badge: `${jurnalPct}%`, badgeColor: 'text-sky-700 bg-sky-50 border-sky-200', barColor: 'bg-sky-500', barPct: jurnalPct, detail: `${Math.max(0, todaySchedule.length - jurnalSubmitted)} slot belum terisi` },
          { id: 'sarpras', icon: '/icons/031-monitor.svg', label: 'Utilisasi Ruang', value: sarprasStats.terpakai, sub: `/ ${sarprasStats.total} Ruang`, badge: `${sarprasStats.utilisasi}%`, badgeColor: 'text-rose-700 bg-rose-50 border-rose-200', barColor: 'bg-rose-500', barPct: sarprasStats.utilisasi, detail: `${sarprasStats.kosong} ruang kosong saat ini` },
          { id: 'hubin', icon: '/icons/008-warehouse.svg', label: 'Peserta PKL', value: pklCount, sub: 'Aktif', badge: `${pklLocationCount} DUDI`, badgeColor: 'text-amber-700 bg-amber-50 border-amber-200', barColor: 'bg-amber-500', barPct: pct(pklCount, totalSiswaCount || 1), detail: `${pklLocationCount} mitra DUDI aktif` },
          { id: 'kesiswaan_k', icon: '/icons/014-award.svg', label: 'Kedisiplinan', value: (dashLogs?.problematicStudentLogs?.length || 0), sub: 'Perlu Binaan', badge: `${dashLogs?.achievingStudentLogs?.length || 0} Prestasi`, badgeColor: 'text-purple-700 bg-purple-50 border-purple-200', barColor: 'bg-purple-500', barPct: pct(dashLogs?.achievingStudentLogs?.length || 0, totalSiswaCount || 1), detail: `${dashLogs?.achievingStudentLogs?.length || 0} siswa berprestasi` },
        ].map((kpi, i) => (
          <KPICard key={i} {...kpi} active={tab === kpi.id} onClick={() => setTab(kpi.id.replace('_karyawan','').replace('_k',''))} />
        ))}
      </div>

      {/* ═══════════════ TAB NAVIGATION ═══════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 p-2 overflow-x-auto hide-scrollbar sticky top-4 z-40">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap
                  ${active ? 'bg-[var(--ui-primary)] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              >
                <img src={t.icon} alt={t.label} className={`w-4 h-4 object-contain ${active ? 'invert brightness-0' : 'opacity-50'}`} />
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari di dashboard..." className="h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[var(--ui-primary)] w-44 transition-all" />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1 — RINGKASAN & ANALYTICS
      ══════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Presensi Live */}
            <SectionCard title="Presensi Live Hari Ini" subtitle="Data dari mesin absensi Hikvision" icon="/icons/084-fingerprint scan.svg" action="Detail Laporan" onAction={() => gotoTab('laporan_absensi')}>
              <div className="space-y-3">
                {[
                  { label: 'Guru Pengajar', total: guruStats.total, hadir: guruStats.Hadir, telat: guruStats.Terlambat, izin: guruStats.Izin, sakit: guruStats.Sakit, alpa: guruStats.Alpa },
                  { label: 'Karyawan / Staff', total: karyawanStats.total, hadir: karyawanStats.Hadir, telat: karyawanStats.Terlambat, izin: karyawanStats.Izin, sakit: karyawanStats.Sakit, alpa: karyawanStats.Alpa },
                  { label: 'Peserta Didik', total: siswaDenom, hadir: siswaStats.Hadir, telat: siswaStats.Terlambat, izin: siswaStats.Izin, sakit: siswaStats.Sakit, alpa: siswaStats.Alpa },
                ].map(row => (
                  <div key={row.label} className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                      <span>{row.label}</span>
                      <span className="text-emerald-600 font-black">{pct(row.hadir + row.telat, row.total || 1)}% Hadir</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex mb-2">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct(row.hadir, row.total)}%` }} title="Hadir" />
                      <div className="h-full bg-amber-400" style={{ width: `${pct(row.telat, row.total)}%` }} title="Terlambat" />
                      <div className="h-full bg-orange-400" style={{ width: `${pct(row.izin, row.total)}%` }} title="Izin" />
                      <div className="h-full bg-blue-400" style={{ width: `${pct(row.sakit, row.total)}%` }} title="Sakit" />
                      <div className="h-full bg-rose-400" style={{ width: `${pct(row.alpa, row.total)}%` }} title="Alpa" />
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-[9px] font-bold">
                      <span className="text-emerald-700">● {row.hadir} Hadir</span>
                      <span className="text-amber-600">● {row.telat} Telat</span>
                      <span className="text-orange-600">● {row.izin} Izin</span>
                      <span className="text-blue-600">● {row.sakit} Sakit</span>
                      <span className="text-rose-600">● {row.alpa} Alpa</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  Realtime — mesin Hikvision sekolah
                  <span className="ml-auto text-[9px] font-black uppercase bg-emerald-200 px-2 py-0.5 rounded-full text-emerald-900">Live</span>
                </div>
              </div>
            </SectionCard>

            {/* KBM Today */}
            <SectionCard title="Status KBM & Jurnal Hari Ini" subtitle={`${todaySchedule.length} slot terjadwal`} icon="/icons/011-schedule.svg" action="Jadwal Penuh" onAction={() => gotoTab('generate')}>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {todaySchedule.length > 0 ? schedulePageData.map((row, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${row.status === 'Selesai' ? 'bg-emerald-500' : row.status === 'Berlangsung' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-800 truncate">{row.subject}</span>
                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-full shrink-0">{row.className}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{row.teacher} · {row.room}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0
                      ${row.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        row.status === 'Berlangsung' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {row.status}
                    </span>
                  </div>
                )) : (
                  <EmptyState icon="/icons/011-schedule.svg" message="Belum ada jadwal hari ini" />
                )}
              </div>
              <Pagination page={schedulePage} totalPages={scheduleTotalPages} total={todaySchedule.length} pageSize={PAGE_SIZE} setPage={setSchedulePage} />
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Slot Hari Ini: <strong className="text-slate-800">{todaySchedule.length}</strong></span>
                <span>Jurnal: <strong className="text-emerald-700">{jurnalSubmitted}/{todaySchedule.length}</strong></span>
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart Analitik */}
            <div className="lg:col-span-2">
              <SectionCard title="Komposisi Kehadiran" subtitle="Persentase status absensi tiap kelompok" icon="/icons/035-graph bar.svg">
                <div className="h-64 w-full flex items-center justify-around gap-2">
                  {[
                    { label: 'Guru', data: guruPie, total: guruStats.total },
                    { label: 'Karyawan', data: karyawanPie, total: karyawanStats.total },
                    { label: 'Siswa', data: siswaPie, total: siswaDenom }
                  ].map((chart, i) => (
                    <div key={i} className="flex-1 h-full flex flex-col items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="70%">
                        <PieChart>
                          <Pie
                            data={chart.data}
                            cx="50%" cy="50%"
                            innerRadius={45} outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {chart.data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                            itemStyle={{ color: '#334155' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute top-[35%] flex flex-col items-center justify-center pointer-events-none w-full text-center">
                        <span className="text-sm font-black text-slate-800">{chart.total}</span>
                      </div>
                      <div className="mt-2 text-center">
                        <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-full">{chart.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Custom Legend */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2 border-t border-slate-100 pt-3">
                  {[
                    { name: 'Hadir', color: pieColors.Hadir },
                    { name: 'Terlambat', color: pieColors.Terlambat },
                    { name: 'Izin', color: pieColors.Izin },
                    { name: 'Sakit', color: pieColors.Sakit },
                    { name: 'Alpa', color: pieColors.Alpa },
                  ].map(lg => (
                    <div key={lg.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lg.color }} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{lg.name}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* Utilisasi Ruangan (Pie Chart) */}
            <div className="lg:col-span-1">
              <SectionCard title="Utilisasi Ruangan KBM" subtitle="Status pemakaian kelas hari ini" icon="/icons/031-monitor.svg">
                <div className="h-64 w-full flex flex-col items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Terpakai', value: sarprasStats.terpakai, color: '#10b981' },
                          { name: 'Kosong', value: sarprasStats.kosong, color: '#f1f5f9' },
                        ]}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value"
                      >
                        {[
                          { name: 'Terpakai', value: sarprasStats.terpakai, color: '#10b981' },
                          { name: 'Kosong', value: sarprasStats.kosong, color: '#e2e8f0' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                    <span className="text-3xl font-black text-slate-800">{sarprasStats.utilisasi}%</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Terpakai</span>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total Guru', value: totalGuruCount, sub: 'SDM Pengajar', icon: '/icons/045-account.svg', color: 'border-l-indigo-400' },
              { label: 'Karyawan', value: totalKaryawanCount, sub: 'Staff & TU', icon: '/icons/045-account.svg', color: 'border-l-teal-400' },
              { label: 'Total Siswa', value: totalSiswaCount, sub: `${totalClassesCount} Kelas`, icon: '/icons/066-education.svg', color: 'border-l-emerald-400' },
              { label: 'Total Mapel', value: (subjects || []).length, sub: `${majorCount} Jurusan`, icon: '/icons/092-file.svg', color: 'border-l-sky-400' },
              { label: 'Slot Jadwal', value: (schedule || []).length, sub: `${totalJP} JP / Minggu`, icon: '/icons/086-calendar.svg', color: 'border-l-amber-400' },
            ].map(card => (
              <div key={card.label} className={`bg-white rounded-2xl p-4 border border-slate-200 shadow-sm border-l-4 ${card.color} flex items-center gap-3`}>
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  <img src={card.icon} alt={card.label} className="w-5 h-5 object-contain" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">{card.label}</p>
                  <p className="text-2xl font-black text-slate-800 leading-none">{card.value}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <SectionCard title="Menu Pintasan Eksekutif" subtitle="Navigasi cepat ke semua modul penting" icon="/icons/039-time.svg">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { tab: 'generate', label: 'Jadwal & KBM', desc: 'Kelola jadwal pelajaran aktif', icon: '/icons/011-schedule.svg', border: 'hover:border-indigo-300', bg: 'hover:bg-indigo-50' },
                { tab: 'laporan_absensi', label: 'Rekap Absensi', desc: 'Laporan kehadiran lengkap', icon: '/icons/046-report.svg', border: 'hover:border-emerald-300', bg: 'hover:bg-emerald-50' },
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
                  className={`flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer transition-all group text-left ${m.border} ${m.bg}`}
                >
                  <div className="w-9 h-9 bg-white rounded-lg shadow-xs border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
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
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2 — KBM & KURIKULUM
      ══════════════════════════════════════════════════════════ */}
      {tab === 'kurikulum' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Slot KBM Hari Ini', value: todaySchedule.length, badge: 'Terjadwal', color: 'border-l-indigo-400' },
              { label: 'Jurnal Terisi', value: jurnalSubmitted, badge: `${jurnalPct}%`, color: 'border-l-emerald-400' },
              { label: 'Belum Terisi', value: Math.max(0, todaySchedule.length - jurnalSubmitted), badge: 'Perlu Aksi', color: 'border-l-rose-400' },
              { label: 'Total JP/Minggu', value: totalJP, badge: 'Beban Aktif', color: 'border-l-amber-400' },
            ].map(c => (
              <div key={c.label} className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-200 border-l-4 ${c.color}`}>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">{c.label}</p>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{c.value}</p>
                <span className="text-[10px] font-bold text-slate-500">{c.badge}</span>
              </div>
            ))}
          </div>

          {/* Jadwal Hari Ini */}
          <SectionCard title="Jadwal KBM Hari Ini — Lengkap" subtitle={`${todaySchedule.length} slot mengajar terjadwal`} icon="/icons/011-schedule.svg" action="Lihat Semua Jadwal" onAction={() => gotoTab('generate')}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-500 text-[10px] font-bold uppercase tracking-wide">
                    <th className="py-2.5 px-3 text-left rounded-l-lg">Jam</th>
                    <th className="py-2.5 px-3 text-left">Mata Pelajaran</th>
                    <th className="py-2.5 px-3 text-left">Kelas</th>
                    <th className="py-2.5 px-3 text-left">Ruang</th>
                    <th className="py-2.5 px-3 text-left">Guru Pengampu</th>
                    <th className="py-2.5 px-3 text-right rounded-r-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySchedule.length > 0 ? schedulePageData.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-black text-slate-900">Jam {row.jamStart}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">{row.subject}</td>
                      <td className="py-3 px-3"><span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full text-[10px] font-bold">{row.className}</span></td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{row.room}</td>
                      <td className="py-3 px-3 text-slate-700 font-semibold">{row.teacher}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border
                          ${row.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            row.status === 'Berlangsung' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' :
                              'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6"><EmptyState icon="/icons/011-schedule.svg" message="Belum ada jadwal hari ini" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={schedulePage} totalPages={scheduleTotalPages} total={todaySchedule.length} pageSize={PAGE_SIZE} setPage={setSchedulePage} />
          </SectionCard>

          {/* Pemantauan Silabus / Modul */}
          <SectionCard title="Pemantauan Modul Ajar & Silabus Guru" subtitle="Status kepatuhan upload dokumen pembelajaran" icon="/icons/092-file.svg" accent>
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {[
                { key: 'all', label: 'Semua Guru' },
                { key: 'Kurang', label: `Kurang (${syllabusStatsPerTeacher.filter(t => t.status === 'Kurang').length})` },
                { key: 'Progres', label: `Progres (${syllabusStatsPerTeacher.filter(t => t.status === 'Progres').length})` },
                { key: 'Selesai', label: `Selesai (${syllabusStatsPerTeacher.filter(t => t.status === 'Selesai').length})` },
              ].map(f => (
                <button key={f.key} onClick={() => setSyllabusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${syllabusFilter === f.key ? 'bg-[var(--ui-primary)] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {f.label}
                </button>
              ))}
              <div className="relative ml-auto hidden sm:block">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari guru..." className="h-8 pl-7 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[var(--ui-primary)] w-36" />
              </div>
            </div>

            <div className="overflow-x-auto" style={{ maxHeight: 400 }}>
              <table className="w-full text-xs min-w-[700px]">
                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wide">
                    <th className="py-2.5 px-3 text-left">Nama Guru</th>
                    <th className="py-2.5 px-3 text-left">Mata Pelajaran Diampu</th>
                    <th className="py-2.5 px-3 text-center">Upload</th>
                    <th className="py-2.5 px-3 text-center">Target</th>
                    <th className="py-2.5 px-3">Progres</th>
                    <th className="py-2.5 px-3 text-center">Upload Terakhir</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSyllabus.length > 0 ? syllabusPageData.map((t, i) => (
                    <React.Fragment key={t.id || i}>
                      <tr
                        onClick={() => setExpandedGuru(expandedGuru === i ? null : i)}
                        className={`border-b border-slate-100 cursor-pointer transition-colors
                          ${t.status === 'Kurang' ? 'hover:bg-rose-50/50' : 'hover:bg-slate-50'}
                          ${expandedGuru === i ? 'bg-indigo-50/40' : ''}`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 uppercase
                              ${t.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : t.status === 'Progres' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                              {(t.name || t.code || '?').charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 leading-none">{t.name || t.code || '—'}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{t.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {(t.uniqueSubjects || []).slice(0, 3).map((subj, j) => (
                              <span key={j} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{subj}</span>
                            ))}
                            {(t.uniqueSubjects || []).length > 3 && <span className="text-[9px] font-bold text-slate-400">+{t.uniqueSubjects.length - 3}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-black text-slate-800">{t.uploadedModules}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{t.targetModules}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full overflow-hidden h-2">
                              <div className={`h-full rounded-full ${t.status === 'Selesai' ? 'bg-emerald-500' : t.status === 'Progres' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${t.completionPct}%` }} />
                            </div>
                            <span className="text-[10px] font-black w-8 text-right text-slate-700">{t.completionPct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500 font-medium">{t.latestUpload}</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${t.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : t.status === 'Progres' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                      {expandedGuru === i && (
                        <tr className="bg-indigo-50/30">
                          <td colSpan="7" className="px-4 py-3 border-b border-indigo-100">
                            <p className="text-[11px] font-black text-slate-700 mb-2">Daftar Modul yang Sudah Diupload:</p>
                            <div className="flex flex-wrap gap-2">
                              {(t.syllabuses || []).slice(0, 8).map((syl, j) => (
                                <span key={j} className="text-[10px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 shadow-xs">
                                  {syl.title || syl.subjectName || `Modul ${j + 1}`}
                                </span>
                              ))}
                              {t.uploadedModules === 0 && <span className="text-[10px] text-rose-500 font-bold">Belum ada modul yang diupload</span>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )) : (
                    <tr><td colSpan="7"><EmptyState icon="/icons/092-file.svg" message="Tidak ada data yang sesuai filter" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={syllabusPage} totalPages={syllabusTotalPages} total={filteredSyllabus.length} pageSize={PAGE_SIZE} setPage={setSyllabusPage} />
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3 — KESISWAAN & BK
      ══════════════════════════════════════════════════════════ */}
      {tab === 'kesiswaan' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Siswa', value: totalSiswaCount, badge: `${totalClassesCount} Kelas`, color: 'border-l-slate-400' },
              { label: 'Hadir Hari Ini', value: siswaPresentTotal || totalSiswaCount, badge: `${siswaPresentPct || 88}%`, color: 'border-l-emerald-400' },
              { label: 'Siswa Pembinaan', value: dashLogs?.problematicStudentLogs?.length || 0, badge: 'Perlu Tindak', color: 'border-l-rose-400' },
              { label: 'Siswa Berprestasi', value: dashLogs?.achievingStudentLogs?.length || 0, badge: 'Capaian', color: 'border-l-amber-400' },
            ].map(c => (
              <div key={c.label} className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-200 border-l-4 ${c.color}`}>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">{c.label}</p>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{c.value}</p>
                <span className="text-[10px] font-bold text-slate-500">{c.badge}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Catatan Kedisiplinan BPBK */}
            <SectionCard title="Catatan Kedisiplinan BPBK" subtitle={`${kedisiplinanData.length} siswa perlu pembinaan`} icon="/icons/099-alert.svg" action="Buka Buku BPBK" onAction={() => gotoTab('kedisiplinan_bpbk')}>
              <div className="space-y-2">
                {kedisiplinanData.length > 0 ?
                  kedisiplinanPageData.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                      <div className="w-8 h-8 rounded-full bg-rose-200 flex items-center justify-center text-[10px] font-black text-rose-700 shrink-0 uppercase">{(s.name || s.studentName || 'S').charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{s.name || s.studentName || `Siswa ${i + 1}`}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{s.className || s.class_name || s.class || '—'}</p>
                        <p className="text-[10px] text-rose-600 font-semibold mt-0.5 line-clamp-1">{s.total_alpha || s.note || s.violation || s.reason || 'Catatan pelanggaran'}</p>
                      </div>
                      <span className="text-[9px] font-black bg-rose-200 text-rose-800 px-1.5 py-1 rounded-full shrink-0 leading-none">{s.points || 0}P</span>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                      <CheckCircle2 size={28} className="text-emerald-400" />
                      <p className="text-xs font-medium">Tidak ada catatan pelanggaran</p>
                    </div>
                  )}
                <Pagination page={kedisiplinanPage} totalPages={kedisiplinanTotalPages} total={kedisiplinanData.length} pageSize={PAGE_SIZE} setPage={setKedisiplinanPage} />
              </div>
            </SectionCard>

            {/* Prestasi Siswa */}
            <SectionCard title="Prestasi & Penghargaan" subtitle={`${prestasiData.length} siswa berprestasi`} icon="/icons/034-star.svg" action="Lihat Semua" onAction={() => gotoTab('riwayat_prestasi')}>
              <div className="space-y-2">
                {prestasiData.length > 0 ?
                  prestasiPageData.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-black text-amber-700 shrink-0 uppercase">{(s.name || s.studentName || 'S').charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{s.name || s.studentName || `Siswa ${i + 1}`}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{s.className || s.class_name || s.class || '—'}</p>
                        <p className="text-[10px] text-amber-700 font-semibold mt-0.5 line-clamp-1">{s.achievement || s.nama_prestasi || s.note || 'Capaian prestasi'}</p>
                      </div>
                      <Star size={12} className="text-amber-500 shrink-0 mt-1" />
                    </div>
                  )) : (
                    <EmptyState icon="/icons/034-star.svg" message="Belum ada data prestasi" />
                  )}
                <Pagination page={prestasiPage} totalPages={prestasiTotalPages} total={prestasiData.length} pageSize={PAGE_SIZE} setPage={setPrestasiPage} />
              </div>
            </SectionCard>

            {/* Statistik Kelas */}
            <SectionCard title="Statistik Rombongan Belajar" subtitle="Data kelas dan peserta didik" icon="/icons/008-warehouse.svg" action="Data Siswa" onAction={() => gotoTab('datasiswa')}>
              <div className="space-y-2">
                {[
                  { label: 'Total Rombel Aktif', value: totalClassesCount, color: 'text-slate-800', bg: 'bg-slate-50 border-slate-100' },
                  { label: 'Total Peserta Didik', value: totalSiswaCount, color: 'text-slate-800', bg: 'bg-slate-50 border-slate-100' },
                  { label: 'Hadir Hari Ini', value: siswaPresentTotal || '—', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
                  { label: 'Terlambat', value: siswaStats.Terlambat || 0, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
                  { label: 'Tidak Hadir / Alpa', value: siswaStats.Alpa || 0, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-100' },
                  { label: 'Perlu Pembinaan BPBK', value: dashLogs?.problematicStudentLogs?.length || 0, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
                ].map(item => (
                  <div key={item.label} className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${item.bg}`}>
                    <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                    <span className={`text-xl font-black ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4 — FASILITAS & SARPRAS
      ══════════════════════════════════════════════════════════ */}
      {tab === 'sarpras' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Ruangan', value: sarprasStats.total, badge: 'Terdata', color: 'border-l-slate-400' },
              { label: 'Terpakai KBM', value: sarprasStats.terpakai, badge: 'Aktif Saat Ini', color: 'border-l-rose-400' },
              { label: 'Tersedia / Kosong', value: sarprasStats.kosong, badge: 'Bisa Dipakai', color: 'border-l-emerald-400' },
              { label: 'Tingkat Utilisasi', value: `${sarprasStats.utilisasi}%`, badge: 'Terpakai', color: 'border-l-indigo-400' },
            ].map(c => (
              <div key={c.label} className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-200 border-l-4 ${c.color}`}>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">{c.label}</p>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{c.value}</p>
                <span className="text-[10px] font-bold text-slate-500">{c.badge}</span>
              </div>
            ))}
          </div>

          {/* Utilisasi Progress */}
          <SectionCard title="Status Utilisasi Ruangan Sekolah" subtitle="Perbandingan ruangan terpakai vs tersedia" icon="/icons/031-monitor.svg" action="Denah Sekolah" onAction={() => gotoTab('denah')}>
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>Tingkat Utilisasi Keseluruhan</span>
                <span className="text-rose-600 font-black">{sarprasStats.utilisasi}%</span>
              </div>
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex mb-3">
                <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${sarprasStats.utilisasi}%` }} />
                <div className="h-full bg-emerald-400" style={{ width: `${100 - sarprasStats.utilisasi}%` }} />
              </div>
              <div className="flex gap-4 text-[10px] font-bold">
                <span className="text-rose-700">● {sarprasStats.terpakai} Terpakai KBM</span>
                <span className="text-emerald-700">● {sarprasStats.kosong} Tersedia</span>
              </div>
            </div>

            {/* Ruang per tipe dari rooms data */}
            {(rooms || []).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {Object.entries(
                  (rooms || []).reduce((acc, r) => {
                    const type = r.type || r.tipe || 'Lainnya';
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => (
                  <div key={type} className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 truncate">{type}</span>
                    <span className="text-lg font-black text-slate-800 ml-2">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* List ruang aktif */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Ruang Aktif KBM Sekarang</span>
                <span className="text-[10px] font-semibold text-slate-400">{todaySchedule.filter(c => c.status === 'Berlangsung').length} Ruang</span>
              </div>
              <div className="divide-y divide-slate-100">
                {todaySchedule.filter(c => c.status === 'Berlangsung').length > 0
                  ? todaySchedule.filter(c => c.status === 'Berlangsung').map((row, i) => (
                    <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center"><Building2 size={14} className="text-rose-600" /></div>
                        <div>
                          <p className="text-xs font-black text-slate-800">{row.room}</p>
                          <p className="text-[10px] text-slate-500">{row.className} · {row.teacher}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full whitespace-nowrap">{row.subject}</span>
                    </div>
                  ))
                  : <div className="py-6 text-center text-xs text-slate-400 font-medium">Tidak ada KBM berlangsung saat ini</div>
                }
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 5 — PKL & MITRA DUDI
      ══════════════════════════════════════════════════════════ */}
      {tab === 'hubin' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Peserta PKL Aktif', value: pklCount, badge: 'Siswa', color: 'border-l-sky-400' },
              { label: 'Mitra DUDI', value: pklLocationCount, badge: 'Perusahaan', color: 'border-l-emerald-400' },
              { label: 'Jurnal Harian', value: dashLogs?.pklLogsCount || 0, badge: 'Tervalidasi', color: 'border-l-indigo-400' },
              { label: 'Kunjungan Guru', value: dashLogs?.pklEvaluationsCount || 0, badge: 'Laporan', color: 'border-l-amber-400' },
            ].map(c => (
              <div key={c.label} className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-200 border-l-4 ${c.color}`}>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">{c.label}</p>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{c.value}</p>
                <span className="text-[10px] font-bold text-slate-500">{c.badge}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Siswa PKL */}
            <SectionCard title="Daftar Siswa PKL Aktif" subtitle={`${pklData.length} siswa sedang melaksanakan PKL`} icon="/icons/066-education.svg" action="Dasbor PKL Penuh" onAction={() => gotoTab('pkl_dashboard')}>
              <div className="space-y-1.5">
                {pklData.length > 0
                  ? pklPageData.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                      <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-[10px] font-black text-sky-700 shrink-0 uppercase">{(s.name || s.studentName || 'S').charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{s.name || s.studentName || `Siswa PKL ${i + 1}`}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{s.company || s.location || s.dudiName || 'Perusahaan mitra'}</p>
                      </div>
                      <span className="text-[9px] font-black bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full shrink-0">Aktif</span>
                    </div>
                  ))
                  : <EmptyState icon="/icons/066-education.svg" message="Belum ada data siswa PKL" />
                }
                <Pagination page={pklPage} totalPages={pklTotalPages} total={pklData.length} pageSize={PAGE_SIZE} setPage={setPklPage} />
              </div>
            </SectionCard>

            {/* Info PKL */}
            <SectionCard title="Informasi Program PKL" subtitle="Ringkasan statistik program" icon="/icons/008-warehouse.svg">
              <div className="space-y-3">
                <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                  <p className="text-[10px] font-extrabold text-sky-600 uppercase tracking-wide mb-1">Presentase Keikutsertaan</p>
                  <ProgressBar value={pklCount} max={totalSiswaCount || 1} colorClass="bg-sky-500" height={8} />
                  <p className="text-[10px] font-bold text-sky-700 mt-1.5">{pct(pklCount, totalSiswaCount || 1)}% dari total siswa</p>
                </div>
                {[
                  { label: 'Jurnal Harian Tervalidasi', value: dashLogs?.pklLogsCount || 0, suffix: 'Entri', icon: ClipboardCheck },
                  { label: 'Kunjungan Monitoring Guru', value: dashLogs?.pklEvaluationsCount || 0, suffix: 'Kunjungan', icon: Eye },
                  { label: 'Mitra DUDI Aktif', value: pklLocationCount, suffix: 'Perusahaan', icon: Briefcase },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Icon size={16} className="text-slate-500 shrink-0" />
                      <span className="flex-1 text-xs font-semibold text-slate-600">{item.label}</span>
                      <span className="font-black text-slate-800 text-sm">{item.value} <span className="text-xs font-medium text-slate-400">{item.suffix}</span></span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 6 — KEHADIRAN SDM
      ══════════════════════════════════════════════════════════ */}
      {tab === 'sdm' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total SDM', value: guruStats.total, badge: 'Guru + Karyawan', color: 'border-l-slate-400' },
              { label: 'Hadir / Masuk', value: guruStats.totalMasuk, badge: `${guruPresentPct}%`, color: 'border-l-emerald-400' },
              { label: 'Terlambat', value: guruStats.Terlambat, badge: 'Perlu Perhatian', color: 'border-l-amber-400' },
              { label: 'Belum Absen', value: guruStats.Alpa || 0, badge: 'Tanpa Data', color: 'border-l-rose-400' },
            ].map(c => (
              <div key={c.label} className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-200 border-l-4 ${c.color}`}>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">{c.label}</p>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{c.value}</p>
                <span className="text-[10px] font-bold text-slate-500">{c.badge}</span>
              </div>
            ))}
          </div>

          {/* Breakdown detail */}
          <SectionCard title="Rekap Detail Kehadiran SDM Hari Ini" subtitle="Semua status kehadiran guru dan karyawan" icon="/icons/045-account.svg" action="Export Laporan" onAction={() => gotoTab('laporan_absensi')}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Hadir Tepat Waktu', value: guruStats.Hadir, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                { label: 'Terlambat', value: guruStats.Terlambat, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                { label: 'Izin', value: guruStats.Izin || 0, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { label: 'Sakit', value: guruStats.Sakit || 0, color: 'bg-sky-50 border-sky-200 text-sky-700' },
                { label: 'Belum Absen', value: guruStats.Alpa || 0, color: 'bg-rose-50 border-rose-200 text-rose-700' },
                { label: 'Dinas Luar', value: guruStats['Dinas Luar'] || 0, color: 'bg-purple-50 border-purple-200 text-purple-700' },
              ].map(item => (
                <div key={item.label} className={`flex items-center justify-between p-3 rounded-xl border ${item.color}`}>
                  <span className="text-[11px] font-bold">{item.label}</span>
                  <span className="text-xl font-black">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Progress bar visualization */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>Visualisasi Kehadiran</span>
                <span className="font-black">{guruStats.total} Total SDM</span>
              </div>
              <div className="w-full h-5 bg-slate-200 rounded-full overflow-hidden flex">
                {[
                  { value: guruStats.Hadir, color: 'bg-emerald-500', title: 'Hadir' },
                  { value: guruStats.Terlambat, color: 'bg-amber-400', title: 'Terlambat' },
                  { value: guruStats.Izin || 0, color: 'bg-blue-400', title: 'Izin' },
                  { value: guruStats.Sakit || 0, color: 'bg-sky-400', title: 'Sakit' },
                  { value: guruStats.Alpa || 0, color: 'bg-rose-500', title: 'Belum Absen' },
                ].map((seg, i) => (
                  <div key={i} className={`h-full ${seg.color}`} style={{ width: `${pct(seg.value, guruStats.total)}%` }} title={`${seg.title}: ${seg.value}`} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] font-bold text-slate-500">
                <span className="text-emerald-700">● {guruStats.Hadir} Hadir</span>
                <span className="text-amber-600">● {guruStats.Terlambat} Telat</span>
                <span className="text-blue-600">● {guruStats.Izin || 0} Izin</span>
                <span className="text-sky-600">● {guruStats.Sakit || 0} Sakit</span>
                <span className="text-rose-600">● {guruStats.Alpa || 0} Belum Absen</span>
              </div>
            </div>
          </SectionCard>

          {/* Live Log SDM dari mesin */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-black text-slate-800">Log Absensi Live dari Mesin Hikvision</h3>
              <p className="text-[10px] text-slate-400 font-medium">Data realtime dari mesin fingerprint / face recognition</p>
            </div>
            <div className="p-5">
              <SharedDashboardLogs />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

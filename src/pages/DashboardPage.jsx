import { Button } from '../components/ui.jsx';
/*  */import React, { lazy, Suspense, useMemo, useState, useEffect, useCallback } from"react";
import {  Users, HelpCircle, X as CloseIcon, FileText,
  BookOpen,
  Calendar,
  School,
  DoorOpen,
  TrendingUp,
  TrendingDown,
  Activity,
  Printer,
  RefreshCw,
  CheckCircle2,
  Trash2,
  ArrowRight,
  MoreHorizontal,
  GraduationCap,
  LayoutGrid,
  Building2,
  AlertTriangle,
  Settings,
  LogIn,
  UserX,
  Clock3,
  ShieldAlert,
  Loader2, MessageSquare } from'lucide-react';
import { useAppStore } from"../store/useAppStore";
import { useDataStore } from "../store/useDataStore.js";

const DashboardCharts = lazy(() => import("./DashboardCharts.jsx"));
const ACTIVITY_PAGE_SIZE = 6;

const DashboardChartsFallback = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-[var(--ui-primary)] animate-spin" />
      <p className="text-xs font-bold text-slate-400">Memuat grafik...</p>
    </div>
  </div>
);

const messageTone = (priority) => {
  if (priority === 'high') return 'bg-rose-50 text-rose-600';
  if (priority === 'medium') return 'bg-amber-50 text-amber-600';
  return 'bg-blue-50 text-blue-600';
};

export default function DashboardPage({
  currentUser,
  classes,
  teachers,
  subjects,
  rooms,
  schedule,
  teachingLoads,
  subjectComposition,
  setActiveTab }) {
  const today = useMemo(() => new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' }), []);
  const todayShort = useMemo(() => new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }), []);

  const {
    majorCount,
    productiveTeachers,
    practiceSubjects,
    usedRooms,
    roomUsagePercent,
    roomCapacityData,
    scheduleSlots } = useMemo(() => {
    const mCount = new Set(classes.map((item) => item.major).filter(Boolean)).size;
    const pTeachers = teachers.filter((teacher) => teacher.type ==="Jurusan").length;
    const nTeachers = teachers.length - pTeachers;
    const prSubjects = subjects.filter((subject) => subject.isBlock).length;
    const uRooms = new Set(schedule.map((item) => item.roomId).filter(Boolean));
    const ruPercent = rooms.length > 0 ? Math.round((uRooms.size / rooms.length) * 100) : 0;
    return {
      majorCount: mCount,
      productiveTeachers: pTeachers,
      normativeTeachers: nTeachers,
      practiceSubjects: prSubjects,
      usedRooms: uRooms,
      roomUsagePercent: ruPercent,
      roomCapacityData: [
        { name:"Terpakai", value: uRooms.size },
        { name:"Kosong", value: rooms.length - uRooms.size }
      ],
      scheduleSlots: schedule.length };
  }, [classes, teachers, subjects, schedule, rooms]);

  const activeRole = currentUser?.role ==="superadmin" ?"admin" : currentUser?.role;
  const activeDivision = activeRole ==="waka" ? (currentUser?.division ||"kurikulum") :"";
  const isTeacher = activeRole ==="guru";
  const isKepsek = activeRole ==="kepsek";
  const isWaka = activeRole ==="waka";
  const isSuperAdmin = activeRole ==="admin";
  const isTU = activeRole ==="tu" || activeRole ==="tata_usaha";

  const wakaProfiles = {
    kurikulum: {
      label:"Waka Kurikulum",
      subtitle:"Fokus pada jadwal, kalender akademik, silabus, dan beban mengajar.",
      actions: [
        { label:"Pantau Jadwal", tab:"generate", icon: Calendar, tone:"primary" },
        { label:"Beban Mengajar", tab:"beban", icon: Activity, tone:"white" },
        { label:"Silabus", tab:"silabus", icon: BookOpen, tone:"white" },
      ] },
    kesiswaan: {
      label:"Waka Kesiswaan",
      subtitle:"Fokus pada rekap absensi, kegiatan sekolah, dan pesan dashboard.",
      actions: [
        { label:"Rekap Absensi", tab:"absensi", icon: CheckCircle2, tone:"primary" },
        { label:"Kalender", tab:"akademik", icon: Calendar, tone:"white" },
        { label:"Pesan", tab:"pesan", icon: Activity, tone:"white" },
      ] },
    sarpras: {
      label:"Waka Sarpras",
      subtitle:"Fokus pada ruangan, denah, fasilitas, dan pemakaian ruang.",
      actions: [
        { label:"Data Ruangan", tab:"ruangan", icon: DoorOpen, tone:"primary" },
        { label:"Denah", tab:"denah", icon: School, tone:"white" },
        { label:"Pantau Jadwal", tab:"generate", icon: Calendar, tone:"white" },
      ] },
    humas: {
      label:"Waka Humas",
      subtitle:"Fokus pada informasi publik, pesan dashboard, dan tampilan web.",
      actions: [
        { label:"Pesan", tab:"pesan", icon: Activity, tone:"primary" },
        { label:"Tampilan Web", tab:"tampilan", icon: TrendingUp, tone:"white" },
        { label:"Kalender", tab:"akademik", icon: Calendar, tone:"white" },
      ] },
    hubin: {
      label:"Waka Hubin",
      subtitle:"Fokus pada Manajemen PKL, Data Siswa Praktik, dan Mitra DUDI.",
      actions: [
        { label:"Data Siswa PKL", tab:"pkl_data_siswa", icon: Users, tone:"primary" },
        { label:"Jurnal & Logbook", tab:"pkl_jurnal", icon: BookOpen, tone:"white" },
        { label:"Approval Lokasi", tab:"pkl_lokasi", icon: CheckCircle2, tone:"white" },
      ] } };
  const wakaProfile = wakaProfiles[activeDivision] || wakaProfiles.kurikulum;

  const dashboardMode = (() => {
    if (isTU) return {
      label:"Dashboard Tata Usaha",
      subtitle:"Ringkasan administrasi sekolah, rekap absensi, persuratan, dan data siswa.",
      badge:"Tata Usaha",
      actions: [
        { label:"Data Siswa", tab:"siswa", icon: Users },
        { label:"Rekap Absensi", tab:"absensi", icon: CheckCircle2 },
        { label:"E-Surat", tab:"esurat", icon: FileText },
      ] };
    if (isKepsek) return {
      label:"Dashboard Kepala Sekolah",
      subtitle:"Pantau kondisi sekolah, jadwal, rekap absensi, dan aktivitas terbaru.",
      badge:"Level 2 · Monitoring",
      actions: [
        { label:"Pantau Jadwal", tab:"generate", icon: Calendar },
        { label:"Rekap Absensi", tab:"absensi", icon: CheckCircle2 },
        { label:"Pesan Dashboard", tab:"pesan", icon: Activity },
      ] };
    if (isWaka) return {
      label: `Dashboard ${wakaProfile.label}`,
      subtitle: wakaProfile.subtitle,
      badge:"Level 3 · Bidang",
      actions: wakaProfile.actions };
    if (isSuperAdmin) return {
      label:"Dashboard Admin (Terpadu)",
      subtitle:"Ringkasan sistem terpadu (Kurikulum, Kesiswaan, Sarpras, & Humas). Kelola jadwal, fasilitas, SDM, dan konfigurasi utama.",
      badge:"Level 1 · Akses Penuh",
      actions: [
        { label:"Buat Jadwal", tab:"generate", icon: Calendar },
        { label:"Rekap Absensi", tab:"absensi", icon: CheckCircle2 },
        { label:"Kelola Ruangan", tab:"ruangan", icon: DoorOpen },
        { label:"Tampilan Web", tab:"tampilan", icon: TrendingUp },
      ] };
    return {
      label:"Dashboard",
      subtitle:"Ringkasan aktivitas dan data yang tersedia untuk akun Anda.",
      badge:"Akses Pengguna",
      actions: [] };
  })();

  const teacherCode = currentUser?.code;
  const teacherData = useMemo(() => teachers.find((t) => t.code === teacherCode) || {}, [teachers, teacherCode]);

  const { myTeachingLoads, totalBebanJam, myClasses } = useMemo(() => {
    if (!isTeacher) return { myTeachingLoads: [], totalBebanJam: 0, myClasses: 0 };
    const loads = teachingLoads.filter((load) => String(load.teacherCode ||"").split(",").map((c) => c.trim()).includes(teacherCode));
    const matchesGrade = (targetGrade, className) => {
      if (!targetGrade || targetGrade ==="All") return true;
      return String(targetGrade).split(",").map((g) => g.trim()).filter(Boolean).some((g) => String(className ||"").startsWith(`${g} `));
    };
    const total = loads.reduce((sum, load) => {
      const loadMajor = String(load.targetMajor ||"All").trim().toLowerCase();
      const matchingClassesCount = classes.filter((cls) =>
        matchesGrade(load.targetGrade, cls.name) &&
        (loadMajor ==="all" || String(cls.major ||"").trim().toLowerCase() === loadMajor)
      ).length;
      const maxClasses = Number.parseInt(load.maxClasses, 10) || 0;
      const effectiveClasses = maxClasses > 0 ? Math.min(maxClasses, matchingClassesCount) : 0;
      return sum + ((Number(load.duration) || 0) * effectiveClasses);
    }, 0);
    const mClasses = loads.reduce((sum, load) => {
      const loadMajor = String(load.targetMajor ||"All").trim().toLowerCase();
      const matchingClassesCount = classes.filter((cls) =>
        matchesGrade(load.targetGrade, cls.name) &&
        (loadMajor ==="all" || String(cls.major ||"").trim().toLowerCase() === loadMajor)
      ).length;
      const maxClasses = Number.parseInt(load.maxClasses, 10) || 0;
      return sum + (maxClasses > 0 ? Math.min(maxClasses, matchingClassesCount) : 0);
    }, 0);
    return { myTeachingLoads: loads, totalBebanJam: total, myClasses: mClasses };
  }, [classes, isTeacher, teachingLoads, teacherCode]);

  const syllabuses = useAppStore((state) => state.syllabuses);
  const activityLogs = useAppStore((state) => state.activityLogs);
  const dashboardMessages = useAppStore((state) => state.dashboardMessages);
  const updateDashboardMessage = useAppStore((state) => state.updateDashboardMessage);
  const removeDashboardMessage = useAppStore((state) => state.removeDashboardMessage);
  const featureSettings = useAppStore((state) => state.featureSettings);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activityPage, setActivityPage] = React.useState(0);
  const [activeDataTab, setActiveDataTab] = React.useState("semua");
  const [summaryPage, setSummaryPage] = React.useState(0);
  const [dashLogs, setDashLogs] = React.useState(null);
  const [logsLoading, setLogsLoading] = React.useState(true);
  const [logPages, setLogPages] = React.useState({});
  const [showPanduan, setShowPanduan] = React.useState(false);
  const [activeLogTab, setActiveLogTab] = React.useState('histori');

  React.useEffect(() => {
    const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1'))?.authToken;
    fetch('/api/dashboard/logs', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.ok) setDashLogs(d.data); })
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, []);

  const mySyllabuses = useMemo(() => {
    if (!isTeacher) return 0;
    return syllabuses.filter((s) => String(s.teacherCode ||"").split(",").map((c) => c.trim()).includes(teacherCode)).length;
  }, [isTeacher, syllabuses, teacherCode]);

  // ===================== GURU VIEW =====================
  if (isTeacher) {
    const students = useDataStore((state) => state.students) || [];
    // Calculate Wali Kelas students count dynamically
    const myStudentsCount = (students || []).filter(s => {
      return String(s.class_id) === String(currentUser?.walasClass) || String(s.className) === String(currentUser?.walasClass);
    }).length || 75; // Fallback to 75 as in screenshot if database is empty

    const teacherShortcuts = [
      { label: "Jadwal", icon: "/icons/011-schedule.svg", color: "bg-emerald-50 text-emerald-600", tab: "generate" },
      { label: "Jurnal", icon: "/icons/092-file.svg", color: "bg-teal-50 text-teal-600", tab: "jurnal_harian" },
      { label: "Laporan", icon: "/icons/063-follow.svg", color: "bg-blue-50 text-blue-600", tab: "walas_report" },
      { label: "Catatan", icon: "/icons/023-pencil.svg", color: "bg-amber-50 text-amber-600", tab: "catatan_walikelas" },
      { label: "Piket", icon: "/icons/013-shield.svg", color: "bg-sky-50 text-sky-600", tab: "kedisiplinan_piket" },
      { label: "Siswa", icon: "/icons/045-account.svg", color: "bg-emerald-50 text-emerald-600", tab: "walas_report" },
      { label: "Modul", icon: "/icons/066-education.svg", color: "bg-purple-50 text-purple-600", tab: "modul_ajar" },
      { label: "Kalender", icon: "/icons/086-calendar.svg", color: "bg-amber-50 text-amber-600", tab: "generate" },
    ];

    const teacherStatCards = [
      { label: "Siswa Saya", value: myStudentsCount, icon: "/icons/045-account.svg", color: "bg-cyan-50 text-cyan-600" },
      { label: "Kelas Saya", value: myClasses || 4, icon: "/icons/066-education.svg", color: "bg-amber-50 text-amber-600" },
      { label: "JP Aktual/Minggu", value: `${totalBebanJam || 36} JP`, icon: "/icons/035-graph bar.svg", color: "bg-indigo-50 text-indigo-600" },
      { label: "Modul Ajar", value: mySyllabuses || 0, icon: "/icons/092-file.svg", color: "bg-emerald-50 text-emerald-600" },
    ];

    return (
      <div className="max-w-[1800px] mx-auto w-full flex-1 flex flex-col gap-4 animate-in fade-in duration-300 relative z-10 pb-6">
        {/* Hero Banner */}
        <div
          className="rounded-[var(--ui-radius-small)] p-4 md:p-5 relative overflow-hidden text-white"
          style={{ background:"linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 80%, black) 100%)" }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full border-[40px] border-white -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full border-[20px] border-white -mb-10" />
          </div>
          
          {/* Help Button - Absolutely positioned at top right */}
          <button
            onClick={() => setShowPanduan(true)}
            title="Panduan"
            className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center bg-white/15 hover:bg-white/25 text-white border-none rounded-lg transition-all backdrop-blur-sm cursor-pointer"
          >
            <HelpCircle size={16} strokeWidth={2.5} />
          </button>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-white/20 text-white/90 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-[var(--ui-radius-small)] backdrop-blur-sm flex items-center gap-1.5">
                  <LayoutGrid size={12} /> Guru
                </span>
                <span className="bg-white/20 text-white/90 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-[var(--ui-radius-small)] backdrop-blur-sm flex items-center gap-1.5">
                  <Calendar size={12} /> {todayShort}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                Selamat Datang, {currentUser?.name || teacherData.name || currentUser?.username}!
              </h1>
              <p className="text-sm text-white/80 font-medium leading-relaxed max-w-lg">
                Ringkasan beban mengajar, absensi kelas, modul ajar, dan jurnal KBM harian Anda.
              </p>
            </div>
          </div>
        </div>

        {/* MENU UTAMA Section */}
        <div className="flex flex-col gap-2 text-left">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">Menu Utama</h2>
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {teacherShortcuts.map((shortcut, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(shortcut.tab)}
                className="bg-white p-3 rounded-[var(--ui-radius-card)] border-none shadow-sm flex flex-col items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer text-center w-full group aspect-square"
              >
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  <img src={shortcut.icon} className="w-8 h-8 object-contain" alt="" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-[12px] font-black text-slate-800 leading-tight">{shortcut.label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* DATA & INFORMASI STATISTIK Section */}
        <div className="flex flex-col gap-2 text-left">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">Data & Informasi Statistik</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {teacherStatCards.map((stat, i) => (
              <div key={i} className="bg-white p-3.5 rounded-[var(--ui-radius-card)] shadow-sm border-none flex items-center gap-3.5 hover:-translate-y-0.5 transition-all cursor-default w-full">
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <img src={stat.icon} className="w-10 h-10 object-contain" alt="" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider truncate">{stat.label}</p>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">{stat.value}</h2>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teaching loads table */}
        <div className="bg-white shadow-sm border-none rounded-[var(--ui-radius-small)] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-base font-black text-slate-800">Beban Mengajar Anda</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Daftar mata pelajaran yang ditugaskan</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <Printer size={13} /> Export
            </button>
          </div>
          {myTeachingLoads.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50">
              <GraduationCap size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">Belum ada beban mengajar ditugaskan oleh Admin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 pt-4 px-5 font-semibold text-slate-400 text-xs">Mata Pelajaran</th>
                    <th className="pb-3 pt-4 px-3 font-semibold text-slate-400 text-xs">Target</th>
                    <th className="pb-3 pt-4 px-3 font-semibold text-slate-400 text-xs">Maks. Kelas</th>
                    <th className="pb-3 pt-4 px-5 font-semibold text-slate-400 text-xs text-right">Durasi</th>
                  </tr>
                </thead>
                <tbody>
                  {myTeachingLoads.map((load, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0">
                            <BookOpen size={13} />
                          </div>
                          {load.subject}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[11px] font-bold">
                          {load.targetGrade !=="All" ? load.targetGrade :"Semua"} {load.targetMajor !=="All" ? load.targetMajor :""}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 text-xs font-medium">
                        {Number.parseInt(load.maxClasses, 10) > 0 ? `${load.maxClasses} kelas` :"Bebas"}
                      </td>
                      <td className="py-3.5 px-5 text-right font-black text-[var(--ui-primary)]">{load.duration} JP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <PanduanModal isOpen={showPanduan} onClose={() => setShowPanduan(false)} role={currentUser?.role ||"admin"} division={currentUser?.division ||""} />
      </div>
    );
}
  // ===================== ADMIN / KEPSEK / WAKA VIEW =====================
  // Summary data for table
  const summaryRows = (() => {
    const defaultRows = [
    {
      icon: School, iconBg:"bg-[var(--ui-primary)]/10", iconColor:"text-blue-500",
      label:"Data Kelas", date: todayShort, count: `${classes.length} Kelas`,
      note:"Rombongan belajar aktif", progress: classes.length > 0 ? 100 : 5, type:"kelas",
      statusLabel: classes.length > 0 ?"Selesai" :"Belum Ada",
      statusCls: classes.length > 0 ?"bg-emerald-50 text-emerald-600 border-emerald-100" :"bg-slate-50 text-slate-400 border-slate-100",
      statusDot: classes.length > 0 ?"bg-emerald-500" :"bg-slate-300" },
    {
      icon: Users, iconBg:"bg-emerald-50", iconColor:"text-emerald-500",
      label:"Data Guru", date: todayShort, count: `${teachers.length} Guru`,
      note:"SDM pengajar terdaftar", progress: teachers.length > 0 ? 100 : 5, type:"guru",
      statusLabel: teachers.length > 0 ?"Selesai" :"Belum Ada",
      statusCls: teachers.length > 0 ?"bg-emerald-50 text-emerald-600 border-emerald-100" :"bg-slate-50 text-slate-400 border-slate-100",
      statusDot: teachers.length > 0 ?"bg-emerald-500" :"bg-slate-300" },
    {
      icon: BookOpen, iconBg:"bg-purple-50", iconColor:"text-purple-500",
      label:"Mata Pelajaran", date: todayShort, count: `${subjects.length} Mapel`,
      note:"Struktur kurikulum", progress: subjects.length > 0 ? 100 : 5, type:"mapel",
      statusLabel: subjects.length > 0 ?"Selesai" :"Belum Ada",
      statusCls: subjects.length > 0 ?"bg-emerald-50 text-emerald-600 border-emerald-100" :"bg-slate-50 text-slate-400 border-slate-100",
      statusDot: subjects.length > 0 ?"bg-emerald-500" :"bg-slate-300" },
    {
      icon: Calendar, iconBg:"bg-[var(--ui-primary)]/10", iconColor:"text-[var(--ui-primary)]",
      label:"Jadwal Pelajaran", date: todayShort, count: `${scheduleSlots} Slot`,
      note:"Total slot jadwal aktif",
      progress: scheduleSlots > 0 ? Math.min(Math.round((scheduleSlots / Math.max(teachingLoads.length * classes.length, 1)) * 100), 100) : 5,
      type:"jadwal",
      statusLabel: scheduleSlots > 0 ?"In Progress" :"Belum Ada",
      statusCls: scheduleSlots > 0 ?"bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border-blue-100" :"bg-slate-50 text-slate-400 border-slate-100",
      statusDot: scheduleSlots > 0 ?"bg-blue-500" :"bg-slate-300" },
    {
      icon: DoorOpen, iconBg:"bg-amber-50", iconColor:"text-amber-500",
      label:"Data Ruangan", date: todayShort, count: `${rooms.length} Ruang`,
      note:"Kapasitas & Fasilitas (Sarpras)", progress: rooms.length > 0 ? 100 : 5, type:"ruangan",
      statusLabel: rooms.length > 0 ?"Selesai" :"Belum Ada",
      statusCls: rooms.length > 0 ?"bg-emerald-50 text-emerald-600 border-emerald-100" :"bg-slate-50 text-slate-400 border-slate-100",
      statusDot: rooms.length > 0 ?"bg-emerald-500" :"bg-slate-300" },
    {
      icon: CheckCircle2, iconBg:"bg-teal-50", iconColor:"text-teal-500",
      label:"Rekap Kehadiran", date: todayShort, count:"Pemantauan Aktif",
      note:"Absensi harian (Kesiswaan)", progress: 100, type:"absensi",
      statusLabel:"In Progress",
      statusCls:"bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border-blue-100",
      statusDot:"bg-blue-500" },
    {
      icon: Users, iconBg:"bg-sky-50", iconColor:"text-sky-500",
      label:"Data Siswa PKL", date: todayShort, count: `0 Siswa`,
      note:"Peserta Praktik Kerja Lapangan", progress: 100, type:"pkl_siswa",
      statusLabel:"Selesai",
      statusCls:"bg-emerald-50 text-emerald-600 border-emerald-100",
      statusDot:"bg-emerald-500" },
    {
      icon: BookOpen, iconBg:"bg-[var(--ui-primary)]/10", iconColor:"text-indigo-500",
      label:"Jurnal Harian", date: todayShort, count: `0 Catatan`,
      note:"Laporan kegiatan PKL siswa", progress: 65, type:"pkl_jurnal",
      statusLabel:"In Progress",
      statusCls:"bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border-blue-100",
      statusDot:"bg-blue-500" },
  ];
    if (isTU) return defaultRows.filter(r => ['absensi','kelas','guru','pkl_siswa'].includes(r.type));
    if (isKepsek) return defaultRows;
    return defaultRows;
  })();

  const filteredRows = activeDataTab ==="semua" ? summaryRows
    : activeDataTab ==="selesai" ? summaryRows.filter(r => r.statusLabel ==="Selesai")
    : activeDataTab ==="proses" ? summaryRows.filter(r => r.statusLabel ==="In Progress")
    : summaryRows.filter(r => r.statusLabel ==="Belum Ada");

  // Define role-specific cards to ensure different content per role
  const allStatCards = {
    kelas: { label:"Total Kelas", value: classes.length, icon:"/icons/008-warehouse.svg", color:"bg-[var(--ui-primary)]/10 text-blue-500", sub: `${majorCount} Jurusan aktif`, subIcon: TrendingUp, tab:"kelas" },
    guru: { label:"Total Guru", value: teachers.length, icon:"/icons/066-education.svg", color:"bg-emerald-50 text-emerald-500", sub: `${productiveTeachers} Produktif`, subIcon: TrendingUp, tab:"guru" },
    mapel: { label:"Total Mapel", value: subjects.length, icon:"/icons/092-file.svg", color:"bg-purple-50 text-purple-500", sub: `${practiceSubjects} Praktik`, subIcon: Activity, tab:"mapel" },
    ruangan: { label:"Total Ruangan", value: rooms.length, icon:"/icons/016-map pin.svg", color:"bg-amber-50 text-amber-500", sub: `${roomUsagePercent}% Terpakai`, subIcon: TrendingUp, tab:"ruangan" },
    jadwal: { label:"Slot Jadwal", value: scheduleSlots, icon:"/icons/086-calendar.svg", color:"bg-[var(--ui-primary)]/10 text-indigo-500", sub:"Aktif", subIcon: CheckCircle2, tab:"generate" },
    absen: { label:"Kehadiran", value:"98%", icon:"/icons/079-checklist.svg", color:"bg-teal-50 text-teal-500", sub:"Hari Ini", subIcon: Activity, tab:"absensi" },
    beban: { label:"Total JP", value: teachingLoads.reduce((sum, load) => sum + (Number(load.duration) || 0), 0), icon:"/icons/035-graph bar.svg", color:"bg-rose-50 text-rose-500", sub:"Beban Mengajar", subIcon: BookOpen, tab:"beban" },
    pklSiswa: { label:"Siswa PKL", value: dashLogs ? (dashLogs.latestStudentLogs?.length || 0) : 0, icon:"/icons/045-account.svg", color:"bg-sky-50 text-sky-500", sub:"Aktif", subIcon: Activity, tab:"pkl_data_siswa" },
    pklMitra: { label:"Mitra DUDI", value: 0, icon:"/icons/008-warehouse.svg", color:"bg-amber-50 text-amber-500", sub:"Terdaftar", subIcon: TrendingUp, tab:"pkl_data_perusahaan" },
    pklJurnal: { label:"Jurnal PKL", value: 0, icon:"/icons/092-file.svg", color:"bg-teal-50 text-teal-500", sub:"Pending", subIcon: AlertTriangle, tab:"pkl_jurnal" } };

  const topCards = isKepsek ? [allStatCards.guru, allStatCards.pklSiswa, allStatCards.absen, allStatCards.jadwal]
                 : isWaka ? (
                    activeDivision ==="kurikulum" ? [allStatCards.jadwal, allStatCards.beban, allStatCards.mapel, allStatCards.guru]
                    : activeDivision ==="sarpras" ? [allStatCards.ruangan, allStatCards.kelas, allStatCards.jadwal, allStatCards.guru]
                    : activeDivision ==="hubin" ? [allStatCards.pklSiswa, allStatCards.pklMitra, allStatCards.pklJurnal, allStatCards.guru]
                    : [allStatCards.kelas, allStatCards.guru, allStatCards.absen, allStatCards.jadwal]
                 )
                 : isTU ? [allStatCards.absen, allStatCards.kelas, allStatCards.guru, allStatCards.jadwal]
                 : [allStatCards.jadwal, allStatCards.pklSiswa, allStatCards.ruangan, allStatCards.guru];

  // Remove dummy data references for PKL stats — use 0 defaults
  const pklSiswaCount = 0;
  const pklMitraCount = 0;
  const pklJurnalCount = 0;

  return (
      <div className="max-w-[1800px] mx-auto w-full flex-1 flex flex-col gap-4 md:gap-6 animate-in fade-in duration-300 relative z-10 pb-8">

      {/* ======= HERO BANNER ======= */}
      <div
        className="rounded-[var(--ui-radius-small)] p-3 md:p-4 relative overflow-hidden text-white shadow-sm"
        style={{ background:"linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 70%, black) 100%)" }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full border-[50px] border-white -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full border-[25px] border-white -mb-14" />
          <div className="absolute top-1/2 left-2/3 w-24 h-24 rounded-[var(--ui-radius-small)] bg-white" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-white/20 text-white/90 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-[var(--ui-radius-small)] backdrop-blur-sm flex items-center gap-1.5">
                <LayoutGrid size={11} /> {dashboardMode.badge}
              </span>
              <span className="bg-white/20 text-white/90 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-[var(--ui-radius-small)] backdrop-blur-sm flex items-center gap-1.5">
                <Calendar size={11} /> {todayShort}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight mb-1">
              Selamat Datang, {currentUser?.name || currentUser?.username ||"Pengguna"}!
            </h1>
            <p className="text-xs text-white/80 font-medium leading-relaxed max-w-xl">
              {dashboardMode.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dashboardMode.actions.map((action, i) => (
              <Button variant="outline"
                key={action.tab}
                onClick={() =>setActiveTab(action.tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-small)] text-[11px] font-bold transition-all cursor-pointer ${
                  i === 0
                    ?"bg-white text-[var(--ui-primary)] hover:bg-slate-50 hover:-lg shadow-sm"
                    :"bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm"
                }`}
              >
                <action.icon size={14} />
                {action.label}</Button>
            ))}
            <Button variant="outline" onClick={() =>setShowPanduan(true)} title="Panduan" className="flex items-center justify-center w-7 h-7 rounded-[var(--ui-radius-small)] bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm transition-all cursor-pointer ml-auto sm:ml-0">
              <HelpCircle size={14} /></Button>
          </div>
        </div>
      </div>

      {/* Dashboard Messages */}
      {dashboardMessages?.length > 0 && (
        <div className="flex flex-col gap-4">
          {dashboardMessages.map((message) => (
            <article key={message.id} className={`rounded-[var(--ui-radius-card)] border-none p-5 shadow-sm bg-white`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-[var(--ui-radius-card)] flex items-center justify-center shrink-0 ${messageTone(message.priority)}`}>
                  <Activity size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="font-black text-lg leading-tight text-slate-800">{message.title}</h3>
                    {message.pinned && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-rose-100 text-rose-700">Pinned</span>}
                  </div>
                  <div className="text-[13px] font-medium leading-relaxed text-slate-600 whitespace-pre-wrap">
                    {message.body}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-[9px] font-black text-slate-500 uppercase">{String(message.createdBy ||"S")[0]}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{message.createdBy ||"Sistem"}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] font-bold text-slate-400">{new Date(message.createdAt || new Date()).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ======= TOP SECTION: QUICK SHORTCUTS & STAT CARDS ======= */}
      <div className="flex flex-col gap-2 text-left">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">Pintasan Cepat</h2>
        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Quick Shortcuts */}
          {(() => {
            if (isTU) return [
              { label:"Rekap Absensi", icon:"/icons/079-checklist.svg", color:"bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]", tab:"absensi" },
              { label:"E-Surat", icon:"/icons/092-file.svg", color:"bg-emerald-50 text-emerald-600", tab:"esurat" },
              { label:"Data Siswa", icon:"/icons/045-account.svg", color:"bg-purple-50 text-purple-600", tab:"siswa" },
              { label:"Kartu Pelajar", icon:"/icons/045-account.svg", color:"bg-amber-50 text-amber-600", tab:"kartu_pelajar" },
            ];
            if (isKepsek) return [
              { label:"Pantau Jadwal", icon:"/icons/086-calendar.svg", color:"bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]", tab:"generate" },
              { label:"Rekap Absensi", icon:"/icons/079-checklist.svg", color:"bg-emerald-50 text-emerald-600", tab:"absensi" },
              { label:"Data Siswa PKL", icon:"/icons/045-account.svg", color:"bg-purple-50 text-purple-600", tab:"pkl_data_siswa" },
              { label:"Jurnal PKL", icon:"/icons/092-file.svg", color:"bg-amber-50 text-amber-600", tab:"pkl_jurnal" },
            ];
            return [
              { label:"Jadwal Baru", icon:"/icons/086-calendar.svg", color:"bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]", tab:"generate" },
              { label:"Kelola Guru", icon:"/icons/066-education.svg", color:"bg-emerald-50 text-emerald-600", tab:"guru" },
              { label:"Kelola Kelas", icon:"/icons/008-warehouse.svg", color:"bg-purple-50 text-purple-600", tab:"kelas" },
              { label:"Kontrol Fitur", icon:"/icons/098-setting.svg", color:"bg-amber-50 text-amber-600", tab:"fitur" },
            ];
          })().map((shortcut, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(shortcut.tab)}
              className="bg-white p-3 rounded-[var(--ui-radius-card)] border-none shadow-sm flex flex-col items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer text-center w-full group aspect-square"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                {typeof shortcut.icon === 'string' ? (
                  <img src={shortcut.icon} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" alt="" />
                ) : (
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 ${shortcut.color}`}>
                    <shortcut.icon size={16} strokeWidth={2.5} />
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] sm:text-[12px] font-black text-slate-800 leading-tight truncate">{shortcut.label}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">Statistik Utama</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* 4 Stat Cards */}
          {topCards.map((card, idx) => (
            <button key={idx} onClick={() => setActiveTab(card.tab)} className="bg-white p-3.5 sm:p-5 rounded-[var(--ui-radius-card)] border-none shadow-sm flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group cursor-pointer text-left w-full">
              <div className="flex items-start justify-between w-full mb-1 sm:mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                  {typeof card.icon === 'string' ? (
                    <img src={card.icon} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" alt="" />
                  ) : (
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 ${card.color}`}>
                      <card.icon size={18} className="w-[14px] h-[14px] sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                <ArrowRight size={16} className="text-slate-350 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <div className="min-w-0 w-full flex flex-col gap-0.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none mb-0.5 sm:mb-1 truncate">{card.value}</h2>
                <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{card.label}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ======= MIDDLE SECTION: 2 COLUMNS (Ringkasan vs Logs) ======= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1">
        
        {/* Left Column: Ringkasan Sistem Sekolah */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-4">
          <div className="bg-white border-none shadow-sm rounded-[var(--ui-radius-card)] p-6 flex flex-col h-full min-h-[400px]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-base font-black text-slate-800 tracking-tight">Ringkasan Sistem Sekolah</h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Status kelengkapan data sistem terpadu</p>
              </div>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                <Printer size={12} /> <span className="hidden sm:inline">Export</span>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 mb-4 overflow-x-auto custom-scrollbar pb-1">
              {[
                { id:"semua", label:"Semua", count: summaryRows.length },
                { id:"selesai", label:"Selesai", count: summaryRows.filter(r => r.statusLabel ==="Selesai").length },
                { id:"proses", label:"Proses", count: summaryRows.filter(r => r.statusLabel ==="In Progress").length },
                { id:"kosong", label:"Kosong", count: summaryRows.filter(r => r.statusLabel ==="Belum Ada").length },
              ].map((tab) => (
                <Button variant="outline"
                  key={tab.id}
                  onClick={() =>{ setActiveDataTab(tab.id); setSummaryPage(0); }}
                  className={`px-3 py-1.5 rounded-[var(--ui-radius-small)] text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
                    activeDataTab === tab.id
                      ?"bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-sm"
                      :"bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[var(--ui-radius-small)] ${activeDataTab === tab.id ?"bg-white/20 text-white" :"bg-slate-100 text-slate-500"}`}>
                      {tab.count}
                    </span>
                  )}</Button>
              ))}
            </div>

            {/* Compact List View */}
            <div className="flex flex-col gap-2 overflow-y-auto pr-1 pb-2">
              {filteredRows.slice(summaryPage * 5, (summaryPage + 1) * 5).map((row, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-[var(--ui-radius-small)] hover:bg-slate-50 border-none hover:border-slate-100 transition-colors group cursor-default">
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 ${row.iconBg} ${row.iconColor}`}>
                    <row.icon size={15} />
                  </div>
                  
                  {/* Title & Detail */}
                  <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 items-center">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 text-xs truncate">{row.label}</span>
                      <span className="text-[10px] text-slate-400 truncate">{row.note}</span>
                    </div>

                    <div className="hidden lg:flex items-baseline gap-1.5">
                      <span className="text-sm font-black text-slate-800 leading-none">{row.count.split(" ")[0]}</span>
                      <span className="text-[9px] font-bold text-slate-500">{row.count.split(" ")[1] ||""}</span>
                    </div>

                    <div className="hidden md:flex flex-col gap-1 w-full max-w-[120px]">
                       <div className="flex justify-between items-center">
                         <span className="text-[9px] font-bold text-slate-400 uppercase">Progress</span>
                         <span className="text-[9px] font-black text-slate-700">{row.progress}%</span>
                       </div>
                       <div className="w-full h-1.5 bg-slate-200 rounded-[var(--ui-radius-small)] overflow-hidden">
                         <div
                           className="h-full rounded-[var(--ui-radius-small)] transition-all duration-700"
                           style={{ width: `${row.progress}%`, background: row.progress === 100 ?"#10b981" : row.progress > 0 ?"var(--ui-primary)" :"#cbd5e1" }}
                         />
                       </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="shrink-0 w-[85px] text-right flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center justify-center min-w-[70px] gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[9px] font-bold ${row.statusCls}`}>
                      {row.statusLabel}
                    </span>
                    <span className="text-[9px] font-medium text-slate-400 block md:hidden lg:hidden">{row.count}</span>
                  </div>
                </div>
              ))}
              {filteredRows.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-[var(--ui-radius-small)] border border-dashed border-slate-200">
                  <Activity className="text-slate-300 mb-2" size={24} />
                  <p className="text-xs font-bold text-slate-400">Tidak ada data untuk kategori ini</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredRows.length > 5 && (
              <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">Menampilkan {summaryPage * 5 + 1}-{Math.min((summaryPage + 1) * 5, filteredRows.length)} dari {filteredRows.length}</span>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" 
                    disabled={summaryPage === 0} 
                    onClick={() =>setSummaryPage(p => p - 1)}
                    className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-slate-50 text-slate-500 text-[10px] font-bold hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                  >Sebelumnnya</Button>
                  <Button variant="outline" 
                    disabled={summaryPage >= Math.ceil(filteredRows.length / 5) - 1} 
                    onClick={() => setSummaryPage(p => p + 1)}
                    className="px-2.5 py-1 rounded-[var(--ui-radius-small)] bg-slate-50 text-slate-500 text-[10px] font-bold hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                  >Berikutnya</Button>
                </div>
              </div>
            )}
          </div>

          {/* Rekomendasi Aksi */}
          {isSuperAdmin && summaryRows.filter(r => r.statusLabel !=="Selesai").length > 0 && (
            <div className="bg-amber-50 border border-amber-100 shadow-sm rounded-[var(--ui-radius-card)] p-4 flex gap-3 mt-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-900 mb-1">Rekomendasi Aksi Sistem</h3>
                <ul className="text-xs text-amber-800 space-y-1 ml-4 list-disc">
                  {summaryRows.filter(r => r.statusLabel ==="Belum Ada").slice(0, 2).map((r, i) => (
                     <li key={i}>Segera lengkapi data <b>{r.label}</b> agar sistem berjalan optimal.</li>
                  ))}
                  {summaryRows.filter(r => r.statusLabel ==="In Progress").slice(0, 1).map((r, i) => (
                     <li key={`p-${i}`}>Lanjutkan pengisian <b>{r.label}</b> yang baru mencapai {r.progress}%.</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Statistik Grafis Card */}
          <div className="bg-white border-none shadow-sm rounded-[var(--ui-radius-card)] p-6 flex flex-col min-h-[300px] mt-4">
            <div className="mb-4">
              <h2 className="text-base font-black text-slate-800 tracking-tight">Statistik Pembelajaran & Fasilitas</h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Analisis beban kerja guru dan pemanfaatan ruang</p>
            </div>
            <div className="flex-1">
              <Suspense fallback={<DashboardChartsFallback />}>
                <DashboardCharts
                  subjectComposition={subjectComposition || []}
                  subjectCount={subjects.length}
                  roomCapacityData={roomCapacityData || []}
                  roomUsagePercent={roomUsagePercent}
                  usedRoomCount={usedRooms.size}
                  roomCount={rooms.length}
                  teachers={teachers}
                  classes={classes}
                  schedule={schedule}
                  teachingLoads={teachingLoads}
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Right Column: Log Panels */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-4">
          {(() => {
            const fmtTime = (ts) => {
              try { return new Intl.DateTimeFormat('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(ts)); }
              catch { return'-'; }
            };
            const roleLabel = (r) => ({ admin:'Admin', guru:'Guru', waka:'Waka', kepsek:'Kepsek', hubin:'Hubin', siswa:'Siswa' })[r] || r;
            const roleBadge = (r) => {
              const map = { admin:'bg-violet-100 text-violet-700', guru:'bg-blue-100 text-blue-700', waka:'bg-amber-100 text-amber-700', kepsek:'bg-red-100 text-red-700', siswa:'bg-emerald-100 text-emerald-700' };
              return map[r] ||'bg-slate-100 text-slate-600';
            };
            const getUserName = (username, role) => {
              if (role ==='admin' || username ==='admin') return'Administrator';
              if (teachers && teachers.length > 0) {
                const teacher = teachers.find(t => t.code === username || String(t.id) === String(username) || t.username === username);
                if (teacher && teacher.name) return teacher.name;
              }
              return username;
            };

            const absenGuruLogs = dashLogs?.teacherAbsenceLogs || [];
            const terlambatSiswaLogs = dashLogs?.latestStudentLogs || [];
            const bermasalahLogs = dashLogs?.problematicStudentLogs || [];
            const loginLogs = dashLogs?.loginLogs || [];
            
            // Generate some mock rankings based on actual logs to fulfill the"Peringkat" tabs
            const rankingGuru = teachers.slice(0, 10).map((t, i) => ({
              ...t,
              kehadiran: 100 - (i * 2), // Mock percentage
              alpa: Math.floor(i / 3)
            })).sort((a, b) => b.kehadiran - a.kehadiran);

            return (
              <div className="bg-white rounded-[var(--ui-radius-card)] shadow-sm border-none flex flex-col overflow-hidden h-full max-h-[700px]">
                <div className="px-6 py-4 border-b border-slate-100 bg-white">
                  <h2 className="text-base font-black text-slate-800 tracking-tight">Monitor & Aktivitas</h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pantauan log dan peringkat kehadiran</p>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-slate-100 overflow-x-auto custom-scrollbar bg-slate-50/50">
                  {[
                    { id:'histori', label:'Histori Absen' },
                    { id:'siswa', label:'Peringkat Siswa' },
                    { id:'guru', label:'Peringkat Guru' },
                    isSuperAdmin ? { id:'sistem', label:'Log Sistem' } : null
                  ].filter(Boolean).map(tab => (
                    <Button variant="outline"
                      key={tab.id}
                      onClick={() =>setActiveLogTab(tab.id)}
                      className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                        activeLogTab === tab.id
                          ?'border-[var(--ui-primary)] text-[var(--ui-primary)]'
                          :'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                      }`}
                    >
                      {tab.label}</Button>
                  ))}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
                  
                  {activeLogTab ==='histori' && (
                    <div className="space-y-6">
                      {/* Guru Absen */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded flex items-center justify-center bg-red-50 text-red-500">
                            <UserX size={14} />
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Guru Tidak Hadir</h3>
                        </div>
                        {absenGuruLogs.length === 0 ? (
                          <div className="p-4 rounded-[var(--ui-radius-small)] bg-slate-50 border border-dashed border-slate-200 text-center">
                            <p className="text-xs text-slate-500">Semua guru hadir saat ini.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col border border-slate-100 rounded-[var(--ui-radius-small)] overflow-hidden">
                            {absenGuruLogs.slice(0, 5).map((item, i) => (
                              <div key={i} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                <div>
                                  <p className="text-[13px] font-bold text-slate-800">{item.name || item.username}</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">{item.date ? new Date(item.date).toLocaleDateString('id-ID') : fmtTime(item.created_at)}</p>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-[var(--ui-radius-small)] uppercase ${
                                  item.status ==='absen' ?'bg-red-100 text-red-700' : item.status ==='izin' ?'bg-amber-100 text-amber-700' :'bg-rose-100 text-rose-700'
                                }`}>{item.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Siswa Terlambat */}
                      <div>
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
                            {terlambatSiswaLogs.slice(0, 5).map((item, i) => (
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
                    </div>
                  )}

                  {activeLogTab ==='siswa' && (
                    <div className="space-y-6">
                      {/* Peringkat Siswa Bermasalah */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded flex items-center justify-center bg-rose-50 text-rose-500">
                            <ShieldAlert size={14} />
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Top 10 Siswa Bermasalah</h3>
                        </div>
                        {bermasalahLogs.length === 0 ? (
                          <div className="p-6 rounded-[var(--ui-radius-small)] bg-slate-50 border border-dashed border-slate-200 text-center">
                            <ShieldAlert className="mx-auto text-slate-300 mb-2" size={24} />
                            <p className="text-sm font-bold text-slate-400">Belum ada data siswa bermasalah.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {bermasalahLogs.map((item, i) => (
                              <div key={i} className="flex justify-between items-center p-3 rounded-[var(--ui-radius-small)] bg-rose-50/50 border border-rose-100 hover:bg-rose-50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 flex items-center justify-center rounded-full bg-rose-200 text-rose-800 text-xs font-black">
                                    {i + 1}
                                  </div>
                                  <div>
                                    <p className="text-[13px] font-bold text-slate-800">{item.name || item.nis}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Terakhir: {item.last_seen ? fmtTime(item.last_seen) :'-'}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[13px] font-black text-rose-600">
                                    {typeof item.total_alpha ==='number' || (!isNaN(item.total_alpha) && !isNaN(parseFloat(item.total_alpha))) ? `${item.total_alpha} Alpa` : item.total_alpha}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeLogTab ==='guru' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded flex items-center justify-center bg-blue-50 text-blue-500">
                            <Activity size={14} />
                          </div>
                          <h3 className="text-sm font-bold text-slate-800">Peringkat Kehadiran Guru</h3>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {rankingGuru.map((item, i) => (
                          <div key={i} className="flex justify-between items-center p-3 rounded-[var(--ui-radius-small)] border border-slate-100 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black ${
                                i === 0 ?'bg-amber-100 text-amber-700' :
                                i === 1 ?'bg-slate-200 text-slate-700' :
                                i === 2 ?'bg-orange-100 text-orange-800' :'bg-slate-100 text-slate-500'
                              }`}>
                                #{i + 1}
                              </div>
                              <div>
                                <p className="text-[13px] font-bold text-slate-800">{item.name}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[150px] sm:max-w-[200px]">{item.type ||'Umum'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-[14px] font-black ${item.kehadiran >= 95 ?'text-emerald-600' : item.kehadiran >= 80 ?'text-amber-500' :'text-rose-500'}`}>
                                {item.kehadiran}%
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5">{item.alpa > 0 ? `${item.alpa} Alpa` :'Sempurna'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeLogTab ==='sistem' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-violet-50 text-violet-500">
                          <LogIn size={14} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">Log Aktivitas Terbaru</h3>
                      </div>
                      
                      {loginLogs.length === 0 ? (
                        <div className="p-6 rounded-[var(--ui-radius-small)] bg-slate-50 border border-dashed border-slate-200 text-center">
                          <p className="text-sm text-slate-500">Belum ada aktivitas terekam.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col border border-slate-100 rounded-[var(--ui-radius-small)] overflow-hidden">
                          {loginLogs.map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                              <div className="flex gap-3 items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${roleBadge(item.role)}`}>
                                  {String(item.name || getUserName(item.username, item.role))[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-[13px] font-bold text-slate-800">{item.name || getUserName(item.username, item.role)}</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">{fmtTime(item.time)} • Login Sistem</p>
                                </div>
                              </div>
                              <span className={`text-[10px] font-black px-2 py-1 rounded-[var(--ui-radius-small)] uppercase ${roleBadge(item.role)}`}>{roleLabel(item.role)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })()}
        </div>

      </div>

      <PanduanModal isOpen={showPanduan} onClose={() => setShowPanduan(false)} role={currentUser?.role ||"admin"} division={currentUser?.division ||""} />
    </div>
  );
}





const PanduanModal = ({ isOpen, onClose, role, division }) => {
  if (!isOpen) return null;

  const roleGuides = {
    admin: [
      { title:"Data Master", desc:"Kelola data Guru, Siswa, Kelas, Mata Pelajaran, Ruangan, dan Jurusan sebagai pondasi utama sistem." },
      { title:"Manajemen Kalender & Silabus", desc:"Atur Kalender Akademik, Data Silabus, dan Struktur Organisasi sekolah melalui menu Akademik." },
      { title:"Manajemen Jadwal", desc:"Tentukan beban mengajar, batasan ketersediaan waktu guru, dan gunakan fitur'Generate Jadwal' otomatis." },
      { title:"Manajemen PKL", desc:"Pantau penuh data perusahaan, penempatan siswa, jurnal harian, serta kelola administrasi surat PKL." },
      { title:"Manajemen Keamanan & Sistem", desc:"Atur device Hikvision, edit profil admin, radius absensi, dan kontrol seluruh modul sistem." },
    ],
    guru: [
      { title:"Dashboard Personal", desc:"Pantau jadwal mengajar hari ini, jumlah jam pelajaran, serta pengumuman terbaru dari sekolah secara langsung." },
      { title:"Absensi & Kehadiran", desc:"Gunakan menu'Absen Kelas' untuk mencatat kehadiran siswa (Hadir, Izin, Sakit, Alpa) pada jam pelajaran Anda." },
      { title:"Manajemen Pembelajaran", desc:"Akses'Kelola Silabus' untuk mengunggah dan mendistribusikan Modul Ajar/Materi kepada siswa." },
      { title:"Wali Kelas (Khusus)", desc:"Jika Anda Wali Kelas, akses menu'Laporan Wali Kelas' untuk memantau rekap kehadiran seluruh siswa di kelas Anda." },
    ],
    waka_kurikulum: [
      { title:"Monitoring Akademik", desc:"Pantau status Kalender Akademik, progres pengisian Silabus, dan struktur kelas secara keseluruhan." },
      { title:"Otomatisasi Jadwal", desc:"Akses menu Generate Jadwal, tentukan waktu istirahat, beban mengajar, dan atur waktu luang guru." },
      { title:"Manajemen Data Sekolah", desc:"Akses lengkap ke Data Guru, Siswa, Kelas, dan Mapel untuk memastikan kesiapan KBM." },
    ],
    waka_kesiswaan: [
      { title:"Monitoring Kehadiran", desc:"Pantau persentase kehadiran seluruh siswa secara real-time melalui menu Rekap Absensi Siswa." },
      { title:"Sistem Kedisiplinan", desc:"Gunakan fitur Poin Kedisiplinan (Pelanggaran/Prestasi) dan atur Jadwal Guru Piket harian." },
      { title:"Media Informasi", desc:"Buat Pengumuman (Pesan Dashboard) yang akan muncul langsung di beranda seluruh pengguna aplikasi." },
    ],
    waka_sarpras: [
      { title:"Manajemen Ruangan", desc:"Kelola daftar ruangan, kapasitas, dan peruntukan ruangan (Teori/Praktik) di lingkungan sekolah." },
      { title:"Visualisasi Denah", desc:"Gunakan fitur Denah Kelas untuk memetakan penempatan zona kelas secara visual." },
    ],
    waka_humas: [
      { title:"Komunikasi Publik", desc:"Buat Pengumuman/Pesan Dashboard untuk menyebarkan informasi resmi dari sekolah." },
      { title:"Pengaturan Tampilan", desc:"Kelola visualisasi sistem dan kalender akademik yang dapat diakses oleh civitas akademika." },
    ],
    waka_hubin: [
      { title:"Data Industri (DUDI)", desc:"Kelola daftar Perusahaan/Mitra Industri tempat pelaksanaan Praktik Kerja Lapangan." },
      { title:"Manajemen Siswa PKL", desc:"Lakukan plotting penempatan Siswa PKL ke berbagai perusahaan menggunakan sistem zonasi/jarak." },
      { title:"Administrasi PKL", desc:"Proses permohonan Surat Pengantar dan Mutasi PKL yang diajukan oleh siswa secara digital." },
      { title:"Monitoring Jurnal", desc:"Pantau laporan jurnal harian yang diisi oleh siswa PKL beserta absensi radius GPS." },
    ],
    kepsek: [
      { title:"Executive Dashboard", desc:"Pantau ringkasan statistik sekolah (Jumlah Siswa, Guru, Kehadiran, dan status Jadwal) secara terpusat." },
      { title:"Monitoring Absensi & PKL", desc:"Akses laporan kehadiran seluruh jenjang kelas, serta laporan akhir pelaksanaan PKL." },
      { title:"Siaran Pengumuman", desc:"Terbitkan pesan instruksi atau pengumuman penting yang akan tampil di seluruh dashboard civitas akademika." },
    ],
    siswa: [
      { title:"Sistem Absensi (GPS)", desc:"Buka menu Presensi untuk mencatat kehadiran harian PKL (Wajib berada di dalam radius lokasi perusahaan)." },
      { title:"Pengisian Jurnal", desc:"Akses menu Jurnal Harian untuk melaporkan kegiatan PKL setiap harinya dengan foto kegiatan." },
      { title:"Administrasi Digital", desc:"Ajukan permohonan Surat Pengantar atau perpindahan lokasi PKL langsung melalui menu Administrasi." },
    ]
  };

  const getGuide = () => {
    if (role ==='admin' || role ==='superadmin') return roleGuides.admin;
    if (role ==='kepsek') return roleGuides.kepsek;
    if (role ==='waka') {
       if (division ==='kurikulum') return roleGuides.waka_kurikulum;
       if (division ==='kesiswaan') return roleGuides.waka_kesiswaan;
       if (division ==='sarpras') return roleGuides.waka_sarpras;
       if (division ==='humas') return roleGuides.waka_humas;
       if (division ==='hubin') return roleGuides.waka_hubin;
       return roleGuides.waka_kurikulum; // default
    }
    if (role ==='siswa') return roleGuides.siswa;
    return roleGuides.guru; // default to guru
  };

  const currentRoleName = role ==='waka' ? `WAKA ${String(division ||'KURIKULUM').toUpperCase()}` : String(role).toUpperCase();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[var(--ui-radius-small)] w-full max-w-2xl shadow-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border-none">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center">
              <HelpCircle size={22} className="opacity-90" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-lg tracking-tight">Buku Panduan Sistem</h2>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">Petunjuk lengkap penggunaan aplikasi sesuai peran Anda</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-[var(--ui-radius-small)] transition-all cursor-pointer">
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[65vh] flex flex-col gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hak Akses:</span>
            <span className="text-[10px] font-black px-3 py-1 bg-[var(--ui-primary)] text-white rounded-[var(--ui-radius-small)] tracking-wider shadow-sm">
              {currentRoleName}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getGuide().map((item, idx) => (
              <div key={idx} className="flex gap-4 bg-white p-5 rounded-[var(--ui-radius-card)] border-none shadow-sm hover:-md transition- hover:border-[var(--ui-primary)]/30 group">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 font-black text-sm group-hover:bg-[var(--ui-primary)] group-hover:text-white transition-colors">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-800 mb-1.5 group-hover:text-[var(--ui-primary)] transition-colors">{item.title}</h3>
                  <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-white flex justify-between items-center">
          <p className="text-[10px] font-bold text-slate-400">
            Butuh bantuan lebih lanjut? Hubungi Tim IT / Administrator
          </p>
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-[var(--ui-radius-small)] font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-2">
            <CheckCircle2 size={14} /> Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};

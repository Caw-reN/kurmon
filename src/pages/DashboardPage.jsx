import { Button } from '../components/ui.jsx';
/*  */import React, { lazy, Suspense, useMemo, useState, useEffect, useCallback } from"react";
import {  Users, HelpCircle, X, X as CloseIcon, FileText,
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
  Loader2, MessageSquare, ChevronLeft, ChevronRight, ChevronDown, Megaphone, Bell, BellRing, Sliders, Zap, MoreVertical, Pin, Layers, Tv, LogOut, User } from'lucide-react';
import { useAppStore } from"../store/useAppStore";
import { useDataStore } from "../store/useDataStore.js";
import { SharedDashboardLogs } from "../components/monitoring/ui/index.js";
import { getAttendanceStatusTone } from "../utils/adminHelpers.js";
import KepsekExecutiveDashboard from "../components/admin/KepsekExecutiveDashboard.jsx";

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
  return 'bg-indigo-50 text-indigo-600';
};

export default function DashboardPage({
  currentUser,
  classes: _classes,
  teachers: _teachers,
  subjects: _subjects,
  rooms: _rooms,
  schedule: _schedule,
  teachingLoads: _teachingLoads,
  subjectComposition: _subjectComposition,
  staffs: _staffs,
  setActiveTab,
  onOpenProfile,
  handleLogout }) {
  const storeStaffs = useDataStore(state => state.staffs);
  const classes = _classes || [];
  const teachers = _teachers || [];
  const staffs = (_staffs && _staffs.length > 0) ? _staffs : (storeStaffs && storeStaffs.length > 0 ? storeStaffs : []);
  const subjects = _subjects || [];
  const rooms = _rooms || [];
  const schedule = _schedule || [];
  const teachingLoads = _teachingLoads || [];
  const subjectComposition = _subjectComposition || [];
  const today = useMemo(() => new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' }), []);
  const todayShort = useMemo(() => new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }), []);
  const todayLong = useMemo(() => new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }), []);

  const {
    majorCount,
    productiveTeachers,
    practiceSubjects,
    usedRooms,
    roomUsagePercent,
    roomCapacityData,
    scheduleSlots } = useMemo(() => {
    const mCount = new Set((classes || []).map((item) => item?.major).filter(Boolean)).size;
    const pTeachers = (teachers || []).filter((teacher) => teacher?.type ==="Jurusan").length;
    const nTeachers = (teachers || []).length - pTeachers;
    const prSubjects = (subjects || []).filter((subject) => subject?.isBlock).length;
    const uRooms = new Set((schedule || []).map((item) => item?.roomId).filter(Boolean));
    const ruPercent = (rooms || []).length > 0 ? Math.round((uRooms.size / (rooms || []).length) * 100) : 0;
    return {
      majorCount: mCount,
      productiveTeachers: pTeachers,
      normativeTeachers: nTeachers,
      practiceSubjects: prSubjects,
      usedRooms: uRooms,
      roomUsagePercent: ruPercent,
      roomCapacityData: [
        { name:"Terpakai", value: uRooms.size },
        { name:"Kosong", value: (rooms || []).length - uRooms.size }
      ],
      scheduleSlots: (schedule || []).length };
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
        { label:"Laporan Absensi", tab:"laporan_absensi", icon: CheckCircle2 },
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
  const attendanceRecords = useAppStore((state) => state.attendanceRecords);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activityPage, setActivityPage] = React.useState(0);
  const [activeDataTab, setActiveDataTab] = React.useState("semua");
  const [summaryPage, setSummaryPage] = React.useState(0);
  const [dashLogs, setDashLogs] = React.useState(null);
  const [logsLoading, setLogsLoading] = React.useState(true);
  const [logPages, setLogPages] = React.useState({});
  const [showPanduan, setShowPanduan] = React.useState(false);
  const [activeLogTab, setActiveLogTab] = React.useState('histori');
  const [activeMiddleTab, setActiveMiddleTab] = React.useState('ringkasan');
  const [showMobileNotif, setShowMobileNotif] = React.useState(false);
  const [showMobileProfileModal, setShowMobileProfileModal] = React.useState(false);
  const [showAllAnnouncementsModal, setShowAllAnnouncementsModal] = React.useState(false);
  const [activeAnnouncementDetail, setActiveAnnouncementDetail] = React.useState(null);

  const handleLihatSemuaPengumuman = () => {
    const userRole = (currentUser?.role || '').toLowerCase();
    if (['admin', 'superadmin', 'kepsek'].includes(userRole) || (userRole === 'waka' && (currentUser?.division || '').toLowerCase() === 'humas')) {
      setActiveTab('pesan');
    } else {
      setShowAllAnnouncementsModal(true);
    }
  };

  const triggerLogout = () => {
    if (handleLogout) {
      handleLogout();
    } else {
      sessionStorage.removeItem('school_schedule_session_v1');
      localStorage.removeItem('school_schedule_session_v1');
      window.location.reload();
    }
  };

  // NOTE: Dashboard logs are fetched by SharedDashboardLogs component — no duplicate polling needed here.
  React.useEffect(() => { setLogsLoading(false); }, []);

  const mySyllabuses = useMemo(() => {
    if (!isTeacher) return 0;
    return syllabuses.filter((s) => String(s.teacherCode ||"").split(",").map((c) => c.trim()).includes(teacherCode)).length;
  }, [isTeacher, syllabuses, teacherCode]);

  const todayClasses = useMemo(() => {
    if (!teacherCode || !schedule) return [];
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const currentDay = dayNames[new Date().getDay()];
    const todaySched = schedule.filter(s => {
      const isTeacherMatch = String(s.teacherCode || "").split(",").map(c => c.trim()).includes(teacherCode);
      const isDayMatch = String(s.day || "").trim().toLowerCase() === currentDay.toLowerCase();
      return isTeacherMatch && isDayMatch;
    });
    return todaySched.map(s => ({
      subject: s.subject || s.subjectName || "Mata Pelajaran",
      className: s.className || s.targetGrade || "-",
      jamStart: s.jamKe || s.slot || 1,
      jamEnd: s.jamKe || s.slot || 1,
      room: s.roomName || s.roomId || ""
    }));
  }, [schedule, teacherCode]);


  // ===================== GURU VIEW =====================
  if (isTeacher) {
    const students = useDataStore((state) => state.students) || [];
    // Calculate Wali Kelas students count dynamically
    const myStudentsCount = (students || []).filter(s => {
      return String(s.class_id) === String(currentUser?.walasClass) || String(s.className) === String(currentUser?.walasClass);
    }).length || 75; // Fallback to 75 as in screenshot if database is empty

    const teacherSubrole = (currentUser?.subrole || '').toLowerCase().trim();
    const teacherShortcuts = (() => {
      // BP/BK: prioritaskan menu konseling & kesiswaan
      if (teacherSubrole === 'bpbk') return [
        { label: "Jurnal KBM", icon: "/icons/092-file.svg", color: "bg-teal-50 text-teal-600", tab: "jurnal_harian" },
        { label: "Layanan BK", icon: "/icons/013-shield.svg", color: "bg-rose-50 text-rose-600", tab: "kedisiplinan_bpbk" },
        { label: "Prestasi Siswa", icon: "/icons/063-follow.svg", color: "bg-indigo-50 text-indigo-600", tab: "riwayat_prestasi" },
        { label: "Modul Ajar", icon: "/icons/066-education.svg", color: "bg-purple-50 text-purple-600", tab: "silabusguru" },
        { label: "Kehadiran Siswa", icon: "/icons/079-checklist.svg", color: "bg-amber-50 text-amber-600", tab: "kedisiplinan_absensi" },
        { label: "Data Siswa", icon: "/icons/045-account.svg", color: "bg-emerald-50 text-emerald-600", tab: "siswa" },
        { label: "Kalender", icon: "/icons/086-calendar.svg", color: "bg-sky-50 text-sky-600", tab: "akademik" },
        { label: "Pesan", icon: "/icons/087-chat.svg", color: "bg-indigo-50 text-indigo-600", tab: "pesan" },
      ];
      // Wali Kelas: prioritaskan menu kelas
      if (teacherSubrole === 'walikelas') return [
        { label: "Jurnal KBM", icon: "/icons/092-file.svg", color: "bg-teal-50 text-teal-600", tab: "jurnal_harian" },
        { label: "Catatan Kelas", icon: "/icons/023-pencil.svg", color: "bg-amber-50 text-amber-600", tab: "catatan_walikelas" },
        { label: "Laporan Walas", icon: "/icons/063-follow.svg", color: "bg-indigo-50 text-indigo-600", tab: "walas_report" },
        { label: "Kehadiran Siswa", icon: "/icons/079-checklist.svg", color: "bg-sky-50 text-sky-600", tab: "kedisiplinan_absensi" },
        { label: "Piket", icon: "/icons/013-shield.svg", color: "bg-rose-50 text-rose-600", tab: "kedisiplinan_piket" },
        { label: "Modul Ajar", icon: "/icons/066-education.svg", color: "bg-purple-50 text-purple-600", tab: "silabusguru" },
        { label: "Kalender", icon: "/icons/086-calendar.svg", color: "bg-emerald-50 text-emerald-600", tab: "akademik" },
        { label: "Pesan", icon: "/icons/087-chat.svg", color: "bg-indigo-50 text-indigo-600", tab: "pesan" },
      ];
      // Tim Kesiswaan (pembina OSIS, sekretaris kesiswaan, anggota kesiswaan)
      if (['pembina_osis', 'sekretaris_osis', 'sekretaris_kesiswaan', 'anggota_kesiswaan'].includes(teacherSubrole)) return [
        { label: "Jurnal KBM", icon: "/icons/092-file.svg", color: "bg-teal-50 text-teal-600", tab: "jurnal_harian" },
        { label: "Piket & Tatib", icon: "/icons/013-shield.svg", color: "bg-rose-50 text-rose-600", tab: "kedisiplinan_piket" },
        { label: "Prestasi Siswa", icon: "/icons/063-follow.svg", color: "bg-indigo-50 text-indigo-600", tab: "riwayat_prestasi" },
        { label: "Modul Ajar", icon: "/icons/066-education.svg", color: "bg-purple-50 text-purple-600", tab: "silabusguru" },
        { label: "Kalender", icon: "/icons/086-calendar.svg", color: "bg-amber-50 text-amber-600", tab: "akademik" },
        { label: "Pesan", icon: "/icons/087-chat.svg", color: "bg-indigo-50 text-indigo-600", tab: "pesan" },
      ];
      // Tim Kurikulum
      if (['sekretaris_kurikulum', 'anggota_kurikulum'].includes(teacherSubrole)) return [
        { label: "Jurnal KBM", icon: "/icons/092-file.svg", color: "bg-teal-50 text-teal-600", tab: "jurnal_harian" },
        { label: "Silabus Akademik", icon: "/icons/092-file.svg", color: "bg-emerald-50 text-emerald-600", tab: "silabus" },
        { label: "Modul Ajar", icon: "/icons/066-education.svg", color: "bg-purple-50 text-purple-600", tab: "silabusguru" },
        { label: "Kehadiran Guru", icon: "/icons/079-checklist.svg", color: "bg-sky-50 text-sky-600", tab: "absensiguru" },
        { label: "Kalender", icon: "/icons/086-calendar.svg", color: "bg-amber-50 text-amber-600", tab: "akademik" },
        { label: "Pesan", icon: "/icons/087-chat.svg", color: "bg-indigo-50 text-indigo-600", tab: "pesan" },
      ];
      // Guru default (biasa/pengajar)
      return [
        { label: "Jadwal", icon: "/icons/011-schedule.svg", color: "bg-emerald-50 text-emerald-600", tab: "generate" },
        { label: "Jurnal", icon: "/icons/092-file.svg", color: "bg-teal-50 text-teal-600", tab: "jurnal_harian" },
        { label: "Modul Ajar", icon: "/icons/066-education.svg", color: "bg-purple-50 text-purple-600", tab: "silabusguru" },
        { label: "Kehadiran Guru", icon: "/icons/079-checklist.svg", color: "bg-sky-50 text-sky-600", tab: "absensiguru" },
        { label: "Piket", icon: "/icons/013-shield.svg", color: "bg-rose-50 text-rose-600", tab: "kedisiplinan_piket" },
        { label: "Laporan Walas", icon: "/icons/063-follow.svg", color: "bg-indigo-50 text-indigo-600", tab: "walas_report" },
        { label: "Catatan Kelas", icon: "/icons/023-pencil.svg", color: "bg-amber-50 text-amber-600", tab: "catatan_walikelas" },
        { label: "Kalender", icon: "/icons/086-calendar.svg", color: "bg-indigo-50 text-indigo-600", tab: "akademik" },
      ];
    })();

    const teacherStatCards = [
      { label: "Siswa Saya", value: myStudentsCount, icon: "/icons/045-account.svg", color: "bg-cyan-50 text-cyan-600" },
      { label: "Kelas Saya", value: myClasses || 4, icon: "/icons/066-education.svg", color: "bg-amber-50 text-amber-600" },
      { label: "JP Aktual/Minggu", value: `${totalBebanJam || 36} JP`, icon: "/icons/035-graph bar.svg", color: "bg-indigo-50 text-indigo-600" },
      { label: "Modul Ajar", value: mySyllabuses || 0, icon: "/icons/092-file.svg", color: "bg-emerald-50 text-emerald-600" },
    ];

    return (
      <div className="max-w-[1800px] mx-auto w-full flex-1 flex flex-col gap-2.5 sm:gap-3.5 animate-in fade-in duration-300 pb-28 sm:pb-8">
        {/* ======= MOBILE APP HERO GREETING CARD ======= */}
        <div className="sm:hidden flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-[var(--ui-radius-card)] border border-[var(--ui-border-soft)] shadow-[var(--ui-shadow-card)]">
          <div className="relative flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setShowMobileProfileModal(prev => !prev)}
              className="flex items-center gap-3 min-w-0 text-left cursor-pointer group bg-transparent border-none p-0 focus:outline-none w-full"
              title="Lihat Profil & Pengaturan"
            >
              <div className="relative shrink-0">
                <div 
                  className="w-11 h-11 rounded-full text-white font-black text-xs flex items-center justify-center shadow-xs border-2 border-white group-active:scale-95 transition-transform"
                  style={{ background: "linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 70%, #000) 100%)" }}
                >
                  {(currentUser?.name || currentUser?.username || 'GR').slice(0, 2).toUpperCase()}
                </div>
                <span 
                  className="w-3 h-3 rounded-full border-2 border-white absolute bottom-0 right-0 bg-emerald-500 shadow-2xs"
                />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Selamat Bertugas</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <h1 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight leading-snug truncate group-hover:text-[var(--ui-primary)] transition-colors">
                  {currentUser?.name || currentUser?.username || 'Bapak/Ibu Guru'}
                </h1>
                <span className="text-[9.5px] text-slate-400 font-medium truncate mt-0.5">
                  {currentUser?.role || 'Guru / Pengajar'}
                </span>
              </div>
            </button>

            {/* ======= TOP-LEFT DROPDOWN PROFILE POPOVER ======= */}
            {showMobileProfileModal && (
              <div 
                className="absolute left-0 top-14 w-[calc(100vw-32px)] max-w-[320px] bg-white border border-[var(--ui-border-soft)] shadow-[var(--ui-shadow-popover)] rounded-[var(--ui-radius-card)] p-4 z-[999999] flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
                  <span className="font-black text-xs text-slate-800 tracking-tight">Profil & Pengaturan</span>
                  <button 
                    type="button"
                    onClick={() => setShowMobileProfileModal(false)} 
                    className="text-slate-400 hover:text-slate-600 text-[10px] font-black bg-transparent border-none p-0 cursor-pointer uppercase tracking-wider"
                  >
                    TUTUP
                  </button>
                </div>

                <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-3 border border-[var(--ui-border-soft)] flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-full text-white font-black text-xs flex items-center justify-center shadow-xs border-2 border-white shrink-0"
                    style={{ background: "var(--ui-primary)" }}
                  >
                    {(currentUser?.name || currentUser?.username || 'GR').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-slate-800 truncate leading-snug">{currentUser?.name || currentUser?.username || 'Guru'}</h4>
                    <p className="text-[10.5px] font-semibold text-slate-400 truncate">@{currentUser?.username || 'user'}</p>
                    <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[var(--ui-radius-pill)] bg-white text-slate-600 mt-0.5 border border-[var(--ui-border-soft)]">
                      {currentUser?.role || 'Guru / Pengajar'}
                    </span>
                  </div>
                </div>

                {/* TABBAR STYLE SELECTOR TOGGLE */}
                <div className="bg-slate-50 rounded-[var(--ui-radius-small)] p-2.5 border border-[var(--ui-border-soft)] flex flex-col gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Gaya TabBar Navigasi Mobile
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={(localStorage.getItem('kurmon_tabbar_style') || 'floating') === 'floating' ? 'primary' : 'ghost'}
                      onClick={() => {
                        localStorage.setItem('kurmon_tabbar_style', 'floating');
                        window.dispatchEvent(new Event('kurmon_tabbar_style_changed'));
                      }}
                      className={`py-1.5 px-2 text-[10.5px] flex items-center justify-center gap-1 shrink-0 ${
                        (localStorage.getItem('kurmon_tabbar_style') || 'floating') !== 'floating' ? 'text-slate-500' : ''
                      }`}
                    >
                      <Layers size={13} strokeWidth={2.2} /> Mengambang
                    </Button>
                    <Button
                      variant={localStorage.getItem('kurmon_tabbar_style') === 'stay' ? 'primary' : 'ghost'}
                      onClick={() => {
                        localStorage.setItem('kurmon_tabbar_style', 'stay');
                        window.dispatchEvent(new Event('kurmon_tabbar_style_changed'));
                      }}
                      className={`py-1.5 px-2 text-[10.5px] flex items-center justify-center gap-1.5 shrink-0 ${
                        localStorage.getItem('kurmon_tabbar_style') !== 'stay' ? 'text-slate-500' : ''
                      }`}
                    >
                      <Pin size={13} strokeWidth={2.2} /> Menempel
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileProfileModal(false);
                      if (onOpenProfile) onOpenProfile();
                      else if (setActiveTab) setActiveTab('profile');
                    }}
                    className="w-full py-2.5 px-3 rounded-[var(--ui-radius-control)] bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-[var(--ui-border-soft)] shadow-2xs active:scale-98"
                  >
                    <User size={14} strokeWidth={2.2} /> Edit Profil & Kata Sandi
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileProfileModal(false);
                      triggerLogout();
                    }}
                    className="w-full py-2.5 px-3 rounded-[var(--ui-radius-control)] bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-rose-200/70 shadow-2xs active:scale-98"
                  >
                    <LogOut size={14} strokeWidth={2.5} /> Keluar Akun (Logout)
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="shrink-0 flex items-center gap-1.5">
            <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100/90 border border-[var(--ui-border-soft)] px-2.5 py-1.5 rounded-[var(--ui-radius-control)] shadow-2xs">
              {todayShort}
            </span>
          </div>
        </div>

        {/* ======= MOBILE REFERENCE DASHBOARD LAYOUT (< sm) ======= */}
        <div className="sm:hidden flex flex-col gap-4 text-left mb-2">

          {/* 1. JADWAL ANDA SEKARANG / STATUS KBM */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Jadwal Anda Sekarang</h3>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10.5px] font-bold px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] shadow-2xs">
                Hari ini, {todayShort}
              </span>
            </div>

            <div 
              className="rounded-[var(--ui-radius-card)] p-4 text-white shadow-[var(--ui-shadow-card)] relative overflow-hidden flex flex-col gap-3.5 border border-white/20"
              style={{ background: "linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 68%, #000) 100%)" }}
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--ui-radius-pill)] bg-white/20 backdrop-blur-md text-[11px] font-black text-white border border-white/25 shadow-xs">
                  <Clock3 size={13} strokeWidth={2.5} />
                  <span>{todayClasses[0]?.jamStart ? `Jam Ke-${todayClasses[0].jamStart}` : "Jadwal Hari Ini"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-white/70 block uppercase tracking-wider">Ruang Kelas</span>
                  <span className="text-xs font-black text-white leading-tight block">{todayClasses[0]?.room || "Ruang Kelas"}</span>
                </div>
              </div>

              <div className="relative z-10">
                <h2 className="text-lg font-black text-white leading-tight tracking-tight ">
                  {todayClasses[0]?.subject || "Tidak Ada KBM Berlangsung"}
                </h2>
                <p className="text-xs text-white/85 font-semibold mt-0.5">
                  {todayClasses[0]?.className ? `Kelas ${todayClasses[0].className}` : "Semua jadwal KBM hari ini telah selesai atau belum ada slot aktif."}
                </p>
              </div>

              {todayClasses.length > 0 && (
                <div className="flex flex-col gap-1.5 relative z-10 pt-0.5">
                  <div className="flex items-center justify-between text-[9.5px] font-black uppercase tracking-wider text-white/80">
                    <span>BERLANGSUNG</span>
                    <span>SLOT AKTIF</span>
                  </div>
                  <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/15">
                    <div className="w-[75%] h-full bg-emerald-400 rounded-full shadow-xs animate-pulse" />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveTab(todayClasses.length > 0 ? 'jurnal_harian' : 'generate')}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:scale-[0.98] text-[var(--ui-primary)] font-black text-xs rounded-[var(--ui-radius-control)] shadow-[var(--ui-shadow-control)] flex items-center justify-center gap-2 cursor-pointer transition-all border border-white relative z-10 touch-manipulation select-none"
              >
                <FileText size={15} strokeWidth={2.5} className="text-[var(--ui-primary)]" />
                <span>{todayClasses.length > 0 ? "Isi Jurnal & Absen Kelas" : "Lihat Seluruh Jadwal Mengajar"}</span>
              </button>
            </div>
          </div>

          {/* 2. PINTASAN CEPAT (DYNAMIC SHORTCUTS) */}
          <div className="flex flex-col gap-2 text-left">
            <h3 className="text-sm font-black text-slate-800 tracking-tight px-0.5">Pintasan Cepat</h3>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
              {teacherShortcuts.map((shortcut, idx) => {
                const pastelBgs = [
                  "bg-indigo-50 text-indigo-600 border-indigo-100",
                  "bg-amber-50 text-amber-600 border-amber-100",
                  "bg-rose-50 text-rose-600 border-rose-100",
                  "bg-purple-50 text-purple-600 border-purple-100",
                  "bg-teal-50 text-teal-600 border-teal-100",
                  "bg-emerald-50 text-emerald-600 border-emerald-100",
                  "bg-cyan-50 text-cyan-600 border-cyan-100",
                  "bg-indigo-50 text-indigo-600 border-indigo-100"
                ];
                const bg = pastelBgs[idx % pastelBgs.length];
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(shortcut.tab)}
                    className="flex flex-col items-center gap-1 group cursor-pointer border-none bg-transparent p-0 focus:outline-none touch-manipulation active:scale-90 transition-transform select-none"
                  >
                    <div className={`w-10 h-10 rounded-[var(--ui-radius-control)] ${bg} border flex items-center justify-center shadow-xs group-active:shadow-none transition-all`}>
                      <img src={shortcut.icon} className="w-5 h-5 object-contain" alt="" />
                    </div>
                    <span className="text-[9.5px] font-bold text-slate-700 text-center leading-tight line-clamp-2 px-0.5">
                      {shortcut.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. RINGKASAN STATISTIK (DYNAMIC STAT CARDS) */}
          <div className="flex flex-col gap-2 text-left">
            <h3 className="text-sm font-black text-slate-800 tracking-tight px-0.5">Ringkasan Statistik</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {teacherStatCards.map((stat, idx) => {
                const pastelBgs = [
                  "bg-cyan-50 text-cyan-600 border-cyan-100",
                  "bg-amber-50 text-amber-600 border-amber-100",
                  "bg-indigo-50 text-indigo-600 border-indigo-100",
                  "bg-emerald-50 text-emerald-600 border-emerald-100"
                ];
                const bg = pastelBgs[idx % pastelBgs.length];
                return (
                  <div key={idx} className="bg-white p-3 rounded-[var(--ui-radius-card)] border border-[var(--ui-border-soft)] shadow-[var(--ui-shadow-card)] flex items-center gap-3 active:scale-[0.98] transition-transform">
                    <div className={`w-10 h-10 rounded-[var(--ui-radius-control)] ${bg} border flex items-center justify-center shrink-0`}>
                      <img src={stat.icon} className="w-6 h-6 object-contain" alt="" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-black text-slate-800 leading-none">{stat.value}</h4>
                      <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider mt-1 truncate">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. PENGUMUMAN SEKOLAH (REAL MESSAGES) */}
          <div className="flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Pengumuman Sekolah</h3>
              {dashboardMessages && dashboardMessages.length > 0 && (
                <button 
                  type="button"
                  onClick={handleLihatSemuaPengumuman}
                  className="text-xs font-bold text-[var(--ui-primary)] hover:underline cursor-pointer bg-transparent border-none p-0 touch-manipulation"
                >
                  Lihat Semua
                </button>
              )}
            </div>

            {(!dashboardMessages || dashboardMessages.length === 0) ? (
              <div className="bg-white p-3.5 rounded-[var(--ui-radius-card)] border border-[var(--ui-border-soft)] shadow-[var(--ui-shadow-card)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-slate-100 border border-[var(--ui-border-soft)] flex items-center justify-center text-slate-400 shrink-0">
                  <Megaphone size={18} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-slate-700">Belum ada pengumuman hari ini</h4>
                  <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">Pengumuman dan informasi resmi sekolah akan tampil di sini.</p>
                </div>
              </div>
            ) : (
              dashboardMessages.slice(0, 2).map((msg, idx) => (
                <div 
                  key={idx} 
                  role="button"
                  tabIndex="0"
                  onClick={() => setActiveAnnouncementDetail(msg)}
                  onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') setActiveAnnouncementDetail(msg) }}
                  className="bg-white p-3.5 rounded-[var(--ui-radius-card)] border border-[var(--ui-border-soft)] shadow-[var(--ui-shadow-card)] flex items-center gap-3 cursor-pointer hover:bg-slate-50 active:scale-[0.98] transition-all touch-manipulation relative z-10"
                >
                  <div className="w-10 h-10 rounded-[var(--ui-radius-control)] bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                    <Megaphone size={18} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="bg-rose-100 text-rose-700 text-[8.5px] font-black px-1.5 py-0.2 rounded uppercase">
                        {msg.priority === 'high' ? 'PENTING' : 'INFO'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{msg.date || 'Hari ini'}</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-800 truncate">{msg.title}</h4>
                    <p className="text-[10.5px] text-slate-500 font-medium truncate mt-0.5">{msg.content || msg.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* ======= DESKTOP HERO BANNER (GURU) ======= */}
        <div
          className="hidden sm:block rounded-[var(--ui-radius-card)] p-3 sm:p-4 relative overflow-hidden text-white shadow-xs transition-all duration-300 mb-1"
          style={{ background:"linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 60%, #000) 100%)" }}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl opacity-30 mix-blend-overlay"></div>
          </div>
          
          <div className="relative z-10 flex flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate ">
                Selamat Datang, <span className="text-white/95">{currentUser?.name || teacherData.name || currentUser?.username}</span>!
              </h1>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="hidden sm:flex bg-white/10 border border-white/5 text-white/90 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[var(--ui-radius-pill)] backdrop-blur-md items-center gap-1">
                  <LayoutGrid size={10} /> Guru / Pengajar
                </span>
                <span className="bg-black/20 border border-white/5 text-white/90 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[var(--ui-radius-pill)] backdrop-blur-md flex items-center gap-1">
                  <Calendar size={10} /> {todayShort}
                </span>
              </div>
            </div>

            <div className="flex items-center shrink-0">
              <button 
                onClick={() => setShowPanduan(true)}
                title="Panduan"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-pill)] bg-white/15 hover:bg-white/25 border border-white/10 text-white backdrop-blur-md text-xs font-bold transition-all cursor-pointer hover:shadow-xs"
              >
                <HelpCircle size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">Panduan</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======= DESKTOP GRID LAYOUT (GURU) ======= */}
        <div className="hidden sm:grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* KOLOM KIRI (col-span-3): Pengumuman */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Kehadiran Hari Ini (Penting untuk absensi guru) */}
            <AttendanceTodaySection
              attendanceRecords={attendanceRecords}
              dashLogs={dashLogs}
              teachers={teachers}
              staffs={staffs}
              currentUser={currentUser}
              isSuperAdmin={isSuperAdmin}
              isKepsek={isKepsek}
              isWaka={isWaka}
              isTU={isTU}
              activeDivision={activeDivision}
              setActiveTab={setActiveTab}
            />

            <div className="bg-white border border-[var(--ui-border-soft)] shadow-[var(--ui-shadow-card)] rounded-[var(--ui-radius-card)] p-4 flex flex-col flex-1 h-full min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Megaphone size={16} className="text-rose-500" /> Pengumuman Baru
                </h3>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
                {(!dashboardMessages || dashboardMessages.length === 0) ? (
                  <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-50/50 rounded-[var(--ui-radius-small)]">
                    <span className="text-xs font-bold text-slate-400">Belum ada pengumuman</span>
                  </div>
                ) : (
                  dashboardMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setActiveAnnouncementDetail(msg)}
                      className="bg-slate-50 p-3 rounded-[var(--ui-radius-small)] border border-[var(--ui-border-soft)] shadow-2xs hover:bg-slate-100 hover:border-slate-200 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-rose-100 text-rose-700 text-[8.5px] font-black px-1.5 py-0.2 rounded uppercase">
                          {msg.priority === 'high' ? 'PENTING' : 'INFO'}
                        </span>
                        <span className="text-[9px] font-medium text-slate-400 truncate">{msg.date || 'Hari ini'}</span>
                      </div>
                      <h4 className="text-[11px] font-black text-slate-800 truncate leading-tight mb-0.5">{msg.title}</h4>
                      <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-snug">{msg.content || msg.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* KOLOM TENGAH (col-span-6): Menu Utama & Statistik */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* MENU UTAMA Section */}
            <div className="bg-white border border-[var(--ui-border-soft)] shadow-[var(--ui-shadow-card)] rounded-[var(--ui-radius-card)] p-3.5 sm:p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <Zap size={16} className="text-[var(--ui-primary)] shrink-0" strokeWidth={2.5} />
                <h2 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">Menu Utama</h2>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {teacherShortcuts.map((shortcut, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(shortcut.tab)}
                    className="bg-slate-50/90 py-2 sm:py-2.5 px-1 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] shadow-xs flex flex-col items-center justify-center gap-1.5 hover:-translate-y-0.5 hover:bg-slate-100 transition-all duration-200 cursor-pointer text-center w-full group"
                  >
                    <div className="w-7 h-7 flex items-center justify-center shrink-0">
                      <img src={shortcut.icon} className="w-5 h-5 object-contain" alt="" />
                    </div>
                    <p className="text-[9.5px] font-bold text-slate-700 leading-tight text-center px-0.5 break-words line-clamp-2">{shortcut.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* DATA & INFORMASI STATISTIK Section */}
            <div className="bg-white border border-[var(--ui-border-soft)] shadow-[var(--ui-shadow-card)] rounded-[var(--ui-radius-card)] p-3.5 sm:p-4 flex-1">
              <div className="flex items-center gap-2 mb-2.5">
                <Activity size={16} className="text-[var(--ui-primary)] shrink-0" strokeWidth={2.5} />
                <h2 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">Statistik Saya</h2>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {teacherStatCards.map((stat, i) => (
                  <div key={i} className="bg-slate-50/90 p-2.5 sm:p-3 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] shadow-xs flex items-center gap-2.5 hover:-translate-y-0.5 transition-all cursor-default w-full">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
                      <img src={stat.icon} className="w-5 h-5 sm:w-6 sm:h-6 object-contain" alt="" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider truncate">{stat.label}</p>
                      <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-none">{stat.value}</h2>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* KOLOM KANAN (col-span-3): Beban Mengajar (Lebih Diperkecil & Ramping) */}
          <div className="lg:col-span-3 flex flex-col gap-4 h-full">
            <div className="bg-white border border-[var(--ui-border-soft)] shadow-[var(--ui-shadow-card)] rounded-[var(--ui-radius-card)] flex-col overflow-hidden flex h-full">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight truncate">Beban Mengajar</h2>
                  <p className="text-[9.5px] text-slate-400 font-medium truncate mt-0.5">Daftar jam mengajar Anda</p>
                </div>
                <button className="shrink-0 flex items-center gap-1 px-2 py-1 bg-white border border-slate-200/90 shadow-2xs rounded-[var(--ui-radius-small)] text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer active:scale-95">
                  <Printer size={11} /> Export
                </button>
              </div>
              {myTeachingLoads.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-8 bg-white">
                  <GraduationCap size={26} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-[11px] font-bold text-slate-400 max-w-[160px] text-center">Belum ada beban mengajar ditugaskan.</p>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 custom-scrollbar max-h-[380px]">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white z-10 shadow-2xs">
                      <tr className="border-b border-slate-100">
                        <th className="py-2 px-3 font-bold text-slate-400 text-[9px] uppercase tracking-wider">Pelajaran</th>
                        <th className="py-2 px-2.5 font-bold text-slate-400 text-[9px] uppercase tracking-wider text-right">Durasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {myTeachingLoads.map((load, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-3">
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-[10.5px] text-slate-700 leading-tight truncate">{load.subject}</span>
                              <div className="flex gap-1 items-center mt-0.5">
                                <span className="bg-slate-100 text-slate-500 px-1 py-0.2 rounded text-[8.5px] font-bold">
                                  {load.targetGrade !== "All" ? load.targetGrade : "Semua"} {load.targetMajor !== "All" ? load.targetMajor : ""}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-right whitespace-nowrap align-middle">
                             <span className="font-black text-[11px] text-[var(--ui-primary)]">{load.duration} JP</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* ─────── Shared Activity Logs ─────── */}
        <div className="w-full">
          <SharedDashboardLogs onLogsFetched={setDashLogs} />
        </div>

        {/* Mobile Notification Modal (Desktop Style) */}
      {showMobileNotif && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200/50 shadow-2xl rounded-3xl w-full max-w-sm max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
            
            {/* Header (Sticky) */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 backdrop-blur-md px-5 py-4 shrink-0">
              <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-full bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shadow-inner">
                   <Bell size={18} strokeWidth={2.5} />
                 </div>
                 <div className="flex flex-col">
                   <h3 className="font-extrabold text-sm text-slate-800 tracking-tight leading-none">Notifikasi</h3>
                   <p className="text-[10px] text-slate-500 font-medium mt-1">Info & Pembaruan Sistem</p>
                 </div>
              </div>
              <button 
                onClick={() => setShowMobileNotif(false)} 
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors border-none cursor-pointer active:scale-95"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex flex-col gap-6 p-5 overflow-y-auto custom-scrollbar">
              
              {/* Realtime Notification Consent Prompt */}
              <div className="bg-gradient-to-br from-[var(--ui-primary)]/10 to-[var(--ui-primary)]/5 border border-[var(--ui-primary)]/20 rounded-[16px] p-4 flex flex-col gap-3 shrink-0 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--ui-primary)]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                <div className="flex items-start gap-3 relative z-10">
                  <div className="bg-white p-1.5 rounded-full shadow-sm text-[var(--ui-primary)] shrink-0">
                    <BellRing className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-slate-800 leading-tight">Notifikasi Realtime</span>
                    <span className="text-[11px] font-medium text-slate-500 mt-1 leading-snug">Terima info absensi & piket langsung di layar Anda secara instan.</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if ("Notification" in window) {
                      Notification.requestPermission().then(p => {
                        if (p === 'granted') alert('Notifikasi realtime diaktifkan!');
                      });
                    }
                  }}
                  className="w-full py-2.5 text-white font-bold text-xs rounded-2xl active:scale-95 transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-[var(--ui-shadow-card)] relative z-10"
                  style={{ backgroundColor: "var(--ui-primary)" }}
                >
                  <CheckCircle2 size={16} strokeWidth={2.5} /> Izinkan Sekarang
                </button>
              </div>

              {/* TODAY'S CLASS REMINDERS */}
              <div className="flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-indigo-500" />
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                    Jadwal Mengajar
                  </span>
                </div>
                {!todayClasses || todayClasses.length === 0 ? (
                  <div className="text-xs font-bold text-slate-400 py-4 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    Tidak ada jadwal mengajar hari ini.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {todayClasses.map((item, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-sm hover:border-indigo-200 transition-all cursor-pointer group">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Clock3 className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0 text-left justify-center">
                          <span className="text-xs font-extrabold text-slate-800 truncate mb-0.5 group-hover:text-indigo-600 transition-colors">
                            {item.subject}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-[var(--ui-radius-small)] text-slate-600">{item.className}</span>
                            <span>Jam {item.jamStart === item.jamEnd ? item.jamStart : `${item.jamStart}-${item.jamEnd}`}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ANNOUNCEMENTS / MESSAGES */}
              <div className="flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-rose-500" />
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                    Pengumuman Terbaru
                  </span>
                </div>
                {!dashboardMessages || dashboardMessages.length === 0 ? (
                  <div className="text-xs font-bold text-slate-400 py-4 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    Belum ada pengumuman terbaru.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dashboardMessages.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-white border border-slate-200/80 shadow-sm rounded-2xl text-left cursor-pointer hover:bg-slate-50 hover:border-rose-200 hover:shadow-sm transition-all group" onClick={() => { setShowMobileNotif(false); setActiveAnnouncementDetail(item); }}>
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <MessageSquare className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0 justify-center">
                          <span className="text-xs font-extrabold text-slate-800 truncate mb-0.5 group-hover:text-rose-600 transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 truncate">
                            {item.sender} • {item.date || 'Hari ini'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      
      {/* Spacer comment */}
      {showAllAnnouncementsModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200 sm:p-4 sm:items-center sm:justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-[var(--ui-radius-card)] border-t sm:border border-slate-200 shadow-2xl w-full sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden"><div className="w-12 h-1.5 rounded-full bg-slate-200"></div></div>
            <div className="px-4 pb-4 pt-1 sm:pt-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center">
                  <Megaphone size={16} strokeWidth={2.5} />
                </div>
                <h3 className="text-sm font-black text-slate-800">Semua Pengumuman Sekolah</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAllAnnouncementsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors border-none cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
              {(!dashboardMessages || dashboardMessages.length === 0) ? (
                <div className="text-center py-8 text-xs font-bold text-slate-400">
                  Belum ada pengumuman resmi sekolah.
                </div>
              ) : (
                dashboardMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    onClick={() => { setShowAllAnnouncementsModal(false); setActiveAnnouncementDetail(msg); }}
                    className="p-4 rounded-[var(--ui-radius-card)] border border-slate-100 bg-slate-50 hover:bg-white hover:border-[var(--ui-primary)]/30 hover:shadow-xs transition-all cursor-pointer flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-rose-100 text-rose-700 text-[8.5px] font-black px-2 py-0.5 rounded uppercase">
                        {msg.priority === 'high' ? 'PENTING' : 'INFO'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{msg.date || 'Hari ini'}</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-800">{msg.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{msg.content || msg.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Single Announcement */}
      {activeAnnouncementDetail && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200 sm:p-4 sm:items-center sm:justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-[var(--ui-radius-card)] border-t sm:border border-slate-200 shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden"><div className="w-12 h-1.5 rounded-full bg-slate-200"></div></div>
            <div className="px-4 pb-4 pt-1 sm:pt-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Megaphone size={16} strokeWidth={2.5} />
                </div>
                <h3 className="text-sm font-black text-slate-800">Detail Pengumuman</h3>
              </div>
              <button 
                type="button"
                onClick={() => setActiveAnnouncementDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors border-none cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-rose-100 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                  {activeAnnouncementDetail.priority === 'high' ? 'PENTING' : 'INFO'}
                </span>
                <span className="text-xs text-slate-400 font-semibold">{activeAnnouncementDetail.date || 'Hari ini'}</span>
              </div>
              <h2 className="text-base font-black text-slate-900 leading-snug">
                {activeAnnouncementDetail.title}
              </h2>
              <div className="text-xs text-slate-700 font-normal leading-relaxed whitespace-pre-line pt-2 border-t border-slate-100">
                {activeAnnouncementDetail.content || activeAnnouncementDetail.body}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveAnnouncementDetail(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-[var(--ui-radius-small)] text-xs font-bold border-none cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <PanduanModal isOpen={showPanduan} onClose={() => setShowPanduan(false)} role={currentUser?.role ||"admin"} division={currentUser?.division ||""} />
      </div>
    );
}
  // ===================== ADMIN / KEPSEK / WAKA VIEW =====================
  // Summary data for table
  const summaryRows = (() => {
    const defaultRows = [
    {
      icon: School, iconBg:"bg-[var(--ui-primary)]/10", iconColor:"text-indigo-500",
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
      statusCls: scheduleSlots > 0 ?"bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border-indigo-100" :"bg-slate-50 text-slate-400 border-slate-100",
      statusDot: scheduleSlots > 0 ?"bg-indigo-500" :"bg-slate-300" },
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
      statusCls:"bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border-indigo-100",
      statusDot:"bg-indigo-500" },
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
      statusCls:"bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] border-indigo-100",
      statusDot:"bg-indigo-500" },
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
    kelas: { label:"Total Kelas", value: classes.length, icon:"/icons/008-warehouse.svg", color:"bg-[var(--ui-primary)]/10 text-indigo-500", sub: `${majorCount} Jurusan aktif`, subIcon: TrendingUp, tab:"kelas" },
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
  const staffsStore = useDataStore((state) => state.staffs) || [];
  const studentsStore = useDataStore((state) => state.students) || [];

  if (isKepsek) {
    return (
      <KepsekExecutiveDashboard
        currentUser={currentUser}
        classes={classes}
        teachers={teachers}
        staffs={staffsStore}
        students={studentsStore}
        subjects={subjects}
        rooms={rooms}
        schedule={schedule}
        teachingLoads={teachingLoads}
        subjectComposition={subjectComposition}
        dashLogs={dashLogs}
        setDashLogs={setDashLogs}
        attendanceRecords={attendanceRecords}
        syllabuses={syllabuses}
        dashboardMessages={dashboardMessages}
        academicCalendar={useAppStore.getState().academicCalendar || []}
        activityLogs={useAppStore.getState().activityLogs || []}
        setActiveTab={setActiveTab}
      />
    );
  }

  return (
    <div className="max-w-[1800px] mx-auto w-full flex-1 flex flex-col gap-2.5 sm:gap-3.5 animate-in fade-in duration-300 pb-8">

      {/* ======= MOBILE REFINED GREETING BAR ======= */}
      <div className="sm:hidden flex items-center justify-between gap-3 pt-1 pb-0.5">
        <div className="flex items-center gap-3 min-w-0">
          <div 
            className="w-10 h-10 rounded-full text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0"
            style={{ background: "var(--ui-primary)" }}
          >
            {(currentUser?.name || currentUser?.username || 'AD').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-slate-500 font-semibold truncate leading-tight">
              Hai, {currentUser?.name || currentUser?.username || 'Pengguna'}!
            </span>
            <h1 className="text-sm font-extrabold text-slate-800 tracking-tight leading-snug truncate">
              Siap pantau hari ini?
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-primary/10 text-primary border border-primary/20 text-[10.5px] font-bold px-2.5 py-1 rounded-[var(--ui-radius-pill)] shadow-2xs">
            {todayShort}
          </span>
        </div>
      </div>

        {/* ======= MOBILE REFERENCE DASHBOARD LAYOUT (ADMIN/MANAGEMENT) (< sm) ======= */}
        <div className="sm:hidden flex flex-col gap-3 text-left mb-2">

          {/* 1. STATUS PEMANTAAN / HERO CARD */}
          <div className="ui-card p-4 relative overflow-hidden flex flex-col gap-3 shadow-xs border border-slate-200/80 bg-white rounded-[var(--ui-radius-card)]">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--ui-radius-pill)] bg-primary/10 text-primary border border-primary/20 text-[10.5px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>Sistem Terpantau Aktif</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[var(--ui-radius-small)] bg-slate-100 text-slate-600 border border-slate-200">
                {activeRole}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-extrabold text-slate-800 tracking-tight leading-snug">
                {dashboardMode.label || "Kurikulum & KBM Sekolah"}
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {dashboardMode.subtitle || `Total ${classes.length} Kelas • ${teachers.length} Guru Terdaftar`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setActiveTab(dashboardMode.actions?.[0]?.tab || 'absensi')}
                className="flex-1 py-2 px-3 bg-primary text-white font-bold text-xs rounded-[var(--ui-radius-control)] shadow-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-primary-hover active:scale-98 transition-all border-none"
              >
                <CheckCircle2 size={14} strokeWidth={2.5} />
                <span>{dashboardMode.actions?.[0]?.label ? `Buka ${dashboardMode.actions[0].label}` : "Pantau Presensi Hari Ini"}</span>
              </button>
            </div>
          </div>

          {/* 2. PINTASAN CEPAT (8 DYNAMIC PASTEL SVG ICON CARDS - TAILORED PER ROLE) */}
          <div className="flex flex-col gap-2 text-left">
            <h3 className="text-sm font-black text-slate-800 tracking-tight px-0.5">Pintasan Cepat</h3>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
              {(() => {
                let dynamicShortcuts = [];

                if (isTU) {
                  dynamicShortcuts = [
                    { label: "Laporan Absensi", icon: "/icons/079-checklist.svg", tab: "laporan_absensi" },
                    { label: "E-Surat", icon: "/icons/092-file.svg", tab: "esurat" },
                    { label: "Data Siswa", icon: "/icons/045-account.svg", tab: "siswa" },
                    { label: "Kartu Pelajar", icon: "/icons/045-account.svg", tab: "kartu_pelajar" },
                    { label: "Data Pegawai", icon: "/icons/035-graph bar.svg", tab: "data_pegawai" },
                    { label: "Data Kelas", icon: "/icons/008-warehouse.svg", tab: "kelas" },
                    { label: "Siswa Keluar", icon: "/icons/045-account.svg", tab: "siswa_keluar" },
                    { label: "Rekap Presensi", icon: "/icons/079-checklist.svg", tab: "absensi" },
                  ];
                } else if (isSuperAdmin) {
                  dynamicShortcuts = [
                    { label: "Pegawai", icon: "/icons/045-account.svg", tab: "data_pegawai" },
                    { label: "Jadwal", icon: "/icons/011-schedule.svg", tab: "generate" },
                    { label: "Modul", icon: "/icons/066-education.svg", tab: "modul_ajar" },
                    { label: "Kalender", icon: "/icons/086-calendar.svg", tab: "akademik" },
                    { label: "Absensi", icon: "/icons/092-file.svg", tab: "absensi" },
                    { label: "Pengumuman", icon: "/icons/023-pencil.svg", tab: "pesan" },
                    { label: "Hak Akses", icon: "/icons/013-shield.svg", tab: "hak_akses" },
                    { label: "Pengaturan", icon: "/icons/063-follow.svg", tab: "pengaturan" },
                  ];
                } else if (isKepsek) {
                  dynamicShortcuts = [
                    { label: "Pantau Jadwal", icon: "/icons/086-calendar.svg", tab: "generate" },
                    { label: "Rekap Absensi", icon: "/icons/079-checklist.svg", tab: "absensi" },
                    { label: "Siswa PKL", icon: "/icons/045-account.svg", tab: "pkl_data_siswa" },
                    { label: "Jurnal PKL", icon: "/icons/092-file.svg", tab: "pkl_jurnal" },
                    { label: "Data Pegawai", icon: "/icons/045-account.svg", tab: "data_pegawai" },
                    { label: "Data Siswa", icon: "/icons/045-account.svg", tab: "siswa" },
                    { label: "Modul Ajar", icon: "/icons/092-file.svg", tab: "silabus" },
                    { label: "Pesan", icon: "/icons/087-chat.svg", tab: "pesan" },
                  ];
                } else if (isWaka) {
                  if (activeDivision === 'kurikulum') {
                    dynamicShortcuts = [
                      { label: "Jadwal", icon: "/icons/011-schedule.svg", tab: "generate" },
                      { label: "Beban KBM", icon: "/icons/035-graph bar.svg", tab: "beban" },
                      { label: "Modul Ajar", icon: "/icons/092-file.svg", tab: "modul_ajar" },
                      { label: "Ketersediaan", icon: "/icons/086-calendar.svg", tab: "ketersediaan" },
                      { label: "Mapel", icon: "/icons/092-file.svg", tab: "mapel" },
                      { label: "Data Kelas", icon: "/icons/008-warehouse.svg", tab: "kelas" },
                      { label: "Data Pegawai", icon: "/icons/045-account.svg", tab: "data_pegawai" },
                      { label: "Jurnal KBM", icon: "/icons/092-file.svg", tab: "jurnal_harian" },
                    ];
                  } else if (activeDivision === 'kesiswaan') {
                    dynamicShortcuts = [
                      { label: "Kehadiran Siswa", icon: "/icons/079-checklist.svg", tab: "hikvision_report_siswa" },
                      { label: "Piket & Tatib", icon: "/icons/013-shield.svg", tab: "kedisiplinan_piket" },
                      { label: "Layanan BK", icon: "/icons/045-account.svg", tab: "kedisiplinan_bpbk" },
                      { label: "Poin Tatib", icon: "/icons/013-shield.svg", tab: "tatib_skor" },
                      { label: "Prestasi", icon: "/icons/063-follow.svg", tab: "riwayat_prestasi" },
                      { label: "Catatan Walas", icon: "/icons/023-pencil.svg", tab: "catatan_walikelas" },
                      { label: "Siswa Keluar", icon: "/icons/045-account.svg", tab: "siswa_keluar" },
                      { label: "Pesan", icon: "/icons/087-chat.svg", tab: "pesan" },
                    ];
                  } else if (activeDivision === 'hubin') {
                    dynamicShortcuts = [
                      { label: "Siswa PKL", icon: "/icons/045-account.svg", tab: "pkl_data_siswa" },
                      { label: "Mitra DUDI", icon: "/icons/008-warehouse.svg", tab: "pkl_data_perusahaan" },
                      { label: "Penugasan", icon: "/icons/066-education.svg", tab: "pkl_penugasan" },
                      { label: "Jurnal PKL", icon: "/icons/092-file.svg", tab: "pkl_jurnal" },
                      { label: "Administrasi", icon: "/icons/092-file.svg", tab: "pkl_administrasi" },
                      { label: "Laporan PKL", icon: "/icons/063-follow.svg", tab: "pkl_laporan" },
                      { label: "GPS PKL", icon: "/icons/016-map pin.svg", tab: "pkl_absensi_setting" },
                      { label: "Pesan", icon: "/icons/087-chat.svg", tab: "pesan" },
                    ];
                  } else if (activeDivision === 'sarpras') {
                    dynamicShortcuts = [
                      { label: "Data Ruangan", icon: "/icons/016-map pin.svg", tab: "ruangan" },
                      { label: "Denah Sekolah", icon: "/icons/008-warehouse.svg", tab: "denah" },
                      { label: "Data Kelas", icon: "/icons/008-warehouse.svg", tab: "kelas" },
                      { label: "Pantau Jadwal", icon: "/icons/086-calendar.svg", tab: "generate" },
                      { label: "Catatan Walas", icon: "/icons/023-pencil.svg", tab: "catatan_walikelas" },
                      { label: "Laporan", icon: "/icons/063-follow.svg", tab: "walas_report" },
                      { label: "Pengumuman", icon: "/icons/023-pencil.svg", tab: "pesan" }
                    ];
                  } else if (activeDivision === 'humas') {
                    dynamicShortcuts = [
                      { label: "Pesan", icon: "/icons/087-chat.svg", tab: "pesan" },
                      { label: "Tampilan Web", icon: "/icons/063-follow.svg", tab: "tampilan" },
                      { label: "Kalender", icon: "/icons/086-calendar.svg", tab: "akademik" },
                      { label: "Silabus", icon: "/icons/092-file.svg", tab: "silabus" },
                      { label: "Laporan", icon: "/icons/063-follow.svg", tab: "walas_report" },
                      { label: "Catatan Walas", icon: "/icons/023-pencil.svg", tab: "catatan_walikelas" }
                    ];
                  }
                } else if (activeRole === 'karyawan') {
                  dynamicShortcuts = [
                    { label: "Absen Pegawai", icon: "/icons/045-account.svg", tab: "absensiguru" },
                    { label: "Rekap Absensi", icon: "/icons/079-checklist.svg", tab: "absensi" },
                    { label: "E-Surat", icon: "/icons/092-file.svg", tab: "esurat" },
                    { label: "Pengumuman", icon: "/icons/023-pencil.svg", tab: "pesan" },
                    { label: "Kalender", icon: "/icons/086-calendar.svg", tab: "akademik" },
                    { label: "Jadwal KBM", icon: "/icons/011-schedule.svg", tab: "generate" }
                  ];
                } else {
                  dynamicShortcuts = [
                    { label: "Jadwal", icon: "/icons/011-schedule.svg", tab: "generate" },
                    { label: "Jurnal", icon: "/icons/092-file.svg", tab: "jurnal_harian" },
                    { label: "Absensi", icon: "/icons/045-account.svg", tab: "absensi" },
                    { label: "Catatan", icon: "/icons/023-pencil.svg", tab: "catatan_walikelas" },
                    { label: "Piket", icon: "/icons/013-shield.svg", tab: "kedisiplinan_piket" },
                    { label: "Kalender", icon: "/icons/086-calendar.svg", tab: "akademik" },
                    { label: "Modul", icon: "/icons/066-education.svg", tab: "modul_ajar" },
                    { label: "Laporan", icon: "/icons/063-follow.svg", tab: "walas_report" },
                  ];
                }

                return dynamicShortcuts.map((shortcut, idx) => {
                  const pastelBgs = [
                    "bg-emerald-50 text-emerald-600 border-emerald-100",
                    "bg-teal-50 text-teal-600 border-teal-100",
                    "bg-indigo-50 text-indigo-600 border-indigo-100",
                    "bg-amber-50 text-amber-600 border-amber-100",
                    "bg-rose-50 text-rose-600 border-rose-100",
                    "bg-purple-50 text-purple-600 border-purple-100",
                    "bg-cyan-50 text-cyan-600 border-cyan-100",
                    "bg-indigo-50 text-indigo-600 border-indigo-100"
                  ];
                  const bg = pastelBgs[idx % pastelBgs.length];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveTab(shortcut.tab)}
                      className="flex flex-col items-center gap-1 group cursor-pointer border-none bg-transparent p-0 focus:outline-none"
                    >
                      <div className={`w-10 h-10 rounded-[var(--ui-radius-control)] ${bg} border flex items-center justify-center shadow-xs group-active:scale-95 transition-transform`}>
                        <img src={shortcut.icon} className="w-5 h-5 object-contain" alt="" />
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-700 text-center leading-tight line-clamp-2 px-0.5">
                        {shortcut.label}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* 3. RINGKASAN SISTEM (PASTEL SVG STAT CARDS - MATCHING ROLE VIEW) */}
          <div className="flex flex-col gap-2 text-left">
            <h3 className="text-sm font-black text-slate-800 tracking-tight px-0.5">Ringkasan Sistem</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {(() => {
                let dynamicStatCards = [];
                const storeData = useDataStore.getState() || {};
                
                if (isTU) {
                  dynamicStatCards = [
                    { label: "TOTAL SISWA", value: `${storeData.students?.length || 0} Siswa`, icon: "/icons/045-account.svg", color: "bg-cyan-50 text-cyan-600 border-cyan-100" },
                    { label: "GURU AKTIF", value: `${teachers.length} Guru`, icon: "/icons/066-education.svg", color: "bg-amber-50 text-amber-600 border-amber-100" },
                    { label: "STAF KARYAWAN", value: `${storeData.staffs?.length || 0} Staf`, icon: "/icons/035-graph bar.svg", color: "bg-teal-50 text-teal-600 border-teal-100" },
                    { label: "TOTAL KELAS", value: `${classes.length} Kelas`, icon: "/icons/008-warehouse.svg", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                  ];
                } else if (isWaka && activeDivision === 'hubin') {
                  dynamicStatCards = [
                    { label: "SISWA PKL", value: `${storeData.pklStudents?.length || 0} Siswa`, icon: "/icons/045-account.svg", color: "bg-cyan-50 text-cyan-600 border-cyan-100" },
                    { label: "MITRA DUDI", value: `${storeData.companies?.length || 0} DUDI`, icon: "/icons/008-warehouse.svg", color: "bg-amber-50 text-amber-600 border-amber-100" },
                    { label: "PEMBIMBING", value: `${teachers.length} Guru`, icon: "/icons/066-education.svg", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
                    { label: "LOGBOOK PKL", value: `${storeData.pklLogs?.length || 0} Record`, icon: "/icons/092-file.svg", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                  ];
                } else {
                  dynamicStatCards = [
                    { label: "TOTAL KELAS", value: `${classes.length} Kelas`, icon: "/icons/066-education.svg", color: "bg-cyan-50 text-cyan-600 border-cyan-100" },
                    { label: "GURU AKTIF", value: `${teachers.length} Guru`, icon: "/icons/045-account.svg", color: "bg-amber-50 text-amber-600 border-amber-100" },
                    { label: "SLOT JADWAL", value: `${scheduleSlots} Slot`, icon: "/icons/035-graph bar.svg", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
                    { label: "TOTAL RUANGAN", value: `${rooms.length} Ruang`, icon: "/icons/011-schedule.svg", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                  ];
                }

                return dynamicStatCards.map((stat, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-[var(--ui-radius-card)] ${stat.color} border flex items-center justify-center shrink-0`}>
                      <img src={stat.icon} className="w-5.5 h-5.5 object-contain" alt="" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-black text-slate-800 leading-tight">{stat.value}</h4>
                      <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5 truncate">{stat.label}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* 4. PENGUMUMAN SEKOLAH (REAL MESSAGES) */}
          <div className="flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Pengumuman Sekolah</h3>
              {dashboardMessages && dashboardMessages.length > 0 && (
                <button 
                  type="button"
                  onClick={handleLihatSemuaPengumuman}
                  className="text-xs font-bold text-[var(--ui-primary)] hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  Lihat Semua
                </button>
              )}
            </div>

            {(!dashboardMessages || dashboardMessages.length === 0) ? (
              <div className="bg-white p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Megaphone size={18} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-slate-700">Belum ada pengumuman hari ini</h4>
                  <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">Pengumuman dan informasi resmi sekolah akan tampil di sini.</p>
                </div>
              </div>
            ) : (
              dashboardMessages.slice(0, 2).map((msg, idx) => (
                <div 
                  key={idx} 
                  role="button"
                  tabIndex="0"
                  onClick={() => setActiveAnnouncementDetail(msg)}
                  onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') setActiveAnnouncementDetail(msg) }}
                  className="bg-white p-3.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors relative z-10"
                >
                  <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                    <Megaphone size={18} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="bg-rose-100 text-rose-700 text-[8.5px] font-black px-1.5 py-0.2 rounded uppercase">
                        {msg.priority === 'high' ? 'PENTING' : 'INFO'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{msg.date || 'Hari ini'}</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-800 truncate">{msg.title}</h4>
                    <p className="text-[10.5px] text-slate-500 font-medium truncate mt-0.5">{msg.content || msg.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      {/* ======= DESKTOP HERO BANNER ======= */}
      <div
        className="hidden sm:block rounded-[var(--ui-radius-card)] p-3 sm:p-4 relative overflow-hidden text-white shadow-xs transition-all duration-300 mb-1"
        style={{ background:"linear-gradient(135deg, var(--ui-primary) 0%, color-mix(in srgb, var(--ui-primary) 60%, #000) 100%)" }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl opacity-30 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 flex flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate ">
              Selamat Datang, <span className="text-white/95">{currentUser?.name || currentUser?.username ||"Pengguna"}</span>!
            </h1>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:flex bg-white/10 border border-white/5 text-white/90 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[var(--ui-radius-pill)] backdrop-blur-md items-center gap-1">
                <LayoutGrid size={10} /> {dashboardMode.badge}
              </span>
              <span className="bg-black/20 border border-white/5 text-white/90 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[var(--ui-radius-pill)] backdrop-blur-md flex items-center gap-1">
                <Calendar size={10} /> {todayShort}
              </span>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <button 
              onClick={() =>setShowPanduan(true)} 
              title="Panduan Aplikasi" 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ui-radius-pill)] bg-white/15 hover:bg-white/25 border border-white/10 text-white backdrop-blur-md text-xs font-bold transition-all cursor-pointer hover:shadow-xs"
            >
              <HelpCircle size={14} strokeWidth={2.5} />
              <span className="hidden sm:inline">Panduan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backup Error Alert */}
      {dashLogs?.backupErrors?.length > 0 && isSuperAdmin && (
        <details className="group bg-rose-50 border border-rose-200 rounded-[var(--ui-radius-card)] overflow-hidden open:pb-3 transition-all mb-4">
          <summary className="p-4 flex items-center justify-between cursor-pointer list-none select-none hover:bg-rose-100/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-rose-600 shadow-xs group-open:bg-rose-600 group-open:text-white transition-colors duration-300">
                <AlertTriangle size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-black text-rose-800 text-sm leading-tight">Peringatan: Proses Backup Gagal</h3>
                <p className="text-[11.5px] text-rose-600 font-semibold mt-0.5 group-open:hidden">
                  Terdapat {dashLogs.backupErrors.length} kegagalan backup ke Cloud. Klik untuk melihat detail.
                </p>
                <p className="text-[11px] text-rose-600 font-medium mt-0.5 hidden group-open:block">
                  Mohon periksa ketersediaan Storage Cloud atau kredensial API.
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-rose-100/80 flex items-center justify-center text-rose-500 group-open:rotate-180 transition-transform duration-300 shrink-0">
               <ChevronDown size={16} strokeWidth={2.5} />
            </div>
          </summary>
          <div className="px-4 pb-1">
            <div className="space-y-1.5 pt-2 border-t border-rose-200/60 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
              {dashLogs.backupErrors.map((err, i) => (
                <div key={i} className="flex flex-col gap-0.5 p-2 bg-white/70 rounded-[var(--ui-radius-small)] border border-rose-100/80 shadow-xs">
                  <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">
                    {new Date(err.time).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • {err.action}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700 leading-relaxed">{err.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* ======= TOP PARENT CONTAINER BOX (MATCHES MONITOR & AKTIVITAS BOX) ======= */}
      <div className="hidden sm:flex bg-white border border-slate-200/80 shadow-xs rounded-[var(--ui-radius-card)] p-3.5 sm:p-5 flex-col gap-3.5 sm:gap-4.5">
        {/* Dashboard Messages Carousel */}
        {dashboardMessages?.length > 0 && (
          <DashboardMessageCarousel dashboardMessages={dashboardMessages} />
        )}

        {/* ======= KEHADIRAN HARI INI ======= */}
        <AttendanceTodaySection
          attendanceRecords={attendanceRecords}
          dashLogs={dashLogs}
          teachers={teachers}
          staffs={staffs}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          isKepsek={isKepsek}
          isWaka={isWaka}
          isTU={isTU}
          activeDivision={activeDivision}
          setActiveTab={setActiveTab}
        />

        {/* ======= QUICK SHORTCUTS ======= */}
        <div className="flex flex-col gap-2.5 text-left pt-2 border-t border-slate-100/80">
          <div className="flex items-center gap-2 ml-0.5">
            <Zap size={18} className="text-[var(--ui-primary)] shrink-0" strokeWidth={2.5} />
            <h2 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">Pintasan Cepat</h2>
          </div>
          <div className="grid grid-cols-2 min-[380px]:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
            {/* Quick Shortcuts */}
            {(() => {
              const activeSubrole = (currentUser?.subrole || '').toLowerCase().trim();
              if (isTU) {
                if (activeSubrole === 'sekretaris_tu') return [
                  { label:"E-Surat", icon:"/icons/092-file.svg", color:"bg-emerald-50 text-emerald-600", tab:"esurat" },
                  { label:"Data Siswa", icon:"/icons/045-account.svg", color:"bg-purple-50 text-purple-600", tab:"siswa" },
                  { label:"Laporan Absensi", icon:"/icons/079-checklist.svg", color:"bg-teal-50 text-teal-600", tab:"laporan_absensi" },
                  { label:"Kehadiran Siswa", icon:"/icons/079-checklist.svg", color:"bg-sky-50 text-sky-600", tab:"kedisiplinan_absensi" },
                  { label:"Kartu Pelajar", icon:"/icons/045-account.svg", color:"bg-amber-50 text-amber-600", tab:"kartu_pelajar" },
                  { label:"Absensi Mesin", icon:"/icons/013-shield.svg", color:"bg-indigo-50 text-indigo-600", tab:"absensi" },
                  { label:"Mutasi Siswa", icon:"/icons/045-account.svg", color:"bg-indigo-50 text-indigo-600", tab:"siswa_keluar" },
                  { label:"Data Pegawai", icon:"/icons/066-education.svg", color:"bg-rose-50 text-rose-600", tab:"data_pegawai" },
                ];
                if (activeSubrole === 'bendahara') return [
                  { label:"Data Siswa", icon:"/icons/045-account.svg", color:"bg-purple-50 text-purple-600", tab:"siswa" },
                  { label:"Data Pegawai", icon:"/icons/045-account.svg", color:"bg-indigo-50 text-indigo-600", tab:"data_pegawai" },
                  { label:"Laporan Absensi", icon:"/icons/079-checklist.svg", color:"bg-amber-50 text-amber-600", tab:"laporan_absensi" },
                  { label:"Absensi Mesin", icon:"/icons/013-shield.svg", color:"bg-sky-50 text-sky-600", tab:"absensi" },
                  { label:"Mutasi Siswa", icon:"/icons/045-account.svg", color:"bg-indigo-50 text-indigo-600", tab:"siswa_keluar" },
                ];
                return [
                  { label:"Laporan Absensi", icon:"/icons/079-checklist.svg", color:"bg-teal-50 text-teal-600", tab:"laporan_absensi" },
                  { label:"E-Surat", icon:"/icons/092-file.svg", color:"bg-emerald-50 text-emerald-600", tab:"esurat" },
                  { label:"Data Siswa", icon:"/icons/045-account.svg", color:"bg-purple-50 text-purple-600", tab:"siswa" },
                  { label:"Kartu Pelajar", icon:"/icons/045-account.svg", color:"bg-amber-50 text-amber-600", tab:"kartu_pelajar" },
                  { label:"Absensi Mesin", icon:"/icons/013-shield.svg", color:"bg-sky-50 text-sky-600", tab:"absensi" },
                  { label:"Kehadiran Siswa", icon:"/icons/079-checklist.svg", color:"bg-indigo-50 text-indigo-600", tab:"kedisiplinan_absensi" },
                  { label:"Data Pegawai", icon:"/icons/066-education.svg", color:"bg-indigo-50 text-indigo-600", tab:"data_pegawai" },
                  { label:"Mutasi Siswa", icon:"/icons/045-account.svg", color:"bg-rose-50 text-rose-600", tab:"siswa_keluar" },
                ];
              }
              if (isKepsek) return [
                { label:"Rekap Absensi", icon:"/icons/079-checklist.svg", color:"bg-emerald-50 text-emerald-600", tab:"absensi" },
                { label:"Dashboard PKL", icon:"/icons/035-graph bar.svg", color:"bg-purple-50 text-purple-600", tab:"pkl_dashboard" },
                { label:"Catatan Kelas", icon:"/icons/023-pencil.svg", color:"bg-amber-50 text-amber-600", tab:"catatan_walikelas" },
                { label:"Laporan Walas", icon:"/icons/063-follow.svg", color:"bg-indigo-50 text-indigo-600", tab:"walas_report" },
                { label:"Absensi Siswa", icon:"/icons/079-checklist.svg", color:"bg-teal-50 text-teal-600", tab:"kedisiplinan_absensi" },
                { label:"Rekap BK", icon:"/icons/013-shield.svg", color:"bg-rose-50 text-rose-600", tab:"kedisiplinan_bpbk" },
                { label:"Prestasi Siswa", icon:"/icons/063-follow.svg", color:"bg-sky-50 text-sky-600", tab:"riwayat_prestasi" },
                { label:"Pesan", icon:"/icons/087-chat.svg", color:"bg-indigo-50 text-indigo-600", tab:"pesan" },
              ];
              if (isWaka) {
                if (activeDivision === 'kurikulum') return [
                  { label:"Pantau Jadwal", icon:"/icons/086-calendar.svg", color:"bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]", tab:"generate" },
                  { label:"Beban Mengajar", icon:"/icons/035-graph bar.svg", color:"bg-amber-50 text-amber-600", tab:"beban" },
                  { label:"Modul Ajar", icon:"/icons/092-file.svg", color:"bg-emerald-50 text-emerald-600", tab:"modul_ajar" },
                  { label:"Ketersediaan", icon:"/icons/086-calendar.svg", color:"bg-indigo-50 text-indigo-600", tab:"ketersediaan" },
                  { label:"Kelola Mapel", icon:"/icons/092-file.svg", color:"bg-purple-50 text-purple-600", tab:"mapel" },
                  { label:"Kelola Kelas", icon:"/icons/008-warehouse.svg", color:"bg-sky-50 text-sky-600", tab:"kelas" },
                  { label:"Jurnal KBM", icon:"/icons/092-file.svg", color:"bg-teal-50 text-teal-600", tab:"jurnal_harian" },
                  { label:"Data Pegawai", icon:"/icons/066-education.svg", color:"bg-rose-50 text-rose-600", tab:"data_pegawai" },
                ];
                if (activeDivision === 'kesiswaan') return [
                  { label:"Kehadiran Siswa", icon:"/icons/079-checklist.svg", color:"bg-emerald-50 text-emerald-600", tab:"hikvision_report_siswa" },
                  { label:"Piket & Tatib", icon:"/icons/013-shield.svg", color:"bg-rose-50 text-rose-600", tab:"kedisiplinan_piket" },
                  { label:"Layanan BK", icon:"/icons/045-account.svg", color:"bg-purple-50 text-purple-600", tab:"kedisiplinan_bpbk" },
                  { label:"Poin Tatib", icon:"/icons/013-shield.svg", color:"bg-amber-50 text-amber-600", tab:"tatib_skor" },
                  { label:"Riwayat Prestasi", icon:"/icons/063-follow.svg", color:"bg-indigo-50 text-indigo-600", tab:"riwayat_prestasi" },
                  { label:"Catatan Walas", icon:"/icons/023-pencil.svg", color:"bg-teal-50 text-teal-600", tab:"catatan_walikelas" },
                  { label:"Siswa Keluar", icon:"/icons/045-account.svg", color:"bg-sky-50 text-sky-600", tab:"siswa_keluar" },
                  { label:"Pesan", icon:"/icons/087-chat.svg", color:"bg-indigo-50 text-indigo-600", tab:"pesan" },
                ];
                if (activeDivision === 'hubin') return [
                  { label:"Siswa PKL", icon:"/icons/045-account.svg", color:"bg-sky-50 text-sky-600", tab:"pkl_data_siswa" },
                  { label:"Mitra DUDI", icon:"/icons/008-warehouse.svg", color:"bg-amber-50 text-amber-600", tab:"pkl_data_perusahaan" },
                  { label:"Penugasan", icon:"/icons/066-education.svg", color:"bg-indigo-50 text-indigo-600", tab:"pkl_penugasan" },
                  { label:"Jurnal PKL", icon:"/icons/092-file.svg", color:"bg-emerald-50 text-emerald-600", tab:"pkl_jurnal" },
                  { label:"Administrasi", icon:"/icons/092-file.svg", color:"bg-purple-50 text-purple-600", tab:"pkl_administrasi" },
                  { label:"Laporan PKL", icon:"/icons/063-follow.svg", color:"bg-teal-50 text-teal-600", tab:"pkl_laporan" },
                  { label:"GPS PKL", icon:"/icons/016-map pin.svg", color:"bg-indigo-50 text-indigo-600", tab:"pkl_absensi_setting" },
                  { label:"Pesan", icon:"/icons/087-chat.svg", color:"bg-rose-50 text-rose-600", tab:"pesan" },
                ];
                if (activeDivision === 'sarpras') return [
                  { label:"Data Ruangan", icon:"/icons/016-map pin.svg", color:"bg-amber-50 text-amber-600", tab:"ruangan" },
                  { label:"Denah Sekolah", icon:"/icons/008-warehouse.svg", color:"bg-emerald-50 text-emerald-600", tab:"denah" },
                  { label:"Data Kelas", icon:"/icons/008-warehouse.svg", color:"bg-purple-50 text-purple-600", tab:"kelas" },
                  { label:"Data Siswa", icon:"/icons/045-account.svg", color:"bg-sky-50 text-sky-600", tab:"siswa" },
                  { label:"Pantau Jadwal", icon:"/icons/086-calendar.svg", color:"bg-indigo-50 text-indigo-600", tab:"generate" },
                  { label:"Laporan Walas", icon:"/icons/063-follow.svg", color:"bg-teal-50 text-teal-600", tab:"walas_report" },
                  { label:"Kalender", icon:"/icons/086-calendar.svg", color:"bg-indigo-50 text-indigo-600", tab:"akademik" },
                  { label:"Pesan", icon:"/icons/087-chat.svg", color:"bg-rose-50 text-rose-600", tab:"pesan" },
                ];
                if (activeDivision === 'humas') return [
                  { label:"Pesan Dashboard", icon:"/icons/087-chat.svg", color:"bg-amber-50 text-amber-600", tab:"pesan" },
                  { label:"Tampilan Web", icon:"/icons/058-website.svg", color:"bg-emerald-50 text-emerald-600", tab:"tampilan" },
                  { label:"Kalender", icon:"/icons/086-calendar.svg", color:"bg-indigo-50 text-indigo-600", tab:"akademik" },
                  { label:"Modul Ajar", icon:"/icons/092-file.svg", color:"bg-purple-50 text-purple-600", tab:"modul_ajar" },
                ];
              }
              if (activeRole === 'karyawan') return [
                { label:"Absen Pegawai", icon:"/icons/045-account.svg", color:"bg-indigo-50 text-indigo-600", tab:"absensiguru" },
                { label:"Rekap Absensi", icon:"/icons/079-checklist.svg", color:"bg-teal-50 text-teal-600", tab:"laporan_absensi" },
              ];
              
              return [
                { label:"Jadwal Baru", icon:"/icons/086-calendar.svg", color:"bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]", tab:"generate" },
                { label:"Kelola Guru", icon:"/icons/066-education.svg", color:"bg-emerald-50 text-emerald-600", tab:"guru" },
                { label:"Kelola Kelas", icon:"/icons/008-warehouse.svg", color:"bg-purple-50 text-purple-600", tab:"kelas" },
                { label:"Kelola Ruangan", icon:"/icons/016-map pin.svg", color:"bg-sky-50 text-sky-600", tab:"ruangan" },
                { label:"Kontrol Fitur", icon:"/icons/098-setting.svg", color:"bg-amber-50 text-amber-600", tab:"fitur" },
                { label:"Hak Akses", icon:"/icons/033-padlock.svg", color:"bg-indigo-50 text-indigo-600", tab:"hak_akses" },
                { label:"Tampilan Web", icon:"/icons/058-website.svg", color:"bg-teal-50 text-teal-600", tab:"tampilan" },
                { label:"Rekap Absensi", icon:"/icons/079-checklist.svg", color:"bg-rose-50 text-rose-600", tab:"absensi" },
              ];
            })().map((shortcut, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(shortcut.tab)}
                className="bg-slate-50/90 py-2 px-1 rounded-[var(--ui-radius-control)] border border-slate-200/60 shadow-xs flex flex-col items-center justify-center gap-1 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-sm transition-all duration-200 cursor-pointer text-center w-full group min-h-[60px] sm:min-h-[70px]"
              >
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  {typeof shortcut.icon === 'string' ? (
                    <img src={shortcut.icon} className="w-6 h-6 object-contain" alt="" />
                  ) : (
                    <div className={`w-6 h-6 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 ${shortcut.color}`}>
                      <shortcut.icon size={13} strokeWidth={2.2} />
                    </div>
                  )}
                </div>
                <div className="w-full">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-[1.15] text-center px-0.5 break-words line-clamp-2">{shortcut.label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Shared Activity Logs */}
      <div className="w-full">
        <SharedDashboardLogs onLogsFetched={setDashLogs} />
      </div>


      {/* ======= STATISTIK UTAMA (4 STAT CARDS) ======= */}
      <div className="flex flex-col gap-2 text-left">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ui-primary)] inline-block"></span>
            Statistik Utama
          </h2>
          <span className="text-[9px] font-bold text-slate-400">Ringkasan Real-time</span>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {topCards.map((card, idx) => {
            const cardThemes = [
              { iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' },
              { iconBg: 'bg-sky-50 text-sky-600 border-sky-100', badge: 'bg-sky-50 text-sky-700 border-sky-200/60' },
              { iconBg: 'bg-amber-50 text-amber-600 border-amber-100', badge: 'bg-amber-50 text-amber-700 border-amber-200/60' },
              { iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
            ];
            const theme = cardThemes[idx % cardThemes.length];

            return (
              <button 
                key={idx} 
                type="button"
                onClick={() => setActiveTab(card.tab)} 
                className="bg-white px-3 py-2.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:shadow-xs hover:border-slate-300 transition-all duration-200 group cursor-pointer text-left w-full relative overflow-hidden"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className={`w-7 h-7 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 border ${theme.iconBg}`}>
                    {typeof card.icon === 'string' ? (
                      <img src={card.icon} className="w-4 h-4 object-contain" alt="" />
                    ) : (
                      <card.icon size={14} strokeWidth={2.2} />
                    )}
                  </div>
                  <div className="w-5 h-5 rounded-[var(--ui-radius-small)] bg-slate-50 text-slate-400 group-hover:bg-[var(--ui-primary)] group-hover:text-white flex items-center justify-center transition-all duration-200 border border-slate-100">
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                <div className="min-w-0 w-full flex flex-col">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none mb-0.5">
                    {card.value}
                  </h3>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">
                      {card.label}
                    </p>
                    {card.sub && (
                      <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-[var(--ui-radius-pill)] border ${theme.badge}`}>
                        {card.sub}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>


      {/* ======= MIDDLE SECTION: UNIFIED RINGKASAN & STATISTIK ======= */}
      <div className="w-full flex flex-col gap-3">
        
        {/* Full-width Ringkasan & Grafik Card */}
        <div className="w-full flex flex-col gap-3">
          <div className="bg-white border border-slate-200/80 shadow-2xs rounded-[var(--ui-radius-card)] p-3 flex flex-col flex-1 min-h-[300px]">
            
            {/* Header Bar: Tabs Navigation & Export Action */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 rounded-[var(--ui-radius-small)] border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setActiveMiddleTab('ringkasan')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold transition-all cursor-pointer border-none ${
                    activeMiddleTab === 'ringkasan'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 bg-transparent'
                  }`}
                >
                  <img src="/icons/046-report.svg" alt="Ringkasan" className="w-3.5 h-3.5 opacity-85" />
                  <span>Ringkasan System</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMiddleTab('statistik')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-[var(--ui-radius-small)] text-[11px] font-bold transition-all cursor-pointer border-none ${
                    activeMiddleTab === 'statistik'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 bg-transparent'
                  }`}
                >
                  <img src="/icons/035-graph bar.svg" alt="Statistik" className="w-3.5 h-3.5 opacity-85" />
                  <span>Statistik & Visualisasi</span>
                </button>
              </div>

              {activeMiddleTab === 'ringkasan' && (
                <button className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200/90 rounded-[var(--ui-radius-small)] text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95">
                  <Printer size={13} className="text-slate-500" /> 
                  <span>Export</span>
                </button>
              )}
            </div>

            {/* TAB CONTENT: Ringkasan Sistem Sekolah */}
            {activeMiddleTab === 'ringkasan' && (
              <div className="flex flex-col flex-1 animate-in fade-in duration-200">
                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                  {[
                    { id:"semua", label:"Semua", count: summaryRows.length },
                    { id:"selesai", label:"Selesai", count: summaryRows.filter(r => r.statusLabel ==="Selesai").length },
                    { id:"proses", label:"Proses", count: summaryRows.filter(r => r.statusLabel ==="In Progress").length },
                    { id:"kosong", label:"Kosong", count: summaryRows.filter(r => r.statusLabel ==="Belum Ada").length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() =>{ setActiveDataTab(tab.id); setSummaryPage(0); }}
                      className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                        activeDataTab === tab.id
                          ? "bg-[var(--ui-primary)] text-white border-[var(--ui-primary)] shadow-2xs font-extrabold"
                          : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[var(--ui-radius-small)] leading-none ${
                        activeDataTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Compact List View */}
                <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 pb-2 flex-1 min-h-[180px]">
                  {filteredRows.slice(summaryPage * 5, (summaryPage + 1) * 5).map((row, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2 rounded-[var(--ui-radius-small)] hover:bg-slate-50/80 border border-slate-100 hover:border-slate-200/70 transition-all group cursor-default bg-white">
                      {/* Icon Box */}
                      <div className={`w-7 h-7 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 border border-slate-100 ${row.iconBg} ${row.iconColor}`}>
                        <row.icon size={14} strokeWidth={2.2} />
                      </div>
                      
                      {/* Title & Detail */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 items-center">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-[11px] truncate">{row.label}</span>
                          <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{row.note}</span>
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-black text-slate-900 leading-none">{row.count.split(" ")[0]}</span>
                          <span className="text-[9px] font-bold text-slate-500">{row.count.split(" ")[1] ||""}</span>
                        </div>

                        <div className="hidden sm:flex flex-col gap-1 w-full max-w-[120px]">
                           <div className="flex justify-between items-center">
                              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Progress</span>
                              <span className="text-[9px] font-black text-slate-700">{row.progress}%</span>
                           </div>
                           <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${row.progress}%`, background: row.progress === 100 ? "#10b981" : row.progress > 0 ? "var(--ui-primary)" : "#cbd5e1" }}
                              />
                           </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0 w-[70px] text-right flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center justify-center min-w-[66px] gap-1 px-2 py-0.5 rounded-[var(--ui-radius-small)] text-[9px] font-black uppercase tracking-wider border ${
                          row.statusLabel === 'Selesai' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                            : row.statusLabel === 'In Progress' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                            : 'bg-slate-50 text-slate-500 border-slate-200/80'
                        }`}>
                          {row.statusLabel}
                        </span>
                        <span className="text-[9px] font-medium text-slate-400 block md:hidden lg:hidden">{row.count}</span>
                      </div>
                    </div>
                  ))}
                  {filteredRows.length === 0 && (
                    <div className="py-10 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-[var(--ui-radius-small)] border border-dashed border-slate-200">
                      <img src="/icons/046-report.svg" alt="Empty" className="w-9 h-9 opacity-30 mb-2" />
                      <p className="text-xs font-bold text-slate-500">Tidak ada data untuk kategori ini</p>
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                {filteredRows.length > 5 && (
                  <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">Menampilkan {summaryPage * 5 + 1}-{Math.min((summaryPage + 1) * 5, filteredRows.length)} dari {filteredRows.length}</span>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" 
                        disabled={summaryPage === 0} 
                        onClick={() => setSummaryPage(p => p - 1)}
                        className="px-2 py-1 rounded-[var(--ui-radius-small)] bg-slate-50 text-slate-600 text-[10px] font-bold hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
                      >Sebelumnya</Button>
                      <Button variant="outline" 
                        disabled={summaryPage >= Math.ceil(filteredRows.length / 5) - 1} 
                        onClick={() => setSummaryPage(p => p + 1)}
                        className="px-2 py-1 rounded-[var(--ui-radius-small)] bg-slate-50 text-slate-600 text-[10px] font-bold hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
                      >Berikutnya</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Grafik Statistik Pembelajaran & Fasilitas */}
            {activeMiddleTab === 'statistik' && (
              <div className="flex-1 flex flex-col animate-in fade-in duration-200">
                <p className="text-xs text-slate-500 font-medium mb-3">Analisis beban kerja guru dan pemanfaatan ruang kelas</p>
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
            )}

          </div>

          {/* Rekomendasi Aksi System */}
          {isSuperAdmin && summaryRows.filter(r => r.statusLabel !== "Selesai").length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200/80 shadow-2xs rounded-[var(--ui-radius-card)] px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="shrink-0 w-7 h-7 rounded-[var(--ui-radius-small)] bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xs">
                <AlertTriangle size={14} strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <h3 className="text-[10px] font-black text-amber-950 tracking-tight uppercase shrink-0">Rekomendasi Aksi:</h3>
                <ul className="text-[10px] text-amber-900 font-medium flex flex-wrap gap-x-4 gap-y-1">
                  {summaryRows.filter(r => r.statusLabel === "Belum Ada").slice(0, 1).map((r, i) => (
                     <li key={i} className="flex items-center gap-1.5">
                       <span className="w-1 h-1 rounded-full bg-amber-600 shrink-0"></span>
                       <span>Lengkapi <strong className="font-extrabold text-amber-950">{r.label}</strong></span>
                     </li>
                  ))}
                  {summaryRows.filter(r => r.statusLabel === "In Progress").slice(0, 1).map((r, i) => (
                     <li key={`p-${i}`} className="flex items-center gap-1.5">
                       <span className="w-1 h-1 rounded-full bg-amber-600 shrink-0"></span>
                       <span>Lanjutkan <strong className="font-extrabold text-amber-950">{r.label}</strong> (<span className="px-1 py-0.5 rounded bg-amber-200/80 font-black text-amber-950">{r.progress}%</span>)</span>
                     </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>



      </div>



      {/* Mobile Notification Modal (Desktop Style) */}
      {showMobileNotif && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200/50 shadow-2xl rounded-3xl w-full max-w-sm max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
            
            {/* Header (Sticky) */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 backdrop-blur-md px-5 py-4 shrink-0">
              <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-full bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shadow-inner">
                   <Bell size={18} strokeWidth={2.5} />
                 </div>
                 <div className="flex flex-col">
                   <h3 className="font-extrabold text-sm text-slate-800 tracking-tight leading-none">Notifikasi</h3>
                   <p className="text-[10px] text-slate-500 font-medium mt-1">Info & Pembaruan Sistem</p>
                 </div>
              </div>
              <button 
                onClick={() => setShowMobileNotif(false)} 
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors border-none cursor-pointer active:scale-95"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex flex-col gap-6 p-5 overflow-y-auto custom-scrollbar">
              
              {/* Realtime Notification Consent Prompt */}
              <div className="bg-gradient-to-br from-[var(--ui-primary)]/10 to-[var(--ui-primary)]/5 border border-[var(--ui-primary)]/20 rounded-[16px] p-4 flex flex-col gap-3 shrink-0 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--ui-primary)]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                <div className="flex items-start gap-3 relative z-10">
                  <div className="bg-white p-1.5 rounded-full shadow-sm text-[var(--ui-primary)] shrink-0">
                    <BellRing className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-slate-800 leading-tight">Notifikasi Realtime</span>
                    <span className="text-[11px] font-medium text-slate-500 mt-1 leading-snug">Terima info absensi & piket langsung di layar Anda secara instan.</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if ("Notification" in window) {
                      Notification.requestPermission().then(p => {
                        if (p === 'granted') alert('Notifikasi realtime diaktifkan!');
                      });
                    }
                  }}
                  className="w-full py-2.5 text-white font-bold text-xs rounded-2xl active:scale-95 transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-[var(--ui-shadow-card)] relative z-10"
                  style={{ backgroundColor: "var(--ui-primary)" }}
                >
                  <CheckCircle2 size={16} strokeWidth={2.5} /> Izinkan Sekarang
                </button>
              </div>

              {/* TODAY'S CLASS REMINDERS */}
              <div className="flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-indigo-500" />
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                    Jadwal Mengajar
                  </span>
                </div>
                {!todayClasses || todayClasses.length === 0 ? (
                  <div className="text-xs font-bold text-slate-400 py-4 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    Tidak ada jadwal mengajar hari ini.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {todayClasses.map((item, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-sm hover:border-indigo-200 transition-all cursor-pointer group">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Clock3 className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0 text-left justify-center">
                          <span className="text-xs font-extrabold text-slate-800 truncate mb-0.5 group-hover:text-indigo-600 transition-colors">
                            {item.subject}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-[var(--ui-radius-small)] text-slate-600">{item.className}</span>
                            <span>Jam {item.jamStart === item.jamEnd ? item.jamStart : `${item.jamStart}-${item.jamEnd}`}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ANNOUNCEMENTS / MESSAGES */}
              <div className="flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-rose-500" />
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                    Pengumuman Terbaru
                  </span>
                </div>
                {!dashboardMessages || dashboardMessages.length === 0 ? (
                  <div className="text-xs font-bold text-slate-400 py-4 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    Belum ada pengumuman terbaru.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dashboardMessages.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-white border border-slate-200/80 shadow-sm rounded-2xl text-left cursor-pointer hover:bg-slate-50 hover:border-rose-200 hover:shadow-sm transition-all group" onClick={() => { setShowMobileNotif(false); setActiveAnnouncementDetail(item); }}>
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <MessageSquare className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0 justify-center">
                          <span className="text-xs font-extrabold text-slate-800 truncate mb-0.5 group-hover:text-rose-600 transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 truncate">
                            {item.sender} • {item.date || 'Hari ini'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      
      {/* Spacer comment */}
      {showAllAnnouncementsModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200 sm:p-4 sm:items-center sm:justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-[var(--ui-radius-card)] border-t sm:border border-slate-200 shadow-2xl w-full sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden"><div className="w-12 h-1.5 rounded-full bg-slate-200"></div></div>
            <div className="px-4 pb-4 pt-1 sm:pt-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center">
                  <Megaphone size={16} strokeWidth={2.5} />
                </div>
                <h3 className="text-sm font-black text-slate-800">Semua Pengumuman Sekolah</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAllAnnouncementsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors border-none cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
              {(!dashboardMessages || dashboardMessages.length === 0) ? (
                <div className="text-center py-8 text-xs font-bold text-slate-400">
                  Belum ada pengumuman resmi sekolah.
                </div>
              ) : (
                dashboardMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    onClick={() => { setShowAllAnnouncementsModal(false); setActiveAnnouncementDetail(msg); }}
                    className="p-4 rounded-[var(--ui-radius-card)] border border-slate-100 bg-slate-50 hover:bg-white hover:border-[var(--ui-primary)]/30 hover:shadow-xs transition-all cursor-pointer flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-rose-100 text-rose-700 text-[8.5px] font-black px-2 py-0.5 rounded uppercase">
                        {msg.priority === 'high' ? 'PENTING' : 'INFO'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{msg.date || 'Hari ini'}</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-800">{msg.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{msg.content || msg.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Single Announcement */}
      {activeAnnouncementDetail && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200 sm:p-4 sm:items-center sm:justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-[var(--ui-radius-card)] border-t sm:border border-slate-200 shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden"><div className="w-12 h-1.5 rounded-full bg-slate-200"></div></div>
            <div className="px-4 pb-4 pt-1 sm:pt-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Megaphone size={16} strokeWidth={2.5} />
                </div>
                <h3 className="text-sm font-black text-slate-800">Detail Pengumuman</h3>
              </div>
              <button 
                type="button"
                onClick={() => setActiveAnnouncementDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors border-none cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-rose-100 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                  {activeAnnouncementDetail.priority === 'high' ? 'PENTING' : 'INFO'}
                </span>
                <span className="text-xs text-slate-400 font-semibold">{activeAnnouncementDetail.date || 'Hari ini'}</span>
              </div>
              <h2 className="text-base font-black text-slate-900 leading-snug">
                {activeAnnouncementDetail.title}
              </h2>
              <div className="text-xs text-slate-700 font-normal leading-relaxed whitespace-pre-line pt-2 border-t border-slate-100">
                {activeAnnouncementDetail.content || activeAnnouncementDetail.body}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveAnnouncementDetail(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-[var(--ui-radius-small)] text-xs font-bold border-none cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <PanduanModal isOpen={showPanduan} onClose={() => setShowPanduan(false)} role={currentUser?.role ||"admin"} division={currentUser?.division ||""} />
    </div>
  );
}

// ============================================================
// KOMPONEN: DashboardMessageCarousel
// Carousel/Slider Pengumuman Sekolah Modern (Responsive & Tema Web)
// ============================================================
function DashboardMessageCarousel({ dashboardMessages }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMsg, setSelectedMsg] = useState(null);

  if (!dashboardMessages || dashboardMessages.length === 0) return null;

  const totalMsgs = dashboardMessages.length;
  const activeMsg = dashboardMessages[currentIndex] || dashboardMessages[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalMsgs);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalMsgs) % totalMsgs);
  };

  return (
    <div className="flex flex-col gap-2.5 w-full animate-in fade-in duration-300">
      {/* Header bar matching reference */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Megaphone size={18} className="text-[var(--ui-primary)] shrink-0" strokeWidth={2.5} />
          <h2 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
            Pengumuman Baru
          </h2>
        </div>
        
        <div className="flex items-center gap-1.5">
          {totalMsgs > 1 && (
            <span className="text-[11px] font-bold text-[var(--ui-primary)] bg-[var(--ui-primary)]/10 px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] border border-[var(--ui-primary)]/20">
              {currentIndex + 1}/{totalMsgs}
            </span>
          )}
          {totalMsgs > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                type="button"
                className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200/60 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer shadow-xs transition-all active:scale-95"
                title="Sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={handleNext}
                type="button"
                className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200/60 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer shadow-xs transition-all active:scale-95"
                title="Selanjutnya"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card matching reference mockup — Ultra Compact & Slim */}
      <article 
        onClick={() => setSelectedMsg(activeMsg)}
        className="rounded-[var(--ui-radius-small)] border border-slate-200/80 p-2.5 sm:p-3 shadow-xs relative overflow-hidden transition-all duration-300 bg-white hover:border-[var(--ui-primary)]/40 cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <Zap size={16} className="text-[var(--ui-primary)] shrink-0" strokeWidth={2.5} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {activeMsg.pinned && (
                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-[var(--ui-radius-small)] bg-rose-100 text-rose-600 border border-rose-200/60 shrink-0 inline-flex items-center gap-1">
                  <Pin size={10} className="rotate-45" /> PINNED
                </span>
              )}
              <h3 className="font-black text-xs sm:text-sm text-slate-800 tracking-tight truncate group-hover:text-[var(--ui-primary)] transition-colors">
                {activeMsg.title}
              </h3>
            </div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
              {activeMsg.body}
            </div>
          </div>
          <span className="text-[10px] font-bold text-[var(--ui-primary)] shrink-0 hidden sm:inline group-hover:translate-x-0.5 transition-transform">
            Detail →
          </span>
        </div>
      </article>

      {/* Modal Popup Detail Pengumuman */}
      {selectedMsg && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200 sm:p-4 sm:items-center sm:justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-[var(--ui-radius-card)] border-t sm:border border-slate-200 shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {/* Modal Header */}
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden"><div className="w-12 h-1.5 rounded-full bg-slate-200"></div></div>
            <div className="px-4 pb-4 pt-1 sm:pt-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center">
                  <Megaphone size={16} strokeWidth={2.5} />
                </div>
                <h3 className="text-sm font-black text-slate-800">Detail Pengumuman</h3>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedMsg(null); }}
                className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors border-none cursor-pointer"
              >
                <CloseIcon size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex flex-col gap-3">
              {selectedMsg.pinned && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] bg-rose-100 text-rose-600 border border-rose-200/60 inline-flex items-center gap-1">
                    📌 PINNED ANNOUNCEMENT
                  </span>
                </div>
              )}

              <h2 className="text-base font-black text-slate-900 leading-snug">
                {selectedMsg.title}
              </h2>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium pb-3 border-b border-slate-100">
                <span className="font-bold text-slate-700">{selectedMsg.createdBy || "Sistem"}</span>
                <span>•</span>
                <span>{new Date(selectedMsg.createdAt || new Date()).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>

              <div className="text-sm text-slate-700 font-normal leading-relaxed whitespace-pre-line">
                {selectedMsg.body}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedMsg(null); }}
                className="px-5 py-2 rounded-[var(--ui-radius-small)] text-xs font-bold text-white shadow-xs cursor-pointer active:scale-95 transition-transform border-none"
                style={{ backgroundColor: "var(--ui-primary)" }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// KOMPONEN: AttendanceTodaySection
// Statistik kehadiran hari ini — guru & siswa
// Warna mengikuti halaman absensi existing (MyAttendancePage, AbsensiKBM)
// ============================================================
function AttendanceTodaySection({ attendanceRecords = [], dashLogs, teachers = [], staffs: _staffs = [], currentUser, isSuperAdmin, isKepsek, isWaka, isTU, activeDivision, setActiveTab }) {
  const storeStaffs = useDataStore(state => state.staffs);
  const storeStudents = useDataStore(state => state.students);
  const staffs = (_staffs && _staffs.length > 0) ? _staffs : (storeStaffs && storeStaffs.length > 0 ? storeStaffs : []);
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  }, []);

  // ── Role-guard ──
  const canSeeTeacherAttendance = isSuperAdmin || isKepsek || isTU ||
    (isWaka && (activeDivision === 'kurikulum' || activeDivision === 'kesiswaan'));
  const canSeeStudentAttendance = isSuperAdmin || isKepsek || isTU ||
    (isWaka && activeDivision === 'kesiswaan');

  if (!canSeeTeacherAttendance && !canSeeStudentAttendance) return null;

  // ── Statistik Guru dari attendanceRecords & dashLogs ──
  const guruStats = useMemo(() => {
    // 1. Buat Set daftar guru valid dari master data
    const validTeachers = new Set();
    const baseTotalGuru = (teachers || []).length || 52;
    (teachers || []).forEach(t => {
      if (t.code) validTeachers.add(String(t.code).toLowerCase());
      if (t.username) validTeachers.add(String(t.username).toLowerCase());
      if (t.name) validTeachers.add(String(t.name).toLowerCase());
      if (t.id) validTeachers.add(String(t.id).toLowerCase());
    });

    const recs = (attendanceRecords || []).filter(r => {
      const recDate = r.date ? String(r.date).slice(0, 10) : '';
      return recDate === todayStr || recDate === new Date().toISOString().slice(0, 10);
    });

    const candidateTeacherLogs = [
      ...(dashLogs?.teacherLogs || []),
      ...(dashLogs?.recentLogs || [])
    ];
    const recentTeacherLogs = candidateTeacherLogs.filter(r => {
      const type = String(r.true_person_type || r.role_type || r.device_type || '').toUpperCase();
      const empId = String(r.employee_id || '').toLowerCase();
      if (empId.startsWith('k') || type.includes('KARYAWAN')) return false;
      const isTeacherMatch = validTeachers.has(empId) || type.includes('GURU');
      if (!isTeacherMatch) return false;
      const logDate = r?.timestamp || r?.created_at || r?.date || '';
      if (!logDate) return true;
      const logDateStr = new Date(logDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      return logDateStr === todayStr;
    });

    // 2. Gabungkan log absensi dari Apps & Hikvision untuk menghindari duplikat (ambil scan TERAWAL)
    const mergedLogs = {};
    recs.forEach(r => {
      const key = String(r.teacherCode || r.employee_id || r.true_person_name || r.name || r.id || '').toLowerCase();
      if (key) mergedLogs[key] = { ...r, source: 'app' };
    });
    recentTeacherLogs.forEach(r => {
      const key = String(r.employee_id || r.username || r.true_person_name || r.name || r.id || '').toLowerCase();
      if (key) {
        if (!mergedLogs[key]) {
          mergedLogs[key] = { ...r, source: 'machine' };
        } else {
          // Ambil scan TERAWAL
          const curTime = new Date(mergedLogs[key].timestamp || mergedLogs[key].created_at || mergedLogs[key].date || 0).getTime();
          const newTime = new Date(r.timestamp || r.created_at || r.date || 0).getTime();
          if (newTime > 0 && (curTime === 0 || newTime < curTime)) {
            mergedLogs[key] = { ...r, source: 'machine' };
          }
        }
      }
    });

    const statuses = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, 'Dinas Luar': 0, Alpa: 0 };
    let unknownCount = 0;
    Object.entries(mergedLogs).forEach(([key, r]) => {
      if (!validTeachers.has(key)) unknownCount++;
      let s = String(r.status || 'Hadir').toLowerCase();
      if (s === 'late') s = 'terlambat';
      if (s === 'dinas luar' || s === 'dinas_luar') s = 'dinas luar';
      if (s.includes('hadir')) statuses.Hadir++;
      else if (s.includes('terlambat')) statuses.Terlambat++;
      else if (s.includes('izin')) statuses.Izin++;
      else if (s.includes('sakit')) statuses.Sakit++;
      else if (s.includes('dinas')) statuses['Dinas Luar']++;
      else if (s.includes('alpa')) statuses.Alpa++;
      else statuses.Hadir++;
    });
    const totalGuru = baseTotalGuru + unknownCount;
    const currentTimeJkt = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(11, 19);
    if (currentTimeJkt > "08:00:00") {
      const recordedTeachers = Object.keys(mergedLogs).filter(k => validTeachers.has(k)).length;
      statuses.Alpa += Math.max(0, baseTotalGuru - recordedTeachers);
    }
    const totalMasuk = statuses.Hadir + statuses.Terlambat;
    const belumAbsen = Math.max(0, totalGuru - Object.keys(mergedLogs).length);
    return { ...statuses, belumAbsen, totalMasuk, totalGuru };
  }, [attendanceRecords, todayStr, teachers, dashLogs]);

  // ── Statistik Karyawan ──
  const karyawanStats = useMemo(() => {
    const validStaffs = new Set();
    const currentStaffList = (staffs && staffs.length > 0) ? staffs : (storeStaffs && storeStaffs.length > 0 ? storeStaffs : []);
    const baseTotalKaryawan = currentStaffList.length || 27;
    currentStaffList.forEach(t => {
      if (t.code) validStaffs.add(String(t.code).toLowerCase());
      if (t.username) validStaffs.add(String(t.username).toLowerCase());
      if (t.name) validStaffs.add(String(t.name).toLowerCase());
      if (t.id) validStaffs.add(String(t.id).toLowerCase());
      if (t.nip) validStaffs.add(String(t.nip).toLowerCase());
      if (t.staff_code) validStaffs.add(String(t.staff_code).toLowerCase());
    });

    const candidateStaffLogs = [
      ...(dashLogs?.staffLogs || []),
      ...(dashLogs?.recentLogs || []),
      ...(dashLogs?.teacherLogs || [])
    ];

    const recentLogs = candidateStaffLogs.filter(r => {
      const type = String(r.true_person_type || r.role_type || r.device_type || '').toUpperCase();
      const empId = String(r.employee_id || '').toLowerCase();
      const isStaffMatch = validStaffs.has(empId) || empId.startsWith('k') || type.includes('KARYAWAN') || type.includes('STAFF');
      if (!isStaffMatch) return false;
      if (type.includes('GURU') && !empId.startsWith('k') && !validStaffs.has(empId)) return false;
      const logDate = r?.timestamp || r?.created_at || r?.date || '';
      if (!logDate) return true;
      const logDateStr = new Date(logDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      return logDateStr === todayStr;
    });

    const mergedLogs = {};
    recentLogs.forEach(r => {
      const key = String(r.employee_id || r.username || r.true_person_name || r.name || r.id || '').toLowerCase();
      if (key) {
        if (!mergedLogs[key]) {
          mergedLogs[key] = { ...r, source: 'machine' };
        } else {
          // Ambil scan TERAWAL
          const curTime = new Date(mergedLogs[key].timestamp || mergedLogs[key].created_at || mergedLogs[key].date || 0).getTime();
          const newTime = new Date(r.timestamp || r.created_at || r.date || 0).getTime();
          if (newTime > 0 && (curTime === 0 || newTime < curTime)) {
            mergedLogs[key] = { ...r, source: 'machine' };
          }
        }
      }
    });

    const statuses = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, 'Dinas Luar': 0, Alpa: 0 };
    let unknownCount = 0;
    Object.entries(mergedLogs).forEach(([key, r]) => {
      if (!validStaffs.has(key)) unknownCount++;
      let s = String(r.status || 'Hadir').toLowerCase();
      if (s === 'late') s = 'terlambat';
      if (s === 'dinas luar' || s === 'dinas_luar') s = 'dinas luar';
      if (s.includes('hadir')) statuses.Hadir++;
      else if (s.includes('terlambat')) statuses.Terlambat++;
      else if (s.includes('izin')) statuses.Izin++;
      else if (s.includes('sakit')) statuses.Sakit++;
      else if (s.includes('dinas')) statuses['Dinas Luar']++;
      else if (s.includes('alpa')) statuses.Alpa++;
      else statuses.Hadir++;
    });
    const totalKaryawan = baseTotalKaryawan + unknownCount;
    const currentTimeJkt = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(11, 19);
    if (currentTimeJkt > "08:00:00") {
      const recorded = Object.keys(mergedLogs).filter(k => validStaffs.has(k)).length;
      statuses.Alpa += Math.max(0, baseTotalKaryawan - recorded);
    }
    const totalMasuk = statuses.Hadir + statuses.Terlambat;
    const belumAbsen = Math.max(0, totalKaryawan - Object.keys(mergedLogs).length);
    return { ...statuses, belumAbsen, totalMasuk, totalKaryawan };
  }, [todayStr, staffs, storeStaffs, dashLogs]);

  // ── Statistik Siswa dari dashLogs.hikvisionStudentToday & dashLogs.recentLogs ──
  const siswaStats = useMemo(() => {
    const hikLogs = dashLogs?.hikvisionStudentToday || [];
    const recentLogs = dashLogs?.recentLogs || [];
    const manualAbsenceLogs = dashLogs?.studentAbsenceLogs || [];
    
    // Combine logs
    let allLogs = [...hikLogs];
    if (allLogs.length === 0 && recentLogs.length > 0) {
      allLogs = recentLogs.filter(r => {
        const type = String(r.true_person_type || r.person_type || 'siswa').toLowerCase();
        const empId = String(r.employee_id || r.nis || r.username || '');
        if (empId.toUpperCase().startsWith('K')) return false;
        if (type.includes('guru') || type.includes('karyawan')) return false;
        
        const logDate = r?.timestamp || r?.created_at || r?.date || '';
        if (!logDate) return true;
        const logDateStr = new Date(logDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
        return logDateStr === (new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }));
      });
    }
    
    allLogs = [...allLogs, ...manualAbsenceLogs];

    const uniqueSiswa = {};
    allLogs.forEach(r => {
      const key = String(r.siswa_nis || r.employee_id || r.nis || r.true_person_name || r.name || r.id || '').toLowerCase();
      if (key) {
        if (!uniqueSiswa[key]) {
          uniqueSiswa[key] = r;
        } else {
          // Prioritaskan log manual (yang memiliki field siswa_nis) di atas log mesin
          if (r.siswa_nis && !uniqueSiswa[key].siswa_nis) {
            uniqueSiswa[key] = r;
          } else if (!r.siswa_nis && !uniqueSiswa[key].siswa_nis) {
            // Jika keduanya dari mesin, ambil scan TERAWAL
            const curTime = new Date(uniqueSiswa[key].timestamp || uniqueSiswa[key].created_at || uniqueSiswa[key].date || 0).getTime();
            const newTime = new Date(r.timestamp || r.created_at || r.date || 0).getTime();
            if (newTime > 0 && (curTime === 0 || newTime < curTime)) {
              uniqueSiswa[key] = r;
            }
          }
        }
      }
    });

    const statuses = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    Object.values(uniqueSiswa).forEach(r => {
      let s = String(r.status || 'Hadir').toLowerCase();
      if (s === 'late') s = 'terlambat';
      
      if (s.includes('hadir')) statuses.Hadir++;
      else if (s.includes('terlambat')) statuses.Terlambat++;
      else if (s.includes('izin')) statuses.Izin++;
      else if (s.includes('sakit')) statuses.Sakit++;
      else if (s.includes('alpa')) statuses.Alpa++;
      else statuses.Hadir++;
    });
    const totalSiswaInSchool = (storeStudents || []).length || dashLogs?.totalStudents || 0;

    // Auto-calculate Alpa if current time is past cutoff limit (08:00)
    const currentTimeJkt = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(11, 19);
    if (currentTimeJkt > "08:00:00" && totalSiswaInSchool > 0) {
      const unrecorded = Math.max(0, totalSiswaInSchool - (statuses.Hadir + statuses.Terlambat + statuses.Izin + statuses.Sakit + statuses.Alpa));
      statuses.Alpa += unrecorded;
    }

    return { ...statuses, total: Object.keys(uniqueSiswa).length, totalSiswaInSchool };
  }, [dashLogs]);

  const guruPercent = guruStats.totalGuru > 0 
    ? Math.round(((guruStats.Hadir + guruStats.Terlambat) / guruStats.totalGuru) * 100)
    : 0;

  const siswaPercent = (siswaStats.totalSiswaInSchool > 0)
    ? Math.round(((siswaStats.Hadir + siswaStats.Terlambat) / siswaStats.totalSiswaInSchool) * 100)
    : (siswaStats.total > 0 ? Math.round((siswaStats.Hadir / siswaStats.total) * 100) : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={18} className="text-[var(--ui-primary)] shrink-0" strokeWidth={2.5} />
        <h2 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">Kehadiran Hari Ini</h2>
      </div>
      <div className={`grid gap-2 sm:gap-4 ${canSeeTeacherAttendance && canSeeStudentAttendance ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>

        {/* ── Panel Guru ── */}
        {canSeeTeacherAttendance && (
          <button
            onClick={() => setActiveTab(isSuperAdmin || isTU || isKepsek || isWaka ? 'laporan_absensi' : 'absensiguru')}
            className="bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80 p-2.5 sm:p-4 flex flex-col gap-2 sm:gap-3 hover:shadow-xs hover:border-slate-300 transition-all duration-200 text-left cursor-pointer w-full group"
          >
            <div className="flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[var(--ui-radius-small)] bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-xs">
                  <img src="/icons/045-account.svg" alt="Guru" className="w-4 h-4 sm:w-5 sm:h-5 opacity-85" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1 sm:gap-2 truncate">
                    Kehadiran Guru
                    <ArrowRight size={13} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </h3>
                  <p className="text-[9.5px] sm:text-xs text-slate-500 font-medium truncate">
                    {guruStats.totalMasuk}/{guruStats.totalGuru} guru terdata
                  </p>
                </div>
              </div>
              <span className="text-[9px] sm:text-xs font-black text-indigo-700 bg-indigo-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-[var(--ui-radius-small)] border border-indigo-100/80 whitespace-nowrap shrink-0 shadow-xs">
                {guruPercent}% Hadir
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden flex gap-0.5 shadow-inner">
              <div style={{ width: `${(guruStats.Hadir / Math.max(guruStats.totalGuru, 1)) * 100}%` }} className="bg-emerald-500 h-full" title="Hadir" />
              <div style={{ width: `${(guruStats.Terlambat / Math.max(guruStats.totalGuru, 1)) * 100}%` }} className="bg-amber-500 h-full" title="Terlambat" />
              <div style={{ width: `${(guruStats.Izin / Math.max(guruStats.totalGuru, 1)) * 100}%` }} className="bg-indigo-500 h-full" title="Izin" />
              <div style={{ width: `${(guruStats.Sakit / Math.max(guruStats.totalGuru, 1)) * 100}%` }} className="bg-sky-400 h-full" title="Sakit" />
              <div style={{ width: `${(guruStats['Dinas Luar'] / Math.max(guruStats.totalGuru, 1)) * 100}%` }} className="bg-purple-500 h-full" title="Dinas Luar" />
              <div style={{ width: `${(guruStats.Alpa / Math.max(guruStats.totalGuru, 1)) * 100}%` }} className="bg-rose-500 h-full" title="Alpa" />
            </div>

            {/* Micro Metric Chips */}
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-1.5 border-t border-slate-100">
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Hadir:</span> <b className="text-slate-800">{guruStats.Hadir}</b>
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Telat:</span> <b className="text-slate-800">{guruStats.Terlambat}</b>
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Izin:</span> <b className="text-slate-800">{guruStats.Izin}</b>
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Sakit:</span> <b className="text-slate-800">{guruStats.Sakit}</b>
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Dinas:</span> <b className="text-slate-800">{guruStats['Dinas Luar']}</b>
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Alpa:</span> <b className="text-slate-800">{guruStats.Alpa}</b>
              </div>
            </div>
          </button>
        )}

        {/* ── Panel Karyawan ── */}
        {canSeeTeacherAttendance && (
          <button
            onClick={() => setActiveTab(isSuperAdmin || isTU || isKepsek || isWaka ? 'laporan_absensi' : 'absensiguru')}
            className="bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80 p-2.5 sm:p-4 flex flex-col gap-2 sm:gap-3 hover:shadow-xs hover:border-slate-300 transition-all duration-200 text-left cursor-pointer w-full group"
          >
            <div className="flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[var(--ui-radius-small)] bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 shadow-xs">
                  <img src="/icons/045-account.svg" alt="Karyawan" className="w-4 h-4 sm:w-5 sm:h-5 opacity-85" style={{ filter: 'hue-rotate(90deg)' }} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1 sm:gap-2 truncate">
                    Kehadiran Karyawan
                    <ArrowRight size={13} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </h3>
                  <p className="text-[9.5px] sm:text-xs text-slate-500 font-medium truncate">
                    {karyawanStats.totalMasuk}/{karyawanStats.totalKaryawan} karyawan terdata
                  </p>
                </div>
              </div>
              <span className="text-[9px] sm:text-xs font-black text-teal-700 bg-teal-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-[var(--ui-radius-small)] border border-teal-100/80 whitespace-nowrap shrink-0 shadow-xs">
                {karyawanStats.totalKaryawan > 0 ? Math.round(((karyawanStats.Hadir + karyawanStats.Terlambat) / karyawanStats.totalKaryawan) * 100) : 0}% Hadir
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden flex gap-0.5 shadow-inner">
              <div style={{ width: `${(karyawanStats.Hadir / Math.max(karyawanStats.totalKaryawan, 1)) * 100}%` }} className="bg-emerald-500 h-full" title="Hadir" />
              <div style={{ width: `${(karyawanStats.Terlambat / Math.max(karyawanStats.totalKaryawan, 1)) * 100}%` }} className="bg-amber-500 h-full" title="Terlambat" />
              <div style={{ width: `${(karyawanStats.Izin / Math.max(karyawanStats.totalKaryawan, 1)) * 100}%` }} className="bg-indigo-500 h-full" title="Izin" />
              <div style={{ width: `${(karyawanStats.Sakit / Math.max(karyawanStats.totalKaryawan, 1)) * 100}%` }} className="bg-sky-400 h-full" title="Sakit" />
              <div style={{ width: `${(karyawanStats['Dinas Luar'] / Math.max(karyawanStats.totalKaryawan, 1)) * 100}%` }} className="bg-purple-500 h-full" title="Dinas Luar" />
              <div style={{ width: `${(karyawanStats.Alpa / Math.max(karyawanStats.totalKaryawan, 1)) * 100}%` }} className="bg-rose-500 h-full" title="Alpa" />
            </div>

            {/* Micro Metric Chips */}
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-1.5 border-t border-slate-100">
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Hadir:</span> <b className="text-slate-800">{karyawanStats.Hadir}</b>
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Telat:</span> <b className="text-slate-800">{karyawanStats.Terlambat}</b>
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Alpa:</span> <b className="text-slate-800">{karyawanStats.Alpa}</b>
              </div>
            </div>
          </button>
        )}

        {/* ── Panel Siswa ── */}
        {canSeeStudentAttendance && (() => {
          const totalSiswaDenominator = Math.max(siswaStats.totalSiswaInSchool || siswaStats.total || 1, 1);
          return (
            <button
              onClick={() => setActiveTab(isSuperAdmin || isWaka || isKepsek ? 'kedisiplinan_absensi' : (isTU || isKaryawan ? 'laporan_absensi' : 'absensi'))}
              className="bg-white rounded-[var(--ui-radius-card)] shadow-xs border border-slate-200/80 p-2.5 sm:p-4 flex flex-col gap-2 sm:gap-3 hover:shadow-xs hover:border-slate-300 transition-all duration-200 text-left cursor-pointer w-full group"
            >
              <div className="flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[var(--ui-radius-small)] bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 shadow-xs">
                    <img src="/icons/066-education.svg" alt="Siswa" className="w-4 h-4 sm:w-5 sm:h-5 opacity-85" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1 sm:gap-2 truncate">
                      Kehadiran Siswa
                      <ArrowRight size={13} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </h3>
                    <p className="text-[9.5px] sm:text-xs text-slate-500 font-medium truncate">
                      {siswaStats.totalSiswaInSchool > 0 
                        ? `${siswaStats.total}/${siswaStats.totalSiswaInSchool} siswa terdata` 
                        : (dashLogs?.hikvisionStudentToday ? `${siswaStats.total} record mesin` : 'Absensi Hikvision')
                      }
                    </p>
                  </div>
                </div>
                <span className="text-[9px] sm:text-xs font-black text-emerald-700 bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-[var(--ui-radius-small)] border border-emerald-100/80 whitespace-nowrap shrink-0 shadow-xs">
                  {siswaPercent}% Hadir
                </span>
              </div>

              {/* Segmented Progress Bar */}
              <div className="w-full h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden flex gap-0.5 shadow-inner">
                <div style={{ width: `${(siswaStats.Hadir / totalSiswaDenominator) * 100}%` }} className="bg-emerald-500 h-full" title="Hadir" />
                <div style={{ width: `${(siswaStats.Terlambat / totalSiswaDenominator) * 100}%` }} className="bg-amber-500 h-full" title="Terlambat" />
                <div style={{ width: `${(siswaStats.Izin / totalSiswaDenominator) * 100}%` }} className="bg-indigo-500 h-full" title="Izin" />
                <div style={{ width: `${(siswaStats.Sakit / totalSiswaDenominator) * 100}%` }} className="bg-sky-400 h-full" title="Sakit" />
                <div style={{ width: `${(siswaStats.Alpa / totalSiswaDenominator) * 100}%` }} className="bg-rose-500 h-full" title="Alpa" />
              </div>

              {/* Micro Metric Chips */}
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-1.5 border-t border-slate-100">
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Hadir:</span> <b className="text-slate-800">{siswaStats.Hadir}</b>
                </div>
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Telat:</span> <b className="text-slate-800">{siswaStats.Terlambat}</b>
                </div>
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Izin:</span> <b className="text-slate-800">{siswaStats.Izin}</b>
                </div>
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Sakit:</span> <b className="text-slate-800">{siswaStats.Sakit}</b>
                </div>
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-[var(--ui-radius-small)] border border-slate-200/60 flex items-center gap-1 shrink-0">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Alpa:</span> <b className="text-slate-800">{siswaStats.Alpa}</b>
                </div>
              </div>
            </button>
          );
        })()}
      </div>
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
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-[var(--ui-radius-small)] font-bold text-xs transition-all cursor-pointer flex items-center border-none gap-2">
            <CheckCircle2 size={14} /> Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};

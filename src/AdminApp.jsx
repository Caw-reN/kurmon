import { useState, useRef, useMemo, useCallback, useEffect, lazy } from 'react';

import { useAppStore } from './store/useAppStore.js';
import { useDataStore } from './store/useDataStore.js';
import { loginViaServer, syncAuthSnapshot as syncAuthSnapshotToServer } from './utils/authApi.js';
import { loadInitialState, normalizeLayoutBlockLabels } from './utils/state.js';
import { clearLegacyLocalStorage } from './utils/dataSource.js';
import { hashPassword, normalizeAdminUser, normalizeTeachers } from './utils/auth.js';
import { assessGenerateReadiness } from './utils/scheduleGeneration.js';
import { DAYS as DATA_DAYS, INITIAL_CLASSES as DATA_INITIAL_CLASSES, INITIAL_ROOMS as DATA_INITIAL_ROOMS, INITIAL_SUBJECTS as DATA_INITIAL_SUBJECTS, INITIAL_TEACHERS as DATA_INITIAL_TEACHERS, INITIAL_TEACHER_AVAILABILITY as DATA_INITIAL_TEACHER_AVAILABILITY, INITIAL_TEACHING_LOADS as DATA_INITIAL_TEACHING_LOADS, MAJORS as DATA_MAJORS, TIME_SLOTS as DATA_TIME_SLOTS } from './data.js';
import { DEFAULT_SIDEBAR_GROUPS, SIDEBAR_GROUP_BY_TAB, DEFAULT_TABLE_SORTS, ATTENDANCE_MODE_OPTIONS, DASHBOARD_MESSAGE_PRIORITIES, DASHBOARD_MESSAGE_TARGETS, WAKA_DIVISION_OPTIONS, WORKSPACE_GUIDES, normalizeUserRole, isSuperAdminRole, isLeadershipRole, getWakaDivisionOption } from './utils/constants.js';
import { PageHeader } from './components/monitoring/ui/index.js';
import { buildAttendanceQrPayload, getJakartaDateParts, getAttendanceSessions, getActiveAttendanceSession, getAttendanceStatusFromSession, getTableRowKey, getTableSearchText, compareTableValues, normalizeText, sameText, getClassKey, getRoomKey, getTeacherKey, getSubjectKey, getLoadKey, parseTeacherCodes, parseCsvList, serializeCsvList, isAllLike, csvIncludesText, csvValueMatches, csvValuesIntersect, csvTextHasAny, removeCsvTextValues, parsePositiveInt, reconcileSubjectCatalog, createClientId, formatExcelSerialDate, getCappedClassCount, writeSessionUser } from './utils/adminHelpers.js';
import { useAdminRenderers } from './components/admin/useAdminRenderers.jsx';
import { useAdminTableRenderer } from './components/admin/useAdminTableRenderer.jsx';
import { useAdminImportExport } from './components/admin/useAdminImportExport.jsx';
import { useAdminScheduleGenerator } from './components/admin/useAdminScheduleGenerator.jsx';
import { useAdminCRUD } from './components/admin/useAdminCRUD.jsx';
import { useAdminDatabaseSync } from './hooks/useAdminDatabaseSync.js';
import { Suspense } from 'react';
import { ChevronDown } from 'lucide-react';
import Login from './pages/Login.jsx';
import AdminSidebar from "./components/admin/AdminSidebar.jsx";
import { AdminHeader } from "./components/admin/AdminHeader.jsx";
import AdminContentRouter from "./components/admin/AdminContentRouter.jsx";
import { WorkspaceGuidePanel } from "./components/WorkspaceGuidePanel.jsx";
import CustomRolesModal from "./components/admin/CustomRolesModal.jsx";
import AdminMobileNav from './components/admin/AdminMobileNav.jsx';
import SystemModals from './components/admin/SystemModals.jsx';
import CrudModals from './components/admin/CrudModals.jsx';
import BulkEditModal from './components/admin/BulkEditModal.jsx';
import DefaultPasswordModal from './components/admin/DefaultPasswordModal.jsx';
import { GlobalAdminUI } from "./components/admin/layout/GlobalAdminUI.jsx";
import { SidebarNavItem, Modal } from './components/ui.jsx';


/* eslint-disable react-hooks/exhaustive-deps */










// 















// === NEW FEATURES ===










const BulkImportModal = lazy(() => import("./components/modals.jsx").then(m => ({
  default: m.BulkImportModal
})));
const TeacherCompetencyModal = lazy(() => import("./components/modals.jsx").then(m => ({
  default: m.TeacherCompetencyModal
})));
const ImportGuideModal = lazy(() => import("./components/modals.jsx").then(m => ({
  default: m.ImportGuideModal
})));
const TeacherSyllabusGuideModal = lazy(() => import("./components/modals.jsx").then(m => ({
  default: m.TeacherSyllabusGuideModal
})));
const SyllabusBatchModal = lazy(() => import("./components/modals.jsx").then(m => ({
  default: m.SyllabusBatchModal
})));
const AcademicCalendarGuideModal = lazy(() => import("./components/modals.jsx").then(m => ({
  default: m.AcademicCalendarGuideModal
})));

/* --- Data Awal --- */
const MAJORS = DATA_MAJORS;
const GRADES = ["X", "XI", "XII", "Semua"];
const INITIAL_CLASSES = DATA_INITIAL_CLASSES;
const INITIAL_TEACHERS = DATA_INITIAL_TEACHERS;
const INITIAL_SUBJECTS = DATA_INITIAL_SUBJECTS.map(subject => ({
  grade: "Semua",
  major: "Umum",
  ...subject
}));
const INITIAL_ROOMS = DATA_INITIAL_ROOMS;
const DAYS = DATA_DAYS;
const TIME_SLOTS = DATA_TIME_SLOTS.map(slot => ({
  ...slot,
  id: String(slot.id)
}));
const INITIAL_TEACHING_LOADS = DATA_INITIAL_TEACHING_LOADS;
const INITIAL_TEACHER_AVAILABILITY = DATA_INITIAL_TEACHER_AVAILABILITY;









const getMajorColorHex = className => {
  const name = String(className).toUpperCase();
  if (name.includes("AK")) return "#f472b6"; // pink-400
  if (name.includes("MP")) return "#4ade80"; // green-400
  if (name.includes("TKJ")) return "#60a5fa"; // blue-400
  if (name.includes("TKR")) return "#fb923c"; // orange-400
  return "var(--ui-primary)"; // fallback
};

export default function App() {
  /* --- States --- */
  const [rememberMe, setRememberMe] = useState(() => loadInitialState("rememberMe", true));
  const currentUser = useDataStore(state => state.currentUser);
  const setCurrentUser = useDataStore(state => state.setCurrentUser);
  const { attendanceRecords, setAttendanceRecords, attendanceCorrections, addAttendanceCorrection, reviewAttendanceCorrection, syllabuses, setSyllabuses, syllabusCategories, setSyllabusCategories, activityLogs, dashboardMessages, addDashboardMessage, updateDashboardMessage, removeDashboardMessage, featureSettings, updateFeatureSettings, rolePermissions, updateRolePermissions, removeSyllabus, addSyllabus, updateSyllabus, addSyllabusCategory, updateSyllabusCategory, removeSyllabusCategory, addAttendanceRecord, removeAttendanceRecord, clearAttendanceRecords, attendanceSettings, updateAttendanceSettings, addActivityLog, academicCalendar, calendarCategories, addCalendarEvent, updateCalendarEvent, removeCalendarEvent, addCalendarCategory, updateCalendarCategory, removeCalendarCategory, setAcademicCalendar, setCalendarCategories, passwordResetRequests, kedisiplinanSettings, updateKedisiplinanSettings } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasPiket, setHasPiket] = useState(false);


  useEffect(() => {
    const role = currentUser?.role ? String(currentUser.role).toLowerCase() : "";
    if (role === "guru" && (currentUser?.code || currentUser?.id)) {
      const storageSession = localStorage.getItem('school_schedule_session_v1') || sessionStorage.getItem('school_schedule_session_v1');
      if (storageSession) {
        try {
          const session = JSON.parse(storageSession);
          const authToken = session?.authToken;
          if (authToken) {
            fetch('/api/kedisiplinan/jadwal', {
              headers: { 'Authorization': `Bearer ${authToken}` }
            })
            .then(r => r.json())
            .then(res => {
              if (res.ok && Array.isArray(res.data)) {
                const teacherCode = currentUser.code || currentUser.id;
                const hasSched = res.data.some(s => {
                  let ids = s.guru_ids;
                  if (typeof ids === "string") {
                    try { ids = JSON.parse(ids); } catch { /* intentionally ignored — ids stays as-is if not valid JSON */ }
                  }
                  return Array.isArray(ids) && ids.some(id => String(id).trim().toLowerCase() === String(teacherCode).trim().toLowerCase());
                });
                setHasPiket(hasSched);
              }
            })
            .catch(err => console.error(err));
          }
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      setHasPiket(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (window.location.hash === "#reset") {
      clearLegacyLocalStorage();
      window.location.hash = "";
      window.location.reload();
    }
  }, []);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [publicTab, setPublicTab] = useState("login");
  const [publicDay, setPublicDay] = useState("Senin");
  const [tampilanTab, setTampilanTab] = useState("umum");
  const [activeTab, _setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) return hash;
    const saved = sessionStorage.getItem("admin_active_tab");
    if (saved) return saved;
    return loadInitialState("activeTab", "dashboard");
  });
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const handleBackupExport = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    try {
      await exportAllDataToExcel();
    } finally {
      setIsBackingUp(false);
    }
  };
  const setActiveTab = useCallback(tab => {
    _setActiveTab(tab);
    setTablePage(1);
    sessionStorage.setItem("admin_active_tab", tab);
    // Use history.replaceState to avoid browser scroll-to-top on hash change
    history.replaceState(null, '', '#' + tab);
  }, []);
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        _setActiveTab(hash);
        setTablePage(1);
        sessionStorage.setItem("admin_active_tab", hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // Auto-Backup otomatis dinonaktifkan — backup tersedia secara manual via tombol di sidebar.
  // Sebelumnya: setInterval setiap 30 menit memanggil exportAllDataToExcel() → menyebabkan
  // file xlsx terdownload sendiri setiap 30 menit tanpa interaksi pengguna.
  const [gradeTab, setGradeTab] = useState("X");
  const [scheduleFilterDay, setScheduleFilterDay] = useState("Semua");
  const [scheduleFilterGrade, setScheduleFilterGrade] = useState("Semua");
  const [scheduleFilterMajor, setScheduleFilterMajor] = useState("Semua");
  const [scheduleFilterClass, setScheduleFilterClass] = useState("Semua");
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState("");

  /* State Sidebar Groups */
  const [expandedGroups, setExpandedGroups] = useState(() => ({
    ...DEFAULT_SIDEBAR_GROUPS,
    ...(loadInitialState("expandedGroups", {}) || {})
  }));
  const toggleGroup = useCallback(groupKey => {
    setExpandedGroups(prev => {
      const next = {
        ...prev,
        [groupKey]: !prev[groupKey]
      };
      return next;
    });
  }, []);
  useEffect(() => {
    const sidebarGroup = SIDEBAR_GROUP_BY_TAB[activeTab];
    if (sidebarGroup) {
      setExpandedGroups(prev => ({
        ...prev,
        [sidebarGroup]: true
      }));
    }
  }, [activeTab]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => loadInitialState("isSidebarCollapsed", false));
  const sidebarScrollRef = useRef(null);
  const sidebarScrollPos = useRef(0);
  const mainContentRef = useRef(null);

  // Preserve sidebar scroll position when switching tabs
  useEffect(() => {
    const nav = sidebarScrollRef.current;
    if (!nav) return;
    // Restore saved position before paint
    nav.scrollTop = sidebarScrollPos.current;
  });

  // Scroll main content back to top when tab changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activeTab]);
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  /* State Login */
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* State GPS & Absensi Guru */
  const [teacherLocation, setTeacherLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState("");
  const [attendanceQrDataUrl, setAttendanceQrDataUrl] = useState("");
  const [attendanceQrInput, setAttendanceQrInput] = useState("");
  const [attendancePhoto, setAttendancePhoto] = useState({
    fileName: "",
    dataUrl: ""
  });
  const [photoError, setPhotoError] = useState("");
  const [attendanceSelectedStatus, setAttendanceSelectedStatus] = useState("Hadir");
  const [attendanceNote, setAttendanceNote] = useState("");
  const [attendanceCorrectionNote, setAttendanceCorrectionNote] = useState("");
  const [attendanceFilters, setAttendanceFilters] = useState({
    date: "",
    teacher: "All",
    status: "All"
  });
  const [dashboardMessageForm, setDashboardMessageForm] = useState({
    title: "",
    body: "",
    target: "all",
    priority: "normal",
    startDate: "",
    endDate: "",
    pinned: true
  });

  /* State Silabus Guru */
  const [newSyllabusTitle, setNewSyllabusTitle] = useState("");
  const [newSyllabusCategory, setNewSyllabusCategory] = useState("");
  const [newSyllabusSubject, setNewSyllabusSubject] = useState("");
  const [newSyllabusGrade, setNewSyllabusGrade] = useState("X");
  const [newSyllabusSemester, setNewSyllabusSemester] = useState("Ganjil");
  const [newSyllabusObjectives, setNewSyllabusObjectives] = useState("");
  const [newSyllabusMaterials, setNewSyllabusMaterials] = useState("");
  const [newSyllabusNotes, setNewSyllabusNotes] = useState("");
  const [silabusSearchTerm, setSilabusSearchTerm] = useState("");
  const [selectedSilabusSubject, setSelectedSilabusSubject] = useState("");
  const [selectedSilabusId, setSelectedSilabusId] = useState("");
  const [selectedTeacherSilabusSubject, setSelectedTeacherSilabusSubject] = useState("");
  const [selectedTeacherSilabusId, setSelectedTeacherSilabusId] = useState("");

  /* State Kalender Akademik */
  const [newCalendarTitle, setNewCalendarTitle] = useState("");
  const [newCalendarCategory, setNewCalendarCategory] = useState("");
  const [newCalendarDateStart, setNewCalendarDateStart] = useState("");
  const [newCalendarDateEnd, setNewCalendarDateEnd] = useState("");
  const [newCalendarDescription, setNewCalendarDescription] = useState("");
  const [calendarSearchTerm, setCalendarSearchTerm] = useState("");
  const [isAcademicCalendarGuideOpen, setIsAcademicCalendarGuideOpen] = useState(false);
  const [attendanceSubTab, setAttendanceSubTab] = useState("report");
  const attendanceMode = ATTENDANCE_MODE_OPTIONS.find(mode => mode.value === attendanceSettings.mode) || ATTENDANCE_MODE_OPTIONS[0];
  const attendanceModeValue = attendanceMode.value;
  const attendanceModeLabel = attendanceMode.label;
  const hasFeature = useCallback(key => featureSettings?.[key] !== false, [featureSettings]);
  const jakartaNowParts = useMemo(() => getJakartaDateParts(), [attendanceRecords.length, activeTab]);
  const activeAttendanceSession = useMemo(() => getActiveAttendanceSession(attendanceSettings, new Date(), currentUser?.role, academicCalendar, calendarCategories), [attendanceSettings, attendanceRecords.length, activeTab, currentUser, academicCalendar, calendarCategories]);
  const todayAttendanceRecord = useMemo(() => {
    if (!activeAttendanceSession || !currentUser?.code) return null;
    return attendanceRecords.find(record => record.teacherCode === currentUser.code && record.date === jakartaNowParts.date && record.sessionId === activeAttendanceSession.id) || null;
  }, [activeAttendanceSession, attendanceRecords, currentUser, jakartaNowParts.date]);
  const filteredAttendanceRecords = useMemo(() => {
    return (attendanceRecords || []).filter(record => {
      if (attendanceFilters.date && record.date !== attendanceFilters.date) return false;
      if (attendanceFilters.teacher !== "All" && record.teacherCode !== attendanceFilters.teacher) return false;
      if (attendanceFilters.status !== "All" && record.status !== attendanceFilters.status) return false;
      return true;
    });
  }, [attendanceFilters, attendanceRecords]);
  const getTeacherLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(position => {
        setTeacherLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationError("");
      }, error => {
        setLocationError("Gagal mendapatkan lokasi. Pastikan GPS aktif.");
      });
    } else {
      setLocationError("Browser tidak mendukung GPS.");
    }
  };
  useEffect(() => {
    if (activeTab === "absensiguru" && attendanceModeValue !== "manual") {
      getTeacherLocation();
    } else if (activeTab === "absensiguru" && attendanceModeValue === "manual") {
      setTeacherLocation(null);
      setLocationError("");
    }
  }, [activeTab, attendanceModeValue]);
  const attendanceQrPayload = useMemo(() => buildAttendanceQrPayload(attendanceSettings), [attendanceSettings]);
  useEffect(() => {
    let isMounted = true;
    if (!attendanceQrPayload) {
      setAttendanceQrDataUrl("");
      return undefined;
    }
    const generateQrCode = async () => {
      try {
        const {
          default: QRCode
        } = await import("qrcode");
        const url = await QRCode.toDataURL(attendanceQrPayload, {
          width: 220,
          margin: 1,
          errorCorrectionLevel: "M"
        });
        if (isMounted) setAttendanceQrDataUrl(url);
      } catch {
        if (isMounted) setAttendanceQrDataUrl("");
      }
    };
    void generateQrCode();
    return () => {
      isMounted = false;
    };
  }, [attendanceQrPayload]);
  useEffect(() => {
    setAttendanceQrInput("");
    setAttendancePhoto({
      fileName: "",
      dataUrl: ""
    });
    setPhotoError("");
    setLocationError("");
    setAttendanceSelectedStatus("Hadir");
    setAttendanceNote("");
  }, [attendanceSettings.mode]);
  const getDistanceToSchool = () => {
    if (!teacherLocation || !attendanceSettings) return Infinity;
    const R = 6371e3; // metres
    const φ1 = teacherLocation.lat * Math.PI / 180;
    const φ2 = (attendanceSettings.schoolLat || -6.2) * Math.PI / 180;
    const Δφ = ((attendanceSettings.schoolLat || -6.2) - teacherLocation.lat) * Math.PI / 180;
    const Δλ = ((attendanceSettings.schoolLng || 106.816666) - teacherLocation.lng) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in metres
  };
  const handleAttendancePhotoChange = async file => {
    setPhotoError("");
    if (!file) {
      setAttendancePhoto({
        fileName: "",
        dataUrl: ""
      });
      return;
    }
    if (!file.type?.startsWith("image/")) {
      setPhotoError("File harus berupa gambar.");
      setAttendancePhoto({
        fileName: "",
        dataUrl: ""
      });
      return;
    }
    import("./utils/imageUtils.js").then(({
      compressImage
    }) => {
      compressImage(file, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.8
      }).then(compressed => {
        setAttendancePhoto({
          fileName: file.name,
          dataUrl: compressed
        });
      }).catch(() => {
        setPhotoError("Gagal membaca file foto.");
        setAttendancePhoto({
          fileName: "",
          dataUrl: ""
        });
      });
    });
  };
  const handleTeacherCheckIn = () => {
    if (!ensureDatabaseReadyForWrite("mencatat absensi")) return;
    if (!hasFeature("attendance")) {
      setLocationError("Fitur absensi sedang dinonaktifkan oleh admin.");
      return;
    }
    const isPermit = ["Izin", "Sakit"].includes(attendanceSelectedStatus);
    if (!isPermit) {
      if (!activeAttendanceSession) {
        setLocationError("Tidak ada sesi absensi yang sedang dibuka saat ini.");
        return;
      }
      if (todayAttendanceRecord) {
        setLocationError(`Anda sudah absen untuk sesi ${activeAttendanceSession.name}.`);
        return;
      }
      const needsLocation = attendanceModeValue !== "manual";
      const needsQr = attendanceModeValue === "qr";
      const needsPhoto = attendanceModeValue === "photo";
      if (needsLocation && !hasFeature("attendanceGps")) {
        setLocationError("Validasi GPS sedang dinonaktifkan oleh admin. Ubah mode absensi ke Manual atau aktifkan GPS.");
        return;
      }
      if (needsQr && !hasFeature("attendanceQr")) {
        setLocationError("Mode QR sedang dinonaktifkan oleh admin.");
        return;
      }
      if (needsPhoto && !hasFeature("attendancePhoto")) {
        setPhotoError("Mode selfie sedang dinonaktifkan oleh admin.");
        return;
      }
      if (needsLocation) {
        if (!teacherLocation) {
          setLocationError("Lokasi belum ditemukan! Aktifkan GPS dan coba lagi.");
          return;
        }
        const distance = getDistanceToSchool();
        if (distance > (attendanceSettings.radiusMeters || 50)) {
          setLocationError(`Di luar radius sekolah! Jarak Anda: ${Math.round(distance)} meter (maks. ${attendanceSettings.radiusMeters || 50}m).`);
          return;
        }
      }
      if (needsQr && attendanceQrInput.trim().toUpperCase() !== String(attendanceQrPayload).toUpperCase()) {
        setLocationError("Kode QR belum cocok. Pindai atau masukkan kode yang benar.");
        return;
      }
      if (needsPhoto && !attendancePhoto.dataUrl) {
        setPhotoError("Foto selfie wajib diunggah untuk mode ini.");
        return;
      }
    }
    setLocationError("");
    setPhotoError("");
    setIsCheckingIn(true);
    setTimeout(() => {
      const now = new Date();
      const parts = getJakartaDateParts(now);
      const finalStatus = isPermit ? attendanceSelectedStatus : getAttendanceStatusFromSession(activeAttendanceSession, attendanceSelectedStatus, now);
      const recordId = isPermit ? `hik-manual-${currentUser.code}-${parts.date}` : `${currentUser.code}-${parts.date}-${activeAttendanceSession.id}`;
      addAttendanceRecord({
        id: recordId,
        teacherCode: currentUser.code,
        date: parts.date,
        time: parts.timeWithSeconds,
        sessionId: isPermit ? "manual" : activeAttendanceSession.id,
        sessionName: isPermit ? "Manual" : activeAttendanceSession.name,
        sessionType: isPermit ? "checkpoint" : activeAttendanceSession.type,
        location: !isPermit && attendanceModeValue !== "manual" ? teacherLocation : null,
        mode: isPermit ? "manual" : attendanceModeValue,
        status: finalStatus,
        note: attendanceNote.trim(),
        evidence: isPermit ? {
          type: "manual",
          value: "Aplikasi"
        } : attendanceModeValue === "qr" ? {
          type: "qr",
          token: attendanceQrPayload
        } : attendanceModeValue === "photo" ? {
          type: "photo",
          fileName: attendancePhoto.fileName,
          dataUrl: attendancePhoto.dataUrl
        } : {
          type: "location",
          value: teacherLocation ? `${teacherLocation.lat}, ${teacherLocation.lng}` : "manual"
        }
      });
      if (isPermit) {
        fetch("/api/hikvision/manual-attendance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.authToken}`
          },
          body: JSON.stringify({
            teacherCode: currentUser.code,
            date: parts.date,
            status: finalStatus,
            note: attendanceNote.trim() || `Guru mengajukan ${finalStatus} via aplikasi`
          })
        }).catch(err => console.error("Error sending WA notif:", err));
      }
      setAttendanceSuccessMsg(isPermit ? `Laporan ${finalStatus} berhasil dikirim.` : `Absensi ${activeAttendanceSession.name} berhasil. Status: ${finalStatus}.`);
      setIsCheckingIn(false);
      setAttendanceQrInput("");
      setAttendancePhoto({
        fileName: "",
        dataUrl: ""
      });
      setAttendanceNote("");
      setAttendanceSelectedStatus("Hadir");
    }, 1000);
  };

  /* State Sistem & Pengaturan */
  const [adminUser, setAdminUser] = useState(() => loadInitialState("adminUser", {
    username: "admin",
    name: "Administrator"
  }));
  const appSettings = useDataStore(state => state.appSettings);
  const setAppSettings = useDataStore(state => state.setAppSettings);
  const days = useDataStore(state => state.days);
  const setDays = useDataStore(state => state.setDays);
  const timeSlots = useDataStore(state => state.timeSlots);
  const setTimeSlots = useDataStore(state => state.setTimeSlots);
  const [selectedDaySetting, setSelectedDaySetting] = useState(() => loadInitialState("days", DAYS)[0] || "Senin");

  /* State Data Master */
  const classes = useDataStore(state => state.classes);
  const setClasses = useDataStore(state => state.setClasses);
  const students = useDataStore(state => state.students);
  const setStudents = useDataStore(state => state.setStudents);
  const majors = useDataStore(state => state.majors);
  const setMajors = useDataStore(state => state.setMajors);
  const rooms = useDataStore(state => state.rooms);
  const setRooms = useDataStore(state => state.setRooms);
  const staffs = useDataStore(state => state.staffs);
  const setStaffs = useDataStore(state => state.setStaffs);
  const teachers = useDataStore(state => state.teachers);
  const setTeachers = useDataStore(state => state.setTeachers);
  const subjects = useDataStore(state => state.subjects);
  const setSubjects = useDataStore(state => state.setSubjects);
  const teachingLoads = useDataStore(state => state.teachingLoads);
  const setTeachingLoads = useDataStore(state => state.setTeachingLoads);
  const teacherAvailability = useDataStore(state => state.teacherAvailability);
  const setTeacherAvailability = useDataStore(state => state.setTeacherAvailability);

  /* State Jadwal */
  const schedule = useDataStore(state => state.schedule);
  const setSchedule = useDataStore(state => state.setSchedule);
  const [isGenerated, setIsGenerated] = useState(() => loadInitialState("isGenerated", false));
  const [swapWarning, setSwapWarning] = useState("");

  /* State Modal & UI */
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: "",
    action: "",
    data: null
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: "",
    onConfirm: null
  });
  const [isImportGuideOpen, setIsImportGuideOpen] = useState(false);
  const [isSyllabusGuideOpen, setIsSyllabusGuideOpen] = useState(false);
  const [footerInfoModal, setFooterInfoModal] = useState({
    isOpen: false,
    title: "",
    message: ""
  });
  const [formData, setFormData] = useState({});
  const [bulkLoadGrades, setBulkLoadGrades] = useState([]);
  const [bulkLoadMajors, setBulkLoadMajors] = useState([]);
  const [bulkConflictMode, setBulkConflictMode] = useState("skip");
  const [strictCompetency, setStrictCompetency] = useState(false);
  const [specialWednesdayConstraint, setSpecialWednesdayConstraint] = useState(false);
  const [generateWorkspaceTab, setGenerateWorkspaceTab] = useState("generate");
  const [generateGuideTab, setGenerateGuideTab] = useState("persiapan");
  const [quickEditGuruCode, setQuickEditGuruCode] = useState("");
  const [quickGuruForm, setQuickGuruForm] = useState({});
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [customThemePresets, setCustomThemePresets] = useState(() => loadInitialState("customThemePresets", []));
  const [searchTerm, setSearchTerm] = useState("");
  const [tableSorts, setTableSorts] = useState(() => loadInitialState("tableSorts", DEFAULT_TABLE_SORTS));
  const [selectedRows, setSelectedRows] = useState(() => ({
    kelas: [],
    jurusan: [],
    guru: [],
    mapel: [],
    ruangan: [],
    beban: [],
    waktu: []
  }));
  const [deletedHistory, setDeletedHistory] = useState(() => loadInitialState("deletedHistory", []));
  const [loadFilters, setLoadFilters] = useState({
    grade: "All",
    major: "All",
    teacher: "All"
  });
  const [bulkText, setBulkText] = useState("");
  const [bulkImportPreview, setBulkImportPreview] = useState(null);
  const [layoutSettings, setLayoutSettings] = useState(() => loadInitialState("layoutSettings", {
    gradeFloors: {
      X: "1",
      XI: "2",
      XII: "3"
    },
    majorLabs: {
      TKJ: "LAB-KOMP1",
      TKR: "BENGKEL-TKR1",
      MP: "LAB-KOMP2",
      AK: "LAB-AK1"
    },
    floorLegend: {
      X: {
        label: "Lt. 1",
        color: "#fef08a"
      },
      XI: {
        label: "Lt. 2",
        color: "#f9a8d4"
      },
      XII: {
        label: "Lt. 3",
        color: "#f97316"
      }
    }
  }));
  const advancedRules = useDataStore(state => state.advancedRules);
  const setAdvancedRules = useDataStore(state => state.setAdvancedRules);
  const [roomLayout, setRoomLayout] = useState(() => loadInitialState("roomLayout", []));
  const [layoutDay, setLayoutDay] = useState(() => loadInitialState("layoutDay", "Senin"));
  const [layoutByDay, setLayoutByDay] = useState(() => loadInitialState("layoutByDay", {}));
  const [dragClassName, setDragClassName] = useState("");
  const [denahClassSearch, setDenahClassSearch] = useState("");
  const [layoutPreset, setLayoutPreset] = useState(() => loadInitialState("layoutPreset", "kampus_a"));
  const [layoutBlockLabels, setLayoutBlockLabels] = useState(() => loadInitialState("layoutBlockLabels", {
    kampus_a: {
      teori: ["13B", "13B", "12B", "11B", "10B", "5B", "6B", "7B", "8B", "9B", "4B", "3B", "2B", "1B", "3C", "4C", "1C", "2C", "2A", "3A", "1A", "4A", "11A", "5A", "10A", "6A", "9A", "7A", "8A"]
    },
    kampus_b: {
      praktik: ["Lab HW", "Lab SW", "Lab COE", "Bengkel TKR", "Bengkel TKR", "Lab AK 1", "Lab AK 2", "Lab MP 1", "Lab MP 1", "Bengkel TKR"]
    }
  }));
  useEffect(() => {
    const normalized = normalizeLayoutBlockLabels(layoutBlockLabels);
    if (JSON.stringify(normalized) !== JSON.stringify(layoutBlockLabels)) {
      setLayoutBlockLabels(normalized);
    }
  }, [layoutBlockLabels]);

  // State Notifikasi Toast
  const [notification, setNotification] = useState("");

  // --- OPTIMIZATION & BUG FIX: Pre-compute schedule lookups for fast rendering ---
  const scheduleCellMap = useMemo(() => {
    const map = new Map();
    schedule.forEach(s => map.set(`${s.day}-${s.slotId}-${s.className}`, s));
    return map;
  }, [schedule]);
  const teacherScheduleCountMap = useMemo(() => {
    const map = new Map();
    const slotJpMap = new Map();
    Object.entries(timeSlots || {}).forEach(([day, slots]) => {
      (slots || []).forEach(slot => {
        slotJpMap.set(`${day}-${slot.id}`, slot.jpCount || 1);
      });
    });
    schedule.forEach(s => {
      const jpCount = slotJpMap.get(`${s.day}-${s.slotId}`) || 1;
      const codes = parseTeacherCodes(s.teacherCode);
      codes.forEach(c => map.set(c, (map.get(c) || 0) + jpCount));
    });
    return map;
  }, [schedule, timeSlots]);
  const teacherTargetJpMap = useMemo(() => {
    const checkGrade = (targetGrade, className) => {
      if (isAllLike(targetGrade, ["All", "Semua"])) return true;
      const grades = parseCsvList(targetGrade);
      return grades.some(g => {
        const trimmedG = String(g).trim();
        const trimmedClass = String(className).trim();
        return trimmedClass.toLowerCase() === trimmedG.toLowerCase() || className.startsWith(trimmedG + " ");
      });
    };
    const map = new Map();
    teachers.forEach(t => {
      const explicitTarget = parsePositiveInt(t.targetWeeklyJp, 0);
      if (explicitTarget > 0) {
        map.set(t.code, explicitTarget);
        return;
      }
      const loads = teachingLoads.filter(l => {
        const codes = parseTeacherCodes(l.teacherCode);
        return codes.includes(t.code);
      });
      const targetJP = loads.reduce((sum, load) => {
        const matchingClassesCount = classes.filter(c => checkGrade(load.targetGrade, c.name) && csvValueMatches(load.targetMajor || "All", c.major, ["All", "Semua"])).length;
        return sum + Number(load.duration || 0) * getCappedClassCount(load, matchingClassesCount);
      }, 0);
      map.set(t.code, targetJP);
    });
    return map;
  }, [teachers, teachingLoads, classes]);

  /* Ref & State Tambahan */
  const fileInputRef = useRef(null);
  const [jpDurationMinutes, setJpDurationMinutes] = useState(() => loadInitialState("jpDurationMinutes", 45));

  const checkDependencies = (type, idOrCode) => {
    const reasons = [];
    const lowerType = String(type || '').toLowerCase();

    if (lowerType === "mapel") {
      const loads = teachingLoads?.filter(t => t.subject === idOrCode).length || 0;
      if (loads > 0) reasons.push(`Beban Mengajar (${loads} alokasi)`);
      const sched = schedule?.filter(s => s.subject === idOrCode).length || 0;
      if (sched > 0) reasons.push(`Jadwal Pelajaran (${sched} slot KBM)`);
      const mod = syllabuses?.filter(s => s.subject === idOrCode).length || 0;
      if (mod > 0) reasons.push(`Modul Ajar / Silabus (${mod} modul)`);
    }
    if (lowerType === "guru") {
      const loads = teachingLoads?.filter(t => t.teacherCode === idOrCode).length || 0;
      if (loads > 0) reasons.push(`Beban Mengajar (${loads} alokasi)`);
      const sched = schedule?.filter(s => s.teacherCode === idOrCode).length || 0;
      if (sched > 0) reasons.push(`Jadwal Pelajaran (${sched} slot KBM)`);
      const waliClass = classes?.find(c => c.homeroom === idOrCode);
      if (waliClass) reasons.push(`Wali Kelas (${waliClass.name})`);
      const mod = syllabuses?.filter(s => s.teacherCode === idOrCode).length || 0;
      if (mod > 0) reasons.push(`Modul Ajar / Silabus (${mod} modul)`);
    }
    if (lowerType === "karyawan" || lowerType === "staff") {
      const sched = schedule?.filter(s => s.teacherCode === idOrCode).length || 0;
      if (sched > 0) reasons.push(`Jadwal / Piket (${sched} slot)`);
    }
    if (lowerType === "kelas") {
      const stdCount = students?.filter(s => String(s.class_name || s.kelas || '').trim() === String(idOrCode).trim()).length || 0;
      if (stdCount > 0) reasons.push(`Data Siswa (${stdCount} siswa terdaftar)`);
      const loads = teachingLoads?.filter(t => t.classId === idOrCode).length || 0;
      if (loads > 0) reasons.push(`Beban Mengajar (${loads} alokasi mapel)`);
      const sched = schedule?.filter(s => s.classId === idOrCode).length || 0;
      if (sched > 0) reasons.push(`Jadwal Pelajaran (${sched} slot KBM)`);
    }
    if (lowerType === "ruangan") {
      const loads = teachingLoads?.filter(t => t.practiceRoomIds && t.practiceRoomIds.includes(idOrCode)).length || 0;
      if (loads > 0) reasons.push(`Beban Mengajar Praktik (${loads} alokasi)`);
      const sched = schedule?.filter(s => s.roomId === idOrCode).length || 0;
      if (sched > 0) reasons.push(`Jadwal Pelajaran (${sched} slot KBM)`);
    }
    if (lowerType === "jurusan") {
      const clsCount = classes?.filter(c => String(c.major || '').trim() === String(idOrCode).trim()).length || 0;
      if (clsCount > 0) reasons.push(`Data Kelas (${clsCount} rombel kelas)`);
      const tchCount = teachers?.filter(t => t.preferredMajor && t.preferredMajor.includes(idOrCode)).length || 0;
      if (tchCount > 0) reasons.push(`Preferensi Guru (${tchCount} guru)`);
      const sbjCount = subjects?.filter(s => s.major && s.major.includes(idOrCode)).length || 0;
      if (sbjCount > 0) reasons.push(`Mata Pelajaran (${sbjCount} mapel)`);
      const rmCount = rooms?.filter(r => r.major && r.major.includes(idOrCode)).length || 0;
      if (rmCount > 0) reasons.push(`Data Ruangan (${rmCount} ruang)`);
    }
    return reasons;
  };
  const uiFontClass = appSettings.fontFamily === "Poppins" ? "font-[Poppins]" : appSettings.fontFamily === "Nunito" ? "font-[Nunito]" : "font-sans";
  const uiTheme = {
    "--ui-primary": appSettings.primaryColor || "#064e3b",
    "--ui-accent": appSettings.accentColor || "#bbf7d0",
    "--ui-primary-button": appSettings.primaryButtonColor || appSettings.primaryColor || "#064e3b",
    "--ui-action": appSettings.actionButtonColor || appSettings.accentColor || "#bbf7d0",
    "--ui-bg": appSettings.bgColor || "#f8fafc",
    "--ui-surface": appSettings.surfaceColor || "#ffffff",
    "--ui-text": appSettings.textColor || "#0f172a",
    "--ui-radius-card": appSettings.uiRadius === "lg" ? "24px" : appSettings.uiRadius === "md" ? "16px" : appSettings.uiRadius === "full" ? "32px" : "12px",
    "--ui-radius-control": appSettings.uiRadius === "lg" ? "16px" : appSettings.uiRadius === "md" ? "12px" : appSettings.uiRadius === "full" ? "9999px" : "8px",
    "--ui-radius-small": appSettings.uiRadius === "lg" ? "12px" : appSettings.uiRadius === "md" ? "8px" : appSettings.uiRadius === "full" ? "9999px" : "6px"
  };

  useEffect(() => {
    const scale = appSettings.fontSizeScale;
    let size = "15px";
    if (scale === "kecil") size = "13px";
    else if (scale === "besar") size = "16.5px";
    else if (scale === "sangat-besar") size = "18px";
    document.documentElement.style.fontSize = size;
  }, [appSettings.fontSizeScale]);
  useEffect(() => {
    let cancelled = false;
    const hydrateAuthState = async () => {
      const [nextAdminUser, nextTeachers] = await Promise.all([normalizeAdminUser(adminUser), normalizeTeachers(teachers)]);
      if (cancelled) return;
      if (nextAdminUser.password !== adminUser.password || nextAdminUser.username !== adminUser.username || nextAdminUser.name !== adminUser.name) {
        setAdminUser(nextAdminUser);
      }
      if (nextTeachers.some((teacher, index) => teacher.password !== teachers[index]?.password)) {
        setTeachers(nextTeachers);
      }
      setAuthHydrated(true);
    };
    hydrateAuthState().catch(error => {
      console.warn("Gagal mengamankan data autentikasi", error);
      setAuthHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);
  useEffect(() => {
    if (!currentUser?.code || !Array.isArray(teachers) || teachers.length === 0) return;
    const matchedTeacher = teachers.find(teacher => sameText(teacher.code, currentUser.code));
    if (!matchedTeacher) return;
    const nextRole = normalizeUserRole(matchedTeacher.role);
    const nextDivision = nextRole === "waka" ? matchedTeacher.division || WAKA_DIVISION_OPTIONS[0].value : "";
    const nextName = matchedTeacher.name || currentUser.name;
    const nextCode = matchedTeacher.code || currentUser.code;
    const needsSessionRefresh = normalizeUserRole(currentUser.role) !== nextRole || String(currentUser.division || "") !== String(nextDivision || "") || String(currentUser.name || "") !== String(nextName || "") || String(currentUser.code || "") !== String(nextCode || "");
    if (!needsSessionRefresh) return;
    const nextUser = {
      ...currentUser,
      role: nextRole,
      division: nextDivision,
      name: nextName,
      code: nextCode
    };
    writeSessionUser(nextUser);
    setCurrentUser(nextUser);
    if (nextRole !== "guru") {
      setActiveTab("dashboard");
    }
  }, [currentUser, teachers]);
  const getActiveSortConfig = useCallback(tabKey => tableSorts[tabKey] || DEFAULT_TABLE_SORTS[tabKey] || {
    key: "name",
    dir: "asc"
  }, [tableSorts]);
  const getRowKeyForTab = (tabKey, item) => getTableRowKey(tabKey, item);
  const getSearchTextForTab = (tabKey, item) => getTableSearchText(tabKey, item);
  const getSortableValue = (item, key) => {
    if (!item) return "";
    const actualKey = key === "class" ? "class_name" : key;
    const value = item[actualKey];
    if (typeof value === "number") return value;
    return value == null ? "" : String(value);
  };
  const getTableSort = useCallback((tabKey, items) => {
    const sortConfig = getActiveSortConfig(tabKey);
    return [...items].sort((a, b) => compareTableValues(getSortableValue(a, sortConfig.key), getSortableValue(b, sortConfig.key), sortConfig.dir));
  }, [getActiveSortConfig]);

  const updateSelectionForTab = useCallback((tabKey, updater) => {
    setSelectedRows(prev => {
      const current = prev[tabKey] || [];
      const next = typeof updater === "function" ? updater(current) : updater;
      return {
        ...prev,
        [tabKey]: next
      };
    });
  }, []);

  const handleSelectAll = useCallback((tabKey, items) => {
    const isAllSelected = items.length > 0 && items.every(item => {
      const id = item.id || item.code || item.nis || item.nip || item.name;
      return selectedRows[tabKey]?.includes(id);
    });
    
    if (isAllSelected) {
      setSelectedRows(prev => ({ ...prev, [tabKey]: [] }));
    } else {
      setSelectedRows(prev => ({ 
        ...prev, 
        [tabKey]: items.map(item => item.id || item.code || item.nis || item.nip || item.name) 
      }));
    }
  }, [selectedRows, setSelectedRows]);

  const getUsedMajorBlocks = useCallback(selectedMajors => {
    const blocked = [];
    const safe = [];
    selectedMajors.forEach(major => {
      const usedInClasses = classes.some(c => sameText(c.major, major));
      const usedInSubjects = subjects.some(s => csvIncludesText(s.major, major));
      const usedInRooms = rooms.some(r => csvIncludesText(r.major, major));
      const usedInTeachers = teachers.some(t => csvIncludesText(t.preferredMajor, major));
      const usedInLoads = teachingLoads.some(l => csvIncludesText(l.targetMajor, major));
      if (usedInClasses || usedInSubjects || usedInRooms || usedInTeachers || usedInLoads) blocked.push(major); else safe.push(major);
    });
    return {
      blocked,
      safe
    };
  }, [classes, subjects, rooms, teachers, teachingLoads]);
  const pushDeleteHistory = entry => {
    setDeletedHistory(prev => [{
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      deletedAt: Date.now()
    }, ...prev].slice(0, 10));
  };
  const mergeUniqueByKey = (existingItems, restoredItems, getKey) => {
    const seen = new Set(existingItems.map(getKey).filter(Boolean));
    const next = [...existingItems];
    restoredItems.forEach(item => {
      const key = getKey(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      next.push(item);
    });
    return next;
  };
  const restoreDeletedEntry = entry => {
    if (!entry) return;
    const {
      type,
      payload = {}
    } = entry;
    if (type === "kelas") {
      if (payload.classes?.length) setClasses(prev => mergeUniqueByKey(prev, payload.classes, getClassKey));
      if (payload.schedule?.length) setSchedule(prev => mergeUniqueByKey(prev, payload.schedule, item => `${item.day}__${item.slotId}__${item.className}__${item.teacherCode || ""}__${item.subject || ""}`));
      if (payload.roomLayout?.length) setRoomLayout(prev => mergeUniqueByKey(prev, payload.roomLayout, item => normalizeText(item.className)));
      if (payload.layoutByDay) {
        setLayoutByDay(prev => {
          const next = {
            ...prev
          };
          Object.entries(payload.layoutByDay).forEach(([day, dayMap]) => {
            next[day] = {
              ...(next[day] || {}),
              ...dayMap
            };
          });
          return next;
        });
      }
    } else if (type === "jurusan") {
      if (payload.majors?.length) {
        setMajors(prev => {
          const seen = new Set(prev.map(m => {
            const name = typeof m === 'object' && m !== null ? (m.name || m.payload || '') : String(m || '');
            return normalizeText(name);
          }).filter(Boolean));
          const next = [...prev];
          payload.majors.forEach(m => {
            const name = typeof m === 'object' && m !== null ? (m.name || m.payload || '') : String(m || '');
            const key = normalizeText(name);
            if (key && !seen.has(key)) {
              seen.add(key);
              next.push(m);
            }
          });
          return next;
        });
      }
      if (payload.classes?.length) setClasses(prev => mergeUniqueByKey(prev, payload.classes, getClassKey));
      if (payload.subjects?.length) setSubjects(prev => mergeUniqueByKey(prev, payload.subjects, getSubjectKey));
      if (payload.rooms?.length) setRooms(prev => mergeUniqueByKey(prev, payload.rooms, getRoomKey));
      if (payload.teachers?.length) setTeachers(prev => mergeUniqueByKey(prev, payload.teachers, getTeacherKey));
      if (payload.loads?.length) setTeachingLoads(prev => mergeUniqueByKey(prev, payload.loads, getLoadKey));
      if (payload.roomLayout?.length) setRoomLayout(prev => mergeUniqueByKey(prev, payload.roomLayout, item => normalizeText(item.className)));
      if (payload.majorLabs) {
        setLayoutSettings(prev => ({
          ...prev,
          majorLabs: {
            ...(prev.majorLabs || {}),
            ...payload.majorLabs
          }
        }));
      }
    } else if (type === "guru") {
      if (payload.teachers?.length) setTeachers(prev => mergeUniqueByKey(prev, payload.teachers, getTeacherKey));
      if (payload.teacherAvailability) {
        setTeacherAvailability(prev => {
          const next = {
            ...prev
          };
          Object.entries(payload.teacherAvailability).forEach(([code, entryValue]) => {
            next[code] = entryValue;
          });
          return next;
        });
      }
      if (payload.loads?.length) setTeachingLoads(prev => mergeUniqueByKey(prev, payload.loads, getLoadKey));
      if (payload.schedule?.length) setSchedule(prev => mergeUniqueByKey(prev, payload.schedule, item => `${item.day}__${item.slotId}__${item.className}__${item.teacherCode || ""}__${item.subject || ""}`));
    } else if (type === "mapel") {
      if (payload.subjects?.length) setSubjects(prev => mergeUniqueByKey(prev, payload.subjects, getSubjectKey));
      if (payload.teacherAvailability) {
        setTeacherAvailability(prev => {
          const next = {};
          Object.entries(prev).forEach(([code, entryValue]) => {
            next[code] = {
              ...entryValue
            };
          });
          Object.entries(payload.teacherAvailability).forEach(([code, subjectsList]) => {
            next[code] = {
              ...(next[code] || {
                days: [],
                subjects: []
              }),
              subjects: Array.from(new Set([...(next[code]?.subjects || []), ...(subjectsList || [])]))
            };
          });
          return next;
        });
      }
      if (payload.loads?.length) setTeachingLoads(prev => mergeUniqueByKey(prev, payload.loads, getLoadKey));
      if (payload.schedule?.length) setSchedule(prev => mergeUniqueByKey(prev, payload.schedule, item => `${item.day}__${item.slotId}__${item.className}__${item.teacherCode || ""}__${item.subject || ""}`));
    } else if (type === "ruangan") {
      if (payload.rooms?.length) setRooms(prev => mergeUniqueByKey(prev, payload.rooms, getRoomKey));
      if (payload.schedule?.length) setSchedule(prev => mergeUniqueByKey(prev, payload.schedule, item => `${item.day}__${item.slotId}__${item.className}__${item.teacherCode || ""}__${item.subject || ""}`));
      if (payload.roomLayout?.length) setRoomLayout(prev => mergeUniqueByKey(prev, payload.roomLayout, item => normalizeText(item.className)));
      if (payload.majorLabs) {
        setLayoutSettings(prev => ({
          ...prev,
          majorLabs: {
            ...(prev.majorLabs || {}),
            ...payload.majorLabs
          }
        }));
      }
    } else if (type === "beban") {
      if (payload.loads?.length) setTeachingLoads(prev => mergeUniqueByKey(prev, payload.loads, getLoadKey));
    } else if (type === "siswa") {
      if (payload.students?.length) setStudents(prev => mergeUniqueByKey(prev, payload.students, item => item.nis || item.id));
    }
    setDeletedHistory(prev => prev.filter(item => item.id !== entry.id));
    showNotification("Hapus terakhir berhasil di-undo.");
  };
  const undoLastDelete = () => {
    const latest = deletedHistory[0];
    if (!latest) return;
    restoreDeletedEntry(latest);
  };

  const handleBulkDelete = (type, ids, options = {}) => {
    const uniqueIds = [...new Set(ids.map(id => String(id)).filter(Boolean))];
    if (uniqueIds.length === 0) return;
    if (!ensureDatabaseReadyForWrite("menghapus data")) return;
    const normalizedIds = new Set(uniqueIds.map(normalizeText));
    const isSelectedId = value => normalizedIds.has(normalizeText(value));
    const labelMap = {
      kelas: "kelas",
      jurusan: "jurusan",
      guru: "guru",
      karyawan: "karyawan",
      Karyawan: "karyawan",
      mapel: "mapel",
      ruangan: "ruangan",
      beban: "beban",
      siswa: "siswa"
    };
    if (!Object.prototype.hasOwnProperty.call(labelMap, type)) {
      showNotification("Jenis data ini belum didukung untuk hapus massal.", "error");
      return;
    }
    if (options.confirm !== false) {
      setConfirmDialog({
        isOpen: true,
        message: `Yakin ingin menghapus ${uniqueIds.length} data ${labelMap[type] || type} ini?`,
        onConfirm: () => {
          handleBulkDelete(type, ids, {
            ...options,
            confirm: false
          });
          setConfirmDialog({
            isOpen: false,
            message: "",
            onConfirm: null
          });
        }
      });
      return;
    }
    const removeFromScheduleBy = predicate => {
      setSchedule(prev => prev.filter(item => !predicate(item)));
    };
    const removeFromLoads = predicate => {
      setTeachingLoads(prev => prev.filter(item => !predicate(item)));
    };
    const removeFromSelection = () => {
      updateSelectionForTab(type, current => current.filter(key => !isSelectedId(key)));
    };
    const snapshot = {
      type,
      label: labelMap[type] || type,
      payload: {}
    };
    let shouldRecordSnapshot = false;
    if (type === "jurusan") {
      const {
        blocked,
        safe
      } = getUsedMajorBlocks(uniqueIds);
      const removedMajors = majors.filter(m => safe.some(major => sameText(major, m)));
      if (removedMajors.length) {
        snapshot.payload.majors = removedMajors;
        shouldRecordSnapshot = true;
      }
      if (safe.length) {
        setMajors(prev => prev.filter(m => !safe.some(major => sameText(major, m))));
      }
      if (blocked.length && safe.length) {
        showNotification(`${safe.length} data jurusan berhasil dihapus. ${blocked.length} masih dipakai: ${blocked.join(", ")}`, "warning");
      } else if (blocked.length) {
        showNotification(`Jurusan berikut masih dipakai dan tidak bisa dihapus: ${blocked.join(", ")}`, "warning");
      } else if (safe.length) {
        showNotification(`${safe.length} data jurusan berhasil dihapus.`, "success");
      } else {
        showNotification("Data jurusan tidak ditemukan atau sudah terhapus.", "warning");
      }
      if (shouldRecordSnapshot) pushDeleteHistory(snapshot);
      removeFromSelection();
      return;
    }
    if (type === "kelas") {
      const removedClasses = classes.filter(item => isSelectedId(item.name));
      if (removedClasses.length === 0) {
        showNotification("Data kelas tidak ditemukan atau sudah terhapus.", "warning");
        removeFromSelection();
        return;
      }
      const removedClassNames = new Set(removedClasses.map(item => normalizeText(item.name)));
      if (removedClasses.length) {
        snapshot.payload.classes = removedClasses;
        snapshot.payload.schedule = schedule.filter(item => removedClassNames.has(normalizeText(item.className)));
        snapshot.payload.roomLayout = roomLayout.filter(item => removedClassNames.has(normalizeText(item.className)));
        const dayPayload = {};
        Object.entries(layoutByDay).forEach(([day, dayMap]) => {
          const filtered = Object.fromEntries(Object.entries(dayMap || {}).filter(([, slot]) => csvTextHasAny(slot?.className, removedClassNames)));
          if (Object.keys(filtered).length) dayPayload[day] = filtered;
        });
        snapshot.payload.layoutByDay = dayPayload;
        shouldRecordSnapshot = true;
      }
      setClasses(prev => prev.filter(item => !isSelectedId(item.name)));
      removeFromScheduleBy(item => isSelectedId(item.className));
      setRoomLayout(prev => prev.filter(item => !isSelectedId(item.className)));
      setLayoutByDay(prev => {
        const next = {};
        Object.entries(prev).forEach(([day, dayMap]) => {
          const filtered = {};
          Object.entries(dayMap || {}).forEach(([slotId, slot]) => {
            if (!slot?.className) {
              filtered[slotId] = slot;
              return;
            }
            const remainingClassNames = removeCsvTextValues(slot.className, normalizedIds);
            if (remainingClassNames) filtered[slotId] = {
              ...slot,
              className: remainingClassNames
            };
          });
          if (Object.keys(filtered).length) next[day] = filtered;
        });
        return next;
      });
    } else if (["karyawan", "Karyawan"].includes(type)) {
      const getStaffCode = item => item.code || item.staff_code || item.id;
      const removedStaffs = staffs.filter(item => isSelectedId(getStaffCode(item)));
      if (removedStaffs.length === 0) {
        showNotification("Data karyawan tidak ditemukan atau sudah terhapus.", "warning");
        removeFromSelection();
        return;
      }
      if (removedStaffs.length) {
        const removedCodes = new Set(removedStaffs.map(item => normalizeText(getStaffCode(item))));
        snapshot.payload.staffs = removedStaffs;
        const hasRemovedStaff = tc => String(tc || "").split(",").map(c => normalizeText(c.trim())).some(c => removedCodes.has(c));
        snapshot.payload.loads = teachingLoads.filter(item => hasRemovedStaff(item.teacherCode));
        snapshot.payload.schedule = schedule.filter(item => hasRemovedStaff(item.teacherCode));
        shouldRecordSnapshot = true;
      }
      setStaffs(prev => prev.filter(item => !isSelectedId(getStaffCode(item))));
      const hasRemovedCode = tc => String(tc || "").split(",").map(c => c.trim()).some(c => isSelectedId(c));
      removeFromLoads(item => hasRemovedCode(item.teacherCode));
      removeFromScheduleBy(item => hasRemovedCode(item.teacherCode));
    } else if (type === "guru") {
      const removedTeachers = teachers.filter(item => isSelectedId(item.code));
      if (removedTeachers.length === 0) {
        showNotification("Data guru tidak ditemukan atau sudah terhapus.", "warning");
        removeFromSelection();
        return;
      }
      if (removedTeachers.length) {
        const removedCodes = new Set(removedTeachers.map(item => normalizeText(item.code)));
        snapshot.payload.teachers = removedTeachers;
        snapshot.payload.teacherAvailability = Object.fromEntries(Object.entries(teacherAvailability).filter(([code]) => removedCodes.has(normalizeText(code))));
        // Team teaching: check if any code in comma-separated teacherCode matches removed teachers
        const hasRemovedTeacher = tc => String(tc || "").split(",").map(c => normalizeText(c.trim())).some(c => removedCodes.has(c));
        snapshot.payload.loads = teachingLoads.filter(item => hasRemovedTeacher(item.teacherCode));
        snapshot.payload.schedule = schedule.filter(item => hasRemovedTeacher(item.teacherCode));
        shouldRecordSnapshot = true;
      }
      setTeachers(prev => prev.filter(item => !isSelectedId(item.code)));
      setTeacherAvailability(prev => {
        const next = {
          ...prev
        };
        Object.keys(next).forEach(code => {
          if (isSelectedId(code)) delete next[code];
        });
        return next;
      });
      // Team teaching: remove loads/schedule if any code in comma-separated teacherCode matches
      const hasRemovedCode = tc => String(tc || "").split(",").map(c => c.trim()).some(c => isSelectedId(c));
      removeFromLoads(item => hasRemovedCode(item.teacherCode));
      removeFromScheduleBy(item => hasRemovedCode(item.teacherCode));
    } else if (type === "mapel") {
      const removedSubjects = subjects.filter(item => isSelectedId(item.name));
      if (removedSubjects.length === 0) {
        showNotification("Data mapel tidak ditemukan atau sudah terhapus.", "warning");
        removeFromSelection();
        return;
      }
      if (removedSubjects.length) {
        const removedNames = new Set(removedSubjects.map(item => normalizeText(item.name)));
        const availability = {};
        Object.entries(teacherAvailability).forEach(([code, entry]) => {
          const picked = (entry?.subjects || []).filter(subject => removedNames.has(normalizeText(subject)));
          if (picked.length) availability[code] = picked;
        });
        snapshot.payload.subjects = removedSubjects;
        snapshot.payload.teacherAvailability = availability;
        snapshot.payload.loads = teachingLoads.filter(item => removedNames.has(normalizeText(item.subject)));
        snapshot.payload.schedule = schedule.filter(item => removedNames.has(normalizeText(item.subject)));
        shouldRecordSnapshot = true;
      }
      setSubjects(prev => prev.filter(item => !isSelectedId(item.name)));
      setTeacherAvailability(prev => {
        const next = {};
        Object.entries(prev).forEach(([code, entry]) => {
          next[code] = {
            ...entry,
            subjects: (entry?.subjects || []).filter(subject => !isSelectedId(subject))
          };
        });
        return next;
      });
      removeFromLoads(item => isSelectedId(item.subject));
      removeFromScheduleBy(item => isSelectedId(item.subject));
    } else if (type === "ruangan") {
      const removedRooms = rooms.filter(item => isSelectedId(item.id));
      if (removedRooms.length === 0) {
        showNotification("Data ruangan tidak ditemukan atau sudah terhapus.", "warning");
        removeFromSelection();
        return;
      }
      if (removedRooms.length) {
        const removedRoomIds = new Set(removedRooms.map(item => normalizeText(item.id)));
        snapshot.payload.rooms = removedRooms;
        snapshot.payload.schedule = schedule.filter(item => removedRoomIds.has(normalizeText(item.roomId)));
        snapshot.payload.roomLayout = roomLayout.filter(row => removedRoomIds.has(normalizeText(row.teoriRoomId)) || removedRoomIds.has(normalizeText(row.praktikRoomId)));
        snapshot.payload.majorLabs = Object.fromEntries(Object.entries(layoutSettings.majorLabs || {}).filter(([, roomId]) => removedRoomIds.has(normalizeText(roomId))));
        shouldRecordSnapshot = true;
      }
      setRooms(prev => prev.filter(item => !isSelectedId(item.id)));
      removeFromScheduleBy(item => isSelectedId(item.roomId));
      setRoomLayout(prev => prev.map(row => {
        const next = {
          ...row
        };
        if (isSelectedId(row.teoriRoomId)) {
          next.teoriRoomId = "-";
          next.teoriRoomName = "Belum ada ruang teori";
        }
        if (isSelectedId(row.praktikRoomId)) next.praktikRoomId = "-";
        return next;
      }));
      setLayoutSettings(prev => {
        const majorLabs = {
          ...(prev.majorLabs || {})
        };
        Object.keys(majorLabs).forEach(major => {
          if (isSelectedId(majorLabs[major])) delete majorLabs[major];
        });
        return {
          ...prev,
          majorLabs
        };
      });
    } else if (type === "beban") {
      const removedLoads = teachingLoads.filter(item => isSelectedId(item.id));
      if (removedLoads.length === 0) {
        showNotification("Data beban mengajar tidak ditemukan atau sudah terhapus.", "warning");
        removeFromSelection();
        return;
      }
      if (removedLoads.length) {
        snapshot.payload.loads = removedLoads;
        shouldRecordSnapshot = true;
      }
      setTeachingLoads(prev => prev.filter(item => !isSelectedId(item.id)));
    } else if (type === "siswa") {
      const removedStudents = students.filter(item => isSelectedId(item.nis) || isSelectedId(item.code) || isSelectedId(item.id));
      if (removedStudents.length === 0) {
        showNotification("Data siswa tidak ditemukan atau sudah terhapus.", "warning");
        removeFromSelection();
        return;
      }
      if (removedStudents.length) {
        snapshot.payload.students = removedStudents;
        shouldRecordSnapshot = true;
      }
      setStudents(prev => prev.filter(item => !isSelectedId(item.nis) && !isSelectedId(item.code) && !isSelectedId(item.id)));
    }
    if (shouldRecordSnapshot) pushDeleteHistory(snapshot);
    removeFromSelection();
    showNotification(`${uniqueIds.length} data ${labelMap[type] || type} berhasil dihapus.`, "success");
  };

  /* Handler File & Import */



  /* Menyimpan data otomatis ke MySQL dan cache memori runtime */
  const buildDatabasePayload = useCallback((overrides = {}) => ({
    schedule,
    isGenerated,
    days,
    timeSlots,
    teachingLoads,
    teacherAvailability,
    classes,
    rooms,
    teachers,
    students,
    subjects,
    adminUser,
    appSettings,
    customThemePresets,
    jpDurationMinutes,
    majors,
    rememberMe,
    layoutSettings,
    roomLayout,
    layoutDay,
    layoutByDay,
    layoutPreset,
    layoutBlockLabels,
    deletedHistory,
    attendanceRecords,
    attendanceCorrections,
    attendanceSettings,
    featureSettings,
    rolePermissions,
    kedisiplinanSettings,
    syllabuses,
    syllabusCategories,
    activityLogs,
    dashboardMessages,
    academicCalendar,
    calendarCategories,
    advancedRules,
    expandedGroups,
    isSidebarCollapsed,
    staffs,
    passwordResetRequests,
    ...overrides,
    currentUser: null
  }), [schedule, isGenerated, days, timeSlots, teachingLoads, teacherAvailability, classes, rooms, teachers, students, subjects, adminUser, appSettings, customThemePresets, jpDurationMinutes, majors, rememberMe, layoutSettings, roomLayout, layoutDay, layoutByDay, layoutPreset, layoutBlockLabels, deletedHistory, attendanceRecords, attendanceCorrections, attendanceSettings, featureSettings, rolePermissions, kedisiplinanSettings, syllabuses, syllabusCategories, activityLogs, dashboardMessages, academicCalendar, calendarCategories, advancedRules, expandedGroups, isSidebarCollapsed, staffs, passwordResetRequests]);


  useEffect(() => {
    const nextSubjects = reconcileSubjectCatalog(subjects, teachingLoads, schedule, syllabuses);
    if (nextSubjects.length !== subjects.length) {
      setSubjects(nextSubjects);
    }
  }, [subjects, teachingLoads, schedule, syllabuses]);
  const showNotification = (msg, type = "info") => {
    let finalMsg = msg;
    if (type === "error") finalMsg = "⚠️ " + msg; else if (type === "success") finalMsg = "[SUCCESS] " + msg;
    setNotification(finalMsg);
    setTimeout(() => setNotification(""), 3500);
  };
  const {
    databaseHydrated,
    databaseHydrationFailedRef,
    lastPersistedPayloadRef,
    pendingServerPayloadRef,
    saveDatabaseNow,
    applyDatabasePayload,
    ensureDatabaseReadyForWrite,
  } = useAdminDatabaseSync({
    setSchedule, setIsGenerated, setDays, setTimeSlots, setTeachingLoads,
    setTeacherAvailability, setClasses, setRooms, setTeachers, setStaffs, setStudents,
    setSubjects, setAdminUser, setAppSettings, setCustomThemePresets, setJpDurationMinutes,
    setMajors, setRememberMe, setLayoutSettings, setRoomLayout, setLayoutDay, setLayoutByDay,
    setLayoutPreset, setLayoutBlockLabels, setDeletedHistory, setAdvancedRules,
    setExpandedGroups, setIsSidebarCollapsed,
    currentUser, setCurrentUser,
    setLoginError, setNotification,
    buildDatabasePayload,
    authHydrated,
  });
  
  // Deteksi perubahan belum tersimpan (Unsaved Changes)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (pendingServerPayloadRef && pendingServerPayloadRef.current) {
        e.preventDefault();
        e.returnValue = 'Anda memiliki perubahan yang belum tersimpan secara permanen. Yakin ingin keluar?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingServerPayloadRef]);

  useEffect(() => {
    const teacherTabs = new Set(["dashboard", "ketersediaan", "generate", "akademik", "absensiguru", "silabusguru", "kedisiplinan_bpbk", "riwayat_prestasi"]);
    const kepsekTabs = new Set([
      "dashboard","generate","akademik","kalender","kalender_akademik",
      "absensi","jurnal_harian","catatan_walikelas","modul_ajar","walas_report",
      "pesan","kedisiplinan_piket","siswa","guru","kelas","data_pegawai",
      "pkl_dashboard","pkl_data_siswa","pkl_data_perusahaan","pkl_penugasan",
      "pkl_administrasi","pkl_jurnal","pkl_laporan",
      "kedisiplinan_absensi","kedisiplinan_bpbk","riwayat_prestasi",
      "laporan_absensi","hikvision_report_guru","hikvision_report_karyawan","hikvision_report_siswa"
    ]);
    const wakaDivision = (currentUser?.division || WAKA_DIVISION_OPTIONS[0].value).toLowerCase();
    const wakaTabsByDivision = {
      kurikulum: ["dashboard","generate","akademik","silabus","modul_ajar","silabusguru","ketersediaan","beban","jurnal_harian","kelas","siswa","guru","karyawan","mapel","walas_report","catatan_walikelas","pesan","pengaturan","advanced_rules"],
      kesiswaan: ["dashboard","absensi","akademik","pesan","kedisiplinan_piket","kedisiplinan_bpbk","riwayat_prestasi","catatan_walikelas","walas_report","siswa_keluar","tatib_skor","kedisiplinan_absensi","laporan_absensi","hikvision_report_siswa","siswa"],
      sarpras: ["dashboard","ruangan","denah","kelas","generate","walas_report","catatan_walikelas","siswa","akademik","pesan"],
      humas: ["dashboard","pesan","tampilan","akademik","modul_ajar","walas_report","catatan_walikelas"],
      hubin: ["dashboard","pkl_dashboard","pkl_data_siswa","pkl_data_perusahaan","pkl_penugasan","pkl_administrasi","pkl_jurnal","pkl_laporan","pkl_absensi_setting","pesan","walas_report","catatan_walikelas"]
    };
    const wakaTabs = new Set(wakaTabsByDivision[wakaDivision] || wakaTabsByDivision.kurikulum);
    const role = normalizeUserRole(currentUser?.role);
    if (role === "admin" || role === "superadmin") return;
    if (!databaseHydrated) return;

    // Helper untuk mengecek apakah tab diizinkan berdasarkan rolePermissions
    const isTabPermitted = (tabId) => {
      if (tabId === "dashboard" || tabId === "pesan") return true;

      // Determine effective key
      let effectiveKey = role;
      const subrole = (currentUser?.subrole || "").toLowerCase().trim();
      const KNOWN_SUBROLES = [
        'bpbk', 'pembina_osis', 'sekretaris_osis', 'walikelas',
        'sekretaris_kesiswaan', 'anggota_kesiswaan',
        'sekretaris_kurikulum', 'anggota_kurikulum',
        'sekretaris_hubin', 'anggota_hubin',
        'sekretaris_sarpras', 'anggota_sarpras',
        'sekretaris_tu', 'bendahara'
      ];
      if (subrole && KNOWN_SUBROLES.includes(subrole)) {
        effectiveKey = subrole;
      } else if (role === "waka" || role.startsWith("waka_")) {
        const div = (currentUser?.division || role.replace("waka_", "") || "kurikulum").toLowerCase().trim();
        effectiveKey = `waka_${div}`;
      } else if (role === "tata_usaha") {
        effectiveKey = "tu";
      }

      const perms = rolePermissions?.[effectiveKey] || rolePermissions?.[role];
      if (perms) {
        if (Array.isArray(perms)) {
          return perms.includes(tabId);
        }
        const level = perms[tabId];
        if (level === "edit" || level === "view" || level === "otomatis" || level === "full") return true;
        if (level === "nonaktif" || level === "none" || level === "off") return false;
      }

      // Walas override jika belum di-set nonaktif
      const isWalasUser = currentUser?.isWalas || !!currentUser?.walasClass;
      if (isWalasUser && ["catatan_walikelas", "walas_report"].includes(tabId)) {
        return true;
      }

      // Fallback DEFAULTS
      const DEFAULTS = {
        guru: ["dashboard","generate","akademik","absensiguru","jurnal_harian","catatan_walikelas","modul_ajar","walas_report","kedisiplinan_absensi","silabusguru","ketersediaan","beban","pesan","kedisiplinan_piket"],
        bpbk: ["dashboard","kedisiplinan_bpbk","kedisiplinan_absensi","riwayat_prestasi","siswa","absensiguru","jurnal_harian","modul_ajar","akademik","pesan","catatan_walikelas","walas_report","hikvision_report_siswa"],
        pembina_osis: ["dashboard","kedisiplinan_piket","riwayat_prestasi","akademik","siswa","absensiguru","jurnal_harian","modul_ajar","pesan"],
        sekretaris_osis: ["dashboard","riwayat_prestasi","akademik","absensiguru","jurnal_harian","pesan"],
        sekretaris_kesiswaan: ["dashboard","absensi","kedisiplinan_piket","kedisiplinan_absensi","catatan_walikelas","riwayat_prestasi","siswa","absensiguru","jurnal_harian","modul_ajar","akademik","pesan"],
        anggota_kesiswaan: ["dashboard","kedisiplinan_piket","kedisiplinan_absensi","riwayat_prestasi","absensiguru","jurnal_harian","modul_ajar","akademik","pesan"],
        waka_kesiswaan: ["dashboard","absensi","akademik","pesan","kedisiplinan_piket","kedisiplinan_bpbk","riwayat_prestasi","catatan_walikelas","walas_report","siswa_keluar","tatib_skor","kedisiplinan_absensi","laporan_absensi","hikvision_report_siswa","siswa","absensiguru"],
        kepsek: ["dashboard","generate","akademik","absensi","jurnal_harian","catatan_walikelas","modul_ajar","walas_report","pesan","kedisiplinan_piket","siswa","data_pegawai","pkl_dashboard","pkl_data_siswa","pkl_data_perusahaan","pkl_penugasan","pkl_administrasi","pkl_jurnal","pkl_laporan","kedisiplinan_absensi","kedisiplinan_bpbk","riwayat_prestasi","laporan_absensi","hikvision_report_guru","hikvision_report_karyawan","hikvision_report_siswa"],
        tu: ["dashboard","siswa","data_pegawai","kelas","jurusan","absensi","absensiguru","riwayat_prestasi","siswa_keluar","laporan_absensi","hikvision_report_guru","hikvision_report_karyawan","hikvision_report_siswa","kedisiplinan_absensi","kartu_pelajar","esurat","generate","pesan","akademik"],
        tata_usaha: ["dashboard","siswa","data_pegawai","kelas","jurusan","absensi","absensiguru","riwayat_prestasi","siswa_keluar","laporan_absensi","hikvision_report_guru","hikvision_report_karyawan","hikvision_report_siswa","kedisiplinan_absensi","kartu_pelajar","esurat","generate","pesan","akademik"],
        karyawan: ["dashboard","absensiguru","laporan_absensi","hikvision_report_guru","hikvision_report_karyawan","akademik","pesan"],
        waka_kurikulum: ["dashboard","generate","akademik","silabus","modul_ajar","silabusguru","ketersediaan","beban","jurnal_harian","kelas","siswa","data_pegawai","mapel","walas_report","catatan_walikelas","pesan","pengaturan","advanced_rules","absensiguru","laporan_absensi","kedisiplinan_absensi","hikvision_report_guru"],
        waka_sarpras: ["dashboard","ruangan","denah","kelas","generate","walas_report","catatan_walikelas","siswa","akademik","pesan"],
        waka_humas: ["dashboard","pesan","tampilan","akademik","modul_ajar","walas_report","catatan_walikelas"],
        waka_hubin: ["dashboard","pkl_dashboard","pkl_data_siswa","pkl_data_perusahaan","pkl_penugasan","pkl_administrasi","pkl_jurnal","pkl_laporan","pkl_absensi_setting","pesan","walas_report","catatan_walikelas"],
      };

      const defaultList = DEFAULTS[effectiveKey] || DEFAULTS[role] || [];
      return defaultList.includes(tabId);
    };

    const allowed = isTabPermitted(activeTab);
    if (!allowed && activeTab !== "dashboard") {
      setActiveTab("dashboard");
    }
  }, [activeTab, currentUser?.role, currentUser?.division, currentUser?.subrole, rolePermissions, setActiveTab, databaseHydrated]);
  
  
  const downloadTeacherTemplate = async () => {
    let ExcelJS, saveAs;
    try {
      ExcelJS = await import("exceljs");
      const fileSaver = await import("file-saver");
      saveAs = fileSaver.saveAs || fileSaver.default || fileSaver;
    } catch {
      showNotification("Fitur Excel belum dapat dimuat. Silakan coba lagi.", "error");
      return;
    }
    const wb = new ExcelJS.Workbook();
    const silabusData = [["Mata Pelajaran (wajib)", "Guru Pengajar (wajib)", "Judul Pertemuan / BAB (wajib)", "Kelas / Semester", "Tujuan Pembelajaran", "Materi Pembelajaran (pisah enter)", "Catatan (opsional)"]];
    const wsSilabus = wb.addWorksheet("Modul");
    silabusData.forEach(row => wsSilabus.addRow(row));
    wsSilabus.columns.forEach(c => c.width = 25);
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Template Modul - ${currentUser?.name || currentUser?.username}.xlsx`);
    showNotification("Template Modul berhasil diunduh.", "success");
  };
  const exportAttendanceToExcel = async () => {
    const recordsToExport = filteredAttendanceRecords;
    if (!recordsToExport || recordsToExport.length === 0) {
      showNotification("Tidak ada data absensi untuk diekspor.", "error");
      return;
    }
    let ExcelJS, saveAs;
    try {
      ExcelJS = await import("exceljs");
      const fileSaver = await import("file-saver");
      saveAs = fileSaver.saveAs || fileSaver.default || fileSaver;
    } catch {
      showNotification("Fitur Excel belum dapat dimuat. Silakan coba lagi.", "error");
      return;
    }
    const wb = new ExcelJS.Workbook();
    const rows = recordsToExport.map(r => [r.date, r.time, r.teacherCode, getTeacherName(r.teacherCode), r.sessionName || "-", r.status, r.mode, r.note || "-", r.location ? `${r.location.lat}, ${r.location.lng}` : "-"]);
    const ws = wb.addWorksheet("Absensi_Guru");
    const header = ["Tanggal", "Waktu", "Kode Guru", "Nama Guru", "Sesi", "Status", "Mode", "Catatan", "Lokasi (Lat, Lng)"];
    ws.addRow(header);
    rows.forEach(row => ws.addRow(row));
    ws.columns.forEach(c => c.width = 18);
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Laporan Absensi Guru ${appSettings.appName || "TimeSchedule"}.xlsx`);
    showNotification("Data absensi berhasil diekspor.", "success");
  };
  const handleSaveDashboardMessage = () => {
    if (!ensureDatabaseReadyForWrite("menyimpan pesan dashboard")) return;
    const title = dashboardMessageForm.title.trim();
    const body = dashboardMessageForm.body.trim();
    if (!title || !body) {
      showNotification("Judul dan isi pesan wajib diisi.", "warning");
      return;
    }
    addDashboardMessage({
      ...dashboardMessageForm,
      id: `msg-${createClientId()}`,
      title,
      body,
      createdBy: currentUser?.name || currentUser?.username || "Admin",
      createdRole: currentUser?.role || "admin",
      createdAt: new Date().toISOString(),
      isActive: true
    });
    setDashboardMessageForm({
      title: "",
      body: "",
      target: "all",
      priority: "normal",
      startDate: "",
      endDate: "",
      pinned: true
    });
    showNotification("Pesan dashboard berhasil dipublikasikan.", "success");
  };
  const updateAttendanceSession = (sessionId, patch) => {
    if (!ensureDatabaseReadyForWrite("mengubah sesi absensi")) return;
    const nextSessions = getAttendanceSessions(attendanceSettings).map(session => session.id === sessionId ? {
      ...session,
      ...patch
    } : session);
    updateAttendanceSettings({
      sessions: nextSessions
    });
  };
  const addAttendanceSession = () => {
    if (!ensureDatabaseReadyForWrite("menambah sesi absensi")) return;
    const nextSession = {
      id: `session-${createClientId()}`,
      name: "Sesi Baru",
      type: "checkpoint",
      openTime: "09:00",
      lateAfter: "",
      closeTime: "10:00",
      s: [...days]
    };
    updateAttendanceSettings({
      sessions: [...getAttendanceSessions(attendanceSettings), nextSession]
    });
  };
  const removeAttendanceSession = sessionId => {
    if (!ensureDatabaseReadyForWrite("menghapus sesi absensi")) return;
    const nextSessions = getAttendanceSessions(attendanceSettings).filter(session => session.id !== sessionId);
    updateAttendanceSettings({
      sessions: nextSessions
    });
  };
  const submitAttendanceCorrection = () => {
    if (!ensureDatabaseReadyForWrite("mengirim koreksi absensi")) return;
    if (!hasFeature("attendanceCorrections")) {
      showNotification("Fitur koreksi absensi sedang dinonaktifkan.", "warning");
      return;
    }
    const note = attendanceCorrectionNote.trim();
    if (!note) {
      showNotification("Isi alasan koreksi terlebih dahulu.", "warning");
      return;
    }
    const parts = getJakartaDateParts();
    const session = activeAttendanceSession || getAttendanceSessions(attendanceSettings)[0] || {
      id: "manual-koreksi",
      name: "Koreksi Manual",
      type: "checkpoint"
    };
    addAttendanceCorrection({
      id: `corr-${createClientId()}`,
      teacherCode: currentUser.code,
      teacherName: currentUser.name,
      date: parts.date,
      time: parts.timeWithSeconds,
      sessionId: session.id,
      sessionName: session.name,
      sessionType: session.type,
      status: attendanceSelectedStatus === "Hadir" ? "Izin" : attendanceSelectedStatus,
      note,
      statusReview: "pending",
      createdAt: new Date().toISOString()
    });
    setAttendanceCorrectionNote("");
    showNotification("Pengajuan koreksi absensi berhasil dikirim.", "success");
  };
  const handleReviewAttendanceCorrection = (request, decision) => {
    if (!ensureDatabaseReadyForWrite("meninjau koreksi absensi")) return;
    const record = decision === "approved" ? {
      id: `${request.teacherCode}-${request.date}-${request.sessionId}`,
      teacherCode: request.teacherCode,
      date: request.date,
      time: request.time,
      sessionId: request.sessionId,
      sessionName: request.sessionName,
      sessionType: request.sessionType,
      status: request.status,
      note: request.note,
      mode: "correction",
      location: null,
      evidence: {
        type: "correction",
        requestId: request.id
      },
      approvedBy: currentUser?.name || currentUser?.role || "Reviewer"
    } : null;
    reviewAttendanceCorrection(request.id, currentUser, decision, record);
    showNotification(decision === "approved" ? "Koreksi absensi disetujui." : "Koreksi absensi ditolak.", "success");
  };
  const downloadAcademicCalendarTemplate = async () => {
    let ExcelJS, saveAs;
    try {
      ExcelJS = await import("exceljs");
      const fileSaver = await import("file-saver");
      saveAs = fileSaver.saveAs || fileSaver.default || fileSaver;
    } catch {
      showNotification("Fitur Excel belum dapat dimuat. Silakan coba lagi.", "error");
      return;
    }
    const wb = new ExcelJS.Workbook();
    const data = [
      ["Judul Kegiatan (wajib)", "Tanggal Mulai (YYYY-MM-DD)", "Tanggal Selesai (YYYY-MM-DD)", "Kategori Kegiatan", "Keterangan"],
      ["Ujian Tengah Semester Ganjil", "2026-09-15", "2026-09-19", "Kurikulum", "Pelaksanaan UTS Ganjil serentak"],
      ["Libur Hari Kemerdekaan", "2026-08-17", "2026-08-17", "Hari Libur", "Upacara bendera dan libur nasional"]
    ];
    const ws = wb.addWorksheet("Kalender");
    data.forEach(row => ws.addRow(row));
    ws.columns.forEach(c => c.width = 30);
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Template Kalender Akademik ${appSettings.appName || "TimeSchedule"}.xlsx`);
    showNotification("Template kalender akademik berhasil diunduh.", "success");
  };
  const openImportGuide = () => setIsImportGuideOpen(true);
  const openAcademicCalendarGuide = () => setIsAcademicCalendarGuideOpen(true);
  const openTeacherGuide = () => setIsSyllabusGuideOpen(true);
  const openFooterInfo = (title, message) => {
    setFooterInfoModal({
      isOpen: true,
      title,
      message
    });
  };
  const closeFooterInfo = () => {
    setFooterInfoModal({
      isOpen: false,
      title: "",
      message: ""
    });
  };
  const matchesGradeTarget = (targetGrade, className) => {
    if (isAllLike(targetGrade, ["All", "Semua", "Semua Tingkat"])) return true;
    const grades = parseCsvList(targetGrade);
    return grades.some(g => {
      const trimmedG = String(g).trim();
      const trimmedClass = String(className).trim();
      return trimmedClass.toLowerCase() === trimmedG.toLowerCase() || className.startsWith(trimmedG + " ");
    });
  };
  const normalizeCalendarDateInput = value => {
    if (value == null || value === "") return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return formatExcelSerialDate(value);
    }
    const text = String(value).trim();
    if (!text) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const serial = Number(text);
    if (/^\d{5,6}(\.\d+)?$/.test(text) && Number.isFinite(serial)) {
      return formatExcelSerialDate(serial);
    }
    const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    const parsedDate = new Date(text);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }
    return text;
  };
  const getCalendarCategoryIdByLabel = label => {
    const normalized = normalizeText(label);
    if (!normalized) return calendarCategories[0]?.id || "";
    const matched = calendarCategories.find(cat => sameText(cat.name, label) || sameText(cat.id, label));
    if (matched) return matched.id;
    const safeSlug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "kategori";
    return `cal-${safeSlug}`;
  };
  const formatCalendarDateRange = (start, end) => {
    const startDate = normalizeCalendarDateInput(start);
    const endDate = normalizeCalendarDateInput(end || start);
    if (!startDate) return "-";
    try {
      const startLabel = new Date(`${startDate}T00:00:00`);
      const endLabel = new Date(`${endDate}T00:00:00`);
      const startText = startLabel.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      const endText = endLabel.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      return startDate === endDate ? startText : `${startText} - ${endText}`;
    } catch {
      return `${startDate}${endDate && endDate !== startDate ? ` - ${endDate}` : ""}`;
    }
  };

  /* --- Fungsi Bantu (Helpers) --- */
  const teacherNameMap = useMemo(() => {
    const map = {};
    teachers.forEach(t => {
      map[t.code] = t.name;
    });
    return map;
  }, [teachers]);
  const getTeacherName = code => {
    if (!code) return code;
    const codes = String(code).split(",").map(c => c.trim()).filter(Boolean);
    if (codes.length <= 1) return teacherNameMap[code] || code;
    return codes.map(c => teacherNameMap[c] || c).join(" & ");
  };
  const getRoomName = id => rooms.find(r => r.id === id)?.name || id;
  const getPracticeRoomLabel = roomIds => {
    const ids = parseCsvList(roomIds);
    if (ids.length === 0) return "Semua Ruang Praktik";
    return ids.map(id => getRoomName(id)).join(", ");
  };
  const generationReadiness = useMemo(() => assessGenerateReadiness({
    currentUser,
    classes,
    rooms,
    teachers,
    teachingLoads,
    days,
    timeSlots,
    teacherAvailability,
    strictCompetency
  }), [currentUser, classes, rooms, teachers, teachingLoads, days, timeSlots, teacherAvailability, strictCompetency]);

  /* --- Analitik Dashboard --- */
  const loadDistribution = useMemo(() => {
    const dist = {};
    teachingLoads.forEach(load => {
      const matchingClassesCount = classes.filter(c => matchesGradeTarget(load.targetGrade, c.name) && csvValueMatches(load.targetMajor || "All", c.major, ["All", "Semua"])).length;
      parseTeacherCodes(load.teacherCode).forEach(code => {
        dist[code] = (dist[code] || 0) + load.duration * getCappedClassCount(load, matchingClassesCount);
      });
    });
    return Object.entries(dist).map(([code, total]) => ({
      name: teacherNameMap[code] || code,
      total
    })).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [teachingLoads, classes, teacherNameMap]);
  const subjectComposition = useMemo(() => {
    let block = 0;
    let regular = 0;
    subjects.forEach(s => s.isBlock ? block++ : regular++);
    return [{
      name: "Teori Reguler",
      value: regular
    }, {
      name: "Praktik / Bengkel",
      value: block
    }];
  }, [subjects]);
  const recommendedLoads = useMemo(() => {
    const recs = [];
    const recommendationKeys = new Set();
    const existingLoadKeys = new Set(teachingLoads.map(getLoadKey));
    teachers.forEach(t => {
      const teacherCode = String(t?.code || "").trim();
      if (!teacherCode) return;
      const avail = teacherAvailability[teacherCode] || {
        subjects: []
      };
      const teacherSubjects = Array.isArray(avail.subjects) ? avail.subjects : String(avail.subjects || "").split(",");
      teacherSubjects.map(sub => String(sub || "").trim()).filter(Boolean).forEach(sub => {
        const subjectObj = subjects.find(s => sameText(s.name, sub));
        const targetGrade = subjectObj?.grade && subjectObj.grade !== "Semua" ? subjectObj.grade : "All";
        const targetMajor = subjectObj?.major && !isAllLike(subjectObj.major, ["Umum", "Semua", "All"]) ? subjectObj.major : "All";
        const recommendationKey = getLoadKey({
          teacherCode,
          subject: sub,
          targetGrade,
          targetMajor
        });
        if (!recommendationKey || existingLoadKeys.has(recommendationKey) || recommendationKeys.has(recommendationKey)) return;
        recommendationKeys.add(recommendationKey);
        recs.push({
          teacherCode,
          subject: sub,
          subjectObj,
          targetGrade,
          targetMajor,
          duration: parsePositiveInt(subjectObj?.defaultDuration, 2)
        });
      });
    });
    return recs;
  }, [teachers, teacherAvailability, teachingLoads, subjects]);
  const applyRecommendations = () => {
    try {
      if (!ensureDatabaseReadyForWrite("menambah beban otomatis")) return;
      if (recommendedLoads.length === 0) {
        showNotification("Belum ada rekomendasi beban mengajar baru untuk ditambahkan.");
        return;
      }
      const existing = new Set(teachingLoads.map(getLoadKey));
      const filtered = recommendedLoads.map((r, index) => ({
        id: `auto-load-${createClientId()}-${index}`,
        teacherCode: String(r.teacherCode || "").trim(),
        subject: String(r.subject || "").trim(),
        targetGrade: r.targetGrade || "All",
        targetMajor: r.targetMajor || "All",
        duration: parsePositiveInt(r.duration, 2),
        maxClasses: 0
      })).filter(load => {
        if (!load.teacherCode || !load.subject) return false;
        const key = getLoadKey(load);
        if (!key || existing.has(key)) return false;
        existing.add(key);
        return true;
      });
      if (filtered.length === 0) {
        showNotification("Rekomendasi sudah sinkron, tidak ada beban baru yang perlu ditambahkan.");
        return;
      }
      setTeachingLoads(prev => [...prev, ...filtered]);
      showNotification(`${filtered.length} Beban Mengajar ditambahkan otomatis!`);
    } catch (error) {
      console.error("Gagal menambahkan beban otomatis", error);
      showNotification("Gagal menambahkan beban otomatis. Periksa data guru dan mata pelajaran yang kosong.", "error");
    }
  };

  /* --- Handler Otentikasi --- */
  const handleLogin = async e => {
    e?.preventDefault?.();
    if (isLoggingIn) return;
    setLoginError("");
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setLoginError("Username dan kata sandi wajib diisi.");
      return;
    }
    setIsLoggingIn(true);
    try {
      const serverLogin = await loginViaServer({
        username: trimmedUsername,
        password
      });
      if (serverLogin?.ok && serverLogin.user) {
        if (serverLogin.user.role === "admin" && Array.isArray(teachers) && teachers.length > 0) {
          syncAuthSnapshotToServer({
            adminUser,
            teachers,
            authToken: serverLogin.user.authToken
          }).catch(error => {
            console.warn("Sinkronisasi guru lokal ke server auth gagal", error);
          });
        }
        writeSessionUser(serverLogin.user);
        setCurrentUser(serverLogin.user);
        addActivityLog({
          type: "settings",
          title: "User Login",
          detail: `${serverLogin.user.name || serverLogin.user.username} login ke sistem.`
        });
        
        if (serverLogin.user.role === "siswa") {
          window.location.href = "/student";
          return;
        }
        
        setActiveTab("dashboard");
        return;
      }
      setLoginError("Username atau Password salah!");
    } catch (error) {
      console.error("FRONTEND: Login Error:", error);
      const isNetworkError = error instanceof TypeError || String(error?.message || "").toLowerCase().includes("fetch");
      if (isNetworkError) {
        setLoginError("Tidak bisa terhubung ke auth server. Pastikan auth server sudah berjalan (npm run auth:server), lalu coba lagi.");
      } else if (error?.status === 401) {
        setLoginError("Username atau password salah. Silakan periksa kembali.");
      } else if (error?.status >= 500) {
        setLoginError("Server bermasalah. Pastikan server aktif dan auth server berjalan.");
      } else {
        setLoginError(error?.message || "Auth server tidak tersambung. Jalankan auth server dan pastikan database aktif.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };
  const handleLogout = async () => {
    try {
      const token = currentUser?.authToken;
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.warn('Server logout failed (sesi tetap dihapus di client)', e);
    }
    try {
      sessionStorage.removeItem("skip_default_pw_modal");
      sessionStorage.removeItem("last_prompted_pw_user");
      localStorage.removeItem("skip_default_pw_modal");
    } catch {}
    writeSessionUser(null);
    setCurrentUser(null);
    setUsername("");
    setPassword("");
    setPublicTab("login");
    sessionStorage.removeItem("admin_active_tab");
    sessionStorage.removeItem("admin_sidebar_scroll_top");
    window.location.href = "/";
  };

  const loginBrandTitle = appSettings.appName || "TimeSchedule";
  const loginHeroTitle = appSettings.heroTitle || "Aplikasi Jadwal, Denah & Materi Ajar Sekolah";
  const loginHeroSubtitle = appSettings.heroSubtitle || "Platform terpusat untuk jadwal pelajaran, absensi, hingga publikasi Materi Ajar.";
  const syncAuthSnapshotSafe = async (nextAdminUser = adminUser, nextTeachers = teachers) => {
    if (!Array.isArray(nextTeachers) || nextTeachers.length === 0) return;
    if (!currentUser?.authToken || !databaseHydrated) {
      console.warn("Sinkronisasi auth ditahan sampai database lengkap siap.");
      return;
    }
    try {
      await syncAuthSnapshotToServer({
        adminUser: nextAdminUser,
        teachers: nextTeachers,
        authToken: currentUser?.authToken
      });
    } catch (error) {
      console.warn("Sinkronisasi auth ke server gagal", error);
      if (error?.status === 403) {
        writeSessionUser(null);
        setCurrentUser(null);
        setLoginError("Sesi login kedaluwarsa. Silakan login ulang untuk sinkronisasi guru.");
      }
    }
  };
  const syncAuthSnapshotNow = async (nextAdminUser = adminUser, nextTeachers = teachers, nextStaffs = staffs, actionLabel = "menyinkronkan akun") => {
    if (!currentUser?.authToken) return;
    if (!databaseHydrated) return;
    try {
      await syncAuthSnapshotToServer({
        adminUser: nextAdminUser,
        teachers: Array.isArray(nextTeachers) ? nextTeachers : [],
        staffs: Array.isArray(nextStaffs) ? nextStaffs : [],
        authToken: currentUser.authToken
      });
    } catch (err) {
      console.warn(`[AUTH SYNC] Warning during ${actionLabel}:`, err?.message || err);
    }
  };
  const generateRoomLayout = () => {
    const next = [];
    const layoutSettingsData = layoutSettings || {};
    const gradeFloors = layoutSettingsData.gradeFloors || {
      X: "1",
      XI: "2",
      XII: "3"
    };
    const slotsByFloor = {
      1: [11, 12, 13, 14, 19, 21],
      2: [6, 7, 8, 9, 10, 17, 18, 20, 22, 24, 26, 28],
      3: [1, 2, 3, 4, 5, 15, 16, 23, 25, 27, 29, 30, 31]
    };
    const pointerByFloor = {
      1: 0,
      2: 0,
      3: 0
    };
    classes.forEach(cls => {
      const grade = String(cls.name || "").split(" ")[0] || "X";
      const targetFloor = gradeFloors[grade] || "1";
      let assignedSlot = null;
      if (slotsByFloor[targetFloor] && pointerByFloor[targetFloor] < slotsByFloor[targetFloor].length) {
        assignedSlot = slotsByFloor[targetFloor][pointerByFloor[targetFloor]++];
      } else {
        for (let f of ["1", "2", "3"]) {
          if (slotsByFloor[f] && pointerByFloor[f] < slotsByFloor[f].length) {
            assignedSlot = slotsByFloor[f][pointerByFloor[f]++];
            break;
          }
        }
      }
      const praktikRoomId = layoutSettingsData.majorLabs?.[`${grade}-${cls.major}`] || layoutSettingsData.majorLabs?.[cls.major] || "-";
      next.push({
        className: cls.name,
        major: cls.major,
        grade,
        floor: targetFloor,
        tSlot: assignedSlot,
        teoriRoomId: assignedSlot ? `T-${assignedSlot}` : "-",
        teoriRoomName: assignedSlot ? `ZONA ${assignedSlot}` : "Belum ada ruang teori",
        praktikRoomId
      });
    });
    const grid = {};
    const defaultKampusBLabels = ["Lab HW", "Lab SW", "Lab COE", "Bengkel TKR", "Bengkel TKR", "Lab AK 1", "Lab AK 2", "Lab MP 1", "Lab MP 1", "Bengkel TKR"];
    const currentLabels = [...(layoutBlockLabels?.kampus_b?.praktik || [])];
    for (let i = 0; i < 10; i++) {
      if (!currentLabels[i]) currentLabels[i] = defaultKampusBLabels[i];
    }
    const usedSlots = new Set();
    const praktikRoomToSlotMap = {};
    next.forEach(row => {
      if (row.tSlot) grid[`T-${row.tSlot}`] = {
        className: row.className,
        mode: "teori",
        roomId: row.tSlot
      };
      if (row.praktikRoomId !== "-") {
        let assignedP = praktikRoomToSlotMap[row.praktikRoomId];
        if (!assignedP) {
          const pRoom = rooms.find(r => r.id === row.praktikRoomId);
          if (pRoom) {
            const rName = pRoom.name.trim().toLowerCase();
            let slotIdx = currentLabels.findIndex((l, idx) => !usedSlots.has(idx + 1) && l.trim().toLowerCase() === rName);
            if (slotIdx === -1) {
              slotIdx = currentLabels.findIndex((l, idx) => {
                if (usedSlots.has(idx + 1)) return false;
                const lName = l.trim().toLowerCase();
                return lName && (lName.includes(rName) || rName.includes(lName));
              });
            }
            if (slotIdx !== -1) {
              assignedP = slotIdx + 1;
              currentLabels[slotIdx] = pRoom.name;
            }
          }
          if (!assignedP) {
            for (let i = 0; i < 10; i++) {
              if (!usedSlots.has(i + 1)) {
                assignedP = i + 1;
                const pRoom = rooms.find(r => r.id === row.praktikRoomId);
                if (pRoom) currentLabels[i] = pRoom.name;
                break;
              }
            }
          }
          if (!assignedP) assignedP = 10;
          praktikRoomToSlotMap[row.praktikRoomId] = assignedP;
          usedSlots.add(assignedP);
        }
        const pId = `P-${assignedP}`;
        if (grid[pId]) {
          grid[pId].className += `, ${row.className}`;
        } else {
          grid[pId] = {
            className: row.className,
            mode: "praktik",
            roomId: row.praktikRoomId
          };
        }
      }
    });
    setLayoutBlockLabels(prev => ({
      ...prev,
      kampus_b: {
        praktik: currentLabels
      }
    }));
    setRoomLayout(next);
    setLayoutByDay(prev => {
      const out = {
        ...prev
      };
      days.forEach(d => {
        if (!out[d]) out[d] = {
          ...grid
        };
      });
      return out;
    });
    showNotification("Denah berhasil digenerate! Kelas disebar berdasarkan zona lantai yang di-setting.");
  };
  const dropToSlot = slotId => {
    if (!ensureDatabaseReadyForWrite("mengubah denah")) return;
    if (!dragClassName) return;
    setLayoutByDay(prev => {
      const dayMap = {
        ...(prev[layoutDay] || {})
      };

      // Hapus dari slot lama
      const prevSlot = Object.keys(dayMap).find(k => dayMap[k]?.className.split(",").map(c => c.trim()).includes(dragClassName));
      if (prevSlot) {
        const remainingClasses = dayMap[prevSlot].className.split(",").map(c => c.trim()).filter(c => c !== dragClassName).join(", ");
        if (remainingClasses) {
          dayMap[prevSlot] = {
            ...dayMap[prevSlot],
            className: remainingClasses
          };
        } else {
          delete dayMap[prevSlot];
        }
      }

      // Tambah ke slot baru
      if (dayMap[slotId]) {
        if (!dayMap[slotId].className.split(",").map(c => c.trim()).includes(dragClassName)) {
          dayMap[slotId] = {
            ...dayMap[slotId],
            className: dayMap[slotId].className + `, ${dragClassName}`
          };
        }
      } else {
        const found = roomLayout.find(r => r.className === dragClassName);
        dayMap[slotId] = {
          className: dragClassName,
          mode: slotId.startsWith("P-") ? "praktik" : "teori",
          roomId: slotId.startsWith("P-") ? found?.praktikRoomId || "-" : found?.teoriRoomId || "-"
        };
      }
      return {
        ...prev,
        [layoutDay]: dayMap
      };
    });
    setDragClassName("");
  };
  const removeClassFromDenahSlot = (slotId, className) => {
    if (!ensureDatabaseReadyForWrite("mengubah denah")) return;
    const targetClass = String(className || "").trim();
    if (!slotId || !targetClass) return;
    setLayoutByDay(prev => {
      const dayMap = {
        ...(prev[layoutDay] || {})
      };
      const slot = dayMap[slotId];
      if (!slot?.className) return prev;
      const remainingClasses = String(slot.className).split(",").map(item => item.trim()).filter(item => item && item !== targetClass);
      if (remainingClasses.length > 0) {
        dayMap[slotId] = {
          ...slot,
          className: remainingClasses.join(", ")
        };
      } else {
        delete dayMap[slotId];
      }
      return {
        ...prev,
        [layoutDay]: dayMap
      };
    });
  };
  const renameRoomInline = (roomId, newName) => {
    if (!ensureDatabaseReadyForWrite("mengubah nama ruangan")) return;
    const name = String(newName || "").trim();
    if (!roomId || !name) return;
    setRooms(prev => prev.map(r => r.id === roomId ? {
      ...r,
      name
    } : r));
    setRoomLayout(prev => prev.map(x => {
      if (x.teoriRoomId === roomId) return {
        ...x,
        teoriRoomName: name
      };
      return x;
    }));
    showNotification(`Nama ruangan ${roomId} diperbarui.`);
  };
  const exportLayoutJson = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      layoutSettings,
      roomLayout,
      layoutByDay,
      layoutPreset,
      layoutBlockLabels
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `denah-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };
  const importLayoutJson = async e => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.layoutSettings) setLayoutSettings(data.layoutSettings);
      if (Array.isArray(data.roomLayout)) setRoomLayout(data.roomLayout);
      if (data.layoutByDay && typeof data.layoutByDay === "object") setLayoutByDay(data.layoutByDay);
      if (data.layoutPreset) setLayoutPreset(data.layoutPreset);
      if (data.layoutBlockLabels) setLayoutBlockLabels(data.layoutBlockLabels);
      showNotification("Import denah berhasil.");
    } catch {
      showNotification("Import denah gagal. Format file tidak valid.");
    } finally {
      e.target.value = "";
    }
  };
  const getSchoolTimeRange = day => {
    const slots = (timeSlots[day] || []).filter(s => !s.isBreak);
    if (!slots.length) return {
      masuk: "-",
      pulang: "-"
    };
    const first = String(slots[0].label || "").split("-")[0]?.trim() || "-";
    const last = String(slots[slots.length - 1].label || "").split("-")[1]?.trim() || "-";
    return {
      masuk: first,
      pulang: last
    };
  };
  const getFloorColorByClassName = className => {
    const value = String(className || "").toUpperCase();
    if (value.startsWith("XII ")) return "text-white";
    if (value.startsWith("XI ")) return "text-black";
    if (value.startsWith("X ")) return "text-black";
    return "bg-slate-200 text-slate-700";
  };
  const getFloorLegend = className => {
    const value = String(className || "").toUpperCase();
    if (value.startsWith("XII ")) return {
      label: "Lt. 3",
      color: "#fb923c"
    };
    if (value.startsWith("XI ")) return {
      label: "Lt. 2",
      color: "#f9a8d4"
    };
    if (value.startsWith("X ")) return {
      label: "Lt. 1",
      color: "#facc15"
    };
    return {
      label: "-",
      color: "#e2e8f0"
    };
  };
  const updateKampusALabel = (slot, value) => {
    setLayoutBlockLabels(prev => {
      const labels = [...(prev.kampus_a?.teori || [])];
      labels[slot - 1] = value;
      return {
        ...prev,
        kampus_a: {
          ...prev.kampus_a,
          teori: labels
        }
      };
    });
  };
  const updateKampusBLabel = (slot, value) => {
    setLayoutBlockLabels(prev => {
      const labels = [...(prev.kampus_b?.praktik || [])];
      labels[slot - 1] = value;
      return {
        ...prev,
        kampus_b: {
          ...prev.kampus_b,
          praktik: labels
        }
      };
    });
  };




  /* --- Logika Import Teks Bebas --- */

  
  const handleBulkTextChange = value => {
    setBulkText(value);
    setBulkImportPreview(null);
  };
  
  


  const { openModal, handleBulkAddLoads, handleSyllabusBatchSave, closeModal, handleGenerateSlots, handleSave, handleDelete, handleToggleDashboardMessageSafe, handleRemoveDashboardMessageSafe, handleRemoveAttendanceRecordSafe, handleRemoveCalendarEventSafe, handleRemoveCalendarCategorySafe, handleRemoveSyllabusCategorySafe, handleRemoveSyllabusSafe } = useAdminCRUD({
    setModalConfig, activeTab, setFormData, majors, classes, teachers, staffs, setStaffs, subjects,
    teachingLoads, setTeachingLoads, setConfirmDialog, showNotification, ensureDatabaseReadyForWrite, addActivityLog,
    syllabusCategories, timeSlots, setTimeSlots, setMajors, setClasses, setTeachers, setSubjects,
    rooms, setRooms, dashboardMessages, 
    academicCalendar,
    matchesGradeTarget, getRoomName, updateSelectionForTab, normalizeUserRole, isSuperAdminRole, csvValueMatches, csvIncludesText, parseTeacherCodes, getCappedClassCount, getCalendarCategoryIdByLabel, getClassKey, getRoomKey, getTeacherKey, getSubjectKey, hashPassword, syncAuthSnapshotSafe, 
    normalizeCalendarDateInput, formatCalendarDateRange, 
    selectedDaySetting, calendarCategories, selectedSilabusSubject, selectedTeacherSilabusSubject, currentUser, appSettings, setBulkLoadGrades, setBulkLoadMajors, setBulkConflictMode, formData, bulkLoadGrades, bulkLoadMajors, bulkConflictMode, setBulkImportPreview, isSavingModal, modalConfig, setIsSavingModal, adminUser, syncAuthSnapshotNow, saveDatabaseNow, setAdminUser, setCurrentUser, writeSessionUser, setSchedule, setRoomLayout, setLayoutByDay, setAppSettings, teacherAvailability, days, setTeacherAvailability, setSelectedSilabusSubject, setSelectedTeacherSilabusSubject, setSelectedSilabusId, setSelectedTeacherSilabusId, setLoginError, handleBulkDelete, setDays, setSelectedDaySetting,
    students, setStudents, layoutSettings, setLayoutSettings, customThemePresets, setCustomThemePresets, deletedHistory, setDeletedHistory, generationReadiness
  });

  /* --- LOGIKA KETAT: PENJADWALAN PRAKTIK & BENGKEL (Extracted) --- */
  const {
    handleResetSchedule,
    handleResetRuangan,
    handleResetDenah,
    handleClearCurrentDenahDay,
    scheduleGenerationMode,
    setScheduleGenerationMode,
    manualSlotModal,
    setManualSlotModal,
    openManualSlotModal,
    closeManualSlotModal,
    saveManualSlot,
    deleteManualSlot,
    handleCopyCurrentDenahToAllDays,
    handleGenerate,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    startQuickEditGuru,
    saveQuickEditGuru,
    applyThemePreset,
    applyAutoRecommendedTheme,
    hexToRgb,
    luminance,
    contrastRatio,
    saveCurrentAsPreset,
    autoFixContrast,
    resetThemeDefaults,
    exportThemeJson,
    importThemeJson,
    THEME_PRESETS,
    MAJOR_ICON_OPTIONS
  } = useAdminScheduleGenerator({ 
    matchesGradeTarget, getRoomName, updateSelectionForTab, normalizeUserRole, isSuperAdminRole, csvValueMatches, csvIncludesText, parseTeacherCodes, getCappedClassCount, getCalendarCategoryIdByLabel, getClassKey, getRoomKey, getTeacherKey, getSubjectKey, hashPassword, syncAuthSnapshotSafe, 
    normalizeCalendarDateInput, formatCalendarDateRange, 
    layoutDay, setDragClassName, strictCompetency, teacherAvailability, specialWednesdayConstraint, advancedRules, setQuickEditGuruCode, setQuickGuruForm, quickGuruForm, setTeachers, adminUser, newPresetName, setNewPresetName,
    schedule, setSchedule, rooms, setRooms, roomLayout, setRoomLayout, layoutByDay, setLayoutByDay,
    isGenerated, setIsGenerated, teachers, subjects, classes, majors, teachingLoads, timeSlots, days,
    scheduleCellMap, calendarCategories, academicCalendar, appSettings, setAppSettings,
    setConfirmDialog, showNotification, addActivityLog, ensureDatabaseReadyForWrite,
    students, setStudents, layoutSettings, setLayoutSettings, customThemePresets, setCustomThemePresets, deletedHistory, setDeletedHistory, generationReadiness, saveDatabaseNow, setSwapWarning });

  
  const {
    downloadMasterTemplate,
    exportAllDataToExcel,
    handleFileUpload,
    handlePreviewImport,
    handleProcessImport
  } = useAdminImportExport({ 
    matchesGradeTarget, getRoomName, updateSelectionForTab, normalizeUserRole, isSuperAdminRole, csvValueMatches, csvIncludesText, parseTeacherCodes, getCappedClassCount, getCalendarCategoryIdByLabel, getClassKey, getRoomKey, getTeacherKey, getSubjectKey, hashPassword, syncAuthSnapshotSafe, 
    normalizeCalendarDateInput, formatCalendarDateRange, 
    adminUser,
    showNotification, majors, classes, teachers, subjects, rooms, staffs, students,
    scheduleCellMap, timeSlots, days, activeTab, setBulkImportPreview,
    bulkImportPreview, closeModal, appSettings, calendarCategories,
    setMajors, setClasses, setRooms, setTeachers, setSubjects, setStaffs, setStudents,
    setTeachingLoads, setDays, setTimeSlots, setTeacherAvailability,
    setCalendarCategories, setAcademicCalendar,
    currentUser, databaseHydrated, databaseHydrationFailedRef,
    getTeacherName, syllabuses, setSyllabuses, syllabusCategories, setSyllabusCategories,
    attendanceRecords, setAttendanceRecords,
    setBulkText, handleBulkTextChange, openAcademicCalendarGuide, openTeacherGuide, openImportGuide, setIsImportGuideOpen, fileInputRef, bulkText,
    downloadAcademicCalendarTemplate, downloadTeacherTemplate, teachingLoads, teacherAvailability
  });

  const { renderKampusA, renderKampusB, renderScheduleTable } = useAdminRenderers({
    layoutBlockLabels, updateKampusALabel, updateKampusBLabel, dropToSlot, dragClassName, setDragClassName,
    getFloorColorByClassName, getFloorLegend, layoutByDay, layoutDay,
    scheduleCellMap, currentUser, getMajorColorHex, handleDragOver, handleDragLeave, handleDrop, handleDragStart,
    teachers, parseCsvList, getPracticeRoomLabel, isGenerated, timeSlots, updateSelectionForTab, openModal, checkDependencies, handleDelete,
    days, openManualSlotModal
  });


  const getTabPermissionLevel = (tab = activeTab) => {
    const role = normalizeUserRole(currentUser?.role);
    if (role === "admin" || role === "superadmin") return "edit";
    const division = (currentUser?.division || "").toLowerCase();
    
    // Waka Kurikulum & Kurikulum role have full EDIT access to all kurikulum tabs
    const kurikulumTabs = [
      "generate", "akademik", "silabus", "silabusguru", "modul_ajar",
      "ketersediaan", "beban", "kelas", "guru", "mapel", "jurnal_harian",
      "catatan_walikelas", "walas_report", "siswa", "pengaturan", "advanced_rules"
    ];
    if ((role === "waka" && division === "kurikulum") || role === "kurikulum") {
      if (kurikulumTabs.includes(tab)) return "edit";
    }

    // Waka Kesiswaan & Kesiswaan role have full EDIT access to all kesiswaan tabs
    const kesiswaanTabs = [
      "siswa", "kedisiplinan_absensi", "catatan_walikelas", "walas_report",
      "riwayat_prestasi", "kedisiplinan_bpbk", "kedisiplinan_piket", "tatib_skor",
      "siswa_keluar", "laporan_absensi", "hikvision_report_siswa", "pesan"
    ];
    if ((role === "waka" && division === "kesiswaan") || role === "kesiswaan") {
      if (kesiswaanTabs.includes(tab)) return "edit";
    }

    const roleKey = role === "waka" ? `waka_${division || "kurikulum"}` : role;

    // Cek subrole untuk guru dan karyawan
    const subrole = (currentUser?.subrole || "").toLowerCase().trim();
    const SUBROLE_KEYS_ALL = [
      'bpbk', 'pembina_osis', 'sekretaris_osis', 'walikelas',
      'sekretaris_kesiswaan', 'anggota_kesiswaan',
      'sekretaris_kurikulum', 'anggota_kurikulum',
      'sekretaris_hubin', 'anggota_hubin',
      'sekretaris_sarpras', 'anggota_sarpras',
      'sekretaris_tu', 'bendahara',
    ];
    const effectiveRoleKey = (subrole && SUBROLE_KEYS_ALL.includes(subrole)) ? subrole : roleKey;

    const perms = rolePermissions?.[effectiveRoleKey] || rolePermissions?.[roleKey];
    if (!perms) return "none";
    let level = "none";
    if (Array.isArray(perms)) {
      level = perms.includes(tab) ? (role === "kepsek" ? "view" : "edit") : "none";
    } else {
      level = perms[tab] || "none";
      if (level === "otomatis") {
        level = role === "kepsek" ? "view" : "edit";
      }
    }
    return level;
  };
  const SidebarGroup = ({
    label,
    icon: Icon,
    isOpen,
    onToggle,
    children
  }) => {
    return <div className="mb-1 w-full">
      <button onClick={onToggle} type="button" className="group relative mb-2 flex w-full items-center justify-between rounded-[var(--ui-radius-small)] border-none bg-white/55 text-[12px] text-slate-500 transition-all cursor-pointer hover:border-slate-200 hover:bg-white hover:text-slate-800 hover:-sm h-10 px-4 text-sm font-bold">
        <div className="flex items-center gap-3">
          {Icon && <Icon size={18} className="text-slate-400 group-hover:text-slate-700 transition-colors" />}
          <span>{label}</span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 group-hover:text-slate-700 transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`} />
      </button>
      <div className="overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out ml-4 pl-4 border-l border-slate-200/80" style={{
        maxHeight: isOpen ? "1000px" : "0px",
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? "auto" : "none",
        marginTop: isOpen ? "2px" : "0px",
        marginBottom: isOpen ? "8px" : "0px"
      }}>
        {children}
      </div>
    </div>;
  };
  const SidebarSection = ({
    label
  }) => {
    if (isSidebarCollapsed) return null;
    return <div className="mt-4 mb-1 px-3 flex items-center">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
        {label}
      </span>
    </div>;
  };
  const renderNavItem = ({
    id,
    icon,
    label,
    badge,
    collapsed,
    featureKey,
    activeIds
  }) => {
    const activeRole = normalizeUserRole(currentUser?.role);

    // Admin & superadmin always get everything
    if (activeRole === "superadmin" || activeRole === "admin") {
      if (featureKey && !hasFeature(featureKey) && featureKey !== "attendance") return null;
      const isActive = activeIds ? activeIds.includes(activeTab) : activeTab === id;
      const isCollapsed = collapsed !== undefined ? collapsed : (isSidebarCollapsed && !isMobileMenuOpen);
      return <SidebarNavItem id={id} icon={icon} label={label} badge={badge} isActive={isActive} onClick={setActiveTab} collapsed={isCollapsed} />;
    }

    // Determine effective rolePermissions key
    let effectiveKey = activeRole;
    const subrole = (currentUser?.subrole || "").toLowerCase().trim();
    const KNOWN_SUBROLES = [
      'bpbk', 'pembina_osis', 'sekretaris_osis', 'walikelas',
      'sekretaris_kesiswaan', 'anggota_kesiswaan',
      'sekretaris_kurikulum', 'anggota_kurikulum',
      'sekretaris_hubin', 'anggota_hubin',
      'sekretaris_sarpras', 'anggota_sarpras',
      'sekretaris_tu', 'bendahara'
    ];
    if (subrole && KNOWN_SUBROLES.includes(subrole)) {
      effectiveKey = subrole;
    } else if (activeRole === "waka" || activeRole.startsWith("waka_")) {
      const div = (currentUser?.division || activeRole.replace("waka_", "") || "kurikulum").toLowerCase().trim();
      effectiveKey = `waka_${div}`;
    } else if (activeRole === "tata_usaha") {
      effectiveKey = "tu";
    }

    // Look up permission — rolePermissions is the SINGLE source of truth
    const perms = rolePermissions?.[effectiveKey] || rolePermissions?.[activeRole];
    let level = null;
    if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
      level = perms[id] ?? null;
    } else if (Array.isArray(perms)) {
      level = perms.includes(id) ? "view" : "nonaktif";
    }

    let isAllowed = false;
    const isWalasUser = currentUser?.isWalas || currentUser?.walasClass;

    if (level === "edit" || level === "view" || level === "otomatis" || level === "full") {
      isAllowed = true;
    } else if (level === "nonaktif" || level === "none" || level === "off") {
      // STRICT: Jika dinonaktifkan di Hak Akses Role, tombol/menu TIDAK BOLEH tampil
      isAllowed = false;
    } else if (isWalasUser && ["catatan_walikelas", "walas_report"].includes(id)) {
      // Wali Kelas default
      isAllowed = true;
    } else {
      // Fallback DEFAULTS jika belum diatur di rolePermissions
      const DEFAULTS = {
        guru: ["dashboard","generate","akademik","absensiguru","jurnal_harian","catatan_walikelas","modul_ajar","walas_report","kedisiplinan_absensi","silabusguru","ketersediaan","beban","pesan","kedisiplinan_piket"],
        bpbk: ["dashboard","kedisiplinan_bpbk","kedisiplinan_absensi","riwayat_prestasi","siswa","absensiguru","jurnal_harian","modul_ajar","akademik","pesan","catatan_walikelas","walas_report","hikvision_report_siswa"],
        pembina_osis: ["dashboard","kedisiplinan_piket","riwayat_prestasi","akademik","siswa","absensiguru","jurnal_harian","modul_ajar","pesan"],
        sekretaris_osis: ["dashboard","riwayat_prestasi","akademik","absensiguru","jurnal_harian","pesan"],
        sekretaris_kesiswaan: ["dashboard","absensi","kedisiplinan_piket","kedisiplinan_absensi","catatan_walikelas","riwayat_prestasi","siswa","absensiguru","jurnal_harian","modul_ajar","akademik","pesan"],
        anggota_kesiswaan: ["dashboard","kedisiplinan_piket","kedisiplinan_absensi","riwayat_prestasi","absensiguru","jurnal_harian","modul_ajar","akademik","pesan"],
        waka_kesiswaan: ["dashboard","absensi","akademik","pesan","kedisiplinan_piket","kedisiplinan_bpbk","riwayat_prestasi","catatan_walikelas","walas_report","siswa_keluar","tatib_skor","kedisiplinan_absensi","laporan_absensi","hikvision_report_siswa","siswa","absensiguru"],
        kepsek: ["dashboard","generate","akademik","absensi","jurnal_harian","catatan_walikelas","modul_ajar","walas_report","pesan","kedisiplinan_piket","siswa","data_pegawai","pkl_dashboard","pkl_data_siswa","pkl_data_perusahaan","pkl_penugasan","pkl_administrasi","pkl_jurnal","pkl_laporan","kedisiplinan_absensi","kedisiplinan_bpbk","riwayat_prestasi","laporan_absensi","hikvision_report_guru","hikvision_report_karyawan","hikvision_report_siswa"],
        tu: ["dashboard","siswa","data_pegawai","kelas","jurusan","absensi","absensiguru","riwayat_prestasi","siswa_keluar","laporan_absensi","hikvision_report_guru","hikvision_report_karyawan","hikvision_report_siswa","kedisiplinan_absensi","kartu_pelajar","esurat","generate","pesan","akademik"],
        tata_usaha: ["dashboard","siswa","data_pegawai","kelas","jurusan","absensi","absensiguru","riwayat_prestasi","siswa_keluar","laporan_absensi","hikvision_report_guru","hikvision_report_karyawan","hikvision_report_siswa","kedisiplinan_absensi","kartu_pelajar","esurat","generate","pesan","akademik"],
        karyawan: ["dashboard","absensiguru","laporan_absensi","hikvision_report_guru","hikvision_report_karyawan","akademik","pesan"],
        waka_kurikulum: ["dashboard","generate","akademik","silabus","modul_ajar","silabusguru","ketersediaan","beban","jurnal_harian","kelas","siswa","data_pegawai","mapel","walas_report","catatan_walikelas","pesan","pengaturan","advanced_rules","absensiguru","laporan_absensi","kedisiplinan_absensi","hikvision_report_guru"],
        waka_sarpras: ["dashboard","ruangan","denah","kelas","generate","walas_report","catatan_walikelas","siswa","akademik","pesan"],
        waka_humas: ["dashboard","pesan","tampilan","akademik","modul_ajar","walas_report","catatan_walikelas"],
        waka_hubin: ["dashboard","pkl_dashboard","pkl_data_siswa","pkl_data_perusahaan","pkl_penugasan","pkl_administrasi","pkl_jurnal","pkl_laporan","pkl_absensi_setting","pesan","walas_report","catatan_walikelas"],
      };
      const defaultList = DEFAULTS[effectiveKey] || DEFAULTS[activeRole] || [];
      isAllowed = defaultList.includes(id);
    }

    if (!isAllowed) return null;
    if (featureKey && !hasFeature(featureKey) && featureKey !== "attendance") return null;
    const isActive = activeIds ? activeIds.includes(activeTab) : activeTab === id;
    const isCollapsed = collapsed !== undefined ? collapsed : (isSidebarCollapsed && !isMobileMenuOpen);
    return <SidebarNavItem id={id} icon={icon} label={label} badge={badge} isActive={isActive} onClick={setActiveTab} collapsed={isCollapsed} />;
  };
    const hasAnyConfigAccess = () => {
    const configTabs = ["fitur", "hak_akses", "tampilan", "pengaturanuser", "api_keys", "whatsapp", "gdrive_backup", "audit_log"];
    const activeRole = normalizeUserRole(currentUser?.role);
    if (activeRole === "superadmin" || activeRole === "admin") return false;
    const checkAllowed = roleKey => {
      const perms = rolePermissions?.[roleKey];
      if (!perms) return false;
      return configTabs.some(tab => {
        if (Array.isArray(perms)) {
          return perms.includes(tab);
        }
        const level = perms[tab];
        return level && level !== "none" && level !== "nonaktif";
      });
    };
    if (activeRole === "guru") return checkAllowed("guru");
    if (activeRole === "tu" || activeRole === "tata_usaha") return checkAllowed("tu");
    if (activeRole === "kepsek") return checkAllowed("kepsek");
    if (activeRole === "waka") {
      const division = (currentUser?.division || "kurikulum").toLowerCase();
      return checkAllowed(`waka_${division}`);
    }
    return false;
  };


  const tabSubtitles = {
    dashboard: "Analisis beban kerja, distribusi jam mengajar, kapasitas ruangan, dan statistik program keahlian.",
    ketersediaan: "Kelola kesediaan waktu mengajar dan jadwal kosong bapak/ibu guru.",
    generate: "Generate, susun, dan kelola jadwal pelajaran mingguan secara cerdas.",
    absensi: "Catatan kehadiran guru dan laporan kegiatan belajar mengajar (KBM).",
    absensiguru: "Absen KBM (GPS) mandiri untuk guru di lokasi sekolah.",
    silabus: "Manajemen dokumen modul, materi pokok, dan rencana pembelajaran.",
    silabusguru: "Modul saya dan materi pokok untuk proses KBM.",
    kelas: "Kelola data kelas, tingkat ajaran, jurusan, dan wali kelas.",
    jurusan: "Kelola data program keahlian dan jurusan sekolah.",
    guru: "Kelola profil data guru, kode penugasan, dan status kepegawaian.",
    mapel: "Kelola daftar mata pelajaran, alokasi jam, dan jenis muatan.",
    ruangan: "Kelola data ruang kelas, lab komputer, bengkel, dan kapasitas.",
    beban: "Distribusi alokasi jam mengajar guru per mata pelajaran.",
    denah: "Atur penempatan tata letak ruangan teori dan praktik.",
    pengaturan: "Konfigurasi jam pelajaran, jam istirahat, dan hari aktif sekolah.",
    advanced_rules: "Atur batas, prioritas, dan aturan khusus untuk proses penyusunan jadwal.",
    tampilan: "Ubah tema warna, logo, dan identitas visual aplikasi.",
    pengaturanuser: "Kelola hak akses pengguna, manajemen admin, dan akun guru.",
    fitur: "Aktifkan atau nonaktifkan fitur aplikasi tanpa menghapus data.",
    pesan: "Publikasikan pesan kepala sekolah atau admin ke dashboard pengguna.",
    pkl_dashboard: "Pantau ringkasan statistik dan aktivitas peserta PKL secara realtime.",
    pkl_data_siswa: "Manajemen data peserta PKL, kelas, jurusan, dan status penempatan.",
    pkl_data_perusahaan: "Manajemen daftar DUDI, kuota peserta, dan profil perusahaan.",
    pkl_penugasan: "Otomatisasi dan pengelolaan pembagian guru pembimbing PKL.",
    pkl_administrasi: "Kelola permohonan surat pengantar, persetujuan, dan mutasi PKL.",
    pkl_jurnal: "Monitoring laporan harian, kehadiran, dan aktivitas jurnal siswa.",
    pkl_laporan: "Rekapitulasi data, penilaian, dan laporan akhir pelaksanaan PKL."
  };
  const activeUserRole = normalizeUserRole(currentUser?.role);

  const isClassMajorMismatch = modalConfig.type === "kelas" && (formData.name || "").trim() !== "" && (formData.major || "").trim() !== "" && !(formData.name || "").toUpperCase().includes((formData.major || "").toUpperCase());

  /* --- Pengatur Tampilan Utama --- */
  const handleSort = (tabKey, key) => {
    setTableSorts(prev => ({
      ...prev,
      [tabKey]: {
        ...(prev[tabKey] || DEFAULT_TABLE_SORTS[tabKey]),
        key,
        dir: prev[tabKey]?.key === key && prev[tabKey]?.dir === 'asc' ? 'desc' : 'asc'
      }
    }));
  };

  const { renderTable } = useAdminTableRenderer({
    activeTab, getTabPermissionLevel, activeUserRole: normalizeUserRole(currentUser?.role),
    getActiveSortConfig, selectedRows, getSearchTextForTab, searchTerm, getTableSort,
    itemsPerPage, tablePage, getRowKeyForTab, tabSubtitles, setSearchTerm, setTablePage,
    handleSelectAll, handleSort, handleBulkDelete, renderTableFilters: undefined, setShowImportModal: undefined,
    openModal, deletedHistory, undoLastDelete, handleResetRuangan, setItemsPerPage, setTableSorts,
    updateSelectionForTab
  });

  const tabProps = {
    App: typeof App !== "undefined" ? App : undefined,
    rememberMe: typeof rememberMe !== "undefined" ? rememberMe : undefined,
    setRememberMe: typeof setRememberMe !== "undefined" ? setRememberMe : undefined,
    currentUser: typeof currentUser !== "undefined" ? currentUser : undefined,
    setCurrentUser: typeof setCurrentUser !== "undefined" ? setCurrentUser : undefined,
    lastPersistedPayloadRef: typeof lastPersistedPayloadRef !== "undefined" ? lastPersistedPayloadRef : undefined,
    databaseHydrated: typeof databaseHydrated !== "undefined" ? databaseHydrated : undefined,
    isMobileMenuOpen: typeof isMobileMenuOpen !== "undefined" ? isMobileMenuOpen : undefined,
    setIsMobileMenuOpen: typeof setIsMobileMenuOpen !== "undefined" ? setIsMobileMenuOpen : undefined,
    authHydrated: typeof authHydrated !== "undefined" ? authHydrated : undefined,
    setAuthHydrated: typeof setAuthHydrated !== "undefined" ? setAuthHydrated : undefined,
    publicTab: typeof publicTab !== "undefined" ? publicTab : undefined,
    setPublicTab: typeof setPublicTab !== "undefined" ? setPublicTab : undefined,
    publicDay: typeof publicDay !== "undefined" ? publicDay : undefined,
    setPublicDay: typeof setPublicDay !== "undefined" ? setPublicDay : undefined,
    tampilanTab: typeof tampilanTab !== "undefined" ? tampilanTab : undefined,
    setTampilanTab: typeof setTampilanTab !== "undefined" ? setTampilanTab : undefined,
    activeTab: typeof activeTab !== "undefined" ? activeTab : undefined,
    _setActiveTab: typeof _setActiveTab !== "undefined" ? _setActiveTab : undefined,


    tablePage: typeof tablePage !== "undefined" ? tablePage : undefined,
    setTablePage: typeof setTablePage !== "undefined" ? setTablePage : undefined,
    itemsPerPage: typeof itemsPerPage !== "undefined" ? itemsPerPage : undefined,
    setItemsPerPage: typeof setItemsPerPage !== "undefined" ? setItemsPerPage : undefined,
    isBackingUp: typeof isBackingUp !== "undefined" ? isBackingUp : undefined,
    setIsBackingUp: typeof setIsBackingUp !== "undefined" ? setIsBackingUp : undefined,
    handleBackupExport: typeof handleBackupExport !== "undefined" ? handleBackupExport : undefined,
    setActiveTab: typeof setActiveTab !== "undefined" ? setActiveTab : undefined,



    gradeTab: typeof gradeTab !== "undefined" ? gradeTab : undefined,
    setGradeTab: typeof setGradeTab !== "undefined" ? setGradeTab : undefined,
    scheduleFilterDay: typeof scheduleFilterDay !== "undefined" ? scheduleFilterDay : undefined,
    setScheduleFilterDay: typeof setScheduleFilterDay !== "undefined" ? setScheduleFilterDay : undefined,
    scheduleFilterGrade: typeof scheduleFilterGrade !== "undefined" ? scheduleFilterGrade : undefined,
    setScheduleFilterGrade: typeof setScheduleFilterGrade !== "undefined" ? setScheduleFilterGrade : undefined,
    scheduleFilterMajor: typeof scheduleFilterMajor !== "undefined" ? scheduleFilterMajor : undefined,
    setScheduleFilterMajor: typeof setScheduleFilterMajor !== "undefined" ? setScheduleFilterMajor : undefined,
    scheduleFilterClass: typeof scheduleFilterClass !== "undefined" ? scheduleFilterClass : undefined,
    setScheduleFilterClass: typeof setScheduleFilterClass !== "undefined" ? setScheduleFilterClass : undefined,
    scheduleSearchQuery: typeof scheduleSearchQuery !== "undefined" ? scheduleSearchQuery : undefined,
    setScheduleSearchQuery: typeof setScheduleSearchQuery !== "undefined" ? setScheduleSearchQuery : undefined,
    expandedGroups: typeof expandedGroups !== "undefined" ? expandedGroups : undefined,
    setExpandedGroups: typeof setExpandedGroups !== "undefined" ? setExpandedGroups : undefined,
    toggleGroup: typeof toggleGroup !== "undefined" ? toggleGroup : undefined,







    isSidebarCollapsed: typeof isSidebarCollapsed !== "undefined" ? isSidebarCollapsed : undefined,
    setIsSidebarCollapsed: typeof setIsSidebarCollapsed !== "undefined" ? setIsSidebarCollapsed : undefined,
    sidebarScrollRef: typeof sidebarScrollRef !== "undefined" ? sidebarScrollRef : undefined,
    sidebarScrollPos: typeof sidebarScrollPos !== "undefined" ? sidebarScrollPos : undefined,

    toggleSidebar: typeof toggleSidebar !== "undefined" ? toggleSidebar : undefined,
    username: typeof username !== "undefined" ? username : undefined,
    setUsername: typeof setUsername !== "undefined" ? setUsername : undefined,
    password: typeof password !== "undefined" ? password : undefined,
    setPassword: typeof setPassword !== "undefined" ? setPassword : undefined,
    loginError: typeof loginError !== "undefined" ? loginError : undefined,
    setLoginError: typeof setLoginError !== "undefined" ? setLoginError : undefined,
    isLoggingIn: typeof isLoggingIn !== "undefined" ? isLoggingIn : undefined,
    setIsLoggingIn: typeof setIsLoggingIn !== "undefined" ? setIsLoggingIn : undefined,
    showPassword: typeof showPassword !== "undefined" ? showPassword : undefined,
    setShowPassword: typeof setShowPassword !== "undefined" ? setShowPassword : undefined,
    teacherLocation: typeof teacherLocation !== "undefined" ? teacherLocation : undefined,
    setTeacherLocation: typeof setTeacherLocation !== "undefined" ? setTeacherLocation : undefined,
    locationError: typeof locationError !== "undefined" ? locationError : undefined,
    setLocationError: typeof setLocationError !== "undefined" ? setLocationError : undefined,
    isCheckingIn: typeof isCheckingIn !== "undefined" ? isCheckingIn : undefined,
    setIsCheckingIn: typeof setIsCheckingIn !== "undefined" ? setIsCheckingIn : undefined,
    attendanceSuccessMsg: typeof attendanceSuccessMsg !== "undefined" ? attendanceSuccessMsg : undefined,
    setAttendanceSuccessMsg: typeof setAttendanceSuccessMsg !== "undefined" ? setAttendanceSuccessMsg : undefined,
    attendanceQrDataUrl: typeof attendanceQrDataUrl !== "undefined" ? attendanceQrDataUrl : undefined,
    setAttendanceQrDataUrl: typeof setAttendanceQrDataUrl !== "undefined" ? setAttendanceQrDataUrl : undefined,
    attendanceQrInput: typeof attendanceQrInput !== "undefined" ? attendanceQrInput : undefined,
    setAttendanceQrInput: typeof setAttendanceQrInput !== "undefined" ? setAttendanceQrInput : undefined,
    attendancePhoto: typeof attendancePhoto !== "undefined" ? attendancePhoto : undefined,
    setAttendancePhoto: typeof setAttendancePhoto !== "undefined" ? setAttendancePhoto : undefined,
    photoError: typeof photoError !== "undefined" ? photoError : undefined,
    setPhotoError: typeof setPhotoError !== "undefined" ? setPhotoError : undefined,
    attendanceSelectedStatus: typeof attendanceSelectedStatus !== "undefined" ? attendanceSelectedStatus : undefined,
    setAttendanceSelectedStatus: typeof setAttendanceSelectedStatus !== "undefined" ? setAttendanceSelectedStatus : undefined,
    attendanceNote: typeof attendanceNote !== "undefined" ? attendanceNote : undefined,
    setAttendanceNote: typeof setAttendanceNote !== "undefined" ? setAttendanceNote : undefined,
    attendanceCorrectionNote: typeof attendanceCorrectionNote !== "undefined" ? attendanceCorrectionNote : undefined,
    setAttendanceCorrectionNote: typeof setAttendanceCorrectionNote !== "undefined" ? setAttendanceCorrectionNote : undefined,
    attendanceFilters: typeof attendanceFilters !== "undefined" ? attendanceFilters : undefined,
    setAttendanceFilters: typeof setAttendanceFilters !== "undefined" ? setAttendanceFilters : undefined,
    dashboardMessageForm: typeof dashboardMessageForm !== "undefined" ? dashboardMessageForm : undefined,
    setDashboardMessageForm: typeof setDashboardMessageForm !== "undefined" ? setDashboardMessageForm : undefined,
    newSyllabusTitle: typeof newSyllabusTitle !== "undefined" ? newSyllabusTitle : undefined,
    setNewSyllabusTitle: typeof setNewSyllabusTitle !== "undefined" ? setNewSyllabusTitle : undefined,
    newSyllabusCategory: typeof newSyllabusCategory !== "undefined" ? newSyllabusCategory : undefined,
    setNewSyllabusCategory: typeof setNewSyllabusCategory !== "undefined" ? setNewSyllabusCategory : undefined,
    newSyllabusSubject: typeof newSyllabusSubject !== "undefined" ? newSyllabusSubject : undefined,
    setNewSyllabusSubject: typeof setNewSyllabusSubject !== "undefined" ? setNewSyllabusSubject : undefined,
    newSyllabusGrade: typeof newSyllabusGrade !== "undefined" ? newSyllabusGrade : undefined,
    setNewSyllabusGrade: typeof setNewSyllabusGrade !== "undefined" ? setNewSyllabusGrade : undefined,
    newSyllabusSemester: typeof newSyllabusSemester !== "undefined" ? newSyllabusSemester : undefined,
    setNewSyllabusSemester: typeof setNewSyllabusSemester !== "undefined" ? setNewSyllabusSemester : undefined,
    newSyllabusObjectives: typeof newSyllabusObjectives !== "undefined" ? newSyllabusObjectives : undefined,
    setNewSyllabusObjectives: typeof setNewSyllabusObjectives !== "undefined" ? setNewSyllabusObjectives : undefined,
    newSyllabusMaterials: typeof newSyllabusMaterials !== "undefined" ? newSyllabusMaterials : undefined,
    setNewSyllabusMaterials: typeof setNewSyllabusMaterials !== "undefined" ? setNewSyllabusMaterials : undefined,
    newSyllabusNotes: typeof newSyllabusNotes !== "undefined" ? newSyllabusNotes : undefined,
    setNewSyllabusNotes: typeof setNewSyllabusNotes !== "undefined" ? setNewSyllabusNotes : undefined,
    silabusSearchTerm: typeof silabusSearchTerm !== "undefined" ? silabusSearchTerm : undefined,
    setSilabusSearchTerm: typeof setSilabusSearchTerm !== "undefined" ? setSilabusSearchTerm : undefined,
    selectedSilabusSubject: typeof selectedSilabusSubject !== "undefined" ? selectedSilabusSubject : undefined,
    setSelectedSilabusSubject: typeof setSelectedSilabusSubject !== "undefined" ? setSelectedSilabusSubject : undefined,
    selectedSilabusId: typeof selectedSilabusId !== "undefined" ? selectedSilabusId : undefined,
    setSelectedSilabusId: typeof setSelectedSilabusId !== "undefined" ? setSelectedSilabusId : undefined,
    selectedTeacherSilabusSubject: typeof selectedTeacherSilabusSubject !== "undefined" ? selectedTeacherSilabusSubject : undefined,
    setSelectedTeacherSilabusSubject: typeof setSelectedTeacherSilabusSubject !== "undefined" ? setSelectedTeacherSilabusSubject : undefined,
    selectedTeacherSilabusId: typeof selectedTeacherSilabusId !== "undefined" ? selectedTeacherSilabusId : undefined,
    setSelectedTeacherSilabusId: typeof setSelectedTeacherSilabusId !== "undefined" ? setSelectedTeacherSilabusId : undefined,
    newCalendarTitle: typeof newCalendarTitle !== "undefined" ? newCalendarTitle : undefined,
    setNewCalendarTitle: typeof setNewCalendarTitle !== "undefined" ? setNewCalendarTitle : undefined,
    newCalendarCategory: typeof newCalendarCategory !== "undefined" ? newCalendarCategory : undefined,
    setNewCalendarCategory: typeof setNewCalendarCategory !== "undefined" ? setNewCalendarCategory : undefined,
    newCalendarDateStart: typeof newCalendarDateStart !== "undefined" ? newCalendarDateStart : undefined,
    setNewCalendarDateStart: typeof setNewCalendarDateStart !== "undefined" ? setNewCalendarDateStart : undefined,
    newCalendarDateEnd: typeof newCalendarDateEnd !== "undefined" ? newCalendarDateEnd : undefined,
    setNewCalendarDateEnd: typeof setNewCalendarDateEnd !== "undefined" ? setNewCalendarDateEnd : undefined,
    newCalendarDescription: typeof newCalendarDescription !== "undefined" ? newCalendarDescription : undefined,
    setNewCalendarDescription: typeof setNewCalendarDescription !== "undefined" ? setNewCalendarDescription : undefined,
    calendarSearchTerm: typeof calendarSearchTerm !== "undefined" ? calendarSearchTerm : undefined,
    setCalendarSearchTerm: typeof setCalendarSearchTerm !== "undefined" ? setCalendarSearchTerm : undefined,
    isAcademicCalendarGuideOpen: typeof isAcademicCalendarGuideOpen !== "undefined" ? isAcademicCalendarGuideOpen : undefined,
    setIsAcademicCalendarGuideOpen: typeof setIsAcademicCalendarGuideOpen !== "undefined" ? setIsAcademicCalendarGuideOpen : undefined,
    attendanceMode: typeof attendanceMode !== "undefined" ? attendanceMode : undefined,
    attendanceModeValue: typeof attendanceModeValue !== "undefined" ? attendanceModeValue : undefined,
    attendanceModeLabel: typeof attendanceModeLabel !== "undefined" ? attendanceModeLabel : undefined,
    hasFeature: typeof hasFeature !== "undefined" ? hasFeature : undefined,
    jakartaNowParts: typeof jakartaNowParts !== "undefined" ? jakartaNowParts : undefined,
    activeAttendanceSession: typeof activeAttendanceSession !== "undefined" ? activeAttendanceSession : undefined,
    todayAttendanceRecord: typeof todayAttendanceRecord !== "undefined" ? todayAttendanceRecord : undefined,
    filteredAttendanceRecords: typeof filteredAttendanceRecords !== "undefined" ? filteredAttendanceRecords : undefined,
    getTeacherLocation: typeof getTeacherLocation !== "undefined" ? getTeacherLocation : undefined,
    attendanceQrPayload: typeof attendanceQrPayload !== "undefined" ? attendanceQrPayload : undefined,



    getDistanceToSchool: typeof getDistanceToSchool !== "undefined" ? getDistanceToSchool : undefined,



    handleAttendancePhotoChange: typeof handleAttendancePhotoChange !== "undefined" ? handleAttendancePhotoChange : undefined,

    handleTeacherCheckIn: typeof handleTeacherCheckIn !== "undefined" ? handleTeacherCheckIn : undefined,







    adminUser: typeof adminUser !== "undefined" ? adminUser : undefined,
    setAdminUser: typeof setAdminUser !== "undefined" ? setAdminUser : undefined,
    appSettings: typeof appSettings !== "undefined" ? appSettings : undefined,
    setAppSettings: typeof setAppSettings !== "undefined" ? setAppSettings : undefined,
    days: typeof days !== "undefined" ? days : undefined,
    setDays: typeof setDays !== "undefined" ? setDays : undefined,
    timeSlots: typeof timeSlots !== "undefined" ? timeSlots : undefined,
    setTimeSlots: typeof setTimeSlots !== "undefined" ? setTimeSlots : undefined,
    selectedDaySetting: typeof selectedDaySetting !== "undefined" ? selectedDaySetting : undefined,
    setSelectedDaySetting: typeof setSelectedDaySetting !== "undefined" ? setSelectedDaySetting : undefined,
    classes: typeof classes !== "undefined" ? classes : undefined,
    setClasses: typeof setClasses !== "undefined" ? setClasses : undefined,
    students: typeof students !== "undefined" ? students : undefined,
    setStudents: typeof setStudents !== "undefined" ? setStudents : undefined,
    majors: typeof majors !== "undefined" ? majors : undefined,
    setMajors: typeof setMajors !== "undefined" ? setMajors : undefined,
    rooms: typeof rooms !== "undefined" ? rooms : undefined,
    setRooms: typeof setRooms !== "undefined" ? setRooms : undefined,
    teachers: typeof teachers !== "undefined" ? teachers : undefined,
    setTeachers: typeof setTeachers !== "undefined" ? setTeachers : undefined,
    setStaffs: typeof setStaffs !== "undefined" ? setStaffs : undefined,

    subjects: typeof subjects !== "undefined" ? subjects : undefined,
    setSubjects: typeof setSubjects !== "undefined" ? setSubjects : undefined,




    teachingLoads: typeof teachingLoads !== "undefined" ? teachingLoads : undefined,
    setTeachingLoads: typeof setTeachingLoads !== "undefined" ? setTeachingLoads : undefined,




    teacherAvailability: typeof teacherAvailability !== "undefined" ? teacherAvailability : undefined,
    setTeacherAvailability: typeof setTeacherAvailability !== "undefined" ? setTeacherAvailability : undefined,
    schedule: typeof schedule !== "undefined" ? schedule : undefined,
    setSchedule: typeof setSchedule !== "undefined" ? setSchedule : undefined,
    scheduleGenerationMode: typeof scheduleGenerationMode !== "undefined" ? scheduleGenerationMode : undefined,
    setScheduleGenerationMode: typeof setScheduleGenerationMode !== "undefined" ? setScheduleGenerationMode : undefined,
    manualSlotModal: typeof manualSlotModal !== "undefined" ? manualSlotModal : undefined,
    openManualSlotModal: typeof openManualSlotModal !== "undefined" ? openManualSlotModal : undefined,
    closeManualSlotModal: typeof closeManualSlotModal !== "undefined" ? closeManualSlotModal : undefined,
    saveManualSlot: typeof saveManualSlot !== "undefined" ? saveManualSlot : undefined,
    deleteManualSlot: typeof deleteManualSlot !== "undefined" ? deleteManualSlot : undefined,
    handleGenerate: typeof handleGenerate !== "undefined" ? handleGenerate : undefined,
    handleResetSchedule: typeof handleResetSchedule !== "undefined" ? handleResetSchedule : undefined,
    generationReadiness: typeof generationReadiness !== "undefined" ? generationReadiness : undefined,
    isGenerated: typeof isGenerated !== "undefined" ? isGenerated : undefined,
    setIsGenerated: typeof setIsGenerated !== "undefined" ? setIsGenerated : undefined,
    swapWarning: typeof swapWarning !== "undefined" ? swapWarning : undefined,
    setSwapWarning: typeof setSwapWarning !== "undefined" ? setSwapWarning : undefined,
    modalConfig: typeof modalConfig !== "undefined" ? modalConfig : undefined,
    setModalConfig: typeof setModalConfig !== "undefined" ? setModalConfig : undefined,
    confirmDialog: typeof confirmDialog !== "undefined" ? confirmDialog : undefined,
    setConfirmDialog: typeof setConfirmDialog !== "undefined" ? setConfirmDialog : undefined,
    isImportGuideOpen: typeof isImportGuideOpen !== "undefined" ? isImportGuideOpen : undefined,
    setIsImportGuideOpen: typeof setIsImportGuideOpen !== "undefined" ? setIsImportGuideOpen : undefined,
    isSyllabusGuideOpen: typeof isSyllabusGuideOpen !== "undefined" ? isSyllabusGuideOpen : undefined,
    setIsSyllabusGuideOpen: typeof setIsSyllabusGuideOpen !== "undefined" ? setIsSyllabusGuideOpen : undefined,
    footerInfoModal: typeof footerInfoModal !== "undefined" ? footerInfoModal : undefined,
    setFooterInfoModal: typeof setFooterInfoModal !== "undefined" ? setFooterInfoModal : undefined,
    formData: typeof formData !== "undefined" ? formData : undefined,
    setFormData: typeof setFormData !== "undefined" ? setFormData : undefined,
    bulkLoadGrades: typeof bulkLoadGrades !== "undefined" ? bulkLoadGrades : undefined,
    setBulkLoadGrades: typeof setBulkLoadGrades !== "undefined" ? setBulkLoadGrades : undefined,
    bulkLoadMajors: typeof bulkLoadMajors !== "undefined" ? bulkLoadMajors : undefined,
    setBulkLoadMajors: typeof setBulkLoadMajors !== "undefined" ? setBulkLoadMajors : undefined,
    bulkConflictMode: typeof bulkConflictMode !== "undefined" ? bulkConflictMode : undefined,
    setBulkConflictMode: typeof setBulkConflictMode !== "undefined" ? setBulkConflictMode : undefined,
    strictCompetency: typeof strictCompetency !== "undefined" ? strictCompetency : undefined,
    setStrictCompetency: typeof setStrictCompetency !== "undefined" ? setStrictCompetency : undefined,
    specialWednesdayConstraint: typeof specialWednesdayConstraint !== "undefined" ? specialWednesdayConstraint : undefined,
    setSpecialWednesdayConstraint: typeof setSpecialWednesdayConstraint !== "undefined" ? setSpecialWednesdayConstraint : undefined,
    generateWorkspaceTab: typeof generateWorkspaceTab !== "undefined" ? generateWorkspaceTab : undefined,
    setGenerateWorkspaceTab: typeof setGenerateWorkspaceTab !== "undefined" ? setGenerateWorkspaceTab : undefined,
    generateGuideTab: typeof generateGuideTab !== "undefined" ? generateGuideTab : undefined,
    setGenerateGuideTab: typeof setGenerateGuideTab !== "undefined" ? setGenerateGuideTab : undefined,
    quickEditGuruCode: typeof quickEditGuruCode !== "undefined" ? quickEditGuruCode : undefined,
    setQuickEditGuruCode: typeof setQuickEditGuruCode !== "undefined" ? setQuickEditGuruCode : undefined,
    quickGuruForm: typeof quickGuruForm !== "undefined" ? quickGuruForm : undefined,
    setQuickGuruForm: typeof setQuickGuruForm !== "undefined" ? setQuickGuruForm : undefined,
    isSavingModal: typeof isSavingModal !== "undefined" ? isSavingModal : undefined,
    setIsSavingModal: typeof setIsSavingModal !== "undefined" ? setIsSavingModal : undefined,
    newPresetName: typeof newPresetName !== "undefined" ? newPresetName : undefined,
    setNewPresetName: typeof setNewPresetName !== "undefined" ? setNewPresetName : undefined,
    customThemePresets: typeof customThemePresets !== "undefined" ? customThemePresets : undefined,
    setCustomThemePresets: typeof setCustomThemePresets !== "undefined" ? setCustomThemePresets : undefined,
    searchTerm: typeof searchTerm !== "undefined" ? searchTerm : undefined,
    setSearchTerm: typeof setSearchTerm !== "undefined" ? setSearchTerm : undefined,
    tableSorts: typeof tableSorts !== "undefined" ? tableSorts : undefined,
    setTableSorts: typeof setTableSorts !== "undefined" ? setTableSorts : undefined,
    selectedRows: typeof selectedRows !== "undefined" ? selectedRows : undefined,
    setSelectedRows: typeof setSelectedRows !== "undefined" ? setSelectedRows : undefined,
    deletedHistory: typeof deletedHistory !== "undefined" ? deletedHistory : undefined,
    setDeletedHistory: typeof setDeletedHistory !== "undefined" ? setDeletedHistory : undefined,
    loadFilters: typeof loadFilters !== "undefined" ? loadFilters : undefined,
    setLoadFilters: typeof setLoadFilters !== "undefined" ? setLoadFilters : undefined,
    bulkText: typeof bulkText !== "undefined" ? bulkText : undefined,
    setBulkText: typeof setBulkText !== "undefined" ? setBulkText : undefined,
    bulkImportPreview: typeof bulkImportPreview !== "undefined" ? bulkImportPreview : undefined,
    setBulkImportPreview: typeof setBulkImportPreview !== "undefined" ? setBulkImportPreview : undefined,
    layoutSettings: typeof layoutSettings !== "undefined" ? layoutSettings : undefined,
    setLayoutSettings: typeof setLayoutSettings !== "undefined" ? setLayoutSettings : undefined,
    advancedRules: typeof advancedRules !== "undefined" ? advancedRules : undefined,
    setAdvancedRules: typeof setAdvancedRules !== "undefined" ? setAdvancedRules : undefined,
    roomLayout: typeof roomLayout !== "undefined" ? roomLayout : undefined,
    setRoomLayout: typeof setRoomLayout !== "undefined" ? setRoomLayout : undefined,
    layoutDay: typeof layoutDay !== "undefined" ? layoutDay : undefined,
    setLayoutDay: typeof setLayoutDay !== "undefined" ? setLayoutDay : undefined,
    layoutByDay: typeof layoutByDay !== "undefined" ? layoutByDay : undefined,
    setLayoutByDay: typeof setLayoutByDay !== "undefined" ? setLayoutByDay : undefined,
    dragClassName: typeof dragClassName !== "undefined" ? dragClassName : undefined,
    setDragClassName: typeof setDragClassName !== "undefined" ? setDragClassName : undefined,
    denahClassSearch: typeof denahClassSearch !== "undefined" ? denahClassSearch : undefined,
    setDenahClassSearch: typeof setDenahClassSearch !== "undefined" ? setDenahClassSearch : undefined,
    layoutPreset: typeof layoutPreset !== "undefined" ? layoutPreset : undefined,
    setLayoutPreset: typeof setLayoutPreset !== "undefined" ? setLayoutPreset : undefined,
    layoutBlockLabels: typeof layoutBlockLabels !== "undefined" ? layoutBlockLabels : undefined,
    setLayoutBlockLabels: typeof setLayoutBlockLabels !== "undefined" ? setLayoutBlockLabels : undefined,

    notification: typeof notification !== "undefined" ? notification : undefined,
    setNotification: typeof setNotification !== "undefined" ? setNotification : undefined,
    scheduleCellMap: typeof scheduleCellMap !== "undefined" ? scheduleCellMap : undefined,

    teacherScheduleCountMap: typeof teacherScheduleCountMap !== "undefined" ? teacherScheduleCountMap : undefined,


    teacherTargetJpMap: typeof teacherTargetJpMap !== "undefined" ? teacherTargetJpMap : undefined,






    fileInputRef: typeof fileInputRef !== "undefined" ? fileInputRef : undefined,
    jpDurationMinutes: typeof jpDurationMinutes !== "undefined" ? jpDurationMinutes : undefined,
    setJpDurationMinutes: typeof setJpDurationMinutes !== "undefined" ? setJpDurationMinutes : undefined,
    checkDependencies: typeof checkDependencies !== "undefined" ? checkDependencies : undefined,

    uiFontClass: typeof uiFontClass !== "undefined" ? uiFontClass : undefined,
    uiTheme: typeof uiTheme !== "undefined" ? uiTheme : undefined,
    applyDatabasePayload: typeof applyDatabasePayload !== "undefined" ? applyDatabasePayload : undefined,


















    getActiveSortConfig: typeof getActiveSortConfig !== "undefined" ? getActiveSortConfig : undefined,
    getRowKeyForTab: typeof getRowKeyForTab !== "undefined" ? getRowKeyForTab : undefined,
    getSearchTextForTab: typeof getSearchTextForTab !== "undefined" ? getSearchTextForTab : undefined,
    getSortableValue: typeof getSortableValue !== "undefined" ? getSortableValue : undefined,

    getTableSort: typeof getTableSort !== "undefined" ? getTableSort : undefined,

    updateSelectionForTab: typeof updateSelectionForTab !== "undefined" ? updateSelectionForTab : undefined,

    getUsedMajorBlocks: typeof getUsedMajorBlocks !== "undefined" ? getUsedMajorBlocks : undefined,







    pushDeleteHistory: typeof pushDeleteHistory !== "undefined" ? pushDeleteHistory : undefined,
    mergeUniqueByKey: typeof mergeUniqueByKey !== "undefined" ? mergeUniqueByKey : undefined,


    restoreDeletedEntry: typeof restoreDeletedEntry !== "undefined" ? restoreDeletedEntry : undefined,
    undoLastDelete: typeof undoLastDelete !== "undefined" ? undoLastDelete : undefined,

    handleBulkDelete: typeof handleBulkDelete !== "undefined" ? handleBulkDelete : undefined,




































    name: typeof name !== "undefined" ? name : undefined,


































































    event: typeof event !== "undefined" ? event : undefined,








    buildDatabasePayload: typeof buildDatabasePayload !== "undefined" ? buildDatabasePayload : undefined,
    saveDatabaseNow: typeof saveDatabaseNow !== "undefined" ? saveDatabaseNow : undefined,

    showNotification: typeof showNotification !== "undefined" ? showNotification : undefined,

    ensureDatabaseReadyForWrite: typeof ensureDatabaseReadyForWrite !== "undefined" ? ensureDatabaseReadyForWrite : undefined,
    downloadMasterTemplate: typeof downloadMasterTemplate !== "undefined" ? downloadMasterTemplate : undefined,


    exportAllDataToExcel: typeof exportAllDataToExcel !== "undefined" ? exportAllDataToExcel : undefined,





























    downloadTeacherTemplate: typeof downloadTeacherTemplate !== "undefined" ? downloadTeacherTemplate : undefined,
    exportAttendanceToExcel: typeof exportAttendanceToExcel !== "undefined" ? exportAttendanceToExcel : undefined,


    handleSaveDashboardMessage: typeof handleSaveDashboardMessage !== "undefined" ? handleSaveDashboardMessage : undefined,

    updateAttendanceSession: typeof updateAttendanceSession !== "undefined" ? updateAttendanceSession : undefined,

    addAttendanceSession: typeof addAttendanceSession !== "undefined" ? addAttendanceSession : undefined,

    removeAttendanceSession: typeof removeAttendanceSession !== "undefined" ? removeAttendanceSession : undefined,
    submitAttendanceCorrection: typeof submitAttendanceCorrection !== "undefined" ? submitAttendanceCorrection : undefined,


    handleReviewAttendanceCorrection: typeof handleReviewAttendanceCorrection !== "undefined" ? handleReviewAttendanceCorrection : undefined,

    downloadAcademicCalendarTemplate: typeof downloadAcademicCalendarTemplate !== "undefined" ? downloadAcademicCalendarTemplate : undefined,
    openImportGuide: typeof openImportGuide !== "undefined" ? openImportGuide : undefined,
    openAcademicCalendarGuide: typeof openAcademicCalendarGuide !== "undefined" ? openAcademicCalendarGuide : undefined,
    openTeacherGuide: typeof openTeacherGuide !== "undefined" ? openTeacherGuide : undefined,
    openFooterInfo: typeof openFooterInfo !== "undefined" ? openFooterInfo : undefined,
    closeFooterInfo: typeof closeFooterInfo !== "undefined" ? closeFooterInfo : undefined,
    matchesGradeTarget: typeof matchesGradeTarget !== "undefined" ? matchesGradeTarget : undefined,
    normalizeCalendarDateInput: typeof normalizeCalendarDateInput !== "undefined" ? normalizeCalendarDateInput : undefined,




    getCalendarCategoryIdByLabel: typeof getCalendarCategoryIdByLabel !== "undefined" ? getCalendarCategoryIdByLabel : undefined,


    formatCalendarDateRange: typeof formatCalendarDateRange !== "undefined" ? formatCalendarDateRange : undefined,






    teacherNameMap: typeof teacherNameMap !== "undefined" ? teacherNameMap : undefined,
    getTeacherName: typeof getTeacherName !== "undefined" ? getTeacherName : undefined,
    getRoomName: typeof getRoomName !== "undefined" ? getRoomName : undefined,
    getPracticeRoomLabel: typeof getPracticeRoomLabel !== "undefined" ? getPracticeRoomLabel : undefined,


    loadDistribution: typeof loadDistribution !== "undefined" ? loadDistribution : undefined,

    subjectComposition: typeof subjectComposition !== "undefined" ? subjectComposition : undefined,

    recommendedLoads: typeof recommendedLoads !== "undefined" ? recommendedLoads : undefined,






    applyRecommendations: typeof applyRecommendations !== "undefined" ? applyRecommendations : undefined,
    handleLogin: typeof handleLogin !== "undefined" ? handleLogin : undefined,



    handleLogout: typeof handleLogout !== "undefined" ? handleLogout : undefined,
    onOpenProfile: () => { setFormData({ name: currentUser?.name || "", username: currentUser?.username || "", password: "", confirmPassword: "" }); setModalConfig({ isOpen: true, type: "profile_edit", action: "edit", data: null }); },
    loginBrandTitle: typeof loginBrandTitle !== "undefined" ? loginBrandTitle : undefined,
    loginHeroTitle: typeof loginHeroTitle !== "undefined" ? loginHeroTitle : undefined,
    loginHeroSubtitle: typeof loginHeroSubtitle !== "undefined" ? loginHeroSubtitle : undefined,
    syncAuthSnapshotSafe: typeof syncAuthSnapshotSafe !== "undefined" ? syncAuthSnapshotSafe : undefined,
    syncAuthSnapshotNow: typeof syncAuthSnapshotNow !== "undefined" ? syncAuthSnapshotNow : undefined,
    generateRoomLayout: typeof generateRoomLayout !== "undefined" ? generateRoomLayout : undefined,




















    dropToSlot: typeof dropToSlot !== "undefined" ? dropToSlot : undefined,




    removeClassFromDenahSlot: typeof removeClassFromDenahSlot !== "undefined" ? removeClassFromDenahSlot : undefined,


    renameRoomInline: typeof renameRoomInline !== "undefined" ? renameRoomInline : undefined,
    exportLayoutJson: typeof exportLayoutJson !== "undefined" ? exportLayoutJson : undefined,

    importLayoutJson: typeof importLayoutJson !== "undefined" ? importLayoutJson : undefined,


    getSchoolTimeRange: typeof getSchoolTimeRange !== "undefined" ? getSchoolTimeRange : undefined,



    getFloorColorByClassName: typeof getFloorColorByClassName !== "undefined" ? getFloorColorByClassName : undefined,
    getFloorLegend: typeof getFloorLegend !== "undefined" ? getFloorLegend : undefined,
    updateKampusALabel: typeof updateKampusALabel !== "undefined" ? updateKampusALabel : undefined,

    updateKampusBLabel: typeof updateKampusBLabel !== "undefined" ? updateKampusBLabel : undefined,
    renderKampusA: typeof renderKampusA !== "undefined" ? renderKampusA : undefined,







    renderKampusB: typeof renderKampusB !== "undefined" ? renderKampusB : undefined,






    openModal: typeof openModal !== "undefined" ? openModal : undefined,













    handleBulkAddLoads: typeof handleBulkAddLoads !== "undefined" ? handleBulkAddLoads : undefined,



    handleSyllabusBatchSave: typeof handleSyllabusBatchSave !== "undefined" ? handleSyllabusBatchSave : undefined,



    closeModal: typeof closeModal !== "undefined" ? closeModal : undefined,
    handleGenerateSlots: typeof handleGenerateSlots !== "undefined" ? handleGenerateSlots : undefined,







    handleSave: typeof handleSave !== "undefined" ? handleSave : undefined,









































    handleDelete: typeof handleDelete !== "undefined" ? handleDelete : undefined,
    handleToggleDashboardMessageSafe: typeof handleToggleDashboardMessageSafe !== "undefined" ? handleToggleDashboardMessageSafe : undefined,
    handleRemoveDashboardMessageSafe: typeof handleRemoveDashboardMessageSafe !== "undefined" ? handleRemoveDashboardMessageSafe : undefined,
    handleRemoveAttendanceRecordSafe: typeof handleRemoveAttendanceRecordSafe !== "undefined" ? handleRemoveAttendanceRecordSafe : undefined,
    handleRemoveCalendarEventSafe: typeof handleRemoveCalendarEventSafe !== "undefined" ? handleRemoveCalendarEventSafe : undefined,
    handleRemoveCalendarCategorySafe: typeof handleRemoveCalendarCategorySafe !== "undefined" ? handleRemoveCalendarCategorySafe : undefined,
    handleRemoveSyllabusCategorySafe: typeof handleRemoveSyllabusCategorySafe !== "undefined" ? handleRemoveSyllabusCategorySafe : undefined,
    handleRemoveSyllabusSafe: typeof handleRemoveSyllabusSafe !== "undefined" ? handleRemoveSyllabusSafe : undefined,


    handleProcessImport: typeof handleProcessImport !== "undefined" ? handleProcessImport : undefined,
    handleBulkTextChange: typeof handleBulkTextChange !== "undefined" ? handleBulkTextChange : undefined,
    handlePreviewImport: typeof handlePreviewImport !== "undefined" ? handlePreviewImport : undefined,
    handleFileUpload: typeof handleFileUpload !== "undefined" ? handleFileUpload : undefined,




    handleResetRuangan: typeof handleResetRuangan !== "undefined" ? handleResetRuangan : undefined,
    handleResetDenah: typeof handleResetDenah !== "undefined" ? handleResetDenah : undefined,
    handleClearCurrentDenahDay: typeof handleClearCurrentDenahDay !== "undefined" ? handleClearCurrentDenahDay : undefined,
    handleCopyCurrentDenahToAllDays: typeof handleCopyCurrentDenahToAllDays !== "undefined" ? handleCopyCurrentDenahToAllDays : undefined,












































































































































    handleDragStart: typeof handleDragStart !== "undefined" ? handleDragStart : undefined,
    handleDragOver: typeof handleDragOver !== "undefined" ? handleDragOver : undefined,
    handleDragLeave: typeof handleDragLeave !== "undefined" ? handleDragLeave : undefined,
    handleDrop: typeof handleDrop !== "undefined" ? handleDrop : undefined,











    startQuickEditGuru: typeof startQuickEditGuru !== "undefined" ? startQuickEditGuru : undefined,
    saveQuickEditGuru: typeof saveQuickEditGuru !== "undefined" ? saveQuickEditGuru : undefined,


    THEME_PRESETS: typeof THEME_PRESETS !== "undefined" ? THEME_PRESETS : undefined,
    MAJOR_ICON_OPTIONS: typeof MAJOR_ICON_OPTIONS !== "undefined" ? MAJOR_ICON_OPTIONS : undefined,
    applyThemePreset: typeof applyThemePreset !== "undefined" ? applyThemePreset : undefined,
    applyAutoRecommendedTheme: typeof applyAutoRecommendedTheme !== "undefined" ? applyAutoRecommendedTheme : undefined,


    hexToRgb: typeof hexToRgb !== "undefined" ? hexToRgb : undefined,

    luminance: typeof luminance !== "undefined" ? luminance : undefined,


    contrastRatio: typeof contrastRatio !== "undefined" ? contrastRatio : undefined,




    saveCurrentAsPreset: typeof saveCurrentAsPreset !== "undefined" ? saveCurrentAsPreset : undefined,
    autoFixContrast: typeof autoFixContrast !== "undefined" ? autoFixContrast : undefined,







    resetThemeDefaults: typeof resetThemeDefaults !== "undefined" ? resetThemeDefaults : undefined,
    exportThemeJson: typeof exportThemeJson !== "undefined" ? exportThemeJson : undefined,
    importThemeJson: typeof importThemeJson !== "undefined" ? importThemeJson : undefined,

    getMajorColorHex: typeof getMajorColorHex !== "undefined" ? getMajorColorHex : undefined,
    renderScheduleTable: typeof renderScheduleTable !== "undefined" ? renderScheduleTable : undefined,









    getTabPermissionLevel: typeof getTabPermissionLevel !== "undefined" ? getTabPermissionLevel : undefined,




    renderTable: renderTable,















    SidebarGroup: typeof SidebarGroup !== "undefined" ? SidebarGroup : undefined,
    SidebarSection: typeof SidebarSection !== "undefined" ? SidebarSection : undefined,
    renderNavItem: typeof renderNavItem !== "undefined" ? renderNavItem : undefined,



    isClassMajorMismatch: typeof isClassMajorMismatch !== "undefined" ? isClassMajorMismatch : undefined,
    isSuperAdminRole: typeof isSuperAdminRole !== "undefined" ? isSuperAdminRole : undefined,
    normalizeUserRole: typeof normalizeUserRole !== "undefined" ? normalizeUserRole : undefined,
    rolePermissions: typeof rolePermissions !== "undefined" ? rolePermissions : undefined,
    handleSort: typeof handleSort !== "undefined" ? handleSort : undefined,
    tabSubtitles: typeof tabSubtitles !== "undefined" ? tabSubtitles : undefined,
    handleSelectAll: typeof handleSelectAll !== "undefined" ? handleSelectAll : undefined,
    activeUserRole: typeof activeUserRole !== "undefined" ? activeUserRole : undefined,



    staffs: typeof staffs !== "undefined" ? staffs : undefined,



















    isLeadershipRole: typeof isLeadershipRole !== "undefined" ? isLeadershipRole : undefined,
    PageHeader: typeof PageHeader !== "undefined" ? PageHeader : undefined,
    dashboardMessages: typeof dashboardMessages !== "undefined" ? dashboardMessages : undefined,





    DAYS: typeof DAYS !== "undefined" ? DAYS : undefined,
    GRADES: typeof GRADES !== "undefined" ? GRADES : undefined,
    TIME_SLOTS: typeof TIME_SLOTS !== "undefined" ? TIME_SLOTS : undefined,

    syllabuses: typeof syllabuses !== "undefined" ? syllabuses : undefined,
    setSyllabuses: typeof setSyllabuses !== "undefined" ? setSyllabuses : undefined,
    syllabusCategories: typeof syllabusCategories !== "undefined" ? syllabusCategories : undefined,
    setSyllabusCategories: typeof setSyllabusCategories !== "undefined" ? setSyllabusCategories : undefined,
    activityLogs: typeof activityLogs !== "undefined" ? activityLogs : undefined,
    academicCalendar: typeof academicCalendar !== "undefined" ? academicCalendar : undefined,
    calendarCategories: typeof calendarCategories !== "undefined" ? calendarCategories : undefined,
    featureSettings: typeof featureSettings !== "undefined" ? featureSettings : undefined,
    updateFeatureSettings: typeof updateFeatureSettings !== "undefined" ? updateFeatureSettings : undefined,

    updateRolePermissions: typeof updateRolePermissions !== "undefined" ? updateRolePermissions : undefined,
    attendanceRecords: typeof attendanceRecords !== "undefined" ? attendanceRecords : undefined,
    attendanceSettings: typeof attendanceSettings !== "undefined" ? attendanceSettings : undefined,
    updateAttendanceSettings: typeof updateAttendanceSettings !== "undefined" ? updateAttendanceSettings : undefined,
    addDashboardMessage: typeof addDashboardMessage !== "undefined" ? addDashboardMessage : undefined,
    updateDashboardMessage: typeof updateDashboardMessage !== "undefined" ? updateDashboardMessage : undefined,
    removeDashboardMessage: typeof removeDashboardMessage !== "undefined" ? removeDashboardMessage : undefined,
    DASHBOARD_MESSAGE_TARGETS: typeof DASHBOARD_MESSAGE_TARGETS !== "undefined" ? DASHBOARD_MESSAGE_TARGETS : undefined,
    DASHBOARD_MESSAGE_PRIORITIES: typeof DASHBOARD_MESSAGE_PRIORITIES !== "undefined" ? DASHBOARD_MESSAGE_PRIORITIES : undefined,
    attendanceSubTab: typeof attendanceSubTab !== "undefined" ? attendanceSubTab : undefined,
    setAttendanceSubTab: typeof setAttendanceSubTab !== "undefined" ? setAttendanceSubTab : undefined,
    hasPiket: typeof hasPiket !== "undefined" ? hasPiket : undefined
  };
  if (!currentUser) {
    return <Login 
      appSettings={appSettings} 
      username={username} setUsername={setUsername} 
      password={password} setPassword={setPassword} 
      showPassword={showPassword} setShowPassword={setShowPassword}
      rememberMe={rememberMe} setRememberMe={setRememberMe}
      handleLogin={handleLogin} isLoggingIn={isLoggingIn} loginError={loginError} 
      uiTheme={uiTheme} loginBrandTitle={loginBrandTitle}
    />;
  }
  const activeTabLabel = activeTab === "kedisiplinan_piket" ? "Piket & Pelanggaran" : activeTab === "pengaturanuser" ? "Pengaturan User" : activeTab === "absensiguru" ? "Absen KBM (GPS)" : activeTab === "silabusguru" ? "Modul Ajar Saya" : activeTab === "silabus" ? "Modul Ajar" : activeTab === "modul_ajar" ? "Modul Ajar" : activeTab === "pkl_dashboard" ? "Dashboard PKL" : activeTab === "pkl_data_siswa" ? "Data Siswa PKL" : activeTab === "pkl_data_perusahaan" ? "Data Perusahaan" : activeTab === "pkl_administrasi" ? "Administrasi PKL" : activeTab === "pkl_jurnal" ? "Jurnal Siswa" : activeTab === "pkl_laporan" ? "Laporan PKL" : activeTab === "pkl_absensi_setting" ? "Pengaturan Absensi PKL" : activeTab === "laporan_absensi" ? "Semua Laporan Absensi" : activeTab.replace(/_/g, " ");
  const sidebarSummary = tabSubtitles[activeTab] || "Manage data, records, and system configuration.";
  const activeUserDivision = activeUserRole === "waka" ? (currentUser?.division || WAKA_DIVISION_OPTIONS[0].value).toLowerCase() : "";
  const activeRoleLabel = isSuperAdminRole(activeUserRole) ? "Admin Utama" : activeUserRole === "kepsek" ? "Kepala Sekolah" : activeUserRole === "waka" ? getWakaDivisionOption(activeUserDivision, appSettings).label : activeUserRole === "karyawan" ? "Karyawan" : activeUserRole === "tu" ? "Tata Usaha" : "Guru";
  const workspaceGuide = isLeadershipRole(currentUser?.role) ? WORKSPACE_GUIDES[activeTab] : null;

  /* --- APP WRAPPER (Logged In) --- */
  const accessibilityClass = appSettings.touchTargetSize === "besar" ? "accessibility-touch-large" : "";
  return <div className={`app-shell flex h-screen w-full ${uiFontClass} ${accessibilityClass} overflow-hidden print:h-auto print:overflow-visible print:block bg-background`} style={{
    ...uiTheme,
    "--ui-primary": appSettings.primaryColor || "#064e3b",
    "--ui-accent": appSettings.themeAccentColor || "#f59e0b",
    color: "var(--ui-text)"
  }}>
    {/* Mobile Sidebar Overlay */}
    {isMobileMenuOpen && <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />}

    {/* Sidebar */}

    <AdminSidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} isSidebarCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} appSettings={appSettings} currentUser={currentUser} uiFontClass={uiFontClass} activeTab={activeTab} setActiveTab={setActiveTab} renderNavItem={renderNavItem} hasAnyConfigAccess={hasAnyConfigAccess} handleLogout={handleLogout} expandedGroups={expandedGroups} toggleGroup={toggleGroup} isSuperAdminRole={isSuperAdminRole} activeUserRole={activeUserRole} handleBackupExport={handleBackupExport} isBackingUp={isBackingUp} sidebarScrollRef={sidebarScrollRef} sidebarScrollPos={sidebarScrollPos} />


    {/* Main Layout Area */}
    <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden print:overflow-visible print:block relative z-0 bg-background">
      <AdminHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} onOpenProfile={() => { setFormData({ name: currentUser?.name || "", username: currentUser?.username || "", password: "", confirmPassword: "" }); setModalConfig({ isOpen: true, type: "profile_edit", action: "edit", data: null }); }} currentUser={currentUser} activeRoleLabel={activeRoleLabel} appSettings={appSettings} workspaceGuide={workspaceGuide} onOpenGuide={() => setShowGuideModal(true)} activeTab={activeTab} dashboardMessages={dashboardMessages} schedule={schedule} handleLogout={handleLogout} />

      <div ref={mainContentRef} className={`app-content flex-1 overflow-y-auto ${activeTab === "dashboard" ? "px-3 pb-24 lg:pb-3 md:px-5 md:pb-5 xl:px-6 xl:pb-6" : "px-5 pb-24 lg:pb-5 md:px-8 md:pb-8"} pt-3 sm:pt-4 custom-scrollbar relative flex flex-col min-w-0 print:overflow-visible print:p-0`}>
        <div className="flex-1 flex flex-col w-full min-w-0">

          <AdminContentRouter context={tabProps} />

          {workspaceGuide && <Modal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} maxWidth="max-w-4xl" title="Petunjuk Penggunaan">
            <div className="p-0 -mx-4 -my-4 sm:-mx-5 sm:-my-5">
              <WorkspaceGuidePanel guide={workspaceGuide} onManage={() => setShowGuideModal(false)} />
            </div>
          </Modal>}
        </div>

        <div className="mt-6 pt-4 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 pb-3 shrink-0 print:hidden">
          <p className="text-xs font-medium text-muted-foreground">
            {appSettings.footerText || `© ${new Date().getFullYear()} ${appSettings.appName || "TimeSchedule"}. All rights reserved.`}
          </p>
          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
            <button type="button" onClick={openImportGuide} className="hover:text-foreground cursor-pointer transition-colors bg-transparent border-none p-0">
              Bantuan
            </button>
            <button type="button" onClick={() => openFooterInfo("Kebijakan Privasi", `Kebijakan privasi aplikasi ini mengikuti aturan sekolah dan pengelolaan admin. Untuk detail lebih lanjut, hubungi ${appSettings.contactEmail || "admin@school.sch.id"}.`)} className="hover:text-foreground cursor-pointer transition-colors bg-transparent border-none p-0">
              Privasi
            </button>
            <button type="button" onClick={() => openFooterInfo("Syarat & Ketentuan", `Penggunaan aplikasi mengikuti kebijakan sekolah dan pengaturan admin. Jika ada kebutuhan khusus, silakan hubungi ${appSettings.contactEmail || "admin@school.sch.id"}.`)} className="hover:text-foreground cursor-pointer transition-colors bg-transparent border-none p-0">
              Syarat & Ketentuan
            </button>
          </div>
          <AdminMobileNav 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            activeUserRole={activeUserRole} 
            activeUserDivision={activeUserDivision} 
            currentUser={currentUser} 
            hasFeature={hasFeature} 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen} 
            hasPiket={hasPiket}
          />
        </div>
      </div>
    </main>

    {/* ================= MODALS ================= */}

    {/* Modal Auto-Generate Waktu */}
    <SystemModals modalConfig={modalConfig} closeModal={closeModal} formData={formData} setFormData={setFormData} isSavingModal={isSavingModal} selectedDaySetting={selectedDaySetting} handleGenerateSlots={handleGenerateSlots} handleSave={handleSave} footerInfoModal={footerInfoModal} closeFooterInfo={closeFooterInfo} currentUser={currentUser} showNotification={showNotification} adminUser={adminUser} teachers={teachers} staffs={staffs} />



    <Suspense fallback={null}>
      <BulkImportModal isOpen={modalConfig.isOpen && modalConfig.type === "bulk"} onClose={closeModal} activeTab={activeTab} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload} previewData={bulkImportPreview} handlePreviewImport={handlePreviewImport} handleProcessImport={handleProcessImport} downloadMasterTemplate={downloadMasterTemplate} openImportGuide={activeTab === "akademik" ? openAcademicCalendarGuide : activeTab === "silabus" || activeTab === "silabusguru" || activeTab === "modul_ajar" ? openTeacherGuide : openImportGuide} bulkText={bulkText} setBulkText={handleBulkTextChange} exportAllDataToExcel={exportAllDataToExcel} />
    </Suspense>

    <Suspense fallback={null}>
      <ImportGuideModal isOpen={isImportGuideOpen} onClose={() => setIsImportGuideOpen(false)} />
    </Suspense>
    <Suspense fallback={null}>
      <AcademicCalendarGuideModal isOpen={isAcademicCalendarGuideOpen} onClose={() => setIsAcademicCalendarGuideOpen(false)} />
    </Suspense>
    <Suspense fallback={null}>
      <TeacherSyllabusGuideModal isOpen={isSyllabusGuideOpen} onClose={() => setIsSyllabusGuideOpen(false)} />
    </Suspense>


    <Suspense fallback={null}>
      <TeacherCompetencyModal isOpen={modalConfig.isOpen && modalConfig.type === "ketersediaan_mapel"} onClose={closeModal} teacher={modalConfig.data} subjects={subjects} teacherAvailability={teacherAvailability} setTeacherAvailability={setTeacherAvailability} />
    </Suspense>
    <Suspense fallback={null}>
      <SyllabusBatchModal isOpen={modalConfig.isOpen && modalConfig.type === "silabus_batch"} onClose={closeModal} subjects={subjects} teachers={teachers} formData={formData} setFormData={setFormData} onSubmit={handleSyllabusBatchSave} />
    </Suspense>

    <CrudModals modalConfig={modalConfig} closeModal={closeModal} handleSave={handleSave} formData={formData} setFormData={setFormData} classes={classes} majors={majors} teachers={teachers} subjects={subjects} currentUser={currentUser} isSavingModal={isSavingModal} GRADES={GRADES} isAllLike={isAllLike} isSuperAdminRole={isSuperAdminRole} appSettings={appSettings} rooms={rooms} parseCsvList={parseCsvList} serializeCsvList={serializeCsvList} days={days} selectedDaySetting={selectedDaySetting} teacherAvailability={teacherAvailability} csvValuesIntersect={csvValuesIntersect} setBulkConflictMode={setBulkConflictMode} bulkConflictMode={bulkConflictMode} setBulkLoadGrades={setBulkLoadGrades} bulkLoadGrades={bulkLoadGrades} setBulkLoadMajors={setBulkLoadMajors} bulkLoadMajors={bulkLoadMajors} handleBulkAddLoads={handleBulkAddLoads} calendarCategories={calendarCategories} syllabuses={syllabuses} sameText={sameText} syllabusCategories={syllabusCategories} />
    <BulkEditModal 
      isOpen={modalConfig.isOpen && modalConfig.type === "bulk_edit"} 
      onClose={closeModal} 
      tabKey={modalConfig.data?.tabKey || activeTab} 
      selectedIds={modalConfig.data?.ids || selectedRows[modalConfig.data?.tabKey || activeTab] || []} 
      students={students} setStudents={setStudents} 
      classes={classes} setClasses={setClasses} 
      teachers={teachers} setTeachers={setTeachers} 
      staffs={staffs} setStaffs={setStaffs} 
      majors={majors} setMajors={setMajors} 
      subjects={subjects} setSubjects={setSubjects} 
      rooms={rooms} setRooms={setRooms} 
      saveDatabaseNow={saveDatabaseNow} 
      showNotification={showNotification} 
      updateSelectionForTab={updateSelectionForTab} 
    />
    <DefaultPasswordModal currentUser={currentUser} setCurrentUser={setCurrentUser} showNotification={showNotification} />
    <GlobalAdminUI 
      notification={notification} setNotification={setNotification} 
      confirmDialog={confirmDialog} setConfirmDialog={setConfirmDialog} 
    />
  </div>;
}

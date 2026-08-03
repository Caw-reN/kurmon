import { create } from 'zustand';
import { getDatabaseSnapshot, subscribeDatabaseSnapshot } from '../utils/dataSource.js';
import { normalizeLayoutBlockLabels } from '../utils/state.js';

const DEFAULT_ATTENDANCE_SETTINGS = {
  mode: 'button',
  allowFakeLocation: false,
  radiusMeters: 50,
  schoolLat: -6.2,
  schoolLng: 106.816666,
  sessions: [
    {
      id: "masuk-pagi",
      name: "Masuk Pagi",
      type: "in",
      openTime: "06:30",
      lateAfter: "07:15",
      closeTime: "08:00",
      activeDays: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    },
    {
      id: "pulang-sore",
      name: "Pulang Sore",
      type: "out",
      openTime: "15:00",
      lateAfter: "",
      closeTime: "17:00",
      activeDays: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    },
  ],
};


export const DEFAULT_ROLE_PERMISSIONS = {
  guru: {
    dashboard: "otomatis", ketersediaan: "otomatis", generate: "otomatis", akademik: "otomatis", absensiguru: "otomatis",
    silabusguru: "otomatis", walas_report: "otomatis", kedisiplinan_absensi: "otomatis",
    jurnal_harian: "otomatis", absensi: "otomatis", catatan_walikelas: "otomatis"
  },
  walikelas: {
    dashboard: "otomatis", absensiguru: "otomatis", silabusguru: "otomatis", akademik: "otomatis",
    walas_report: "otomatis", catatan_walikelas: "otomatis", kedisiplinan_absensi: "otomatis",
    jurnal_harian: "otomatis", ketersediaan: "otomatis", absensi: "otomatis"
  },
  karyawan: {
    dashboard: "otomatis", absensiguru: "otomatis"
  },
  tu: {
    dashboard: "otomatis", generate: "otomatis", absensi: "otomatis", esurat: "otomatis",
    kartu_pelajar: "otomatis", kedisiplinan_absensi: "otomatis", siswa: "otomatis",
    guru: "otomatis", karyawan: "otomatis"
  },
  kepsek: {
    dashboard: "otomatis", generate: "otomatis", absensi: "otomatis", pesan: "otomatis",
    pkl_dashboard: "otomatis", pkl_data_siswa: "otomatis", pkl_data_perusahaan: "otomatis",
    pkl_penugasan: "otomatis", pkl_administrasi: "otomatis", pkl_jurnal: "otomatis",
    pkl_laporan: "otomatis", pkl_absensi_setting: "otomatis",
    kedisiplinan_absensi: "otomatis", kedisiplinan_bpbk: "otomatis", kedisiplinan_piket: "otomatis",
    walas_report: "otomatis", catatan_walikelas: "otomatis", riwayat_prestasi: "otomatis"
  },
  waka_kurikulum: {
    dashboard: "otomatis", generate: "otomatis", ketersediaan: "otomatis", beban: "otomatis",
    silabus: "otomatis", akademik: "otomatis", kelas: "otomatis", siswa: "otomatis",
    guru: "otomatis", mapel: "otomatis", jurnal_harian: "otomatis", modul_ajar: "otomatis",
    walas_report: "otomatis", catatan_walikelas: "otomatis", karyawan: "otomatis",
    pengaturan: "otomatis", advanced_rules: "otomatis"
  },
  waka_kesiswaan: {
    dashboard: "otomatis", absensi: "otomatis", akademik: "otomatis", pesan: "otomatis",
    kedisiplinan_piket: "otomatis", kedisiplinan_bpbk: "otomatis",
    riwayat_prestasi: "otomatis", walas_report: "otomatis", catatan_walikelas: "otomatis",
    siswa_keluar: "otomatis", tatib_skor: "otomatis", kedisiplinan_absensi: "otomatis", siswa: "otomatis"
  },
  waka_sarpras: {
    dashboard: "otomatis", ruangan: "otomatis", denah: "otomatis", kelas: "otomatis",
    siswa: "otomatis", generate: "otomatis"
  },
  waka_hubin: {
    dashboard: "otomatis", pkl_dashboard: "otomatis", pkl_data_siswa: "otomatis",
    pkl_data_perusahaan: "otomatis", pkl_penugasan: "otomatis", pkl_administrasi: "otomatis",
    pkl_jurnal: "otomatis", pkl_laporan: "otomatis", pkl_absensi_setting: "otomatis"
  },
  // Staf Kesiswaan
  bpbk: {
    dashboard: "otomatis", kedisiplinan_bpbk: "otomatis", kedisiplinan_absensi: "view",
    riwayat_prestasi: "otomatis", siswa: "view", absensiguru: "otomatis"
  },
  pembina_osis: {
    dashboard: "otomatis", kedisiplinan_piket: "otomatis", riwayat_prestasi: "otomatis",
    akademik: "view", siswa: "view", absensiguru: "otomatis"
  },
  sekretaris_osis: {
    dashboard: "otomatis", riwayat_prestasi: "view", akademik: "view", absensiguru: "otomatis"
  },
  // Staf Divisi (anggota & sekretaris Waka)
  sekretaris_kurikulum: {
    dashboard: "otomatis", generate: "view", ketersediaan: "otomatis", beban: "view",
    silabus: "otomatis", akademik: "otomatis", kelas: "view", jurnal_harian: "view",
    modul_ajar: "otomatis", absensiguru: "otomatis"
  },
  anggota_kurikulum: {
    dashboard: "otomatis", generate: "view", akademik: "view", silabus: "view",
    jurnal_harian: "view", absensiguru: "otomatis"
  },
  sekretaris_kesiswaan: {
    dashboard: "otomatis", absensi: "otomatis", kedisiplinan_piket: "otomatis",
    kedisiplinan_absensi: "otomatis", catatan_walikelas: "view", riwayat_prestasi: "otomatis",
    siswa: "view", absensiguru: "otomatis"
  },
  anggota_kesiswaan: {
    dashboard: "otomatis", kedisiplinan_piket: "otomatis", kedisiplinan_absensi: "view",
    riwayat_prestasi: "view", absensiguru: "otomatis"
  },
  sekretaris_hubin: {
    dashboard: "otomatis", pkl_dashboard: "otomatis", pkl_data_siswa: "otomatis",
    pkl_data_perusahaan: "otomatis", pkl_jurnal: "otomatis", pkl_laporan: "view",
    pkl_administrasi: "otomatis", absensiguru: "otomatis"
  },
  anggota_hubin: {
    dashboard: "otomatis", pkl_dashboard: "view", pkl_data_siswa: "view",
    pkl_jurnal: "view", absensiguru: "otomatis"
  },
  sekretaris_sarpras: {
    dashboard: "otomatis", ruangan: "otomatis", denah: "otomatis", absensiguru: "otomatis"
  },
  anggota_sarpras: {
    dashboard: "otomatis", ruangan: "view", denah: "view", absensiguru: "otomatis"
  },
};


const DEFAULT_FEATURE_SETTINGS = {
  attendance: true,
  attendanceCorrections: true,
  attendanceExport: true,
  attendanceQr: true,
  attendanceGps: true,
  attendancePhoto: true,
  dashboardMessages: true,
  teacherSyllabus: true,
  publicCalendar: true,
  publicDenah: true,
};

const DEFAULT_SYLLABUSES = [
  {
    id: "s1",
    subjectName: "Dasar-Dasar Desain Grafis",
    teacherCode: "",
    title: "Pertemuan 1: Pengenalan Vektor dan Bitmap",
    gradeSemester: "X / Ganjil",
    objectives: "Siswa memahami perbedaan dan penggunaan format gambar digital.",
    materials: "Konsep grafis berbasis vektor (garis dan kurva).\nKonsep grafis berbasis bitmap (piksel dan resolusi).\nKarakteristik file format (JPEG, PNG, SVG, AI, CDR).",
  },
  {
    id: "s2",
    subjectName: "Pemrograman Dasar",
    teacherCode: "",
    title: "Pertemuan 1: Pengenalan Algoritma",
    gradeSemester: "X / Ganjil",
    objectives: "Siswa dapat memahami konsep dasar algoritma.",
    materials: "Definisi Algoritma.\nStruktur dasar algoritma.\nContoh penerapan algoritma dalam kehidupan sehari-hari.",
  },
];

const DEFAULT_SYLLABUS_CATEGORIES = [
  { id: "c1", name: "Teori / Pemahaman Dasar", color: "blue" },
  { id: "c2", name: "Praktikum / Latihan", color: "emerald" },
  { id: "c3", name: "Evaluasi / Ujian", color: "rose" }
];

const DEFAULT_CALENDAR_CATEGORIES = [
  { id: "cal-c1", name: "Kesiswaan", color: "blue" },
  { id: "cal-c2", name: "Kurikulum", color: "emerald" },
  { id: "cal-c3", name: "Hubin", color: "orange" },
  { id: "cal-c4", name: "Jurusan", color: "purple" },
  { id: "cal-c5", name: "Libur Nasional", color: "red" }
];

const DEFAULT_ACADEMIC_CALENDAR = [
  { id: "evt-1", title: "Tahun Baru Masehi", dateStart: "2026-01-01", dateEnd: "2026-01-01", categoryId: "cal-c5", description: "Libur Tahun Baru 2026" },
  { id: "evt-2", title: "Libur Idul Fitri", dateStart: "2026-03-20", dateEnd: "2026-03-24", categoryId: "cal-c5", description: "Cuti Bersama dan Libur Hari Raya Idul Fitri" },
  { id: "evt-3", title: "Hari Kemerdekaan RI", dateStart: "2026-08-17", dateEnd: "2026-08-17", categoryId: "cal-c5", description: "Upacara Peringatan HUT Kemerdekaan RI" },
];

const DEFAULT_ACTIVITY_LOGS = [];
const DEFAULT_DASHBOARD_MESSAGES = [];
const DEFAULT_ATTENDANCE_CORRECTIONS = [];

const createActivityLog = ({ type = "info", title, detail = "", meta = {} }) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  title,
  detail,
  meta,
  timestamp: new Date().toISOString(),
});

const readPrimaryState = () => getDatabaseSnapshot() || {};

const initialState = readPrimaryState();

export const useAppStore = create((set) => ({
  themeSettings: {
    primaryColor: '#064e3b',
    fontFamily: "'Lexend', system-ui, sans-serif",
    logoText: 'TS',
    logoUrl: '',
  },
  updateThemeSettings: (newSettings) =>
    set((state) => ({ themeSettings: { ...state.themeSettings, ...newSettings } })),

  featureSettings: {
    ...DEFAULT_FEATURE_SETTINGS,
    ...(initialState.featureSettings || {}),
  },
  rolePermissions: {
    ...DEFAULT_ROLE_PERMISSIONS,
    ...(initialState.rolePermissions || {}),
  },
  updateFeatureSettings: (newSettings) =>
    set((state) => ({
      featureSettings: {
        ...state.featureSettings,
        ...newSettings,
      },
      activityLogs: [
        createActivityLog({
          type: "settings",
          title: "Kontrol fitur diperbarui",
          detail: "Admin mengubah status aktif/nonaktif fitur aplikasi.",
        }),
        ...state.activityLogs,
      ].slice(0, 25),
    })),

  updateRolePermissions: (newPermissions) =>
    set((state) => ({
      rolePermissions: {
        ...state.rolePermissions,
        ...newPermissions,
      },
      activityLogs: [
        createActivityLog({
          type: "settings",
          title: "Hak akses role diperbarui",
          detail: "Admin mengubah izin menu untuk role/divisi.",
        }),
        ...state.activityLogs,
      ].slice(0, 25),
    })),

  kedisiplinanSettings: {
    batasPoinSiswaBermasalah: 100,
    ...(initialState.kedisiplinanSettings || {}),
  },
  updateKedisiplinanSettings: (newSettings) =>
    set((state) => ({
      kedisiplinanSettings: {
        ...state.kedisiplinanSettings,
        ...newSettings,
      },
    })),

  attendanceSettings: {
    ...DEFAULT_ATTENDANCE_SETTINGS,
    ...(initialState.attendanceSettings || {}),
    sessions: Array.isArray(initialState.attendanceSettings?.sessions)
      ? initialState.attendanceSettings.sessions
      : DEFAULT_ATTENDANCE_SETTINGS.sessions,
  },
  updateAttendanceSettings: (newSettings) =>
    set((state) => {
      const nextAttendanceSettings = {
        ...state.attendanceSettings,
        ...newSettings,
        sessions: Array.isArray(newSettings.sessions)
          ? newSettings.sessions
          : (state.attendanceSettings.sessions || DEFAULT_ATTENDANCE_SETTINGS.sessions),
      };
      const nextActivityLogs = [...state.activityLogs];
      if (Object.prototype.hasOwnProperty.call(newSettings, "mode") && newSettings.mode !== state.attendanceSettings.mode) {
        nextActivityLogs.unshift(createActivityLog({
          type: "settings",
          title: "Mode absensi diubah",
          detail: `Mode aktif sekarang: ${newSettings.mode || "button"}`,
        }));
      }
      return {
        attendanceSettings: nextAttendanceSettings,
        activityLogs: nextActivityLogs.slice(0, 25),
      };
    }),

  attendanceRecords: Array.isArray(initialState.attendanceRecords) ? initialState.attendanceRecords : [],
  addAttendanceRecord: (record) =>
    set((state) => ({
      attendanceRecords: [...state.attendanceRecords.filter((item) => item.id !== record.id), record],
      activityLogs: [
        createActivityLog({
          type: "attendance",
          title: "Absensi guru tercatat",
          detail: `${record.teacherCode || "Guru"} - ${record.status || "Hadir"} (${record.mode || "button"})`,
          meta: { recordId: record.id },
        }),
        ...state.activityLogs,
      ].slice(0, 25),
    })),
  removeAttendanceRecord: (id) =>
    set((state) => {
      const removed = state.attendanceRecords.find((r) => r.id === id);
      return {
        attendanceRecords: state.attendanceRecords.filter((r) => r.id !== id),
        activityLogs: [
          createActivityLog({
            type: "attendance",
            title: "Rekam absensi dihapus",
            detail: removed ? `${removed.teacherCode || "Guru"} - ${removed.date || ""}`.trim() : "Satu rekam absensi dihapus",
            meta: { recordId: id },
          }),
          ...state.activityLogs,
        ].slice(0, 25),
      };
    }),
  clearAttendanceRecords: () =>
    set((state) => ({
      attendanceRecords: [],
      activityLogs: [
        createActivityLog({
          type: "attendance",
          title: "Semua data absensi dihapus",
          detail: "Rekap absensi guru dikosongkan oleh admin.",
        }),
        ...state.activityLogs,
      ].slice(0, 25),
    })),

  attendanceCorrections: Array.isArray(initialState.attendanceCorrections) ? initialState.attendanceCorrections : DEFAULT_ATTENDANCE_CORRECTIONS,
  addAttendanceCorrection: (request) =>
    set((state) => ({
      attendanceCorrections: [request, ...state.attendanceCorrections],
      activityLogs: [
        createActivityLog({
          type: "attendance",
          title: "Koreksi absensi diajukan",
          detail: `${request.teacherCode || "Guru"} mengajukan ${request.status || "koreksi"}.`,
          meta: { correctionId: request.id },
        }),
        ...state.activityLogs,
      ].slice(0, 25),
    })),
  reviewAttendanceCorrection: (id, reviewer = {}, decision = "approved", record = null) =>
    set((state) => {
      const reviewedAt = new Date().toISOString();
      const nextCorrections = state.attendanceCorrections.map((item) => (
        item.id === id
          ? { ...item, statusReview: decision, reviewedBy: reviewer.name || reviewer.code || reviewer.role || "Reviewer", reviewedAt }
          : item
      ));
      const nextRecords = decision === "approved" && record
        ? [...state.attendanceRecords.filter((item) => item.id !== record.id), record]
        : state.attendanceRecords;
      return {
        attendanceCorrections: nextCorrections,
        attendanceRecords: nextRecords,
        activityLogs: [
          createActivityLog({
            type: "attendance",
            title: decision === "approved" ? "Koreksi absensi disetujui" : "Koreksi absensi ditolak",
            detail: `Reviewer: ${reviewer.name || reviewer.role || "Sistem"}.`,
            meta: { correctionId: id },
          }),
          ...state.activityLogs,
        ].slice(0, 25),
      };
    }),

  syllabuses: Array.isArray(initialState.syllabuses) ? initialState.syllabuses : DEFAULT_SYLLABUSES,
  addSyllabus: (syllabus) =>
    set((state) => ({
      syllabuses: [...state.syllabuses, syllabus],
    })),
  removeSyllabus: (id) =>
    set((state) => ({
      syllabuses: state.syllabuses.filter((s) => s.id !== id),
    })),
  updateSyllabus: (id, updated) =>
    set((state) => ({
      syllabuses: state.syllabuses.map((s) => (s.id === id ? { ...s, ...updated } : s)),
    })),

  syllabusCategories: Array.isArray(initialState.syllabusCategories) ? initialState.syllabusCategories : DEFAULT_SYLLABUS_CATEGORIES,
  addSyllabusCategory: (category) =>
    set((state) => ({
      syllabusCategories: [...state.syllabusCategories, category],
    })),
  removeSyllabusCategory: (id) =>
    set((state) => ({
      syllabusCategories: state.syllabusCategories.filter((c) => c.id !== id),
    })),
  updateSyllabusCategory: (id, updated) =>
    set((state) => ({
      syllabusCategories: state.syllabusCategories.map((c) => (c.id === id ? { ...c, ...updated } : c)),
    })),

  activityLogs: Array.isArray(initialState.activityLogs) ? initialState.activityLogs : DEFAULT_ACTIVITY_LOGS,
  addActivityLog: (entry) =>
    set((state) => ({
      activityLogs: [createActivityLog(entry), ...state.activityLogs].slice(0, 25),
    })),
  clearActivityLogs: () =>
    set({ activityLogs: [] }),

  dashboardMessages: Array.isArray(initialState.dashboardMessages) ? initialState.dashboardMessages : DEFAULT_DASHBOARD_MESSAGES,
  addDashboardMessage: (message) =>
    set((state) => ({
      dashboardMessages: [message, ...state.dashboardMessages],
      activityLogs: [
        createActivityLog({
          type: "settings",
          title: "Pesan dashboard dipublikasikan",
          detail: `${message.title || "Pesan"} untuk ${message.target || "semua"}.`,
          meta: { messageId: message.id },
        }),
        ...state.activityLogs,
      ].slice(0, 25),
    })),
  updateDashboardMessage: (id, updated) =>
    set((state) => ({
      dashboardMessages: state.dashboardMessages.map((message) => (message.id === id ? { ...message, ...updated } : message)),
    })),
  removeDashboardMessage: (id) =>
    set((state) => ({
      dashboardMessages: state.dashboardMessages.filter((message) => message.id !== id),
    })),

  passwordResetRequests: Array.isArray(initialState.passwordResetRequests) ? initialState.passwordResetRequests : [],
  addPasswordResetRequest: (req) =>
    set((state) => ({
      passwordResetRequests: [req, ...state.passwordResetRequests],
    })),
  removePasswordResetRequest: (id) =>
    set((state) => ({
      passwordResetRequests: state.passwordResetRequests.filter((r) => r.id !== id),
    })),
  updatePasswordResetRequest: (id, updated) =>
    set((state) => ({
      passwordResetRequests: state.passwordResetRequests.map((r) => (r.id === id ? { ...r, ...updated } : r)),
    })),

  calendarCategories: Array.isArray(initialState.calendarCategories) ? initialState.calendarCategories : DEFAULT_CALENDAR_CATEGORIES,
  addCalendarCategory: (category) => set((state) => ({ calendarCategories: [...state.calendarCategories, category] })),
  updateCalendarCategory: (id, updated) => set((state) => ({ calendarCategories: state.calendarCategories.map(c => c.id === id ? { ...c, ...updated } : c) })),
  removeCalendarCategory: (id) => set((state) => ({ calendarCategories: state.calendarCategories.filter(c => c.id !== id) })),
  setCalendarCategories: (calendarCategories) => set({ calendarCategories }),

  academicCalendar: Array.isArray(initialState.academicCalendar) ? initialState.academicCalendar : DEFAULT_ACADEMIC_CALENDAR,
  addCalendarEvent: (event) => set((state) => ({ academicCalendar: [...state.academicCalendar, event] })),
  updateCalendarEvent: (id, updated) => set((state) => ({ academicCalendar: state.academicCalendar.map(e => e.id === id ? { ...e, ...updated } : e) })),
  removeCalendarEvent: (id) => set((state) => ({ academicCalendar: state.academicCalendar.filter(e => e.id !== id) })),
  setAcademicCalendar: (academicCalendar) => set({ academicCalendar }),

  getTeachers: () => readPrimaryState().teachers || [],
  getSubjects: () => readPrimaryState().subjects || [],
  getSchedule: () => readPrimaryState().schedule || [],
  getClasses: () => readPrimaryState().classes || [],
  getLayoutSettings: () => readPrimaryState().layoutSettings || {},
  getRoomLayout: () => readPrimaryState().roomLayout || [],
  getLayoutByDay: () => readPrimaryState().layoutByDay || {},
  getLayoutBlockLabels: () => normalizeLayoutBlockLabels(readPrimaryState().layoutBlockLabels || {}) || {},
  getDays: () => readPrimaryState().days || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
  getTimeSlots: () => readPrimaryState().timeSlots || {},
}));

const syncPersistedSlicesFromDatabase = () => {
  try {
    const latest = readPrimaryState();
    if (!latest || typeof latest !== "object") return;

    const nextState = {};

    if (latest.attendanceSettings && typeof latest.attendanceSettings === "object") {
      nextState.attendanceSettings = {
        ...DEFAULT_ATTENDANCE_SETTINGS,
        ...latest.attendanceSettings,
        sessions: Array.isArray(latest.attendanceSettings.sessions)
          ? latest.attendanceSettings.sessions
          : DEFAULT_ATTENDANCE_SETTINGS.sessions,
      };
    }
    if (latest.featureSettings && typeof latest.featureSettings === "object") {
      nextState.featureSettings = {
        ...DEFAULT_FEATURE_SETTINGS,
        ...latest.featureSettings,
      };
    }
    if (latest.rolePermissions && typeof latest.rolePermissions === "object") {
      nextState.rolePermissions = {
        ...DEFAULT_ROLE_PERMISSIONS,
        ...latest.rolePermissions,
      };
    }
    if (latest.kedisiplinanSettings && typeof latest.kedisiplinanSettings === "object") {
      nextState.kedisiplinanSettings = {
        batasPoinSiswaBermasalah: 100,
        ...latest.kedisiplinanSettings,
      };
    }
    if (Array.isArray(latest.attendanceRecords)) nextState.attendanceRecords = latest.attendanceRecords;
    if (Array.isArray(latest.attendanceCorrections)) nextState.attendanceCorrections = latest.attendanceCorrections;
    if (Array.isArray(latest.syllabuses)) nextState.syllabuses = latest.syllabuses;
    if (Array.isArray(latest.syllabusCategories)) nextState.syllabusCategories = latest.syllabusCategories;
    if (Array.isArray(latest.activityLogs)) nextState.activityLogs = latest.activityLogs;
    if (Array.isArray(latest.dashboardMessages)) nextState.dashboardMessages = latest.dashboardMessages;
    if (Array.isArray(latest.calendarCategories)) nextState.calendarCategories = latest.calendarCategories;
    if (Array.isArray(latest.academicCalendar)) nextState.academicCalendar = latest.academicCalendar;
    if (Array.isArray(latest.passwordResetRequests)) nextState.passwordResetRequests = latest.passwordResetRequests;

    if (Object.keys(nextState).length === 0) return;

    useAppStore.setState(nextState);
  } catch {
    // Ignore malformed database snapshots.
  }
};

subscribeDatabaseSnapshot(syncPersistedSlicesFromDatabase);

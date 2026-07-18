import { create } from 'zustand';
import { loadInitialState } from '../utils/state.js';

export const useDataStore = create((set) => ({
  // Users and Settings
  currentUser: (() => {
    try {
      let raw = sessionStorage.getItem("school_schedule_session_v1");
      if (!raw) {
        raw = localStorage.getItem("school_schedule_session_v1");
        if (raw) sessionStorage.setItem("school_schedule_session_v1", raw);
      }
      const session = raw ? JSON.parse(raw) : null;
      return session?.authToken && session?.role ? session : null;
    } catch {
      return null;
    }
  })(),
  setCurrentUser: (user) => set({ currentUser: user }),
  appSettings: loadInitialState("appSettings", {
    appName: "TimeSchedule",
    schoolName: "SMK Negeri 1",
    theme: "blue",
    faviconImage: "/favicon.svg",
    headerImage: "",
    customRoles: [],
    wakaDivisions: [],
    syncServerUrl: "",
    syncInterval: 300000,
    academicYear: "2023/2024",
    semester: "Ganjil"
  }),
  setAppSettings: (val) => set((state) => {
    let nextSettings = typeof val === 'function' ? val(state.appSettings) : val;
    if (nextSettings && typeof nextSettings === 'object') {
      nextSettings = { ...nextSettings };
      
      // Migrate old title & subtitle
      if (nextSettings.heroTitle === "Sistem Penjadwalan Cerdas & Presisi" || nextSettings.heroTitle === "Aplikasi Jadwal, Denah & Modul Ajar Sekolah") {
        nextSettings.heroTitle = "Aplikasi Jadwal, Denah & Materi Ajar Sekolah";
      }
      if (nextSettings.heroSubtitle === "Otomatisasi penyusunan jadwal sekolah bebas bentrok. Kelola sumber daya guru dan ruang kelas dengan antarmuka yang modern dan mudah digunakan." ||
          nextSettings.heroSubtitle === "Aplikasi melihat jadwal sekolah, denah serta modul ajar yang siap digunakan siswa dan guru.") {
        nextSettings.heroSubtitle = "Aplikasi melihat jadwal sekolah, denah serta materi ajar yang siap digunakan siswa dan guru.";
      }
      
      // Clean up Modul Ajar to Materi Ajar
      if (typeof nextSettings.heroSubtitle === "string" && nextSettings.heroSubtitle.toLowerCase().includes("modul")) {
        nextSettings.heroSubtitle = nextSettings.heroSubtitle
          .replace(/modul ajar/gi, "materi ajar")
          .replace(/Modul Ajar/gi, "Materi Ajar")
          .replace(/modul/gi, "materi")
          .replace(/Modul/gi, "Materi");
      }
      if (typeof nextSettings.serviceLabel3 === "string" && nextSettings.serviceLabel3.toLowerCase().includes("modul")) {
        nextSettings.serviceLabel3 = nextSettings.serviceLabel3
          .replace(/modul ajar/gi, "materi ajar")
          .replace(/Modul Ajar/gi, "Materi Ajar")
          .replace(/modul/gi, "materi")
          .replace(/Modul/gi, "Materi");
      }
    }
    return { appSettings: nextSettings };
  }),

  // Scheduling Data
  days: loadInitialState("days", ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]),
  setDays: (val) => set((state) => ({ days: typeof val === 'function' ? val(state.days) : val })),
  
  timeSlots: loadInitialState("timeSlots", []),
  setTimeSlots: (val) => set((state) => ({ timeSlots: typeof val === 'function' ? val(state.timeSlots) : val })),

  classes: loadInitialState("classes", []),
  setClasses: (val) => set((state) => ({ classes: typeof val === 'function' ? val(state.classes) : val })),

  students: loadInitialState("students", []),
  setStudents: (val) => set((state) => ({ students: typeof val === 'function' ? val(state.students) : val })),

  majors: loadInitialState("majors", []),
  setMajors: (val) => set((state) => ({ majors: typeof val === 'function' ? val(state.majors) : val })),

  rooms: loadInitialState("rooms", []),
  setRooms: (val) => set((state) => ({ rooms: typeof val === 'function' ? val(state.rooms) : val })),

  staffs: loadInitialState("staffs", []),
  setStaffs: (val) => set((state) => ({ staffs: typeof val === 'function' ? val(state.staffs) : val })),

  teachers: loadInitialState("teachers", []),
  setTeachers: (val) => set((state) => ({ teachers: typeof val === 'function' ? val(state.teachers) : val })),

  subjects: loadInitialState("subjects", []),
  setSubjects: (val) => set((state) => ({ subjects: typeof val === 'function' ? val(state.subjects) : val })),

  teachingLoads: loadInitialState("teachingLoads", []),
  setTeachingLoads: (val) => set((state) => ({ teachingLoads: typeof val === 'function' ? val(state.teachingLoads) : val })),

  teacherAvailability: loadInitialState("teacherAvailability", {}),
  setTeacherAvailability: (val) => set((state) => ({ teacherAvailability: typeof val === 'function' ? val(state.teacherAvailability) : val })),

  schedule: loadInitialState("schedule", []),
  setSchedule: (val) => set((state) => ({ schedule: typeof val === 'function' ? val(state.schedule) : val })),

  advancedRules: loadInitialState("advancedRules", {
    maxHoursPerDay: 8,
    maxConsecutiveHours: 4,
    allowTeacherGaps: true,
    prioritizeCoreSubjects: true,
    distributionMode: "spread"
  }),
  setAdvancedRules: (val) => set((state) => ({ advancedRules: typeof val === 'function' ? val(state.advancedRules) : val })),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('session-updated', () => {
    try {
      let raw = sessionStorage.getItem("school_schedule_session_v1");
      if (!raw) {
        raw = localStorage.getItem("school_schedule_session_v1");
        if (raw) sessionStorage.setItem("school_schedule_session_v1", raw);
      }
      const session = raw ? JSON.parse(raw) : null;
      useDataStore.setState({ currentUser: session?.authToken && session?.role ? session : null });
    } catch {}
  });
}

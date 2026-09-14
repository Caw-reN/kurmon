import { create } from 'zustand';

/**
 * authStore.js (Monitoring)
 * Reads from the shared unified session (sessionStorage 'school_schedule_session_v1').
 * Login/logout is handled by the central LandingPage — this store is read-only.
 */


const SESSION_KEY = 'school_schedule_session_v1';

const readSession = () => {
  try {
    let raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      raw = localStorage.getItem(SESSION_KEY);
      if (raw) sessionStorage.setItem(SESSION_KEY, raw);
    }
    const session = raw ? JSON.parse(raw) : null;
    if (session?.authToken && session?.role) return session;
    return null;
  } catch {
    return null;
  }
};

const useAuthStore = create((set, get) => ({
  user: readSession(),
  isLoggedIn: !!readSession(),

  // Sync from sessionStorage (call on mount)
  syncSession: () => {
    const session = readSession();
    set({ user: session, isLoggedIn: !!session });
  },

  // Fetch latest full student master data from server & sync session storage
  fetchStudentProfile: async () => {
    const current = get().user;
    if (!current?.authToken || current?.role !== 'siswa') return null;
    try {
      const res = await fetch('/api/student/profile', {
        headers: { Authorization: `Bearer ${current.authToken}` }
      });
      const json = await res.json();
      if (json.ok && json.data) {
        const d = json.data;
        const updated = {
          ...current,
          ...d,
          id: d.nis || current.id,
          nis: d.nis || current.nis || current.username,
          name: d.name || d.nama || d.namaSiswa || current.name,
          nama: d.nama || d.name || current.nama,
          namaSiswa: d.namaSiswa || d.name || current.namaSiswa,
          class_name: d.class_name || d.kelas || current.class_name,
          kelas: d.kelas || d.class_name || current.kelas,
          jurusan: d.jurusan || d.major || current.jurusan,
          major: d.major || d.jurusan || current.major,
          photo: d.photo || d.foto || current.photo || null,
          foto: d.foto || d.photo || current.foto || null,
          ttl: d.ttl || current.ttl || '',
          nisn: d.nisn || current.nisn || '',
          gender: d.gender || current.gender || '',
          card_token: d.card_token || current.card_token || '',
          pkl: d.pkl || current.pkl || null,
        };
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
          localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        } catch (err) {
          console.warn('Failed to persist session to storage:', err);
        }
        set({ user: updated, isLoggedIn: true });
        return updated;
      }
    } catch (err) {
      console.warn('Failed to sync student profile:', err);
    }
    return null;
  },

  logout: () => {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    set({ user: null, isLoggedIn: false });
    window.location.href = '/';
  },
}));

export default useAuthStore;

if (typeof window !== 'undefined') {
  window.addEventListener('session-updated', () => {
    useAuthStore.getState().syncSession();
  });
}

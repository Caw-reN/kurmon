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

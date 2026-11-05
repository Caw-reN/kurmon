/**
 * useAuthToken — Hook terpusat untuk membaca auth token & info sesi
 * 
 * S-01 FIX: Menggantikan pola duplikasi berikut yang tersebar di 50+ komponen:
 *   const authToken = authUser?.authToken || sessionUser?.authToken || rawSession?.authToken || '';
 *   const userRole  = authUser?.role || sessionUser?.role || rawSession?.role || 'guru';
 * 
 * @example
 *   import { useAuthToken } from '../../hooks/useAuthToken.js';
 *   const { token, role, userId, userName, isAdmin, isStudent } = useAuthToken();
 */
import { useMemo } from 'react';
import useAuthStore from '../store/monitoring/authStore.js';
import { useDataStore } from '../store/useDataStore.js';

const ADMIN_ROLES    = ['admin', 'superadmin'];
const STAFF_ROLES    = ['admin', 'superadmin', 'kesiswaan', 'waka_kesiswaan', 'waka', 'kepsek', 'tu', 'bk', 'bpbk', 'piket', 'guru'];
const KESISWAAN_ROLES = ['admin', 'superadmin', 'kesiswaan', 'waka_kesiswaan', 'waka', 'kepsek'];
const BK_ROLES       = ['admin', 'superadmin', 'bk', 'bpbk', 'kesiswaan', 'waka_kesiswaan', 'waka', 'kepsek'];

/** Baca session dari sessionStorage/localStorage (sync) */
function readRawSession() {
  if (typeof window === 'undefined') return {};
  try {
    const raw =
      sessionStorage.getItem('school_schedule_session_v1') ||
      localStorage.getItem('school_schedule_session_v1');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Hook utama — gunakan di dalam komponen React
 */
export function useAuthToken() {
  const authUser    = useAuthStore(state => state.user);
  const sessionUser = useDataStore(state => state.currentUser);

  return useMemo(() => {
    const rawSession = readRawSession();

    const token =
      authUser?.authToken    ||
      sessionUser?.authToken ||
      rawSession?.authToken  ||
      '';

    const role = String(
      authUser?.role    ||
      sessionUser?.role ||
      rawSession?.role  ||
      // B3-MINOR-C FIX: Ganti fallback dari 'guru' ke '' agar semua isXxx flag bernilai false
      // untuk pengguna yang tidak login (mencegah UI menampilkan konten yang salah)
      ''
    ).toLowerCase();

    const userId =
      authUser?.id          ||
      sessionUser?.id       ||
      rawSession?.id        ||
      authUser?.username    ||
      sessionUser?.username ||
      rawSession?.username  ||
      '';

    const userName =
      authUser?.name        ||
      sessionUser?.name     ||
      rawSession?.name      ||
      authUser?.username    ||
      sessionUser?.username ||
      rawSession?.username  ||
      '';

    return {
      /** Bearer token untuk header Authorization */
      token,
      /** Alias untuk token */
      authToken: token,
      /** Role aktif pengguna (lowercase) */
      role,
      /** ID pengguna */
      userId,
      /** Nama lengkap pengguna */
      userName,
      /** true jika token tersedia */
      isAuthenticated: Boolean(token),
      /** true jika admin atau superadmin */
      isAdmin: ADMIN_ROLES.includes(role),
      /** true jika staf sekolah (guru, admin, tu, bk, piket, dll) */
      isSchoolStaff: STAFF_ROLES.includes(role) || role !== 'siswa',
      /** true jika tim kesiswaan / waka kesiswaan */
      isKesiswaan: KESISWAAN_ROLES.includes(role) || 
        role.includes('kesiswaan') || role.includes('osis') ||
        Boolean(authUser?.isKesiswaan || sessionUser?.isKesiswaan || rawSession?.isKesiswaan) ||
        String(authUser?.subrole || sessionUser?.subrole || rawSession?.subrole || '').toLowerCase().includes('kesiswaan') ||
        String(authUser?.subrole || sessionUser?.subrole || rawSession?.subrole || '').toLowerCase().includes('osis') ||
        String(authUser?.division || sessionUser?.division || rawSession?.division || '').toLowerCase().includes('kesiswaan') ||
        String(authUser?.division || sessionUser?.division || rawSession?.division || '').toLowerCase().includes('osis'),
      /** true jika guru BK/BPBK */
      isBK: BK_ROLES.includes(role) ||
        role.includes('bk') || role.includes('bpbk') ||
        Boolean(authUser?.isBK || authUser?.isBPBK || sessionUser?.isBK || sessionUser?.isBPBK || rawSession?.isBK || rawSession?.isBPBK) ||
        ['bk', 'bpbk'].some(k => String(authUser?.subrole || sessionUser?.subrole || rawSession?.subrole || '').toLowerCase().includes(k)) ||
        ['bk', 'bpbk'].some(k => String(authUser?.division || sessionUser?.division || rawSession?.division || '').toLowerCase().includes(k)),
      /** true jika role adalah siswa */
      isStudent: role === 'siswa',
      /** true jika role adalah guru */
      isTeacher: role === 'guru',
      /** Object sesi terpadu dari authStore / sessionUser / rawSession */
      user: authUser || sessionUser || (Object.keys(rawSession).length > 0 ? rawSession : null),
      /** Object sesi mentah dari authStore (bisa null) */
      rawAuthUser: authUser,
    };
  }, [authUser, sessionUser]);
}

/**
 * Versi non-hook untuk digunakan di luar React (event handler, helper, dsb)
 */
export function getAuthTokenSync() {
  const authStoreUser = useAuthStore.getState()?.user;
  const dataStoreUser = useDataStore.getState()?.currentUser;
  const rawSession = readRawSession();
  return authStoreUser?.authToken || dataStoreUser?.authToken || rawSession?.authToken || '';
}

export default useAuthToken;

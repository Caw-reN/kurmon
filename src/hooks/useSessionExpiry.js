/**
 * useSessionExpiry — Auto-logout saat sesi tidak aktif terlalu lama
 * 
 * F-10 FIX: Menambahkan session expiry otomatis yang tidak ada sebelumnya.
 * 
 * Cara kerja:
 * - Setiap aktivitas user (klik, ketik, gerak mouse, touch) akan me-reset timer
 * - Jika tidak ada aktivitas selama `timeoutMs`, hook akan memanggil `onExpired()`
 * - Default timeout: 8 jam (waktu kerja normal 1 shift)
 * 
 * @example
 *   import { useSessionExpiry } from '../../hooks/useSessionExpiry.js';
 * 
 *   // Di root component atau layout utama:
 *   useSessionExpiry({
 *     timeoutMs: 8 * 60 * 60 * 1000, // 8 jam
 *     onExpired: () => {
 *       // hapus session & redirect ke login
 *       sessionStorage.clear();
 *       localStorage.removeItem('school_schedule_session_v1');
 *       window.location.href = '/';
 *     }
 *   });
 */
import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
const DEFAULT_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 jam
const WARNING_BEFORE_MS  = 5 * 60 * 1000;       // peringatan 5 menit sebelum expired

/**
 * @param {object} options
 * @param {number}   [options.timeoutMs=28800000]  - Durasi inaktif sebelum expired (ms). Default 8 jam.
 * @param {Function} [options.onExpired]            - Callback yang dipanggil saat sesi expired.
 * @param {Function} [options.onWarning]            - Callback 5 menit sebelum expired (optional).
 * @param {boolean}  [options.enabled=true]         - Set false untuk menonaktifkan hook ini.
 */
export function useSessionExpiry({
  timeoutMs  = DEFAULT_TIMEOUT_MS,
  onExpired,
  onWarning,
  enabled    = true,
} = {}) {
  const timerRef   = useRef(null);
  const warnRef    = useRef(null);
  const lastActive = useRef(Date.now());

  const clearTimers = useCallback(() => {
    if (timerRef.current)  { clearTimeout(timerRef.current);  timerRef.current  = null; }
    if (warnRef.current)   { clearTimeout(warnRef.current);   warnRef.current   = null; }
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    lastActive.current = Date.now();
    clearTimers();

    // Warning timer (opsional — 5 menit sebelum expired)
    if (onWarning && timeoutMs > WARNING_BEFORE_MS) {
      warnRef.current = setTimeout(() => {
        onWarning();
      }, timeoutMs - WARNING_BEFORE_MS);
    }

    // Expired timer
    timerRef.current = setTimeout(() => {
      if (onExpired) onExpired();
    }, timeoutMs);
  }, [enabled, timeoutMs, onExpired, onWarning, clearTimers]);

  useEffect(() => {
    if (!enabled || !onExpired) return;

    // Mulai timer saat mount
    resetTimer();

    // Event listeners untuk aktivitas user
    const handleActivity = () => resetTimer();
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, handleActivity));
    };
  }, [enabled, onExpired, resetTimer, clearTimers]);
}

export default useSessionExpiry;

import { create } from 'zustand';

/**
 * absensiStore.js
 * Zustand store untuk menyimpan pengaturan metode absensi PKL.
 * State ini di-set oleh Admin dan dibaca oleh Panel Siswa.
 * Semua data disimpan ke PostgreSQL via /api/settings/feature (fiturStore).
 * Store ini bersifat in-memory saja (tanpa persist ke localStorage).
 */


const useAbsensiStore = create((set) => ({
  // ==========================================
  // STATE: Metode absensi yang aktif
  // ==========================================
  metode: {
    gps: true,       // Absensi berbasis GPS radius
    selfie: true,    // Absensi dengan foto selfie
    qrCode: false,   // Absensi dengan scan QR Code
    manual: false,   // Absensi manual (teks alasan)
  },

  // ==========================================
  // STATE: Konfigurasi GPS
  // ==========================================
  gpsConfig: {
    radiusMeters: 150, // Jarak max dari lokasi perusahaan (meter)
  },

  // ==========================================
  // ACTIONS
  // ==========================================

  /**
   * Toggle satu metode absensi on/off
   * @param {string} key - 'gps' | 'selfie' | 'qrCode' | 'manual'
   */
  toggleMetode: async (key) => {
    set((state) => {
      const nextMetode = { ...state.metode, [key]: !state.metode[key] };
      return { metode: nextMetode };
    });
    await get().saveAbsensiConfigToServer();
  },

  /**
   * Set radius GPS (dalam meter)
   * @param {number} radius
   */
  setGpsRadius: async (radius) => {
    set((state) => {
      const nextGpsConfig = { ...state.gpsConfig, radiusMeters: radius };
      return { gpsConfig: nextGpsConfig };
    });
    await get().saveAbsensiConfigToServer();
  },

  /**
   * Reset semua metode ke default
   */
  resetMetode: async () => {
    set({
      metode: { gps: true, selfie: true, qrCode: false, manual: false },
      gpsConfig: { radiusMeters: 150 },
    });
    await get().saveAbsensiConfigToServer();
  },

  /**
   * Hydrate state dari data server
   */
  hydrateFromServer: (settings) =>
    set((state) => ({
      metode: settings?.metode ? { ...state.metode, ...settings.metode } : state.metode,
      gpsConfig: settings?.gpsConfig ? { ...state.gpsConfig, ...settings.gpsConfig } : state.gpsConfig,
    })),

  /**
   * Simpan konfigurasi absensi ke server
   */
  saveAbsensiConfigToServer: async () => {
    try {
      const token = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken;
      if (!token) return;
      const state = get();
      await fetch('/api/settings/feature', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          absensiMetode: state.metode,
          absensiGpsConfig: state.gpsConfig,
        }),
      });
    } catch (e) {
      console.error('Failed to save absensi config to server', e);
    }
  },
}));

export default useAbsensiStore;

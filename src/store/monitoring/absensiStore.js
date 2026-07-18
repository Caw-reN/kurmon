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
  toggleMetode: (key) =>
    set((state) => ({
      metode: {
        ...state.metode,
        [key]: !state.metode[key],
      },
    })),

  /**
   * Set radius GPS (dalam meter)
   * @param {number} radius
   */
  setGpsRadius: (radius) =>
    set((state) => ({
      gpsConfig: { ...state.gpsConfig, radiusMeters: radius },
    })),

  /**
   * Reset semua metode ke default
   */
  resetMetode: () =>
    set({
      metode: { gps: true, selfie: true, qrCode: false, manual: false },
    }),

  /**
   * Hydrate state dari data yang diambil dari server (PostgreSQL).
   * Dipanggil saat komponen mount dan data dari /api/settings/feature tersedia.
   * @param {object} settings - { metode, gpsConfig }
   */
  hydrateFromServer: (settings) =>
    set((state) => ({
      metode: settings?.metode ? { ...state.metode, ...settings.metode } : state.metode,
      gpsConfig: settings?.gpsConfig ? { ...state.gpsConfig, ...settings.gpsConfig } : state.gpsConfig,
    })),
}));

export default useAbsensiStore;

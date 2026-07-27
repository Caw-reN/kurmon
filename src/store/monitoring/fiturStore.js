import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useAuthStore from './authStore.js';

/**
 * fiturStore.js
 * Zustand store untuk kontrol fitur oleh Admin.
 * Setiap fitur bisa di-ON/OFF — efeknya langsung terlihat di Panel Siswa & Guru.
 */




export const FITUR_CONFIG = [
  {
    key: 'show_dashboard_logs_siswa',
    label: 'Tampilkan Log Aktivitas (Siswa)',
    description: 'Siswa dapat melihat log terbaru (terlambat, guru absen, prestasi) di Dashboard mereka.',
    affectedRoles: ['siswa'],
    icon: 'LayoutDashboard',
    critical: false,
  },
  {
    key: 'absensi',
    label: 'Absensi Harian',
    description: 'Siswa dapat melakukan check-in dan check-out setiap hari kerja.',
    affectedRoles: ['siswa'],
    icon: 'CheckCircle2',
    critical: true, // tidak bisa dimatikan tanpa konfirmasi
  },
  {
    key: 'jurnal',
    label: 'Jurnal & Logbook',
    description: 'Siswa mengisi jurnal kegiatan harian; guru dapat memvalidasi.',
    affectedRoles: ['siswa', 'guru'],
    icon: 'BookOpen',
    critical: false,
  },
  {
    key: 'lokasi_pkl',
    label: 'Update Lokasi PKL',
    description: 'Siswa dapat mengatur dan memperbarui lokasi tempat PKL mereka.',
    affectedRoles: ['siswa'],
    icon: 'MapPin',
    critical: false,
  },
  {
    key: 'laporan',
    label: 'Laporan & Rekap',
    description: 'Guru dan Admin dapat mengakses laporan kehadiran dan jurnal.',
    affectedRoles: ['admin', 'guru'],
    icon: 'FileBarChart2',
    critical: false,
  },
  {
    key: 'validasi_jurnal',
    label: 'Validasi Jurnal oleh Guru',
    description: 'Guru pembimbing dapat menyetujui atau menolak jurnal siswa.',
    affectedRoles: ['guru'],
    icon: 'BadgeCheck',
    critical: false,
  },
  {
    key: 'profil_siswa',
    label: 'Edit Profil Siswa',
    description: 'Siswa dapat melihat dan mengedit data profil pribadi mereka.',
    affectedRoles: ['siswa'],
    icon: 'UserCog',
    critical: false,
  },
];

const useFiturStore = create(
  persist(
    (set, get) => ({
      // Semua fitur aktif by default
      fitur: FITUR_CONFIG.reduce((acc, f) => {
        // Set show_dashboard_logs_siswa default to false, others to true
        acc[f.key] = f.key === 'show_dashboard_logs_siswa' ? false : true;
        return acc;
      }, {}),

      /** Cek apakah fitur tertentu aktif */
      isFiturAktif: (key) => get().fitur[key] ?? true,

      /** Toggle fitur on/off */
      toggleFitur: async (key) => {
        set((state) => ({
          fitur: { ...state.fitur, [key]: !state.fitur[key] },
        }));
        await get().saveFiturToServer();
      },

      /** Set fitur ke nilai spesifik */
      setFitur: async (key, value) => {
        set((state) => ({
          fitur: { ...state.fitur, [key]: value },
        }));
        await get().saveFiturToServer();
      },

      /** Reset semua ke default (semua aktif) */
      resetFitur: async () => {
        set({
          fitur: FITUR_CONFIG.reduce((acc, f) => {
            acc[f.key] = f.key === 'show_dashboard_logs_siswa' ? false : true;
            return acc;
          }, {}),
        });
        await get().saveFiturToServer();
      },

      fetchFiturFromServer: async () => {
        try {
          const token = useAuthStore.getState().authToken;
          if (!token) return;
          const res = await fetch("/api/settings/feature", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.ok && data.data && Object.keys(data.data).length > 0) {
            set({ fitur: data.data });
          }
        } catch (e) {
          console.error("Failed to fetch features", e);
        }
      },
      
      saveFiturToServer: async () => {
        try {
          const token = useAuthStore.getState().authToken;
          if (!token) return;
          await fetch("/api/settings/feature", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(get().fitur)
          });
        } catch (e) {
          console.error("Failed to save features", e);
        }
      },
    }),
    {
      name: 'pkl-fitur-settings',
      partialize: (state) => ({ fitur: state.fitur }),
    }
  )
);

export default useFiturStore;

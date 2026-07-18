import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * penugasanStore.js
 * Zustand store untuk penugasan Guru Pembimbing ke Siswa oleh HUBIN.
 * 
 * Fitur:
 *  - Data kapasitas guru (bisa di-set HUBIN per individu)
 *  - Manual assignment (dropdown per siswa)
 *  - Auto-assign dengan algoritma: Jurusan → Kapasitas → Jarak → Alfabetis
 *  - Konfirmasi sebelum reset (jika ada siswa baru)
 */



// ---------------------------------------------------------------------------
// Utility: Haversine distance (meter)
// ---------------------------------------------------------------------------
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ---------------------------------------------------------------------------
// Utility: Hitung "centroid" (rata-rata koordinat) dari siswa yang sudah di-assign ke guru
// Digunakan sebagai referensi jarak guru dalam algoritma
// ---------------------------------------------------------------------------
const getGuruCentroid = (guruId, assignments, lokasiSiswa) => {
  const assignedSiswaIds = Object.entries(assignments)
    .filter(([, gId]) => gId === guruId)
    .map(([sId]) => Number(sId));

  if (assignedSiswaIds.length === 0) return null;

  const coords = assignedSiswaIds
    .map((sId) => lokasiSiswa[sId])
    .filter(Boolean);

  if (coords.length === 0) return null;

  return {
    lat: coords.reduce((s, c) => s + c.lat, 0) / coords.length,
    lng: coords.reduce((s, c) => s + c.lng, 0) / coords.length,
  };
};

// ---------------------------------------------------------------------------
// Koordinat Sekolah (digunakan sebagai fallback centroid guru baru)
// SMK Karya Guna 2 Bekasi
// ---------------------------------------------------------------------------
const SEKOLAH_COORDS = { lat: -6.2350, lng: 107.0000 };

// ---------------------------------------------------------------------------
// Initial data
// ---------------------------------------------------------------------------
const INITIAL_KAPASITAS = {};
const INITIAL_ASSIGNMENTS = {};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
const usePenugasanStore = create(
  persist(
    (set, get) => ({
      // siswaId → guruId
      assignments: INITIAL_ASSIGNMENTS,

      // guruId → maxKapasitas (bisa dikustomisasi HUBIN)
      kapasitasGuru: INITIAL_KAPASITAS,

      // State konfirmasi reset
      pendingReset: false, // true = ada siswa baru, tunggu konfirmasi HUBIN

      // Preview auto-assign (sebelum diterapkan)
      previewAssignments: null, // null atau { siswaId: guruId }

      // ─────────────────────────────────
      // GETTERS
      // ─────────────────────────────────

      /** Ambil siswa yang belum punya guru */
      getSiswaUnassigned: (dataSiswa = []) => {
        const { assignments } = get();
        return dataSiswa.filter((s) => !assignments[s.id]);
      },

      /** Hitung jumlah siswa aktif per guru */
      getLoadPerGuru: (dataGuru = []) => {
        const { assignments } = get();
        const load = {};
        dataGuru.forEach((g) => (load[g.code] = 0));
        Object.values(assignments).forEach((gCode) => {
          if (load[gCode] !== undefined) load[gCode]++;
        });
        return load;
      },

      /** Sisa kapasitas guru */
      getSisaKapasitas: (dataGuru = []) => {
        const { kapasitasGuru } = get();
        const load = get().getLoadPerGuru(dataGuru);
        return dataGuru.reduce((acc, g) => {
          acc[g.code] = (kapasitasGuru[g.code] || 5) - (load[g.code] || 0);
          return acc;
        }, {});
      },

      // ─────────────────────────────────
      // ACTION — Set kapasitas guru (HUBIN)
      // ─────────────────────────────────
      setKapasitasGuru: (guruCode, kapasitas) =>
        set((state) => ({
          kapasitasGuru: { ...state.kapasitasGuru, [guruCode]: kapasitas },
        })),

      // ─────────────────────────────────
      // ACTION — Manual assign
      // ─────────────────────────────────
      assignManual: (siswaId, guruCode) =>
        set((state) => ({
          assignments: { ...state.assignments, [siswaId]: guruCode },
          previewAssignments: null,
        })),

      // ─────────────────────────────────
      // ACTION — Cabut assignment
      // ─────────────────────────────────
      unassign: (siswaId) =>
        set((state) => {
          const next = { ...state.assignments };
          delete next[siswaId];
          return { assignments: next };
        }),

      // ─────────────────────────────────
      // ACTION — Generate Auto-Assign Preview
      // Algoritma: Jurusan → Kapasitas Sisa → Jarak (Haversine) / Area → Alfabetis
      // ─────────────────────────────────
      generateAutoAssign: (dataGuru, dataSiswa, perusahaanPKL, lokasiSiswa = {}, config = { prioritasWaliKelas: true, pemerataanArea: true }, mode = 'unassigned') => {
        const { assignments, kapasitasGuru } = get();
        const kapasitasGlobal = 5;

        // Tentukan siswa target berdasarkan mode
        const targetSiswa =
          mode === 'incremental'
            ? dataSiswa.filter((s) => !assignments[s.id])
            : dataSiswa; // reset total

        if (targetSiswa.length === 0) return { success: false, reason: 'no_unassigned' };

        // Working copy assignments (start dari existing jika incremental)
        const workingAssignments =
          mode === 'incremental' ? { ...assignments } : {};

        // Working load counter
        const workingLoad = { ...get().getLoadPerGuru(dataGuru) };
        if (mode === 'full') dataGuru.forEach((g) => (workingLoad[g.code] = 0));

        const result = []; // Array preview items

        for (const siswa of targetSiswa) {
          // 1. Ambil semua guru, filter yang punya kapasitas
          const guruTersedia = dataGuru.filter(
            (g) => workingLoad[g.code] < (kapasitasGuru[g.code] || kapasitasGlobal)
          );
          if (guruTersedia.length === 0) {
            result.push({ siswaId: siswa.id, guruCode: null, reason: 'no_capacity' });
            continue;
          }

          // 3. Kalkulasi Skor untuk setiap guru
          const guruDenganSkor = guruTersedia.map((g) => {
            const sisaKap = (kapasitasGuru[g.code] || kapasitasGlobal) - workingLoad[g.code];

            // Hitung jarak (untuk prioritas pemerataan area)
            const perusahaan = perusahaanPKL.find((p) => p.id === siswa.perusahaanId);
            const siswaLat = lokasiSiswa[siswa.id]?.lat ?? perusahaan?.lat ?? SEKOLAH_COORDS.lat;
            const siswaLng = lokasiSiswa[siswa.id]?.lng ?? perusahaan?.lng ?? SEKOLAH_COORDS.lng;

            const centroid = getGuruCentroid(g.code, workingAssignments, lokasiSiswa) ?? SEKOLAH_COORDS;
            const jarak = haversineDistance(siswaLat, siswaLng, centroid.lat, centroid.lng);

            // Hitung Total Skor
            let skor = 0;
            
            // Base score: Sisa kapasitas
            skor += sisaKap * 10;
            
            // Soft Constraint: Jurusan sama dapat boost besar
            const isSejurusan = (g.jurusan || g.major || g.preferredMajor) === (siswa.jurusan || siswa.major);
            if (isSejurusan) skor += 1000;
            
            // Tambahan skor untuk prioritas wali kelas/beban mengajar
            if (config.prioritasWaliKelas) {
              if (g.waliKelas === (siswa.kelas || siswa.className)) skor += 500; // Boost signifikan
              
              // Akali dari beban mengajar jika ada
              if (g.targetGrade && (siswa.kelas || siswa.className)?.includes(g.targetGrade)) skor += 50; 
            }
            
            // Tambahan skor untuk pemerataan area (jarak makin dekat, skor makin tinggi)
            if (config.pemerataanArea) {
              // Misal, jika jarak lebih dekat dari 2km, dapat boost. Jika jauh, pinalti ringan.
              // haversineDistance mengembalikan meter
              skor -= (jarak / 100); 
            }

            return { guru: g, sisaKap, jarak, skor };
          });

          // 4. Sort berdasarkan skor tertinggi
          guruDenganSkor.sort((a, b) => {
            if (b.skor !== a.skor) return b.skor - a.skor;
            // Tie breaker: Alfabetis
            return (a.guru.nama || a.guru.name || '').localeCompare(b.guru.nama || b.guru.name || '');
          });

          const chosen = guruDenganSkor[0].guru;
          workingAssignments[siswa.id] = chosen.id;
          workingLoad[chosen.id] = (workingLoad[chosen.id] || 0) + 1;

          result.push({
            siswaId: siswa.id,
            guruId: chosen.id,
            reason: 'assigned',
            skorDetail: guruDenganSkor.map((g) => ({
              guruId: g.guru.id,
              guruNama: g.guru.nama || g.guru.name,
              sisaKap: g.sisaKap,
              jarak: Math.round(g.jarak),
              terpilih: g.guru.id === chosen.id,
            })),
          });
        }

        set({ previewAssignments: workingAssignments, autoAssignResult: result });
        return { success: true, result };
      },

      // ─────────────────────────────────
      // ACTION — Terapkan preview (setelah HUBIN konfirmasi)
      // ─────────────────────────────────
      applyPreview: () =>
        set((state) => ({
          assignments: { ...state.previewAssignments },
          previewAssignments: null,
          autoAssignResult: null,
        })),

      // Batalkan preview
      cancelPreview: () =>
        set({ previewAssignments: null, autoAssignResult: null }),

      autoAssignResult: null,
    }),

    {
      name: 'pkl-penugasan-guru',
      partialize: (state) => ({
        assignments: state.assignments,
        kapasitasGuru: state.kapasitasGuru,
      }),
    }
  )
);

export default usePenugasanStore;

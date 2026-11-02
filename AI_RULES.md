# AI ASSISTANT RULES - STRICT COMPLIANCE

Kamu adalah asisten coding dengan mode hemat token maksimal dan kepatuhan kode tingkat tinggi. Patuhi aturan ini tanpa pengecualian:

- **ZERO FLUFF:** Dilarang keras menggunakan sapaan ("Halo"), kalimat penutup ("Semoga membantu"), atau basa-basi.
- **DIRECT ANSWER:** Jawab langsung ke inti masalah secara terstruktur.
- **CODE ONLY:** Output hanya kode yang diubah/relevan. Jangan mereproduksi seluruh file jika tidak diminta.
- **NO EXPLANATION:** Jangan jelaskan teori panjang lebar kecuali diminta ("JELASKAN").
- **BAHASA:** Gunakan Bahasa Indonesia yang ringkas, presisi, dan padat.
- **FORMAT KODE:** Selalu sertakan nama file dan nomor baris yang diubah dengan format link markdown clickable.
- **ROOT CAUSE FIRST:** Identifikasi dan perbaiki akar masalah bersama (shared util/engine), bukan hanya menambal gejala (*symptom*).

---

## 1. Stack Proyek Terkini
- **Frontend:** React 19 + Vite 8 + TailwindCSS + Zustand + Lucide React + Base UI / Radix UI
- **PWA & Offline:** Vite PWA (`vite-plugin-pwa`) + Service Worker + Native IndexedDB (`kurmon_offline_db`)
- **Backend:** Node.js ESM (`server/auth-server.mjs`, `server/routes/`) + PostgreSQL 16 (`pg` pool) + Telegram Bot API
- **State & Data Store:** Zustand (`useDataStore`, `useAppStore`, `useAuthStore`)
- **Mesin Presensi:** Hikvision Terminal ISAPI Client (Multi-device pull otomatis)
- **Export/Import:** SheetJS (`xlsx`) + jsPDF + FileSaver

---

## 2. Konvensi Struktur File
- **App Utama & Shell:** `src/AdminApp.jsx`, `src/App.jsx`
- **Router Konten Admin:** `src/components/admin/AdminContentRouter.jsx`
- **Dashboard Utama:** `src/pages/DashboardPage.jsx`
- **Halaman Tab Admin:** `src/pages/admin/tabs/` (`TabAkademik.jsx`, `TabTampilan.jsx`, `TabPesan.jsx`, `TabGenerate.jsx`, dll)
- **Halaman Master Data:** `src/pages/admin/master_data/` (`MasterDataGuru.jsx`, `MasterDataSiswa.jsx`, `MasterDataKelas.jsx`, dll)
- **Halaman Presensi & Hikvision:** `src/pages/admin/hikvision/` (`HikvisionStudentReport.jsx`, `HikvisionTeacherReport.jsx`, `HikvisionStaffReport.jsx`, `HikvisionDashboard.jsx`)
- **Halaman Kedisiplinan & Piket:** `src/pages/kedisiplinan/` (`AbsensiSiswa.jsx`, `PanelPiket.jsx`, `JurnalHarianGuru.jsx`, `RekapKedisiplinan.jsx`)
- **Komponen Maintenance & Notifikasi:** `src/components/maintenance/`, `src/components/notifications/`
- **Komponen UI Kustom:** `src/components/ui.jsx`, `src/components/CustomSelect.jsx`, `src/components/modals.jsx`
- **Styling Global & Engine:** `src/index.css`, `src/utils/branding.js`
- **Backend Modular Routes:** `server/routes/` (`auth.mjs`, `data.mjs`, `hikvision.mjs`, `students.mjs`, `teachers.mjs`, `staffs.mjs`, `settings.mjs`)

---

## 3. Aturan Integritas Sistem & Presensi (ATTENDANCE & SYSTEM INTEGRITY)
- **STANDAR BIOMETRIK SISWA:**
  - Presensi fisik sah siswa **HANYA** berasal dari **Fingerprint (`minor: 38`)** dan **Face ID (`minor: 75` / `104`)**.
  - Event kartu RFID (`minor: 1`) **DILARANG KERAS** untuk siswa guna mencegah praktik titip absen.
  - Jangan pernah menghapus atau memfilter event Face ID `minor: 75`.
- **NORMALISASI NIS:**
  - Pemetaan NIS 8-digit mesin ke NIS 9-digit master wajib menggunakan pemetaan aman suffix `slice(1)` tanpa tabrakan ID.
- **HIERARKI STATUS:**
  - Izin / Sakit / Dispensasi resmi di `kedisiplinan_absensi` memiliki prioritas di atas scan mesin. Status Alpa tidak boleh ditetapkan sebelum jam masuk presensi resmi berakhir.
- **PROTEKSI MODE MAINTENANCE:**
  - Mode maintenance wajib mempertahankan bypass khusus Super Admin di front-end dan back-end (HTTP 503 untuk non-admin).

---

## 4. Desain & Kustomisasi UI (STRICT UI COMPLIANCE)
- **KONSISTENSI KUSTOMISASI WEB (CARD STYLE ENGINE):**
  - Setiap card atau kontainer utama **WAJIB** menggunakan class `.ui-card` dengan border `border border-[var(--ui-card-border-color,transparent)]` dan shadow `shadow-[var(--ui-card-shadow,var(--ui-shadow-card))]`.
  - Wajib mematuhi pengaturan `appSettings.cardStyle` (`shadow-sm`, `border`, `flat`). Dilarang meng-hardcode border kasar gelap statis (`#d4dde9`).
- **BORDER RADIUS & SHADOW SYSTEM:**
  - Gunakan CSS variables: `var(--ui-radius-card)`, `var(--ui-radius-control)`, `var(--ui-radius-small)`, `rounded-[var(--ui-radius-pill)]`.
  - Gunakan layered soft shadows: `shadow-2xs`, `shadow-xs`, `var(--ui-shadow-card)`, `var(--ui-shadow-float)`.
- **BADGE INDIKATOR MATRIKS:**
  - Seluruh badge status presensi di tabel matriks wajib menggunakan komponen *badge pill pastel* modern (`rounded-[var(--ui-radius-small)]`, `shadow-2xs`). Dilarang kembali ke teks mentah tanpa badge.
- **TEMA WARNA & PALET:** Gunakan CSS variable/skema HSL (`var(--ui-primary)`, `var(--ui-accent)`, `bg-emerald-600`, `bg-teal-600`, `bg-slate-50`, backdrop-blur). Dilarang memakai warna polos dasar (*plain red*, *plain blue*, *plain green*).
- **NO NATIVE HTML DEFAULT COMPONENTS:** Dilarang menggunakan elemen HTML mentah tanpa style (seperti `<select>` native atau dialog native). Gunakan `CustomSelect` / `UISelect` dan `<Modal>`.
- **RESPONSIF DESKTOP & MOBILE:** Setiap perubahan UI WAJIB dioptimalkan untuk desktop maupun mobile.

---

## 5. Keamanan & Integritas Data
- **Password Hashing:** Password pengguna admin dan guru wajib menggunakan algoritma hash standar proyek (PBKDF2 via `src/utils/security.js`).
- **Data Sanitization:** Selalu bersihkan payload teks dan input berbahaya sebelum disimpan ke PostgreSQL.
- **State Hydration:** Pastikan sinkronisasi data antar tab/perangkat menggunakan hook `useAdminDatabaseSync` dan store yang tepat.

---

## 6. Prosedur Verifikasi Wajib
Sebelum menandai tugas selesai atau memberikan laporan akhir:
1. **Unit Tests:** Jalankan `npm test` dan pastikan seluruh test suite lolos 100% tanpa kegagalan (`0 failed`).
2. **Build Validation:** Jalankan `npm run build` dan pastikan proses build production berhasil tanpa error atau peringatan modul rusak.

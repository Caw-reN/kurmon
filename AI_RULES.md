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
- **PWA:** Vite PWA (`vite-plugin-pwa`) + Service Worker + Auto Geolocation & Notification Prompt (`PermissionPromptModal.jsx`)
- **Backend:** Node.js (Express) + PostgreSQL (`pg` pool) + Telegram Bot API
- **State & Data Store:** Zustand (`useDataStore`, `useAppStore`, `useAuthStore`)
- **Export/Import:** SheetJS (`xlsx`) + jsPDF + FileSaver

---

## 2. Konvensi Struktur File
- **App Utama & Shell:** `src/AdminApp.jsx`, `src/App.jsx`
- **Router Konten Admin:** `src/components/admin/AdminContentRouter.jsx`
- **Dashboard Utama:** `src/pages/DashboardPage.jsx`
- **Halaman Tab Admin:** `src/pages/admin/tabs/` (`TabAkademik.jsx`, `TabTampilan.jsx`, `TabPesan.jsx`, `TabGenerate.jsx`, dll)
- **Halaman Master Data:** `src/pages/admin/master_data/` (`MasterDataGuru.jsx`, `MasterDataSiswa.jsx`, `MasterDataKelas.jsx`, dll)
- **Halaman Kedisiplinan & Piket:** `src/pages/kedisiplinan/` (`AbsensiSiswa.jsx`, `PanelPiket.jsx`, `JurnalHarianGuru.jsx`, `RekapKedisiplinan.jsx`)
- **Komponen UI Kustom:** `src/components/ui.jsx`, `src/components/CustomSelect.jsx`, `src/components/modals.jsx`
- **Styling Global & Engine:** `src/index.css`, `src/utils/branding.js`
- **Backend & Integrasi Bot:** `server/index.js`, `server/telegramBot.js`, `server/database.js`

---

## 3. Desain & Kustomisasi UI (STRICT UI COMPLIANCE)
- **KONSISTENSI KUSTOMISASI WEB (CARD STYLE ENGINE):**
  - Setiap card, panel, atau kontainer utama **WAJIB** menggunakan class `.ui-card` dengan border dinamis `border border-[var(--ui-card-border-color,transparent)]` dan shadow dinamis `shadow-[var(--ui-card-shadow,var(--ui-shadow-card))]`.
  - Wajib mematuhi pengaturan Admin **Desain Card / Panel** (`appSettings.cardStyle`):
    - **`shadow-sm` ("Bayangan Mengambang / Elevated"):** Seluruh card tanpa outline garis luar (`border-color: transparent !important`), melayang dengan shadow halus (`var(--ui-card-shadow)`).
    - **`border` ("Garis Batas Halus / Clean Border"):** Seluruh card konsisten bergaris batas halus 1px (`1px solid var(--ui-border-soft, #e2e8f0)`).
    - **`flat` ("Warna Datar Padat"):** Seluruh card tanpa border dan tanpa shadow.
  - **Dilarang keras** meng-hardcode border kasar seperti `border border-[var(--ui-border-soft)]` dengan warna statis gelap (`#d4dde9`).
- **SINGLE UNIFIED CONTAINER CARD:** Satukan navigasi sub-tab, filter pencarian, tombol aksi, tabel desktop, kartu mobile, dan footer pagination ke dalam **1 Kontainer UI Card Terpadu** (`ui-card bg-white border border-[var(--ui-card-border-color,transparent)] rounded-[var(--ui-radius-card)] shadow-[var(--ui-card-shadow,var(--ui-shadow-card))] overflow-hidden`). Hindari membuat kartu-kartu kecil yang bertumpuk berantakan.
- **NO DUPLICATE HEADERS:** Dilarang meletakkan `PageHeader` ganda/bertumpuk di dalam child component jika parent component sudah memilikinya.
- **BORDER RADIUS & SHADOW SYSTEM:**
  - Gunakan CSS variables: `var(--ui-radius-card)`, `var(--ui-radius-control)`, `var(--ui-radius-small)`, `rounded-[var(--ui-radius-pill)]`.
  - Gunakan layered soft shadows: `shadow-2xs`, `shadow-xs`, `var(--ui-shadow-card)`, `var(--ui-shadow-float)`.
- **TEMA WARNA & PALET:** Gunakan CSS variable/skema HSL (`var(--ui-primary)`, `var(--ui-accent)`, `bg-emerald-600`, `bg-teal-600`, `bg-slate-50`, backdrop-blur) yang padu. Dilarang memakai warna polos dasar (*plain red*, *plain blue*, *plain green*) yang merusak estetika web.
- **NO NATIVE HTML DEFAULT COMPONENTS:** Dilarang menggunakan elemen HTML mentah tanpa style (seperti `<select>` native atau dialog native). WAJIB menggunakan `CustomSelect` / `UISelect` dan `<Modal>`.
- **RESPONSIF DESKTOP & MOBILE:** Setiap perubahan UI WAJIB dioptimalkan dan diuji untuk desktop maupun mobile (layout grid `lg:grid-cols-...`, tabel `hidden md:block`, card mobile `md:hidden`).

---

## 4. Keamanan & Integritas Data
- **Password Hashing:** Password pengguna admin dan guru wajib menggunakan algoritma hash standar proyek (PBKDF2 via `src/utils/security.js`).
- **Data Sanitization:** Selalu bersihkan payload teks dan input berbahaya sebelum disimpan ke PostgreSQL.
- **State Hydration:** Pastikan sinkronisasi data antar tab/perangkat menggunakan hook `useAdminDatabaseSync` dan store yang tepat.

---

## 5. Prosedur Verifikasi Wajib
Sebelum menandai tugas selesai atau memberikan laporan akhir:
1. **Unit Tests:** Jalankan `npm test` dan pastikan seluruh test suite lolos 100% tanpa kegagalan.
2. **Build Validation:** Jalankan `npm run build` dan pastikan proses build production berhasil tanpa error atau peringatan modul rusak.

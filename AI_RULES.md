# AI ASSISTANT RULES - STRICT COMPLIANCE

Kamu adalah asisten coding dengan mode hemat token maksimal. Patuhi aturan ini tanpa pengecualian:

- **ZERO FLUFF:** Dilarang keras menggunakan sapaan ("Halo"), kalimat penutup ("Semoga membantu"), atau basa-basi.
- **DIRECT ANSWER:** Jawab langsung ke inti masalah.
- **CODE ONLY:** Jika diminta memperbaiki bug atau menambah fitur, output HANYA baris atau fungsi kode yang diubah. JANGAN mereproduksi seluruh file jika tidak diminta.
- **NO EXPLANATION:** Jangan jelaskan teori atau cara kerja kodemu kecuali pengguna mengetik perintah "JELASKAN".
- **BAHASA:** Gunakan Bahasa Indonesia yang singkat dan padat.
- **FORMAT KODE:** Selalu sertakan nama file dan nomor baris yang diubah.
- **NO REPEAT:** Jangan ulangi kode yang tidak diubah.
- **MINIMAL PROSE:** Maksimal 1-2 kalimat di luar blok kode.

## Stack Proyek
- React 19 + Vite + TailwindCSS
- Zustand (state management)
- Lucide React (icons)
- Base UI / Radix UI (select, modal)
- Node.js PostgreSQL auth & sync backend

## Konvensi Proyek & Struktur File
- Komponen admin: `src/components/admin/`
- Tabel renderer master: `src/components/admin/useAdminTableRenderer.jsx`
- Halaman master data: `src/pages/admin/master_data/` (`MasterDataGuru.jsx`, `MasterDataSiswa.jsx`, dll)
- Halaman kedisiplinan & piket: `src/pages/kedisiplinan/` (`AbsensiSiswa.jsx`, `PanelPiket.jsx`, `DashboardBPBK.jsx`, `RekapKedisiplinan.jsx`)
- Halaman tab: `src/pages/admin/tabs/`
- Halaman pengaturan: `src/pages/admin/pengaturan/`
- Store: `src/store/useAppStore.js`, `src/store/useAuthStore.js`, `src/store/monitoring/authStore.js`
- Router utama: `src/components/admin/AdminContentRouter.jsx`
- App utama: `src/AdminApp.jsx`
- Sync database hook: `src/hooks/useAdminDatabaseSync.js`
- Import PageHeader langsung: `import { PageHeader } from '../../../components/monitoring/ui/index.js'`
- Lazy load komponen berat dengan `React.lazy` + `<Suspense>`

## Desain & Kustomisasi UI (STRICT UI COMPLIANCE)
- **KONSISTENSI TAMPILAN KUSTOMISASI:** Ketika melakukan perbaikan bug, refactoring, atau penambahan fitur, **WAJIB TETAP MENGIKUTI TAMPILAN KUSTOMISASI WEB YANG ADA** (shadow, border-radius, warna, gradient, glassmorphism, typography, dan micro-animation).
- **SINGLE UNIFIED CONTAINER CARD:** Satukan navigasi sub-tab, filter pencarian, tombol aksi, tabel desktop, kartu mobile, dan footer pagination ke dalam **1 Kontainer UI Card Terpadu** (`ui-card bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] shadow-xs overflow-hidden`). Dilarang membuat boks card bertumpuk yang terpisah-pisah.
- **NO DUPLICATE HEADERS:** Dilarang meletakkan `PageHeader` ganda/bertumpuk di dalam child component jika parent component sudah memiliki `PageHeader`.
- **BORDER RADIUS & SHADOW:** Selalu gunakan variabel radius (`--ui-radius`, `rounded-[var(--ui-radius-small)]`, `rounded-2xl`, `rounded-3xl`) serta shadow modern (`shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-xl`, `shadow-2xs`). Dilarang mengganti menjadi border kasar tanpa radius atau shadow datar tanpa style.
- **TEMA WARNA & PALET:** Gunakan CSS variable/skema HSL (`var(--ui-primary)`, `var(--ui-primary-hover)`, `bg-emerald-600`, `bg-teal-600`, `bg-slate-50`, backdrop-blur) yang padu. Dilarang memakai warna polos dasar (plain red, plain blue, plain green) yang merusak estetika premium web.
- **RESPONSIF DESKTOP & MOBILE:** Setiap perubahan UI WAJIB dioptimalkan dan diuji secara sempurna untuk desktop maupun mobile (layout grid `lg:grid-cols-...`, tabel `hidden md:block`, card mobile `md:hidden`).
- **LAYOUT & INTERAKSI:** Dilarang merusak atau menghilangkan elemen kustomisasi visual (badge, hero header, card KPI, hover tone) yang telah diterapkan sebelumnya saat melakukan perbaikan logika atau fitur.
- **NO NATIVE HTML DEFAULT COMPONENTS:** Dilarang menggunakan elemen HTML bawaan tanpa style (seperti `<select>`, modal/dialog bawaan browser). WAJIB menggunakan komponen kustom yang sudah ada (misal: `CustomSelect` untuk dropdown, `<Modal>` dari `src/components/ui.jsx`).
- **REUSE EXISTING STYLES:** Dilarang menulis/membuat CSS atau *class* baru yang membengkak jika *style* tersebut sudah ada di sistem *Tailwind* atau *UI tokens* yang digunakan. Gunakan apa yang sudah tersedia agar desain konsisten.

# AGENTS CUSTOMIZATION RULES

## 1. Proteksi Logika & Fitur yang Sudah Bebas Bug (ZERO REGRESSION POLICY)
- **DILARANG MERUBAH FITUR YANG SUDAH BEBAS BUG:** Dilarang keras merombak, menghapus, mengganti arsitektur, atau mengubah logika/fungsi/komponen yang sudah berjalan stabil, teruji, dan bebas bug tanpa instruksi eksplisit dari user.
- **SURGICAL & ISOLATED CHANGES:** Setiap perbaikan bug atau penambahan fitur baru WAJIB dilakukan secara terfokus (bedah mikro/terisolasi) pada bagian yang bermasalah saja, tanpa efek samping (*side effects*) yang merusak alur kerja (*workflow*) yang sudah ada.
- **PRESERVASI KONTRAK DATA & SCHEMA:** Dilarang mengubah struktur skema database PostgreSQL (`app_data`, `mst_students`, `kedisiplinan_absensi`, `hikvision_logs`, dll.), tipe data kolom, atau kontrak API tanpa otorisasi langsung.

## 2. Standar Integritas Sistem Presensi & Hikvision (ATTENDANCE INTEGRITY)
- **HIERARKI STATUS KEHADIRAN:** Surat Izin, Sakit, atau Dispensasi resmi yang tercatat di `kedisiplinan_absensi` memiliki prioritas lebih tinggi (*precedence*) di atas data scan mesin fisik. Siswa/Guru/Karyawan yang sudah disetujui izin/sakit TIDAK BOLEH tertimpa menjadi Hadir atau Alpa.
- **LOGIKA KALENDER AKADEMIK & LIBUR:** Evaluasi libur wajib memeriksa tanggal, kategori, dan pengecualian kelas (`dailyClassSchedule`) secara presisi melalui helper `getHolidayInfoForDate`. Dilarang meliburkan kelas atau tanggal yang tidak terdaftar dalam rotasi libur harian kalender.
- **BATAS WAKTU & PERHITUNGAN KETERLAMBATAN:** Pengaturan jam presensi (`masuk_start`, `masuk_end`, `terlambat_end`, `pulang_start`) dari `appSettings` harus selalu dipatuhi. Status Alpa tidak boleh dievaluasi atau ditetapkan sebelum jam masuk presensi resmi berakhir.
- **INTEGRASI TELEGRAM & WHATSAPP:** Format pesan notifikasi HTML/Markdown, fungsi *escaping* karakter khusus, dan parser normalisasi kelas (misal: "10 tkj 1" menjadi "X TKJ 1", pengenalan tanggal bahasa Indonesia) yang sudah teruji di `telegram-bot.mjs` harus selalu dipertahankan.

## 3. Desain & Kustomisasi UI (STRICT UI COMPLIANCE)
- **KONSISTENSI TAMPILAN KUSTOMISASI:** Ketika melakukan perbaikan bug, refactoring, atau penambahan fitur, **WAJIB TETAP MENGIKUTI TAMPILAN KUSTOMISASI WEB YANG ADA** (shadow, border-radius, warna, gradient, glassmorphism, typography, dan micro-animation).
- **BORDER RADIUS & SHADOW:** Selalu gunakan variabel radius (`--ui-radius`, `rounded-[var(--ui-radius-small)]`, `rounded-2xl`, `rounded-3xl`) serta shadow modern (`shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-xl`, `shadow-2xs`). Dilarang mengganti menjadi border kasar tanpa radius atau shadow datar tanpa style.
- **TEMA WARNA & PALET:** Gunakan CSS variable/skema HSL (`var(--ui-primary)`, `var(--ui-primary-hover)`, `bg-emerald-600`, `bg-teal-600`, `bg-slate-50`, backdrop-blur) yang padu. Dilarang memakai warna polos dasar (plain red, plain blue, plain green) yang merusak estetika premium web.
- **BADGE INDIKATOR & LEGENDA MATRIKS:** Seluruh indikator status presensi (Siswa, Guru, Karyawan) di header maupun legenda bawah tabel matriks wajib menggunakan komponen *badge pill pastel* modern dengan border tipis dan dot/icon terpusat (`rounded-[var(--ui-radius-small)]`, `shadow-2xs`). Dilarang kembali ke tampilan teks mentah tanpa badge kapsul.
- **RESPONSIF DESKTOP & MOBILE:** Setiap perubahan UI WAJIB dioptimalkan dan diuji secara sempurna untuk desktop maupun mobile (layout grid `lg:grid-cols-...`, tabel `hidden md:block`, card mobile `md:hidden`, wrapper `flex flex-col md:flex-row`).
- **LAYOUT & INTERAKSI:** Dilarang merusak atau menghilangkan elemen kustomisasi visual (badge, hero header, card KPI, hover tone) yang telah diterapkan sebelumnya saat melakukan perbaikan logika atau fitur.

## 4. Standar Verifikasi & Deployment (VERIFICATION COMPLIANCE)
- **UNIT TESTS WAJIB LULUS:** Sebelum perubahan dianggap selesai, wajib menjalankan `npm test` dan memastikan 100% test case lulus (`0 failed`).
- **PRODUCTION BUILD WAJIB BERHASIL:** Wajib menjalankan `npm run build` dan memverifikasi tidak ada error sintaks, kesalahan impor, atau kegagalan bundler Vite.

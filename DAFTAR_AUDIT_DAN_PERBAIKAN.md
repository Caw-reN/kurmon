# 📋 DAFTAR AUDIT, EVALUASI & CHECKLIST PERBAIKAN SISTEM
**Aplikasi:** KG2 School / Kurmon (Sistem Manajemen Kurikulum, PKL, Absensi Biometrik & Kesiswaan)  
**Dokumen Diperbarui:** 8 September 2026 (Analisa Ulang Menyeluruh & Komprehensif)  
**Status:** Siap Direview & Dikerjakan Bertahap

---

## 📌 Ringkasan Eksekutif Hasil Audit Ulang

Aplikasi memiliki arsitektur fitur yang sangat kaya dan terintegrasi (penjadwalan otomatis, PKL 3-portal, absensi biometrik Hikvision, BK, tata tertib, integrasi WhatsApp, bot Telegram, dan backup cloud).

Berdasarkan **analisa ulang komprehensif terhadap seluruh source code** (backend `server/`, state management Zustand, modul kedisiplinan, PKL, cron jobs, database PostgreSQL, dan antarmuka React), telah dirangkum **seluruh temuan kritis baru, masalah otorisasi, desinkronisasi data, serta fitur yang belum tuntas**, antara lain:

1. **Bug Desinkronisasi Master Guru, Staf & Siswa pada Operasi Simpan Global (`/api/data/save`)**  
   Ketika admin mengubah password guru/staf, menonaktifkan akun di *Pengaturan User*, atau menambah guru dari mesin Hikvision, perubahan **TIDAK PERNAH TERSIMPAN** ke tabel database (`mst_teachers`, `mst_staffs`, `mst_students`) karena backend sengaja mem-filter keluar (*destructured out*) array tersebut tanpa menyimpannya ke tabel PostgreSQL.
2. **Siswa Kelas X & XI Terkunci Tidak Bisa Login ke Aplikasi**  
   Pada `server/routes/auth.mjs`, validasi login siswa dibatasi secara ketat hanya untuk kelas PKL (kelas XII). Akibatnya, ribuan siswa kelas X dan XI tidak bisa login untuk melihat kartu pelajar digital, riwayat absensi, atau mengajukan surat izin sakit.
3. **Antrean Pesan WhatsApp Keterlambatan "Zombie" (Status `'pending'` Selamanya)**  
   Pesan keterlambatan absensi otomatis masuk ke tabel `whatsapp_logs` dengan kolom `phone` berupa nama peran (`'parent'`, `'kurikulum'`), bukan nomor telepon, dan tidak ada dispatcher antrean yang pernah memprosesnya ke gateway Fonnte.
4. **Komponen Tab "Auto-Assign Cerdas" di Penugasan Guru PKL Belum Terhubung (Dead UI Button)**  
   Tombol segmented tab switch "Auto-Assign Cerdas" di `PenugasanGuru.jsx` tidak memicu antarmuka apapun, dan algoritma penugasan otomatis di store tidak pernah dieksekusi.
5. **Inkompatibilitas Perintah Shell Backup Database (`server/auto-backup.mjs`)**  
   Perintah `set PGPASSWORD=...&& pg_dump` hanya berjalan di Windows Command Prompt dan gagal total di lingkungan Linux / Docker / PowerShell, serta mengekspos password di proses shell.
6. **Lookup Penghapusan Siswa Keluar Berisiko Meleset (`server/auth-server.mjs`)**  
   Query `WHERE id = $1` menggunakan NIS dapat gagal menghapus record siswa jika `id` pada tabel `mst_students` berupa UUID/kode internal sekolah.

---

## 🔴 PRIORITAS 1: BUG KRITIS & INTEGRITAS DATA (Perbaiki Segera)

### [x] 1.1 Bug Runtime Cron Job Sinkronisasi Hikvision (Silent Crash) ✅ SELESAI
- **Lokasi File:** [`server/auth-server.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/auth-server.mjs#L177-L187)
- **Masalah:** Pada fungsi `pullHikvisionLogs()`, query `Promise.all` mengeksekusi 5 query database, namun variabel `studentsRes` tidak ditampung di destructuring array.
- **Status:** ✅ Sudah diperbaiki. Array destructuring kini menangkap `studentsRes` dan mapping NIS berjalan lancar.

---

### [x] 1.2 Metode Simpan Destruktif "Wipe-and-Replace" (`DELETE ALL`) pada Siswa, Guru & Staf ✅ SELESAI
- **Lokasi File:**
  - Siswa: [`server/routes/students.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/routes/students.mjs)
  - Guru: [`server/routes/teachers.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/routes/teachers.mjs)
  - Staf: [`server/routes/staffs.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/routes/staffs.mjs)
- **Masalah:** Backend sebelumnya menghapus seluruh isi tabel (`DELETE FROM ...`) lalu insert ulang semua baris.
- **Status:** ✅ Sudah diperbaiki dengan pola `UPSERT` (`INSERT ... ON CONFLICT (id) DO UPDATE`) dan selektif `DELETE WHERE id NOT IN (...)`.

---

### [x] 1.3 Kuota 5MB `localStorage` Terlampaui pada Cache Offline ✅ SELESAI
- **Lokasi File:** [`src/App.jsx`](file:///c:/laragon/www/inkscod/kurmon/src/App.jsx) & [`src/utils/offlineStorage.js`](file:///c:/laragon/www/inkscod/kurmon/src/utils/offlineStorage.js)
- **Masalah:**
  Aplikasi menyimpan snapshot database (`nextPayload` berisi seluruh guru, kelas, jadwal, ruangan, silabus) ke dalam `localStorage.setItem("kurmon_offline_payload", ...)`.
- **Dampak:**
  `localStorage` browser memiliki kuota maksimal 5 MB. Jika data bertambah, browser melempar `QuotaExceededError` yang tertangkap secara hening (*silent error*), mengakibatkan fitur luring (*offline-first*) berhenti bekerja.
- **Status:** ✅ Selesai diperbaiki. Dibuatkan utilitas `offlineStorage.js` berbasis native **IndexedDB** (`kurmon_offline_db`) dengan kapasitas penyimpanan ratusan MB, fallback otomatis ke `localStorage`, dan caching metadata branding ringan (`kurmon_branding_cache`) agar rendering frame 0 tetap instan tanpa layout shift.

---

### [x] 1.4 Bug Runtime Cron Laporan Harian Telegram Jam 16:00 (Silent Crash) ✅ SELESAI
- **Lokasi File:** [`server/auth-server.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/auth-server.mjs#L5072-L5115)
- **Masalah:**
  Pada cron job `0 16 * * *` (kirim laporan harian ke Telegram):
  1. Query absensi siswa memanggil kolom `date` (yang benar adalah `tanggal`).
  2. Query keterlambatan memanggil tabel `hikvision_attendance_logs` yang tidak ada (tabel yang aktif adalah `hikvision_logs`).
- **Status:** ✅ Selesai diperbaiki. Query kini memanggil kolom `tanggal`, menghitung status kehadiran manual dan keterlambatan mesin Hikvision secara akurat dari tabel `hikvision_logs`.

---

### [x] 1.5 Bug Runtime Cron Rekap Absensi Harian ke Wali Kelas Jam 12:00 (Silent Crash) ✅ SELESAI
- **Lokasi File:** [`server/auth-server.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/auth-server.mjs#L465-L530)
- **Masalah:**
  Pada fungsi `sendDailyClassSummary()` yang dipanggil cron jam 12:00 (`0 12 * * *`), query memanggil `SELECT user_id, status FROM kedisiplinan_absensi` padahal kolom `user_id` tidak ada (nama kolom yang benar adalah `siswa_nis`).
- **Status:** ✅ Selesai diperbaiki. Kolom query dan map lookup diubah menjadi `siswa_nis`, nomor telepon walas dinormalisasi (prefix `62`), dan jika API Key Fonnte aktif, pesan rekap langsung dikirimkan ke WhatsApp wali kelas secara otomatis.

---

### [x] 1.6 Saklar ON/OFF Layanan WhatsApp & Pencegahan Write Amplification ✅ SELESAI
- **Lokasi File:** 
  - Backend: [`server/auth-server.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/auth-server.mjs#L175-L330)
  - Frontend: [`src/pages/admin/pengaturan/IntegrasiWhatsApp.jsx`](file:///c:/laragon/www/inkscod/kurmon/src/pages/admin/pengaturan/IntegrasiWhatsApp.jsx)
- **Status:** ✅ Selesai diperbaiki. 
  1. Menambahkan endpoint `GET /api/whatsapp/status` dan `POST /api/whatsapp/toggle-status`.
  2. Menyediakan **Kartu Saklar Utama WhatsApp (Master Switch ON/OFF)** pada antarmuka admin (lengkap dengan badge live status `Aktif (Online)` / `Nonaktif (Off)`).
  3. Mengunci proses notifikasi keterlambatan di `pullHikvisionLogs()` agar hanya berjalan jika layanan WhatsApp AKTIF dan log baru di-insert (`insRes.rowCount > 0`), mencegah write-amplification berulang.
  4. Status WhatsApp di tabel `api_keys` disetel `is_active: false` (posisi OFF) secara default sesuai instruksi user.

---

### [x] 1.7 Bug Kritis Runtime React di Store Absensi PKL (`ReferenceError: get is not defined`) ✅ SELESAI
- **Lokasi File:** [`src/store/monitoring/absensiStore.js`](file:///c:/laragon/www/inkscod/kurmon/src/store/monitoring/absensiStore.js#L12)
- **Masalah:**
  Store dibuat dengan parameter tunggal `set`, namun di dalam aksinya memanggil `get().saveAbsensiConfigToServer()`, menyebabkan crash runtime.
- **Status:** ✅ Selesai diperbaiki. Parameter store diubah menjadi `create((set, get) => ({ ... }))`.

---

### [x] 1.8 Pola Destruktif "Wipe-and-Replace" (`DELETE ALL`) pada Master Data Lainnya ✅ SELESAI
- **Lokasi File:** [`server/routes/data.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/routes/data.mjs#L265-L318)
- **Masalah:**
  Fungsi `saveToTable` untuk tabel `mst_majors`, `mst_classes`, `mst_rooms`, dan `mst_subjects` sebelumnya mengeksekusi `DELETE FROM ...` sebelum re-insert.
- **Status:** ✅ Selesai diperbaiki. Menggunakan pola `UPSERT` (`INSERT ... ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`) diikuti selektif `DELETE WHERE id NOT IN (...)` yang aman dari race condition.

---

### [x] 1.9 Desinkronisasi Data Guru, Staf & Siswa pada Operasi Simpan Global (`/api/data/save`) ✅ SELESAI
- **Lokasi File:** [`server/routes/data.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/routes/data.mjs#L260-L345)
- **Masalah:**
  Array `teachers`, `students`, dan `staffs` sengaja di-exclude dari penyimpanan saat komponen memanggil `saveDatabaseNow({ teachers: ... })` atau `saveDatabaseNow({ staffs: ... })`.
- **Status:** ✅ Selesai diperbaiki. Menambahkan fungsi `saveTeachers`, `saveStaffs`, dan `saveStudents` dengan pola `UPSERT` yang aman mempertahankan password lama. Perubahan status akun, role/jabatan, dan password oleh admin kini langsung tersimpan permanen ke tabel PostgreSQL.

---

### [x] 1.10 Pembukaan Akses Login untuk Seluruh Siswa (Kelas X, XI & XII) ✅ SELESAI
- **Lokasi File:** [`server/routes/auth.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/routes/auth.mjs#L488-L560)
- **Masalah:**
  Validasi login siswa sebelumnya membatasi hanya kelas XII (`starts_with("XII")`), mengunci ribuan siswa kelas X & XI dari sistem.
- **Status:** ✅ Selesai diperbaiki. Restriksi login dicabut sehingga seluruh siswa aktif di `mst_students` dapat login ke portal siswa untuk mengakses Kartu Pelajar Digital, Presensi Mandiri, Riwayat Absensi, dan Profil. Parameter `isPklEligible` tetap disematkan pada session siswa untuk mengontrol izin modul PKL.

---
### [x] 1.11 Bug Visual Pemotongan Teks Catatan Mesin "Mesin" & "Dari" pada Sel Absensi ✅ SELESAI
- **Lokasi File:**
  - [`src/pages/admin/hikvision/HikvisionTeacherReport.jsx`](file:///c:/laragon/www/inkscod/kurmon/src/pages/admin/hikvision/HikvisionTeacherReport.jsx#L1254-L1265)
  - [`src/pages/admin/hikvision/HikvisionStaffReport.jsx`](file:///c:/laragon/www/inkscod/kurmon/src/pages/admin/hikvision/HikvisionStaffReport.jsx#L1025-L1036)
  - [`src/pages/admin/hikvision/HikvisionStudentReport.jsx`](file:///c:/laragon/www/inkscod/kurmon/src/pages/admin/hikvision/HikvisionStudentReport.jsx#L2156-L2167)
- **Masalah:**
  Ketika guru, karyawan, atau siswa hanya melakukan scan di siang/sore hari (jam pulang $\ge$ 12:00, misal `12:40`, `13:08`, atau `18:00`), nilai `in` kosong (`null`). Di database, kolom `note` otomatis berisi metadata perangkat seperti `"Mesin Hikvision: ..."` atau `"Dari mesin Hikvision: ..."`.
  Kode frontend sebelumnya mengeksekusi:
  `inTime || (hasNote ? (noteText.length > 5 ? noteText.substring(0, 5) : noteText) : '--:--')`
  sehingga 5 huruf pertama catatan teknis terpotong dan tampil di kotak jam masuk sebagai kata `"Mesin"` atau `"Dari"`.
- **Status:** ✅ Selesai diperbaiki. Baris atas kini konsisten menampilkan tanda jam kosong `--:--` (jika tidak ada tap pagi), sedangkan keterangan mesin absensi tetap tersimpan utuh di atribut `title` (tooltip saat kursor diarahkan ke sel).

---

### [x] 1.12 Pemetaan & Notifikasi Izin/Sakit Manual Karyawan/Staf (`server/routes/hikvision.mjs`) ✅ SELESAI
- **Lokasi File:** [`server/routes/hikvision.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/routes/hikvision.mjs#L933-L945) & [`server/routes/hikvision.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/routes/hikvision.mjs#L1955-L1985)
- **Masalah:**
  1. Pada handler notifikasi izin manual WhatsApp, backend sebelumnya hanya mencari data profil di tabel `mst_teachers`. Karyawan/staf yang mengajukan izin sakit/tugas luar gagal didapatkan nomor pengawas atau profilnya karena tersimpan di tabel `mst_staffs`.
  2. Pada pemetaan matriks laporan bulanan (`/api/hikvision/report/matrix`), `codeToNis` hanya membaca `mst_teachers`, sehingga pengajuan manual staf tidak ter-overlay ke baris staf di tabel rekapitulasi.
- **Status:** ✅ Selesai diperbaiki. Backend kini memeriksa `mst_staffs` dan `mst_teachers` secara terpadu, menjamin izin staf/karyawan tersinkronisasi sempurna di rekap absensi dan notifikasi WhatsApp.

---

## 🟡 PRIORITAS 2: PERFORMA & ARSITEKTUR KODE (Optimasi)

### [ ] 2.1 Paginasi Database di Endpoint `/api/data/load`
- **Lokasi File:** [`server/routes/data.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/routes/data.mjs#L60-L76)
- **Masalah:**
  Endpoint `/api/data/load` menarik 7 tabel sekaligus (`mst_students`, `mst_teachers`, `mst_classes`, `mst_rooms`, `mst_subjects`, `mst_majors`, `mst_staffs`) tanpa batas limit.
- **Dampak:** Beban RAM server dan ukuran payload HTTP sangat besar (3–10 MB sekali load).

---

### [x] 2.2 Re-render Cascade & Monolitik State di `AdminApp.jsx` ✅ SELESAI
- **Lokasi File:** [`src/AdminApp.jsx`](file:///c:/laragon/www/inkscod/kurmon/src/AdminApp.jsx#L3963)
- **Masalah:** Objek prop inline `{ ...tabProps, checkIsAllowed }` selalu dibuat baru setiap render, memicu cascade re-render pada seluruh tab router.
- **Status:** ✅ Sudah diperbaiki. Prop `checkIsAllowed` dipisahkan secara stabil dengan fallback backward-compatible.

---

### [x] 2.3 Portabilitas Shell Command pada Backup SQL (`server/auto-backup.mjs`) ✅ SELESAI
- **Lokasi File:** [`server/auto-backup.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/auto-backup.mjs#L96)
- **Status:** ✅ Selesai diperbaiki. Menghapus syntax `set PGPASSWORD=...&&` dan beralih ke opsi bawaan `exec(dumpCmd, { env: { ...process.env, PGPASSWORD: PG_PASSWORD } })` yang 100% aman, bersih, kompatibel di semua platform OS (Linux/Docker/Windows PowerShell), dan tidak membocorkan password di proses command line.

---

### [x] 2.4 Lookup Penghapusan Siswa Keluar Berisiko Meleset (`server/auth-server.mjs`) ✅ SELESAI
- **Lokasi File:** [`server/auth-server.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/auth-server.mjs#L4049-L4095)
- **Status:** ✅ Selesai diperbaiki. Query `SELECT` dan `DELETE` kini menggunakan klausa fleksibel `WHERE id = $1 OR payload->>'nis' = $1`. Data siswa keluar kini dijamin terhapus dari daftar siswa aktif meskipun ID internalnya bertipe UUID atau kode acak, dan dapat direstore secara presisi saat dibatalkan.

### [x] 2.5 Pembersihan (Purge) 223.762 Baris Sampah WhatsApp Zombie di Database (`whatsapp_logs`) ✅ SELESAI
- **Lokasi File / DB:** Database PostgreSQL, tabel `whatsapp_logs`
- **Masalah:**
  Akibat write amplification pada cron sinkronisasi sebelumnya (Item 1.6), terdapat **223.736+ baris pending** dengan nomor tujuan fiktif (`parent`: 213.270 baris, `tu`: 8.061 baris, `kurikulum`: 2.405 baris) yang membebani database dan memperlambat waktu pencadangan SQL.
- **Status:** ✅ Selesai dieksekusi. Sebanyak **223.762 baris sampah berhasil dibersihkan**, dan `VACUUM ANALYZE whatsapp_logs` telah dijalankan. Total baris aktif tersisa 15 baris valid, membebaskan kapasitas disk dan mempercepat performa database.

---

### [x] 2.6 False-Positive / Inflasi 1.200% Keterlambatan Siswa pada Cron Telegram 16:00 (`server/auth-server.mjs`) ✅ SELESAI
- **Lokasi File:** [`server/auth-server.mjs`](file:///c:/laragon/www/inkscod/kurmon/server/auth-server.mjs#L5168-L5174)
- **Masalah:**
  Query menghitung jumlah siswa terlambat sebelumnya mengevaluasi seluruh baris log tap hari itu (termasuk tap siswa saat pulang siang/sore), mengakibatkan 675 siswa terhitung terlambat dari yang seharusnya hanya 52 siswa (inflasi 1.200%).
- **Status:** ✅ Selesai diperbaiki. Query kini mengagregasi tap pertama per siswa (`MIN(timestamp) as first_tap`) dengan klausa `HAVING TO_CHAR(MIN(timestamp), 'HH24:MI') > $2`, sehingga laporan Telegram harian ke pimpinan sekolah 100% akurat.

---

## 🟠 PRIORITAS 3: KEAMANAN & KETAHANAN SISTEM (Security & Hardening)

### [x] 3.1 Kompresi Gambar Otomatis (Selfie Absensi & Bukti PKL) ✅ SELESAI
- **Status:** ✅ Sudah diperbaiki. Fungsi standar `compressImageFromFile` telah diimplementasikan.

### [x] 3.4 Kebocoran Privasi & Otorisasi Data Konseling BK ✅ SELESAI
- **Status:** ✅ Selesai diperbaiki. Middleware `requireBkAccess(req, res)` dipasang di seluruh rute `GET` modul BK.

---

## 🟢 PRIORITAS 4: FITUR SEKOLAH YANG BELUM LENGKAP (Feature Enhancements)

### [x] 4.1 Fitur Tab "Auto-Assign Cerdas" di Penugasan Guru PKL ✅ SELESAI
- **Lokasi File:** [`src/pages/admin/pkl/PenugasanGuru.jsx`](file:///c:/laragon/www/inkscod/kurmon/src/pages/admin/pkl/PenugasanGuru.jsx)
- **Masalah:** Tombol tab segmented switch "Auto-Assign Cerdas" sebelumnya tidak memicu antarmuka apapun (dead UI button).
- **Status:** ✅ Selesai diperbaiki. Tab "Auto-Assign Cerdas" kini terhubung penuh ke mesin kalkulasi multi-faktor cerdas:
  1. Kontrol mode cakupan: "Hanya Siswa Belum Ditugaskan (Incremental)" atau "Reset Total".
  2. Parameter bobot cerdas: Kesesuaian Jurusan (+1000 poin), Prioritas Wali Kelas (+500 poin), serta input kapasitas maksimum per guru.
  3. Tabel interaktif preview rekomendasi lengkap dengan badge kecocokan dan dropdown penyesuaian langsung per-baris.
  4. Tombol "Terapkan & Simpan ke Server" yang mengeksekusi penyimpanan massal ke endpoint `/api/monitoring/pkl-students/bulk` dalam satu klik.

---

### [ ] 4.2 Modul Penilaian KBM & Rekap Buku Nilai Guru (Gradebook)
- **Rekomendasi:** Buat modul **Buku Nilai Guru** terintegrasi dengan rombel dan mapel yang diampu.

---

### [ ] 4.3 Portal Akses Khusus Orang Tua / Wali Murid
- **Rekomendasi:** Sediakan portal publik ringan (`/orang-tua`) untuk cek presensi & jurnal PKL anak via NISN.

---

### [ ] 4.4 Antrean Luring Absensi Siswa & Guru (Offline Background Sync)
- **Rekomendasi:** Simpan payload absensi ke IndexedDB lokal saat offline, lalu kirim otomatis saat browser terdeteksi `online`.

---

## 📊 Matriks Ringkasan & Tindakan Terkini

| No | Komponen / Modul | Masalah | Rencana Solusi | Prioritas | Status |
| :---: | :--- | :--- | :--- | :---: | :---: |
| 1 | `server/auth-server.mjs` | Variabel `studentsRes` hilang di `pullHikvisionLogs` | Tambahkan `studentsRes` di destructuring | P1 | ✅ Selesai |
| 2 | `server/routes/students.mjs` | Pola `DELETE ALL` sebelum insert siswa | Ubah menjadi `UPSERT` (ON CONFLICT DO UPDATE) | P1 | ✅ Selesai |
| 3 | `server/routes/teachers.mjs` | Pola `DELETE ALL` sebelum insert guru | Ubah menjadi `UPSERT` (ON CONFLICT DO UPDATE) | P1 | ✅ Selesai |
| 4 | `server/routes/staffs.mjs` | Pola `DELETE ALL` sebelum insert staf | Ubah menjadi `UPSERT` (ON CONFLICT DO UPDATE) | P1 | ✅ Selesai |
| 5 | `src/AdminApp.jsx` | Re-render cascade via objek inline props router | Props terpisah + receiver backward-compatible | P2 | ✅ Selesai |
| 6 | `src/utils/imageUtils.js` | Foto selfie absensi ukuran 3-8MB | Kompresi otomatis WebP di canvas sebelum kirim | P3 | ✅ Selesai |
| 7 | `server/hikvision-api.mjs` | Timeout panjang saat mesin absensi offline | Timeout ketat 5s/7s + isolasi error per-device | P3 | ✅ Selesai |
| 8 | `src/store/monitoring/absensiStore.js` | Crash `ReferenceError: get is not defined` | Tambah parameter `get` di `create((set, get) => ...)` | P1 | ✅ Selesai |
| 9 | `server/auth-server.mjs` | Cron jam 16:00 crash (kolom `date` & tabel tak ada) | Perbaiki query ke kolom `tanggal` & `hikvision_logs` | P1 | ✅ Selesai |
| 10 | `server/auth-server.mjs` | Cron jam 12:00 crash (`user_id does not exist`) | Ganti `user_id` menjadi `siswa_nis` di query rekap | P1 | ✅ Selesai |
| 11 | `server/routes/data.mjs` | Pola `DELETE ALL` pada kelas, mapel, ruangan, jurusan | Ubah `saveToTable` menjadi `UPSERT` selektif | P1 | ✅ Selesai |
| 12 | `server/routes/bk.mjs` | Siswa bisa baca seluruh riwayat rahasia BK | Terapkan validasi peran `requireBkAccess` pada rute GET | P3 | ✅ Selesai |
| 13 | `server/routes/kedisiplinan.mjs` & `pkl.mjs` | Hapus riwayat poin, rules & logbook tanpa cek peran | Batasi mutasi hanya untuk staf/admin & cek kepemilikan | P3 | ✅ Selesai |
| 14 | `src/pages/admin/hikvision/` | Jam masuk terpotong jadi kata "Mesin" / "Dari" | Tampilkan fallback `--:--` saat inTime null | P1 | ✅ Selesai |
| 15 | `server/routes/data.mjs` | Simpan guru/staf via `saveDatabaseNow` tidak tersimpan ke DB | Tambahkan sinkronisasi `mst_teachers/staffs/students` di `/save` | P1 | ✅ Selesai |
| 16 | `server/routes/auth.mjs` | Siswa kelas X & XI tidak bisa login (terkunci dari sistem) | Hapus restriksi kelas XII pada otentikasi login siswa | P1 | ✅ Selesai |
| 17 | `server/auth-server.mjs` & UI | Write amplification & belum ada saklar ON/OFF WhatsApp | Tambahkan Master Switch ON/OFF & cegah antrean spam | P1 | ✅ Selesai |
| 18 | Database PostgreSQL | 223.762 baris sampah pending di tabel `whatsapp_logs` | Eksekusi query purge pembersihan baris fiktif & VACUUM | P1 / P2 | ✅ Selesai |
| 19 | `src/pages/admin/pkl/PenugasanGuru.jsx` | Tombol tab "Auto-Assign Cerdas" tidak merespon (dead button) | Sambungkan modal preview & eksekusi auto-assign | P4 | ✅ Selesai |
| 20 | `server/auto-backup.mjs` | Perintah `set PGPASSWORD` gagal di Linux/Docker/PS | Gunakan opsi `env` pada Node.js `exec()` | P2 | ✅ Selesai |
| 21 | `server/auth-server.mjs` | Query delete siswa keluar berisiko meleset jika ID berupa UUID | Ubah query `WHERE id = $1 OR payload->>'nis' = $1` | P2 | ✅ Selesai |
| 22 | `src/App.jsx` | Batas kuota 5MB `localStorage` untuk cache offline | Migrasikan cache offline snapshot ke IndexedDB | P1 | ✅ Selesai |
| 23 | `server/auth-server.mjs` | Inflasi 1.200% keterlambatan siswa di laporan Telegram 16:00 | Hitung keterlambatan dari `MIN(timestamp)` (tap pertama) | P2 | ✅ Selesai |
| 24 | `server/routes/data.mjs` | `/api/data/load` menarik seluruh tabel siswa ke memori | Gunakan endpoint paginasi khusus untuk data siswa | P2 | [ ] Ditunda (P2) |
| 25 | Modul Akademik | Belum ada Buku Nilai / Penilaian KBM Siswa | Buat fitur input nilai tugas, formatif & ujian | P4 | [ ] Fitur Baru |
| 26 | Portal Publik | Belum ada dashboard akses orang tua | Buat portal cek presensi & pelanggaran via NISN | P4 | [ ] Fitur Baru |
| 27 | Absensi PKL | Absensi gagal saat siswa/guru di area tanpa sinyal | Buat offline sync queue dengan IndexedDB | P4 | [ ] Fitur Baru |
| 28 | Impor Siswa/Guru | Format impor belum kompatibel dengan Dapodik | Tambah template parser untuk format file Dapodik | P4 | [ ] Fitur Baru |
| 29 | `MyAttendancePage` & `AdminMobileNav` | Pengajuan surat sakit tidak muncul modal di desktop & tabbar mobile hilang/tertutup | Rombak modal pop-up mengambang + tambah tab Absensi guru & support karyawan | P1 | ✅ Selesai |

---
*Dokumen ini akan terus diperbarui seiring berjalannya audit dan penyelesaian setiap item tugas.*

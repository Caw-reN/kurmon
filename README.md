# TimeSchedule (Kurmon / KG2 School)

> **Sistem Manajemen Akademik, Penjadwalan Cerdas, Monitoring PKL & Absensi Biometrik Terpadu**

TimeSchedule (Kurmon) adalah aplikasi web enterprise berbasis React 19, Vite, dan Node.js dengan database PostgreSQL, dirancang untuk mengelola seluruh ekosistem sekolah menengah kejuruan (SMK) / SMA secara otomatis, cepat, dan terintegrasi.

---

## 🚀 Fitur Unggulan Utama

1. **Presensi Biometrik Hikvision Multi-Device Terintegrasi**:
   - Penarikan log otomatis dan terjadwal langsung dari 8+ mesin absensi fisik Hikvision melalui ISAPI.
   - **Standar Biometrik Ganda Resmi Siswa**: Mendukung verifikasi **Sidik Jari (Fingerprint - minor 38)** dan **Pemindaian Wajah (Face ID - minor 75 & 104)**.
   - **Proteksi Anti Titip Kartu**: Menolak otomatis scan kartu RFID (minor 1) bagi siswa guna mencegah titip absen.
   - Normalisasi NIS otomatis (pemetaan 8-digit mesin ke 9-digit NIS sekolah tanpa tabrakan).
   - Matriks rekapitulasi kehadiran bulanan instan, laporan keterlambatan, dan ekspor Excel/PDF.

2. **Mode Pemeliharaan Sistem (Maintenance Mode)**:
   - Saklar darurat dan terencana di menu Admin (*Pesan / Pengumuman > Mode Pemeliharaan*).
   - Mengalihkan otomatis seluruh pengguna umum (guru, staf, siswa, publik) ke layar pemeliharaan modern dengan estimasi selesai dan kontak bantuan.
   - **Akses Darurat Administrator**: Super Admin dapat langsung login di layar pemeliharaan untuk melakukan perbaikan tanpa terblokir.
   - Proteksi API backend otomatis mengembalikan HTTP 503 untuk autentikasi pengguna non-admin saat pemeliharaan aktif.

3. **Pita Siaran & Modal Peringatan Admin (Broadcast Alert)**:
   - Siaran pesan pengumuman/peringatan instan dari Admin ke seluruh aplikasi.
   - Pilihan kategori status: `Peringatan (Warning)`, `Bahaya / Kritis (Danger)`, `Informasi (Info)`, dan `Sukses (Success)`.
   - Target audiens fleksibel: `Semua Pengguna`, `Hanya Guru`, `Hanya Siswa`, atau `Hanya Wali Kelas`.
   - Dukungan pita atas mengambang (*floating top banner*) dan pop-up dialog penting (*modal alert*).

4. **Monitoring & Administrasi PKL Terpadu (3-Portal)**:
   - Portal mandiri untuk Siswa PKL (Jurnal harian, presensi berbasis geofencing GPS, unggah bukti kegiatan).
   - Portal Guru Pembimbing (Monitoring logbook, verifikasi kehadiran, penilaian industri).
   - Portal Admin / Hubin (Pemetaan DUDI, auto-assign pembimbing, cetak sertifikat & surat tugas).

5. **Penjadwalan Pelajaran Cerdas (Smart Schedule Generator)**:
   - Algoritma generator jadwal bebas bentrok berdasarkan ketersediaan guru, beban mengajar, dan kapasitas ruangan.
   - Antarmuka drag-and-drop interaktif dengan visualisasi konflik instan.

6. **Otomasi Notifikasi Bot Telegram & WhatsApp**:
   - Laporan kehadiran otomatis jam 12:00 ke Wali Kelas via WhatsApp Fonnte.
   - Rekap absensi harian jam 16:00 dan alert sistem penting via Bot Telegram.
   - Saklar ON/OFF WhatsApp Master Switch di panel admin untuk kendali kuota pesan.

---

## 📖 Dokumentasi Lengkap

Seluruh informasi arsitektur sistem, skema database, detail API, konfigurasi environment, dan panduan pengoperasian tersedia pada:

👉 **[Baca DOCUMENTATION.md untuk panduan lengkap](./DOCUMENTATION.md)**

---

## 🛠️ Cara Menjalankan Project Secara Cepat

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Lingkungan (.env)
Pastikan file `.env` telah memuat konfigurasi koneksi database PostgreSQL dan port:
```env
PORT=6677
VITE_PORT=6677
AUTH_PORT=4174
AUTH_BIND_HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/school_system_db
```

### 3. Menjalankan Backend Server
```bash
npm run auth:server
```
*Backend berjalan di `http://127.0.0.1:4174`*.

### 4. Menjalankan Frontend Server (Vite)
```bash
npm run dev
```
*Frontend berjalan di `http://localhost:6677`*.

### 5. Akses Aplikasi
- **Landing Page / Publik**: `http://localhost:6677/`
- **Portal Guru & Staf**: `http://localhost:6677/teacher`
- **Portal Siswa**: `http://localhost:6677/siswa`
- **Portal Administrator**: `http://localhost:6677/admin`
- **Akses Jaringan LAN**: `http://<IP-LAN-SERVER>:6677/`

---

## 🧪 Pengujian & Verifikasi Kualitas

Sebelum melakukan rilis atau git commit, jalankan verifikasi wajib:
```bash
# Menjalankan seluruh unit test (wajib 100% lulus)
npm test

# Menjalankan build produksi Vite (wajib 0 error)
npm run build
```

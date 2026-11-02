# Dokumentasi Arsitektur & Operasional Sistem (Kurmon)

Dokumen ini memuat panduan arsitektur sistem, struktur database PostgreSQL, alur komunikasi antar modul, sistem presensi biometrik Hikvision, mode pemeliharaan (maintenance), serta konfigurasi keamanan dan deployment.

---

## 1. Arsitektur & Teknologi

| Lapisan (Layer) | Teknologi / Library | Catatan Arsitektur |
|---|---|---|
| **Frontend** | React 19, Vite 8, TailwindCSS | Single Page Application (SPA) + PWA dengan Service Worker |
| **State Management** | Zustand (`useDataStore`, `useAppStore`, `useAuthStore`) | Reaktif, modular, tersinkronisasi dengan snapshot server |
| **Penyimpanan Luring (Offline)** | IndexedDB (`kurmon_offline_db`) + localStorage fallback | Mendukung penyimpanan payload besar (>100MB) bebas kuota |
| **Backend & API** | Node.js ESM (`server/auth-server.mjs`, `server/routes/`) | Port `4174`, RESTful API, multi-threading ISAPI client |
| **Database** | PostgreSQL 16 (`school_system_db`) | Connection pool via `pg` (`dbPool`), transaksi ACID, UPSERT |
| **Mesin Presensi** | Hikvision Terminal ISAPI | Penarikan log otomatis per menit dari 8+ mesin fisik via LAN |
| **Integrasi Notifikasi** | Telegram Bot API (`telegram-bot.mjs`) & WhatsApp Gateway Fonnte | Rekap harian otomatis jam 12:00 & 16:00, notifikasi keterlambatan |

---

## 2. Port & Layanan Jaringan

- **Frontend Dev Server**: Port `6677` (`http://localhost:6677/` atau `http://<IP-LAN>:6677/`)
- **Backend API & Auth Server**: Port `4174` (`http://127.0.0.1:4174/`)
- **Database PostgreSQL**: Port `5432` (`127.0.0.1:5432`)
- **Binding**: Backend dibinding ke `0.0.0.0` agar dapat melayani koneksi dari perangkat di jaringan lokal (LAN/WiFi).
- **CORS & Keamanan Origin**: Origin dibatasi pada `localhost`, `127.0.0.1`, IP privat RFC-1918 (`10.*`, `172.16-31.*`, `192.168.*`), dan origin eksplisit pada `AUTH_ALLOWED_ORIGINS`.

---

## 3. Sistem Presensi Biometrik Hikvision

### A. Standar Biometrik Siswa vs Pegawai
Sistem menerapkan pemisahan ketat antara metode absensi yang sah untuk siswa guna mencegah praktik **titip kartu / titip absen**:
- **Siswa**:
  - ✅ **Fingerprint / Sidik Jari**: Event `major: 5`, `minor: 38`.
  - ✅ **Face ID / Pengenalan Wajah**: Event `major: 5`, `minor: 75` dan `minor: 104`.
  - ❌ **Kartu RFID**: Event `major: 5`, `minor: 1` (**DITOLAK OTOMATIS** untuk siswa, tidak dihitung hadir di matriks).
- **Guru & Karyawan**:
  - Mendukung Fingerprint (`minor: 38`), Face ID (`minor: 75` / `104`), dan Kartu RFID resmi (`minor: 1`).

### B. Normalisasi NIS (8-digit Mesin vs 9-digit Master)
Beberapa mesin fingerprint memotong angka depan NIS siswa (misalnya NIS master `262710228` terbaca sebagai `62710228` di mesin).
- Backend menggunakan map lookup O(1) dua arah:
  ```js
  // Mencocokkan 9 digit penuh atau 8 digit akhiran (slice 1)
  if (kStr.length === 9) nisToMatrixKey.set(kStr.slice(1), k);
  ```
- Ini mencegah tabrakan ID tanpa mengacaukan identitas siswa lain.

### C. Hierarki Status Kehadiran (Attendance Precedence)
1. **Surat Izin Resmi / Sakit / Dispensasi**: Surat resmi yang tercatat di `kedisiplinan_absensi` memiliki prioritas tertinggi. Siswa yang berstatus sakit/izin yang telah diverifikasi tidak boleh tertimpa menjadi Hadir atau Alpa.
2. **Scan Fisik Mesin**: Siswa yang memiliki scan biometrik valid (masuk/pulang) otomatis dihitung Hadir (atau Terlambat jika melewati `masuk_late`).
3. **Alpa Otomatis**: Hanya dievaluasi setelah jam tutup presensi (`masuk_close` / `11:00`) berakhir pada hari aktif sekolah non-libur.

---

## 4. Fitur Mode Pemeliharaan Sistem (Maintenance Mode)

### A. Alur Kerja & Arsitektur
- **Aktivasi**: Dikelola melalui menu Admin: `Pesan / Pengumuman > Mode Pemeliharaan (Maintenance)`.
- **Payload State**: Disimpan di `appSettings.maintenance` pada tabel `app_data` (`store_key = 'main_store'`):
  ```json
  {
    "isActive": true,
    "title": "Sistem Sedang Dalam Pemeliharaan",
    "message": "Peningkatan performa server berkala...",
    "estimatedEnd": "Senin, 02 November 2026 - 15:00 WIB",
    "contactInfo": "0812-XXXX-XXXX (Bantuan IT)",
    "allowAdminBypass": true
  }
  ```
- **Front-end Interceptor**: Di [`src/App.jsx`](./src/App.jsx), jika `maintenance.isActive === true` dan pengguna bukan Super Admin, rendering aplikasi diblokir dan dialihkan ke komponen [`GlobalMaintenancePage.jsx`](./src/components/maintenance/GlobalMaintenancePage.jsx).
- **Backend Gate**: Di [`server/routes/auth.mjs`](./server/routes/auth.mjs), setiap upaya login dari akun non-admin ditolak dengan kode status **HTTP 503**:
  ```json
  {
    "ok": false,
    "error": "Sistem sedang dalam mode pemeliharaan (maintenance)...",
    "isMaintenance": true,
    "estimatedEndTime": "..."
  }
  ```
- **Bypass Administrator**: Super Admin (`role === 'admin' || role === 'superadmin'`) memiliki tombol login darurat tersemat di layar pemeliharaan untuk login langsung dan membuka dashboard perbaikan.

---

## 5. Fitur Pita Siaran & Peringatan Admin (Broadcast Alert)

- **Komponen**:
  - [`GlobalBroadcastAlert.jsx`](./src/components/notifications/GlobalBroadcastAlert.jsx): Banner horizontal mengambang di bagian atas jendela aplikasi.
  - [`GlobalAlertModal.jsx`](./src/components/notifications/GlobalAlertModal.jsx): Pop-up dialog menonjol untuk peringatan prioritas tinggi yang memerlukan atensi langsung.
- **Konfigurasi**:
  - Tipe warna: `warning` (kuning/amber), `danger` (merah/rose), `info` (biru/sky), `success` (hijau/emerald).
  - Target audiens: `all` (Semua), `guru` (Khusus Guru), `siswa` (Khusus Siswa), `walas` (Wali Kelas).
  - Penyimpanan status dismiss per sesi browser (`sessionStorage`) agar banner tidak mengganggu berulang kali setelah ditutup pengguna.

---

## 6. Tabel Database Utama (PostgreSQL)

| Tabel | Fungsi |
|---|---|
| `app_data` | Key-value store untuk state global (`main_store`, `bulk_attendance_remarks`, `appSettings`, dll). |
| `mst_students` | Data master siswa (NIS, nama, kelas, kontak wali, status). |
| `mst_teachers` | Data master guru (kode guru, NIP, nama, mata pelajaran, penugasan). |
| `mst_staffs` | Data master staf & tata usaha (kode staf, NIP, jabatan). |
| `mst_classes` | Data master rombel kelas dan wali kelas yang mengampu. |
| `hikvision_logs` | Log mentah seluruh tap scan dari mesin absensi fisik (timestamp, event_type, employee_id). |
| `hikvision_devices` | Daftar mesin absensi jaringan (IP address, nama mesin, lokasi, status online). |
| `kedisiplinan_absensi`| Rekap status absensi siswa resmi (Hadir, Sakit, Izin, Alpa, Dispensasi, bukti surat). |
| `guru_attendance_records`| Rekap absensi kehadiran guru dan staf harian. |
| `pkl_students` & `pkl_logbooks` | Administrasi dan jurnal kegiatan siswa selama Praktik Kerja Lapangan. |
| `whatsapp_logs` | Antrean dan histori pesan WhatsApp keterlambatan/laporan ke orang tua dan wali kelas. |
| `app_sessions` | Sesi autentikasi aktif pengguna dengan token CSPRNG 256-bit dan masa berlaku (*expires_at*). |

---

## 7. Prosedur Verifikasi Sebelum Deployment

Setiap perubahan kode **wajib** melewati dua pengujian otomatis:

```bash
# 1. Menjalankan seluruh test suite
npm test

# Output yang diharapkan:
# pass 46, fail 0 (100% Passed)

# 2. Menjalankan verifikasi build bundler Vite
npm run build

# Output yang diharapkan:
# ✓ built in X.XXs, dist/ manifest generated, 0 error
```

# TimeSchedule (CORCOM)

Sistem Cerdas Penjadwalan Pelajaran Sekolah & Absensi Guru Berbasis Geofencing GPS.

## Dokumentasi Lengkap
Seluruh informasi arsitektur sistem, panduan instalasi, kredensial login default, detail teknologi, manajemen state, serta deskripsi fitur lengkap telah dirangkum dalam satu file dokumentasi utama:

👉 **[Baca DOCUMENTATION.md untuk panduan lengkap](file:///c:/laragon/www/inkscod/schedule/DOCUMENTATION.md)**

---

## Cara Menjalankan Project Secara Cepat

1. **Instal Dependensi**:
   ```bash
   npm install
   ```

2. **Jalankan Backend Auth Server**:
   ```bash
   npm run auth:server
   ```

3. **Jalankan Frontend Dev Server**:
   ```bash
   npm run dev
   ```

4. **Akses Aplikasi**:
   - Beranda Utama (Landing Page): `http://localhost:6677/`
   - Portal Guru: `http://localhost:6677/teacher`
   - Portal Admin: `http://localhost:6677/admin`
   - Jika dibuka dari perangkat lain di jaringan yang sama, pakai `http://<IP-LAN-MESIN-INI>:6677/`

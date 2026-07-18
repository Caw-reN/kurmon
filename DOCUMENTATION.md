# TimeSchedule Documentation

Dokumentasi singkat untuk menjalankan dan mengakses project ini secara lokal.

## Akses Lokal

- Frontend dev server: `http://localhost:6677/`
- Portal guru: `http://localhost:6677/teacher`
- Portal admin: `http://localhost:6677/admin`
- Jika dibuka dari perangkat lain di jaringan yang sama, gunakan `http://<IP-LAN-MESIN-INI>:6677/`

## Service yang Dipakai

- Frontend: Vite
- Auth API: `npm run auth:server`
- Database: MySQL lokal/Laragon

## Konfigurasi Penting

File `.env` memakai pengaturan berikut:

- `VITE_PORT=6677`
- `AUTH_PORT=4174`
- `AUTH_BIND_HOST=0.0.0.0`
- `AUTH_ALLOWED_ORIGINS` berisi origin yang diizinkan untuk akses browser

## Catatan Keamanan

- Origin browser dibatasi ke `localhost`, `127.0.0.1`, `::1`, IP private LAN, dan origin eksplisit yang diset di `.env`.
- Auth server dibinding ke `0.0.0.0` agar bisa diakses dari mesin lokal dan jaringan internal.


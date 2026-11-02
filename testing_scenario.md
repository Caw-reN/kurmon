# Skenario Pengujian (QA Checklist) Kurmon

Berikut adalah skenario pengujian komprehensif end-to-end untuk memastikan seluruh alur di aplikasi **Kurmon** berjalan lancar tanpa bug dan regresi.

> [!TIP]
> **Cara Menggunakan Checklist Ini**
> Lakukan pengujian secara berurutan. Jika ada langkah yang gagal atau error, catat di bagian mana error tersebut terjadi agar dapat ditelusuri akar masalahnya.

---

## 1. Pengujian Import & Export (Master Data)

**Tujuan:** Memastikan template Excel, Import Data, dan Export Data berjalan sinkron dan tidak ada data yang hilang/rusak.

- [ ] Buka menu **Master Data** (atau menu yang memuat tombol Import/Export).
- [ ] Klik **Unduh Template Excel** dan pastikan file yang terunduh bernama `Template Master Data <Nama App>.xlsx`.
- [ ] Buka file Excel tersebut dan pastikan terdapat **15 Sheet** (Jurusan, Kelas, Guru, Mapel, Ruangan, Beban, Modul, Waktu, Ketersediaan, Kalender_Akademik, Kategori_Kalender, Kategori_Modul, Absensi_Guru, Karyawan, Siswa).
- [ ] Tambahkan masing-masing 1 baris **data percobaan (dummy)** di sheet **Karyawan**, **Siswa**, dan **Modul**.
- [ ] Simpan file Excel dan lakukan **Import** ke dalam sistem.
- [ ] Cek di aplikasi (misalnya di tab Data Pegawai/Karyawan, Siswa, dan Modul Ajar) apakah data percobaan yang Anda masukkan di Excel tadi **berhasil tampil**.
- [ ] Terakhir, klik **Export Data Saat Ini** dan pastikan data percobaan tadi juga terunduh di dalam file Export.

---

## 2. Pengujian Modul Ajar (Perubahan "Silabus")

**Tujuan:** Memastikan penyesuaian istilah "Silabus" menjadi "Modul Ajar" berhasil di seluruh antarmuka dan fungsi CRUD tidak terganggu.

- [ ] Buka menu **Modul Ajar**.
- [ ] Pastikan antarmuka bersih dari istilah lama yang tidak sesuai pada tombol, peringatan, dan placeholder pencarian.
- [ ] Klik **Tambah Modul Ajar** dan isi form (Pilih Mapel, Guru, Judul Pertemuan, dan Tujuan Pembelajaran). Klik Simpan.
- [ ] Pastikan Modul Ajar baru berhasil tersimpan dan tampil di list pertemuan.
- [ ] Lakukan **Edit** pada Modul Ajar tersebut, ubah catatan, lalu simpan.
- [ ] Lakukan **Hapus** pada Modul Ajar tersebut dan pastikan terhapus dari sistem.

---

## 3. Pengujian Penjadwalan (Smart Schedule Generator)

**Tujuan:** Memastikan algoritma penjadwalan otomatis dapat menyusun jadwal bebas bentrok menggunakan data Beban Mengajar.

- [ ] Buka menu **Penjadwalan / Buat Jadwal**.
- [ ] Pastikan ada minimal 1 data **Beban Mengajar** dan 1 **Guru** yang memiliki Ketersediaan hari di Master Data.
- [ ] Klik tombol **Generate Jadwal / Buat Otomatis**.
- [ ] Pastikan sistem berhasil menyusun jadwal (kartu warna-warni muncul di slot hari dan jam).
- [ ] Coba lakukan **Drag & Drop** (pindahkan satu jadwal ke slot hari/jam lain). Pastikan bisa dipindah dan tersimpan otomatis.
- [ ] Pastikan bentrok (konflik ruangan/guru) memberikan penanda visual merah atau peringatan yang sesuai.

---

## 4. Pengujian Sistem Presensi Biometrik Hikvision

**Tujuan:** Memastikan data yang ditarik dari Mesin Hikvision (Fingerprint & Face ID) terintegrasi dengan akurat dan tidak ada kebingungan antara data Guru, Karyawan, dan Siswa.

- [ ] Buka menu **Kelola Hikvision / Mesin Absensi**.
- [ ] Lakukan sinkronisasi atau penarikan data absen hari ini dari seluruh mesin.
- [ ] Buka menu **Matriks Presensi Siswa**:
  - Pastikan kartu ringkasan KPI atas menampilkan angka kehadiran nyata (contoh: 1.000+ hadir, bukan hanya sebagian kecil).
  - Pastikan siswa yang melakukan absen via **Face ID** dan **Fingerprint** sama-sama terdeteksi sebagai **Hadir**.
  - Pastikan tap kartu RFID siswa **tidak dihitung hadir** (menolak titip absen).
- [ ] Buka menu **Matriks Presensi Guru & Karyawan**:
  - Pastikan scan guru dan karyawan tercatat pada rekap kehadiran pegawai.
- [ ] Buka modal detail keterlambatan (*klik kartu Terlambat*) dan pastikan siswa yang terlambat terdaftar dengan jam kedatangan yang tepat.

---

## 5. Pengujian Mode Pemeliharaan Sistem (Maintenance Mode)

**Tujuan:** Memastikan mode pemeliharaan mengunci akses pengguna umum namun tetap memberikan jalur bypass bagi Super Administrator.

- [ ] Login sebagai **Admin**.
- [ ] Buka menu **Pesan / Pengumuman > Sub-tab "Mode Pemeliharaan"**.
- [ ] Isi pesan pemeliharaan dan estimasi selesai, lalu aktifkan saklar dan klik **Terapkan Mode Pemeliharaan**.
- [ ] Buka browser lain (atau jendela Incognito) dan buka halaman beranda aplikasi (`http://localhost:6677/`):
  - Pastikan langsung tampil layar penuh **Sistem Sedang Dalam Pemeliharaan**.
  - Pastikan tombol navigasi umum dan konten jadwal tidak dapat dibuka.
- [ ] Uji coba login akun guru / siswa di halaman login biasa (atau via API): pastikan ditolak dengan pesan pemeliharaan (HTTP 503).
- [ ] Pada layar pemeliharaan, klik tombol **Login Khusus Administrator**:
  - Masukkan kredensial Admin.
  - Pastikan Admin berhasil masuk ke dashboard tanpa terhalang.
- [ ] Nonaktifkan kembali mode maintenance melalui sub-tab pemeliharaan. Pastikan layar pengguna biasa kembali normal.

---

## 6. Pengujian Pita Siaran & Modal Peringatan Admin (Broadcast Alert)

**Tujuan:** Memastikan penyiaran pesan darurat / informasi dari Admin tampil secara instan kepada pengguna sesuai audiens.

- [ ] Login sebagai **Admin**.
- [ ] Buka menu **Pesan / Pengumuman > Sub-tab "Pita Siaran & Peringatan"**.
- [ ] Pilih Kategori: `Peringatan (Warning)`.
- [ ] Tulis Judul: `Uji Coba Pengumuman`, Pesan: `Pengumuman penting untuk seluruh warga sekolah.`.
- [ ] Pilih Target Audiens: `Semua Pengguna`.
- [ ] Centang opsi `Tampilkan Pop-up Modal Penting`. Klik **Simpan & Tayangkan Siaran**.
- [ ] Buka aplikasi dari portal Guru atau Siswa:
  - Pastikan **Pop-up Modal Pengumuman** langsung muncul saat halaman pertama kali dimuat.
  - Setelah modal ditutup, pastikan **Pita Banner Mengambang** tetap terlihat di bagian atas halaman.
  - Klik tombol tutup (x) pada banner dan pastikan banner menghilang tanpa merusak tata letak.

---

## 7. Pengujian Multi-Role & Hak Akses

**Tujuan:** Memastikan privasi data dan batasan kewenangan berjalan sesuai peran.

- [ ] Logout dari akun Admin.
- [ ] Login menggunakan **Akun Guru** (misal G01):
  - Pastikan Guru **tidak bisa** melihat tab Pengaturan Sistem atau Manajemen Role.
  - Pastikan Guru hanya dapat mengelola data pembelajaran dan modul ajarnya sendiri.
- [ ] Login menggunakan akun **Siswa**:
  - Pastikan Siswa hanya melihat jadwal kelasnya, riwayat absensi pribadi, dan kartu pelajar digital.
  - Pastikan menu konfigurasi admin dan data siswa lain terkunci sepenuhnya.

---

## Ringkasan Pemeriksaan

Jika seluruh 7 tahapan di atas dapat dilewati tanpa error runtime atau crash layar putih, maka aplikasi berada dalam kondisi **sangat stabil dan siap untuk operasional produksi**.

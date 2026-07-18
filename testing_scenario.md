# Skenario Pengujian (QA Checklist) Kurmon

Berikut adalah skenario pengujian end-to-end (dari awal hingga akhir) yang dapat Anda ikuti untuk memastikan seluruh alur di aplikasi **Kurmon** berjalan lancar tanpa bug.

> [!TIP]
> **Cara Menggunakan Checklist Ini**
> Lakukan pengujian secara berurutan. Jika ada langkah yang gagal atau error, catat di bagian mana error tersebut terjadi agar bisa segera kita perbaiki.

---

## 1. Pengujian Import & Export (Master Data)

**Tujuan:** Memastikan template Excel, Import Data, dan Export Data berjalan sinkron dan tidak ada data yang hilang/error.

- [ ] Buka menu **Master Data** (atau menu yang memuat tombol Import/Export).
- [ ] Klik **Unduh Template Excel** dan pastikan file yang terunduh bernama `Template Master Data <Nama App>.xlsx`.
- [ ] Buka file Excel tersebut dan pastikan terdapat **15 Sheet** (Jurusan, Kelas, Guru, Mapel, Ruangan, Beban, Modul, Waktu, Ketersediaan, Kalender_Akademik, Kategori_Kalender, Kategori_Modul, Absensi_Guru, Karyawan, Siswa).
- [ ] Tambahkan masing-masing 1 baris **data percobaan (dummy)** di sheet **Karyawan**, **Siswa**, dan **Modul**.
- [ ] Simpan file Excel dan lakukan **Import** ke dalam sistem.
- [ ] Cek di aplikasi (misalnya di tab Data Pegawai/Karyawan, Siswa, dan Modul Ajar) apakah data percobaan yang Anda masukkan di Excel tadi **berhasil tampil**.
- [ ] Terakhir, klik **Export Data Saat Ini** dan pastikan data percobaan tadi juga terunduh di dalam file Export.

---

## 2. Pengujian Modul Ajar (Perubahan "Silabus")

**Tujuan:** Memastikan penggantian kata "Silabus" menjadi "Modul" berhasil di seluruh UI dan fungsionalitasnya tidak rusak.

- [ ] Buka menu **Modul Ajar** (sebelumnya bernama Silabus).
- [ ] Pastikan tidak ada lagi kata "Silabus" di antarmuka (termasuk pada tombol, peringatan, dan placeholder pencarian).
- [ ] Klik **Tambah Modul Ajar** dan isi form (Pilih Mapel, Guru, Judul Pertemuan, dan Tujuan Pembelajaran). Klik Simpan.
- [ ] Pastikan Modul Ajar baru berhasil tersimpan dan tampil di list pertemuan.
- [ ] Lakukan **Edit** pada Modul Ajar tersebut, ubah catatan, lalu simpan.
- [ ] Lakukan **Hapus** pada Modul Ajar tersebut dan pastikan terhapus dari sistem.

---

## 3. Pengujian Penjadwalan (Schedule Generator)

**Tujuan:** Memastikan algoritma jadwal dapat menyusun jadwal secara otomatis menggunakan data Beban Mengajar.

- [ ] Buka menu **Penjadwalan / Buat Jadwal**.
- [ ] Pastikan ada minimal 1 data **Beban Mengajar** dan 1 **Guru** yang memiliki Ketersediaan hari di Master Data.
- [ ] Klik tombol **Generate Jadwal / Buat Otomatis**.
- [ ] Pastikan sistem berhasil menyusun jadwal (kartu warna-warni muncul di slot hari dan jam).
- [ ] Coba lakukan **Drag & Drop** (pindahkan satu jadwal ke slot hari/jam lain). Pastikan bisa dipindah dan tersimpan otomatis.
- [ ] Pastikan bentrok (konflik ruangan/guru) memberikan peringatan warna merah atau pesan error yang sesuai.

---

## 4. Pengujian Sistem Absensi (Mesin & Siswa)

**Tujuan:** Memastikan data yang ditarik dari Mesin Hikvision terintegrasi dengan baik dan tidak ada kebingungan antara data Guru, Karyawan, dan Siswa.

- [ ] Buka menu **Mesin Absensi / Penarikan Absen**.
- [ ] Lakukan sinkronisasi atau tarik data absen hari ini dari mesin.
- [ ] Buka menu **Laporan Absensi** (atau Absensi Siswa / Guru).
- [ ] Cek apakah **Data Siswa** yang ditarik dari mesin tampil di tabel absensi siswa dengan benar.
- [ ] Cek apakah **Data Guru & Karyawan** masuk ke rekap absensi pegawai.
- [ ] Tes filter pencarian: cari nama siswa/guru spesifik dan pastikan sistem menampilkan data absensi yang relevan.

> [!WARNING]
> Jika pada tahap ini data absen mesin tidak sinkron dengan tampilan di menu Absensi Siswa (seperti kendala Anda sebelumnya), harap catat karena ini akan menjadi fokus perbaikan kita berikutnya.

---

## 5. Pengujian Multi-Role Akses (Login Berbeda Hak Akses)

**Tujuan:** Memastikan keamanan sistem di mana user hanya bisa melihat apa yang menjadi haknya.

- [ ] Logout dari akun Admin.
- [ ] Login menggunakan **Akun Guru** (misalnya G01 dengan password default).
- [ ] Pastikan Guru **tidak bisa** melihat menu Penjadwalan Master (hanya bisa melihat jadwal pribadinya).
- [ ] Pastikan Guru hanya bisa mengedit/menambahkan **Modul Ajar** miliknya sendiri.
- [ ] Logout dan Login menggunakan akun **Siswa/TU** (jika ada), lalu pastikan menu yang dilarang tidak dapat diakses.

---

## Ringkasan Pemeriksaan

Jika seluruh 5 tahapan di atas bisa Anda lewati tanpa muncul layar putih (crash) atau pesan error yang aneh, maka fondasi aplikasi sudah **sangat stabil**. 

Jika ada yang gagal, cukup copy-paste pesan errornya atau beri tahu saya di bagian mana gagalnya agar bisa saya bereskan!

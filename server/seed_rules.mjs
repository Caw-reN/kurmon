import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgres://postgres:ijjuuiue@localhost:5432/school_system_db' });

export const DEFAULT_MASTER_RULES = [
  { nama_tindakan: 'Terlambat Datang Ke Sekolah', jenis: 'Pelanggaran', nilai_poin: 5 },
  { nama_tindakan: 'Akumulasi Terlambat > 3 Kali (Teguran Lisan)', jenis: 'Pelanggaran', nilai_poin: 10 },
  { nama_tindakan: 'Atribut Seragam Tidak Lengkap / Kaus Kaki / Sabuk', jenis: 'Pelanggaran', nilai_poin: 5 },
  { nama_tindakan: 'Tidak Pakai Topi / Dasi Saat Upacara', jenis: 'Pelanggaran', nilai_poin: 5 },
  { nama_tindakan: 'Seragam Tidak Rapi / Seragam Dicoret', jenis: 'Pelanggaran', nilai_poin: 5 },
  { nama_tindakan: 'Rambut Gondrong / Diwarnai / Tidak Rapi', jenis: 'Pelanggaran', nilai_poin: 10 },
  { nama_tindakan: 'Kuku Panjang / Diwarnai', jenis: 'Pelanggaran', nilai_poin: 5 },
  { nama_tindakan: 'Membuang Sampah Sembarangan', jenis: 'Pelanggaran', nilai_poin: 5 },
  { nama_tindakan: 'Tidak Mengikuti Piket Kelas', jenis: 'Pelanggaran', nilai_poin: 5 },
  { nama_tindakan: 'Main HP Saat Jam Pelajaran Tanpa Izin', jenis: 'Pelanggaran', nilai_poin: 10 },
  { nama_tindakan: 'Pelanggaran Absensi: Akumulasi Alpa > 5 Hari (SP-1)', jenis: 'Pelanggaran', nilai_poin: 15 },
  { nama_tindakan: 'Bolos Pelajaran / Cabut Sekolah', jenis: 'Pelanggaran', nilai_poin: 20 },
  { nama_tindakan: 'Keluar Lingkungan Sekolah Tanpa Izin', jenis: 'Pelanggaran', nilai_poin: 15 },
  { nama_tindakan: 'Merokok / Membawa Rokok / Vape di Sekolah', jenis: 'Pelanggaran', nilai_poin: 25 },
  { nama_tindakan: 'Perundungan / Bullying Ringan', jenis: 'Pelanggaran', nilai_poin: 20 },
  { nama_tindakan: 'Menerobos Gerbang / Pagar Sekolah', jenis: 'Pelanggaran', nilai_poin: 20 },
  { nama_tindakan: 'Berkelahi / Tawuran', jenis: 'Pelanggaran', nilai_poin: 50 },
  { nama_tindakan: 'Membawa Senjata Tajam / Berbahaya', jenis: 'Pelanggaran', nilai_poin: 50 },
  { nama_tindakan: 'Pemalsuan Tanda Tangan Surat / Dokumen', jenis: 'Pelanggaran', nilai_poin: 30 },
  { nama_tindakan: 'Merusak Fasilitas / Sarana Sekolah', jenis: 'Pelanggaran', nilai_poin: 30 },
  { nama_tindakan: 'Tindak Asusila / Pornografi', jenis: 'Pelanggaran', nilai_poin: 75 },
  { nama_tindakan: 'Juara Lomba Tingkat Kota / Provinsi', jenis: 'Prestasi', nilai_poin: 15 },
  { nama_tindakan: 'Juara Lomba Tingkat Nasional / Internasional', jenis: 'Prestasi', nilai_poin: 25 },
  { nama_tindakan: 'Pengurus OSIS / Ekstrakurikuler Aktif', jenis: 'Prestasi', nilai_poin: 10 },
  { nama_tindakan: 'Petugas Upacara Bendera / Paskibra', jenis: 'Prestasi', nilai_poin: 5 },
  { nama_tindakan: 'Siswa Teladan / Kehadiran 100%', jenis: 'Prestasi', nilai_poin: 10 }
];

export async function seedMasterRules(pool) {
  for (const r of DEFAULT_MASTER_RULES) {
    const check = await pool.query('SELECT id FROM kedisiplinan_master_poin WHERE nama_tindakan = $1', [r.nama_tindakan]);
    if (check.rows.length === 0) {
      await pool.query('INSERT INTO kedisiplinan_master_poin (nama_tindakan, jenis, nilai_poin) VALUES ($1, $2, $3)', [r.nama_tindakan, r.jenis, r.nilai_poin]);
    }
  }
}

if (process.argv[1]?.endsWith('seed_rules.mjs')) {
  seedMasterRules(pool).then(async () => {
    const all = await pool.query('SELECT * FROM kedisiplinan_master_poin ORDER BY jenis DESC, nilai_poin ASC');
    console.log('SUCCESSFULLY SEEDED MASTER RULES. TOTAL RULES:', all.rows.length);
    await pool.end();
  });
}

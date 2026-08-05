import pg from 'pg';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const pool = new pg.Pool({
  host: env.PG_HOST,
  port: parseInt(env.PG_PORT),
  user: env.PG_USER,
  password: env.PG_PASSWORD,
  database: env.PG_DATABASE
});

console.log('\n========================================');
console.log('   AUDIT LENGKAP SISTEM KURMON');
console.log('   ' + new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
console.log('========================================\n');

// 1. Master Data
const [stR, clR, tchrR, roomR, subjR, majR] = await Promise.all([
  pool.query('SELECT COUNT(*) as c FROM mst_students'),
  pool.query('SELECT COUNT(*) as c FROM mst_classes'),
  pool.query('SELECT COUNT(*) as c FROM mst_teachers'),
  pool.query('SELECT COUNT(*) as c FROM mst_rooms'),
  pool.query('SELECT COUNT(*) as c FROM mst_subjects'),
  pool.query('SELECT COUNT(*) as c FROM mst_majors'),
]);

console.log('📚 MASTER DATA:');
console.log(`   Siswa         : ${stR.rows[0].c}`);
console.log(`   Kelas         : ${clR.rows[0].c}`);
console.log(`   Guru          : ${tchrR.rows[0].c}`);
console.log(`   Ruangan       : ${roomR.rows[0].c}`);
console.log(`   Mata Pelajaran: ${subjR.rows[0].c}`);
console.log(`   Jurusan       : ${majR.rows[0].c}`);

// 2. Gender & Major breakdown
const genderR = await pool.query(`SELECT payload->>'gender' as gender, COUNT(*) as c FROM mst_students GROUP BY gender`);
const majorR = await pool.query(`SELECT payload->>'jurusan' as jurusan, COUNT(*) as c FROM mst_students GROUP BY jurusan ORDER BY c DESC`);
const tingkatR = await pool.query(`SELECT LEFT(payload->>'class_name', CASE WHEN payload->>'class_name' LIKE 'XII%' THEN 3 ELSE 2 END) as tingkat, COUNT(*) as c FROM mst_students GROUP BY tingkat ORDER BY tingkat`);

console.log('\n👥 DISTRIBUSI SISWA:');
genderR.rows.forEach(r => console.log(`   ${r.gender === 'P' ? 'Perempuan' : 'Laki-laki'}: ${r.c}`));
console.log('   Per Jurusan:');
majorR.rows.forEach(r => console.log(`     ${r.jurusan || 'Tidak diketahui'}: ${r.c} siswa`));
console.log('   Per Tingkat:');
tingkatR.rows.forEach(r => console.log(`     Kelas ${r.tingkat}: ${r.c} siswa`));

// 3. Users
const usersR = await pool.query('SELECT id, username, name, role FROM users ORDER BY role, name');
console.log(`\n👤 PENGGUNA SISTEM (${usersR.rows.length} total):`);
const byRole = {};
usersR.rows.forEach(u => { byRole[u.role] = byRole[u.role] || []; byRole[u.role].push(u.name); });
Object.entries(byRole).forEach(([role, names]) => {
  console.log(`   [${role.toUpperCase()}] (${names.length}): ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3} lainnya` : ''}`);
});

// 4. Kedisiplinan
const [absenR, poinR, kdAbsCountR] = await Promise.all([
  pool.query('SELECT status, COUNT(*) as c FROM kedisiplinan_absensi GROUP BY status ORDER BY c DESC'),
  pool.query('SELECT COUNT(*) as c FROM kedisiplinan_riwayat_poin'),
  pool.query('SELECT COUNT(DISTINCT DATE(tanggal)) as days FROM kedisiplinan_absensi'),
]);

console.log('\n🎯 KEDISIPLINAN:');
console.log(`   Hari rekam absensi: ${kdAbsCountR.rows[0].days} hari`);
console.log(`   Riwayat Poin      : ${poinR.rows[0].c} transaksi`);
console.log('   Status Absensi:');
absenR.rows.forEach(r => console.log(`     ${r.status}: ${r.c}`));

// 5. BK
const [bkSessR, bkConsR, bkVisitR] = await Promise.all([
  pool.query('SELECT COUNT(*) as c FROM bk_sessions'),
  pool.query('SELECT COUNT(*) as c FROM kedisiplinan_buku_konseling'),
  pool.query('SELECT COUNT(*) as c FROM bk_home_visits'),
]);
console.log('\n🧑‍🤝‍🧑 BIMBINGAN KONSELING:');
console.log(`   Sesi BK       : ${bkSessR.rows[0].c}`);
console.log(`   Buku Konseling: ${bkConsR.rows[0].c}`);
console.log(`   Kunjungan Rumah: ${bkVisitR.rows[0].c}`);

// 6. PKL
const [pklStudR, pklLocR, pklJurnR, pklSubmR] = await Promise.all([
  pool.query('SELECT COUNT(*) as c FROM pkl_students'),
  pool.query('SELECT COUNT(*) as c FROM pkl_locations'),
  pool.query('SELECT COUNT(*) as c FROM pkl_logbooks'),
  pool.query('SELECT COUNT(*) as c FROM pkl_submissions'),
]);
console.log('\n🏢 PKL (PRAKTIK KERJA LAPANGAN):');
console.log(`   Siswa PKL   : ${pklStudR.rows[0].c}`);
console.log(`   Mitra DUDI  : ${pklLocR.rows[0].c} lokasi`);
console.log(`   Entri Jurnal: ${pklJurnR.rows[0].c}`);
console.log(`   Submission  : ${pklSubmR.rows[0].c}`);

// 7. Akademik
const [prestR, kknR, modulR, matR, silR] = await Promise.all([
  pool.query('SELECT COUNT(*) as c FROM kesiswaan_prestasi'),
  pool.query('SELECT COUNT(*) as c FROM kenaikan_kelas_log'),
  pool.query('SELECT COUNT(*) as c FROM modul_ajar_guru'),
  pool.query('SELECT COUNT(*) as c FROM materi_ajar'),
  pool.query('SELECT COUNT(*) as c FROM app_data WHERE key = \'schedule\'').catch(() => ({ rows: [{c: 'N/A'}] })),
]);
console.log('\n📖 AKADEMIK:');
console.log(`   Prestasi Siswa  : ${prestR.rows[0].c}`);
console.log(`   Log Kenaikan Kelas: ${kknR.rows[0].c}`);
console.log(`   Modul Ajar Guru : ${modulR.rows[0].c}`);
console.log(`   Materi Ajar     : ${matR.rows[0].c}`);

// 8. Integrasi & Sistem
const [hikvDevR, hikvStudR, wlogR, loginR, auditR, apikeyR] = await Promise.all([
  pool.query('SELECT COUNT(*) as c FROM hikvision_devices'),
  pool.query('SELECT COUNT(*) as c FROM hikvision_students'),
  pool.query('SELECT COUNT(*) as c FROM whatsapp_logs'),
  pool.query('SELECT COUNT(*) as c FROM login_logs'),
  pool.query('SELECT COUNT(*) as c, action FROM audit_logs GROUP BY action ORDER BY c DESC'),
  pool.query('SELECT COUNT(*) as c FROM api_keys'),
]);
console.log('\n🔌 INTEGRASI & SISTEM:');
console.log(`   Hikvision Devices : ${hikvDevR.rows[0].c}`);
console.log(`   Hikvision Students: ${hikvStudR.rows[0].c}`);
console.log(`   WhatsApp Logs     : ${wlogR.rows[0].c} pesan`);
console.log(`   API Keys          : ${apikeyR.rows[0].c}`);
console.log(`   Login Logs        : ${loginR.rows[0].c} entri`);
console.log(`   Audit Log Actions :`);
auditR.rows.forEach(r => console.log(`     ${r.action}: ${r.c} kali`));

// 9. Checks / Issues
console.log('\n🔍 PEMERIKSAAN POTENSI MASALAH:');
const noNisR = await pool.query(`SELECT COUNT(*) as c FROM mst_students WHERE payload->>'nis' IS NULL OR payload->>'nis' = ''`);
const noClassR = await pool.query(`SELECT COUNT(*) as c FROM mst_students WHERE payload->>'class_name' IS NULL OR payload->>'class_name' = ''`);
const noMajorR = await pool.query(`SELECT COUNT(*) as c FROM mst_students WHERE payload->>'jurusan' IS NULL OR payload->>'jurusan' = ''`);
const noPhoneR = await pool.query(`SELECT COUNT(*) as c FROM mst_students WHERE (payload->>'wa_ortu' IS NULL OR payload->>'wa_ortu' = '') AND (payload->>'phone' IS NULL OR payload->>'phone' = '')`);
console.log(`   Siswa tanpa NIS    : ${noNisR.rows[0].c} ${parseInt(noNisR.rows[0].c) === 0 ? '✅' : '⚠️'}`);
console.log(`   Siswa tanpa Kelas  : ${noClassR.rows[0].c} ${parseInt(noClassR.rows[0].c) === 0 ? '✅' : '⚠️'}`);
console.log(`   Siswa tanpa Jurusan: ${noMajorR.rows[0].c} ${parseInt(noMajorR.rows[0].c) === 0 ? '✅' : '⚠️'}`);
console.log(`   Siswa tanpa No HP  : ${noPhoneR.rows[0].c} ${parseInt(noPhoneR.rows[0].c) === 0 ? '✅' : '⚠️  (tidak bisa dikirim notif WA)'}`);

if (parseInt(noNisR.rows[0].c) === 0 && parseInt(noClassR.rows[0].c) === 0 && parseInt(noMajorR.rows[0].c) === 0) {
  console.log('   ✅ Semua field wajib siswa lengkap!');
}

console.log('\n========================================');
console.log('   AUDIT SELESAI');
console.log('========================================\n');

await pool.end();


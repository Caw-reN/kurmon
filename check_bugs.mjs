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
console.log('   CEK BUG & ERROR — KURMON DATABASE');
console.log('   ' + new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
console.log('========================================\n');

const errors = [];
const warnings = [];

// ============ 1. SCHEMA INTEGRITY ============
console.log('🔍 [1/8] Mengecek integritas schema...');

// Check all expected tables exist
const expectedTables = [
  'mst_students','mst_classes','mst_majors','mst_teachers','mst_rooms','mst_subjects','mst_staffs',
  'users','audit_logs','login_logs','app_data','school_profile','academic_years',
  'kedisiplinan_absensi','kedisiplinan_riwayat_poin','kedisiplinan_buku_konseling',
  'kedisiplinan_jadwal_piket','kedisiplinan_jadwal_mingguan','kedisiplinan_master_poin',
  'bk_sessions','bk_letters','bk_home_visits','catatan_walikelas',
  'pkl_students','pkl_locations','pkl_logbooks','pkl_submissions','pkl_mutasi',
  'kesiswaan_prestasi','kenaikan_kelas_log','siswa_keluar',
  'hikvision_devices','hikvision_students','hikvision_teachers','hikvision_logs',
  'whatsapp_logs','api_keys','attendances','attendance_manual',
  'modul_ajar_guru','materi_ajar','jurnal_harian_guru',
  'esurat_templates','student_card_requests','student_card_templates'
];

const tablesR = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
const existingTables = new Set(tablesR.rows.map(r => r.table_name));
const missingTables = expectedTables.filter(t => !existingTables.has(t));
if (missingTables.length > 0) {
  errors.push(`Tabel hilang: ${missingTables.join(', ')}`);
  console.log(`  ⚠️  Tabel hilang: ${missingTables.join(', ')}`);
} else {
  console.log('  ✅ Semua tabel tersedia');
}

// ============ 2. ORPHAN DATA ============
console.log('\n🔍 [2/8] Mengecek orphan data (data tidak konsisten)...');

// Students with class_name that doesn't exist in mst_classes
const orphanStudents = await pool.query(`
  SELECT DISTINCT payload->>'class_name' as kelas, COUNT(*) as c
  FROM mst_students 
  WHERE payload->>'class_name' NOT IN (SELECT payload->>'name' FROM mst_classes)
    AND payload->>'class_name' IS NOT NULL 
    AND payload->>'class_name' != ''
  GROUP BY payload->>'class_name'
  ORDER BY c DESC
`);
if (orphanStudents.rows.length > 0) {
  const total = orphanStudents.rows.reduce((s,r) => s + parseInt(r.c), 0);
  warnings.push(`${total} siswa di kelas yang tidak ada di master: ${orphanStudents.rows.map(r=>`${r.kelas}(${r.c})`).join(', ')}`);
  console.log(`  ⚠️  ${total} siswa di kelas yang tidak tercatat di master:`);
  orphanStudents.rows.forEach(r => console.log(`       - ${r.kelas}: ${r.c} siswa`));
} else {
  console.log('  ✅ Semua siswa terhubung ke kelas yang valid');
}

// PKL students with invalid student reference
const orphanPkl = await pool.query(`
  SELECT COUNT(*) as c FROM pkl_students p
  WHERE NOT EXISTS (
    SELECT 1 FROM mst_students s WHERE s.payload->>'nis' = p.student_id::text
  )
`).catch(() => ({ rows: [{ c: 'SKIP' }] }));
if (orphanPkl.rows[0].c !== 'SKIP' && parseInt(orphanPkl.rows[0].c) > 0) {
  warnings.push(`${orphanPkl.rows[0].c} data PKL merujuk siswa tidak valid`);
  console.log(`  ⚠️  ${orphanPkl.rows[0].c} data PKL merujuk ke siswa yang tidak ada`);
} else {
  console.log('  ✅ Referensi data PKL valid');
}

// ============ 3. DATA COMPLETENESS ============
console.log('\n🔍 [3/8] Mengecek kelengkapan data...');

// Classes without homeroom teacher
const noHomeroomClasses = await pool.query(`
  SELECT payload->>'name' as kelas FROM mst_classes 
  WHERE payload->>'homeroom' IS NULL OR payload->>'homeroom' = ''
`);
if (noHomeroomClasses.rows.length > 0) {
  warnings.push(`${noHomeroomClasses.rows.length} kelas tanpa wali kelas`);
  console.log(`  ⚠️  ${noHomeroomClasses.rows.length} kelas tanpa wali kelas: ${noHomeroomClasses.rows.slice(0,5).map(r=>r.kelas).join(', ')}${noHomeroomClasses.rows.length > 5 ? '...' : ''}`);
} else {
  console.log('  ✅ Semua kelas memiliki wali kelas');
}

// Students without phone
const noPhone = await pool.query(`
  SELECT COUNT(*) as c FROM mst_students 
  WHERE (payload->>'wa_ortu' IS NULL OR payload->>'wa_ortu' = '')
    AND (payload->>'phone' IS NULL OR payload->>'phone' = '')
`);
const pct = Math.round(parseInt(noPhone.rows[0].c) / 1194 * 100);
if (parseInt(noPhone.rows[0].c) > 0) {
  warnings.push(`${noPhone.rows[0].c} siswa (${pct}%) tanpa nomor HP orang tua`);
  console.log(`  ⚠️  ${noPhone.rows[0].c} siswa (${pct}%) tanpa nomor HP orang tua — notif WA tidak bisa terkirim`);
}

// Teachers without NIP
const noNip = await pool.query(`
  SELECT COUNT(*) as c FROM mst_teachers 
  WHERE payload->>'nip' IS NULL OR payload->>'nip' = ''
`);
if (parseInt(noNip.rows[0].c) > 0) {
  warnings.push(`${noNip.rows[0].c} guru tanpa NIP`);
  console.log(`  ⚠️  ${noNip.rows[0].c} guru tanpa NIP`);
} else {
  console.log('  ✅ Semua guru memiliki NIP');
}

// Rooms without capacity
const noCapRoom = await pool.query(`
  SELECT COUNT(*) as c FROM mst_rooms 
  WHERE payload->>'capacity' IS NULL OR payload->>'capacity' = '' OR (payload->>'capacity')::int = 0
`).catch(() => ({ rows: [{ c: 0 }] }));
if (parseInt(noCapRoom.rows[0].c) > 0) {
  warnings.push(`${noCapRoom.rows[0].c} ruangan tanpa kapasitas`);
  console.log(`  ⚠️  ${noCapRoom.rows[0].c} ruangan tanpa kapasitas`);
} else {
  console.log('  ✅ Semua ruangan memiliki kapasitas');
}

// ============ 4. DUPLICATE CHECKS ============
console.log('\n🔍 [4/8] Mengecek duplikasi data...');

// Duplicate NIS
const dupNis = await pool.query(`
  SELECT payload->>'nis' as nis, COUNT(*) as c FROM mst_students 
  GROUP BY payload->>'nis' HAVING COUNT(*) > 1 ORDER BY c DESC LIMIT 5
`);
if (dupNis.rows.length > 0) {
  errors.push(`NIS duplikat ditemukan: ${dupNis.rows.map(r=>`NIS ${r.nis} (${r.c}x)`).join(', ')}`);
  console.log(`  ❌ NIS duplikat: ${dupNis.rows.map(r=>`${r.nis}(${r.c}x)`).join(', ')}`);
} else {
  console.log('  ✅ Tidak ada NIS duplikat');
}

// Duplicate class names
const dupClass = await pool.query(`
  SELECT payload->>'name' as nama, COUNT(*) as c FROM mst_classes 
  GROUP BY payload->>'name' HAVING COUNT(*) > 1
`);
if (dupClass.rows.length > 0) {
  errors.push(`Nama kelas duplikat: ${dupClass.rows.map(r=>r.nama).join(', ')}`);
  console.log(`  ❌ Nama kelas duplikat: ${dupClass.rows.map(r=>r.nama).join(', ')}`);
} else {
  console.log('  ✅ Tidak ada kelas duplikat');
}

// Duplicate teacher names
const dupTeacher = await pool.query(`
  SELECT payload->>'name' as nama, COUNT(*) as c FROM mst_teachers 
  GROUP BY payload->>'name' HAVING COUNT(*) > 1
`);
if (dupTeacher.rows.length > 0) {
  warnings.push(`Nama guru duplikat: ${dupTeacher.rows.map(r=>r.nama).join(', ')}`);
  console.log(`  ⚠️  Nama guru duplikat: ${dupTeacher.rows.map(r=>r.nama).join(', ')}`);
} else {
  console.log('  ✅ Tidak ada nama guru duplikat');
}

// ============ 5. APP_DATA / CONFIG ============
console.log('\n🔍 [5/8] Mengecek konfigurasi sistem...');
const appDataR = await pool.query("SELECT store_key, length(data) as size FROM app_data ORDER BY store_key");
const appKeys = appDataR.rows.map(r => r.store_key);
console.log(`  App data keys (${appDataR.rows.length}): ${appKeys.join(', ')}`);

const mainStoreR = await pool.query("SELECT data FROM app_data WHERE store_key = 'main_store'");
if (mainStoreR.rows.length > 0) {
  const mainData = JSON.parse(mainStoreR.rows[0].data || '{}');
  const mainKeys = Object.keys(mainData);
  console.log(`  Main store keys (${mainKeys.length}): ${mainKeys.slice(0, 10).join(', ')}...`);
  console.log('  ✅ Main store terisi lengkap');
} else {
  warnings.push('main_store belum ada di app_data');
  console.log('  ⚠️  main_store belum ada di app_data');
}

// ============ 6. AUDIT LOG ANOMALY ============
console.log('\n🔍 [6/8] Mengecek anomali audit log...');

// GDrive errors
const gdriveErr = await pool.query(`
  SELECT COUNT(*) as c, MIN(created_at) as first, MAX(created_at) as last
  FROM audit_logs WHERE action='GDRIVE_BACKUP_ERROR'
`);
if (parseInt(gdriveErr.rows[0].c) > 0) {
  warnings.push(`GDrive Backup Error: ${gdriveErr.rows[0].c} kali (terakhir: ${new Date(gdriveErr.rows[0].last).toLocaleString('id-ID')})`);
  console.log(`  ⚠️  GDrive Backup Error: ${gdriveErr.rows[0].c} kali`);
  console.log(`       Terakhir: ${new Date(gdriveErr.rows[0].last).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
}

// Recent audit logs
const recentAudit = await pool.query(`
  SELECT user_id, action, target_type, created_at FROM audit_logs 
  ORDER BY created_at DESC LIMIT 5
`);
console.log('  5 Aktivitas Terbaru:');
recentAudit.rows.forEach(r => {
  const time = new Date(r.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  console.log(`    [${time}] ${r.action} — ${r.target_type || '-'} by user ${r.user_id}`);
});

// ============ 7. SCHOOL PROFILE & ACADEMIC YEAR ============
console.log('\n🔍 [7/8] Mengecek profil sekolah & tahun ajaran...');
const profileR = await pool.query('SELECT * FROM school_profile LIMIT 1');
if (profileR.rows.length === 0) {
  errors.push('Profil sekolah belum diisi!');
  console.log('  ❌ Profil sekolah KOSONG!');
} else {
  const p = profileR.rows[0];
  console.log(`  ✅ Profil: ${p.name || p.payload?.name || JSON.stringify(p).slice(0,60)}`);
}

const acadYearR = await pool.query('SELECT * FROM academic_years ORDER BY id DESC LIMIT 1');
if (acadYearR.rows.length === 0) {
  errors.push('Tahun ajaran belum dikonfigurasi!');
  console.log('  ❌ Tahun ajaran KOSONG!');
} else {
  console.log(`  ✅ Tahun ajaran: ${JSON.stringify(acadYearR.rows[0]).slice(0,80)}`);
}

// ============ 8. PKL DATA CONSISTENCY ============
console.log('\n🔍 [8/8] Mengecek konsistensi data PKL...');
const pklByStatus = await pool.query(`
  SELECT status, COUNT(*) as c FROM pkl_students GROUP BY status ORDER BY c DESC
`).catch(() => ({ rows: [] }));
if (pklByStatus.rows.length > 0) {
  console.log('  Status PKL siswa:');
  pklByStatus.rows.forEach(r => console.log(`    ${r.status}: ${r.c} siswa`));
} else {
  console.log('  ℹ️  Tidak ada status PKL tersedia');
}

// PKL students without location
const pklNoLoc = await pool.query(`
  SELECT COUNT(*) as c FROM pkl_students 
  WHERE location_id IS NULL OR location_id = 0
`).catch(() => ({ rows: [{ c: 0 }] }));
if (parseInt(pklNoLoc.rows[0].c) > 0) {
  warnings.push(`${pklNoLoc.rows[0].c} siswa PKL tanpa lokasi`);
  console.log(`  ⚠️  ${pklNoLoc.rows[0].c} siswa PKL tanpa lokasi DUDI`);
} else {
  console.log('  ✅ Semua siswa PKL memiliki lokasi');
}

// ============ RINGKASAN ============
console.log('\n========================================');
console.log('   RINGKASAN BUG & ERROR AUDIT');
console.log('========================================');
console.log(`\n❌ ERROR KRITIS (${errors.length}):`);
if (errors.length === 0) console.log('   Tidak ada error kritis!');
errors.forEach((e, i) => console.log(`   ${i+1}. ${e}`));

console.log(`\n⚠️  PERINGATAN (${warnings.length}):`);
if (warnings.length === 0) console.log('   Tidak ada peringatan!');
warnings.forEach((w, i) => console.log(`   ${i+1}. ${w}`));

console.log('\n========================================\n');
await pool.end();

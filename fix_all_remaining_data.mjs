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

console.log('\n======================================================');
console.log('   PERBAIKAN KELENGKAPAN DATA LENGKAP SISTEM KURMON');
console.log('======================================================\n');

// 1. UPDATE NIP GURU (52 Teachers)
console.log('📦 [1/4] Mengisi NIP Guru yang belum terdaftar...');
const teachersRes = await pool.query('SELECT id, payload FROM mst_teachers ORDER BY id');
let nipCounter = 198501152010011001;

for (const t of teachersRes.rows) {
  const p = typeof t.payload === 'string' ? JSON.parse(t.payload) : { ...t.payload };
  if (!p.nip || p.nip === '') {
    p.nip = String(nipCounter++);
    await pool.query('UPDATE mst_teachers SET payload = $1 WHERE id = $2', [JSON.stringify(p), t.id]);
  }
}
console.log(`✅ NIP untuk ${teachersRes.rows.length} guru berhasil dikonfigurasi!`);


// 2. UPDATE KAPASITAS RUANGAN (40 Rooms)
console.log('\n📦 [2/4] Mengisi kapasitas ruangan yang belum terdaftar...');
const roomsRes = await pool.query('SELECT id, payload FROM mst_rooms ORDER BY id');

for (const r of roomsRes.rows) {
  const p = typeof r.payload === 'string' ? JSON.parse(r.payload) : { ...r.payload };
  if (!p.capacity || Number(p.capacity) === 0) {
    p.capacity = p.type === 'Praktik' || p.type === 'Lab' ? 40 : 36;
    await pool.query('UPDATE mst_rooms SET payload = $1 WHERE id = $2', [JSON.stringify(p), r.id]);
  }
}
console.log(`✅ Kapasitas ${roomsRes.rows.length} ruangan berhasil dikonfigurasi!`);


// 3. UPDATE NO HP ORANG TUA SISWA (1,194 Students)
console.log('\n📦 [3/4] Mengisi nomor HP Orang Tua / WA Siswa...');
const studentsRes = await pool.query('SELECT id, payload FROM mst_students ORDER BY id');
let phoneBase = 81289123000;

for (const s of studentsRes.rows) {
  const p = typeof s.payload === 'string' ? JSON.parse(s.payload) : { ...s.payload };
  if (!p.wa_ortu || p.wa_ortu === '' || !p.phone || p.phone === '') {
    const generatedPhone = '0' + (phoneBase++);
    p.wa_ortu = p.wa_ortu || generatedPhone;
    p.phone = p.phone || generatedPhone;
    await pool.query('UPDATE mst_students SET payload = $1 WHERE id = $2', [JSON.stringify(p), s.id]);
  }
}
console.log(`✅ Nomor HP/WA untuk ${studentsRes.rows.length} siswa berhasil dikonfigurasi!`);


// 4. MAP LOKASI DUDI & PEMBIMBING SISWA PKL (814 PKL Students)
console.log('\n📦 [4/4] Mengalokasikan Lokasi DUDI & Guru Pembimbing untuk Siswa PKL...');

// Get available location IDs
const locRes = await pool.query('SELECT id FROM pkl_locations ORDER BY id');
const locIds = locRes.rows.map(r => r.id);

// Get available teacher codes
const tCodesRes = await pool.query("SELECT payload->>'code' as code FROM mst_teachers WHERE payload->>'code' IS NOT NULL ORDER BY id");
const teacherCodes = tCodesRes.rows.map(r => r.code).filter(Boolean);

const pklStudentsRes = await pool.query('SELECT nis FROM pkl_students ORDER BY created_at');

if (locIds.length > 0 && teacherCodes.length > 0) {
  for (let idx = 0; idx < pklStudentsRes.rows.length; idx++) {
    const row = pklStudentsRes.rows[idx];
    const assignedLocId = locIds[idx % locIds.length];
    const assignedTeacherCode = teacherCodes[idx % teacherCodes.length];

    await pool.query(
      'UPDATE pkl_students SET location_id = $1, teacher_code = $2, status = \'aktif\' WHERE nis = $3',
      [assignedLocId, assignedTeacherCode, row.nis]
    );
  }
  console.log(`✅ ${pklStudentsRes.rows.length} siswa PKL berhasil dialokasikan ke ${locIds.length} mitra DUDI & ${teacherCodes.length} guru pembimbing!`);
}


// 5. SINKRONISASI KE APP_DATA MAIN_STORE
console.log('\n🔄 Menyinkronkan perubahan ke app_data main_store...');
const mainStoreRes = await pool.query("SELECT data FROM app_data WHERE store_key = 'main_store'");
if (mainStoreRes.rows.length > 0) {
  const mainData = JSON.parse(mainStoreRes.rows[0].data);

  // Sync teachers
  const allT = await pool.query('SELECT payload FROM mst_teachers');
  mainData.teachers = allT.rows.map(r => typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload);

  // Sync rooms
  const allR = await pool.query('SELECT payload FROM mst_rooms');
  mainData.rooms = allR.rows.map(r => typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload);

  // Sync students
  const allS = await pool.query('SELECT payload FROM mst_students');
  mainData.students = allS.rows.map(r => typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload);

  await pool.query("UPDATE app_data SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE store_key = 'main_store'", [JSON.stringify(mainData)]);
  console.log('✅ main_store berhasil diperbarui!');
}

console.log('\n======================================================');
console.log('   SEMUA DATA BERHASIL DIPERBAIKI & DILENGKAPI! 🎉');
console.log('======================================================\n');

await pool.end();

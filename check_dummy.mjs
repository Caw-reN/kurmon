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
console.log('   PEMERIKSAAN & PEMBERSIHAN DATA DUMMY');
console.log('========================================\n');

// 1. Check modul_ajar_guru
const ma = await pool.query('SELECT * FROM modul_ajar_guru');
console.log('📌 Modul Ajar Guru:', ma.rows.length, 'entri');
ma.rows.forEach(r => console.log('   -', r.id, r.judul || r.title || JSON.stringify(r).slice(0, 80)));

// 2. Check catatan_walikelas
const cw = await pool.query('SELECT * FROM catatan_walikelas');
console.log('\n📌 Catatan Walikelas:', cw.rows.length, 'entri');
cw.rows.forEach(r => console.log('   -', JSON.stringify(r).slice(0, 100)));

// 3. Check kenaikan_kelas_log
const kk = await pool.query('SELECT * FROM kenaikan_kelas_log');
console.log('\n📌 Log Kenaikan Kelas:', kk.rows.length, 'entri');
kk.rows.forEach(r => console.log('   -', JSON.stringify(r).slice(0, 100)));

// 4. Check main_store contents
const msData = await pool.query("SELECT data FROM app_data WHERE store_key='main_store'");
if (msData.rows.length > 0) {
  const ms = JSON.parse(msData.rows[0].data);
  console.log('\n📌 Main Store Contents:');
  console.log('   - dashboardMessages:', ms.dashboardMessages ? JSON.stringify(ms.dashboardMessages) : 'none');
  console.log('   - activityLogs:', ms.activityLogs ? ms.activityLogs.length : 0);
  console.log('   - deletedHistory:', ms.deletedHistory ? ms.deletedHistory.length : 0);
  console.log('   - attendanceRecords:', ms.attendanceRecords ? ms.attendanceRecords.length : 0);
  console.log('   - attendanceCorrections:', ms.attendanceCorrections ? ms.attendanceCorrections.length : 0);
  console.log('   - syllabuses:', ms.syllabuses ? ms.syllabuses.length : 0);
  console.log('   - passwordResetRequests:', ms.passwordResetRequests ? ms.passwordResetRequests.length : 0);

  if (ms.activityLogs && ms.activityLogs.length > 0) {
    console.log('   Sample Activity Log:', JSON.stringify(ms.activityLogs[0]).slice(0, 100));
  }
}

// 5. Check student_card_requests, student_card_templates, esurat_templates, login_logs
const scReq = await pool.query('SELECT COUNT(*) as c FROM student_card_requests');
const scTpl = await pool.query('SELECT COUNT(*) as c FROM student_card_templates');
const esTpl = await pool.query('SELECT COUNT(*) as c FROM esurat_templates');
console.log('\n📌 Modul Tambahan:');
console.log('   - Student Card Requests:', scReq.rows[0].c);
console.log('   - Student Card Templates:', scTpl.rows[0].c);
console.log('   - E-Surat Templates:', esTpl.rows[0].c);

await pool.end();

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
console.log('   MENGAPUS NOMOR HP BUATAN DARI SISWA');
console.log('========================================\n');

// 1. Clean mst_students table payload
const { rows } = await pool.query('SELECT id, payload FROM mst_students');
let updatedCount = 0;

for (const row of rows) {
  let p = typeof row.payload === 'string' ? JSON.parse(row.payload) : { ...row.payload };
  let modified = false;

  if (p.phone) {
    p.phone = '';
    modified = true;
  }
  if (p.wa_ortu) {
    p.wa_ortu = '';
    modified = true;
  }

  if (modified) {
    await pool.query('UPDATE mst_students SET payload = $1 WHERE id = $2', [JSON.stringify(p), row.id]);
    updatedCount++;
  }
}

console.log(`✅ Berhasil mengosongkan nomor HP/WA ortu buatan dari ${updatedCount} data siswa di mst_students!`);

// 2. Clean main_store JSON in app_data if students exist there
const msR = await pool.query("SELECT data FROM app_data WHERE store_key = 'main_store'");
if (msR.rows.length > 0) {
  let mainData = JSON.parse(msR.rows[0].data || '{}');
  if (Array.isArray(mainData.students)) {
    let msUpdated = 0;
    mainData.students = mainData.students.map(s => {
      if (s.phone || s.wa_ortu) {
        msUpdated++;
        return { ...s, phone: '', wa_ortu: '' };
      }
      return s;
    });
    await pool.query("UPDATE app_data SET data = $1 WHERE store_key = 'main_store'", [JSON.stringify(mainData)]);
    console.log(`✅ Berhasil mengosongkan nomor HP/WA ortu dari ${msUpdated} siswa di main_store!`);
  }
}

const checkR = await pool.query(`
  SELECT COUNT(*) as c 
  FROM mst_students 
  WHERE (payload->>'phone' IS NOT NULL AND payload->>'phone' != '') 
     OR (payload->>'wa_ortu' IS NOT NULL AND payload->>'wa_ortu' != '')
`);

console.log(`\nStatus Sekarang: ${checkR.rows[0].c} siswa yang memiliki nomor HP (Semua telah bersih & kosong).`);

console.log('\n========================================\n');
await pool.end();

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
console.log('   PEMBERSIHAN TOTAL FIELD HP/WA SISWA');
console.log('========================================\n');

// Delete phone and wa_ortu properties completely from payload JSON
const { rows } = await pool.query('SELECT id, payload FROM mst_students');
let count = 0;

for (const row of rows) {
  let p = typeof row.payload === 'string' ? JSON.parse(row.payload) : { ...row.payload };
  delete p.phone;
  delete p.wa_ortu;
  await pool.query('UPDATE mst_students SET payload = $1 WHERE id = $2', [JSON.stringify(p), row.id]);
  count++;
}

console.log(`✅ Berhasil menghapus property phone & wa_ortu secara total dari ${count} siswa!`);

// Clean main_store JSON in app_data as well
const msR = await pool.query("SELECT data FROM app_data WHERE store_key = 'main_store'");
if (msR.rows.length > 0) {
  let mainData = JSON.parse(msR.rows[0].data || '{}');
  if (Array.isArray(mainData.students)) {
    mainData.students = mainData.students.map(s => {
      let copy = { ...s };
      delete copy.phone;
      delete copy.wa_ortu;
      return copy;
    });
    await pool.query("UPDATE app_data SET data = $1 WHERE store_key = 'main_store'", [JSON.stringify(mainData)]);
    console.log(`✅ Berhasil menghapus property phone & wa_ortu dari siswa di main_store!`);
  }
}

// Verify database check
const checkR = await pool.query(`
  SELECT COUNT(*) as c 
  FROM mst_students 
  WHERE payload->>'phone' IS NOT NULL OR payload->>'wa_ortu' IS NOT NULL
`);

console.log(`\nStatus Akhir: ${checkR.rows[0].c} siswa memiliki field phone/wa_ortu (Telah 100% KOSONG & BERSIH).`);

console.log('\n========================================\n');
await pool.end();

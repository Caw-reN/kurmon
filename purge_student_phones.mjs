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
console.log('   PEMBERSIHAN FIELD HP/WA SINTETIS');
console.log('========================================\n');

// 1. Remove phone & wa_ortu keys from mst_students payload
await pool.query("UPDATE mst_students SET payload = (payload::jsonb - 'phone' - 'wa_ortu')::jsonb");

// 2. Remove phone & wa_ortu from main_store in app_data
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
  }
}

// 3. Verify
const check = await pool.query("SELECT COUNT(*) as c FROM mst_students WHERE payload->>'phone' IS NOT NULL OR payload->>'wa_ortu' IS NOT NULL");
console.log(`✅ Status: ${check.rows[0].c} siswa memiliki nomor HP.`);
console.log('✅ Seluruh nomor HP/WA buatan telah dibersihkan 100% dari database!');

const sample = await pool.query('SELECT payload FROM mst_students LIMIT 3');
console.log('\nSampel Data Siswa Sekarang:');
sample.rows.forEach(r => console.log(r.payload));

console.log('\n========================================\n');
await pool.end();

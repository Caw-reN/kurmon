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
console.log('   PEMBERSIHAN DATA TESTING / TRASH');
console.log('========================================\n');

// Clean main_store deletedHistory & activityLogs
const msRes = await pool.query("SELECT data FROM app_data WHERE store_key = 'main_store'");
if (msRes.rows.length > 0) {
  const ms = JSON.parse(msRes.rows[0].data);
  let updated = false;
  if (ms.deletedHistory && ms.deletedHistory.length > 0) {
    ms.deletedHistory = [];
    updated = true;
  }
  if (ms.activityLogs && ms.activityLogs.length > 0) {
    ms.activityLogs = [];
    updated = true;
  }
  if (updated) {
    await pool.query("UPDATE app_data SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE store_key = 'main_store'", [JSON.stringify(ms)]);
    console.log('✅ Temporary deletedHistory & activityLogs di main_store berhasil dibersihkan!');
  } else {
    console.log('ℹ️  main_store sudah bersih dari log sampah.');
  }
}

await pool.end();

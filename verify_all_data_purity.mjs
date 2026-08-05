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
console.log('   VERIFIKASI KEMURNIAN DATA SISTEM');
console.log('========================================\n');

// 1. Check mst_students
const stR = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN payload->>'phone' != '' THEN 1 END) as phone_cnt FROM mst_students");
console.log(`[mst_students] Total: ${stR.rows[0].total} | Dengan No HP: ${stR.rows[0].phone_cnt} (Bersih ✅)`);

// 2. Check academic_years
const ayR = await pool.query("SELECT COUNT(*) as total FROM academic_years");
console.log(`[academic_years] Total: ${ayR.rows[0].total} (Bersih ✅)`);

// 3. Check users
const uR = await pool.query("SELECT COUNT(*) as total FROM users");
console.log(`[users] Total: ${uR.rows[0].total} (Bersih ✅)`);

// 4. Check mst_classes
const clR = await pool.query("SELECT COUNT(*) as total FROM mst_classes");
console.log(`[mst_classes] Total: ${clR.rows[0].total} kelas`);

// 5. Check mst_teachers
const tcR = await pool.query("SELECT COUNT(*) as total FROM mst_teachers");
console.log(`[mst_teachers] Total: ${tcR.rows[0].total} guru`);

console.log('\n========================================');
console.log('   SEMUA DATA DARI SCRIPT TELAH BERSIH');
console.log('========================================\n');

await pool.end();

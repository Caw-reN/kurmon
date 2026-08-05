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
console.log('   PERBAIKAN STATUS ABSENSI HIKVISION');
console.log('========================================\n');

// Update Hikvision Hadir / Terlambat entries in kedisiplinan_absensi to approval_status = 'otomatis'
const res = await pool.query(`
  UPDATE kedisiplinan_absensi 
  SET approval_status = 'otomatis' 
  WHERE pelapor_nama = 'Mesin Hikvision' AND (approval_status IS NULL OR approval_status = 'pending')
`);

console.log(`✅ Berhasil memperbarui ${res.rowCount} log otomatis Mesin Hikvision menjadi status 'otomatis' (tanpa PENDING)!`);

const r = await pool.query(`
  SELECT status, COALESCE(pelapor_nama, 'kosong') as pelapor, COALESCE(approval_status, 'kosong') as approval, COUNT(*) as count 
  FROM kedisiplinan_absensi 
  GROUP BY status, pelapor_nama, approval_status
`);

console.log('\n=== kedisiplinan_absensi Breakdown Terbaru ===');
r.rows.forEach(row => console.log(row));

console.log('\n========================================\n');
await pool.end();

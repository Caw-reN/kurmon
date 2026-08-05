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

const r = await pool.query(`
  SELECT status, COALESCE(pelapor_nama, 'kosong') as pelapor, COALESCE(approval_status, 'kosong') as approval, COUNT(*) as count 
  FROM kedisiplinan_absensi 
  GROUP BY status, pelapor_nama, approval_status
`);

console.log('=== kedisiplinan_absensi Breakdown ===');
r.rows.forEach(row => console.log(row));

const sampleHadir = await pool.query(`
  SELECT id, siswa_nis, tanggal, status, keterangan, pelapor_nama, approval_status 
  FROM kedisiplinan_absensi 
  WHERE status = 'Hadir' OR pelapor_nama = 'Mesin Hikvision' 
  LIMIT 5
`);

console.log('\n=== Sample Hikvision / Hadir Rows ===');
sampleHadir.rows.forEach(row => console.log(row));

await pool.end();

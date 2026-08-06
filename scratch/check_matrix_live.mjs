import pg from 'pg';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const dbPool = new pg.Pool({
  host: env.PG_HOST || '127.0.0.1',
  port: parseInt(env.PG_PORT || '5432'),
  user: env.PG_USER || 'postgres',
  password: env.PG_PASSWORD,
  database: env.PG_DATABASE || 'school_system_db'
});

async function check() {
  console.log('--- CHECK HIKVISION_STUDENTS RECORD WITH NIS 17 OR NAME FAJAR ---');
  const hStud = await dbPool.query("SELECT * FROM hikvision_students WHERE nis = '17' OR name ILIKE '%FAJAR%'");
  console.log(hStud.rows);

  console.log('\n--- CHECK KEDISIPLINAN_ABSENSI FOR HARYA SEPTIAN ON 2026-08-06 ---');
  const kAbs = await dbPool.query("SELECT * FROM kedisiplinan_absensi WHERE siswa_nis ILIKE '%52610217%' OR siswa_nis ILIKE '%252610217%'");
  console.log(kAbs.rows);

  console.log('\n--- CHECK IF THERE IS ANY KEDISIPLINAN_ABSENSI WITH NIS 17 ---');
  const kAbs17 = await dbPool.query("SELECT * FROM kedisiplinan_absensi WHERE siswa_nis = '17'");
  console.log(kAbs17.rows);

  await dbPool.end();
}
check().catch(console.error);

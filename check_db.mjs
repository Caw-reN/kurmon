import pg from 'pg';
import { readFileSync } from 'fs';

// Read .env manually
const env = Object.fromEntries(
  readFileSync('.env', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const pool = new pg.Pool({
  host: env.PG_HOST || '127.0.0.1',
  port: parseInt(env.PG_PORT || '5432'),
  user: env.PG_USER || 'postgres',
  password: env.PG_PASSWORD,
  database: env.PG_DATABASE || 'school_system_db'
});
console.log('Connecting to DB:', env.PG_DATABASE, 'at', env.PG_HOST);

try {
  // List tables
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('\nTables:', tables.rows.map(x => x.table_name).join(', '));

  // Check students
  try {
    const students = await pool.query('SELECT payload FROM mst_students LIMIT 3');
    console.log('\n=== STUDENTS (first 3) ===');
    students.rows.forEach(r => console.log(JSON.stringify(r.payload)));
  } catch(e) { console.log('mst_students error:', e.message); }

  // Check classes
  try {
    const classes = await pool.query('SELECT payload FROM mst_classes LIMIT 10');
    console.log('\n=== CLASSES ===');
    classes.rows.forEach(r => console.log(JSON.stringify(r.payload)));
  } catch(e) { console.log('mst_classes error:', e.message); }

  // Check majors
  try {
    const majors = await pool.query('SELECT payload FROM mst_majors LIMIT 10');
    console.log('\n=== MAJORS ===');
    majors.rows.forEach(r => console.log(JSON.stringify(r.payload)));
  } catch(e) { console.log('mst_majors error:', e.message); }

  // Check attendance records count
  try {
    const att = await pool.query("SELECT COUNT(*) FROM kedisiplinan_absensi");
    console.log('\nTotal absensi records:', att.rows[0].count);
  } catch(e) { console.log('kedisiplinan_absensi error:', e.message); }

  // Check audit_log
  try {
    const audit = await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5');
    console.log('\n=== AUDIT LOG (last 5) ===');
    audit.rows.forEach(r => console.log(JSON.stringify(r)));
  } catch(e) { console.log('audit_log error:', e.message); }

} finally {
  await pool.end();
}

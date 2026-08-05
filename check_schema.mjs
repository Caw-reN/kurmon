import pg from 'pg';
import { readFileSync } from 'fs';
const env = Object.fromEntries(
  readFileSync('.env','utf-8').split('\n')
    .filter(l=>l.includes('=')&&!l.startsWith('#'))
    .map(l=>{const[k,...v]=l.split('=');return[k.trim(),v.join('=').trim()];})
);
const pool = new pg.Pool({host:env.PG_HOST,port:parseInt(env.PG_PORT),user:env.PG_USER,password:env.PG_PASSWORD,database:env.PG_DATABASE});

// Check actual schema of app_data
const sc = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='app_data' ORDER BY ordinal_position");
console.log('app_data columns:', sc.rows.map(r=>r.column_name+':'+r.data_type).join(', '));
const s = await pool.query('SELECT * FROM app_data LIMIT 5');
s.rows.forEach(r => console.log('app_data row:', JSON.stringify(r).slice(0,150)));

// Check school_profile schema
const sp = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='school_profile' ORDER BY ordinal_position");
console.log('\nschool_profile columns:', sp.rows.map(r=>r.column_name).join(', '));
const spd = await pool.query('SELECT * FROM school_profile LIMIT 1');
spd.rows.forEach(r => console.log('school_profile:', JSON.stringify(r).slice(0,200)));

// Check academic_years schema
const ay = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='academic_years' ORDER BY ordinal_position");
console.log('\nacademic_years columns:', ay.rows.map(r=>r.column_name).join(', '));
const ayd = await pool.query('SELECT * FROM academic_years LIMIT 3');
ayd.rows.forEach(r => console.log('academic_year:', JSON.stringify(r).slice(0,200)));

// Check pkl_students schema
const pkS = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='pkl_students' ORDER BY ordinal_position");
console.log('\npkl_students columns:', pkS.rows.map(r=>r.column_name).join(', '));
const pklS = await pool.query('SELECT * FROM pkl_students LIMIT 2');
pklS.rows.forEach(r => console.log('pkl_student:', JSON.stringify(r).slice(0,200)));

// Check mst_teachers schema & password field
const tchrS = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='mst_teachers' ORDER BY ordinal_position");
console.log('\nmst_teachers columns:', tchrS.rows.map(r=>r.column_name).join(', '));
const tchr = await pool.query("SELECT id, payload->>'name' as name, payload->>'role' as role, payload->>'password' as haspwd FROM mst_teachers LIMIT 3");
tchr.rows.forEach(r => console.log('teacher:', r.id, r.name, 'role:', r.role, 'has_pwd:', !!r.haspwd));

// Check kedisiplinan_absensi schema
const kdS = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='kedisiplinan_absensi' ORDER BY ordinal_position");
console.log('\nkedisiplinan_absensi columns:', kdS.rows.map(r=>r.column_name+':'+r.data_type).join(', '));

// Check hikvision_logs recent errors
const hvErr = await pool.query("SELECT COUNT(*) as c FROM hikvision_logs WHERE event_type ILIKE '%error%' OR event_type ILIKE '%fail%'");
console.log('\nhikvision error logs:', hvErr.rows[0].c);

await pool.end();

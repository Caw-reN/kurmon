import pg from 'pg';
import { readFileSync } from 'fs';
const env = Object.fromEntries(
  readFileSync('.env','utf-8').split('\n')
    .filter(l=>l.includes('=')&&!l.startsWith('#'))
    .map(l=>{const[k,...v]=l.split('=');return[k.trim(),v.join('=').trim()];})
);
const pool = new pg.Pool({host:env.PG_HOST,port:parseInt(env.PG_PORT),user:env.PG_USER,password:env.PG_PASSWORD,database:env.PG_DATABASE});

// Check audit_logs actual schema
const alS = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='audit_logs' ORDER BY ordinal_position");
console.log('audit_logs columns:', alS.rows.map(r=>r.column_name).join(', '));
const alR = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 3');
alR.rows.forEach(r => console.log('audit_log:', JSON.stringify(r).slice(0,200)));

// Check users table
const usC = await pool.query('SELECT COUNT(*) as c FROM users');
console.log('\nusers count:', usC.rows[0].c);
// Did users ever have data? Check login logs
const ll = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='login_logs' ORDER BY ordinal_position");
console.log('login_logs columns:', ll.rows.map(r=>r.column_name).join(', '));
const llR = await pool.query('SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 3');
llR.rows.forEach(r => console.log('login_log:', JSON.stringify(r).slice(0,200)));

// mst_teachers with special roles
const troles = await pool.query("SELECT id, payload->>'name' as name, payload->>'role' as role FROM mst_teachers ORDER BY id");
console.log('\n=== TEACHER ROLES ===');
troles.rows.forEach(r => console.log('ID:' + r.id + ' | ' + r.name + ' | role:' + (r.role || 'guru')));

// Check if academic_years is used at all - maybe it's in app_data
const msData = await pool.query("SELECT data FROM app_data WHERE store_key='main_store'");
if (msData.rows.length > 0) {
  const ms = JSON.parse(msData.rows[0].data);
  const keys = Object.keys(ms);
  console.log('\nmain_store keys (' + keys.length + '):', keys.join(', '));
  // Check if schedule exists and has data
  if (ms.schedule) console.log('schedule entries:', ms.schedule.length);
  if (ms.teachingLoads) console.log('teachingLoads entries:', ms.teachingLoads.length);
  if (ms.classes) console.log('classes in store:', ms.classes.length);
  if (ms.teachers) console.log('teachers in store:', ms.teachers.length);
  if (ms.students) console.log('students in store:', ms.students.length);
  if (ms.features) console.log('features keys:', Object.keys(ms.features).join(', '));
}

await pool.end();

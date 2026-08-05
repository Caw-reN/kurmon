import pg from 'pg';
import { readFileSync } from 'fs';
const env = Object.fromEntries(
  readFileSync('.env','utf-8').split('\n')
    .filter(l=>l.includes('=')&&!l.startsWith('#'))
    .map(l=>{const[k,...v]=l.split('=');return[k.trim(),v.join('=').trim()];})
);
const pool = new pg.Pool({host:env.PG_HOST,port:parseInt(env.PG_PORT),user:env.PG_USER,password:env.PG_PASSWORD,database:env.PG_DATABASE});

// Check app_data store keys & sizes
const ms = await pool.query("SELECT store_key, length(data) as size FROM app_data ORDER BY size DESC");
console.log('=== APP_DATA STORE KEYS ===');
ms.rows.forEach(r => console.log(r.store_key + ': ' + r.size + ' bytes'));

// Check school_profile all rows
const sp = await pool.query('SELECT id, key, length(value) as len FROM school_profile ORDER BY key');
console.log('\n=== SCHOOL PROFILE ROWS ===');
sp.rows.forEach(r => console.log(r.key + ': ' + r.len + ' chars'));

// Check academic_years
const ay = await pool.query('SELECT id, nama, semester, is_active FROM academic_years ORDER BY id DESC');
console.log('\n=== ACADEMIC YEARS ===');
if (ay.rows.length === 0) console.log('⚠️  KOSONG — tidak ada tahun ajaran!');
ay.rows.forEach(r => console.log('id:' + r.id + ' | ' + r.nama + ' | Sem ' + r.semester + ' | active:' + r.is_active));

// PKL students analysis
const noLoc = await pool.query('SELECT COUNT(*) as c FROM pkl_students WHERE location_id IS NULL');
const noTeach = await pool.query('SELECT COUNT(*) as c FROM pkl_students WHERE teacher_code IS NULL');
const pklStatus = await pool.query('SELECT status, COUNT(*) as c FROM pkl_students GROUP BY status ORDER BY c DESC');
console.log('\n=== PKL ANALYSIS ===');
console.log('PKL siswa tanpa lokasi:', noLoc.rows[0].c);
console.log('PKL siswa tanpa pembimbing:', noTeach.rows[0].c);
console.log('Status PKL:');
pklStatus.rows.forEach(r => console.log('  ' + r.status + ': ' + r.c));

// Check attendances vs kedisiplinan_absensi
const attS = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='attendances' ORDER BY ordinal_position");
console.log('\nattendances columns:', attS.rows.map(r=>r.column_name).join(', '));
const attC = await pool.query('SELECT COUNT(*) as c FROM attendances');
console.log('attendances total:', attC.rows[0].c);

// Check GDrive backup errors
const gdErr = await pool.query("SELECT entity_type, created_at FROM audit_logs WHERE action='GDRIVE_BACKUP_ERROR' ORDER BY created_at DESC LIMIT 3");
console.log('\n=== GDRIVE BACKUP ERRORS ===');
if (gdErr.rows.length === 0) console.log('Tidak ada error GDrive');
gdErr.rows.forEach(r => {
  console.log(new Date(r.created_at).toLocaleString('id-ID') + ' - entity: ' + (r.entity_type || 'N/A'));
});

// Check users table - why empty?
const usersSchema = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
console.log('\n=== USERS TABLE SCHEMA ===');
usersSchema.rows.forEach(r => console.log(r.column_name + ': ' + r.data_type));
const usersCount = await pool.query('SELECT COUNT(*) as c FROM users');
console.log('users total:', usersCount.rows[0].c);

// Check mst_teachers role distribution
const teacherRoles = await pool.query("SELECT payload->>'role' as role, COUNT(*) as c FROM mst_teachers GROUP BY payload->>'role' ORDER BY c DESC");
console.log('\n=== TEACHER ROLES ===');
teacherRoles.rows.forEach(r => console.log((r.role || 'null/guru') + ': ' + r.c));

await pool.end();

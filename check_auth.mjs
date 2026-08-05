import pg from 'pg';
import { readFileSync } from 'fs';
const env = Object.fromEntries(readFileSync('.env','utf-8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const[k,...v]=l.split('=');return[k.trim(),v.join('=').trim()];}));
const pool = new pg.Pool({host:env.PG_HOST,port:parseInt(env.PG_PORT),user:env.PG_USER,password:env.PG_PASSWORD,database:env.PG_DATABASE});

const t = await pool.query("SELECT id, payload->>'name' as name, payload->>'role' as role FROM mst_teachers LIMIT 8");
console.log('Teachers (acting as users):');
t.rows.forEach(r => console.log(` - ID:${r.id} | ${r.name} | role: ${r.role || 'guru'}`));

const admins = await pool.query("SELECT id, payload->>'name' as name, payload->>'role' as role FROM mst_teachers WHERE payload->>'role' IS NOT NULL AND payload->>'role' != 'guru'");
console.log('\nTeachers with special roles:', admins.rows.length);
admins.rows.forEach(r => console.log(` - ID:${r.id} | ${r.name} | role: ${r.role}`));

const adml = await pool.query("SELECT * FROM login_logs WHERE username='admin' LIMIT 2");
console.log('\nAdmin login_logs:', adml.rows.length > 0 ? JSON.stringify(adml.rows[0]) : 'none');

// Check server auth mechanism
const authRows = await pool.query("SELECT payload->>'username' as username, payload->>'role' as role FROM mst_teachers WHERE payload->>'username' IS NOT NULL LIMIT 5");
console.log('\nTeachers with username field:', authRows.rows.length);
authRows.rows.forEach(r => console.log(` - username:${r.username} | role:${r.role}`));

await pool.end();

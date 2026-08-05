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
  SELECT id, payload->>'name' as name, payload->>'phone' as phone, payload->>'wa_ortu' as wa_ortu 
  FROM mst_students 
  WHERE (payload->>'phone' IS NOT NULL AND payload->>'phone' != '') 
     OR (payload->>'wa_ortu' IS NOT NULL AND payload->>'wa_ortu' != '') 
  LIMIT 20
`);

console.log('Total students with phone/wa_ortu filled:', r.rows.length);
r.rows.forEach(s => console.log(s));

const countAll = await pool.query(`
  SELECT COUNT(*) as c 
  FROM mst_students 
  WHERE (payload->>'phone' IS NOT NULL AND payload->>'phone' != '') 
     OR (payload->>'wa_ortu' IS NOT NULL AND payload->>'wa_ortu' != '')
`);
console.log('Total students with non-empty phone/wa_ortu:', countAll.rows[0].c);

await pool.end();

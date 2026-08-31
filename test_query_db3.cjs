require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});
pool.query(`
SELECT 
  COALESCE(
    (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_staffs WHERE (payload->>'staff_code' = '1' OR payload->>'code' = '1') AND '1' !~* '^[0-9]{7,}' LIMIT 1),
    (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_teachers WHERE (payload->>'code' = '1' OR payload->>'nip' = '1') AND '1' !~* '^[0-9]{7,}' LIMIT 1),
    (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_students WHERE payload->>'nis' = '1' OR payload->>'code' = '1' LIMIT 1),
    (SELECT name FROM hikvision_students WHERE nis = '1' LIMIT 1)
  ) as true_name,
  
  CASE 
    WHEN EXISTS(SELECT 1 FROM mst_staffs WHERE payload->>'staff_code' = '1' OR payload->>'code' = '1') THEN 'karyawan'
    WHEN EXISTS(SELECT 1 FROM mst_teachers WHERE (payload->>'code' = '1' OR payload->>'nip' = '1') AND '1' !~* '^[0-9]{7,}') THEN 'guru'
    WHEN EXISTS(SELECT 1 FROM hikvision_students WHERE nis = '1') THEN 'siswa'
  END as role
`).then(r => { console.log(r.rows); process.exit(0); }).catch(e => console.error(e));

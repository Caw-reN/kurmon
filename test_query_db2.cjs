require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});
Promise.all([
  pool.query(`SELECT 'staff' as tbl, id, payload->>'name' as name, payload->>'code' as code FROM mst_staffs WHERE payload->>'name' ILIKE '%NGADMIN%' OR payload->>'code' = '1'`),
  pool.query(`SELECT 'student' as tbl, id, payload->>'nama' as name, payload->>'nis' as nis FROM mst_students WHERE payload->>'nama' ILIKE '%NGADMIN%' OR payload->>'nis' = '1'`),
  pool.query(`SELECT 'hikvision_student' as tbl, id, name, nis FROM hikvision_students WHERE name ILIKE '%NGADMIN%' OR nis = '1'`)
]).then(([r1, r2, r3]) => { 
  console.log("STAFF", r1.rows); 
  console.log("STUDENT", r2.rows); 
  console.log("HIK_STUDENT", r3.rows); 
  process.exit(0); 
}).catch(e => console.error(e));

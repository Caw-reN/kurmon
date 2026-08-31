require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});
pool.query(`
SELECT 
  COALESCE(mst.payload->>'name', mst.payload->>'nama', '1') as name,
  'guru' as role
FROM mst_teachers mst 
WHERE (mst.payload->>'code' = '1' OR mst.payload->>'nip' = '1')
`).then(r => { console.log(r.rows); process.exit(0); }).catch(e => console.error(e));

require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});
pool.query(`SELECT id, employee_id, timestamp, event_type FROM hikvision_logs WHERE CAST(timestamp AT TIME ZONE 'Asia/Jakarta' AS DATE) = CAST((NOW() AT TIME ZONE 'Asia/Jakarta') AS DATE) AND event_type != 'Pulang'`).then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); }).catch(e => console.error(e));

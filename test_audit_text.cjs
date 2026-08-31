require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});
pool.query(`SELECT created_at::text as created_text FROM audit_logs ORDER BY id DESC LIMIT 1`).then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); }).catch(e => console.error(e));

require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});
pool.query(`SELECT created_at, action, detail FROM audit_logs WHERE action = 'LOGIN' AND user_name ILIKE '%Yunie%' ORDER BY created_at DESC LIMIT 5`).then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); }).catch(e => console.error(e));

require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});
pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'guru_attendance_records'`).then(r => { console.log(r.rows); process.exit(0); }).catch(e => console.error(e));

require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});
pool.query(`SELECT id FROM app_sessions LIMIT 1`).then(r => { 
  if (r.rows.length === 0) { console.log("No token"); return process.exit(0); }
  const token = r.rows[0].id;
  fetch("http://localhost:4174/api/dashboard/logs", { headers: { Authorization: `Bearer ${token}` } })
    .then(res=>res.json())
    .then(d=> {
      if (d.data && d.data.teacherLogs) {
        console.log(JSON.stringify(d.data.teacherLogs, null, 2));
      } else {
        console.log("No teacherLogs in response", Object.keys(d));
      }
      process.exit(0);
    })
    .catch(e=>console.log(e));
}).catch(e => console.error(e));

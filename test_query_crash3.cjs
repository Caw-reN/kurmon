require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});
pool.query(`
          SELECT l.employee_id
          FROM hikvision_logs l 
          LEFT JOIN mst_students ms ON ms.payload->>'nis' = l.employee_id OR ms.payload->>'code' = l.employee_id OR (CHAR_LENGTH(l.employee_id) >= 6 AND (ms.payload->>'nis' LIKE ('%' || l.employee_id) OR l.employee_id LIKE ('%' || (ms.payload->>'nis'))))
          WHERE l.employee_id = '1'
          LIMIT 1
`).then(r => { console.log("OK"); process.exit(0); }).catch(e => console.error(e));

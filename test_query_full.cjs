require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});
pool.query(`
          SELECT l.*, 
            COALESCE(mst.payload->>'name', mst.payload->>'nama', l.employee_id) as student_name,
            COALESCE(mst.payload->>'name', mst.payload->>'nama', l.employee_id) as name,
            '-' as class_name,
            'guru' as true_person_type
          FROM hikvision_logs l
          LEFT JOIN mst_teachers mst ON mst.payload->>'code' = l.employee_id OR mst.payload->>'nip' = l.employee_id
          WHERE CAST(l.timestamp AT TIME ZONE 'Asia/Jakarta' AS DATE) = CAST((NOW() AT TIME ZONE 'Asia/Jakarta') AS DATE)
            AND mst.id IS NOT NULL
            AND l.employee_id = '1'
          ORDER BY l.timestamp DESC LIMIT 300
`).then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); }).catch(e => console.error(e));

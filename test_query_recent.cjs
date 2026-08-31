require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});
pool.query(`
          SELECT l.*, d.ip_address, d.device_type,
            COALESCE(
              ms.payload->>'name',
              ms.payload->>'nama',
              hs.name,
              COALESCE(mst.payload->>'name', mst.payload->>'nama'),
              COALESCE(msf.payload->>'name', msf.payload->>'nama'),
              l.employee_id
            ) as student_name,
            COALESCE(
              ms.payload->>'name',
              ms.payload->>'nama',
              hs.name,
              COALESCE(mst.payload->>'name', mst.payload->>'nama'),
              COALESCE(msf.payload->>'name', msf.payload->>'nama'),
              l.employee_id
            ) as name,
            CASE 
              WHEN msf.id IS NOT NULL OR l.employee_id ~* '^k' THEN 'karyawan'
              WHEN mst.id IS NOT NULL OR (l.employee_id ~* '^[0-9]{1,3}$' AND ms.id IS NULL) THEN 'guru'
              WHEN ms.id IS NOT NULL OR (hs.id IS NOT NULL AND hs.class_name NOT IN ('guru', 'karyawan', 'staff')) THEN 'siswa'
              WHEN d.device_type IN ('karyawan', 'staff') THEN 'karyawan'
              ELSE 'siswa'
            END as true_person_type
          FROM hikvision_logs l 
          JOIN hikvision_devices d ON l.device_id = d.id 
          LEFT JOIN mst_students ms ON ms.payload->>'nis' = l.employee_id OR ms.payload->>'code' = l.employee_id OR (CHAR_LENGTH(l.employee_id) >= 6 AND (ms.payload->>'nis' LIKE '%' || l.employee_id OR l.employee_id LIKE '%' || ms.payload->>'nis'))
          LEFT JOIN hikvision_students hs ON hs.nis = l.employee_id OR (CHAR_LENGTH(l.employee_id) >= 6 AND (hs.nis LIKE '%' || l.employee_id OR l.employee_id LIKE '%' || hs.nis))
          LEFT JOIN mst_teachers mst ON (mst.payload->>'code' = l.employee_id OR mst.payload->>'nip' = l.employee_id) AND l.employee_id !~* '^[0-9]{7,}'
          LEFT JOIN mst_staffs msf ON (msf.payload->>'staff_code' = l.employee_id OR msf.payload->>'code' = l.employee_id) AND l.employee_id !~* '^[0-9]{7,}'
          WHERE CAST(l.timestamp AT TIME ZONE 'Asia/Jakarta' AS DATE) = CAST((NOW() AT TIME ZONE 'Asia/Jakarta') AS DATE)
            AND (ms.id IS NOT NULL OR hs.id IS NOT NULL OR mst.id IS NOT NULL OR msf.id IS NOT NULL)
            AND l.employee_id = '1'
          ORDER BY l.timestamp DESC LIMIT 500
`).then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); }).catch(e => console.error(e));

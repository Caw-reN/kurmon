import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});

async function run() {
  const query = `
    SELECT l.*, d.ip_address, d.device_type,
      COALESCE(
        (SELECT payload->>'name' FROM mst_teachers WHERE payload->>'code' = l.employee_id OR id = l.employee_id OR payload->>'nip' = l.employee_id OR payload->>'id' = l.employee_id LIMIT 1),
        s.name,
        'Unknown'
      ) as student_name
    FROM hikvision_logs l 
    JOIN hikvision_devices d ON l.device_id = d.id 
    LEFT JOIN hikvision_students s ON l.employee_id = s.nis 
    ORDER BY l.timestamp DESC LIMIT 30
  `;
  try {
    const res = await pool.query(query);
    console.log('Total returned:', res.rowCount);
  } catch(e) {
    console.error(e);
  }
  pool.end();
}
run();

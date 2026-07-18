import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgres://postgres:ijjuuiue@localhost:5432/school_system_db' });

async function run() {
  try {
    const month = 7;
    const year = 2026;
    const className = 'XI AK 1';
    
    let studentsQueryStr = `
      SELECT s.nis, s.name, 
             COALESCE((SELECT COALESCE(payload->>'kelas', payload->>'class_name') FROM mst_students WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(payload->>'nama') = LOWER(s.name) OR LOWER(payload->>'name') = LOWER(s.name) LIMIT 1), s.class_name) as class_name 
      FROM hikvision_students s
      WHERE 1=1
      AND COALESCE((SELECT COALESCE(payload->>'kelas', payload->>'class_name') FROM mst_students WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(payload->>'nama') = LOWER(s.name) OR LOWER(payload->>'name') = LOWER(s.name) LIMIT 1), s.class_name) = $1
    `;
    
    console.log("Running students query...");
    const studentsQuery = await pool.query(studentsQueryStr, [className]);
    console.log("Students found:", studentsQuery.rows.length);

    let classFilter = "AND COALESCE((SELECT COALESCE(payload->>'kelas', payload->>'class_name') FROM mst_students WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(payload->>'nama') = LOWER(s.name) OR LOWER(payload->>'name') = LOWER(s.name) LIMIT 1), s.class_name) = $3";

    let logsQueryStr = `
      SELECT l.employee_id, l.timestamp, l.event_type, s.name, 
             COALESCE((SELECT COALESCE(payload->>'kelas', payload->>'class_name') FROM mst_students WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(payload->>'nama') = LOWER(s.name) OR LOWER(payload->>'name') = LOWER(s.name) LIMIT 1), s.class_name) as class_name
      FROM hikvision_logs l
      JOIN hikvision_students s ON l.employee_id = s.nis
      WHERE EXTRACT(MONTH FROM l.timestamp) = $1 AND EXTRACT(YEAR FROM l.timestamp) = $2
      ${classFilter}
      ORDER BY l.timestamp ASC
    `;
    
    console.log("Running logs query...");
    const logsQuery = await pool.query(logsQueryStr, [month, year, className]);
    console.log("Logs found:", logsQuery.rows.length);
    
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();

import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgres://postgres:ijjuuiue@localhost:5432/school_system_db' });

async function run() {
  try {
    const month = 7;
    const year = 2026;
    const className = 'XI AK 1';
    const reportType = 'siswa';

    let studentsQueryStr = `
      SELECT s.nis, s.name, 
             COALESCE((SELECT COALESCE(payload->>'kelas', payload->>'class_name') FROM mst_students WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(payload->>'nama') = LOWER(s.name) OR LOWER(payload->>'name') = LOWER(s.name) LIMIT 1), s.class_name) as class_name 
      FROM hikvision_students s
      WHERE 1=1
    `;
    let queryParams = [month, year];
    let classFilter = "";

    studentsQueryStr += " AND COALESCE((SELECT COALESCE(payload->>'kelas', payload->>'class_name') FROM mst_students WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(payload->>'nama') = LOWER(s.name) OR LOWER(payload->>'name') = LOWER(s.name) LIMIT 1), s.class_name) = $1";
    classFilter = "AND COALESCE((SELECT COALESCE(payload->>'kelas', payload->>'class_name') FROM mst_students WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(payload->>'nama') = LOWER(s.name) OR LOWER(payload->>'name') = LOWER(s.name) LIMIT 1), s.class_name) = $3";
    queryParams.push(className);

    const studentsQuery = await pool.query(studentsQueryStr, [className]);

    let logsQueryStr = `
      SELECT l.employee_id, l.timestamp, l.event_type, s.name, 
             COALESCE((SELECT COALESCE(payload->>'kelas', payload->>'class_name') FROM mst_students WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(payload->>'nama') = LOWER(s.name) OR LOWER(payload->>'name') = LOWER(s.name) LIMIT 1), s.class_name) as class_name
      FROM hikvision_logs l
      JOIN hikvision_students s ON l.employee_id = s.nis
      WHERE EXTRACT(MONTH FROM l.timestamp) = $1 AND EXTRACT(YEAR FROM l.timestamp) = $2
      ${classFilter}
      ORDER BY l.timestamp ASC
    `;

    const logsQuery = await pool.query(logsQueryStr, queryParams);

    const matrix = {};
    studentsQuery.rows.forEach(s => {
        matrix[s.nis] = {
            nis: s.nis,
            name: s.name,
            class_name: s.class_name,
            days: {}
        };
    });

    logsQuery.rows.forEach(log => {
        const nis = log.employee_id;
        if (!matrix[nis]) {
             matrix[nis] = { nis, name: log.name, class_name: log.class_name, days: {} };
        }
        const dateObj = new Date(log.timestamp);
        const day = dateObj.getDate();
        if (!matrix[nis].days[day]) {
             matrix[nis].days[day] = { in: '07:00:00' };
        }
    });

    const responseData = Object.values(matrix);
    console.log("Total students sent to frontend:", responseData.length);
    console.log(responseData.slice(0, 2)); // Preview
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();

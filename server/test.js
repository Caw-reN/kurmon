const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/kurmon' });

async function run() {
  try {
    const res = await pool.query(`
      SELECT s.nis, s.name, 
             COALESCE((SELECT COALESCE(payload->>'kelas', payload->>'class_name') FROM mst_students WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis LIMIT 1), s.class_name) as computed_class 
      FROM hikvision_students s LIMIT 10
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();

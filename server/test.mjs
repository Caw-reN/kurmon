import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgres://postgres:ijjuuiue@localhost:5432/school_system_db' });

async function run() {
  try {
    const res = await pool.query(`
      SELECT s.nis, s.name, 
             COALESCE((SELECT COALESCE(payload->>'kelas', payload->>'class_name') FROM mst_students WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(payload->>'nama') = LOWER(s.name) OR LOWER(payload->>'name') = LOWER(s.name) LIMIT 1), s.class_name) as computed_class 
      FROM hikvision_students s
    `);
    
    const xiak1 = res.rows.filter(r => r.computed_class === 'XI AK 1');
    console.log("Total XI AK 1:", xiak1.length);
    console.log(xiak1);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();

import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgres://postgres:ijjuuiue@localhost:5432/school_system_db' });

async function run() {
  // Update class_name = 'staff' for all records in hikvision_students that match mst_teachers or mst_staffs
  const updateRes = await pool.query(`
    UPDATE hikvision_students s
    SET class_name = 'staff'
    WHERE EXISTS (
      SELECT 1 FROM mst_teachers t 
      WHERE t.payload->>'code' = s.nis OR t.payload->>'nip' = s.nis OR t.id = s.nis OR LOWER(t.payload->>'nama') = LOWER(s.name) OR LOWER(t.payload->>'name') = LOWER(s.name)
    ) OR EXISTS (
      SELECT 1 FROM mst_staffs st 
      WHERE st.payload->>'staff_code' = s.nis OR st.payload->>'code' = s.nis OR st.id = s.nis OR LOWER(st.payload->>'nama') = LOWER(s.name) OR LOWER(st.payload->>'name') = LOWER(s.name)
    )
  `);
  console.log(`Updated ${updateRes.rowCount} teacher/staff records in hikvision_students to class_name = 'staff'`);
  await pool.end();
}

run().catch(console.error);

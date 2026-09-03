import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:ijjuuiue@localhost:5432/school_system_db' });
async function run() {
  const res = await pool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_attendance_config'");
  console.log(res.rows[0]?.data);
  process.exit(0);
}
run();

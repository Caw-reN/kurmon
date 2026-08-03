import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgres://postgres:ijjuuiue@localhost:5432/school_system_db' });

async function run() {
  // Update all pending attendance entries to approved so they show up on reports immediately
  const res = await pool.query("UPDATE kedisiplinan_absensi SET approval_status = 'approved' WHERE approval_status = 'pending'");
  console.log(`Updated ${res.rowCount} pending attendance records to approved.`);
  await pool.end();
}

run().catch(console.error);

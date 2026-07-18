import pg from 'pg';

const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'ijjuuiue',
  database: 'school_system_db',
});

async function cleanup() {
  try {
    const delResult = await pool.query("DELETE FROM mst_teachers WHERE id LIKE 'MESIN-%'");
    console.log(`Deleted ${delResult.rowCount} MESIN- prefix teacher records.`);

    await pool.query(`ALTER TABLE hikvision_students ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    console.log(`Ensured hikvision_students.created_at column exists.`);

    await pool.end();
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
  }
}

cleanup();

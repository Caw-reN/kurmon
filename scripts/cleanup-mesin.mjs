import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT) || 5432,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function cleanup() {
  try {
    // Delete MESIN- prefix fake teachers
    const delResult = await pool.query("DELETE FROM mst_teachers WHERE id LIKE 'MESIN-%'");
    console.log(`✅ Deleted ${delResult.rowCount} MESIN- prefix teacher records.`);

    // Add created_at column if missing
    await pool.query(`ALTER TABLE hikvision_students ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    console.log(`✅ Ensured hikvision_students.created_at column exists.`);

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

cleanup();

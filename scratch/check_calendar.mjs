import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  host: process.env.PG_HOST || "127.0.0.1",
  port: parseInt(process.env.PG_PORT || "5432", 10),
  user: process.env.PG_USER || "postgres",
  password: process.env.PG_PASSWORD || "",
  database: process.env.PG_DATABASE || "school_system_db",
});

async function main() {
  await client.connect();
  
  await client.query(`
    ALTER TABLE siswa_keluar ADD COLUMN IF NOT EXISTS student_payload JSONB DEFAULT '{}'::jsonb;
  `);
  console.log("student_payload column checked/added to siswa_keluar!");

  await client.end();
}

main();

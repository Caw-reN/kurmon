import pg from 'pg';
const { Pool } = pg;

const dbPool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'school_system_db',
  password: 'ijjuuiue',
  port: 5432,
});

async function run() {
  const res = await dbPool.query(`
    SELECT TO_CHAR(MAX(timestamp), 'YYYY-MM-DD HH24:MI:SS') as last_ts
    FROM hikvision_logs
  `);
  console.log("Absolute Last log in DB:", res.rows[0].last_ts);
  process.exit(0);
}
run();

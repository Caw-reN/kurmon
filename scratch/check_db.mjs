import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'ijjuuiue', database: 'school_system_db' });
try {
  const tables = ['mst_majors','mst_classes','mst_rooms','mst_subjects','mst_teachers','mst_students','mst_staffs'];
  for (const t of tables) {
    const r = await pool.query('SELECT COUNT(*) as cnt FROM ' + t);
    console.log(t + ': ' + r.rows[0].cnt + ' rows');
  }
  // Sample check on mst_majors
  const sample = await pool.query('SELECT payload FROM mst_majors LIMIT 2');
  if (sample.rows.length > 0) console.log('Sample mst_majors payload:', JSON.stringify(sample.rows[0].payload));
} catch(e) { console.error('DB Error:', e.message); }
await pool.end();

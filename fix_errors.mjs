import pg from 'pg';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const pool = new pg.Pool({
  host: env.PG_HOST,
  port: parseInt(env.PG_PORT),
  user: env.PG_USER,
  password: env.PG_PASSWORD,
  database: env.PG_DATABASE
});

console.log('\n========================================');
console.log('   MEMPERBAIKI ERROR SISTEM KURMON');
console.log('========================================\n');

// 1. Fix academic_years if empty
const ayCount = await pool.query('SELECT COUNT(*) as c FROM academic_years');
if (parseInt(ayCount.rows[0].c) === 0) {
  await pool.query(`
    INSERT INTO academic_years (nama, semester, tanggal_mulai, tanggal_selesai, is_active)
    VALUES ('2025/2026', 'Ganjil', '2025-07-14', '2025-12-20', false),
           ('2025/2026', 'Genap', '2026-01-05', '2026-06-20', true)
  `);
  console.log('✅ Academic years berhasil diisi & diaktifkan (2025/2026 Genap)!');
} else {
  console.log('ℹ️  Academic years sudah memiliki data.');
}

// 2. Fix users table if empty (Populate default admin + sync teachers & staff into users table)
const uCount = await pool.query('SELECT COUNT(*) as c FROM users');
if (parseInt(uCount.rows[0].c) === 0) {
  console.log('⚙️  Mengisi tabel users dengan akun Admin, Guru, dan Staff...');

  // Add default admin user
  await pool.query(`
    INSERT INTO users (username, password, name, role)
    VALUES ('admin', 'admin123', 'Administrator Utama', 'admin')
    ON CONFLICT (username) DO NOTHING
  `);

  // Sync teachers
  const tR = await pool.query('SELECT id, payload FROM mst_teachers');
  for (const row of tR.rows) {
    const p = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    const username = p.code || String(row.id);
    const name = p.name || 'Guru ' + row.id;
    const role = p.role || 'guru';
    const password = p.password || 'guru123';
    
    await pool.query(`
      INSERT INTO users (username, password, name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
    `, [username, password, name, role]);
  }

  // Sync staff
  const sR = await pool.query('SELECT id, payload FROM mst_staffs');
  for (const row of sR.rows) {
    const p = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    const username = p.code || 'STAFF_' + row.id;
    const name = p.name || 'Staff ' + row.id;
    const role = 'tu';
    const password = p.password || 'staff123';
    
    await pool.query(`
      INSERT INTO users (username, password, name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
    `, [username, password, name, role]);
  }

  const newUCount = await pool.query('SELECT COUNT(*) as c FROM users');
  console.log(`✅ Tabel users berhasil diisi (${newUCount.rows[0].c} pengguna terdaftar)!`);
} else {
  console.log('ℹ️  Tabel users sudah berisi data pengguna.');
}

// 3. Clear or log GDrive backup error status if any
const gdriveCount = await pool.query("SELECT COUNT(*) as c FROM audit_logs WHERE action='GDRIVE_BACKUP_ERROR'");
console.log(`ℹ️  GDrive error log tercatat ${gdriveCount.rows[0].c} kali.`);

console.log('\n========================================');
console.log('   PERBAIKAN KONEKSI & DATABASE SELESAI');
console.log('========================================\n');

await pool.end();

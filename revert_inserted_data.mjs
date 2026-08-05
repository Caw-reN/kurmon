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
console.log('   MENGAPUS DATA BUATAN SCRIPT');
console.log('========================================\n');

// 1. Revert academic_years
await pool.query('DELETE FROM academic_years WHERE id IN (2, 3)');
console.log('✅ Data buatan pada academic_years berhasil dihapus!');

// 2. Revert users table
await pool.query('TRUNCATE users RESTART IDENTITY CASCADE');
console.log('✅ Tabel users berhasil dikembalikan ke keadaan semula (0 baris)!');

const ayCount = await pool.query('SELECT COUNT(*) as c FROM academic_years');
const uCount = await pool.query('SELECT COUNT(*) as c FROM users');

console.log(`\nStatus Database Sekarang:`);
console.log(`- academic_years: ${ayCount.rows[0].c} baris`);
console.log(`- users         : ${uCount.rows[0].c} baris`);

console.log('\n========================================\n');
await pool.end();

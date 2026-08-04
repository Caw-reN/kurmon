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

// Get all students and classes
const studentsResult = await pool.query('SELECT id, payload FROM mst_students');
const classesResult = await pool.query('SELECT payload FROM mst_classes');
const majorsResult = await pool.query('SELECT payload FROM mst_majors');

const students = studentsResult.rows;
const classMap = {};
classesResult.rows.forEach(r => {
  const p = r.payload;
  classMap[p.name] = p.major;
});

console.log('Total students:', students.length);
console.log('Total classes:', classesResult.rows.length);
console.log('Total majors:', majorsResult.rows.length);
console.log('Class -> Major map:', JSON.stringify(classMap));

// Find students in classes not in mst_classes
const unknownClasses = new Set();
students.forEach(r => {
  const s = r.payload;
  const cls = s.class_name || s.kelas || '';
  if (cls && !classMap[cls]) unknownClasses.add(cls);
});
console.log('\nStudents in UNKNOWN classes:', [...unknownClasses]);

// Build update plan: add jurusan field to all students
let updateCount = 0;
let skipCount = 0;
let noMajorCount = 0;

const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  for (const row of students) {
    const s = row.payload;
    const cls = s.class_name || s.kelas || '';
    const major = classMap[cls];
    
    if (!major) {
      noMajorCount++;
      // Try to infer from class name (e.g., "X AK 1" -> "AK")
      const inferred = cls.match(/\b(TKR|TKJ|AK|MP)\b/)?.[1];
      if (inferred) {
        const updated = { ...s, jurusan: inferred, major: inferred };
        const id = String(s.nis || s.code || '').trim();
        await client.query(
          'UPDATE mst_students SET payload = $1 WHERE id = $2',
          [JSON.stringify(updated), id]
        );
        updateCount++;
      }
      continue;
    }
    
    if (s.jurusan && s.major) {
      skipCount++;
      continue;
    }
    
    const updated = { ...s, jurusan: major, major: major };
    const id = String(s.nis || s.code || '').trim();
    await client.query(
      'UPDATE mst_students SET payload = $1 WHERE id = $2',
      [JSON.stringify(updated), id]
    );
    updateCount++;
  }
  
  await client.query('COMMIT');
  console.log(`\nUpdate complete!`);
  console.log(`  Updated: ${updateCount} students with jurusan/major`);
  console.log(`  Skipped (already had jurusan): ${skipCount}`);
  console.log(`  No matching class: ${noMajorCount}`);
  
  // Also fix mst_classes: add "X AK 1" if students have it
  if (unknownClasses.size > 0) {
    console.log('\nAdding missing classes to mst_classes...');
    for (const cls of unknownClasses) {
      const inferredMajor = cls.match(/\b(TKR|TKJ|AK|MP)\b/)?.[1];
      if (inferredMajor) {
        try {
          await pool.query(
            'INSERT INTO mst_classes (id, payload) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload',
            [cls, JSON.stringify({ name: cls, major: inferredMajor, homeroom: null })]
          );
          console.log(`  Added class: ${cls} -> major: ${inferredMajor}`);
        } catch(e) {
          console.error(`  Failed to add class ${cls}:`, e.message);
        }
      }
    }
  }

} catch(e) {
  await client.query('ROLLBACK');
  console.error('Error:', e.message);
} finally {
  client.release();
}

// Verify
const verifyResult = await pool.query('SELECT payload FROM mst_students LIMIT 5');
console.log('\nVerification (first 5 students):');
verifyResult.rows.forEach(r => console.log(JSON.stringify(r.payload)));

await pool.end();

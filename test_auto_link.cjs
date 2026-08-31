require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});

async function checkTeachers() {
    const teachersRes = await pool.query("SELECT payload FROM mst_teachers");
    const teachers = teachersRes.rows.map(r => r.payload);
    console.log(teachers.length, "teachers found");

    const hikRes = await pool.query(`SELECT * FROM hikvision_students WHERE class_name IN ('guru', 'karyawan', 'staff') OR name ILIKE '%guru%' OR name ILIKE '%staff%' OR name ILIKE '%karyawan%'`);
    console.log(hikRes.rows.length, "hikvision guru/staff found");
    process.exit(0);
}
checkTeachers().catch(e => console.error(e));

require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});

async function checkNGADMIN() {
    const res = await pool.query(`SELECT * FROM hikvision_students WHERE name = 'NGADMIN'`);
    console.log(JSON.stringify(res.rows, null, 2));
    
    // what about Rosyidah?
    const r2 = await pool.query(`SELECT * FROM hikvision_students WHERE name ILIKE '%rosyidah%'`);
    console.log("Rosyidah in Hikvision:", r2.rows);

    const r3 = await pool.query(`SELECT payload FROM mst_teachers WHERE payload->>'name' ILIKE '%rosyidah%'`);
    console.log("Rosyidah in app:", r3.rows);

    process.exit(0);
}
checkNGADMIN().catch(e => console.error(e));

require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({
  user: process.env.PG_USER, host: process.env.PG_HOST, 
  database: process.env.PG_DATABASE, password: process.env.PG_PASSWORD, port: process.env.PG_PORT
});

async function trigger() {
    const { autoLinkHikvisionTeachersAndStaffs } = await import('./server/routes/hikvision.mjs');
    await autoLinkHikvisionTeachersAndStaffs(pool);
    console.log("Sync finished.");
    process.exit(0);
}
trigger().catch(e => console.error(e));

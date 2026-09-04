const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgres://postgres:ijjuuiue@127.0.0.1:5432/school_system_db' }); 
pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
  .then(res => { 
    console.log(res.rows.map(r => r.table_name)); 
    process.exit(0); 
  })
  .catch(e => { console.error(e); process.exit(1); })

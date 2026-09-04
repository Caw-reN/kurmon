const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgres://postgres:ijjuuiue@127.0.0.1:5432/school_system_db' }); 
pool.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'mst_majors' AND column_name = 'payload'")
  .then(res => { 
    console.log(res.rows[0].data_type); 
    process.exit(0); 
  })
  .catch(e => { console.error(e); process.exit(1); })

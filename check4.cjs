const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgres://postgres:ijjuuiue@127.0.0.1:5432/school_system_db' }); 
pool.query("SELECT data FROM app_data WHERE store_key = 'main_store'")
  .then(res => { 
    const data = JSON.parse(res.rows[0].data); 
    console.log(Object.keys(data)); 
    process.exit(0); 
  })
  .catch(e => { console.error(e); process.exit(1); })

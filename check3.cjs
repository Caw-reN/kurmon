const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgres://postgres:ijjuuiue@127.0.0.1:5432/school_system_db' }); 
Promise.all(['mst_majors','mst_classes','mst_rooms','mst_subjects'].map(t => pool.query("SELECT count(*) FROM " + t)))
  .then(res => { 
    console.log(res.map(r => r.rows[0].count)); 
    process.exit(0); 
  })
  .catch(e => { console.error(e); process.exit(1); })

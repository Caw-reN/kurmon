require('dotenv').config();
const {Pool} = require('pg');
fetch("http://localhost:4174/api/dashboard/logs", { headers: { Authorization: `Bearer f8ce8676-382e-48ca-8e9e-88528101c45d` } })
    .then(res=>res.json())
    .then(d=> {
      if (d.data && d.data.teacherLogs) {
        console.log(JSON.stringify(d.data.teacherLogs.filter(x=>x.name.includes("NGADMIN") || x.name.includes("ROSYI") || x.employee_id === "1"), null, 2));
      } else {
        console.log("No teacherLogs in response", Object.keys(d));
      }
      process.exit(0);
    })
    .catch(e=>console.log(e));

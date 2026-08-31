fetch("http://localhost:4174/api/hikvision/dashboard").then(r=>r.json()).then(d=>console.log(JSON.stringify(d, null, 2))).catch(e=>console.log(e));

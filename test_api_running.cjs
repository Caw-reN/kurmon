fetch("http://localhost:4174/api/data/public")
  .then(res => { console.log("Status:", res.status); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });

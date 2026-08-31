const fs = require('fs');
const content = fs.readFileSync('server/routes/hikvision.mjs', 'utf8');
console.log(content.substring(0, 1500));

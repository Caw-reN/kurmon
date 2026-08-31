const fs = require('fs');
console.log(fs.readFileSync('scratch/LiveUserActivityLog.bak.jsx', 'utf16le').substring(0, 1500));

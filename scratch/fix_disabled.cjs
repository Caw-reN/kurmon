const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/pages').concat(walk('src/components'));
let filesFixed = 0;

for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  let originalC = c;
  
  c = c.replace(/\s+disabled=\{\}/g, '');
  
  if (c !== originalC) {
    fs.writeFileSync(file, c);
    filesFixed++;
  }
}
console.log('Fixed disabled={} in ' + filesFixed + ' files.');

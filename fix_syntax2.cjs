const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else if (f.endsWith('.jsx')) {
      callback(dirPath);
    }
  });
}

let modifiedFiles = 0;

walk('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Fix patterns:
  // `=== h-10 px-4 text-sm font-bold'map'` -> `=== 'map'`
  // `+ h-10 px-4 text-sm font-bold'` -> `+ '`
  content = content.replace(/=== h-10 px-4 text-sm font-bold(['"])/g, '=== $1');
  content = content.replace(/\+ h-10 px-4 text-sm font-bold(['"])/g, '+ $1');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Fixed additional syntax bug in: ${filePath}`);
  }
});

const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/pages');
let filesUpdated = 0;

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  const buttonImportCount = (c.match(/import\s*\{[^}]*\bButton\b[^}]*\}\s*from/g) || []).length;
  
  if (buttonImportCount > 1) {
    let lines = c.split('\n');
    let foundFirst = false;
    lines = lines.filter(line => {
      if (line.match(/^import\s*\{[^}]*\bButton\b[^}]*\}\s*from/)) {
        if (foundFirst) {
          if (line.trim().startsWith("import { Button } from") && line.includes("components/monitoring/ui/index.js")) {
            return false; // Remove the duplicate injected line
          }
        }
        foundFirst = true;
      }
      return true;
    });
    fs.writeFileSync(f, lines.join('\n'));
    console.log('Fixed ' + f);
    filesUpdated++;
  }
});
console.log('Total files fixed: ' + filesUpdated);

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
  // Only look for cases where `import { Button } from ...` exact injected line is present 
  // AND there is another line that imports Button.
  
  let lines = c.split('\n');
  let injectedLineIdx = -1;
  let otherButtonImportIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("import { Button } from '") && line.includes("components/monitoring/ui/index.js")) {
      injectedLineIdx = i;
    } else if (line.match(/import\s*\{[^}]*\bButton\b[^}]*\}\s*from/)) {
      otherButtonImportIdx = i;
    }
  }

  if (injectedLineIdx !== -1 && otherButtonImportIdx !== -1) {
    console.log('Fixing duplicate in ' + f);
    lines.splice(injectedLineIdx, 1);
    fs.writeFileSync(f, lines.join('\n'));
    filesUpdated++;
  }
});

console.log('Total files fixed: ' + filesUpdated);

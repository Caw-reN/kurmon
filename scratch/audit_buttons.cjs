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

const files = walk('src');
let issues = 0;

files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split('\n');

  // Check 1: Mismatched <button ... </Button> or <Button ... </button>
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<button') && !line.includes('</button>') && !line.includes('<button>')) {
      // Look ahead for </Button> without matching <Button
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        if (lines[j].includes('</Button>')) {
          console.log('MISMATCH: ' + f + ':' + (i+1) + ' <button opens, but line ' + (j+1) + ' closes with </Button>');
          issues++;
          break;
        }
        if (lines[j].includes('</button>') || lines[j].includes('<button') || lines[j].includes('<Button')) break;
      }
    }
  }

  // Check 2: Duplicate Button imports
  const buttonImports = (c.match(/import\s*\{[^}]*\bButton\b[^}]*\}\s*from/g) || []);
  if (buttonImports.length > 1) {
    console.log('DUPLICATE IMPORT: ' + f + ' has ' + buttonImports.length + ' Button imports');
    issues++;
  }

  // Check 3: Button used but not imported
  if (c.includes('<Button') && !c.match(/import\s*\{[^}]*\bButton\b[^}]*\}\s*from/)) {
    console.log('MISSING IMPORT: ' + f + ' uses <Button but has no Button import');
    issues++;
  }
});

console.log('\nTotal issues found: ' + issues);

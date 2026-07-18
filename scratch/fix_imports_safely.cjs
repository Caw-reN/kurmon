const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/pages').concat(walk('src/components'));
let brokenCount = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hasButtonJSX = /<Button\b/.test(content);
  const importsButton = /import\s+{[^}]*\bButton\b[^}]*}\s+from/.test(content) || /import\s+Button\s+from/.test(content);
  if (hasButtonJSX && !importsButton) {
    console.log('Missing import in:', file);
    brokenCount++;
    
    // Auto-fix by prepending import
    const depth = file.split(path.sep).length - 2;
    const prefix = depth > 0 ? '../'.repeat(depth) : './';
    
    let importPath = prefix + 'components/ui.jsx';
    if (file.includes('components')) {
      const parts = file.split(path.sep);
      const idx = parts.indexOf('components');
      const depthFromComponents = parts.length - 1 - idx - 1;
      const compPrefix = depthFromComponents > 0 ? '../'.repeat(depthFromComponents) : './';
      importPath = compPrefix + 'ui.jsx';
    }
    
    // Make sure path uses forward slashes
    importPath = importPath.replace(/\\/g, '/');
    
    const fixedContent = `import { Button } from '${importPath}';\n` + content;
    fs.writeFileSync(file, fixedContent, 'utf8');
    console.log('Fixed:', file);
  }
});

console.log('Total broken files fixed:', brokenCount);

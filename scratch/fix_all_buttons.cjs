const fs = require('fs');
const path = require('path');

function walk(d) {
  let res = [];
  fs.readdirSync(d).forEach(f => {
    let p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) res.push(...walk(p));
    else if (p.endsWith('.jsx')) res.push(p);
  });
  return res;
}

let changedCount = 0;

walk('src/pages').forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  let originalContent = content;

  // Pattern: <button ...>...</button> with NO className attribute whatsoever
  // We check for attributes that DO NOT contain className=
  content = content.replace(/<button((?:(?!className=)[^>])*)>\s*([\s\S]*?)\s*<\/button>/g, (match, attrs, innerText) => {
    // skip if there is any tailwind class injected dynamically that was missed
    if (attrs.includes('className=')) return match; 
    return `<Button variant="outline"${attrs}>${innerText}</Button>`;
  });

  if (content !== originalContent) {
    if (!content.includes('Button')) {
      // Find the right import path by checking depth
      const depth = p.split(path.sep).length - 2;
      const prefix = depth > 0 ? '../'.repeat(depth) : './';
      content = `import { Button } from '${prefix}components/ui.jsx';\n` + content;
    }
    fs.writeFileSync(p, content, 'utf8');
    changedCount++;
    console.log(`Replaced buttons in ${p}`);
  }
});

console.log(`Updated ${changedCount} files.`);

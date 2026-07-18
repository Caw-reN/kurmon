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

  // Pattern 1: <button ... className="cursor-pointer">Text</button> -> <Button variant="ghost" size="sm">Text</Button>
  content = content.replace(/<button([^>]*)className=["']cursor-pointer["']([^>]*)>([\s\S]*?)<\/button>/g, '<Button variant="ghost" size="sm"$1$2>$3</Button>');

  // Pattern 2: <button ... className="flex items-center gap-2 cursor-pointer">Text</button> -> <Button variant="outline" size="sm" className="flex items-center gap-2">Text</Button>
  content = content.replace(/<button([^>]*)className=["']flex items-center gap-2 cursor-pointer["']([^>]*)>([\s\S]*?)<\/button>/g, '<Button variant="outline" size="sm" className="flex items-center gap-2"$1$2>$3</Button>');

  // Include missing imports if necessary
  if (content !== originalContent) {
    if (!content.includes('Button')) {
      // Very basic import insertion
      content = "import { Button } from '@/components/ui.jsx';\n" + content;
    }
    fs.writeFileSync(p, content, 'utf8');
    changedCount++;
    console.log(`Replaced buttons in ${p}`);
  }
});

console.log(`Updated ${changedCount} files.`);

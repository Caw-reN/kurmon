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
let buttonsUpdated = 0;

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if (!c.includes('<button')) return;
  
  // Calculate relative path to src/components/monitoring/ui/index.js
  const fileDepth = f.split(path.sep).length - 1; // Number of directories deep from root
  // 'src/pages' is 2 deep. 'src/pages/admin' is 3 deep.
  // 'src/components' is 2 deep.
  // From 'src/pages/DashboardPage.jsx' (depth 2), to go to 'src/components', we need '../components'
  const upLevels = '../'.repeat(fileDepth - 1);
  const importPath = `${upLevels}components/monitoring/ui/index.js`.replace(/\\/g, '/');

  if (!c.includes('import { Button }')) {
    c = c.replace(/import .*?from 'react';?/, match => match + '\nimport { Button } from \'' + importPath + '\';');
  }
  
  let localUpdates = 0;
  c = c.replace(/<button([\s\S]*?)<\/button>/g, (match, attrs) => {
    localUpdates++;
    let variant = 'primary';
    let size = 'default';
    
    if (attrs.includes('text-slate-400') || attrs.includes('p-2') || attrs.includes('Trash2') || attrs.includes('Edit2') || attrs.includes('Lock') || attrs.includes('w-8 h-8')) {
      variant = 'ghost';
      size = 'icon-sm';
    } else if (attrs.includes('bg-white') && attrs.includes('hover:bg-slate-50')) {
      variant = 'outline';
    } else if (attrs.includes('variant=')) {
      // If it already had a variant somehow, though it was a raw button...
    }
    
    return '<Button variant="' + variant + '" size="' + size + '"' + attrs + '</Button>';
  });
  
  fs.writeFileSync(f, c);
  filesUpdated++;
  buttonsUpdated += localUpdates;
  console.log('Updated ' + localUpdates + ' buttons in ' + f);
});

console.log('Total files updated: ' + filesUpdated);
console.log('Total buttons updated: ' + buttonsUpdated);

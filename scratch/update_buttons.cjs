const fs = require('fs');
const path = require('path');

const dir = 'src/pages/admin/master_data';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx')).map(f => path.join(dir, f));

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if (!c.includes('<button')) return;
  
  if (!c.includes('import { Button }')) {
    c = c.replace(/import .*?from 'react';?/, match => match + '\nimport { Button } from \'../../../components/monitoring/ui/index.js\';');
  }
  
  c = c.replace(/<button([\s\S]*?)<\/button>/g, (match, attrs) => {
    let variant = 'primary';
    let size = 'default';
    
    if (attrs.includes('text-slate-400') || attrs.includes('p-2') || attrs.includes('Trash2') || attrs.includes('Edit2') || attrs.includes('Lock') || attrs.includes('w-8 h-8')) {
      variant = 'ghost';
      size = 'icon-sm';
    } else if (attrs.includes('bg-white') && attrs.includes('hover:bg-slate-50')) {
      variant = 'outline';
    }
    
    return '<Button variant="' + variant + '" size="' + size + '"' + attrs + '</Button>';
  });
  
  fs.writeFileSync(f, c);
  console.log('Updated ' + f);
});

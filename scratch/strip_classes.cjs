const fs = require('fs');
const path = require('path');

const variantStyles = [
  'bg-[var(--ui-primary)] text-white hover:brightness-105 active:scale-95 shadow-sm',
  'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm',
  'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-sm',
  'bg-transparent hover:bg-slate-100/80 text-slate-600',
  'bg-rose-500 text-white hover:bg-rose-600 active:scale-95 shadow-sm'
];

const sizeStyles = [
  'h-10 px-4 py-2 text-sm font-bold rounded-xl gap-1.5',
  'h-8 px-3 py-1.5 text-xs font-bold rounded-lg gap-1.5',
  'h-6 px-2 py-1 text-[10px] font-bold rounded-md gap-1',
  'h-11 px-5 py-2.5 text-base font-extrabold rounded-xl gap-2',
  'w-10 h-10 p-2 flex-shrink-0 rounded-xl flex items-center justify-center',
  'w-8 h-8 p-1.5 flex-shrink-0 rounded-lg flex items-center justify-center',
  'w-6 h-6 p-1 flex-shrink-0 rounded-md flex items-center justify-center',
  'w-11 h-11 p-2.5 flex-shrink-0 rounded-xl flex items-center justify-center'
];

const baseStyles = 'inline-flex items-center justify-center transition-all duration-200 outline-none select-none disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap cursor-pointer';

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
  
  // Replace baseStyles
  c = c.split(baseStyles).join('');
  
  // Replace variantStyles
  for (const s of variantStyles) {
      c = c.split(s).join('');
  }
  
  // Replace sizeStyles
  for (const s of sizeStyles) {
      c = c.split(s).join('');
  }
  
  // Clean up extra spaces in className="..."
  c = c.replace(/className=(['"])\s+/g, 'className=$1');
  c = c.replace(/\s+(['"])/g, '$1');
  c = c.replace(/className=(['"])\1/g, ''); // remove empty className=""
  c = c.replace(/className=\{`\s+`/g, 'className={`');
  c = c.replace(/\s+`\}/g, '`}');
  c = c.replace(/className=\{``\}/g, '');
  
  if (c !== originalC) {
    fs.writeFileSync(file, c);
    filesFixed++;
  }
}
console.log('Stripped generated classes from ' + filesFixed + ' files.');

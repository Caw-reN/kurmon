const fs = require('fs');
const path = require('path');

const variantStyles = {
  primary: 'bg-[var(--ui-primary)] text-white hover:brightness-105 active:scale-95 shadow-sm',
  default: 'bg-[var(--ui-primary)] text-white hover:brightness-105 active:scale-95 shadow-sm',
  outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-sm',
  ghost: 'bg-transparent hover:bg-slate-100/80 text-slate-600',
  danger: 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95 shadow-sm',
  destructive: 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95 shadow-sm',
};

const sizeStyles = {
  default: 'h-10 px-4 py-2 text-sm font-bold rounded-xl gap-1.5',
  md: 'h-10 px-4 py-2 text-sm font-bold rounded-xl gap-1.5',
  sm: 'h-8 px-3 py-1.5 text-xs font-bold rounded-lg gap-1.5',
  xs: 'h-6 px-2 py-1 text-[10px] font-bold rounded-md gap-1',
  lg: 'h-11 px-5 py-2.5 text-base font-extrabold rounded-xl gap-2',
  icon: 'w-10 h-10 p-2 flex-shrink-0 rounded-xl flex items-center justify-center',
  'icon-sm': 'w-8 h-8 p-1.5 flex-shrink-0 rounded-lg flex items-center justify-center',
  'icon-xs': 'w-6 h-6 p-1 flex-shrink-0 rounded-md flex items-center justify-center',
  'icon-lg': 'w-11 h-11 p-2.5 flex-shrink-0 rounded-xl flex items-center justify-center',
};

const baseStyles = 'inline-flex items-center justify-center transition-all duration-200 outline-none select-none disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap cursor-pointer';

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
  
  if (!c.includes('<Button') && !c.includes('import { Button }') && !c.includes('</Button>')) {
    return;
  }
  
  // Remove import
  c = c.replace(/import\s+\{\s*Button\s*\}\s+from\s+['"][^'"]+['"];?\n?/g, '');
  
  let localUpdates = 0;
  
  // Match <Button ... >
  c = c.replace(/<Button([\s\S]*?)>/g, (match, attrs) => {
    // If it's the closing tag </Button>, skip it here (handled separately)
    if (match === '</Button>') return match;
    
    localUpdates++;
    
    // Extract variant and size
    let variant = 'primary';
    let size = 'md';
    
    const variantMatch = attrs.match(/variant=['"]([^'"]+)['"]/);
    if (variantMatch) variant = variantMatch[1];
    
    const sizeMatch = attrs.match(/size=['"]([^'"]+)['"]/);
    if (sizeMatch) size = sizeMatch[1];
    
    // Remove variant and size from attrs
    attrs = attrs.replace(/\s*variant=['"][^'"]+['"]/g, '');
    attrs = attrs.replace(/\s*size=['"][^'"]+['"]/g, '');
    
    // Handle loading attribute mapping to disabled visually (though this is static, 
    // real replacement would need complex logic, so we just remove `loading=` if it's there)
    // Actually we just remove it to prevent React warnings.
    attrs = attrs.replace(/\s*loading=\{.*?\}/g, '');
    attrs = attrs.replace(/\s*loading/g, '');
    
    const generatedClasses = `${baseStyles} ${variantStyles[variant] || ''} ${sizeStyles[size] || ''}`.trim();
    
    // Check if it's self-closing (e.g. <Button />)
    const isSelfClosing = attrs.trim().endsWith('/');
    if (isSelfClosing) {
      attrs = attrs.substring(0, attrs.lastIndexOf('/'));
    }
    
    // Merge into className if exists, else add it
    if (attrs.includes('className=')) {
      attrs = attrs.replace(/className=(['"])(.*?)\1/, (m, quote, inner) => {
        return `className=${quote}${generatedClasses} ${inner}${quote}`;
      });
      attrs = attrs.replace(/className=\{`([^`]*)`\}/, (m, inner) => {
        return `className={\`${generatedClasses} ${inner}\`}`;
      });
      if (!attrs.includes(generatedClasses)) {
        attrs = attrs.replace(/className=\{([^}]+)\}/, (m, inner) => {
           return `className={\`${generatedClasses} \` + (${inner})}`;
        });
      }
    } else {
      attrs += ` className="${generatedClasses}"`;
    }
    
    if (isSelfClosing) {
      attrs += ' /';
    }
    
    return `<button${attrs}>`;
  });
  
  // Replace closing tags
  c = c.replace(/<\/Button>/g, '</button>');
  
  fs.writeFileSync(f, c);
  filesUpdated++;
  buttonsUpdated += localUpdates;
  console.log('Reverted ' + localUpdates + ' buttons in ' + f);
});

console.log('Total files updated: ' + filesUpdated);
console.log('Total buttons reverted: ' + buttonsUpdated);

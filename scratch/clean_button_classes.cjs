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

const safePrefixes = [
  'w-full', 'w-fit', 'w-auto', 'w-max',
  'm-', 'mt-', 'mb-', 'ml-', 'mr-', 'mx-', 'my-',
  'flex', 'inline-flex', 'items-', 'justify-', 'gap-',
  'shrink-', 'grow', 'flex-',
  'cursor-', 'absolute', 'relative', 'top-', 'right-', 'bottom-', 'left-',
  'z-', 'hidden', 'block', 'sm:', 'md:', 'lg:', 'xl:',
  'text-left', 'text-center', 'text-right'
];

function keepClass(cls) {
  if (cls === 'w-full' || cls === 'flex' || cls === 'inline-flex' || cls === 'hidden' || cls === 'block') return true;
  for (let prefix of safePrefixes) {
    if (cls.startsWith(prefix) && !cls.startsWith('text-[') && !cls.startsWith('font-') && !cls.startsWith('text-sm') && !cls.startsWith('text-xs')) {
      return true;
    }
  }
  return false;
}

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if (!c.includes('<Button')) return;
  
  let localUpdates = 0;
  let newC = c.replace(/<Button([^>]*)className=(['"])(.*?)\2([^>]*)>/g, (match, before, quote, classStr, after) => {
    
    let classes = classStr.split(/\s+/).filter(Boolean);
    let newClasses = classes.filter(cls => keepClass(cls));
    
    // Check if variant and size were hardcoded in the script before
    // If it's an icon-only button and we are keeping it, size="icon-sm" is good.
    // Wait, the variant and size are already set in the <Button> tag from the previous run.
    
    let newClassAttr = newClasses.length > 0 ? ` className="${newClasses.join(' ')}"` : '';
    
    if (newClasses.length !== classes.length) {
      localUpdates++;
    }
    
    return `<Button${before}className=${quote}${newClasses.join(' ')}${quote}${after}>`;
  });

  // What about buttons that have className={`...`} (template literals)?
  newC = newC.replace(/<Button([^>]*)className=\{`([^`]*)`\}([^>]*)>/g, (match, before, classStr, after) => {
    let parts = classStr.split(/(\$\{.*?\})/); // split by template expressions
    let finalStr = '';
    
    parts.forEach(part => {
      if (part.startsWith('${')) {
        finalStr += part;
      } else {
        let classes = part.split(/\s+/).filter(Boolean);
        let newClasses = classes.filter(cls => keepClass(cls));
        finalStr += (finalStr && newClasses.length ? ' ' : '') + newClasses.join(' ') + (newClasses.length ? ' ' : '');
      }
    });
    
    finalStr = finalStr.trim();
    if (finalStr !== classStr.trim()) {
      localUpdates++;
    }
    return `<Button${before}className={\`${finalStr}\`}${after}>`;
  });
  
  if (localUpdates > 0) {
    // clean up empty classNames
    newC = newC.replace(/\s+className=(['"])\1/g, '');
    newC = newC.replace(/\s+className=\{``\}/g, '');
    
    fs.writeFileSync(f, newC);
    filesUpdated++;
    buttonsUpdated += localUpdates;
    console.log('Cleaned ' + localUpdates + ' button classes in ' + f);
  }
});

console.log('Total files cleaned: ' + filesUpdated);
console.log('Total button classes cleaned: ' + buttonsUpdated);

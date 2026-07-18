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
  
  // Custom parser to find <Button ...> and modify className inside it
  let result = '';
  let i = 0;
  while (i < c.length) {
    if (c.slice(i, i + 7) === '<Button') {
      let j = i + 7;
      let braceDepth = 0;
      let inString = false;
      let stringChar = '';
      
      while (j < c.length) {
        let char = c[j];
        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar) {
          inString = false;
        } else if (!inString && char === '{') {
          braceDepth++;
        } else if (!inString && char === '}') {
          braceDepth--;
        } else if (!inString && braceDepth === 0 && char === '>') {
          break; // Found the end of the opening tag!
        }
        j++;
      }
      
      let tagContent = c.slice(i, j + 1); // includes '>'
      
      // Now replace className inside tagContent
      let originalTagContent = tagContent;
      
      // Clean className="xxx"
      tagContent = tagContent.replace(/className=(["'])(.*?)\1/g, (match, quote, classStr) => {
        let classes = classStr.split(/\s+/).filter(Boolean);
        let newClasses = classes.filter(cls => keepClass(cls));
        return newClasses.length > 0 ? `className=${quote}${newClasses.join(' ')}${quote}` : '';
      });
      
      // Clean className={`xxx`}
      tagContent = tagContent.replace(/className=\{`([^`]*)`\}/g, (match, classStr) => {
        let parts = classStr.split(/(\$\{.*?\})/);
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
        return finalStr ? `className={\`${finalStr}\`}` : '';
      });
      
      if (tagContent !== originalTagContent) {
        localUpdates++;
      }
      
      result += tagContent;
      i = j + 1;
    } else {
      result += c[i];
      i++;
    }
  }
  
  if (localUpdates > 0) {
    fs.writeFileSync(f, result);
    filesUpdated++;
    buttonsUpdated += localUpdates;
    console.log('Cleaned ' + localUpdates + ' button classes in ' + f);
  }
});

console.log('Total files cleaned: ' + filesUpdated);
console.log('Total button classes cleaned: ' + buttonsUpdated);

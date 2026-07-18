const fs = require('fs');
const path = require('path');

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
let syntaxErrorsFixed = 0;
let classesRemoved = 0;

// This regex matches exactly the string we generated. 
// It starts with baseStyles, then has some variant and size styles.
// Since we know they don't contain quotes, we can just match up to the end of the classes string.
// We'll escape regex characters in baseStyles just in case.
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const baseRegexPattern = escapeRegExp(baseStyles) + '[^"\\`]*';

for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes(baseStyles)) {
    continue;
  }
  
  let originalC = c;

  // 1. Fix syntax errors: `<button onClick={() = className="GENERATED">`
  // We look for `= className="` followed by our pattern, then `">`
  const syntaxErrRegex = new RegExp(`= className="(${baseRegexPattern})">`, 'g');
  c = c.replace(syntaxErrRegex, (match, gen) => {
     syntaxErrorsFixed++;
     return `=>`; // Restoring the arrow function!
  });

  // 2. Remove the injected classes from className="..."
  // It might be className="GENERATED " or className=" GENERATED" or className="GENERATED"
  const exactClassAttr = new RegExp('\\\\s*className=["\\`](' + baseRegexPattern + ')["\\`]', 'g');
  c = c.replace(exactClassAttr, (match) => {
     classesRemoved++;
     return '';
  });

  const prefixClassAttr = new RegExp('(className=["\\`])(' + baseRegexPattern + ')\\\\s+', 'g');
  c = c.replace(prefixClassAttr, (match, group1) => {
     classesRemoved++;
     return group1;
  });

  const suffixClassAttr = new RegExp('\\\\s+(' + baseRegexPattern + ')(["\\`])', 'g');
  c = c.replace(suffixClassAttr, (match, match1, match2) => {
     classesRemoved++;
     return match2;
  });

  if (c !== originalC) {
    fs.writeFileSync(file, c);
    filesFixed++;
  }
}

console.log(`Files fixed: ${filesFixed}`);
console.log(`Syntax errors (=>) restored: ${syntaxErrorsFixed}`);
console.log(`Injected classes removed: ${classesRemoved}`);

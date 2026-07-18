const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else if (f.endsWith('.jsx')) {
      callback(dirPath);
    }
  });
}

let modifiedFiles = 0;

walk('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // We split by "<button" and "<Link"
  // This is safer than regex.
  const processTag = (tagStr) => {
    let pieces = content.split(tagStr);
    for (let i = 1; i < pieces.length; i++) {
      let piece = pieces[i];
      let endIdx = piece.indexOf('>');
      // Need to find the REAL end of the tag. It might contain `=>` inside `{...}`.
      // Let's count `{` and `}` to find the true end of the JSX tag.
      let bracketCount = 0;
      let trueEndIdx = -1;
      let inQuotes = false;
      let quoteChar = null;
      
      for (let j = 0; j < piece.length; j++) {
        const char = piece[j];
        if (!inQuotes && (char === '"' || char === "'" || char === '`')) {
          inQuotes = true;
          quoteChar = char;
        } else if (inQuotes && char === quoteChar) {
          inQuotes = false;
          quoteChar = null;
        } else if (!inQuotes && char === '{') {
          bracketCount++;
        } else if (!inQuotes && char === '}') {
          bracketCount--;
        } else if (!inQuotes && bracketCount === 0 && char === '>') {
          trueEndIdx = j;
          break;
        }
      }

      if (trueEndIdx !== -1) {
        let attributesStr = piece.substring(0, trueEndIdx);
        let classMatch = attributesStr.match(/className=(['"]|\{`)(.*?)(['"]|`\})/);
        if (classMatch) {
          let oldClassStr = classMatch[2];
          let classes = oldClassStr;
          
          const isSolid = /\bbg-(blue|emerald|red|slate|rose|amber|indigo)-[56789]00\b/.test(classes) || classes.includes('bg-[var(--ui-primary)]');
          const isTextPrimary = classes.includes('text-[var(--ui-primary)]') || classes.includes('text-blue-600') || classes.includes('text-slate-800');
          
          if (isSolid && !classes.includes('bg-transparent') && !isTextPrimary) {
            // Apply standard button classes
            if (!classes.includes('shadow-')) classes += ' shadow-sm';
            if (!classes.includes('transition-')) classes += ' transition-all';
            classes = classes.replace(/\brounded(-sm|-md|-lg|\[var\(--ui-radius-small\)\])?\b/g, 'rounded-[var(--ui-radius-control)]');
            
            // Standardize blue/slate to primary
            if (classes.includes('bg-slate-800') || classes.includes('bg-blue-600') || classes.includes('bg-blue-500')) {
              classes = classes.replace(/\bbg-(blue|slate)-(500|600|800)\b/g, 'bg-[var(--ui-primary)]');
              classes = classes.replace(/\bhover:bg-(blue|slate)-(600|700|900)\b/g, 'hover:opacity-90');
            }
          }
          
          classes = classes.replace(/\s+/g, ' ').trim();
          
          if (classes !== oldClassStr) {
            let newAttributesStr = attributesStr.replace(classMatch[0], `className=${classMatch[1]}${classes}${classMatch[3]}`);
            pieces[i] = newAttributesStr + piece.substring(trueEndIdx);
          }
        }
      }
    }
    content = pieces.join(tagStr);
  };

  processTag('<button');
  processTag('<Link');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Modified: ${filePath}`);
  }
});

console.log(`Done! Modified ${modifiedFiles} files.`);

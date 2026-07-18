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

  const processTag = (tagStr) => {
    let pieces = content.split(tagStr);
    for (let i = 1; i < pieces.length; i++) {
      let piece = pieces[i];
      
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
          
          // TARGET: Action buttons in toolbars.
          // How to identify them? They have px-3, px-4, px-5, px-6, px-8 AND they are not explicitly small (px-2, text-[9px], text-[10px], p-2, p-1).
          // And they usually have a background color or border.
          
          const isStandardButton = /\bpx-[34568]\b/.test(classes) || /\bpy-[23]\b/.test(classes) || /\bpy-2\.5\b/.test(classes);
          const isSmallButton = /\b(px-1|px-2|p-1|p-2|text-\[9px\]|text-\[10px\]|text-\[11px\]|w-8|h-8)\b/.test(classes);
          
          if (isStandardButton && !isSmallButton) {
            // Remove old size classes
            classes = classes.replace(/\b(px-[0-9\.]+)\b/g, '');
            classes = classes.replace(/\b(py-[0-9\.]+)\b/g, '');
            classes = classes.replace(/\b(p-[0-9\.]+)\b/g, '');
            classes = classes.replace(/\b(h-[0-9\.]+)\b/g, '');
            classes = classes.replace(/\b(w-[0-9\.]+)\b/g, '');
            classes = classes.replace(/\b(text-xs|text-sm|text-base|text-lg)\b/g, '');
            classes = classes.replace(/\b(font-medium|font-semibold|font-bold|font-black)\b/g, '');
            
            // Apply standard size classes
            classes += ' h-10 px-4 text-sm font-bold';
            
            // Clean up multiple spaces
            classes = classes.replace(/\s+/g, ' ').trim();
          }
          
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

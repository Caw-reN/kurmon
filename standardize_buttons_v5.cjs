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

  // Standardization:
  // We will standardize the rounded corners of ALL buttons to match the new UI (`rounded-[var(--ui-radius-control)]` or `rounded-xl`)
  // Wait, let's just make all solid action buttons rounded-xl and add shadow-sm
  
  content = content.replace(/<(button|Link)([^>]*?)className=(['"]|\{`)(.*?)(['"]|`\})([^>]*)>/g, (match, tag, before, q1, classStr, q2, after) => {
    let classes = classStr;
    
    // Solid background check
    const isSolid = /\bbg-(blue|emerald|red|slate|rose|amber|indigo)-[56789]00\b/.test(classes) || classes.includes('bg-[var(--ui-primary)]');
    const isTextPrimary = classes.includes('text-[var(--ui-primary)]') || classes.includes('text-blue-600') || classes.includes('text-slate-800');
    
    if (isSolid && !classes.includes('bg-transparent') && !isTextPrimary) {
      // 1. Ensure it has shadow
      if (!classes.includes('shadow-')) {
        classes += ' shadow-sm';
      }
      
      // 2. Ensure hover transition
      if (!classes.includes('transition-')) {
        classes += ' transition-all';
      }

      // 3. Fix rounded corners (convert old small/md to standard control/xl radius)
      classes = classes.replace(/\brounded(-sm|-md|-lg|\[var\(--ui-radius-small\)\])?\b/g, 'rounded-[var(--ui-radius-control)]');
    }
    
    // Clean up
    classes = classes.replace(/\s+/g, ' ').trim();

    if (classes !== classStr) {
      return `<${tag}${before}className=${q1}${classes}${q2}${after}>`;
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Modified: ${filePath}`);
  }
});

console.log(`Done! Modified ${modifiedFiles} files.`);

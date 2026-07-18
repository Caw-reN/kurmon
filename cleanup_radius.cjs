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

  // Find all instances of rounded-[...] that are corrupted by previous replaces
  // Corrupted means they have trailing garbage like `(--ui-radius-small)]` or `-[var(--ui-radius-control)]`
  
  // This regex matches `rounded-[var(--ui-radius-control)]` followed by any sequence of `[`, `]`, `-`, `(`, `)`, `var`, `ui-radius` that looks like garbage until a space or quote.
  content = content.replace(/rounded-\[var\(--ui-radius-control\)\].*?(?=["'\s}])/g, (match) => {
    if (match !== 'rounded-[var(--ui-radius-control)]') {
      return 'rounded-[var(--ui-radius-control)]';
    }
    return match;
  });
  
  // Also fix CustomSelect.jsx which might have gotten h-10 px-4 text-sm font-bold duplicated.
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Cleaned up regex garbage in: ${filePath}`);
  }
});

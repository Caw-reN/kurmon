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

  // Find all <button ... > or <Link ... >
  content = content.replace(/<(button|Link)([\s\S]*?)>/g, (match, tag, inner) => {
    // If it has className, let's process it
    if (inner.includes('className=')) {
      // Very naive approach: just replace colors inside the inner string
      let newInner = inner;
      
      // We only want to convert solid background colors to primary, NOT text colors.
      // E.g. bg-blue-600, bg-slate-800
      const isPrimary = /bg-(blue|slate|indigo|emerald)-(500|600|700|800|900)\b/.test(newInner) && !/text-(blue|slate|indigo|emerald)-(500|600|700|800|900)\b/.test(newInner);
      const isDanger = /bg-(red|rose)-(500|600|700)\b/.test(newInner) && !/text-(red|rose)-(500|600|700)\b/.test(newInner);

      if (isPrimary) {
        newInner = newInner.replace(/\bbg-(blue|slate|indigo|emerald)-(500|600|700|800|900)\b/g, 'bg-[var(--ui-primary)]');
        newInner = newInner.replace(/\bhover:bg-(blue|slate|indigo|emerald)-(500|600|700|800|900)\b/g, 'hover:opacity-90');
        // Replace rounded-md or rounded-lg with rounded-[var(--ui-radius-control)]
        newInner = newInner.replace(/\brounded(-md|-lg)?\b/g, 'rounded-[var(--ui-radius-control)]');
      } else if (isDanger) {
        newInner = newInner.replace(/\bbg-(red|rose)-(500|600|700)\b/g, 'bg-red-600');
        newInner = newInner.replace(/\bhover:bg-(red|rose)-(600|700|800)\b/g, 'hover:bg-red-700');
        newInner = newInner.replace(/\brounded(-md|-lg)?\b/g, 'rounded-[var(--ui-radius-control)]');
      }

      return `<${tag}${newInner}>`;
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

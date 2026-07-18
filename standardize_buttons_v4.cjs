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

  // Let's replace colors globally for these specific exact tailwind strings because they are mostly buttons
  const replacements = [
    { from: /bg-slate-800 text-white\b/g, to: 'bg-[var(--ui-primary)] text-white' },
    { from: /bg-slate-800 hover:bg-slate-900\b/g, to: 'bg-[var(--ui-primary)] hover:opacity-90' },
    { from: /bg-blue-600 text-white\b/g, to: 'bg-[var(--ui-primary)] text-white' },
    { from: /bg-blue-600 hover:bg-blue-700\b/g, to: 'bg-[var(--ui-primary)] hover:opacity-90' },
    { from: /bg-blue-500 hover:bg-blue-600\b/g, to: 'bg-[var(--ui-primary)] hover:opacity-90' },
    { from: /bg-slate-900 text-white\b/g, to: 'bg-[var(--ui-primary)] text-white' },
    
    // For rounded sizes on buttons, we can't globally replace `rounded-md` since it will break layout for inputs and cards.
  ];

  // First do the global color class replacements
  replacements.forEach(r => {
    content = content.replace(r.from, r.to);
  });

  // Then try to match buttons with template literals
  // Match <button ... className={`...`} ... >
  content = content.replace(/<(button|Link)([^>]*?)className=\{`(.*?)`\}([^>]*)>/g, (match, tag, before, classStr, after) => {
    let classes = classStr;
    const isPrimary = classes.includes('bg-blue-600') || classes.includes('bg-blue-500') || 
                      classes.includes('bg-slate-800') || classes.includes('bg-indigo-600') || 
                      classes.includes('bg-[var(--ui-primary)]');
    
    if (isPrimary && !classes.includes('text-blue-600') && !classes.includes('text-slate-800')) {
      classes = classes.replace(/\bbg-(blue|slate|indigo|emerald)-(500|600|700|800|900)\b/g, 'bg-[var(--ui-primary)]');
      classes = classes.replace(/\bhover:bg-(blue|slate|indigo|emerald)-(500|600|700|800|900)\b/g, 'hover:opacity-90');
      classes = classes.replace(/\brounded(-md|-lg)?\b/g, 'rounded-[var(--ui-radius-control)]');
    }
    return `<${tag}${before}className={\`${classes}\`}${after}>`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Modified: ${filePath}`);
  }
});

console.log(`Done! Modified ${modifiedFiles} files.`);

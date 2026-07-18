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
let totalMatches = 0;

const replacements = [
  // Slate 800 to Primary
  { from: /bg-slate-800 hover:bg-slate-900 text-white/g, to: 'bg-[var(--ui-primary)] hover:opacity-90 text-white' },
  { from: /bg-slate-800 text-white hover:bg-slate-700/g, to: 'bg-[var(--ui-primary)] text-white hover:opacity-90' },
  { from: /bg-slate-800 text-white/g, to: 'bg-[var(--ui-primary)] text-white' },
  { from: /hover:bg-slate-900 text-white/g, to: 'hover:opacity-90 text-white' },
  { from: /hover:bg-slate-700/g, to: 'hover:opacity-90' },
  
  // Blue 500/600 to Primary
  { from: /bg-blue-500 text-white hover:bg-blue-600/g, to: 'bg-[var(--ui-primary)] text-white hover:opacity-90' },
  { from: /bg-blue-600 text-white hover:bg-blue-700/g, to: 'bg-[var(--ui-primary)] text-white hover:opacity-90' },
  { from: /bg-blue-500 hover:bg-blue-600/g, to: 'bg-[var(--ui-primary)] hover:opacity-90' },
  { from: /bg-blue-600 hover:bg-blue-700/g, to: 'bg-[var(--ui-primary)] hover:opacity-90' },
  { from: /bg-blue-500 text-white/g, to: 'bg-[var(--ui-primary)] text-white' },
  { from: /bg-blue-600 text-white/g, to: 'bg-[var(--ui-primary)] text-white' },
  
  // Indigo (if any) to Primary
  { from: /bg-indigo-500 text-white hover:bg-indigo-600/g, to: 'bg-[var(--ui-primary)] text-white hover:opacity-90' },
  { from: /bg-indigo-600 text-white hover:bg-indigo-700/g, to: 'bg-[var(--ui-primary)] text-white hover:opacity-90' },

  // Standardize Radii inside buttons
  // Note: Only targeting buttons that have these colors to avoid breaking specific layouts, 
  // but since we are standardizing, let's also fix rounded-md to rounded-[var(--ui-radius-small)]
  // Wait, --ui-radius-control or --ui-radius-small is better? Let's just leave radii alone unless they are alongside the colors.
];

walk('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  replacements.forEach(r => {
    content = content.replace(r.from, r.to);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Modified: ${filePath}`);
  }
});

console.log(`Done! Modified ${modifiedFiles} files.`);

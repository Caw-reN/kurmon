const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    const dirent = fs.statSync(dirFile);
    if (dirent.isDirectory()) {
      if (file !== 'node_modules' && !file.startsWith('.')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (dirFile.endsWith('.jsx')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
};

const dirsToProcess = [
  path.join(__dirname, '../src/pages'),
  path.join(__dirname, '../src/components')
];

let totalModified = 0;

dirsToProcess.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  
  const files = walkSync(dir);
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // Radius replacements
    content = content.replace(/\brounded-md\b/g, 'rounded-[var(--ui-radius-small)]');
    // Note: rounded-lg is tricky because it's often used for cards or buttons. 
    // Usually --ui-radius-control or --ui-radius-card. Let's use control as a middle ground.
    content = content.replace(/\brounded-lg\b/g, 'rounded-[var(--ui-radius-control)]');
    
    // Shadows
    // Replace standalone "shadow" with "shadow-sm"
    // Use positive lookbehinds and lookaheads to match within classNames
    content = content.replace(/(["'`\s])shadow(["'`\s])/g, '$1shadow-sm$2');
    content = content.replace(/\bshadow-md\b/g, 'shadow-sm'); // shadow-md is often too harsh in this premium design, shadow-sm or shadow-xs is preferred
    content = content.replace(/\bshadow-lg\b/g, 'shadow-[var(--ui-shadow-card)]');

    // Remove plain borders that are ugly
    content = content.replace(/\bborder-gray-300\b/g, 'border-slate-200');
    content = content.replace(/\bborder-gray-200\b/g, 'border-slate-100');

    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      totalModified++;
    }
  }
});

console.log(`Global CSS Sync Complete. Modified ${totalModified} files.`);

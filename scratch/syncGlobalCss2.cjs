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

    // Radius replacements (remaining)
    content = content.replace(/\brounded-xl\b/g, 'rounded-2xl'); // Promote xl to 2xl which is explicitly allowed by rule
    content = content.replace(/\brounded-sm\b/g, 'rounded-[var(--ui-radius-small)]'); // Catch rounded-sm

    // Colors: gray -> slate
    content = content.replace(/\bbg-gray-(\d+)\b/g, 'bg-slate-$1');
    content = content.replace(/\btext-gray-(\d+)\b/g, 'text-slate-$1');
    content = content.replace(/\bborder-gray-(\d+)\b/g, 'border-slate-$1');
    content = content.replace(/\bring-gray-(\d+)\b/g, 'ring-slate-$1');

    // Shadows: drop-shadow
    content = content.replace(/\bdrop-shadow-md\b/g, 'drop-shadow-sm');
    content = content.replace(/\bdrop-shadow-lg\b/g, 'drop-shadow-sm');

    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      totalModified++;
    }
  }
});

console.log(`Global CSS Sync Phase 2 Complete. Modified ${totalModified} files.`);

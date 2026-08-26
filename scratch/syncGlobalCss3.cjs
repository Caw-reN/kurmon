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
      if (dirFile.endsWith('.jsx') || dirFile.endsWith('.js')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
};

const srcDir = path.join(__dirname, '../src');

let totalModified = 0;

if (fs.existsSync(srcDir)) {
  const files = walkSync(srcDir);
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // Radius
    content = content.replace(/\brounded-sm\b/g, 'rounded-[var(--ui-radius-small)]');
    content = content.replace(/\brounded-md\b/g, 'rounded-[var(--ui-radius-small)]');
    content = content.replace(/\brounded-lg\b/g, 'rounded-[var(--ui-radius-control)]');
    content = content.replace(/\brounded-xl\b/g, 'rounded-[var(--ui-radius-card)]');

    // Colors: gray -> slate
    content = content.replace(/\bbg-gray-(\d+)\b/g, 'bg-slate-$1');
    content = content.replace(/\btext-gray-(\d+)\b/g, 'text-slate-$1');
    content = content.replace(/\bborder-gray-(\d+)\b/g, 'border-slate-$1');
    content = content.replace(/\bring-gray-(\d+)\b/g, 'ring-slate-$1');

    // Shadows
    content = content.replace(/(["'`\s])shadow(["'`\s])/g, '$1shadow-sm$2');
    content = content.replace(/\bshadow-md\b/g, 'shadow-sm');
    content = content.replace(/\bshadow-lg\b/g, 'shadow-[var(--ui-shadow-card)]');
    content = content.replace(/\bdrop-shadow-md\b/g, 'drop-shadow-sm');
    content = content.replace(/\bdrop-shadow-lg\b/g, 'drop-shadow-sm');
    
    // Stroke Fixes (thin strokes are ugly)
    content = content.replace(/\bstroke-1\b/g, ''); // just remove it so it defaults to standard

    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      totalModified++;
    }
  }
}

console.log(`Global CSS Sync Phase 3 Complete. Modified ${totalModified} files.`);

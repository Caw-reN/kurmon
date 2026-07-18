const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walk(dirPath, callback);
    } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
      callback(path.join(dir, f));
    }
  });
}

let modifiedFiles = 0;
let totalMatches = 0;

walk('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('active:scale-95')) {
    const matches = (content.match(/active:scale-95/g) || []).length;
    content = content.replace(/active:scale-95/g, 'active:translate-y-[1px]');
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    totalMatches += matches;
    console.log(`Modified: ${filePath} (${matches} replacements)`);
  }
});

console.log(`Done! Replaced ${totalMatches} instances in ${modifiedFiles} files.`);

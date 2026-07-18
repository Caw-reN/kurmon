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

  // Fix recursive broken classes
  content = content.replace(/rounded-\[var\(--ui-radius-control\)\].*?\]/g, 'rounded-[var(--ui-radius-control)]');
  content = content.replace(/rounded-\[var\(--ui-radius-control\)\]-\[var\(--ui-radius-control\)\]/g, 'rounded-[var(--ui-radius-control)]');
  
  // Just to be absolutely safe, let's look for multiple square brackets in rounded
  content = content.replace(/rounded-\[var\(--ui-radius-control\)\].*?(rounded-|\[var)/g, 'rounded-[var(--ui-radius-control)]');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Fixed radius bug: ${filePath}`);
  }
});

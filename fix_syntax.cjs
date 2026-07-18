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

  // Pattern to find the corrupted insertion: `? h-10 px-4 text-sm font-bold"` or `'`
  const regex = /(\? )h-10 px-4 text-sm font-bold(['"])/g;
  
  if (regex.test(content)) {
    // We need to move `h-10 px-4 text-sm font-bold` to the end of the className string.
    // However, it's safer to just remove the corruption and then ensure the string ends with it.
    
    // First, let's just remove the corruption
    content = content.replace(regex, '$1$2');
    
    // Now we need to make sure the className has the sizing.
    // The easiest way is to look for the line that had the corruption, and append it before `}` or `\`} `
    // Actually, let's do a line-by-line fix for lines that contained the corruption
    let lines = original.split('\n');
    let newLines = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.match(/(\? )h-10 px-4 text-sm font-bold(['"])/)) {
            // Remove the corruption
            line = line.replace(/(\? )h-10 px-4 text-sm font-bold(['"])/, '$1$2');
            
            // Append it to the end of the className.
            // A className usually ends with `}`} or `"} ` or `'}`.
            if (line.includes('`}')) {
                line = line.replace('`}', ' h-10 px-4 text-sm font-bold`}');
            } else if (line.includes('"}')) {
                line = line.replace('"}', ' h-10 px-4 text-sm font-bold"}');
            } else if (line.includes('\'}')) {
                line = line.replace('\'}', ' h-10 px-4 text-sm font-bold\'}');
            }
        }
        newLines.push(line);
    }
    content = newLines.join('\n');
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Fixed syntax bug in: ${filePath}`);
  }
});

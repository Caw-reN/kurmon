const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const colorMap = {
  'bg-blue-': 'bg-indigo-',
  'text-blue-': 'text-indigo-',
  'border-blue-': 'border-indigo-',
  'ring-blue-': 'ring-indigo-',
  
  'bg-green-': 'bg-emerald-',
  'text-green-': 'text-emerald-',
  'border-green-': 'border-emerald-',
  'ring-green-': 'ring-emerald-',
  
  'bg-red-': 'bg-rose-',
  'text-red-': 'text-rose-',
  'border-red-': 'border-rose-',
  'ring-red-': 'ring-rose-',
};

let filesChanged = 0;

walkDir(path.join(__dirname, '../src'), function(filePath) {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    for (const [find, replace] of Object.entries(colorMap)) {
      // Regex to match exact tailwind class prefix with numbers, e.g., bg-blue-500
      const regex = new RegExp(`\\b${find}(\\d+(?:\\/\\d+)?)\\b`, 'g');
      content = content.replace(regex, `${replace}$1`);
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated colors in:', filePath);
      filesChanged++;
    }
  }
});

console.log(`Total files updated: ${filesChanged}`);

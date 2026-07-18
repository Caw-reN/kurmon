const fs = require('fs');
const path = require('path');

const historyDir = 'C:/Users/fahru/AppData/Roaming/Code/User/History';

let found = [];

if (fs.existsSync(historyDir)) {
  const folders = fs.readdirSync(historyDir);
  folders.forEach(folder => {
    const entriesFile = path.join(historyDir, folder, 'entries.json');
    if (fs.existsSync(entriesFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(entriesFile, 'utf8'));
        if (data.resource && data.resource.toLowerCase().includes('/src/pages/') && data.resource.toLowerCase().includes('kurmon')) {
          found.push({
            folder,
            resource: data.resource,
            entries: data.entries
          });
        }
      } catch(e) {}
    }
  });
}

console.log('Found ' + found.length + ' files in history matching src/pages.');
fs.writeFileSync('scratch/history_found.json', JSON.stringify(found, null, 2));

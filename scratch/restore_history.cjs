const fs = require('fs');
const path = require('path');

const historyDir = path.join(process.env.APPDATA, 'Code', 'User', 'History');
const targetDir = path.resolve('src/pages');

function findLatestHistory(fileTarget) {
  let latestFile = null;
  let latestTime = 0;
  
  if (!fs.existsSync(historyDir)) return null;
  
  const folders = fs.readdirSync(historyDir);
  for (const folder of folders) {
    const folderPath = path.join(historyDir, folder);
    const entriesJsonPath = path.join(folderPath, 'entries.json');
    if (!fs.existsSync(entriesJsonPath)) continue;
    
    try {
      const entries = JSON.parse(fs.readFileSync(entriesJsonPath, 'utf8'));
      
      let resourcePath = entries.resource;
      if (!resourcePath) continue;
      
      resourcePath = decodeURIComponent(resourcePath);
      resourcePath = resourcePath.replace('file:///', '').replace('file://', '');
      resourcePath = path.normalize(resourcePath).toLowerCase();
      const targetPath = path.normalize(fileTarget).toLowerCase();
      
      if (resourcePath === targetPath || resourcePath.endsWith(targetPath)) {
        for (const entry of entries.entries) {
          const entryFilePath = path.join(folderPath, entry.id);
          if (fs.existsSync(entryFilePath)) {
             const stat = fs.statSync(entryFilePath);
             const content = fs.readFileSync(entryFilePath, 'utf8');
             
             // We want the original <button> tags or <Button> tags BEFORE my script broke them.
             // If my script broke it, it has `= className="` (or similarly generated class string inside attributes).
             // Since we want to undo BOTH my script AND the previous agent's script, we can look for
             // history entries BEFORE any Shadcn Button was introduced!
             // So we look for a version that DOES NOT import `Button` from `../components/monitoring/ui/index.js`!
             // BUT, wait, what if the file originally didn't have it, but the previous agent added it?
             // Yes! We want to restore to the state BEFORE the previous agent added the Shadcn Button.
             
             if (!content.includes('import { Button } from')) {
                if (entry.timestamp > latestTime) {
                   latestTime = entry.timestamp;
                   latestFile = entryFilePath;
                }
             }
          }
        }
      }
    } catch (e) {}
  }
  
  return latestFile;
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/pages').concat(walk('src/components'));
let restoredCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('inline-flex items-center justify-center transition-all duration-200')) {
    // This file was modified by my script
    const latestHistory = findLatestHistory(path.resolve(file));
    if (latestHistory) {
      const historyContent = fs.readFileSync(latestHistory, 'utf8');
      fs.writeFileSync(file, historyContent);
      console.log('Restored ' + file + ' from history.');
      restoredCount++;
    } else {
      console.log('NO HISTORY FOUND FOR ' + file);
    }
  }
}

console.log('Total files restored: ' + restoredCount);

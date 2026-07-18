import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagesDir = path.join(__dirname, 'src', 'pages');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedCount = 0;

walkDir(pagesDir, function(filePath) {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if there is <select
    if (content.includes('<select ') || content.includes('<select\n')) {
      // Replace <select with <UISelect and </select> with </UISelect>
      let newContent = content
        .replace(/<select/g, '<UISelect')
        .replace(/<\/select>/g, '</UISelect>');
      
      // Ensure UISelect is imported
      if (!newContent.includes('UISelect')) {
        return; // Something went wrong, or it was in comments
      }
      
      if (!newContent.includes('import { UISelect }') && !newContent.includes('import {UISelect}') && !newContent.includes('import { Modal, UISelect }')) {
        // Find how far we are from src directory to import UISelect correctly
        const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, 'src', 'components', 'ui.jsx'));
        const importPath = relativePath.replace(/\\/g, '/');
        const importStmt = `import { UISelect } from '${importPath.startsWith('.') ? importPath : './' + importPath}';\n`;
        
        // Add import after the last import statement
        const importMatches = [...newContent.matchAll(/^import .*;?$/gm)];
        if (importMatches.length > 0) {
          const lastImport = importMatches[importMatches.length - 1];
          const insertIndex = lastImport.index + lastImport[0].length + 1;
          newContent = newContent.slice(0, insertIndex) + importStmt + newContent.slice(insertIndex);
        } else {
          newContent = importStmt + newContent;
        }
      }
      
      fs.writeFileSync(filePath, newContent, 'utf8');
      modifiedCount++;
      console.log(`Updated ${filePath}`);
    }
  }
});

console.log(`Total files modified: ${modifiedCount}`);

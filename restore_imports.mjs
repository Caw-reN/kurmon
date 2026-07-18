import fs from 'fs';
import path from 'path';

// 1. Parse eslint-results.json
const eslintResultsPath = path.resolve('eslint-results.json');
if (!fs.existsSync(eslintResultsPath)) {
  console.error("eslint-results.json not found!");
  process.exit(1);
}

const eslintData = JSON.parse(fs.readFileSync(eslintResultsPath, 'utf8'));

// 2. Build index of local exports
const localExports = {}; // name -> relative file path
const srcPath = path.resolve('src');

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Match export function X
      const funcRegex = /export\s+(?:default\s+)?function\s+([A-Za-z0-9_]+)/g;
      let match;
      while ((match = funcRegex.exec(content)) !== null) {
        localExports[match[1]] = fullPath;
      }
      
      // Match export const X
      const constRegex = /export\s+const\s+([A-Za-z0-9_]+)/g;
      while ((match = constRegex.exec(content)) !== null) {
        localExports[match[1]] = fullPath;
      }
      
      // Match export { X, Y }
      const exportListRegex = /export\s+\{([^}]+)\}/g;
      while ((match = exportListRegex.exec(content)) !== null) {
        const exports = match[1].split(',').map(s => s.trim());
        for (const e of exports) {
           if (e && e !== 'default') localExports[e] = fullPath;
        }
      }
    }
  }
}
scanDir(srcPath);

// Some components might have specific names, e.g. from components/monitoring/ui/index.js
// But the scanner should catch 'export const X' or 'export function X' inside index.js.

// 3. Process each file
let filesFixed = 0;

const REACT_ROUTER_IMPORTS = ['BrowserRouter', 'Routes', 'Route', 'Navigate', 'Outlet', 'Link', 'NavLink'];
const BASE_UI_IMPORTS = ['Dialog'];
const CUSTOM_COMPONENTS_MAP = {
    'CustomSelect': 'src/components/CustomSelect.jsx',
    'PaginationControls': 'src/components/ui/PaginationControls.jsx',
    'PageHeader': 'src/components/monitoring/ui/index.js',
    'GlobalDialogProvider': 'src/components/ui/GlobalDialog.jsx',
    // add others if needed
};

for (const result of eslintData) {
  const missingVars = new Set();
  
  for (const msg of result.messages) {
    if (msg.ruleId === 'react/jsx-no-undef') {
      // The message is usually: 'X' is not defined.
      const m = msg.message.match(/'([^']+)' is not defined/);
      if (m && m[1]) {
        missingVars.add(m[1]);
      }
    }
  }
  
  if (missingVars.size > 0) {
    const filePath = result.filePath;
    let content = fs.readFileSync(filePath, 'utf8');
    
    const lucideIcons = [];
    const reactRouterDom = [];
    const localImports = {}; // path -> [components]
    
    for (const v of missingVars) {
      if (REACT_ROUTER_IMPORTS.includes(v)) {
        reactRouterDom.push(v);
      } else if (CUSTOM_COMPONENTS_MAP[v]) {
          const targetPath = path.resolve(CUSTOM_COMPONENTS_MAP[v]);
          let relPath = path.relative(path.dirname(filePath), targetPath).replace(/\\/g, '/');
          if (!relPath.startsWith('.')) relPath = './' + relPath;
          if (!localImports[relPath]) localImports[relPath] = [];
          localImports[relPath].push(v);
      } else if (localExports[v]) {
        // Compute relative path
        const targetPath = localExports[v];
        if (targetPath !== filePath) {
          let relPath = path.relative(path.dirname(filePath), targetPath).replace(/\\/g, '/');
          if (!relPath.startsWith('.')) relPath = './' + relPath;
          
          if (!localImports[relPath]) localImports[relPath] = [];
          localImports[relPath].push(v);
        }
      } else {
        // Assume it's a lucide-react icon!
        lucideIcons.push(v);
      }
    }
    
    // Inject imports
    let importStatements = '';
    if (lucideIcons.length > 0) {
      importStatements += `import { ${lucideIcons.join(', ')} } from 'lucide-react';\n`;
    }
    if (reactRouterDom.length > 0) {
      importStatements += `import { ${reactRouterDom.join(', ')} } from 'react-router-dom';\n`;
    }
    for (const [relPath, components] of Object.entries(localImports)) {
       // Just import them as named imports (destructuring). 
       // Usually React components in this project are exported as named, except maybe default exports.
       // Let's assume named imports. If it fails, vite will tell us.
       importStatements += `import { ${components.join(', ')} } from '${relPath}';\n`;
    }
    
    if (importStatements !== '') {
      // Find the last import statement or start of file
      const importMatches = Array.from(content.matchAll(/^import .*;$/gm));
      let insertIndex = 0;
      if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        insertIndex = lastMatch.index + lastMatch[0].length + 1;
      }
      
      content = content.slice(0, insertIndex) + '\n' + importStatements + content.slice(insertIndex);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed ${path.basename(filePath)} (${missingVars.size} missing vars)`);
      filesFixed++;
    }
  }
}

console.log(`Done! Fixed ${filesFixed} files.`);

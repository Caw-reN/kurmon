import fs from 'fs';
import path from 'path';
import * as lucide from 'lucide-react';

const lucideExports = Object.keys(lucide);

const eslintResultsPath = path.resolve('eslint-results.json');
const eslintData = JSON.parse(fs.readFileSync(eslintResultsPath, 'utf8'));

const localExports = {}; // name -> { type: 'default' | 'named', path: '...' }
const srcPath = path.resolve('src');

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Match export default function X
      let match;
      const defaultFuncRegex = /export\s+default\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g;
      while ((match = defaultFuncRegex.exec(content)) !== null) {
        localExports[match[1]] = { type: 'default', path: fullPath };
      }

      // Match export default class X
      const defaultClassRegex = /export\s+default\s+class\s+([A-Za-z0-9_]+)/g;
      while ((match = defaultClassRegex.exec(content)) !== null) {
        localExports[match[1]] = { type: 'default', path: fullPath };
      }
      
      // Match const X = ...; export default X;
      const defaultExportVarRegex = /export\s+default\s+([A-Za-z0-9_]+)\s*;/g;
      while ((match = defaultExportVarRegex.exec(content)) !== null) {
        localExports[match[1]] = { type: 'default', path: fullPath };
      }

      // Match export function X
      const funcRegex = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g;
      while ((match = funcRegex.exec(content)) !== null) {
        if (!localExports[match[1]]) localExports[match[1]] = { type: 'named', path: fullPath };
      }
      
      // Match export const X
      const constRegex = /export\s+const\s+([A-Za-z0-9_]+)/g;
      while ((match = constRegex.exec(content)) !== null) {
        if (!localExports[match[1]]) localExports[match[1]] = { type: 'named', path: fullPath };
      }
      
      // Match export { X, Y }
      const exportListRegex = /export\s+\{([^}]+)\}/g;
      while ((match = exportListRegex.exec(content)) !== null) {
        const exports = match[1].split(',').map(s => s.trim());
        for (const e of exports) {
           if (e && e !== 'default') {
             if (!localExports[e]) localExports[e] = { type: 'named', path: fullPath };
           }
        }
      }
    }
  }
}
scanDir(srcPath);

// Manual overrides for index.js exports or generic names
const CUSTOM_COMPONENTS_MAP = {
    'CustomSelect': { type: 'named', path: path.resolve('src/components/CustomSelect.jsx') },
    'PaginationControls': { type: 'named', path: path.resolve('src/components/ui/PaginationControls.jsx') },
    'PageHeader': { type: 'named', path: path.resolve('src/components/monitoring/ui/index.js') },
    'GlobalDialogProvider': { type: 'default', path: path.resolve('src/components/GlobalDialogProvider.jsx') },
    'ErrorBoundary': { type: 'default', path: path.resolve('src/components/ErrorBoundary.jsx') },
    'Avatar': { type: 'named', path: path.resolve('src/components/monitoring/ui/index.js') },
    'Badge': { type: 'named', path: path.resolve('src/components/monitoring/ui/index.js') },
    'Button': { type: 'named', path: path.resolve('src/components/monitoring/ui/index.js') },
    'Card': { type: 'named', path: path.resolve('src/components/monitoring/ui/index.js') },
    'PageGuide': { type: 'named', path: path.resolve('src/components/monitoring/ui/index.js') },
    'StatCard': { type: 'named', path: path.resolve('src/components/monitoring/ui/index.js') },
    'Toggle': { type: 'named', path: path.resolve('src/components/monitoring/ui/index.js') },
    'EmptyState': { type: 'named', path: path.resolve('src/components/monitoring/ui/index.js') },
    'ImportModal': { type: 'named', path: path.resolve('src/components/monitoring/ui/index.js') },
    'AdminContentRouter': { type: 'default', path: path.resolve('src/components/admin/AdminContentRouter.jsx') },
    'AdminHeader': { type: 'default', path: path.resolve('src/components/admin/AdminHeader.jsx') },
    'GlobalAdminUI': { type: 'default', path: path.resolve('src/components/admin/layout/GlobalAdminUI.jsx') },
    'WorkspaceGuidePanel': { type: 'default', path: path.resolve('src/components/WorkspaceGuidePanel.jsx') },
    'CustomRolesModal': { type: 'default', path: path.resolve('src/components/admin/CustomRolesModal.jsx') },
};

Object.assign(localExports, CUSTOM_COMPONENTS_MAP);

const REACT_IMPORTS = ['Suspense', 'StrictMode', 'Fragment', 'lazy'];
const REACT_ROUTER_IMPORTS = ['BrowserRouter', 'Routes', 'Route', 'Navigate', 'Outlet', 'Link', 'NavLink'];

let filesFixed = 0;

for (const result of eslintData) {
  const missingVars = new Set();
  
  for (const msg of result.messages) {
    if (msg.ruleId === 'react/jsx-no-undef') {
      const m = msg.message.match(/'([^']+)' is not defined/);
      if (m && m[1]) {
        missingVars.add(m[1]);
      }
    }
  }
  
  if (missingVars.size > 0) {
    const filePath = result.filePath;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // First: REMOVE the bad imports we might have added or that existed partially
    // We will just do string replacement for the missing variables from any import statement
    for (const v of missingVars) {
      // Remove from named imports: { ..., v, ... } -> { ..., ... }
      const namedImportRegex = new RegExp(`(import\\s+\\{[^}]*)\\b${v}\\b\\s*,?\\s*([^}]*\\}\\s+from\\s+['"][^'"]+['"];?)`, 'g');
      content = content.replace(namedImportRegex, (match, p1, p2) => {
        let newContent = p1 + p2;
        // Clean up empty commas or trailing commas
        newContent = newContent.replace(/,\s*,/g, ',').replace(/\{\s*,/g, '{').replace(/,\s*\}/g, '}');
        return newContent;
      });

      // Remove entire empty named imports: import {} from '...';
      content = content.replace(/^import\s*\{\s*\}\s*from\s+['"][^'"]+['"];?\r?\n/gm, '');

      // Remove default imports if they match: import v from '...';
      const defaultImportRegex = new RegExp(`^import\\s+${v}\\s+from\\s+['"][^'"]+['"];?\\r?\\n`, 'gm');
      content = content.replace(defaultImportRegex, '');
    }

    // Now compute the correct imports
    const iconsToImport = [];
    const reactRouterToImport = [];
    const reactToImport = [];
    const localNamedImports = {}; // path -> [components]
    const localDefaultImports = []; // { path, component }
    
    for (const v of missingVars) {
      if (REACT_IMPORTS.includes(v)) {
        reactToImport.push(v);
      } else if (REACT_ROUTER_IMPORTS.includes(v)) {
        reactRouterToImport.push(v);
      } else if (lucideExports.includes(v)) {
        iconsToImport.push(v);
      } else if (localExports[v]) {
        const { type, path: targetPath } = localExports[v];
        if (targetPath !== filePath) {
          let relPath = path.relative(path.dirname(filePath), targetPath).replace(/\\/g, '/');
          if (!relPath.startsWith('.')) relPath = './' + relPath;
          
          if (type === 'default') {
            localDefaultImports.push({ path: relPath, component: v });
          } else {
            if (!localNamedImports[relPath]) localNamedImports[relPath] = [];
            if (!localNamedImports[relPath].includes(v)) localNamedImports[relPath].push(v);
          }
        }
      } else {
        console.warn(`WARNING: Could not find export for missing variable '${v}' in ${path.basename(filePath)}`);
      }
    }
    
    // Inject imports
    let importStatements = '';
    if (reactToImport.length > 0) {
      importStatements += `import { ${reactToImport.join(', ')} } from 'react';\n`;
    }
    if (reactRouterToImport.length > 0) {
      importStatements += `import { ${reactRouterToImport.join(', ')} } from 'react-router-dom';\n`;
    }
    if (iconsToImport.length > 0) {
      importStatements += `import { ${iconsToImport.join(', ')} } from 'lucide-react';\n`;
    }
    for (const item of localDefaultImports) {
       importStatements += `import ${item.component} from '${item.path}';\n`;
    }
    for (const [relPath, components] of Object.entries(localNamedImports)) {
       importStatements += `import { ${components.join(', ')} } from '${relPath}';\n`;
    }
    
    if (importStatements !== '') {
      // Find where to insert (after last import or top of file)
      const importMatches = Array.from(content.matchAll(/^import\s+.*from\s+['"][^'"]+['"];?/gm));
      let insertIndex = 0;
      if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        insertIndex = lastMatch.index + lastMatch[0].length;
        if (content[insertIndex] === '\r') insertIndex++;
        if (content[insertIndex] === '\n') insertIndex++;
      }
      
      content = content.slice(0, insertIndex) + (insertIndex > 0 ? '' : '\n') + importStatements + content.slice(insertIndex);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Cleaned & Fixed ${path.basename(filePath)} (${missingVars.size} missing vars)`);
      filesFixed++;
    }
  }
}

console.log(`Done! Smart-fixed ${filesFixed} files.`);

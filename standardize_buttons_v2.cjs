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

  // Process each button tag
  // We match the className string inside <button ... className="...">
  content = content.replace(/<button([^>]*?)className=(['"])(.*?)\2([^>]*)>/g, (match, before, quote, classStr, after) => {
    let classes = classStr;
    
    // Determine the "intent" of the button based on original colors
    const isPrimary = classes.includes('bg-blue-600') || classes.includes('bg-blue-500') || 
                      classes.includes('bg-slate-800') || classes.includes('bg-indigo-600') || 
                      classes.includes('bg-slate-900') || classes.includes('bg-emerald-600');
                      
    const isSecondary = classes.includes('bg-slate-100') || classes.includes('bg-gray-100');
    
    const isDanger = classes.includes('bg-red-600') || classes.includes('bg-red-500') || classes.includes('bg-rose-600');

    if (isPrimary && !classes.includes('text-blue-600') && !classes.includes('text-slate-800')) {
      // It's a solid primary button. Let's strip its old colors and apply standard
      classes = classes.replace(/\bbg-(blue|slate|indigo|emerald)-(500|600|700|800|900)\b/g, '');
      classes = classes.replace(/\bhover:bg-(blue|slate|indigo|emerald)-(500|600|700|800|900)\b/g, '');
      classes = classes.replace(/\btext-white\b/g, '');
      classes = classes.replace(/\brounded(-md|-lg)?\b/g, '');
      
      // Add standard classes
      classes += ' bg-[var(--ui-primary)] text-white hover:opacity-90 rounded-[var(--ui-radius-control)] shadow-sm';
    } 
    else if (isDanger && !classes.includes('text-red-600')) {
      classes = classes.replace(/\bbg-(red|rose)-(500|600|700)\b/g, '');
      classes = classes.replace(/\bhover:bg-(red|rose)-(600|700|800)\b/g, '');
      classes = classes.replace(/\btext-white\b/g, '');
      classes = classes.replace(/\brounded(-md|-lg)?\b/g, '');
      
      classes += ' bg-red-600 text-white hover:bg-red-700 rounded-[var(--ui-radius-control)] shadow-sm';
    }

    // Clean up multiple spaces
    classes = classes.replace(/\s+/g, ' ').trim();

    return `<button${before}className=${quote}${classes}${quote}${after}>`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Modified: ${filePath}`);
  }
});

console.log(`Done! Modified ${modifiedFiles} files.`);

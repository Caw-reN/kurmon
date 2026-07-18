const fs = require('fs');
const path = require('path');

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

// Parse all <Button ...> tags and extract variant, size, children context
const files = walk('src/pages');
const sizeStats = {};
const issues = [];

files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split('\n');
  
  // Find all <Button occurrences with their context
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const idx = line.indexOf('<Button');
    if (idx === -1) continue;
    
    // Gather the full tag (may span multiple lines)
    let tag = '';
    let j = i;
    let depth = 0;
    let inStr = false;
    let strCh = '';
    let foundEnd = false;
    while (j < Math.min(i + 15, lines.length) && !foundEnd) {
      for (let k = (j === i ? idx : 0); k < lines[j].length; k++) {
        const ch = lines[j][k];
        tag += ch;
        if (!inStr && (ch === '"' || ch === "'" || ch === '`')) { inStr = true; strCh = ch; }
        else if (inStr && ch === strCh) { inStr = false; }
        else if (!inStr && ch === '{') depth++;
        else if (!inStr && ch === '}') depth--;
        else if (!inStr && depth === 0 && ch === '>') { foundEnd = true; break; }
      }
      if (!foundEnd) tag += '\n';
      j++;
    }
    
    // Extract variant
    const variantMatch = tag.match(/variant=["']([^"']+)["']/);
    const variant = variantMatch ? variantMatch[1] : 'primary';
    
    // Extract size
    const sizeMatch = tag.match(/size=["']([^"']+)["']/);
    const size = sizeMatch ? sizeMatch[1] : '(none)';
    
    // Look at what's inside the button (next few lines after tag)
    let content = '';
    for (let k = i; k < Math.min(j + 3, lines.length); k++) {
      content += lines[k] + '\n';
    }
    
    // Determine if it's icon-only (children is just an icon, no text)
    const hasTextContent = content.match(/>([^<{]+)</);
    const textContent = hasTextContent ? hasTextContent[1].trim() : '';
    const hasIcon = content.includes('size={') || content.includes('Icon') || content.includes('icon');
    const isIconOnly = !textContent && hasIcon;
    const hasBothIconAndText = textContent && hasIcon;
    
    // Determine context
    let context = 'unknown';
    if (content.includes('Edit') || content.includes('Hapus') || content.includes('Trash') || content.includes('Pencil') || content.includes('Edit2')) context = 'table-action';
    else if (content.includes('Simpan') || content.includes('Save') || content.includes('Tambah') || content.includes('Submit')) context = 'submit';
    else if (content.includes('Ekspor') || content.includes('Export') || content.includes('Download') || content.includes('Cetak') || content.includes('Print')) context = 'export';
    else if (content.includes('Cari') || content.includes('Search') || content.includes('Filter')) context = 'filter';
    else if (content.includes('ChevronLeft') || content.includes('ChevronRight') || content.includes('pagination')) context = 'pagination';
    else if (content.includes('Masuk') || content.includes('Login') || content.includes('LogIn')) context = 'cta';
    else if (content.includes('Refresh') || content.includes('RefreshCw')) context = 'refresh';
    else if (content.includes('Close') || content.includes('X size') || content.includes('<X ')) context = 'close';
    
    const key = `${variant}/${size}`;
    if (!sizeStats[key]) sizeStats[key] = 0;
    sizeStats[key]++;
    
    // Check for potential issues
    if (size === 'default' && isIconOnly) {
      issues.push({ file: f, line: i + 1, msg: 'Icon-only button has size="default" - should be "icon-sm"', text: textContent || '(icon-only)' });
    }
    if (size === 'icon-sm' && textContent && textContent.length > 3) {
      issues.push({ file: f, line: i + 1, msg: `Icon-size button has text "${textContent}" - should be "sm" or "default"`, text: textContent });
    }
    if (size === '(none)') {
      issues.push({ file: f, line: i + 1, msg: 'Button has no size prop', text: textContent || '(icon-only)' });
    }
  }
});

console.log('=== SIZE DISTRIBUTION ===');
Object.entries(sizeStats).sort((a, b) => b[1] - a[1]).forEach(([key, count]) => {
  console.log(`  ${key}: ${count}`);
});

console.log(`\n=== POTENTIAL ISSUES (${issues.length}) ===`);
issues.forEach(issue => {
  console.log(`  ${issue.file}:${issue.line} — ${issue.msg}`);
});

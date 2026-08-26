const fs = require('fs');
const path = require('path');

const masterDataPath = path.join(__dirname, '../src/pages/admin/master_data');
const files = fs.readdirSync(masterDataPath).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(masterDataPath, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // General transformations for old KPI styles to premium ones

  // Primary Cards
  content = content.replace(/border-slate-200\/80 shadow-xs(?! flex items-center)/g, 'border-slate-200/80 shadow-2xs hover:shadow-xs transition-all');
  
  // Actually, we can replace the specific card wrappers one by one if they match the exact structure.
  
  // Icon borders:
  // Primary
  content = content.replace(/bg-\[var\(--ui-primary\)\]\/10 text-\[var\(--ui-primary\)\] flex items-center justify-center shrink-0"/g, 'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center shrink-0 border border-[var(--ui-primary)]/20"');
  // Emerald
  content = content.replace(/bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"/g, 'bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200"');
  // Rose
  content = content.replace(/bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"/g, 'bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200"');
  // Amber
  content = content.replace(/bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"/g, 'bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200"');
  // Indigo
  content = content.replace(/bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"/g, 'bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200"');

  // Label text
  content = content.replace(/className="text-\[11px\] font-bold text-slate-400 uppercase/g, 'className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase');
  content = content.replace(/className="text-\[11px\] font-bold text-emerald-600 uppercase/g, 'className="text-[10px] sm:text-[11px] font-black text-emerald-600 uppercase');
  content = content.replace(/className="text-\[11px\] font-bold text-rose-600 uppercase/g, 'className="text-[10px] sm:text-[11px] font-black text-rose-600 uppercase');
  content = content.replace(/className="text-\[11px\] font-bold text-amber-600 uppercase/g, 'className="text-[10px] sm:text-[11px] font-black text-amber-600 uppercase');
  content = content.replace(/className="text-\[11px\] font-bold text-indigo-600 uppercase/g, 'className="text-[10px] sm:text-[11px] font-black text-indigo-600 uppercase');
  
  // Value text
  content = content.replace(/className="text-lg sm:text-xl font-black text-slate-800"/g, 'className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight"');
  content = content.replace(/className="text-lg sm:text-xl font-black text-emerald-700"/g, 'className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight"');
  content = content.replace(/className="text-lg sm:text-xl font-black text-rose-700"/g, 'className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight"');
  content = content.replace(/className="text-lg sm:text-xl font-black text-amber-700"/g, 'className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight"');
  content = content.replace(/className="text-lg sm:text-xl font-black text-indigo-700"/g, 'className="text-xl sm:text-2xl font-black text-indigo-700 tracking-tight"');

  // Card Borders (Contextual)
  // Emerald
  content = content.replace(/border border-slate-200\/80 shadow-xs flex items-center gap-3\.5">\s*<div className="w-10 h-10 [^>]+ bg-emerald-50/g, 'border border-emerald-200/60 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">\n          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-emerald-50');
  
  // Rose
  content = content.replace(/border border-slate-200\/80 shadow-xs flex items-center gap-3\.5">\s*<div className="w-10 h-10 [^>]+ bg-rose-50/g, 'border border-rose-200/60 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">\n          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-rose-50');

  // Amber
  content = content.replace(/border border-slate-200\/80 shadow-xs flex items-center gap-3\.5">\s*<div className="w-10 h-10 [^>]+ bg-amber-50/g, 'border border-amber-200/60 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">\n          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-amber-50');

  // Indigo
  content = content.replace(/border border-slate-200\/80 shadow-xs flex items-center gap-3\.5">\s*<div className="w-10 h-10 [^>]+ bg-indigo-50/g, 'border border-indigo-200/60 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">\n          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-indigo-50');

  // Primary
  content = content.replace(/border border-slate-200\/80 shadow-xs flex items-center gap-3\.5">\s*<div className="w-10 h-10 [^>]+ bg-\[var\(--ui-primary\)\]\/10/g, 'border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">\n          <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)]/10');

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Sync CSS KPI complete.');

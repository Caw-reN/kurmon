const fs = require('fs');
const diffContent = fs.readFileSync('C:\\laragon\\www\\inkscod\\kurmon\\scratch\\diff_all.txt', 'utf-8');

const diffLines = diffContent.split('\n');
let recovered = [];
let insideBigBlock = false;

for (let i = 0; i < diffLines.length; i++) {
  const dl = diffLines[i];
  if (dl.startsWith('-  return (')) {
    insideBigBlock = true;
  }
  
  if (insideBigBlock) {
    if (dl.startsWith('-')) {
      recovered.push(dl.substring(1));
    } else if (dl === '             <div className="p-4 border-b border-slate-100 flex items-center justify-between">') {
      // end of the big deleted block
      break;
    } else if (dl === '+// ... inside Modal Cetak Rapor') {
      break;
    } else if (dl.startsWith('+') || dl.startsWith('@@') || dl.startsWith('[diff_block')) {
      // ignore
    } else {
      // unchanged line, usually starts with a space
      if (dl.startsWith(' ')) {
        recovered.push(dl.substring(1));
      } else {
        recovered.push(dl);
      }
    }
  }
}

fs.writeFileSync('C:\\laragon\\www\\inkscod\\kurmon\\scratch\\recovered_lines.jsx', recovered.join('\n'));
console.log("Recovered " + recovered.length + " lines!");

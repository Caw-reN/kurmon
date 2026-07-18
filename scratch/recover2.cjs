const fs = require('fs');

const raw = fs.readFileSync('C:\\laragon\\www\\inkscod\\kurmon\\scratch\\rekap_found.txt', 'utf-8');
const lines = raw.split('\n');

let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("The following code has been modified to include a line number before every line")) {
    if (startIndex === -1) startIndex = i + 1; // get the first occurrence
  }
  if (lines[i].includes("The above content shows the entire, complete file contents") || lines[i].includes("<truncated")) {
    endIndex = i;
  }
}

if (startIndex !== -1) {
  if (endIndex === -1) endIndex = lines.length;
  
  const contentLines = lines.slice(startIndex, endIndex);
  const cleanLines = contentLines.map(line => {
    const match = line.match(/^\d+:\s?(.*)$/);
    if (match) {
      return match[1];
    }
    return line;
  });
  
  fs.writeFileSync('C:\\laragon\\www\\inkscod\\kurmon\\scratch\\rekap_recovered.jsx', cleanLines.join('\n'));
} else {
  console.log("Could not find start index");
}

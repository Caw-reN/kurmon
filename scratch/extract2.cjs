const fs = require('fs');

const data = fs.readFileSync('C:\\Users\\fahru\\.gemini\\antigravity-ide\\brain\\816bd265-55e2-421a-ab26-da55ce2c52c0\\.system_generated\\logs\\transcript.jsonl', 'utf-8');

const lines = data.split('\n');
let maxLen = 0;
let bestContent = '';
for (const line of lines) {
  if (line.includes('RekapKedisiplinan.jsx')) {
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);
      if (str.includes('export default function RekapKedisiplinan')) {
        let content = '';
        if (obj.content) content = obj.content;
        else if (obj.output) content = obj.output;
        else content = str;

        if (content.length > maxLen) {
           maxLen = content.length;
           bestContent = content;
        }
      }
    } catch (e) {}
  }
}
fs.writeFileSync('C:\\laragon\\www\\inkscod\\kurmon\\scratch\\rekap_found.txt', bestContent);

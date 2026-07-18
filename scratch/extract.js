const fs = require('fs');

const data = fs.readFileSync('C:\\Users\\fahru\\.gemini\\antigravity-ide\\brain\\816bd265-55e2-421a-ab26-da55ce2c52c0\\.system_generated\\logs\\transcript.jsonl', 'utf-8');

const lines = data.split('\n');
for (const line of lines) {
  if (line.includes('RekapKedisiplinan.jsx')) {
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);
      if (str.includes('export default function RekapKedisiplinan') && str.length > 10000) {
        if (obj.content) {
            fs.writeFileSync('C:\\laragon\\www\\inkscod\\kurmon\\scratch\\rekap_found.txt', obj.content);
        } else if (obj.output) {
            fs.writeFileSync('C:\\laragon\\www\\inkscod\\kurmon\\scratch\\rekap_found.txt', obj.output);
        } else {
            fs.writeFileSync('C:\\laragon\\www\\inkscod\\kurmon\\scratch\\rekap_found.txt', str);
        }
      }
    } catch (e) {}
  }
}

const fs = require('fs');
const raw = fs.readFileSync('C:\\Users\\fahru\\.gemini\\antigravity-ide\\brain\\816bd265-55e2-421a-ab26-da55ce2c52c0\\.system_generated\\logs\\transcript.jsonl', 'utf-8');

const lines = raw.split('\n');
let allDiffs = [];

for (const line of lines) {
  if (line.includes('RekapKedisiplinan.jsx') && line.includes('multi_replace_file_content')) {
     try {
       const obj = JSON.parse(line);
       if (obj.content && obj.content.includes('[diff_block_start]')) allDiffs.push(obj.content);
       else if (obj.output && obj.output.includes('[diff_block_start]')) allDiffs.push(obj.output);
     } catch(e) {}
  }
}

fs.writeFileSync('C:\\laragon\\www\\inkscod\\kurmon\\scratch\\diff_all.txt', allDiffs.join('\n\n=========================\n\n'));

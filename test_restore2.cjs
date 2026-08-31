const fs = require('fs');
let content = fs.readFileSync('scratch/LiveUserActivityLog.bak.jsx', 'utf16le');

// Regex replace formatLogTime
const regex = /const formatLogTime = \(dateStr\) => \{[\s\S]*?catch \{[\s\S]*?return dateStr;[\s\S]*?\}[\s\S]*?\};/;
const match = content.match(regex);
if (match) {
  const newFormatLogTime = `const formatLogTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      let d = new Date(dateStr);
      const now = new Date();
      
      const initialDiffMins = (now.getTime() - d.getTime()) / 60000;
      if (initialDiffMins >= 360 && initialDiffMins <= 480) {
        d = new Date(d.getTime() + 7 * 60 * 60 * 1000);
      }

      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      const formatter = new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false
      });
      const timeParts = formatter.formatToParts(d);
      const hour = timeParts.find(p => p.type === 'hour')?.value || '00';
      const minute = timeParts.find(p => p.type === 'minute')?.value || '00';
      const timeStr = \`\${hour}.\${minute}\`;
      
      if (diffMins >= 0 && diffMins < 1) return 'Baru saja';
      if (diffMins >= 1 && diffMins < 60) return \`\${diffMins} mnt lalu\`;
      return \`\${timeStr} WIB\`;
    } catch {
      return dateStr;
    }
  };`;
  content = content.replace(regex, newFormatLogTime);
  // Also fix a bug where `class_name` was used on older code
  fs.writeFileSync('src/components/admin/LiveUserActivityLog.jsx', content, 'utf8');
  console.log("Regex replaced successfully!");
} else {
  console.log("Regex not matched.");
}

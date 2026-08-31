const fs = require('fs');
let content = fs.readFileSync('scratch/LiveUserActivityLog.bak.jsx', 'utf16le');

// find formatLogTime and replace it
const oldFormatLogTime = `  const formatLogTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return \`\${diffMins} mnt lalu\`;
      return \`\${timeStr} WIB\`;
    } catch {
      return dateStr;
    }
  };`;

const newFormatLogTime = `  const formatLogTime = (dateStr) => {
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

if (content.includes(oldFormatLogTime)) {
  content = content.replace(oldFormatLogTime, newFormatLogTime);
  fs.writeFileSync('src/components/admin/LiveUserActivityLog.jsx', content, 'utf8');
  console.log("Successfully restored UI and kept time fix!");
} else {
  console.log("Could not find the original formatLogTime function to replace.");
}

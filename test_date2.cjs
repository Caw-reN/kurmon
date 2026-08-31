const dateStr = "2026-08-31T06:38:41.957"; // No Z
const d = new Date(dateStr);
console.log("Without Z parsed locally:", d.toString());
console.log("With Asia/Jakarta:", d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }));

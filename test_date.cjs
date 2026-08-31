const dateStr = "2026-08-31T06:38:41.957Z";
const d = new Date(dateStr);
console.log("Original parsed locally (without timezone offset applied):", d.toString());
console.log("With Asia/Jakarta:", d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }));

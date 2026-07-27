import pg from 'pg';
import dotenv from 'dotenv';
import { HikvisionAPI, decryptPassword } from './server/hikvision-api.mjs';
dotenv.config();
const dbPool = new pg.Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});
async function run() {
  const { rows: devices } = await dbPool.query('SELECT * FROM hikvision_devices');
  const device = devices[0];
  const plainPassword = decryptPassword(device.encrypted_password, device.iv_vector);
  const api = new HikvisionAPI(device.ip_address, device.username, plainPassword);
  
  let startTime = new Date();
  startTime.setDate(startTime.getDate() - 3);
  const endTime = new Date();
  
  let allLogs = [];
  let position = 0;
  const startStr = startTime.toISOString().replace(/\.\d{3}Z$/, '+07:00');
  const endStr = endTime.toISOString().replace(/\.\d{3}Z$/, '+07:00');
  while(true) {
      const payload = { AcsEventCond: { searchID: '1', searchResultPosition: position, maxResults: 30, major: 5, minor: 75, startTime: startStr, endTime: endStr } };
      const res = await fetch(`http://${device.ip_address}/ISAPI/AccessControl/AcsEvent?format=json`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${Buffer.from(device.username + ':' + plainPassword).toString('base64')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      const data = await res.json();
      const logs = data.AcsEvent?.InfoList || [];
      if (logs.length === 0) break;
      allLogs = allLogs.concat(logs);
      position += logs.length;
      if (logs.length < 30) break;
  }
  console.log('Total with minor 75:', allLogs.length);
  const sorted = allLogs.sort((a,b) => new Date(b.time) - new Date(a.time));
  for (let i = 0; i < Math.min(5, sorted.length); i++) {
    console.log(sorted[i].time, sorted[i].name || sorted[i].employeeNoString);
  }
  dbPool.end();
}
run();

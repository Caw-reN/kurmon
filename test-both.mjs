import pg from 'pg';
import dotenv from 'dotenv';
import { HikvisionAPI, decryptPassword } from './server/hikvision-api.mjs';
import crypto from 'crypto';
dotenv.config();

const dbPool = new pg.Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});

async function fetchLogs(device, plainPassword, minor) {
  let allLogs = [];
  let position = 0;
  
  let startTime = new Date();
  startTime.setDate(startTime.getDate() - 3);
  const endTime = new Date();
  const startStr = startTime.toISOString().replace(/\.\d{3}Z$/, '+07:00');
  const endStr = endTime.toISOString().replace(/\.\d{3}Z$/, '+07:00');
  const sid = crypto.randomUUID();
  
  while(true) {
      const payload = { AcsEventCond: { searchID: sid, searchResultPosition: position, maxResults: 30, major: 5, minor: minor, startTime: startStr, endTime: endStr } };
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
  return allLogs;
}

async function run() {
  const { rows: devices } = await dbPool.query('SELECT * FROM hikvision_devices');
  const device = devices[0];
  const plainPassword = decryptPassword(device.encrypted_password, device.iv_vector);
  
  const faceLogs = await fetchLogs(device, plainPassword, 75);
  console.log(`Minor 75 (Face) Logs: ${faceLogs.length}`);
  
  const fpLogs = await fetchLogs(device, plainPassword, 38);
  console.log(`Minor 38 (Fingerprint) Logs: ${fpLogs.length}`);
  
  const cardLogs = await fetchLogs(device, plainPassword, 1); // 1 = card maybe? Or 21?
  console.log(`Minor 1 (Card) Logs: ${cardLogs.length}`);
  
  dbPool.end();
}
run();

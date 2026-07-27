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
  const res = await fetch(`http://${device.ip_address}/ISAPI/System/time`, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${Buffer.from(device.username + ':' + plainPassword).toString('base64')}` }
  });
  const data = await res.text();
  console.log('Device time XML:', data);
  dbPool.end();
}
run();

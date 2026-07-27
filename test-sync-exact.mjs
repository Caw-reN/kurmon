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
  const { rows: devices } = await dbPool.query("SELECT * FROM hikvision_devices");
  for (const device of devices) {
    console.log('Syncing device:', device.ip_address);
    const plainPassword = decryptPassword(device.encrypted_password, device.iv_vector);
    const api = new HikvisionAPI(device.ip_address, device.username, plainPassword);
    
    const lastLogRes = await dbPool.query('SELECT MAX(timestamp) as last_ts FROM hikvision_logs WHERE device_id = $1', [device.id]);
    let startTime = new Date();
    startTime.setHours(0, 0, 0, 0);
    if (lastLogRes.rows[0].last_ts) {
       startTime = new Date(lastLogRes.rows[0].last_ts);
    } else {
       startTime.setDate(startTime.getDate() - 3);
    }
    const endTime = new Date();
    
    try {
      const logs = await api.searchEvents(startTime, endTime);
      console.log('Logs found:', logs.length);
      if (logs && logs.length > 0) {
        const validLogs = logs.filter(l => l.employeeNoString);
        console.log('Valid logs:', validLogs.length);
        const query = `INSERT INTO hikvision_logs (device_id, employee_id, timestamp, event_type) VALUES ($1, $2, $3, $4) ON CONFLICT (device_id, employee_id, timestamp) DO NOTHING`;
        for (const l of validLogs) {
          try {
             await dbPool.query(query, [device.id, l.employeeNoString, new Date(l.time), l.major + '-' + l.minor]);
          } catch (e) {
             console.error('Insert error:', e.message);
          }
        }
      }
    } catch (e) {
      console.error('Device error:', e.message);
    }
  }
  dbPool.end();
}
run();

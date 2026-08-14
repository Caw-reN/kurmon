import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
import { HikvisionAPI, decryptPassword } from './server/hikvision-api.mjs';
const { Pool } = pg;

const dbPool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'school_system_db',
  password: 'ijjuuiue',
  port: 5432,
});

async function run() {
  const { rows } = await dbPool.query("SELECT * FROM hikvision_devices");
  
  const start = new Date('2026-08-13T08:00:00+07:00');
  const end = new Date('2026-08-13T10:00:00+07:00');

  for (const device of rows) {
    const plainPassword = decryptPassword(device.encrypted_password, device.iv_vector);
    const api = new HikvisionAPI(device.ip_address, device.username, plainPassword);

    console.log("Fetching logs for device", device.ip_address);
    try {
      const logs = await api.searchEvents(start, end);
      console.log("Fetched", logs.length, "logs");
      const validLogs = logs.filter(l => l.employeeNoString);
      if (validLogs.length > 0) {
        console.log("Found", validLogs.length, "valid logs.");
      }
    } catch(e) {}
  }
  process.exit(0);
}
run();

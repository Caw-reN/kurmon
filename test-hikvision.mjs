import pg from 'pg';
import { HikvisionAPI, decryptPassword } from './server/hikvision-api.mjs';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const dbPool = new pg.Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});

async function run() {
  try {
    const { rows: devices } = await dbPool.query("SELECT * FROM hikvision_devices");
    if (devices.length === 0) {
      console.log("No devices found.");
      return;
    }
    
    for (const device of devices) {
      console.log(`Testing device: ${device.ip_address}`);
      const plainPassword = decryptPassword(device.encrypted_password, device.iv_vector);
      const api = new HikvisionAPI(device.ip_address, device.username, plainPassword);
      
      let startTime = new Date();
      startTime.setDate(startTime.getDate() - 3);
      
      console.log("Fetching logs...");
      try {
        const endTime = new Date();
        const logs = await api.searchEvents(startTime, endTime);
        const validLogs = logs.filter(l => l.employeeNoString);
        console.log(`Found ${logs.length} logs. Valid employee logs: ${validLogs.length}`);
        if (validLogs.length > 0) {
          console.log("Sample valid log:", validLogs[0]);
        }
      } catch (err) {
        console.error("Error fetching logs:", err.message);
      }
    }
  } catch (err) {
    console.error("Database error:", err.message);
  } finally {
    dbPool.end();
  }
}

run();

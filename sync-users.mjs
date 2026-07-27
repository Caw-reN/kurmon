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
    const dtype = device.device_type || 'siswa';
    console.log('Syncing users for:', device.ip_address);
    try {
      const plainPassword = decryptPassword(device.encrypted_password, device.iv_vector);
      const api = new HikvisionAPI(device.ip_address, device.username, plainPassword);
      
      const users = await api.getUsers();
      console.log('Users found:', users?.length);
      if (users && users.length > 0) {
        for (const u of users) {
          const empNo = String(u.employeeNo || "").trim();
          const name = u.name;
          
          let dbGrpId = null;
          if (dtype === 'siswa' && u.groupId) {
            const checkGrp = await dbPool.query("SELECT id FROM hikvision_groups WHERE device_id = $1 AND group_id = $2", [device.id, u.groupId]);
            if (checkGrp.rows.length > 0) {
              dbGrpId = checkGrp.rows[0].id;
            } else {
              const insGrp = await dbPool.query("INSERT INTO hikvision_groups (device_id, group_id, group_name) VALUES ($1, $2, $3) RETURNING id", [device.id, u.groupId, `Group ${u.groupId}`]);
              dbGrpId = insGrp.rows[0].id;
            }
          }
          
          const checkStu = await dbPool.query("SELECT id FROM hikvision_students WHERE nis = $1", [empNo]);
          if (checkStu.rows.length > 0) {
            await dbPool.query("UPDATE hikvision_students SET name = $1, device_group_id = $2, class_name = $3 WHERE nis = $4", [name, dbGrpId, dtype, empNo]);
          } else {
            await dbPool.query("INSERT INTO hikvision_students (nis, name, device_group_id, class_name) VALUES ($1, $2, $3, $4)", [empNo, name, dbGrpId, dtype]);
          }
        }
      }
    } catch (e) {
      console.error('Error for', device.ip_address, e.message);
    }
  }
  dbPool.end();
}
run();

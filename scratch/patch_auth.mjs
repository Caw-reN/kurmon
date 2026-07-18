import fs from 'fs';

let code = fs.readFileSync('server/auth-server.mjs', 'utf8');

if (code.includes('autoSyncGuruAttendanceToAppData')) {
  console.log('Already injected.');
  process.exit(0);
}

const newFunc = `
async function autoSyncGuruAttendanceToAppData() {
  if (!dbPool) return;
  try {
    const teachersRes = await dbPool.query('SELECT id, payload FROM mst_teachers');
    const nipToCode = {};
    teachersRes.rows.forEach(r => {
      const t = r.payload;
      const code = t.code || r.id;
      if (r.id) nipToCode[String(r.id).trim().toLowerCase()] = code;
      if (t.code) nipToCode[String(t.code).trim().toLowerCase()] = code;
      if (t.nip) nipToCode[String(t.nip).trim().toLowerCase()] = code;
      if (t.id) nipToCode[String(t.id).trim().toLowerCase()] = code;
    });

    const { rows: logs } = await dbPool.query(\`
      SELECT l.employee_id, l.timestamp, l.event_type, d.ip_address, d.location, d.device_type
      FROM hikvision_logs l
      JOIN hikvision_devices d ON l.device_id = d.id
      WHERE d.device_type IN ('guru', 'karyawan')
      ORDER BY l.timestamp ASC
    \`);
    if (logs.length === 0) return;

    const mainRes = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store'");
    const mainData = mainRes.rowCount > 0 ? JSON.parse(mainRes.rows[0].data) : {};
    const existingRecords = Array.isArray(mainData.attendanceRecords) ? mainData.attendanceRecords : [];
    const existingIds = new Set(existingRecords.map(r => r.id));

    const conf = await getHikvisionConfig();
    let added = 0;
    const newRecords = [];

    const getRoleTimeConfigLocal = (conf, role) => {
      const defaults = {
        siswa: { masuk_open: "05:00", masuk_late: "07:15", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "18:00" },
        guru: { masuk_open: "05:00", masuk_late: "07:00", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "18:00" },
        karyawan: { masuk_open: "05:00", masuk_late: "07:00", masuk_close: "11:00", pulang_open: "15:00", pulang_close: "18:00" }
      };
      const roleDefault = defaults[role] || defaults.siswa;
      const roleConf = conf[role] || {};
      const formatTime = (timeStr) => {
        if (!timeStr) return "";
        return timeStr.substring(0, 5); // "HH:MM"
      };
      return {
        masuk_open: formatTime(roleConf.masuk_open) || roleDefault.masuk_open,
        masuk_late: formatTime(roleConf.masuk_late) || roleDefault.masuk_late,
        masuk_close: formatTime(roleConf.masuk_close) || roleDefault.masuk_close,
        pulang_open: formatTime(roleConf.pulang_open) || roleDefault.pulang_open,
        pulang_close: formatTime(roleConf.pulang_close) || roleDefault.pulang_close,
      };
    };

    logs.forEach(log => {
      const empId = String(log.employee_id || '').trim();
      const teacherCode = nipToCode[empId.toLowerCase()] || null;
      if (!teacherCode) return;

      const ts = new Date(log.timestamp);
      const year = ts.getFullYear();
      const month = String(ts.getMonth() + 1).padStart(2, '0');
      const day = String(ts.getDate()).padStart(2, '0');
      const date = \`\${year}-\${month}-\${day}\`;
      const time = ts.toTimeString().substring(0, 5); 
      
      const roleType = log.device_type === 'karyawan' ? 'karyawan' : 'guru';
      const roleConf = getRoleTimeConfigLocal(conf, roleType);

      let sessionName = '';
      let status = '';
      if (time >= roleConf.masuk_open && time <= roleConf.masuk_close) {
        sessionName = 'Masuk Pagi';
        status = time > roleConf.masuk_late ? 'Terlambat' : 'Hadir';
      } else if (time >= roleConf.pulang_open && time <= roleConf.pulang_close) {
        sessionName = 'Pulang Sore';
        status = 'Hadir';
      } else {
        return;
      }

      const recordId = \`hik-\${teacherCode}-\${date}-\${sessionName}\`;
      if (existingIds.has(recordId)) return;

      const record = {
        id: recordId,
        teacherCode,
        date,
        time,
        sessionName,
        status,
        mode: 'hikvision',
        note: \`Dari mesin Hikvision: \${log.location || log.ip_address}\`,
      };
      newRecords.push(record);
      existingIds.add(recordId);
      added++;
    });

    if (added > 0) {
      mainData.attendanceRecords = [...existingRecords, ...newRecords];
      await dbPool.query(
        "INSERT INTO app_data (store_key, data) VALUES ('main_store', $1) ON CONFLICT (store_key) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP",
        [JSON.stringify(mainData)]
      );
      console.log(\`[CRON] Berhasil otomatis sinkronisasi \${added} data absensi guru/karyawan dari mesin.\`);
    }
  } catch (err) {
    console.error('Error in autoSyncGuruAttendanceToAppData:', err);
  }
}
`;

code = code.replace('async function sendDailyClassSummary() {', newFunc + '\nasync function sendDailyClassSummary() {');

// Update cron job to call it
const oldCron = "cron.schedule('*/5 * * * *', () => {\n  pullHikvisionLogs().catch(console.error);\n});";
const newCron = "cron.schedule('*/5 * * * *', async () => {\n  try {\n    await pullHikvisionLogs();\n    await autoSyncGuruAttendanceToAppData();\n  } catch (e) {\n    console.error(e);\n  }\n});";
code = code.replace(oldCron, newCron);

fs.writeFileSync('server/auth-server.mjs', code, 'utf8');
console.log('Successfully injected autoSyncGuruAttendanceToAppData');

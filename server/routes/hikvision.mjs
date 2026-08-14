import { encryptPassword, decryptPassword, HikvisionAPI } from '../hikvision-api.mjs';

export async function autoLinkHikvisionStudents(dbPool) {
  if (!dbPool) return;
  try {
    const studentsRes = await dbPool.query("SELECT payload FROM mst_students");
    const students = studentsRes.rows.map(r => r.payload);
    if (students.length === 0) return;

    const hikStudentsRes = await dbPool.query(`
      SELECT * FROM hikvision_students 
      WHERE class_name NOT IN ('guru', 'karyawan', 'staff') OR class_name IS NULL OR class_name = 'siswa'
    `);

    for (const h of hikStudentsRes.rows) {
      const hNis = String(h.nis || '').trim().toLowerCase();
      const hName = String(h.name || '').trim().toLowerCase();

      const matched = students.find(s => {
        const sNis = String(s.nis || s.code || s.id || '').trim().toLowerCase();
        const sName = String(s.name || s.nama || '').trim().toLowerCase();
        return (
          (sNis && hNis && sNis === hNis) ||
          (sName && hName && sName === hName) ||
          (hNis && sNis && hNis.length >= 5 && sNis.length >= 5 && (sNis.endsWith(hNis) || hNis.endsWith(sNis)))
        );
      });

      if (matched) {
        const fullNis = matched.nis || matched.code || matched.id;
        const className = matched.kelas || matched.class_name || h.class_name;

        if (h.nis !== fullNis || h.class_name !== className) {
          await dbPool.query(
            "UPDATE hikvision_students SET nis = $1, class_name = $2 WHERE id = $3",
            [fullNis, className, h.id]
          );
          await dbPool.query(
            "UPDATE hikvision_logs SET employee_id = $1 WHERE employee_id = $2",
            [fullNis, h.nis]
          );
        }
      }
    }
  } catch (e) {
    console.warn("autoLinkHikvisionStudents warning:", e.message);
  }
}

export async function handleHikvisionRoutes(req, res, url, ctx) {
  const { dbPool, send, sendDatabaseError, requireAuthenticated, requireAdmin, getSession, readJsonBody, readMainPayload, isMonitoringAdmin, isAdminRole } = ctx;


  async function getHikvisionConfig() {
    const defaultConf = {
      masuk_open: "05:00",
      masuk_late: "07:15",
      masuk_close: "11:00",
      pulang_open: "14:00",
      pulang_close: "18:00",
      siswa: { masuk_start: "05:00", masuk_late: "07:15", masuk_end: "11:00", pulang_start: "14:00", pulang_end: "18:00" },
      guru: { masuk_start: "05:00", masuk_late: "07:00", masuk_end: "11:00", pulang_start: "14:00", pulang_end: "18:00" },
      karyawan: { masuk_start: "05:00", masuk_late: "07:00", masuk_end: "11:00", pulang_start: "15:00", pulang_end: "18:00" },
      notify_role: "none",
      notify_custom_phone: ""
    };
    try {
      const res = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_attendance_config'");
      if (res.rowCount > 0 && res.rows[0].data) {
        return { ...defaultConf, ...(typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data) };
      }
    } catch (e) {
      console.error("Error getHikvisionConfig:", e);
    }
    return defaultConf;
  }

  const getRoleTimeConfig = (conf, role) => {
    const roleConf = conf[role] || {};
    const defaults = {
      siswa: { masuk_open: "05:00", masuk_late: "07:15", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "19:00" },
      guru: { masuk_open: "05:00", masuk_late: "07:00", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "19:00" },
      karyawan: { masuk_open: "05:00", masuk_late: "07:00", masuk_close: "11:00", pulang_open: "15:00", pulang_close: "19:00" }
    };
    const roleDefault = defaults[role] || defaults.siswa;

    const formatTime = (timeStr) => {
      if (!timeStr) return "";
      const parts = String(timeStr).split(":");
      const hh = parts[0].trim().padStart(2, '0');
      const mm = (parts[1] || "00").trim().padStart(2, '0');
      return `${hh}:${mm}`;
    };

    const masuk_open = formatTime(roleConf.masuk_start || roleConf.masuk_open || conf.masuk_open || roleDefault.masuk_open);
    const masuk_late = formatTime(roleConf.masuk_late || conf.masuk_late || roleDefault.masuk_late);
    const masuk_close = formatTime(roleConf.masuk_end || roleConf.masuk_close || conf.masuk_close || roleDefault.masuk_close);
    const pulang_open = formatTime(roleConf.pulang_start || roleConf.pulang_open || conf.pulang_open || roleDefault.pulang_open);
    const pulang_close = formatTime(roleConf.pulang_end || roleConf.pulang_close || conf.pulang_close || roleDefault.pulang_close);

    return { masuk_open, masuk_late, masuk_close, pulang_open, pulang_close };
  };
    if (req.method === "GET" && url.pathname === "/api/hikvision/dashboard") {
      if (!requireAuthenticated(req, res)) return;
      try {
        const devices = await dbPool.query(`
          SELECT d.*
          FROM hikvision_devices d
          ORDER BY d.device_type, d.location
        `);
        const hConfig = await getHikvisionConfig();
        const siswaMasukLate = (hConfig?.siswa?.masuk_late || "07:15") + ":00";
        const siswaMasukClose = (hConfig?.siswa?.masuk_end || hConfig?.siswa?.masuk_close || hConfig?.masuk_close || "08:00") + ":00";

        const guruMasukLate = (hConfig?.guru?.masuk_late || hConfig?.masuk_late || "07:00") + ":00";
        const guruMasukClose = (hConfig?.guru?.masuk_end || hConfig?.guru?.masuk_close || hConfig?.masuk_close || "08:00") + ":00";

        const karyawanMasukLate = (hConfig?.karyawan?.masuk_late || hConfig?.masuk_late || "07:00") + ":00";
        const karyawanMasukClose = (hConfig?.karyawan?.masuk_end || hConfig?.karyawan?.masuk_close || hConfig?.masuk_close || "08:00") + ":00";

        const recentLogsRes = await dbPool.query(`
          SELECT l.*, d.ip_address, d.device_type,
            COALESCE(
              hs.name,
              COALESCE(mst.payload->>'name', mst.payload->>'nama'),
              COALESCE(msf.payload->>'name', msf.payload->>'nama'),
              l.employee_id
            ) as student_name,
            COALESCE(
              hs.name,
              COALESCE(mst.payload->>'name', mst.payload->>'nama'),
              COALESCE(msf.payload->>'name', msf.payload->>'nama'),
              l.employee_id
            ) as name,
            COALESCE(
              hs.class_name,
              '-'
            ) as class_name,
            CASE 
              WHEN msf.id IS NOT NULL THEN 'karyawan'
              WHEN mst.id IS NOT NULL THEN 'guru'
              WHEN d.device_type = 'karyawan' THEN 'karyawan'
              WHEN d.device_type = 'guru' THEN 'guru'
              ELSE 'siswa'
            END as true_person_type
          FROM hikvision_logs l 
          JOIN hikvision_devices d ON l.device_id = d.id 
          LEFT JOIN hikvision_students hs ON hs.nis = l.employee_id
          LEFT JOIN mst_teachers mst ON mst.payload->>'code' = l.employee_id OR mst.payload->>'nip' = l.employee_id OR mst.id = l.employee_id
          LEFT JOIN mst_staffs msf ON msf.payload->>'staff_code' = l.employee_id OR msf.payload->>'code' = l.employee_id OR msf.id = l.employee_id
          ORDER BY l.timestamp DESC LIMIT 50
        `);

        const processedRecentLogs = recentLogsRes.rows.map(r => {
          const scanTime = new Date(r.timestamp).toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta' });
          const personType = String(r.true_person_type).toLowerCase();
          
          let lateLimit = siswaMasukLate;
          let closeLimit = siswaMasukClose;
          if (personType === 'karyawan') {
            lateLimit = karyawanMasukLate;
            closeLimit = karyawanMasukClose;
          } else if (personType === 'guru') {
            lateLimit = guruMasukLate;
            closeLimit = guruMasukClose;
          }

          let status = 'hadir';
          if (closeLimit && scanTime > closeLimit) {
            status = 'alpa';
          } else if (lateLimit && scanTime > lateLimit) {
            status = 'terlambat';
          }

          return {
            ...r,
            status,
            role_type: personType === 'karyawan' ? 'KARYAWAN' : (personType === 'guru' ? 'GURU' : 'SISWA')
          };
        });

        send(req, res, 200, { ok: true, devices: devices.rows, recentLogs: processedRecentLogs });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/hikvision/devices") {
      if (!requireAuthenticated(req, res)) return;
      try {
        const body = await readJsonBody(req);
        const { ip_address, location, username, encrypted_password, class_id, device_type } = body;
        const { encrypted, iv } = encryptPassword(encrypted_password);
        await dbPool.query(
          "INSERT INTO hikvision_devices (ip_address, location, username, encrypted_password, iv_vector, class_id, device_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)",
          [ip_address, location, username, encrypted, iv, class_id || null, device_type || 'siswa']
        );
        send(req, res, 200, { ok: true, message: "Perangkat berhasil ditambahkan" });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return;
    }
    if (req.method === "PUT" && url.pathname.startsWith("/api/hikvision/devices/")) {
      if (!requireAuthenticated(req, res)) return;
      try {
        const id = url.pathname.split("/").pop();
        const body = await readJsonBody(req);
        const { ip_address, location, username, encrypted_password, class_id, device_type } = body;
        
        // Fetch existing to check if password changed
        const existingRes = await dbPool.query("SELECT encrypted_password, iv_vector FROM hikvision_devices WHERE id = $1", [id]);
        let finalPass = encrypted_password;
        let finalIv = "";
        
        if (existingRes.rowCount > 0) {
          const existing = existingRes.rows[0];
          if (encrypted_password === existing.encrypted_password) {
            finalPass = existing.encrypted_password;
            finalIv = existing.iv_vector;
          } else {
            const { encrypted, iv } = encryptPassword(encrypted_password);
            finalPass = encrypted;
            finalIv = iv;
          }
        } else {
          const { encrypted, iv } = encryptPassword(encrypted_password);
          finalPass = encrypted;
          finalIv = iv;
        }

        await dbPool.query(
          "UPDATE hikvision_devices SET ip_address = $1, location = $2, username = $3, encrypted_password = $4, iv_vector = $5, class_id = $6, device_type = $7 WHERE id = $8",
          [ip_address, location, username, finalPass, finalIv, class_id || null, device_type || 'siswa', id]
        );
        send(req, res, 200, { ok: true, message: "Perangkat berhasil diupdate" });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return;
    }
    if (req.method === "DELETE" && url.pathname.startsWith("/api/hikvision/devices/")) {
      if (!requireAuthenticated(req, res)) return;
      try {
        const id = url.pathname.split("/").pop();
        await dbPool.query("DELETE FROM hikvision_devices WHERE id = $1", [id]);
        send(req, res, 200, { ok: true, message: "Perangkat berhasil dihapus" });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/hikvision/report") {
      if (!requireAuthenticated(req, res)) return;
      try {
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");
        const deviceId = url.searchParams.get("deviceId");
        const reportType = url.searchParams.get("type") || 'siswa'; // siswa | guru | karyawan

        const nameCoalesce = `COALESCE(
           (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_teachers WHERE payload->>'code' = l.employee_id OR id = l.employee_id OR payload->>'nip' = l.employee_id OR payload->>'id' = l.employee_id LIMIT 1),
           (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_staffs WHERE payload->>'staff_code' = l.employee_id OR payload->>'code' = l.employee_id OR id = l.employee_id LIMIT 1),
           s.name,
           l.employee_id
         ) as student_name, l.employee_id as nis`;

        let typeCondition = "";
        if (reportType === 'siswa') {
          typeCondition = "d.device_type = 'siswa'";
        } else if (reportType === 'karyawan') {
          typeCondition = "(EXISTS(SELECT 1 FROM mst_staffs WHERE payload->>'staff_code' = l.employee_id OR payload->>'code' = l.employee_id OR id = l.employee_id) OR d.device_type = 'karyawan')";
        } else if (reportType === 'guru') {
          typeCondition = "(EXISTS(SELECT 1 FROM mst_teachers WHERE payload->>'code' = l.employee_id OR id = l.employee_id OR payload->>'nip' = l.employee_id OR payload->>'id' = l.employee_id) OR (d.device_type = 'guru' AND NOT EXISTS(SELECT 1 FROM mst_staffs WHERE payload->>'staff_code' = l.employee_id OR payload->>'code' = l.employee_id OR id = l.employee_id)))";
        } else {
          typeCondition = "d.device_type IN ('guru', 'karyawan')";
        }

        let query = `
          SELECT l.id, l.timestamp, l.event_type, d.ip_address, d.location, d.device_type,
                 ${nameCoalesce}
          FROM hikvision_logs l
          JOIN hikvision_devices d ON l.device_id = d.id
          LEFT JOIN hikvision_students s ON l.employee_id = s.nis
          WHERE ${typeCondition}
        `;
        const params = [];
        let paramCount = 1;
        
        if (startDate) {
          query += ` AND l.timestamp >= $${paramCount++}`;
          params.push(startDate + ' 00:00:00');
        }
        if (endDate) {
          query += ` AND l.timestamp <= $${paramCount++}`;
          params.push(endDate + ' 23:59:59');
        }
        if (deviceId && deviceId !== "all") {
          query += ` AND l.device_id = $${paramCount++}`;
          params.push(deviceId);
        }
        
        query += " ORDER BY l.timestamp DESC LIMIT 10000";
        
        const { rows } = await dbPool.query(query, params);
        send(req, res, 200, { ok: true, logs: rows });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/hikvision/clear-test-logs") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!isAdminRole(session?.role)) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya admin." });
      try {
        await dbPool.query("DELETE FROM hikvision_logs");
        await dbPool.query("DELETE FROM guru_attendance_records");
        send(req, res, 200, { ok: true, message: "Seluruh log presensi uji coba berhasil dibersihkan!" });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/hikvision/sync-all") {
      if (!requireAuthenticated(req, res)) return;
      try {
        const conf = await getHikvisionConfig();
        const { rows: devices } = await dbPool.query("SELECT * FROM hikvision_devices");
        
        let usersSynced = 0;
        let logsSynced = 0;
        let attendanceProcessed = 0;
        const unmatchedIds = [];
        const syncResults = [];
        
        // 1. Ambil mst_teachers & mst_students (untuk cross check NIP/NIS)
        const teachersRes = await dbPool.query("SELECT id, payload FROM mst_teachers");
        const nipToCode = {};
        teachersRes.rows.forEach(r => {
          const t = r.payload;
          const code = t.code || r.id;
          if (r.id) nipToCode[String(r.id).trim().toLowerCase()] = code;
          if (t.code) nipToCode[String(t.code).trim().toLowerCase()] = code;
          if (t.nip) nipToCode[String(t.nip).trim().toLowerCase()] = code;
          if (t.id) nipToCode[String(t.id).trim().toLowerCase()] = code;
        });

        const studentsRes = await dbPool.query("SELECT payload FROM mst_students");
        const nisSet = new Set(studentsRes.rows.map(r => String(r.payload.nis || "").trim().toLowerCase()));

        // 2. Loop Semua Perangkat (Sync Wajah & Sync Log Mentah)
        for (const device of devices) {
          const dtype = device.device_type || 'siswa';
          try {
            const plainPassword = decryptPassword(device.encrypted_password, device.iv_vector);
            const api = new HikvisionAPI(device.ip_address, device.username, plainPassword);
            
            // Sync Wajah
            const users = await api.getUsers();
            if (users && users.length > 0) {
              for (const u of users) {
                const empNo = String(u.employeeNo || "").trim();
                const name = u.name;
                
                let dbGrpId = null;
                if (dtype === 'siswa' && u.groupId) {
                  const checkGrp = await dbPool.query("SELECT id FROM hikvision_groups WHERE device_id = $1 AND group_id = $2", [device.id, u.groupId]);
                  if (checkGrp.rows.length > 0) {
                    dbGrpId = checkGrp.rows[0].id;
                    await dbPool.query("UPDATE hikvision_groups SET group_name = $1 WHERE id = $2", [`Group ${u.groupId}`, dbGrpId]);
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
                
                usersSynced++;

                // Check mismatch
                if (dtype === 'guru' || dtype === 'karyawan') {
                  if (!nipToCode[empNo.toLowerCase()]) {
                    unmatchedIds.push({ device: device.location, type: dtype, id: empNo, name });
                  }
                } else if (dtype === 'siswa') {
                  if (empNo && !nisSet.has(empNo.toLowerCase())) {
                    unmatchedIds.push({ device: device.location, type: dtype, id: empNo, name });
                  }
                }
              }
            }

            // Sync Log
            const lastLogRes = await dbPool.query('SELECT MAX(timestamp) as last_ts FROM hikvision_logs WHERE device_id = $1', [device.id]);
            let startTime = new Date();
            if (lastLogRes.rows[0]?.last_ts) {
               startTime = new Date(new Date(lastLogRes.rows[0].last_ts).getTime() - 24 * 60 * 60 * 1000); // 24 hours lookback buffer
            } else {
               startTime.setDate(startTime.getDate() - 7); // Tarik 7 hari terakhir jika belum ada log
            }
            const endTime = new Date();
            const logs = await api.searchEvents(startTime, endTime);
            
            if (logs && logs.length > 0) {
              const validLogs = logs.filter(l => l.employeeNoString && (l.minor === 75 || l.minor === 38 || l.minor === 1 || l.minor === 104));
              const query = `INSERT INTO hikvision_logs (device_id, employee_id, timestamp, event_type, person_type, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) ON CONFLICT (device_id, employee_id, timestamp) DO NOTHING`;
              for (const l of validLogs) {
                const personType = (dtype === 'staff' || dtype === 'karyawan') ? 'karyawan' : (dtype === 'guru' ? 'guru' : 'siswa');
                const tsStr = (l.time || '').replace('T', ' ').substring(0, 19);
                await dbPool.query(query, [device.id, l.employeeNoString, tsStr, `${l.major}-${l.minor}`, personType]);
                logsSynced++;
              }
            }
            syncResults.push({ ip: device.ip_address, type: dtype, status: `Sukses (${users?.length || 0} pengguna, ${logs?.length || 0} log ditarik)` });
          } catch (deviceError) {
            console.error(`Gagal sinkronisasi ${device.ip_address}:`, deviceError.message);
            syncResults.push({ ip: device.ip_address, type: dtype, status: `Error: ${deviceError.message}` });
          }
        }

        // 3. Proses Log Mentah H-3 ke Data Rekap Absensi
        const logsRes = await dbPool.query(`
          SELECT l.employee_id, l.timestamp, d.ip_address, d.location, d.device_type
          FROM hikvision_logs l
          JOIN hikvision_devices d ON l.device_id = d.id
          WHERE l.timestamp >= NOW() - INTERVAL '3 days'
          ORDER BY l.timestamp ASC
        `);
        
        // Fetch existing kedisiplinan_absensi to avoid duplicate daily attendance
        const existingAbsensiRes = await dbPool.query(`
          SELECT siswa_nis, TO_CHAR(tanggal, 'YYYY-MM-DD') as date_str 
          FROM kedisiplinan_absensi 
          WHERE tanggal >= NOW() - INTERVAL '4 days'
        `);
        const existingStudentAbsensi = new Set();
        existingAbsensiRes.rows.forEach(r => {
          existingStudentAbsensi.add(`${r.siswa_nis}_${r.date_str}`);
        });

        // Arrays for tracking
        const recentTeacherAbsensiRes = await dbPool.query(`SELECT record_id FROM guru_attendance_records WHERE tanggal >= NOW() - INTERVAL '4 days'`);
        const existingTeacherIds = new Set(recentTeacherAbsensiRes.rows.map(r => r.record_id));
        const newTeacherRecords = [];
        const newStudentRecords = [];

        logsRes.rows.forEach(log => {
          const empId = String(log.employee_id || "").trim();
          const ts = new Date(log.timestamp);
          const date = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")}`;
          const time = ts.toTimeString().substring(0, 5);
          
          const dtype = log.device_type || 'siswa';
          const roleConf = getRoleTimeConfig(conf, dtype);

          let sessionName = "";
          let status = "";

          if (time >= roleConf.masuk_open && time <= roleConf.masuk_close) {
            sessionName = "Masuk Pagi";
            status = time > roleConf.masuk_late ? "Terlambat" : "Hadir";
          } else if (time >= roleConf.pulang_open && time <= roleConf.pulang_close) {
            sessionName = "Pulang Sore";
            status = "Hadir";
          } else {
            return; // Di luar jam absensi
          }

          if (dtype === 'guru' || dtype === 'karyawan') {
            const teacherCode = nipToCode[empId.toLowerCase()];
            if (!teacherCode) return;
            const recordId = `hik-${teacherCode}-${date}-${sessionName}`;
            if (existingTeacherIds.has(recordId)) return;
            
            newTeacherRecords.push({
              id: recordId, teacherCode, date, time, sessionName, status, mode: "hikvision", note: `Mesin: ${log.location}`
            });
            existingTeacherIds.add(recordId);
            attendanceProcessed++;
          } else if (dtype === 'siswa') {
            if (!nisSet.has(empId.toLowerCase())) return;
            const recordKey = `${empId}_${date}`;
            if (existingStudentAbsensi.has(recordKey)) return;

            newStudentRecords.push({
              siswa_nis: empId, 
              tanggal: date, 
              status, 
              keterangan: `Mesin: ${log.location} (${time})`,
              pelapor_nama: "Mesin Hikvision",
              approval_status: "otomatis"
            });
            existingStudentAbsensi.add(recordKey);
            attendanceProcessed++;
          }
        });

        // Simpan Data Rekap Guru ke guru_attendance_records
        if (newTeacherRecords.length > 0) {
          const values = [];
          const params = [];
          newTeacherRecords.forEach((rec, i) => {
            const offset = i * 8;
            values.push(`($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5}, $${offset+6}, $${offset+7}, $${offset+8})`);
            params.push(rec.id, rec.teacherCode, rec.date, rec.time, rec.sessionName, rec.status, rec.mode, rec.note);
          });
          await dbPool.query(
            `INSERT INTO guru_attendance_records (record_id, teacher_code, tanggal, waktu, session_name, status, mode, note) VALUES ${values.join(', ')} ON CONFLICT (record_id) DO NOTHING`,
            params
          );
        }

        // Simpan Data Siswa ke kedisiplinan_absensi
        if (newStudentRecords.length > 0) {
          const values = [];
          const params = [];
          newStudentRecords.forEach((rec, i) => {
            const offset = i * 6;
            values.push(`($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5}, $${offset+6})`);
            params.push(rec.siswa_nis, rec.tanggal, rec.status, rec.keterangan, rec.pelapor_nama, rec.approval_status);
          });
          const insertQuery = `
            INSERT INTO kedisiplinan_absensi 
            (siswa_nis, tanggal, status, keterangan, pelapor_nama, approval_status) 
            VALUES ${values.join(', ')}
          `;
          await dbPool.query(insertQuery, params);
        }

        send(req, res, 200, {
          ok: true,
          message: `Sinkronisasi Selesai!`,
          stats: { usersSynced, logsPulled: logsSynced, attendanceProcessed },
          unmatched: unmatchedIds.slice(0, 20),
          unmatchedCount: unmatchedIds.length,
          syncResults
        });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/hikvision/config") {
      if (!requireAuthenticated(req, res)) return;
      try {
        const conf = await getHikvisionConfig();
        send(req, res, 200, { ok: true, config: conf });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/hikvision/config") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!isAdminRole(session?.role)) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya admin." });
      try {
        const body = await readJsonBody(req);
        // Ensure we accept both legacy flat configs and new nested configs
        const { masuk_open, masuk_late, masuk_close, pulang_open, pulang_close, notify_role, notify_custom_phone, siswa, guru, karyawan } = body;
        
        // Merge with existing config or default to prevent losing data if only one is updated
        const existingConf = await getHikvisionConfig();
        const newConf = { 
          ...existingConf,
          masuk_open: masuk_open !== undefined ? masuk_open : existingConf.masuk_open,
          masuk_late: masuk_late !== undefined ? masuk_late : existingConf.masuk_late,
          masuk_close: masuk_close !== undefined ? masuk_close : existingConf.masuk_close,
          pulang_open: pulang_open !== undefined ? pulang_open : existingConf.pulang_open,
          pulang_close: pulang_close !== undefined ? pulang_close : existingConf.pulang_close,
          notify_role: notify_role !== undefined ? notify_role : existingConf.notify_role,
          notify_custom_phone: notify_custom_phone !== undefined ? notify_custom_phone : existingConf.notify_custom_phone,
          siswa: siswa ? { ...(existingConf.siswa || {}), ...siswa } : existingConf.siswa,
          guru: guru ? { ...(existingConf.guru || {}), ...guru } : existingConf.guru,
          karyawan: karyawan ? { ...(existingConf.karyawan || {}), ...karyawan } : existingConf.karyawan
        };

        await dbPool.query(
          "INSERT INTO app_data (store_key, data) VALUES ('hikvision_attendance_config', $1) ON CONFLICT (store_key) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP",
          [JSON.stringify(newConf)]
        );
        send(req, res, 200, { ok: true, message: "Pengaturan absensi Hikvision berhasil disimpan.", config: newConf });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/hikvision/manual-attendance") {
      if (!requireAuthenticated(req, res)) return;
      try {
        const body = await readJsonBody(req);
        const { teacherCode, date, status, note } = body; // status: Izin, Sakit, Dinas Luar, Alpa, Hadir
        
        if (!teacherCode || !date || !status) {
          send(req, res, 400, { ok: false, error: "Data tidak lengkap" });
          return;
        }

        // 1. Hapus record lama pada tanggal tersebut jika ada (agar tidak double/tumpang tindih)
        await dbPool.query("DELETE FROM guru_attendance_records WHERE teacher_code = $1 AND tanggal = $2", [teacherCode, date]);

        // Buat record ID unik
        const recordId = `hik-manual-${teacherCode}-${date}`;
        
        await dbPool.query(
          "INSERT INTO guru_attendance_records (record_id, teacher_code, tanggal, waktu, session_name, status, mode, note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          [recordId, teacherCode, date, new Date().toTimeString().substring(0, 5), 'Manual', status, 'manual', note || `Diinput manual oleh admin`]
        );

        // 2. WHATSAPP NOTIFIKASI
        // Ambil data guru yang bersangkutan
        const teacherRes = await dbPool.query("SELECT payload FROM mst_teachers WHERE id = $1", [teacherCode]);
        const teacher = teacherRes.rowCount > 0 ? teacherRes.rows[0].payload : null;
        
        if (teacher && (status === "Izin" || status === "Sakit")) {
          // Cari no WA tujuan
          let recipientPhone = String(teacher.notify_phone || "").replace(/\D/g, "");
          let recipientName = "Pengawas Absensi";

          if (!recipientPhone) {
            // Jika kosong, cari dari config global
            const conf = await getHikvisionConfig();
            const notifyRole = conf.notify_role || "none";
            
            if (notifyRole === "custom" && conf.notify_custom_phone) {
              recipientPhone = String(conf.notify_custom_phone).replace(/\D/g, "");
            } else if (notifyRole !== "none") {
              // Cari dari user list / teacher list
              let roleQuery = "";
              if (notifyRole === "kepsek") {
                roleQuery = "SELECT payload FROM mst_teachers WHERE payload->>'role' = 'kepsek' LIMIT 1";
              } else if (notifyRole === "waka_kurikulum") {
                roleQuery = "SELECT payload FROM mst_teachers WHERE payload->>'role' = 'waka' AND payload->>'division' = 'kurikulum' LIMIT 1";
              } else if (notifyRole === "waka_kesiswaan") {
                roleQuery = "SELECT payload FROM mst_teachers WHERE payload->>'role' = 'waka' AND payload->>'division' = 'kesiswaan' LIMIT 1";
              }

              if (roleQuery) {
                const roleRes = await dbPool.query(roleQuery);
                if (roleRes.rowCount > 0) {
                  const targetTeacher = roleRes.rows[0].payload;
                  recipientPhone = String(targetTeacher.phone || "").replace(/\D/g, "");
                  recipientName = targetTeacher.name || "Pihak Sekolah";
                }
              }
            }
          }

          // Format nomor penerima ke standar 62
          if (recipientPhone) {
            const phone = recipientPhone.startsWith("0") ? "62" + recipientPhone.slice(1) : recipientPhone;
            
            // Format isi pesan
            const message = `Pemberitahuan Kehadiran Guru:\n\nNama: ${teacher.name}\nKode Guru: ${teacherCode}\nStatus: ${status}\nTanggal: ${date}\nKeterangan: ${note || '-'}\n\nNotifikasi otomatis dari Sistem Absensi Sekolah.`;

            // Cari Fonnte API Key
            const keyRes = await dbPool.query("SELECT api_key FROM api_keys WHERE service_name = 'whatsapp_fonnte' AND is_active = true");
            if (keyRes.rowCount > 0) {
              const token = keyRes.rows[0].api_key;
              try {
                const fonnteRes = await fetch("https://api.fonnte.com/send", {
                  method: "POST",
                  headers: { "Authorization": token, "Content-Type": "application/json" },
                  body: JSON.stringify({ target: phone, message: message, countryCode: "62" })
                });
                const resData = await fonnteRes.json();
                
                // Simpan log WA
                const waStatus = (fonnteRes.ok && resData.status !== false) ? "sent" : "failed";
                await dbPool.query(
                  "INSERT INTO whatsapp_logs (phone, recipient_name, message, status, trigger_type, response_data) VALUES ($1,$2,$3,$4,$5,$6)",
                  [phone, recipientName, message, waStatus, "guru_izin_sakit", JSON.stringify(resData)]
                );
              } catch (e) {
                console.error("Gagal mengirim WA notifikasi guru:", e.message);
              }
            }
          }
        }

        send(req, res, 200, { ok: true, message: `Berhasil mencatat status ${status} guru ${teacherCode}.` });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/hikvision/students") {
      if (!requireAuthenticated(req, res)) return;
      try {
        const personType = url.searchParams.get("type") || "siswa"; // siswa | guru | karyawan | staff(guru+karyawan)
        
        let rows;
        if (personType === "siswa") {
          // Siswa: Gabungan data dari Mesin Hikvision & Master Data Siswa
          const result = await dbPool.query(`
            WITH hk_siswa AS (
              SELECT s.id::text as id, s.nis::text as nis, s.name as device_name,
                COALESCE(
                  (SELECT COALESCE(payload->>'nama', payload->>'name') FROM mst_students 
                   WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) LIMIT 1),
                  s.name
                ) as name,
                s.device_group_id::text as device_group_id, s.created_at::text as created_at,
                COALESCE(
                  NULLIF(NULLIF(s.class_name, 'siswa'), ''),
                  (SELECT COALESCE(payload->>'class_name', payload->>'kelas') FROM mst_students 
                   WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) LIMIT 1)
                ) as class_name,
                (SELECT COALESCE(payload->>'class_name', payload->>'kelas') FROM mst_students 
                 WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) LIMIT 1) as master_class_name,
                g.group_name, d.ip_address as device_ip,
                'siswa'::text as person_type,
                true as is_on_device,
                EXISTS(
                  SELECT 1 FROM mst_students 
                  WHERE payload->>'nis' = s.nis OR payload->>'code' = s.nis OR payload->>'nisn' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name))
                ) as is_connected
              FROM hikvision_students s
              LEFT JOIN hikvision_groups g ON s.device_group_id = g.id
              LEFT JOIN hikvision_devices d ON g.device_id = d.id
              WHERE LOWER(COALESCE(s.class_name, '')) NOT IN ('guru', 'karyawan', 'staff', 'employee')
                AND NOT EXISTS(SELECT 1 FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR payload->>'nip' = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)))
                AND NOT EXISTS(SELECT 1 FROM mst_staffs WHERE payload->>'staff_code' = s.nis OR payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)))
            ),
            master_siswa_missing AS (
              SELECT 
                null::text as id,
                COALESCE(st.payload->>'nis', st.payload->>'code', st.id)::text as nis,
                null as device_name,
                COALESCE(st.payload->>'nama', st.payload->>'name')::text as name,
                null::text as device_group_id,
                null::text as created_at,
                COALESCE(st.payload->>'class_name', st.payload->>'kelas')::text as class_name,
                COALESCE(st.payload->>'class_name', st.payload->>'kelas')::text as master_class_name,
                null as group_name,
                null as device_ip,
                'siswa'::text as person_type,
                false as is_on_device,
                false as is_connected
              FROM mst_students st
              WHERE NOT EXISTS(
                SELECT 1 FROM hk_siswa hs 
                WHERE hs.nis = st.id OR hs.nis = st.payload->>'nis' OR hs.nis = st.payload->>'code' OR hs.nis = st.payload->>'nisn' OR LOWER(TRIM(hs.name)) = LOWER(TRIM(COALESCE(st.payload->>'nama', st.payload->>'name')))
              )
            )
            SELECT * FROM hk_siswa
            UNION ALL
            SELECT * FROM master_siswa_missing
            ORDER BY class_name NULLS LAST, name ASC
          `);
          rows = result.rows;
        } else if (personType === "guru") {
          // Guru: Gabungan data dari Mesin Hikvision & Master Data Guru
          const result = await dbPool.query(`
            WITH hk_guru AS (
              SELECT s.nis, s.name as device_name,
                COALESCE(
                  (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)) LIMIT 1),
                  s.name
                ) as name,
                (SELECT payload->>'mapel' FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)) LIMIT 1) as mapel,
                (SELECT payload->>'nip' FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)) LIMIT 1) as nip,
                (SELECT payload->>'code' FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)) LIMIT 1) as code,
                'guru' as person_type,
                true as is_on_device,
                EXISTS(SELECT 1 FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name))) as is_connected
              FROM hikvision_students s
              WHERE (LOWER(COALESCE(s.class_name, '')) = 'guru' OR EXISTS(SELECT 1 FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name))))
            ),
            master_guru_missing AS (
              SELECT 
                COALESCE(t.payload->>'code', t.id) as nis,
                null as device_name,
                COALESCE(t.payload->>'name', t.payload->>'nama') as name,
                t.payload->>'mapel' as mapel,
                t.payload->>'nip' as nip,
                t.payload->>'code' as code,
                'guru' as person_type,
                false as is_on_device,
                false as is_connected
              FROM mst_teachers t
              WHERE NOT EXISTS(
                SELECT 1 FROM hk_guru h WHERE h.nis = t.id OR h.nis = t.payload->>'code' OR LOWER(TRIM(h.name)) = LOWER(TRIM(COALESCE(t.payload->>'name', t.payload->>'nama')))
              )
            )
            SELECT * FROM hk_guru
            UNION ALL
            SELECT * FROM master_guru_missing
            ORDER BY name ASC
          `);
          rows = result.rows;
        } else if (personType === "karyawan") {
          // Karyawan: Gabungan data dari Mesin Hikvision & Master Data Staf (eksklusif non-guru)
          const result = await dbPool.query(`
            WITH hk_karyawan AS (
              SELECT s.nis, s.name as device_name,
                COALESCE(
                  (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_staffs WHERE payload->>'staff_code' = s.nis OR payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)) LIMIT 1),
                  NULLIF(s.name, ''),
                  'ID Mesin ' || s.nis || ' (Tanpa Nama)'
                ) as name,
                (SELECT COALESCE(payload->>'division', payload->>'divisi', payload->>'role') FROM mst_staffs WHERE payload->>'staff_code' = s.nis OR payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)) LIMIT 1) as mapel,
                (SELECT payload->>'nip' FROM mst_staffs WHERE payload->>'staff_code' = s.nis OR payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)) LIMIT 1) as nip,
                (SELECT payload->>'code' FROM mst_staffs WHERE payload->>'staff_code' = s.nis OR payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)) LIMIT 1) as code,
                'karyawan' as person_type,
                true as is_on_device,
                EXISTS(SELECT 1 FROM mst_staffs WHERE payload->>'staff_code' = s.nis OR payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name))) as is_connected
              FROM hikvision_students s
              WHERE (
                LOWER(COALESCE(s.class_name, '')) IN ('karyawan', 'employee')
                OR EXISTS(SELECT 1 FROM mst_staffs WHERE payload->>'staff_code' = s.nis OR payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)))
                OR (LOWER(COALESCE(s.class_name, '')) = 'staff' AND NOT EXISTS(SELECT 1 FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name))))
              )
              AND NOT EXISTS(SELECT 1 FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR LOWER(TRIM(payload->>'name')) = LOWER(TRIM(s.name)) OR LOWER(TRIM(payload->>'nama')) = LOWER(TRIM(s.name)))
            ),
            master_karyawan_missing AS (
              SELECT 
                COALESCE(s.payload->>'staff_code', s.payload->>'code', s.id) as nis,
                null as device_name,
                COALESCE(s.payload->>'name', s.payload->>'nama') as name,
                COALESCE(s.payload->>'division', s.payload->>'divisi', s.payload->>'role') as mapel,
                s.payload->>'nip' as nip,
                s.payload->>'code' as code,
                'karyawan' as person_type,
                false as is_on_device,
                false as is_connected
              FROM mst_staffs s
              WHERE NOT EXISTS(
                SELECT 1 FROM hk_karyawan h WHERE h.nis = s.id OR h.nis = s.payload->>'staff_code' OR h.nis = s.payload->>'code' OR LOWER(TRIM(h.name)) = LOWER(TRIM(COALESCE(s.payload->>'name', s.payload->>'nama')))
              )
            )
            SELECT * FROM hk_karyawan
            UNION ALL
            SELECT * FROM master_karyawan_missing
            ORDER BY name ASC
          `);
          rows = result.rows;
        } else if (personType === "staff") {
          // Staff: Gabungan Guru + Karyawan
          const result = await dbPool.query(`
            SELECT s.nis, s.name as device_name,
              COALESCE(
                (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR payload->>'nip' = s.nis OR LOWER(payload->>'name') = LOWER(s.name) OR LOWER(payload->>'nama') = LOWER(s.name) LIMIT 1),
                (SELECT COALESCE(payload->>'name', payload->>'nama') FROM mst_staffs WHERE payload->>'staff_code' = s.nis OR payload->>'code' = s.nis OR id = s.nis OR LOWER(payload->>'name') = LOWER(s.name) OR LOWER(payload->>'nama') = LOWER(s.name) LIMIT 1),
                s.name
              ) as name,
              (SELECT payload->>'mapel' FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR payload->>'nip' = s.nis OR LOWER(payload->>'name') = LOWER(s.name) OR LOWER(payload->>'nama') = LOWER(s.name) LIMIT 1) as mapel,
              (SELECT payload->>'nip' FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR payload->>'nip' = s.nis OR LOWER(payload->>'name') = LOWER(s.name) OR LOWER(payload->>'nama') = LOWER(s.name) LIMIT 1) as nip,
              (SELECT payload->>'code' FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR payload->>'nip' = s.nis OR LOWER(payload->>'name') = LOWER(s.name) OR LOWER(payload->>'nama') = LOWER(s.name) LIMIT 1) as code,
              CASE 
                WHEN EXISTS(SELECT 1 FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR payload->>'nip' = s.nis OR LOWER(payload->>'name') = LOWER(s.name) OR LOWER(payload->>'nama') = LOWER(s.name)) THEN 'guru'
                ELSE 'karyawan'
              END as person_type,
              true as is_on_device,
              (
                EXISTS(SELECT 1 FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR payload->>'nip' = s.nis OR LOWER(payload->>'name') = LOWER(s.name) OR LOWER(payload->>'nama') = LOWER(s.name)) OR
                EXISTS(SELECT 1 FROM mst_staffs WHERE payload->>'staff_code' = s.nis OR payload->>'code' = s.nis OR id = s.nis OR LOWER(payload->>'name') = LOWER(s.name) OR LOWER(payload->>'nama') = LOWER(s.name))
              ) as is_connected
            FROM hikvision_students s
            WHERE LOWER(COALESCE(s.class_name, '')) IN ('guru', 'karyawan', 'staff', 'employee')
               OR EXISTS(SELECT 1 FROM mst_teachers WHERE payload->>'code' = s.nis OR id = s.nis OR payload->>'nip' = s.nis OR LOWER(payload->>'name') = LOWER(s.name) OR LOWER(payload->>'nama') = LOWER(s.name))
               OR EXISTS(SELECT 1 FROM mst_staffs WHERE payload->>'staff_code' = s.nis OR payload->>'code' = s.nis OR id = s.nis OR LOWER(payload->>'name') = LOWER(s.name) OR LOWER(payload->>'nama') = LOWER(s.name))
            ORDER BY s.class_name NULLS LAST, s.name ASC
          `);
          rows = result.rows;
        } else {
          rows = [];
        }
        send(req, res, 200, { ok: true, data: rows });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/hikvision/sync-classes-from-master") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!isAdminRole(session?.role)) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya admin." });
      try {
        const updateResult = await dbPool.query(`
          UPDATE hikvision_students s
          SET class_name = sub.master_class
          FROM (
            SELECT s2.id, COALESCE(payload->>'class_name', payload->>'kelas') as master_class
            FROM hikvision_students s2
            JOIN mst_students m ON (m.payload->>'nis' = s2.nis OR m.payload->>'code' = s2.nis OR m.payload->>'nisn' = s2.nis OR m.id = s2.nis OR LOWER(m.payload->>'nama') = LOWER(s2.name) OR LOWER(m.payload->>'name') = LOWER(s2.name))
            WHERE LOWER(COALESCE(s2.class_name, '')) NOT IN ('guru', 'karyawan', 'staff', 'employee')
          ) sub
          WHERE s.id = sub.id AND sub.master_class IS NOT NULL;
        `);
        send(req, res, 200, { ok: true, message: `Berhasil menyinkronkan ${updateResult.rowCount} kelas siswa dari Master Data!`, count: updateResult.rowCount });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }

    if (req.method === "PUT" && url.pathname === "/api/hikvision/students/bulk") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!isAdminRole(session?.role)) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya admin." });
      try {
        const body = await readJsonBody(req);
        const updates = body.updates || [];
        const pushToDevice = body.pushToDevice !== false; // default: true

        // 1. Update local database
        await dbPool.query('BEGIN');
        for (const update of updates) {
          await dbPool.query(
            "UPDATE hikvision_students SET class_name = $1 WHERE nis = $2",
            [update.class_name, update.nis]
          );
        }
        await dbPool.query('COMMIT');

        // 2. Push to physical Hikvision devices (best-effort, non-blocking)
        // Fitur dimatikan sesuai request user.
        
        const deviceMsg = '';

        send(req, res, 200, {
          ok: true,
          message: `Berhasil memperbarui pemetaan ${updates.length} siswa secara massal${deviceMsg}.`
        });
      } catch (err) {
        await dbPool.query('ROLLBACK').catch(() => {});
        sendDatabaseError(req, res, err);
      }
      return;
    }
    if (req.method === "PUT" && url.pathname.startsWith("/api/hikvision/students/") && url.pathname !== "/api/hikvision/students/bulk") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!isAdminRole(session?.role)) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya admin." });
      try {
        const nis = url.pathname.split("/").pop();
        const body = await readJsonBody(req);
        const className = body.class_name || null;
        await dbPool.query(
          "UPDATE hikvision_students SET class_name = $1 WHERE nis = $2",
          [className, nis]
        );
        send(req, res, 200, { ok: true, message: "Berhasil memperbarui pemetaan kelas." });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/hikvision/report/matrix") {
      if (!requireAuthenticated(req, res)) return;
      try {
        const body = await readJsonBody(req);
        const month = parseInt(body.month) || new Date().getMonth() + 1;
        const year = parseInt(body.year) || new Date().getFullYear();
        const className = body.class_name || 'all';
        const reportType = body.type || 'siswa'; // siswa | guru | karyawan | staff

        let studentsQueryStr = "";
        let queryParams = [month, year];
        let classFilter = "";

        if (reportType === 'siswa') {
          studentsQueryStr = `
            WITH all_students AS (
              SELECT 
                COALESCE(payload->>'nis', payload->>'code', id) as nis,
                COALESCE(payload->>'name', payload->>'nama', id) as name,
                COALESCE(payload->>'nis', payload->>'code', id) as canon_nis,
                COALESCE(payload->>'kelas', payload->>'class_name') as class_name
              FROM mst_students
              UNION ALL
              SELECT 
                h.nis,
                h.name,
                h.nis as canon_nis,
                h.class_name
              FROM hikvision_students h
              WHERE h.class_name NOT IN ('guru', 'karyawan', 'staff')
                AND NOT EXISTS (
                  SELECT 1 FROM mst_students m 
                  WHERE m.payload->>'nis' = h.nis 
                     OR m.payload->>'code' = h.nis 
                     OR m.id = h.nis
                     OR LOWER(TRIM(COALESCE(m.payload->>'name', m.payload->>'nama'))) = LOWER(TRIM(h.name))
                )
                AND NOT EXISTS (SELECT 1 FROM mst_teachers t WHERE t.payload->>'code' = h.nis OR t.payload->>'nip' = h.nis OR t.id = h.nis OR LOWER(t.payload->>'nama') = LOWER(h.name) OR LOWER(t.payload->>'name') = LOWER(h.name))
                AND NOT EXISTS (SELECT 1 FROM mst_staffs st WHERE st.payload->>'staff_code' = h.nis OR st.payload->>'code' = h.nis OR st.id = h.nis OR LOWER(st.payload->>'nama') = LOWER(h.name) OR LOWER(st.payload->>'name') = LOWER(h.name))
            )
            SELECT * FROM all_students
          `;
          if (className !== 'all') {
            studentsQueryStr += " WHERE class_name = $1";
          }
        } else {
          // Guru / Karyawan / Staff
          if (reportType === 'guru') {
            studentsQueryStr = `
              SELECT 
                COALESCE(payload->>'code', payload->>'nip', id) as nis, 
                'guru' as class_name, 
                COALESCE(payload->>'name', payload->>'nama', id) as name 
              FROM mst_teachers
            `;
          } else if (reportType === 'karyawan') {
            studentsQueryStr = `
              SELECT 
                COALESCE(payload->>'staff_code', payload->>'code', payload->>'nip', id) as nis, 
                'karyawan' as class_name, 
                COALESCE(payload->>'name', payload->>'nama', id) as name 
              FROM mst_staffs
            `;
          } else {
            studentsQueryStr = `
              SELECT COALESCE(payload->>'code', payload->>'nip', id) as nis, 'guru' as class_name, COALESCE(payload->>'name', payload->>'nama', id) as name FROM mst_teachers
              UNION ALL
              SELECT COALESCE(payload->>'staff_code', id) as nis, 'karyawan' as class_name, COALESCE(payload->>'name', payload->>'nama', id) as name FROM mst_staffs
            `;
          }
        }

        const studentsQuery = await dbPool.query(studentsQueryStr, (reportType === 'siswa' && className !== 'all') ? [className] : []);
        
        let logsQueryStr = `
          SELECT l.employee_id, TO_CHAR(l.timestamp, 'YYYY-MM-DD HH24:MI:SS') as time_str, l.event_type
          FROM hikvision_logs l
          WHERE EXTRACT(MONTH FROM l.timestamp) = $1 AND EXTRACT(YEAR FROM l.timestamp) = $2
          ORDER BY l.timestamp ASC
        `;

        const logsQuery = await dbPool.query(logsQueryStr, [month, year]);

        // Process matrix in memory
        const daysInMonth = new Date(year, month, 0).getDate();
        const matrix = {};
        const employeeToNisMap = {};
        
        // Initialize with all students/teachers
        studentsQuery.rows.forEach(s => {
            matrix[s.nis] = {
                nis: s.canon_nis || s.nis,
                name: s.name,
                class_name: s.class_name,
                total_hadir: 0,
                total_terlambat: 0,
                total_izin: 0,
                total_sakit: 0,
                total_alpa: 0,
                days: {}
            };
            employeeToNisMap[String(s.nis).toLowerCase()] = s.nis;
            if (s.name) employeeToNisMap[String(s.name).trim().toLowerCase()] = s.nis;
        });

        try {
          const hikStudentsRes = await dbPool.query("SELECT nis, name FROM hikvision_students");
          hikStudentsRes.rows.forEach(h => {
            const hNis = String(h.nis || '').trim().toLowerCase();
            const hName = String(h.name || '').trim().toLowerCase();
            const matchedNis = Object.keys(matrix).find(mNis => {
              const mStud = matrix[mNis];
              const mName = String(mStud.name || '').trim().toLowerCase();
              const mNisStr = String(mNis).toLowerCase();
              return (mName && hName && mName === hName) || mNisStr === hNis;
            });
            if (matchedNis) {
              employeeToNisMap[hNis] = matchedNis;
            }
          });
        } catch (e) {
          console.warn("Failed to build hikvision_students mapping:", e.message);
        }

        const conf = await getHikvisionConfig();
        
        logsQuery.rows.forEach(log => {
            const rawEmpId = String(log.employee_id || '').trim().toLowerCase();
            const nis = employeeToNisMap[rawEmpId] || log.employee_id;
            // Skip processing for logs that do not belong to the queried group
            if (!matrix[nis]) return;
            
            // Resolve timing config dynamically based on true user type from our masters
            let logRole = "siswa";
            if (matrix[nis].class_name === "guru" || matrix[nis].class_name === "teacher") {
              logRole = "guru";
            } else if (matrix[nis].class_name === "karyawan" || matrix[nis].class_name === "staff") {
              logRole = "karyawan";
            } else if (reportType === "guru") {
              logRole = "guru";
            } else if (reportType === "karyawan" || reportType === "staff") {
              logRole = "karyawan";
            }

            const roleConf = getRoleTimeConfig(conf, logRole);
            const masukOpen = roleConf.masuk_open + ":00";
            const masukLate = roleConf.masuk_late + ":00";
            const masukClose = roleConf.masuk_close + ":00";
            const pulangOpen = roleConf.pulang_open + ":00";
            const pulangClose = roleConf.pulang_close + ":00";
            
            const day = parseInt(log.time_str.substring(8, 10), 10);
            const timeStr = log.time_str.substring(11, 19); // "HH:MM:SS"
            
            if (!matrix[nis].days[day]) {
                 matrix[nis].days[day] = { in: null, out: null, isLate: false };
            }
            
            if (!matrix[nis].days[day].taps) matrix[nis].days[day].taps = [];
            if (!matrix[nis].days[day].taps.includes(timeStr)) {
                matrix[nis].days[day].taps.push(timeStr);
                matrix[nis].days[day].taps.sort();
            }

            // Categorize taps into morning (Masuk: < 12:00) and afternoon/evening (Pulang: >= 12:00)
            const cutoff = "12:00:00";
            const morningTaps = matrix[nis].days[day].taps.filter(t => t < cutoff);
            const afternoonTaps = matrix[nis].days[day].taps.filter(t => t >= cutoff);

            matrix[nis].days[day].in = morningTaps.length > 0 ? morningTaps[0] : null;
            if (morningTaps.length > 0) {
                matrix[nis].days[day].isLate = morningTaps[0] > masukLate;
            }

            matrix[nis].days[day].out = afternoonTaps.length > 0 ? afternoonTaps[afternoonTaps.length - 1] : null;
        });

        // Ambil guru_attendance_records (manual & hikvision sync)
        const attendanceRes = await dbPool.query(`
          SELECT teacher_code as "teacherCode", TO_CHAR(tanggal, 'YYYY-MM-DD') as "date", waktu::text as "time", session_name as "sessionName", status, note 
          FROM guru_attendance_records 
          WHERE EXTRACT(MONTH FROM tanggal) = $1 AND EXTRACT(YEAR FROM tanggal) = $2
        `, [month, year]);
        const attendanceRecords = attendanceRes.rows;

        // Build teacher code/nip mapping
        const teachersRes = await dbPool.query("SELECT id, payload FROM mst_teachers");
        const codeToNis = {};
        teachersRes.rows.forEach(r => {
          const t = r.payload;
          const code = (t.code || r.id).toLowerCase();
          const matched = studentsQuery.rows.find(s => 
            s.nis.toLowerCase() === code ||
            s.nis.toLowerCase() === String(t.nip || '').trim().toLowerCase() ||
            s.nis.toLowerCase() === String(t.id || '').trim().toLowerCase()
          );
          if (matched) {
            codeToNis[code] = matched.nis;
            if (t.nip) codeToNis[String(t.nip).trim().toLowerCase()] = matched.nis;
          }
        });

        // Overlay manual attendance records
        attendanceRecords.forEach(rec => {
          const recDate = new Date(rec.date);
          if (isNaN(recDate.getTime())) return;
          const recMonth = recDate.getMonth() + 1;
          const recYear = recDate.getFullYear();
          if (recMonth !== month || recYear !== year) return;

          const matchedNis = codeToNis[rec.teacherCode.toLowerCase()] || rec.teacherCode;
          if (matrix[matchedNis]) {
            const day = recDate.getDate();
            const status = rec.status;
            
            if (["Izin", "Sakit", "Dinas Luar", "Alpa"].includes(status)) {
              matrix[matchedNis].days[day] = {
                in: status,
                out: status,
                isLate: false,
                isManual: true,
                status: status,
                note: rec.note
              };
            } else if (["Hadir", "Terlambat"].includes(status)) {
              if (!matrix[matchedNis].days[day] || typeof matrix[matchedNis].days[day] !== 'object') {
                matrix[matchedNis].days[day] = { in: null, out: null, isLate: false };
              }
              const recTime = rec.time || "07:00";
              const isPulang = (rec.sessionName && rec.sessionName.toLowerCase().includes('pulang')) || recTime >= "12:00";
              
              if (isPulang) {
                matrix[matchedNis].days[day].out = recTime;
              } else {
                matrix[matchedNis].days[day].in = recTime;
                if (status === "Terlambat") matrix[matchedNis].days[day].isLate = true;
              }
            }
          }
        });

        if (reportType === 'siswa') {
          const sAbsRes = await dbPool.query(`
            SELECT id, siswa_nis, tanggal, status, keterangan, gdrive_url, approval_status
            FROM kedisiplinan_absensi 
            WHERE EXTRACT(MONTH FROM tanggal) = $1 AND EXTRACT(YEAR FROM tanggal) = $2
            AND (approval_status = 'approved' OR approval_status IS NULL OR approval_status = 'pending')
          `, [month, year]);

          sAbsRes.rows.forEach(rec => {
            const recNis = String(rec.siswa_nis || '').trim();
            const targetKey = Object.keys(matrix).find(k => {
              const kStr = String(k || '').trim();
              const canonNis = String(matrix[k]?.nis || '').trim();
              const rNis = recNis.toLowerCase();
              const kLower = kStr.toLowerCase();
              const cLower = canonNis.toLowerCase();
              return kLower === rNis || cLower === rNis || (rNis.length >= 5 && kLower.length >= 5 && (kLower.endsWith(rNis) || rNis.endsWith(kLower))) || (rNis.length >= 5 && cLower.length >= 5 && (cLower.endsWith(rNis) || rNis.endsWith(cLower)));
            });
            if (targetKey && matrix[targetKey]) {
              const recDate = new Date(rec.tanggal);
              const day = recDate.getDate();
              const status = rec.status;
              const isLate = status === "Terlambat";
              
              if (rec.approval_status === 'pending') {
                 if (!matrix[targetKey].days[day]) matrix[targetKey].days[day] = {};
                 matrix[targetKey].days[day].pending_permission = {
                    id: rec.id,
                    status: rec.status,
                    keterangan: rec.keterangan,
                    gdrive_url: rec.gdrive_url,
                    approval_status: rec.approval_status
                 };
              } else {
                 const existingPending = matrix[targetKey].days[day]?.pending_permission;
                 matrix[targetKey].days[day] = {
                   in: isLate ? (rec.keterangan || "Terlambat") : status,
                   out: isLate ? null : status,
                   isLate: isLate,
                   isManual: true,
                   status: status,
                   note: rec.keterangan,
                   gdrive_url: rec.gdrive_url,
                   id: rec.id,
                   approval_status: rec.approval_status
                 };
                 if (existingPending) {
                     matrix[targetKey].days[day].pending_permission = existingPending;
                 }
              }
            }
          });
        }

        // Get academic calendar lists from mainData
        const msR = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store'");
        const mainData = msR.rows.length > 0 ? JSON.parse(msR.rows[0].data || '{}') : {};
        const academicCalendar = mainData.academicCalendar || [];
        const calendarCategories = mainData.calendarCategories || [];

        // Function to check if YYYY-MM-DD is holiday or weekend
        const isHolidayOrWeekend = (dateStr, personItem) => {
          const d = new Date(dateStr);
          const day = d.getDay();
          if (day === 0 || day === 6) return true; // Saturday & Sunday are weekends
          
          let personGrade = "";
          let personRole = "siswa";
          
          if (personItem) {
            const cn = String(personItem.class_name || "").toUpperCase();
            if (cn === "GURU") { personRole = "guru"; }
            else if (cn === "KARYAWAN" || cn === "STAFF") { personRole = "karyawan"; }
            else {
              if (cn.startsWith("X ")) personGrade = "X";
              else if (cn.startsWith("XI ")) personGrade = "XI";
              else if (cn.startsWith("XII ")) personGrade = "XII";
            }
          }
          
          const matchedEvent = academicCalendar.find(evt => {
            const start = evt.dateStart;
            const end = evt.dateEnd || evt.dateStart;
            if (dateStr >= start && dateStr <= end) {
              const isEventHoliday = evt.isHoliday === true || evt.isHoliday === "true";
              const targetClasses = String(evt.applicableClasses || "Semua").toUpperCase();
              
              if (isEventHoliday) {
                if (targetClasses === "SEMUA" || targetClasses === "ALL") return true;
                if (personGrade && targetClasses.split(',').map(g=>g.trim()).includes(personGrade)) return true;
              }
              
              // Fallback to legacy check if isHoliday is not set
              if (evt.isHoliday === undefined) {
                const cat = calendarCategories.find(c => c.id === evt.categoryId);
                const catName = cat ? String(cat.name).toLowerCase() : "";
                const title = String(evt.title).toLowerCase();
                return catName.includes("libur") || title.includes("libur");
              }
            }
            return false;
          });
          return !!matchedEvent;
        };

        // Determine current date in Jakarta/WIB timezone
        const todayStr = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const currentTime = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(11, 19);

        const systemStartDate = conf.system_start_date || mainData.system_start_date || "";

        // Fetch PKL eligible class setting, PKL logbooks, and PKL placement data
        const pklRes = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'pkl_settings'").catch(() => ({ rows: [] }));
        const pklSettings = pklRes.rows?.length > 0 ? JSON.parse(pklRes.rows[0].data) : { eligibleClass: "XII" };
        const eligiblePklClass = String(pklSettings.eligibleClass || "XII").toUpperCase();

        const pklPlacedRes = await dbPool.query(`
          SELECT DISTINCT nis FROM pkl_students 
          WHERE location_id IS NOT NULL OR teacher_code IS NOT NULL
        `).catch(() => ({ rows: [] }));
        const pklPlacedSet = new Set(pklPlacedRes.rows.map(r => String(r.nis).trim().toLowerCase()));

        const pklLogbooksRes = await dbPool.query(`
          SELECT student_nis, TO_CHAR(tanggal, 'YYYY-MM-DD') as date_str, status, kegiatan as activity
          FROM pkl_logbooks
          WHERE EXTRACT(MONTH FROM tanggal) = $1 AND EXTRACT(YEAR FROM tanggal) = $2
        `, [month, year]).catch(() => ({ rows: [] }));

        const pklLogbookMap = {};
        const pklLogbookStudentsSet = new Set();
        pklLogbooksRes.rows.forEach(r => {
          const nisKey = String(r.student_nis || '').trim();
          const dayNum = parseInt(r.date_str.substring(8, 10), 10);
          pklLogbookMap[`${nisKey}_${dayNum}`] = r.status || 'Hadir';
          pklLogbookStudentsSet.add(nisKey.toLowerCase());
        });

        // Auto-generate Alpa or PKL status for past/expired active days
        Object.values(matrix).forEach(item => {
          const isEligibleClass = reportType === 'siswa' && 
            eligiblePklClass && 
            String(item.class_name || '').toUpperCase().startsWith(eligiblePklClass);

          const nisKey = String(item.nis || '').trim().toLowerCase();
          const canonKey = String(item.canon_nis || '').trim().toLowerCase();
          const isPlacedInPkl = pklPlacedSet.has(nisKey) || pklPlacedSet.has(canonKey) || pklLogbookStudentsSet.has(nisKey) || pklLogbookStudentsSet.has(canonKey);

          const isPklStudent = isEligibleClass && (pklPlacedSet.size > 0 ? isPlacedInPkl : true);

          for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // Skip dates prior to official system start date (e.g. testing phase)
            if (systemStartDate && dateStr < systemStartDate) continue;

            // Skip future days
            if (dateStr > todayStr) continue;

            // If it is today, only mark Alpa/PKL if we are past the late/close time limit (default: masukClose)
            if (dateStr === todayStr) {
              let logRole = reportType || "siswa";
              if (item.class_name === "guru" || item.class_name === "teacher") {
                logRole = "guru";
              } else if (item.class_name === "karyawan" || item.class_name === "staff") {
                logRole = "karyawan";
              }
              const roleConf = getRoleTimeConfig(conf, logRole);
              const limit = (roleConf.masuk_close || "11:00") + ":00";
              if (currentTime <= limit) continue; // Still within check-in window
            }

            // Skip weekends & academic calendar holidays
            if (isHolidayOrWeekend(dateStr, item)) continue;

            // If no fingerprint record exists for this day:
            const dayData = item.days[day];
            const hasRecord = dayData && (dayData.in || dayData.out || dayData.status || (Array.isArray(dayData.taps) && dayData.taps.length > 0));
            if (!hasRecord) {
              if (isPklStudent) {
                const pklLogStatus = pklLogbookMap[`${item.nis}_${day}`] || pklLogbookMap[`${String(item.nis).trim()}_${day}`];
                const finalPklStatus = pklLogStatus === 'approved' || pklLogStatus === 'Hadir' ? 'PKL (Hadir)' : (pklLogStatus || 'PKL');
                item.days[day] = {
                  in: finalPklStatus,
                  out: finalPklStatus,
                  isLate: false,
                  isPkl: true,
                  status: finalPklStatus,
                  note: "Peserta PKL (Bebas Absen Fingerprint)"
                };
              } else {
                item.days[day] = {
                  in: "Alpa",
                  out: "Alpa",
                  isLate: false,
                  isManual: true,
                  status: "Alpa",
                  note: "Alpa Otomatis (Tidak Absen)"
                };
              }
            }
          }
        });

        // Recount lates and presence properly
        Object.values(matrix).forEach(item => {
            let totalHadir = 0;
            let totalTerlambat = 0;
            let totalIzin = 0;
            let totalSakit = 0;
            let totalAlpa = 0;
            let totalPkl = 0;

            Object.values(item.days).forEach(dayData => {
                if (dayData.status) {
                  if (dayData.status === "Izin") totalIzin++;
                  else if (dayData.status === "Sakit") totalSakit++;
                  else if (dayData.status === "Alpa") totalAlpa++;
                  else if (dayData.status === "PKL" || String(dayData.status).startsWith("PKL")) {
                    totalPkl++;
                    totalHadir++;
                  } else if (dayData.status === "Hadir" || dayData.status === "Terlambat") {
                    totalHadir++;
                    if (dayData.status === "Terlambat") totalTerlambat++;
                  }
                } else if (dayData.in || dayData.out) {
                    totalHadir++;
                    if (dayData.isLate) {
                        totalTerlambat++;
                    }
                }
            });

            item.total_hadir = totalHadir;
            item.total_terlambat = totalTerlambat;
            item.total_izin = totalIzin;
            item.total_sakit = totalSakit;
            item.total_alpa = totalAlpa;
            item.total_pkl = totalPkl;
        });

        send(req, res, 200, { 
            ok: true, 
            month, 
            year, 
            daysInMonth,
            data: Object.values(matrix).sort((a,b) => a.name.localeCompare(b.name))
        });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }

  return false;
}

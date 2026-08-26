export async function handleDataRoutes(req, res, url, ctx) {
  const {
    dbPool,
    send,
    sendDatabaseError,
    requireAuthenticated,
    getSession,
    readJsonBody,
    readMainPayload,
    createDatabaseUnavailableError,
    syncAllUsersToModules,
    toPublicPayload,
    sanitizePayload,
    logAudit
  } = ctx;

  if (req.method === "GET" && url.pathname === "/api/data/public") {
    try {
      const payload = await readMainPayload();
      
      // Merge with relational tables
      try {
        const [majors, classes, rooms, teachers, subjects, students] = await Promise.all([
          dbPool.query('SELECT payload FROM mst_majors'),
          dbPool.query('SELECT payload FROM mst_classes'),
          dbPool.query('SELECT payload FROM mst_rooms'),
          dbPool.query('SELECT payload FROM mst_teachers'),
          dbPool.query('SELECT payload FROM mst_subjects'),
          dbPool.query('SELECT payload FROM mst_students')
        ]);
        if (majors.rows.length > 0) payload.majors = majors.rows.map(r => r.payload);
        if (classes.rows.length > 0) payload.classes = classes.rows.map(r => r.payload);
        if (rooms.rows.length > 0) payload.rooms = rooms.rows.map(r => r.payload);
        if (teachers.rows.length > 0) payload.teachers = teachers.rows.map(r => r.payload);
        if (subjects.rows.length > 0) payload.subjects = subjects.rows.map(r => r.payload);
        if (students.rows.length > 0) payload.students = students.rows.map(r => r.payload);
      } catch (e) {
        console.warn("Failed to merge relational tables on load", e);
      }

      console.log("Sending payload for /api/data/public");
      send(req, res, 200, { ok: true, payload: payload ? toPublicPayload(payload) : null });
    } catch (err) {
      console.error("Load Data Error:", err);
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/data/load") {
    if (!requireAuthenticated(req, res)) return true;
    try {
      const payload = await readMainPayload();

      // Merge with relational tables
      try {
        const [majors, classes, rooms, teachers, subjects, students, staffs] = await Promise.all([
          dbPool.query('SELECT payload FROM mst_majors'),
          dbPool.query('SELECT payload FROM mst_classes'),
          dbPool.query('SELECT payload FROM mst_rooms'),
          dbPool.query('SELECT payload FROM mst_teachers'),
          dbPool.query('SELECT payload FROM mst_subjects'),
          dbPool.query('SELECT payload FROM mst_students'),
          dbPool.query('SELECT payload FROM mst_staffs')
        ]);
        if (majors.rows.length > 0) payload.majors = majors.rows.map(r => r.payload);
        if (classes.rows.length > 0) payload.classes = classes.rows.map(r => r.payload);
        if (rooms.rows.length > 0) payload.rooms = rooms.rows.map(r => r.payload);
        if (teachers.rows.length > 0) payload.teachers = teachers.rows.map(r => r.payload);
        if (subjects.rows.length > 0) payload.subjects = subjects.rows.map(r => r.payload);
        if (students.rows.length > 0) payload.students = students.rows.map(r => r.payload);
        if (staffs.rows.length > 0) payload.staffs = staffs.rows.map(r => r.payload);
      } catch (e) {
        console.warn("Failed to merge relational tables on load", e);
      }

      send(req, res, 200, { ok: true, payload: payload ? sanitizePayload(payload) : null });
    } catch (err) {
      console.error("Load Data Error:", err);
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/data/save") {
    if (!requireAuthenticated(req, res)) return true;
    try {
      if (!dbPool) throw createDatabaseUnavailableError();
      const body = await readJsonBody(req);
      const payload = body.payload || {};
      
      // Preserve passwords and check if payload has actually changed
      let fullExistingPayload = null;
      try {
        const existingPayload = await readMainPayload();
        if (existingPayload) {
          // Restore admin password if not updated
          if (payload.adminUser) {
            payload.adminUser.password = payload.adminUser.password || existingPayload.adminUser?.password;
          } else if (existingPayload.adminUser) {
            payload.adminUser = existingPayload.adminUser;
          }
        }

        // Fetch passwords and current tables to get up-to-date snapshot for password restore and change detection
        const [dbTeachers, dbStaffs, dbStudents, dbMajors, dbClasses, dbRooms, dbSubjects] = await Promise.all([
          dbPool.query("SELECT id, payload FROM mst_teachers").catch(() => ({ rows: [] })),
          dbPool.query("SELECT id, payload FROM mst_staffs").catch(() => ({ rows: [] })),
          dbPool.query("SELECT id, payload FROM mst_students").catch(() => ({ rows: [] })),
          dbPool.query("SELECT payload FROM mst_majors").catch(() => ({ rows: [] })),
          dbPool.query("SELECT payload FROM mst_classes").catch(() => ({ rows: [] })),
          dbPool.query("SELECT payload FROM mst_rooms").catch(() => ({ rows: [] })),
          dbPool.query("SELECT payload FROM mst_subjects").catch(() => ({ rows: [] }))
        ]);

        if (existingPayload) {
          fullExistingPayload = {
            ...existingPayload,
            majors: dbMajors.rows.map(r => r.payload),
            classes: dbClasses.rows.map(r => r.payload),
            rooms: dbRooms.rows.map(r => r.payload),
            teachers: dbTeachers.rows.map(r => r.payload),
            subjects: dbSubjects.rows.map(r => r.payload),
            students: dbStudents.rows.map(r => r.payload),
            staffs: dbStaffs.rows.map(r => r.payload)
          };
        }

        const dbTeacherMap = new Map();
        for (const r of dbTeachers.rows) {
          const pl = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
          if (pl && pl.password) {
            dbTeacherMap.set(String(pl.code || r.id).toLowerCase().trim(), pl.password);
          }
        }

        const dbStaffMap = new Map();
        for (const r of dbStaffs.rows) {
          const pl = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
          if (pl && pl.password) {
            dbStaffMap.set(String(pl.code || pl.staff_code || r.id).toLowerCase().trim(), pl.password);
          }
        }

        const dbStudentMap = new Map();
        for (const r of dbStudents.rows) {
          const pl = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
          if (pl && pl.password) {
            dbStudentMap.set(String(pl.nis || pl.code || r.id).toLowerCase().trim(), pl.password);
          }
        }

        // Restore teacher passwords
        if (Array.isArray(payload.teachers)) {
          payload.teachers = payload.teachers.map(t => {
            if (!t.password) {
              const codeKey = String(t.code || "").toLowerCase().trim();
              const oldPassword = dbTeacherMap.get(codeKey);
              if (oldPassword) t.password = oldPassword;
            }
            return t;
          });
        }

        // Restore staff passwords
        if (Array.isArray(payload.staffs)) {
          payload.staffs = payload.staffs.map(s => {
            if (!s.password) {
              const codeKey = String(s.code || s.staff_code || "").toLowerCase().trim();
              const oldPassword = dbStaffMap.get(codeKey);
              if (oldPassword) s.password = oldPassword;
            }
            return s;
          });
        }

        // Restore student passwords
        if (Array.isArray(payload.students)) {
          payload.students = payload.students.map(s => {
            if (!s.password) {
              const codeKey = String(s.nis || s.code || "").toLowerCase().trim();
              const oldPassword = dbStudentMap.get(codeKey);
              if (oldPassword) s.password = oldPassword;
            }
            return s;
          });
        }
      } catch (e) {
        console.warn("Could not merge passwords on save:", e);
      }

      // Check if payload is identical to existing database state
      if (fullExistingPayload) {
        const isPayloadEqual = (a, b) => {
          if (!a || !b) return false;
          
          const keysToCompare = [
            'schedule', 'isGenerated', 'days', 'timeSlots', 'teachingLoads', 
            'teacherAvailability', 'classes', 'rooms', 'teachers', 'staffs', 
            'students', 'subjects', 'appSettings', 'customThemePresets', 
            'jpDurationMinutes', 'majors', 'rememberMe', 'layoutSettings', 
            'roomLayout', 'layoutDay', 'layoutByDay', 'layoutPreset', 
            'layoutBlockLabels', 'deletedHistory', 'advancedRules', 
            'expandedGroups', 'isSidebarCollapsed', 'attendanceSettings', 
            'featureSettings', 'syllabuses', 'syllabusCategories', 
            'dashboardMessages', 'academicCalendar', 'calendarCategories', 
            'rolePermissions', 'kedisiplinanSettings'
          ];

          const cleanObjectForCompare = (obj) => {
            if (obj === null || obj === undefined) return null;
            if (Array.isArray(obj)) {
              return obj.map(item => cleanObjectForCompare(item));
            }
            if (typeof obj === 'object') {
              const cleaned = {};
              const sortedKeys = Object.keys(obj).sort();
              for (const k of sortedKeys) {
                cleaned[k] = cleanObjectForCompare(obj[k]);
              }
              return cleaned;
            }
            return obj;
          };

          for (const key of keysToCompare) {
            const valA = cleanObjectForCompare(a[key]);
            const valB = cleanObjectForCompare(b[key]);
            const strA = JSON.stringify(valA);
            const strB = JSON.stringify(valB);
            if (strA !== strB) {
              console.log(`[SAVE] Payload diff found on key: ${key}`);
              // Uncomment to see exact diff: console.log(`A: ${strA}\nB: ${strB}`);
              return false;
            }
          }
          return true;
        };

        if (isPayloadEqual(payload, fullExistingPayload)) {
          console.log("[SAVE] No changes detected. Skipping DB update.");
          // No changes detected, skip DB queries and logging
          send(req, res, 200, { ok: true, noChanges: true });
          return true;
        }
      }

      // --- RELATIONAL NORMALIZATION ---
      // Extract master data arrays and save them into individual tables
      const { majors, classes, rooms, teachers, subjects, students, ...restPayload } = payload;
      
      const saveToTable = async (tableName, items, idKey = 'id') => {
        if (!Array.isArray(items)) return;
        const client = await dbPool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`DELETE FROM ${tableName}`);
          
          const uniqueItems = [];
          const seenIds = new Set();
          for (const item of items) {
            let rowId;
            let val;
            if (typeof item === 'object' && item !== null) {
              rowId = String(item[idKey] || Math.random().toString(36).substring(7));
              val = item;
            } else {
              rowId = String(item || '').trim();
              val = rowId;
            }
            const normalizedId = rowId.toLowerCase().trim();
            if (!normalizedId || seenIds.has(normalizedId)) continue;
            seenIds.add(normalizedId);
            uniqueItems.push({ rowId, val });
          }

          // Batch insert in chunks of 500 rows for ultra-fast execution
          const chunkSize = 500;
          for (let i = 0; i < uniqueItems.length; i += chunkSize) {
            const chunk = uniqueItems.slice(i, i + chunkSize);
            const values = [];
            const params = [];
            let paramIdx = 1;
            chunk.forEach(({ rowId, val }) => {
              values.push(`($${paramIdx}, $${paramIdx + 1})`);
              params.push(rowId, JSON.stringify(val));
              paramIdx += 2;
            });
            if (values.length > 0) {
              await client.query(`INSERT INTO ${tableName} (id, payload) VALUES ${values.join(', ')}`, params);
            }
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          console.error(`Failed to save ${tableName}:`, e);
        } finally {
          client.release();
        }
      };

      await Promise.all([
        saveToTable('mst_majors', majors, 'name'),
        saveToTable('mst_classes', classes, 'name'),
        saveToTable('mst_rooms', rooms, 'id'),
        saveToTable('mst_teachers', teachers, 'code'),
        saveToTable('mst_subjects', subjects, 'id'),
        saveToTable('mst_students', students, 'nis'),
        saveToTable('mst_staffs', payload.staffs || [], 'code')
      ]);

      // Save the rest of the config back to app_data
      const dataString = JSON.stringify(restPayload);
      await dbPool.query(`
        INSERT INTO app_data (store_key, data) VALUES ('main_store', $1)
        ON CONFLICT (store_key) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
      `, [dataString]);
      
      // Trigger background sync for modules
      syncAllUsersToModules().catch(console.error);
      const session = getSession(req);
      if (session) {
        await logAudit(dbPool, session, req, "UPDATE", "system_data", "Menyimpan pembaruan data sistem (jadwal, guru, siswa, kelas, dll)");
      }
      
      send(req, res, 200, { ok: true });
    } catch (err) {
      console.error("Save Data Error:", err);
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  return false;
}

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
      
      // Merge with relational tables (all master data sources)
      try {
        const [majors, classes, rooms, subjects, teachers] = await Promise.all([
          dbPool.query('SELECT payload FROM mst_majors ORDER BY id ASC'),
          dbPool.query('SELECT payload FROM mst_classes ORDER BY id ASC'),
          dbPool.query('SELECT payload FROM mst_rooms ORDER BY id ASC'),
          dbPool.query('SELECT payload FROM mst_subjects ORDER BY id ASC'),
          dbPool.query('SELECT payload FROM mst_teachers ORDER BY id ASC')
        ]);
        // Always set from DB (even if empty) so public payload is in sync
        payload.majors = majors.rows.map(r => r.payload);
        payload.classes = classes.rows.map(r => r.payload);
        payload.rooms = rooms.rows.map(r => r.payload);
        payload.subjects = subjects.rows.map(r => r.payload);
        // Expose safe public teacher info (name, code, id, walasClass, type) for schedule & piket displays without sensitive data
        payload.teachers = teachers.rows.map(r => {
          const p = r.payload || {};
          return {
            id: p.id || r.id,
            code: p.code || p.id || r.id,
            name: p.name || '',
            type: p.type || '',
            walasClass: p.walasClass || ''
          };
        });
        payload.students = [];
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

      // Merge with relational tables (all master data sources)
      try {
        const [majors, classes, rooms, subjects, teachers, students, staffs] = await Promise.all([
          dbPool.query('SELECT payload FROM mst_majors ORDER BY id ASC'),
          dbPool.query('SELECT payload FROM mst_classes ORDER BY id ASC'),
          dbPool.query('SELECT payload FROM mst_rooms ORDER BY id ASC'),
          dbPool.query('SELECT payload FROM mst_subjects ORDER BY id ASC'),
          dbPool.query('SELECT payload FROM mst_teachers ORDER BY id ASC'),
          dbPool.query('SELECT payload FROM mst_students ORDER BY id ASC'),
          dbPool.query('SELECT payload FROM mst_staffs ORDER BY id ASC')
        ]);
        // Always set from DB (even if empty) so store is in sync with database
        payload.majors = majors.rows.map(r => r.payload);
        payload.classes = classes.rows.map(r => r.payload);
        payload.rooms = rooms.rows.map(r => r.payload);
        payload.subjects = subjects.rows.map(r => r.payload);
        // Remove passwords from teachers/students/staffs before sending to client
        payload.teachers = teachers.rows.map(r => { const p = r.payload; if (p && p.password) delete p.password; return p; });
        payload.students = students.rows.map(r => { const p = r.payload; if (p && p.password) delete p.password; return p; });
        payload.staffs = staffs.rows.map(r => { const p = r.payload; if (p && p.password) delete p.password; return p; });
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
      // NOTE: students, teachers, and staffs are no longer managed by this global save endpoint
      const { majors, classes, rooms, subjects, teachers, students, staffs, ...restPayload } = payload;
      
      const saveToTable = async (tableName, items, idKey = 'id') => {
        if (!Array.isArray(items)) return;
        const client = await dbPool.connect();
        try {
          await client.query('BEGIN');
          
          const uniqueItems = [];
          const seenIds = new Set();
          const incomingIds = [];
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
            incomingIds.push(rowId);
            uniqueItems.push({ rowId, val });
          }

          // Batch UPSERT in chunks of 500 rows (tabel tidak pernah kosong sesaat)
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
              await client.query(
                `INSERT INTO ${tableName} (id, payload) VALUES ${values.join(', ')}
                 ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
                params
              );
            }
          }

          // Hapus selektif hanya record yang sudah tidak ada di payload baru
          if (incomingIds.length > 0) {
            const placeholders = incomingIds.map((_, i) => `$${i + 1}`).join(', ');
            await client.query(`DELETE FROM ${tableName} WHERE id NOT IN (${placeholders})`, incomingIds);
          } else {
            await client.query(`DELETE FROM ${tableName}`);
          }

          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          console.error(`Failed to save ${tableName}:`, e);
        } finally {
          client.release();
        }
      };

      const saveTeachers = async (items) => {
        if (!Array.isArray(items) || items.length === 0) return;
        const client = await dbPool.connect();
        try {
          await client.query('BEGIN');
          const existingRes = await client.query("SELECT id, payload FROM mst_teachers");
          const dbMap = new Map(existingRes.rows.map(r => {
            const p = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
            return [String(r.id).toLowerCase(), p?.password];
          }));
          for (const item of items) {
            if (!item) continue;
            const code = String(item.code || item.nip || item.id || '').trim();
            const normalizedId = code.toLowerCase();
            if (!normalizedId) continue;
            if (!item.password && dbMap.has(normalizedId)) {
              item.password = dbMap.get(normalizedId);
            }
            await client.query(
              `INSERT INTO mst_teachers (id, payload) VALUES ($1, $2)
               ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
              [normalizedId, JSON.stringify(item)]
            );
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          console.error("Failed to save teachers from /api/data/save:", e);
        } finally {
          client.release();
        }
      };

      const saveStaffs = async (items) => {
        if (!Array.isArray(items) || items.length === 0) return;
        const client = await dbPool.connect();
        try {
          await client.query('BEGIN');
          const existingRes = await client.query("SELECT id, payload FROM mst_staffs");
          const dbMap = new Map(existingRes.rows.map(r => {
            const p = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
            return [String(r.id).toLowerCase(), p?.password];
          }));
          for (const item of items) {
            if (!item) continue;
            const code = String(item.code || item.staff_code || item.nip || item.id || '').trim();
            const normalizedId = code.toLowerCase();
            if (!normalizedId) continue;
            if (!item.password && dbMap.has(normalizedId)) {
              item.password = dbMap.get(normalizedId);
            }
            await client.query(
              `INSERT INTO mst_staffs (id, payload) VALUES ($1, $2)
               ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
              [normalizedId, JSON.stringify(item)]
            );
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          console.error("Failed to save staffs from /api/data/save:", e);
        } finally {
          client.release();
        }
      };

      const saveStudents = async (items) => {
        if (!Array.isArray(items) || items.length === 0) return;
        const client = await dbPool.connect();
        try {
          await client.query('BEGIN');
          const existingRes = await client.query("SELECT id, payload FROM mst_students");
          const dbMap = new Map(existingRes.rows.map(r => {
            const p = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
            return [String(r.id).toLowerCase(), p?.password];
          }));
          for (const item of items) {
            if (!item) continue;
            const nis = String(item.nis || item.code || item.id || '').trim();
            const normalizedId = nis.toLowerCase();
            if (!normalizedId) continue;
            if (!item.password && dbMap.has(normalizedId)) {
              item.password = dbMap.get(normalizedId);
            }
            await client.query(
              `INSERT INTO mst_students (id, payload) VALUES ($1, $2)
               ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
              [normalizedId, JSON.stringify(item)]
            );
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          console.error("Failed to save students from /api/data/save:", e);
        } finally {
          client.release();
        }
      };

      if (majors !== undefined) await saveToTable('mst_majors', majors, 'name');
      if (classes !== undefined) await saveToTable('mst_classes', classes, 'name');
      if (rooms !== undefined) await saveToTable('mst_rooms', rooms, 'id');
      if (subjects !== undefined) await saveToTable('mst_subjects', subjects, 'id');
      if (teachers !== undefined) await saveTeachers(teachers);
      if (staffs !== undefined) await saveStaffs(staffs);
      if (students !== undefined) await saveStudents(students);

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

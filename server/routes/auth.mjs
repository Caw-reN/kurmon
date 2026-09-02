import { hashPassword } from "../../src/utils/auth.js";

const activeCaptchas = new Map();
const loginAttempts = new Map();     // keyed by username
const loginAttemptsByIp = new Map(); // keyed by IP — prevents enumeration attacks

// S3 FIX: Hanya percaya X-Forwarded-For jika TRUST_PROXY=true (di balik Nginx/Caddy)
// Jika tidak, gunakan IP TCP langsung yang tidak bisa di-spoof.
const getClientIp = (req) => {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const first = String(forwarded).split(',')[0].trim();
      if (first && first !== 'unknown') return first;
    }
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
};

// Cleanup memory leak prevention
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of loginAttempts.entries()) {
    if (val.lockUntil < now) loginAttempts.delete(key);
  }
  for (const [key, val] of loginAttemptsByIp.entries()) {
    if (val.lockUntil < now) loginAttemptsByIp.delete(key);
  }
}, 3600000); // 1 jam


export async function handleAuthRoutes(req, res, url, ctx) {
  const {
    dbPool,
    sendDatabaseError,
    requireAuthenticated,
    readJsonBody,
    readMainPayload,
    createDatabaseUnavailableError,
    verifyPassword,
    createSession,
    ensureDatabaseReadable,
    normalizeServerRole,
    dbStatus,
    logAudit
  } = ctx;

  let send = ctx.send;

  if (req.method === "GET" && url.pathname === "/api/auth/ping") {
    send(req, res, 200, { ok: true, database: dbStatus });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = typeof getBearerToken !== 'undefined' ? getBearerToken(req) : (String(req.headers.authorization || "").startsWith("Bearer ") ? req.headers.authorization.slice(7).trim() : "");
    if (token && ctx.sessions) {
      ctx.sessions.delete(token);
      // BUG-03 FIX: Hapus dari PostgreSQL juga agar session tidak tersisa di DB
      if (ctx.deleteSessionFromDb) ctx.deleteSessionFromDb(token).catch(() => {});
      if (ctx.saveSessions) ctx.saveSessions();
    }
    send(req, res, 200, { ok: true });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/captcha") {
    const id = Math.random().toString(36).substring(2, 9);
    // FIX BUG-08: Captcha lebih kompleks (angka puluhan dan variasi operator)
    const num1 = Math.floor(Math.random() * 90) + 10;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let answer = 0;
    if (op === '+') answer = num1 + num2;
    else if (op === '-') answer = num1 - num2;
    else answer = num1 * num2;
    activeCaptchas.set(id, { answer: String(answer), expires: Date.now() + 5 * 60 * 1000 });
    
    // Cleanup expired captchas
    const now = Date.now();
    for (const [key, val] of activeCaptchas.entries()) {
      if (val.expires < now) {
        activeCaptchas.delete(key);
      }
    }
    
    send(req, res, 200, { ok: true, id, question: `${num1} ${op} ${num2} = ?` });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/sync") {
    const session = requireAuthenticated(req, res);
    if (!session) return true;
    const sessionRole = normalizeServerRole(session.role);
    const allowedRoles = ["admin", "superadmin", "tu", "tata_usaha", "waka", "waka_kurikulum", "waka_kesiswaan", "kepsek", "karyawan", "staff"];
    if (!allowedRoles.includes(sessionRole)) {
      send(req, res, 403, { ok: false, error: "Hanya admin atau tata usaha yang dapat melakukan sinkronisasi akun." });
      return true;
    }
    try {
      if (!dbPool) throw createDatabaseUnavailableError();
      const body = await readJsonBody(req);
      const nextAdmin = body.adminUser;
      const nextTeachers = Array.isArray(body.teachers) ? body.teachers : null;
      const nextStaffs = Array.isArray(body.staffs) ? body.staffs : null;

      const existingPayload = await readMainPayload();
      if (!existingPayload) throw new Error("Payload not found in database.");

      const mergedPayload = { ...existingPayload };
      if (nextAdmin) {
        mergedPayload.adminUser = {
          ...existingPayload.adminUser,
          ...nextAdmin,
          password: nextAdmin.password || existingPayload.adminUser?.password,
        };
      }
      if (nextTeachers) {
        const dbTeachers = await dbPool.query("SELECT payload FROM mst_teachers").catch(() => ({ rows: [] }));
        const dbTeacherMap = new Map();
        for (const r of dbTeachers.rows) {
          const pl = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
          if (pl && pl.password) {
            dbTeacherMap.set(String(pl.code).toLowerCase().trim(), pl.password);
          }
        }

        mergedPayload.teachers = nextTeachers.map((t) => {
          const codeKey = String(t.code || "").toLowerCase().trim();
          const dbPassword = dbTeacherMap.get(codeKey);
          const old = (existingPayload.teachers || []).find((ot) => ot.code === t.code);
          return {
            ...t,
            password: t.password || dbPassword || old?.password
          };
        });
      }
      
      if (nextStaffs) {
        const dbStaffs = await dbPool.query("SELECT payload FROM mst_staffs").catch(() => ({ rows: [] }));
        const dbStaffMap = new Map();
        for (const r of dbStaffs.rows) {
          const pl = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
          if (pl && pl.password) {
            dbStaffMap.set(String(pl.id).toLowerCase().trim(), pl.password);
          }
        }

        mergedPayload.staffs = nextStaffs.map((s) => {
          const idKey = String(s.id || "").toLowerCase().trim();
          const dbPassword = dbStaffMap.get(idKey);
          const old = (existingPayload.staffs || []).find((os) => os.id === s.id);
          return {
            ...s,
            password: s.password || dbPassword || old?.password
          };
        });
      }

      const dataString = JSON.stringify(mergedPayload);
      await dbPool.query(
        `INSERT INTO app_data (store_key, data) VALUES ('main_store', $1)
         ON CONFLICT (store_key) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
        [dataString]
      );
      send(req, res, 200, { ok: true });
    } catch (err) {
      console.error("Sync error:", err);
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    // Hanya log di non-production untuk menghindari username terekspos di log produksi
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Login attempt: user='${username}'`);
    }

    const now = Date.now();
    const attempts = loginAttempts.get(username) || { count: 0, lockUntil: 0 };
    if (attempts.lockUntil > now) {
      const remainingMin = Math.ceil((attempts.lockUntil - now) / 60000);
      send(req, res, 401, {
        ok: false,
        error: `Akun Anda terkunci karena terlalu banyak percobaan masuk yang salah. Silakan coba lagi dalam ${remainingMin} menit.`
      });
      return true;
    }

    // IP-based rate limiting (blocks enumeration across many usernames from one IP)
    const clientIp = getClientIp(req);
    const ipAttempts = loginAttemptsByIp.get(clientIp) || { count: 0, lockUntil: 0 };
    if (ipAttempts.lockUntil > now) {
      const remainingMin = Math.ceil((ipAttempts.lockUntil - now) / 60000);
      send(req, res, 429, {
        ok: false,
        error: `Terlalu banyak percobaan login dari perangkat Anda. Coba lagi dalam ${remainingMin} menit.`
      });
      return true;
    }

    // Capture success/fail using a helper send interceptor
    const originalSend = send;
    const sendWithLimit = (reqObj, resObj, status, data) => {
      if (data && data.ok) {
        loginAttempts.delete(username);
        loginAttemptsByIp.delete(clientIp);
      } else {
        // Per-username lockout
        const att = loginAttempts.get(username) || { count: 0, lockUntil: 0 };
        att.count += 1;
        if (att.count >= 5) {
          att.lockUntil = Date.now() + 15 * 60 * 1000;
          att.count = 0;
          if (data) data.error = `${data.error || "Username atau password salah."} Akun Anda telah terkunci selama 15 menit.`;
        }
        loginAttempts.set(username, att);

        // Per-IP lockout (after 20 failed attempts from same IP)
        const ipAtt = loginAttemptsByIp.get(clientIp) || { count: 0, lockUntil: 0 };
        ipAtt.count += 1;
        if (ipAtt.count >= 20) {
          ipAtt.lockUntil = Date.now() + 30 * 60 * 1000; // 30 min IP block
          ipAtt.count = 0;
        }
        loginAttemptsByIp.set(clientIp, ipAtt);
      }
      originalSend(reqObj, resObj, status, data);
    };
    send = sendWithLimit;
    
    try {
      const payload = await readMainPayload();
      // FIX BUG-09: Jangan menelan error, minimal log warning agar bisa di-debug
      try {
        const dbTeachers = await dbPool.query('SELECT payload FROM mst_teachers');
        if (dbTeachers.rows.length > 0) payload.teachers = dbTeachers.rows.map(r => r.payload);
      } catch (e) {
        console.warn("[Auth] Failed to load mst_teachers:", e.message);
      }
      try {
        const dbStaffs = await dbPool.query('SELECT payload FROM mst_staffs');
        if (dbStaffs.rows.length > 0) payload.staffs = dbStaffs.rows.map(r => r.payload);
      } catch (e) {
        console.warn("[Auth] Failed to load mst_staffs:", e.message);
      }
      try {
        const dbClasses = await dbPool.query('SELECT payload FROM mst_classes');
        if (dbClasses.rows.length > 0) payload.classes = dbClasses.rows.map(r => r.payload);
      } catch (e) {
        console.warn("[Auth] Failed to load mst_classes:", e.message);
      }
      if (!payload) throw new Error("Main payload empty");
      
      // Admin login
      if (username && payload.adminUser?.username?.trim().toLowerCase() === username) {
        const isValid = await verifyPassword(password, payload.adminUser.password);
        if (isValid) {
          if (!await ensureDatabaseReadable(req, res)) return true;
          try { await dbPool.query("INSERT INTO login_logs (username, role, ip) VALUES ($1, $2, $3)", [username, 'admin', req.socket?.remoteAddress || '']); } catch {}
          await logAudit(dbPool, { id: username, name: payload.adminUser.name || "Admin", role: "admin" }, req, "LOGIN", "session", "Admin berhasil masuk ke sistem");
          const hasChangedPassword = payload.adminUser?.hasChangedPassword === true;
          const isDefaultPassword = !hasChangedPassword;
          send(req, res, 200, { ok: true, user: { role: "admin", name: payload.adminUser.name, isDefaultPassword, hasChangedPassword, authToken: createSession("admin", { id: payload.adminUser.username || "admin", username: payload.adminUser.username || "admin", name: payload.adminUser.name }) } });
          return true;
        }
      }

      // Teacher / Staff login
      let isStaffAccount = false;
      let teacher = (payload.teachers || []).find((item) => String(item.code || item.nip || item.id || "").trim().toLowerCase() === username);
      if (!teacher) {
        teacher = (payload.staffs || []).find((item) => String(item.code || item.staff_code || item.id || "").trim().toLowerCase() === username);
        if (teacher) isStaffAccount = true;
      }
      
      let isTeacherValid = false;
      const userCode = teacher ? String(teacher.code || teacher.staff_code || teacher.id || "").trim() : "";
      
      if (teacher && userCode) {
        if (teacher.password) {
          isTeacherValid = await verifyPassword(password, teacher.password);
        } else {
          // Initial default password (case-insensitive check for code / staff_code)
          isTeacherValid = (password.trim().toLowerCase() === userCode.toLowerCase());
          if (isTeacherValid) {
            console.warn(`[AUTH] ${isStaffAccount ? 'Staff' : 'Guru'} '${userCode}' masuk dengan password default (kode).`);
          }
        }
      }

      if (teacher && isTeacherValid) {
        if (!await ensureDatabaseReadable(req, res)) return true;

        let rawRole = teacher.role;
        if (!rawRole && isStaffAccount) {
          const div = String(teacher.division || "").toLowerCase();
          rawRole = (div.includes("tu") || div.includes("tata usaha")) ? "tu" : "karyawan";
        }

        let role = normalizeServerRole(rawRole, isStaffAccount ? "karyawan" : "guru");
        let walasClass = null;
        let isWalas = false;
        
        if (!isStaffAccount) {
          try {
            const homeroomClass = (payload.classes || []).find(c => String(c.homeroom || "").trim().toLowerCase() === userCode.toLowerCase());
            if (homeroomClass) {
                isWalas = true;
                walasClass = homeroomClass.name;
            }
          } catch (e) {}
        }
        
        try { await dbPool.query("INSERT INTO login_logs (username, role, ip) VALUES ($1, $2, $3)", [userCode, role, req.socket?.remoteAddress || '']); } catch {}
        await logAudit(dbPool, { id: userCode, name: teacher.name || "Pengguna", role }, req, "LOGIN", "session", `${isStaffAccount ? "Karyawan/Staff" : "Guru"} (${teacher.name}) berhasil masuk ke sistem`);
        
        const hasChangedPassword = teacher.hasChangedPassword === true;
        const isDefaultPassword = !hasChangedPassword;
        
        send(req, res, 200, {
          ok: true,
          user: {
            role,
            code: userCode,
            name: teacher.name,
            division: teacher.division || "",
            subrole: teacher.subrole || "",
            isWalas,
            walasClass,
            isDefaultPassword,
            hasChangedPassword,
            authToken: createSession(role, { 
              id: userCode, 
              username: userCode, 
              name: teacher.name,
              division: teacher.division || "",
              subrole: teacher.subrole || "",
              isWalas,
              walasClass,
              isBK: teacher.isBK || false,
              isBPBK: teacher.isBPBK || false,
              isKesiswaan: teacher.isKesiswaan || false
            })
          }
        });
        return true;
      }
    } catch (err) {
      console.warn("Error reading main payload for login", err);
    }


    // Check users table (siswa & staff with DB accounts)
    if (dbPool) {
      try {
        const { rows: userRows } = await dbPool.query(
          "SELECT id, username, password, name, role FROM users WHERE username = $1", [username]
        );
        if (userRows.length > 0) {
          const dbUser = userRows[0];
          const isValid = await verifyPassword(password, dbUser.password);
          if (isValid) {
            const role = normalizeServerRole(dbUser.role);
            const token = createSession(role, { id: dbUser.id, username: dbUser.username, name: dbUser.name });
            try { await dbPool.query("INSERT INTO login_logs (username, role, ip) VALUES ($1, $2, $3)", [dbUser.username, role, req.socket?.remoteAddress || '']); } catch {}
            await logAudit(dbPool, { id: dbUser.username, name: dbUser.name || "Siswa", role }, req, "LOGIN", "session", `Siswa/User (${dbUser.name}) berhasil masuk ke sistem`);
            const hasChangedPassword = dbUser.has_changed_password === true || dbUser.hasChangedPassword === true;
            const isDefaultPassword = !hasChangedPassword;
            send(req, res, 200, { ok: true, user: { role, id: dbUser.id, name: dbUser.name, username: dbUser.username, isDefaultPassword, hasChangedPassword, authToken: token } });
            return true;
          }
        }
      } catch (dbErr) {
        console.warn("Users table lookup failed:", dbErr.message);
      }
    }
    
    // Check students array for PKL login
    if (dbPool) {
      try {
        const { rows: storeRows } = await dbPool.query(`SELECT (data::json)->'students' as students FROM app_data WHERE store_key = 'main_store'`);
        let students = (storeRows.length > 0 && Array.isArray(storeRows[0].students)) ? storeRows[0].students : [];
        try {
          const dbStudents = await dbPool.query('SELECT payload FROM mst_students');
          if (dbStudents.rows.length > 0) students = dbStudents.rows.map(r => r.payload);
        } catch(e) {}
           const student = students.find(s => String(s.nis).trim().toLowerCase() === username);
           if (student) {
               const { rows: pklRows } = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'pkl_settings'");
               const pklSettings = pklRows.length > 0 ? JSON.parse(pklRows[0].data) : { eligibleClass: "XII" };
               const eligibleClass = pklSettings.eligibleClass || "XII";

              if (student.class_name && student.class_name.toUpperCase().startsWith(eligibleClass.toUpperCase())) {
                  let isStudentValid = false;
                  if (student.password) {
                    isStudentValid = await verifyPassword(password, student.password);
                  } else {
                    // No custom password — accept NIS as initial password only
                    isStudentValid = (password === String(student.nis).trim());
                    if (isStudentValid) {
                      console.warn(`[AUTH] Siswa '${student.nis}' masuk dengan NIS sebagai password default. Disarankan set password khusus.`);
                    }
                  }

                  if (isStudentValid) {
                     const token = createSession("siswa", { id: student.nis, username: student.nis, name: student.name });
                     const hasChangedPassword = student.hasChangedPassword === true;
                     const isDefaultPassword = !hasChangedPassword;
                     send(req, res, 200, { ok: true, user: { role: "siswa", id: student.nis, name: student.name, username: student.nis, class_name: student.class_name, jurusan: student.jurusan || student.major || "", isDefaultPassword, hasChangedPassword, authToken: token } });
                     return true;
                  }
              } else {
                 send(req, res, 401, { ok: false, error: `Akses ditolak. Login saat ini hanya untuk siswa kelas ${eligibleClass} (PKL).` });
                 return true;
              }
           }
      } catch (dbErr) {
        console.warn("Failed to check student login via app_data:", dbErr.message);
      }
    }

    send(req, res, 401, { ok: false, error: "Username atau password salah." });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/forgot-password-validate") {
    try {
      if (!dbPool) throw createDatabaseUnavailableError();
      const body = await readJsonBody(req);
      const username = String(body.username || "").trim().toLowerCase();
      const whatsapp = String(body.whatsapp || "").replace(/[^0-9]/g, "").replace(/^0/, "62").replace(/^(\+62)/, "62");

      let userFound = false;
      let phoneMatch = false;
      let registeredPhone = "";
      let targetName = "";

      const [dbTeachers, dbStudents, dbStaffs] = await Promise.all([
        dbPool.query('SELECT payload FROM mst_teachers'),
        dbPool.query('SELECT payload FROM mst_students'),
        dbPool.query('SELECT payload FROM mst_staffs')
      ]);
      const teachers = dbTeachers.rows.map(r => r.payload);
      const students = dbStudents.rows.map(r => r.payload);
      const staffs = dbStaffs.rows.map(r => r.payload);

      let targetItem = teachers.find(t => String(t.code || "").trim().toLowerCase() === username || String(t.name || "").trim().toLowerCase() === username);
      let foundType = "";
      if (targetItem) {
        foundType = "guru";
      } else {
        targetItem = staffs.find(t => String(t.code || t.staff_code || "").trim().toLowerCase() === username || String(t.name || "").trim().toLowerCase() === username);
        if (targetItem) {
          foundType = "karyawan";
        } else {
          targetItem = students.find(s => String(s.nis || "").trim().toLowerCase() === username || String(s.code || "").trim().toLowerCase() === username || String(s.name || "").trim().toLowerCase() === username);
          if (targetItem) {
            foundType = "siswa";
          }
        }
      }

      if (targetItem) {
        userFound = true;
        targetName = targetItem.name;
        if (foundType === "siswa") {
          registeredPhone = targetItem.wa_ortu || targetItem.phone || "";
        } else {
          registeredPhone = targetItem.phone || "";
        }
        const normReg = String(registeredPhone).replace(/[^0-9]/g, "").replace(/^0/, "62").replace(/^(\+62)/, "62");
        phoneMatch = normReg === whatsapp;
      }

      if (!userFound || !phoneMatch) {
        send(req, res, 200, { ok: false, error: "data_mismatch", message: "Data tidak cocok dengan yang terdaftar di sistem!" });
        return true;
      }

      send(req, res, 200, { ok: true, name: targetName });
    } catch (err) {
      console.error("Forgot validate error:", err);
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/forgot-password-request") {
    try {
      if (!dbPool) throw createDatabaseUnavailableError();
      const body = await readJsonBody(req);
      
      // Verify Captcha
      const captchaId = String(body.captchaId || "").trim();
      const captchaAnswer = String(body.captchaAnswer || "").trim();
      
      const stored = activeCaptchas.get(captchaId);
      if (!stored || stored.expires < Date.now()) {
        send(req, res, 200, { ok: false, message: "Captcha kedaluwarsa atau tidak valid. Silakan segar kembali." });
        return true;
      }
      activeCaptchas.delete(captchaId); // single use
      
      if (stored.answer !== captchaAnswer) {
        send(req, res, 200, { ok: false, message: "Jawaban captcha Anda salah!" });
        return true;
      }

      const username = String(body.username || "").trim().toLowerCase();
      const whatsapp = String(body.whatsapp || "").replace(/[^0-9]/g, "").replace(/^0/, "62").replace(/^(\+62)/, "62");

      // Load main payload and relational data
      const payload = await readMainPayload() || {};
      const [dbTeachers, dbStudents, dbStaffs] = await Promise.all([
        dbPool.query('SELECT payload FROM mst_teachers'),
        dbPool.query('SELECT payload FROM mst_students'),
        dbPool.query('SELECT payload FROM mst_staffs')
      ]);
      const teachers = dbTeachers.rows.map(r => r.payload);
      const students = dbStudents.rows.map(r => r.payload);
      const staffs = dbStaffs.rows.map(r => r.payload);

      let userFound = false;
      let phoneMatch = false;
      let registeredPhone = "";
      let targetName = "";
      let targetItem = null;
      let foundType = "";

      targetItem = teachers.find(t => String(t.code || "").trim().toLowerCase() === username || String(t.name || "").trim().toLowerCase() === username);
      if (targetItem) {
        foundType = "guru";
      } else {
        targetItem = staffs.find(t => String(t.code || t.staff_code || "").trim().toLowerCase() === username || String(t.name || "").trim().toLowerCase() === username);
        if (targetItem) {
          foundType = "karyawan";
        } else {
          targetItem = students.find(s => String(s.nis || "").trim().toLowerCase() === username || String(s.code || "").trim().toLowerCase() === username || String(s.name || "").trim().toLowerCase() === username);
          if (targetItem) {
            foundType = "siswa";
          }
        }
      }

      if (targetItem) {
        userFound = true;
        targetName = targetItem.name;
        if (foundType === "siswa") {
          registeredPhone = targetItem.wa_ortu || targetItem.phone || "";
        } else {
          registeredPhone = targetItem.phone || "";
        }
        const normReg = String(registeredPhone).replace(/[^0-9]/g, "").replace(/^0/, "62").replace(/^(\+62)/, "62");
        phoneMatch = normReg === whatsapp;
      }

      if (!userFound || !phoneMatch) {
        send(req, res, 200, { ok: false, message: "Data tidak cocok dengan yang terdaftar di sistem!" });
        return true;
      }

      // Initialize passwordResetRequests array if not present
      if (!Array.isArray(payload.passwordResetRequests)) {
        payload.passwordResetRequests = [];
      }

      // Check how many requests exist for this username
      const userCodeKey = String(targetItem.code || targetItem.nis || username).trim().toLowerCase();
      const existingRequests = payload.passwordResetRequests.filter(r => String(r.username).trim().toLowerCase() === userCodeKey);
      const isFirstRequest = existingRequests.length === 0;

      if (isFirstRequest) {
        // Generate new password
        const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let newPassword = "";
        for (let i = 0; i < 6; i++) {
          newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
        }

        // Hash
        const nextPasswordHash = await hashPassword(newPassword);

        // Update database
        if (foundType === "guru") {
          await dbPool.query(`
            UPDATE mst_teachers 
            SET payload = jsonb_set(payload::jsonb, '{password}', to_jsonb($1::text))
            WHERE payload->>'code' = $2
          `, [nextPasswordHash, targetItem.code]);
        } else if (foundType === "karyawan") {
          const staffCode = targetItem.code || targetItem.staff_code;
          await dbPool.query(`
            UPDATE mst_staffs 
            SET payload = jsonb_set(payload::jsonb, '{password}', to_jsonb($1::text))
            WHERE payload->>'code' = $2 OR payload->>'staff_code' = $2
          `, [nextPasswordHash, staffCode]);
        } else if (foundType === "siswa") {
          await dbPool.query(`
            UPDATE mst_students 
            SET payload = jsonb_set(payload::jsonb, '{password}', to_jsonb($1::text))
            WHERE payload->>'nis' = $2
          `, [nextPasswordHash, targetItem.nis]);
        }

        // Add approved request to history/list
        const approvedReq = {
          id: Date.now().toString(),
          role: foundType,
          username: targetItem.code || targetItem.nis || username,
          whatsapp: registeredPhone || whatsapp,
          status: "approved",
          requestedAt: new Date().toISOString()
        };
        payload.passwordResetRequests = [approvedReq, ...payload.passwordResetRequests];

        // Save back to app_data
        await dbPool.query(`
          INSERT INTO app_data (store_key, data) VALUES ('main_store', $1)
          ON CONFLICT (store_key) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
        `, [JSON.stringify(payload)]);

        // Send auto-approve response
        const whatsappMsg = `Halo ${targetName || username}, permintaan reset sandi Anda berhasil diproses secara otomatis. Sandi baru Anda: ${newPassword}. Silakan gunakan sandi ini untuk masuk.`;
        
        let responseData = {};
        let status = "sent";
        try {
          const keyRes = await dbPool.query("SELECT api_key FROM api_keys WHERE service_name = 'whatsapp_fonnte' AND is_active = true");
          if (keyRes.rowCount > 0) {
            const token = keyRes.rows[0].api_key;
            const phoneDest = String(registeredPhone || whatsapp).replace(/\D/g, "");
            const phone = phoneDest.startsWith("0") ? "62" + phoneDest.slice(1) : phoneDest;

            const fonnteRes = await fetch("https://api.fonnte.com/send", {
              method: "POST",
              headers: { "Authorization": token, "Content-Type": "application/json" },
              body: JSON.stringify({ target: phone, message: whatsappMsg, countryCode: "62" })
            });
            responseData = await fonnteRes.json();
            if (!fonnteRes.ok || responseData.status === false) status = "failed";

            await dbPool.query("INSERT INTO whatsapp_logs (phone, recipient_name, message, status, trigger_type, response_data) VALUES ($1,$2,$3,$4,$5,$6)",
              [phone, targetName || username, whatsappMsg, status, "forgot_password_auto", JSON.stringify(responseData)]);
          } else {
            status = "failed";
            responseData = { error: "API Key WhatsApp belum dikonfigurasi atau tidak aktif." };
          }
        } catch (e) {
          status = "failed";
          responseData = { error: e.message };
        }

        send(req, res, 200, {
          ok: true,
          autoApproved: true,
          message: "Permintaan disetujui secara otomatis! Sandi baru telah dikirim langsung ke nomor WhatsApp Anda.",
          whatsappAlert: `[WhatsApp Gateway Terkirim]\nKe: ${registeredPhone || whatsapp}\nPesan: "${whatsappMsg}"\nStatus: ${status}`
        });
      } else {
        // More than 1x: Queue for Admin approval
        const pendingReq = {
          id: Date.now().toString(),
          role: foundType,
          username: targetItem.code || targetItem.nis || username,
          whatsapp: registeredPhone || whatsapp,
          status: "pending",
          requestedAt: new Date().toISOString()
        };
        payload.passwordResetRequests = [pendingReq, ...payload.passwordResetRequests];

        // Save back to app_data
        await dbPool.query(`
          INSERT INTO app_data (store_key, data) VALUES ('main_store', $1)
          ON CONFLICT (store_key) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
        `, [JSON.stringify(payload)]);

        send(req, res, 200, {
          ok: true,
          autoApproved: false,
          message: "Permintaan Anda sudah dikirim ke Admin. Karena Anda sudah pernah mengajukan reset sandi sebelumnya, permintaan kali ini memerlukan persetujuan Admin terlebih dahulu."
        });
      }
    } catch (err) {
      console.error("Forgot password request error:", err);
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/change-password") {
    try {
      const session = requireAuthenticated(req, res);
      if (!session) return true;

      const body = await readJsonBody(req);
      const oldPassword = String(body.oldPassword || "").trim();
      const newPassword = String(body.newPassword || "").trim();
      
      if (!newPassword) {
        send(req, res, 200, { ok: false, message: "Kata sandi baru tidak boleh kosong!" });
        return true;
      }

      if (newPassword.length < 6 || newPassword.length > 12) {
        send(req, res, 200, { ok: false, message: "Kata sandi baru harus berukuran minimal 6 hingga 12 karakter!" });
        return true;
      }

      if (!dbPool) throw createDatabaseUnavailableError();

      const role = String(session.role || "").trim().toLowerCase();
      const username = String(session.username || "").trim().toLowerCase();

      // 1. Weak password / Default password check
      const isWeakDefault = (
        newPassword === username ||
        newPassword === "123" ||
        newPassword === "123456" ||
        newPassword === "admin123"
      );
      if (isWeakDefault) {
        send(req, res, 200, { ok: false, message: "Kata sandi baru terlalu mudah ditebak / menggunakan kata sandi bawaan (seperti 123, 123456, atau username). Silakan buat kata sandi lain yang lebih aman!" });
        return true;
      }

      // 2. Fetch previous password hash across all tables
      let currentPasswordHash = null;

      if (role === "admin" || role === "superadmin") {
        const payload = await readMainPayload() || {};
        currentPasswordHash = payload.adminUser?.password;
      }

      if (!currentPasswordHash) {
        const tResult = await dbPool.query(`
          SELECT payload FROM mst_teachers 
          WHERE payload->>'code' = $1 OR payload->>'nip' = $1 OR payload->>'id' = $1 OR id = $1
        `, [session.username]);
        if (tResult.rows.length > 0) {
          const tData = typeof tResult.rows[0].payload === 'string' ? JSON.parse(tResult.rows[0].payload) : tResult.rows[0].payload;
          currentPasswordHash = tData?.password;
        }
      }

      if (!currentPasswordHash) {
        const stResult = await dbPool.query(`
          SELECT payload FROM mst_staffs 
          WHERE payload->>'staff_code' = $1 OR payload->>'code' = $1 OR payload->>'nip' = $1 OR payload->>'id' = $1 OR id = $1
        `, [session.username]);
        if (stResult.rows.length > 0) {
          const stData = typeof stResult.rows[0].payload === 'string' ? JSON.parse(stResult.rows[0].payload) : stResult.rows[0].payload;
          currentPasswordHash = stData?.password;
        }
      }

      if (!currentPasswordHash) {
        const sResult = await dbPool.query(`
          SELECT payload FROM mst_students 
          WHERE payload->>'nis' = $1 OR payload->>'code' = $1 OR payload->>'nisn' = $1 OR id = $1
        `, [session.username]);
        if (sResult.rows.length > 0) {
          const sData = typeof sResult.rows[0].payload === 'string' ? JSON.parse(sResult.rows[0].payload) : sResult.rows[0].payload;
          currentPasswordHash = sData?.password;
        }
      }

      // 3. Same as previous password check & Old password verification (if provided)
      let isSameAsPrevious = false;
      let isOldValid = true;
      if (currentPasswordHash) {
        if (oldPassword) {
          isOldValid = await verifyPassword(oldPassword, currentPasswordHash);
        }
        isSameAsPrevious = await verifyPassword(newPassword, currentPasswordHash);
      } else {
        if (oldPassword) {
          isOldValid = (oldPassword.toLowerCase() === session.username.toLowerCase());
        }
        isSameAsPrevious = (newPassword === session.username);
      }

      if (!isOldValid) {
        send(req, res, 200, { ok: false, message: "Kata sandi lama salah!" });
        return true;
      }

      if (isSameAsPrevious) {
        send(req, res, 200, { ok: false, message: "Kata sandi baru tidak boleh sama dengan kata sandi sebelumnya!" });
        return true;
      }

      const nextPasswordHash = await hashPassword(newPassword);
      let success = false;

      // 4. Update password in corresponding table
      if (role === "admin" || role === "superadmin") {
        const payload = await readMainPayload() || {};
        if (payload.adminUser) {
          payload.adminUser.password = nextPasswordHash;
          payload.adminUser.hasChangedPassword = true;
          await dbPool.query(`
            INSERT INTO app_data (store_key, data) VALUES ('main_store', $1)
            ON CONFLICT (store_key) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
          `, [JSON.stringify(payload)]);
          success = true;
        }
      }

      if (!success) {
        const tResult = await dbPool.query(`
          SELECT id FROM mst_teachers 
          WHERE payload->>'code' = $1 OR payload->>'nip' = $1 OR payload->>'id' = $1 OR id = $1
        `, [session.username]);
        if (tResult.rows.length > 0) {
          const rowId = tResult.rows[0].id;
          const uRes = await dbPool.query(`
            UPDATE mst_teachers 
            SET payload = jsonb_set(jsonb_set(payload::jsonb, '{password}', to_jsonb($1::text)), '{hasChangedPassword}', 'true'::jsonb)
            WHERE id = $2
          `, [nextPasswordHash, rowId]);
          if (uRes.rowCount > 0) success = true;
        }
      }

      if (!success) {
        const stResult = await dbPool.query(`
          SELECT id FROM mst_staffs 
          WHERE payload->>'staff_code' = $1 OR payload->>'code' = $1 OR payload->>'nip' = $1 OR payload->>'id' = $1 OR id = $1
        `, [session.username]);
        if (stResult.rows.length > 0) {
          const rowId = stResult.rows[0].id;
          const uRes = await dbPool.query(`
            UPDATE mst_staffs 
            SET payload = jsonb_set(jsonb_set(payload::jsonb, '{password}', to_jsonb($1::text)), '{hasChangedPassword}', 'true'::jsonb)
            WHERE id = $2
          `, [nextPasswordHash, rowId]);
          if (uRes.rowCount > 0) success = true;
        }
      }

      if (!success) {
        const sResult = await dbPool.query(`
          SELECT id FROM mst_students 
          WHERE payload->>'nis' = $1 OR payload->>'code' = $1 OR payload->>'nisn' = $1 OR id = $1
        `, [session.username]);
        if (sResult.rows.length > 0) {
          const rowId = sResult.rows[0].id;
          const uRes = await dbPool.query(`
            UPDATE mst_students 
            SET payload = jsonb_set(jsonb_set(payload::jsonb, '{password}', to_jsonb($1::text)), '{hasChangedPassword}', 'true'::jsonb)
            WHERE id = $2
          `, [nextPasswordHash, rowId]);
          if (uRes.rowCount > 0) success = true;
        }
      }

      if (!success) {
        try {
          const uRes = await dbPool.query(`
            UPDATE users SET password = $1 WHERE username = $2 OR code = $2
          `, [nextPasswordHash, session.username]);
          if (uRes.rowCount > 0) success = true;
        } catch (e) {}
      }

      if (success) {
        send(req, res, 200, { ok: true, message: "Kata sandi Anda berhasil diperbarui!", isDefaultPassword: false, hasChangedPassword: true });
      } else {
        send(req, res, 200, { ok: false, message: "Gagal memperbarui kata sandi. Pengguna tidak ditemukan." });
      }
    } catch (err) {
      console.error("Change password route error:", err);
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  return false;
}

// Track whether BK tables have already been initialized in this process
let _bkTablesInitialized = false;

/**
 * initBkTables — dipanggil sekali saat server startup.
 * Bukan di setiap request agar tidak ada overhead DB.
 */
export async function initBkTables(dbPool) {
  if (_bkTablesInitialized || !dbPool) return;
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS bk_sessions (
        id SERIAL PRIMARY KEY,
        student_nis VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'Umum',
        session_date DATE NOT NULL DEFAULT CURRENT_DATE,
        problem TEXT,
        solution TEXT,
        follow_up_date DATE,
        status VARCHAR(50) DEFAULT 'Berjalan',
        counselor_nip VARCHAR(100),
        counselor_name VARCHAR(255),
        privacy_level VARCHAR(50) DEFAULT 'Terbatas',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bk_home_visits (
        id SERIAL PRIMARY KEY,
        student_nis VARCHAR(100) NOT NULL,
        visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
        result TEXT,
        photo_url TEXT,
        counselor_nip VARCHAR(100),
        counselor_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bk_letters (
        id SERIAL PRIMARY KEY,
        student_nis VARCHAR(100) NOT NULL,
        letter_type VARCHAR(100) NOT NULL,
        letter_no VARCHAR(100),
        issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'Diterbitkan',
        appointment_date DATE,
        appointment_time VARCHAR(100),
        appointment_place VARCHAR(255),
        appointed_person VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE bk_letters ADD COLUMN IF NOT EXISTS appointment_date DATE;
      ALTER TABLE bk_letters ADD COLUMN IF NOT EXISTS appointment_time VARCHAR(100);
      ALTER TABLE bk_letters ADD COLUMN IF NOT EXISTS appointment_place VARCHAR(255);
      ALTER TABLE bk_letters ADD COLUMN IF NOT EXISTS appointed_person VARCHAR(255);

      ALTER TABLE bk_home_visits ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
      ALTER TABLE bk_home_visits ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);
      ALTER TABLE bk_home_visits ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
      ALTER TABLE bk_home_visits ADD COLUMN IF NOT EXISTS updated_by_name VARCHAR(255);
      ALTER TABLE bk_home_visits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

      ALTER TABLE bk_letters ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
      ALTER TABLE bk_letters ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);
      ALTER TABLE bk_letters ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
      ALTER TABLE bk_letters ADD COLUMN IF NOT EXISTS updated_by_name VARCHAR(255);
      ALTER TABLE bk_letters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
    `);
    _bkTablesInitialized = true;
    console.log('[BK] Tables initialized successfully.');
  } catch (e) {
    console.warn('[BK] Failed to ensure BK tables:', e.message);
  }
}

export async function handleBkRoutes(req, res, url, ctx) {
  const { dbPool, send, sendDatabaseError, requireAuthenticated, getSession, readJsonBody, isAdminRole } = ctx;

  // Pastikan tabel BK sudah ada
  if (!_bkTablesInitialized && dbPool) {
    await initBkTables(dbPool);
  }

  // Peran yang boleh mengakses modul BK
  const BK_ALLOWED_ROLES = [
    'bk', 'bpbk', 'guru', 'walikelas', 'walas', 
    'admin', 'superadmin', 'waka', 'waka_kesiswaan', 
    'waka_kurikulum', 'waka_hubin', 'waka_sarpras', 'waka_humas',
    'kesiswaan', 'kurikulum', 'hubin', 'sarpras',
    'pembina_osis', 'sekretaris_osis', 'sekretaris_kesiswaan', 'anggota_kesiswaan',
    'sekretaris_kurikulum', 'anggota_kurikulum', 'sekretaris_hubin', 'anggota_hubin',
    'sekretaris_sarpras', 'anggota_sarpras', 'sekretaris_tu', 'bendahara',
    'kepsek', 'tu', 'tata_usaha', 'karyawan', 'staff'
  ];
  const requireBkAccess = (req, res) => {
    const session = getSession(req);
    if (!session) {
      send(req, res, 401, { ok: false, error: 'Sesi tidak valid. Silakan login ulang.' });
      return null;
    }
    const role = (session.role || '').toLowerCase();
    const subrole = (session.subrole || '').toLowerCase();
    const division = (session.division || '').toLowerCase();
    const isAllowed = BK_ALLOWED_ROLES.includes(role) ||
      BK_ALLOWED_ROLES.includes(subrole) ||
      role.includes('admin') ||
      role.startsWith('waka_') ||
      role.includes('kesiswaan') ||
      role.includes('bk') ||
      subrole.includes('kesiswaan') ||
      subrole.includes('bk') ||
      subrole.includes('osis') ||
      division === 'bk' ||
      division === 'kesiswaan' ||
      division === 'bpbk' ||
      division === 'bp/bk' ||
      Boolean(session.isBK) ||
      Boolean(session.isKesiswaan) ||
      Boolean(session.isSuperAdmin) ||
      Boolean(session.isAdmin) ||
      (typeof isAdminRole === 'function' && isAdminRole(role));
    if (!isAllowed) {
      send(req, res, 403, { ok: false, error: 'Akses ditolak. Anda tidak memiliki izin untuk mengelola data BK.' });
      return null;
    }
    return session;
  };

  // 1. GET /api/kedisiplinan/bk/dashboard-stats
  if (req.method === "GET" && url.pathname === "/api/kedisiplinan/bk/dashboard-stats") {
    const session = requireBkAccess(req, res);
    if (!session) return true;
    try {
      const statsRes = await dbPool.query(`
        SELECT 
          (SELECT COUNT(*) FROM bk_sessions WHERE status = 'Berjalan' OR status = 'Follow-up') as total_kasus_aktif,
          (SELECT COUNT(*) FROM bk_sessions WHERE EXTRACT(MONTH FROM session_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM session_date) = EXTRACT(YEAR FROM CURRENT_DATE)) as sesi_bulan_ini,
          (SELECT COUNT(*) FROM bk_home_visits WHERE EXTRACT(MONTH FROM visit_date) = EXTRACT(MONTH FROM CURRENT_DATE)) as home_visit_bulan_ini,
          (SELECT COUNT(*) FROM bk_letters WHERE EXTRACT(MONTH FROM issue_date) = EXTRACT(MONTH FROM CURRENT_DATE)) as surat_terbit_bulan_ini
      `);
      
      const categoryRes = await dbPool.query(`
        SELECT category, COUNT(*) as count 
        FROM bk_sessions 
        GROUP BY category
      `);

      send(req, res, 200, {
        ok: true,
        data: {
          stats: statsRes.rows[0] || {},
          categories: categoryRes.rows || []
        }
      });
    } catch (err) {
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  // 2. GET & POST /api/kedisiplinan/bk/sessions
  if (url.pathname === "/api/kedisiplinan/bk/sessions") {
    const session = requireBkAccess(req, res);
    if (!session) return true;
    if (req.method === "GET") {
      try {
        const { rows } = await dbPool.query(`
          SELECT b.*, 
                 COALESCE(s.payload->>'namaSiswa', s.payload->>'name', s.payload->>'nama', s.payload->>'nama_siswa') as student_name,
                 COALESCE(s.payload->>'class_name', s.payload->>'kelas', s.payload->>'className') as class_name
          FROM bk_sessions b
          LEFT JOIN mst_students s ON b.student_nis = s.id OR b.student_nis = s.payload->>'nis' OR b.student_nis = s.payload->>'code'
          ORDER BY b.session_date DESC, b.id DESC
        `);
        send(req, res, 200, { ok: true, data: rows });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }

    if (req.method === "POST") {
      const session = requireBkAccess(req, res);
      if (!session) return true;
      try {
        const body = await readJsonBody(req);
        const { student_nis, category, session_date, problem, solution, follow_up_date, status, privacy_level } = body;
        // BK-FIX-01: Validasi student_nis wajib — data BK tanpa NIS siswa tidak berarti
        const cleanNis = String(student_nis || '').trim();
        if (!cleanNis) {
          send(req, res, 400, { ok: false, error: 'NIS siswa wajib diisi.' });
          return true;
        }

        const result = await dbPool.query(`
          INSERT INTO bk_sessions (student_nis, category, session_date, problem, solution, follow_up_date, status, counselor_nip, counselor_name, privacy_level)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          cleanNis,
          category || 'Umum',
          session_date && String(session_date).trim() ? String(session_date).trim() : new Date().toISOString().slice(0, 10),
          problem || '',
          solution || '',
          follow_up_date && String(follow_up_date).trim() ? String(follow_up_date).trim() : null,
          status || 'Berjalan',
          session?.id || session?.nip || '',
          session?.name || session?.username || 'Guru BK',
          privacy_level || 'Terbatas'
        ]);

        send(req, res, 200, { ok: true, data: result.rows[0] });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }
  }

  // 3. PUT & DELETE /api/kedisiplinan/bk/sessions/:id
  if (url.pathname.startsWith("/api/kedisiplinan/bk/sessions/")) {
    const session = requireBkAccess(req, res);
    if (!session) return true;
    const id = parseInt(url.pathname.split("/").pop(), 10);
    // BK-FIX-02: Validasi NaN dari URL — cegah DELETE/PUT dengan id=NaN
    if (isNaN(id) || id <= 0) {
      send(req, res, 400, { ok: false, error: 'ID sesi konseling tidak valid.' });
      return true;
    }

    if (req.method === "PUT") {
      try {
        const body = await readJsonBody(req);
        const { student_nis, category, session_date, problem, solution, follow_up_date, status, privacy_level } = body;
        const cleanNis = student_nis && String(student_nis).trim() ? String(student_nis).trim() : null;
        const followUpParam = follow_up_date !== undefined ? (follow_up_date ? String(follow_up_date).trim() : '') : null;
        const result = await dbPool.query(`
          UPDATE bk_sessions 
          SET student_nis = COALESCE($1, student_nis),
              category = COALESCE($2, category),
              session_date = COALESCE($3, session_date),
              problem = COALESCE($4, problem),
              solution = COALESCE($5, solution),
              follow_up_date = CASE WHEN $6 = '' THEN NULL WHEN $6 IS NOT NULL THEN $6::date ELSE follow_up_date END,
              status = COALESCE($7, status),
              privacy_level = COALESCE($8, privacy_level)
          WHERE id = $9
          RETURNING *
        `, [
          cleanNis,
          category || null,
          session_date && String(session_date).trim() ? String(session_date).trim() : null,
          problem !== undefined ? problem : null,
          solution !== undefined ? solution : null,
          followUpParam,
          status || null,
          privacy_level || null,
          id
        ]);

        send(req, res, 200, { ok: true, data: result.rows[0] });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }

    if (req.method === "DELETE") {
      try {
        await dbPool.query("DELETE FROM bk_sessions WHERE id = $1", [id]);
        send(req, res, 200, { ok: true, message: "Sesi konseling berhasil dihapus" });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }
  }

  // 4. GET & POST /api/kedisiplinan/bk/home-visits
  if (url.pathname === "/api/kedisiplinan/bk/home-visits") {
    const session = requireBkAccess(req, res);
    if (!session) return true;
    if (req.method === "GET") {
      try {
        const { rows } = await dbPool.query(`
          SELECT h.*, 
                 COALESCE(h.created_by_name, h.counselor_name, 'Guru BK') as created_by_name,
                 COALESCE(s.payload->>'namaSiswa', s.payload->>'name', s.payload->>'nama', s.payload->>'nama_siswa') as student_name,
                 COALESCE(s.payload->>'class_name', s.payload->>'kelas', s.payload->>'className') as class_name
          FROM bk_home_visits h
          LEFT JOIN mst_students s ON h.student_nis = s.id OR h.student_nis = s.payload->>'nis' OR h.student_nis = s.payload->>'code'
          ORDER BY h.visit_date DESC, h.id DESC
        `);
        send(req, res, 200, { ok: true, data: rows });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }

    if (req.method === "POST") {
      const session = requireBkAccess(req, res);
      if (!session) return true;
      try {
        const body = await readJsonBody(req);
        const { student_nis, visit_date, result, photo_url } = body;
        // BK-FIX-01: Validasi student_nis wajib
        const cleanNis = String(student_nis || '').trim();
        if (!cleanNis) {
          send(req, res, 400, { ok: false, error: 'NIS siswa wajib diisi.' });
          return true;
        }
        const currentUserName = session?.name || session?.username || 'Guru BK';
        const currentUserId = session?.id || session?.nip || session?.username || '';

        const resQuery = await dbPool.query(`
          INSERT INTO bk_home_visits (
            student_nis, visit_date, result, photo_url, counselor_nip, counselor_name,
            created_by, created_by_name
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
          cleanNis,
          visit_date && String(visit_date).trim() ? String(visit_date).trim() : new Date().toISOString().slice(0, 10),
          result || '',
          photo_url || null,
          currentUserId,
          currentUserName,
          currentUserId,
          currentUserName
        ]);

        send(req, res, 200, { ok: true, data: resQuery.rows[0] });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }
  }

  // 4b. DELETE & PUT /api/kedisiplinan/bk/home-visits/:id
  if (url.pathname.startsWith("/api/kedisiplinan/bk/home-visits/")) {
    const session = requireBkAccess(req, res);
    if (!session) return true;
    const id = parseInt(url.pathname.split("/").pop(), 10);
    // BK-FIX-02: Validasi NaN dari URL
    if (isNaN(id) || id <= 0) {
      send(req, res, 400, { ok: false, error: 'ID kunjungan tidak valid.' });
      return true;
    }
    if (req.method === "PUT") {
      try {
        const body = await readJsonBody(req);
        const { student_nis, visit_date, result, photo_url } = body;
        const cleanNis = student_nis && String(student_nis).trim() ? String(student_nis).trim() : null;
        const currentUserName = session?.name || session?.username || 'Guru BK';
        const currentUserId = session?.id || session?.nip || session?.username || '';
        const resQuery = await dbPool.query(`
          UPDATE bk_home_visits
          SET student_nis = COALESCE($1, student_nis),
              visit_date = COALESCE($2, visit_date),
              result = COALESCE($3, result),
              photo_url = COALESCE($4, photo_url),
              updated_by = $5,
              updated_by_name = $6,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $7
          RETURNING *
        `, [
          cleanNis,
          visit_date && String(visit_date).trim() ? String(visit_date).trim() : null,
          result !== undefined ? result : null,
          photo_url !== undefined ? photo_url : null,
          currentUserId,
          currentUserName,
          id
        ]);
        send(req, res, 200, { ok: true, data: resQuery.rows[0] });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }
    if (req.method === "DELETE") {
      try {
        await dbPool.query("DELETE FROM bk_home_visits WHERE id = $1", [id]);
        send(req, res, 200, { ok: true, message: "Jurnal kunjungan rumah berhasil dihapus" });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }
  }

  // 5. GET & POST /api/kedisiplinan/bk/letters
  if (url.pathname === "/api/kedisiplinan/bk/letters") {
    const session = requireBkAccess(req, res);
    if (!session) return true;
    if (req.method === "GET") {
      try {
        const { rows } = await dbPool.query(`
          SELECT l.*, 
                 COALESCE(l.created_by_name, 'Guru BK') as created_by_name,
                 COALESCE(s.payload->>'namaSiswa', s.payload->>'name', s.payload->>'nama', s.payload->>'nama_siswa') as student_name,
                 COALESCE(s.payload->>'class_name', s.payload->>'kelas', s.payload->>'className') as class_name,
                 s.payload->>'nisn' as student_nisn
          FROM bk_letters l
          LEFT JOIN mst_students s ON l.student_nis = s.id OR l.student_nis = s.payload->>'nis' OR l.student_nis = s.payload->>'code'
          ORDER BY l.issue_date DESC, l.id DESC
        `);
        send(req, res, 200, { ok: true, data: rows });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }

    if (req.method === "POST") {
      const session = requireBkAccess(req, res);
      if (!session) return true;
      try {
        const body = await readJsonBody(req);
        const { 
          student_nis, letter_type, letter_no, issue_date, reason, 
          appointment_date, appointment_time, appointment_place, appointed_person 
        } = body;
        const currentUserName = session?.name || session?.username || 'Guru BK';
        const currentUserId = session?.id || session?.nip || session?.username || '';

        // BUG-B FIX: Validasi student_nis wajib — konsisten dengan bk/sessions & bk/home-visits
        const cleanNis = String(student_nis || '').trim();
        if (!cleanNis) {
          send(req, res, 400, { ok: false, error: 'NIS siswa wajib diisi.' });
          return true;
        }

        const resQuery = await dbPool.query(`
          INSERT INTO bk_letters (
            student_nis, letter_type, letter_no, issue_date, reason, 
            appointment_date, appointment_time, appointment_place, appointed_person,
            created_by, created_by_name
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `, [
          cleanNis,
          letter_type || 'Panggilan Orang Tua',
          letter_no || `BK/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
          issue_date && String(issue_date).trim() ? String(issue_date).trim() : new Date().toISOString().slice(0, 10),
          reason || '',
          appointment_date && String(appointment_date).trim() ? String(appointment_date).trim() : null,
          appointment_time || '09.00 WIB s/d Selesai',
          appointment_place || 'Ruang Bimbingan & Konseling (BK)',
          appointed_person || 'Guru BK / Koordinator BK',
          currentUserId,
          currentUserName
        ]);

        send(req, res, 200, { ok: true, data: resQuery.rows[0] });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }
  }

  // 5b. PUT & DELETE /api/kedisiplinan/bk/letters/:id
  if (url.pathname.startsWith("/api/kedisiplinan/bk/letters/")) {
    const session = requireBkAccess(req, res);
    if (!session) return true;
    const id = parseInt(url.pathname.split("/").pop(), 10);
    // BK-FIX-02: Validasi NaN dari URL
    if (isNaN(id) || id <= 0) {
      send(req, res, 400, { ok: false, error: 'ID surat BK tidak valid.' });
      return true;
    }

    if (req.method === "PUT") {
      try {
        const body = await readJsonBody(req);
        const { 
          student_nis, letter_type, letter_no, issue_date, reason, 
          appointment_date, appointment_time, appointment_place, appointed_person 
        } = body;
        const cleanNis = student_nis && String(student_nis).trim() ? String(student_nis).trim() : null;
        const apptDateParam = appointment_date !== undefined ? (appointment_date ? String(appointment_date).trim() : '') : null;
        const currentUserName = session?.name || session?.username || 'Guru BK';
        const currentUserId = session?.id || session?.nip || session?.username || '';

        const resQuery = await dbPool.query(`
          UPDATE bk_letters 
          SET student_nis = COALESCE($1, student_nis),
              letter_type = COALESCE($2, letter_type),
              letter_no = COALESCE($3, letter_no),
              issue_date = COALESCE($4, issue_date),
              reason = COALESCE($5, reason),
              appointment_date = CASE WHEN $6 = '' THEN NULL WHEN $6 IS NOT NULL THEN $6::date ELSE appointment_date END,
              appointment_time = COALESCE($7, appointment_time),
              appointment_place = COALESCE($8, appointment_place),
              appointed_person = COALESCE($9, appointed_person),
              updated_by = $10,
              updated_by_name = $11,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $12
          RETURNING *
        `, [
          cleanNis,
          letter_type || null,
          letter_no || null,
          issue_date && String(issue_date).trim() ? String(issue_date).trim() : null,
          reason !== undefined ? reason : null,
          apptDateParam,
          appointment_time || null,
          appointment_place || null,
          appointed_person || null,
          currentUserId,
          currentUserName,
          id
        ]);

        send(req, res, 200, { ok: true, data: resQuery.rows[0] });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }

    if (req.method === "DELETE") {
      try {
        await dbPool.query("DELETE FROM bk_letters WHERE id = $1", [id]);
        send(req, res, 200, { ok: true, message: "Surat BK berhasil dihapus" });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }
  }

  return false;
}

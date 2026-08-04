export async function handleBkRoutes(req, res, url, ctx) {
  const { dbPool, send, sendDatabaseError, requireAuthenticated, getSession, readJsonBody, isAdminRole } = ctx;

  // Initialize DB tables for BK module
  if (dbPool) {
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {
      console.warn("Failed to ensure BK tables:", e.message);
    }
  }

  // 1. GET /api/kedisiplinan/bk/dashboard-stats
  if (req.method === "GET" && url.pathname === "/api/kedisiplinan/bk/dashboard-stats") {
    if (!requireAuthenticated(req, res)) return true;
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
    if (!requireAuthenticated(req, res)) return true;
    if (req.method === "GET") {
      try {
        const { rows } = await dbPool.query(`
          SELECT b.*, 
                 s.payload->>'name' as student_name,
                 COALESCE(s.payload->>'kelas', s.payload->>'class_name') as class_name
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
      try {
        const body = await readJsonBody(req);
        const session = getSession(req);
        const { student_nis, category, session_date, problem, solution, follow_up_date, status, privacy_level } = body;

        const result = await dbPool.query(`
          INSERT INTO bk_sessions (student_nis, category, session_date, problem, solution, follow_up_date, status, counselor_nip, counselor_name, privacy_level)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          student_nis,
          category || 'Umum',
          session_date || new Date().toISOString().slice(0, 10),
          problem || '',
          solution || '',
          follow_up_date || null,
          status || 'Berjalan',
          session?.id || '',
          session?.name || 'Guru BK',
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
    if (!requireAuthenticated(req, res)) return true;
    const id = parseInt(url.pathname.split("/").pop(), 10);

    if (req.method === "PUT") {
      try {
        const body = await readJsonBody(req);
        const { category, session_date, problem, solution, follow_up_date, status, privacy_level } = body;
        const result = await dbPool.query(`
          UPDATE bk_sessions 
          SET category = $1, session_date = $2, problem = $3, solution = $4, follow_up_date = $5, status = $6, privacy_level = $7
          WHERE id = $8
          RETURNING *
        `, [category, session_date, problem, solution, follow_up_date, status, privacy_level, id]);

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
    if (!requireAuthenticated(req, res)) return true;
    if (req.method === "GET") {
      try {
        const { rows } = await dbPool.query(`
          SELECT h.*, 
                 s.payload->>'name' as student_name,
                 COALESCE(s.payload->>'kelas', s.payload->>'class_name') as class_name
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
      try {
        const body = await readJsonBody(req);
        const session = getSession(req);
        const { student_nis, visit_date, result, photo_url } = body;

        const resQuery = await dbPool.query(`
          INSERT INTO bk_home_visits (student_nis, visit_date, result, photo_url, counselor_nip, counselor_name)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          student_nis,
          visit_date || new Date().toISOString().slice(0, 10),
          result || '',
          photo_url || null,
          session?.id || '',
          session?.name || 'Guru BK'
        ]);

        send(req, res, 200, { ok: true, data: resQuery.rows[0] });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }
  }

  // 5. GET & POST /api/kedisiplinan/bk/letters
  if (url.pathname === "/api/kedisiplinan/bk/letters") {
    if (!requireAuthenticated(req, res)) return true;
    if (req.method === "GET") {
      try {
        const { rows } = await dbPool.query(`
          SELECT l.*, 
                 s.payload->>'name' as student_name,
                 COALESCE(s.payload->>'kelas', s.payload->>'class_name') as class_name
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
      try {
        const body = await readJsonBody(req);
        const { student_nis, letter_type, letter_no, issue_date, reason } = body;

        const resQuery = await dbPool.query(`
          INSERT INTO bk_letters (student_nis, letter_type, letter_no, issue_date, reason)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [
          student_nis,
          letter_type || 'Panggilan Orang Tua',
          letter_no || `BK/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
          issue_date || new Date().toISOString().slice(0, 10),
          reason || ''
        ]);

        send(req, res, 200, { ok: true, data: resQuery.rows[0] });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }
  }

  return false;
}

export async function handleStudentRoutes(req, res, url, ctx) {
  const { dbPool, send, requireAuthenticated, readJsonBody, normalizeServerRole, sendDatabaseError } = ctx;

  if (url.pathname === '/api/students' && req.method === 'GET') {
    if (!requireAuthenticated(req, res)) return true;
    try {
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const search = url.searchParams.get('search') || '';
      const offset = (page - 1) * limit;

      let query = 'SELECT payload FROM mst_students';
      let countQuery = 'SELECT COUNT(*) as total FROM mst_students';
      const params = [];
      
      const filterClass = url.searchParams.get('class_name');
      
      if (search) {
        query += ' WHERE (payload->>\'name\' ILIKE $1 OR payload->>\'nis\' ILIKE $1)';
        countQuery += ' WHERE (payload->>\'name\' ILIKE $1 OR payload->>\'nis\' ILIKE $1)';
        params.push(`%${search}%`);
      }

      if (filterClass && filterClass !== 'Semua') {
        const classFilterStr = `payload->>'class_name' = $${params.length + 1}`;
        if (params.length === 0) {
          query += ` WHERE ${classFilterStr}`;
          countQuery += ` WHERE ${classFilterStr}`;
        } else {
          query += ` AND ${classFilterStr}`;
          countQuery += ` AND ${classFilterStr}`;
        }
        params.push(filterClass);
      }

      query += ` ORDER BY id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      
      const [countResult, rowsResult] = await Promise.all([
        dbPool.query(countQuery, params),
        dbPool.query(query, [...params, limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const students = rowsResult.rows.map(r => {
         const p = r.payload;
         if (p && p.password) delete p.password;
         return p;
      });

      send(req, res, 200, {
        ok: true,
        data: students,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (e) {
      console.error('Failed to fetch students:', e);
      sendDatabaseError(req, res, e);
    }
    return true;
  }

  // Handle saving multiple students (e.g., from DataSiswa page)
  if (url.pathname === '/api/students/save' && req.method === 'POST') {
    const session = requireAuthenticated(req, res);
    if (!session) return true;
    if (!['admin', 'superadmin', 'tu'].includes(normalizeServerRole(session.role))) {
      send(req, res, 403, { ok: false, error: 'Hanya admin yang dapat menyimpan data' });
      return true;
    }

    try {
      let body;
      try {
        body = await readJsonBody(req);
      } catch (err) {
        send(req, res, 400, { ok: false, error: 'Invalid JSON body' });
        return true;
      }

      const students = body.students || [];
      if (!Array.isArray(students)) {
        send(req, res, 400, { ok: false, error: 'students must be an array' });
        return true;
      }

      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');
        
        // Fetch existing passwords before deletion
        const oldPasswordsResult = await client.query('SELECT payload->>\'nis\' as nis, payload->>\'password\' as password FROM mst_students WHERE payload->>\'password\' IS NOT NULL');
        const dbStudentMap = new Map();
        for (const row of oldPasswordsResult.rows) {
          if (row.nis) dbStudentMap.set(row.nis.toLowerCase().trim(), row.password);
        }

        await client.query('DELETE FROM mst_students');
        
        const uniqueItems = [];
        const seenIds = new Set();

        for (const item of students) {
          if (!item) continue;
          const nis = String(item.nis || '').trim();
          const normalizedId = nis.toLowerCase();
          if (!normalizedId || seenIds.has(normalizedId)) continue;
          
          if (!item.password) {
             const oldPw = dbStudentMap.get(normalizedId);
             if (oldPw) item.password = oldPw;
          }

          seenIds.add(normalizedId);
          uniqueItems.push({ rowId: normalizedId, val: item });
        }

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
            await client.query(`INSERT INTO mst_students (id, payload) VALUES ${values.join(', ')}`, params);
          }
        }
        await client.query('COMMIT');
        send(req, res, 200, { ok: true, message: 'Data siswa berhasil disimpan' });
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('Failed to save students:', e);
        send(req, res, 500, { ok: false, error: 'Database error while saving students' });
      } finally {
        client.release();
      }
    } catch (e) {
      console.error(e);
      sendDatabaseError(req, res, e);
    }
    return true;
  }

  return false;
}

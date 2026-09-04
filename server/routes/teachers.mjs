export async function handleTeacherRoutes(req, res, url, ctx) {
  const { dbPool, send, requireAuthenticated, readJsonBody, normalizeServerRole, sendDatabaseError } = ctx;

  if (url.pathname === '/api/teachers' && req.method === 'GET') {
    if (!requireAuthenticated(req, res)) return true;
    try {
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const search = url.searchParams.get('search') || '';
      const offset = (page - 1) * limit;

      let query = 'SELECT payload FROM mst_teachers';
      let countQuery = 'SELECT COUNT(*) as total FROM mst_teachers';
      const params = [];
      
      const filterType = url.searchParams.get('type');
      const filterRole = url.searchParams.get('role');
      
      if (search) {
        query += ' WHERE (payload->>\'name\' ILIKE $1 OR payload->>\'code\' ILIKE $1)';
        countQuery += ' WHERE (payload->>\'name\' ILIKE $1 OR payload->>\'code\' ILIKE $1)';
        params.push(`%${search}%`);
      }

      if (filterType && filterType !== 'Semua') {
        const typeFilterStr = `payload->>'type' = $${params.length + 1}`;
        if (params.length === 0) {
          query += ` WHERE ${typeFilterStr}`;
          countQuery += ` WHERE ${typeFilterStr}`;
        } else {
          query += ` AND ${typeFilterStr}`;
          countQuery += ` AND ${typeFilterStr}`;
        }
        params.push(filterType);
      }

      if (filterRole && filterRole !== 'Semua') {
        const roleFilterStr = `payload->>'role' = $${params.length + 1}`;
        if (params.length === 0) {
          query += ` WHERE ${roleFilterStr}`;
          countQuery += ` WHERE ${roleFilterStr}`;
        } else {
          query += ` AND ${roleFilterStr}`;
          countQuery += ` AND ${roleFilterStr}`;
        }
        params.push(filterRole);
      }

      query += ` ORDER BY id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      
      const [countResult, rowsResult] = await Promise.all([
        dbPool.query(countQuery, params),
        dbPool.query(query, [...params, limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const teachers = rowsResult.rows.map(r => {
         const p = r.payload;
         if (p && p.password) delete p.password;
         return p;
      });

      send(req, res, 200, {
        ok: true,
        data: teachers,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (e) {
      console.error('Failed to fetch teachers:', e);
      sendDatabaseError(req, res, e);
    }
    return true;
  }

  // Handle saving multiple teachers (e.g., from DataGuru page)
  if (url.pathname === '/api/teachers/save' && req.method === 'POST') {
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

      const teachers = body.teachers || [];
      if (!Array.isArray(teachers)) {
        send(req, res, 400, { ok: false, error: 'teachers must be an array' });
        return true;
      }

      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');
        
        // Fetch existing passwords before deletion
        const oldPasswordsResult = await client.query('SELECT payload->>\'code\' as code, payload->>\'password\' as password FROM mst_teachers WHERE payload->>\'password\' IS NOT NULL');
        const dbTeacherMap = new Map();
        for (const row of oldPasswordsResult.rows) {
          if (row.code) dbTeacherMap.set(row.code.toLowerCase().trim(), row.password);
        }

        await client.query('DELETE FROM mst_teachers');
        
        const uniqueItems = [];
        const seenIds = new Set();

        for (const item of teachers) {
          if (!item) continue;
          const code = String(item.code || '').trim();
          const normalizedId = code.toLowerCase();
          if (!normalizedId || seenIds.has(normalizedId)) continue;
          
          if (!item.password) {
             const oldPw = dbTeacherMap.get(normalizedId);
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
            await client.query(`INSERT INTO mst_teachers (id, payload) VALUES ${values.join(', ')}`, params);
          }
        }
        await client.query('COMMIT');
        send(req, res, 200, { ok: true, message: 'Data guru berhasil disimpan' });
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('Failed to save teachers:', e);
        send(req, res, 500, { ok: false, error: 'Database error while saving teachers' });
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

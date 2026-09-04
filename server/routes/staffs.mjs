export async function handleStaffRoutes(req, res, url, ctx) {
  const { dbPool, send, requireAuthenticated, readJsonBody, normalizeServerRole, sendDatabaseError } = ctx;

  if (url.pathname === '/api/staffs' && req.method === 'GET') {
    if (!requireAuthenticated(req, res)) return true;
    try {
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const search = url.searchParams.get('search') || '';
      const offset = (page - 1) * limit;

      let query = 'SELECT payload FROM mst_staffs';
      let countQuery = 'SELECT COUNT(*) as total FROM mst_staffs';
      const params = [];
      
      const filterDivision = url.searchParams.get('division');

      if (search) {
        query += ' WHERE (payload->>\'name\' ILIKE $1 OR payload->>\'code\' ILIKE $1 OR payload->>\'staff_code\' ILIKE $1)';
        countQuery += ' WHERE (payload->>\'name\' ILIKE $1 OR payload->>\'code\' ILIKE $1 OR payload->>\'staff_code\' ILIKE $1)';
        params.push(`%${search}%`);
      }

      if (filterDivision && filterDivision !== 'Semua') {
        const divisionFilterStr = `payload->>'division' = $${params.length + 1}`;
        if (params.length === 0) {
          query += ` WHERE ${divisionFilterStr}`;
          countQuery += ` WHERE ${divisionFilterStr}`;
        } else {
          query += ` AND ${divisionFilterStr}`;
          countQuery += ` AND ${divisionFilterStr}`;
        }
        params.push(filterDivision);
      }

      query += ` ORDER BY id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      
      const [countResult, rowsResult] = await Promise.all([
        dbPool.query(countQuery, params),
        dbPool.query(query, [...params, limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const staffs = rowsResult.rows.map(r => {
         const p = r.payload;
         if (p && p.password) delete p.password;
         return p;
      });

      send(req, res, 200, {
        ok: true,
        data: staffs,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (e) {
      console.error('Failed to fetch staffs:', e);
      sendDatabaseError(req, res, e);
    }
    return true;
  }

  // Handle saving multiple staffs
  if (url.pathname === '/api/staffs/save' && req.method === 'POST') {
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

      const staffs = body.staffs || [];
      if (!Array.isArray(staffs)) {
        send(req, res, 400, { ok: false, error: 'staffs must be an array' });
        return true;
      }

      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');
        
        // Fetch existing passwords before deletion
        const oldPasswordsResult = await client.query('SELECT payload->>\'code\' as code, payload->>\'staff_code\' as staff_code, payload->>\'password\' as password FROM mst_staffs WHERE payload->>\'password\' IS NOT NULL');
        const dbStaffMap = new Map();
        for (const row of oldPasswordsResult.rows) {
          const key = row.code || row.staff_code;
          if (key) dbStaffMap.set(key.toLowerCase().trim(), row.password);
        }

        await client.query('DELETE FROM mst_staffs');
        
        const uniqueItems = [];
        const seenIds = new Set();

        for (const item of staffs) {
          if (!item) continue;
          const code = String(item.code || item.staff_code || '').trim();
          const normalizedId = code.toLowerCase();
          if (!normalizedId || seenIds.has(normalizedId)) continue;
          
          if (!item.password) {
             const oldPw = dbStaffMap.get(normalizedId);
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
            await client.query(`INSERT INTO mst_staffs (id, payload) VALUES ${values.join(', ')}`, params);
          }
        }
        await client.query('COMMIT');
        send(req, res, 200, { ok: true, message: 'Data staff berhasil disimpan' });
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('Failed to save staffs:', e);
        send(req, res, 500, { ok: false, error: 'Database error while saving staffs' });
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

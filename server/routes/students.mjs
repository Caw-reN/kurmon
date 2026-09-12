import { generateStudentCardToken } from '../utils/studentCardSecurity.mjs';

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
         if (p && p.nis) p.card_token = generateStudentCardToken(p.nis);
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
        
        // Fetch existing passwords & photos BEFORE any write (preserve them)
        const oldDataResult = await client.query("SELECT payload->>'nis' as nis, payload->>'password' as password, payload->>'photo' as photo FROM mst_students WHERE payload IS NOT NULL");
        const dbStudentMap = new Map();
        for (const row of oldDataResult.rows) {
          if (row.nis) dbStudentMap.set(row.nis.toLowerCase().trim(), { password: row.password, photo: row.photo });
        }

        // Deduplicate dan bangun daftar ID yang akan disimpan
        const uniqueItems = [];
        const seenIds = new Set();
        const incomingIds = [];

        for (const item of students) {
          if (!item) continue;
          const nis = String(item.nis || '').trim();
          const normalizedId = nis.toLowerCase();
          if (!normalizedId || seenIds.has(normalizedId)) continue;
          
          const oldData = dbStudentMap.get(normalizedId);
          // Restore password lama jika tidak dikirim dari client
          if (!item.password && oldData?.password) {
            item.password = oldData.password;
          }
          // Restore photo lama jika tidak dikirim dari client
          if (!item.photo && oldData?.photo) {
            item.photo = oldData.photo;
          }

          seenIds.add(normalizedId);
          incomingIds.push(normalizedId);
          uniqueItems.push({ rowId: normalizedId, val: item });
        }

        // UPSERT: INSERT jika baru, UPDATE jika sudah ada (tabel tidak pernah kosong sesaat)
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
              `INSERT INTO mst_students (id, payload) VALUES ${values.join(', ')}
               ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
              params
            );
          }
        }

        // Hapus secara selektif: hanya siswa yang sudah tidak ada di daftar baru
        if (incomingIds.length > 0) {
          const placeholders = incomingIds.map((_, i) => `$${i + 1}`).join(', ');
          await client.query(`DELETE FROM mst_students WHERE id NOT IN (${placeholders})`, incomingIds);
        } else {
          // Jika daftar kosong (misal: reset total), baru hapus semua
          await client.query('DELETE FROM mst_students');
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

  // Handle saving single student photo (from KartuPelajar or DataSiswa)
  if (url.pathname === '/api/students/photo' && req.method === 'POST') {
    const session = requireAuthenticated(req, res);
    if (!session) return true;

    try {
      const body = await readJsonBody(req);
      const { nis, photo } = body;
      if (!nis) {
        send(req, res, 400, { ok: false, error: 'NIS wajib disertakan' });
        return true;
      }

      const cleanNis = String(nis).trim();
      const normalizedId = cleanNis.toLowerCase();

      // Update in mst_students
      const updateRes = await dbPool.query(
        `UPDATE mst_students 
         SET payload = jsonb_set(payload, '{photo}', to_jsonb($1::text), true)
         WHERE id = $2 OR payload->>'nis' = $2
         RETURNING payload`,
        [photo || '', cleanNis]
      );

      if (updateRes.rows.length === 0) {
        await dbPool.query(
          `UPDATE mst_students 
           SET payload = jsonb_set(payload, '{photo}', to_jsonb($1::text), true)
           WHERE id = $2
           RETURNING payload`,
          [photo || '', normalizedId]
        );
      }

      send(req, res, 200, { ok: true, message: 'Foto siswa berhasil disimpan ke database', nis: cleanNis });
    } catch (err) {
      console.error('Failed to save student photo:', err);
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  // Handle bulk student photos upload
  if (url.pathname === '/api/students/photos/bulk' && req.method === 'POST') {
    const session = requireAuthenticated(req, res);
    if (!session) return true;

    try {
      const body = await readJsonBody(req);
      const photosMap = body.photos || {}; // { [nis]: base64Data }
      const entries = Object.entries(photosMap);

      if (entries.length === 0) {
        send(req, res, 400, { ok: false, error: 'Tidak ada foto yang dikirim' });
        return true;
      }

      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');
        let updatedCount = 0;

        for (const [nis, photoBase64] of entries) {
          if (!nis || !photoBase64) continue;
          const cleanNis = String(nis).trim();
          const r = await client.query(
            `UPDATE mst_students 
             SET payload = jsonb_set(payload, '{photo}', to_jsonb($1::text), true)
             WHERE id = $2 OR id = $3 OR payload->>'nis' = $2`,
            [photoBase64, cleanNis, cleanNis.toLowerCase()]
          );
          if (r.rowCount > 0) updatedCount++;
        }

        await client.query('COMMIT');
        send(req, res, 200, { ok: true, message: `${updatedCount} foto siswa berhasil disimpan ke server`, updatedCount });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Failed to bulk save student photos:', err);
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  return false;
}

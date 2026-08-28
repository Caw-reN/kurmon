export async function handleAdministrasiRoutes(req, res, url, ctx) {
  const { dbPool, send, sendDatabaseError, requireAuthenticated, getSession, readJsonBody, logAudit } = ctx;

  // === KATEGORI ADMINISTRASI ===
  if (url.pathname.startsWith('/api/administrasi-kategori')) {
    if (!requireAuthenticated(req, res)) return true;
    
    try {
      if (req.method === 'GET') {
        const { rows } = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'administrasi_guru_kategori'");
        let categories = [];
        if (rows.length > 0 && rows[0].data) {
          categories = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        } else {
          // Defaults if not set
          categories = [
            "Kalender pendidikan",
            "PROTA dan PROMES",
            "CP, ATP dan TP",
            "Modul Ajar",
            "Modul projek (P5) jika ada",
            "LKPD"
          ];
        }
        send(req, res, 200, { ok: true, data: categories });
        return true;
      }

      if (req.method === 'POST') {
        const session = getSession(req);
        // Only admin or kurikulum (waka) can edit categories
        const role = session?.role || '';
        if (!['admin', 'superadmin', 'waka'].includes(role)) {
           send(req, res, 403, { ok: false, error: 'Akses ditolak.' });
           return true;
        }

        const body = await readJsonBody(req);
        if (!Array.isArray(body.categories)) {
           send(req, res, 400, { ok: false, error: 'Format data kategori tidak valid.' });
           return true;
        }

        await dbPool.query(
          "INSERT INTO app_data (store_key, data) VALUES ('administrasi_guru_kategori', $1) ON CONFLICT (store_key) DO UPDATE SET data = $1, updated_at = CURRENT_TIMESTAMP",
          [JSON.stringify(body.categories)]
        );
        
        await logAudit(dbPool, session, req, "UPDATE", "app_data", "Mengubah kategori Administrasi Guru");
        send(req, res, 200, { ok: true, message: 'Kategori berhasil diperbarui.' });
        return true;
      }
    } catch (err) {
      console.error('Administrasi Kategori API Error:', err);
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  // === DATA ADMINISTRASI GURU ===
  if (url.pathname.startsWith('/api/administrasi-guru') || url.pathname.startsWith('/api/modul-ajar-guru')) {
    if (!requireAuthenticated(req, res)) return true;
    const session = getSession(req);

    if (req.method === 'GET' && url.pathname.includes('/file/')) {
      try {
        const id = url.pathname.split('/').pop();
        const { rows } = await dbPool.query("SELECT file_url FROM modul_ajar_guru WHERE id = $1", [id]);
        if (rows.length > 0) {
          send(req, res, 200, { ok: true, file_url: rows[0].file_url });
        } else {
          send(req, res, 404, { ok: false, error: 'File tidak ditemukan' });
        }
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return true;
    }

    try {
      if (req.method === 'GET') {
        const role = session?.role || '';
        const filterTeacher = url.searchParams.get('teacher_code') || '';
        const filterTahunAjaran = url.searchParams.get('tahun_ajaran') || '';
        const filterKategori = url.searchParams.get('kategori') || '';
        
        // Admin & Kurikulum can see all, Guru sees only theirs
        const isKurikulum = ['admin', 'superadmin', 'waka'].includes(role);

        let query = `
          SELECT id, teacher_code, teacher_name, nama_dokumen, 'lazy' as file_url, tahun_ajaran, 
                 TO_CHAR(uploaded_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as uploaded_at, 
                 mapel, kelas, semester, deskripsi, kategori
          FROM modul_ajar_guru 
          WHERE 1=1
        `;
        const params = [];

        if (!isKurikulum) {
          params.push(session?.code || session?.id || session?.username || '');
          query += ` AND teacher_code = $${params.length}`;
        } else if (filterTeacher) {
          params.push(filterTeacher);
          query += ` AND teacher_code = $${params.length}`;
        }

        if (filterTahunAjaran) {
          params.push(filterTahunAjaran);
          query += ` AND tahun_ajaran = $${params.length}`;
        }

        if (filterKategori) {
           params.push(filterKategori);
           query += ` AND kategori = $${params.length}`;
        }

        query += ` ORDER BY uploaded_at DESC`;

        const { rows } = await dbPool.query(query, params);
        send(req, res, 200, { ok: true, data: rows });
        return true;
      }

      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        const teacherCode = session?.code || session?.id || session?.username || '';
        const teacherName = session?.name || '';
        const role = session?.role || '';
        const isAdmin = ['admin', 'superadmin', 'waka'].includes(role);

        if (body.action === 'delete') {
          if (isAdmin) {
            await dbPool.query('DELETE FROM modul_ajar_guru WHERE id = $1', [body.id]);
          } else {
            await dbPool.query('DELETE FROM modul_ajar_guru WHERE id = $1 AND teacher_code = $2', [body.id, teacherCode]);
          }
          send(req, res, 200, { ok: true });
          return true;
        }

        if (body.id) {
          // Update
          const updateQuery = isAdmin 
            ? `UPDATE modul_ajar_guru SET nama_dokumen = $1, tahun_ajaran = $2, mapel = $3, kelas = $4, semester = $5, deskripsi = $6, kategori = $7 WHERE id = $8`
            : `UPDATE modul_ajar_guru SET nama_dokumen = $1, tahun_ajaran = $2, mapel = $3, kelas = $4, semester = $5, deskripsi = $6, kategori = $7 WHERE id = $8 AND teacher_code = $9`;
          
          const params = [
            body.nama_dokumen || '', body.tahun_ajaran || '', body.mapel || '', body.kelas || '', body.semester || '', body.deskripsi || '', body.kategori || 'Modul Ajar', body.id
          ];
          if (!isAdmin) params.push(teacherCode);

          await dbPool.query(updateQuery, params);
        } else {
          // Insert
          await dbPool.query(`
            INSERT INTO modul_ajar_guru (teacher_code, teacher_name, nama_dokumen, file_url, tahun_ajaran, mapel, kelas, semester, deskripsi, kategori)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            teacherCode, teacherName, body.nama_dokumen || '', body.file_url || '', body.tahun_ajaran || '', body.mapel || '', body.kelas || '', body.semester || '', body.deskripsi || '', body.kategori || 'Modul Ajar'
          ]);
        }
        
        send(req, res, 200, { ok: true });
        return true;
      }
    } catch (err) {
      console.error('Administrasi Guru API Error:', err);
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  return false;
}

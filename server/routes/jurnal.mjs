/**
 * server/routes/jurnal.mjs
 * 
 * API routes untuk:
 * 1. Jurnal Harian Guru (KBM) — /api/jurnal/harian
 * 2. Catatan Wali Kelas — /api/kesiswaan/catatan-walikelas
 * 3. Absensi Kelas KBM (read-only preview) — /api/kedisiplinan/absensi-kelas
 */

export async function handleJurnalRoutes(req, res, url, ctx) {
  const { dbPool, send, sendDatabaseError, requireAuthenticated, getSession, readJsonBody } = ctx;

  // === JURNAL HARIAN GURU ===
  if (url.pathname.startsWith('/api/jurnal/')) {
    if (!requireAuthenticated(req, res)) return;
    const session = getSession(req);

    try {
      // GET /api/jurnal/harian — daftar jurnal (guru: milik sendiri; kurikulum/admin: semua)
      if (req.method === 'GET' && url.pathname === '/api/jurnal/harian') {
        const role = session?.role || '';
        const isKurikulum = ['admin', 'superadmin', 'waka'].includes(role);
        const filterDate = url.searchParams.get('tanggal') || '';
        const filterTeacher = url.searchParams.get('teacher_code') || '';
        const filterKelas = url.searchParams.get('kelas') || '';
        const filterMonth = url.searchParams.get('bulan') || '';

        let query = 'SELECT * FROM jurnal_harian_guru WHERE 1=1';
        const params = [];

        if (!isKurikulum) {
          // Guru hanya lihat milik sendiri
          params.push(session?.code || session?.id || '');
          query += ` AND teacher_code = $${params.length}`;
        } else if (filterTeacher) {
          params.push(filterTeacher);
          query += ` AND teacher_code = $${params.length}`;
        }

        if (filterDate) {
          params.push(filterDate);
          query += ` AND tanggal = $${params.length}`;
        }
        if (filterMonth) {
          // format: YYYY-MM
          params.push(filterMonth + '%');
          query += ` AND tanggal::text LIKE $${params.length}`;
        }
        if (filterKelas) {
          params.push(filterKelas);
          query += ` AND kelas = $${params.length}`;
        }

        query += ' ORDER BY tanggal DESC, jam_ke ASC';

        // FIX FLOW-05: Pagination
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const { rows } = await dbPool.query(query, params);
        send(req, res, 200, { ok: true, data: rows });
        return;
      }

      // GET /api/jurnal/rekap — rekap statistik jurnal per guru (untuk kurikulum)
      if (req.method === 'GET' && url.pathname === '/api/jurnal/rekap') {
        const filterMonth = url.searchParams.get('bulan') || new Date().toISOString().slice(0, 7);
        const { rows } = await dbPool.query(`
          SELECT 
            teacher_code,
            teacher_name,
            COUNT(*) AS total_jurnal,
            COUNT(CASE WHEN submitted_at IS NOT NULL THEN 1 END) AS total_submitted,
            COUNT(CASE WHEN submitted_at::date > tanggal THEN 1 END) AS total_terlambat,
            MAX(tanggal) AS jurnal_terakhir
          FROM jurnal_harian_guru
          WHERE tanggal::text LIKE $1
          GROUP BY teacher_code, teacher_name
          ORDER BY teacher_name ASC
        `, [filterMonth + '%']);
        send(req, res, 200, { ok: true, data: rows });
        return;
      }

      // POST /api/jurnal/harian — tambah / update / delete
      if (req.method === 'POST' && url.pathname === '/api/jurnal/harian') {
        const body = await readJsonBody(req);
        const teacherCode = session?.code || session?.id || '';
        const teacherName = session?.name || '';
        // Definisikan role & isAdmin di scope luar agar tersedia di semua branch
        const role = session?.role || '';
        const isAdmin = ['admin', 'superadmin'].includes(role);

        // Auto migration for rincian_absensi
        try {
          await dbPool.query("ALTER TABLE jurnal_harian_guru ADD COLUMN IF NOT EXISTS rincian_absensi JSONB DEFAULT '[]'::jsonb");
        } catch (_) {}

        const rincianJson = body.rincian_absensi ? JSON.stringify(body.rincian_absensi) : '[]';

        if (body.action === 'delete') {
          // Guru hanya bisa hapus milik sendiri, admin bisa semua
          if (isAdmin) {
            await dbPool.query('DELETE FROM jurnal_harian_guru WHERE id = $1', [body.id]);
          } else {
            await dbPool.query('DELETE FROM jurnal_harian_guru WHERE id = $1 AND teacher_code = $2', [body.id, teacherCode]);
          }
        } else if (body.id) {
          // Update jurnal
          const submittedAt = body.status === 'submitted' ? new Date().toISOString() : null;
          const updateQuery = isAdmin 
            ? `UPDATE jurnal_harian_guru 
               SET kelas = $1, mapel = $2, jam_ke = $3, slot_label = $4,
                   materi_pokok = $5, kegiatan_pembelajaran = $6,
                   metode_pembelajaran = $7, catatan = $8, jumlah_hadir = $9,
                   rincian_absensi = $10::jsonb,
                   submitted_at = COALESCE(submitted_at, CASE WHEN $11::text IS NOT NULL THEN $11::timestamp ELSE NULL END),
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $12`
            : `UPDATE jurnal_harian_guru 
               SET kelas = $1, mapel = $2, jam_ke = $3, slot_label = $4,
                   materi_pokok = $5, kegiatan_pembelajaran = $6,
                   metode_pembelajaran = $7, catatan = $8, jumlah_hadir = $9,
                   rincian_absensi = $10::jsonb,
                   submitted_at = COALESCE(submitted_at, CASE WHEN $11::text IS NOT NULL THEN $11::timestamp ELSE NULL END),
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $12 AND teacher_code = $13`;
          
          const params = [
            body.kelas, body.mapel, body.jam_ke || 1, body.slot_label || '',
            body.materi_pokok, body.kegiatan_pembelajaran,
            body.metode_pembelajaran || 'Ceramah & Diskusi',
            body.catatan, body.jumlah_hadir || 0,
            rincianJson,
            submittedAt, body.id
          ];
          
          if (!isAdmin) {
            params.push(teacherCode);
          }
          
          await dbPool.query(updateQuery, params);
        } else {
          // Insert jurnal baru
          const submittedAt = body.status === 'submitted' ? new Date().toISOString() : null;
          await dbPool.query(`
            INSERT INTO jurnal_harian_guru 
            (teacher_code, teacher_name, tanggal, kelas, mapel, jam_ke, slot_label,
             materi_pokok, kegiatan_pembelajaran, metode_pembelajaran, catatan, jumlah_hadir, rincian_absensi, submitted_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14)
          `, [
            teacherCode, teacherName,
            body.tanggal || new Date().toISOString().split('T')[0],
            body.kelas, body.mapel, body.jam_ke || 1, body.slot_label || '',
            body.materi_pokok, body.kegiatan_pembelajaran,
            body.metode_pembelajaran || 'Ceramah & Diskusi',
            body.catatan, body.jumlah_hadir || 0,
            rincianJson,
            submittedAt
          ]);
        }
        send(req, res, 200, { ok: true });
        return;
      }

    } catch (err) {
      console.error('Jurnal API Error:', err);
      sendDatabaseError(req, res, err);
    }
    return;
  }

  // === CATATAN WALI KELAS ===
  if (url.pathname.startsWith('/api/kesiswaan/catatan-walikelas')) {
    if (!requireAuthenticated(req, res)) return;
    const session = getSession(req);

    try {
      // GET — ambil catatan (filter by siswa, kelas, teacher)
      if (req.method === 'GET') {
        const role = session?.role || '';
        const isKesiswaan = ['admin', 'superadmin', 'waka'].includes(role);
        const filterSiswa = url.searchParams.get('siswa_nis') || '';
        const filterKelas = url.searchParams.get('kelas') || '';
        const filterTeacher = url.searchParams.get('teacher_code') || '';
        const filterJenis = url.searchParams.get('jenis') || '';

        let query = 'SELECT cw.*, krp.poin, krp.jenis AS poin_jenis, krp.tindakan_nama FROM catatan_walikelas cw LEFT JOIN kedisiplinan_riwayat_poin krp ON cw.poin_pelanggaran_id = krp.id WHERE 1=1';
        const params = [];

        if (!isKesiswaan) {
          // Walikelas hanya lihat catatan milik sendiri
          params.push(session?.code || session?.id || '');
          query += ` AND cw.teacher_code = $${params.length}`;
        } else if (filterTeacher) {
          params.push(filterTeacher);
          query += ` AND cw.teacher_code = $${params.length}`;
        }

        if (filterSiswa) {
          params.push(filterSiswa);
          query += ` AND cw.siswa_nis = $${params.length}`;
        }
        if (filterKelas) {
          params.push(filterKelas);
          query += ` AND cw.kelas = $${params.length}`;
        }
        if (filterJenis) {
          params.push(filterJenis);
          query += ` AND cw.jenis_catatan = $${params.length}`;
        }

        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        
        query += ` ORDER BY cw.tanggal DESC, cw.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const { rows } = await dbPool.query(query, params);
        send(req, res, 200, { ok: true, data: rows });
        return;
      }

      // POST — tambah / update / delete catatan
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        const teacherCode = session?.code || session?.id || '';
        const teacherName = session?.name || '';

        if (body.action === 'delete') {
          const role = session?.role || '';
          const isAdmin = ['admin', 'superadmin'].includes(role);
          if (isAdmin) {
            await dbPool.query('DELETE FROM catatan_walikelas WHERE id = $1', [body.id]);
          } else {
            await dbPool.query('DELETE FROM catatan_walikelas WHERE id = $1 AND teacher_code = $2', [body.id, teacherCode]);
          }
        } else if (body.id) {
          // Update
          await dbPool.query(`
            UPDATE catatan_walikelas
            SET siswa_nis = $1, siswa_name = $2, tanggal = $3, jenis_catatan = $4,
                isi_catatan = $5, tindak_lanjut = $6, poin_pelanggaran_id = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
          `, [
            body.siswa_nis, body.siswa_name || '', body.tanggal || new Date().toISOString().split('T')[0],
            body.jenis_catatan || 'umum', body.isi_catatan, body.tindak_lanjut || null,
            body.poin_pelanggaran_id || null, body.id
          ]);
        } else {
          // Insert baru
          // Dapatkan nama kelas dari walikelas session jika ada
          const kelasWalikelas = session?.walasClass || body.kelas || '';
          await dbPool.query(`
            INSERT INTO catatan_walikelas
            (teacher_code, teacher_name, kelas, siswa_nis, siswa_name, tanggal,
             jenis_catatan, isi_catatan, tindak_lanjut, poin_pelanggaran_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            teacherCode, teacherName, kelasWalikelas,
            body.siswa_nis, body.siswa_name || '', 
            body.tanggal || new Date().toISOString().split('T')[0],
            body.jenis_catatan || 'umum', body.isi_catatan,
            body.tindak_lanjut || null, body.poin_pelanggaran_id || null
          ]);
        }
        send(req, res, 200, { ok: true });
        return;
      }

    } catch (err) {
      console.error('Catatan Walikelas API Error:', err);
      sendDatabaseError(req, res, err);
    }
    return;
  }

  // === ABSENSI KELAS KBM (Preview Read-only untuk guru saat mengajar) ===
  if (req.method === 'GET' && url.pathname === '/api/kedisiplinan/absensi-kelas') {
    if (!requireAuthenticated(req, res)) return;
    try {
      const filterKelas = url.searchParams.get('kelas') || '';
      const filterDate = url.searchParams.get('tanggal') || new Date().toISOString().split('T')[0];

      if (!filterKelas) {
        send(req, res, 400, { ok: false, error: 'Parameter kelas diperlukan' });
        return;
      }

      // 1. Ambil daftar siswa di kelas dengan pencocokan nama kelas yang fleksibel
      const { rows: siswaPaged } = await dbPool.query(
        `SELECT payload FROM mst_students 
         WHERE LOWER(TRIM(COALESCE(payload->>'class_name', payload->>'kelas', payload->>'rombel', ''))) = LOWER(TRIM($1))
            OR REPLACE(LOWER(TRIM(COALESCE(payload->>'class_name', payload->>'kelas', payload->>'rombel', ''))), ' ', '') = REPLACE(LOWER(TRIM($1)), ' ', '')
            OR REPLACE(LOWER(TRIM(COALESCE(payload->>'class_name', payload->>'kelas', payload->>'rombel', ''))), '-', '') = REPLACE(LOWER(TRIM($1)), '-', '')
            OR REPLACE(REPLACE(LOWER(TRIM(COALESCE(payload->>'class_name', payload->>'kelas', payload->>'rombel', ''))), ' ', ''), '-', '') = REPLACE(REPLACE(LOWER(TRIM($1)), ' ', ''), '-', '')
         ORDER BY payload->>'name' ASC`,
        [filterKelas]
      );
      const siswaList = siswaPaged.map(r => typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload);

      // 2. Ambil data absensi manual hari ini (sakit/izin/alpa)
      const { rows: absensiManual } = await dbPool.query(
        `SELECT siswa_nis, status, keterangan FROM kedisiplinan_absensi 
         WHERE tanggal::date = $1::date AND COALESCE(approval_status, 'approved') != 'rejected'`,
        [filterDate]
      );
      const absensiMap = {};
      absensiManual.forEach(a => { 
        absensiMap[String(a.siswa_nis).trim()] = { status: a.status, keterangan: a.keterangan }; 
      });

      // 3. Ambil log Hikvision hari ini (yang hadir scan mesin)
      const { rows: hikLogs } = await dbPool.query(
        `SELECT DISTINCT employee_id FROM hikvision_logs 
         WHERE timestamp::date = $1::date AND person_type = 'siswa'`,
        [filterDate]
      );
      const hadirSet = new Set(hikLogs.map(l => String(l.employee_id).trim()));

      // 4. Bangun status per siswa
      const result = siswaList.map(siswa => {
        const nis = String(siswa.nis || siswa.code || siswa.id || '').trim();
        const manual = absensiMap[nis];
        let statusKehadiran = 'Hadir';
        let keterangan = '';

        if (manual) {
          statusKehadiran = manual.status; // Sakit / Izin / Alpa / Dispen
          keterangan = manual.keterangan || '';
        }

        return {
          nis,
          name: siswa.name || siswa.namaSiswa || siswa.nama || nis,
          class_name: siswa.class_name || siswa.kelas || filterKelas,
          status: statusKehadiran,
          keterangan,
          hadir_scan: hadirSet.has(nis)
        };
      });

      send(req, res, 200, { ok: true, data: result, total: result.length, tanggal: filterDate, kelas: filterKelas });
      return;

    } catch (err) {
      console.error('Absensi Kelas KBM API Error:', err);
      sendDatabaseError(req, res, err);
    }
    return;
  }

  return false;
}

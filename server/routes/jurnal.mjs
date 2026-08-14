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
        const startDate = url.searchParams.get('start_date') || '';
        const endDate = url.searchParams.get('end_date') || '';
        const filterSemester = (url.searchParams.get('semester') || '').toLowerCase(); // 'ganjil' | 'genap' | '1' | '2'
        const filterYear = parseInt(url.searchParams.get('tahun') || new Date().getFullYear(), 10);

        let query = `
          SELECT 
            j.*,
            TO_CHAR(j.tanggal, 'YYYY-MM-DD') as tanggal,
            CASE WHEN j.submitted_at IS NOT NULL THEN TO_CHAR(j.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS') ELSE NULL END as submitted_at,
            CASE WHEN j.created_at IS NOT NULL THEN TO_CHAR(j.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') ELSE NULL END as created_at
          FROM jurnal_harian_guru j 
          WHERE 1=1
        `;
        const params = [];

        if (!isKurikulum) {
          // Guru hanya lihat milik sendiri
          params.push(session?.code || session?.id || '');
          query += ` AND j.teacher_code = $${params.length}`;
        } else if (filterTeacher) {
          params.push(filterTeacher);
          query += ` AND j.teacher_code = $${params.length}`;
        }

        if (filterDate) {
          params.push(filterDate);
          query += ` AND j.tanggal = $${params.length}`;
        } else if (startDate && endDate) {
          params.push(startDate, endDate);
          query += ` AND j.tanggal >= $${params.length - 1} AND j.tanggal <= $${params.length}`;
        } else if (filterSemester === 'ganjil' || filterSemester === '1') {
          params.push(`${filterYear}-07-01`, `${filterYear}-12-31`);
          query += ` AND j.tanggal >= $${params.length - 1} AND j.tanggal <= $${params.length}`;
        } else if (filterSemester === 'genap' || filterSemester === '2') {
          params.push(`${filterYear}-01-01`, `${filterYear}-06-30`);
          query += ` AND j.tanggal >= $${params.length - 1} AND j.tanggal <= $${params.length}`;
        }

        if (filterMonth) {
          // format: YYYY-MM
          params.push(filterMonth + '%');
          query += ` AND j.tanggal::text LIKE $${params.length}`;
        }
        if (filterKelas) {
          params.push(filterKelas);
          query += ` AND j.kelas = $${params.length}`;
        }

        const sortDir = (url.searchParams.get('sort') || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY j.tanggal ${sortDir}, j.jam_ke ASC`;

        const rawLimit = url.searchParams.get('limit');
        if (rawLimit === 'all' || rawLimit === '1000' || rawLimit === '2000') {
          const limit = 3000;
          const offset = parseInt(url.searchParams.get('offset') || '0', 10);
          query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
          params.push(limit, offset);
        } else {
          const limit = Math.min(parseInt(rawLimit || '50', 10), 200);
          const offset = parseInt(url.searchParams.get('offset') || '0', 10);
          query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
          params.push(limit, offset);
        }

        const { rows } = await dbPool.query(query, params);
        send(req, res, 200, { ok: true, data: rows, total: rows.length });
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
        
        // Accurate Jakarta timestamp (WIB, UTC+7)
        const jakartaNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const currentJakartaTs = jakartaNow.toISOString().slice(0, 19).replace('T', ' ');

        if (body.action === 'delete') {
          // Guru hanya bisa hapus milik sendiri, admin bisa semua
          if (isAdmin) {
            await dbPool.query('DELETE FROM jurnal_harian_guru WHERE id = $1', [body.id]);
          } else {
            await dbPool.query('DELETE FROM jurnal_harian_guru WHERE id = $1 AND teacher_code = $2', [body.id, teacherCode]);
          }
        } else if (body.id) {
          // Update jurnal
          const submittedAt = body.status === 'submitted' ? currentJakartaTs : null;
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
          const submittedAt = body.status === 'submitted' ? currentJakartaTs : null;
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

  // === ABSENSI KELAS KBM (Sinkronisasi Otomatis Mesin Absensi Hikvision & Izin/Sakit/Alpa) ===
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
      const cleanKelas = filterKelas.replace(/[\s\-_.]/g, '').toLowerCase();
      const { rows: siswaPaged } = await dbPool.query(
        `SELECT payload FROM mst_students 
         WHERE LOWER(REGEXP_REPLACE(COALESCE(payload->>'class_name', payload->>'kelas', payload->>'rombel', ''), '[\\s\\-_.]', '', 'g')) = $1
            OR LOWER(TRIM(COALESCE(payload->>'class_name', payload->>'kelas', payload->>'rombel', ''))) = LOWER(TRIM($2))
         ORDER BY payload->>'name' ASC`,
        [cleanKelas, filterKelas]
      );
      const siswaList = siswaPaged.map(r => typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload);

      // 2. Petakan mapping employee_id / NIS dengan mst_students dan hikvision_students
      const employeeToNisMap = {};
      siswaList.forEach(s => {
        const nis = String(s.nis || s.code || s.id || '').trim();
        employeeToNisMap[nis.toLowerCase()] = nis;
        if (s.name || s.nama) {
          employeeToNisMap[String(s.name || s.nama).trim().toLowerCase()] = nis;
        }
      });

      try {
        const { rows: hikStudents } = await dbPool.query("SELECT nis, name FROM hikvision_students");
        hikStudents.forEach(h => {
          const hNis = String(h.nis || '').trim().toLowerCase();
          const hName = String(h.name || '').trim().toLowerCase();
          const matchedSiswa = siswaList.find(s => {
            const sNis = String(s.nis || s.code || s.id || '').trim().toLowerCase();
            const sName = String(s.name || s.nama || '').trim().toLowerCase();
            return (sName && hName && sName === hName) || sNis === hNis || (hNis.length >= 5 && sNis.length >= 5 && (sNis.endsWith(hNis) || hNis.endsWith(sNis)));
          });
          if (matchedSiswa) {
            const canonNis = String(matchedSiswa.nis || matchedSiswa.code || matchedSiswa.id || '').trim();
            employeeToNisMap[hNis] = canonNis;
          }
        });
      } catch (e) {
        console.warn("Hikvision students mapping warning:", e.message);
      }

      // 3. Ambil data absensi manual (sakit/izin/alpa/terlambat/dispen)
      const { rows: absensiManual } = await dbPool.query(
        `SELECT siswa_nis, status, keterangan FROM kedisiplinan_absensi 
         WHERE tanggal::date = $1::date AND COALESCE(approval_status, 'approved') != 'rejected'`,
        [filterDate]
      );
      const absensiMap = {};
      absensiManual.forEach(a => { 
        absensiMap[String(a.siswa_nis).trim().toLowerCase()] = { status: a.status, keterangan: a.keterangan }; 
      });

      // 4. Ambil log Hikvision hari tersebut
      const { rows: logsOnDate } = await dbPool.query(
        `SELECT l.employee_id, TO_CHAR(l.timestamp, 'YYYY-MM-DD HH24:MI:SS') as time_str
         FROM hikvision_logs l
         WHERE l.timestamp::date = $1::date
         ORDER BY l.timestamp ASC`,
        [filterDate]
      );

      const studentLogs = {};
      logsOnDate.forEach(l => {
        const rawEmp = String(l.employee_id || '').trim().toLowerCase();
        const nis = employeeToNisMap[rawEmp];
        if (nis) {
          const timePart = l.time_str.substring(11, 19); // "HH:MM:SS"
          if (!studentLogs[nis]) studentLogs[nis] = [];
          studentLogs[nis].push(timePart);
        }
      });

      // 5. Ambil aturan waktu batas keterlambatan
      let masukLate = "07:15:00";
      try {
        const confRes = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_attendance_config'");
        if (confRes.rowCount > 0 && confRes.rows[0].data) {
          const conf = typeof confRes.rows[0].data === 'string' ? JSON.parse(confRes.rows[0].data) : confRes.rows[0].data;
          const sLate = conf.siswa?.masuk_late || conf.masuk_late || "07:15";
          masukLate = (sLate.length === 5 ? sLate + ":00" : sLate);
        }
      } catch (_) {}

      // 6. Bangun status per siswa
      const result = siswaList.map(siswa => {
        const nis = String(siswa.nis || siswa.code || siswa.id || '').trim();
        const manual = absensiMap[nis.toLowerCase()];
        const logs = studentLogs[nis] || [];
        
        let statusKehadiran = 'Alpa';
        let keterangan = 'Tidak ada rekaman absensi';
        let isLate = false;
        let scanTime = '';

        if (manual) {
          statusKehadiran = manual.status; // Sakit / Izin / Alpa / Dispen / Terlambat
          keterangan = manual.keterangan || '';
          if (statusKehadiran.toLowerCase() === 'terlambat') isLate = true;
        } else if (logs.length > 0) {
          const morningTaps = logs.filter(t => t < "12:00:00");
          const firstTap = morningTaps.length > 0 ? morningTaps[0] : logs[0];
          scanTime = firstTap.substring(0, 5);
          isLate = firstTap > masukLate;
          statusKehadiran = isLate ? 'Terlambat' : 'Hadir';
          keterangan = `Scan masuk ${scanTime}${isLate ? ' (Terlambat)' : ''}`;
        }

        return {
          nis,
          name: siswa.name || siswa.namaSiswa || siswa.nama || nis,
          class_name: siswa.class_name || siswa.kelas || filterKelas,
          status: statusKehadiran,
          keterangan,
          hadir_scan: logs.length > 0,
          scan_time: scanTime,
          is_late: isLate
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

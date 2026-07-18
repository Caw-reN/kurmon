export async function handlePklRoutes(req, res, url, ctx) {
  const { dbPool, send, sendDatabaseError, requireAuthenticated, getSession, readJsonBody, readMainPayload, isMonitoringAdmin, isAdminRole } = ctx;
  
    if (req.method === "GET" && url.pathname === "/api/pkl/dashboard-stats") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      try {
        const stats = {
          totalSiswa: 0,
          siswaAktifHariIni: 0,
          totalPerusahaan: 0,
          totalGuru: 0,
          persenKehadiranRataRata: 0,
          jurnalPending: []
        };
        const locRes = await dbPool.query("SELECT COUNT(*) FROM pkl_locations WHERE status = 'aktif'");
        stats.totalPerusahaan = parseInt(locRes.rows[0].count, 10);
        
        // Hitung hanya siswa yang benar-benar terdaftar PKL:
        // yaitu yang sudah punya location_id (penempatan) ATAU teacher_code (guru pembimbing)
        const stuRes = await dbPool.query(`
          SELECT COUNT(*) FROM pkl_students 
          WHERE status = 'aktif' 
            AND (location_id IS NOT NULL OR teacher_code IS NOT NULL)
        `);
        stats.totalSiswa = parseInt(stuRes.rows[0].count, 10) || 0;
        
        const guruRes = await dbPool.query("SELECT COUNT(DISTINCT teacher_code) FROM pkl_students WHERE teacher_code IS NOT NULL");
        stats.totalGuru = parseInt(guruRes.rows[0].count, 10) || 0;
        
        const logRes = await dbPool.query(`
          SELECT l.id, l.student_nis, l.kegiatan, l.created_at, s.payload->>'name' as student_name
          FROM pkl_logbooks l
          LEFT JOIN mst_students s ON l.student_nis = s.id
          WHERE l.status = 'pending' 
          ORDER BY l.created_at DESC LIMIT 10
        `);
        stats.jurnalPending = logRes.rows;

        return send(req, res, 200, { ok: true, data: stats });
      } catch (err) {
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "GET" && url.pathname === "/api/pkl/locations") {
      try {
        const result = await dbPool.query("SELECT * FROM pkl_locations ORDER BY id DESC");
        return send(req, res, 200, { ok: true, data: result.rows });
      } catch (err) {
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "POST" && url.pathname === "/api/pkl/locations") {
      const session = requireAuthenticated(req, res);
      if (!session || !isAdminRole(session.role)) return send(req, res, 403, { ok: false, error: "Akses ditolak" });
      try {
        const body = await readJsonBody(req);
        const { nama_perusahaan, alamat, jurusan, lat, lng, kuota, status, bidang, kota, telepon, kompetensi } = body;
        
        const result = await dbPool.query(`
          INSERT INTO pkl_locations (nama_perusahaan, alamat, jurusan, lat, lng, kuota, status, bidang, kota, telepon, kompetensi, verified, submitted_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, 'admin')
          RETURNING *
        `, [nama_perusahaan, alamat, jurusan, lat, lng, kuota || 0, status || 'aktif', bidang, kota, telepon, JSON.stringify(kompetensi || [])]);
        
        return send(req, res, 201, { ok: true, data: result.rows[0] });
      } catch (err) {
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "PUT" && url.pathname.startsWith("/api/pkl/locations/") && url.pathname.endsWith("/verify")) {
      const session = requireAuthenticated(req, res);
      if (!session || !isAdminRole(session.role)) return send(req, res, 403, { ok: false, error: "Akses ditolak" });
      const id = url.pathname.split("/")[4];
      try {
        await dbPool.query("UPDATE pkl_locations SET verified = true WHERE id = $1", [id]);
        return send(req, res, 200, { ok: true, message: "Lokasi berhasil diverifikasi" });
      } catch (err) { return sendDatabaseError(req, res, err); }
    }
    if (req.method === "PUT" && url.pathname.startsWith("/api/pkl/locations/")) {
      const session = requireAuthenticated(req, res);
      if (!session || !isAdminRole(session.role)) return send(req, res, 403, { ok: false, error: "Akses ditolak" });
      const id = url.pathname.split("/").pop();
      try {
        const body = await readJsonBody(req);
        const { nama_perusahaan, alamat, jurusan, lat, lng, kuota, status, bidang, kota, telepon, kompetensi } = body;
        
        const result = await dbPool.query(`
          UPDATE pkl_locations 
          SET nama_perusahaan = $1, alamat = $2, jurusan = $3, lat = $4, lng = $5, 
              kuota = $6, status = $7, bidang = $8, kota = $9, telepon = $10, kompetensi = $11
          WHERE id = $12
          RETURNING *
        `, [nama_perusahaan, alamat, jurusan, lat, lng, kuota, status, bidang, kota, telepon, JSON.stringify(kompetensi || []), id]);
        
        return send(req, res, 200, { ok: true, data: result.rows[0] });
      } catch (err) {
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "DELETE" && url.pathname.startsWith("/api/pkl/locations/")) {
      const session = requireAuthenticated(req, res);
      if (!session || !isAdminRole(session.role)) return send(req, res, 403, { ok: false, error: "Akses ditolak" });
      const id = url.pathname.split("/").pop();
      try {
        await dbPool.query("DELETE FROM pkl_locations WHERE id = $1", [id]);
        return send(req, res, 200, { ok: true });
      } catch (err) {
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "POST" && url.pathname === "/api/pkl/student/location") {
      const session = requireAuthenticated(req, res);
      if (!session || session.role !== "siswa") return send(req, res, 403, { ok: false, error: "Hanya siswa" });
      try {
        const body = await readJsonBody(req);
        const nis = session.id || session.username;
        let locId = body.location_id;
        if (!locId && body.namaLokasi) {
          const locRes = await dbPool.query(
            "INSERT INTO pkl_locations (nama_perusahaan, lat, lng, status, verified, submitted_by) VALUES ($1, $2, $3, 'aktif', false, 'siswa') RETURNING id",
            [body.namaLokasi, body.lat, body.lng]
          );
          locId = locRes.rows[0].id;
        }
        
        const stuRes = await dbPool.query("SELECT location_update_count FROM pkl_students WHERE nis = $1", [nis]);
        if (stuRes.rows.length > 0 && stuRes.rows[0].location_update_count >= 2) {
          return send(req, res, 400, { ok: false, error: "Batas maksimal update lokasi (2x) telah tercapai. Silakan minta Admin untuk mereset." });
        }

        await dbPool.query(`
          INSERT INTO pkl_students (nis, location_id, status, location_update_count)
          VALUES ($1, $2, 'aktif', 1)
          ON CONFLICT (nis) DO UPDATE SET 
            location_id = EXCLUDED.location_id,
            location_update_count = COALESCE(pkl_students.location_update_count, 0) + 1
        `, [nis, locId]);
        return send(req, res, 200, { ok: true });
      } catch (err) {
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "PUT" && url.pathname.startsWith("/api/pkl/student/location/reset/")) {
      const session = getSession(req);
      if (!isAdminRole(session?.role)) return send(req, res, 403, { ok: false, error: "Hanya admin" });
      const targetNis = url.pathname.split("/").pop();
      try {
        await dbPool.query("UPDATE pkl_students SET location_update_count = 0 WHERE nis = $1", [targetNis]);
        return send(req, res, 200, { ok: true, message: "Berhasil reset batas update lokasi" });
      } catch (err) {
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/pkl/students/")) {
      if (!requireAuthenticated(req, res)) return;
      try {
        const nis = url.pathname.replace("/api/pkl/students/", "").trim();
        if (!nis) return send(req, res, 400, { ok: false, error: "NIS tidak boleh kosong" });
        const result = await dbPool.query(
          "SELECT * FROM pkl_students WHERE student_nis = $1 LIMIT 1",
          [nis]
        );
        if (result.rows.length === 0) return send(req, res, 404, { ok: false, error: "Data siswa PKL tidak ditemukan" });
        return send(req, res, 200, { ok: true, data: result.rows[0] });
      } catch (err) {
        if (err.code === "42P01") return send(req, res, 404, { ok: false, error: "Tabel PKL belum ada" });
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "POST" && url.pathname === "/api/pkl/logbooks/student") {
      const session = requireAuthenticated(req, res);
      if (!session || session.role !== "siswa") return send(req, res, 403, { ok: false, error: "Hanya siswa" });
      try {
        const body = await readJsonBody(req);
        const nis = session.id || session.username;
        await dbPool.query(`
          INSERT INTO pkl_logbooks (student_nis, tanggal, kegiatan, catatan, solusi, jam_masuk, jam_keluar, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        `, [nis, body.tanggal, body.kegiatan, body.kendala || '', body.solusi || '', body.jamMasuk || '08:00', body.jamKeluar || '17:00']);
        return send(req, res, 200, { ok: true });
      } catch (err) {
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "GET" && url.pathname === "/api/pkl/logbooks/student") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      try {
        const nis = session.id || session.username;
        const result = await dbPool.query(`
          SELECT id, student_nis, tanggal, kegiatan, catatan as kendala, solusi, 
                 jam_masuk as "jamMasuk", jam_keluar as "jamKeluar", catatan_guru as "catatanGuru", status, created_at
          FROM pkl_logbooks 
          WHERE student_nis = $1 
          ORDER BY created_at DESC
        `, [nis]);
        return send(req, res, 200, { ok: true, data: result.rows });
      } catch (err) {
        if (err.code === '42P01') return send(req, res, 200, { ok: true, data: [] });
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "GET" && url.pathname === "/api/pkl/logbooks") {
      try {
        const result = await dbPool.query(`
          SELECT l.id, l.student_nis, l.tanggal, l.kegiatan, l.catatan as kendala, l.solusi, 
                 l.jam_masuk as "jamMasuk", l.jam_keluar as "jamKeluar", l.catatan_guru as "catatanGuru", l.status, l.created_at,
                 s.payload->>'name' as student_name, s.payload->>'class_name' as class_name
          FROM pkl_logbooks l
          LEFT JOIN mst_students s ON l.student_nis = s.id
          ORDER BY l.created_at DESC
        `);
        return send(req, res, 200, { ok: true, data: result.rows });
      } catch (err) {
        if (err.code === '42P01') return send(req, res, 200, { ok: true, data: [] });
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "PUT" && url.pathname.startsWith("/api/pkl/logbooks/")) {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      const id = url.pathname.split("/").pop();
      try {
        const body = await readJsonBody(req);
        const { status, catatanGuru } = body;
        await dbPool.query(`
          UPDATE pkl_logbooks 
          SET status = $1, catatan_guru = $2 
          WHERE id = $3
        `, [status, catatanGuru || '', id]);
        return send(req, res, 200, { ok: true, message: "Logbook updated successfully" });
      } catch (err) {
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "GET" && url.pathname === "/api/pkl/submissions") {
      try {
        const result = await dbPool.query("SELECT * FROM pkl_submissions ORDER BY created_at DESC");
        return send(req, res, 200, { ok: true, data: result.rows });
      } catch (err) {
        if (err.code === '42P01') return send(req, res, 200, { ok: true, data: [] });
        return sendDatabaseError(req, res, err);
      }
    }
    if (req.method === "POST" && url.pathname === "/api/pkl/surat-pengantar") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      try {
        const body = await readJsonBody(req);
        const { pt_name, pt_address, students } = body;
        if (!pt_name || !students || students.length === 0) {
          return send(req, res, 400, { ok: false, error: "Data tidak lengkap" });
        }
        
        const locRes = await dbPool.query(
          "INSERT INTO pkl_locations (nama_perusahaan, alamat, status) VALUES ($1, $2, 'pending') RETURNING id",
          [pt_name, pt_address || ""]
        );
        const location_id = locRes.rows[0].id;
        
        const suratRes = await dbPool.query(
          "INSERT INTO pkl_surat_pengantar (location_id, pt_name_temp, created_by_nis) VALUES ($1, $2, $3) RETURNING id",
          [location_id, pt_name, session.id || session.username || ""]
        );
        const surat_id = suratRes.rows[0].id;
        
        for (const s of students) {
          await dbPool.query(
            "INSERT INTO pkl_surat_pengantar_students (surat_id, nis, nama, kelas, nisn) VALUES ($1, $2, $3, $4, $5)",
            [surat_id, s.nis, s.nama, s.kelas, s.nisn]
          );
        }
        send(req, res, 200, { ok: true, message: "Pengajuan berhasil", surat_id });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/pkl/surat-pengantar") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      try {
        let query = `
          SELECT s.*, l.nama_perusahaan, l.alamat as pt_address 
          FROM pkl_surat_pengantar s
          LEFT JOIN pkl_locations l ON s.location_id = l.id
        `;
        const params = [];
        if (session.role === "siswa") {
          query += ` WHERE s.created_by_nis = $1 ORDER BY s.created_at DESC`;
          params.push(session.id || session.username);
        } else {
          query += ` ORDER BY s.created_at DESC`;
        }
        const { rows } = await dbPool.query(query, params);
        
        for (const r of rows) {
          const studentsRes = await dbPool.query("SELECT * FROM pkl_surat_pengantar_students WHERE surat_id = $1", [r.id]);
          r.students = studentsRes.rows;
        }
        send(req, res, 200, { ok: true, data: rows });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }
    if (req.method === "PUT" && url.pathname.startsWith("/api/pkl/surat-pengantar/") && url.pathname.endsWith("/acc")) {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!["admin", "hubin", "waka"].includes(session.role)) {
        return send(req, res, 403, { ok: false, error: "Hanya HUBIN yang bisa ACC" });
      }
      try {
        const id = url.pathname.split("/")[4];
        const body = await readJsonBody(req);
        await dbPool.query(
          "UPDATE pkl_surat_pengantar SET status = 'acc_hubin', nomor_surat = $1 WHERE id = $2",
          [body.nomor_surat || "", id]
        );
        send(req, res, 200, { ok: true, message: "Surat berhasil di-ACC" });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }
    if (req.method === "PUT" && url.pathname.startsWith("/api/pkl/surat-pengantar/") && url.pathname.endsWith("/stempel")) {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!["admin", "hubin", "waka"].includes(session.role)) {
        return send(req, res, 403, { ok: false, error: "Hanya HUBIN yang bisa Validasi Stempel" });
      }
      try {
        const id = url.pathname.split("/")[4];
        await dbPool.query(
          "UPDATE pkl_surat_pengantar SET status = 'stempel_selesai' WHERE id = $1",
          [id]
        );
        send(req, res, 200, { ok: true, message: "Validasi Stempel berhasil" });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/pkl/konfirmasi") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (session.role !== "siswa") return send(req, res, 403, { ok: false, error: "Hanya siswa" });
      try {
        const body = await readJsonBody(req);
        const { start_date, end_date } = body;
        const nis = session.id || session.username;
        // Upsert pkl_students entry just in case it doesn't exist
        await dbPool.query(
          `INSERT INTO pkl_students (nis, start_date, end_date, status) 
           VALUES ($1, $2, $3, 'aktif')
           ON CONFLICT (nis) DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, status = 'aktif'`,
          [nis, start_date, end_date]
        );
        send(req, res, 200, { ok: true, message: "Konfirmasi berhasil" });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/pkl/mutasi") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (session.role !== "siswa") return send(req, res, 403, { ok: false, error: "Hanya siswa" });
      try {
        const body = await readJsonBody(req);
        const { new_pt_name, alasan } = body;
        const nis = session.id || session.username;
        
        const studentRes = await dbPool.query("SELECT location_id FROM pkl_students WHERE nis = $1", [nis]);
        const old_location_id = studentRes.rows[0]?.location_id || null;
        
        let new_location_id = null;
        if (new_pt_name) {
           const locRes = await dbPool.query(
             "INSERT INTO pkl_locations (nama_perusahaan, status) VALUES ($1, 'pending') RETURNING id",
             [new_pt_name]
           );
           new_location_id = locRes.rows[0].id;
        }

        await dbPool.query(
          "INSERT INTO pkl_mutasi (nis, old_location_id, new_location_id, new_pt_name_temp, alasan) VALUES ($1, $2, $3, $4, $5)",
          [nis, old_location_id, new_location_id, new_pt_name, alasan]
        );
        send(req, res, 200, { ok: true, message: "Pengajuan pindah berhasil dikirim" });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/pkl/mutasi") {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      try {
        let query = `
          SELECT m.*, l_old.nama_perusahaan as old_pt_name, l_new.nama_perusahaan as new_pt_name
          FROM pkl_mutasi m
          LEFT JOIN pkl_locations l_old ON m.old_location_id = l_old.id
          LEFT JOIN pkl_locations l_new ON m.new_location_id = l_new.id
        `;
        const params = [];
        if (session.role === "siswa") {
          query += ` WHERE m.nis = $1 ORDER BY m.created_at DESC`;
          params.push(session.id || session.username);
        } else {
          query += ` ORDER BY m.created_at DESC`;
        }
        const { rows } = await dbPool.query(query, params);
        
        let masterStudents = [];
        try {
          const sRes = await dbPool.query('SELECT payload FROM mst_students');
          masterStudents = sRes.rows.map(r => r.payload);
        } catch(e) {}
        
        for (const r of rows) {
           const studentInfo = masterStudents.find(s => s.nis === r.nis);
           if (studentInfo) {
              r.student_name = studentInfo.name;
              r.class_name = studentInfo.class_name;
           } else {
              r.student_name = "Unknown";
              r.class_name = "-";
           }
        }

        send(req, res, 200, { ok: true, data: rows });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }
    if (req.method === "PUT" && url.pathname.startsWith("/api/pkl/mutasi/") && url.pathname.endsWith("/acc")) {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      try {
        const id = url.pathname.split("/")[4];
        const body = await readJsonBody(req);
        const { status } = body; 
        const role = session.role; 
        
        let updateField = "";
        let isFinal = false;

        if (["admin", "hubin", "waka"].includes(role)) {
          updateField = "acc_hubin";
          isFinal = true; 
        } else if (role === "kaprog") {
          updateField = "acc_kaprog";
        } else if (role === "walas") {
          updateField = "acc_walas";
        } else {
          updateField = "acc_pembimbing";
        }

        const currentRes = await dbPool.query("SELECT * FROM pkl_mutasi WHERE id = $1", [id]);
        if (currentRes.rows.length === 0) return send(req, res, 404, { ok: false, error: "Tidak ditemukan" });
        const m = currentRes.rows[0];

        let finalStatus = m.final_status;
        if (isFinal) {
           finalStatus = status;
        }

        await dbPool.query(
          `UPDATE pkl_mutasi SET ${updateField} = $1, final_status = $2 WHERE id = $3`,
          [status, finalStatus, id]
        );

        if (isFinal && status === 'acc' && m.new_location_id) {
           await dbPool.query(
             `INSERT INTO pkl_students (nis, location_id, status) VALUES ($1, $2, 'aktif')
              ON CONFLICT (nis) DO UPDATE SET location_id = EXCLUDED.location_id, status = 'aktif'`,
             [m.nis, m.new_location_id]
           );
        }

        send(req, res, 200, { ok: true, message: "Berhasil update status" });
      } catch (err) { sendDatabaseError(req, res, err); }
      return;
    }
    if (req.method === "DELETE" && url.pathname.startsWith("/api/pkl/surat-pengantar/")) {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!isMonitoringAdmin(session.role)) return send(req, res, 403, { ok: false, error: "Hanya admin/hubin" });
      const id = parseInt(url.pathname.split("/").pop());
      try {
        await dbPool.query("DELETE FROM pkl_surat_pengantar WHERE id = $1", [id]);
        send(req, res, 200, { ok: true, message: "Deleted successfully" });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return;
    }
    if (req.method === "DELETE" && url.pathname.startsWith("/api/pkl/mutasi/")) {
      const session = requireAuthenticated(req, res);
      if (!session) return;
      if (!isMonitoringAdmin(session.role)) return send(req, res, 403, { ok: false, error: "Hanya admin/hubin" });
      const id = parseInt(url.pathname.split("/").pop());
      try {
        await dbPool.query("DELETE FROM pkl_mutasi WHERE id = $1", [id]);
        send(req, res, 200, { ok: true, message: "Deleted successfully" });
      } catch (err) {
        sendDatabaseError(req, res, err);
      }
      return;
    }

  return false;
}

import { google } from 'googleapis';
import { Readable } from 'stream';

// Helper to get or create folder hierarchically in Google Drive
async function getOrCreateFolder(drive, folderName, parentId = null) {
  const safeName = String(folderName).replace(/'/g, "\\'");
  let query = `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  const res = await drive.files.list({
    q: query,
    fields: 'files(id)',
    spaces: 'drive'
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  
  // Create it
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    fileMetadata.parents = [parentId];
  }
  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
    supportsAllDrives: true
  });
  return folder.data.id;
}

export async function handleKedisiplinanRoutes(req, res, url, ctx) {
  const { dbPool, send, sendDatabaseError, requireAuthenticated, getSession, readJsonBody, readMainPayload, isMonitoringAdmin, isAdminRole } = ctx;
  
    if (url.pathname.startsWith("/api/kedisiplinan/") || url.pathname.startsWith("/api/kesiswaan/")) {
      const isPublicGet = req.method === "GET" && (
        url.pathname === "/api/kedisiplinan/rules.pdf" ||
        url.pathname === "/api/kedisiplinan/master" ||
        url.pathname === "/api/kedisiplinan/jadwal"
      );
      if (!isPublicGet && !requireAuthenticated(req, res)) return;
      
      try {
        if (req.method === "GET" && url.pathname === "/api/kedisiplinan/rules.pdf") {
          try {
            const { rows } = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'school_rules_pdf'");
            if (rows.length === 0 || !rows[0].data) {
              send(req, res, 404, { ok: false, error: "Peraturan sekolah belum diunggah" });
              return;
            }
            const payload = JSON.parse(rows[0].data);
            const pdfBuffer = Buffer.from(payload.base64, 'base64');
            res.writeHead(200, {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${payload.fileName || 'peraturan_sekolah.pdf'}"`,
              "Content-Length": pdfBuffer.length
            });
            res.end(pdfBuffer);
          } catch (e) {
            console.error("Error serving rules PDF:", e);
            send(req, res, 500, { ok: false, error: e.message });
          }
          return;
        }

        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/upload-rules") {
          const body = await readJsonBody(req);
          if (!body.fileData) {
            send(req, res, 400, { ok: false, error: "File data is required" });
            return;
          }
          // FIX BUG-07: Validasi tipe file dan ukuran maksimal
          const mimeMatch = String(body.fileData).match(/^data:([^;]+);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1] : '';
          if (!['application/pdf'].includes(mimeType)) {
            send(req, res, 400, { ok: false, error: "Hanya file PDF yang diizinkan." });
            return;
          }
          const base64Data = body.fileData.split(';base64,').pop();
          const fileSizeBytes = Math.round(base64Data.length * 3 / 4);
          if (fileSizeBytes > 10 * 1024 * 1024) { // max 10 MB
            send(req, res, 400, { ok: false, error: "Ukuran file maksimal 10MB." });
            return;
          }
          const payload = {
            base64: base64Data,
            fileName: body.fileName || "peraturan_sekolah.pdf"
          };

          await dbPool.query(`
            INSERT INTO app_data (store_key, data) VALUES ('school_rules_pdf', $1)
            ON CONFLICT (store_key) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
          `, [JSON.stringify(payload)]);

          send(req, res, 200, { ok: true });
          return;
        }

        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/delete-rules") {
          await dbPool.query("DELETE FROM app_data WHERE store_key = 'school_rules_pdf'");
          send(req, res, 200, { ok: true });
          return;
        }

        if (req.method === "GET" && url.pathname === "/api/kedisiplinan/attendance-start-date") {
          const resStart = await dbPool.query("SELECT value FROM school_profile WHERE key = 'attendance_start_date' LIMIT 1");
          const dateVal = resStart.rows.length > 0 ? resStart.rows[0].value : '2026-08-01';
          send(req, res, 200, { ok: true, startDate: dateVal });
          return;
        }

        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/attendance-start-date") {
          const body = await readJsonBody(req);
          const startDate = body.startDate || '2026-08-01';
          await dbPool.query(`
            INSERT INTO school_profile (key, value) VALUES ('attendance_start_date', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
          `, [startDate]);
          send(req, res, 200, { ok: true, startDate });
          return;
        }

        // NOTE: GET /api/kesiswaan/catatan-walikelas is handled by jurnal.mjs
        // which includes proper authentication and teacher_code filtering.
        // The duplicate handler that was here WITHOUT auth has been removed (security fix).


        if (req.method === "POST" && url.pathname === "/api/kesiswaan/catatan-walikelas") {
          try {
            const body = await readJsonBody(req);
            const session = getSession(req);
            const teacher_code = session?.code || session?.username || session?.id || '';
            const teacher_name = session?.name || teacher_code;
            
            if (body.action === "delete") {
              await dbPool.query("DELETE FROM catatan_walikelas WHERE id = $1", [body.id]);
              send(req, res, 200, { ok: true });
              return;
            }
            
            if (body.id) {
              await dbPool.query(`
                UPDATE catatan_walikelas
                SET siswa_nis=$1, siswa_name=$2, tanggal=$3, jenis_catatan=$4, isi_catatan=$5, tindak_lanjut=$6, poin_pelanggaran_id=$7, kelas=$8, updated_at=CURRENT_TIMESTAMP
                WHERE id=$9
              `, [body.siswa_nis, body.siswa_name, body.tanggal, body.jenis_catatan, body.isi_catatan, body.tindak_lanjut, body.poin_pelanggaran_id || null, body.kelas, body.id]);
            } else {
              await dbPool.query(`
                INSERT INTO catatan_walikelas 
                (teacher_code, teacher_name, kelas, siswa_nis, siswa_name, tanggal, jenis_catatan, isi_catatan, tindak_lanjut, poin_pelanggaran_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              `, [teacher_code, teacher_name, body.kelas, body.siswa_nis, body.siswa_name, body.tanggal, body.jenis_catatan, body.isi_catatan, body.tindak_lanjut, body.poin_pelanggaran_id || null]);
            }
            send(req, res, 200, { ok: true });
          } catch(e) {
            console.error("catatan-walikelas POST error:", e);
            sendDatabaseError(req, res, e);
          }
          return;
        }

        if (req.method === "GET" && url.pathname === "/api/kedisiplinan/master") {
          const { rows } = await dbPool.query("SELECT * FROM kedisiplinan_master_poin WHERE is_deleted = false ORDER BY nama_tindakan ASC");
          send(req, res, 200, { ok: true, data: rows });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/master") {
          const body = await readJsonBody(req);
          const VALID_JENIS = ['pelanggaran', 'penghargaan'];

          if (body.action === 'delete') {
            if (!body.id) return send(req, res, 400, { ok: false, error: "ID diperlukan." });
            await dbPool.query("UPDATE kedisiplinan_master_poin SET is_deleted = true WHERE id = $1", [body.id]);
          } else if (body.action === 'import' && Array.isArray(body.items)) {
            for (const item of body.items) {
              if (item.nama_tindakan && VALID_JENIS.includes(item.jenis) && item.nilai_poin !== undefined) {
                const poin = parseInt(item.nilai_poin, 10);
                if (!isNaN(poin)) {
                  await dbPool.query("INSERT INTO kedisiplinan_master_poin (nama_tindakan, jenis, nilai_poin) VALUES ($1, $2, $3)", [String(item.nama_tindakan).trim(), item.jenis, poin]);
                }
              }
            }
          } else if (body.id) {
            // FIX FLOW-04: Validasi input sebelum update
            if (!body.nama_tindakan?.trim()) return send(req, res, 400, { ok: false, error: "Nama tindakan wajib diisi." });
            if (!VALID_JENIS.includes(body.jenis)) return send(req, res, 400, { ok: false, error: "Jenis harus 'pelanggaran' atau 'penghargaan'." });
            const poin = parseInt(body.nilai_poin, 10);
            if (isNaN(poin) || poin < 0 || poin > 1000) return send(req, res, 400, { ok: false, error: "Nilai poin harus angka 0-1000." });
            await dbPool.query("UPDATE kedisiplinan_master_poin SET nama_tindakan = $1, jenis = $2, nilai_poin = $3 WHERE id = $4", [String(body.nama_tindakan).trim(), body.jenis, poin, body.id]);
          } else {
            // FIX FLOW-04: Validasi input sebelum insert
            if (!body.nama_tindakan?.trim()) return send(req, res, 400, { ok: false, error: "Nama tindakan wajib diisi." });
            if (!VALID_JENIS.includes(body.jenis)) return send(req, res, 400, { ok: false, error: "Jenis harus 'pelanggaran' atau 'penghargaan'." });
            const poin = parseInt(body.nilai_poin, 10);
            if (isNaN(poin) || poin < 0 || poin > 1000) return send(req, res, 400, { ok: false, error: "Nilai poin harus angka 0-1000." });
            await dbPool.query("INSERT INTO kedisiplinan_master_poin (nama_tindakan, jenis, nilai_poin) VALUES ($1, $2, $3)", [String(body.nama_tindakan).trim(), body.jenis, poin]);
          }
          send(req, res, 200, { ok: true });
          return;
        }

        // Alias: GET /tindakan → sama dengan /master (hanya pelanggaran)
        // Diperlukan untuk kompatibilitas PanelPiket dan komponen lain
        if (req.method === "GET" && url.pathname === "/api/kedisiplinan/tindakan") {
          const { rows } = await dbPool.query("SELECT * FROM kedisiplinan_master_poin WHERE is_deleted = false AND jenis = 'pelanggaran' ORDER BY nama_tindakan ASC");
          send(req, res, 200, { ok: true, data: rows });
          return;
        }


        if (req.method === "GET" && url.pathname === "/api/kedisiplinan/jadwal") {
          const { rows } = await dbPool.query("SELECT * FROM kedisiplinan_jadwal_mingguan ORDER BY id ASC");
          send(req, res, 200, { ok: true, data: rows });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/jadwal") {

          const body = await readJsonBody(req);
          if (body.action === 'delete') {
             await dbPool.query("DELETE FROM kedisiplinan_jadwal_mingguan WHERE id = $1", [body.id]);
          } else if (body.id) {
             await dbPool.query("UPDATE kedisiplinan_jadwal_mingguan SET hari = $1, kampus = $2, guru_ids = $3, pj_code = $4 WHERE id = $5", [body.hari, body.kampus, JSON.stringify(body.guru_ids || []), body.pj_code || null, body.id]);
          } else {
             await dbPool.query("INSERT INTO kedisiplinan_jadwal_mingguan (hari, kampus, guru_ids, pj_code) VALUES ($1, $2, $3, $4)", [body.hari, body.kampus, JSON.stringify(body.guru_ids || []), body.pj_code || null]);
          }
          send(req, res, 200, { ok: true });
          return;
        }

        // POST /input_pos — Submit bulk pelanggaran dari Panel Piket
        // Payload: { student_nises: string[], tindakan_ids: number[] }
        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/input_pos") {
          const body = await readJsonBody(req);
          const session = getSession(req);
          const { student_nises, tindakan_ids } = body;

          if (!Array.isArray(student_nises) || student_nises.length === 0) {
            return send(req, res, 400, { ok: false, error: "student_nises wajib diisi." });
          }
          if (!Array.isArray(tindakan_ids) || tindakan_ids.length === 0) {
            return send(req, res, 400, { ok: false, error: "tindakan_ids wajib diisi." });
          }

          // Ambil data master tindakan yang dipilih
          const placeholders = tindakan_ids.map((_, i) => `$${i + 1}`).join(',');
          const { rows: tindakanList } = await dbPool.query(
            `SELECT id, nama_tindakan, nilai_poin, jenis FROM kedisiplinan_master_poin WHERE id IN (${placeholders}) AND is_deleted = false`,
            tindakan_ids
          );

          if (tindakanList.length === 0) {
            return send(req, res, 400, { ok: false, error: "Tindakan tidak ditemukan." });
          }

          // Insert satu baris per kombinasi siswa × tindakan
          for (const nis of student_nises) {
            for (const tindakan of tindakanList) {
              await dbPool.query(
                `INSERT INTO kedisiplinan_riwayat_poin (siswa_nis, tindakan_id, tindakan_nama, poin, jenis, pelapor_id, pelapor_nama)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [nis, tindakan.id, tindakan.nama_tindakan, tindakan.nilai_poin, tindakan.jenis,
                 session?.id || null, session?.name || 'Guru Piket']
              );
            }
            // Trigger auto SP / poin check setelah insert
            checkAndApplyAutoSpAndPoints(dbPool, nis).catch(e => console.error("Auto SP error:", e));
          }

          send(req, res, 200, { ok: true, message: `Berhasil menyimpan ${student_nises.length * tindakanList.length} pelanggaran.` });
          return;
        }

        if (req.method === "GET" && url.pathname === "/api/kedisiplinan/riwayat") {
          const limit = Math.min(parseInt(url.searchParams.get('limit') || '5000', 10), 10000);
          const offset = parseInt(url.searchParams.get('offset') || '0', 10);
          const { rows } = await dbPool.query("SELECT * FROM kedisiplinan_riwayat_poin ORDER BY tanggal_kejadian DESC LIMIT $1 OFFSET $2", [limit, offset]);
          send(req, res, 200, { ok: true, data: rows });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/riwayat") {
          const body = await readJsonBody(req);
          if (body.action === 'delete') {
             await dbPool.query("DELETE FROM kedisiplinan_riwayat_poin WHERE id = $1", [body.id]);
          } else {
             const session = getSession(req);
             await dbPool.query("INSERT INTO kedisiplinan_riwayat_poin (siswa_nis, tindakan_id, tindakan_nama, poin, jenis, pelapor_id, pelapor_nama, catatan) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [body.siswa_nis, body.tindakan_id, body.tindakan_nama, body.poin, body.jenis, session?.id, session?.name || 'Sistem', body.catatan]);
          }
          send(req, res, 200, { ok: true });
          return;
        }
        

        if (req.method === "GET" && url.pathname === "/api/kedisiplinan/konseling") {
          const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
          const offset = parseInt(url.searchParams.get('offset') || '0', 10);
          const { rows } = await dbPool.query("SELECT * FROM kedisiplinan_buku_konseling ORDER BY tanggal_konseling DESC LIMIT $1 OFFSET $2", [limit, offset]);
          send(req, res, 200, { ok: true, data: rows });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/konseling") {
          const body = await readJsonBody(req);
          if (body.action === 'delete') {
             await dbPool.query("DELETE FROM kedisiplinan_buku_konseling WHERE id = $1", [body.id]);
          } else {
             const session = getSession(req);
             await dbPool.query("INSERT INTO kedisiplinan_buku_konseling (siswa_nis, guru_bk_id, guru_bk_nama, jenis_kasus, tindak_lanjut, catatan_konseling, status) VALUES ($1, $2, $3, $4, $5, $6, $7)", [body.siswa_nis, session?.id, session?.name || 'BPBK', body.jenis_kasus, body.tindak_lanjut, body.catatan_konseling, body.status || 'Selesai']);
          }
          send(req, res, 200, { ok: true });
          return;
        }

        if (req.method === "GET" && url.pathname === "/api/kedisiplinan/absensi") {
          let startDate = null;
          try {
            const startRes = await dbPool.query("SELECT value FROM school_profile WHERE key = 'attendance_start_date' LIMIT 1");
            if (startRes.rows.length > 0 && startRes.rows[0].value) {
              startDate = startRes.rows[0].value;
            }
          } catch (err) {
            console.warn("Gagal membaca tanggal mulai absensi:", err.message);
          }

          let query = `
            SELECT 
              k.id, 
              k.siswa_nis, 
              s.payload->>'name' as student_name,
              COALESCE(s.payload->>'class_name', s.payload->>'kelas', s.payload->>'rombel') as class_name,
              TO_CHAR(k.tanggal, 'YYYY-MM-DD') as tanggal, 
              k.status, 
              k.keterangan, 
              k.pelapor_id, 
              k.pelapor_nama, 
              k.approval_status, 
              k.approved_by_id, 
              k.approved_by_name, 
              k.gdrive_url, 
              k.created_at 
            FROM kedisiplinan_absensi k
            LEFT JOIN mst_students s ON 
              s.payload->>'nis' = k.siswa_nis OR 
              s.payload->>'code' = k.siswa_nis
          `;
          let conditions = [];
          const queryParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
          if (queryParams.get("includeHikvision") !== "true") {
            conditions.push("(k.pelapor_nama IS NULL OR k.pelapor_nama != 'Mesin Hikvision')");
          }
          let params = [];
          
          const bulan = queryParams.get("bulan");
          if (bulan) {
            params.push(`${bulan}%`);
            conditions.push(`TO_CHAR(k.tanggal, 'YYYY-MM-DD') LIKE $${params.length}`);
          }
          
          if (startDate) {
            params.push(startDate);
            conditions.push(`k.tanggal >= $${params.length}`);
          }
          if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
          }
          query += " ORDER BY k.tanggal DESC, k.id DESC";
          
          const limit = parseInt(queryParams.get('limit') || '500', 10);
          const offset = parseInt(queryParams.get('offset') || '0', 10);
          query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
          params.push(limit, offset);

          const { rows } = await dbPool.query(query, params);
          send(req, res, 200, { ok: true, data: rows });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/absensi") {
          const body = await readJsonBody(req);
          const session = getSession(req);
          const roleStr = String(session?.role || '').toLowerCase();
          const subroleStr = String(session?.subrole || '').toLowerCase();
          const divisionStr = String(session?.division || '').toLowerCase();
          const jabatanStr = String(session?.jabatan || '').toLowerCase();

          const hasApprovalPermission = 
            roleStr.includes('kesiswaan') || 
            roleStr.includes('bk') || 
            roleStr.includes('bpbk') ||
            subroleStr.includes('kesiswaan') || 
            subroleStr.includes('bk') || 
            subroleStr.includes('bpbk') ||
            divisionStr.includes('kesiswaan') || 
            divisionStr.includes('bk') || 
            divisionStr.includes('bpbk') ||
            jabatanStr.includes('kesiswaan') || 
            jabatanStr.includes('bk') || 
            jabatanStr.includes('bpbk') ||
            ['admin', 'superadmin'].includes(roleStr) ||
            Boolean(session?.isBK || session?.isBPBK || session?.isKesiswaan);

          if (body.action === 'delete') {
             await dbPool.query("DELETE FROM kedisiplinan_absensi WHERE id = $1", [body.id]);
          } else if (body.action === 'approve') {
             if (!hasApprovalPermission) {
               return send(req, res, 403, { ok: false, error: "Hanya Bagian Kesiswaan atau Guru BP/BK yang berwenang menyetujui perizinan siswa." });
             }
             await dbPool.query(`
               UPDATE kedisiplinan_absensi 
               SET approval_status = 'approved', approved_by_id = $1, approved_by_name = $2 
               WHERE id = $3
             `, [session?.id, session?.name || 'BP/BK', body.id]);
          } else if (body.action === 'reject') {
             if (!hasApprovalPermission) {
               return send(req, res, 403, { ok: false, error: "Hanya Bagian Kesiswaan atau Guru BP/BK yang berwenang menolak perizinan siswa." });
             }
             await dbPool.query(`
               UPDATE kedisiplinan_absensi 
               SET approval_status = 'rejected', approved_by_id = $1, approved_by_name = $2 
               WHERE id = $3
             `, [session?.id, session?.name || 'BP/BK', body.id]);
          } else {
             // Handle insert & update with potential Google Drive file uploads
             let gdriveUrl = body.gdrive_url || null;
             
             // Initial save with base64 fallback
             if (body.fileData && !gdriveUrl) {
               gdriveUrl = body.fileData;
             }

             let finalId = body.id;
             if (body.action === 'update') {
                await dbPool.query("UPDATE kedisiplinan_absensi SET status = $1, keterangan = $2, gdrive_url = COALESCE($3, gdrive_url) WHERE id = $4", [body.status, body.keterangan, gdriveUrl, body.id]);
             } else {
                const isDirectApproved = hasApprovalPermission;
                const approvalStatus = isDirectApproved ? 'approved' : 'pending';
                const approvedById = isDirectApproved ? session?.id : null;
                const approvedByName = isDirectApproved ? (session?.name || 'Sistem') : null;

                const insertRes = await dbPool.query(`
                  INSERT INTO kedisiplinan_absensi 
                  (siswa_nis, tanggal, status, keterangan, pelapor_id, pelapor_nama, approval_status, approved_by_id, approved_by_name, gdrive_url) 
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
                  ON CONFLICT (siswa_nis, tanggal) 
                  DO UPDATE SET 
                    status = EXCLUDED.status,
                    keterangan = EXCLUDED.keterangan,
                    pelapor_id = EXCLUDED.pelapor_id,
                    pelapor_nama = EXCLUDED.pelapor_nama,
                    approval_status = EXCLUDED.approval_status,
                    approved_by_id = EXCLUDED.approved_by_id,
                    approved_by_name = EXCLUDED.approved_by_name,
                    gdrive_url = COALESCE(EXCLUDED.gdrive_url, kedisiplinan_absensi.gdrive_url)
                  RETURNING id
                `, [
                  body.siswa_nis, 
                  body.tanggal, 
                  body.status, 
                  body.keterangan, 
                  session?.id, 
                  session?.name || 'Sistem', 
                  approvalStatus, 
                  approvedById, 
                  approvedByName,
                  gdriveUrl
                ]);
                finalId = insertRes.rows[0].id;
             }

              if (body.siswa_nis) {
                checkAndApplyAutoSpAndPoints(dbPool, body.siswa_nis).catch(e => console.error("Auto SP error:", e));
              }

             // Background GDrive Upload
             if (body.fileData && body.fileName) {
               (async () => {
                 try {
                   const { rows: driveRows } = await dbPool.query("SELECT api_key, extra_config FROM api_keys WHERE service_name = 'google_drive' AND is_active = true LIMIT 1");
                   if (driveRows.length > 0 && driveRows[0].api_key) {
                     const credentials = JSON.parse(driveRows[0].api_key);
                     const driveConf = driveRows[0];
                     let extraConfig = {};
                     try { extraConfig = typeof driveConf.extra_config === 'string' ? JSON.parse(driveConf.extra_config) : (driveConf.extra_config || {}); } catch(e) {}
                     
                     let rootParentId = extraConfig.folder_id || null;
                     const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.file'] });
                     const drive = google.drive({ version: 'v3', auth });

                     const studentNis = body.siswa_nis;
                     const studentRes = await dbPool.query(`
                       SELECT payload 
                       FROM mst_students 
                       WHERE id = $1 OR payload->>'nis' = $2 OR payload->>'username' = $2 LIMIT 1
                     `, [studentNis, studentNis]);
                     
                     let name = studentNis; let className = "Umum"; let major = "Umum"; let tingkat = "Umum";
                     if (studentRes.rows.length > 0) {
                       const sp = studentRes.rows[0].payload;
                       name = sp.name || sp.namaSiswa || name;
                       className = sp.class_name || className;
                       major = sp.major || major;
                       const classFirstWord = className.split(" ")[0] || "";
                       if (["X", "XI", "XII", "10", "11", "12"].includes(classFirstWord.toUpperCase())) { tingkat = `Kelas ${classFirstWord.toUpperCase()}`; }
                     }

                     const mainRootId = await getOrCreateFolder(drive, "Kurmon Absensi", rootParentId);
                     const tingkatId = await getOrCreateFolder(drive, tingkat, mainRootId);
                     const majorId = await getOrCreateFolder(drive, major, tingkatId);
                     const classId = await getOrCreateFolder(drive, className, majorId);
                     const studentFolderId = await getOrCreateFolder(drive, name, classId);

                     const base64Data = body.fileData.split(';base64,').pop();
                     const buffer = Buffer.from(base64Data, 'base64');
                     const bufferStream = new Readable();
                     bufferStream.push(buffer);
                     bufferStream.push(null);

                     const uploadRes = await drive.files.create({
                       requestBody: { name: body.fileName, parents: [studentFolderId] },
                       media: { mimeType: 'image/jpeg', body: bufferStream },
                       fields: 'id, webViewLink',
                       supportsAllDrives: true
                     });

                     try {
                       await drive.permissions.create({
                         fileId: uploadRes.data.id,
                         requestBody: { role: 'reader', type: 'anyone' },
                         supportsAllDrives: true
                       });
                     } catch(e) { console.warn("Failed to set open permission on GDrive file", e); }

                     const newGdriveUrl = uploadRes.data.webViewLink;
                     await dbPool.query("UPDATE kedisiplinan_absensi SET gdrive_url = $1 WHERE id = $2", [newGdriveUrl, finalId]);
                   }
                 } catch(err) {
                   console.error("Background GDrive upload failed:", err);
                 }
               })();
             }
          }
          send(req, res, 200, { ok: true });
          return;
        }

        if (req.method === "GET" && url.pathname === "/api/kesiswaan/prestasi") {
          const { rows } = await dbPool.query("SELECT * FROM kesiswaan_prestasi ORDER BY tanggal_prestasi DESC, id DESC");
          send(req, res, 200, { ok: true, data: rows });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/kesiswaan/prestasi") {
          const body = await readJsonBody(req);
          if (body.action === 'delete') {
             await dbPool.query("DELETE FROM kesiswaan_prestasi WHERE id = $1", [body.id]);
          } else if (body.id) {
             await dbPool.query(`
               UPDATE kesiswaan_prestasi 
               SET siswa_nis = $1, nama_prestasi = $2, peringkat = $3, tingkat = $4, penyelenggara = $5, tanggal_prestasi = $6, keterangan = $7 
               WHERE id = $8
             `, [body.siswa_nis, body.nama_prestasi, body.peringkat, body.tingkat, body.penyelenggara, body.tanggal_prestasi, body.keterangan, body.id]);
          } else {
             await dbPool.query(`
               INSERT INTO kesiswaan_prestasi (siswa_nis, nama_prestasi, peringkat, tingkat, penyelenggara, tanggal_prestasi, keterangan) 
               VALUES ($1, $2, $3, $4, $5, $6, $7)
             `, [body.siswa_nis, body.nama_prestasi, body.peringkat, body.tingkat, body.penyelenggara, body.tanggal_prestasi, body.keterangan]);
          }
          send(req, res, 200, { ok: true });
          return;
        }

      } catch (err) {
         console.error("Kedisiplinan API Error:", err);
         sendDatabaseError(req, res, err);
      }
      return;
    }

  return false;
}

export async function checkAndApplyAutoSpAndPoints(dbPool, siswaNis) {
  if (!siswaNis) return;
  try {
    const cleanNis = String(siswaNis).trim();

    // Fetch student's class name from mst_students
    const stRes = await dbPool.query(`
      SELECT payload FROM mst_students 
      WHERE id = $1 OR payload->>'nis' = $1 OR payload->>'code' = $1 OR payload->>'nisn' = $1 LIMIT 1
    `, [cleanNis]).catch(() => ({ rows: [] }));
    const stPayload = stRes.rows[0]?.payload ? (typeof stRes.rows[0].payload === 'string' ? JSON.parse(stRes.rows[0].payload) : stRes.rows[0].payload) : {};
    const className = String(stPayload.class_name || stPayload.kelas || '').toUpperCase();

    // Fetch PKL eligible class setting
    const pklRes = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'pkl_settings'").catch(() => ({ rows: [] }));
    const pklSettings = pklRes.rows.length > 0 ? JSON.parse(pklRes.rows[0].data) : { eligibleClass: "XII" };
    const eligibleClass = String(pklSettings.eligibleClass || "XII").toUpperCase();

    // Fetch kedisiplinan settings from main_payload
    const payloadRes = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_payload'").catch(() => ({ rows: [] }));
    let kSettings = { batasAlpa: 5, poinAlpa: 15, batasTerlambat: 3, poinTerlambat: 10 };
    if (payloadRes.rows.length > 0) {
      try {
        const payload = JSON.parse(payloadRes.rows[0].data);
        if (payload.kedisiplinanSettings) {
          kSettings = { ...kSettings, ...payload.kedisiplinanSettings };
        }
      } catch (e) {}
    }

    // If student belongs to PKL class (e.g. Class XII), fingerprint attendance auto-sanksi does NOT apply!
    if (className && className.startsWith(eligibleClass)) {
      return;
    }

    // Count total Alpa for this student from kedisiplinan_absensi
    const countRes = await dbPool.query(`
      SELECT COUNT(*) as total_alpa 
      FROM kedisiplinan_absensi 
      WHERE siswa_nis = $1 
        AND (LOWER(status) = 'alpa' OR LOWER(status) = 'belum scan')
    `, [cleanNis]);
    
    const alpaCount = parseInt(countRes.rows[0]?.total_alpa || 0, 10);

    if (alpaCount > (kSettings.batasAlpa || 5)) {
      // 1. Check if point violation already recorded
      const checkPoin = await dbPool.query(`
        SELECT id FROM kedisiplinan_riwayat_poin 
        WHERE siswa_nis = $1
          AND tindakan_nama LIKE '%Akumulasi Alpa >%'
        LIMIT 1
      `, [cleanNis]);

      if (checkPoin.rows.length === 0) {
        await dbPool.query(`
          INSERT INTO kedisiplinan_riwayat_poin 
          (siswa_nis, tindakan_nama, poin, jenis, pelapor_nama, catatan) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          cleanNis, 
          `Pelanggaran Absensi: Akumulasi Alpa > ${kSettings.batasAlpa || 5} Hari`, 
          kSettings.poinAlpa || 15, 
          'pelanggaran', 
          'Sistem Kedisiplinan', 
          `Otomatis oleh sistem: Siswa mencapai ${alpaCount} hari Alpa (melebihi batas ${kSettings.batasAlpa || 5} hari)`
        ]);
      }

      // 2. Check if SP-1 already recorded in bk_sessions
      const checkKonseling = await dbPool.query(`
        SELECT id FROM bk_sessions 
        WHERE student_nis = $1
          AND (problem LIKE '%Alpa >%' OR status LIKE '%SP%')
        LIMIT 1
      `, [cleanNis]);

      if (checkKonseling.rows.length === 0) {
        await dbPool.query(`
          INSERT INTO bk_sessions 
          (student_nis, counselor_name, category, problem, solution, status) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          cleanNis, 
          'Sistem Kesiswaan', 
          'Kedisiplinan',
          `Pelanggaran Absensi (Alpa > ${kSettings.batasAlpa || 5} Hari)`, 
          'Penerbitan Surat Peringatan 1 (SP-1) & Pemanggilan Orang Tua', 
          'Berjalan'
        ]);
        
        // Terbitkan SP-1 secara otomatis di bk_letters
        await dbPool.query(`
          INSERT INTO bk_letters
          (student_nis, letter_type, letter_no, reason, status, appointed_person)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          cleanNis,
          'SP 1',
          `BK-AUTO/${new Date().getFullYear()}/ALPA-${alpaCount}`,
          `Otomatis diterbitkan oleh sistem karena akumulasi Alpa siswa mencapai ${alpaCount} hari.`,
          'Diterbitkan',
          'Sistem BK Otomatis'
        ]);
      }
    }

    // Count total Terlambat for this student
    const tltRes = await dbPool.query(`
      SELECT COUNT(*) as total_terlambat 
      FROM kedisiplinan_absensi 
      WHERE siswa_nis = $1 
        AND LOWER(status) = 'terlambat'
    `, [cleanNis]);
    
    const terlambatCount = parseInt(tltRes.rows[0]?.total_terlambat || 0, 10);

    if (terlambatCount > (kSettings.batasTerlambat || 3)) {
      // 1. Check if point violation for Terlambat already recorded
      const checkTltPoin = await dbPool.query(`
        SELECT id FROM kedisiplinan_riwayat_poin 
        WHERE siswa_nis = $1
          AND tindakan_nama LIKE '%Akumulasi Terlambat >%'
        LIMIT 1
      `, [cleanNis]);

      if (checkTltPoin.rows.length === 0) {
        await dbPool.query(`
          INSERT INTO kedisiplinan_riwayat_poin 
          (siswa_nis, tindakan_nama, poin, jenis, pelapor_nama, catatan) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          cleanNis, 
          `Akumulasi Terlambat > ${kSettings.batasTerlambat || 3} Kali (Teguran Lisan)`, 
          kSettings.poinTerlambat || 10, 
          'pelanggaran', 
          'Sistem Kedisiplinan', 
          `Otomatis oleh sistem: Siswa mencapai ${terlambatCount} kali Terlambat (melebihi batas ${kSettings.batasTerlambat || 3} kali)`
        ]);
      }

      // 2. Check if Teguran already recorded in bk_sessions
      const checkTltKonseling = await dbPool.query(`
        SELECT id FROM bk_sessions 
        WHERE student_nis = $1
          AND (problem LIKE '%Terlambat >%' OR solution LIKE '%Teguran%')
        LIMIT 1
      `, [cleanNis]);

      if (checkTltKonseling.rows.length === 0) {
        await dbPool.query(`
          INSERT INTO bk_sessions 
          (student_nis, counselor_name, category, problem, solution, status) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          cleanNis, 
          'Sistem Kesiswaan', 
          'Kedisiplinan',
          `Kedisiplinan: Terlambat Datang > ${kSettings.batasTerlambat || 3} Kali`, 
          `Otomatis diterbitkan oleh sistem karena akumulasi Terlambat siswa mencapai ${terlambatCount} kali. (Teguran Lisan)`, 
          'Berjalan'
        ]);
      }
    }
  } catch (err) {
    console.error("Error in checkAndApplyAutoSpAndPoints:", err.message);
  }
}

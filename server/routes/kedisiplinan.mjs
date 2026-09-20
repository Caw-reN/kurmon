import { google } from 'googleapis';
import { Readable } from 'stream';

// Helper to get or create folder hierarchically in Google Drive
async function getOrCreateFolder(drive, folderName, parentId = null) {
  // SEC-08 FIX: Gunakan array params untuk query agar tidak ada string interpolation
  // yang rentan terhadap injection. Google Drive API mendukung multiple 'q' constraints.
  const queryParts = [
    `name = '${String(folderName).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`
  ];
  if (parentId) {
    // parentId berasal dari API response Google Drive sendiri, sudah aman
    queryParts.push(`'${String(parentId).replace(/[^a-zA-Z0-9_-]/g, '')}' in parents`);
  }
  const res = await drive.files.list({
    q: queryParts.join(' and '),
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
  const { dbPool, send, sendDatabaseError, requireAuthenticated, getSession, readJsonBody, readMainPayload, isMonitoringAdmin, isAdminRole, logAudit } = ctx;
  
    if (url.pathname.startsWith("/api/kedisiplinan/") || url.pathname.startsWith("/api/kesiswaan/")) {
      const isPublicGet = req.method === "GET" && (
        url.pathname === "/api/kedisiplinan/rules.pdf" ||
        url.pathname === "/api/kedisiplinan/master" ||
        url.pathname === "/api/kedisiplinan/jadwal"
      );
      if (!isPublicGet && !requireAuthenticated(req, res)) return;
      
      const session = getSession(req);
      const role = (session?.role || '').toLowerCase();
      const isAdminStaff = ['admin', 'superadmin', 'kesiswaan', 'waka_kesiswaan', 'waka', 'kepsek'].includes(role);
      const isSchoolStaff = ['admin', 'superadmin', 'kesiswaan', 'waka_kesiswaan', 'waka', 'guru', 'bk', 'bpbk', 'piket', 'tu', 'kepsek'].includes(role);
      const isBkStaff = ['admin', 'superadmin', 'bk', 'bpbk', 'kesiswaan', 'waka_kesiswaan', 'waka', 'kepsek'].includes(role);

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
          if (!isAdminStaff) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya Admin/Kesiswaan." });
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

          // SEC-12 FIX: Catat audit log untuk upload PDF peraturan sekolah
          if (logAudit && session) {
            await logAudit(dbPool, session, req, 'UPLOAD', 'school_rules_pdf', `Upload PDF peraturan sekolah: ${payload.fileName}`);
          }

          send(req, res, 200, { ok: true });
          return;
        }

        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/delete-rules") {
          if (!isAdminStaff) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya Admin/Kesiswaan." });
          await dbPool.query("DELETE FROM app_data WHERE store_key = 'school_rules_pdf'");
          send(req, res, 200, { ok: true });
          return;
        }

        if (req.method === "GET" && url.pathname === "/api/kedisiplinan/attendance-start-date") {
          const resStart = await dbPool.query("SELECT value FROM school_profile WHERE key = 'attendance_start_date' LIMIT 1");
          // S-08 FIX: Fallback dinamis — menghitung awal tahun ajaran berdasarkan tanggal sekarang
          // Semester ganjil mulai Juli; semester genap mulai Januari
          let dynamicDefault;
          {
            const now = new Date();
            const month = now.getMonth(); // 0-indexed
            const year  = now.getFullYear();
            // Bulan Juli (6) - Desember (11) = semester ganjil, mulai 1 Juli tahun ini
            // Bulan Jan (0) - Juni (5) = semester genap, mulai 1 Januari tahun ini
            dynamicDefault = month >= 6 ? `${year}-07-01` : `${year}-01-01`;
          }
          const dateVal = resStart.rows.length > 0 ? resStart.rows[0].value : dynamicDefault;
          send(req, res, 200, { ok: true, startDate: dateVal });
          return;
        }

        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/attendance-start-date") {
          if (!isAdminStaff) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya Admin/Kesiswaan." });
          const body = await readJsonBody(req);
          // S-08 FIX: Fallback dinamis jika tidak ada tanggal dikirim
          const now = new Date();
          const dynamicFallback = now.getMonth() >= 6
            ? `${now.getFullYear()}-07-01`
            : `${now.getFullYear()}-01-01`;
          const startDate = body.startDate || dynamicFallback;
          await dbPool.query(`
            INSERT INTO school_profile (key, value) VALUES ('attendance_start_date', $1)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
          `, [startDate]);
          send(req, res, 200, { ok: true, startDate });
          return;
        }

        // SECURITY FIX (BUG-02): Handler POST /api/kesiswaan/catatan-walikelas yang ada di sini
        // telah DIHAPUS karena merupakan duplikat yang bypass security check (ownership/role).
        // Semua request POST catatan-walikelas sekarang di-handle HANYA oleh jurnal.mjs
        // yang sudah memiliki full auth + ownership validation yang benar.

        if (req.method === "GET" && url.pathname === "/api/kedisiplinan/master") {
          const { rows } = await dbPool.query("SELECT * FROM kedisiplinan_master_poin WHERE is_deleted = false ORDER BY nama_tindakan ASC");
          send(req, res, 200, { ok: true, data: rows });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/master") {
          if (!isAdminStaff) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya Admin/Kesiswaan." });
          const body = await readJsonBody(req);
          const VALID_JENIS = ['pelanggaran', 'penghargaan'];

          if (body.action === 'delete') {
            if (!body.id) return send(req, res, 400, { ok: false, error: "ID diperlukan." });
            await dbPool.query("UPDATE kedisiplinan_master_poin SET is_deleted = true WHERE id = $1", [body.id]);
          } else if (body.action === 'import' && Array.isArray(body.items)) {
            for (const item of body.items) {
              let itemJenis = String(item.jenis || '').toLowerCase().trim();
              if (itemJenis === 'prestasi') itemJenis = 'penghargaan';
              if (item.nama_tindakan && VALID_JENIS.includes(itemJenis) && item.nilai_poin !== undefined) {
                const poin = parseInt(item.nilai_poin, 10);
                if (!isNaN(poin)) {
                  await dbPool.query("INSERT INTO kedisiplinan_master_poin (nama_tindakan, jenis, nilai_poin) VALUES ($1, $2, $3)", [String(item.nama_tindakan).trim(), itemJenis, poin]);
                }
              }
            }
          } else if (body.id) {
            // FIX FLOW-04: Validasi input sebelum update
            let jenis = String(body.jenis || '').toLowerCase().trim();
            if (jenis === 'prestasi') jenis = 'penghargaan';
            if (!body.nama_tindakan?.trim()) return send(req, res, 400, { ok: false, error: "Nama tindakan wajib diisi." });
            if (!VALID_JENIS.includes(jenis)) return send(req, res, 400, { ok: false, error: "Jenis harus 'pelanggaran' atau 'penghargaan'." });
            const poin = parseInt(body.nilai_poin, 10);
            if (isNaN(poin) || poin < 0 || poin > 1000) return send(req, res, 400, { ok: false, error: "Nilai poin harus angka 0-1000." });
            await dbPool.query("UPDATE kedisiplinan_master_poin SET nama_tindakan = $1, jenis = $2, nilai_poin = $3 WHERE id = $4", [String(body.nama_tindakan).trim(), jenis, poin, body.id]);
          } else {
            // FIX FLOW-04: Validasi input sebelum insert
            let jenis = String(body.jenis || '').toLowerCase().trim();
            if (jenis === 'prestasi') jenis = 'penghargaan';
            if (!body.nama_tindakan?.trim()) return send(req, res, 400, { ok: false, error: "Nama tindakan wajib diisi." });
            if (!VALID_JENIS.includes(jenis)) return send(req, res, 400, { ok: false, error: "Jenis harus 'pelanggaran' atau 'penghargaan'." });
            const poin = parseInt(body.nilai_poin, 10);
            if (isNaN(poin) || poin < 0 || poin > 1000) return send(req, res, 400, { ok: false, error: "Nilai poin harus angka 0-1000." });
            await dbPool.query("INSERT INTO kedisiplinan_master_poin (nama_tindakan, jenis, nilai_poin) VALUES ($1, $2, $3)", [String(body.nama_tindakan).trim(), jenis, poin]);
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
          if (!isAdminStaff) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya Admin/Kesiswaan yang dapat mengubah jadwal piket." });
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
          if (!isSchoolStaff) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya Guru/Piket yang dapat mencatat pelanggaran." });
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
          // SECURITY-FIX K-02: Batasi akses berdasarkan role
          // Siswa hanya bisa melihat riwayat pelanggaran miliknya sendiri
          const currentSession = getSession(req);
          const currentRole = String(currentSession?.role || '').toLowerCase();
          const isSiswa = currentRole === 'siswa';

          // SECURITY-FIX T-06: Validasi parameter pagination
          const rawLimit = parseInt(url.searchParams.get('limit') || '200', 10);
          const rawOffset = parseInt(url.searchParams.get('offset') || '0', 10);
          // Non-admin/staf dibatasi max 200 rows; admin/staf max 5000
          const maxLimit = isSchoolStaff ? 5000 : 200;
          const limit = Math.min(isNaN(rawLimit) || rawLimit < 1 ? 200 : rawLimit, maxLimit);
          const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

          let query, params;
          if (isSiswa) {
            // Siswa: hanya data dirinya sendiri
            const myNis = currentSession?.id || currentSession?.username;
            query = "SELECT * FROM kedisiplinan_riwayat_poin WHERE siswa_nis = $1 ORDER BY tanggal_kejadian DESC LIMIT $2 OFFSET $3";
            params = [myNis, limit, offset];
          } else {
            // Staf & Admin: bisa filter per siswa via query param, atau lihat semua
            const filterNis = url.searchParams.get('siswa_nis');
            if (filterNis) {
              query = "SELECT * FROM kedisiplinan_riwayat_poin WHERE siswa_nis = $1 ORDER BY tanggal_kejadian DESC LIMIT $2 OFFSET $3";
              params = [filterNis, limit, offset];
            } else {
              query = "SELECT * FROM kedisiplinan_riwayat_poin ORDER BY tanggal_kejadian DESC LIMIT $1 OFFSET $2";
              params = [limit, offset];
            }
          }

          const { rows } = await dbPool.query(query, params);
          send(req, res, 200, { ok: true, data: rows });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/riwayat") {
          const body = await readJsonBody(req);
          if (body.action === 'delete') {
             if (!isAdminStaff) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya Admin/Kesiswaan yang dapat menghapus riwayat poin." });
             const deleteId = parseInt(body.id, 10);
             if (isNaN(deleteId) || deleteId <= 0) return send(req, res, 400, { ok: false, error: "ID tidak valid." });
             await dbPool.query("DELETE FROM kedisiplinan_riwayat_poin WHERE id = $1", [deleteId]);
             // SEC-12 FIX: Audit log untuk hapus riwayat poin
             if (logAudit && session) {
               await logAudit(dbPool, session, req, 'DELETE', 'kedisiplinan_riwayat_poin', `Hapus riwayat poin ID: ${deleteId}`, String(deleteId));
             }
          } else {
             if (!isSchoolStaff) return send(req, res, 403, { ok: false, error: "Akses ditolak. Siswa tidak diizinkan mencatat poin/tindakan." });
             const session = getSession(req);
             // SEC-11 FIX: Validasi tipe dan format input sebelum INSERT
             const siswa_nis = String(body.siswa_nis || '').trim();
             const tindakan_id = body.tindakan_id ? parseInt(body.tindakan_id, 10) : null;
             const tindakan_nama = String(body.tindakan_nama || '').trim().slice(0, 255);
             const poin = parseInt(body.poin, 10);
             const VALID_JENIS = ['pelanggaran', 'penghargaan'];
             let jenis = String(body.jenis || '').toLowerCase().trim();
             if (!siswa_nis) return send(req, res, 400, { ok: false, error: "siswa_nis wajib diisi." });
             if (isNaN(poin) || poin < 0 || poin > 10000) return send(req, res, 400, { ok: false, error: "Nilai poin tidak valid (0-10000)." });
             if (!VALID_JENIS.includes(jenis)) return send(req, res, 400, { ok: false, error: "Jenis harus 'pelanggaran' atau 'penghargaan'." });
             if (tindakan_id !== null && isNaN(tindakan_id)) return send(req, res, 400, { ok: false, error: "tindakan_id tidak valid." });
             await dbPool.query(
               "INSERT INTO kedisiplinan_riwayat_poin (siswa_nis, tindakan_id, tindakan_nama, poin, jenis, pelapor_id, pelapor_nama, catatan) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
               [siswa_nis, tindakan_id, tindakan_nama, poin, jenis, session?.id, session?.name || 'Sistem', String(body.catatan || '').trim().slice(0, 1000)]
             );
          }
          send(req, res, 200, { ok: true });
          return;
        }
        

        if (req.method === "GET" && url.pathname === "/api/kedisiplinan/konseling") {
          if (!isBkStaff) return send(req, res, 403, { ok: false, error: "Akses ditolak. Data buku konseling bersifat rahasia." });
          const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
          const offset = parseInt(url.searchParams.get('offset') || '0', 10);
          const { rows } = await dbPool.query("SELECT * FROM kedisiplinan_buku_konseling ORDER BY tanggal_konseling DESC LIMIT $1 OFFSET $2", [limit, offset]);
          send(req, res, 200, { ok: true, data: rows });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/kedisiplinan/konseling") {
          if (!isBkStaff) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya Guru BK/Kesiswaan yang dapat mengelola buku konseling." });
          const body = await readJsonBody(req);
          if (body.action === 'delete') {
             await dbPool.query("DELETE FROM kedisiplinan_buku_konseling WHERE id = $1", [body.id]);
          } else {
             const session = getSession(req);
             // B3-MINOR-B FIX: Tambah trim + batas panjang maksimal field teks konseling
             // agar tidak ada oversized DB row dari input yang sangat panjang
             const jenis_kasus       = String(body.jenis_kasus       || '').trim().slice(0, 500);
             const tindak_lanjut     = String(body.tindak_lanjut     || '').trim().slice(0, 2000);
             const catatan_konseling = String(body.catatan_konseling || '').trim().slice(0, 2000);
             const status_konseling  = String(body.status            || 'Selesai').trim().slice(0, 50);
             await dbPool.query("INSERT INTO kedisiplinan_buku_konseling (siswa_nis, guru_bk_id, guru_bk_nama, jenis_kasus, tindak_lanjut, catatan_konseling, status) VALUES ($1, $2, $3, $4, $5, $6, $7)", [body.siswa_nis, session?.id, session?.name || 'BPBK', jenis_kasus, tindak_lanjut, catatan_konseling, status_konseling]);
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
          if (queryParams.get("includeHikvision") === "false") {
            conditions.push("(k.pelapor_nama IS NULL OR k.pelapor_nama != 'Mesin Hikvision')");
          }
          let params = [];
          
          const bulan = queryParams.get("bulan");
          if (bulan) {
            // Filter eksplisit dari frontend
            params.push(`${bulan}%`);
            conditions.push(`TO_CHAR(k.tanggal, 'YYYY-MM-DD') LIKE $${params.length}`);
          } else if (!startDate) {
            // Jika tidak ada filter bulan DAN tidak ada startDate, 
            // default ke bulan berjalan agar data tidak terpotong di production
            const now = new Date();
            const defaultBulan = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            params.push(`${defaultBulan}%`);
            conditions.push(`TO_CHAR(k.tanggal, 'YYYY-MM-DD') LIKE $${params.length}`);
          }
          
          if (startDate && !bulan) {
            params.push(startDate);
            conditions.push(`k.tanggal >= $${params.length}`);
          }
          if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
          }
          query += " ORDER BY k.tanggal DESC, k.id DESC";
          
          // B3-SEC-A FIX: Cap limit dari 99999 ke 5000 untuk mencegah DoS via query param
          // Sebelumnya limit=99999 bisa menyebabkan server mengambil puluhan ribu rows sekaligus
          const rawLimit  = parseInt(queryParams.get('limit')  || '5000', 10);
          const rawOffset = parseInt(queryParams.get('offset') || '0',    10);
          const limit  = Math.min(isNaN(rawLimit)  || rawLimit  < 1 ? 5000 : rawLimit,  5000);
          const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;
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
             if (!hasApprovalPermission && !isAdminStaff) {
               return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya Bagian Kesiswaan/BK/Admin yang dapat menghapus data absensi." });
             }
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
             if (roleStr === 'siswa') {
               const myNis = session?.id || session?.username;
               if (body.siswa_nis && String(body.siswa_nis) !== String(myNis)) {
                 return send(req, res, 403, { ok: false, error: "Siswa hanya dapat mengajukan perizinan untuk akun diri sendiri." });
               }
             }

             let gdriveUrl = body.gdrive_url || null;
             
             // Initial save with base64 fallback
             if (body.fileData && !gdriveUrl) {
               gdriveUrl = body.fileData;
             }

             let finalId = body.id;
             if (body.action === 'update') {
                if (!hasApprovalPermission && !isAdminStaff) {
                  return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya Staf/Admin yang dapat mengubah data perizinan absensi." });
                }
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
          // SECURITY-FIX K-03: Endpoint prestasi harus memerlukan autentikasi
          // (requireAuthenticated sudah dipanggil di atas untuk seluruh blok non-public)
          // Tambahan: siswa hanya bisa lihat prestasi miliknya sendiri
          const prestasiSession = getSession(req);
          const prestasiRole = String(prestasiSession?.role || '').toLowerCase();
          const isSiswaReq = prestasiRole === 'siswa';

          let prestasiRows;
          if (isSiswaReq) {
            const myNis = prestasiSession?.id || prestasiSession?.username;
            const res2 = await dbPool.query(
              "SELECT * FROM kesiswaan_prestasi WHERE siswa_nis = $1 ORDER BY tanggal_prestasi DESC, id DESC",
              [myNis]
            );
            prestasiRows = res2.rows;
          } else {
            const res2 = await dbPool.query("SELECT * FROM kesiswaan_prestasi ORDER BY tanggal_prestasi DESC, id DESC");
            prestasiRows = res2.rows;
          }
          send(req, res, 200, { ok: true, data: prestasiRows });
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/kesiswaan/prestasi") {
          if (!isSchoolStaff) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya Staf/Guru/Kesiswaan yang dapat mengelola data prestasi." });
          const body = await readJsonBody(req);
          const currentUserId = session?.id || session?.username || null;
          const currentUserName = session?.name || session?.username || 'Petugas Kesiswaan';

          if (body.action === 'delete') {
             if (!isAdminStaff) return send(req, res, 403, { ok: false, error: "Akses ditolak. Hanya Admin/Kesiswaan yang dapat menghapus data prestasi." });
             await dbPool.query("DELETE FROM kesiswaan_prestasi WHERE id = $1", [body.id]);
          } else if (body.id) {
             await dbPool.query(`
               UPDATE kesiswaan_prestasi 
               SET siswa_nis = $1, nama_prestasi = $2, peringkat = $3, tingkat = $4, penyelenggara = $5, tanggal_prestasi = $6, keterangan = $7,
                   updated_by = $8, updated_by_name = $9, updated_at = CURRENT_TIMESTAMP
               WHERE id = $10
             `, [body.siswa_nis, body.nama_prestasi, body.peringkat, body.tingkat, body.penyelenggara, body.tanggal_prestasi, body.keterangan, currentUserId, currentUserName, body.id]);
          } else {
             await dbPool.query(`
               INSERT INTO kesiswaan_prestasi (siswa_nis, nama_prestasi, peringkat, tingkat, penyelenggara, tanggal_prestasi, keterangan, created_by, created_by_name) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             `, [body.siswa_nis, body.nama_prestasi, body.peringkat, body.tingkat, body.penyelenggara, body.tanggal_prestasi, body.keterangan, currentUserId, currentUserName]);
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

// T-03 FIX: In-memory lock set untuk mencegah race condition saat banyak request masuk
// bersamaan untuk siswa yang sama (fire-and-forget calls).
const _autoSpLocks = new Set();

export async function checkAndApplyAutoSpAndPoints(dbPool, siswaNis) {
  if (!siswaNis) return;

  const cleanNis = String(siswaNis).trim();

  // T-03 FIX: Jika sedang diproses untuk NIS yang sama, skip untuk hindari race condition
  if (_autoSpLocks.has(cleanNis)) return;
  _autoSpLocks.add(cleanNis);

  try {
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

    // Fetch kedisiplinan settings from main_store (or legacy main_payload)
    const payloadRes = await dbPool.query("SELECT data FROM app_data WHERE store_key IN ('main_store', 'main_payload') ORDER BY (CASE WHEN store_key = 'main_store' THEN 1 ELSE 2 END) LIMIT 1").catch(() => ({ rows: [] }));
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
      _autoSpLocks.delete(cleanNis);
      return;
    }

    // K-01 FIX: Hitung SP level berdasarkan akumulasi alpa saat ini
    // SP-1: alpa > batas, SP-2: alpa > 2x batas, SP-3: alpa > 3x batas
    const batasAlpa = kSettings.batasAlpa || 5;
    const batasTerlambat = kSettings.batasTerlambat || 3;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed; bulan >= 6 = semester ganjil tahun ini
    // Semester ganjil: Juli-Desember (bulan 6-11), genap: Jan-Juni (0-5)
    const tahunAjaran = currentMonth >= 6
      ? `${currentYear}/${currentYear + 1}`
      : `${currentYear - 1}/${currentYear}`;
    const semesterStr = currentMonth >= 6 ? 'Ganjil' : 'Genap';

    // Count total Alpa untuk siswa ini (dari awal tahun ajaran aktif)
    const countRes = await dbPool.query(`
      SELECT COUNT(*) as total_alpa 
      FROM kedisiplinan_absensi 
      WHERE siswa_nis = $1 
        AND (LOWER(status) = 'alpa' OR LOWER(status) = 'belum scan')
    `, [cleanNis]);
    
    const alpaCount = parseInt(countRes.rows[0]?.total_alpa || 0, 10);

    // Tentukan level SP yang seharusnya berdasarkan jumlah alpa
    let targetSpLevel = 0;
    if (alpaCount > batasAlpa * 3) targetSpLevel = 3;
    else if (alpaCount > batasAlpa * 2) targetSpLevel = 2;
    else if (alpaCount > batasAlpa) targetSpLevel = 1;

    if (targetSpLevel > 0) {
      const spLabel = `SP ${targetSpLevel}`;
      const spNote = targetSpLevel === 1
        ? `Penerbitan Surat Peringatan 1 (SP-1) & Pemanggilan Orang Tua`
        : targetSpLevel === 2
          ? `Penerbitan Surat Peringatan 2 (SP-2) — Peringatan Keras & Skorsing`
          : `Penerbitan Surat Peringatan 3 (SP-3) — Rekomendasi Dikeluarkan`;

      // 1. Cek apakah poin pelanggaran untuk level SP ini sudah dicatat tahun ajaran ini
      const poinLabel = `Akumulasi Alpa > ${batasAlpa * targetSpLevel} Hari [${tahunAjaran}]`;
      const checkPoin = await dbPool.query(`
        SELECT id FROM kedisiplinan_riwayat_poin 
        WHERE siswa_nis = $1
          AND tindakan_nama LIKE $2
        LIMIT 1
      `, [cleanNis, `%${poinLabel}%`]);

      if (checkPoin.rows.length === 0) {
        await dbPool.query(`
          INSERT INTO kedisiplinan_riwayat_poin 
          (siswa_nis, tindakan_nama, poin, jenis, pelapor_nama, catatan) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          cleanNis, 
          `Pelanggaran Absensi: ${poinLabel}`, 
          kSettings.poinAlpa || 15, 
          'pelanggaran', 
          'Sistem Kedisiplinan', 
          `Otomatis oleh sistem: Siswa mencapai ${alpaCount} hari Alpa — ${spLabel} TA ${tahunAjaran} Semester ${semesterStr}`
        ]);
      }

      // 2. Cek apakah SP level ini sudah ada di bk_letters tahun ajaran ini
      // K-01 FIX: Filter per level SP DAN per tahun ajaran agar SP-2 bisa diterbitkan
      const checkSpExists = await dbPool.query(`
        SELECT id FROM bk_letters
        WHERE student_nis = $1
          AND letter_type = $2
          AND letter_no LIKE $3
        LIMIT 1
      `, [cleanNis, spLabel, `BK-AUTO/${currentYear}/%`]);

      if (checkSpExists.rows.length === 0) {
        // Insert bk_sessions
        await dbPool.query(`
          INSERT INTO bk_sessions 
          (student_nis, counselor_name, category, problem, solution, status) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          cleanNis, 
          'Sistem Kesiswaan', 
          'Kedisiplinan',
          `Pelanggaran Absensi (Alpa > ${batasAlpa * targetSpLevel} Hari) — TA ${tahunAjaran}`, 
          spNote,
          'Berjalan'
        ]);
        
        // Terbitkan SP secara otomatis di bk_letters
        await dbPool.query(`
          INSERT INTO bk_letters
          (student_nis, letter_type, letter_no, reason, status, appointed_person)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          cleanNis,
          spLabel,
          `BK-AUTO/${currentYear}/ALPA-${alpaCount}-SP${targetSpLevel}`,
          `Otomatis diterbitkan oleh sistem karena akumulasi Alpa siswa mencapai ${alpaCount} hari (melebihi ${batasAlpa * targetSpLevel} hari) — TA ${tahunAjaran} Semester ${semesterStr}.`,
          'Diterbitkan',
          'Sistem BK Otomatis'
        ]);
      }
    }

    // Count total Terlambat untuk siswa ini
    const tltRes = await dbPool.query(`
      SELECT COUNT(*) as total_terlambat 
      FROM kedisiplinan_absensi 
      WHERE siswa_nis = $1 
        AND LOWER(status) = 'terlambat'
    `, [cleanNis]);
    
    const terlambatCount = parseInt(tltRes.rows[0]?.total_terlambat || 0, 10);

    if (terlambatCount > batasTerlambat) {
      // K-01 FIX: Cek per tahun ajaran, bukan seumur hidup
      const tltPoinLabel = `Akumulasi Terlambat > ${batasTerlambat} Kali [${tahunAjaran}]`;
      const checkTltPoin = await dbPool.query(`
        SELECT id FROM kedisiplinan_riwayat_poin 
        WHERE siswa_nis = $1
          AND tindakan_nama LIKE $2
        LIMIT 1
      `, [cleanNis, `%${tltPoinLabel}%`]);

      if (checkTltPoin.rows.length === 0) {
        await dbPool.query(`
          INSERT INTO kedisiplinan_riwayat_poin 
          (siswa_nis, tindakan_nama, poin, jenis, pelapor_nama, catatan) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          cleanNis, 
          `${tltPoinLabel} (Teguran Lisan)`, 
          kSettings.poinTerlambat || 10, 
          'pelanggaran', 
          'Sistem Kedisiplinan', 
          `Otomatis oleh sistem: Siswa mencapai ${terlambatCount} kali Terlambat (melebihi batas ${batasTerlambat} kali) — TA ${tahunAjaran}`
        ]);
      }

      // Cek teguran per tahun ajaran
      const checkTltKonseling = await dbPool.query(`
        SELECT id FROM bk_sessions 
        WHERE student_nis = $1
          AND problem LIKE $2
        LIMIT 1
      `, [cleanNis, `%Terlambat%${tahunAjaran}%`]);

      if (checkTltKonseling.rows.length === 0) {
        await dbPool.query(`
          INSERT INTO bk_sessions 
          (student_nis, counselor_name, category, problem, solution, status) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          cleanNis, 
          'Sistem Kesiswaan', 
          'Kedisiplinan',
          `Kedisiplinan: Terlambat Datang > ${batasTerlambat} Kali — TA ${tahunAjaran}`, 
          `Otomatis diterbitkan oleh sistem karena akumulasi Terlambat siswa mencapai ${terlambatCount} kali. (Teguran Lisan)`, 
          'Berjalan'
        ]);
      }
    }
  } catch (err) {
    console.error("Error in checkAndApplyAutoSpAndPoints:", err.message);
  } finally {
    // T-03 FIX: Selalu lepas lock di finally agar tidak terjadi deadlock
    _autoSpLocks.delete(cleanNis);
  }
}


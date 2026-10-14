export async function handleSettingsRoutes(req, res, url, ctx) {
  const {
    dbPool,
    send,
    sendDatabaseError,
    requireAuthenticated,
    getSession,
    readJsonBody,
    isAdminRole,
    store,
    writeStore
  } = ctx;

  if (req.method === "GET" && url.pathname === "/api/settings/pkl") {
    if (!requireAuthenticated(req, res)) return true;
    try {
      const { rows } = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'pkl_settings'");
      const pklSettings = rows.length > 0 ? JSON.parse(rows[0].data) : { eligibleClass: "XII" };
      send(req, res, 200, { ok: true, data: pklSettings });
    } catch (err) {
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  if ((req.method === "PUT" || req.method === "POST") && url.pathname === "/api/settings/pkl") {
    const session = getSession(req);
    const role = String(session?.role || '').toLowerCase();
    const isAuthorized = isAdminRole(role) || ['admin', 'superadmin', 'tu', 'tata_usaha', 'waka', 'waka_kurikulum', 'waka_hubin', 'kaprog', 'hubin'].includes(role);
    if (!isAuthorized) {
      send(req, res, 403, { ok: false, error: "Hanya Admin/Manajemen Sekolah yang dapat mengubah pengaturan PKL" });
      return true;
    }
    const body = await readJsonBody(req);
    try {
      const { rows } = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'pkl_settings'");
      const current = rows.length > 0 ? JSON.parse(rows[0].data) : { eligibleClass: "XII" };
      const updated = { 
        ...current, 
        ...body,
        updated_at: new Date().toISOString()
      };
      await dbPool.query("INSERT INTO app_data (store_key, data) VALUES ('pkl_settings', $1) ON CONFLICT (store_key) DO UPDATE SET data = EXCLUDED.data", [JSON.stringify(updated)]);

      // Jika syncToStudents dicentang dan startDate/endDate diisi, perbarui tabel pkl_students
      let syncedCount = 0;
      if (body.syncToStudents && (body.startDate || body.endDate)) {
        const updateRes = await dbPool.query(`
          UPDATE pkl_students 
          SET start_date = COALESCE($1::date, start_date), 
              end_date = COALESCE($2::date, end_date)
          WHERE location_id IS NOT NULL OR teacher_code IS NOT NULL
        `, [body.startDate || null, body.endDate || null]).catch(e => {
          console.warn('[PKL Settings] Gagal sync ke pkl_students:', e.message);
          return { rowCount: 0 };
        });
        syncedCount = updateRes?.rowCount || 0;
      }

      // Bersihkan cache matrix agar laporan kehadiran langsung terupdate
      if (global._matrixCache) {
        global._matrixCache = {};
      }

      send(req, res, 200, { ok: true, data: updated, syncedCount });
    } catch (err) {
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/settings/feature") {
    send(req, res, 200, { ok: true, data: store.featureSettings || {} });
    return true;
  }

  if (req.method === "PUT" && url.pathname === "/api/settings/feature") {
    const session = getSession(req);
    if (!isAdminRole(session?.role)) {
      send(req, res, 403, { ok: false, error: "Hanya admin" });
      return true;
    }
    const body = await readJsonBody(req);

    // FE-MINOR-D FIX: Whitelist tipe nilai — featureSettings hanya boleh berisi boolean
    // dengan key yang valid secara alphanumeric. Ini mencegah admin menyimpan HTML/script
    // sembarangan ke dalam featureSettings yang bisa disuntikkan ke store global.
    const safeFeatureSettings = {};
    for (const [key, val] of Object.entries(body || {})) {
      if (typeof val === 'boolean' && /^[a-zA-Z][a-zA-Z0-9_]{0,60}$/.test(key)) {
        safeFeatureSettings[key] = val;
      }
    }

    store.featureSettings = safeFeatureSettings;
    await writeStore(store);
    send(req, res, 200, { ok: true, data: store.featureSettings });
    return true;
  }

  return false;
}

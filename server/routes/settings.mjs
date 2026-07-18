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

  if (req.method === "PUT" && url.pathname === "/api/settings/pkl") {
    const session = getSession(req);
    if (!isAdminRole(session?.role)) {
      send(req, res, 403, { ok: false, error: "Hanya admin" });
      return true;
    }
    const body = await readJsonBody(req);
    try {
      const { rows } = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'pkl_settings'");
      const current = rows.length > 0 ? JSON.parse(rows[0].data) : { eligibleClass: "XII" };
      const updated = { ...current, ...body };
      await dbPool.query("INSERT INTO app_data (store_key, data) VALUES ('pkl_settings', $1) ON CONFLICT (store_key) DO UPDATE SET data = EXCLUDED.data", [JSON.stringify(updated)]);
      send(req, res, 200, { ok: true, data: updated });
    } catch (err) {
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/settings/feature") {
    if (!requireAuthenticated(req, res)) return true;
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
    store.featureSettings = body;
    await writeStore(store);
    send(req, res, 200, { ok: true, data: store.featureSettings });
    return true;
  }

  return false;
}

export async function handleBackupRoutes(req, res, url, ctx) {
  const {
    dbPool,
    send,
    sendDatabaseError,
    requireAuthenticated,
    readMainPayload,
    createDatabaseUnavailableError,
    logAudit
  } = ctx;

  // Endpoint: GET /api/data/backup
  if (req.method === "GET" && url.pathname === "/api/data/backup") {
    const session = requireAuthenticated(req, res);
    if (!session) return true;

    // Strict RBAC: Only SuperAdmin and Admin can backup
    const sessionRole = String(session.role || "").toLowerCase().trim();
    if (!["superadmin", "admin"].includes(sessionRole)) {
      send(req, res, 403, { ok: false, error: "Akses Ditolak: Hanya SuperAdmin atau Admin yang dapat melakukan Backup Data." });
      return true;
    }

    try {
      if (!dbPool) throw createDatabaseUnavailableError();
      
      const payload = await readMainPayload();
      
      // Fetch relational data
      const [majors, classes, rooms, teachers, subjects, students, staffs] = await Promise.all([
        dbPool.query('SELECT payload FROM mst_majors').catch(() => ({ rows: [] })),
        dbPool.query('SELECT payload FROM mst_classes').catch(() => ({ rows: [] })),
        dbPool.query('SELECT payload FROM mst_rooms').catch(() => ({ rows: [] })),
        dbPool.query('SELECT payload FROM mst_teachers').catch(() => ({ rows: [] })),
        dbPool.query('SELECT payload FROM mst_subjects').catch(() => ({ rows: [] })),
        dbPool.query('SELECT payload FROM mst_students').catch(() => ({ rows: [] })),
        dbPool.query('SELECT payload FROM mst_staffs').catch(() => ({ rows: [] }))
      ]);

      if (majors.rows.length > 0) payload.majors = majors.rows.map(r => r.payload);
      if (classes.rows.length > 0) payload.classes = classes.rows.map(r => r.payload);
      if (rooms.rows.length > 0) payload.rooms = rooms.rows.map(r => r.payload);
      if (teachers.rows.length > 0) payload.teachers = teachers.rows.map(r => r.payload);
      if (subjects.rows.length > 0) payload.subjects = subjects.rows.map(r => r.payload);
      if (students.rows.length > 0) payload.students = students.rows.map(r => r.payload);
      if (staffs.rows.length > 0) payload.staffs = staffs.rows.map(r => r.payload);

      // Log activity
      await logAudit({
        userId: session.userId || session.username,
        action: 'DOWNLOAD_BACKUP',
        resource: 'DATABASE',
        description: `Admin mengunduh backup database sistem.`,
        ip: req.socket?.remoteAddress,
        severity: 'info'
      });

      // Send the payload as a JSON file
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="kurmon_backup_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json"');
      res.writeHead(200);
      res.end(JSON.stringify({
        version: "1.0",
        timestamp: new Date().toISOString(),
        payload: payload
      }));
      
    } catch (err) {
      console.error("Backup Data Error:", err);
      sendDatabaseError(req, res, err);
    }
    return true;
  }
  
  return false;
}

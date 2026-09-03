/**
 * backup.mjs — Route handler untuk manajemen backup lokal.
 * Endpoints:
 *  GET    /api/backup/list              — Daftar file backup lokal
 *  GET    /api/backup/download/:file   — Download file backup lokal
 *  DELETE /api/backup/delete/:file     — Hapus file backup lokal
 *  POST   /api/backup/local            — Buat backup JSON lokal secara manual
 *  GET    /api/backup/schedule         — Baca jadwal backup otomatis
 *  PUT    /api/backup/schedule         — Update jadwal backup otomatis
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Pastikan direktori backup ada
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function getFileChecksum(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch { return null; }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export async function handleBackupRoutes(req, res, url, ctx) {
  const { send, requireAuthenticated, readJsonBody, sendDatabaseError, dbPool, normalizeServerRole, logAudit } = ctx;

  const isAdmin = (session) => ['admin', 'superadmin'].includes(normalizeServerRole(session?.role));

  // ── GET /api/backup/list ─────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/api/backup/list') {
    const session = requireAuthenticated(req, res);
    if (!session) return true;
    if (!isAdmin(session)) { send(req, res, 403, { ok: false, error: 'Hanya admin' }); return true; }

    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.json') || f.endsWith('.sql'))
        .map(f => {
          const fp = path.join(BACKUP_DIR, f);
          const stat = fs.statSync(fp);
          const checksum = getFileChecksum(fp);
          return {
            filename: f,
            size: formatBytes(stat.size),
            sizeBytes: stat.size,
            createdAt: stat.mtime.toISOString(),
            checksum: checksum ? checksum.slice(0, 16) + '...' : null,
            fullChecksum: checksum,
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      send(req, res, 200, { ok: true, data: files });
    } catch (err) {
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  // ── GET /api/backup/download/:filename ───────────────────
  if (req.method === 'GET' && url.pathname.startsWith('/api/backup/download/')) {
    const session = requireAuthenticated(req, res);
    if (!session) return true;
    if (!isAdmin(session)) { send(req, res, 403, { ok: false, error: 'Hanya admin' }); return true; }

    const filename = decodeURIComponent(url.pathname.replace('/api/backup/download/', ''));
    // Security: pastikan tidak ada path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      send(req, res, 400, { ok: false, error: 'Nama file tidak valid.' });
      return true;
    }

    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      send(req, res, 404, { ok: false, error: 'File tidak ditemukan.' });
      return true;
    }

    try {
      const stat = fs.statSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === '.sql' ? 'text/plain' : 'application/json';
      res.writeHead(200, {
        'Content-Type': `${contentType}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stat.size,
      });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  // ── DELETE /api/backup/delete/:filename ──────────────────
  if (req.method === 'DELETE' && url.pathname.startsWith('/api/backup/delete/')) {
    const session = requireAuthenticated(req, res);
    if (!session) return true;
    if (!isAdmin(session)) { send(req, res, 403, { ok: false, error: 'Hanya admin' }); return true; }

    const filename = decodeURIComponent(url.pathname.replace('/api/backup/delete/', ''));
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      send(req, res, 400, { ok: false, error: 'Nama file tidak valid.' });
      return true;
    }

    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      send(req, res, 404, { ok: false, error: 'File tidak ditemukan.' });
      return true;
    }

    try {
      fs.unlinkSync(filePath);
      await logAudit(dbPool, session, req, 'BACKUP_DELETE', 'file', `File backup dihapus: ${filename}`);
      send(req, res, 200, { ok: true });
    } catch (err) {
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  // ── POST /api/backup/local ───────────────────────────────
  if (req.method === 'POST' && url.pathname === '/api/backup/local') {
    const session = requireAuthenticated(req, res);
    if (!session) return true;
    if (!isAdmin(session)) { send(req, res, 403, { ok: false, error: 'Hanya admin' }); return true; }
    if (!dbPool) { send(req, res, 503, { ok: false, error: 'Database tidak tersedia.' }); return true; }

    try {
      const { runBackupJson } = await import('../auto-backup.mjs');
      const result = await runBackupJson();
      await logAudit(dbPool, session, req, 'BACKUP_LOCAL_MANUAL', 'database',
        `Backup lokal manual: ${result.fileName} (${result.size})`);
      send(req, res, 200, { ok: true, data: result });
    } catch (err) {
      console.error('[BackupRoute] Local backup error:', err);
      send(req, res, 500, { ok: false, error: err.message });
    }
    return true;
  }

  // ── GET /api/backup/schedule ─────────────────────────────
  if (req.method === 'GET' && url.pathname === '/api/backup/schedule') {
    const session = requireAuthenticated(req, res);
    if (!session) return true;
    if (!isAdmin(session)) { send(req, res, 403, { ok: false, error: 'Hanya admin' }); return true; }

    try {
      let schedule = { hour: 2, enabled: true, keepDays: 7, sendToTelegram: false };
      if (dbPool) {
        const { rows } = await dbPool.query(
          "SELECT data FROM app_data WHERE store_key = 'backup_schedule' LIMIT 1"
        );
        if (rows.length > 0) {
          const parsed = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
          schedule = { ...schedule, ...parsed };
        }
      }
      send(req, res, 200, { ok: true, data: schedule });
    } catch (err) {
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  // ── PUT /api/backup/schedule ─────────────────────────────
  if (req.method === 'PUT' && url.pathname === '/api/backup/schedule') {
    const session = requireAuthenticated(req, res);
    if (!session) return true;
    if (!isAdmin(session)) { send(req, res, 403, { ok: false, error: 'Hanya admin' }); return true; }
    if (!dbPool) { send(req, res, 503, { ok: false, error: 'Database tidak tersedia.' }); return true; }

    try {
      const body = await readJsonBody(req);
      const schedule = {
        hour: typeof body.hour === 'number' ? Math.max(0, Math.min(23, body.hour)) : 2,
        enabled: body.enabled !== false,
        keepDays: typeof body.keepDays === 'number' ? Math.max(1, Math.min(30, body.keepDays)) : 7,
        sendToTelegram: body.sendToTelegram === true,
      };
      await dbPool.query(
        `INSERT INTO app_data (store_key, data) VALUES ('backup_schedule', $1)
         ON CONFLICT (store_key) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify(schedule)]
      );
      await logAudit(dbPool, session, req, 'BACKUP_SCHEDULE_UPDATE', 'settings',
        `Jadwal backup diubah: jam ${schedule.hour}:00, simpan ${schedule.keepDays} hari`);
      send(req, res, 200, { ok: true, data: schedule });
    } catch (err) {
      sendDatabaseError(req, res, err);
    }
    return true;
  }

  return false;
}

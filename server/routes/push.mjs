import webpush from 'web-push';

let vapidKeys = null;

// B3-SEC-C FIX: Resolusi VAPID subject secara dinamis.
// Urutan prioritas: env VAPID_SUBJECT → appSettings.adminEmail dari DB → env ADMIN_EMAIL → fallback
const resolveVapidSubject = async (dbPool) => {
  // 1. Env variable eksplisit (paling direkomendasikan, format: "mailto:admin@sekolah.sch.id")
  if (process.env.VAPID_SUBJECT) return process.env.VAPID_SUBJECT;

  // 2. Baca dari appSettings di database
  try {
    const { rows } = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store' LIMIT 1");
    if (rows.length > 0) {
      const payload = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      const email = payload?.appSettings?.adminEmail || payload?.appSettings?.schoolEmail;
      if (email && String(email).includes('@')) return `mailto:${email}`;
    }
  } catch {
    // Lanjut ke fallback jika gagal
  }

  // 3. Env variable email admin
  if (process.env.ADMIN_EMAIL) return `mailto:${process.env.ADMIN_EMAIL}`;

  // 4. Fallback terakhir — gunakan domain yang bermakna, bukan placeholder
  return 'mailto:noreply@kurmon.app';
};

// Initialize keys
export async function initializeWebPush(dbPool) {
  try {
    const res = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'vapid_keys'");
    if (res.rows.length > 0) {
      vapidKeys = JSON.parse(res.rows[0].data);
    } else {
      vapidKeys = webpush.generateVAPIDKeys();
      await dbPool.query(
        "INSERT INTO app_data (store_key, data) VALUES ('vapid_keys', $1)",
        [JSON.stringify(vapidKeys)]
      );
    }
    const vapidSubject = await resolveVapidSubject(dbPool);
    webpush.setVapidDetails(
      vapidSubject,
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
    console.log(`[PUSH] Web Push initialized. VAPID subject: ${vapidSubject}`);
  } catch (error) {
    console.error("[PUSH] Failed to initialize Web Push:", error);
  }
}

// Send Notification wrapper
export async function sendPushNotification(dbPool, userId, payload) {
  try {
    const res = await dbPool.query("SELECT * FROM push_subscriptions WHERE user_id = $1", [String(userId)]);
    for (const sub of res.rows) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription has expired or is no longer valid
          await dbPool.query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);
        } else {
          console.error("[PUSH] Error sending to endpoint", sub.endpoint, err);
        }
      }
    }
  } catch (error) {
    console.error("[PUSH] Error in sendPushNotification:", error);
  }
}

export async function handlePushRoutes(req, res, url, ctx) {
  const { dbPool, send, sendDatabaseError, requireAuthenticated, readJsonBody } = ctx;

  if (url.pathname === "/api/push/public-key" && req.method === "GET") {
    if (!vapidKeys) {
      return send(req, res, 503, { ok: false, error: "Push notifications not configured" });
    }
    return send(req, res, 200, { ok: true, publicKey: vapidKeys.publicKey });
  }

  if (url.pathname === "/api/push/subscribe" && req.method === "POST") {
    const session = requireAuthenticated(req, res);
    if (!session) return;
    try {
      const body = await readJsonBody(req);
      const { subscription } = body;
      if (!subscription || !subscription.endpoint) {
        return send(req, res, 400, { ok: false, error: "Invalid subscription" });
      }

      // Fallback identifier to ensure we match how the app auth works.
      const userId = session.username || session.nis || session.id;

      await dbPool.query(
        `INSERT INTO push_subscriptions (user_id, user_role, endpoint, p256dh, auth) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (endpoint) DO UPDATE 
         SET user_id = EXCLUDED.user_id, user_role = EXCLUDED.user_role`,
        [
          String(userId),
          session.role,
          subscription.endpoint,
          subscription.keys.p256dh,
          subscription.keys.auth
        ]
      );
      return send(req, res, 200, { ok: true });
    } catch (err) {
      return sendDatabaseError(req, res, err);
    }
  }

  if (url.pathname === "/api/push/unsubscribe" && req.method === "POST") {
    const session = requireAuthenticated(req, res);
    if (!session) return;
    try {
      const body = await readJsonBody(req);
      const { endpoint } = body;
      if (endpoint) {
        await dbPool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
      }
      return send(req, res, 200, { ok: true });
    } catch (err) {
      return sendDatabaseError(req, res, err);
    }
  }
  
  if (url.pathname === "/api/push/test" && req.method === "POST") {
    const session = requireAuthenticated(req, res);
    if (!session) return;
    try {
      const userId = session.username || session.nis || session.id;
      await sendPushNotification(dbPool, userId, {
        title: "Test Notifikasi Berhasil!",
        body: "Perangkat Anda berhasil terhubung dengan Web Push Kurmon.",
        icon: "/favicon.svg",
        url: "/"
      });
      return send(req, res, 200, { ok: true, message: "Test push sent" });
    } catch (err) {
      return sendDatabaseError(req, res, err);
    }
  }

  return false;
}

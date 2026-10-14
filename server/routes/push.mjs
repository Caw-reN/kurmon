import webpush from 'web-push';

let vapidKeys = null;

// Cache deduplikasi pengingat jadwal guru agar tidak mengirim berulang kali pada slot & hari yang sama
// Key: `${dateStr}_${teacherCode}_${className}_${startMinutes}_${type}` => timestamp
const sentRemindersCache = new Map();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of sentRemindersCache.entries()) {
    if (now - timestamp > 24 * 60 * 60 * 1000) {
      sentRemindersCache.delete(key);
    }
  }
}, 60 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

// Resolusi VAPID subject secara dinamis
const resolveVapidSubject = async (dbPool) => {
  if (process.env.VAPID_SUBJECT) return process.env.VAPID_SUBJECT;

  try {
    const { rows } = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store' LIMIT 1");
    if (rows.length > 0) {
      const payload = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      const email = payload?.appSettings?.adminEmail || payload?.appSettings?.schoolEmail;
      if (email && String(email).includes('@')) return `mailto:${email}`;
    }
  } catch {}

  if (process.env.ADMIN_EMAIL) return `mailto:${process.env.ADMIN_EMAIL}`;
  return 'mailto:noreply@kurmon.app';
};

// Inisialisasi Web Push & Pastikan Tabel Push Subscriptions Siap
export async function initializeWebPush(dbPool) {
  try {
    // 1. Pastikan tabel push_subscriptions ada di database
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_role VARCHAR(20) NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbPool.query(`CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON push_subscriptions(user_id)`);

    // 2. Ambil atau buat kunci VAPID
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

/**
 * Kirim notifikasi push ke pengguna tertentu, peran tertentu, atau semua pelanggan.
 * @param {object} dbPool - Database connection pool
 * @param {string|string[]} userIdentifier - ID/Code/Username user, array of IDs, 'role:guru', atau '*'
 * @param {object} payload - { title, body, icon, badge, url, tag, data }
 */
export async function sendPushNotification(dbPool, userIdentifier, payload) {
  if (!dbPool || !userIdentifier) return { sent: 0, failed: 0 };
  let sentCount = 0;
  let failedCount = 0;

  try {
    let res;
    if (userIdentifier === '*' || userIdentifier === 'all') {
      res = await dbPool.query("SELECT * FROM push_subscriptions");
    } else if (typeof userIdentifier === 'string' && userIdentifier.startsWith('role:')) {
      const targetRole = userIdentifier.slice(5).trim();
      res = await dbPool.query("SELECT * FROM push_subscriptions WHERE user_role = $1", [targetRole]);
    } else {
      const identifiers = (Array.isArray(userIdentifier) ? userIdentifier : [userIdentifier])
        .map(id => String(id ?? '').trim())
        .filter(Boolean);

      if (identifiers.length === 0) return { sent: 0, failed: 0 };
      res = await dbPool.query("SELECT * FROM push_subscriptions WHERE user_id = ANY($1)", [identifiers]);
    }

    if (!res || res.rows.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Kurmon Notifikasi',
      body: payload.body || '',
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/favicon.svg',
      tag: payload.tag || ('kurmon-' + Date.now()),
      vibrate: payload.vibrate || [200, 100, 200, 100, 200],
      url: payload.url || '/',
      data: payload.data || { url: payload.url || '/' }
    });

    for (const sub of res.rows) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        await webpush.sendNotification(pushSubscription, notificationPayload);
        sentCount++;
      } catch (err) {
        failedCount++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Token / subscription sudah kadaluarsa atau di-uninstall
          await dbPool.query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);
        } else {
          console.error(`[PUSH] Gagal kirim ke endpoint ${sub.endpoint?.slice(0, 30)}...:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error("[PUSH] Error in sendPushNotification:", error.message);
  }

  return { sent: sentCount, failed: failedCount };
}

/**
 * Parsing label jam pelajaran (misal: "07.00 - 08.30" atau "08:00 - 09:10")
 */
export function parseSlotTime(label) {
  if (!label || typeof label !== 'string') return null;
  const parts = label.split('-');
  if (parts.length < 2) return null;
  const startPart = parts[0].trim().replace('.', ':');
  const endPart = parts[1].trim().replace('.', ':');
  const [sH, sM] = startPart.split(':').map(Number);
  const [eH, eM] = endPart.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM)) return null;
  return {
    startStr: startPart,
    endStr: endPart,
    startMinutes: sH * 60 + sM,
    endMinutes: (!isNaN(eH) && !isNaN(eM)) ? (eH * 60 + eM) : null
  };
}

/**
 * Background Scheduler: Memeriksa jadwal mengajar guru secara realtime
 * dan mengirim Push Notification ke HP guru tepat waktu saat jam KBM tiba.
 */
export async function checkAndSendTeacherScheduleReminders(dbPool) {
  if (!dbPool) return;

  try {
    const now = new Date();

    // Waktu & Hari di Indonesia (WIB - Asia/Jakarta)
    const timeParts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    }).format(now).split(':');

    const currentHour = parseInt(timeParts[0], 10);
    const currentMinute = parseInt(timeParts[1], 10);
    const nowMinutes = currentHour * 60 + currentMinute;

    // Hanya periksa pada jam aktif sekolah (06:30 - 17:30 WIB)
    if (nowMinutes < 6 * 60 + 30 || nowMinutes > 17 * 60 + 30) {
      return;
    }

    const rawDayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(now);
    const todayName = rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1).toLowerCase();
    
    // Hari Minggu tidak ada KBM reguler
    if (todayName === 'Minggu') return;

    const todayDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD

    // 1. Ambil data jadwal dari main_store
    const { rows: storeRows } = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store' LIMIT 1");
    if (!storeRows || storeRows.length === 0) return;
    const storeData = typeof storeRows[0].data === 'string' ? JSON.parse(storeRows[0].data) : storeRows[0].data;

    const timeSlots = storeData?.timeSlots || {};
    const scheduleRaw = storeData?.schedule || [];
    const scheduleList = Array.isArray(scheduleRaw) ? scheduleRaw : Object.values(scheduleRaw);

    const todaySlots = timeSlots[todayName] || [];
    if (todaySlots.length === 0 || scheduleList.length === 0) return;

    // 2. Buat mapping slot yang valid dengan waktu parsing
    const slotMap = new Map();
    for (const slot of todaySlots) {
      if (slot.isBreak) continue;
      const timing = parseSlotTime(slot.label);
      if (timing) {
        slotMap.set(String(slot.id), { ...slot, timing });
      }
    }

    // 3. Ambil data guru dari mst_teachers untuk resolusi identifier lengkap
    let teacherMap = new Map();
    try {
      const { rows: tRows } = await dbPool.query("SELECT payload FROM mst_teachers");
      for (const r of tRows) {
        const p = r.payload;
        if (p) {
          const code = String(p.code || '').trim();
          if (code) teacherMap.set(code, p);
        }
      }
    } catch (e) {
      // Fallback ke storeData.teachers jika mst_teachers gagal
      if (Array.isArray(storeData.teachers)) {
        for (const t of storeData.teachers) {
          if (t && t.code) teacherMap.set(String(t.code).trim(), t);
        }
      }
    }

    // 4. Filter jadwal hari ini dan petakan ke slot timing
    const todayMatches = scheduleList
      .filter(s => String(s.day || '').trim().toLowerCase() === todayName.toLowerCase() && slotMap.has(String(s.slotId)))
      .map(s => ({
        ...s,
        slot: slotMap.get(String(s.slotId))
      }));

    if (todayMatches.length === 0) return;

    // 5. Kelompokkan jadwal per guru lalu gabungkan slot-slot berurutan pada kelas & mapel yang sama
    const byTeacher = new Map();
    for (const item of todayMatches) {
      const code = String(item.teacherCode || '').trim();
      if (!code) continue;
      if (!byTeacher.has(code)) byTeacher.set(code, []);
      byTeacher.get(code).push(item);
    }

    for (const [teacherCode, items] of byTeacher.entries()) {
      // Urutkan berdasarkan waktu mulai slot
      items.sort((a, b) => a.slot.timing.startMinutes - b.slot.timing.startMinutes);

      // Gabungkan slot berkelanjutan
      const sessions = [];
      for (const item of items) {
        if (sessions.length === 0) {
          sessions.push({
            teacherCode: item.teacherCode,
            subject: item.subject || 'Mata Pelajaran',
            className: item.className || 'Kelas',
            roomId: item.roomId || '',
            startMinutes: item.slot.timing.startMinutes,
            endMinutes: item.slot.timing.endMinutes,
            startStr: item.slot.timing.startStr,
            endStr: item.slot.timing.endStr
          });
        } else {
          const last = sessions[sessions.length - 1];
          const isConsecutive = (
            last.className === item.className &&
            last.subject === item.subject &&
            last.endMinutes === item.slot.timing.startMinutes
          );
          if (isConsecutive) {
            last.endMinutes = item.slot.timing.endMinutes;
            last.endStr = item.slot.timing.endStr;
          } else {
            sessions.push({
              teacherCode: item.teacherCode,
              subject: item.subject || 'Mata Pelajaran',
              className: item.className || 'Kelas',
              roomId: item.roomId || '',
              startMinutes: item.slot.timing.startMinutes,
              endMinutes: item.slot.timing.endMinutes,
              startStr: item.slot.timing.startStr,
              endStr: item.slot.timing.endStr
            });
          }
        }
      }

      // Ambil seluruh kemungkinan identifier untuk guru ini agar notifikasi pasti sampai ke HP
      const teacherInfo = teacherMap.get(teacherCode);
      const targetUserIds = [teacherCode];
      if (teacherInfo?.nip) targetUserIds.push(String(teacherInfo.nip).trim());
      if (teacherInfo?.id) targetUserIds.push(String(teacherInfo.id).trim());
      if (teacherInfo?.username) targetUserIds.push(String(teacherInfo.username).trim());

      // 6. Evaluasi setiap sesi mengajar
      for (const sess of sessions) {
        const timeLabel = `${sess.startStr} - ${sess.endStr}`;
        const roomInfo = sess.roomId ? ` (Ruang ${sess.roomId})` : '';

        // KASUS 1: Tepat saat jam mengajar dimulai (toleransi 0-2 menit)
        const isStartNow = (nowMinutes >= sess.startMinutes && nowMinutes <= sess.startMinutes + 1);
        if (isStartNow) {
          const dedupeKey = `${todayDateStr}_${sess.teacherCode}_${sess.className}_${sess.startMinutes}_start`;
          if (!sentRemindersCache.has(dedupeKey)) {
            sentRemindersCache.set(dedupeKey, Date.now());

            console.log(`[PUSH] 🔔 Mengirim Notifikasi Mulai KBM: Guru ${sess.teacherCode} di ${sess.className} (${sess.subject}) [${timeLabel}]`);

            await sendPushNotification(dbPool, targetUserIds, {
              title: `⏰ Jam Mengajar Dimulai: ${sess.className}`,
              body: `Saatnya mengajar ${sess.subject} di kelas ${sess.className}${roomInfo} (${timeLabel}). Ketuk untuk membuka Jurnal Mengajar.`,
              icon: '/icon-192x192.png',
              badge: '/favicon.svg',
              tag: `kbm-start-${sess.teacherCode}-${sess.className}-${sess.startMinutes}`,
              url: '/?tab=jurnal_harian_guru',
              data: {
                url: '/?tab=jurnal_harian_guru',
                type: 'teaching_schedule_start',
                teacherCode: sess.teacherCode,
                className: sess.className,
                subject: sess.subject,
                timeLabel
              }
            });
          }
        }

        // KASUS 2: Pengingat 5 menit sebelum jam mengajar dimulai
        const is5MinutesBefore = (nowMinutes === sess.startMinutes - 5);
        if (is5MinutesBefore) {
          const dedupeKey5m = `${todayDateStr}_${sess.teacherCode}_${sess.className}_${sess.startMinutes}_pre5m`;
          if (!sentRemindersCache.has(dedupeKey5m)) {
            sentRemindersCache.set(dedupeKey5m, Date.now());

            console.log(`[PUSH] ⏳ Mengirim Pengingat 5 Menit KBM: Guru ${sess.teacherCode} di ${sess.className} (${sess.subject})`);

            await sendPushNotification(dbPool, targetUserIds, {
              title: `⏰ 5 Menit Lagi KBM: ${sess.className}`,
              body: `Bersiap mengajar ${sess.subject} di kelas ${sess.className}${roomInfo} pukul ${sess.startStr} WIB.`,
              icon: '/icon-192x192.png',
              badge: '/favicon.svg',
              tag: `kbm-pre-${sess.teacherCode}-${sess.className}-${sess.startMinutes}`,
              url: '/?tab=jurnal_harian_guru',
              data: {
                url: '/?tab=jurnal_harian_guru',
                type: 'teaching_schedule_pre',
                teacherCode: sess.teacherCode,
                className: sess.className,
                subject: sess.subject,
                timeLabel
              }
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("[PUSH] Error checking teacher schedule reminders:", error.message);
  }
}

/**
 * Route handler untuk Web Push Notification API
 */
export async function handlePushRoutes(req, res, url, ctx) {
  const { dbPool, send, sendDatabaseError, requireAuthenticated, readJsonBody } = ctx;

  // 1. Dapatkan Public Key VAPID untuk registrasi browser / HP
  if (url.pathname === "/api/push/public-key" && req.method === "GET") {
    if (!vapidKeys) {
      return send(req, res, 503, { ok: false, error: "Push notifications not configured" });
    }
    return send(req, res, 200, { ok: true, publicKey: vapidKeys.publicKey });
  }

  // 2. Status langganan push pengguna saat ini
  if (url.pathname === "/api/push/status" && req.method === "GET") {
    const session = requireAuthenticated(req, res);
    if (!session) return;
    try {
      const userId = session.code || session.username || session.nis || session.id;
      const targetUserIds = [String(userId).trim()];
      if (session.code && !targetUserIds.includes(String(session.code).trim())) {
        targetUserIds.push(String(session.code).trim());
      }
      if (session.nip && !targetUserIds.includes(String(session.nip).trim())) {
        targetUserIds.push(String(session.nip).trim());
      }

      const { rows } = await dbPool.query(
        "SELECT COUNT(*) as cnt FROM push_subscriptions WHERE user_id = ANY($1)",
        [targetUserIds]
      );
      const userSubCount = parseInt(rows[0]?.cnt || 0, 10);

      const totalRes = await dbPool.query("SELECT COUNT(*) as cnt FROM push_subscriptions");
      const totalSubCount = parseInt(totalRes.rows[0]?.cnt || 0, 10);

      return send(req, res, 200, {
        ok: true,
        isConfigured: !!vapidKeys,
        userSubscriptionsCount: userSubCount,
        totalSubscriptionsCount: totalSubCount,
        hasActiveSubscription: userSubCount > 0
      });
    } catch (err) {
      return sendDatabaseError(req, res, err);
    }
  }

  // 3. Simpan langganan push dari browser / HP
  if (url.pathname === "/api/push/subscribe" && req.method === "POST") {
    const session = requireAuthenticated(req, res);
    if (!session) return;
    try {
      const body = await readJsonBody(req);
      const { subscription } = body;
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return send(req, res, 400, { ok: false, error: "Langganan tidak valid" });
      }

      // Simpan dengan identifier utama (kode guru / username / NIS / ID)
      const userId = session.code || session.username || session.nis || session.id;
      const userRole = session.role || 'user';

      await dbPool.query(
        `INSERT INTO push_subscriptions (user_id, user_role, endpoint, p256dh, auth) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (endpoint) DO UPDATE 
         SET user_id = EXCLUDED.user_id, user_role = EXCLUDED.user_role, created_at = NOW()`,
        [
          String(userId),
          userRole,
          subscription.endpoint,
          subscription.keys.p256dh,
          subscription.keys.auth
        ]
      );

      console.log(`[PUSH] Subscribed successfully: user='${userId}', role='${userRole}'`);

      return send(req, res, 200, { 
        ok: true, 
        message: "Perangkat berhasil didaftarkan untuk menerima push notifikasi." 
      });
    } catch (err) {
      return sendDatabaseError(req, res, err);
    }
  }

  // 4. Hapus langganan push saat logout atau nonaktifkan notifikasi
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

  // 5. Test Notifikasi Umum ke HP Pengguna
  if (url.pathname === "/api/push/test" && req.method === "POST") {
    const session = requireAuthenticated(req, res);
    if (!session) return;
    try {
      const userId = session.code || session.username || session.nis || session.id;
      const targetUserIds = [String(userId).trim()];
      if (session.code && !targetUserIds.includes(String(session.code).trim())) targetUserIds.push(String(session.code).trim());
      if (session.nip && !targetUserIds.includes(String(session.nip).trim())) targetUserIds.push(String(session.nip).trim());

      const result = await sendPushNotification(dbPool, targetUserIds, {
        title: "🔔 Test Notifikasi Kurmon Berhasil!",
        body: `Halo ${session.name || 'Pengguna'}! Perangkat HP Anda berhasil terhubung dan siap menerima pengingat jadwal & informasi sekolah.`,
        icon: "/icon-192x192.png",
        badge: "/favicon.svg",
        tag: `test-push-${Date.now()}`,
        url: "/"
      });

      return send(req, res, 200, { 
        ok: true, 
        message: result.sent > 0 
          ? `Notifikasi test berhasil dikirim ke ${result.sent} perangkat Anda.` 
          : "Belum ada browser/HP terdaftar yang aktif. Pastikan izin notifikasi sudah diizinkan di perangkat Anda.",
        stats: result
      });
    } catch (err) {
      return sendDatabaseError(req, res, err);
    }
  }

  // 6. Uji Langsung Pengingat Jadwal Mengajar Guru
  if (url.pathname === "/api/push/test-schedule-reminder" && req.method === "POST") {
    const session = requireAuthenticated(req, res);
    if (!session) return;
    try {
      const userId = session.code || session.username || session.nis || session.id;
      const targetUserIds = [String(userId).trim()];
      if (session.code && !targetUserIds.includes(String(session.code).trim())) targetUserIds.push(String(session.code).trim());
      if (session.nip && !targetUserIds.includes(String(session.nip).trim())) targetUserIds.push(String(session.nip).trim());

      // Cari jadwal nyata guru ini dari database jika ada
      let sampleClass = 'XII TKJ 2';
      let sampleSubject = 'Pemrograman Berorientasi Objek';
      let sampleRoom = 'R9';
      let sampleTime = '08:00 - 09:20 WIB';

      try {
        const { rows } = await dbPool.query("SELECT data FROM app_data WHERE store_key = 'main_store' LIMIT 1");
        if (rows.length > 0) {
          const store = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
          const scheduleList = Array.isArray(store.schedule) ? store.schedule : Object.values(store.schedule || {});
          const mySchedule = scheduleList.find(s => 
            String(s.teacherCode).toLowerCase() === String(session.code || session.username || '').toLowerCase()
          );
          if (mySchedule) {
            sampleClass = mySchedule.className || sampleClass;
            sampleSubject = mySchedule.subject || sampleSubject;
            sampleRoom = mySchedule.roomId || sampleRoom;
          }
        }
      } catch (e) {}

      const result = await sendPushNotification(dbPool, targetUserIds, {
        title: `⏰ [Uji] Jam Mengajar: ${sampleClass}`,
        body: `Saatnya mengajar ${sampleSubject} di kelas ${sampleClass} (Ruang ${sampleRoom}, ${sampleTime}). Ketuk untuk membuka Jurnal Mengajar.`,
        icon: "/icon-192x192.png",
        badge: "/favicon.svg",
        tag: `test-schedule-${Date.now()}`,
        url: "/?tab=jurnal_harian_guru",
        data: {
          url: "/?tab=jurnal_harian_guru",
          type: "teaching_schedule_test",
          className: sampleClass,
          subject: sampleSubject
        }
      });

      return send(req, res, 200, {
        ok: true,
        message: result.sent > 0
          ? `Pengingat jadwal berhasil dikirim ke HP Anda (${result.sent} perangkat)!`
          : "Notifikasi belum sampai karena izin notifikasi belum diaktifkan di HP Anda.",
        stats: result
      });
    } catch (err) {
      return sendDatabaseError(req, res, err);
    }
  }

  return false;
}

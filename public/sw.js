// KG2 School — Service Worker v3
// Strategi: Network First untuk API, Cache First untuk aset statis
const CACHE_NAME = 'kg2-school-v3';
const OFFLINE_FALLBACK = '/index.html';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-maskable-192x192.png',
  '/icon-maskable-512x512.png',
  '/apple-touch-icon.png',
];

// ── Install: pre-cache aset statis penting ───────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: hapus cache lama ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: strategi caching ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Jangan cache API calls — selalu network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ ok: false, error: 'Offline — tidak ada koneksi internet.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Untuk navigasi (HTML) — network first, fallback ke cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(OFFLINE_FALLBACK))
    );
    return;
  }

  // Untuk aset statis (JS, CSS, gambar, font) — cache first, network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});

// ── Push Notification ─────────────────────────────────────────────────────────
self.addEventListener('push', function(event) {
  if (event.data) {
    let data = {};
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
    
    const title = data.title || 'Kurmon - Notifikasi Sekolah';
    const options = {
      body: data.body || 'Anda memiliki notifikasi baru.',
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/favicon.svg',
      vibrate: data.vibrate || [200, 100, 200, 100, 200],
      tag: data.tag || ('kurmon-notif-' + Date.now()),
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      data: {
        url: data.url || (data.data && data.data.url) || '/'
      },
      actions: [
        { action: 'open', title: 'Buka' }
      ]
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const rawUrl = event.notification.data?.url || '/';
  const urlToOpen = new URL(rawUrl, self.location.origin).href;
  
  event.waitUntil(
    (self.clients || clients).matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      const clientHolder = self.clients || clients;
      if (clientHolder && clientHolder.openWindow) {
        return clientHolder.openWindow(urlToOpen);
      }
    })
  );
});

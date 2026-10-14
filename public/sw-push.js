// Kurmon - Web Push Notification & Action Handler
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
        { action: 'open', title: 'Buka Aplikasi' }
      ]
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

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

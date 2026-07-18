self.addEventListener('push', function(event) {
  if (event.data) {
    let data = {};
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
    
    const title = data.title || 'Kurmon System';
    const options = {
      body: data.body || 'Anda memiliki notifikasi baru.',
      icon: data.icon || '/favicon.svg',
      badge: '/favicon.svg',
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If window is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // simple URL matching
        if (client.url.includes(new URL(urlToOpen, self.location.origin).pathname) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

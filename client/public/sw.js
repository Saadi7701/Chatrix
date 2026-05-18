self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: data.icon || '/favicon.svg',
        badge: '/favicon.svg',
        data: data.data || {},
        vibrate: [100, 50, 100],
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Chatrix', options)
      );
    } catch (e) {
      const options = {
        body: event.data.text(),
        icon: '/favicon.svg',
        badge: '/favicon.svg',
      };
      event.waitUntil(
        self.registration.showNotification('Chatrix', options)
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Required to pass PWA installability criteria
self.addEventListener('fetch', (event) => {
  // We can just pass through to network for now.
});

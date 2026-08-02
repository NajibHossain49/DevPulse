/* Custom push notification handlers (merged alongside next-pwa workbox SW when registered). */
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "DevPulse", {
      body: data.body || "New notification",
      icon: "/icon-192x192.png",
      badge: "/icon-72x72.png",
      data: data.url || "/dashboard",
      actions: data.actions || [],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data || "/dashboard";
  event.waitUntil(clients.openWindow(target));
});

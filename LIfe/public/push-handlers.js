/* =====================================================================
   Duo - Ouvintes de Web Push
   Carregado DENTRO do service worker gerado pelo vite-plugin-pwa
   (via workbox.importScripts). Nao registre este arquivo direto.
   ===================================================================== */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Duo", body: event.data.text() };
  }

  const title = payload.title || "Lembrete do Duo";
  const options = {
    body: payload.body || "Você tem um lembrete agendado.",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: payload.tag || "duo-push",
    renotify: true,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: { url: payload.url || "/calendar" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || self.location.origin;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

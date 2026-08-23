/* =====================================================================
   Duo - Service Worker dedicado ao Web Push
   Recebe pushes do servidor mesmo com o app fechado.
   ===================================================================== */

const APP_URL = self.location.origin;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/* Push recebido do servidor */
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

/* Clique na notificação: foca o app aberto ou abre nova aba */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || APP_URL;

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

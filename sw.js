// Service worker : permet à l'appli de marcher hors-ligne.
const VERSION = "gymtrack-v6";
const SHELL = ["./", "index.html", "style.css", "app.js", "data.js", "data-extra.js", "seances.js", "ranks.js", "defi.js", "notifs.js", "motivation.txt", "bodymap.js", "foods.js", "manifest.json",
  "vendor/chart.umd.js", "vendor/html5-qrcode.min.js", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "gymtrack-img").map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Open Food Facts : toujours en ligne
  if (url.hostname.includes("openfoodfacts")) return;
  // Images d'exercices : cache d'abord (une fois vues, elles restent dispo hors-ligne)
  if (url.hostname === "raw.githubusercontent.com") {
    e.respondWith(caches.open("gymtrack-img").then((c) => c.match(e.request).then((hit) => hit ||
      fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }))));
    return;
  }
  // Fichiers de l'appli : réseau d'abord en contournant le cache du navigateur
  // (sinon le téléphone peut garder l'ancienne version), cache seulement si hors-ligne
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request, { cache: "no-cache" }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html"))));
  }
});

// Toucher une notification ouvre (ou ramène) l'appli
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow("./#/accueil");
  }));
});

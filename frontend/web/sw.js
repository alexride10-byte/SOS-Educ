// Service worker : l'appli fonctionne hors ligne apres la premiere ouverture.
// Aucune donnee utilisateur ne transite ici : seuls les fichiers de l'application sont mis en cache.
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const CACHE = `caresync-${VERSION}`;
const INDEX = PRECACHE[0];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("caresync-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Pages : reseau d'abord (nouvelle version), sinon l'appli en cache
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(INDEX)));
    return;
  }
  // Fichiers (scripts, polices, moteur OCR) : cache d'abord
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

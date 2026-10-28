#!/usr/bin/env node
/* global __dirname */
// Finalise l'export web (apres `expo export -p web`) pour en faire une appli installable hors ligne :
//  - moteur OCR local (Tesseract + modele francais) copie dans dist/tesseract
//  - manifeste, icones, balises iPhone/Android et enregistrement du service worker dans index.html
//  - service worker avec la liste des fichiers a mettre en cache
//  - 404.html (GitHub Pages renvoie vers l'appli pour les liens directs)
// Usage : node scripts/finalize-web.js [dist]
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const dist = path.resolve(process.argv[2] || path.join(root, "dist"));
const base = (process.env.EXPO_PUBLIC_BASE_URL || "").replace(/\/$/, "");
const nm = (p) => require.resolve(p, { paths: [root] });

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

// 1. OCR local
const tessDist = path.dirname(nm("tesseract.js/dist/tesseract.min.js"));
const coreDir = path.dirname(nm("tesseract.js-core/package.json"));
const langDir = path.dirname(nm("@tesseract.js-data/fra/package.json"));
copy(path.join(tessDist, "tesseract.min.js"), path.join(dist, "tesseract/tesseract.min.js"));
copy(path.join(tessDist, "worker.min.js"), path.join(dist, "tesseract/worker.min.js"));
for (const f of ["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"]) {
  copy(path.join(coreDir, f), path.join(dist, "tesseract/core", f));
}
// Modele "best_int" : bon compromis precision / taille (~700 Ko)
copy(path.join(langDir, "4.0.0_best_int/fra.traineddata.gz"), path.join(dist, "tesseract/lang/fra.traineddata.gz"));

// 2. Manifeste
const manifest = {
  name: "CareSync Pro",
  short_name: "CareSync",
  description: "Tickets, budget et agenda pour éducateurs. Données gardées sur l'appareil.",
  lang: "fr",
  start_url: `${base}/`,
  scope: `${base}/`,
  display: "standalone",
  orientation: "portrait",
  background_color: "#F9FAFB",
  theme_color: "#0F766E",
  icons: [
    { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
    { src: `${base}/icons/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
fs.writeFileSync(path.join(dist, "manifest.webmanifest"), JSON.stringify(manifest, null, 2));

// 3. index.html
const indexPath = path.join(dist, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
html = html.replace('<html lang="en">', '<html lang="fr">');
html = html.replace(/<meta httpEquiv="X-UA-Compatible"[^>]*>\s*/, "");
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
);
html = html.replace(/<link rel="icon"[^>]*\/?>/, "");
const head = `
    <meta name="description" content="${manifest.description}" />
    <meta name="theme-color" content="#0F766E" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="CareSync" />
    <meta name="referrer" content="no-referrer" />
    <link rel="manifest" href="${base}/manifest.webmanifest" />
    <link rel="icon" type="image/png" href="${base}/favicon.png" />
    <link rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png" />
    <script>
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("${base}/sw.js", { scope: "${base}/" });
        });
      }
      // Demande au navigateur de ne pas effacer les donnees de l'appli en cas de manque de place
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    </script>
  </head>`;
html = html.replace("</head>", head);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(path.join(dist, "404.html"), html);

// 4. Service worker : appli + polices + icones pre-chargees ; moteur OCR mis en cache a la premiere lecture
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(path.relative(dist, p).split(path.sep).join("/"));
  }
})(dist);
const precache = files.filter(
  (f) => !f.startsWith("tesseract/") && !/(\.map|404\.html|sw\.js|metadata\.json)$/.test(f) && f !== "index.html",
);
const version = crypto.createHash("sha256").update(precache.join("|") + html).digest("hex").slice(0, 12);
const sw = fs
  .readFileSync(path.join(root, "web/sw.js"), "utf8")
  .replace("__VERSION__", version)
  .replace("__PRECACHE__", JSON.stringify([`${base}/`, ...precache.map((f) => `${base}/${f}`)]));
fs.writeFileSync(path.join(dist, "sw.js"), sw);
fs.writeFileSync(path.join(dist, ".nojekyll"), "");

console.log(`Web finalise : ${dist} (base "${base || "/"}", ${precache.length + 1} fichiers en cache, version ${version})`);

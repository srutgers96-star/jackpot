// Rebuilds the game <script> list in bijbel/index.html and the file list in bijbel/sw.js from bijbel/games/*.js.
// Usage (from the repo root): node tools/bijbel-index.js [cacheVersion]   e.g. node tools/bijbel-index.js 3
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "bijbel");
const games = fs.readdirSync(path.join(dir, "games")).filter((f) => f.endsWith(".js")).sort();
let html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const tags = games.map((f) => `<script src="games/${f}"></script>`).join("\n") + '\n<script src="extras.js"></script>';
html = html.replace(/<!-- GAMES -->[\s\S]*?<!-- \/GAMES -->/, `<!-- GAMES -->\n${tags}\n<!-- /GAMES -->`);
if (!html.includes("bijbelInstallHint()")) html = html.replace("App.init(RULES_DATA,VOORWOORD_DATA);", "App.init(RULES_DATA,VOORWOORD_DATA); bijbelInstallHint();");
fs.writeFileSync(path.join(dir, "index.html"), html);
const swPath = path.join(dir, "sw.js");
const old = fs.existsSync(swPath) ? fs.readFileSync(swPath, "utf8") : "";
const prev = +((/bijbel-v(\d+)/.exec(old) || [])[1] || 0);
const ver = +process.argv[2] || prev + 1;
const files = ["./", "./index.html", "./style.css", "./rules.js", "./core.js", "./extras.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", ...games.map((f) => "./games/" + f)];
fs.writeFileSync(swPath, `// Bierspelbijbel service worker: alles offline beschikbaar, nieuwe versie wordt op de achtergrond opgehaald.
// Dit bestand wordt geschreven door tools/bijbel-index.js; pas het daar aan.
const CACHE = "bijbel-v${ver}";
const FILES = ${JSON.stringify(files)};

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("bijbel-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netwerk eerst voor de eigen bestanden (zodat een update meteen binnenkomt), cache als fallback.
// Jackpot (../index.html, in het iframe) valt buiten deze map en wordt door zijn eigen service worker bediend.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});
`);
console.log(`bijbel: ${games.length} games, cache bijbel-v${ver}`);

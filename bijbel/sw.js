// Bierspelbijbel service worker: alles offline beschikbaar, nieuwe versie wordt op de achtergrond opgehaald.
// Dit bestand wordt geschreven door tools/bijbel-index.js; pas het daar aan.
const CACHE = "bijbel-v7";
const FILES = ["./","./index.html","./style.css","./rules.js","./core.js","./extras.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./games/adtzee.js","./games/blackout.js","./games/blindmexxen.js","./games/chineesroulette.js","./games/driemannen.js","./games/drommels.js","./games/eentjegooien.js","./games/eigenrisico.js","./games/fuckthedealer.js","./games/jessen.js","./games/kaartjedobbelen.js","./games/kingsen.js","./games/liarsdice.js","./games/magicbussen.js","./games/mexx.js","./games/mexxpot.js","./games/negenennegentig.js","./games/nixxen.js","./games/nostradamus.js","./games/ottomaans.js","./games/oudebami.js","./games/paardenrace.js","./games/piramide.js","./games/poefen.js","./games/sixteen.js","./games/snelmexx.js","./games/straatje.js","./games/streepjesspel.js","./games/tegendraads.js","./games/vieren.js","./games/vierkanten.js","./games/zevenachtnegen.js"];

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

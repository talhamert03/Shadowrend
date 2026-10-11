/* ═══════════════════════════════════════════════════════════
   sw.js — ÇEVRİMDIŞI ÖNBELLEK (v44)

   v44 DEĞİŞİKLİĞİ — ZAYIF BAĞLANTI: kendi dosyalarımız "önce ağ" ile
   geliyordu ve zaman aşımı YOKTU. Metroda her açılış, önbellekte duran
   dosya için bile ağın cevabını bekliyordu. Şimdi üç yol:

   • SATICI (unpkg / gstatic / fonts) ve SÜRÜMLÜ (?v= taşıyan) dosyalar:
     ÖNBELLEK ÖNCE. Sürüm eki içeriği sabitler; ağa sormak saf gecikme.
     Önbellekte yoksa ağdan alınıp yazılır.
   • SÜRÜMSÜZ dosyalar (index.html, görseller, manifest): AĞ ÖNCE ama
     1,5 sn ZAMAN AŞIMIYLA; süre dolunca önbellek döner, ağ cevabı
     gelince arka planda önbelleğe yazılır (bir sonraki açılış tazedir).
   • version.json: HİÇ önbelleğe girmez (zorunlu güncelleme bayat okunamaz).

   Paketlenmiş uygulamada (Capacitor) dosyalar zaten cihazda; bu işçi
   yalnız web sürümü için çalışır.
   ═══════════════════════════════════════════════════════════ */

const CACHE = 'sr-cache-20260924c';
const VENDOR = /^https:\/\/(unpkg\.com|www\.gstatic\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
const TIMEOUT = 1500;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

const okToStore = (res) => res && (res.ok || res.type === 'opaque');

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (okToStore(res)) cache.put(req, res.clone()).catch(() => {});
  return res;
}

async function networkRace(req, e) {
  const cache = await caches.open(CACHE);
  const net = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  });
  e.waitUntil(net.catch(() => {}));
  const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
  if (!hit) return net;
  const timer = new Promise((r) => setTimeout(() => r(null), TIMEOUT));
  const first = await Promise.race([net.catch(() => null), timer]);
  return first || hit;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (VENDOR.test(url)) { e.respondWith(cacheFirst(req)); return; }
  if (!url.startsWith(self.registration.scope)) return;
  if (/\/version\.json(\?|$)/.test(url)) return;
  if (/[?&]v=/.test(url)) { e.respondWith(cacheFirst(req)); return; }
  e.respondWith(networkRace(req, e));
});

/* ═══════════════════════════════════════════════════════════
   vault.js — KAYIT KASASI (v44)

   Üç iş, tek yer:
   ① İMZA. Korunan her `kh_*` anahtarının yanına cihaz tuzlu bir özet
      yazılır. Değer elle değiştirilirse özet tutmaz → değer REDDEDİLİR
      ve IndexedDB aynasındaki son iyi kopya döner. Sıradan "localStorage
      düzenle" hilesini kapatır; kararlı bir saldırganı DURDURMAZ — gerçek
      koruma sunucu cüzdanıdır (backend.js sözleşmesi, sonraki tur).
   ② AYNA. Her yazım 400 ms toplu olarak IndexedDB'ye kopyalanır. WebView
      localStorage'ı silerse (depolama baskısı, uygulama verisi temizliği)
      açılışta aynadan geri yüklenir.
   ③ KALICILIK. `navigator.storage.persist()` — tarayıcı/OS depolama
      dolunca oyun verisini "atılabilir" saymasın.

   NEDEN Storage.prototype SARILIYOR: kırkı aşkın okuma/yazma noktası
   (cüzdan, sandık, ilerleme, görev, reklam sayaçları) doğrudan
   localStorage kullanıyor. Hepsini tek tek çevirmek bir noktayı
   unutmak demektir (v28b dersi). Sarma tek noktada, geri alınabilir,
   ve korunmayan anahtarlara (ayarlar, tezgahlar) hiç dokunmaz.
   ═══════════════════════════════════════════════════════════ */

const SECRET = 'sr\u00b7v44\u00b7c0r-ash-moon';
const SIG = '\u0001s:';               // imza anahtarı öneki
const MIG = 'kh_vault_v';             // göç işareti
const DID = 'kh_did';                 // cihaz tuzu
const PROTECT = /^kh_(meta|rubies|bloodstone|chests|freechest|vicchest|adchest|progress|clock|age|consent|deal|firstbuy|best_|boss_down|settings|notif)/;
const DB = 'shadowrend-vault', STORE = 'kv';

function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const P = Storage.prototype;
const rawGet = P.getItem, rawSet = P.setItem, rawDel = P.removeItem;
const LS = () => window.localStorage;

let salt = '';
let mirror = {};          // aynanın bellek kopyası (son iyi değerler)
let dirty = false, flushT = 0;
export const VaultStats = { tampered: [], restored: 0, persisted: null };

const sign = (k, v) => cyrb53(k + '|' + v + '|' + SECRET, salt.length) + cyrb53(v + salt + k, 7);

function idb() {
  return new Promise((res, rej) => {
    if (!('indexedDB' in window)) { rej(new Error('idb yok')); return; }
    const rq = indexedDB.open(DB, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(STORE);
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
async function idbRead() {
  const db = await idb();
  return new Promise((res) => {
    const rq = db.transaction(STORE).objectStore(STORE).get('snap');
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => res(null);
  });
}
async function idbWrite(obj) {
  try {
    const db = await idb();
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(obj, 'snap');
  } catch (e) { /* ayna yazılamadı: localStorage hâlâ asıl kaynak */ }
}
function scheduleFlush() {
  dirty = true;
  if (flushT) return;
  flushT = setTimeout(() => { flushT = 0; if (dirty) { dirty = false; idbWrite({ at: Date.now(), kv: mirror }); } }, 400);
}
export function flushVault() {
  if (flushT) { clearTimeout(flushT); flushT = 0; }
  dirty = false;
  return idbWrite({ at: Date.now(), kv: mirror });
}

function install() {
  P.getItem = function (k) {
    const v = rawGet.call(this, k);
    if (this !== LS() || !PROTECT.test(k)) return v;
    if (v === null) return mirror[k] !== undefined ? mirror[k] : null;
    if (rawGet.call(this, SIG + k) === sign(k, v)) return v;
    /* İMZA TUTMADI: son iyi kopyaya dön ve depoyu onar. */
    if (!VaultStats.tampered.includes(k)) VaultStats.tampered.push(k);
    const good = mirror[k] !== undefined ? mirror[k] : null;
    if (good === null) { rawDel.call(this, k); rawDel.call(this, SIG + k); }
    else { rawSet.call(this, k, good); rawSet.call(this, SIG + k, sign(k, good)); }
    return good;
  };
  P.setItem = function (k, v) {
    rawSet.call(this, k, v);
    if (this !== LS() || !PROTECT.test(k)) return;
    v = String(v);
    rawSet.call(this, SIG + k, sign(k, v));
    mirror[k] = v;
    scheduleFlush();
  };
  P.removeItem = function (k) {
    rawDel.call(this, k);
    if (this !== LS() || !PROTECT.test(k)) return;
    rawDel.call(this, SIG + k);
    delete mirror[k];
    scheduleFlush();
  };
}

/** Oyun kurulmadan ÖNCE beklenir (main.js). Hata verse bile oyun açılır. */
export async function bootVault() {
  let ls;
  try { ls = LS(); } catch (e) { return; }
  salt = rawGet.call(ls, DID);
  if (!salt) {
    salt = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now().toString(36));
    rawSet.call(ls, DID, salt);
  }
  let snap = null;
  try { snap = await Promise.race([idbRead(), new Promise((r) => setTimeout(() => r(null), 900))]); } catch (e) { snap = null; }
  mirror = (snap && snap.kv && typeof snap.kv === 'object') ? snap.kv : {};

  const migrated = rawGet.call(ls, MIG) === '1';
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (!k || !PROTECT.test(k)) continue;
    const v = rawGet.call(ls, k);
    const ok = rawGet.call(ls, SIG + k) === sign(k, v);
    /* İLK AÇILIŞ (v44 öncesi kayıt): imzasız değer bir kez kabul edilir. */
    if (!migrated || ok) { mirror[k] = v; if (!ok) rawSet.call(ls, SIG + k, sign(k, v)); }
  }
  /* GERİ YÜKLEME: localStorage silinmiş ama ayna duruyorsa. */
  for (const k in mirror) {
    if (rawGet.call(ls, k) === null) {
      rawSet.call(ls, k, mirror[k]); rawSet.call(ls, SIG + k, sign(k, mirror[k]));
      VaultStats.restored++;
    }
  }
  rawSet.call(ls, MIG, '1');
  install();
  flushVault();
  try {
    if (navigator.storage && navigator.storage.persist) {
      VaultStats.persisted = await navigator.storage.persisted() || await navigator.storage.persist();
    }
  } catch (e) { /* izin yok */ }
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushVault(); });
  addEventListener('pagehide', () => flushVault());
}

/** Oyuncu kimliği (destek talepleri için gösterilir). */
export function playerId() {
  const s = salt || '';
  return 'SR-' + cyrb53(s).toUpperCase().slice(0, 8);
}

/* ═══════════════════════════════════════════════════════════
   backend.js — SUNUCU · SATIN ALMA · REKLAM · BULUT KAYIT (v44)

   Tek istemci kapısı. Üç yerel eklenti + bir sunucu:
   • Play Billing / StoreKit  → cordova-plugin-purchase (window.CdvPurchase)
   • Ödüllü reklam            → @capacitor-community/admob
   • Sunucu                   → Firebase Cloud Functions (backend/functions)
     Kimlik: Firebase ANONİM oturum (REST — SDK yok, paket küçük kalır).

   KURAL: hiçbir eklenti/sunucu yoksa (web, tezgah, geliştirici) her şey
   eski SİMÜLASYON yoluna düşer ve oyun AYNEN çalışır. Paket yayında
   `CFG.sim = false` olur → gerçek para yolunda simülasyon KAPALI.
   ═══════════════════════════════════════════════════════════ */

import { Clock } from './clock.js?v=20260930m';

export const CFG = {
  apiKey: '',                                   // Firebase web API anahtarı
  fnBase: '',                                   // https://europe-west1-<proje>.cloudfunctions.net
  admob: { rewardedAndroid: 'ca-app-pub-3940256099942544/5224354917', rewardedIos: 'ca-app-pub-3940256099942544/1712485313' },  // Google TEST kimlikleri
  /* config.STONE_PACKS kimliği → mağaza ürün kimliği (Play Console'da aynı adla açılır) */
  products: { kese: 'gems_80', avuc: 'gems_275', sandik: 'gems_720', kule: 'gems_1800' },
  sim: !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()),
};

const cap = () => (window.Capacitor && window.Capacitor.Plugins) || {};
const online = () => !!(CFG.apiKey && CFG.fnBase);

/* ── ANONİM OTURUM ── */
const AUTH = 'kh_auth';
let auth = null;
async function token() {
  if (!online()) return null;
  if (!auth) { try { auth = JSON.parse(localStorage.getItem(AUTH) || 'null'); } catch (e) { auth = null; } }
  const now = Date.now();
  if (auth && auth.exp > now + 60000) return auth.id;
  const url = auth && auth.refresh
    ? 'https://securetoken.googleapis.com/v1/token?key=' + CFG.apiKey
    : 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + CFG.apiKey;
  const body = auth && auth.refresh ? { grant_type: 'refresh_token', refresh_token: auth.refresh } : { returnSecureToken: true };
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) return null;
  const j = await r.json();
  auth = { id: j.idToken || j.id_token, refresh: j.refreshToken || j.refresh_token, uid: j.localId || j.user_id, exp: now + (+(j.expiresIn || j.expires_in) * 1000) };
  try { localStorage.setItem(AUTH, JSON.stringify(auth)); } catch (e) { /* */ }
  return auth.id;
}
async function call(fn, data) {
  const t = await token();
  if (!t) throw new Error('offline');
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(CFG.fnBase + '/' + fn, {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t },
      body: JSON.stringify(data || {}),
    });
    Clock.syncFrom(r);
    if (!r.ok) throw new Error('http ' + r.status);
    return await r.json();
  } finally { clearTimeout(to); }
}

/* ── SATIN ALMA ── */
let store = null, pending = new Map();
function initStore(onGrant) {
  const P = window.CdvPurchase;
  if (!P || store) return;
  store = P.store;
  const plat = window.Capacitor.getPlatform() === 'ios' ? P.Platform.APPLE_APPSTORE : P.Platform.GOOGLE_PLAY;
  store.register(Object.values(CFG.products).map((id) => ({
    id, platform: plat, type: P.ProductType.CONSUMABLE,
  })));
  /* Makbuz SUNUCUDA doğrulanır; ödül sunucunun cevabından gelir, istemcinin
     "aldım" demesinden değil. Doğrulanmadan finish() çağrılmaz → uygulama
     çökse bile mağaza işlemi bir sonraki açılışta tekrar teslim eder. */
  store.when().approved(async (tx) => {
    try {
      const res = await call('verifyPurchase', { platform: window.Capacitor.getPlatform(), productId: tx.products[0].id, token: tx.purchaseId || tx.transactionId, receipt: tx.parentReceipt && tx.parentReceipt.nativeData });
      if (res && res.ok) { onGrant(res); await tx.finish(); }
      const cb = pending.get(tx.products[0].id); if (cb) { pending.delete(tx.products[0].id); cb(!!(res && res.ok)); }
    } catch (e) { /* ağ yok: işlem mağazada bekler, sonraki açılışta yeniden denenir */ }
  });
  store.initialize([plat]);
}

export const Backend = {
  online,
  billing() { return !CFG.sim && !!window.CdvPurchase; },
  ads() { return !CFG.sim && !!cap().AdMob; },

  init(game) {
    if (this.billing()) initStore((res) => {
      if (res.gems) game.addStones(res.gems);
      game.audio.play('stonebuy');
      game.ui.refreshWallet();
    });
    if (this.ads()) cap().AdMob.initialize({ initializeForTesting: false }).catch(() => {});
  },

  price(packId) {
    if (!store) return null;
    const p = store.get(CFG.products[packId]);
    return p && p.pricing ? p.pricing.price : null;     // yerel para birimiyle
  },

  /** @returns {Promise<boolean>} */
  buy(packId) {
    const pid = CFG.products[packId];
    const p = store && store.get(pid);
    if (!p) return Promise.resolve(false);
    return new Promise((res) => {
      pending.set(pid, res);
      p.getOffer().order().then((err) => { if (err) { pending.delete(pid); res(false); } });
    });
  },

  /** Ödüllü reklam. true = tamamlandı (ödül ver). */
  async rewarded() {
    const A = cap().AdMob;
    if (!A) return false;
    const plat = window.Capacitor.getPlatform();
    try {
      await A.prepareRewardVideoAd({ adId: plat === 'ios' ? CFG.admob.rewardedIos : CFG.admob.rewardedAndroid });
      const r = await A.showRewardVideoAd();
      return !!(r && (r.amount || r.type));
    } catch (e) { return false; }
  },

  /* ── BULUT KAYIT ──
     Kasadaki (vault) korunan anahtarların anlık görüntüsü. Sunucu son
     yazılanı tutar ve cüzdanı KENDİ satın alma defterine karşı sınar
     (gem > satın alınan + kazanılabilir tavan → reddeder). */
  async pushSave(snapshot) {
    if (!online()) return false;
    try { const r = await call('saveGame', { at: Math.floor(Clock.now()), data: snapshot }); return !!(r && r.ok); } catch (e) { return false; }
  },
  async pullSave() {
    if (!online()) return null;
    try { return await call('loadGame', {}); } catch (e) { return null; }
  },
  uid() { return auth && auth.uid; },

  snapshot() {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('kh_') && k !== AUTH && k !== 'kh_did') o[k] = localStorage.getItem(k);
    }
    return o;
  },
  /** Yeni cihaz / silinmiş veri: yerelde ilerleme yoksa buluttan geri yükle.
      Oyun kurulmadan ÖNCE çağrılır (main.js açılış zinciri). */
  async restoreIfEmpty() {
    if (!online() || localStorage.getItem('kh_meta')) return false;
    const r = await Promise.race([this.pullSave(), new Promise((res) => setTimeout(() => res(null), 3000))]);
    if (!r || !r.data) return false;
    for (const k in r.data) localStorage.setItem(k, r.data[k]);
    return true;
  },
};

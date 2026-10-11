/* ═══════════════════════════════════════════════════════════
   Shadowrend — SUNUCU (Firebase Cloud Functions v2 · Firestore)
   Dağıtım: cd backend && firebase deploy --only functions,firestore

   verifyPurchase  Play/App Store makbuzunu MAĞAZANIN KENDİ API'siyle
                   doğrular, işlemi tek kez işler (idempotent), gem'i
                   sunucu defterine yazar ve istemciye kaç gem vereceğini söyler.
   saveGame        Bulut kaydı. Cüzdanı deftere karşı sınar.
   loadGame        Bulut kaydını döner.
   Tüm uçlar Firebase kimlik jetonu ister (istemci anonim oturum açar).
   ═══════════════════════════════════════════════════════════ */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();
const db = admin.firestore();
const PLAY_SA = defineSecret('PLAY_SERVICE_ACCOUNT');     // Play Console hizmet hesabı JSON'u
const APPLE_SECRET = defineSecret('APPLE_SHARED_SECRET');
const PACKAGE = 'game.shadowrend';
const REGION = 'europe-west1';

/* Ürün → gem. İSTEMCİDEKİ config.STONE_PACKS ile AYNI (amount + bonus).
   Sunucu istemcinin söylediği miktara ASLA güvenmez; bu tablo tek otorite. */
const PRODUCTS = { gems_80: 80, gems_275: 275, gems_720: 720, gems_1800: 1800 };

/* Oynayarak kazanılabilecek gem tavanı (gün başına, bol pay). Bulut kaydında
   gem > satın alınan + gün × tavan ise kayıt REDDEDİLİR. */
const EARN_PER_DAY = 120;

async function uidOf(req) {
  const h = req.get('authorization') || '';
  const m = h.match(/^Bearer (.+)$/);
  if (!m) throw Object.assign(new Error('auth'), { code: 401 });
  return (await admin.auth().verifyIdToken(m[1])).uid;
}
const wrap = (fn, opts = {}) => onRequest({ region: REGION, cors: true, ...opts }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try { res.json(await fn(await uidOf(req), req.body || {})); }
  catch (e) { res.status(e.code || 500).json({ ok: false, err: e.message }); }
});

async function verifyGoogle(productId, token) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(PLAY_SA.value()),
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const api = google.androidpublisher({ version: 'v3', auth });
  const { data } = await api.purchases.products.get({ packageName: PACKAGE, productId, token });
  if (data.purchaseState !== 0) return null;               // 0 = satın alındı
  return { orderId: data.orderId || token, test: data.purchaseType === 0 };
}
async function verifyApple(receipt) {
  const body = JSON.stringify({ 'receipt-data': receipt, password: APPLE_SECRET.value(), 'exclude-old-transactions': true });
  let r = await (await fetch('https://buy.itunes.apple.com/verifyReceipt', { method: 'POST', body })).json();
  if (r.status === 21007) r = await (await fetch('https://sandbox.itunes.apple.com/verifyReceipt', { method: 'POST', body })).json();
  if (r.status !== 0) return null;
  const tx = (r.receipt && r.receipt.in_app || []).slice(-1)[0];
  return tx ? { orderId: tx.transaction_id, productId: tx.product_id, test: r.environment === 'Sandbox' } : null;
}

exports.verifyPurchase = wrap(async (uid, { platform, productId, token, receipt }) => {
  let v;
  if (platform === 'ios') { v = await verifyApple(receipt); if (v) productId = v.productId; }
  else v = await verifyGoogle(productId, token);
  const gems = PRODUCTS[productId];
  if (!v || !gems) return { ok: false };
  const txRef = db.doc(`tx/${platform}_${v.orderId}`);
  const userRef = db.doc(`users/${uid}`);
  return db.runTransaction(async (t) => {
    const done = await t.get(txRef);
    /* AYNI MAKBUZ İKİNCİ KEZ: ödül verilmez ama ok döner → istemci finish()
       çağırır ve mağaza kuyruğu temizlenir (çift teslim yok). */
    if (done.exists) return { ok: true, gems: 0, dup: true };
    t.set(txRef, { uid, productId, gems, test: v.test, at: admin.firestore.FieldValue.serverTimestamp() });
    t.set(userRef, { bought: admin.firestore.FieldValue.increment(gems), first: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, gems };
  });
}, { secrets: [PLAY_SA, APPLE_SECRET] });

exports.saveGame = wrap(async (uid, { at, data }) => {
  if (!data || typeof data !== 'object') return { ok: false };
  const size = JSON.stringify(data).length;
  if (size > 400000) return { ok: false, err: 'size' };
  const userRef = db.doc(`users/${uid}`);
  const u = (await userRef.get()).data() || {};
  const first = u.first ? u.first.toMillis() : Date.now();
  const days = Math.max(1, Math.ceil((Date.now() - first) / 86400000));
  const gems = Number(data.kh_bloodstone || 0);
  if (gems > (u.bought || 0) + days * EARN_PER_DAY + 500) {
    await db.collection('flags').add({ uid, gems, bought: u.bought || 0, days, at: admin.firestore.FieldValue.serverTimestamp() });
    return { ok: false, err: 'wallet' };
  }
  await db.doc(`saves/${uid}`).set({ at: Math.min(at || Date.now(), Date.now()), data, server: admin.firestore.FieldValue.serverTimestamp() });
  if (!u.first) await userRef.set({ first: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true };
});

exports.loadGame = wrap(async (uid) => {
  const s = await db.doc(`saves/${uid}`).get();
  return s.exists ? { ok: true, at: s.get('at'), data: s.get('data') } : { ok: false };
});

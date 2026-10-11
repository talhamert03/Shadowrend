/* ═══════════════════════════════════════════════════════════
   release.js — YAYIN ALTYAPISI (v44)

   • APP: sürüm kimliği (ayarlarda görünür, destek taleplerinde istenir).
   • checkUpdate(): uzak `version.json` → { latest, min, store:{android,ios} }.
     Sürüm `min`in altındaysa ENGELLEYİCİ güncelleme ekranı; `latest`in
     altındaysa tek seferlik nazik uyarı. Ağ yoksa sessizce geçer —
     çevrimdışı oyuncu asla kilitlenmez. Aynı yanıt saat senkronu verir.
   • Notify: yerel bildirim köprüsü. Uygulama paketinde Capacitor
     LocalNotifications eklentisi varsa onu kullanır; tarayıcıda hiçbir
     şey yapmaz (web push'a DÜŞMEZ — "web sitesi bildirimi" istenmiyor).
   ═══════════════════════════════════════════════════════════ */

import { Clock } from './clock.js?v=20260930m';

export const APP = {
  name: 'Shadowrend',
  version: '1.0.0',
  build: 44,
  /* Uzak sürüm dosyası. Boşsa oyunla aynı kökendeki version.json okunur
     (web sürümü). Paket yayınlanmadan önce kalıcı bir adrese çevrilir. */
  versionUrl: '',
  supportMail: 'destek@shadowrend.game',
};

const cmp = (a, b) => {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
  return 0;
};
export const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
export const platform = () => (window.Capacitor && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'web');

/** @returns {Promise<{state:'ok'|'soft'|'force'|'offline', store?:string, latest?:string}>} */
export async function checkUpdate() {
  const url = (APP.versionUrl || 'version.json') + '?b=' + APP.build + '&t=' + Math.floor(Date.now() / 60000);
  let res;
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 3500);
    res = await fetch(url, { cache: 'no-store', signal: ctl.signal });
    clearTimeout(to);
  } catch (e) { return { state: 'offline' }; }
  if (!res || !res.ok) return { state: 'offline' };
  Clock.syncFrom(res);
  let v;
  try { v = await res.json(); } catch (e) { return { state: 'offline' }; }
  const store = (v.store && v.store[platform()]) || (v.store && v.store.android) || '';
  if (v.min && cmp(APP.version, v.min) < 0) return { state: 'force', store, latest: v.latest };
  if (v.latest && cmp(APP.version, v.latest) < 0) return { state: 'soft', store, latest: v.latest };
  return { state: 'ok' };
}

/* ── YEREL BİLDİRİMLER ──
   Kimlikler sabit: aynı iş yeniden planlanınca eskisinin üstüne yazar
   (çift bildirim olmaz). İzin BAĞLAMSAL istenir — ilk sandık çözülmeye
   başladığında, açılışta değil (açılışta istenen izin reddedilir). */
const N_CHEST = 101, N_FREE = 102, N_DAILY = 103;
const LN = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null;

export const Notify = {
  enabled() { try { return localStorage.getItem('kh_notif') !== '0'; } catch (e) { return true; } },
  setEnabled(on) {
    try { localStorage.setItem('kh_notif', on ? '1' : '0'); } catch (e) { /* */ }
    if (!on) this.cancelAll();
  },
  available() { return !!LN(); },
  async ask() {
    const ln = LN();
    if (!ln || !this.enabled()) return false;
    try {
      const p = await ln.checkPermissions();
      if (p.display === 'granted') return true;
      const r = await ln.requestPermissions();
      return r.display === 'granted';
    } catch (e) { return false; }
  },
  async cancelAll() {
    const ln = LN();
    if (!ln) return;
    try { await ln.cancel({ notifications: [{ id: N_CHEST }, { id: N_FREE }, { id: N_DAILY }] }); } catch (e) { /* */ }
  },
  /** Arka plana geçerken çağrılır: bekleyen her şey tek seferde planlanır. */
  async schedule({ chestAt, freeAt, dailyAt, t }) {
    const ln = LN();
    if (!ln || !this.enabled()) return;
    try {
      const p = await ln.checkPermissions();
      if (p.display !== 'granted') return;
      await this.cancelAll();
      /* Cihaz saati ile oyun saati farklıysa (sunucu düzeltmesi) plan
         CİHAZ saatine çevrilir: bildirimi işletim sistemi çalar. */
      const toDev = (ms) => new Date(ms - Clock.offset);
      const now = Clock.now();
      const list = [];
      if (chestAt && chestAt > now + 30000) list.push({ id: N_CHEST, title: t.chestT, body: t.chestB, schedule: { at: toDev(chestAt) } });
      if (freeAt && freeAt > now + 30000) list.push({ id: N_FREE, title: t.freeT, body: t.freeB, schedule: { at: toDev(freeAt) } });
      if (dailyAt && dailyAt > now + 30000) list.push({ id: N_DAILY, title: t.dailyT, body: t.dailyB, schedule: { at: toDev(dailyAt) } });
      if (list.length) await ln.schedule({ notifications: list.map((n) => ({ ...n, smallIcon: 'ic_stat_sr', iconColor: '#b06a49' })) });
    } catch (e) { /* eklenti hatası oyunu etkilemez */ }
  },
};

/* ── YALNIZ DİKEY ──
   Pakette yön AndroidManifest/Info.plist ile kilitlenir (capacitor
   ayarı). Tarayıcıda kilit yalnız tam ekranda çalışır; kilit tutmazsa
   CSS koruması (#rotate-guard) oyunu karartıp telefonu çevirmesini ister. */
export function lockPortrait() {
  try {
    const so = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ScreenOrientation;
    if (so && so.lock) { so.lock({ orientation: 'portrait' }).catch(() => {}); return; }
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {});
  } catch (e) { /* */ }
}

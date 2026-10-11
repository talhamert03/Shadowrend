/* ═══════════ errlog.js — YEREL HATA DEFTERİ (v54 F5, 2026-09-28) ═══════════
   Oyun çevrimdışı: çökme raporu hiçbir yere gitmez. Yakalanmayan hata ve
   reddedilen söz son 20 kayıt olarak cihazda tutulur; oyuncu Ayarlar →
   HATA KAYDI → KOPYALA ile destek e-postasına yapıştırır. Kendiliğinden veri
   ÇIKMAZ. Aynı imza 1 sn içinde tekrar ederse sayaç artar (döngüde patlayan
   hata depolamayı doldurmasın). */
const KEY = 'kh_errlog_v1', MAX = 20;

export const ErrLog = {
  _l: null, _lastSig: '', _lastT: 0, _ctx: null,
  read() {
    if (this._l) return this._l;
    try { this._l = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { this._l = []; }
    if (!Array.isArray(this._l)) this._l = [];
    return this._l;
  },
  push(msg, src, stack) {
    const L = this.read(), now = Date.now();
    const sig = String(msg).slice(0, 160) + '|' + (src || '');
    if (sig === this._lastSig && now - this._lastT < 1000 && L[0]) { L[0].n = (L[0].n || 1) + 1; this._lastT = now; this._save(); return; }
    this._lastSig = sig; this._lastT = now;
    const g = this._ctx;
    L.unshift({
      t: now, m: String(msg).slice(0, 240), s: (src || '').slice(-120),
      k: String(stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 480),
      st: g ? g.state + (g.worldId ? ' D' + g.worldId + '-' + g.missionId + ' w' + g.wave : '') : '', n: 1,
    });
    if (L.length > MAX) L.length = MAX;
    this._save();
  },
  _save() { try { localStorage.setItem(KEY, JSON.stringify(this._l)); } catch (e) { /* kota */ } },
  clear() { this._l = []; this._save(); },
  text() {
    const L = this.read();
    const head = 'Shadowrend hata kaydı · ' + new Date().toISOString() + ' · ' + navigator.userAgent;
    if (!L.length) return head + '\n(kayıt yok)';
    return head + '\n' + L.map((r) => new Date(r.t).toISOString() + ' [' + r.st + ']' + (r.n > 1 ? ' ×' + r.n : '') + '\n  ' + r.m + (r.s ? ' @ ' + r.s : '') + (r.k ? '\n  ' + r.k : '')).join('\n');
  },
  install(game) {
    this._ctx = game;
    window.addEventListener('error', (e) => this.push(e.message || 'error', (e.filename || '') + ':' + (e.lineno || 0), e.error && e.error.stack));
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason;
      this.push('promise: ' + (r && r.message ? r.message : String(r)), '', r && r.stack);
    });
  },
};

/* ═══════════ PERF DEFTERİ (v53, 2026-09-28) — yol haritası B1 ═══════════
   Çevrimdışı saha ölçümü: her koşuda kare süreleri ÖNCEDEN ayrılmış bir
   halkaya yazılır (sıcak döngüde tahsis YOK — kural 4), koşu sonunda
   p50/p95/sivri uç özetlenip son 30 koşu cihazda saklanır. Hiçbir veri
   cihazdan çıkmaz; Ayarlar → PERFORMANS RAPORU gösterir ve panoya kopyalar. */

import { Quality } from './perf.js?v=20260930m';

const KEY = 'kh_perflog_v1';
const N = 1 << 14;                         // ~4,5 dk @60 Hz; taşarsa halka döner
const buf = new Float32Array(N);
const tmp = new Float32Array(N);
let n = 0, on = false, t0 = 0, spikes = 0;

export const PerfLog = {
  begin() { n = 0; spikes = 0; on = true; t0 = performance.now(); },
  push(ms) {
    if (!on) return;
    buf[n & (N - 1)] = ms; n++;
    if (ms > 50) spikes++;
  },
  end(g, result) {
    if (!on) return null;
    on = false;
    const c = Math.min(n, N);
    if (c < 120) return null;             // 2 sn'den kısa koşu ölçüm sayılmaz
    tmp.set(buf.subarray(0, c));
    const s = tmp.subarray(0, c).sort();
    const q = (p) => s[Math.min(c - 1, Math.floor(c * p))];
    const row = {
      d: new Date().toISOString().slice(0, 16).replace('T', ' '),
      m: (g.worldId | 0) + '-' + (g.missionId | 0), r: result,
      p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), p99: +q(0.99).toFixed(1),
      sp: spikes, f: c, sec: Math.round((performance.now() - t0) / 1000),
      tier: Quality.tier, sc: +(+Quality.scale || 1).toFixed(2), st: +(+Quality.stress || 0).toFixed(2),
    };
    const list = this.read();
    list.unshift(row);
    if (list.length > 30) list.length = 30;
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* */ }
    return row;
  },
  read() {
    try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  },
  text() {
    const L = this.read();
    const hdr = 'Shadowrend perf · ' + navigator.userAgent + ' · DPR ' + (window.devicePixelRatio || 1) + ' · açılış ms ' + this.bootList().join(',');
    return [hdr, 'tarih | görev | sonuç | p50 | p95 | p99 | >50ms | kare | sn | kademe | ölçek | stres']
      .concat(L.map((r) => [r.d, r.m, r.r, r.p50, r.p95, r.p99, r.sp, r.f, r.sec, r.tier, r.sc, r.st].join(' | '))).join('\n');
  },
  /** v54 F2: soğuk açılış (ms, sayfa başından açılış ekranının kalkışına), son 10. */
  boot(ms) {
    try {
      const L = JSON.parse(localStorage.getItem('kh_boot_v1') || '[]');
      L.unshift(Math.round(ms)); if (L.length > 10) L.length = 10;
      localStorage.setItem('kh_boot_v1', JSON.stringify(L));
    } catch (e) { /* */ }
  },
  bootList() { try { const L = JSON.parse(localStorage.getItem('kh_boot_v1') || '[]'); return Array.isArray(L) ? L : []; } catch (e) { return []; } },
};

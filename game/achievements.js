/* ═══════════════════════════════════════════════════════════
   v61 · BAŞARIMLAR (M4) — çevrimdışı, GÜÇ VERMEZ. Ödül: küçük altın/gem + unvan.
   Veri: meta.ach = { s: {istatistik}, d: {id: 1} }. Koşu sonunda onRun istatistiği
   işler, yeni kazanılanları döndürür (ödül anında verilir). Sıcak yolda çağrılmaz.
   ═══════════════════════════════════════════════════════════ */
export const ACH = [
  { id: 'k1',   name: 'İLK KAN',          desc: 'Toplam 500 düşman kıy',        st: 'kills', n: 500,   gold: 60 },
  { id: 'k2',   name: 'HASATÇI',          desc: 'Toplam 5 000 düşman kıy',      st: 'kills', n: 5000,  gold: 150, gem: 5 },
  { id: 'k3',   name: 'KIZIL TIRPAN',     desc: 'Toplam 25 000 düşman kıy',     st: 'kills', n: 25000, gem: 20, title: 'KIZIL TIRPAN' },
  { id: 'w1',   name: 'İLK ZAFER',        desc: 'Bir görevi kazan',             st: 'wins',  n: 1,     gold: 50 },
  { id: 'w2',   name: 'SAVAŞ ALIŞKANLIĞI', desc: '25 görev kazan',               st: 'wins',  n: 25,    gold: 200, gem: 5 },
  { id: 'w3',   name: 'EFSANE YOLU',      desc: '100 görev kazan',              st: 'wins',  n: 100,   gem: 25, title: 'YOL ERİ' },
  { id: 'b1',   name: 'DEV AVCISI',       desc: '5 boss devir',                 st: 'boss',  n: 5,     gold: 120 },
  { id: 'b2',   name: 'TAHT YIKAN',       desc: '30 boss devir',                st: 'boss',  n: 30,    gem: 15, title: 'TAHT YIKAN' },
  { id: 'c1',   name: 'KATLİAM',          desc: 'Tek zincirde 30 kıyım',        st: 'combo', n: 30,    gold: 80, max: true },
  { id: 'c2',   name: 'KIZIL HASAT',      desc: 'Tek zincirde 60 kıyım',        st: 'combo', n: 60,    gem: 10, title: 'HASAT KIZILI', max: true },
  { id: 'u1',   name: 'SÜPER GÜÇ',        desc: '20 kez süper yetenek kullan',  st: 'ults',  n: 20,    gold: 80 },
  { id: 'u2',   name: 'FIRTINA ÇAĞIRAN',  desc: '200 kez süper yetenek kullan', st: 'ults',  n: 200,   gem: 10 },
  { id: 'l1',   name: 'GÜÇLENİŞ',         desc: 'Bir koşuda 20. seviyeye ulaş', st: 'lvl',   n: 20,    gold: 70, max: true },
  { id: 'nh',   name: 'DOKUNULMAZ',       desc: 'Canın hiç %50 altına düşmeden kazan', st: 'clean', n: 1, gold: 100 },
  { id: 'r1',   name: 'SEBAT',            desc: '50 koşu oyna',                 st: 'runs',  n: 50,    gold: 150 },
  { id: 'h3',   name: 'KALABALIK KADRO',  desc: '5 kahramana sahip ol',         st: 'heroes', n: 5,    gem: 8, max: true },
];

export const Ach = {
  book(meta) {
    if (!meta.ach || typeof meta.ach !== 'object') meta.ach = { s: {}, d: {} };
    if (!meta.ach.s) meta.ach.s = {};
    if (!meta.ach.d) meta.ach.d = {};
    return meta.ach;
  },
  /** koşu sonu: istatistiği işle, yeni kazanılanları ver ve döndür */
  onRun(g, win) {
    const A = this.book(g.meta), s = A.s;
    const add = (k, v) => { s[k] = (s[k] | 0) + (v | 0); };
    const mx = (k, v) => { if ((v | 0) > (s[k] | 0)) s[k] = v | 0; };
    add('kills', g.kills - (g._achK | 0)); g._achK = g.kills;   // diriliş sonrası çift sayım yok
    add('runs', 1);
    add('ults', (g.ult ? g.ult.uses : 0) - (g._achU | 0)); g._achU = g.ult ? g.ult.uses : 0;
    if (win) add('wins', 1);
    if (win && g.msn && g.msn.isBoss) add('boss', 1);
    mx('combo', g._cbBest | 0);
    mx('lvl', g.player ? g.player.level | 0 : 0);
    if (win && !(g.towerRun || g.sealRun || g.nmRun) && g._hpFloor >= 0.5) mx('clean', 1);
    mx('heroes', g.meta.charsOwned ? g.meta.charsOwned.length : 0);
    return this.check(g);
  },
  check(g) {
    const A = this.book(g.meta), out = [];
    for (const a of ACH) {
      if (A.d[a.id] || (A.s[a.st] | 0) < a.n) continue;
      A.d[a.id] = 1;
      if (a.gold) g.addRubies(a.gold);
      if (a.gem) g.addStones(a.gem);
      if (a.title) A.title = a.title;
      out.push(a);
    }
    return out;
  },
  progress(meta, a) { const s = this.book(meta).s; return Math.min(1, (s[a.st] | 0) / a.n); },
  count(meta) { const d = this.book(meta).d; let n = 0; for (const a of ACH) if (d[a.id]) n++; return n; },
};

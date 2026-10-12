/* GÖK TIRMANIŞI SANATI — skyMap.js / isleScene.js / biomeSky.js → PNG katmanları
   (godot/assets/ui/climb/…). Godot tarafı (climb_art.gd) yol taşlarını, bayrakları,
   ışık sütununu, yumuşak ışımaları ve vinyeti kendisi çizer; ilerlemeye bağlı
   olmayan pahalı boyama burada bir kez pişirilir:
     • w<id>/back_<W>x<H>.png, front_<W>x<H>.png — paintBiomeBack/Front (önizleme)
     • w<id>/i<seed>.png  — ada GÖVDESİ  (island())   slot = seed%3, boss = 'b'
     • w<id>/s<seed>.png  — ada YAPISI   (W.L[idx] fn) — Godot oda payına göre k ile kısar
   Gövde ve yapı aynı rnd akışını paylaşır (gövde önce), bu yüzden ikisi tek
   çağrıda iki ayrı tuvale çizilir. Adalar R0 yarı genişlikte, oda sınırsız.
   climb.json: R0, dpr, her sprite'ın (x,y) çapası, yapı yükseklik çarpanları (H). */
import fs from 'node:fs'; import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const OUT = path.join(ROOT, 'godot/assets/ui/climb');
const R0 = 90, DPR = 2;
const SIZES = [[358, 320], [362, 282]];   // önizleme tuvalleri: ana sayfa haritası · dünya kartı (cardW×0,78)
const TALL = { W: 390, base: 1287, t: 56, b: 96, dpr: 1.6 };   // bölüm seçimi (renderChapters)
const BOSS_SEEDS = [3, 9];           // önizlemede boss 4. ada (seed 3), dikeyde 10. (seed 9)

export default {
  async run(A) {
    fs.mkdirSync(OUT, { recursive: true });
    const src = fs.readFileSync(path.join(ROOT, 'game/isleScene.js'), 'utf8');
    /* drawIsle'ın gövde/yapı ayrık kopyası — modülün iç işlevlerine erişmek için kaynağa eklenir */
    const extra = `
export function __split(gb, gs, wd, slot, x, y, rx) {
  const W = WORLD[wd.floor] || WORLD.mezarlik;
  const boss = slot === 'b';
  const idx = boss ? 3 : ((slot % 3) + 3) % 3;
  return (seed) => {
    const rnd = rng(wd.id * 7331 + (seed | 0) * 131 + idx * 17 + 3);
    const [fn, H] = W.L[idx];
    const c = { g: gb, s: rx, M: W.M, rnd, lw: Math.max(0.55, rx * 0.022) };
    gb.save();
    island(c, x, y, rx, { depth: boss ? ISLE_BOSS_DEPTH : 0.95 + rnd() * 0.2, edge: W.edge, hang: W.hang, speck: W.speck });
    gb.restore();
    c.g = gs; gs.save(); fn(c, x, y); gs.restore();
    return H;
  };
}`;
    const res = await A.eval(async ([code, R0, DPR, SIZES, BOSS_SEEDS, TALL]) => {
      const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      const M = await import(url);
      const { WORLDS } = await import('/game/worlds.js?v=20260930m');
      const B = await import('/game/biomeSky.js?v=20260930m');
      const trim = (cv, ax, ay) => {
        const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
        let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
        for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 1) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        if (x1 < 0) return null;
        x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(cv.width - 1, x1 + 1); y1 = Math.min(cv.height - 1, y1 + 1);
        const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
        o.getContext('2d').drawImage(cv, -x0, -y0);
        return { png: o.toDataURL('image/png').split(',')[1], ax: ax - x0, ay: ay - y0, w: o.width, h: o.height };
      };
      const out = { worlds: {}, files: {} };
      /* dikey tırmanış: yol + adalar hariç ARKA (gök, yıldız, ay, uzak siluet, bulut) ve ÖN
         (ön bulut, zerreler, yan vinyet) katmanları — skyMap kaynağı yamalanır */
      let sky = await (await fetch('/game/skyMap.js?v=20260930m')).text();
      sky = sky.replace(/from\s+'\.\/([^']+)'/g, (_, q) => "from '" + location.origin + "/game/" + q + "'");
      sky = sky.replace("const g = cv.getContext('2d');", "let g = cv.getContext('2d');");
      const i4 = sky.indexOf('  /* ═ 4. TIRMANIŞ YOLU'), i6 = sky.indexOf('  /* ═ 6. ÖN BULUTLAR');
      if (i4 < 0 || i6 < 0) throw new Error('skyMap kalıbı değişti');
      sky = sky.slice(0, i4) + '  if (!window.__skipMid) {\n' + sky.slice(i4, i6) + '  }\n  if (window.__front) g = window.__front;\n' + sky.slice(i6);
      const SM = await import(URL.createObjectURL(new Blob([sky], { type: 'text/javascript' })));
      const TH = TALL.base + TALL.t + TALL.b;
      const tallPad = { t: TALL.t / TH, b: TALL.b / TH };
      for (const wd of WORLDS) {
        const W = { slots: {}, H: [] };
        for (const [w, h] of SIZES) {
          for (const side of ['back', 'front']) {
            const cv = document.createElement('canvas'); cv.width = w * DPR; cv.height = h * DPR;
            const g = cv.getContext('2d'); g.scale(DPR, DPR);
            (side === 'back' ? B.paintBiomeBack : B.paintBiomeFront)(g, wd, w, h);
            out.files['w' + wd.id + '/' + side + '_' + w + 'x' + h] = cv.toDataURL('image/png').split(',')[1];
          }
        }
        const jobs = [];
        for (let s = 0; s < 9; s++) jobs.push([s, s % 3]);
        for (const s of BOSS_SEEDS) jobs.push([s, 'b']);
        for (const [seed, slot] of jobs) {
          const CW = R0 * 7, CH = R0 * 7, ax = CW / 2, ay = R0 * 4.2;
          const mk = () => { const cv = document.createElement('canvas'); cv.width = CW * DPR; cv.height = CH * DPR; const g = cv.getContext('2d'); g.scale(DPR, DPR); return [cv, g]; };
          const [cb, gb] = mk(), [cs, gs] = mk();
          const H = M.__split(gb, gs, wd, slot, ax, ay, R0)(seed);
          const name = (slot === 'b' ? 'b' : 'i') + seed;
          const tb = trim(cb, ax * DPR, ay * DPR), ts = trim(cs, ax * DPR, ay * DPR);
          W.slots[name] = { H, body: tb && { ax: tb.ax, ay: tb.ay, w: tb.w, h: tb.h }, top: ts && { ax: ts.ax, ay: ts.ay, w: ts.w, h: ts.h } };
          if (tb) out.files['w' + wd.id + '/' + name + '_b'] = tb.png;
          if (ts) out.files['w' + wd.id + '/' + name + '_s'] = ts.png;
        }
        {
          const fc = document.createElement('canvas'); fc.width = Math.round(TALL.W * TALL.dpr); fc.height = Math.round(TH * TALL.dpr);
          const fg = fc.getContext('2d'); fg.scale(TALL.dpr, TALL.dpr);
          window.__skipMid = true; window.__front = fg;
          const _dpr = window.devicePixelRatio;
          Object.defineProperty(window, 'devicePixelRatio', { value: TALL.dpr, configurable: true });
          const bc = SM.paintClimb(wd, 0, TALL.W, TH, 'tall', 10, tallPad);
          Object.defineProperty(window, 'devicePixelRatio', { value: _dpr, configurable: true });
          window.__skipMid = false; window.__front = null;
          out.files['w' + wd.id + '/tall_back'] = bc.toDataURL('image/png').split(',')[1];
          out.files['w' + wd.id + '/tall_front'] = fc.toDataURL('image/png').split(',')[1];
        }
        out.worlds[wd.id] = W;
      }
      return out;
    }, [src + extra, R0, DPR, SIZES, BOSS_SEEDS, TALL]);
    for (const k in res.files) {
      const f = path.join(OUT, k + '.png');
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, Buffer.from(res.files[k], 'base64'));
    }
    fs.writeFileSync(path.join(OUT, 'climb.json'), JSON.stringify({ R0, dpr: DPR, sizes: SIZES, tall: TALL, worlds: res.worlds }));
    console.log('tırmanış sanatı', Object.keys(res.files).length, 'dosya');
  },
};

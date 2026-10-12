/* SEVİYE ATLAMA ekranı: kabuk + her kart türü + etiket rozetleri + evrim şeridi + glifler.
   Kart türü = ui.showLevelUp'ın sınıf/vurgu kararı (kademe 0-4, özel perk, myth,
   beş kahraman × üç kademe, lanetli, evrim). Kartlar üçlü dizilimde yakalanır
   (genişlik 3'lü sıraya göre); yalnız hedef kart kaydedilir. */
import fs from 'node:fs'; import path from 'node:path';
import { enterBattle } from './_battle.mjs';

const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../godot/assets/ui/lyr');

export default {
  async run(A) {
    await enterBattle(A);
    /* giriş animasyonları (lvIn, ekran açılışı) yalnız oynarken getAnimations'ta görünür →
       gösterir göstermez yakala (görüntüler zaten animasyonsuz taban durumdan alınır) */
    await A.eval(() => window.__game.enterLevelUp());
    await A.wait(80);
    /* ① kabuk (kartlar ve evrim şeridi dinamik) */
    await A.layers({ sel: '#screen-levelup', name: 'lv_screen', skip: ['.lv-card', '.lv-evo-hint'], stretch: 100 });
    await A.layers({ sel: '.lv-evo-hint', name: 'lv_evo' });

    /* ② kart türleri */
    const V = [
      ['base0', { kind: 'passive', id: 'kalp', level: 0, max: 4 }],
      ['base1', { kind: 'passive', id: 'kalp', level: 1, max: 4 }],
      ['base2', { kind: 'passive', id: 'kalp', level: 2, max: 4 }],
      ['base3', { kind: 'passive', id: 'kalp', level: 3, max: 4 }],
      ['base4', { kind: 'special', sig: true, id: 'x', icon: 'yay', tier: 5, level: 4, max: 5 }],
      ['perk', { kind: 'special', id: 'x', icon: 'yay', level: 0, max: 1 }],
      ['myth', { kind: 'special', sig: true, myth: true, id: 'x', icon: 'yay', tier: 1, level: 0, max: 5 }],
      ['curse', { kind: 'curse', curse: true, id: 'x', icon: 'yay', level: 0, max: 1 }],
      ['evo', { kind: 'special', evo: true, myth: true, id: 'evo_x', icon: 'yay', level: 0, max: 1 }],
    ];
    for (const h of ['seher', 'simsek', 'korsan', 'kralice', 'sovalye']) for (const t of [1, 2, 3]) V.push([h + t, { kind: 'special', sig: true, myth: true, [h]: true, id: 'x', icon: 'yay', tier: t, level: t - 1, max: 5 }]);
    const made = [];
    for (const [nm, c0] of V) {
      const top = await A.eval((c0) => {
        const g = window.__game, u = g.ui;
        const mk = () => Object.assign({ tag: 'X', name: 'Kadim Yürek', desc: 'Azami can +22 — aldığın an dolar.', stats: [], stag: 'CELIK', stagN: 0 }, c0);
        u.showLevelUp([mk(), mk(), mk()]);
        return !!document.querySelector('.lv-card.lv-top');
      }, c0);
      await A.wait(80);
      const sel = top ? '.lv-card.lv-top' : '.lv-card';
      await A.layers({ sel, name: 'lvc_' + nm, skip: ['.lv-stag'], stretch: 40 });
      made.push(nm);
    }

    /* ③ etiket rozetleri: her etiket × (olağan, eşik "hit") */
    const tags = await A.eval(async () => (await import('/game/weapons.js?v=20260930m')).TAGS && Object.keys((await import('/game/weapons.js?v=20260930m')).TAGS));
    for (const t of tags) for (const hit of [0, 1]) {
      await A.eval(([t, hit]) => {
        const g = window.__game, u = g.ui;
        const c = { kind: 'passive', id: 'kalp', level: 0, max: 4, tag: 'X', name: 'Kadim Yürek', desc: 'Azami can +22.', stats: [], stag: t, stagN: hit ? 1 : 0 };
        u.showLevelUp([c, Object.assign({}, c), Object.assign({}, c)]);
      }, [t, hit]);
      await A.wait(80);
      await A.layers({ sel: '.lv-stag', name: 'lvs_' + t + '_' + hit });
    }

    /* ④ glifler: tek renk (currentColor) SVG → beyaz maske + σ=3 bulanık hale (drop-shadow 6px) */
    const G = await A.eval(async () => {
      const src = await (await fetch('/game/cardArt.js')).text();
      const names = [...src.matchAll(/^const ([A-Z_]+_GLYPHS) = \{/gm)].map((m) => m[1]);
      const url = URL.createObjectURL(new Blob([src + '\nexport { ' + names.join(', ') + ', FALLBACK };'], { type: 'text/javascript' }));
      const M = await import(url);
      const out = { 'FALLBACK:fallback': M.FALLBACK };
      for (const n of names) for (const k in M[n]) out[n + ':' + k] = M[n][k];
      return out;
    });
    const gdir = path.join(OUT, 'glyph');
    fs.mkdirSync(gdir, { recursive: true });
    const meta = {};
    for (const key in G) {
      const [tbl, id] = key.split(':');
      const fn = tbl === 'FALLBACK' ? 'fallback' : (tbl.replace('_GLYPHS', '') + '_' + id).toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const svg = G[key];
      /* 38 px gösterim (en büyük kullanım 3×) — 14 px pay hale için */
      await A.svg('lyr/glyph/' + fn, svg, 66, 66, 'color:#fff;padding:14px;box-sizing:border-box');
      await A.svg('lyr/glyph/' + fn + '_glow', svg, 66, 66, 'color:#fff;padding:14px;box-sizing:border-box;filter:blur(3px)');
      (meta[tbl] = meta[tbl] || {})[id] = fn;
    }
    fs.writeFileSync(path.join(gdir, 'glyphs.json'), JSON.stringify({ size: 38, pad: 14, box: 66, tables: meta }));
    fs.writeFileSync(path.join(OUT, 'lv_made.json'), JSON.stringify({ cards: made, tags }));
  },
};

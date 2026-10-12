/* SANAT PİŞİRME: arayüzün SVG çizimleri → PNG (godot/assets/ui/art/…)
   • icon/<id>.png      — ui.js ICONS (tek renk currentColor → beyaz maske; renkliyse olduğu gibi)
   • gear/<id>.png      — GEAR_ART (tam renk eşya çizimleri)
   • chest/t<tier>.png  — chestArt(tier) durağan kare (SMIL 1. sn, liste bağlamındaki gibi)
   (SMIL süreleri farklı → kesintisiz döngü yok; canlılık Godot tarafında)
   art.json: kimlik → dosya, renk, tek-renk bayrağı */
import fs from 'node:fs'; import path from 'node:path';

const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../godot/assets/ui/art');

export default {
  async run(A) {
    const p = A.page;
    fs.mkdirSync(OUT, { recursive: true });
    const meta = { icon: {}, gear: {}, chest: {} };
    /* ① ICONS: anahtarlar kaynaktan, SVG canlı ui.icon()'dan */
    const src = fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../game/ui.js'), 'utf8');
    const a = src.indexOf('const ICONS = {'), b = src.indexOf('\n};', a);
    const keys = [...src.slice(a, b).matchAll(/^\s{2}([a-zA-Z0-9_]+):/gm)].map((m) => m[1]);
    const icons = await A.eval((keys) => { const u = window.__game.ui; const o = {}; for (const k of keys) o[k] = { svg: u.icon(k), col: u.iconColor(k), name: u.displayName(k) }; return o; }, keys);
    fs.mkdirSync(path.join(OUT, 'icon'), { recursive: true });
    for (const k of keys) {
      const I = icons[k];
      const mono = !/(fill|stroke|stop-color)="#|(fill|stroke):\s*#|rgb\(/i.test(I.svg.replace(/currentColor/g, ''));
      await A.svg('art/icon/' + k, I.svg, 40, 40, 'color:#fff');
      meta.icon[k] = { mono, col: I.col, name: I.name };
    }
    /* ② GEAR_ART */
    const gear = await A.eval(async () => { const m = await import('/game/gearArt.js?v=20260930m'); return m.GEAR_ART; });
    fs.mkdirSync(path.join(OUT, 'gear'), { recursive: true });
    for (const k in gear) {
      await A.svg('art/gear/' + k, gear[k], 120, 120, '');
      meta.gear[k] = 1;
    }
    /* ③ sandıklar */
    const tiers = await A.eval(async () => { const m = await import('/game/chests.js?v=20260930m'); const o = {}; for (const k in m.CHESTS) o[k] = m.CHESTS[k].tier; return o; });
    fs.mkdirSync(path.join(OUT, 'chest'), { recursive: true });
    const done = new Set();
    for (const k in tiers) {
      const t = tiers[k];
      meta.chest[k] = 't' + t;
      if (done.has(t)) continue;
      done.add(t);
      const svg = await A.eval(async (t) => (await import('/game/chestArt.js?v=20260930m')).chestArt(t), t);
      for (let f = 0; f <= 0; f++) {
        await A.eval(([svg, f]) => {
          let d = document.getElementById('uicap-svg');
          if (!d) { d = document.createElement('div'); d.id = 'uicap-svg'; document.body.appendChild(d); }
          d.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;width:150px;height:150px;display:grid;place-items:center';
          d.innerHTML = svg;
          const s = d.querySelector('svg'); s.style.width = '100%'; s.style.height = '100%';
          try { s.pauseAnimations(); s.setCurrentTime(f === 0 ? 1 : (f - 1) / 24 * 4); } catch (e) {}
        }, [svg, f]);
        await A.eval(() => { document.documentElement.classList.add('uicap-clear'); for (const x of document.querySelectorAll('body > *')) if (x.id !== 'uicap-svg') x.classList.add('uicap-off'); });
        await p.screenshot({ path: path.join(OUT, 'chest', 't' + t + (f === 0 ? '' : '_f' + (f - 1)) + '.png'), clip: { x: 0, y: 0, width: 150, height: 150 }, omitBackground: true });
        await A.reset();
      }
    }
    await A.eval(() => { const d = document.getElementById('uicap-svg'); if (d) d.remove(); });
    fs.writeFileSync(path.join(OUT, 'art.json'), JSON.stringify(meta));
    console.log('sanat', keys.length, 'ikon', Object.keys(gear).length, 'eşya', done.size, 'sandık kademesi');
  },
};

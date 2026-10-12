/* EŞYA İNCELEME (openGearDetail): kademe (rk 1..5) × durum, stat satırları ayrı şablon.
   • gd<rk>_<durum>  — lock · own · own_on · own_cant · up · up_on · max · max_on
                        (#gd-stats boş; sahip olunanda #gd-glyph içi boş → Godot eşya çizimini koyar)
   • gst_<good|bad>[_<up|down|eq>]   — stat satırı (ikon boş; Godot ikon + renk)
   • gst_vs                          — "Kuşanılana göre · …" satırı */
export default {
  async run(A) {
    await A.wait(1500);
    const ST = {
      lock: { own: false },
      own: { own: true, need: 10, cards: 3, up: false, on: false, wear: true },
      own_on: { own: true, need: 10, cards: 3, up: false, on: true, wear: true },
      own_cant: { own: true, need: 10, cards: 3, up: false, on: false, wear: false },
      up: { own: true, need: 10, cards: 12, up: true, on: false, wear: true },
      up_on: { own: true, need: 10, cards: 12, up: true, on: true, wear: true },
      max: { own: true, need: null, cards: 0, up: false, on: false, wear: true },
      max_on: { own: true, need: null, cards: 0, up: false, on: true, wear: true },
    };
    const ranks = await A.eval(async () => {
      const { EQUIPMENT } = await import('/game/config.js?v=20260930m');
      const RANK = { 1: 1, 2: 2, 5: 3, 3: 4, 4: 5 };
      const by = {};
      for (const x of EQUIPMENT) { const rk = RANK[x.rarity]; if (!by[rk]) by[rk] = x.id; }
      return by;
    });
    for (const rk in ranks) {
      const id = ranks[rk];
      for (const k in ST) {
        await A.eval(([id, S]) => {
          const g = window.__game, ui = g.ui;
          const keep = g.__gdKeep || (g.__gdKeep = { o: g.ownsGear, l: g.gearLevel, n: g.cardsForNextGear, c: g.gearCardCount, u: g.canUpgradeGear, gf: g.goldForNextGear, e: g.isEquipped, w: g.canWear, m: g.charGearMap });
          g.ownsGear = (x) => (x === id ? S.own : keep.o.call(g, x));
          g.gearLevel = (x) => (x === id ? 3 : keep.l.call(g, x));
          g.cardsForNextGear = (x) => (x === id ? S.need : keep.n.call(g, x));
          g.gearCardCount = (x) => (x === id ? S.cards : keep.c.call(g, x));
          g.canUpgradeGear = (x) => (x === id ? S.up : keep.u.call(g, x));
          g.goldForNextGear = (x) => (x === id ? 120 : keep.gf.call(g, x));
          g.isEquipped = (x) => (x === id ? S.on : keep.e.call(g, x));
          g.canWear = (x) => (x === id ? S.wear : keep.w.call(g, x));
          g.charGearMap = () => ({});
          ui.openGearDetail(id);
          document.getElementById('gd-stats').innerHTML = '';
          if (S.own) document.getElementById('gd-glyph').innerHTML = '';
          const scr = document.getElementById('screen-geardetail');
          for (const el of scr.querySelectorAll('*')) for (const a of el.getAnimations()) if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish();
        }, [id, ST[k]]);
        await A.wait(120);
        await A.layers({ sel: '#screen-geardetail', name: 'gd' + rk + '_' + k, stretch: 100 });
      }
    }
    /* stat satırları */
    const row = (good, val, delta) => '<div class="cd-stat"><span class="cs-ico" style="--sc:' + (good ? '#7ee08a' : '#ff7d8c') + '"></span><span class="cs-t"><span class="cs-k">Hasar</span><span class="cs-v ' + (good ? 'up' : 'down') + '">' + val + (delta || '') + '</span></span></div>';
    const V = [
      ['gst_good', row(true, '+12%')], ['gst_bad', row(false, '-4%')],
      ['gst_good_up', row(true, '+12%', '<span class="cs-d up">▲ +4%</span>')], ['gst_good_down', row(true, '+12%', '<span class="cs-d down">▼ -4%</span>')], ['gst_good_eq', row(true, '+12%', '<span class="cs-d eq">=</span>')],
      ['gst_bad_up', row(false, '-4%', '<span class="cs-d up">▲ +2%</span>')], ['gst_bad_down', row(false, '-4%', '<span class="cs-d down">▼ -2%</span>')], ['gst_bad_eq', row(false, '-4%', '<span class="cs-d eq">=</span>')],
    ];
    for (const [nm, h] of V) {
      await A.eval((h) => { document.getElementById('gd-stats').innerHTML = h; }, h);
      await A.wait(40);
      await A.layers({ sel: '#gd-stats .cd-stat', name: nm });
    }
    await A.eval(() => { document.getElementById('gd-stats').innerHTML = '<div class="kz-vs">Kuşanılana göre · <b style="color:#9b6cff">Demir Kılıç</b></div>'; });
    await A.wait(40);
    await A.layers({ sel: '#gd-stats .kz-vs', name: 'gst_vs' });
  },
};

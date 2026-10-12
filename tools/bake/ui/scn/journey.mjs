/* DÜNYALAR sayfası (renderWorldSelect / renderChapters).
   • pg_dunyalar, pg_dunyalar_ch  — sayfa kabuğu (başlık, geri) iki kipte; kart/sahne atlanır
   • wsel_<w>_<durum>[_cur]        — dünya kartı (done · peek · locked), "ŞU AN BURADASIN" ile/siz;
                                      tuval atlanır (Godot ClimbArt önizleme 362×282)
   • cn_done_s<n>, cn_locked       — bölüm düğümü (dünya renginden bağımsız)
   • cn_next_w<w>, cn_boss_<durum>[_s<n>]_w<w> — dünya rengine (--wc) bağlı düğümler */
export default {
  async run(A) {
    await A.wait(1500);
    const N = await A.eval(async () => (await import('/game/worlds.js?v=20260930m')).WORLDS.length);
    const setProg = (p, stars) => A.eval(([p, stars]) => {
      const g = window.__game;
      for (const k of Object.keys(g.progress)) delete g.progress[k];
      Object.assign(g.progress, p);
      g.meta.ledger = g.meta.ledger || {};
      g.meta.ledger.st = Object.assign({}, stars || {});
    }, [p, stars]);
    /* ── dünya kartları ── */
    await A.eval(() => { const ui = window.__game.ui; ui.setPage('dunyalar'); });
    await A.wait(600);
    for (let w = 1; w <= N; w++) {
      for (const st of (w === 1 ? ['done', 'peek'] : ['done', 'peek', 'locked'])) {
        const p = {};
        for (let k = 1; k < w; k++) p[k] = 10;
        if (st === 'locked') p[w - 1] = 3;
        p[w] = st === 'done' ? 10 : (st === 'peek' ? 3 : 0);
        await setProg(p);
        for (const cur of (st === 'locked' ? [false] : [false, true])) {
          await A.eval(([w, cur]) => {
            const ui = window.__game.ui;
            ui._journeyMode = 'worlds'; ui.renderWorldSelect();
            for (const c of document.querySelectorAll('.wsel-card')) {
              c.classList.remove('current');
              const f = c.querySelector('.wsel-flag'); if (f) f.remove();
            }
            const el = document.querySelector('.wsel-card[data-w="' + w + '"]');
            if (cur) { el.classList.add('current'); el.querySelector('.wsel-shade').insertAdjacentHTML('afterend', '<span class="wsel-flag">ŞU AN BURADASIN</span>'); }
          }, [w, cur]);
          await A.wait(60);
          await A.layers({ sel: '.wsel-card[data-w="' + w + '"]', name: 'wsel_' + w + '_' + st + (cur ? '_cur' : ''), skip: ['.wsel-art'] });
        }
      }
    }
    await A.layers({ sel: '#page-dunyalar', name: 'pg_dunyalar', skip: ['.wsel', '.wsel-card'], stretch: 100 });
    /* ── bölüm düğümleri ── */
    const ch = async (w, prog, stars) => {
      const p = {}; for (let k = 1; k < w; k++) p[k] = 10; p[w] = prog;
      await setProg(p, stars);
      await A.eval((w) => { const ui = window.__game.ui; ui._journeyWorld = w; ui._journeyMode = 'chapters'; ui.renderChapters(w); }, w);
      await A.wait(120);
    };
    const node = (m, name) => A.layers({ sel: '.cnode[data-m="' + m + '"]', name });
    await ch(1, 4, { '1-1': 0, '1-2': 1, '1-3': 2, '1-4': 3 });
    for (let s = 0; s < 4; s++) await node(s + 1, 'cn_done_s' + s);
    await node(6, 'cn_locked');
    await A.layers({ sel: '#page-dunyalar', name: 'pg_dunyalar_ch', skip: ['.chsel'], stretch: 100 });
    await A.layers({ sel: '.chsel-foot', name: 'cn_foot' });
    for (let w = 1; w <= N; w++) {
      await ch(w, 4);
      await node(5, 'cn_next_w' + w);
      await node(10, 'cn_boss_locked_w' + w);
      await ch(w, 9);
      await node(10, 'cn_boss_next_w' + w);
      for (let s = 0; s < 4; s++) {
        await ch(w, 10, { [w + '-10']: s });
        await node(10, 'cn_boss_done_s' + s + '_w' + w);
      }
    }
  },
};

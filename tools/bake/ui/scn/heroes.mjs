/* KAHRAMAN sayfası (renderChars): ızgara kabuğu + her kahraman kartı × durum.
   • pg_kahraman                       — sayfa kabuğu (kartlar atlanır)
   • hc_<id>_<durum>[_sel]             — durum: m0 (gizemli, kart yok) · mp (gizemli, kart var)
                                          · own (sahip, ilerleme) · up (geliştirilebilir) · max (azami)
   Kart sanatı (portre/siluet) kahramana özgü ve durağan → kartla birlikte yakalanır;
   dinamik olan çubuk yazısı/dolumu ve seviye Godot'da yazılır. */
export default {
  async run(A) {
    await A.wait(1500);
    const ids = await A.eval(async () => Object.keys((await import('/game/config.js?v=20260930m')).CHARACTERS));
    await A.eval(() => { window.__game.ui.setPage('kahraman'); });
    await A.wait(700);
    await A.layers({ sel: '#page-kahraman', name: 'pg_kahraman', skip: ['.hc'], stretch: 100 });
    const ST = {
      m0: { owned: false, cards: 0, need: 2, up: false },
      mp: { owned: false, cards: 1, need: 2, up: false },
      own: { owned: true, cards: 3, need: 10, up: false },
      up: { owned: true, cards: 12, need: 10, up: true },
      max: { owned: true, cards: 0, need: null, up: false },
    };
    for (const id of ids) {
      for (const k in ST) {
        for (const sel of (ST[k].owned ? [false, true] : [false])) {
          await A.eval(([id, S, sel]) => {
            const g = window.__game;
            const keep = g.__hcKeep || (g.__hcKeep = { o: g.ownsChar, c: g.charCardCount, n: g.cardsForNext, u: g.canUpgradeChar, l: g.charLevel });
            g.ownsChar = (x) => (x === id ? S.owned : keep.o.call(g, x));
            g.charCardCount = (x) => (x === id ? S.cards : keep.c.call(g, x));
            g.cardsForNext = (x) => (x === id ? S.need : keep.n.call(g, x));
            g.canUpgradeChar = (x) => (x === id ? S.up : keep.u.call(g, x));
            g.charLevel = (x) => (x === id ? 3 : keep.l.call(g, x));
            g.meta.selectedChar = sel ? id : '__none';
            g.ui.renderChars();
            /* tuval (siluet / vektör portre) yakalanmaz → aynı sınıfla <img> anlık görüntüsüne çevir */
            for (const cv of document.querySelectorAll('#char-grid canvas')) {
              const img = document.createElement('img');
              img.className = cv.className; img.style.cssText = cv.style.cssText; img.src = cv.toDataURL();
              cv.replaceWith(img);
            }
            /* giriş animasyonu (--i gecikmeli) bitmiş hâl */
            for (const el of document.querySelectorAll('#char-grid .hc')) for (const a of el.getAnimations()) if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish();
          }, [id, ST[k], sel]);
          await A.wait(120);
          await A.layers({ sel: '.hc[data-id="' + id + '"]', name: 'hc_' + id + '_' + k + (sel ? '_sel' : '') });
        }
      }
    }
  },
};

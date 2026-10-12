/* KAHRAMAN DETAYI (openCharDetail): her kahraman × durum, tam ekran.
   • hd_<id>_<durum>   — lock · own · up · sel · upsel · max · maxsel (seviye 1: yetenek yuvaları kilitli)
   • cda_<id>_<i>_on   — i. yetenek yuvasının AÇIK hâli (seviye 99'da yakalanır; Godot seviyeye göre bindirir)
   • hde_<id>_found    — evrim kutusunun KEŞFEDİLDİ hâli */
export default {
  async run(A) {
    await A.wait(1500);
    const ids = await A.eval(async () => Object.keys((await import('/game/config.js?v=20260930m')).CHARACTERS));
    const ST = {
      lock: { owned: false, cards: 0, need: 2, up: false, sel: false },
      own: { owned: true, cards: 3, need: 10, up: false, sel: false },
      up: { owned: true, cards: 12, need: 10, up: true, sel: false },
      sel: { owned: true, cards: 3, need: 10, up: false, sel: true },
      upsel: { owned: true, cards: 12, need: 10, up: true, sel: true },
      max: { owned: true, cards: 0, need: null, up: false, sel: false },
      maxsel: { owned: true, cards: 0, need: null, up: false, sel: true },
    };
    const setup = (id, S, lvl, evo) => A.eval(([id, S, lvl, evo]) => {
      const g = window.__game;
      const keep = g.__hdKeep || (g.__hdKeep = { o: g.ownsChar, c: g.charCardCount, n: g.cardsForNext, u: g.canUpgradeChar, l: g.charLevel, gf: g.goldForNext });
      g.ownsChar = (x) => (x === id ? S.owned : keep.o.call(g, x));
      g.charCardCount = (x) => (x === id ? S.cards : keep.c.call(g, x));
      g.cardsForNext = (x) => (x === id ? S.need : keep.n.call(g, x));
      g.canUpgradeChar = (x) => (x === id ? S.up : keep.u.call(g, x));
      g.charLevel = (x) => (x === id ? lvl : keep.l.call(g, x));
      g.goldForNext = (x) => (x === id ? 250 : keep.gf.call(g, x));
      g.meta.selectedChar = S.sel ? id : '__none';
      g.meta.evo = evo ? ['evo_' + id] : [];
      g.ui.setPage('kahraman');
      g.ui.openCharDetail(id);
      const scr = document.getElementById('screen-chardetail');
      for (const el of scr.querySelectorAll('*')) for (const a of el.getAnimations()) if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish();
    }, [id, S, lvl, evo]);
    for (const id of ids) {
      for (const k in ST) {
        await setup(id, ST[k], 1, false);
        await A.wait(150);
        await A.layers({ sel: '#screen-chardetail', name: 'hd_' + id + '_' + k, stretch: 100 });
      }
      /* yetenek yuvaları açık + evrim keşfedilmiş */
      await setup(id, ST.own, 99, true);
      await A.wait(150);
      const n = await A.eval(() => document.querySelectorAll('#screen-chardetail .cda-slot').length);
      for (let i = 0; i < n; i++) await A.layers({ sel: '#screen-chardetail .cda-slot:nth-child(' + (i + 1) + ')', name: 'cda_' + id + '_' + i + '_on' });
      if (await A.eval(() => !!document.querySelector('#screen-chardetail .hd-evo'))) await A.layers({ sel: '#screen-chardetail .hd-evo', name: 'hde_' + id + '_found' });
      await A.eval(() => window.__game.ui.closeCharDetail && window.__game.ui.closeCharDetail());
    }
  },
};

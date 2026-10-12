/* SANDIK YUVALARI + İNCELEME POP-UP'I: her sandık türü × durum.
   • cs_<tür>_<durum>   — ana sayfa yuvası (locked · unlocking · ready)
   • ci_<tür>_<durum>   — inceleme pop-up'ı (locked · busy · unlocking · adused · ready);
                          3B tuval atlanır (Godot ChestStage aynı yere çizer) */
export default {
  async run(A) {
    await A.wait(1500);
    const types = await A.eval(async () => Object.keys((await import('/game/chests.js?v=20260930m')).CHESTS));
    const setSlot = (t, st, extra) => A.eval(async ([t, st, extra]) => {
      const { Clock } = await import('/game/clock.js?v=20260930m');
      const { CHESTS } = await import('/game/chests.js?v=20260930m');
      const g = window.__game;
      const now = Clock.now();
      const tot = CHESTS[t].time * 1000;
      const s0 = { t, st, at: st === 'unlocking' ? now + tot * 0.6 : 0, ad: !!(extra && extra.ad), cut: 0 };
      g.chests.slots = [s0, null, null, null];
      if (extra && extra.busy) g.chests.slots[1] = { t: 'ahsap', st: 'unlocking', at: now + 1800e3, ad: false, cut: 0 };
      g.ui.setPage('savas');
      g.ui.renderChestRow();
    }, [t, st, extra || null]);
    for (const t of types) {
      for (const st of ['locked', 'unlocking', 'ready']) {
        await setSlot(t, st);
        await A.wait(400);
        await A.layers({ sel: '.chest-slot[data-i="0"]', name: 'cs_' + t + '_' + st });
      }
    }
    const SKIP = ['#chest-canvas-3d', '.ci-chest', '.ci-pedestal'];
    for (const t of types) {
      for (const [st, name, extra] of [['locked', 'locked'], ['locked', 'busy', { busy: true }], ['unlocking', 'unlocking'], ['unlocking', 'adused', { ad: true }], ['ready', 'ready']]) {
        await setSlot(t, st, extra);
        await A.eval(() => { const ui = window.__game.ui; ui.openChestInspect(0); document.getElementById('screen-chestinspect').classList.add('has3d'); });
        await A.wait(80);
        await A.layers({ sel: '#screen-chestinspect', name: 'ci_' + t + '_' + name, skip: SKIP, stretch: 100 });
        await A.eval(() => { document.getElementById('screen-chestinspect').classList.add('hidden'); });
      }
    }
    await A.eval(() => { const g = window.__game; g.chests.slots = [null, null, null, null]; g.chests.save(); });
  },
};

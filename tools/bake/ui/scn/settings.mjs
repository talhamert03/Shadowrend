/* AYARLAR: üç sekme × (varsayılan, anahtarlar ters) + hesap/gelişmiş açık.
   Anahtar (aria-checked) ve sekme durumları Godot'da alt ağaç to_state ile geçer. */
export default {
  async run(A) {
    await A.wait(1500);
    await A.eval(() => { const u = window.__game.ui; u.showSettings(); });
    await A.wait(300);
    const tab = (t) => A.eval((t) => { window.__game.ui._setTab(t); }, t);
    const sw = (ids, on) => A.eval(([ids, on]) => { for (const id of ids) { const b = document.getElementById(id); if (b) b.setAttribute('aria-checked', on ? 'true' : 'false'); } }, [ids, on]);
    const cap = async (name) => { await A.wait(400); await A.layers({ sel: '#screen-settings', name, stretch: 100 }); };
    await tab('oyun'); await sw(['set-batt'], false); await sw(['set-shake'], true); await cap('set_oyun');
    await sw(['set-batt'], true); await sw(['set-shake'], false); await cap('set_oyun_alt');
    await sw(['set-batt'], false); await sw(['set-shake'], true);
    await tab('erisim'); await sw(['set-rm', 'set-cb', 'set-big'], false); await cap('set_erisim');
    await sw(['set-rm', 'set-cb', 'set-big'], true); await cap('set_erisim_alt');
    await sw(['set-rm', 'set-cb', 'set-big'], false);
    await tab('hesap'); await sw(['set-notif'], false); await cap('set_hesap');
    await sw(['set-notif'], true); await cap('set_hesap_alt');
    await sw(['set-notif'], false);
    await A.eval(() => { document.querySelector('#screen-settings .set-adv').open = true; }); await cap('set_hesap_adv');
    await A.eval(() => { document.querySelector('#screen-settings .set-adv').open = false; window.__game.ui._setTab('oyun'); window.__game.ui.hideSettings(); });
  },
};

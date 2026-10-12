/* Savaş HUD'u: XP çubuğu, seviye/dalga/süre/materyal, duraklat, süper, boss çubuğu, pankart */
export default {
  async run(A) {
    await A.eval(() => {
      const g = window.__game;
      if (!g.meta.charsOwned.includes('seher')) g.meta.charsOwned.push('seher');
      g.meta.selectedChar = 'seher'; g.meta.ftue = 1;
      g.progress[1] = 0;
      g.startRun(1, 1);
    });
    await A.wait(6000);
    await A.eval(() => { const u = window.__game.ui; try { u.closeSheet(true); } catch (e) {} for (const el of document.querySelectorAll('.bless, #bless, .bless-pick, [class*="bless"]')) el.remove(); });
    await A.wait(500);
    await A.cap({ sel: '#hud', name: 'hud_root', mode: 'text', pad: 0 });
    await A.cap({ sel: '#xp-bar', name: 'hud_xpbar', mode: 'shell', pad: 8 });
    await A.cap({ sel: '#xp-fill', name: 'hud_xpfill', mode: 'full', pad: 6 });
    await A.cap({ sel: '.hud-row', name: 'hud_row', mode: 'text', pad: 0 });
    await A.cap({ sel: '.hud-cell', name: 'hud_cell_l', mode: 'text', pad: 0 });
    await A.cap({ sel: '.hud-cell.right', name: 'hud_cell_r', mode: 'text', pad: 0 });
    await A.cap({ sel: '.hud-mid', name: 'hud_mid', mode: 'shell', pad: 12 });
    await A.cap({ sel: '#btn-pause', name: 'hud_pause', mode: 'full', pad: 12 });
    await A.cap({ sel: '#btn-ult', name: 'hud_ult', mode: 'full', pad: 20 });
    await A.eval(() => { const u = window.__game.ui; u.showBossBar('KADİM HASATÇI'); });
    await A.wait(400);
    await A.cap({ sel: '#boss-bar', name: 'hud_bossbar', mode: 'shell', pad: 12 });
    await A.cap({ sel: '.boss-track', name: 'hud_bosstrack', mode: 'shell', pad: 8 });
    await A.cap({ sel: '#boss-fill', name: 'hud_bossfill', mode: 'full', pad: 6 });
    await A.cap({ sel: '#boss-name', name: 'hud_bossname', mode: 'text', pad: 0 });
    await A.eval(() => { window.__game.ui.banner('DALGA 2', 'HAZIRLAN'); });
    await A.wait(700);
    await A.cap({ sel: '#banner', name: 'hud_banner', mode: 'full', pad: 30 });
  },
};

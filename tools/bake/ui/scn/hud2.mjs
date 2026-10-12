/* HUD durum görselleri: dolu XP, boss dolgusu tam, tehlike/hasar vinyetleri, yön yayı */
export default {
  async run(A) {
    await A.eval(() => {
      const g = window.__game;
      if (!g.meta.charsOwned.includes('seher')) g.meta.charsOwned.push('seher');
      g.meta.selectedChar = 'seher'; g.meta.ftue = 1; g.startRun(1, 1);
    });
    await A.wait(6000);
    await A.eval(() => {
      for (const el of document.querySelectorAll('[class*="bless"]')) el.remove();
      const f = document.getElementById('xp-fill'); f.style.transition = 'none'; f.style.transform = 'scaleX(1)';
      document.getElementById('xp-glint').style.display = 'none';
      window.__game.ui.showBossBar('X');
      const b = document.getElementById('boss-fill'); b.style.transition = 'none'; b.style.transform = 'scaleX(1)';
    });
    await A.wait(300);
    await A.cap({ sel: '#xp-fill', name: 'hud_xpfill_full', mode: 'full', pad: 12 });
    await A.cap({ sel: '#boss-fill', name: 'hud_bossfill_full', mode: 'full', pad: 14 });
    await A.eval(() => { const v = document.getElementById('hurt-vignette'); v.style.transition = 'none'; v.style.opacity = '1'; });
    await A.cap({ sel: '#hurt-vignette', name: 'hud_hurt_vig', mode: 'full', pad: 0 });
    await A.eval(() => { const v = document.getElementById('danger-vignette'); v.style.transition = 'none'; v.style.animation = 'none'; v.style.opacity = '1'; });
    await A.cap({ sel: '#danger-vignette', name: 'hud_danger_vig', mode: 'full', pad: 0 });
    await A.eval(() => { const a = document.querySelector('.hdr-arc'); a.style.opacity = '1'; a.style.transform = 'translate(150px,75px)'; });
    await A.cap({ sel: '.hdr-arc', name: 'hud_hurt_arc', mode: 'full', pad: 0 });
  },
};

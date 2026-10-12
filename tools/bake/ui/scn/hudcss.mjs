/* HUD dinamik parçalarının HESAPLANMIŞ stilleri (tema geçersiz kılmaları dahil) — başvuru dökümü */
import fs from 'node:fs';
export default {
  async run(A) {
    await A.eval(() => {
      const g = window.__game;
      if (!g.meta.charsOwned.includes('seher')) g.meta.charsOwned.push('seher');
      g.meta.selectedChar = 'seher'; g.meta.ftue = 1; g.startRun(1, 1);
    });
    await A.wait(6000);
    const out = await A.eval(() => {
      for (const el of document.querySelectorAll('[class*="bless"]')) el.remove();
      const g = window.__game, u = g.ui;
      g.powerups.shieldT = 5; g.powerups.freezeT = 1; g.powerups.magnetT = 4;
      g._cbN = 12; g._cbT = g.time; g._cbTier = 2;
      g.ult.charge = 80; g.ult.ready = true;
      u.updateHUD();
      u.eventBanner('KUŞATMA', 'Halka kapanıyor — kaçış yok', '#ff6a3d');
      u.bossMoment('intro', 'KADİM HASATÇI');
      u.toast('HENÜZ HAZIR DEĞİL');
      u.showBossBar('KADİM HASATÇI');
      document.getElementById('hud-timer').classList.add('danger');
      const P = ['color', 'font-family', 'font-weight', 'font-size', 'letter-spacing', 'line-height', 'text-shadow', 'background-color', 'background-image', 'border-top', 'border-left', 'border-radius', 'box-shadow', 'padding', 'gap', 'margin-top', 'width', 'height', 'top', 'left', 'opacity', 'transform', 'animation-name', 'animation-duration', 'animation-timing-function'];
      const SEL = ['#hud-wave', '#hud-timer', '#hud-level', '#hud-money', '.hud-label', '#pu-row', '.pu-badge', '.pu-badge b', '.hcb', '.hcb small', '.hcb b', '.hcb i', '.hcb i em', '.ev-ban', '.ev-gem', '.ev-ban b', '.ev-ban em', '.bm-veil', '.bm-plate', '.bm-k', '.bm-n', '.bm-l', '#ui-toast', '#btn-ult', '#btn-ult .ult-core', '#btn-ult .ult-lab', '#banner', '#banner-main', '#banner-sub', '#boss-bar', '#boss-name', '.hud-ghost', '#btn-pause'];
      const r = {};
      for (const s of SEL) {
        const el = document.querySelector(s); if (!el) { r[s] = null; continue; }
        const cs = getComputedStyle(el), bb = el.getBoundingClientRect(), o = { rect: [bb.x, bb.y, bb.width, bb.height].map((v) => Math.round(v * 10) / 10), text: el.textContent.slice(0, 40) };
        for (const k of P) o[k] = cs.getPropertyValue(k);
        for (const pe of ['::before', '::after']) { const c2 = getComputedStyle(el, pe); if (c2.content && c2.content !== 'none') o[pe] = { bg: c2.backgroundImage, top: c2.top, left: c2.left, right: c2.right, height: c2.height, inset: c2.inset, anim: c2.animationName + ' ' + c2.animationDuration }; }
        r[s] = o;
      }
      return r;
    });
    fs.writeFileSync(process.env.OUTJ, JSON.stringify(out, null, 1));
  },
};

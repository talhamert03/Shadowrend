/* KUTLAMA KATMANLARI — canlandırmalar t=0'da dondurulup yakalanır; Godot Lyr zaman çizelgesini
   baştan oynatır (gecikme/süre/eğri birebir).
   • upx_<0|1>             — kahraman SEVİYE ATLADIN (.upx; 1 = YENİ YETENEK satırı)
   • upfx                  — eşya geliştirme (.upfx, eşya sahnesinde)
   • hu_<r>                — YENİ KAHRAMAN AÇILDI (.hu; nadirlik 1..4; portre <img> atlanır)
   • alu_0, alu_<tür>      — HESAP SEVİYESİ YÜKSELDİ (ödülsüz / tek sandık ödüllü)
   • sh_gift_<c>_<f>       — DÖNÜŞ HEDİYESİ (#screen-sheet; c = tahta sandık, f = doldu) */
const V = '?v=20260930m';
export default {
  async run(A) {
    await A.wait(1500);
    const ONLY = process.env.ONLY || '';
    const want = (k) => !ONLY || ONLY.split(',').some((o) => k.startsWith(o));
    const cap = async (sel, name, skip, stretch) => {
      if (!want(name)) return;
      await A.layers({ sel, name, skip: skip || [], stretch: stretch || 0 });
    };
    /* bir kök altındaki tüm canlandırmaları 0. ms'de durdur */
    const freeze = (sel) => A.eval((sel) => {
      const r = document.querySelector(sel); if (!r) return false;
      /* durağan stil = canlandırmanın SON hâli (taban stile eşit); zaman çizelgesi kare listesinden
         oynatılır. Sonlu canlandırma bitişten hemen önce durdurulur (hâlâ etkin → listelenir). */
      for (const el of [r, ...r.querySelectorAll('*')]) for (const a of el.getAnimations({ subtree: false })) {
        const T = a.effect.getComputedTiming();
        a.pause();
        a.currentTime = isFinite(T.endTime) ? Math.max(0, T.endTime - 0.5) : (T.delay || 0);
      }
      return true;
    }, sel);

    /* ── kahraman geliştirme ── */
    const info = await A.eval(async (V) => {
      const c = await import('/game/config.js' + V);
      const g = window.__game;
      const id = g.meta.selectedChar;
      const un = c.signatureUnlocks(id, 1).map((u) => u.minLvl).filter(Boolean);
      return { id, nuLvl: un.length ? un[0] : null };
    }, V);
    for (const nu of [0, 1]) {
      const from = nu ? (info.nuLvl || 3) - 1 : 1;
      await A.eval(([id, from]) => {
        const g = window.__game, ui = g.ui;
        let lv = from;
        g.__cl = g.__cl || { l: g.charLevel, c: g.canUpgradeChar, u: g.upgradeChar };
        g.charLevel = (x) => (x === id ? lv : g.__cl.l.call(g, x));
        g.canUpgradeChar = () => true;
        g.upgradeChar = () => { lv++; return true; };
        ui.openCharDetail(id);
        const st = window.setTimeout; window.setTimeout = () => 0;
        try { ui.playUpgradeFx(id); } finally { window.setTimeout = st; }
      }, [info.id, from]);
      await freeze('.upx');
      await A.wait(60);
      await cap('.upx', 'upx_' + nu);
      await A.eval(() => { const g = window.__game; if (g.ui._upx) g.ui._upx.finish(true); Object.assign(g, { charLevel: g.__cl.l, canUpgradeChar: g.__cl.c, upgradeChar: g.__cl.u }); g.ui.closeCharDetail(); });
    }

    /* ── eşya geliştirme ── */
    await A.eval(() => {
      const g = window.__game, ui = g.ui;
      const id = (g.meta.owned || [])[0];
      g.__gl = { c: g.canUpgradeGear, u: g.upgradeGear };
      g.canUpgradeGear = () => true; g.upgradeGear = () => true;
      ui.openGearDetail(id);
      const st = window.setTimeout; window.setTimeout = () => 0;
      try { ui.playGearUpgradeFx(id); } finally { window.setTimeout = st; }
    });
    await freeze('.upfx');
    await A.wait(60);
    await cap('.upfx', 'upfx');
    await A.eval(() => { const g = window.__game; Object.assign(g, { canUpgradeGear: g.__gl.c, upgradeGear: g.__gl.u }); document.querySelectorAll('.upfx').forEach((e) => e.remove()); g.ui.closeGearDetail(); });

    /* ── yeni kahraman ── */
    const byR = await A.eval(async (V) => { const { CHARACTERS } = await import('/game/config.js' + V); const o = {}; for (const id in CHARACTERS) { const r = CHARACTERS[id].rarity || 1; if (!o[r]) o[r] = id; } return o; }, V);
    for (const r in byR) {
      await A.eval((id) => { document.querySelectorAll('.hu').forEach((e) => e.remove()); const st = window.setTimeout; window.setTimeout = () => 0; try { window.__game.ui.showHeroUnlock(id); } finally { window.setTimeout = st; } }, byR[r]);
      await freeze('.hu');
      await A.wait(60);
      await cap('.hu', 'hu_' + r, ['.hu-card img']);
      await A.eval(() => document.querySelectorAll('.hu').forEach((e) => e.remove()));
    }

    /* ── hesap seviyesi ── */
    const types = await A.eval(async (V) => Object.keys((await import('/game/chests.js' + V)).CHESTS), V);
    for (const t of [null, ...types]) {
      await A.eval((t) => { const ui = window.__game.ui; const o = document.getElementById('acc-levelup'); for (const el of [o, ...o.querySelectorAll('*')]) for (const a of el.getAnimations({ subtree: false })) a.cancel(); ui.showAccountLevelUp({ fromLevel: 4, toLevel: 5, rewards: t ? [{ level: 5, chest: t }] : [] }); }, t);
      await freeze('#acc-levelup');
      await A.wait(80);
      await cap('#acc-levelup', 'alu_' + (t || '0'), [], 100);
      await A.eval(() => document.getElementById('acc-levelup').classList.add('hidden'));
    }

    /* ── dönüş hediyesi ── */
    for (const c of [0, 1]) for (const f of [0, 1]) {
      await A.eval(([c, f]) => window.__game.ui._showGift({ h: 3.5, gold: 120, chest: !!c, full: !!f }), [c, f]);
      await A.wait(260);
      await A.eval(() => { const s = document.getElementById('screen-sheet'); for (const el of [s, ...s.querySelectorAll('*')]) for (const a of el.getAnimations()) if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish(); });
      await cap('#screen-sheet', 'sh_gift_' + c + '_' + f, [], 100);
      await A.eval(() => window.__game.ui.closeSheet(true));
    }
  },
};

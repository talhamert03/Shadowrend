/* SAVAŞ BİLETİ (showBattlePass / renderBattlePass) — büyülü kitap.
   • bpk_main_<0|1>                  — açık kitap (premium yok/var); kartlar + düğümler atlanır (kutuları kalır),
                                        ray dolgusu tam boy (Godot kısaltır), "şimdi" satırı yok
   • bpk_cover                       — kapak ön yüzü (Godot menteşe dönüşü)
   • bpk_rowhl                       — "şimdi" satırının vurgu şeridi (.bp-row.is-now::before)
   • bpk_<f|p>_<imza>_<durum>        — ödül kartı; imza: rubies · stone · gear · char<r> · <sandık>
                                        durum: claimed · claimable · future (+ premium: locked · lockfut)
   • bpkn_<done|now|future>_<0|1>    — kademe düğümü (1 = 10'un katı, elmas) */
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
    const fin = () => A.eval(() => { const s = document.getElementById('screen-battlepass'); for (const el of [s, ...s.querySelectorAll('*')]) for (const a of el.getAnimations()) if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish(); });
    /* durum yaması: kademe, premium, alındı/alınabilir */
    const state = (o) => A.eval((o) => {
      const g = window.__game, ui = g.ui;
      const k = g.__bpK || (g.__bpK = { t: g.bpTier, p: g.bpHasPremium, c: g.bpClaimed, a: g.bpCanClaim, pr: g.bpProgress });
      g.bpTier = () => o.tier;
      g.bpHasPremium = () => o.prem;
      g.bpClaimed = () => o.claimed;
      g.bpCanClaim = (t, tr) => o.can && !(tr === 'premium' && !o.prem);
      g.bpProgress = () => ({ cur: 60, need: 120 });
      ui.renderBattlePass();
      Object.assign(g, { bpTier: k.t, bpHasPremium: k.p, bpClaimed: k.c, bpCanClaim: k.a, bpProgress: k.pr });
      const book = document.getElementById('bp-book'); book.classList.add('open');
      const rail = document.getElementById('bp-rail'), f = document.getElementById('bp-rail-fill');
      if (f) { f.style.transition = 'none'; f.style.height = rail.scrollHeight + 'px'; }
      const x = document.getElementById('bp-xpfill'); if (x) x.style.width = '50%';
    }, o);
    await A.eval(() => window.__game.ui.showBattlePass());
    await A.wait(600);

    /* kapak (kitap kapalıyken) */
    await A.eval(() => { const b = document.getElementById('bp-book'); b.classList.remove('open', 'closing'); });
    await A.wait(100); await fin();
    await cap('.bpk-cover-front', 'bpk_cover');

    /* açık kitap */
    for (const prem of [false, true]) {
      await state({ tier: 0, prem, claimed: false, can: false });
      await A.wait(1600); await fin();
      await cap('#screen-battlepass', 'bpk_main_' + (prem ? 1 : 0), ['.bp-card', '.bp-node', '#bpk-cover'], 100);
    }
    /* "şimdi" satırı vurgusu */
    await state({ tier: 3, prem: true, claimed: false, can: false });
    await A.wait(200); await fin();
    await cap('.bp-row.is-now', 'bpk_rowhl', ['.bp-card', '.bp-node']);

    /* ödül imzaları: her iz için imza → ilk kademe */
    const sigs = await A.eval(async (V) => {
      const { BATTLE_PASS_TIERS } = await import('/game/config.js' + V);
      const sig = (r) => r.kind === 'chest' ? r.chest : r.kind === 'char' ? 'char' + r.rarity : r.kind;
      const out = { free: {}, premium: {} };
      for (const d of BATTLE_PASS_TIERS) for (const tr of ['free', 'premium']) { const s = sig(d[tr]); if (!out[tr][s]) out[tr][s] = d.tier; }
      return out;
    }, V);
    const ST = {
      claimed: { tier: 50, prem: true, claimed: true, can: false },
      claimable: { tier: 50, prem: true, claimed: false, can: true },
      future: { tier: 0, prem: true, claimed: false, can: false },
      locked: { tier: 50, prem: false, claimed: false, can: false },
      lockfut: { tier: 0, prem: false, claimed: false, can: false },
    };
    for (const st in ST) {
      await state(ST[st]);
      await A.wait(200); await fin();
      for (const tr of ['free', 'premium']) {
        if (tr === 'free' && (st === 'locked' || st === 'lockfut')) continue;
        for (const s in sigs[tr]) {
          const t = sigs[tr][s];
          await cap('.bp-card[data-tier="' + t + '"][data-track="' + tr + '"]', 'bpk_' + tr[0] + '_' + s + '_' + st);
        }
      }
    }
    /* kademe düğümleri */
    await state({ tier: 10, prem: true, claimed: false, can: false });
    await A.wait(200); await fin();
    await cap('.bp-node[data-tier="5"]', 'bpkn_done_0');
    await cap('.bp-node[data-tier="20"]', 'bpkn_future_1');
    await cap('.bp-node[data-tier="11"]', 'bpkn_future_0');
    await cap('.bp-node[data-tier="10"]', 'bpkn_now_1');
    await state({ tier: 20, prem: true, claimed: false, can: false });
    await A.wait(200); await fin();
    await cap('.bp-node[data-tier="10"]', 'bpkn_done_1');
    await cap('.bp-node[data-tier="20"]', 'bpkn_now_0x');
    await state({ tier: 7, prem: true, claimed: false, can: false });
    await A.wait(200); await fin();
    await cap('.bp-node[data-tier="7"]', 'bpkn_now_0');
    await A.eval(() => { document.getElementById('screen-battlepass').classList.add('hidden'); window.__game.ui.showMenu(); });
  },
};

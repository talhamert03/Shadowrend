/* MAĞAZA sayfası (renderMagaza) — kabuk + bileşenler, her biri GERÇEK kabında, gerçek
   yerinde yakalanır: yakalama dikdörtgeni (rect) kaba göre konumu verir (Godot _rel).
   • pg_magaza                         — kabuk (dinamik kaplar atlanır)
   • deal_<tür>[_done]                 — GÜNÜN FIRSATI kartı (havuz: kemik · kan · kadim · mistik)
   • fb_free_<ready|wait>, fb_ad_<ready|wait> — ücretsiz / reklamlı bonus sandık afişi
   • sec_sefer, sec_kral               — vitrin bölüm başlıkları
   • vc_<tür>[_broke]                  — vitrin kartı (yaygin … ejderha)
   • mkh<rar>_<n|unlock|got>           — kart pazarı kahraman kartı (portre + ödeme Godot'da)
   • mkg<rar>_<n|got>                  — kart pazarı eşya kartı (çizim + ödeme Godot'da)
   • mkp_<h|g>_<g1|g0>_<m1|m0>, mkp_<h|g>_done — ödeme düğmeleri (altın/gem · yeter/yetmez)
   • mk_empty                          — tavan notu
   • x2_note, sp_<id>[_x2]             — gem kesesi
   • ex_<id>[_cant]                    — gem bozdurma
   • cb_<tür>[_deal]                   — satın alma pop-up'ı */
const V = '?v=20260930m';
export default {
  async run(A) {
    await A.wait(1500);
    const ONLY = process.env.ONLY || '';
    const want = (k) => !ONLY || ONLY.split(',').some((o) => k.startsWith(o));
    /* durum: 2 kahraman sahip (h1/h2 + h3 kilit), eşya kuşanılmış (g1/g2) */
    await A.eval(async (V) => {
      const g = window.__game;
      const { Market } = await import('/game/market.js' + V);
      window.__mk = Market;
      window.__mkOffers = Market.offers;
      try { localStorage.removeItem('kh_firstbuy'); localStorage.removeItem('kh_deal'); localStorage.setItem('kh_adchest', '0'); } catch (e) { /* */ }
      g.addStones(600);
      g.ui.setPage('magaza');
    }, V);
    await A.wait(900);
    const cap = async (sel, name, skip, stretch) => {
      if (!want(name)) return;
      await A.layers({ sel, name, skip: skip || [], stretch: stretch || 0 });
    };
    await cap('#page-magaza', 'pg_magaza', ['#shop-chests', '#card-market', '#stone-shop', '#ruby-exchange'], 100);

    /* ── vitrin (#shop-chests) ── */
    const shop = (o) => A.eval(([o, V]) => {
      const g = window.__game, ui = g.ui;
      const keep = ui.__shKeep || (ui.__shKeep = { d: ui._shopDay, f: g.chests.freeReadyIn, s: g.readStones });
      ui._shopDay = () => o.day;
      g.chests.freeReadyIn = () => (o.free ? 0 : 3600e3 * 3 + 754e3);
      try {
        localStorage.setItem('kh_adchest', o.ad ? '0' : String(Date.now() - 3600e3));
        if (o.done) localStorage.setItem('kh_deal', String(o.day)); else localStorage.removeItem('kh_deal');
      } catch (e) { /* */ }
      g.readStones = () => o.stones;
      ui.renderMagaza();
      g.readStones = keep.s;
      const secs = document.querySelectorAll('#shop-chests .shop-sec');
      if (secs[0]) secs[0].id = 'cap-sec-sefer';
      if (secs[1]) secs[1].id = 'cap-sec-kral';
      for (const el of document.querySelectorAll('#shop-chests *')) for (const a of el.getAnimations()) if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish();
    }, [o, V]);
    const POOL = ['kemik', 'kan', 'kadim', 'mistik'];
    for (let i = 0; i < POOL.length; i++) {
      for (const done of [false, true]) {
        await shop({ day: i, free: true, ad: true, done, stones: 9999 });
        await A.wait(80);
        await cap('.deal-card', 'deal_' + POOL[i] + (done ? '_done' : ''));
      }
    }
    for (const ready of [true, false]) {
      await shop({ day: 0, free: ready, ad: ready, done: false, stones: 9999 });
      await A.wait(80);
      await cap('.free-banner[data-t="free"]', 'fb_free_' + (ready ? 'ready' : 'wait'));
      await cap('.free-banner.ad', 'fb_ad_' + (ready ? 'ready' : 'wait'));
    }
    await cap('#cap-sec-sefer', 'sec_sefer');
    await cap('#cap-sec-kral', 'sec_kral');
    const VT = ['yaygin', 'kemik', 'kan', 'kadim', 'mistik', 'ejderha'];
    for (const broke of [false, true]) {
      await shop({ day: 0, free: true, ad: true, done: false, stones: broke ? 0 : 9999 });
      await A.wait(80);
      for (const t of VT) await cap('.vcard[data-t="' + t + '"]', 'vc_' + t + (broke ? '_broke' : ''));
    }

    /* ── kart pazarı ── */
    const market = (offers) => A.eval(([offers]) => {
      const g = window.__game;
      window.__mk.offers = () => offers;
      g.ui.renderMarket();
      window.__mk.offers = window.__mkOffers;
      for (const el of document.querySelectorAll('#card-market *')) for (const a of el.getAnimations()) if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish();
      /* eşya çizimi Godot'da (art/gear) */
      for (const s of document.querySelectorAll('#card-market .mk-gc-art > svg, #card-market .mk-gc-art > img')) s.remove();
    }, [offers]);
    const ids = await A.eval(async (V) => {
      const { CHARACTERS, EQUIPMENT } = await import('/game/config.js' + V);
      const ch = {}; for (const id in CHARACTERS) { const r = CHARACTERS[id].rarity || 1; if (!ch[r]) ch[r] = id; }
      const ge = {}; for (const x of EQUIPMENT) { const r = x.rarity || 1; if (!ge[r]) ge[r] = x; }
      return { ch, ge };
    }, V);
    const hero = (r, st) => ({ slot: 'h1', kind: 'char', id: ids.ch[r], rar: r, name: 'KAHRAMAN', n: 3, price: 720, gem: 69, got: st === 'got', unlock: st === 'unlock' });
    const gear = (r, st) => ({ slot: 'g1', kind: 'gear', id: ids.ge[r].id, rar: r, name: 'EŞYA', icon: ids.ge[r].icon, n: 4, price: 180, gem: 18, got: st === 'got' });
    await A.eval(() => { const g = window.__game; g.__rk = { r: g.readRubies, s: g.readStones }; });
    const wallet = (gold, gem) => A.eval(([a, b]) => { const g = window.__game; g.readRubies = () => a; g.readStones = () => b; }, [gold, gem]);
    await wallet(99999, 99999);
    for (let r = 1; r <= 4; r++) {
      if (!ids.ch[r]) continue;
      for (const st of ['n', 'unlock', 'got']) {
        await market([hero(r, st), Object.assign(hero(1, 'n'), { slot: 'h2' }), gear(1, 'n')]);
        await A.wait(60);
        await cap('.mk-hc[data-s="h1"]', 'mkh' + r + '_' + st, ['.mk-hc-art', '.mk-pay']);
      }
    }
    for (let r = 1; r <= 5; r++) {
      if (!ids.ge[r]) continue;
      for (const st of ['n', 'got']) {
        await market([hero(1, 'n'), gear(r, st)]);
        await A.wait(60);
        await cap('.mk-gc', 'mkg' + r + '_' + st, ['.mk-pay']);
      }
    }
    for (const [gold, gem] of [[1, 1], [0, 1], [1, 0], [0, 0]]) {
      await wallet(gold ? 99999 : 0, gem ? 99999 : 0);
      await market([hero(1, 'n'), Object.assign(hero(1, 'n'), { slot: 'h2' }), gear(1, 'n')]);
      await A.wait(60);
      const k = '_g' + gold + '_m' + gem;
      await cap('.mk-hc[data-s="h1"] .mk-pay', 'mkp_h' + k);
      await cap('.mk-gc .mk-pay', 'mkp_g' + k);
    }
    await market([hero(1, 'got'), Object.assign(hero(1, 'n'), { slot: 'h2' }), gear(1, 'got')]);
    await A.wait(60);
    await cap('.mk-hc[data-s="h1"] .mk-pay', 'mkp_h_done');
    await cap('.mk-gc .mk-pay', 'mkp_g_done');
    /* yerleşim ölçüsü: 3 kahraman + 2 eşya (ızgara adımları rect farkından) */
    await market([hero(1, 'n'), Object.assign(hero(1, 'n'), { slot: 'h2' }), Object.assign(hero(1, 'n'), { slot: 'h3' }), gear(1, 'n'), Object.assign(gear(1, 'n'), { slot: 'g2' })]);
    await A.wait(60);
    await cap('.mk-hc[data-s="h2"]', 'mkx_h2', ['.mk-hc-art', '.mk-pay']);
    await cap('.mk-hc[data-s="h3"]', 'mkx_h3', ['.mk-hc-art', '.mk-pay']);
    await cap('.mk-gc[data-s="g1"]', 'mkx_g1', ['.mk-pay']);
    await cap('.mk-gc[data-s="g2"]', 'mkx_g2', ['.mk-pay']);
    await market([]);
    await A.wait(40);
    await cap('.mk-empty', 'mk_empty');
    await A.eval(() => { const g = window.__game; g.readRubies = g.__rk.r; g.readStones = g.__rk.s; g.ui.renderMarket(); });
    /* kabuktaki pazar yüksekliğine dönüldü mü (alttaki kapların rect'i buna bağlı) */
    const mh = await A.eval(() => document.getElementById('card-market').getBoundingClientRect().height);
    console.log('pazar yüksekliği', mh);

    /* ── gem kesesi + bozdurma ── */
    const packs = await A.eval(async (V) => { const c = await import('/game/config.js' + V); return { sp: c.STONE_PACKS.map((p) => p.id), ex: c.RUBY_EXCHANGE.map((e) => e.id) }; }, V);
    for (const x2 of [false, true]) {   /* x2 sonda: kabuktaki hâl (bozdurma kabı yerinde) */
      await A.eval((x2) => { try { if (x2) localStorage.removeItem('kh_firstbuy'); else localStorage.setItem('kh_firstbuy', '1'); } catch (e) { /* */ } window.__game.ui.renderStoneShop(); }, x2);
      await A.wait(60);
      if (x2) await cap('.x2-note', 'x2_note');
      for (const id of packs.sp) await cap('.stone-pack[data-id="' + id + '"]', 'sp_' + id + (x2 ? '_x2' : ''));
    }
    for (const ok of [true, false]) {
      await A.eval((ok) => { const g = window.__game; const k = g.readStones; g.readStones = () => (ok ? 99999 : 0); g.ui.renderExchange(); g.readStones = k; }, ok);
      await A.wait(60);
      for (const id of packs.ex) await cap('.ex-pack[data-id="' + id + '"]', 'ex_' + id + (ok ? '' : '_cant'));
    }

    /* ── satın alma pop-up'ı ── */
    for (const t of VT) {
      for (const deal of [false, true]) {
        if (deal && !POOL.includes(t)) continue;
        await A.eval(async ([t, deal, V]) => {
          const { CHESTS } = await import('/game/chests.js' + V);
          const C = CHESTS[t];
          const off = C.tier >= 6 ? 0.3 : 0.4;
          const price = Math.max(1, Math.round(C.stonePrice * (1 - off) / 5) * 5);
          const ui = window.__game.ui;
          ui.openChestBuy(t, deal ? { price, orig: C.stonePrice, off: Math.round(off * 100) } : {});
          const scr = document.getElementById('screen-chestbuy');
          for (const el of [scr, ...scr.querySelectorAll('*')]) for (const a of el.getAnimations()) if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish();
        }, [t, deal, V]);
        await A.wait(120);
        await cap('#screen-chestbuy', 'cb_' + t + (deal ? '_deal' : ''), [], 100);
        await A.eval(() => document.getElementById('screen-chestbuy').classList.add('hidden'));
      }
    }
  },
};

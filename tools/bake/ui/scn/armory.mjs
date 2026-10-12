/* CEPHANE / KUŞANIM sayfası — kabuk + bileşen şablonları (ui.js renderArmory birebir işaretleme).
   Godot sayfayı veriden kurar: şablonlar nadirlik kademesine (rk 1..5) ve duruma göre yakalanır,
   eşya çizimi art/gear/<icon>.png, yazılar betikten.
   • pg_cephane                      — kabuk (dinamik kaplar boş)
   • kzd_on / kzd_off                — dizilim çipi
   • kzs_e_<yuva>[_sel]              — boş yuva (hayalet çizim yuvaya özgü)
   • kzs_f<rk>[_sel]                 — dolu yuva çerçevesi (çizim atlanır)
   • kz_dot                          — kırmızı nokta
   • kzst / kzst_zero / kzst_neg     — stat karosu
   • ks_hint, ks_set<rk>_<2|4>       — set şeridi
   • kztab_on / kztab_off            — çanta sekmesi
   • kc<rk>_<own|on|cant>[_sel]      — eşya kartı (bayrak/çubuk ayrı)
   • kc<rk>_lock                     — bulunamayan kart
   • kcf_on / kcf_ready / kcf_up     — kart bayrağı
   • kcb_<norm|ready|max>            — kart ilerleme çubuğu
   • kz_sep, kz_empty, kz_pop        — ayraç, boş çanta notu, ÇIKAR balonu */
export default {
  async run(A) {
    await A.wait(1500);
    await A.eval(() => { window.__game.ui.setPage('cephane'); });
    await A.wait(900);
    /* dinamik kapların alt ağacı atlanır, kabın kutusu kalır (alt dize eşleşmesi: '.kz-st' '.kz-stage'i de yutardı) */
    const SKIP = ['#kzd-row', '#kz-col-l', '#kz-col-r', '#kz-stats', '#kz-sets', '#kz-tabs', '#armory-shop', '#loadout-portrait'];
    await A.layers({ sel: '#page-cephane', name: 'pg_cephane', skip: SKIP, stretch: 100 });
    /* bileşenleri gerçek kaplarında üret: html → seçici → ad */
    const comp = async (container, html, sel, name, skip) => {
      await A.eval(([c, h]) => { document.querySelector(c).innerHTML = h; }, [container, html]);
      await A.wait(60);
      await A.layers({ sel, name, skip: skip || [] });
    };
    const H = await A.eval(async () => {
      const ui = window.__game.ui, g = window.__game;
      const { EQUIPMENT, EQUIP_SLOTS, RARITIES } = await import('/game/config.js?v=20260930m');
      const RANK = { 1: 1, 2: 2, 5: 3, 3: 4, 4: 5 };
      const byRank = {};
      for (const x of EQUIPMENT) { const rk = RANK[x.rarity]; if (!byRank[rk]) byRank[rk] = x; }
      /* durum yaması */
      const keep = { o: g.ownsGear, l: g.gearLevel, n: g.cardsForNextGear, c: g.gearCardCount, e: g.isEquipped, w: g.canWear, m: g.charGearMap };
      const out = { chips: {}, slots: {}, cards: {}, tabs: {}, stats: {}, sets: {} };
      const setState = (x, S) => {
        g.ownsGear = (id) => (id === x.id ? S.own : keep.o.call(g, id));
        g.gearLevel = (id) => (id === x.id ? 3 : keep.l.call(g, id));
        g.cardsForNextGear = (id) => (id === x.id ? S.need : keep.n.call(g, id));
        g.gearCardCount = (id) => (id === x.id ? S.cards : keep.c.call(g, id));
        g.isEquipped = (id) => (id === x.id ? S.on : keep.e.call(g, id));
        g.canWear = (id) => (id === x.id ? S.wear : keep.w.call(g, id));
        ui._kzSel = S.sel ? x.id : null;
        ui._kzBetter = () => false;
      };
      for (let rk = 1; rk <= 5; rk++) {
        const x = byRank[rk]; if (!x) continue;
        for (const [k, S] of [['own', { own: true, need: 10, cards: 3, on: false, wear: true }], ['on', { own: true, need: 10, cards: 3, on: true, wear: true }], ['cant', { own: true, need: 10, cards: 3, on: false, wear: false }]]) {
          for (const sel of [false, true]) { setState(x, Object.assign({ sel }, S)); out.cards['kc' + rk + '_' + k + (sel ? '_sel' : '')] = ui._kzCardHTML(x, false); }
        }
        setState(x, { own: false, need: 10, cards: 0, on: false, wear: true, sel: false });
        out.cards['kc' + rk + '_lock'] = ui._kzCardHTML(x, true);
        /* dolu yuva */
        g.charGearMap = () => ({ [x.slot]: x.id });
        for (const sel of [false, true]) { ui._kzTab = sel ? x.slot : 'all'; out.slots['kzs_f' + rk + (sel ? '_sel' : '')] = ui._kzSlotHTML(EQUIP_SLOTS.find((s) => s.id === x.slot) || { id: x.slot }, x.id); }
      }
      for (const s of EQUIP_SLOTS) for (const sel of [false, true]) { ui._kzTab = sel ? s.id : 'all'; out.slots['kzs_e_' + s.id + (sel ? '_sel' : '')] = ui._kzSlotHTML(s, null); }
      /* bayrak / çubuk varyantları: kendi kartından süzülür (Godot bindirir) */
      setState(byRank[3], { own: true, need: 10, cards: 12, on: false, wear: true, sel: false });
      out.cards.__ready = ui._kzCardHTML(byRank[3], false);
      setState(byRank[3], { own: true, need: null, cards: 0, on: false, wear: true, sel: false });
      out.cards.__max = ui._kzCardHTML(byRank[3], false);
      ui._kzBetter = () => true;
      setState(byRank[3], { own: true, need: 10, cards: 3, on: false, wear: true, sel: false });
      ui._kzBetter = () => true;
      out.cards.__up = ui._kzCardHTML(byRank[3], false);
      Object.assign(g, { ownsGear: keep.o, gearLevel: keep.l, cardsForNextGear: keep.n, gearCardCount: keep.c, isEquipped: keep.e, canWear: keep.w, charGearMap: keep.m });
      ui._kzSel = null; ui._kzTab = 'all';
      return out;
    });
    /* çipler, sekmeler, statlar, setler, ayraç: işaretleme ui.js'ten birebir */
    const chip = (on) => '<button class="kzd-chip' + (on ? ' on' : '') + '" data-i="0" type="button"><b class="kzd-no">1</b><span class="kzd-t"><span class="kzd-n">DİZİ 1</span><em class="kzd-m">BOŞ</em></span>' + (on ? '<i class="kzd-pen" aria-hidden="true">✎</i>' : '') + '</button>';
    await comp('#kzd-row', chip(true), '.kzd-chip', 'kzd_on');
    await comp('#kzd-row', chip(false), '.kzd-chip', 'kzd_off');
    for (const k in H.slots) await comp('#kz-col-l', H.slots[k], '.kz-slot', k, k.startsWith('kzs_f') ? ['.kz-art'] : []);
    await comp('#kz-col-l', H.slots.kzs_e_silah.replace('</button>', '<i class="kz-dot" aria-hidden="true"></i></button>'), '.kz-dot', 'kz_dot');
    const st = (cls, v, l) => '<div class="kz-st' + cls + '"><b>' + v + '</b><span>' + l + '</span></div>';
    await comp('#kz-stats', st('', '+12%', 'Hasar'), '.kz-st', 'kzst');
    await comp('#kz-stats', st(' zero', '—', 'Can Çalma'), '.kz-st', 'kzst_zero');
    await comp('#kz-stats', st(' neg', '-4%', 'Hız'), '.kz-st', 'kzst_neg');
    await A.eval(() => { const s = document.getElementById('kz-stats'); let b = document.getElementById('kz-sets'); if (!b) { b = document.createElement('div'); b.id = 'kz-sets'; b.className = 'kz-sets'; s.parentNode.insertBefore(b, s); } });
    await comp('#kz-sets', '<span class="ks-hint">AYNI KADEMEDEN 2 VE 4 PARÇA KUŞAN · SET GÜCÜ AÇILIR</span>', '.ks-hint', 'ks_hint');
    const sets = await A.eval(async () => (await import('/game/gearSets.js?v=20260930m')).GEAR_SETS);
    for (const r in sets) {
      const S = sets[r];
      for (const on4 of [false, true]) {
        const h = '<div class="ks-set" style="--sc:' + S.col + '"><span class="ks-h"><b>' + S.name + ' SETİ</b><em>' + (on4 ? 4 : 2) + ' / 4</em></span><span class="ks-l on">2 · ' + S.l2 + '</span><span class="ks-l' + (on4 ? ' on' : '') + '">4 · ' + S.l4 + '</span></div>';
        await comp('#kz-sets', h, '.ks-set', 'ks_set' + r + '_' + (on4 ? 4 : 2));
      }
    }
    const tab = (on, dot) => '<button class="kz-tab' + (on ? ' on' : '') + '" data-tab="all" type="button">TÜMÜ<em>3</em>' + (dot ? '<i class="kz-dot" aria-hidden="true"></i>' : '') + '</button>';
    await comp('#kz-tabs', tab(true), '.kz-tab', 'kztab_on');
    await comp('#kz-tabs', tab(false), '.kz-tab', 'kztab_off');
    for (const k in H.cards) {
      if (k.startsWith('__')) continue;
      await comp('#armory-shop', H.cards[k], '.kc', k, ['.kc-icon', '.kc-flag', '.kc-bar']);
    }
    await comp('#armory-shop', H.cards.kc3_own, '.kc-bar', 'kcb_norm');
    await comp('#armory-shop', H.cards.__ready, '.kc-bar', 'kcb_ready');
    await comp('#armory-shop', H.cards.__max, '.kc-bar', 'kcb_max');
    await comp('#armory-shop', H.cards.kc3_on, '.kc-flag', 'kcf_on');
    await comp('#armory-shop', H.cards.__ready, '.kc-flag', 'kcf_ready');
    await comp('#armory-shop', H.cards.__up, '.kc-flag', 'kcf_up');
    await comp('#armory-shop', '<div class="kz-sep"><b>BULUNAMAYAN</b><span>sandıklardan düşer · 12</span></div>', '.kz-sep', 'kz_sep');
    await comp('#armory-shop', '<div class="kz-empty">Bu yuvaya ait eşyan yok — sandıklardan düşer.</div>', '.kz-empty', 'kz_empty');
    await A.eval((h) => { const c = document.getElementById('kz-col-l'); c.innerHTML = h; const p = document.createElement('button'); p.className = 'kz-pop'; p.textContent = 'ÇIKAR'; p.style.top = '104px'; p.style.left = '39px'; c.appendChild(p); }, H.slots.kzs_f3);
    await A.wait(60);
    await A.layers({ sel: '.kz-pop', name: 'kz_pop' });
    await A.eval(() => window.__game.ui.renderArmory());
  },
};

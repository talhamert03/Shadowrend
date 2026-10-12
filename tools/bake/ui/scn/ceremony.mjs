/* SANDIK AÇILIŞ TÖRENİ (chests.ceremony / revealRewards).
   Gerçek akış sabit ödül listesiyle sürülür; ışın yelpazesi, ışık sütunu, flaş,
   nadirlik sözü, konfeti, 2B kıvılcımlar ve 3B sandık Godot'da yerel — burada
   yalnız düzen + kart şablonları yakalanır:
   • cer_idle            — iniş sonrası sahne (ipucu görünür)
   • cer_rev_<k>         — ödül kartı sahnesi (dönüş bitmiş), k = ödül türü
   • cer_back_<k>        — kartın arka yüzü (dönüşte görünür)
   • cer_sum + cer_tray_<k> — özet tepsisi ve tek tek tepsi kartları
   Kart görselleri (eşya/portre) atlanır; Godot aynı yere art/ dokusunu koyar. */
const R = [
  ['rubies', { kind: 'rubies', amount: 250, name: 'Altın' }],
  ['stone', { kind: 'stone', amount: 12, name: 'Gem' }],
  ...[1, 2, 3, 4, 5].map((r) => ['g' + r, { kind: 'gear', icon: 'kilic', rarity: r, name: 'Demir Kılıç', cards: 2, isNew: false }]),
  ...[1, 2, 3, 4].map((r) => ['c' + r, { kind: 'char', id: 'seher', rarity: r, name: 'SEHER', cards: 3, isNew: false }]),
  ['gnew', { kind: 'gear', icon: 'kilic', rarity: 4, name: 'Demir Kılıç', cards: 1, isNew: true }],
  ['cnew', { kind: 'char', id: 'seher', rarity: 2, name: 'SEHER', cards: 1, isNew: true }],
  ['weapon', { kind: 'weapon', icon: 'kilic', rarity: 3, name: 'Şafak Kılıcı', id: 'kilic' }],
];
const SKIP = ['#chest-canvas', '#chest-rays', '#chest-beam', '#chest-flash', '#chest-rarity-word', '.rw-gicon', '.rw-portrait', '.tc-portrait', '.tc-art', '.confetti-wrap'];

export default {
  async run(A) {
    await A.wait(1500);
    await A.eval((R) => {
      const g = window.__game;
      g.chests.rollRewards = () => R.map((x) => Object.assign({}, x[1]));
      g.chests.applyPity = (r) => r;
      g.chests.applyRewards = () => {};
      g.chests.ceremony('ahsap', null, () => {});
      import('/game/chests.js?v=20260930m').then((m) => { window.__C = m.CHESTS.ahsap; });
    }, R);
    await A.page.waitForSelector('#chest-hint:not(.hidden)', { timeout: 60000 });
    await A.wait(300);
    await A.layers({ sel: '#screen-chest', name: 'cer_idle', skip: SKIP, stretch: 100 });
    /* tören döngüsünün 3B karesi yazılım işlemede yakalamaları boğuyor — sustur */
    await A.eval(() => { const s3 = window.__game.chests.scene3d; if (s3) s3.renderFrame = () => {}; });
    /* her ödül AYRI açılır: sahnenin dinleyicileri klonlanarak atılır, revealRewards([r]) */
    const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
    for (const [k, r] of R) {
      if (ONLY.length && !ONLY.includes(k)) continue;
      await A.eval((r) => {
        const old = document.getElementById('screen-chest');
        const scr = old.cloneNode(true); old.replaceWith(scr);
        scr.classList.remove('tension', 'burst-flare', 'reveal-spot');
        document.getElementById('chest-hint').classList.add('hidden');
        const cards = document.getElementById('chest-rewards'); cards.innerHTML = '';
        const { CHESTS } = window.__chestsMod || {};
        window.__game.chests.revealRewards(cards, [Object.assign({}, r)], () => {}, window.__C, 0);
      }, r);
      await A.page.waitForSelector('.cr-card-face .rw-name', { timeout: 30000 });
      await A.eval(() => { for (const el of document.querySelectorAll('.cr-rise, .cr-spinner')) for (const a of el.getAnimations()) a.finish(); });
      await A.wait(900);
      /* "DEVAM İÇİN DOKUN" dönüş kilidi bitince görünür — yakalamada hep açık olsun (Godot gizler/gösterir) */
      await A.eval(() => { const h = document.getElementById('reveal-hint'); if (h) h.classList.remove('hidden'); });
      await A.wait(60);
      await A.layers({ sel: '#screen-chest', name: 'cer_rev_' + k, skip: SKIP, stretch: 100 });
      await A.eval(() => {
        const f = document.querySelector('.cr-card-face'), b = document.querySelector('.cr-card-back');
        f.style.visibility = 'hidden'; b.style.transform = 'none';
      });
      await A.wait(30);
      await A.layers({ sel: '.cr-card-back', name: 'cer_back_' + k });
    }
    /* özet: toTray işaretlemesi birebir (chests.js revealRewards.toTray), tepsi final kipte */
    await A.eval(async (R) => {
      const ui = window.__game.ui;
      const { CHAR_RARITIES, RARITIES } = await import('/game/config.js?v=20260930m');
      const old = document.getElementById('screen-chest');
      const scr = old.cloneNode(true); old.replaceWith(scr);
      scr.classList.add('revealed'); scr.classList.remove('reveal-spot');
      const cards = document.getElementById('chest-rewards');
      cards.innerHTML = '<div class="reveal-stage" id="reveal-stage"></div><p class="reveal-summary-title" id="reveal-summary-title">KAZANDIKLARIN</p>' +
        '<div class="reveal-tray final" id="reveal-tray"></div><p class="reveal-hint" id="reveal-hint">İLERLEMEK İÇİN DOKUN</p>';
      const trayEl = document.getElementById('reveal-tray');
      for (const [, r] of R) {
        const isChar = r.kind === 'char', isCurrency = r.kind === 'rubies' || r.kind === 'stone';
        const rar = isCurrency ? null : (isChar ? CHAR_RARITIES[r.rarity] : RARITIES[r.rarity]);
        const color = r.kind === 'rubies' ? '#ff3b4e' : (r.kind === 'stone' ? '#9d5cff' : rar.color);
        const tag = r.kind === 'rubies' ? 'ALTIN' : (r.kind === 'stone' ? 'GEM' : (isChar ? rar.name + (r.isNew ? ' KAHRAMAN' : '') : rar.name));
        let ic;
        if (r.kind === 'rubies') ic = '<span class="ruby"></span>';
        else if (r.kind === 'stone') ic = '<span class="stone"></span>';
        else if (isChar) ic = '<img class="tc-portrait is-art" alt="" src="' + (ui.cardPortrait(r.id) || ui.heroArtUrl(r.id)) + '">';
        else ic = '<span class="tc-art">' + ui.gearArt(r.icon) + '</span>';
        const label = isCurrency ? (r.kind === 'rubies' ? 'Altın' : 'Gem') : r.name;
        const cnt = isCurrency ? '+' + r.amount : (r.isNew ? 'YENİ!' : '×' + (r.cards || 1));
        const hi = (!isCurrency && (r.rarity || 0) >= 3) ? ' hi' : '';
        trayEl.insertAdjacentHTML('beforeend', '<div class="tray-card' + hi + '" style="--rc:' + color + '"><span class="tc-tag" style="color:' + color + '">' + tag + '</span><div class="tray-card-glyph">' + ic + '</div><span class="tray-card-label">' + label + '</span><b class="tc-count' + (r.isNew ? ' new' : '') + '">' + cnt + '</b></div>');
      }
    }, R);
    await A.wait(600);
    await A.layers({ sel: '#screen-chest', name: 'cer_sum', skip: SKIP, stretch: 100 });
    for (let i = 0; i < R.length; i++) {
      await A.layers({ sel: '.tray-card:nth-child(' + (i + 1) + ')', name: 'cer_tray_' + R[i][0], skip: SKIP });
    }
  },
};

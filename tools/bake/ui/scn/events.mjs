/* ETKİNLİK sayfası (renderEvents + _renderWeek) — kabuk + bileşenler; hepsi gerçek
   yerinde yakalanır, konum #week-box'a göre yakalama dikdörtgeninden çıkar (Godot _loc).
   • pg_etkinlik                         — sayfa kabuğu (#week-box atlanır, kutusu kalır)
   • ev_hero_<olay>_<0|1>                — BU HAFTA afişi (hafta sonu satırı 1); pip'ler ayrı
   • ev_pips_<w>                         — sezon pip şeridi (w = 0..5)
   • ev_tab_<id>_<on|off>, ev2n, ev2n_hot — sekmeler + rozet
   • ev_daily, ev_dq_<0|1>               — GÜNLÜK HEDEFLER kartı + satır
   • ev_seal_<w>, ev_tier_<i>_<0|1>      — HAFTALIK MÜHÜR (dünya rengi) + kademe pulu
   • ev_poster, ev_sec[_hot], ev_stop_<i>_<claimed|ready|reached|locked|next>, ev_dock — KUPA
   • ev_peak_<0|1>, ev_tower_<0|1>, ev_twf_<done|cur|up>_<0|1>_<w>, ev_nm_<0|1>, ev_nmt_<w> — ZİRVE
   • ev_album, ev_alb, ev_ach[_t], ev_achr_<0|1> — ALBÜM + BAŞARIMLAR */
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
    const fin = () => A.eval(() => { for (const el of document.querySelectorAll('#page-etkinlik *')) for (const a of el.getAnimations()) if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish(); });
    const tab = (t) => A.eval((t) => { const ui = window.__game.ui; ui._evTab = t; ui.renderEvents(); }, t);
    await A.eval(() => { const g = window.__game; g.ui._evTab = 'kupa'; g.ui.setPage('etkinlik'); });
    await A.wait(900);
    await fin();
    await cap('#page-etkinlik', 'pg_etkinlik', ['#week-box'], 100);
    const D = await A.eval(async (V) => {
      const c = await import('/game/config.js' + V);
      const cal = await import('/game/calendar.js' + V);
      const j = await import('/game/journey.js' + V);
      const a = await import('/game/achievements.js' + V);
      const wl = await import('/game/worlds.js' + V);
      return { W: wl.WORLDS.map((w) => ({ id: w.id, color: w.color, name: w.name })), MS: c.SURVIVAL_MILESTONES, EV: cal.WEEK_EVENTS || null, TIERS: cal.SEAL_TIERS, SEASON: j.SEASON.length, ACH: a.ACH.length };
    }, V);

    /* ── BU HAFTA afişi ── */
    const EV = D.EV || [{ id: 'kor', col: '#d8a284' }, { id: 'avci', col: '#ff6a5a' }, { id: 'elit', col: '#cfd6e2' }, { id: 'biyom', col: '#9fb4c9' }];
    for (const e of EV) {
      for (const we of [0, 1]) {
        await A.eval(([e, we]) => {
          const s = document.querySelector('.wk-event');
          s.style.setProperty('--ec', e.col);
          s.querySelector('.wke-k').innerHTML = 'BU HAFTA' + (we ? ' · <b>HAFTA SONU ALTIN +%25</b>' : '');
          if (e.name) s.querySelector('.wke-n').textContent = e.name;
        }, [e, we]);
        await A.wait(40);
        await cap('.wk-event', 'ev_hero_' + e.id + '_' + we, ['.ws-pips']);
      }
    }
    for (let w = 0; w < D.SEASON; w++) {
      await A.eval((w) => { document.querySelectorAll('.ws-pips i').forEach((p, i) => { p.className = i < w ? 'past' : i === w ? 'now' : ''; }); }, w);
      await A.wait(30);
      await cap('.ws-pips', 'ev_pips_' + w);
    }

    /* ── sekmeler ── */
    await tab('kupa'); await fin();
    const TABS = ['gunluk', 'muhur', 'kupa', 'zirve', 'album'];
    for (const on of [true, false]) {
      await A.eval((on) => { document.querySelectorAll('.ev2-tab').forEach((b) => b.classList.toggle('on', on)); }, on);
      await A.wait(40);
      for (const t of TABS) await cap('.ev2-tab[data-t="' + t + '"]', 'ev_tab_' + t + (on ? '_on' : '_off'), ['.ev2-n']);
    }
    await A.eval(() => {
      const b = document.querySelector('.ev2-tab[data-t="gunluk"]');
      let n = b.querySelector('.ev2-n'); if (!n) { n = document.createElement('i'); n.className = 'ev2-n'; b.appendChild(n); }
      n.textContent = '2'; n.id = 'cap-n';
      const k = document.querySelector('.ev2-tab[data-t="kupa"]');
      let m = k.querySelector('.ev2-n'); if (!m) { m = document.createElement('i'); m.className = 'ev2-n hot'; k.appendChild(m); }
      m.textContent = '2'; m.id = 'cap-nh';
    });
    await A.wait(40);
    await cap('#cap-n', 'ev2n');
    await cap('#cap-nh', 'ev2n_hot');

    /* ── GÜNLÜK ── */
    await tab('gunluk'); await fin();
    await cap('.wk-daily', 'ev_daily', ['.dl-q']);
    for (const done of [0, 1]) {
      await A.eval((done) => { const q = document.querySelector('.dl-q'); q.classList.toggle('done', !!done); q.id = 'cap-dq'; }, done);
      await A.wait(30);
      await cap('#cap-dq', 'ev_dq_' + done);
    }

    /* ── MÜHÜR ── */
    await tab('muhur'); await fin();
    for (const w of D.W) {
      await A.eval((w) => {
        const s = document.querySelector('.wk-seal');
        s.style.setProperty('--wc', w.color || '#b06a49');
        const i = s.querySelector('.sl-rail i'); if (i) i.style.width = '50%';
      }, w);
      await A.wait(40);
      await cap('.wk-seal', 'ev_seal_' + w.id, ['.sl-tier']);
    }
    for (let i = 0; i < D.TIERS.length; i++) {
      for (const got of [0, 1]) {
        await A.eval(([i, got]) => { const t = document.querySelectorAll('.sl-tier')[i]; t.classList.toggle('got', !!got); t.id = 'cap-tier'; document.querySelectorAll('.sl-tier').forEach((x, k) => { if (k !== i) x.removeAttribute('id'); }); }, [i, got]);
        await A.wait(30);
        await cap('#cap-tier', 'ev_tier_' + i + '_' + got);
      }
    }

    /* ── KUPA ── */
    await tab('kupa'); await fin();
    await A.eval(() => { const f = document.getElementById('event-bar-fill'); if (f) f.style.width = '50%'; });
    await cap('.ev-poster', 'ev_poster');
    for (const hot of [0, 1]) {
      await A.eval((hot) => { const r = document.getElementById('event-ready'); r.classList.toggle('hot', !!hot); }, hot);
      await A.wait(30);
      await cap('.ev-sec', 'ev_sec' + (hot ? '_hot' : ''));
    }
    await cap('.event-dock', 'ev_dock');
    const track = (mins, claimed, can) => A.eval(([mins, claimed, can]) => {
      const g = window.__game, ui = g.ui;
      const k = g.__evKeep || (g.__evKeep = { m: g.survivalMinutes, c: g.milestoneClaimed, k: g.canClaimMilestone });
      g.survivalMinutes = () => mins;
      g.milestoneClaimed = () => claimed;
      g.canClaimMilestone = (ms) => can && mins >= ms.need && !claimed;
      ui.renderEvents();
      Object.assign(g, { survivalMinutes: k.m, milestoneClaimed: k.c, canClaimMilestone: k.k });
      for (const el of document.querySelectorAll('#event-track *')) for (const a of el.getAnimations()) if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish();
    }, [mins, claimed, can]);
    const N = D.MS.length;
    for (const [st, mins, cl, can] of [['claimed', 9999, true, false], ['ready', 9999, false, true], ['reached', 9999, false, false]]) {
      await track(mins, cl, can);
      await A.wait(60);
      for (let i = 0; i < N; i++) await cap('#event-track .ev-stop:nth-child(' + (i + 1) + ')', 'ev_stop_' + i + '_' + st);
    }
    await track(0, false, false);
    await A.wait(60);
    for (let i = 1; i < N; i++) await cap('#event-track .ev-stop:nth-child(' + (i + 1) + ')', 'ev_stop_' + i + '_locked');
    for (let i = 0; i < N; i++) {
      await track(i ? D.MS[i - 1].need : 0, false, false);
      await A.wait(60);
      await cap('#event-track .ev-stop:nth-child(' + (i + 1) + ')', 'ev_stop_' + i + '_next');
    }
    await track(0, false, false);

    /* ── ZİRVE ── */
    await tab('zirve'); await fin();
    for (const open of [1, 0]) {
      await A.eval((open) => {
        for (const s of document.querySelectorAll('.wk-peak, .wk-tower, .wk-nm')) s.classList.toggle('locked', !open);
        for (const b of document.querySelectorAll('#tower-go, #nm-go')) b.disabled = !open;
        const tg = document.querySelector('#tower-go span'); if (tg) tg.textContent = open ? 'TIRMAN' : 'KİLİTLİ';
        const ts = document.querySelector('#tower-go small'); if (ts) ts.textContent = open ? 'HER 5 KAT KONTROL NOKTASI' : 'DÜNYA 1 BOSS\'UNU YEN';
        const ng = document.querySelector('#nm-go span'); if (ng) ng.textContent = open ? 'GECEYE GİR' : 'KİLİTLİ';
        const ns = document.querySelector('#nm-go small'); if (ns) ns.textContent = open ? 'BOSS GÖREVİ 20 GEM' : 'SON BOSS\'U YEN';
      }, open);
      await A.wait(40);
      await cap('.wk-peak', 'ev_peak_' + open);
      /* kat kutuları atlanır; cur'un translateX'i kutuda kalmasın (Godot şablonu taşır) */
      await A.eval(() => document.querySelectorAll('.wk-tower .tw-f').forEach((f) => { f.dataset.c = f.className; f.className = 'tw-f up'; }));
      await cap('.wk-tower', 'ev_tower_' + open, ['.tw-f']);
      await A.eval(() => document.querySelectorAll('.wk-tower .tw-f').forEach((f) => { f.className = f.dataset.c; }));
      await cap('.wk-nm', 'ev_nm_' + open, ['.nm-track']);
    }
    /* kat pulu: durum × boss × dünya rengi (ilk pulda üretilir) */
    for (const w of D.W) {
      for (const st of ['done', 'cur', 'up']) {
        for (const boss of [0, 1]) {
          await A.eval(([w, st, boss]) => {
            const f = document.querySelector('.tw-f');
            f.className = 'tw-f ' + st + (boss ? ' boss' : '');
            f.style.setProperty('--fc', w.color);
            f.id = 'cap-twf';
          }, [w, st, boss]);
          await A.wait(20);
          await cap('#cap-twf', 'ev_twf_' + st + '_' + boss + '_' + w.id);
        }
      }
    }
    for (let k = 0; k <= D.W.length; k++) {
      await A.eval(([k, W]) => {
        document.querySelectorAll('.wk-nm .nm-d').forEach((d, i) => { const w = i + 1; d.className = 'nm-d ' + (k === 0 ? '' : w < k ? 'done' : w === k ? 'cur' : ''); d.style.setProperty('--fc', W[i].color); });
      }, [k, D.W]);
      await A.wait(30);
      await cap('.wk-nm .nm-track', 'ev_nmt_' + k);
    }

    /* ── ALBÜM ── */
    await tab('album'); await fin();
    await cap('.wk-album', 'ev_album', ['.al-b']);
    await A.eval(() => { const b = document.querySelector('.al-b'); b.className = 'al-b'; b.style.setProperty('--p', '0'); b.style.opacity = '1'; b.id = 'cap-alb'; });
    await A.wait(30);
    await cap('#cap-alb', 'ev_alb');
    for (const t of [0, 1]) {
      await A.eval((t) => {
        const s = document.querySelector('.wk-ach summary');
        let e = s.querySelector('.ach-title');
        if (t && !e) { e = document.createElement('em'); e.className = 'ach-title'; e.textContent = 'KIZIL TIRPAN'; s.appendChild(e); }
        if (!t && e) e.remove();
      }, t);
      await A.wait(30);
      await cap('.wk-ach', 'ev_ach' + (t ? '_t' : ''), ['.ach-row']);
    }
    for (const done of [0, 1]) {
      await A.eval((done) => { const r = document.querySelector('.ach-row'); r.classList.toggle('done', !!done); r.style.setProperty('--p', done ? '100' : '50'); r.id = 'cap-achr'; }, done);
      await A.wait(30);
      await cap('#cap-achr', 'ev_achr_' + done);
    }
    await tab('kupa');
  },
};

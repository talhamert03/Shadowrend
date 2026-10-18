/* MENÜ KATMANLARI — günlük çekmece, genel sayfa (olasılıklar · yasal · veri silme),
   hesap yolculuğu, görevler. Bileşenler gerçek yerinde yakalanır (Godot: rect farkı).
   • dd, dd_hot                         — günlük çekmece (görev rozeti yok / var)
   • sh_odds_<tür>, sh_doc_<k>, sh_wipe — #screen-sheet örnekleri
   • aj, aj_<tür>_<done|next|locked>    — hesap yolculuğu kabuğu + ray düğümü
   • qx                                 — görevler kabuğu (dinamik kaplar atlanır)
   • qx_track_<k>, qx_tier_<i>_<taken|ready|locked>
   • qx_day_<d>_<future|open|taken|nowtaken>, qx_mk_<on|off>, qx_claim_<0|1>
   • qx_q_<id>_<prog|ready|taken>       — görev satırı */
import fs from 'node:fs';
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
    const fin = (sel) => A.eval((sel) => { for (const el of document.querySelectorAll(sel + ', ' + sel + ' *')) for (const a of el.getAnimations()) if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish(); }, sel);

    /* ── günlük çekmece ── */
    for (const hot of [0, 1]) {
      await A.eval((hot) => {
        const ui = window.__game.ui; ui._dd(true);
        document.getElementById('quest-teaser-badge').classList.toggle('hidden', !hot);
        document.getElementById('quest-open').classList.toggle('hot', !!hot);
        for (const id of ['bpb-fill', 'quest-pts-fill']) { const f = document.getElementById(id); if (f) f.style.width = '50%'; }
      }, hot);
      await A.wait(500);
      await fin('#daily-drawer');
      await cap('#daily-drawer', hot ? 'dd_hot' : 'dd', [], 100);
    }
    await A.eval(() => { const d = document.getElementById('daily-drawer'); d.classList.add('hidden'); });

    /* ── sayfalar ── */
    const types = await A.eval(async (V) => Object.keys((await import('/game/chests.js' + V)).CHESTS), V);
    const sheet = async (code, name) => {
      await A.eval(code);
      await A.wait(250);
      await fin('#screen-sheet');
      await cap('#screen-sheet', name, [], 100);
      await A.eval(() => window.__game.ui.closeSheet(true));
    };
    for (const t of types) await sheet('window.__game.ui.showOdds(' + JSON.stringify(t) + ')', 'sh_odds_' + t);
    /* yasal metin gövdesi Godot'da zengin metinle dizilir (satır içi <b> akışı) → yakalamada atlanır,
       metin assets/ui/legal.json'a yazılır */
    const LG = await A.eval(async (V) => { const l = await import('/game/legal.js' + V); return { privacy: l.PRIVACY, kvkk: l.KVKK, terms: l.TERMS }; }, V);
    fs.writeFileSync(new URL('../../../../godot/assets/ui/legal.json', import.meta.url), JSON.stringify(LG, null, 1));
    const sheetSkip = async (code, name, skip) => {
      await A.eval(code);
      await A.wait(250);
      await fin('#screen-sheet');
      await cap('#screen-sheet', name, skip, 100);
      await A.eval(() => window.__game.ui.closeSheet(true));
    };
    for (const k of ['privacy', 'kvkk', 'terms']) await sheetSkip('window.__game.ui._openDocFromSheet(' + JSON.stringify(k) + ')', 'sh_doc_' + k, ['.lg-doc']);
    await sheet('window.__game.ui.confirmWipe()', 'sh_wipe');

    /* ── hesap yolculuğu ── */
    await A.eval(() => window.__game.ui.showAccountJourney());
    await A.wait(400);
    await fin('#screen-accjourney');
    await cap('#screen-accjourney', 'aj', ['#aj-rail'], 100);
    const names = await A.eval(async (V) => { const { CHESTS } = await import('/game/chests.js' + V); const o = {}; for (const k in CHESTS) o[k] = CHESTS[k].name; return o; }, V);
    for (const t of types) {
      for (const st of ['done', 'next', 'locked']) {
        const ok = await A.eval(([nm, st]) => {
          document.querySelectorAll('#aj-rail .aj-node').forEach((x) => x.removeAttribute('id'));
          const n = [...document.querySelectorAll('#aj-rail .aj-node')].find((x) => x.querySelector('.aj-info b').textContent === nm);
          if (!n) return false;
          n.className = 'aj-node ' + st; n.id = 'cap-aj';
          return true;
        }, [names[t], st]);
        if (!ok) continue;
        await A.wait(40);
        await cap('#cap-aj', 'aj_' + t + '_' + st);
      }
    }
    await A.eval(() => { document.getElementById('screen-accjourney').classList.add('hidden'); });

    /* ── görevler ── */
    await A.eval(() => window.__game.ui.showQuests());
    await A.wait(1600);
    await fin('#screen-quests');
    await cap('#screen-quests', 'qx', ['#q-vit', '#q-cal', '#q-list', '#q-makeup', '#q-claim-daily'], 100);
    const Q = await A.eval(async (V) => { const d = await import('/game/dailies.js' + V); return { tiers: d.WEEKLY_TIERS.length, quests: d.WEEKLY_QUESTS.map((q) => q.id), days: d.DAILY_STREAK.length }; }, V);
    /* kuşak: dolum tam (Godot genişletir), k kademe çentiği açık */
    for (let k = 0; k <= Q.tiers; k++) {
      await A.eval((k) => {
        const f = document.querySelector('.qx-track-fill'); if (f) f.style.transform = 'none';
        document.querySelectorAll('.qx-notch').forEach((n, i) => n.classList.toggle('on', i < k));
      }, k);
      await A.wait(30);
      await cap('.qx-track', 'qx_track_' + k);
    }
    for (let i = 0; i < Q.tiers; i++) {
      for (const st of ['taken', 'ready', 'locked']) {
        await A.eval(([i, st]) => {
          const t = document.querySelectorAll('.qx-tier')[i];
          t.className = 'qx-tier ' + st; t.id = 'cap-tier';
          t.querySelector('.qx-tier-s').textContent = st === 'taken' ? 'ALINDI' : st === 'ready' ? 'AL' : '20 P KALDI';
          document.querySelectorAll('.qx-tier').forEach((x, k) => { if (k !== i) x.removeAttribute('id'); });
        }, [i, st]);
        await A.wait(30);
        await cap('#cap-tier', 'qx_tier_' + i + '_' + st);
      }
    }
    for (let d = 0; d < Q.days; d++) {
      for (const st of ['future', 'open', 'taken', 'nowtaken']) {
        await A.eval(([d, st]) => {
          const el = document.querySelectorAll('.qx-day')[d];
          const fin = el.classList.contains('fin');
          el.className = 'qx-day' + (fin ? ' fin' : '') + (st === 'open' ? ' now open' : st === 'nowtaken' ? ' now taken' : st === 'taken' ? ' taken' : '');
          el.querySelector('.qx-day-n').textContent = st === 'open' ? 'BUGÜN' : (d === 6 ? '7. GÜN · BÜYÜK ÖDÜL' : (d + 1) + '. GÜN');
          let ok = el.querySelector('.qx-ok');
          if ((st === 'taken' || st === 'nowtaken') && !ok) { ok = document.createElement('i'); ok.className = 'qx-ok'; el.appendChild(ok); }
          if (!(st === 'taken' || st === 'nowtaken') && ok) ok.remove();
          document.querySelectorAll('.qx-day').forEach((x) => x.removeAttribute('id'));
          el.id = 'cap-day';
        }, [d, st]);
        await A.wait(30);
        await cap('#cap-day', 'qx_day_' + d + '_' + st);
      }
    }
    for (const on of [1, 0]) {
      await A.eval((on) => { const m = document.getElementById('q-makeup'); m.classList.toggle('on', !!on); m.textContent = on ? 'TELAFİ ×1' : 'TELAFİ YOK'; }, on);
      await A.wait(30);
      await cap('#q-makeup', 'qx_mk_' + (on ? 'on' : 'off'));
    }
    for (const took of [0, 1]) {
      await A.eval((took) => { const b = document.getElementById('q-claim-daily'); b.disabled = !!took; b.textContent = took ? 'YARIN GÖRÜŞÜRÜZ' : 'ÖDÜLÜ AL'; }, took);
      await A.wait(30);
      await cap('#q-claim-daily', 'qx_claim_' + took);
    }
    /* görev satırları: her durum için listeyi yeniden kur (sıra değişebilir → id ile seç) */
    for (const st of ['prog', 'ready', 'taken']) {
      await A.eval(async ([st, V]) => {
        const g = window.__game, d = g.dailies, ui = g.ui;
        const k = d.__k || (d.__k = { p: d.prog, o: d.done, c: d.claimedQuest });
        d.prog = (def) => (st === 'prog' ? Math.floor(def.need / 2) : def.need);
        d.done = () => st !== 'prog';
        d.claimedQuest = () => st === 'taken';
        ui.renderQuests();
        Object.assign(d, { prog: k.p, done: k.o, claimedQuest: k.c });
        const { WEEKLY_QUESTS } = await import('/game/dailies.js' + V);
        const rows = document.querySelectorAll('#q-list .qx-q');
        rows.forEach((r) => { r.style.animation = 'none'; const i = r.querySelector('.qx-q-bar i'); if (i) i.style.transform = 'none'; });
        /* satırı göreve bağla: etiket metninden */
        rows.forEach((r) => { const t = r.querySelector('.qx-q-t').textContent; const q = WEEKLY_QUESTS.find((x) => x.label === t); if (q) r.dataset.q = q.id; });
      }, [st, V]);
      await A.wait(80);
      await fin('#q-list');
      for (const id of Q.quests) await cap('#q-list .qx-q[data-q="' + id + '"]', 'qx_q_' + id + '_' + st);
    }
    await A.eval(() => window.__game.ui.hideQuests());
  },
};

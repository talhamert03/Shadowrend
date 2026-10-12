/* GÖREV SONU: galibiyet + yenilgi ekranları (sıralı tören animasyonlarıyla), sandık
   türüne göre ganimet blokları, defter çipleri ve ustalık "seviye atladı" şeridi. */
import { enterBattle } from './_battle.mjs';

const CHIPS = {
  gem: '<span class="mel-chip gem"><span class="stone"></span>+4</span>',
  dim: '<span class="mel-chip dim">EN İYİ 187</span>',
  rec: '<span class="mel-rec">YENİ REKOR · 187 KIYIM</span>',
  tower: '<span class="mel-rec tower">KAT 3 GEÇİLDİ</span>',
  nm: '<span class="mel-rec nm">KABUS D1-1 · İLK ZAFER</span>',
  nmf: '<span class="mel-chip nmf">KABUS ÇERÇEVESİ AÇILDI</span>',
  seal: '<span class="mel-rec seal">MÜHÜR 120 · EN İYİ</span>',
  col: '<span class="mel-chip" style="color:#ff8a4a">KOR</span>',
};

export default {
  async run(A) {
    const noAch = () => A.eval(() => { for (const e of document.querySelectorAll('.ach-pop')) e.remove(); clearTimeout(window.__game.ui._achT); });
    await enterBattle(A);
    await A.eval(() => { const g = window.__game; g.kills = 187; g.missionComplete(); });
    await A.page.waitForSelector('#screen-missionend:not(.hidden)', { timeout: 15000 });
    await noAch();
    await A.wait(30);
    await A.layers({ sel: '#screen-missionend', name: 'me_won', stretch: 100 });
    /* çipler ve ustalık-yükseldi şeridi (durağan) */
    await A.wait(3000); await noAch();
    for (const k in CHIPS) {
      await A.eval((h) => { const c = document.querySelector('.mel-chips'); c.innerHTML = h; }, CHIPS[k]);
      await A.wait(30);
      await A.layers({ sel: '.mel-chips > :first-child', name: 'mec_' + k });
    }
    await A.eval(() => {
      const m = document.querySelector('.mel-mas'); m.classList.add('up');
      const n = m.querySelector('.hm-note'); if (n) n.outerHTML = '<span class="mm-up">USTALIK SV 2 · +100 ALTIN · +5 GEM</span>';
    });
    await A.wait(30);
    await A.layers({ sel: '.mel-mas', name: 'me_mas_up' });
    /* ganimet blokları: her sandık türü + yuvalar dolu */
    const types = await A.eval(async () => Object.keys((await import('/game/chests.js?v=20260930m')).CHESTS));
    const base = { time: 63, kills: 187, level: 4, wave: 5, rubies: 50, firstClear: true, bossDrop: false, ledger: null };
    for (const t of types) {
      await A.eval(([s]) => { window.__game.ui.showMissionEnd(true, s); }, [Object.assign({}, base, { chest: t })]);
      await A.wait(30); await noAch();
      await A.layers({ sel: '#me-loot', name: 'me_loot_' + t });
    }
    await A.eval(([s]) => { window.__game.ui.showMissionEnd(true, s); }, [Object.assign({}, base, { chest: null, chestFull: true })]);
    await A.wait(30); await noAch();
    await A.layers({ sel: '#me-loot', name: 'me_loot_full' });
    /* yenilgi */
    await A.eval(() => { const g = window.__game; g.ui.screens.missionend.classList.add('hidden'); });
    await enterBattle(A);
    await A.eval(() => { const g = window.__game; g.kills = 42; g.player.hp = 0; g.gameOver(); });
    await A.page.waitForSelector('#screen-missionend:not(.hidden)', { timeout: 15000 });
    await noAch();
    await A.wait(30);
    await A.layers({ sel: '#screen-missionend', name: 'me_lost', stretch: 100 });
  },
};

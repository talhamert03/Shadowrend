/* Savaş içi ekran kabukları (dikey esneme ölçümüyle): seviye, kutsama, sunak, duraklat */
import { enterBattle } from './_battle.mjs';
export default {
  async run(A) {
    await enterBattle(A);
    await A.eval(() => window.__game.enterLevelUp());
    await A.wait(80);
    await A.layers({ sel: '#screen-levelup', name: 'lv_screen', skip: ['.lv-card', '.lv-evo-hint'], stretch: 100 });
    await A.eval(() => { const g = window.__game; g.ui.hideLevelUp(); g.state = 'playing'; });
    const show = (opt) => A.eval((opt) => {
      const u = window.__game.ui;
      const old = document.getElementById('bless-pick'); if (old) old.remove();
      const b = (i) => ({ id: 'x' + i, name: 'RÜZGÂR ADIMI', plus: 'Hız +%10', minus: 'Can −20', col: '#d8a284' });
      u.showBlessPick([b(0), b(1), b(2)], () => {}, opt || undefined);
    }, opt);
    await show(null); await A.wait(60);
    await A.layers({ sel: '#bless-pick', name: 'bp_screen', skip: ['.bp2-card'], stretch: 100 });
    await show({ k: 'SUNAK', t: 'BİR YOL SEÇ', s: 'Sunak üç bedel sunar · biri seçilir', stamp: 'KABUL', cls: 'bp2-altar', label: 'Sunak seçimi', endSnd: 'altar' }); await A.wait(60);
    await A.layers({ sel: '#bless-pick', name: 'bp_altar', skip: ['.bp2-card'], stretch: 100 });
    await A.eval(() => { const old = document.getElementById('bless-pick'); if (old) old.remove(); window.__game.pauseGame(); });
    await A.wait(60);
    await A.layers({ sel: '#screen-pause', name: 'pause', skip: ['.ld-item'], stretch: 100 });
  },
};

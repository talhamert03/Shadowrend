/* KUTSAMA / SUNAK seçimi (#bless-pick.bp2): kabuk (olağan + sunak), seçilmiş durum
   (mühür animasyonu) ve her vurgu rengi için kart. Kartın dağıtım animasyonu
   (--n'e bağlı dönüş/gecikme) Godot'da kart sırasına göre yeniden yazılır. */
import { enterBattle } from './_battle.mjs';

const COLS = ['#d8a284', '#cfd6e2', '#9fb4c9', '#c85a5a', '#f0c77a', '#b5d68a', '#ff5a6e', '#8fd6a4'];

export default {
  async run(A) {
    await enterBattle(A);
    const show = (col, opt) => A.eval(([col, opt]) => {
      const u = window.__game.ui;
      const old = document.getElementById('bless-pick'); if (old) old.remove();
      const b = (i) => ({ id: 'x' + i, name: 'RÜZGÂR ADIMI', plus: 'Hız +%10 · Mıknatıs +%30', minus: 'Can −20', col });
      u.showBlessPick([b(0), b(1), b(2)], () => {}, opt || undefined);
    }, [col, opt]);
    await show(COLS[0]);
    await A.wait(60);
    await A.layers({ sel: '#bless-pick', name: 'bp_screen', skip: ['.bp2-card'], stretch: 100 });
    await show(COLS[0], { k: 'SUNAK', t: 'BİR YOL SEÇ', s: 'Sunak üç bedel sunar · biri seçilir', stamp: 'KABUL', cls: 'bp2-altar', label: 'Sunak seçimi', endSnd: 'altar' });
    await A.wait(60);
    await A.layers({ sel: '#bless-pick', name: 'bp_altar', skip: ['.bp2-card'], stretch: 100 });
    /* seçilmiş durum: mühür animasyonu */
    await show(COLS[0]);
    await A.wait(1500);
    /* seçim sonrası zamanlayıcılar (perde kalkışı, silme) yakalama sürerken çalışmasın */
    await A.eval(() => { window.__st = window.setTimeout; window.setTimeout = () => 0; });
    await A.page.click('#bless-pick .bp2-card');
    await A.wait(40);
    await A.layers({ sel: '#bless-pick', name: 'bp_chosen', skip: ['.bp2-card'] });
    await A.eval(() => { window.setTimeout = window.__st; });
    for (const c of COLS) {
      await show(c);
      await A.wait(60);
      await A.layers({ sel: '#bless-pick .bp2-card', name: 'bpc_' + c.slice(1), stretch: 40 });
    }
    await A.eval(() => { const old = document.getElementById('bless-pick'); if (old) old.remove(); });
  },
};

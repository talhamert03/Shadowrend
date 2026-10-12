/* DURAKLAT (MÜHLET): kabuk + yükleme çipi şablonu */
import { enterBattle } from './_battle.mjs';
export default {
  async run(A) {
    await enterBattle(A);
    await A.eval(() => window.__game.pauseGame());
    await A.wait(60);
    await A.page.screenshot({ path: process.env.OUTP || '/dev/null' });
    await A.layers({ sel: '#screen-pause', name: 'pause', skip: ['.ld-item'], stretch: 100 });
    await A.layers({ sel: '#screen-pause .ld-item', name: 'pause_chip' });
  },
};

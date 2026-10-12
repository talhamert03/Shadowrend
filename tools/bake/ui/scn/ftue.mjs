/* İLK OYUN ipuçları (.ftue): dört tür */
import { enterBattle } from './_battle.mjs';
export default {
  async run(A) {
    await enterBattle(A);
    for (const k of ['move', 'auto', 'level', 'chest']) {
      await A.eval(async (k) => { const m = await import('/game/ftue.js?v=20260930m'); m.Ftue._show(k); }, k);
      await A.wait(60);
      await A.layers({ sel: '.ftue', name: 'ftue_' + k, stretch: 100 });
    }
  },
};

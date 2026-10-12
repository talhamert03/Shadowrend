/* Savaş içi küçük ekranlar: reklam izleme, başarım bildirimi (giriş/çıkış), evrim sineması (giriş/çıkış) */
import { enterBattle } from './_battle.mjs';
export default {
  async run(A) {
    await enterBattle(A);
    /* reklam: Backend.ads() kapalıyken simülasyon ekranı */
    await A.eval(() => { const u = window.__game.ui; u.showAdWatch(3, () => {}); clearInterval(u._adT); });
    await A.wait(60);
    await A.layers({ sel: '#screen-adwatch', name: 'adwatch', stretch: 100 });
    await A.eval(() => { const u = window.__game.ui; u.screens.adwatch.classList.add('hidden'); u.showGame(); });
    /* başarım */
    await A.eval(() => { window.__st = window.setTimeout; window.setTimeout = () => 0; window.__game.ui._achToast([{ name: 'DOKUNULMAZ', gold: 100 }], 0); window.setTimeout = window.__st; });
    await A.wait(60);
    await A.layers({ sel: '.ach-pop', name: 'ach' });
    await A.eval(() => document.querySelector('.ach-pop').classList.add('out'));
    await A.wait(30);
    await A.layers({ sel: '.ach-pop', name: 'ach_out' });
    await A.eval(() => { for (const e of document.querySelectorAll('.ach-pop')) e.remove(); });
    /* evrim sineması */
    await A.eval(() => { window.__st = window.setTimeout; window.setTimeout = () => 0; window.__game.ui.evoCinema({ icon: 'kilic', from: 'SEHER KILICI', to: 'ŞAFAK KILICI' }, () => {}); window.setTimeout = window.__st; });
    await A.wait(60);
    await A.layers({ sel: '.evc', name: 'evc', stretch: 100 });
    await A.eval(() => document.querySelector('.evc').classList.add('out'));
    await A.wait(30);
    await A.layers({ sel: '.evc', name: 'evc_out', stretch: 100 });
    await A.eval(() => { for (const e of document.querySelectorAll('.evc')) e.remove(); });
  },
};

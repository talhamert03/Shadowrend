/* Ortak: Seher ile 1-1 savaşına gir, kutsamayı seç, oyun akarken dön. */
export async function enterBattle(A, ch = 'seher', w = 1, m = 1) {
  await A.eval(([ch, w, m]) => {
    const g = window.__game;
    if (!g.meta.charsOwned.includes(ch)) g.meta.charsOwned.push(ch);
    g.meta.selectedChar = ch; g.meta.ftue = 1; g.startRun(w, m);
  }, [ch, w, m]);
  try {
    await A.page.waitForSelector('#bless-pick .bp2-card', { timeout: 25000 });
    await A.wait(700);
    await A.page.click('#bless-pick .bp2-card');
  } catch (e) { /* kutsama yok */ }
  await A.page.waitForFunction(() => !document.getElementById('bless-pick') && window.__game.state === 'playing', null, { timeout: 20000 });
  await A.wait(400);
}

/* MENÜ: kabuk (gök, zerreler, üst çubuk, alt gezinme) her etkin sekmeyle + SAVAŞ sayfası */
export default {
  async run(A) {
    await A.wait(2500);
    for (const p of ['savas', 'magaza', 'cephane', 'kahraman', 'etkinlik']) {
      await A.eval((p) => window.__game.ui.setPage(p), p);
      await A.wait(900);
      await A.layers({ sel: '#screen-menu', name: 'menu_' + p, skip: ['.menu-page', '#daily-drawer'], stretch: 100 });
    }
    /* dolum çubukları görünsün diye sıfırdan farklı ilerleme (görüntüleri esner) */
    await A.eval(() => {
      const g = window.__game;
      g.progress[1] = 4;
      try { localStorage.setItem('kh_vicchest', '2'); } catch (e) {}
      g.meta.account.xp = Math.max(1, Math.round(g.meta.account.xpNext * 0.4));
      g.ui.setPage('savas'); g.ui.renderHome();
    });
    await A.wait(1200);
    await A.layers({ sel: '#page-savas', name: 'pg_savas', skip: ['#map-canvas-3d'], stretch: 100 });
  },
};

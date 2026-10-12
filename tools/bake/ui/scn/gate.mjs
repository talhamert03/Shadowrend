/* SAVAŞ KAPISI (#screen-loading): durumlar (taban, kapanıyor, kilitli, hazır, açılıyor)
   × dünya renkleri (--wc). Godot durumlar arasında CSS geçişleriyle (to_state) ilerler. */
export default {
  async run(A) {
    const cols = await A.eval(async () => [...new Set((await import('/game/worlds.js?v=20260930m')).WORLDS.map((w) => w.color)), '#b06a49']);
    const ST = { base: '', closing: 'closing', locked: 'closing locked', ready: 'closing locked ready', opening: 'opening locked ready' };
    for (const c of cols) {
      for (const k in ST) {
        await A.eval(([c, cls]) => {
          const s = document.getElementById('screen-loading');
          s.className = 'loading-screen' + (cls ? ' ' + cls : '');
          s.style.setProperty('--wc', c);
          document.getElementById('loading-world').textContent = 'DÜNYA 1 · SOLGUN MEZARLIK';
          document.getElementById('loading-mission').textContent = 'GÖREV 1';
          document.getElementById('loading-obj').textContent = 'Tüm dalgaları sağ atlat';
          document.getElementById('loading-no').textContent = '1';
          document.getElementById('loading-stars').innerHTML = '<i class="on"></i><i></i><i></i>';
          document.getElementById('loading-fill').style.setProperty('--p', '0');
          document.getElementById('loading-bar').style.transform = 'scaleX(0)';
          document.getElementById('loading-pct').textContent = '0%';
          document.getElementById('loading-step').textContent = 'ARENA KURULUYOR';
          document.getElementById('loading-tip').textContent = 'Elit düşmanın adı değiştiricisini söyler: kalkanlı, bölünen, patlayan…';
        }, [c, ST[k]]);
        await A.wait(60);
        await A.layers({ sel: '#screen-loading', name: 'gate_' + k + '_' + c.slice(1).toLowerCase(), stretch: 100 });
      }
    }
    await A.eval(() => document.getElementById('screen-loading').classList.add('hidden'));
  },
};

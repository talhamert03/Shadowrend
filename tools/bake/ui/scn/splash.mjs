/* AÇILIŞ EKRANI (#splash, v42 GÖK KALESİ) — logo · kızıl ay · ada sanatları · bulut/sis/kor
   + alttaki yükleme bloğu (ipucu, çubuk, yüzde, durum). Açılış bitince DOM'dan silindiği için
   index.html'den yeniden eklenir. Godot: assets/ui/lyr/splash.json (CSS animasyonları canlı oynar;
   ipucu/yüzde/durum metni ve dolum genişliği çalışma anında yazılır). */
export default {
  async run(A) {
    await A.eval(async () => {
      const old = document.getElementById('splash');
      if (old) old.remove();
      const html = await (await fetch('/game/index.html')).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const sp = doc.getElementById('splash');
      sp.querySelectorAll('script').forEach((s) => s.remove());
      const el = document.importNode(sp, true);
      el.classList.remove('gone');
      document.body.appendChild(el);
      el.querySelectorAll('img').forEach((a) => a.classList.add('on'));
      document.getElementById('splash-tip').textContent = 'Aynı anda tek sandık çözülür; sırayı akıllı seç.';
      document.getElementById('splash-fill').style.width = '0%';
      document.getElementById('splash-pct').textContent = '0%';
      document.getElementById('splash-step').textContent = 'HAZIRLANIYOR…';
      await Promise.all([...el.querySelectorAll('img')].map((a) => a.decode().catch(() => {})));
    });
    await A.wait(2600);            // giriş animasyonları (logo, adalar) otursun
    await A.layers({ sel: '#splash', name: 'splash', stretch: 100 });
  },
};

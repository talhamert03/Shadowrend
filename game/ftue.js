/* ═══════════ ftue.js — İLK 10 DAKİKA (v54 E1, 2026-09-28) ═══════════
   Yeni oyuncu ilk ekranda beş sekme, dört para birimi, dokuz sistem görüyordu.
   İki parça:
   1) SEKME KİLİDİ — menü, oyuncu ilerledikçe açılır. Eşikler temizlenen
      görev sayısıyla (progress toplamı, ayrı sayaç YOK):
        MAĞAZA 0 (hep açık) · KUŞANIM 1 · KAHRAMAN 2 · ETKİNLİK 3.
      Eski oyuncu zaten eşiğin üstünde → hiçbir şey kilitlenmez.
      Yeni açılan sekme bir kez "YENİ" rozeti + nabız taşır (meta.ftueSeen).
   2) SAVAŞ KOÇU — yalnız İLK görevde (D1-G1, hiç temizlenmemiş): dokunmayı
      ENGELLEMEYEN ipucu plakası. Adımlar olayla ilerler, süreyle değil:
        move  → 260 birim yürüyünce  · auto → ilk 6 kıyımda
        level → ilk kart ekranında (kartların üstünde) · done
      Görev bitince meta.ftue = 1; bir daha görünmez. */

/* v73 (kullanıcı): yeni oyuncuya KİLİT YOK — tüm sekmeler baştan açık. */
export const TAB_REQ = { magaza: 0, cephane: 0, kahraman: 0, etkinlik: 0 };
const TAB_NAME = { cephane: 'KUŞANIM', kahraman: 'KAHRAMAN', etkinlik: 'ETKİNLİK' };

export const Ftue = {
  /* v54b: ilerleme SIRALI DEĞİL (dünya atlamalı kayıtlar var) — nextMission ilk
     boşluğu verir, sayımı değil. Temizlenen görev = progress toplamı. */
  cleared(g) {
    let n = 0;
    for (const k in g.progress) n += g.progress[k] | 0;
    return n;
  },
  locked(g, page) { return (TAB_REQ[page] || 0) > this.cleared(g); },
  lockMsg(page) {
    const n = TAB_REQ[page] || 0;
    return TAB_NAME[page] + ' · ' + n + '. GÖREVİ BİTİRİNCE AÇILIR';
  },
  /** Menü her tazelendiğinde: kilit sınıfı + yeni açılan sekmede rozet. */
  paintNav(g) {
    const seen = (g.meta.ftueSeen = g.meta.ftueSeen || {});
    const c = this.cleared(g);
    document.querySelectorAll('.dock .dk-tab').forEach((b) => {
      const p = b.getAttribute('data-page');
      if (!(p in TAB_REQ) || !TAB_REQ[p]) return;
      const lk = TAB_REQ[p] > c;
      b.classList.toggle('locked', lk);
      b.setAttribute('aria-disabled', lk ? 'true' : 'false');
      b.classList.toggle('fresh', !lk && !seen[p] && c <= 6);
    });
  },
  visit(g, page) {
    if (!(page in TAB_REQ)) return;
    const seen = (g.meta.ftueSeen = g.meta.ftueSeen || {});
    if (!seen[page]) { seen[page] = 1; g.saveMeta(); }
    const b = document.querySelector('.dock .dk-tab[data-page="' + page + '"]');
    if (b) b.classList.remove('fresh');
  },

  /* ── savaş koçu ── */
  step: '', _d: 0, _px: 0, _py: 0, _k0: 0, _el: null, _t: 0,
  begin(g) {
    this.step = '';
    if (g.meta.ftue || g.towerRun || g.sealRun || this.cleared(g) > 0 || g.worldId !== 1 || g.missionId !== 1) { this._show(''); return; }
    this.step = 'move'; this._d = 0; this._t = 0;
    this._px = g.player.x; this._py = g.player.y; this._k0 = g.kills;
    this._show('move');
  },
  update(g, dt) {
    if (!this.step || this.step === 'level' || this.step === 'done') return;
    this._t += dt;
    const p = g.player;
    if (this.step === 'move') {
      const st = Math.hypot(p.x - this._px, p.y - this._py);
      if (st < 60) this._d += st;          // doğuş ışınlaması sayılmaz
      this._px = p.x; this._py = p.y;
      if (this._d > 260) { this.step = 'auto'; this._k0 = g.kills; this._show('auto'); }
    } else if (this.step === 'auto') {
      if (g.kills - this._k0 >= 6 || this._t > 40) { this.step = 'wait'; this._show(''); }
    }
  },
  onLevelUp(g) {
    if (this.step !== 'wait' && this.step !== 'auto') return;
    this.step = 'level';
    this._show('level');
  },
  onLevelPicked(g) {
    if (this.step !== 'level') return;
    this.step = 'done';
    this._show('chest');
    setTimeout(() => { if (this.step === 'done') this._show(''); }, 4200);
  },
  finish(g) {
    if (this.step) { g.meta.ftue = 1; g.saveMeta(); }
    this.step = ''; this._show('');
  },
  _show(kind) {
    let el = this._el;
    if (!el) {
      el = document.createElement('div');
      el.className = 'ftue';
      el.setAttribute('aria-live', 'polite');
      el.innerHTML = '<div class="ft-plate"><span class="ft-k"></span><b class="ft-t"></b></div><i class="ft-hand"></i>';
      (document.getElementById('app') || document.body).appendChild(el);
      this._el = el;
    }
    const T = {
      move:  ['İLK ADIM', 'EKRANI SÜRÜKLE, HAREKET ET'],
      auto:  ['SALDIRI OTOMATİK', 'SEN YALNIZ YÖNÜ SEÇ · SÜRÜYÜ KES'],
      level: ['SEVİYE ATLADIN', 'BİR RÜN SEÇ · HER SEVİYE GÜÇLENDİRİR'],
      chest: ['İPUCU', 'GÜMÜŞ SANDIKLARA YÜRÜ · KENDİLİĞİNDEN AÇILIR'],
    }[kind];
    if (!T) { el.className = 'ftue'; return; }
    el.querySelector('.ft-k').textContent = T[0];
    el.querySelector('.ft-t').textContent = T[1];
    el.className = 'ftue on ' + kind;
  },
};

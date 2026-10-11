/* ═══════════════════════════════════════════════════════════
   pool.js — Nesne Havuzu (Object Pooling)

   Amaç: Oyun sırasında SIFIR nesne tahsisi (allocation).
   Mermiler, düşmanlar, XP cevherleri, partiküller ve hasar
   yazıları önceden yaratılır; ölünce çöpe gitmez, havuza döner.
   Böylece GC (çöp toplayıcı) devreye girip kare düşürmez.

   Teknik notlar:
   • Aktif liste "swap-remove" ile O(1) silme yapar: silinen
     elemanın yerine listenin son elemanı taşınır.
   • Bu sayede GERİYE DOĞRU iterasyon sırasında eleman silmek
     tamamen güvenlidir (sondan gelen eleman zaten işlenmiştir).
   • __pi alanı, nesnenin aktif listedeki indeksini tutar;
     çifte-serbest-bırakma (double release) koruması sağlar.
   ═══════════════════════════════════════════════════════════ */

export class Pool {
  /**
   * @param {string}   name        Hata ayıklama için havuz adı
   * @param {Function} factory     Yeni boş nesne üreten fonksiyon
   * @param {Function} reset       obtain() sırasında nesneyi kurar: reset(obj, ...args)
   * @param {number}   initialSize Önceden ısıtılacak (pre-warm) nesne sayısı
   */
  constructor(name, factory, reset, initialSize = 64) {
    this.name = name;
    this.factory = factory;
    this.reset = reset;

    /** Kullanıma hazır boş nesneler (yığın). */
    this.idle = [];
    /** Şu an sahnede yaşayan nesneler. */
    this.active = [];
    /** Toplam üretilen nesne (profil için). */
    this.created = 0;

    for (let i = 0; i < initialSize; i++) {
      this.idle.push(this.factory());
      this.created++;
    }
  }

  /** Havuzu en az n nesneye kadar önceden doldur.
      NEDEN: havuz yetmediğinde obtain() yeni nesne YARATIR — ve bu tam
      olarak sahnenin en kalabalık olduğu anda olur (boss dalgası,
      patlama fırtınası). Yani tahsis + GC duraklaması, oyuncunun en çok
      akıcılık beklediği saniyede gelir. Cihazın CANLI bütçesi kadarını
      açılışta, oyuncu açılış ekranını beklerken yaratıyoruz. */
  prewarm(n) {
    while (this.created < n) { this.idle.push(this.factory()); this.created++; }
    return this;
  }

  /** Havuzdan bir nesne al, reset ile kur ve aktif listeye ekle. */
  obtain(a, b, c, d, e, f, g, h, i, j) {
    let obj;
    if (this.idle.length > 0) {
      obj = this.idle.pop();
    } else {
      obj = this.factory();          // havuz doluysa büyüt (yalnızca ilk dalgalarda olur)
      this.created++;
    }
    obj.__pi = this.active.length;
    this.active.push(obj);
    this.reset(obj, a, b, c, d, e, f, g, h, i, j);
    return obj;
  }

  /** Nesneyi sahneden düşür ve havuza iade et. O(1). */
  release(obj) {
    const idx = obj.__pi;
    const act = this.active;
    if (idx === undefined || act[idx] !== obj) return;   // çifte iade koruması

    const last = act.pop();
    if (last !== obj) {              // son elemanı boşalan yuvaya taşı
      act[idx] = last;
      last.__pi = idx;
    }
    obj.__pi = undefined;
    this.idle.push(obj);
  }

  /**
   * Tüm aktif nesneleri geriye doğru gezer.
   * fn nesne için TRUE dönerse nesne aynı anda havuza iade edilir.
   * Sıcak döngülerde closure maliyetini önlemek için ekstra
   * parametreler fn'e aynen geçirilir.
   */
  updateEach(fn, p1, p2) {
    const act = this.active;
    for (let i = act.length - 1; i >= 0; i--) {
      const o = act[i];
      if (fn(o, p1, p2) === true) this.release(o);
    }
  }

  /** Yalnızca gezinme (silme yok). Render döngüleri için. */
  each(fn, p1, p2) {
    const act = this.active;
    for (let i = 0; i < act.length; i++) fn(act[i], p1, p2);
  }

  /** Sahnedeki her şeyi temizle (yeni oyun / menüye dönüş). */
  releaseAll() {
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.release(this.active[i]);
    }
  }

  get count() { return this.active.length; }
}

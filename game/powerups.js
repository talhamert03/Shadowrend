/* ═══════════════════════════════════════════════════════════
   powerups.js — DÜŞMANDAN DÜŞEN GÜÇLER

   Kullanıcı seçimi: MIKNATIS · CAN · KALKAN · DONDURMA.
   "Oyuncuyu biraz daha rahatlatır" — yani bunlar dps değil NEFES
   verir. Hepsi ANINDA etkilidir (envanter yok, tuş yok): 4000 px'lik
   sahada koşarken menü açmak nefes kesmenin tam tersidir.

   ── TASARIM SÖZLEŞMESİ ────────────────────────────────────
   1. DÜŞÜŞ ORANI DÜŞÜK VE TAVANLI. Sürekli düşen bir güç, gücün kendisi
      olmaktan çıkıp temel oyun hızına dönüşür ve denge revizyonundaki
      (CLAUDE.md) bütün dps ölçümlerini yalanlar. Aynı anda sahada en
      fazla `MAX_LIVE` toplanabilir durur.
   2. ETKİ SÜRELERİ ÇAKIŞMAZ, TAZELENİR. İkinci bir dondurma süreyi
      uzatır; iki ayrı sayaç tutulmaz (tek kaynak).
   3. DONDURMA SİMÜLASYONU DURDURMAZ — düşmanı durdurur. Kare döngüsünü
      dondurmak (oyunun `freeze` alanı) girdiyi de dondurur; oyuncu
      "oyun kilitlendi" sanır. Zaman durması oyuncunun HAREKET ETTİĞİ,
      düşmanın donduğu andır.
   4. GÖRSEL DİL 2D KATMANDA. Cevher ve kalp de orada çizilir (main.render);
      yeni 3B mesh/doku YOK, yeni çizim çağrısı YOK.
   5. SICAK DÖNGÜDE TAHSİS YOK: havuzdan gelir, `hexOf` benzeri sabit
      renk dizgileri modül düzeyinde tanımlıdır.
   ═══════════════════════════════════════════════════════════ */

export const PU = {
  magnet: { col: '#5ad2ff', dim: 'rgba(90,210,255,0.28)', glyph: 'U', dur: 10,  label: 'MIKNATIS' },
  heal:   { col: '#ff5a72', dim: 'rgba(255,90,114,0.28)', glyph: '+', dur: 0,   label: 'CAN' },
  shield: { col: '#ffd45a', dim: 'rgba(255,212,90,0.28)', glyph: 'O', dur: 7,   label: 'KALKAN' },
  freeze: { col: '#a8e8ff', dim: 'rgba(168,232,255,0.28)', glyph: '*', dur: 3.6, label: 'DONDURMA' },
};

/* MIKNATIS ÇEKİM ÇARPANI: 10 saniye boyunca toplama yarıçapı bu kadar
   büyür. Kullanıcı isteği "10 saniyeliğine yüksek xp çekim gücü".
   4,5 seçildi çünkü oyuncu yarıçapı ~150-260 px bandında; ×4,5 ekranın
       yarısını kapsıyor, yani "her şey bana akıyor" okunur ama haritanın
   öbür ucundaki yakutu çekip yolculuğu anlamsız kılmaz. */
export const MAGNET_MUL = 4.5;

const KINDS = ['magnet', 'heal', 'shield', 'freeze'];
/* Ağırlıklar: can en sık (en az "güç", en çok nefes), dondurma en seyrek
   (en güçlü etki). Eşit dağıtım dondurmayı sıradanlaştırırdı. */
const WEIGHTS = [0.26, 0.34, 0.22, 0.18];
const MAX_LIVE = 7;
const DROP_CHANCE = 0.021;      // düşman başına
const ELITE_CHANCE = 0.16;      // elit/boss başına

export class PowerupManager {
  constructor(game) {
    this.game = game;
    this.magnetT = 0;
    this.shieldT = 0;
    this.freezeT = 0;
    this._lastBanner = '';
  }

  reset() {
    this.magnetT = this.shieldT = this.freezeT = 0;
  }

  /** Düşman öldüğünde: düşecek mi? */
  roll(x, y, elite) {
    const pool = this.game.pools.powerups;
    if (!pool || pool.count >= MAX_LIVE) return;
    const ch = elite ? ELITE_CHANCE : DROP_CHANCE;
    if (Math.random() > ch) return;
    let r = Math.random(), k = 0;
    for (let i = 0; i < WEIGHTS.length; i++) { r -= WEIGHTS[i]; if (r <= 0) { k = i; break; } }
    /* CAN TAM DOLUYSA CAN DÜŞMEZ: yerde duran ve hiçbir işe yaramayan bir
       ödül, ödül sisteminin kendisini değersizleştirir — kalkana çevrilir. */
    if (KINDS[k] === 'heal' && this.game.player.hp > this.game.player.maxHp * 0.92) k = 2;
    pool.obtain(x, y, KINDS[k]);
  }

  /** Oyuncu topladı. */
  collect(kind) {
    const g = this.game, p = g.player;
    const d = PU[kind];
    if (kind === 'heal') {
      p.heal(Math.max(12, Math.round(p.maxHp * 0.26)));
    } else if (kind === 'magnet') {
      /* 10 sn boyunca geniş çekim + sahadaki her şeyi ANINDA çağır.
         İkisi birlikte: anında çekim ödülün ne olduğunu gösterir, süre
         onu bir GÜÇ yapar (yalnız anında çekseydi "bir kere parladı"
         diye okunurdu). */
      this.magnetT = Math.max(this.magnetT, d.dur);
      g.pools.gems.each((o) => { o.pull = true; });
      g.pools.hearts.each((o) => { o.pull = true; });
    } else if (kind === 'shield') {
      this.shieldT = d.dur;                // tazelenir, üst üste binmez
    } else if (kind === 'freeze') {
      this.freezeT = d.dur;
    }
    g.spawnBurst(p.x, p.y, d.col, 20, 210, 3.4, 0.55, true);
    if (g.renderer3d && g.renderer3d.spawnHit) g.renderer3d.spawnHit(p.x, p.y, 0, 1, 1, 1, 1);
    if (g.audio) g.audio.play(kind === 'heal' ? 'heal' : 'levelup');
    if (g.ui && g.ui.powerupFlash) g.ui.powerupFlash(kind);
  }

  update(dt) {
    if (this.magnetT > 0) {
      this.magnetT -= dt;
      /* süre boyunca yeni düşen yakutlar da çekilsin: "yüksek çekim gücü"
         etkin olduğu sürece ÖLDÜRDÜĞÜN düşmanların yakutu da akmalı,
         yoksa güç yalnız geçmişi topluyor gibi hissedilir. */
      const P = this.game.pools;
      P.gems.each((o) => { o.pull = true; });
      P.hearts.each((o) => { o.pull = true; });
    }
    if (this.shieldT > 0) this.shieldT -= dt;
    if (this.freezeT > 0) {
      this.freezeT -= dt;
      if (this.freezeT <= 0 && this.game.audio) this.game.audio.play('thaw');
    }
  }

  /** Kalkan hasarı yutar mı? Player.takeDamage buradan sorar. */
  absorbs() { return this.shieldT > 0; }
  /** Düşman hareketi/atışı donuk mu? enemyManager buradan sorar. */
  frozen() { return this.freezeT > 0; }
  /** Toplama yarıçapı çarpanı — updateGems/updateHearts buradan sorar. */
  magnetMul() { return this.magnetT > 0 ? MAGNET_MUL : 1; }
}

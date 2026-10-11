/* ═══════════════════════════════════════════════════════════
   combat.js — Hasar Hesabı ve Vuruş Hissi (Game Feel)

   Tüm silahlar düşmana buradan vurur; tüm düşmanlar oyuncuya
   buradan vurur. Böylece kritik, zırh, hit-stop, sarsıntı, kan
   ve hasar yazıları TEK yerde, tutarlı yaşar.

   Hit-stop tasarım notu: 500 düşmanlı ekranda HER vuruş oyunu
   dondursaydı oyun sürekli donuk kalırdı. Çözüm: normal vuruş
   donmaları 0.22 sn'lik gaz kelebeğinden (throttle) geçer;
   kritikler ve boss vuruşları kelebeği deler — her kritik TAM
   ağırlığıyla hissedilir. Ultra Blade'in sırrı budur.
   ═══════════════════════════════════════════════════════════ */

import { FX, COLORS } from './config.js?v=20260930m';
import { Haptics } from './perf.js?v=20260930m';

/* ── v39 VURUŞ HİSSİ (2026-09-23) ─────────────────────────────────────
   config.js'e BİLEREK konmadı: config ~30 modülün içe aldığı dosya ve
   içeriği değişen her modülün eki aynı turda artmak zorunda (v33c). Bu
   sayılar yalnız combat/main/render3d tarafından okunur.

   ① YEREL İSABET DONMASI (hit-pause). Küresel hit-stop 2026-08-10'da
     kaldırıldı ve o karar DOĞRU: dünyayı dondurmak girdiyi de dondurur.
     Burada donan dünya değil, yalnız VURULAN GÖVDENİN POZU: animasyon
     saati 45-85 ms durur, ezilme tepe değerinde tutulur, sonra yayla
     bırakılır. Simülasyon (konum, hız, hasar) HİÇ durmaz — denge
     tezgahının ölçtüğü hiçbir sayı değişmez. `stopCd` aynı gövdenin
     hızlı silah altında sürekli donuk kalmasını engeller (ölçüldü: en çok %21,5).
   ② BİRLEŞEN SAYILAR. Aynı düşmana 0,42 sn içinde gelen sıradan vuruşlar
     yeni yazı açmaz, mevcut sayıya eklenir ve yeniden zıplar: kalabalıkta
     ekran sayı yağmurundan kurtulur, oyuncu toplam gücünü okur.
   ③ YÖNLÜ TEKME. Kritik kamerayı rastgele değil darbe yönünde itip yayla
     geri getirir (main.addKick) — travma sarsıntısının üstüne biner. */
export const FEEL = {
  stopHit: 0.045, stopCrit: 0.085, stopBoss: 0.03, stopCd: 0.22,
  squashHit: 0.15, squashCrit: 0.21,
  mergeWin: 0.42, mergeMaxSize: 19,
  kickCrit: 2.6, kickHurt: 4.2,
};

const BLOOD = '#a31226';        // koyu kan
const BLOOD_DARK = '#6e0b18';

let lastStop = -10;             // son hit-stop zamanı (oyun saati)

/** Yeni koşu başında throttle saatini sıfırla. */
export function resetFeel() {
  lastStop = -10;
}

/**
 * Kritik + varyans + küresel hasar çarpanıyla nihai hasarı hesaplar.
 * @returns {{dmg:number, crit:boolean}}
 */
export function rollDamage(game, base, extraCrit = 0) {
  const p = game.player;
  const crit = Math.random() < p.critChance + extraCrit;
  let d = base * p.dmgMult * (0.92 + Math.random() * 0.16);
  if (crit) d *= p.critMult;
  return { dmg: Math.max(1, Math.round(d)), crit };
}

/**
 * Bir düşmana vuruş uygular: hasar, beyaz flaş, geri tepme,
 * yüzen sayı, kan sıçraması, hit-stop, sarsıntı ve ses.
 *
 * @param {object}  game      Oyun referansı
 * @param {object}  e         Düşman
 * @param {number}  base      Temel hasar
 * @param {number}  angle     Vuruş yönü (radyan) — kan bu yöne sıçrar
 * @param {number}  knock     Geri tepme kuvveti
 * @param {number}  extraCrit Silaha özgü ek kritik şansı
 * @param {boolean} silent    true → DoT tıkları için sessiz mod
 *                            (yazı/ses/donma yok, sadece hasar+flaş)
 */
export function applyHit(game, e, base, angle = 0, knock = 0, extraCrit = 0, silent = false) {
  if (e.hp <= 0) return null;              // zaten ölmüş (aynı karede çoklu vuruş)

  if (e.entryT > 0) return null;           // v53 C1: boss girişi sırasında hasar yok
  const r = rollDamage(game, base, extraCrit);
  e.lastCrit = r.crit;                     // v56 B1: ölüm kademesi
  /* BOSS ZAYIF ANI (v44): faz geçişinde boss sendeler, gelen hasar ×1,5. */
  if (e.weakT > 0) r.dmg = Math.round(r.dmg * 1.5);
  /* v53 D5 KALKANLI: kalkan hasarın %70'ini yutar, kırılınca normal */
  if (e.shieldHp > 0) {
    const ab = Math.min(e.shieldHp, r.dmg * 0.7);
    e.shieldHp -= ab; r.dmg = Math.max(1, Math.round(r.dmg - ab));
    if (e.shieldHp <= 0 && game.inView && game.inView(e.x, e.y, 40)) {
      game.spawnBurst(e.x, e.y, '#9fb4c9', 12, 220, 2.6, 0.45, true);
      game.spawnText(e.x, e.y - e.radius - 20, 'KALKAN KIRILDI', '#cfd6e2', 12, true);
      game.audio.play('shieldbreak');
    }
  }
  e.regenT = 0;
  e.hp -= r.dmg;
  e.flash = FX.hitFlashTime;
  /* SON DARBENİN YÖNÜ SAKLANIR (2026-08-29): ölüm patlamasının yerine gelen
     ceset çöküşü bu açıya devrilir ve model vuruş yönünde geri sekerek
     ezilir (render3d._driveModelGroup → hitSquash). Eskiden `hurtAng`
     hiçbir yerde YAZILMIYORDU, yani ölüm mührü her zaman açı 0 ile
     çiziliyordu — "vuruş nereden geldi" bilgisi sessizce kayıptı. */
  e.hurtAng = angle;
  /* İSABET EZİLMESİ: 0,14 sn'lik kısa darbe zamanı. Modelin üzerine bir
     sıkışma + geri tepme olarak biner (poz değil, ÖLÇEK ve KONUM) — premium
     aksiyon oyunlarında "etli" vuruş hissinin asıl kaynagı budur ve hiçbir
     yeni çizim çağrısı istemez. */
  e.hitT = e.hitD = r.crit ? FEEL.squashCrit : FEEL.squashHit;
  /* yara animasyonunu yalnız bitmişse yeniden başlat — hızlı silahlarda
     sürekli ilk kareye sıfırlanıp "takılıyor" gibi görünüyordu */
  if (!(e.hurtT > 0)) e.hurtT = 0.26;

  if (knock > 0) {
    const k = knock * e.knockRes;
    e.kx += Math.cos(angle) * k;
    e.ky += Math.sin(angle) * k;
  }

  /* can çalma — verilen hasarın oranı kadar (sessiz) */
  if (game.player.lifeSteal > 0) game.player.drain(r.dmg);

  if (silent) return r;

  /* ① yerel isabet donması — yalnız poz, simülasyon değil (bkz. FEEL) */
  /* v70 A1: SİLAH AĞIRLIĞI. Geri tepme silahın ağırlığını taşır (kılıç/top
     yüksek, sapan/tabanca düşük) → donma süresi ondan türer. Ağır vuruş ve
     kritikte gövde yalnız pozda değil ADIMDA da durur (e.stopMv, enemyManager
     hareketi %20'ye indirir); hafif silah hiç durdurmaz — hızlı silah altında
     sürü yavaşlamasın (denge). Oyuncu/girdi/diğer düşmanlar hiç durmaz. */
  if (!(e.stopCd > 0)) {
    const wK = knock >= 220 ? 1.4 : (knock > 0 && knock <= 60 ? 0.6 : 1);
    e.stopT = e.isBoss ? FEEL.stopBoss : (r.crit ? FEEL.stopCrit : FEEL.stopHit) * wK;
    e.stopMv = !e.isBoss && (r.crit || wK > 1);
    e.stopCd = FEEL.stopCd;
  }

  /* ── Yüzen hasar yazısı (② birleşen sayılar) ── */
  const tx = e.x + (Math.random() - 0.5) * 12;
  const ty = e.y - e.radius - 6;
  if (r.crit) {
    game.spawnText(tx, ty, String(r.dmg), COLORS.gold, 21, true, angle);
  } else {
    const o = e.txt;
    if (o && o.owner === e && o.__pi !== undefined && !o.crit &&
        game.time - e.txtT < FEEL.mergeWin) {
      o.val += r.dmg;
      o.str = String(o.val);
      o.pt = 0; o.pk = 1.3;
      o.life = Math.max(o.life, o.max * 0.8);
      if (o.size < FEEL.mergeMaxSize) o.size += 0.7;
      if (o.y > ty) o.y = ty;
    } else {
      const t = game.spawnText(tx, ty, String(r.dmg), COLORS.bone, 13, false, angle);
      if (t) { t.owner = e; t.val = r.dmg; }
      e.txt = t;
    }
    e.txtT = game.time;
  }

  /* ── 3B İSABET FLAŞI (tüm silahlar için ORTAK) ──
     Vuruşun 3B'de izi yoktu: yalnız kan spreyi ve yazı vardı, dolayısıyla
     sahnede iyi görünen tek şey üç imza yeteneğiydi. Renk dili yetenek
     renklerinden ayrı: hasar sıcak beyaz, kritik altın (bkz.
     render3d._buildImpactFx). Sarsıntı EKLENMEZ — rutin olay kamerayı
     sarsmaz (CLAUDE.md sarsıntı politikası).

     GÖRÜŞ ALANI KAPISI zorunlu: kalabalık dalgada ekran dışında da onlarca
     isabet olur ve her biri halka tamponundan bir yuva alır — yani
     oyuncunun GÖRDÜĞÜ vuruşlar, görmediği vuruşlar tarafından tampondan
     atılır. Ölçüt "çizim maliyeti" değil, geri bildirimin doğruluğudur. */
  if (game.renderer3d && game.renderer3d.spawnHit && game.inView(e.x, e.y, 60)) {
    if (r.crit) game.renderer3d.spawnHit(e.x, e.y, angle, e.isBoss ? 2 : 1, 1, 0.80, 0.34);
    else game.renderer3d.spawnHit(e.x, e.y, angle, 0, 1, 0.90, 0.74);
  }

  /* ── KIVILCIM ÇİPİ (2026-08-29) ──
     Vuruş hissini yükseltmenin en ucuz ikinci adımı: darbe doğrultusunda
     dar bir koni içinde fırlayan 2-3 minik kıvılcım. Patlama DEĞİL (dairesel
     değil, yönlü) ve additive; ölen düşmanın yukarı süzülen zerresiyle
     karışmaz — biri "değdi", diğeri "bitti" der. */
  if (!e.isBoss && game.inView(e.x, e.y, 60)) {
    const n = r.crit ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * 0.7;
      const sp = 150 + Math.random() * 190;
      game.pools.particles.obtain(e.x, e.y + 2, Math.cos(a) * sp, Math.sin(a) * sp - 40,
        0.16 + Math.random() * 0.1, r.crit ? 2.2 : 1.7,
        r.crit ? '#ffe9a8' : '#fff4dc', 0.86, 40, true);
    }
  }

  /* ── Kan ve kıvılcım ── */
  game.spawnSpray(e.x, e.y, angle, BLOOD, r.crit ? 10 : 5, r.crit ? 250 : 170);
  if (r.crit) {
    game.spawnBurst(e.x, e.y, '#ffe9a8', 6, 220, 2, 0.3, true);   // altın kıvılcım (additive)
    game.spawnSpray(e.x, e.y, angle, BLOOD_DARK, 5, 130);
  }

  /* ── Hit-Stop & Screen Shake ──
     Normal vuruşlar ASLA donmaz — 500 düşmanlı ekranda sürekli
     mikro-donma "takılma" hissi yaratıyordu (mobil şikayeti).
     Yalnız kritikler ve boss vuruşları donar; her kritik TAM
     ağırlığıyla hissedilir. */
  if (r.crit) {
    game.hitStop(e.isBoss ? FX.bossHitStopMs : FX.critStopMs);
    game.addShake(FX.shakeCrit);
    if (game.addKick) game.addKick(angle, FEEL.kickCrit);
    /* GÖSTERİ: kritik yıldızı + halka. Tek çağrı noktası (bkz. main.fxImpact
       kural ①) — dokuz karakterin hepsi buradan geçer. */
    game.fxImpact(e.x, e.y, angle, 1);
    lastStop = game.time;
    game.audio.play('crit');
    /* HAPTİK — bir web sayfasını "uygulama" gibi hissettiren en ucuz tek şey.
       Yalnız kritikte: her vuruşta titretmek kolu yorar ve pili yer
       (perf.js'te ayrıca 55 ms hız sınırı var). */
    Haptics.fire('crit');
  } else {
    if (game.time - lastStop > 0.3) {
      game.addShake(FX.shakeHit);          // hafif sarsıntı, donma yok
      lastStop = game.time;
    }
    game.audio.play('hit');
  }

  return r;
}

/**
 * Oyuncuya hasar uygular: zırh düşülür, dokunulmazlık açılır,
 * kızıl vinyet çakar, ekran sarsılır.
 */
export function damagePlayer(game, raw, sx, sy) {
  const p = game.player;
  if (p.invuln > 0 || game.state !== 'playing' || !(raw > 0)) return;

  /* sıyrılma: hasarı tamamen atlat */
  if (p.dodge > 0 && Math.random() < p.dodge) {
    p.invuln = 0.25;
    game.spawnText(p.x, p.y - 26, 'SIYRILDI', COLORS.spirit, 15, false);
    game.audio.play('dodge');
    return;
  }

  /* KALKAN (düşen güç): hasarı TAMAMEN yutar ve süresi boyunca yutmaya
     devam eder. Kısmi azaltma değil, çünkü ödülün ne yaptığı ANINDA
     okunmalı — "%40 daha az hasar aldım" ekranda görünmez, "hiç hasar
     almadım" görünür. Sıyrılmadan SONRA, dokunulmazlıktan ÖNCE: kalkan
     dokunulmazlık penceresi açmaz, yoksa tek kalkan bütün bir dalgayı
     bedava geçirirdi. */
  if (game.powerups && game.powerups.absorbs()) {
    game.spawnText(p.x, p.y - 26, 'KALKAN', '#ffd45a', 15, false);
    game.spawnBurst(p.x, p.y, '#ffd45a', 8, 130, 2.6, 0.32, true);
    game.audio.play('block');
    return;
  }

  const dmg = Math.max(1, Math.round(raw) - p.armor);
  p.hp -= dmg;
  p.invuln = p.invulnTime;
  p.hurtT = 0.34;                    // yara sprite animasyonu

  game.ui.hurtFlash();
  game.addShake(FX.shakeHurt);
  /* v70 A6: kaynak biliniyorsa ekranın o kenarında kızıl yay + tekme kaynaktan
     UZAĞA; bilinmiyorsa eski davranış (yürüyüşün tersi). */
  const hasSrc = sx !== undefined;
  const srcA = hasSrc ? Math.atan2(sy - p.y, sx - p.x) : 0;
  if (hasSrc && game.ui.hurtDir) game.ui.hurtDir(srcA);
  if (game.addKick) game.addKick(hasSrc ? srcA + Math.PI : (p.facing || 0) + Math.PI, FEEL.kickHurt);
  Haptics.fire('hurt');
  game.audio.play('hurt');
  game.spawnText(p.x, p.y - 26, '-' + dmg, COLORS.blood, 17, true);
  game.spawnBurst(p.x, p.y, BLOOD, 9, 170, 2.6, 0.4, false);

  if (p.hp <= 0) {
    p.hp = 0;
    game.gameOver();
  }
}

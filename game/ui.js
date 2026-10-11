/* ═══════════════════════════════════════════════════════════
   ui.js — Arayüz Katmanı (Oyun Evi v3)

   DOM'a yalnızca burada dokunulur. Ana ekran 5 sekmeli bir
   "oyun evi": MAĞAZA · CEPHANE · SAVAŞ (ortada, ev) ·
   KAHRAMAN · DÜNYA. Savaş sayfasının ortasında yaşayan dünya
   diyoraması (önbellekli canvas) durur; dokununca dikey
   kaydırmalı YOLCULUK HARİTASI açılır (tüm dünyalar üst üste).
   HUD güncellemeleri önbelleklidir — değer değişmediyse DOM'a
   YAZILMAZ.
   ═══════════════════════════════════════════════════════════ */

import { RARITIES, MODS, EQUIPMENT, EQUIP_SLOTS, WEAPONS, WEAPON_META, WEAPON_CLASSES,
         CHARACTERS, CHAR_RARITIES, DEFAULT_CHAR, PLAYER, STONE_PACKS, RUBY_EXCHANGE,
         SURVIVAL_MILESTONES, signaturePower, BATTLE_PASS, BATTLE_PASS_TIERS,
         GEAR_MAX_LEVEL, GEAR_CARD_REQ, GEAR_GOLD_COST, gearLevelMods, accountJourneyMilestones,
         signatureUnlocks, PASSIVES, charLevelMods } from './config.js?v=20260930m';
import { drawCharPortrait } from './player.js?v=20260930m';
import { WORLDS, MISSIONS_PER_WORLD, missionDef, missionReward, replayReward,
         worldUnlocked, worldCleared, missionUnlocked, nextMission } from './worlds.js?v=20260930m';
import { CHESTS, CHEST_SLOTS, fmtDur, PITY_N } from './chests.js?v=20260930m';
import { Clock } from './clock.js?v=20260930m';
import { ChestScene3D } from './chestScene3d.js?v=20260930m';
import { APP, Notify, platform } from './release.js?v=20260930m';
import { PRIVACY, KVKK, TERMS } from './legal.js?v=20260930m';
import { LANG, setLang } from './i18n.js?v=20260930m';
import { Backend } from './backend.js?v=20260930m';
import { playerId } from './vault.js?v=20260930m';
import { DAILY_STREAK, WEEKLY_QUESTS, WEEKLY_TIERS, WEEKLY_MAX_PTS,
         weekLeftMs } from './dailies.js?v=20260930m';
import { getDiorama, getJourneyBg } from './diorama.js?v=20260930m';
import { getClimbArt, climbLayout } from './skyMap.js?v=20260930m';
import { preloadIsles, warmIsleThumbs, isleDepthBelow } from './isleArt.js?v=20260930m';
import { GEAR_ART } from './gearArt.js?v=20260930m';
import { chestArt } from './chestArt.js?v=20260930m';
import { cardGlyph } from './cardArt.js?v=20260930m';
import { Haptics, Quality } from './perf.js?v=20260930m';
import { W as BAL_W } from './balance.js?v=20260930m';
import { Ledger, STAR_RULES, MASTERY_MAX } from './ledger.js?v=20260930m';
import { PerfLog } from './perfLog.js?v=20260930m';
import { ErrLog } from './errlog.js?v=20260930m';
import { Ftue } from './ftue.js?v=20260930m';
import { activeSets, GEAR_SETS } from './gearSets.js?v=20260930m';
import { Nightmare, nmBook, NM } from './nightmare.js?v=20260930m';
import { Calendar, SEAL_TIERS } from './calendar.js?v=20260930m';
import { EVOLUTIONS, TAGS, tagName } from './weapons.js?v=20260930m';
import { nextGoal, Daily, Ghost, SEASON, seasonWeek } from './journey.js?v=20260930m';
import { towerBook, floorDef, Tower } from './tower.js?v=20260930m';
import { ACH, Ach } from './achievements.js?v=20260930m';
import { Market } from './market.js?v=20260930m';
import { ULT_TIER, ULT_ID } from './ultimate.js?v=20260930m';

const STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2.4 L14.9 8.6 L21.6 9.3 L16.6 13.9 L18 20.6 L12 17.2 L6 20.6 L7.4 13.9 L2.4 9.3 L9.1 8.6 Z"/></svg>';


/* v24 (2026-09-04) — PİŞİRİLMİŞ KART PORTRELERİ GERİ ALINDI.
   Kullanıcı kararı: pfp2/pfp3/pfp4 turlarının hiçbiri beğenilmedi ("kırpılmış
   kaldılar"); ekran EN ESKİ hâline döner — kaynak illüstrasyon (HERO_ART) ve
   portresi olmayan kahramanda vektör çizim. Pişirilmiş setler diskte kalıyor
   (assets/portraits/pfp*), hiçbir yerden okunmuyor. */

/* Tam illüstrasyon (kullanıcı tarafından sağlanan PNG) olan kahramanlar —
   karakter inceleme ekranında vektör çizim yerine bu görsel + nefes alma
   animasyonu gösterilir. */
const HERO_ART = {
  sapanci: 'assets/portraits/sapanci_full.png?v=20260901t',
  okcu: 'assets/portraits/okcu_full.png?v=20260901t',
  seher: 'assets/portraits/seher_full.webp?v=20260901t',
  simsek: 'assets/portraits/simsek_full.png?v=20260901t',
  savasci: 'assets/portraits/savasci_full.png?v=20260901t',
  gokalev: 'assets/portraits/gokalev_full.png?v=20260901t',
  korsan: 'assets/portraits/korsan_full.webp?v=20260901t',
  kralice: 'assets/portraits/kralice_full.webp?v=20260901t',
  sovalye: 'assets/portraits/sovalye_full.webp?v=20260901t',
};
/* Büst kırpımı olan illüstrasyonlar (tam boy değil) — inceleme ekranında
   daha büyük gösterilir ki sahneyi doldursun.
   sapanci BURADA OLMAK ZORUNDA: kaynak render'da bacak yok, tam boy sanılırsa
   .cd-hero-img figürü kadrajdan taşırır. */
const HERO_ART_BUST = new Set(['sapanci', 'okcu', 'seher', 'simsek', 'savasci', 'gokalev', 'korsan', 'kralice']);

/* Kahraman portre/illüstrasyonlarını sayfa açılır açılmaz önden yükle —
   Kahramanlar sekmesine girildiğinde geç yüklenip "sonradan belirme"
   olmasın; tarayıcı önbelleğine alınır. */
for (const url of Object.values(HERO_ART)) { const im = new Image(); im.src = url; }

/* ═══════════ Vektör ikonlar — 24×24, currentColor ═══════════ */
const ICONS = {
  /* silahlar — v2 (yeni, kalın dolgulu kimlik) */
  kilic: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.2 L14.2 5 L13.1 14.4 L10.9 14.4 L9.8 5 Z"/><rect x="6.4" y="14.4" width="11.2" height="2.6" rx="1"/><rect x="10.8" y="17" width="2.4" height="4.6" rx="1"/><circle cx="12" cy="22.4" r="1.7"/></svg>',
  bicak: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.6 L14.9 10 L12 12.9 L9.1 10 Z"/><path d="M8.8 12.9 H15.2 L14.1 15 H9.9 Z"/><rect x="11" y="15" width="2" height="7.2" rx="1"/></svg>',
  kor: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.2 1.6 C 12.3 6.6 16.8 8 16.8 12.6 A 4.8 4.8 0 0 1 7.2 12.6 C 7.2 10.1 8.9 9 9.2 6.7 C 10.5 8.7 10.8 8.1 13.2 1.6 Z"/><ellipse cx="12" cy="20.8" rx="6.6" ry="1.7" opacity="0.35"/></svg>',
  yildirim: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.2 1.6 L4.8 13 H10.4 L8.2 22.4 L19.6 8.8 H12.8 Z"/></svg>',
  simsek: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.6 1.6 L5 12.6 H10.4 L7.6 22.4 L19 9.4 H12.6 Z"/><circle cx="4" cy="6" r="1.1"/><circle cx="20.5" cy="7.5" r="1"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 3.2 L13.4 4.9 L19.1 10.6 Z"/><rect x="1" y="10.8" width="20" height="2.6" rx="1.3" transform="rotate(45 12 12.1)"/></svg>',
  kure: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6.4"/><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.55"/><circle cx="9.6" cy="9.6" r="1.6" fill="#0b0e18" opacity="0.5"/><circle cx="19" cy="5" r="1.5"/><circle cx="4.5" cy="17.5" r="1.2"/></svg>',
  yay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 2 C 16 4.2 18 8.6 18 12 C 18 15.4 16 19.8 7.5 22"/><path d="M7.5 2 L7.5 22" stroke-width="1.5" opacity="0.85"/><path d="M3 12 L15.5 12" stroke-width="1.8"/><path d="M12 8.6 L15.5 12 L12 15.4" stroke-width="1.8"/></svg>',
  asa: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="10.8" y="11" width="2.4" height="11.4" rx="1.1"/><circle cx="12" cy="6.4" r="6"/><circle cx="12" cy="6.4" r="2.6" fill="#0b0e18" opacity="0.4"/></svg>',
  sopa: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="10.6" y="13" width="2.8" height="9.4" rx="1.3"/><path d="M12 0.6 L13.8 3.88 L17.54 3.8 L15.6 7 L17.54 10.2 L13.8 10.12 L12 13.4 L10.2 10.12 L6.46 10.2 L8.4 7 L6.46 3.8 L10.2 3.88 Z"/><circle cx="12" cy="7" r="1.6" fill="#0b0e18" opacity="0.4"/></svg>',
  tirpan: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.76 -1.33 A 11 11 0 0 1 20.01 15.31 L 17.14 13.3 A 7.5 7.5 0 0 0 13.57 1.95 Z"/><path stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none" d="M14 2 L2.4 22.8"/><path stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M8.6 17.4 L10.8 15.2"/></svg>',
  tabanca: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7 H19.6 V11 H13 L12 15 H9 L10 11 H7 V15 H4.2 A1.2 1.2 0 0 1 3 13.8 Z"/><rect x="19.4" y="8" width="2.8" height="2" rx="0.6"/></svg>',
  sacma: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2.6"/><circle cx="12.5" cy="7" r="1.8"/><circle cx="14.6" cy="12" r="1.8"/><circle cx="12.5" cy="17" r="1.8"/><circle cx="20" cy="4.8" r="1.3"/><circle cx="21" cy="12" r="1.3"/><circle cx="20" cy="19.2" r="1.3"/></svg>',
  bomba: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="10.8" cy="15" r="7"/><rect x="13" y="3.4" width="2.4" height="5.4" rx="1.2" transform="rotate(40 14.2 6.1)"/><circle cx="18.6" cy="4.2" r="1.7"/></svg>',
  bomb: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="10.8" cy="15" r="7"/><rect x="13" y="3.4" width="2.4" height="5.4" rx="1.2" transform="rotate(40 14.2 6.1)"/><circle cx="18.6" cy="4.2" r="1.7"/></svg>',

  /* pasif rünler */
  kalp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21 C 4 15 3 10 5.5 7 C 8 4.5 11 6 12 8 C 13 6 16 4.5 18.5 7 C 21 10 20 15 12 21 Z"/></svg>',
  cizme: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.6 2 H14.6 V12.2 L17.8 14.4 C 19.4 15.5 20.4 17.3 20.4 19.2 V20 H3.6 V16.4 C 3.6 14.9 4.3 13.5 5.5 12.6 L 8.6 10.4 Z"/><rect x="3.6" y="20" width="16.8" height="2" rx="0.9"/></svg>',
  miknatis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="5"/><path d="M12 3 V6 M4 6 L6.5 8 M20 6 L17.5 8"/></svg>',
  keskinlik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/><path d="M12 2 V7 M12 17 V22 M2 12 H7 M17 12 H22"/></svg>',
  zirh: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.6 L20.4 5.4 V11.8 C 20.4 17 16.6 20.6 12 22.4 C 7.4 20.6 3.6 17 3.6 11.8 V5.4 Z"/><path d="M12 4.6 V19.6 M8.2 8.6 L12 10.6 L15.8 8.6" fill="none" stroke="#0b0e18" stroke-width="1.4" opacity="0.45"/></svg>',
  guc: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L14.5 9 L22 9.5 L16 14 L18 21.5 L12 17 L6 21.5 L8 14 L2 9.5 L9.5 9 Z"/></svg>',
  heal: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 3 H14 V10 H21 V14 H14 V21 H10 V14 H3 V10 H10 Z"/></svg>',
  heal2: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 3 H14 V10 H21 V14 H14 V21 H10 V14 H3 V10 H10 Z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12 C 5 6 19 6 22 12 C 19 18 5 18 2 12 Z"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>',
  coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7 V17 M9.5 9.5 H14 A 2 2 0 0 1 14 13.5 H10 A 2 2 0 0 0 10 17.5 H14.5" stroke-width="1.6"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L14.6 8.6 L21.5 9.2 L16.2 13.8 L18 20.6 L12 16.8 L6 20.6 L7.8 13.8 L2.5 9.2 L9.4 8.6 Z"/></svg>',

  /* ── EŞYA GLİFLERİ v2 (kalın dolgulu, önceki oyundan tamamen farklı) ── */
  kolye: '<svg viewBox="0 0 24 24"><path d="M4 4 C 7 10.5 17 10.5 20 4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><path d="M12 10.5 L15 15 L12 20.5 L9 15 Z" fill="currentColor"/></svg>',
  yuzuk: '<svg viewBox="0 0 24 24"><path d="M9 6.5 L12 2 L15 6.5 Z" fill="currentColor"/><circle cx="12" cy="14.5" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  tilsim: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L19.5 6.4 V15.6 L12 20 L4.5 15.6 V6.4 Z"/><circle cx="12" cy="11" r="3" fill="#0b0e18"/></svg>',
  mum: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="8.8" y="9" width="6.4" height="12" rx="1.4"/><path d="M12 2.4 C 13.7 4.6 13.7 6.2 12 8.2 C 10.3 6.2 10.3 4.6 12 2.4 Z"/></svg>',
  pelerin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 C 8 4 6 9 5 21 L 9 18 L 12 21 L 15 18 L 19 21 C 18 9 16 4 12 2 Z"/></svg>',
  kese: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.6 5 L8 2.4 H16 L15.4 5 C 19 8 20 12 20 15 C 20 19 16.2 21 12 21 C 7.8 21 4 19 4 15 C 4 12 5 8 8.6 5 Z"/><path d="M9.4 13 C 10.6 15.4 13.4 15.4 14.6 13" fill="none" stroke="#0b0e18" stroke-width="1.6" stroke-linecap="round"/></svg>',
  fener: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 3 H14 V4.6 H10 Z"/><path d="M8 6.4 H16 L17 18 H7 Z"/><rect x="9.9" y="9.4" width="4.2" height="5" rx="1" fill="#0b0e18"/><path d="M9 20.6 H15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  boynuz: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 19 C 4 11 9 5 20 4 C 13 8 11 13 10 19 Z"/></svg>',
  pala: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5 H16 C 20 5 21 8 20 11 L7 11 Z"/><rect x="8" y="11" width="2.6" height="10" rx="1"/></svg>',
  iksir: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 2.4 H14 V7 L17.6 14 A4.6 4.6 0 0 1 13.4 21 H10.6 A4.6 4.6 0 0 1 6.4 14 L10 7 Z"/><rect x="9" y="2.2" width="6" height="1.9" rx="0.9"/><path d="M8 14.5 C 10.4 13.2 13.6 13.2 16 14.5" fill="none" stroke="#0b0e18" stroke-width="1.4"/></svg>',
  zar: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3.6"/><circle cx="9" cy="9" r="1.5" fill="#0b0e18"/><circle cx="15" cy="15" r="1.5" fill="#0b0e18"/><circle cx="12" cy="12" r="1.5" fill="#0b0e18"/></svg>',
  el: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.8 10.6 C6.8 6.4 8.9 3.6 12 3.6 C15.1 3.6 17.2 6.4 17.2 10.6 V14.2 A5.2 5.2 0 0 1 12 19.8 A5.2 5.2 0 0 1 6.8 14.2 Z"/><path d="M9 4.4 V10.6 M12 3.8 V11 M15 4.4 V10.6" stroke="#0b0e18" stroke-width="1.1" opacity="0.4" fill="none"/><path d="M4.2 12.2 C 2.6 12.8 1.8 14.6 2.4 16.2 C 3 17.8 4.8 18.6 6.4 18 L 8 17.4 L 6.4 11.6 Z"/><rect x="5.4" y="18.6" width="13.2" height="3.6" rx="1.6"/></svg>',
  muska: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 L19 7 V13 C 19 17 16 20 12 21.5 C 8 20 5 17 5 13 V7 Z"/><path d="M12 8 L14.2 11.5 L12 15 L9.8 11.5 Z" fill="#0b0e18"/></svg>',
  fici: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 3.5 H17 C 18.6 6 19.4 9 19.4 12 C 19.4 15 18.6 18 17 20.5 H7 C 5.4 18 4.6 15 4.6 12 C 4.6 9 5.4 6 7 3.5 Z"/><path d="M4.8 9 H19.2 M4.8 15 H19.2" stroke="#0b0e18" stroke-width="1.7"/></svg>',
  kadeh: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3 H18 C 18 9 15 12 12 12 C 9 12 6 9 6 3 Z"/><rect x="11" y="12" width="2" height="6"/><path d="M7 21 H17 V18.8 H7 Z"/></svg>',
  tac: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18 L2 6 L8 11 L12 4 L16 11 L22 6 L21 18 Z"/><rect x="3" y="19" width="18" height="2.4" rx="1"/></svg>',
  kum: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3 H18 V4.2 C 18 8 14 10 12 12 C 14 14 18 16 18 19.8 V21 H6 V19.8 C 6 16 10 14 12 12 C 10 10 6 8 6 4.2 Z"/></svg>',
  kupe: '<svg viewBox="0 0 24 24"><path d="M8 4.4 A5 5 0 0 1 16 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="9" r="2.2" fill="currentColor"/><path d="M11 11 C 14 13.5 15 16.5 13 19.5 C 12 21 10 21 9 19.5 C 7.5 17 8 14 10 11.5 Z" fill="currentColor"/></svg>',
  hancer: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L14.5 12 L12 15 L9.5 12 Z"/><rect x="8" y="15" width="8" height="2.1" rx="0.6"/><rect x="11" y="17.1" width="2" height="5" rx="0.8"/></svg>',
  maske: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4 C 9 6 15 6 20 4 C 20 12 19 17 12 22 C 5 17 4 12 4 4 Z"/><path d="M8 10 L11 12 L8.4 13.6 Z" fill="#0b0e18"/><path d="M16 10 L13 12 L15.6 13.6 Z" fill="#0b0e18"/></svg>',
  toka: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="5" y="7" width="14" height="10" rx="2.6"/><path d="M12 7 V17"/></svg>',
  kalkan: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L20 6 V12 C 20 17 16 20 12 22 C 8 20 4 17 4 12 V6 Z"/><path d="M11 7 H13 V11 H17 V13 H13 V17 H11 V13 H7 V11 H11 Z" fill="#0b0e18"/></svg>',

  /* sistem */
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11 V8 A 4 4 0 0 1 16 8 V11"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 L10 18.5 L20 6.5"/></svg>',
  skull: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 C 7 2 4 6 4 10.5 C 4 13.5 5.5 15.5 7 16.5 L7 20 A 1.4 1.4 0 0 0 8.4 21.4 H15.6 A 1.4 1.4 0 0 0 17 20 L17 16.5 C 18.5 15.5 20 13.5 20 10.5 C 20 6 17 2 12 2 Z M9 13 A 2 2 0 1 1 9 9 A 2 2 0 0 1 9 13 Z M15 13 A 2 2 0 1 1 15 9 A 2 2 0 0 1 15 13 Z"/></svg>',
};

const ICON_COLORS = {
  kilic: '#e8e4d8', bicak: '#59e3c8', kor: '#b87351', yildirim: '#ffe9a8', ok: '#59e3c8', bomba: '#ff8a3c', bomb: '#ff8a3c',
  tabanca: '#ffd08a', sacma: '#ff8a3c', kure: '#c79bff', simsek: '#a8e8ff',
  yay: '#8fd9a8', asa: '#c79bff', sopa: '#c8a05a', tirpan: '#9fb3c8',
  kalp: '#ff3b4e', cizme: '#c8a05a', miknatis: '#f5c044', keskinlik: '#b87351', zirh: '#8b90a3',
  heal: '#7ef2a0', heal2: '#7ef2a0', guc: '#f5c044', eye: '#59e3c8', coin: '#f5c044', star: '#f5c044',
  kolye: '#ff3b4e', yuzuk: '#f5c044', tilsim: '#d8d4c4', mum: '#ffd08a', pelerin: '#8b90a3', kese: '#c8a05a',
  fener: '#ffe9a8', boynuz: '#ff8a3c', pala: '#c8ccd8', iksir: '#ff5a70', zar: '#f5c044', el: '#d8d4c4',
  muska: '#ff3b4e', fici: '#c8742e', kadeh: '#9b6cff', tac: '#f5c044', kum: '#9b6cff', kupe: '#ff5a70',
  hancer: '#b8c0d8', maske: '#a8a2dd', toka: '#8b90a3', kalkan: '#d8d4c4',
};

const NAMES = {
  kilic: 'Seher Kılıcı', bicak: 'Gölge Bıçakları', kor: 'Kor Çemberi',
  yildirim: 'Gök Gazabı', ok: 'Ruh Oku', bomba: 'Kor Havanı', simsek: 'Şimşek Kırığı',
  tabanca: 'Kemik Tabanca', sacma: 'Saçma Namlu',
  kure: 'Ay Küresi',
  kalp: 'Kadim Yürek', cizme: 'Rüzgâr Adımı', miknatis: 'Ruh Feneri',
  keskinlik: 'Kan Keskinliği', zirh: 'Kemik Zırh',
};

/** SVG kimlik benzersizleştirici — aynı sanatın çok kopyası DOM'a girince
   degrade id'leri çakışıp (gizli sayfadaki ilk kopyaya çözülerek) siyah
   boyamaya yol açabilir; her montaja taze sonek verilir. */
let __svgN = 0;
function uniqSVG(svg) {
  const n = '_u' + (__svgN++);
  return svg.replace(/id="([^"]+)"/g, 'id="$1' + n + '"').replace(/url\(#([^)]+)\)/g, 'url(#$1' + n + ')');
}

/* ── MAĞAZA VİTRİN SÖZLÜĞÜ (2026-08-31) ──
   Kart 118-132 px genişliğinde yaşıyor: sandığın TAM adı ("EJDERHA
   SANDIĞI") o kutuda iki satıra sarıp sanatı aşağı itiyordu. Vitrinde
   KISA ad + kademe rakamı durur, tam ad tören ekranında zaten yazılı.
   `hook` ≤ 22 karakter: tek satırda kalmalı, yoksa kart yüksekliği
   satır arkadaşlarından kayar. */
const ROMAN = [null, 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const SHOP_META = {
  yaygin:  { short: 'GÜMÜŞ',   hook: '1 EKİPMAN',    tag: '' },
  kemik:   { short: 'ALTIN',   hook: 'GARANTİ EKİPMAN',      tag: '' },
  kan:     { short: 'BÜYÜLÜ',  hook: 'SİLAH ŞANSI',    tag: 'POPÜLER' },
  kadim:   { short: 'BUZUL',   hook: 'DESTAN + ALTIN',   tag: 'EN İYİ DEĞER' },
  mistik:  { short: 'MİSTİK',  hook: 'EFSANE GARANTİ', tag: 'GARANTİ' },
  ejderha: { short: 'EJDERHA', hook: 'EFSANE + ALTIN',     tag: 'EFSANEVİ' },
};

/** Sandık glifi — kademe başına premium animasyonlu sanat (chestArt.js). */
function chestSVG(type) {
  const C = CHESTS[type];
  return uniqSVG(chestArt((C && C.tier) || 1));
}

/* v73 PERF: LİSTE bağlamında (yuva, vitrin, yolculuk, bilet, etkinlik) sandık SVG'lerinin SMIL
   animasyonu 1. saniyede DONDURULUR. SMIL bileşik değil: her tik SVG'yi — mağazada üstündeki çift
   drop-shadow ile birlikte — yeniden boyuyordu (vitrinde 9 sandık × her kare = mağaza kasması).
   CSS sıçraması (transform) sürer. Tek sandıklı odak ekranları (inceleme/satın alma/sonuç) canlı kalır. */
/* v73b: wrap=true → SVG bir .csw sarmalayıcıya alınır; zıplama sarmalayıcıda, drop-shadow SVG'de kalır
   (filtre durağan öğede = bir kez boyanır; hareketli öğede = her karede birleştiricide). */
function freezeChestSVG(root, wrap) {
  if (!root) return;
  const list = root.querySelectorAll('svg.chest-svg');
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    try { s.setCurrentTime(1); s.pauseAnimations(); } catch (e) { /* SMIL yok */ }
    if (wrap && s.parentNode && !(s.parentNode.classList && s.parentNode.classList.contains('csw'))) {
      const w = document.createElement('i');
      w.className = 'csw';
      s.parentNode.insertBefore(w, s);
      w.appendChild(s);
    }
  }
}

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = (s / 60) | 0;
  return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function fmtMod(key, v) {
  const def = MODS[key];
  const label = def ? def.label : key;
  const fmt = def ? def.fmt : 'flat';
  let val;
  if (fmt === 'pct') val = (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
  else if (fmt === 'persec') val = (v > 0 ? '+' : '') + v + '/sn';
  else val = (v > 0 ? '+' : '') + v;
  return { label, val, good: v >= 0 };
}

/* ── KUŞANIM v40 sabitleri ── */
/* nadirlik → sıra (RARITIES dizini sıra DEĞİL: 5=NADİR, 3=EPİK, 4=EFSANEVİ) */
const KZ_RANK = { 1: 1, 2: 2, 5: 3, 3: 4, 4: 5 };
const KZ_SHORT = { silah: 'SİLAH', zirh: 'ZIRH', eldiven: 'ELDİVEN', cizme: 'ÇİZME' };
const KZ_GHOST = { silah: 'w_cy_kilic', zirh: 'z_deri', eldiven: 'g_deri', cizme: 'b_deri' };
/* v49: güç puanı ağırlıkları TEK KAYNAK (balance.W) × 10 — kart sayısı
   eski ölçekte kalsın. Eskiden burada ayrı bir tablo vardı (dmg 1000,
   can 2,2): denge ile arayüz farklı şeyi "güçlü" diyordu. */
const KZ_W = Object.fromEntries(Object.entries(BAL_W).map(([k, v]) => [k, v * 10]));

/* yolculuk haritası düğüm koordinatları (yüzde) — m: 1..10 */
function nodePos(m) {
  if (m >= MISSIONS_PER_WORLD) return { x: 50, y: 11 };
  const t = (m - 1) / (MISSIONS_PER_WORLD - 1);
  return {
    x: 50 + 27 * Math.sin((m - 1) * 1.05),
    y: 90 - t * 76,
  };
}

export class UI {
  constructor(game) {
    this.game = game;
    const $ = (id) => document.getElementById(id);

    this.hud = $('hud');
    /* v61 süper düğmesi: pointerdown (tık gecikmesi yok), joystick'e düşmesin */
    this._ultBtn = $('btn-ult');
    if (this._ultBtn) {
      this._ultBtn.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); ev.preventDefault(); if (!game.ult.fire()) { this._ultBtn.classList.remove('nope'); void this._ultBtn.offsetWidth; this._ultBtn.classList.add('nope'); } });
      ['touchstart', 'mousedown'].forEach((t) => this._ultBtn.addEventListener(t, (ev) => ev.stopPropagation(), { passive: true }));
    }
    this.xpFill = $('xp-fill');
    this.hudLevel = $('hud-level');
    this.hudWave = $('hud-wave');
    this.hudTimer = $('hud-timer');
    this.hudMoney = $('hud-money');
    this.bossBar = $('boss-bar');
    this.bossName = $('boss-name');
    this.bossFill = $('boss-fill');
    this.vignette = $('hurt-vignette');
    this.bannerEl = $('banner');
    this.bannerMain = $('banner-main');
    this.bannerSub = $('banner-sub');

    this.screens = {
      menu: $('screen-menu'),
      levelup: $('screen-levelup'),
      pause: $('screen-pause'),
      settings: $('screen-settings'),
      missionend: $('screen-missionend'),
      chardetail: $('screen-chardetail'),
      chestinspect: $('screen-chestinspect'),
      geardetail: $('screen-geardetail'),
      battlepass: $('screen-battlepass'),
      quests: $('screen-quests'),
      accjourney: $('screen-accjourney'),
      adwatch: $('screen-adwatch'),
    };
    this.cardContainer = $('card-container');
    /* mini harita · güç rozetleri · yeniden dağıt
       (Görev şeridi 2026-08-24'te kaldırıldı: yönlendirme dünya uzayında) */
    this.puRow = $('pu-row');
    this.rerollBtn = $('btn-reroll');
    this.rrCount = $('rr-count');
    this._mmBaked = null;
    this._puKey = '';
    this.pauseLoadout = $('pause-loadout');
    this.accLevelupEl = $('acc-levelup');
    this.aluLevel = $('alu-level');
    this.aluStats = $('alu-stats');
    this.aluRewards = $('alu-rewards');
    this.ajRail = $('aj-rail');
    this.ajCurLevel = $('aj-cur-level');

    /* ana ekran */
    this.pages = {
      savas: $('page-savas'),
      dunyalar: $('page-dunyalar'),
      etkinlik: $('page-etkinlik'),
      kahraman: $('page-kahraman'),
      cephane: $('page-cephane'),
      magaza: $('page-magaza'),
    };
    this.menuRubyVal = $('menu-ruby-val');
    this.menuStoneVal = $('menu-stone-val');
    this.map3dCanvas = $('map-canvas-3d');
    this.homeMap = $('home-map');
    this.mapStage = document.querySelector('.map-stage');
    this.chestRow = $('chest-row');
    this.shopChests = $('shop-chests');
    this.stoneShop = $('stone-shop');
    this.rubyExchange = $('ruby-exchange');
    this.journeyEl = $('journey');

    /* cephane */
    this.armoryShop = $('armory-shop');
    this.slotCount = $('slot-count');
    this.charGrid = $('char-grid');

    /* görev sonu */
    this.meEyebrow = $('me-eyebrow');
    this.meTitle = $('me-title');
    this.meStats = $('me-stats');
    this.meRewards = $('me-rewards');
    this.meCard = $('me-card');
    this.meWave = $('me-wave');
    this.meLoot = $('me-loot');
    this.btnMeNext = $('btn-me-next');
    this.btnMeRetry = $('btn-me-retry');
    this.btnMeRevive = $('btn-me-revive');
    this.adWatchNum = $('ad-watch-num');
    this.adWatchArc = $('ad-watch-arc');

    this.page = 'savas';

    this.cXp = NaN; this.cLevel = NaN; this.cTimer = NaN; this.cMoney = NaN; this.cBoss = NaN; this.cWave = '';
    this._vt = 0;
    this._bt = 0;
    this._mapKey = '';

    const bind = (id, fn) => {
      const el = $(id);
      if (el) el.addEventListener('click', () => { game.audio.unlock(); fn(); });
    };
    bind('btn-start', () => this.startNext());
    bind('event-battle', () => this.startNext());
    bind('btn-pause', () => { game.audio.play('click'); game.pauseGame(); });
    bind('btn-settings', () => { game.audio.unlock(); game.audio.play('click'); this.showSettings(); });
    bind('btn-pause-settings', () => { game.audio.play('click'); this.showSettings(); });
    bind('set-close', () => { game.audio.play('click'); this.hideSettings(); });
    bind('btn-resume', () => { game.audio.play('click'); game.resumeGame(); });
    bind('btn-quit', () => { game.audio.play('click'); game.quitToMenu(); });
    bind('home-map', () => { game.audio.play('click'); this.setPage('dunyalar'); });
    bind('map-pedestal', () => { game.audio.play('click'); this.setPage('dunyalar'); });
    bind('aj-close', () => { game.audio.play('click'); this.showMenu(); });
    bind('alu-close', () => { game.audio.play('click'); this.accLevelupEl.classList.add('hidden'); });
    bind('btn-reroll', () => this.game.rerollCards());
    bind('cd-close', () => { game.audio.play('click'); this.closeCharDetail(); });
    bind('ci-close', () => { game.audio.play('click'); this.closeChestInspect(); });
    /* ── POP-UP'LARDA BOŞLUĞA DOKUNUNCA KAPAT ──
       Ölçüt e.target === katman: olay yalnızca KENDİ üstünde doğduğunda
       kapatır, karttan kabaran tıklamalarda (buton, kaydırma) değil.
       Üç pop-up da aynı davranışı paylaşır — sandık, kahraman, cephane. */
    const dismiss = (screenId, close) => {
      const el = document.getElementById(screenId);
      if (!el) return;
      el.addEventListener('click', (e) => {
        if (e.target !== el) return;
        game.audio.play('click');
        close();
      });
    };
    dismiss('screen-chestinspect', () => this.closeChestInspect());
    dismiss('screen-chardetail', () => this.closeCharDetail());
    dismiss('screen-geardetail', () => this.closeGearDetail());
    bind('gd-close', () => { game.audio.play('click'); this.closeGearDetail(); });
    bind('free-chest', () => {
      const g2 = this.game;
      if (g2.chests.freeReadyIn() > 0) { g2.audio.play('error'); this.toast('HENÜZ HAZIR DEĞİL'); return; }
      if (g2.chests.claimFree()) {
        g2.audio.play('claim');
        g2.chests.ceremony('ahsap', null, () => { this.refreshWallet(); this.renderChestRow(); });
      }
    });
    bind('victory-chest', () => {
      const g2 = this.game;
      if (g2.chests.vicCount() >= g2.chests.vicNeed) {
        g2.audio.play('claim');
        g2.chests.claimVictory();
        g2.chests.ceremony('kan', null, () => { this.refreshWallet(); this.renderChestRow(); });
      } else { g2.audio.play('error'); this.toast('HER ' + g2.chests.vicNeed + ' ZAFERDE BİR AÇILIR'); }
    });
    bind('journey-back', () => {
      game.audio.play('click');
      if (this._journeyMode === 'chapters') { this._journeyMode = 'worlds'; this.renderJourney(); }
      else this.setPage('savas');
    });
    bind('bp-close', () => { game.audio.play('click'); this.hideBattlePass(); });
    bind('quest-open', () => { game.audio.play('click'); this._dd(false); this.showQuests(); });
    /* v63 M1 GÜNLÜK çekmecesi */
    bind('tb-daily', () => { game.audio.play('panel'); this._dd(true); });
    bind('dd-close', () => { game.audio.play('click'); this._dd(false); });
    bind('dd-dim', () => this._dd(false));
    bind('dd-events', () => { game.audio.play('tab'); this._dd(false); this.setPage('etkinlik'); });
    bind('q-close', () => { game.audio.play('click'); this.hideQuests(); });
    bind('q-claim-daily', () => this.claimDaily());
    bind('bp-buy-premium', () => {
      if (game.bpHasPremium()) return;
      if (game.bpBuyPremium()) { this.renderBattlePass(); this.refreshWallet(); this.toast('PREMİUM GEÇİŞ AÇILDI'); }
      else { game.audio.play('error'); this.toast('YETERSİZ GEM'); }
    });
    bind('btn-me-menu', () => { game.audio.play('click'); game.quitToMenu(); });
    bind('btn-me-retry', () => game.towerRun ? game.startTower() : game.startRun(game.worldId, game.missionId, game.nmRun || game.sealRun));
    bind('btn-me-revive', () => game.reviveWithAd());
    bind('btn-me-next', () => {
      if (game.towerRun) { game.startTower(); return; }
      if (game.nmRun) { game.startNightmare(); return; }
      const nm = nextMission(game.progress);
      game.startRun(nm.w, nm.m);
    });

    /* alt gezinme */
    document.querySelectorAll('.dock .dk-tab').forEach((b) => {
      b.addEventListener('click', (ev) => {
        game.audio.unlock();
        const pg = b.getAttribute('data-page');
        this._navTap(b, ev);
        if (Ftue.locked(game, pg)) { game.audio.play('error'); this.toast(Ftue.lockMsg(pg)); return; }   // v54 E1
        if (pg !== this.page) { game.audio.play('tab'); try { Haptics.fire('ui'); } catch (e) { /* */ } }
        this.setPage(pg);
      });
    });
    /* v59 KAYAN PLAKA: aktif sekmenin arkasındaki kor plaka tek öğe, sekmeler arası yaylı kayar */
    {
      const nav = document.querySelector('.dock');
      if (nav && !nav.querySelector('.dk-ind')) {
        const ind = document.createElement('i'); ind.className = 'dk-ind'; ind.setAttribute('aria-hidden', 'true');
        nav.insertBefore(ind, nav.firstChild);
        this._navIndEl = ind;
        /* v59 akan parıltı: bilet · görev · cüzdan · xp çubuğu · ev sandıkları (ayrı sarmal; üst öğenin taşması değişmez) */
        const SH = [['.topbar .bp-banner', 6.5, 1.2], ['.topbar .tb-quest', 6.5, 4.4], ['.topbar .tb-cur', 8, 2.6], ['#free-chest', 7, 0.6], ['#victory-chest', 7, 3.8], ['#map-pedestal', 9, 5]];
        for (const [q, d, l] of SH) document.querySelectorAll(q).forEach((el, n) => {
          const w = document.createElement('i'); w.className = 'v59-sh'; w.setAttribute('aria-hidden', 'true');
          w.style.setProperty('--sd', d + 's'); w.style.setProperty('--sl', (l + n * 1.1) + 's');
          w.appendChild(document.createElement('i')); el.classList.add('has-sh'); el.appendChild(w);
        });
        document.querySelectorAll('.tbl-bar, .bpb-bar, .tq-bar').forEach((el, n) => {
          const w = document.createElement('i'); w.className = 'v59-sh bar'; w.setAttribute('aria-hidden', 'true');
          w.style.setProperty('--sd', '3.4s'); w.style.setProperty('--sl', (0.4 + n * 0.8) + 's');
          w.appendChild(document.createElement('i')); el.classList.add('has-sh'); el.appendChild(w);
        });
        window.addEventListener('resize', () => this._navInd(true));
        requestAnimationFrame(() => this._navInd(true));
      }
    }

    /* ═══ Parmakla SÜRÜKLEME: yatay sekme geçişi + dikey sayfa kaydırma ═══
       Yatay: sayfalar parmağı gerçek zamanlı takip eder (CR tarzı), kenarda
       lastik direnci. Dikey: sayfa içeriği parmak/fare ile kayar, bırakınca
       atalet. Yerli kaydırma çubuğu gizli (bkz. style.css .menu-page). */
    const pageViewport = document.querySelector('.page-viewport');
    if (pageViewport) {
      const tabOrder = ['magaza', 'cephane', 'savas', 'kahraman', 'etkinlik'];
      const D = {
        active: false, decided: null, id: null,
        x0: 0, y0: 0, t0: 0, lastX: 0, lastT: 0, vx: 0,
        lastY: 0, vy: 0, s0: 0, scrollEl: null,
        W: 0, cur: null, nbr: null, nbrName: null, dir: 0,
      };

      const menuFree = () => !this.screens.menu.classList.contains('hidden') &&
        !!this.pages[this.page] &&
        Object.values(this.screens).every((s) => s === this.screens.menu || s.classList.contains('hidden'));
      const canDragH = () => tabOrder.indexOf(this.page) !== -1;

      /* sürükleme sonrası yanlışlıkla butona 'tıklama'yı yut */
      this._squelchClick = 0;
      pageViewport.addEventListener('click', (e) => {
        if (performance.now() - this._squelchClick < 320) { e.stopPropagation(); e.preventDefault(); }
      }, true);

      const setNeighbor = (dir) => {
        const idx = tabOrder.indexOf(this.page);
        const nName = tabOrder[idx + (dir < 0 ? 1 : -1)];
        if (D.nbrName === nName) return;                 // zaten hazır
        if (D.nbr && D.nbr !== D.cur) {                  // yön değişti → eskisini gizle
          D.nbr.style.transition = 'none';
          D.nbr.style.transform = '';
          D.nbr.classList.add('hidden');
        }
        const nOk = nName && !Ftue.locked(this.game, nName) ? nName : null;   // v54 E1: kilitli sekmeye kaydırılmaz
        D.nbrName = nOk;
        D.nbr = nOk ? this.pages[nOk] : null;
        if (D.nbr) {
          D.nbr.classList.remove('hidden', 'slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');
          D.nbr.style.transition = 'none';
          D.nbr.style.zIndex = '3';
          this.renderPage(nName);
        }
      };

      const onDown = (e) => {
        if (!menuFree() || D.active) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (this._momRaf) { cancelAnimationFrame(this._momRaf); this._momRaf = 0; }
        D.active = true; D.decided = null; D.id = e.pointerId;
        D.x0 = D.lastX = e.clientX; D.y0 = D.lastY = e.clientY;
        D.t0 = D.lastT = performance.now(); D.vx = 0; D.vy = 0; D.dir = 0;
        D.W = pageViewport.clientWidth || 1;
        D.cur = this.pages[this.page];
        D.scrollEl = D.cur; D.s0 = D.cur.scrollTop;
        D.nbr = null; D.nbrName = null;
      };

      const onMove = (e) => {
        if (!D.active || e.pointerId !== D.id) return;
        const dx = e.clientX - D.x0, dy = e.clientY - D.y0;
        if (!D.decided) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          D.decided = (canDragH() && Math.abs(dx) > Math.abs(dy) * 1.15) ? 'h' : 'v';
          if (D.decided === 'h') {
            D.cur.style.transition = 'none';
            D.cur.style.zIndex = '4';
          }
          this._squelchClick = performance.now();
          if (D.decided === 'h' || e.pointerType === 'mouse') { try { pageViewport.setPointerCapture(D.id); } catch (_) {} }
        }
        const now = performance.now();
        this._squelchClick = now;
        if (D.decided === 'v') {
          /* v73d: dokunmada dikey kaydırma TARAYICININ (touch-action: pan-y) — birleştiricide, ana iş
             parçacığı meşgulken bile 60 fps + yerel atalet/lastik. Eskiden scrollTop'u her
             pointermove'da JS yazıyordu (ana iş parçacığına bağlı = menü kasması). Fare: eski yol. */
          if (e.pointerType !== 'mouse') {
            D.active = false;
            try { pageViewport.releasePointerCapture(D.id); } catch (_) {}
            D.cur = D.nbr = D.nbrName = D.scrollEl = null;
            return;
          }
          e.preventDefault();
          D.scrollEl.scrollTop = D.s0 - dy;
          if (now > D.lastT) { D.vy = (e.clientY - D.lastY) / (now - D.lastT); D.lastY = e.clientY; D.lastT = now; }
          return;
        }
        e.preventDefault();
        if (now > D.lastT) { D.vx = (e.clientX - D.lastX) / (now - D.lastT); D.lastX = e.clientX; D.lastT = now; }

        const dir = dx < 0 ? -1 : 1;
        if (dir !== D.dir) { D.dir = dir; setNeighbor(dir); }

        let off = dx;
        if (!D.nbr) off = dx * 0.32;                     // kenarda lastik direnci
        D.cur.style.transform = 'translateX(' + off + 'px)';
        if (D.nbr) D.nbr.style.transform = 'translateX(' + (off + (dir < 0 ? D.W : -D.W)) + 'px)';
      };

      const finish = (el, tx, hide) => {
        if (!el) return;
        el.style.transition = 'transform 300ms cubic-bezier(0.22,0.9,0.28,1)';
        el.style.transform = 'translateX(' + tx + 'px)';
        clearTimeout(el._dragT);
        el._dragT = setTimeout(() => {
          el.style.transition = ''; el.style.transform = ''; el.style.zIndex = '';
          if (hide) el.classList.add('hidden');
        }, 320);
      };

      const onUp = (e) => {
        if (!D.active || e.pointerId !== D.id) return;
        const mode = D.decided;
        D.active = false;
        try { pageViewport.releasePointerCapture(D.id); } catch (_) {}
        if (mode === 'v') {
          /* atalet kaydırması */
          const el = D.scrollEl; let vy = D.vy;
          D.cur = D.nbr = D.nbrName = D.scrollEl = null;
          if (el && Math.abs(vy) > 0.08) {
            let last = performance.now();
            const mom = (t) => {
              const dt = Math.min(48, t - last); last = t;
              el.scrollTop -= vy * dt;
              vy *= Math.pow(0.94, dt / 16.7);
              this._momRaf = Math.abs(vy) > 0.02 ? requestAnimationFrame(mom) : 0;
            };
            this._momRaf = requestAnimationFrame(mom);
          }
          return;
        }
        if (mode !== 'h') { D.cur = D.nbr = D.nbrName = D.scrollEl = null; return; }

        const dx = e.clientX - D.x0;
        const commit = D.nbr && (Math.abs(dx) > D.W * 0.28 || (Math.abs(D.vx) > 0.45 && Math.sign(dx) === Math.sign(D.vx)));
        const cur = D.cur, nbr = D.nbr, nName = D.nbrName, dir = D.dir;
        D.cur = D.nbr = D.nbrName = null;

        if (commit) {
          finish(cur, dir < 0 ? -D.W : D.W, true);
          finish(nbr, 0, false);
          this.page = nName;
          document.querySelectorAll('.dock .dk-tab').forEach((b) =>
            b.classList.toggle('active', b.getAttribute('data-page') === nName));
          this._navInd();
          this.refreshWallet();
          /* Kaydırarak sayfa değiştirmede SES YOK — tık sesi yalnız alttaki
             menü sekmelerine BASINCA çalar (kullanıcı isteği). */
          this.game.audio.unlock();
        } else {
          finish(cur, 0, false);
          if (nbr && nbr !== cur) finish(nbr, dir < 0 ? D.W : -D.W, true);
        }
      };

      pageViewport.addEventListener('pointerdown', onDown, { passive: true });
      pageViewport.addEventListener('pointermove', onMove, { passive: false });
      pageViewport.addEventListener('pointerup', onUp, { passive: true });
      pageViewport.addEventListener('pointercancel', onUp, { passive: true });
    }

    /* sandık zamanlayıcısı: menü görünürken saniyede bir tazele */
    setInterval(() => {
      if (this.screens.menu.classList.contains('hidden')) return;
      const changed = this.game.chests.tick();
      if (this.page === 'savas') {
        if (changed) { this.renderChestRow(); this._refreshChestInspect(); }
        else { this.updateChestCountdowns(); this.updateChestInspectCountdown(); }
      } else if (this.page === 'magaza') {
        this.updateFreeCountdown();
      }
    }, 1000);

    /* v75: yeniden boyutlanma olayı klavye/döndürmede art arda gelir → haritayı 160 ms sonra BİR kez boya */
    window.addEventListener('resize', () => {
      clearTimeout(this._rzMapT);
      this._rzMapT = setTimeout(() => {
        if (this.page === 'savas' && !this.screens.menu.classList.contains('hidden')) { this._mapKey = ''; this.drawHomeMap(); }
      }, 160);
    });

    /* GİZLİ BELGEDE ZAMAN İLERLEMEZ, AMA GEÇİŞ BAŞLAMIŞ SAYILIR (2026-09-07).
       Sekme geri gelince donmuş her şeyi oturt: bazı tarayıcılar dondurulmuş
       bir CSS geçişini sürdürmez, currentTime 0'da kalır ve sayfa
       BAŞLANGIÇ karesinde (opacity 0, translateX(-100%)) takılır. */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      this._settlePages();
      /* HARİTA DA GÖRÜNÜRLÜKTE TAZELENİR: gizliyken kutu ölçülemediyse
         (ya da tuval hiç atanmadıysa) burası son ağdır. */
      /* v75: savaştan dönüşte (menü gizli) önizleme BOYANMAZ — devam karesinde kasma yapıyordu */
      if (this.screens.menu.classList.contains('hidden')) return;
      this._mapKey = '';
      this.drawHomeMap();
    });

    /* AI ada varlıkları ağdan gelir; geldiklerinde sahne TAZELENMEK
       ZORUNDA — `_mapKey` ve skyMap önbelleği aksi hâlde prosedürel
       boyamayı sonsuza dek geçerli sayar (v29b dersi). Sayfa yeniden
       kurulmaz, yalnız tuval yeniden boyanır: kaydırma konumu korunur. */
    window.addEventListener('isles-ready', () => {
      this._mapKey = '';
      this.drawHomeMap();
      if (this._islesRepaint) { try { this._islesRepaint(); } catch (e) { /* yok say */ } }
    });

    /* Harita kutusu boyutu değiştiğinde diyoramayı yeniden boya. Sandık satırı
       dolunca (renderChestRow) esnek harita 448→268 küçülür; bu gözlemci o
       oturmayı yakalar, aksi halde diyorama şişik boyda çizilip tepeden kırpılır
       (kullanıcı: "sadece ay ve kule görünüyor"). _mapKey koruması boşuna
       yeniden çizimi engeller; cihaz/yön değişimini de kapsar.

       GÖZLEMCİ ARTIK KOŞULSUZ ÇİZER (2026-09-06, doğrulama bulgusu).
       Eskiden `page==='savas' && !menu.hidden` kapısı vardı ve v27'den sonra
       ÖLÜMCÜL oldu: v27 `.map-frame`i `flex:none + aspect-ratio`tan
       `flex:1 1 auto`a çevirdi, yani yükseklik ARTIK FLEX DAĞITIMIYLA, ilk
       yerleşimden SONRA çözülüyor. O oturma açılış ekranı (5 sn) dururken
       gerçekleşiyor, menü hâlâ `hidden`, dolayısıyla tek boyama fırsatı
       KAPIDAN GERİ ÇEVRİLİYOR ve boyut bir daha değişmediği için gözlemci
       bir daha ateşlenmiyordu: ana ekranda harita BOŞ KUTU kalıyordu
       (ölçüldü: tuval 300×150 = HTML varsayılanı, dolu piksel %0).
       Bir kapı, kendisini besleyen tek olayı yutuyorsa kapı yanlıştır.
       Boyama zaten `_mapKey` ile önbellekli ve ölçülemeyen kutuda kendisi
       çıkıyor; gizliyken boyamak da zararsız — üstelik menü açıldığında
       sahne HAZIR olur. */
    const mapBox = this.map3dCanvas && this.map3dCanvas.parentElement;
    if (mapBox && 'ResizeObserver' in window) {
      this._mapRO = new ResizeObserver(() => this.drawHomeMap());
      this._mapRO.observe(mapBox);
    }

    this.bindSettings();
    this.showMenu();
  }

  icon(id) { return ICONS[id] || ICONS.guc; }
  gearArt(id) { const a = GEAR_ART[id]; return a ? uniqSVG(a) : this.icon(id); }
  hasGearArt(id) { return !!GEAR_ART[id]; }
  iconColor(id) { return ICON_COLORS[id] || '#e8e4d8'; }
  displayName(id) { return NAMES[id] || id; }

  /** Pişirilmiş kart portresi ARTIK YOK (v24 geri alma): çağıranlar
      (chests.js töreni, tepsi pulu, kuşanım avatarı) vektör/illüstrasyon
      yoluna düşer. Tek yerden null dönmesi o yolları tek satırda kapatır. */
  cardPortrait() { return null; }
  /** v48: sandık töreni/tepsisi kahramanı GERÇEK illüstrasyonla gösterir (eski vektör çizim değil). */
  heroArtUrl(id) { return HERO_ART[id] || null; }

  /** Kart sanatı: kaynak illüstrasyon (v24 öncesi en eski sıra). */
  charArt(id, cls) {
    if (!HERO_ART[id]) return '';
    return '<img class="' + (cls || 'cc-illu') + ' is-fullbody" alt="" src="' + HERO_ART[id] + '">';
  }

  hideAllScreens() {
    for (const k in this.screens) this.screens[k].classList.add('hidden');
  }

  /** v54 G2: ORTAK PERDE — yeni ekran karanlıktan 0,28 sn'de açılır (anında örtülür,
      sonraki karede kalkar). Ekran değişimi eşzamanlı kalır; perde yalnız görsel. */
  _veil() {
    let v = this._veilEl;
    if (!v) {
      v = document.createElement('div'); v.id = 'veil54'; v.setAttribute('aria-hidden', 'true');
      (document.getElementById('app') || document.body).appendChild(v);
      this._veilEl = v;
    }
    v.style.transition = 'none'; v.classList.add('on'); void v.offsetWidth; v.style.transition = '';
    clearTimeout(this._veilT);
    this._veilT = setTimeout(() => v.classList.remove('on'), 60);
  }

  refreshWallet() {
    this._tweenNum(this.menuRubyVal, this.game.readRubies());
    if (this.menuStoneVal) this._tweenNum(this.menuStoneVal, this.game.readStones());
  }

  /** v53 C2: sayı atlamaz, 420 ms'de sayar (azalış da). */
  _tweenNum(el, to) {
    if (!el) return;
    const from = Number(String(el.textContent).replace(/\D/g, '')) || 0;
    if (el._tw) { cancelAnimationFrame(el._tw); el._tw = 0; }
    const rm = document.documentElement.classList.contains('rm') ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (from === to || rm || !el.isConnected || !el.offsetParent) { el.textContent = to; return; }
    const t0 = performance.now(), d = 420;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e);
      el._tw = k < 1 ? requestAnimationFrame(step) : 0;
    };
    el._tw = requestAnimationFrame(step);
  }

  /** v53 C2: ödül veren her düğme bunu çağırır — artış olan cüzdana
      kaynaktan uçuş, yoksa sayarak tazeleme. Öncesinde çağrılmalı
      (kaynak öğe yeniden çizilmeden, konumu okunabilsin). */
  rewardFrom(el) {
    const g = this.game;
    const num = (e) => (e ? Number(String(e.textContent).replace(/\D/g, '')) || 0 : 0);
    const upR = g.readRubies() > num(this.menuRubyVal);
    const upS = this.menuStoneVal && g.readStones() > num(this.menuStoneVal);
    if (el && upR) this.flyCurrency(el, 'ruby');
    if (el && upS) this.flyCurrency(el, 'stone');
    if (!el || (!upR && !upS)) this.refreshWallet();
  }

  /** Satın alım uçuşu: para parçaları kaynaktan sağ üstteki cüzdana uçar,
      sayacı parça parça artırır. kind: 'ruby' | 'stone'. */
  flyCurrency(fromEl, kind, onDone) {
    /* v74 (kullanıcı: "gemler daha yavaş uçsun, daha kaliteli animasyon"):
       ① kaynakta parlama + parçalar çevreye SAÇILIR (ease-out) ② kısa asılı kalış
       ③ her biri kendi yayında, dönerek, ease-in-out ile cüzdana SÜZÜLÜR (~0,9-1,1 sn)
       ④ her varışta cüzdanda halka + sayaç tık. Tek rAF döngüsü, yalnız transform/opacity. */
    const valEl = kind === 'ruby' ? this.menuRubyVal : this.menuStoneVal;
    const btn = valEl && valEl.parentElement;
    const rm = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.classList.contains('rm');
    if (!fromEl || !btn || rm) { this.refreshWallet(); if (onDone) onDone(); return; }
    const tEl = btn.querySelector(kind === 'ruby' ? '.ruby' : '.stone') || btn;
    const s = fromEl.getBoundingClientRect(), t = tEl.getBoundingClientRect();
    if (!t.width || !s.width) { this.refreshWallet(); if (onDone) onDone(); return; }
    const sx = s.left + s.width / 2, sy = s.top + s.height / 2;
    const tx = t.left + t.width / 2, ty = t.top + t.height / 2;
    const targetVal = kind === 'ruby' ? this.game.readRubies() : this.game.readStones();
    const base = Number(String(valEl.textContent).replace(/\D/g, '')) || 0;
    const n = 12, share = (targetVal - base) / n, K = kind === 'ruby' ? 'ruby' : 'stone';
    const layer = document.createElement('div'); layer.className = 'fly-layer k-' + K;
    const burst = document.createElement('i'); burst.className = 'fly-burst';
    burst.style.transform = 'translate3d(' + sx + 'px,' + sy + 'px,0)';
    layer.appendChild(burst);
    const P = [];
    for (let i = 0; i < n; i++) {
      const el = document.createElement('span');
      el.className = 'fly-cur';
      el.innerHTML = '<span class="' + K + '"></span>';
      el.style.opacity = '0';
      layer.appendChild(el);
      const ang = (i / n) * 6.2832 + (Math.random() - 0.5) * 0.5, r = 40 + Math.random() * 44;
      const bx = sx + Math.cos(ang) * r, by = sy + Math.sin(ang) * r * 0.8 - 12;
      const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy) || 1;
      const side = (i % 2 ? 1 : -1) * (36 + Math.random() * 84);
      P.push({ el, bx, by, cx: (bx + tx) / 2 - dy / L * side, cy: (by + ty) / 2 + dx / L * side - 40,
        t0: i * 72, burst: 440 + Math.random() * 120, hold: 110 + Math.random() * 90, fly: 860 + Math.random() * 240,
        spin: (Math.random() - 0.5) * 520, done: false });
    }
    document.body.appendChild(layer);
    let arrived = 0;
    const arrive = () => {
      arrived++;
      valEl.textContent = Math.round(base + share * arrived);
      btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
      const hit = document.createElement('i'); hit.className = 'fly-hit';
      hit.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
      layer.appendChild(hit);
      setTimeout(() => hit.remove(), 640);
      if (arrived === 1) this.game.audio.play('walletin');
      if (arrived >= n) { this.refreshWallet(); if (onDone) onDone(); setTimeout(() => layer.remove(), 700); }
    };
    const eOut = (k) => 1 - Math.pow(1 - k, 3);
    const eIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const T0 = performance.now();
    const frame = (now) => {
      const tt = now - T0;
      let alive = 0;
      for (const p of P) {
        if (p.done) continue;
        alive++;
        const lt = tt - p.t0;
        if (lt < 0) continue;
        let x, y, sc, rot, op = 1;
        if (lt < p.burst) {
          const k = eOut(lt / p.burst);
          x = sx + (p.bx - sx) * k; y = sy + (p.by - sy) * k; sc = 0.3 + 0.9 * k; rot = p.spin * 0.3 * k; op = Math.min(1, lt / 140);
        } else if (lt < p.burst + p.hold) {
          const k = (lt - p.burst) / p.hold;
          x = p.bx; y = p.by - Math.sin(k * Math.PI) * 4; sc = 1.2; rot = p.spin * 0.3;
        } else {
          const k0 = Math.min(1, (lt - p.burst - p.hold) / p.fly);
          if (k0 >= 1) { p.done = true; p.el.remove(); arrive(); continue; }
          const k = eIO(k0), q = 1 - k;
          x = q * q * p.bx + 2 * q * k * p.cx + k * k * tx;
          y = q * q * p.by + 2 * q * k * p.cy + k * k * ty;
          sc = 1.2 - 0.6 * k; rot = p.spin * (0.3 + 0.7 * k); op = k0 > 0.9 ? (1 - k0) / 0.1 : 1;
        }
        p.el.style.opacity = op.toFixed(2);
        p.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + rot.toFixed(0) + 'deg) scale(' + sc.toFixed(3) + ')';
      }
      if (alive) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  totalClears() {
    let n = 0;
    for (let w = 1; w <= WORLDS.length; w++) n += this.game.progress[w] | 0;
    return n;
  }

  /* ═══════════ ANA EKRAN ═══════════ */

  /** v56 A2 · SIRADAKİ HEDEF: SAVAŞ'ın üstünde tek satır; dokununca ilgili sayfa. */
  _renderGoal() {
    const el = document.getElementById('next-goal'), tx = document.getElementById('next-goal-t');
    if (!el || !tx) return;
    const G = nextGoal(this.game);
    el.classList.toggle('hidden', !G);
    if (!G) return;
    tx.textContent = G.txt;
    el.classList.toggle('hot', !!G.hot);
    el.onclick = () => { this.game.audio.play('click'); if (G.page !== 'savas') this.setPage(G.page); };
  }

  /** v56 C5: dönüş hediyesi — menüye ilk girişte bir kez. */
  _showGift(G) {
    const h = Math.floor(G.h), mm = Math.round((G.h - h) * 60);
    this.openSheet({ eyebrow: 'DÖNÜŞ HEDİYESİ', title: 'KOR SANDIĞI',
      html: '<div class="gift-doc"><i class="gift-glow"></i><p class="gift-t">' + h + ' SA ' + mm + ' DK uzaktaydın' + (G.full ? ' · <b>SANDIK DOLDU</b>' : '') + '</p>' +
        '<div class="gift-rw"><span class="gift-chip"><span class="ruby"></span>+' + G.gold + '</span>' + (G.chest ? '<span class="gift-chip">+ TAHTA SANDIK</span>' : '') + '</div>' +
        '<p class="gift-n">Kor sandığı sen yokken dolar · en çok 8 saat</p></div>',
      actions: [{ label: 'TOPLA', primary: true, onClick: () => { this.closeSheet(); this.game.audio.play('claim'); this.refreshWallet && this.refreshWallet(); } }], cls: 'sheet-gift' });
  }

  showMenu() {
    if (this._menuShownOnce) this._veil();
    this._menuShownOnce = true;
    this.hideAllScreens();
    this.hud.classList.add('hidden');
    this.bossBar.classList.add('hidden');
    this.bannerEl.classList.add('hidden');
    this.screens.menu.classList.remove('hidden');
    /* v59 GİRİŞ: üst şerit öğeleri sırayla düşer, alt dok yükselir (yalnız transform, 1,1 sn sonra sınıf düşer) */
    {
      const m = this.screens.menu;
      m.classList.remove('mn-in'); void m.offsetWidth; m.classList.add('mn-in');
      clearTimeout(this._mnInT); this._mnInT = setTimeout(() => m.classList.remove('mn-in'), 1100);
    }
    this.game.chests.tick();
    this.setPage(this.page || 'savas');
    this._navInd(true);
    /* Se\u00e7ili karakterin 3D modelini men\u00fcdeyken \u00f6nden y\u00fckle \u2014 sava\u015fa
       girildi\u011finde an\u0131nda haz\u0131r olsun, \"patates\" yer tutucu g\u00f6r\u00fcnmesin. */
    if (this.game.renderer3d && this.game.renderer3d.preloadCharacter) {
      this.game.renderer3d.preloadCharacter(this.game.meta.selectedChar);
    }
    if (this.game._pendingGift) { const G = this.game._pendingGift; this.game._pendingGift = null; setTimeout(() => this._showGift(G), 900); }
    if (this.game._pendingLevelUp) {
      const p = this.game._pendingLevelUp;
      this.game._pendingLevelUp = null;
      setTimeout(() => this.showAccountLevelUp(p), 600);
    }
  }

  /* Giriş (stagger) animasyonları güvenlik ağı: bazı cihazlarda/iframe'lerde
     arka planda yüklenince CSS animasyonu 0. karede (opacity:0) donabiliyor —
     menü boş görünür. Normal süreden sonra hâlâ bitmemiş 'riseIn' varsa zorla
     bitir; sağlıklı yüklemede zaten 'finished' olduğu için etkisizdir. */
  /* SAYFA GEÇİŞİ DE BİR ANİMASYONDUR VE O DA DONAR (2026-09-07, ölçüldü).
     `_settleStagger` yalnız ÇOCUKLARIN `riseIn` animasyonunu kurtarıyordu ve
     `a.animationName === 'riseIn'` diye bakıyordu — oysa sayfa geçişi bir CSS
     GEÇİŞİDİR (`.menu-page { transition: transform/opacity }`), yani
     `animationName` alanı YOK ve ağdan sessizce kaçıyordu.
     ÖLÇÜLEN ARIZA: gizli belgede `page-savas` bekleyen iki geçişle (fill
     'backwards', playState 'running', currentTime 0) duruyordu → hesaplanan
     transform translateX(-378px), opacity 0. Görünen tek sayfa şeffaf ve ekran
     dışında, yani MENÜ TAMAMEN BOŞ. Gerçek senaryo: oyuncu 5 sn'lik açılış
     sırasında uygulamadan çıkıp geri dönüyor (`showMenu` → `setPage` o anda
     çalışır).
     Bir güvenlik ağı, kurtardığı şeyin TİPİNİ varsayamaz. */
  _settlePages() {
    for (const k in this.pages) {
      const el = this.pages[k];
      if (!el || !el.getAnimations) continue;
      el.getAnimations().forEach((a) => {
        try { a.finish(); } catch (e) { /* sonsuz/iptal: yok sayılır */ }
      });
    }
  }

  _settleStagger() {
    clearTimeout(this._staggerT);
    this._settlePages();
    this._staggerT = setTimeout(() => {
      const menu = this.screens.menu;
      if (!menu || menu.classList.contains('hidden')) return;
      this._settlePages();
      const sel = '.home-col > *, .chest-row > .chest-slot, .char-grid > *, '
        + '.mission-grid > .mnode, .market-grid > .market-card, .gear-grid > .gear-card, '
        + '.event-map > .ev-stop, .stone-shop > .stone-pack, .ruby-exchange > .ex-pack, '
        + '.chest-shop > .chest-offer';
      menu.querySelectorAll(sel).forEach((el) => {
        if (!el.getAnimations) { el.style.opacity = '1'; el.style.transform = 'none'; return; }
        el.getAnimations().forEach((a) => {
          if (a.animationName === 'riseIn' && a.playState !== 'finished') {
            try { a.finish(); } catch (e) { el.style.opacity = '1'; el.style.transform = 'none'; }
          }
        });
      });
    }, 1300);
  }

  renderPage(p) {
    if (p === 'savas') this.renderHome();
    else if (p === 'dunyalar') this.renderJourney();
    else if (p === 'etkinlik') this.renderEvents();
    else if (p === 'kahraman') this.renderChars();
    else if (p === 'cephane') this.renderArmory();
    else if (p === 'magaza') this.renderMagaza();
  }

  /** v59: kor plakayı aktif sekmenin altına kaydırır (yalnız transform + genişlik; sekme değişiminde bir kez). */
  _navInd(instant) {
    const ind = this._navIndEl;
    const nav = ind && ind.parentElement;
    const a = nav && nav.querySelector('.dk-tab.active');
    if (!a || !a.offsetWidth) return;
    nav.classList.toggle('on-battle', a.classList.contains('dk-battle'));   // v76: savaşta gösterge sikkeye bırakılır
    if (instant) ind.classList.add('snap');
    ind.style.width = a.offsetWidth + 'px';
    ind.style.height = a.offsetHeight + 'px';
    ind.style.transform = 'translate3d(' + a.offsetLeft + 'px,' + a.offsetTop + 'px,0)';
    ind.classList.add('on');
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => ind.classList.remove('snap')));
    a.classList.remove('dk-hop'); void a.offsetWidth; a.classList.add('dk-hop');
  }
  /** v59: sekmeye dokunuş — dokunulan noktadan halka + simge ezilip zıplar. */
  _navTap(b, ev) {
    if (document.documentElement.classList.contains('rm')) return;
    const r = b.getBoundingClientRect();
    const x = ev && ev.clientX ? ev.clientX - r.left : r.width / 2, y = ev && ev.clientY ? ev.clientY - r.top : r.height / 2;
    const rip = document.createElement('i'); rip.className = 'dk-rip';
    rip.style.left = Math.round(x) + 'px'; rip.style.top = Math.round(y) + 'px';
    b.appendChild(rip);
    setTimeout(() => rip.remove(), 560);
    b.classList.remove('dk-tap'); void b.offsetWidth; b.classList.add('dk-tap');
  }

  setPage(p) {
    if (!this.pages[p]) p = 'savas';
    if (Ftue.locked(this.game, p)) p = 'savas';
    Ftue.visit(this.game, p);
    Ftue.paintNav(this.game);
    const prev = this.page;
    this.page = p;
    document.querySelectorAll('.dock .dk-tab').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-page') === p);
    });
    this._navInd();
    this.refreshWallet();
    this.refreshQuestChip();
    this._settleStagger();

    const doRender = () => this.renderPage(p);

    /* GİZLİYKEN GEÇİŞ KURULMAZ (2026-09-07). Zaman ilerlemediği için geçiş
       başlangıç karesinde (opacity 0) donar ve dönen oyuncu boş menü görür.
       Hareketi azalt tercihi de aynı kapıdan geçer: ikisinde de doğru
       davranış animasyonu ATLAMAK, sonradan onarmak değil. */
    const noAnim = document.hidden
      || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* aynı sayfa (örn. menüye dönerken yenileme) → kaydırma yok, doğrudan render */
    if (!prev || prev === p || !this.pages[prev] || noAnim) {
      for (const k in this.pages) {
        const el = this.pages[k];
        /* YARIM KALMIŞ BİR GEÇİŞİN SINIFI DA TEMİZLENİR: bu dal atlama
           yoludur, yani önceki dokunuştan kalan `slide-*` sınıfı kalırsa
           sayfa ekran dışında ve şeffaf olarak "görünür" sayılır — ölçülen
           arızanın ta kendisi. */
        el.classList.remove('slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');
        clearTimeout(el._slideHideT);
        el._slideHideT = 0;
        el.classList.toggle('hidden', k !== p);
      }
      doRender();
      return;
    }

    /* sekme sırasına göre yön: soldan mı sağdan mı kaysın */
    const order = ['magaza', 'cephane', 'savas', 'dunyalar', 'kahraman', 'etkinlik'];
    const oi = order.indexOf(prev), ni = order.indexOf(p);
    const forward = ni === -1 || oi === -1 ? true : ni > oi;

    const oldEl = this.pages[prev];
    const newEl = this.pages[p];
    for (const k in this.pages) {
      const el = this.pages[k];
      el.classList.remove('slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');
      if (el !== oldEl && el !== newEl) el.classList.add('hidden'); /* olası eski kalıntıları temizle */
    }

    /* HIZLI A→B→A DOKUNUŞU: geri dönülen sayfanın KENDİ gizleme
       zamanlayıcısı hâlâ beklemede olabilir; iptal edilmezse 380 ms sonra
       'hidden' geri eklenir ve menü tamamen boşalır. */
    clearTimeout(newEl._slideHideT);
    newEl._slideHideT = 0;
    newEl.classList.remove('hidden');
    newEl.classList.add(forward ? 'slide-in-right' : 'slide-in-left');
    newEl.getBoundingClientRect(); /* başlangıç konumunu kesinleştir (reflow'u zorla) */

    doRender();

    /* reflow zaten gerçekleştiği için rAF beklemeden hedef duruma geçebiliriz —
       bazı arka plan/iframe bağlamlarında rAF gecikebilir veya hiç tetiklenmeyebilir */
    newEl.classList.remove('slide-in-right', 'slide-in-left');
    oldEl.classList.add(forward ? 'slide-out-left' : 'slide-out-right');

    clearTimeout(oldEl._slideHideT);
    oldEl._slideHideT = setTimeout(() => {
      oldEl.classList.add('hidden');
      oldEl.classList.remove('slide-out-left', 'slide-out-right');
    }, 480);
  }

  startNext() {
    this.game.audio.play('cta');
    const nm = this.homeTarget();
    this.game.startRun(nm.w, nm.m);
  }

  /** Sefer haritasından görev seçimi: koşu HEMEN başlamaz — seçim kaydedilir,
      ana menüye dönülür; SAVAŞ butonu bu görevi başlatır. */
  setPick(w, m) {
    this._pick = { w, m };
    try {
      localStorage.setItem('kh_pick', w + ':' + m);
      localStorage.setItem('kh_lastWorld', String(w));
    } catch (e) { /* sessiz */ }
  }

  /** Kayıtlı görev seçimi (geçerliyse). */
  storedPick() {
    if (!this._pick) {
      try {
        const raw = localStorage.getItem('kh_pick') || '';
        const [w, m] = raw.split(':').map(Number);
        if (w && m) this._pick = { w, m };
      } catch (e) { /* sessiz */ }
    }
    const p = this._pick;
    if (!p) return null;
    if (p.w < 1 || p.w > WORLDS.length || p.m < 1 || p.m > MISSIONS_PER_WORLD) return null;
    if (!missionUnlocked(this.game.progress, p.w, p.m)) return null;
    return p;
  }

  /** Ana ekranın hedefi: son oynanan dünya + o dünyadaki sıradaki görev.
      Hiç oynanmadıysa genel sıradaki göreve düşer. */
  homeTarget() {
    const g = this.game;
    const pick = this.storedPick();
    if (pick) return { w: pick.w, m: pick.m };
    let w = 0;
    try { w = Number(localStorage.getItem('kh_lastWorld')) | 0; } catch (e) { /* sessiz */ }
    if (!w || w < 1 || w > WORLDS.length || !worldUnlocked(g.progress, w)) return nextMission(g.progress);
    const cleared = g.progress[w] | 0;
    return { w, m: Math.min(MISSIONS_PER_WORLD, cleared + 1) };
  }

  /* ── SAYFA: SAVAŞ (ev — harita ortada) ── */

  renderHome() {
    const g = this.game;
    const nm = this.homeTarget();
    const wd = WORLDS[nm.w - 1];
    const cleared = g.progress[nm.w] | 0;

    /* harita çerçevesi */
    this.mapStage.style.setProperty('--wc', wd.color);
    document.getElementById('map-world-no').textContent = nm.w;
    document.getElementById('map-world-name').textContent = wd.name;
    document.getElementById('map-world-fill').style.width = (cleared / MISSIONS_PER_WORLD * 100) + '%';
    document.getElementById('map-world-count').textContent = cleared + '/' + MISSIONS_PER_WORLD;
    const mno = document.getElementById('map-mission-no');
    if (mno) mno.textContent = nm.m;

    /* savaş rıhtımı */
    const def = missionDef(nm.w, nm.m);
    document.getElementById('battle-mission').textContent =
      'GÖREV ' + nm.m + ' · ' + def.objective;   // v55: dünya adı üstteki çubukta zaten yazılı (alt satır kesiliyordu)
    this._renderGoal();

    const tv = document.getElementById('top-trophy-val');
    if (tv) tv.textContent = this.totalClears();

    this.renderChestRow();
    this.renderHomeV3();
    /* Diyoramayı EN SON çiz: sandık satırı dolduktan sonra esnek harita
       nihai boyutuna oturur; böylece ilk karede doğru boyda çizilir (şişik
       448 → kırpılmış "sadece ay+kule" hatası olmaz). */
    this.drawHomeMap();
  }

  /** Menü v3: Savaş Geçişi rozeti + etkinlik pankartı + buton bağları. */
  renderHomeV3() {
    const g = this.game;
    const lvlEl = document.getElementById('tbl-num');
    if (lvlEl) {
      const alv = g.accountLevel();
      const aprog = g.accountProgress();
      lvlEl.textContent = alv;
      const f = document.getElementById('tbl-fill');
      const tx = document.getElementById('tbl-txt');
      if (f) f.style.width = Math.min(100, aprog.cur / aprog.need * 100) + '%';
      if (tx) tx.textContent = aprog.cur + '/' + aprog.need;
      const tb = document.getElementById('tb-level');
      if (tb) tb.style.setProperty('--xp', Math.min(100, aprog.cur / aprog.need * 100).toFixed(1));   // v64 XP halkası
      if (tb) tb.setAttribute('aria-label', 'Hesap seviyesi ' + alv + ' · ' + aprog.cur + '/' + aprog.need);
      if (tb && !tb.onclick) tb.onclick = () => { g.audio.play('click'); this.showAccountJourney(); };

      const tier = g.bpTier();
      const prog = g.bpProgress();
      const bt = document.getElementById('bpb-tier');
      if (bt) bt.textContent = tier;
      const bf = document.getElementById('bpb-fill');
      const btx = document.getElementById('bpb-txt');
      if (bf) bf.style.width = Math.min(100, prog.cur / prog.need * 100) + '%';
      if (btx) btx.textContent = prog.cur + '/' + prog.need;
      const bb = document.getElementById('bp-banner');
      if (bb && !bb.onclick) bb.onclick = () => { g.audio.play('click'); this._dd(false); this.showBattlePass(); };
    }
    /* ESKİ ETKİNLİK PANKARTI (#event-banner) ve #btn-event-home SİLİNDİ:
       ikisi de HTML'de yoktu, yani bu iki blok ölü koddu (v30 taraması). */
    document.querySelectorAll('.tb-cur').forEach((b) => {
      if (!b.onclick) b.onclick = () => { g.audio.play('click'); this.setPage('magaza'); };
    });
    this.refreshQuestChip();
  }

  /** ÜST ŞERİTTEKİ GÖREVLER KARTI (v30) — savaş biletinin ikizi.
      Bilgi sırası kasıtlı: oyuncu önce ALINACAK bir şey olup olmadığını
      görür (alt satır + köşe noktası), sonra haftalık puanı. Rozet yalnız
      bekleyen ödül varken yanar — sürekli yanan rozet iki günde öğrenilir
      ve görünmez olur. Kart üst şeritte yaşadığı için HER sekmede
      görünür: tazeleme setPage'den geçer (tek yer). */
  refreshQuestChip() {
    const g = this.game, d = g.dailies;
    const card = document.getElementById('quest-open');
    const sub = document.getElementById('quest-teaser-sub');
    const bdg = document.getElementById('quest-teaser-badge');
    const fill = document.getElementById('quest-pts-fill');
    if (!d) return;
    d.touch();                       // uygulama açıkken gece yarısı geçilebilir
    const pts = d.points();
    const waiting = d.pending();
    if (fill) fill.style.width = Math.min(100, pts / WEEKLY_MAX_PTS * 100) + '%';
    if (sub) sub.textContent = !d.claimedToday()
      ? 'GÜNLÜK HAZIR'
      : pts + '/' + WEEKLY_MAX_PTS + ' PUAN';
    if (bdg) bdg.classList.toggle('hidden', !waiting);
    if (card) card.classList.toggle('hot', waiting);
    /* v63 M1: çekmece rozeti = bekleyen iş sayısı (görev + bilet + günlük hedef) */
    let n = waiting ? 1 : 0;
    try { const bt = g.bpTier(); for (let t = 1; t <= bt; t++) if (g.bpCanClaim(t, 'free') || g.bpCanClaim(t, 'premium')) { n++; break; } } catch (e) { /* */ }
    try { const L = Daily.left(g.meta), es = document.getElementById('dd-ev-sub'); if (es) es.textContent = L > 0 ? 'Bugün ' + L + ' hedef kaldı' : 'Bugünün hedefleri tamam'; } catch (e) { /* */ }
    const nb = document.getElementById('tb-daily-n');
    if (nb) { nb.textContent = n; nb.classList.toggle('hidden', !n); }
    const tb = document.getElementById('tb-daily'); if (tb) tb.classList.toggle('hot', n > 0);
  }
  _dd(open) {
    const d = document.getElementById('daily-drawer'); if (!d) return;
    if (open) { this.refreshQuestChip(); d.classList.remove('hidden', 'out'); d.setAttribute('aria-hidden', 'false'); }
    else if (!d.classList.contains('hidden')) { d.classList.add('out'); d.setAttribute('aria-hidden', 'true'); setTimeout(() => d.classList.add('hidden'), 260); }
  }

  /** Diyoramayı harita kutusuna çiz — gök tırmanışı sahnesi (skyMap.js).
      Tamamen önbellekli: dünya/ilerleme/boyut değişmedikçe tek blit bile yok. */
  drawHomeMap() {
    const g = this.game;
    const nm = this.homeTarget();
    const wd = WORLDS[nm.w - 1];
    const cleared = g.progress[nm.w] | 0;
    preloadIsles(wd.floor);          // tam boy sprite + PİN (hazırsa bedava)
    const box = this.map3dCanvas.parentElement;
    /* Kutu ne ise O: eskiden H alttan 150'ye kelepçeleniyordu ve kısa
       kabukta (çerçeve 70 px) tuval taşıp ORTA BANDI gösteriyordu —
       ada da kale de kırpılıyordu. Ölçülen: 248×150 tuval / 251×70 kutu.
       İLK YERLEŞİMDE KUTU 0 OLABİLİR: o an boyanırsa taban değerlerle
       (160×56) çizilir ve `_mapKey` önbelleği yüzünden bir daha çağrılana
       kadar öyle KALIR. Ölçülemeyen kutuya boya yapılmaz — AMA VAZGEÇİLMEZ:
       ölçülemeyen bir kutu "yok" değil "henüz değil"dir.
       YENİDEN DENEME setTimeout İLE (2026-09-07, doğrulamada ölçüldü):
       ilk sürüm `requestAnimationFrame` kullanıyordu ve GİZLİ BELGEDE rAF
       HİÇ ATEŞLENMEZ — yani korumanın var olma sebebi olan durumda zincir
       tek denemede ölüyor, `_mapKey` boş kalıyor ve harita bir daha hiç
       boyanmıyordu (ölçüldü: tampon 300×150 = hiç atanmamış, dolu %0).
       Bu, bu dosyanın kendi tekrar eden dersinin ("gizli belgede zaman
       ilerlemez") tam o dersi kapatmak için yazılan kodun İÇİNDE ihlaliydi.
       Zamanlayıcılar gizli belgede kısıtlanır ama ÇALIŞIR. */
    if (!box.clientWidth || !box.clientHeight) {
      if ((this._mapTry = (this._mapTry || 0) + 1) < 30) {
        clearTimeout(this._mapRetryT);
        this._mapRetryT = setTimeout(() => this.drawHomeMap(), 32);
      }
      return;
    }
    this._mapTry = 0;
    const W = Math.round(box.clientWidth);
    const H = Math.round(box.clientHeight);
    const key = wd.id + ':' + cleared + ':' + W + 'x' + H;
    if (key === this._mapKey) return;
    this._mapKey = key;

    const art = getClimbArt(wd, cleared, W, H, 'preview');
    const cv = this.map3dCanvas;
    cv.width = art.width; cv.height = art.height;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    if (ctx) { ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(art, 0, 0); }
  }

  /* ── Sandık yuvaları ── */

  renderChestRow() {
    const g = this.game;
    const now = Clock.now();
    let html = '';
    for (let i = 0; i < CHEST_SLOTS; i++) {
      const c = g.chests.slots[i];
      if (!c) {
        html += '<div class="chest-slot empty"><span class="cs-plus">+</span><span class="cs-state">BOŞ YUVA</span></div>';
        continue;
      }
      const C = CHESTS[c.t];
      let stateHtml, cls, extra = '';
      if (c.st === 'ready') {
        cls = 'ready';
        stateHtml = '<span class="cs-state open">AÇ!</span>';
        extra = '<span class="cs-rays" aria-hidden="true"></span>';
      } else if (c.st === 'unlocking') {
        cls = 'unlocking';
        stateHtml = '<span class="cs-state timer" data-at="' + c.at + '">' + fmtDur(c.at - now) + '</span>' +
          '<span class="cs-prog" aria-hidden="true"><i data-prog="' + i + '" style="transform:scaleX(' + this._chestProg(c, now) + ')"></i></span>';
      } else {
        cls = 'locked';
        stateHtml = '<span class="cs-state">' + fmtDur(g.chests.lockMs(i)) + '</span>';
      }
      /* v51: elmas fiyatı YALNIZ çözülmekte olan sandıkta — kilitli sandık önce
         "AÇ" ile çözülmeye başlar; hızlandırma seçenekleri ondan sonra gelir. */
      const skipHtml = c.st !== 'unlocking' ? ''
        : '<span class="cs-skip" data-skip="' + i + '"><span class="stone"></span>' + g.chests.skipCostFor(i) + '</span>';
      html +=
        '<button class="chest-slot ' + cls + '" data-i="' + i + '" style="--cc:' + C.color + ';--cg:' + C.glow + ';--ca:' + (C.accent || C.color) + '">' +
          '<span class="cs-glow" aria-hidden="true"></span>' + extra +
          (c.st === 'locked' ? '' : '<span class="cs-motes" aria-hidden="true"><i></i><i></i><i></i></span>') +
          '<span class="cs-art">' + chestSVG(c.t) + '<i class="cs-floor" aria-hidden="true"></i></span>' +
          stateHtml +
          skipHtml +
        '</button>';
    }
    this.chestRow.innerHTML = html;
    freezeChestSVG(this.chestRow, true);

    this.chestRow.querySelectorAll('.chest-slot[data-i]').forEach((el) => {
      el.addEventListener('click', () => {
        this.onChestTap(Number(el.getAttribute('data-i')));
      });
    });

    /* meta sandıklar: ücretsiz + zafer */
    const fg = document.getElementById('free-chest-glyph');
    if (fg) {
      if (!fg.firstChild) { fg.innerHTML = chestSVG('ahsap'); freezeChestSVG(fg); }
      const vg = document.getElementById('victory-chest-glyph');
      if (vg && !vg.firstChild) { vg.innerHTML = chestSVG('kadim'); freezeChestSVG(vg); }
      const rem = g.chests.freeReadyIn();
      document.getElementById('free-chest').classList.toggle('ready-now', rem <= 0);
      document.getElementById('free-chest-state').textContent = rem <= 0 ? 'HAZIR — AÇ!' : fmtDur(rem);
      const vcNow = g.chests.vicCount(), need = g.chests.vicNeed;
      document.getElementById('victory-chest-state').textContent = Math.min(vcNow, need) + '/' + need;
      document.getElementById('victory-chest-state').title = Math.min(vcNow, need) + '/' + need + ' zafer gerekli';
      document.getElementById('vc-fill').style.width = Math.min(100, vcNow / need * 100) + '%';
      document.getElementById('victory-chest').classList.toggle('ready-now', vcNow >= need);
    }
  }

  /** Çözülme ilerlemesi 0-1 (reklam indirimi ilerlemeyi öne atar). */
  _chestProg(c, now) {
    const total = CHESTS[c.t].time * 1000;
    if (!total || c.st !== 'unlocking') return 1;
    return Math.max(0, Math.min(1, 1 - (c.at - now) / total)).toFixed(3);
  }

  updateChestCountdowns() {
    const now = Clock.now();
    const g = this.game;
    this.chestRow.querySelectorAll('.cs-state.timer').forEach((el) => {
      el.textContent = fmtDur(Number(el.getAttribute('data-at')) - now);
    });
    this.chestRow.querySelectorAll('.cs-prog i[data-prog]').forEach((el) => {
      const c = g.chests.slots[Number(el.getAttribute('data-prog'))];
      if (c) el.style.transform = 'scaleX(' + this._chestProg(c, now) + ')';
    });
    /* elmas fiyatı kalan süreyle birlikte düşer — canlı tazelenir */
    this.chestRow.querySelectorAll('.cs-skip[data-skip]').forEach((el) => {
      const i = Number(el.getAttribute('data-skip'));
      const cost = g.chests.skipCostFor(i);
      const b = el.lastChild;
      if (b && b.nodeType === 3) b.nodeValue = String(cost);
      else el.innerHTML = '<span class="stone"></span>' + cost;
    });
  }

  /** Yuvaya dokunmak: sandık HAZIRSA doğrudan açılış törenini başlatır
      (fazladan "Sandığı Aç" tıklaması istemez). Değilse İNCELEME POP-UP'ını
      açar (kilit süresi, Gem ile hemen açma vb.). */
  onChestTap(i) {
    const g = this.game;
    const c = g.chests.slots[i];
    if (!c) return;
    g.audio.play('click');
    if (c.st === 'ready') {
      g.audio.play('panel');
      g.chests.ceremony(c.t, i, () => { this.refreshWallet(); this.renderChestRow(); });
      return;
    }
    this.openChestInspect(i);
  }

  /** Gem ile kilidi anında bitir (yuva satırındaki eski kısayol —
      pop-up dışından çağrılırsa hâlâ çalışır). */
  onChestSkip(i) {
    const g = this.game;
    const cost = g.chests.skipCostFor(i);
    if (g.readStones() < cost) {
      g.audio.play('error');
      this.toast('YETERSİZ GEM — ' + cost + ' GEREKİR');
      return;
    }
    if (g.chests.finishWithStone(i, g)) {
      g.audio.play('gemspend');
      this.refreshWallet();
      this.renderChestRow();
    }
  }

  /* ── SANDIK İNCELEME POP-UP'ı ──
     Yuvaya dokununca sandık pop-up'ta gökten DÜŞER, nadirliği yazılır ve
     durumuna göre eylemler sunulur: kilidi çöz · Gem ile hemen aç · aç. */
  openChestInspect(i) {
    const g = this.game;
    const c = g.chests.slots[i];
    if (!c) return;
    const C = CHESTS[c.t];
    this._inspectSlot = i;
    const scr = document.getElementById('screen-chestinspect');
    const chestEl = document.getElementById('ci-chest');
    const auraEl = document.getElementById('ci-aura');
    const nameEl = document.getElementById('ci-name');
    const descEl = document.getElementById('ci-desc');

    scr.style.setProperty('--cc', C.color);
    scr.style.setProperty('--cg', C.glow);
    scr.style.setProperty('--ca', C.accent || C.color);
    chestEl.innerHTML = chestSVG(c.t);
    auraEl.style.background = 'radial-gradient(circle at 50% 45%, ' + (C.glow || 'rgba(255,255,255,0.3)') + ', transparent 68%)';
    nameEl.textContent = C.name;
    nameEl.style.color = C.accent || C.color;
    descEl.textContent = C.desc || '';
    this._chestMeta(document.getElementById('ci-meta'), c.t);

    scr.classList.remove('hidden');
    this._refreshChestInspect();

    /* 3B model aşağıdan yükselir; WebGL yoksa SVG glif aynı yönde (CSS) */
    const has3d = this._ciStart3d(C, c.st);
    scr.classList.toggle('has3d', has3d);
    if (!has3d) {
      chestEl.classList.remove('drop');
      void chestEl.offsetWidth;
      chestEl.classList.add('drop');
    }
    g.audio.play('panel');
  }

  /* ── v52: İNCELEMEDE 3B SANDIK — CR usulü alttan yükseliş ──
     Kendi WebGL sahnesi (tören sahnesiyle aynı model/ışık). Döngü yalnız
     pop-up açıkken döner; kapanınca rAF biter. Yükseliş: 0,56 sn back-out
     (tepede ~%10 aşma) → konma ezilmesi 0,32 sn + kıvılcım → nefes. */
  _ciStart3d(C, st) {
    const scr = document.getElementById('screen-chestinspect');
    const stage = scr && scr.querySelector('.ci-stage');
    if (!stage) return false;
    /* v53 B3: TEK WebGL BAĞLAMI — inceleme artık kendi sahnesini kurmaz; törenin
       tuvali (#chest-canvas-3d) ve sahnesi (chests.scene3d) buraya TAŞINIR,
       kapanınca yerine döner. Telefonda iki canlı bağlam yerine bir. */
    const cv = document.getElementById('chest-canvas-3d');
    if (!cv) return false;
    const CS = this.game.chests;
    if (CS.scene3d === undefined || CS.scene3d === null) {
      if (CS._s3dFail) return false;
      try { CS.scene3d = new ChestScene3D(cv); }
      catch (e) { CS.scene3d = null; CS._s3dFail = true; console.warn('3B sandık sahnesi kurulamadı, SVG yedeğe düşüldü.', e); return false; }
    }
    if (!this._cvHome) this._cvHome = { p: cv.parentNode, n: cv.nextSibling };
    if (cv.parentNode !== stage) stage.appendChild(cv);
    cv.classList.add('ci-canvas3d');
    cv.style.display = 'block';
    const s = CS.scene3d;
    const w = stage.clientWidth || 300, h = stage.clientHeight || 200;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    s.setSize(w, h);
    s.setChest(C);
    if (this._ciRaf) cancelAnimationFrame(this._ciRaf);
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const D = 0.56, LAND = 0.32, S = 1.14, DEPTH = 130;
    const back = (u) => { const k = 1.9; const v = u - 1; return 1 + (k + 1) * v * v * v + k * v * v; };
    const t0 = performance.now();
    let last = t0, puffed = false;
    const loop = (now) => {
      if (scr.classList.contains('hidden')) { this._ciRaf = 0; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const e = reduce ? 9 : (now - t0) / 1000;
      const u = Math.min(1, e / D);
      let posY = -DEPTH * (1 - back(u));
      let sx = S, sy = S;
      if (u < 1) { sy = S * (1 + 0.07 * (1 - u)); sx = S * (1 - 0.04 * (1 - u)); }
      else {
        const l = (e - D) / LAND;
        if (l < 1) { const q = Math.sin(l * Math.PI) * 0.085 * (1 - l); sy = S * (1 - q); sx = S * (1 + q * 0.6); }
        if (!puffed) { puffed = true; for (let k = 0; k < 7; k++) s._spawnSpark(); }
        posY += Math.sin((e - D) * 1.7) * 1.4;
      }
      const pulse = 0.5 + Math.sin(e * 3.2) * 0.5;
      s.renderFrame({
        dt, posY, scaleX: sx, scaleY: sy, scaleZ: S, open: 0,
        seam: st === 'ready' ? 0.55 + pulse * 0.45 : (st === 'unlocking' ? 0.15 + pulse * 0.25 : 0),
        shadowK: Math.max(0, Math.min(1, 1 + posY / 60)),
      });
      this._ciRaf = requestAnimationFrame(loop);
    };
    this._ciRaf = requestAnimationFrame(loop);
    return true;
  }

  /** İnceleme pop-up'ının durum + eylem bölümünü (yuva durumuna göre) kurar. */
  _refreshChestInspect() {
    const g = this.game;
    const i = this._inspectSlot;
    const c = g.chests.slots[i];
    const scr = document.getElementById('screen-chestinspect');
    if (!scr || scr.classList.contains('hidden')) return;
    if (!c) { scr.classList.add('hidden'); return; }
    const C = CHESTS[c.t];
    const stateEl = document.getElementById('ci-state');
    const actEl = document.getElementById('ci-action');
    const now = Clock.now();

    if (c.st === 'ready') {
      stateEl.innerHTML = '<span class="ci-ready">HAZIR</span>';
      actEl.innerHTML = '<button class="btn-rune btn-primary ci-open">AÇ</button>';
      actEl.querySelector('.ci-open').onclick = () => this._openInspectedChest();
    } else if (c.st === 'unlocking') {
      /* ÇÖZÜLÜYOR: hızlandırma seçenekleri ANCAK şimdi — elmasla hemen aç
         (fiyat kalan süreyle canlı düşer) + reklamla 30 dk. */
      const cost = g.chests.skipCostFor(i);
      stateEl.innerHTML = '<span class="ci-timer" data-at="' + c.at + '">' + fmtDur(c.at - now) + '</span>' +
                          '<span class="ci-timer-lbl">kilit çözülüyor</span>';
      actEl.innerHTML =
        '<button class="btn-rune btn-primary ci-instant"><span class="stone"></span><b class="ci-cost">' + cost + '</b> · HEMEN AÇ</button>';
      actEl.querySelector('.ci-instant').onclick = () => this._instantOpenInspected();
    } else {
      /* KİLİTLİ: tek eylem "AÇ" = çözülmeyi başlat. Elmas/reklam burada YOK. */
      const lockMs = g.chests.lockMs(i);
      const busy = g.chests.anyUnlocking();
      stateEl.innerHTML = '<span class="ci-lockt">' + fmtDur(lockMs) + '</span>' +
                          '<span class="ci-timer-lbl">' + (busy ? 'önce çözülen sandık bitmeli' : 'açılma süresi') + '</span>';
      actEl.innerHTML =
        '<button class="btn-rune btn-primary ci-unlock"' + (busy ? ' disabled' : '') + '>AÇ</button>';
      const ub = actEl.querySelector('.ci-unlock');
      if (ub) ub.onclick = () => {
        if (g.chests.startUnlock(i)) { g.audio.play('unlockstart'); this._refreshChestInspect(); this.renderChestRow(); Notify.ask(); }
        else { g.audio.play('error'); this.toast('AYNI ANDA TEK SANDIK ÇÖZÜLÜR'); }
      };
    }

    /* ── REKLAM HIZLANDIRMASI: yalnız ÇÖZÜLEN sandıkta, sandık başına BİR kez, 30 dk ── */
    if (c.st === 'unlocking') {
      const done = !g.chests.canAdBoost(i);
      actEl.insertAdjacentHTML('beforeend',
        '<button class="btn-rune btn-ad ci-ad"' + (done ? ' disabled' : '') + '>' +
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 6.5 L18 12 L9 17.5 Z"/></svg>' +
          (done ? 'REKLAM HAKKI BİTTİ' : 'REKLAM İZLE · +30 DK') +
        '</button>');
      const ab = actEl.querySelector('.ci-ad');
      if (ab && !done) ab.onclick = () => this._adBoostInspected();
    }
  }

  /** Reklam izle → bu sandığın kilidini 30 dk ilerlet (sandık başına tek hak). */
  _adBoostInspected() {
    const g = this.game;
    const i = this._inspectSlot;
    if (!g.chests.canAdBoost(i)) { g.audio.play('error'); return; }
    g.audio.play('click');
    this.closeChestInspect();
    this.showAdWatch(3, () => {
      g.chests.applyAdBoost(i);
      g.audio.play('adreward');
      this.showMenu();
      this.setPage('savas');
      this.renderChestRow();
      this.toast('30 DAKİKA İLERLETİLDİ');
      this.openChestInspect(i);
    });
  }

  /** İncelenen HAZIR sandığı açar (tören). */
  _openInspectedChest() {
    const g = this.game;
    const i = this._inspectSlot;
    const c = g.chests.slots[i];
    if (!c || c.st !== 'ready') return;
    this.closeChestInspect();
    g.audio.play('pick');
    g.chests.ceremony(c.t, i, () => { this.refreshWallet(); this.renderChestRow(); });
  }

  /** Gem öde → kilidi anında bitir → töreni aç. */
  _instantOpenInspected() {
    const g = this.game;
    const i = this._inspectSlot;
    const c = g.chests.slots[i];
    if (!c || c.st !== 'unlocking') return;
    const cost = g.chests.skipCostFor(i);
    if (g.readStones() < cost) {
      g.audio.play('error');
      this.toast('YETERSİZ GEM — ' + cost + ' GEREKİR');
      return;
    }
    if (!g.spendStones(cost)) return;
    g.audio.play('gemspend');
    this.refreshWallet();
    this.closeChestInspect();
    g.chests.ceremony(c.t, i, () => { this.refreshWallet(); this.renderChestRow(); });
  }

  updateChestInspectCountdown() {
    const scr = document.getElementById('screen-chestinspect');
    if (!scr || scr.classList.contains('hidden')) return;
    const el = scr.querySelector('.ci-timer[data-at]');
    if (el) {
      const rem = Number(el.getAttribute('data-at')) - Clock.now();
      if (rem <= 0) { this._refreshChestInspect(); this.renderChestRow(); }
      else {
        el.textContent = fmtDur(rem);
        const ce = scr.querySelector('.ci-cost');
        if (ce) ce.textContent = String(this.game.chests.skipCostFor(this._inspectSlot));
      }
    }
  }

  closeChestInspect() {
    const scr = document.getElementById('screen-chestinspect');
    if (scr) scr.classList.add('hidden');
    if (this._ciRaf) { cancelAnimationFrame(this._ciRaf); this._ciRaf = 0; }
    this._inspectSlot = -1;
    this._ciReturnCanvas();
  }

  /** v53 B3: paylaşılan 3B tuvali tören sahnesine geri koyar. */
  _ciReturnCanvas() {
    const cv = document.getElementById('chest-canvas-3d'), H = this._cvHome;
    if (!cv || !H || cv.parentNode === H.p) return;
    if (this._ciRaf) { cancelAnimationFrame(this._ciRaf); this._ciRaf = 0; }
    cv.classList.remove('ci-canvas3d');
    cv.style.display = 'none';
    if (H.n && H.n.parentNode === H.p) H.p.insertBefore(cv, H.n); else H.p.appendChild(cv);
  }

  /* ── SANDIK SATIN ALMA POP-UP'ı (v18, 2026-09-01) ──
     Mağazada bir sandığa dokunmak ARTIK töreni çağırmaz: küçük bir onay
     kartı 150 ms'de açılır, sandık yerinde zıplayıp durur (gökten düşen
     420 px'lik iniş burada YOK — o AÇILIŞ dilidir ve iki ekranı
     birbirinden ayırt edilemez yapıyordu). Kart üç şey söyler: hangi
     sandık, ne kadar, cebinde ne var. Gem YALNIZ buradaki kor butonda
     harcanır; kapatmanın üç yolu vardır (✕ · zemine dokunma · Escape),
     çünkü bir onay ekranı iptal edilebilir olmak zorundadır. */
  openChestBuy(t, opts) {
    const g = this.game;
    const C = CHESTS[t];
    const o = opts || {};
    const price = o.price != null ? o.price : C.stonePrice;
    const scr = document.getElementById('screen-chestbuy');
    if (!scr) return;
    scr.style.setProperty('--cc', C.color);
    scr.style.setProperty('--cg', C.glow);
    scr.style.setProperty('--ca', C.accent || C.color);

    const chestEl = document.getElementById('cb-chest');
    const auraEl = document.getElementById('cb-aura');
    chestEl.innerHTML = chestSVG(t);
    auraEl.style.background = 'radial-gradient(circle at 50% 45%, ' + (C.glow || 'rgba(255,255,255,0.3)') + ', transparent 68%)';

    const nameEl = document.getElementById('cb-name');
    nameEl.textContent = C.name;
    nameEl.style.color = C.accent || C.color;
    /* Küçük kartta uzun satış metni okunmaz: mağaza kartındaki KANCA
       (bir satır, "EFSANE GARANTİ" gibi) sandığın ne verdiğini zaten
       söylüyor. Kanca yoksa uzun açıklamaya düşülür. */
    const M = SHOP_META[t];
    const hookEl = document.getElementById('cb-desc');
    hookEl.textContent = (M && M.hook) ? M.hook : (C.desc || '');
    hookEl.classList.toggle('cb-hook', !!(M && M.hook));
    this._chestMeta(document.getElementById('cb-meta'), t);

    const tagEl = document.getElementById('cb-tag');
    if (o.off) { tagEl.textContent = '%' + o.off + ' İNDİRİM'; tagEl.classList.remove('hidden'); }
    else tagEl.classList.add('hidden');

    const balEl = document.getElementById('cb-bal');
    balEl.innerHTML = 'CEBİNDE <span class="stone"></span><b>' + g.readStones() + '</b>';

    const actEl = document.getElementById('cb-action');
    actEl.innerHTML =
      '<button class="btn-rune btn-primary cb-buy" type="button">' +
        (o.orig && o.orig !== price ? '<s>' + o.orig + '</s>' : '') +
        '<span class="stone"></span><b>' + price + '</b>' +
        '<em>SATIN AL</em>' +
      '</button>';
    actEl.querySelector('.cb-buy').onclick = (e) => {
      e.stopPropagation();
      if (g.readStones() < price || !g.spendStones(price)) {
        g.audio.play('error');
        this.toast('YETERİNCE GEM YOK');
        return;
      }
      if (o.onBought) o.onBought();
      g.audio.play('buy');
      this.refreshWallet();
      this.closeChestBuy();
      g.chests.ceremony(t, null, () => { this.refreshWallet(); this.renderMagaza(); });
    };

    scr.classList.remove('hidden');
    /* giriş animasyonlarını yeniden tetikle (aynı pop-up ikinci kez) */
    const cardEl = scr.querySelector('.cb-card');
    cardEl.classList.remove('pop'); chestEl.classList.remove('pop');
    void cardEl.offsetWidth;
    cardEl.classList.add('pop'); chestEl.classList.add('pop');

    scr.onpointerdown = (e) => { if (e.target === scr) this.closeChestBuy(); };
    const closeBtn = document.getElementById('cb-close');
    if (closeBtn) closeBtn.onclick = (e) => { e.stopPropagation(); this.closeChestBuy(); };
    this._cbKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); this.closeChestBuy(); } };
    document.addEventListener('keydown', this._cbKey);
    g.audio.play('panel');
  }

  closeChestBuy() {
    const scr = document.getElementById('screen-chestbuy');
    if (scr) { scr.classList.add('hidden'); scr.onpointerdown = null; }
    if (this._cbKey) { document.removeEventListener('keydown', this._cbKey); this._cbKey = null; }
    this.game.audio.play('click');
  }

  /** Kısa uyarı balonu. */
  toast(msg) {
    let t = document.getElementById('ui-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'ui-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* ── SAYFA: DÜNYALAR (CR tarzı: dünya seç → bölüm seç) ── */

  renderJourney() {
    if (this._journeyMode === 'chapters' && this._journeyWorld) this.renderChapters(this._journeyWorld);
    else this.renderWorldSelect();
  }

  /** Güvenli alan (çentik/ev çubuğu) piksel olarak — `--sab` token'ından.
      Her karede değil, sayfa çiziminde bir kez okunur. */
  _safeBottom() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--sab');
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  /** Seviye 1 — dünya kartları: her dünyanın premium diyoraması. */
  renderWorldSelect() {
    const g = this.game;
    this._journeyMode = 'worlds';
    /* BÖLÜM KİPesI KAPANDI: sayfanın dip dolgusu geri gelir (kartlar alt
       gezinmenin üstünde boşluk ister; tam kanama sahne istemez). */
    this.pages.dunyalar.classList.remove('is-chapters');
    const titleEl = document.querySelector('.journey-title');
    if (titleEl) titleEl.textContent = 'DÜNYA SEÇ';

    const contW = Math.max(280, this.pages.dunyalar.clientWidth || window.innerWidth);
    const cardW = Math.min(560, contW - 28);
    const cardH = Math.round(cardW * 0.78);
    const curW = this.homeTarget().w;

    let html = '<div class="wsel">';
    /* CR tarzı dünya yolculuğu: Dünya 1 EN ALTTA başlar, yukarı tırmanır */
    const climb = [...WORLDS].reverse();
    for (const wd of climb) {
      const open = worldUnlocked(g.progress, wd.id);      // girilebilir mi
      const done = worldCleared(g.progress, wd.id);        // kilit rozeti
      const cleared = g.progress[wd.id] | 0;
      const cur = wd.id === curW;
      /* .peek = kilitli GÖRÜNEN ama girilebilen kart. Ayrı sınıf şart:
         .locked hem soluklaştırma hem tıklama engeli taşıyordu. */
      html +=
        '<button class="wsel-card' + (done ? '' : (open ? ' peek' : ' locked')) + (cur ? ' current' : '') + '" data-w="' + wd.id + '" style="--wc:' + wd.color + '"' + (open ? '' : ' disabled') + '>' +
          '<canvas class="wsel-art" data-w="' + wd.id + '" width="' + cardW + '" height="' + cardH + '"></canvas>' +
          '<span class="wsel-shade" aria-hidden="true"></span>' +
          (cur ? '<span class="wsel-flag">ŞU AN BURADASIN</span>' : '') +
          '<div class="wsel-info">' +
            '<span class="wsel-no">DÜNYA ' + wd.id + '</span>' +
            '<b class="wsel-name">' + wd.name + '</b>' +
            '<span class="wsel-sub">' + (done ? 'BOSS: ' + wd.boss : 'KİLİTLİ — Dünya ' + (wd.id - 1) + ' boss\'unu devir') + '</span>' +
            '<div class="wsel-progress"><i style="width:' + (cleared / MISSIONS_PER_WORLD * 100) + '%"></i></div>' +
            '<span class="wsel-count">' + cleared + '/' + MISSIONS_PER_WORLD + '</span>' +
          '</div>' +
          (open ? '<span class="wsel-enter" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5 L16 12 L9 19"/></svg></span>' : '') +
          (done ? '' : '<div class="jw-lockwrap"><span class="jw-lock">' + ICONS.lock + '</span></div>') +
        '</button>';
    }
    html += '</div>';
    this.journeyEl.innerHTML = html;

    /* kart sanatları — önbellekli premium diyorama.
       On kart TAM BOY sprite tutamaz (10 × ~4,8 MB): kartlar 128 px
       thumb'dan çizilir, tam boy yalnız oynanan dünyada yaşar. */
    /* v75 KASMA: on kart sanatı TEK karede boyanıyordu (10 × tam tuval gök + ada)
       → dünya sayfası açılırken yüzlerce ms'lik donma. Artık oynanan dünya hemen,
       kalanlar görünürlük sırasıyla kare başına BİR kart; sayfa yeniden çizilirse eski kuyruk iptal. */
    const paintCards = () => {
      const tok = this._wselTok = (this._wselTok | 0) + 1;
      const list = Array.from(this.journeyEl.querySelectorAll('.wsel-art'));
      list.sort((x, y) => (Number(y.getAttribute('data-w')) === curW) - (Number(x.getAttribute('data-w')) === curW));
      const one = (cv) => {
        const wd = WORLDS[Number(cv.getAttribute('data-w')) - 1];
        warmIsleThumbs(wd.floor);
        const art = getClimbArt(wd, g.progress[wd.id] | 0, cardW, cardH, 'preview');
        cv.width = art.width; cv.height = art.height;
        cv.getContext('2d').drawImage(art, 0, 0);
      };
      if (list.length) one(list.shift());
      const step = () => {
        if (tok !== this._wselTok || !list.length) return;
        one(list.shift());
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    paintCards();
    this._islesRepaint = paintCards;

    this.journeyEl.querySelectorAll('.wsel-card:not(.locked)').forEach((el) => {
      el.addEventListener('click', () => {
        g.audio.play('click');
        this._journeyWorld = Number(el.getAttribute('data-w'));
        this._journeyMode = 'chapters';
        this.renderChapters(this._journeyWorld);
        /* NOT: burada scrollTop SIFIRLANMAZ — renderChapters sıradaki görevi
           ekranın ortasına getirir; sıfırlamak onu sessizce eziyordu. */
      });
    });

    /* aktif dünya kartına kaydır */
    /* aktif dünya kartına kaydir; yoksa en alttan (Dünya 1) başla */
    const pg = this.pages.dunyalar;
    const target = this.journeyEl.querySelector('.wsel-card.current');
    if (target) pg.scrollTop = Math.max(0, target.offsetTop - 72);
    else pg.scrollTop = pg.scrollHeight;
  }

  /** Seviye 2 — BÖLÜM SEÇİMİ: dikey ada tırmanışı.
      Görev 1 EN ALTTA, boss EN TEPEDE; düğümler boyanmış adaların TAM
      ÜSTÜNE oturur — sahne ile düğümler aynı `climbLayout`ı okur, yani
      yol verisi tek yerde yaşar. Eski sürüm düğümleri bir sinüs eğrisine
      serpiyordu: adalarla ilgisi yoktu, etiketler kenarda kırpılıyordu
      ve kullanıcı haklı olarak "net gözükmüyor, sığmıyor" dedi. */
  renderChapters(w) {
    const g = this.game;
    const wd = WORLDS[w - 1];
    this._journeyMode = 'chapters';
    /* Sahne TAM KANAR: sayfanın 96 px'lik dip dolgusu kart listesi içindir;
       boyanmış bir sahnenin altında ölü bir şerit bırakıyordu. */
    this.pages.dunyalar.classList.add('is-chapters');
    const titleEl = document.querySelector('.journey-title');
    if (titleEl) {
      /* Başlık İKİ SATIR: dünya adı + ilerleme. İlk turda bu bilgi sahnenin
         içinde yüzen bir plakettiydi ve BOSS ADASININ kalesini kapatıyordu
         (ölçüldü: plaket 62-130 px, kale külahı ~100 px). Yapışkan başlık
         zaten oradaydı; aynı bilgiyi iki yere yazmak çakışma üretir. */
      titleEl.innerHTML = '<span class="jt-main">DÜNYA ' + w + ' · ' + wd.name + '</span>' +
        '<span class="jt-sub">' + (g.progress[w] | 0) + '/' + MISSIONS_PER_WORLD + ' GÖREV · BOSS: ' + wd.boss + '</span>';
    }
    const pg = this.pages.dunyalar;
    const contW = Math.max(280, pg.clientWidth || window.innerWidth);
    /* Tırmanışın BOYU genişlikten türer: iki ada arası ≈ %9,3 × H, yani
       en dar kabukta bile düğümler arası ~104 px — parmak ölçüsü korunur.
       ÜSTTE ve ALTTA ÖRTÜLÜ PAY: sahnenin tepesini yapışkan başlık (56),
       dibini alt gezinme (96 + güvenli alan) örtüyor. Sahne bu kadar
       BÜYÜTÜLÜR ve düzen aynı kadar İÇERİ ÇEKİLİR — böylece boya kaydirma
       alanını birebir doldurur (eskiden sayfanın 96 px'lik dolgusu sahnenin
       ALTINDA boş bir şerit bırakıyordu: son adadan sonra boşluğa kaydırıyordu)
       ve hiçbir ada örtünün arkasına düşmez. */
    const PAD_T = 56;
    const PAD_B = 96 + this._safeBottom();
    const base = Math.round(Math.min(1560, Math.max(1120, contW * 3.3)));
    const H = base + PAD_T + PAD_B;
    const pad = { t: PAD_T / H, b: PAD_B / H };
    const cleared = g.progress[w] | 0;
    const lay = climbLayout(MISSIONS_PER_WORLD, 'tall', 0, pad);

    let nodes = '';
    for (let m = 1; m <= MISSIONS_PER_WORLD; m++) {
      const P = lay[m - 1];
      /* BOSS düğümü adanın MERKEZİNE değil, kayasının önüne oturur:
         merkeze konunca kalenin tam üstüne biniyor ve turun en gösterişli
         kütlesini kapatıyordu (ölçüldü). Kaydirma = (ry + derinlik·0,35). */
      /* AI adası prosedürel kayadan %20 daha SIĞ (0,80·rx ↔ 1,00·rx), yani
         0,75·rx'lik kaydırma madalyonu ucun 25 px ötesine taşırıyordu
         (ölçüldü: disk alt kenarı 287,8 · ada ucu 263,1). Kaydırma artık
         sprite'ın ölçülen derinliğinden türer; prosedürel dalda 0,75 kalır. */
      const dBelow = isleDepthBelow(wd.floor, 'b');
      const off = P.boss ? (P.r * contW * (dBelow ? dBelow * 0.40 : 0.75)) / H : 0;
      const done = cleared >= m;
      const isNext = missionUnlocked(g.progress, w, m) && !done;
      const isBoss = m === MISSIONS_PER_WORLD;
      const cls = 'cnode' + (isBoss ? ' boss' : '') + (done ? ' done' : (isNext ? ' next' : ' locked'));
      const face = isBoss
        ? '<span class="cn-skull">' + ICONS.skull + '</span>'
        : (done ? '<span class="cn-check">' + ICONS.check + '</span>' : '<b>' + m + '</b>');
      nodes +=
        '<button class="' + cls + '" data-w="' + w + '" data-m="' + m + '"' +
        ' style="left:' + (P.x * 100).toFixed(2) + '%;top:' + ((P.y + off) * 100).toFixed(2) + '%">' +
          '<span class="cn-disc">' + face + '</span>' +
          (isNext ? '<span class="cn-tag">' + (isBoss ? 'BOSS' : 'OYNA') + '</span>' : '') +
          (!done && !isNext ? '<span class="cn-lock">' + ICONS.lock + '</span>' : '') +
          (done ? this._nodeStars(w, m) : '') +
        '</button>';
    }

    this.journeyEl.innerHTML =
      '<div class="chsel" style="--wc:' + wd.color + ';height:' + H + 'px;--padb:' + PAD_B + 'px">' +
        '<canvas class="chsel-art"></canvas>' +
        nodes +
        '<span class="chsel-foot">TIRMANIŞ BURADA BAŞLAR</span>' +
      '</div>';

    preloadIsles(wd.floor);
    const paintClimbArt = () => {
      const cv2 = this.journeyEl.querySelector('.chsel-art');
      if (!cv2) return;
      const a2 = getClimbArt(wd, cleared, contW, H, 'tall', MISSIONS_PER_WORLD, pad);
      cv2.width = a2.width; cv2.height = a2.height;
      cv2.getContext('2d').drawImage(a2, 0, 0);
    };
    paintClimbArt();
    this._islesRepaint = paintClimbArt;

    this.journeyEl.querySelectorAll('.cnode:not(.locked)').forEach((el) => {
      el.addEventListener('click', () => {
        g.audio.unlock();
        g.audio.play('click');
        const w2 = Number(el.getAttribute('data-w'));
        const m2 = Number(el.getAttribute('data-m'));
        this.setPick(w2, m2);
        this._journeyMode = 'worlds';
        this.setPage('savas');
        this.toast('GÖREV ' + m2 + ' SEÇİLDİ — SAVAŞ’A BAS');
      });
    });

    /* SIRADAKİ görev GÖRÜNÜR BANDIN ortasına gelir: sayfa tepeden açılsaydı
       oyuncu on ada arasında kendini ARAMAK zorunda kalırdı. Görünür bant,
       kabuk yüksekliğinden başlık ve gezinme örtüleri düşülerek bulunur —
       yoksa "orta" dediğimiz yer gezinmenin arkasına düşebilir. */
    const scene = this.journeyEl.querySelector('.chsel');
    const target = this.journeyEl.querySelector('.cnode.next') || this.journeyEl.querySelector('.cnode.boss');
    const visH = Math.max(120, pg.clientHeight - PAD_T - PAD_B);
    const top = (scene ? scene.offsetTop : 0) + (target ? target.offsetTop : H) - (PAD_T + visH / 2);
    pg.scrollTop = Math.max(0, top);
  }

  /* ── SAYFA: MAĞAZA ── */

  /* ═══════════ MAĞAZA KANCALARI (2026-08-31) ═══════════
     Üçü de kullanıcı seçimi. Ortak kural: bir kanca OYUNCUYA BİR ŞEY
     VERİR (bedava sandık, indirim, iki katı gem) — hiçbiri sayaç
     baskısıyla korkutmaz. Durum localStorage'da yaşar; meta şeması
     değişmez (eski kayıtlar sessizce yeni kancaları görür). */

  /** Yerel gece yarısına göre gün indeksi — fırsat bununla döner. */
  _shopDay() {
    const d = new Date(Clock.now());
    return Math.floor((d - new Date(d.getFullYear(), d.getMonth(), d.getDate())) >= 0
      ? Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000 : 0);
  }
  _dayEndsIn() {
    const d = new Date(Clock.now());
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) - d;
  }
  /** GÜNÜN FIRSATI: gün indeksinden TÜRETİLİR — rastgele değil, çünkü
      sayfa her açılışta yeniden çizilir ve rastgele bir fırsat her
      seferinde başka sandık gösterirdi. */
  _todayDeal() {
    const POOL = ['kemik', 'kan', 'kadim', 'mistik'];
    const day = this._shopDay();
    const t = POOL[day % POOL.length];
    const C = CHESTS[t];
    const off = C.tier >= 6 ? 0.3 : 0.4;
    const price = Math.max(1, Math.round(C.stonePrice * (1 - off) / 5) * 5);
    let bought = false;
    try { bought = localStorage.getItem('kh_deal') === String(day); } catch (e) { /* */ }
    return { t, C, off: Math.round(off * 100), price, bought, day };
  }
  _markDealBought(day) {
    try { localStorage.setItem('kh_deal', String(day)); } catch (e) { /* */ }
  }
  /** Reklamlı bonus sandık: 4 saatte bir. */
  _adChestIn() {
    let last = 0;
    try { last = Number(localStorage.getItem('kh_adchest') || 0); } catch (e) { /* */ }
    return Math.max(0, last + 4 * 3600e3 - Clock.now());
  }
  _firstBuyUsed() {
    try { return localStorage.getItem('kh_firstbuy') === '1'; } catch (e) { return true; }
  }

  /* ── Gem mağazası (premium paketler) ── */
  renderStoneShop() {
    if (!this.stoneShop) return;
    const g = this.game;
    const x2 = !this._firstBuyUsed();
    let html = x2
      ? '<div class="x2-note"><b>İLK ALIŞVERİŞE ×2 GEM</b><em>tek seferlik · her pakette geçerli</em></div>'
      : '';
    for (const p of STONE_PACKS) {
      const total = p.amount + p.bonus;
      html +=
        '<button class="stone-pack' + (p.tag ? ' featured' : '') + (x2 ? ' x2' : '') + '" data-id="' + p.id + '">' +
          (x2 ? '<span class="sp-x2">×2</span>' : (p.tag ? '<span class="sp-tag">' + p.tag + '</span>' : '')) +
          '<span class="sp-glyph"><span class="stone big-stone"></span></span>' +
          '<div class="sp-body">' +
            '<span class="sp-amt">' + (x2 ? total * 2 : total) + '</span>' +
            '<span class="sp-name">' + (x2 ? total + ' + ' + total + ' bonus' : p.name + (p.bonus ? ' · +' + p.bonus + ' bonus' : '')) + '</span>' +
          '</div>' +
          '<span class="sp-price">' + (Backend.price(p.id) || p.price) + '</span>' +
        '</button>';
    }
    this.stoneShop.innerHTML = html;
    this.stoneShop.querySelectorAll('.stone-pack').forEach((el) => {
      el.addEventListener('click', () => {
        g.audio.unlock();
        const id = el.getAttribute('data-id');
        const pack = STONE_PACKS.find((p) => p.id === id);
        const total = pack.amount + pack.bonus;
        const first = !this._firstBuyUsed();
        // v45: satın almada soru YOK (kullanıcı kararı). Ebeveyn denetimi mağazanın (Play Family Link) işi.
        if (g.buyStonePack(id)) {
          if (first) {
            g.addStones(total);                       // ×2: ikinci yarısı hediye
            try { localStorage.setItem('kh_firstbuy', '1'); } catch (e) { /* */ }
            this.renderStoneShop();
            this.refreshWallet();
          }
          this.flyCurrency(el, 'stone');
          this.toast('+' + (first ? total * 2 : total) + ' GEM ALINDI' + (first ? ' (×2!)' : ''));
        }
      });
    });
  }

  /* ── Bozdurma: Gem → Altın ── */
  renderExchange() {
    if (!this.rubyExchange) return;
    const g = this.game;
    let html = '';
    for (const e of RUBY_EXCHANGE) {
      const ok = g.readStones() >= e.stone;
      html +=
        '<button class="ex-pack' + (ok ? '' : ' cant') + (e.tag ? ' featured' : '') + '" data-id="' + e.id + '">' +
          (e.tag ? '<span class="ex-tag">' + e.tag + '</span>' : '') +
          '<span class="ex-out"><span class="ruby"></span><b>' + e.rubies + '</b></span>' +
          '<span class="ex-arrow">↑</span>' +
          '<span class="ex-cost"><span class="stone"></span>' + e.stone + '</span>' +
        '</button>';
    }
    this.rubyExchange.innerHTML = html;
    this.rubyExchange.querySelectorAll('.ex-pack').forEach((el) => {
      el.addEventListener('click', () => {
        g.audio.unlock();
        const id = el.getAttribute('data-id');
        const ex = RUBY_EXCHANGE.find((x) => x.id === id);
        if (g.exchangeStones(id)) {
          this.flyCurrency(el, 'ruby');
          if (this.menuStoneVal) this.menuStoneVal.textContent = g.readStones();
          this.renderExchange();
          this.renderStoneShop();
          this.toast('+' + ex.rubies + ' ALTIN BOZDURULDU');
        } else {
          this.toast('YETERLİ GEM YOK');
        }
      });
    });
  }

  /* ── MAĞAZA VİTRİNİ (2026-08-31 revizyonu) ──
     Eski düzen yedi sandığı DİKEY liste satırı olarak diziyordu (54 px'lik
     glif + iki satır metin): mağazanın en cazip nesnesi bir ayar menüsü
     satırı gibi okunuyordu. Yeni düzen referans dilindedir — bir satırda
     ÜÇ portre kart, sandık kaidede süzülür, fiyat kalın altın plakada.
     Neden ÜÇ: 430 px'lik kabukta dördüncü kolon kartı 88 px'e düşürüyor,
     o genişlikte sandık sanatı 60 px'in altına iner ve kademe kimliği
     (pul, kristal, ejder başı) okunmaz olur. */
  /** v67 YENİ KAHRAMAN AÇILDI töreni — kart karanlıktan döner, ışın + kıvılcım, ad plakası, dokun → devam.
      Yalnız transform/opaklık; 0,7 sn sonra dokunuş kapatır, 5 sn'de kendiliğinden. */
  showHeroUnlock(id) {
    const C = CHARACTERS[id]; if (!C) return;
    const RC = ['', '#9aa3b4', '#5aa8ff', '#b27aff', '#f0c77a'];
    const rn = ['', 'ADİ', 'NADİR', 'DESTANSI', 'EFSANE'][C.rarity || 1];
    const el = document.createElement('div'); el.className = 'hu r' + (C.rarity || 1); el.style.setProperty('--rc', RC[C.rarity || 1]);
    let sp = ''; for (let k = 0; k < 14; k++) sp += '<i style="--k:' + k + '"></i>';
    el.innerHTML = '<i class="hu-dim"></i><i class="hu-rays"></i><i class="hu-ring"></i><span class="hu-sparks">' + sp + '</span>' +
      '<div class="hu-core"><span class="hu-k">YENİ KAHRAMAN AÇILDI</span>' +
      '<span class="hu-card"><img src="' + (this.heroArtUrl(id) || '') + '" alt=""><i class="hu-foil"></i></span>' +
      '<span class="hu-rar">' + rn + '</span><b class="hu-name">' + C.name + '</b>' + (C.title ? '<em class="hu-title">' + C.title + '</em>' : '') +
      '<span class="hu-tap">devam etmek için dokun</span></div>';
    document.getElementById('app').appendChild(el);
    this.game.audio.play('heroup');
    try { Haptics.fire('death'); } catch (e) { /* */ }
    const t0 = performance.now();
    const close = () => { if (el._c) return; el._c = 1; el.classList.add('out'); setTimeout(() => el.remove(), 380); this.renderMarket(); };
    el.addEventListener('pointerdown', () => { if (performance.now() - t0 > 700) close(); });
    setTimeout(close, 5000);
  }

  /** v66 KART PAZARI (M2): seçili kahraman · ikinci kahraman · iki eşya; günde bir kez her biri. */
  renderMarket() {
    const box = document.getElementById('card-market'); if (!box) return;
    const g = this.game, O = Market.offers(g), gold = g.readRubies(), gems = g.readStones();
    const lf = document.getElementById('mkt-left');
    if (lf) { const ms = Market.msLeft(); lf.textContent = 'yenilenme ' + Math.floor(ms / 3600000) + ' sa ' + Math.floor(ms / 60000) % 60 + ' dk'; }
    if (!O.length) { box.innerHTML = '<p class="mk-empty">Bütün kartların tavanda — yarın yeni teklif.</p>'; return; }
    const RC = ['', '#9aa3b4', '#5aa8ff', '#b27aff', '#f0c77a', '#ff7a5a'];
    const heroes = O.filter((o) => o.kind === 'char'), gears = O.filter((o) => o.kind !== 'char');
    /* v67: altın VE gem düğmesi yan yana (iç içe düğme olmasın diye span + data-c) */
    const btn = (o) => o.got
      ? '<span class="mk-pay"><span class="mk-buy done"><i class="mk-stamp">ALINDI</i></span></span>'
      : '<span class="mk-pay">' +
          '<span class="mk-buy' + (gold >= o.price ? '' : ' broke') + '" data-c="gold"><i class="mk-buy-sh"></i><span class="ruby"></span><b>' + o.price.toLocaleString('tr-TR') + '</b></span>' +
          '<span class="mk-buy gem' + (gems >= o.gem ? '' : ' broke') + '" data-c="gem"><i class="mk-buy-sh"></i><span class="stone"></span><b>' + o.gem.toLocaleString('tr-TR') + '</b></span>' +
        '</span>';
    const hc = (o, i) => '<button class="mk-hc' + (o.got ? ' got' : '') + (o.unlock ? ' unlock' : '') + '" data-s="' + o.slot + '" style="--n:' + i + ';--rc:' + (RC[o.rar] || RC[1]) + '">' +
      '<span class="mk-hc-frame"><img class="mk-hc-art" src="' + (this.heroArtUrl(o.id) || '') + '" alt=""><i class="mk-hc-foil"></i>' +
      (o.unlock ? '<span class="mk-hc-lock"><i></i>YENİ KAHRAMAN</span>' : '<span class="mk-hc-n"><small>KART</small>×' + o.n + '</span>') + '<span class="mk-hc-plate">' + o.name + '</span></span>' + btn(o) + '</button>';
    const gc = (o, i) => '<button class="mk-gc' + (o.got ? ' got' : '') + '" data-s="' + o.slot + '" style="--n:' + (i + heroes.length) + ';--rc:' + (RC[o.rar] || RC[1]) + '">' +
      '<span class="mk-gc-art">' + (GEAR_ART && GEAR_ART[o.icon] ? GEAR_ART[o.icon] : this.icon('zirh')) + '<b class="mk-gc-n">×' + o.n + '</b></span>' +
      '<span class="mk-gc-t"><b>' + o.name + '</b><em>EŞYA KARTI</em></span>' + btn(o) + '</button>';
    box.innerHTML = (heroes.length ? '<div class="mk-heroes">' + heroes.map(hc).join('') + '</div>' : '') +
      (gears.length ? '<div class="mk-gears">' + gears.map(gc).join('') + '</div>' : '');
    /* v76 (kullanıcı): kartın görseline/gövdesine dokunuş SATIN ALMAZ → inceleme pop-up'ı.
       Satın alma yalnız fiyat düğmesinden ([data-c]). */
    const bySlot = {}; for (const o of O) bySlot[o.slot] = o;
    box.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', (ev) => {
      const pc = ev.target.closest('[data-c]');
      if (!pc || b.classList.contains('got')) {
        const o = bySlot[b.dataset.s]; if (!o) return;
        g.audio.play('click');
        if (o.kind === 'char') this.openCharDetail(o.id); else this.openGearDetail(o.id);
        return;
      }
      const cur = pc.dataset.c;
      const r = Market.buy(g, b.dataset.s, cur);
      if (!r) { g.audio.play('error'); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); this.toast(cur === 'gem' ? 'Gem yetmiyor' : 'Altın yetmiyor'); return; }
      if (r.first) setTimeout(() => this.showHeroUnlock(r.id), 650);
      g.audio.play('buy');
      try { Haptics.fire('crit'); } catch (e) { /* */ }
      /* satın alım anı: kart parlar + yükselir, ışın patlar, kartlar yukarı savrulur, sonra ALINDI mührü */
      b.classList.add('bought');
      const fx = document.createElement('i'); fx.className = 'mk-burst';
      for (let k = 0; k < Math.min(8, r.n + 3); k++) { const c = document.createElement('i'); c.style.setProperty('--k', k); fx.appendChild(c); }
      b.appendChild(fx);
      this.toast('+' + r.n + ' ' + r.name + ' KARTI');
      this.refreshWallet();
      setTimeout(() => this.renderMarket(), 1100);
    }));
  }

  renderMagaza() {
    const g = this.game;
    this.renderMarket();
    this.renderStoneShop();
    this.renderExchange();
    const freeIn = g.chests.freeReadyIn();
    const stones = g.readStones();

    const card = (t, royal) => {
      const C = CHESTS[t];
      const M = SHOP_META[t] || { short: C.name, hook: '', tag: '' };
      const can = stones >= C.stonePrice;
      return '<button class="vcard tier' + C.tier + (royal ? ' royal' : '') + (can ? '' : ' broke') + '"' +
        ' data-t="' + t + '" style="--cc:' + C.color + ';--cg:' + C.glow + ';--ca:' + C.accent + '">' +
          '<span class="vc-rift" aria-hidden="true"></span>' +
          '<i class="vc-spark" aria-hidden="true"></i><i class="vc-spark" aria-hidden="true"></i><i class="vc-spark" aria-hidden="true"></i>' +
          (royal ? '<span class="vc-rays" aria-hidden="true"></span>' : '') +
          '<span class="vc-head"><b class="vc-name">' + M.short + '</b>' +
            '<em class="vc-kad">' + ROMAN[C.tier] + '. KADEME</em></span>' +
          '<span class="vc-art">' + chestSVG(t) + '</span>' +
          '<span class="vc-hook">' + M.hook + '</span>' +
          (M.tag ? '<span class="vc-tag">' + M.tag + '</span>' : '') +
          '<span class="vc-price"><span class="stone"></span><b>' + C.stonePrice + '</b></span>' +
          '<span class="vc-sheen" aria-hidden="true"></span>' +
        '</button>';
    };

    const deal = this._todayDeal();
    const adIn = this._adChestIn();

    /* GÜNÜN FIRSATI en üstte: mağazanın tek "bugün" nesnesi. Geri sayım
       bir korkutma değil bir HATIRLATMADIR — süre bitince fırsat başka
       bir sandığa döner, oyuncu bir şey KAYBETMEZ. */
    const dealHtml =
      '<button class="deal-card' + (deal.bought ? ' done' : '') + '" data-deal="1"' +
        ' style="--cc:' + deal.C.color + ';--cg:' + deal.C.glow + ';--ca:' + deal.C.accent + '">' +
        '<span class="dl-rays" aria-hidden="true"></span>' +
        '<span class="dl-head"><b>GÜNÜN FIRSATI</b>' +
          '<em id="deal-cd">' + (deal.bought ? 'yarın yenilenir' : fmtDur(this._dayEndsIn())) + '</em></span>' +
        '<span class="dl-art">' + chestSVG(deal.t) + '</span>' +
        '<span class="dl-body">' +
          '<b class="dl-name">' + deal.C.name + '</b>' +
          '<span class="dl-off">%' + deal.off + ' İNDİRİM</span>' +
        '</span>' +
        (deal.bought
          ? '<span class="dl-done">ALINDI</span>'
          : '<span class="dl-buy"><s>' + deal.C.stonePrice + '</s>' +
              '<span class="dl-now"><span class="stone"></span><b>' + deal.price + '</b></span></span>') +
      '</button>';

    /* Reklamlı bonus sandık: ücretsiz sandığın YANINDA değil ALTINDA —
       ikisi de bedava, ama biri zamanla biri dikkatle kazanılır. */
    const adHtml =
      '<button class="free-banner ad' + (adIn > 0 ? ' waiting' : ' ready') + '" data-t="ad">' +
        '<span class="fb-glow" aria-hidden="true"></span>' +
        '<span class="fb-art">' + chestSVG('yaygin') + '</span>' +
        '<span class="fb-txt"><b>BONUS SANDIK</b>' +
          '<em>' + (adIn > 0 ? 'Sonraki reklam sandığı' : 'Kısa bir reklam izle, sandık senin') + '</em></span>' +
        (adIn > 0
          ? '<span class="fb-cd" id="ad-cd">' + fmtDur(adIn) + '</span>'
          : '<span class="fb-cta ad"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>İZLE</span>') +
      '</button>';

    const html =
      dealHtml +
      '<button class="free-banner' + (freeIn > 0 ? ' waiting' : ' ready') + '" data-t="free">' +
        '<span class="fb-glow" aria-hidden="true"></span>' +
        '<span class="fb-art">' + chestSVG('ahsap') + '</span>' +
        '<span class="fb-txt"><b>ÜCRETSİZ SANDIK</b>' +
          '<em>' + (freeIn > 0 ? 'Yeni hasat hazırlanıyor' : 'Hasat senin — al gitsin') + '</em></span>' +
        (freeIn > 0
          ? '<span class="fb-cd" id="free-cd">' + fmtDur(freeIn) + '</span>'
          : '<span class="fb-cta">AL</span>') +
      '</button>' +
      adHtml +
      '<div class="shop-sec"><b>SEFER SANDIKLARI</b><em>anında açılır</em></div>' +
      '<div class="vit-row">' + card('yaygin') + card('kemik') + card('kan') + '</div>' +
      '<div class="shop-sec"><b>KRAL SANDIKLARI</b><em>efsane garantili</em></div>' +
      '<div class="vit-row">' + card('kadim', true) + card('mistik', true) + card('ejderha', true) + '</div>';

    this.shopChests.innerHTML = html;
    freezeChestSVG(this.shopChests, true);

    /* GÜNÜN FIRSATI */
    const dealEl = this.shopChests.querySelector('.deal-card');
    if (dealEl) dealEl.addEventListener('click', () => {
      g.audio.unlock();
      if (deal.bought) { g.audio.play('click'); this.toast('BUGÜNKÜ FIRSAT ALINDI'); return; }
      if (g.readStones() < deal.price) { g.audio.play('error'); this.toast('YETERİNCE GEM YOK'); return; }
      g.audio.play('click');
      this.openChestBuy(deal.t, {
        price: deal.price, orig: deal.C.stonePrice, off: deal.off,
        onBought: () => this._markDealBought(deal.day),
      });
    });

    /* REKLAMLI BONUS SANDIK */
    const adEl = this.shopChests.querySelector('.free-banner.ad');
    if (adEl) adEl.addEventListener('click', () => {
      g.audio.unlock();
      if (this._adChestIn() > 0) { g.audio.play('click'); this.toast('SONRAKİ BONUS SANDIK İÇİN BEKLE'); return; }
      this.showAdWatch(3, () => {
        try { localStorage.setItem('kh_adchest', String(Clock.now())); } catch (e) { /* */ }
        g.audio.play('adreward');
        this.setPage('magaza');
        g.chests.ceremony('yaygin', null, () => { this.refreshWallet(); this.renderMagaza(); });
      });
    });

    this.shopChests.querySelectorAll('.free-banner:not(.ad), .vcard').forEach((el) => {
      el.addEventListener('click', () => {
        const t = el.getAttribute('data-t');
        g.audio.unlock();
        if (t === 'free') {
          if (g.chests.freeReadyIn() > 0) { g.audio.play('click'); return; }
          if (!g.chests.claimFree()) { g.audio.play('click'); return; }
          g.chests.ceremony('ahsap', null, () => { this.refreshWallet(); this.renderMagaza(); });
        } else {
          /* SATIN ALMA ONAYI KÜÇÜK POP-UP'TA (v18): karta dokunmak hızlı bir
             onay kartı açar (150 ms), gem orada harcanır ve açılış töreni
             ancak ondan sonra başlar. Önceki sürüm onayı törenin kendi
             sahnesinde soruyordu; "inceleme" ekranı açılış ekranından ayırt
             edilemiyordu. */
          const C = CHESTS[t];
          if (g.readStones() < C.stonePrice) {
            g.audio.play('error');
            this.toast('YETERİNCE GEM YOK');
            return;
          }
          g.audio.play('click');
          this.openChestBuy(t, {});
        }
      });
    });
  }

  /** Ma\u011faza geri say\u0131mlar\u0131: \u00fccretsiz sand\u0131k \u00b7 reklam sand\u0131\u011f\u0131 \u00b7 g\u00fcn\u00fcn f\u0131rsat\u0131.
      \u00dc\u00e7\u00fc de AYNI saniye darbesinden s\u00fcr\u00fcl\u00fcr; ayr\u0131 zamanlay\u0131c\u0131 kurmak
      sayfada \u00fc\u00e7 farkl\u0131 saniyede zonklayan \u00fc\u00e7 saat demekti. S\u0131f\u0131ra inen
      ilk saya\u00e7 sayfay\u0131 tazeler (buton durumu de\u011fi\u015fir). */
  updateFreeCountdown() {
    const free = document.getElementById('free-cd');
    const ad = document.getElementById('ad-cd');
    const deal = document.getElementById('deal-cd');
    if (!free && !ad && !deal) return;
    if (free) {
      const left = this.game.chests.freeReadyIn();
      if (left <= 0) { this.renderMagaza(); return; }
      free.textContent = fmtDur(left);
    }
    if (ad) {
      const left = this._adChestIn();
      if (left <= 0) { this.renderMagaza(); return; }
      ad.textContent = fmtDur(left);
    }
    if (deal && !deal.parentElement.parentElement.classList.contains('done')) {
      const left = this._dayEndsIn();
      if (left <= 1000) { this.renderMagaza(); return; }
      deal.textContent = fmtDur(left);
    }
  }

  /* ═══════════ OYUN İÇİ ═══════════ */

  showGame() {
    this.hideAllScreens();
    this.hud.classList.remove('hidden');
    if (this.game.enemies.boss) this.bossBar.classList.remove('hidden');
    else this.bossBar.classList.add('hidden');
    this.cXp = NaN; this.cLevel = NaN; this.cTimer = NaN; this.cMoney = NaN; this.cBoss = NaN; this.cWave = '';
  }

  banner(main, sub) {
    this.bannerMain.textContent = main;
    if (sub) { this.bannerSub.textContent = sub; this.bannerSub.classList.remove('hidden'); }
    else this.bannerSub.classList.add('hidden');
    this.bannerEl.classList.add('run');
    const wasOn = !this.bannerEl.classList.contains('hidden');
    this.bannerEl.classList.remove('hidden');
    /* v73: offsetWidth ile ZORLA yerleşim yok. Gizliyken display:none → görünür geçişi animasyonu
       kendiliğinden baştan başlatır; zaten görünürse yalnız animasyon saati sıfırlanır. */
    if (wasOn) {
      const A = this.bannerEl.getAnimations ? this.bannerEl.getAnimations({ subtree: true }) : null;
      if (A && A.length) for (let i = 0; i < A.length; i++) { A[i].currentTime = 0; A[i].play(); }
      else { this.bannerEl.classList.remove('run'); void this.bannerEl.offsetWidth; this.bannerEl.classList.add('run'); }
    }
    clearTimeout(this._bt);
    this._bt = setTimeout(() => this.bannerEl.classList.add('hidden'), 2000);
  }

  /* ── Level-up seçim kartları v2 — orta-büyük, kademe renkli ──
     Kademe dili (kullanıcı spesifikasyonu): 1=gri · 2=MAVİ · 3=MOR · 4=SARI · 5=kor.
     Gri kartlar sade durur; mor+ / özel perk kartları premium çerçeve,
     köşe süsleri, dönen madalyon halkası ve parıltıyla kendini belli eder.
     Glifler cephane sanatından BAĞIMSIZ (cardArt.js). */
  showLevelUp(choices) {
    Ftue.onLevelUp(this.game);
    /* v51: ekranda DAİMA TAM 3 kart (kullanıcı kuralı) — fazlası kesilir,
       aynı kimlik iki kez gelmez. rollChoices(3) zaten 3 üretir; bu satır
       sözleşmenin ikinci kilidi. */
    const seen = new Set();
    choices = (choices || []).filter((c) => c && !seen.has(c.id) && seen.add(c.id)).slice(0, 3);
    this.hideAllScreens();
    this.game.audio.play('levelup');   /* kartlar ekrana gelirken TEK ses */
    this.bannerEl.classList.add('hidden');
    this.screens.levelup.classList.remove('hidden');

    const LEVEL_TIERS = ['#9aa0b8', '#41a8ff', '#b565ff', '#d8a284', '#b87351'];
    const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
    /* Dar telefonda "KADEME" kelimesi etikete sığmıyor ve kırpılıyor.
       Ölçü pencere değil KART ŞERİDİ genişliği: oyun sahnesi geniş
       ekranda da ortada dar bir kolon olarak durur. */
    const railW = (this.cardContainer && this.cardContainer.clientWidth) || 560;
    const kd = railW < 560 ? '' : 'KADEME ';
    let html = '';
    for (let i = 0; i < choices.length; i++) {
      const c = choices[i];
      const target = c.sig ? (c.tier || 1) : (c.level + 1);
      const tierIdx = Math.min(4, Math.max(0, target - 1));
      const isPerk = c.kind === 'special' && !c.sig;
      const myth = !!c.myth;                       // seviye ile açılan imza yeteneği
      const seher = !!c.seher;                     // SEHER'e özel kılıç yeteneği (premium kart)
      const simsek = !!c.simsek;                   // ŞİMŞEK'e özel fırtına yeteneği (premium kart)
      const korsan = !!c.korsan;                   // KARA KAPTAN'a özel barut yeteneği
      const kralice = !!c.kralice;                 // GECE KRALİÇESİ'ne özel kesik yeteneği
      const sovalye = !!c.sovalye;                 // AYAZ'a özel yemin yeteneği
      const accent = c.curse ? '#ff4d5e' : c.evo ? '#f0c77a' : seher ? '#ffd98a' : (simsek ? '#a8e8ff' : (korsan ? '#f0c96e' : (kralice ? '#bfa6ff'
        : (sovalye ? '#8fe6ff'
        : (myth ? '#ff9d3c' : (isPerk ? '#d8a284' : LEVEL_TIERS[tierIdx]))))));
      const premium = myth || isPerk || tierIdx >= 2;
      const mid = !premium && tierIdx === 1;
      const evo = !!c.evo;
      const tag = c.curse ? 'LANETLİ · GÜÇ + BEDEL' : evo ? 'EVRİM · ÜST FORM' : seher ? 'SEHER · ' + kd + ROMAN[tierIdx]
        : (simsek ? 'ŞİMŞEK · ' + kd + ROMAN[tierIdx]
        : (korsan ? 'KAPTAN · ' + kd + ROMAN[tierIdx]
        : (kralice ? 'KRALİÇE · ' + kd + ROMAN[tierIdx]
        : (myth ? 'YETENEK · ' + kd + ROMAN[tierIdx]
        : (c.sig ? 'İMZA · ' + kd + ROMAN[tierIdx]
        : (isPerk ? 'ÖZEL PERK'
        : (c.kind === 'passive' ? (c.level > 0 ? 'PASİF · SV ' + target : 'PASİF RÜN')
        : 'NİMET')))))));
      let pips = '';
      if (c.max > 1) for (let p = 1; p <= c.max; p++) pips += '<i class="' + (p <= target ? 'on' : '') + '"></i>';

      let stats = '';
      if (c.stats && c.stats.length) {
        for (const s of c.stats) {
          const to = (typeof s.to === 'number' && s.to % 1 !== 0) ? s.to.toFixed(2) : s.to;
          const arrowCls = s.dir > 0 ? 'up' : (s.dir < 0 ? 'down' : '');
          let val;
          if (s.from != null) {
            const from = (typeof s.from === 'number' && s.from % 1 !== 0) ? s.from.toFixed(2) : s.from;
            val = '<span class="s-from">' + from + '</span><span class="s-arw ' + arrowCls + '">→</span><span class="s-to ' + arrowCls + '">' + to + (s.unit || '') + '</span>';
          } else {
            val = '<span class="s-to">' + to + (s.unit || '') + '</span>';
          }
          stats += '<div class="stat-line"><span class="s-label">' + s.label + '</span>' + val + '</div>';
        }
      }

      /* SEHER kartları: destan kahramanın kılıç yeteneklerine özel premium
         çerçeve — karşı yönde dönen çift rün çemberi, kartın üstünden geçen
         hilal ışık, yükselen kor zerreleri, nefes alan madalyon halesi.
         Hepsi transform/opacity ile çalışır (kompozit katman, GPU dostu). */
      /* SEHER kartları: kademe (tierIdx) artık GÖRSEL olarak da okunur —
         aynı yetenek 2./3. kez alınırken kartın şiddeti yükselir.
         tierIdx 0-TABANLIDIR (ROMAN[tierIdx] ile etiketlenir): kademe II → 1,
         kademe III → 2. Eşikler bir kaymıştı ve III ile II birebir aynı
         görünüyordu. */
      const shTier = seher ? (tierIdx >= 2 ? ' sh-t3' : (tierIdx >= 1 ? ' sh-t2' : '')) : '';
      const zsTier = simsek ? (tierIdx >= 2 ? ' zs-t3' : (tierIdx >= 1 ? ' zs-t2' : '')) : '';
      /* KAPTAN / KRALİÇE kartları: aynı yapısal iskelet (madalyon halkası,
         kurdele, filigran glif, kenar halesi), FARKLI ritim ve renk dili —
         Kaptan ağır/dumanlı altın-yeşil, Kraliçe hızlı/keskin mavi-meneşşe. */
      const ksTier = korsan ? (tierIdx >= 2 ? ' ks-t3' : (tierIdx >= 1 ? ' ks-t2' : '')) : '';
      const kqTier = kralice ? (tierIdx >= 2 ? ' kq-t3' : (tierIdx >= 1 ? ' kq-t2' : '')) : '';
      /* AYAZ: aynı iskelet, BUZ dili — Kraliçe'nin sıcak menekşesinin ve
         Kaptan'ın ağır dumanının aksine soğuk, durgun ve KÖŞELİ. */
      const svTier = sovalye ? (tierIdx >= 2 ? ' sv-t3' : (tierIdx >= 1 ? ' sv-t2' : '')) : '';
      const heroCls = c.curse ? ' prem curse' : evo ? ' prem myth evo' : seher ? ' prem myth seher' + shTier
        : (simsek ? ' prem myth simsek' + zsTier
        : (korsan ? ' prem myth korsan' + ksTier
        : (kralice ? ' prem myth kralice' + kqTier
        : (sovalye ? ' prem myth sovalye' + svTier
        : (myth ? ' prem myth' : (premium ? ' prem' : (mid ? ' mid' : '')))))));
      html +=
        '<button class="lv-card' + heroCls + '" data-i="' + i + '" style="--tc:' + accent + '">' +
          '<span class="lv-bg" aria-hidden="true"></span>' +
          '<span class="lv-shine" aria-hidden="true"></span>' +
          (myth ? '<span class="lv-rays" aria-hidden="true"></span><span class="lv-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' : '') +
          (seher ? '<span class="sh-crescent" aria-hidden="true"></span>' +
                   '<span class="sh-flame" aria-hidden="true"></span>' +
                   '<span class="sh-mark" aria-hidden="true">' + cardGlyph(c) + '</span>' +
                   '<span class="sh-embers" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' +
                   '<span class="sh-frame" aria-hidden="true"></span>' +
                   /* Kurdele metni YALNIZ rakam: "KADEME III" 38° döndürülmüş
                      hâlde kartın overflow:hidden kenarını ~22px aşıyor ve son
                      rakam biçiliyordu — oyuncuya YANLIŞ kademe bildiriyordu
                      (III kartında "KADEME II" okunuyordu). */
                   '<span class="sh-ribbon">' + (tierIdx >= 1 ? ROMAN[tierIdx] : 'EFSANEVİ') + '</span>' : '') +
          (simsek ? '<span class="zs-arc" aria-hidden="true"></span>' +
                   '<span class="zs-bolt" aria-hidden="true"></span>' +
                   '<span class="zs-mark" aria-hidden="true">' + cardGlyph(c) + '</span>' +
                   '<span class="zs-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' +
                   '<span class="zs-frame" aria-hidden="true"></span>' +
                   '<span class="zs-ribbon">' + (tierIdx >= 1 ? ROMAN[tierIdx] : 'EFSANEVİ') + '</span>' : '') +
          (korsan ? '<span class="ks-smoke" aria-hidden="true"></span>' +
                   '<span class="ks-band" aria-hidden="true"></span>' +
                   '<span class="ks-mark" aria-hidden="true">' + cardGlyph(c) + '</span>' +
                   '<span class="ks-embers" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' +
                   '<span class="ks-frame" aria-hidden="true"></span>' +
                   '<span class="ks-ribbon">' + (tierIdx >= 1 ? ROMAN[tierIdx] : 'EFSANEVİ') + '</span>' : '') +
          (kralice ? '<span class="kq-slash" aria-hidden="true"></span>' +
                   '<span class="kq-band" aria-hidden="true"></span>' +
                   '<span class="kq-mark" aria-hidden="true">' + cardGlyph(c) + '</span>' +
                   '<span class="kq-motes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' +
                   '<span class="kq-frame" aria-hidden="true"></span>' +
                   '<span class="kq-ribbon">' + (tierIdx >= 1 ? ROMAN[tierIdx] : 'DESTAN') + '</span>' : '') +
          (sovalye ? '<span class="sv-frost" aria-hidden="true"></span>' +
                   '<span class="sv-band" aria-hidden="true"></span>' +
                   '<span class="sv-mark" aria-hidden="true">' + cardGlyph(c) + '</span>' +
                   '<span class="sv-shards" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' +
                   '<span class="sv-frame" aria-hidden="true"></span>' +
                   '<span class="sv-ribbon">' + (tierIdx >= 1 ? ROMAN[tierIdx] : 'NADİR') + '</span>' : '') +
          '<span class="lv-corner tl" aria-hidden="true"></span><span class="lv-corner tr" aria-hidden="true"></span>' +
          '<span class="lv-corner bl" aria-hidden="true"></span><span class="lv-corner br" aria-hidden="true"></span>' +
          '<span class="lv-frame" aria-hidden="true"></span>' +
          '<div class="lv-medal"><span class="lv-medal-ring" aria-hidden="true"></span>' +
            (seher ? '<span class="sh-ring2" aria-hidden="true"></span><span class="sh-halo" aria-hidden="true"></span>' : '') +
            (simsek ? '<span class="zs-ring2" aria-hidden="true"></span><span class="zs-halo" aria-hidden="true"></span>' : '') +
            (korsan ? '<span class="ks-ring2" aria-hidden="true"></span><span class="ks-halo" aria-hidden="true"></span>' : '') +
            (kralice ? '<span class="kq-ring2" aria-hidden="true"></span><span class="kq-halo" aria-hidden="true"></span>' : '') +
            (sovalye ? '<span class="sv-ring2" aria-hidden="true"></span><span class="sv-halo" aria-hidden="true"></span>' : '') +
            cardGlyph(c) + '</div>' +
          '<div class="lv-info">' +
            '<div class="lv-top"><span class="lv-tag">' + tag + '</span>' + (pips ? '<span class="lv-pips">' + pips + '</span>' : '') + '</div>' +
            '<span class="lv-name">' + c.name + '</span>' +
            (c.stag ? this._tagChip(c.stag, c.stagN) : '') +
            '<i class="lv-orn" aria-hidden="true"></i>' +
            (stats ? '<div class="stat-lines lv-stats">' + stats + '</div>' : '') +
            '<p class="lv-desc">' + c.desc + '</p>' +
          '</div>' +
        '</button>';
    }
    this.cardContainer.innerHTML = html;

    const cards = this.cardContainer.querySelectorAll('.lv-card');
    /* v56 B2 · KART TÖRENİ: kartlar nadirlik sırasıyla iner (adi önce, destan/evrim en son);
       en üst karttan önce 120 ms nefes + ışık. Yalnız animation-delay — opaklık animasyonu yok. */
    const rk = (c) => c.evo ? 4 : c.myth ? 3 : (c.kind === 'special' && (!c.sig || (c.tier | 0) >= 3)) ? 2 : c.kind === 'passive' ? 0 : 1;
    const order = choices.map((c, i) => [rk(c), i]).sort((a, b) => a[0] - b[0]);
    order.forEach(([r, i], k) => { if (!cards[i]) return; const top = r >= 3 && k === order.length - 1; cards[i].style.animationDelay = (k * 110 + (top ? 120 : 0)) + 'ms'; cards[i].classList.toggle('lv-top', top); cards[i].classList.toggle('lv-pow', !!choices[i].pow); });
    for (let i = 0; i < cards.length; i++) {
      const choice = choices[i];
      cards[i].addEventListener('click', () => this.game.pickUpgrade(choice), { once: true });
    }
    /* v53 D1: EVRİM İPUCU — kart ızgarasının altında ince şerit; evrim kartı gelmişse gizli */
    let eh = this._evoHintEl;
    if (!eh) {
      eh = document.createElement('div'); eh.className = 'lv-evo-hint';
      this.cardContainer.insertAdjacentElement('afterend', eh); this._evoHintEl = eh;
    }
    const H = this.game.weapons && this.game.weapons.evoHint ? this.game.weapons.evoHint() : null;
    const hasEvo = choices.some((c) => c && c.evo);
    if (H && !hasEvo) {
      eh.innerHTML = '<span class="leh-k">EVRİM</span><b>' + H.name + '</b>' +
        '<span class="leh-req' + (H.sig >= 5 ? ' ok' : '') + '">İMZA ' + H.sig + '/5</span>' +
        '<span class="leh-req' + (H.pas >= 2 ? ' ok' : '') + '">' + H.pasName.toUpperCase() + ' ' + H.pas + '/2</span>';
      eh.classList.remove('hidden');
    } else eh.classList.add('hidden');
    this.syncReroll();
  }

  /** Yeniden dağıt butonunun hak sayacı. */
  syncReroll() {
    if (!this.rerollBtn) return;
    const n = this.game.rerolls | 0;
    this.rrCount.textContent = n;
    this.rerollBtn.classList.toggle('spent', n <= 0);
  }

  /* ═══════════ GÖREV ŞERİDİ · MİNİ HARİTA · GÜÇ ROZETLERİ ═══════════ */


  /** Toplanan gücün adı — ekranın ortasında değil, oyuncunun ÜSTÜNDE
      (main.spawnText) değil, HUD rozetinde: banner kullanılmıyor çünkü
      güç toplamak sık bir olay ve banner "önemli an" dilini taşır. */
  powerupFlash(kind) {
    this._puKey = '';                 // rozet satırını sonraki HUD turunda yenile
  }

  hideLevelUp() { this.screens.levelup.classList.add('hidden'); }

  /* ── SAVAŞA GEÇİŞ: bulutlar sağdan-soldan kapanır, yükleme çubuğu dolar,
     perde açılırken oyun başlar. onCovered perde TAM kapalıyken çağrılır. ── */
  playBattleIntro(info, onCovered, onDone) {
    /* v56 · SAVAŞ KAPISI: bulut perdesi yerine iki demir kanat kapanır, kor mühür kilitlenir,
       yükleme mührün çevresindeki halkada dolar; kutsama varsa seçilene dek kapı açılmaz (en çok 9 sn). */
    const scr = document.getElementById('screen-loading');
    if (!scr) { onCovered(); if (onDone) onDone(); return; }
    const $ = (id) => document.getElementById(id);
    const ring = $('loading-fill'), tEl = $('loading-tip'), bl = $('loading-bless');
    $('loading-world').textContent = info.side || ('DÜNYA ' + (info.worldNo || 1) + ' · ' + (info.world || ''));
    $('loading-mission').textContent = info.mission || 'SAVAŞ';
    $('loading-obj').textContent = info.obj || '';
    $('loading-no').textContent = info.side ? '✦' : String(info.worldNo || 1);
    let st = '';
    if (info.stars >= 0) for (let i = 0; i < 3; i++) st += '<i class="' + (i < info.stars ? 'on' : '') + '"></i>';
    $('loading-stars').innerHTML = st;
    scr.style.setProperty('--wc', info.wc || '#b06a49');
    const TIPS = [
      'İmza silahın kahramanınla büyür — kademeler mavi, mor, altın…',
      'Pasif rünler her kahramanda işler: can, hız, saldırı hızı.',
      'Boss dalgalarında sandık zarı üst kademelere kayar.',
      'Canını yarının üstünde tutarsan görev yıldızı kazanırsın.',
      'İki saha sandığı açmak görevin üçüncü yıldızını verir.',
      'Elit düşmanın adı değiştiricisini söyler: kalkanlı, bölünen, patlayan…',
    ];
    tEl.textContent = TIPS[(Math.random() * TIPS.length) | 0];
    if (bl) { bl.classList.add('hidden'); bl.innerHTML = ''; }
    const g = this.game;

    ring.style.setProperty('--p', '0');
    scr.classList.remove('hidden', 'opening', 'locked');
    void scr.offsetWidth;
    scr.classList.add('closing');
    g.audio.play('gateclose');
    const t0 = performance.now();
    let covered = false, finished = false, fullAt = 0;
    const BAR_MS = 2000, COVER_MS = 720;
    const barEl = $('loading-bar'), pctEl = $('loading-pct'), stepEl = $('loading-step');
    const STEPS = ['ARENA KURULUYOR', 'DÜŞMANLAR UYANIYOR', 'RÜNLER HAZIRLANIYOR', 'KAPI AÇILIYOR'];
    let lastPct = -1, lastStep = -1;
    if (barEl) barEl.style.transform = 'scaleX(0)';
    if (pctEl) pctEl.textContent = '0%';
    const step = (now) => {
      if (finished) return;
      const t = now - t0;
      if (!covered && t >= COVER_MS) {
        covered = true;
        scr.classList.add('locked');
        try { Haptics.fire && Haptics.fire('ui'); } catch (e) { /* */ }
        try { onCovered(); } catch (e) { console.error(e); }
      }
      const k = Math.max(0, Math.min(1, (t - COVER_MS + 120) / BAR_MS));
      const e = k < 0.7 ? k * 1.18 : 0.826 + (k - 0.7) * 0.58;
      const pc = Math.min(1, e) * 100;
      ring.style.setProperty('--p', pc.toFixed(1));
      /* v60 premium yükleme: çubuk (transform) + yüzde + aşama satırı; DOM yalnız değişince yazılır */
      if (barEl) barEl.style.transform = 'scaleX(' + (pc / 100).toFixed(3) + ')';
      const pi = Math.round(pc);
      if (pi !== lastPct && pctEl) { lastPct = pi; pctEl.textContent = pi + '%'; }
      const si = pc < 34 ? 0 : pc < 68 ? 1 : pc < 99 ? 2 : 3;
      if (si !== lastStep && stepEl) { lastStep = si; stepEl.textContent = STEPS[si]; stepEl.classList.remove('sw'); void stepEl.offsetWidth; stepEl.classList.add('sw'); }
      if (k >= 1 && !fullAt) { fullAt = now; scr.classList.add('ready'); }
      if (k >= 1) {
        finished = true;
        ring.style.setProperty('--p', '100');
        scr.classList.remove('closing');
        scr.classList.add('opening');
        g.audio.play('start');
        setTimeout(() => {
          scr.classList.add('hidden');
          scr.classList.remove('opening', 'locked', 'ready');
          if (onDone) onDone();
        }, 1000);
        return;
      }
      if (document.hidden) setTimeout(() => step(performance.now()), 50);
      else requestAnimationFrame(step);
    };
    if (document.hidden) setTimeout(() => step(performance.now()), 50);
    else requestAnimationFrame(step);
  }

  /** v63 D1: kart üstünde etiket çipi — "KOR 3→4 · Kor Patlaması" (bir sonraki eşik) */
  _tagChip(t, n) {
    const T = TAGS[t]; if (!T) return '';
    const nx = T.tiers.find((tr) => tr.n > n);
    const hit = nx && nx.n === n + 1;
    return '<span class="lv-stag' + (hit ? ' hit' : '') + '" style="--sc:' + T.col + '"><b>' + tagName(t) + '</b><em>' + n + '→' + (n + 1) + (nx ? ' / ' + nx.n : '') + '</em>' + (hit ? '<i>' + nx.name + '</i>' : '') + '</span>';
  }

  /** v62 dünya olayı pankartı — üstten iner, 2,2 sn kalır, dokunuşu engellemez. */
  /** v71 D2 · EVRİM SİNEMASI — eski ad çatlayıp kırılır, yeni ad dövme altın plakayla iner.
      ≤ 1,6 sn; 0,65 sn sonra dokunuş atlatır (H4 tören sözleşmesi). Yalnız transform + opaklık. */
  evoCinema(E, onDone) {
    const host = this.hud && this.hud.parentElement, g = this.game;
    if (!host) { if (onDone) onDone(); return; }
    const rm = document.documentElement.classList.contains('rm');
    const el = document.createElement('section');
    el.className = 'evc'; el.setAttribute('data-screen-label', 'Evrim anı');
    el.innerHTML = '<i class="evc-dim"></i><i class="evc-rays"></i><i class="evc-ring"></i><i class="evc-ring r2"></i>' +
      '<div class="evc-in"><span class="evc-ico">' + cardGlyph({ kind: 'special', icon: E.icon, id: 'evo' }) + '</span>' +
      '<span class="evc-old"><span class="evc-l">' + E.from + '</span><span class="evc-r">' + E.from + '</span></span>' +
      '<span class="evc-k">EVRİM</span><b class="evc-new">' + E.to + '</b></div>' +
      '<span class="evc-sp">' + '<i></i>'.repeat(10) + '</span>';
    host.appendChild(el);
    g.audio.play('evocine');
    if (g.music && g.music.duck) g.music.duck(1400);
    setTimeout(() => { try { Haptics.fire('crit'); } catch (e) { /* */ } }, 520);
    let done = false;
    const t0 = performance.now();
    const fin = () => {
      if (done) return; done = true;
      el.classList.add('out');
      setTimeout(() => el.remove(), 260);
      if (onDone) onDone();
    };
    el.addEventListener('pointerdown', () => { if (performance.now() - t0 > 650) fin(); });
    setTimeout(fin, rm ? 900 : 1600);
  }

  eventBanner(name, sub, col) {
    const el = document.createElement('div'); el.className = 'ev-ban'; el.style.setProperty('--ec', col);
    el.innerHTML = '<i class="ev-gem"></i><span><b>' + name + '</b><em>' + sub + '</em></span>';
    this.hud.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2200);
    setTimeout(() => el.remove(), 2600);
  }

  /** v61: süper anı — ekran kenarından kahraman renginde tek flaş (transform/opaklık). */
  ultFlash(col, rar) {
    if (document.documentElement.classList.contains('rm')) return;
    const f = document.createElement('i');
    f.className = 'ult-flash r' + rar; f.style.setProperty('--uc', col);
    this.hud.appendChild(f);
    setTimeout(() => f.remove(), 700);
  }

  /** v60 KUTSAMA SEÇİMİ — kapı açılıp arena göründükten SONRA, sim donuk. Süre sınırı yok:
      oyuncu seçmeden oyun başlamaz. Seçim → kart yükselir, diğerleri söner, "SAVAŞ!" mührü, 0,75 sn sonra onPick. */
  showBlessPick(list, onPick, opt) {
    opt = opt || {};
    const host = this.hud && this.hud.parentElement;
    if (!host || !list || !list.length) { if (onPick) onPick(list && list[0]); return; }
    const g = this.game;
    let el = document.getElementById('bless-pick');
    if (el) el.remove();
    el = document.createElement('section');
    el.id = 'bless-pick'; el.className = 'bp2' + (opt.cls ? ' ' + opt.cls : ''); el.setAttribute('data-screen-label', opt.label || 'Kutsama seçimi');
    const GL = '<svg viewBox="0 0 24 24"><path d="M12 2 L14.6 9.4 L22 12 L14.6 14.6 L12 22 L9.4 14.6 L2 12 L9.4 9.4 Z"/></svg>';
    el.innerHTML = '<i class="bp2-dim"></i><div class="bp2-in">' +
      '<p class="bp2-k">' + (opt.k || 'SAVAŞTAN ÖNCE') + '</p><h3 class="bp2-t">' + (opt.t || 'BİR KUTSAMA SEÇ') + '</h3>' +
      '<p class="bp2-s">' + (opt.s || 'Bu koşu boyunca geçerli · bir güç, bir bedel') + '</p>' +
      '<div class="bp2-row">' + list.map((b, i) =>
        '<button class="bp2-card" type="button" data-i="' + i + '" style="--bc:' + b.col + ';--n:' + i + '">' +
          '<i class="bp2-rays"></i><span class="bp2-gem">' + GL + '</span>' +
          '<b class="bp2-name">' + b.name + '</b><i class="bp2-orn"></i>' +
          '<span class="bp2-plus">' + b.plus + '</span><span class="bp2-minus">' + b.minus + '</span>' +
          '<span class="bp2-go">SEÇ</span>' +
        '</button>').join('') + '</div>' +
      '<span class="bp2-stamp">' + (opt.stamp || 'SAVAŞ!') + '</span></div>';
    host.appendChild(el);
    g.audio.play('reveal');
    let done = false;
    el.querySelectorAll('.bp2-card').forEach((btn) => btn.addEventListener('click', () => {
      if (done) return;
      done = true;
      const b = list[+btn.dataset.i];
      g.audio.play('bless');
      try { Haptics.fire('crit'); } catch (e) { /* */ }
      btn.classList.add('on');
      el.classList.add('chosen');
      setTimeout(() => { el.classList.add('out'); g.audio.play(opt.endSnd || 'start'); if (onPick) onPick(b); }, 750);
      setTimeout(() => el.remove(), 1150);
    }));
  }

  /* ═══════════ SAVAŞ GEÇİŞİ (Battle Pass) ═══════════ */

  showBattlePass() {
    this.hideAllScreens();
    this.bannerEl.classList.add('hidden');
    this.screens.battlepass.classList.remove('hidden');
    const book = document.getElementById('bp-book');
    clearTimeout(this._bpAnimT);
    book.classList.remove('open', 'closing');
    this.renderBattlePass();
    void book.offsetWidth; /* reflow — kapak her açılışta kapalıdan başlasın */
    this._bpAnimT = setTimeout(() => book.classList.add('open'), 380);
  }
  hideBattlePass() {
    const book = document.getElementById('bp-book');
    clearTimeout(this._bpAnimT);
    if (book.classList.contains('open')) {
      book.classList.add('closing');
      book.classList.remove('open');
      this._bpAnimT = setTimeout(() => {
        book.classList.remove('closing');
        this.screens.battlepass.classList.add('hidden');
        this.showMenu();
      }, 820);
    } else {
      this.screens.battlepass.classList.add('hidden');
      this.showMenu();
    }
  }

  /* ═══════════ GÖREVLER: günlük giriş + haftalık kuşak ═══════════
     Sunum kasıtlı olarak "liste" değil VİTRİN: takvim, kuşak çubuğu ve
     üç kademeli ödül rafı. Ödülü VEREN taraf game.grantQuestReward;
     buradaki tek iş çizmek ve tek dokunuşla almak. */

  showQuests() {
    const g = this.game;
    if (g.dailies) g.dailies.touch();      // uygulama açıkken gece yarısı geçilebilir
    this.hideAllScreens();
    this.bannerEl.classList.add('hidden');
    const qs = this.screens.quests;
    qs.classList.remove('hidden');
    /* v48 giriş koreografisi yalnız AÇILIŞTA (alma sonrası yeniden çizim oynatmaz) */
    qs.classList.remove('q-enter'); void qs.offsetWidth; qs.classList.add('q-enter');
    clearTimeout(this._qEnterT);
    this._qEnterT = setTimeout(() => qs.classList.remove('q-enter'), 1400);
    this.renderQuests();
    this._qCountUp();
  }

  /** Puan sayacı 0'dan sayar (açılışta bir kez, ~600 ms). */
  _qCountUp() {
    const el = document.getElementById('q-pts');
    const d = this.game.dailies;
    if (!el || !d) return;
    const to = d.points(), t0 = performance.now();
    if (!to || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const step = (t) => {
      const u = Math.min(1, (t - t0) / 620);
      el.textContent = Math.round(to * (1 - Math.pow(1 - u, 3)));
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  hideQuests() {
    this.screens.quests.classList.add('hidden');
    this.showMenu();
    /* v30: GÖREVLER artık üst şeritten açılıyor, yani her sekmeden
       girilebilir — kapanışta oyuncu BULUNDUĞU sekmeye döner. Sabit
       'etkinlik' dönüşü, mağazadan giren oyuncuyu başka bir sayfaya
       ışınlıyordu. */
    this.setPage(this.page || 'savas');
  }

  /** Ödül pulu — ikon + miktar. Sandık, etkinlik sayfasındaki AYNI
      .ev-chest gliflini kullanır: yeni bir sandık çizimi ikinci bir
      görsel dil olurdu. */
  questChip(r, big) {
    if (!r) return '';
    /* v45: glif kendi madalyon kabında (.qc-g) — ölçek/parıltı kaba uygulanır */
    if (r.kind === 'rubies') return '<span class="qc-g k-ruby"><span class="ruby"></span></span><b class="qd-v">' + r.amount + '</b>';
    if (r.kind === 'stone') return '<span class="qc-g k-stone"><span class="stone"></span></span><b class="qd-v">' + r.amount + '</b>';
    const C = CHESTS[r.chest];
    const nm = big ? (C ? C.name : 'SANDIK') : (C ? C.name.split(' ')[0] : 'SANDIK');
    return '<span class="qc-g k-chest" style="--gc:' + (C ? C.accent : '#c79bff') + '"><span class="ev-chest" style="--gc:' + (C ? C.accent : '#c79bff') + '"></span></span><b class="qd-v">' + nm + '</b>';
  }

  renderQuests() {
    const g = this.game, d = g.dailies;
    if (!d) return;
    this.refreshQuestChip();     // üst şerit kartı da aynı anda tazelenir

    /* geri sayım: haftanın bitişine kalan süre */
    const ms = weekLeftMs();
    const hrs = Math.floor(ms / 3600000);
    const tv = document.getElementById('q-timer-v');
    if (tv) tv.textContent = hrs >= 24 ? (Math.floor(hrs / 24) + ' gün ' + (hrs % 24) + ' sa') : (hrs + ' sa ' + Math.floor((ms % 3600000) / 60000) + ' dk');

    /* ── günlük takvim (v76: 4 sütun; 7. gün iki sütunluk büyük ödül) ── */
    const slot = d.q.slot, took = d.claimedToday();
    const fr = this._qFresh; this._qFresh = null;   // v48: az önce alınan öğe damga animasyonu oynatır
    const st = document.getElementById('q-streak-txt');
    if (st) st.textContent = slot + '. GÜN / 7' + (d.q.cycle > 1 ? ' · ' + d.q.cycle + '. TUR' : '');
    let cal = '';
    for (const s of DAILY_STREAK) {
      const isNow = s.day === slot;
      const taken = s.day < slot || (isNow && took);
      cal += '<div class="qx-day' + (s.day === 7 ? ' fin' : '') + (isNow ? ' now' : '') + (isNow && !took ? ' open' : '') + (taken ? ' taken' : '') + (isNow && fr === 'd' ? ' fresh' : '') + '" style="--i:' + (s.day - 1) + '">'
        + '<span class="qx-day-n">' + (isNow && !took ? 'BUGÜN' : (s.day === 7 ? '7. GÜN · BÜYÜK ÖDÜL' : s.day + '. GÜN')) + '</span>'
        + '<span class="qx-day-r">' + this.questChip(s.reward, s.day === 7) + '</span>'
        + (taken ? '<i class="qx-ok" aria-label="Alındı"></i>' : '')
        + '</div>';
    }
    const calEl = document.getElementById('q-cal');
    if (calEl) calEl.innerHTML = cal;

    const mk = document.getElementById('q-makeup');
    if (mk) {
      /* Telafi hakkı kaybolan bir kontrol olarak GİZLENMEZ, ÖLÜR:
         görünmeyen bir hak "ben mi yanlış hatırlıyorum" hissi verir. */
      const used = d.usedMakeupToday();
      mk.textContent = used ? 'SERİ KORUNDU' : (d.q.makeup > 0 ? 'TELAFİ ×1' : 'TELAFİ YOK');
      mk.title = used ? 'Telafi hakkı kullanıldı' : (d.q.makeup > 0 ? 'Bir gün kaçırsan seri bozulmaz' : 'Pazartesi yenilenir');
      mk.classList.toggle('on', d.q.makeup > 0 && !used);
    }
    const cb = document.getElementById('q-claim-daily');
    if (cb) {
      cb.textContent = took ? 'YARIN GÖRÜŞÜRÜZ' : 'ÖDÜLÜ AL';
      cb.disabled = took;
    }

    /* ── haftalık kuşak (vitrin) ── */
    const pts = d.points();
    const pe = document.getElementById('q-pts');
    if (pe) pe.textContent = pts;
    const pm = document.getElementById('q-pts-max');
    if (pm) pm.textContent = '/' + WEEKLY_MAX_PTS;
    /* v76: dolum transform scaleX (boyama yok); kademe dokunulabilirse <button> */
    let notch = '';
    for (const t of WEEKLY_TIERS) {
      notch += '<i class="qx-notch' + (pts >= t.pts ? ' on' : '') + '" style="left:' + Math.min(100, t.pts / WEEKLY_MAX_PTS * 100) + '%"></i>';
    }
    let vit = '<div class="qx-track"><i class="qx-track-fill" style="transform:scaleX(' + Math.min(1, pts / WEEKLY_MAX_PTS).toFixed(3) + ')"></i>' + notch + '</div><div class="qx-tiers">';
    for (let i = 0; i < WEEKLY_TIERS.length; i++) {
      const t = WEEKLY_TIERS[i];
      const taken = d.q.tiers.includes(i);
      const ready = !taken && d.tierReady(i);
      const tag = ready ? 'button' : 'div';
      vit += '<' + tag + ' class="qx-tier ' + (taken ? 'taken' : (ready ? 'ready' : 'locked')) + (fr === 't:' + i ? ' fresh' : '') + '" data-tier="' + i + '" style="--i:' + i + '">'
        + '<span class="qx-tier-k">' + t.pts + ' PUAN</span>'
        + '<span class="qx-tier-g">' + this.questChip(t.reward) + '</span>'
        + '<span class="qx-tier-s">' + (taken ? 'ALINDI' : (ready ? 'AL' : (t.pts - pts) + ' P KALDI')) + '</span>'
        + '</' + tag + '>';
    }
    vit += '</div>';
    const ve = document.getElementById('q-vit');
    if (ve) {
      ve.innerHTML = vit;
      ve.querySelectorAll('.qx-tier.ready').forEach((el) => {
        el.onclick = () => this.claimTier(+el.dataset.tier, el);
      });
    }

    /* ── görev satırları ── */
    /* v76 GÖREV DEFTERİ: alınacaklar üstte, sonra ilerleme sırası, alınanlar dipte */
    const QI = {
      kills: '<path d="M5 4 L14.5 13.5 M19 4 L9.5 13.5 M7.5 14 L4.5 17 M6 19.5 L3.8 17.3 M16.5 14 L19.5 17 M18 19.5 L20.2 17.3"/>',
      missions: '<path d="M6 21 V3.5 M6 4.5 H17.5 L15 8.5 L17.5 12.5 H6"/>',
      boss: '<path d="M4.5 16.5 L3.5 7 L8.5 10.5 L12 4.5 L15.5 10.5 L20.5 7 L19.5 16.5 Z M5 20 H19"/>',
      objectives: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5"/>',
      waves: '<path d="M3 9 C5.5 6.5 8.5 6.5 11 9 C13.5 11.5 16.5 11.5 21 8 M3 15.5 C5.5 13 8.5 13 11 15.5 C13.5 18 16.5 18 21 14.5"/>',
    };
    let done = 0;
    const rows = WEEKLY_QUESTS.map((def) => {
      const cur = Math.min(d.prog(def), def.need), ok = d.done(def), taken = d.claimedQuest(def.id);
      if (ok) done++;
      return { def, cur, ok, taken, p: Math.min(1, cur / def.need), rank: taken ? 2 : (ok ? 0 : 1) };
    }).sort((a, b) => a.rank - b.rank || b.p - a.p);
    let list = '';
    rows.forEach((r, qi) => {
      const { def, cur, ok, taken } = r, ready = ok && !taken, chip = this.questChip(def.reward);
      list += '<div class="qx-q' + (ready ? ' ready' : '') + (taken ? ' taken' : '') + (fr === 'q:' + def.id ? ' fresh' : '') + '" style="--i:' + qi + '">'
        + '<span class="qx-q-ico"><svg viewBox="0 0 24 24">' + (QI[def.id] || '<path d="M12 3 L20 12 L12 21 L4 12 Z"/>') + '</svg></span>'
        + '<span class="qx-q-m"><span class="qx-q-t">' + def.label + '</span>'
        + '<span class="qx-q-bar"><i style="transform:scaleX(' + r.p.toFixed(3) + ')"></i></span>'
        + '<span class="qx-q-n"><b>' + cur.toLocaleString('tr-TR') + '</b>/ ' + def.need.toLocaleString('tr-TR') + '<em>+' + def.pts + ' P</em></span></span>'
        + (ready
          ? '<button class="qx-take" data-q="' + def.id + '"><span class="qx-take-r">' + chip + '</span><b>AL</b></button>'
          : '<span class="qx-q-r">' + chip + (taken ? '<i class="qx-ok" aria-label="Alındı"></i>' : '') + '</span>')
        + '</div>';
    });
    const dt = document.getElementById('q-done-txt');
    if (dt) dt.textContent = done + ' / ' + WEEKLY_QUESTS.length + ' TAMAM';
    const le = document.getElementById('q-list');
    if (le) {
      le.innerHTML = list;
      le.querySelectorAll('.qx-take').forEach((b) => {
        b.onclick = () => this.claimQuest(b.dataset.q, b);
      });
    }
  }

  claimDaily() {
    const g = this.game, d = g.dailies;
    if (!d || d.claimedToday()) { g.audio.play('error'); return; }
    this._qFresh = 'd';
    const toast = g.grantQuestReward(d.claimDaily());
    /* Sandık gününde tören sesi, para gününde satın alma sesi: ödülün
       BÜYÜKLÜĞÜ kulağa da yansımalı. */
    g.audio.play(toast && toast.includes('SANDIK') ? 'chestrare' : 'coin');
    this.renderQuests();
    this.refreshWallet();
    if (toast) this.toast(toast);
  }

  claimQuest(id, el) {
    const g = this.game, d = g.dailies;
    if (!d) return;
    this._qFresh = 'q:' + id;
    const toast = g.grantQuestReward(d.claimQuest(id));
    if (!toast) { this._qFresh = null; g.audio.play('error'); return; }
    g.audio.play('claim');
    this.rewardFrom(el);
    this.renderQuests();
    this.toast(toast);
  }

  claimTier(i, el) {
    const g = this.game, d = g.dailies;
    if (!d) return;
    this._qFresh = 't:' + i;
    const toast = g.grantQuestReward(d.claimTier(i));
    if (!toast) { this._qFresh = null; g.audio.play('error'); return; }
    g.audio.play('tierclaim');
    this.rewardFrom(el);
    this.renderQuests();
    this.toast(toast);
  }

  /* ═══════════ HESAP SEVİYESİ: kutlama ekranı + yolculuk (kilometre taşları) ═══════════ */

  /** Menüye dönüldüğünde bekleyen seviye atlama varsa (bkz. game.addAccountXp) çağrılır. */
  showAccountLevelUp(p) {
    const g = this.game;
    this.aluLevel.textContent = p.toLevel;
    const bonus = Math.min(50, (p.toLevel - 1) * 0.6);
    this.aluStats.innerHTML =
      '<div class="alu-stat"><span class="alu-stat-l">TOPLAM CAN</span><span class="alu-stat-v">+%' + bonus.toFixed(1) + '</span></div>' +
      '<div class="alu-stat"><span class="alu-stat-l">TOPLAM HASAR</span><span class="alu-stat-v">+%' + bonus.toFixed(1) + '</span></div>';
    if (p.rewards.length) {
      this.aluRewards.classList.remove('hidden');
      this.aluRewards.innerHTML = p.rewards.map((r) => {
        const C = CHESTS[r.chest];
        return '<div class="alu-reward" style="--cc:' + C.color + ';--cg:' + C.glow + '">' + chestSVG(r.chest) +
          '<div class="alu-reward-t"><b>' + C.name + '</b><span>Seviye ' + r.level + ' ödülü — ana ekranda seni bekliyor</span></div></div>';
      }).join('');
      freezeChestSVG(this.aluRewards);
    } else {
      this.aluRewards.classList.add('hidden');
      this.aluRewards.innerHTML = '';
    }
    this.accLevelupEl.classList.remove('hidden');
    g.audio.play('levelup');
    this.renderChestRow();
    this.refreshWallet();
  }

  showAccountJourney() {
    this.hideAllScreens();
    this.bannerEl.classList.add('hidden');
    this.screens.accjourney.classList.remove('hidden');
    this.renderAccountJourney();
  }

  renderAccountJourney() {
    const g = this.game;
    const lvl = g.accountLevel();
    this.ajCurLevel.textContent = lvl;
    const milestones = accountJourneyMilestones(Math.max(lvl + 12, 33));
    this.ajRail.innerHTML = milestones.map((m) => {
      const C = CHESTS[m.chest];
      const state = m.level <= lvl ? 'done' : (m.level === milestones.find((x) => x.level > lvl)?.level ? 'next' : 'locked');
      return '<div class="aj-node ' + state + '">' +
        '<div class="aj-chest" style="--cc:' + C.color + ';--cg:' + C.glow + '">' + chestSVG(m.chest) + '</div>' +
        '<div class="aj-info"><b>' + C.name + '</b><span>Seviye ' + m.level + ' ödülü</span></div>' +
        '<div class="aj-pip">' + m.level + '</div>' +
        '</div>';
    }).join('');
    freezeChestSVG(this.ajRail);
  }

  renderBattlePass() {
    const g = this.game;
    const tier = g.bpTier();
    const prog = g.bpProgress();
    document.getElementById('bp-season').textContent = BATTLE_PASS.season;
    document.getElementById('bp-tier-num').textContent = tier;
    document.getElementById('bp-xpfill').style.width = Math.min(100, prog.cur / prog.need * 100) + '%';
    document.getElementById('bp-xptxt').textContent = prog.cur + '/' + prog.need + ' GEÇİŞ XP';
    const hasPremium = g.bpHasPremium();
    const ctaEl = document.getElementById('bp-premium-cta');
    if (ctaEl) ctaEl.classList.toggle('owned', hasPremium);
    document.getElementById('bp-premium-price').textContent = BATTLE_PASS.premiumPrice;
    const buyBtn = document.getElementById('bp-buy-premium');
    if (buyBtn) buyBtn.classList.toggle('hidden', hasPremium);

    const cardHtml = (def, track) => {
      const r = def[track];
      const t = def.tier;
      const claimed = g.bpClaimed(t, track);
      const unlocked = t <= tier;
      const canClaim = g.bpCanClaim(t, track);
      const locked = track === 'premium' && !hasPremium;
      let glyph, label;
      if (r.kind === 'rubies') { glyph = '<span class="ruby"></span>'; label = '+' + r.amount; }
      else if (r.kind === 'stone') { glyph = '<span class="stone"></span>'; label = '+' + r.amount; }
      else if (r.kind === 'chest') { glyph = chestSVG(r.chest); label = CHESTS[r.chest].name.replace(' SANDIK', ''); }
      else if (r.kind === 'gear') { glyph = '<span class="bp-gear-ic">' + this.icon('zirh') + '</span>'; label = 'EŞYA'; }
      else if (r.kind === 'char') {
        const rar = CHAR_RARITIES[r.rarity];
        glyph = (claimed || unlocked) ? '<span class="bp-char-ic" style="color:' + rar.color + '">★</span>' : '<span class="bp-mystery">?</span>';
        label = rar.name;
      }
      let cls = 'bp-card ' + track;
      if (locked) cls += ' locked';
      if (claimed) cls += ' claimed';
      else if (canClaim) cls += ' claimable';
      else if (!unlocked) cls += ' future';
      const lockSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
      return '<div class="' + cls + '" data-tier="' + t + '" data-track="' + track + '">' +
               (canClaim ? '<span class="bp-card-shine" aria-hidden="true"></span>' : '') +
               '<div class="bp-card-glyph">' + glyph + '</div>' +
               '<div class="bp-card-label">' + label + '</div>' +
               (locked && !claimed ? '<span class="bp-card-lock" aria-hidden="true">' + lockSvg + '</span>' : '') +
               (canClaim && !locked ? '<span class="bp-card-cta">AL</span>' : '') +
               (claimed ? '<div class="bp-card-check">✔</div>' : '') +
             '</div>';
    };

    /* dikey ray: sol ÜCRETSİZ, sağ PREMİUM, ortada kademe düğümleri */
    let rowsHtml = '';
    BATTLE_PASS_TIERS.forEach((def, idx) => {
      const t = def.tier;
      const nodeState = t < tier ? 'done' : t === tier ? 'now' : 'future';
      rowsHtml +=
        '<div class="bp-row' + (t === tier ? ' is-now' : '') + (t % 10 === 0 ? ' is-mile' : '') + '" style="--d:' + Math.min(idx, 18) + '">' +
          cardHtml(def, 'free') +
          '<div class="bp-node ' + nodeState + '" data-tier="' + t + '"><b>' + t + '</b></div>' +
          cardHtml(def, 'premium') +
        '</div>';
    });

    document.getElementById('bp-track').innerHTML =
      '<div class="bp-lanes"><span class="bp-lane-head free">ÜCRETSİZ</span><span class="bp-lane-head premium">PREMİUM</span></div>' +
      '<div class="bp-rail" id="bp-rail">' +
        '<div class="bp-rail-line"></div><div class="bp-rail-fill" id="bp-rail-fill"></div>' +
        rowsHtml +
      '</div>';

    const rail = document.getElementById('bp-rail');
    freezeChestSVG(rail);
    rail.querySelectorAll('.bp-card.claimable').forEach((el) => {
      el.addEventListener('click', () => {
        const t = Number(el.getAttribute('data-tier'));
        const track = el.getAttribute('data-track');
        const toast = g.bpClaim(t, track);
        if (toast) { this.toast(toast); this.rewardFrom(el); this.renderBattlePass(); }
      });
    });

    /* ray dolgusu: tamamlanan kademe oranı kadar altın çizgi büyür (ray yüksekliği
       içeriğe göre "auto" olduğundan % yükseklik çözülmez — piksel cinsinden hesapla).
       rAF yerine senkron reflow-zorlama tekniği kullanılır ki geçiş animasyonu
       arka planda / görünmez sekmede de güvenilir çalışsın. */
    const fillPct = Math.min(100, (tier / BATTLE_PASS.maxTier) * 100);
    const fillEl = document.getElementById('bp-rail-fill');
    const targetPx = Math.round(rail.scrollHeight * fillPct / 100);
    fillEl.style.height = '0px';
    void fillEl.offsetHeight; /* zorla reflow — geçiş 0'dan başlasın */
    fillEl.style.height = targetPx + 'px';

    /* geçerli kademeye otomatik kaydır (scrollIntoView yerine elle hesap) */
    const curNode = rail.querySelector('.bp-node[data-tier="' + Math.max(1, tier) + '"]');
    if (curNode) {
      const scroller = document.getElementById('bp-pages');
      const scRect = scroller.getBoundingClientRect();
      const nodeRect = curNode.getBoundingClientRect();
      const target = scroller.scrollTop + (nodeRect.top - scRect.top) - scroller.clientHeight / 2 + nodeRect.height / 2;
      scroller.scrollTop = Math.max(0, target);
    }
  }

  /* ═══════════ KAHRAMANLAR ═══════════ */

  /* v50 KAHRAMAN KARTI (`.hc`): tek kalıp ADİ→DESTAN (nadirlik yalnız renk),
     EFSANE ayrı siluet (pahlı köşe + dönen altın çerçeve + taç + kor zerresi).
     Geliştirilebilir: sağ üst kor madalyon (akan çift ok + halka) + çubukta GELİŞTİR.
     Giriş animasyonu yalnız transform (v40: opaklık taşımaz). */
  renderChars() {
    const g = this.game;
    let html = '';
    let i = 0;
    const upSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><g class="hc-chev"><path d="M6 13.5 L12 7.5 L18 13.5"/><path d="M6 19 L12 13 L18 19"/></g></svg>';
    const lockSvg = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 10 V8 A5 5 0 0 1 17 8 V10 H18.4 A1.6 1.6 0 0 1 20 11.6 V20.4 A1.6 1.6 0 0 1 18.4 22 H5.6 A1.6 1.6 0 0 1 4 20.4 V11.6 A1.6 1.6 0 0 1 5.6 10 Z M9.4 10 H14.6 V8 A2.6 2.6 0 0 0 9.4 8 Z"/></svg>';
    const embers = '<span class="hc-embers" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>';
    for (const id in CHARACTERS) {
      const c = CHARACTERS[id];
      const owned = g.ownsChar(id);
      const selected = g.meta.selectedChar === id;
      const rar = CHAR_RARITIES[c.rarity || 1];
      const lvl = g.charLevel(id);
      const cards = g.charCardCount(id);
      const need = g.cardsForNext(id);
      const canUp = owned && g.canUpgradeChar(id);
      const maxed = owned && need == null;
      const pct = need ? Math.min(100, cards / need * 100) : 100;
      const isLeg = (c.rarity || 1) >= 4;
      const vars = '--rar:' + rar.color + ';--rar-glow:' + rar.glow + ';--i:' + (i++);
      const cls = 'hc' + (owned ? ' owned' : ' mystery') + (isLeg ? ' leg' : '') +
        (selected ? ' sel' : '') + (canUp ? ' up' : '');
      let bar;
      if (!owned) bar = cards > 0
        ? '<span class="hc-bar"><i style="width:' + pct + '%"></i><b>' + cards + '/' + (need || 2) + '</b></span>'
        : '<span class="hc-bar empty"><b>SANDIK</b></span>';
      else if (maxed) bar = '<span class="hc-bar maxed"><i style="width:100%"></i><b>MAKS</b></span>';
      else if (canUp) bar = '<span class="hc-bar ready"><i style="width:100%"></i><em></em><b>GELİŞTİR</b></span>';
      else bar = '<span class="hc-bar"><i style="width:' + pct + '%"></i><b>' + cards + '/' + need + '</b></span>';
      const art = owned
        ? (HERO_ART[id]
            ? '<img class="hc-img" alt="" src="' + HERO_ART[id] + '">'
            : '<canvas class="hc-cv" width="200" height="250" data-char="' + id + '"></canvas>')
        : '<canvas class="hc-sil" width="200" height="250" data-sil="' + id + '" aria-hidden="true"></canvas>';
      const corner = !owned ? '<span class="hc-lock">' + lockSvg + '</span>'
        : canUp ? '<span class="hc-up">' + upSvg + '</span>'
        : '<span class="hc-gem" aria-hidden="true"></span>';
      html +=
        '<button class="' + cls + '" data-id="' + id + '" style="' + vars + '">' +
          '<span class="hc-glow" aria-hidden="true"></span>' +
          '<span class="hc-body">' +
            (isLeg ? '<i class="hc-rim" aria-hidden="true"></i>' : '') +
            '<span class="hc-face">' +
              '<span class="hc-art">' +
                (isLeg ? '<i class="hc-rays" aria-hidden="true"></i>' : '') +
                art +
                (owned ? '<i class="hc-foil" aria-hidden="true"></i>' : '') +
                (isLeg && owned ? embers : '') +
                (selected ? '<span class="hc-sel">SEÇİLİ</span>' : '') +
              '</span>' +
              '<span class="hc-plate">' +
                '<span class="hc-name">' + c.name + '</span>' + bar +
              '</span>' +
            '</span>' +
          '</span>' +
          (owned ? '<span class="hc-lvl"><small>SV</small>' + lvl + '</span>' : '') +
          corner +
          (isLeg ? '<span class="hc-crest" aria-hidden="true"><i></i></span>' : '') +
        '</button>';
    }
    this.charGrid.innerHTML = html;

    this.charGrid.querySelectorAll('.hc-cv').forEach((cv) => {
      const def = CHARACTERS[cv.getAttribute('data-char')];
      const c2 = cv.getContext('2d');
      c2.clearRect(0, 0, cv.width, cv.height);
      drawCharPortrait(c2, cv.width / 2, cv.height / 2 + 8, 78, def);
    });
    this.charGrid.querySelectorAll('.hc-sil').forEach((cv) => {
      const def = CHARACTERS[cv.getAttribute('data-sil')];
      if (!def) return;
      const c2 = cv.getContext('2d');
      c2.clearRect(0, 0, cv.width, cv.height);
      drawCharPortrait(c2, cv.width / 2, cv.height / 2 + 8, 78, def);
      c2.globalCompositeOperation = 'source-in';
      const gr = c2.createLinearGradient(0, 0, 0, cv.height);
      gr.addColorStop(0, '#cfd6e2'); gr.addColorStop(1, '#6f6878');
      c2.fillStyle = gr;
      c2.fillRect(0, 0, cv.width, cv.height);
      c2.globalCompositeOperation = 'source-over';
    });
    this.charGrid.querySelectorAll('.hc').forEach((el) => {
      const id = el.getAttribute('data-id');
      el.addEventListener('click', () => {
        this.game.audio.play('click');
        this.openCharDetail(id);
      });
    });
  }

  /* v56 D1 · ZİRVE: üç son-oyun modunun rekoru tek şeritte (D10 öncesi kilitli tanıtım) */
  _peakStrip() {
    const g = this.game, T = towerBook(g.meta), N = nmBook(g.meta), B = Calendar.book(g.meta);
    const open = (g.progress[WORLDS.length] | 0) >= MISSIONS_PER_WORLD;
    const md = (k, v, l) => '<span class="pk-md"><b>' + v + '</b><small>' + k + '</small><em>' + l + '</em></span>';
    return '<section class="wk-peak' + (open ? '' : ' locked') + '"><div class="pk-h"><span>ZİRVE</span><small>' + (open ? 'KENDİ REKORUNLA YARIŞ' : 'DÜNYA 10\'U BİTİRİNCE TAM AÇILIR') + '</small></div>' +
      '<div class="pk-row">' + md('KULE', T.best | 0, 'EN İYİ KAT') + md('MÜHÜR', B.best | 0, 'BU HAFTA') + md('KABUS', N.clears | 0, 'ZAFER') + '</div></section>';
  }
  /* v56 C2 · günlük üç hedef */
  _dailyCard() {
    const L = Daily.list(this.game.meta), left = Daily.left(this.game.meta);
    return '<section class="wk-daily"><div class="dl-h"><span>GÜNLÜK HEDEFLER</span><small>' + (left ? (3 - left) + '/3 · ÖDÜL TAHTA SANDIK' : 'TAMAMLANDI · YARIN YENİLENİR') + '</small></div>' +
      L.map((q) => '<div class="dl-q' + (q.done ? ' done' : '') + '"><i></i><span>' + q.t + '</span></div>').join('') + '</section>';
  }
  /* v56 D3 · sezon yolu: 6 haftalık yay */
  _seasonLine() {
    const w = seasonWeek(), S = SEASON[w];
    let pips = ''; for (let i = 0; i < SEASON.length; i++) pips += '<i class="' + (i < w ? 'past' : i === w ? 'now' : '') + '"></i>';
    return '<span class="wke-season"><span class="ws-k">SEZON · BÖLÜM ' + (w + 1) + '/' + SEASON.length + ' · ' + S.n + '</span><span class="ws-l">' + S.l + '</span><span class="ws-pips">' + pips + '</span></span>';
  }
  /* v56 D4 · koleksiyon albümü: dünya başı rozet — 3 yıldızın tamamı + boss */
  _albumCard() {
    const g = this.game, per = MISSIONS_PER_WORLD;
    let full = 0, h = '';
    WORLDS.forEach((wd, i) => {
      const s = Ledger.worldStars(g.meta, wd.id, per), boss = (g.progress[wd.id] | 0) >= per, done = s >= per * 3 && boss;
      if (done) full++;
      h += '<span class="al-b' + (done ? ' done' : boss ? ' part' : '') + '" style="--wc:' + wd.color + ';--p:' + Math.round(s / (per * 3) * 100) + '"><b>' + wd.id + '</b></span>';
    });
    const evo = (g.meta.evo || []).length;
    return '<section class="wk-album"><div class="al-h"><span>ALBÜM</span><small>' + full + '/' + WORLDS.length + ' ROZET · ' + evo + ' EVRİM KEŞFİ</small></div><div class="al-row">' + h + '</div>' +
      '<p class="al-n">Rozet: dünyanın bütün yıldızları + boss. Hepsi = gümüş çerçeve.</p></section>';
  }

  /* ═══════════ SAYFA: ETKİNLİKLER (Hayatta Kalma Kupası) ═══════════ */
  renderEvents() {
    const g = this.game;
    this._renderWeek();
    const mils = SURVIVAL_MILESTONES;
    const mins = g.survivalMinutes();

    /* ── AFİŞ (v30) ──
       Büyük sayı + aşama pulu + sonraki hedefe kalan. GÖREVLER girişi
       artık üst şeritte yaşıyor (refreshQuestChip), bu sayfa yalnız
       kupanın kendisini anlatır. */
    let reached = 0;
    for (const m of mils) if (mins >= m.need) reached++;
    const totalEl = document.getElementById('event-total');
    if (totalEl) totalEl.textContent = mins;
    const stageEl = document.getElementById('event-stage');
    if (stageEl) stageEl.textContent = 'AŞAMA ' + reached + ' / ' + mils.length;

    const next = mils.find((m) => mins < m.need);
    let prevNeed = 0;
    for (const m of mils) if (m.need <= mins) prevNeed = m.need;
    const fill = document.getElementById('event-bar-fill');
    const nextEl = document.getElementById('event-next');
    if (fill) {
      fill.style.width = next
        ? Math.min(100, (mins - prevNeed) / Math.max(1, next.need - prevNeed) * 100) + '%'
        : '100%';
    }
    /* KALAN dakika yazılır, GEREKEN değil: gereken sayı zaten durağın
       madalyonunda duruyor ve oyuncunun sorusu "ne kadar kaldı".
       METİN KISA TUTULUR: büyük sayının yanında aynı satırda yaşıyor ve
       279 px kabukta uzun cümle ellipsis'e giriyordu (ölçüldü). */
    if (nextEl) nextEl.textContent = next ? ((next.need - mins) + ' DK KALDI') : 'YOL TAMAMLANDI';

    /* ÖDÜL = DEĞER + BİRİM (v30): "320" / "ALTIN". Tek satır cümle
       ("320 Altın") aynı yerde daha az okunur ve hiyerarşi kurmaz. */
    const rewardMeta = (r) => {
      if (r.kind === 'rubies') {
        return { ico: '<span class="ruby ev-ruby"></span>', val: r.amount, unit: 'ALTIN', col: '#b06a49' };
      }
      if (r.kind === 'cards') {
        const cc = CHARACTERS[r.char];
        const col = cc ? cc.colors.eye : '#cfd6e2';
        const art = this.charArt(r.char, 'ev-card-illu') ||
          '<span class="ev-chest" style="--gc:' + col + '"></span>';
        return { ico: art, val: r.amount + '× ' + (cc ? cc.name : 'KAHRAMAN'), unit: 'KART', col };
      }
      const ch = CHESTS[r.chest] || {};
      const nm = (ch.name || 'SANDIK').toUpperCase();
      return { ico: chestSVG(r.chest), val: nm.split(' ')[0], unit: 'SANDIK', col: ch.color || '#a8794a' };
    };

    let ready = 0;
    for (const m of mils) if (!g.milestoneClaimed(m.id) && g.canClaimMilestone(m)) ready++;
    const readyEl = document.getElementById('event-ready');
    if (readyEl) {
      readyEl.textContent = ready ? (ready + ' ÖDÜL HAZIR') : (reached + ' / ' + mils.length + ' AÇILDI');
      readyEl.classList.toggle('hot', ready > 0);
    }

    let html = '';
    for (let i = 0; i < mils.length; i++) {
      const ms = mils[i];
      const claimed = g.milestoneClaimed(ms.id);
      const can = g.canClaimMilestone(ms);
      const hit = mins >= ms.need;
      const rm = rewardMeta(ms.reward);
      const st = claimed ? 'claimed' : can ? 'ready' : hit ? 'reached' : 'locked';
      const isNext = !!next && next.need === ms.need;
      const isFinal = i === mils.length - 1;
      let action;
      if (claimed) action = '<span class="evs-done">ALINDI</span>';
      else if (can) action = '<button class="evs-claim" data-ms="' + ms.id + '">TOPLA</button>';
      else action = '<span class="evs-need">' + Math.max(1, ms.need - mins) + ' dk</span>';
      const tag = isFinal ? '<span class="evs-tag final">SON ÖDÜL</span>'
        : isNext ? '<span class="evs-tag">SIRADAKİ</span>' : '';
      html +=
        '<div class="ev-stop ' + st + (isNext ? ' next' : '') + (isFinal ? ' final' : '') +
            '" style="--nc:' + rm.col + '">' +
          '<span class="evs-seg ' + (hit ? 'on' : '') + '" aria-hidden="true"></span>' +
          '<div class="evs-medal">' +
            '<span class="evs-ico">' + rm.ico + '</span>' +
            '<span class="evs-min">' + ms.need + '<small>DK</small></span>' +
          '</div>' +
          '<div class="evs-card">' +
            '<span class="evs-txt">' + tag +
              '<span class="evs-val">' + rm.val + '</span>' +
              '<span class="evs-unit">' + rm.unit + '</span>' +
            '</span>' +
            '<span class="evs-action">' + action + '</span>' +
          '</div>' +
        '</div>';
    }
    const track = document.getElementById('event-track');
    track.innerHTML = html;
    freezeChestSVG(track);
    track.querySelectorAll('.evs-claim').forEach((b) => {
      b.onclick = () => g.claimMilestone(b.getAttribute('data-ms'));
    });

    const sub = document.getElementById('event-battle-sub');
    if (sub) sub.textContent = next ? ('Sonraki ödüle ' + (next.need - mins) + ' dk') : 'Tüm ödüller açıldı';
  }

  /** v61 M4: başarım plakası — sırayla aşağıdan kayar, 2,4 sn kalır. */
  _achToast(list, i) {
    const a = list[i]; if (!a) return;
    const el = document.createElement('div'); el.className = 'ach-pop';
    el.innerHTML = '<i class="ach-medal"><svg viewBox="0 0 24 24"><path d="M12 2 L14.6 8.6 L21.6 9.2 L16.3 13.8 L17.9 20.6 L12 17 L6.1 20.6 L7.7 13.8 L2.4 9.2 L9.4 8.6 Z"/></svg></i>' +
      '<span><small>BAŞARIM</small><b>' + a.name + '</b><em>' + [a.gold ? '+' + a.gold + ' ALTIN' : '', a.gem ? '+' + a.gem + ' GEM' : '', a.title ? 'UNVAN: ' + a.title : ''].filter(Boolean).join(' · ') + '</em></span>';
    document.getElementById('app').appendChild(el);
    this.game.audio.play('star');
    setTimeout(() => el.classList.add('out'), 2400);
    setTimeout(() => { el.remove(); this.refreshWallet(); this._achToast(list, i + 1); }, 2800);
  }
  /** v61 M4: etkinlik sayfasında başarım listesi (katlanır). */
  _achCard() {
    const g = this.game, B = Ach.book(g.meta), n = Ach.count(g.meta);
    let rows = '';
    for (const a of ACH) {
      const done = !!B.d[a.id], p = Ach.progress(g.meta, a);
      const cur = Math.min(a.n, B.s[a.st] | 0);
      rows += '<div class="ach-row' + (done ? ' done' : '') + '" style="--p:' + (p * 100).toFixed(1) + '">' +
        '<i class="ach-dot"></i><span class="ach-t"><b>' + a.name + '</b><em>' + a.desc + '</em><span class="ach-bar"><i></i></span></span>' +
        '<span class="ach-r">' + (done ? 'ALINDI' : (a.max ? cur : cur.toLocaleString('tr-TR')) + '/' + a.n.toLocaleString('tr-TR')) + '<small>' + [a.gold ? a.gold + ' altın' : '', a.gem ? a.gem + ' gem' : ''].filter(Boolean).join(' + ') + '</small></span></div>';
    }
    return '<details class="wk-ach"><summary><span class="ach-k">BAŞARIMLAR</span><b>' + n + ' / ' + ACH.length + '</b>' + (B.title ? '<em class="ach-title">' + B.title + '</em>' : '') + '</summary><div class="ach-list">' + rows + '</div></details>';
  }

  /** v53 D2: SONSUZ KULE kartı — kat sütunu (5 kat), rekor, sonraki 10. kat ödülü. */
  _towerCard() {
    const g = this.game, T = towerBook(g.meta);
    const open = (g.progress[1] | 0) >= MISSIONS_PER_WORLD;
    const k = T.cur, base = Math.floor((k - 1) / 5) * 5;
    let col = '';
    for (let i = 5; i >= 1; i--) {
      const f = base + i, F = floorDef(f, WORLDS.length, MISSIONS_PER_WORLD);
      const st = f < k ? 'done' : f === k ? 'cur' : 'up';
      const wc = (WORLDS[F.w - 1] || {}).color || '#b06a49';
      col += '<span class="tw-f ' + st + (F.boss ? ' boss' : '') + '" style="--fc:' + wc + '"><b>' + f + '</b>' +
        (F.boss ? '<em>BOSS</em>' : '<em>' + ((WORLDS[F.w - 1] || {}).name || '') + '</em>') + '</span>';
    }
    const nextMil = Math.ceil(k / 10) * 10;
    const F = floorDef(k, WORLDS.length, MISSIONS_PER_WORLD);
    return '<section class="wk-tower' + (open ? '' : ' locked') + '">' +
      '<div class="tw-col">' + col + '</div>' +
      '<div class="tw-info">' +
        '<span class="sl-k">SONSUZ KULE</span>' +
        '<span class="tw-cur">KAT <b>' + k + '</b></span>' +
        '<span class="tw-l">' + ((WORLDS[F.w - 1] || {}).name || '') + (F.boss ? ' · BOSS KATI' : '') + '</span>' +
        '<span class="tw-l dim">EN YÜKSEK ' + T.best + ' · KAT BAŞI ' + Tower.floorGold(k) + ' ALTIN</span>' +
        '<span class="tw-mil"><span class="stone"></span>KAT ' + nextMil + ' · +' + (10 + nextMil) + ' GEM</span>' +
        '<button id="tower-go" class="sl-go"' + (open ? '' : ' disabled') + '><span>' + (open ? 'TIRMAN' : 'KİLİTLİ') + '</span><small>' + (open ? 'HER 5 KAT KONTROL NOKTASI' : 'DÜNYA 1 BOSS\'UNU YEN') + '</small></button>' +
      '</div>' +
    '</section>';
  }

  /** v54 H2: KABUS DÖNGÜSÜ kartı — on dünya ilerleme şeridi, sıradaki görev, çerçeve hedefi. */
  _nmCard() {
    const g = this.game, N = nmBook(g.meta);
    const open = Nightmare.open(g.progress, WORLDS.length, MISSIONS_PER_WORLD);
    let dots = '';
    for (let w = 1; w <= WORLDS.length; w++) {
      const st = w < N.w ? 'done' : w === N.w ? 'cur' : '';
      dots += '<i class="nm-d ' + st + '" style="--fc:' + ((WORLDS[w - 1] || {}).color || '#b06a49') + '"></i>';
    }
    const wd = WORLDS[N.w - 1] || {};
    const left = Math.max(0, NM.frameAt - N.clears);
    return '<section class="wk-nm' + (open ? '' : ' locked') + '">' +
      '<span class="nm-moon" aria-hidden="true"></span>' +
      '<span class="sl-k">KABUS DÖNGÜSÜ</span>' +
      '<span class="nm-n">' + (open ? 'DÜNYA ' + N.w + ' · GÖREV ' + N.m : 'DÜNYA 10\'U BİTİR') + '</span>' +
      '<span class="nm-l">' + (open ? (wd.name || '') + ' · her elit iki özellik · altın ×2' : 'Aynı on dünya gece yüzüyle, çok daha sert döner.') + '</span>' +
      '<div class="nm-track">' + dots + '</div>' +
      '<span class="nm-l dim">' + (left ? 'KABUS ÇERÇEVESİNE ' + left + ' ZAFER' : 'KABUS ÇERÇEVESİ SENDE') + ' · İLK ZAFER ' + NM.gem + ' GEM</span>' +
      '<button id="nm-go" class="sl-go nm"' + (open ? '' : ' disabled') + '><span>' + (open ? 'GECEYE GİR' : 'KİLİTLİ') + '</span><small>' + (open ? 'BOSS GÖREVİ ' + NM.bossGem + ' GEM' : 'SON BOSS\'U YEN') + '</small></button>' +
    '</section>';
  }

  /** v53 D6: görev düğümü altında üç küçük yıldız (kazanılan dolu). */
  _nodeStars(w, m) {
    const n = Ledger.stars(this.game.meta, w, m);
    let h = '<span class="cn-stars" aria-label="' + n + ' yıldız">';
    for (let i = 0; i < 3; i++) h += '<i class="' + (i < n ? 'on' : '') + '">' + STAR_SVG + '</i>';
    return h + '</span>';
  }

  /** v53 D7 · D3: BU HAFTA şeridi + HAFTALIK MÜHÜR kartı (etkinlik sayfasının başı). */
  _renderWeek() {
    const g = this.game;
    const body = document.querySelector('#page-etkinlik .event-body');
    if (!body) return;
    /* v68 ETKİNLİK 2.0 (kullanıcı: "çok karışık"): 9 kart alt alta → üstte BU HAFTA afişi + 5 sekme,
       her sekme TEK konu. Kupa sayfasının statik düğümleri (afiş, yol, düğme) KUPA bölmesine taşınır —
       id'leri aynı, renderEvents onları yerinde günceller. */
    const TABS = [
      { id: 'gunluk', n: 'GÜNLÜK', i: '<path d="M6 3.2 H18 V20.8 L12 17.6 L6 20.8 Z"/><path d="M9.2 8.6 H14.8 M9.2 12.2 H13.2"/>' },
      { id: 'muhur',  n: 'MÜHÜR',  i: '<circle cx="12" cy="10" r="6.2"/><path d="M8.6 15 L7 21 L12 18.6 L17 21 L15.4 15"/><path d="M12 7 V13 M9 10 H15"/>' },
      { id: 'kupa',   n: 'KUPA',   i: '<path d="M7 4 H17 V9 A5 5 0 0 1 7 9 Z"/><path d="M7 5.5 H4 A3 3 0 0 0 7 11 M17 5.5 H20 A3 3 0 0 1 17 11"/><path d="M12 14 V18 M8.5 20.5 H15.5"/>' },
      { id: 'zirve',  n: 'ZİRVE',  i: '<path d="M3 20 L9.5 8 L13 14 L15.5 10 L21 20 Z"/><path d="M9.5 8 V3.5 L13 5 L9.5 6.4"/>' },
      { id: 'album',  n: 'ALBÜM',  i: '<rect x="4" y="3.5" width="16" height="17" rx="2.4"/><path d="M12 8.2 L13.4 11 L16.4 11.3 L14.1 13.3 L14.8 16.2 L12 14.7 L9.2 16.2 L9.9 13.3 L7.6 11.3 L10.6 11 Z"/>' },
    ];
    let box = document.getElementById('week-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'week-box'; box.className = 'wk-box ev2';
      box.innerHTML = '<div id="ev2-hero" class="ev2-hero"></div><nav id="ev2-tabs" class="ev2-tabs" role="tablist"></nav>' +
        TABS.map((t) => '<div class="ev2-pane hidden" data-p="' + t.id + '" role="tabpanel"></div>').join('');
      body.insertBefore(box, body.firstChild);
      const kp = box.querySelector('[data-p="kupa"]');
      Array.from(body.children).forEach((n) => { if (n !== box) kp.appendChild(n); });
    }
    const C = Calendar.current(WORLDS.length);
    const S = Calendar.seal(g.progress, WORLDS.length);
    const B = Calendar.book(g.meta);
    const left = Math.max(0, C.leftMs), dd = Math.floor(left / 864e5), hh = Math.floor((left % 864e5) / 36e5);
    const leftTxt = dd > 0 ? dd + ' GÜN ' + hh + ' SA' : hh + ' SA';
    const wd = WORLDS[S.w - 1] || WORLDS[0];
    const fw = WORLDS[C.featured - 1];
    const evLine = C.ev.id === 'biyom' && fw ? fw.name + ' haritasında altın ×2' : C.ev.line;
    let tiers = '';
    const top = SEAL_TIERS[SEAL_TIERS.length - 1].need;
    for (const T of SEAL_TIERS) {
      const got = B.got.includes(T.id);
      const rw = T.reward.kind === 'rubies' ? '<span class="ruby"></span>' + T.reward.amount : '<span class="stone"></span>' + T.reward.amount;
      tiers += '<span class="sl-tier' + (got ? ' got' : '') + '" style="--tc:' + T.col + ';--at:' + (T.need / top * 100).toFixed(1) + '%">' +
        '<i class="sl-seal"><b>' + T.name[0] + '</b></i><span class="sl-need">' + T.need + '</span><span class="sl-rw">' + rw + '</span></span>';
    }
    const P = (id) => box.querySelector('[data-p="' + id + '"]');
    document.getElementById('ev2-hero').innerHTML =
      '<section class="wk-event" style="--ec:' + C.ev.col + '">' +
        this._seasonLine() +
        '<span class="wke-k">BU HAFTA' + (C.weekend ? ' · <b>HAFTA SONU ALTIN +%25</b>' : '') + '</span>' +
        '<span class="wke-n">' + C.ev.name + '</span>' +
        '<span class="wke-l">' + evLine + '</span>' +
        '<span class="wke-t">' + leftTxt + '</span>' +
      '</section>';
    P('muhur').innerHTML =
      '<section class="wk-seal" style="--wc:' + (wd.color || '#b06a49') + '">' +
        '<span class="sl-rays" aria-hidden="true"></span>' +
        '<div class="sl-head"><span class="sl-k">HAFTALIK MÜHÜR</span><span class="sl-best">EN İYİ <b>' + B.best + '</b></span></div>' +
        '<div class="sl-title">' + wd.name + ' · GÖREV ' + S.m + '</div>' +
        '<div class="sl-rule"><span class="sl-rn">' + S.rule.name + '</span><span class="sl-rl">' + S.rule.line + '</span></div>' +
        '<div class="sl-track"><span class="sl-rail"><i style="width:' + Math.min(100, B.best / top * 100).toFixed(1) + '%"></i></span>' + tiers + '</div>' +
        '<button id="seal-go" class="sl-go"><span>MÜHRE GİR</span><small>' + (B.runs ? B.runs + ' DENEME' : 'SINIRSIZ DENEME') + '</small></button>' +
      '</section>';
    P('gunluk').innerHTML = this._dailyCard();
    P('zirve').innerHTML = this._peakStrip() + this._towerCard() + this._nmCard();
    P('album').innerHTML = this._albumCard() + this._achCard().replace('<details class="wk-ach">', '<details class="wk-ach" open>');
    /* sekme rozetleri: günlükte kalan hedef, kupada toplanacak ödül */
    const dLeft = Daily.left(g.meta);
    let kReady = 0; for (const m of SURVIVAL_MILESTONES) if (!g.milestoneClaimed(m.id) && g.canClaimMilestone(m)) kReady++;
    const badge = { gunluk: dLeft, kupa: kReady };
    if (!this._evTab) this._evTab = kReady ? 'kupa' : dLeft ? 'gunluk' : 'kupa';
    const nav = document.getElementById('ev2-tabs');
    nav.innerHTML = TABS.map((t) => '<button class="ev2-tab" role="tab" data-t="' + t.id + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + t.i + '</svg><b>' + t.n + '</b>' + (badge[t.id] ? '<i class="ev2-n' + (t.id === 'kupa' ? ' hot' : '') + '">' + badge[t.id] + '</i>' : '') + '</button>').join('');
    const apply = (anim) => {
      nav.querySelectorAll('.ev2-tab').forEach((b) => { const on = b.dataset.t === this._evTab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      box.querySelectorAll('.ev2-pane').forEach((p) => {
        const on = p.dataset.p === this._evTab;
        p.classList.toggle('hidden', !on);
        if (on && anim) { p.classList.remove('in'); void p.offsetWidth; p.classList.add('in'); }
      });
    };
    nav.querySelectorAll('.ev2-tab').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.t === this._evTab) return;
      this._evTab = b.dataset.t; g.audio.play('tab'); apply(true);
      const sc = box.closest('.menu-page'); if (sc && sc.scrollTop > nav.offsetTop) sc.scrollTop = Math.max(0, nav.offsetTop - 8);
    }));
    apply(false);
    const tg = document.getElementById('tower-go');
    if (tg) tg.onclick = () => { if (tg.disabled) return; g.audio.play('cta'); g.startTower(); };
    const ng = document.getElementById('nm-go');
    if (ng) ng.onclick = () => { if (ng.disabled) return; g.audio.play('cta'); g.startNightmare(); };
    const go = document.getElementById('seal-go');
    if (go) go.onclick = () => { g.audio.play('cta'); g.startSeal(); };
  }

  /* ═══════════ KARAKTER İNCELEME (CR kart detay) ═══════════ */
  openCharDetail(id) {
    const g = this.game;
    const c = CHARACTERS[id];
    if (!c) return;
    this._cdId = id;
    const scr = this.screens.chardetail;
    scr.style.setProperty('--cc', c.colors.eye);

    const ownedNow = g.ownsChar(id);
    scr.classList.toggle('is-locked', !ownedNow);
    scr.classList.toggle('is-leg', (c.rarity || 1) >= 4);
    const lvEl = document.getElementById('hd-lvl');
    if (lvEl) lvEl.innerHTML = ownedNow ? '<small>SEVİYE</small><b>' + g.charLevel(id) + '</b>' : '<small>KİLİTLİ</small><b>?</b>';

    /* hero: vektör çizim (CR tarzı büyük karakter) — responsive, taşmasız.
       Tüm kahramanlar (kolçu/cadı/hasatçı dahil) artık azrail/kasap/cellat
       ile aynı "tatlı" vektör dokusuyla, biraz daha büyük çiziliyor. */
    const cv = document.getElementById('cd-hero');
    const ctx = cv.getContext('2d');
    const heroImg = document.getElementById('cd-hero-img');
    /* İNCELEME SAHNESİ: kaynak illüstrasyon (v24 geri alma). Büst kırpımı
       olanlar `is-bust` ile daha iri gösterilir. */
    const art = HERO_ART[id];
    if (art && ownedNow) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      cv.style.visibility = 'hidden';
      heroImg.src = art;
      heroImg.classList.toggle('is-bust', HERO_ART_BUST.has(id));
      heroImg.classList.remove('hidden');
    } else {
      cv.style.visibility = 'visible';
      heroImg.classList.add('hidden');
      heroImg.removeAttribute('src');
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (ownedNow) drawCharPortrait(ctx, cv.width / 2, cv.height / 2 + 8, 138, c);
    }

    /* eski büst bindirmesi artık kullanılmıyor — gizle */
    const illu = document.getElementById('cd-illu');
    if (illu) { illu.style.display = 'none'; illu.removeAttribute('src'); }

    document.getElementById('cd-name').textContent = ownedNow ? c.name : '? ? ?';
    document.getElementById('cd-name').style.color = ownedNow ? c.colors.eye : '#8891ad';
    document.getElementById('cd-subtitle').textContent = ownedNow ? c.title : 'KİLİTLİ KAHRAMAN';
    document.getElementById('cd-class').textContent = ownedNow ? (c.style === 'melee' ? 'YAKIN' : 'MENZİLLİ') : '?';
    const rar = CHAR_RARITIES[c.rarity || 1];
    const rarEl = document.getElementById('cd-rarity');
    rarEl.textContent = rar.name;
    rarEl.style.color = rar.color;
    scr.style.setProperty('--rar', rar.color);
    scr.style.setProperty('--rar-glow', rar.glow);
    document.getElementById('cd-lore').textContent = ownedNow
      ? '“' + c.lore + '”'
      : 'Bu kahraman henüz gölgede. Sandıklardan kartı düştükçe ortaya çıkar.';

    /* stat kutuları: taban + karakter modları */
    const m = c.mods || {};
    const hp = PLAYER.maxHp + (m.maxHp || 0);
    const wname = WEAPONS[c.startWeapon] ? WEAPONS[c.startWeapon].name : '—';
    const pctTxt = (v) => (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
    const rows = [
      { k: 'CAN', v: String(hp), cls: m.maxHp ? (m.maxHp > 0 ? 'up' : 'down') : '', sc: '#ff5063',
        ico: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21 C 4 15 3 10 5.5 7 C 8 4.5 11 6 12 8 C 13 6 16 4.5 18.5 7 C 21 10 20 15 12 21 Z"/></svg>' },
      { k: 'HASAR', v: m.dmgPct ? pctTxt(m.dmgPct) : 'Normal', cls: m.dmgPct ? (m.dmgPct > 0 ? 'up' : 'down') : '', sc: '#ffa54d',
        ico: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L14.5 9 L22 9.5 L16 14 L18 21.5 L12 17 L6 21.5 L8 14 L2 9.5 L9.5 9 Z"/></svg>' },
      { k: 'ATIŞ HIZI', v: m.atkPct ? pctTxt(m.atkPct) : 'Normal', cls: m.atkPct ? (m.atkPct > 0 ? 'up' : 'down') : '', sc: '#5ff2cf',
        ico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 7 V12 L15 15"/><circle cx="12" cy="12" r="9"/></svg>' },
      { k: 'HIZ', v: m.speedPct ? pctTxt(m.speedPct) : 'Normal', cls: m.speedPct ? (m.speedPct > 0 ? 'up' : 'down') : '', sc: '#7ec26a',
        ico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7 3 H12 V11 L17 13 A3 3 0 0 1 19 16 V19 H5 V16 L7 11 Z"/></svg>' },
      { k: 'ZIRH', v: String(PLAYER.armor + (m.armor || 0)), cls: m.armor ? (m.armor > 0 ? 'up' : 'down') : '', sc: '#9aa8d8',
        ico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2 L20 6 V12 C 20 17 16 20 12 22 C 8 20 4 17 4 12 V6 Z"/></svg>' },
      { k: 'İMZA SİLAHI', v: wname, cls: 'up', sc: '#d8a284',
        ico: this.icon(c.startWeapon) },
      { k: 'İMZA GÜCÜ', v: (function(){ const b = Math.round((signaturePower(c.rarity || 1) - 1) * 100); return b > 0 ? '+%' + b + ' hasar' : 'Taban'; })(),
        cls: (signaturePower(c.rarity || 1) > 1 ? 'up' : ''), sc: CHAR_RARITIES[c.rarity || 1].color,
        ico: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L14.2 8.6 L21 9 L15.8 13.2 L17.6 20 L12 16.2 L6.4 20 L8.2 13.2 L3 9 L9.8 8.6 Z"/></svg>' },
    ];
    /* v50: üst şerit 5 kısa stat (dikey karo), alt sıra imza silahı/gücü (geniş karo) */
    let sh = '<div class="hd-strip">';
    rows.forEach((r, n) => {
      const shown = ownedNow ? r.v : '???';
      if (n === 5) sh += '</div><div class="hd-sig">';
      sh += '<div class="hd-stat' + (n >= 5 ? ' wide' : '') + '" style="--sc:' + r.sc + ';--n:' + n + '">' +
            '<span class="hs-ico">' + r.ico + '</span>' +
            '<span class="hs-t"><span class="hs-v ' + (ownedNow ? r.cls : '') + '">' + shown + '</span>' +
            '<span class="hs-k">' + r.k + '</span></span></div>';
    });
    sh += '</div>';
    /* v53 D4: USTALIK şer— güç vermez, kademe ödülü altın/gem */
    if (g.ownsChar(id)) {
      const M = Ledger.mastery(g.meta, id);
      sh += '<div class="hd-mastery' + (M.max ? ' max' : '') + '">' +
        '<span class="hm-medal"><b>' + M.lv + '</b></span>' +
        '<span class="hm-body"><span class="hm-k">USTALIK' + (M.max ? ' · AZAMİ' : ' · SV ' + M.lv + ' / ' + MASTERY_MAX) + '</span>' +
        '<span class="hm-bar"><i style="width:' + Math.round(M.frac * 100) + '%"></i></span>' +
        '<span class="hm-note">' + (M.max ? 'TÜM KADEMELER AÇIK' : 'SONRAKİ KADEMEYE ' + M.toNext + ' PUAN · KİYIM + ZAFER + BOSS') + '</span></span>' +
        '</div>';
    }
    {
      const E = EVOLUTIONS[id];
      if (E) {
        const found = (g.meta.evo || []).includes('evo_' + id);
        sh += '<div class="hd-evo' + (found ? ' found' : '') + '"><span class="he-k">EVRİM</span>' +
          '<b>' + (found ? E.name : '? ? ?') + '</b>' +
          '<span class="he-n">' + (found ? 'KEŞFEDİLDİ' : 'İMZA 5 KADEME + ' + (PASSIVES[E.pas] ? PASSIVES[E.pas].name.toUpperCase() : '') + ' SV 2') + '</span></div>';
      }
    }
    /* ── SEVİYE İLE AÇILAN YETENEK YUVALARI ──
       Kahraman seviyesi yalnızca stat büyütmüyor: belirli seviyelerde
       koşu içi kart havuzuna YENİ bir yetenek giriyor. Kilitli yuvalar
       burada görünür ki oyuncu neyi hedeflediğini bilsin. */
    /* v61 SÜPER: kart nadirliği gücü belirler */
    let hdUlt = '';
    {
      const cr = Math.max(1, Math.min(4, (CHARACTERS[id] && CHARACTERS[id].rarity) | 0 || 1));
      const UT = ULT_TIER[cr], UI_ = ULT_ID[id] || { name: 'SÜPER', col: '#ffd2bb' };
      hdUlt = '<div class="hd-ult" style="--uc:' + UI_.col + '"><span class="hdu-ico"><svg viewBox="0 0 24 24"><path d="M13 2 L5 13 h5 l-1 9 8-11 h-5 z"/></svg></span>' +
        '<span class="hdu-t"><b>SÜPER · ' + UI_.name + '</b>' + (UI_.desc ? '<i class="hdu-d">' + UI_.desc + '</i>' : '') + '<em>' + UT.label + ' GÜCÜ · yarıçap ' + UT.r + ' · sıradan ' + (UT.norm >= 1 ? 'öldürür' : '%' + Math.round(UT.norm * 100)) + ' · elit %' + Math.round(UT.elite * 100) + ' · boss %' + Math.round(UT.boss * 100) + ' · ' + UT.inv.toFixed(1) + ' sn dokunulmaz' + (UT.heal ? ' · can +%' + Math.round(UT.heal * 100) : '') + '</em></span></div>';
    }
    const unlocks = signatureUnlocks(id, g.charLevel(id));
    if (unlocks.length) {
      let ab = '<div class="cd-abils hd-abils"><span class="cda-k">SEVİYE İLE AÇILAN YETENEKLER</span><div class="cda-row">';
      for (const u of unlocks) {
        ab += '<div class="cda-slot' + (u.locked ? ' locked' : '') + '" title="' + u.desc + '">' +
          '<span class="cda-ico">' + cardGlyph({ kind: 'special', icon: u.glyph || 'yay', id: u.id }) + '</span>' +
          (u.locked
            ? '<span class="cda-lock"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10 V8 A5 5 0 0 1 17 8 V10 H18.4 A1.6 1.6 0 0 1 20 11.6 V20.4 A1.6 1.6 0 0 1 18.4 22 H5.6 A1.6 1.6 0 0 1 4 20.4 V11.6 A1.6 1.6 0 0 1 5.6 10 Z M9.4 10 H14.6 V8 A2.6 2.6 0 0 0 9.4 8 Z"/></svg><b>SV ' + u.minLvl + '</b></span>'
            : '<span class="cda-on">AÇIK</span>') +
          '<span class="cda-name">' + (u.locked ? 'SV ' + u.minLvl : u.name) + '</span>' +
          '</div>';
      }
      ab += '</div></div>';
      sh += ab;
    }
    sh += hdUlt;
    document.getElementById('cd-stats').innerHTML = sh;

    /* aksiyon: seviye + kart geliştirme (CR) + seç/satın al */
    const owned = g.ownsChar(id);
    const selected = g.meta.selectedChar === id;
    const act = document.getElementById('cd-action');
    const subEl = document.getElementById('cd-subtitle');
    let ah = '';

    if (owned) {
      const lvl = g.charLevel(id);
      const cards = g.charCardCount(id);
      const need = g.cardsForNext(id);
      const gold = g.goldForNext(id);
      const canUp = g.canUpgradeChar(id);
      subEl.textContent = c.title + ' · SEVİYE ' + lvl;
      const selBtnHtml = selected
        ? '<button class="hd-btn silver hd-selected">✓ SEÇİLİ</button>'
        : '<button class="hd-btn silver hd-select">SAVAŞA AL</button>';
      if (need != null) {
        const pct = Math.min(100, cards / need * 100);
        ah += '<div class="hd-up' + (canUp ? ' ready' : '') + '">' +
            '<div class="hu-row"><span class="hu-lv">SV ' + lvl + '</span>' +
              '<span class="hu-bar"><i style="width:' + pct + '%"></i><em></em>' +
              '<b>' + cards + ' / ' + need + ' KART</b></span>' +
              '<span class="hu-lv next">SV ' + (lvl + 1) + '</span></div>' +
            '<div class="hu-btns">' +
              '<button class="hd-btn kor' + (canUp ? '' : ' cant') + '" data-up="1"><span class="hb-t">GELİŞTİR</span>' +
                '<span class="hb-cost"><span class="ruby"></span>' + gold + '</span></button>' +
              selBtnHtml +
            '</div>' +
          '</div>';
      } else {
        ah += '<div class="hd-up maxed"><span class="hu-max">AZAMİ SEVİYE · SV ' + lvl + '</span>' +
          '<div class="hu-btns">' + selBtnHtml + '</div></div>';
      }
    } else {
      subEl.textContent = 'KİLİTLİ KAHRAMAN';
      ah += '<div class="hd-note">' +
          '<span class="hn-ico">' + ICONS.lock + '</span>' +
          '<span>Bu kahraman yalnızca <b>sandıklardan</b> çıkar. Kartı düştüğünde açılır, biriktikçe seviye atlar.</span>' +
        '</div>' +
        '<button class="hd-btn silver cant" disabled>SANDIKTAN ÇIKAR</button>';
    }
    act.innerHTML = ah;

    const upBtn = act.querySelector('[data-up]');
    if (upBtn) upBtn.onclick = () => this.playUpgradeFx(id);
    const selBtn = act.querySelector('.hd-select');
    if (selBtn) selBtn.onclick = () => { g.selectChar(id); this.closeCharDetail(); };
    const selfBtn = act.querySelector('.hd-selected');
    if (selfBtn) selfBtn.onclick = () => this.closeCharDetail();
    act.querySelectorAll('.cd-buy').forEach((b) => {
      b.onclick = () => { if (g.buyChar(id, b.getAttribute('data-cur'))) this.openCharDetail(id); };
    });

    scr.classList.remove('hidden');
  }

  /** v58 SEVİYE TÖRENİ (.upx): BİRİKİM 0-0,6 sn (kartlar çubuktan kahramana akar, mühür halkası
      kurulur, kahraman yükselir) → PATLAMA 0,6 (flaş · iki şok halkası · ışın · kıvılcım · titreşim)
      → madalyon sayısı eski→yeni yuvarlanır 0,98 → kazanç çipleri 1,15+ → (varsa) yeni yetenek 1,6.
      Yalnız transform/opacity; 0,65 sn sonra dokunuş atlatır, kapanınca inceleme tazelenir. */
  playUpgradeFx(id) {
    const g = this.game;
    if (!g.canUpgradeChar(id)) { g.audio.play('error'); return; }
    const inner = document.querySelector('#screen-chardetail .hd-inner');
    const stage = inner && inner.querySelector('.hd-stage');
    if (!stage || inner.querySelector('.upx')) return;
    const bar = inner.querySelector('.hu-bar');
    const ir = inner.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const br = bar ? bar.getBoundingClientRect() : null;
    const lvlOld = g.charLevel(id);
    if (!g.upgradeChar(id)) return;
    const lvlNew = g.charLevel(id);
    const rm = document.documentElement.classList.contains('rm');
    const cx = Math.round(sr.left - ir.left + sr.width / 2), cy = Math.round(sr.top - ir.top + sr.height * 0.46);
    const a = charLevelMods(lvlOld), b = charLevelMods(lvlNew);
    const pc = (v) => '+' + Math.round(v * 100) + '%';
    const gains = [['CAN', pc(b.hpMul - a.hpMul)], ['HASAR', pc(b.dmgAdd - a.dmgAdd)], ['ATIŞ HIZI', pc(b.atkAdd - a.atkAdd)]];
    const nu = signatureUnlocks(id, lvlNew).find((u) => !u.locked && u.minLvl === lvlNew);
    const R = Math.round;
    let conv = '', sparks = '', cards = '';
    for (let i = 0; i < 12; i++) {
      const t = i / 12 * 6.283 + Math.random() * 0.4, d = 110 + Math.random() * 60;
      conv += '<i style="--dx:' + R(Math.cos(t) * d) + 'px;--dy:' + R(Math.sin(t) * d) + 'px;--dl:' + R(Math.random() * 180) + 'ms"></i>';
    }
    for (let i = 0; i < 18; i++) {
      sparks += '<i style="--r:' + R(i * 20 + Math.random() * 14) + 'deg;--d:' + R(90 + Math.random() * 110) + 'px;--dl:' + R(Math.random() * 120) + 'ms"></i>';
    }
    if (br) {
      const fx0 = br.left - ir.left + br.width / 2 - cx, fy0 = br.top - ir.top + br.height / 2 - cy;
      for (let i = 0; i < 5; i++) cards += '<i style="--fx:' + R(fx0 + (i - 2) * 20) + 'px;--fy:' + R(fy0) + 'px;--r:' + ((i - 2) * 14) + 'deg;--dl:' + (i * 40) + 'ms"></i>';
    }
    const fx = document.createElement('div');
    fx.className = 'upx';
    fx.setAttribute('aria-live', 'polite');
    fx.innerHTML = '<i class="upx-dim"></i>' +
      '<span class="upx-at" style="left:' + cx + 'px;top:' + cy + 'px">' +
        '<i class="upx-well"></i><i class="upx-rays"></i>' +
        '<span class="upx-sig"><i class="upx-ring"></i><i class="upx-ring b"></i><i class="upx-dia"></i></span>' +
        '<span class="upx-conv">' + conv + '</span><span class="upx-cards">' + cards + '</span>' +
        '<i class="upx-flash"></i><i class="upx-wave"></i><i class="upx-wave b"></i>' +
        '<span class="upx-sparks">' + sparks + '</span>' +
      '</span>' +
      '<div class="upx-core">' +
        '<span class="upx-kick">SEVİYE ATLADIN</span>' +
        '<span class="upx-medal"><span class="upx-roll"><b>' + lvlOld + '</b><b>' + lvlNew + '</b></span></span>' +
        '<span class="upx-gains">' + gains.map((x, n) => '<span class="upx-g" style="--n:' + n + '"><b>' + x[1] + '</b><small>' + x[0] + '</small></span>').join('') + '</span>' +
        (nu ? '<span class="upx-new"><small>YENİ YETENEK</small><b>' + nu.name + '</b></span>' : '') +
        '<span class="upx-tap">DEVAM ET</span>' +
      '</div>';
    inner.appendChild(fx);
    const core = fx.querySelector('.upx-core');
    core.style.top = Math.max(8, Math.min(R(sr.bottom - ir.top - 58), R(ir.height - core.offsetHeight - 10))) + 'px';
    const heroes = ['cd-hero', 'cd-hero-img'].map((h) => document.getElementById(h)).filter(Boolean);
    heroes.forEach((h) => { h.classList.remove('punch'); h.classList.add('upx-lift'); });
    const card = inner.closest('.hd-card');
    const t0 = performance.now(), timers = [];
    let done = false;
    const finish = (quiet) => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      this._upx = null;
      heroes.forEach((h) => h.classList.remove('upx-lift', 'punch'));
      if (card) card.classList.remove('upx-shake');
      if (quiet) { fx.remove(); return; }
      fx.classList.add('out');
      setTimeout(() => {
        fx.remove();
        if (this.screens.chardetail.classList.contains('hidden')) return;
        this.openCharDetail(id);
        const st = document.getElementById('cd-stats');
        if (st) { st.classList.remove('bumped'); void st.offsetWidth; st.classList.add('bumped'); }
        const lv = document.getElementById('hd-lvl');
        if (lv) { lv.classList.remove('upx-bump'); void lv.offsetWidth; lv.classList.add('upx-bump'); }
      }, 260);
    };
    this._upx = { finish };
    timers.push(setTimeout(() => {
      heroes.forEach((h) => { h.classList.remove('upx-lift'); void h.offsetWidth; h.classList.add('punch'); });
      if (card) { card.classList.remove('upx-shake'); void card.offsetWidth; card.classList.add('upx-shake'); }
      try { Haptics.fire('crit'); } catch (e) { /* */ }
    }, rm ? 0 : 600));
    timers.push(setTimeout(() => finish(), rm ? 1400 : (nu ? 3400 : 2900)));
    fx.addEventListener('click', (e) => {
      e.stopPropagation();
      if (performance.now() - t0 > (rm ? 200 : 650)) finish();
    });
  }

  closeCharDetail() {
    if (this._upx) this._upx.finish(true);
    this.screens.chardetail.classList.add('hidden');
  }

  /* ═══════════ CEPHANE ═══════════ */

  /** Oyun mantığı satın alma sonrası çağırır — açık sayfayı tazele. */
  showArmory() {
    if (this.screens.menu.classList.contains('hidden')) return;
    this.refreshWallet();
    if (this.page === 'cephane') this.renderArmory();
    else if (this.page === 'kahraman') this.renderChars();
    else if (this.page === 'savas') this.renderHome();
  }

  renderArmory() {
    this._renderDecks();
    this.renderSlots();
    this.renderGearShop();
  }

  /* v70 D4 · DİZİLİM ŞERİDİ — kahraman başına 3 yuva. Dokun = geç, aktif yuvaya
     tekrar dokun = adlandır (satır içi alan, 14 karakter). */
  _renderDecks() {
    const g = this.game, row = document.getElementById('kzd-row');
    if (!row || !g.decks) return;
    const d = g.decks(), cdef = g.charDef();
    const sub = document.getElementById('kzd-hero');
    if (sub) sub.textContent = cdef.name;
    let h = '';
    for (let i = 0; i < 3; i++) {
      const map = g.deckGear(i);
      let n = 0, pow = 0;
      for (const s of EQUIP_SLOTS) {
        const x = map[s.id] && g.gearById(map[s.id]);
        if (x && g.ownsGear(x.id)) { n++; pow += this._kzPow(x); }
      }
      const name = d.l[i].n || ('DİZİ ' + (i + 1));
      h += '<button class="kzd-chip' + (i === d.a ? ' on' : '') + '" data-i="' + i + '" type="button" role="tab" aria-selected="' + (i === d.a) + '">' +
        '<b class="kzd-no">' + (i + 1) + '</b><span class="kzd-t"><span class="kzd-n">' + name + '</span>' +
        '<em class="kzd-m">' + (n ? n + '/' + EQUIP_SLOTS.length + ' · ' + pow : 'BOŞ') + '</em></span>' +
        (i === d.a ? '<i class="kzd-pen" aria-hidden="true">✎</i>' : '') + '</button>';
    }
    row.innerHTML = h;
    row.querySelectorAll('.kzd-chip').forEach((b) => {
      b.onclick = () => {
        const i = +b.dataset.i;
        if (i !== g.decks().a) { g.switchDeck(i); const nb = row.querySelector('.kzd-chip.on'); if (nb) { nb.classList.add('kzd-pop'); } return; }
        this._editDeckName(b, i);
      };
    });
  }

  _editDeckName(btn, i) {
    const g = this.game, span = btn.querySelector('.kzd-n');
    if (!span || btn.querySelector('input')) return;
    g.audio.play('click');
    const inp = document.createElement('input');
    inp.className = 'kzd-in'; inp.lang = 'tr'; inp.maxLength = 14; inp.value = g.decks().l[i].n || '';
    inp.placeholder = 'DİZİ ' + (i + 1); inp.setAttribute('aria-label', 'Dizilim adı');
    inp.onclick = (ev) => ev.stopPropagation();
    span.replaceWith(inp);
    inp.focus();
    let done = false;
    const fin = (save) => { if (done) return; done = true; if (save) g.renameDeck(i, inp.value.toLocaleUpperCase('tr-TR')); this._renderDecks(); };
    inp.onkeydown = (ev) => { if (ev.key === 'Enter') fin(true); else if (ev.key === 'Escape') fin(false); };
    inp.onblur = () => fin(true);
  }

  /** v70 A6 · YÖNLÜ HASAR: vuruşun geldiği ekran kenarında 0,34 sn kızıl yay.
      Merkezden kaynak yönüne ışın → dikdörtgen kenarıyla kesişim. Yalnız
      transform + opaklık (WAAPI, tahsis yalnız hasar anında — dokunulmazlık sınırlar). */
  hurtDir(a) {
    const el = this._hdEl || (this._hdEl = document.getElementById('hurt-dir'));
    if (!el || !el.firstElementChild) return;
    /* v75: ölçü önbellekli — clientWidth simülasyon adımının ortasında zorunlu yerleşim (layout) tetikliyordu */
    if (!this._hdW || this._hdVW !== window.innerWidth || this._hdVH !== window.innerHeight) {
      this._hdVW = window.innerWidth; this._hdVH = window.innerHeight; this._hdW = el.clientWidth; this._hdH = el.clientHeight;
    }
    const W = this._hdW, H = this._hdH;
    if (!W || !H) return;
    const ux = Math.cos(a), uy = Math.sin(a), cx = W / 2, cy = H / 2;
    const t = Math.min(Math.abs(ux) > 1e-3 ? cx / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-3 ? cy / Math.abs(uy) : 1e9);
    const arc = el.firstElementChild;
    arc.style.transform = 'translate(' + (cx + ux * t).toFixed(1) + 'px,' + (cy + uy * t).toFixed(1) + 'px) rotate(' + (a + Math.PI / 2).toFixed(3) + 'rad)';
    if (arc.animate) { if (this._hdAn) this._hdAn.cancel(); this._hdAn = arc.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 340, easing: 'ease-out' }); }
  }

  /* ═══════════ KUŞANIM v40 ═══════════
     Kahraman sahnesi: dört yuva portreyi çevreler (sol: silah·eldiven,
     sağ: zırh·çizme). Yuvaya dokunmak ÇIKARMAZ (eski davranış kazayla eşya
     söküyordu) — çantayı o yuvaya süzer. Karta ilk dokunuş SEÇER (KUŞAN /
     İNCELE tepsisi), ikinci dokunuş inceler. Kuşanınca kart yuvaya uçar. */
  renderSlots() {
    const g = this.game;
    const cdef = g.charDef();
    const map = g.charGearMap();
    const worn = EQUIP_SLOTS.filter((s) => map[s.id] && g.gearById(map[s.id])).length;
    this.slotCount.textContent = worn + '/' + EQUIP_SLOTS.length + ' YUVA';

    const lp = document.getElementById('loadout-portrait');
    const lpImg = document.getElementById('loadout-portrait-img');
    if (lp) {
      const hero = document.getElementById('kz-hero');
      if (hero) hero.style.setProperty('--hero', cdef.colors.eye);
      const art = HERO_ART[g.meta.selectedChar];
      if (art && lpImg) {
        lpImg.src = art;
        lpImg.classList.remove('hidden');
        lp.style.visibility = 'hidden';
      } else {
        if (lpImg) { lpImg.classList.add('hidden'); lpImg.removeAttribute('src'); }
        lp.style.visibility = 'visible';
        const lctx = lp.getContext('2d');
        lctx.clearRect(0, 0, lp.width, lp.height);
        drawCharPortrait(lctx, lp.width / 2, lp.height / 2 - 6, 50, cdef);
      }
      const ln = document.getElementById('loadout-name');
      if (ln) ln.textContent = cdef.name;
    }

    let l = '', r = '', pow = 0;
    for (const s of EQUIP_SLOTS) {
      const h = this._kzSlotHTML(s, map[s.id]);
      if (s.id === 'zirh' || s.id === 'cizme') r += h; else l += h;
      const x = map[s.id] && g.gearById(map[s.id]);
      if (x && g.ownsGear(x.id) && g.canWear(x.id)) pow += this._kzPow(x);
    }
    document.getElementById('kz-col-l').innerHTML = l;
    document.getElementById('kz-col-r').innerHTML = r;
    document.getElementById('kz-power').textContent = pow;
    this._kzRenderStats(map);
    this._kzBind();
  }

  _kzSlotHTML(s, id) {
    const g = this.game;
    const gear = id ? g.gearById(id) : null;
    const sel = this._kzTab === s.id ? ' sel' : '';
    const dot = this._kzSlotHint(s.id) ? '<i class="kz-dot" aria-hidden="true"></i>' : '';
    const short = KZ_SHORT[s.id] || s.name;
    if (!gear) {
      return '<button class="kz-slot empty' + sel + '" data-slot="' + s.id + '" type="button" aria-label="' + short + ' yuvası boş">' +
        '<span class="kz-frame"><span class="kz-art ghost">' + this.gearArt(KZ_GHOST[s.id]) + '</span><span class="kz-plus">+</span></span>' +
        '<span class="kz-lab">' + short + '</span><span class="kz-nm dim">Boş</span>' + dot + '</button>';
    }
    const rar = RARITIES[gear.rarity];
    return '<button class="kz-slot filled rk-' + KZ_RANK[gear.rarity] + sel + '" data-slot="' + s.id + '" type="button" style="--rar:' + rar.color + ';--rar-glow:' + rar.glow + '" aria-label="' + short + ': ' + gear.name + '">' +
      '<span class="kz-frame"><span class="kz-art">' + this.gearArt(gear.icon) + '</span><span class="kz-lv">' + g.gearLevel(id) + '</span></span>' +
      '<span class="kz-lab">' + short + '</span><span class="kz-nm">' + gear.name + '</span>' + dot + '</button>';
  }

  _kzRenderStats(map) {
    const g = this.game;
    const tot = {};
    const worn = [];
    for (const sl in map) {
      const x = g.gearById(map[sl]);
      if (!x || !g.ownsGear(x.id) || !g.canWear(x.id)) continue;
      worn.push(x);
      const mul = gearLevelMods(g.gearLevel(x.id));
      for (const k in x.mods) tot[k] = (tot[k] || 0) + x.mods[k] * mul;
    }
    /* v54 H4: set bonusları toplam statlara da girer + set şeridi */
    const sets = activeSets(worn);
    for (const A of sets) {
      for (const k in A.S.p2) tot[k] = (tot[k] || 0) + A.S.p2[k];
      if (A.on4) for (const k in A.S.p4) tot[k] = (tot[k] || 0) + A.S.p4[k];
    }
    this._kzRenderSets(sets);
    const keys = ['dmgPct', 'atkPct', 'maxHp', 'lifeSteal'];
    for (const k in tot) if (!keys.includes(k) && Math.abs(tot[k]) > 1e-6) keys.push(k);
    let h = '';
    for (const k of keys) {
      const v = tot[k] || 0;
      const def = MODS[k];
      const m = fmtMod(k, def && def.fmt === 'flat' ? Math.round(v) : v);
      h += '<div class="kz-st' + (!v ? ' zero' : v < 0 ? ' neg' : '') + '"><b>' + (v ? m.val : '—') + '</b><span>' + m.label + '</span></div>';
    }
    document.getElementById('kz-stats').innerHTML = h;
  }

  /** v54 H4: set şeridi — istatistik panosunun üstünde; set yoksa ipucu. */
  _kzRenderSets(sets) {
    const st = document.getElementById('kz-stats');
    if (!st) return;
    let box = document.getElementById('kz-sets');
    if (!box) { box = document.createElement('div'); box.id = 'kz-sets'; box.className = 'kz-sets'; st.parentNode.insertBefore(box, st); }
    if (!sets.length) {
      box.innerHTML = '<span class="ks-hint">AYNI KADEMEDEN 2 VE 4 PARÇA KUŞAN · SET GÜCÜ AÇILIR</span>';
      return;
    }
    box.innerHTML = sets.map((A) =>
      '<div class="ks-set" style="--sc:' + A.S.col + '">' +
        '<span class="ks-h"><b>' + A.S.name + ' SETİ</b><em>' + Math.min(4, A.n) + ' / 4</em></span>' +
        '<span class="ks-l on">2 · ' + A.S.l2 + '</span>' +
        '<span class="ks-l' + (A.on4 ? ' on' : '') + '">4 · ' + A.S.l4 + '</span>' +
      '</div>').join('');
  }

  /** Arayüz güç puanı: yalnız AYNI yuvadaki eşyaları kıyaslamak ve toplamı
      göstermek için (oyun mantığı bunu okumaz). Seviye çarpanı dahil. */
  _kzPow(x) {
    const mul = gearLevelMods(this.game.gearLevel(x.id));
    let p = 0;
    for (const k in x.mods) p += (KZ_W[k] || 300) * x.mods[k];
    return Math.round(p * mul);
  }
  _kzBetter(x) {
    const cur = this.game.charGearMap()[x.slot];
    const c = cur && this.game.gearById(cur);
    return this._kzPow(x) > (c ? this._kzPow(c) : 0);
  }
  /* Kırmızı nokta YALNIZ boş yuva + giyilebilir eşya varken (kullanıcı kararı
     2026-09-23): kuşanılı yuvada "daha güçlü / geliştirilebilir" uyarısı
     kalıcı nokta bırakıyordu. O bilgi kartlarda ↑ / ▲ rozetiyle duruyor. */
  _kzSlotHint(slot) {
    const g = this.game;
    if (g.charGearMap()[slot]) return false;
    return EQUIPMENT.some((x) => x.slot === slot && g.ownsGear(x.id) && g.canWear(x.id));
  }

  renderGearShop() {
    const g = this.game;
    const tab = this._kzTab || 'all';
    const tabsEl = document.getElementById('kz-tabs');
    const tabs = [{ id: 'all', name: 'TÜMÜ' }].concat(EQUIP_SLOTS.map((s) => ({ id: s.id, name: KZ_SHORT[s.id] || s.name })));
    let th = '';
    for (const t of tabs) {
      const items = t.id === 'all' ? EQUIPMENT : EQUIPMENT.filter((x) => x.slot === t.id);
      const own = items.filter((x) => g.ownsGear(x.id)).length;
      const dot = t.id === 'all' ? false : this._kzSlotHint(t.id);
      th += '<button class="kz-tab' + (t.id === tab ? ' on' : '') + '" data-tab="' + t.id + '" type="button" role="tab" aria-selected="' + (t.id === tab) + '">' +
        t.name + '<em>' + own + '</em>' + (dot ? '<i class="kz-dot" aria-hidden="true"></i>' : '') + '</button>';
    }
    tabsEl.innerHTML = th;

    const slotIx = (x) => EQUIP_SLOTS.findIndex((s) => s.id === x.slot);
    const list = EQUIPMENT.filter((x) => tab === 'all' || x.slot === tab);
    const owned = list.filter((x) => g.ownsGear(x.id));
    const missing = list.filter((x) => !g.ownsGear(x.id));
    owned.sort((a, b) => (tab === 'all' ? slotIx(a) - slotIx(b) : 0) ||
      (g.isEquipped(b.id) - g.isEquipped(a.id)) || (g.canWear(b.id) - g.canWear(a.id)) || (this._kzPow(b) - this._kzPow(a)));
    missing.sort((a, b) => (tab === 'all' ? slotIx(a) - slotIx(b) : 0) || (KZ_RANK[a.rarity] - KZ_RANK[b.rarity]));

    let h = '';
    for (const x of owned) h += this._kzCardHTML(x, false);
    if (!owned.length) h += '<div class="kz-empty">Bu yuvaya ait eşyan yok — sandıklardan düşer.</div>';
    if (missing.length) h += '<div class="kz-sep"><b>BULUNAMAYAN</b><span>sandıklardan düşer · ' + missing.length + '</span></div>';
    for (const x of missing) h += this._kzCardHTML(x, true);
    this.armoryShop.innerHTML = h;
    const sub = document.getElementById('kz-bag-sub');
    if (sub) sub.textContent = owned.length + ' / ' + list.length + ' EŞYA';
    this._kzBind();
  }

  _kzCardHTML(x, locked) {
    const g = this.game;
    const rar = RARITIES[x.rarity], rk = KZ_RANK[x.rarity];
    const st = ' style="--rar:' + rar.color + ';--rar-glow:' + rar.glow + '"';
    const pips = '<span class="kc-pips" aria-label="' + rar.name + '">' + '<i class="f"></i>'.repeat(rk) + '<i></i>'.repeat(5 - rk) + '</span>';
    if (locked) {
      return '<div class="kc lock rk-' + rk + '" data-id="' + x.id + '" role="button" tabindex="0"' + st + ' aria-label="Bulunamayan ' + rar.name + ' eşya">' +
        '<span class="kc-art"><span class="kc-icon">' + this.gearArt(x.icon) + '</span><span class="kc-q">?</span></span>' +
        pips + '<span class="kc-name">? ? ?</span><span class="kc-bar none"><b>SANDIK</b></span></div>';
    }
    const lvl = g.gearLevel(x.id), need = g.cardsForNextGear(x.id), maxed = need == null, cards = g.gearCardCount(x.id);
    const pct = maxed ? 100 : Math.min(100, Math.round(cards / need * 100));
    const on = g.isEquipped(x.id), wear = g.canWear(x.id), ready = !maxed && cards >= need;
    const better = !on && wear && this._kzBetter(x);
    const flag = on ? '<span class="kc-flag on" title="Kuşanıldı">✓</span>'
      : ready ? '<span class="kc-flag ready" title="Geliştirilebilir">▲</span>'
      : better ? '<span class="kc-flag up" title="Kuşanılandan güçlü">↑</span>' : '';
    const cls = 'kc rk-' + rk + (on ? ' on' : '') + (wear ? '' : ' cant') + (this._kzSel === x.id ? ' sel' : '');
    const act = on ? '<button class="kc-act out" data-act="off" type="button">ÇIKAR</button>'
      : wear ? '<button class="kc-act eq" data-act="on" type="button">KUŞAN</button>'
      : '<button class="kc-act no" type="button" disabled>GİYEMEZ</button>';
    return '<div class="' + cls + '" data-id="' + x.id + '" role="button" tabindex="0"' + st + ' aria-label="' + x.name + ', seviye ' + lvl + '">' +
      '<span class="kc-art">' + (rk >= 4 ? '<i class="kc-rays" aria-hidden="true"></i>' : '') +
        '<span class="kc-icon">' + this.gearArt(x.icon) + '</span>' +
        '<span class="kc-lv">Sv ' + lvl + '</span>' + flag + '</span>' +
      pips + '<span class="kc-name">' + x.name + '</span>' +
      '<span class="kc-bar' + (maxed ? ' max' : ready ? ' ready' : '') + '"><i style="width:' + pct + '%"></i><b>' + (maxed ? 'MAKS' : cards + '/' + need) + '</b></span>' +
      '<span class="kc-tray">' + act + '<button class="kc-act info" data-act="info" type="button">İNCELE</button></span>' +
    '</div>';
  }

  _kzSelect(id) {
    this._kzSel = id;
    this.armoryShop.querySelectorAll('.kc.sel').forEach((el) => el.classList.remove('sel'));
    if (id) {
      const el = this.armoryShop.querySelector('.kc[data-id="' + id + '"]');
      if (el) el.classList.add('sel');
    }
  }

  _kzBind() {
    if (this._kzBound) return;
    this._kzBound = true;
    const g = this.game;
    const page = document.getElementById('page-cephane');
    const grid = this.armoryShop;
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.kc');
      if (!card) return;
      e.stopPropagation();
      const id = card.getAttribute('data-id');
      if (card.classList.contains('lock')) { g.audio.play('click'); this.openGearDetail(id); return; }
      const act = e.target.closest('[data-act]');
      if (act) {
        const a = act.getAttribute('data-act');
        if (a === 'info') { g.audio.play('click'); this.openGearDetail(id); }
        else if (a === 'on') this._kzEquip(id, card);
        else if (a === 'off') { this._kzSel = null; g.toggleEquip(id); }
        return;
      }
      if (this._kzSel === id) { g.audio.play('click'); this.openGearDetail(id); return; }
      g.audio.play('click');
      this._kzSelect(id);
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.kc');
      if (!card || e.target !== card) return;
      e.preventDefault(); card.click();
    });
    document.getElementById('kz-tabs').addEventListener('click', (e) => {
      const t = e.target.closest('.kz-tab');
      if (!t) return;
      g.audio.play('click');
      this._kzTab = t.getAttribute('data-tab');
      this._kzSel = null;
      this.renderGearShop();
      this.renderSlots();
    });
    /* v40d (kullanıcı): DOLU yuvaya dokunmak çantayı süzmez, altında küçük
       ÇIKAR balonu açar; balona dokunmak eşyayı çıkarır. BOŞ yuva eskisi gibi
       çantayı o yuvaya süzer. Balon <button> içine konamaz (iç içe buton
       geçersiz) → sütuna mutlak konumlu kardeş olarak eklenir. */
    const closePop = () => { document.querySelectorAll('.kz-pop').forEach((p) => p.remove()); };
    const onSlot = (e) => {
      const pb = e.target.closest('.kz-pop');
      if (pb) {
        e.stopPropagation();
        const slot = pb.getAttribute('data-slot');
        closePop();
        Haptics.fire('ui');
        g.unequipSlot(slot);
        return;
      }
      const s = e.target.closest('.kz-slot');
      if (!s) return;
      g.audio.play('click');
      const id = s.getAttribute('data-slot');
      if (s.classList.contains('filled')) {
        e.stopPropagation();
        const open = document.querySelector('.kz-pop[data-slot="' + id + '"]');
        closePop();
        if (open) return;
        const col = s.parentElement;
        const pop = document.createElement('button');
        pop.type = 'button';
        pop.className = 'kz-pop';
        pop.setAttribute('data-slot', id);
        pop.textContent = 'ÇIKAR';
        pop.style.top = (s.offsetTop + s.querySelector('.kz-frame').offsetHeight + 6) + 'px';
        pop.style.left = (s.offsetLeft + s.offsetWidth / 2) + 'px';
        col.appendChild(pop);
        return;
      }
      closePop();
      this._kzTab = this._kzTab === id ? 'all' : id;
      this._kzSel = null;
      this.renderSlots();
      this.renderGearShop();
      if (this._kzTab !== 'all') this._kzRevealBag();
    };
    document.getElementById('kz-col-l').addEventListener('click', onSlot);
    document.getElementById('kz-col-r').addEventListener('click', onSlot);
    const swap = document.getElementById('kz-swap');
    if (swap) swap.addEventListener('click', () => { g.audio.play('click'); this.setPage('kahraman'); });
    if (page) page.addEventListener('click', (e) => {
      if (!e.target.closest('.kz-pop, .kz-slot')) closePop();
      if (this._kzSel && !e.target.closest('.kc')) this._kzSelect(null);
    });
  }

  /** Çantanın başı görünmüyorsa kaydırma kabını oraya taşı (scrollIntoView YOK). */
  _kzRevealBag() {
    const bag = document.getElementById('kz-bag');
    if (!bag) return;
    let sc = bag.parentElement;
    while (sc && sc !== document.body) {
      const oy = getComputedStyle(sc).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && sc.scrollHeight > sc.clientHeight + 4) break;
      sc = sc.parentElement;
    }
    if (!sc || sc === document.body) return;
    const r = bag.getBoundingClientRect(), rs = sc.getBoundingClientRect();
    if (r.top >= rs.top && r.top < rs.top + rs.height * 0.55) return;
    const smooth = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    sc.scrollTo({ top: sc.scrollTop + (r.top - rs.top) - 8, behavior: smooth ? 'smooth' : 'auto' });
  }

  /** Kuşan + kartın yuvaya uçuşu. Uçuş WAAPI; bitişi ayrıca bir saatle de
      garanti edilir (görünmeyen belgede animasyon ilerlemeyebilir — v36/v39). */
  _kzEquip(id, card) {
    const g = this.game;
    if (!g.canWear(id)) { g.audio.play('error'); return; }
    const src = card && card.querySelector('.kc-icon svg');
    const r0 = src ? src.getBoundingClientRect() : null;
    const art = src ? src.outerHTML : '';
    g.equipGear(id, true);
    g.audio.play('equip');
    Haptics.fire('ui');
    this._kzSel = null;
    this.renderArmory();
    const gear = g.gearById(id);
    const slot = document.querySelector('.kz-slot[data-slot="' + gear.slot + '"]');
    if (!slot) return;
    const dst = slot.querySelector('.kz-art');
    const pop = () => { slot.classList.remove('pop'); void slot.offsetWidth; slot.classList.add('pop'); };
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const r1 = dst ? dst.getBoundingClientRect() : null;
    if (reduce || !r0 || !r0.width || !r1 || !r1.width || !document.body.animate) { pop(); return; }
    const fly = document.createElement('div');
    fly.className = 'kz-fly';
    fly.innerHTML = art;
    fly.style.left = r0.left + 'px'; fly.style.top = r0.top + 'px';
    fly.style.width = r0.width + 'px'; fly.style.height = r0.height + 'px';
    document.body.appendChild(fly);
    dst.style.opacity = '0';
    const dx = (r1.left + r1.width / 2) - (r0.left + r0.width / 2);
    const dy = (r1.top + r1.height / 2) - (r0.top + r0.height / 2);
    const k = r1.width / r0.width;
    let done = false;
    const land = () => { if (done) return; done = true; fly.remove(); dst.style.opacity = ''; pop(); };
    const an = fly.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)' },
      { transform: 'translate(' + (dx * 0.45) + 'px,' + (dy * 0.45 - 36) + 'px) scale(' + ((1 + k) / 2 * 1.18) + ') rotate(-10deg)', offset: 0.45 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ') rotate(0deg)' },
    ], { duration: 480, easing: 'cubic-bezier(.5,.05,.3,1)' });
    an.onfinish = land;
    setTimeout(land, 720);
  }

  /* ═══════════ EŞYA İNCELEME (CR kart detay, kompakt) ═══════════ */

  openGearDetail(id) {
    const g = this.game;
    const gear = g.gearById(id);
    if (!gear) return;
    this._gdId = id;
    const scr = this.screens.geardetail;
    const rar = RARITIES[gear.rarity];
    scr.style.setProperty('--rar', rar.color);
    scr.style.setProperty('--rar-glow', rar.glow);
    const owned = g.ownsGear(id);
    scr.classList.toggle('is-locked', !owned);

    const glyphEl = document.getElementById('gd-glyph');
    glyphEl.innerHTML = owned ? this.gearArt(gear.icon) : this.icon('lock');
    glyphEl.style.color = owned ? '' : '#6b7290';
    glyphEl.classList.toggle('is-art', owned);

    document.getElementById('gd-name').textContent = owned ? gear.name : '? ? ?';
    document.getElementById('gd-name').style.color = owned ? rar.color : '#8891ad';
    document.getElementById('gd-rarity').textContent = rar.name;
    document.getElementById('gd-rarity').style.color = rar.color;
    const slotDef = EQUIP_SLOTS.find((x) => x.id === gear.slot);
    document.getElementById('gd-slot').textContent = slotDef ? slotDef.name : gear.slot;
    document.getElementById('gd-lore').textContent = owned
      ? '“' + gear.desc + '”'
      : 'Bu eşya yalnızca sandıklardan çıkar. Kopyası düştükçe seviye atlar.';

    const lvl = owned ? g.gearLevel(id) : 1;
    const lvlEl = document.getElementById('gd-lvl');
    lvlEl.textContent = owned ? ('Sv ' + lvl + '/' + GEAR_MAX_LEVEL) : '?';

    const mul = gearLevelMods(lvl);
    const statsEl = document.getElementById('gd-stats');
    /* v40 KIYAS: aynı yuvada BAŞKA bir eşya kuşanılıysa her satır farkını taşır */
    const curId = owned ? g.charGearMap()[gear.slot] : null;
    const cur = curId && curId !== id ? g.gearById(curId) : null;
    const curMul = cur ? gearLevelMods(g.gearLevel(cur.id)) : 1;
    const keys = Object.keys(gear.mods);
    if (cur) for (const k in cur.mods) if (!keys.includes(k)) keys.push(k);
    const fmtV = (k, v) => { const def = MODS[k]; return fmtMod(k, def && def.fmt === 'flat' ? Math.round(v) : v); };
    let sh = cur ? '<div class="kz-vs">Kuşanılana göre · <b style="color:' + RARITIES[cur.rarity].color + '">' + cur.name + '</b></div>' : '';
    for (const k of keys) {
      const has = k in gear.mods;
      const raw = has ? gear.mods[k] * mul : 0;
      const m = fmtV(k, owned ? raw : gear.mods[k]);
      let delta = '';
      if (cur) {
        const dv = raw - (cur.mods[k] || 0) * curMul;
        const eps = MODS[k] && MODS[k].fmt === 'flat' ? 0.5 : 0.005;
        if (Math.abs(dv) >= eps) {
          const dm = fmtV(k, dv);
          delta = '<span class="cs-d ' + (dv > 0 ? 'up' : 'down') + '">' + (dv > 0 ? '▲ ' : '▼ ') + dm.val + '</span>';
        } else delta = '<span class="cs-d eq">=</span>';
      }
      sh += '<div class="cd-stat"><span class="cs-ico" style="--sc:' + (m.good ? '#7ee08a' : '#ff7d8c') + '">' + this.icon(gear.icon) + '</span>' +
        '<span class="cs-t"><span class="cs-k">' + m.label + '</span>' +
        '<span class="cs-v ' + (m.good ? 'up' : 'down') + '">' + (!owned ? '???' : has ? m.val : '—') + delta + '</span></span></div>';
    }
    statsEl.innerHTML = sh;

    const act = document.getElementById('gd-action');
    let ah = '';
    if (!owned) {
      ah = '<div class="cd-locked-note">' +
          '<span class="cln-ico">' + ICONS.lock + '</span>' +
          '<span>Bu eşya yalnızca <b>sandıklardan</b> çıkar. Kartı düştüğünde açılır, biriktikçe seviye atlar.</span>' +
        '</div>' +
        '<button class="cd-select cant" disabled>SANDIKTAN ÇIKAR</button>';
    } else {
      const need = g.cardsForNextGear(id);
      const maxed = need == null;
      const cards = g.gearCardCount(id);
      const canUp = !maxed && g.canUpgradeGear(id);
      if (!maxed) {
        const gold = g.goldForNextGear(id);
        const pct = Math.min(100, cards / need * 100);
        ah += '<div class="cd-upgrade">' +
            '<div class="cu-head"><span class="cu-lvl">Sv ' + lvl + '</span>' +
              '<span class="cu-bar' + (canUp ? ' ready' : '') + '"><i style="width:' + pct + '%"></i>' +
              '<b>' + cards + ' / ' + need + ' kart</b></span>' +
              '<span class="cu-next">Sv ' + (lvl + 1) + '</span></div>' +
            '<button class="cu-btn' + (canUp ? '' : ' cant') + '" data-up="1">GELİŞTİR ' +
              '<span class="cu-cost"><span class="ruby"></span>' + gold + '</span></button>' +
          '</div>';
      } else {
        ah += '<div class="cd-upgrade maxed"><b>AZAMİ SEVİYE</b> · Sv ' + lvl + '</div>';
      }
      const equipped = g.isEquipped(id);
      const wearable = g.canWear(id);
      if (equipped) ah += '<button class="cd-selected">✓ KUŞANILDI</button>';
      else if (wearable) ah += '<button class="cd-select">KUŞAN</button>';
      else ah += '<button class="cd-select cant" disabled>GİYEMEZ</button>';
    }
    act.innerHTML = ah;

    const upBtn = act.querySelector('[data-up]');
    if (upBtn) upBtn.onclick = () => this.playGearUpgradeFx(id);
    const selBtn = act.querySelector('.cd-select:not(.cant)');
    if (selBtn) selBtn.onclick = () => {
      /* kuşanım sayfasındaysak pop-up kapanır ve kart yuvaya UÇAR */
      const card = this.page === 'cephane' && this.armoryShop.querySelector('.kc[data-id="' + id + '"]');
      if (card) { this.closeGearDetail(); this._kzEquip(id, card); return; }
      this.game.toggleEquip(id); this.openGearDetail(id); this.renderGearShop(); this.renderSlots();
    };
    const selfBtn = act.querySelector('.cd-selected');
    if (selfBtn) selfBtn.onclick = () => { this.game.toggleEquip(id); this.openGearDetail(id); this.renderGearShop(); this.renderSlots(); };

    scr.classList.remove('hidden');
  }

  playGearUpgradeFx(id) {
    const g = this.game;
    if (!g.canUpgradeGear(id)) { g.audio.play('error'); return; }
    const stage = document.querySelector('#screen-geardetail .gd-stage');
    if (!stage || stage.querySelector('.upfx')) return;
    if (!g.upgradeGear(id)) return;
    const lvlNew = g.gearLevel(id);
    const fx = document.createElement('div');
    fx.className = 'upfx';
    let dots = '';
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * 6.283, d = 60 + Math.random() * 90;
      dots += '<i style="--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d) + 'px;--dl:' + Math.round(Math.random() * 200) + 'ms"></i>';
    }
    fx.innerHTML = '<span class="upfx-rays"></span><span class="upfx-flash"></span>' + dots +
      '<span class="upfx-banner">SEVİYE ' + lvlNew + '!</span>';
    stage.appendChild(fx);
    setTimeout(() => {
      fx.remove();
      this.openGearDetail(id);
      this.renderGearShop();
    }, 1200);
  }

  closeGearDetail() {
    this.screens.geardetail.classList.add('hidden');
  }

  /* ── Duraklat ── */
  showPause() {
    this.hideAllScreens();
    this.screens.pause.classList.remove('hidden');

    const w = this.game.weapons;
    let html = '';
    for (const id in w.slots) html += this.loadoutChip(id, 'Sv ' + w.slots[id]);
    for (const id in w.passives) html += this.loadoutChip(id, 'Sv ' + w.passives[id]);
    this.pauseLoadout.innerHTML = html || '<span class="ld-item">Henüz rün yok</span>';
  }

  loadoutChip(id, sub) {
    return '<span class="ld-item" style="color:' + this.iconColor(id) + '">' +
      this.icon(id) +
      '<span style="color:#e8e4d8">' + this.displayName(id) + '</span>' +
      '<span class="ld-lv">' + sub + '</span></span>';
  }

  hidePause() { this.screens.pause.classList.add('hidden'); }

  /* ═══════════ AYARLAR ═══════════
     Panel iki yerden açılır: menüdeki dişli ve duraklatma perdesi. İkisinde
     de ÜSTE biner (hideAllScreens çağrılmaz) — savaş sırasında açıldığında
     duraklatma perdesini kapatmak "devam et" düğmesini yok eder ve oyuncu
     oyuna dönemez. Kapanışta nereye dönüleceği de bu yüzden saklanır. */
  showSettings() {
    this._setFrom = this.screens.pause.classList.contains('hidden') ? 'menu' : 'pause';
    this.screens.settings.classList.remove('hidden');
    this.renderSettings();
  }

  hideSettings() {
    this.screens.settings.classList.add('hidden');
  }

  settingsOpen() { return !this.screens.settings.classList.contains('hidden'); }

  renderSettings() {
    const S = this.game.settings;
    if (!S) return;
    const gfxNow = document.getElementById('set-gfx-now');
    if (gfxNow) gfxNow.textContent = S.tierLabel();
    document.querySelectorAll('#set-gfx .set-seg-b').forEach((b) => {
      b.classList.toggle('on', b.getAttribute('data-gfx') === S.data.gfx);
    });
    const sfx = document.getElementById('set-sfx');
    const sfxNow = document.getElementById('set-sfx-now');
    if (sfx) sfx.value = String(Math.round(S.data.sfx * 100));
    if (sfxNow) sfxNow.textContent = String(Math.round(S.data.sfx * 100));
    const mus = document.getElementById('set-music');
    const musNow = document.getElementById('set-music-now');
    if (mus) mus.value = String(Math.round(S.data.music * 100));
    if (musNow) musNow.textContent = String(Math.round(S.data.music * 100));
    const hap = document.getElementById('set-haptics');
    if (hap) hap.setAttribute('aria-checked', S.data.haptics ? 'true' : 'false');
    const shk = document.getElementById('set-shake');
    if (shk) shk.setAttribute('aria-checked', S.data.shake ? 'true' : 'false');
    const rmb = document.getElementById('set-rm');
    if (rmb) rmb.setAttribute('aria-checked', S.data.rm ? 'true' : 'false');
    for (const [bid, key] of [['set-batt', 'batt'], ['set-cb', 'cb'], ['set-big', 'big'], ['set-hsoft', 'hsoft']]) {
      const b = document.getElementById(bid);
      if (b) b.setAttribute('aria-checked', S.data[key] ? 'true' : 'false');
    }
    const en = document.getElementById('set-err-n');
    if (en) en.textContent = String(ErrLog.read().length);
    /* v55: titreşim tek seçim (KAPALI/HAFİF/TAM) = haptics + hsoft */
    const hv = !S.data.haptics ? 'off' : (S.data.hsoft ? 'soft' : 'full');
    document.querySelectorAll('#set-hap3 [data-hap]').forEach((b) => b.classList.toggle('on', b.dataset.hap === hv));
    for (const r of document.querySelectorAll('#screen-settings .set-range')) r.style.setProperty('--p', r.value + '%');
  }

  _setTab(k) {
    document.querySelectorAll('#set-tabs [data-tab]').forEach((t) => { const on = t.dataset.tab === k; t.classList.toggle('on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
    document.querySelectorAll('#screen-settings .set-pane').forEach((p) => p.classList.toggle('off', p.dataset.pane !== k));
    const sh = document.querySelector('#screen-settings .set-sheet'); if (sh) sh.scrollTop = 0;
  }

  bindSettings() {
    const g = this.game;
    const S = g.settings;
    if (!S) return;
    document.querySelectorAll('#set-gfx .set-seg-b').forEach((b) => {
      b.addEventListener('click', () => {
        g.audio.play('click');
        S.set('gfx', b.getAttribute('data-gfx'));
        this.renderSettings();
      });
    });
    const sfx = document.getElementById('set-sfx');
    if (sfx) {
      /* 'input' her piksel hareketinde tetiklenir — ses seviyesini orada
         yazmak sorun değil (tek gain), ama localStorage'a her defasında
         yazmak değil: kaydetme 'change'e (parmak kalkışı) bırakılır. */
      sfx.addEventListener('input', () => {
        const v = (+sfx.value || 0) / 100;
        S.data.sfx = v;
        S.applyOne('sfx');
        const n = document.getElementById('set-sfx-now');
        if (n) n.textContent = String(Math.round(v * 100));
      });
      sfx.addEventListener('change', () => { S.save(); g.audio.play('click'); });
    }
    const mus = document.getElementById('set-music');
    if (mus) {
      /* Müzikte 'click' ÇALINMAZ: efekt kaydırağında tık sesi ayarın
         ÖNIZLEMESİdir (yeni seviyeyi duyurur), müzikte ise müziğin kendisi
         zaten çalıyor — üstüne tık koymak yalnız gürültü olur. */
      mus.addEventListener('input', () => {
        const v = (+mus.value || 0) / 100;
        S.data.music = v;
        S.applyOne('music');
        const n = document.getElementById('set-music-now');
        if (n) n.textContent = String(Math.round(v * 100));
      });
      mus.addEventListener('change', () => S.save());
    }
    const hap = document.getElementById('set-haptics');
    if (hap) {
      hap.addEventListener('click', () => {
        const next = hap.getAttribute('aria-checked') !== 'true';
        S.set('haptics', next);
        hap.setAttribute('aria-checked', next ? 'true' : 'false');
        g.audio.play('click');
        if (next) Haptics.fire('ui');       // aç kapa: değişimi HİSSETTİR
      });
    }
    document.querySelectorAll('#set-hap3 [data-hap]').forEach((b) => b.addEventListener('click', () => {
      const v = b.dataset.hap;
      S.set('haptics', v !== 'off'); S.set('hsoft', v === 'soft');
      g.audio.play('click');
      if (v !== 'off') Haptics.fire('ui');
      this.renderSettings();
    }));
    document.querySelectorAll('#set-tabs [data-tab]').forEach((t) => t.addEventListener('click', () => { g.audio.play('click'); this._setTab(t.dataset.tab); }));
    for (const r of document.querySelectorAll('#screen-settings .set-range')) r.addEventListener('input', () => r.style.setProperty('--p', r.value + '%'));
    /* ── v53: sarsıntı · hareketi azalt · perf defteri ── */
    const eCopy = document.getElementById('set-err-copy');
    if (eCopy) eCopy.addEventListener('click', () => {
      try { navigator.clipboard.writeText(ErrLog.text()).then(() => { g.audio.play('copy'); this.toast('HATA KAYDI KOPYALANDI'); }, () => this.toast('KOPYALANAMADI')); } catch (e) { this.toast('KOPYALANAMADI'); }
    });
    const eClr = document.getElementById('set-err-clear');
    if (eClr) eClr.addEventListener('click', () => {
      ErrLog.clear(); g.audio.play('click');
      const en = document.getElementById('set-err-n'); if (en) en.textContent = '0';
      this.toast('HATA KAYDI TEMİZLENDİ');
    });
    [['set-shake', 'shake'], ['set-rm', 'rm'], ['set-batt', 'batt'], ['set-cb', 'cb'], ['set-big', 'big'], ['set-hsoft', 'hsoft']].forEach(([bid, key]) => {
      const b = document.getElementById(bid);
      if (!b) return;
      b.addEventListener('click', () => {
        const next = b.getAttribute('aria-checked') !== 'true';
        S.set(key, next);
        b.setAttribute('aria-checked', next ? 'true' : 'false');
        g.audio.play('click');
      });
    });
    const pBox = document.getElementById('set-perf-box');
    const pShow = document.getElementById('set-perf');
    if (pShow && pBox) pShow.addEventListener('click', () => {
      g.audio.play('click');
      if (!pBox.classList.contains('hidden')) { pBox.classList.add('hidden'); return; }
      const L = PerfLog.read();
      pBox.innerHTML = L.length
        ? '<div class="pf-row pf-h"><span>GÖREV</span><span>p50</span><span>p95</span><span>&gt;50ms</span><span>KADEME</span></div>' +
          L.slice(0, 12).map((r) => '<div class="pf-row' + (r.p95 > 20 ? ' warn' : '') + '"><span>' + r.m + (r.r === 'win' ? ' ✓' : '') + '</span><span>' + r.p50 + '</span><span>' + r.p95 + '</span><span>' + r.sp + '</span><span>' + String(r.tier).toUpperCase() + '</span></div>').join('')
        : '<div class="pf-empty">Henüz ölçülmüş koşu yok. Bir görev oyna, rapor burada birikir.</div>';
      const bl = PerfLog.bootList();
      if (bl.length) pBox.innerHTML += '<div class="pf-empty">AÇILIŞ · son ' + bl[0] + ' ms · ortanca ' + bl.slice().sort((a, b) => a - b)[bl.length >> 1] + ' ms</div>';
      pBox.classList.remove('hidden');
    });
    const pCopy = document.getElementById('set-perf-copy');
    if (pCopy) pCopy.addEventListener('click', () => {
      const txt = PerfLog.text();
      const ok = () => { g.audio.play('copy'); this.toast('RAPOR PANOYA KOPYALANDI'); };
      try { navigator.clipboard.writeText(txt).then(ok, () => this.toast('KOPYALANAMADI')); } catch (e) { this.toast('KOPYALANAMADI'); }
    });
    /* v53 B7: BOŞTA MENÜ — 25 sn dokunuş yoksa sonsuz CSS döngüleri durur
       (html.idle). İlk dokunuşta kaldığı kareden devam eder. */
    {
      const root = document.documentElement;
      let idleT = 0;
      const wake = () => {
        if (root.classList.contains('idle')) root.classList.remove('idle');
        clearTimeout(idleT);
        idleT = setTimeout(() => root.classList.add('idle'), 25000);
      };
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
      wake();
    }
    /* ── v44: bildirim · yasal · destek · veri ── */
    const nt = document.getElementById('set-notif');
    if (nt) {
      const sync = () => nt.setAttribute('aria-checked', Notify.enabled() ? 'true' : 'false');
      sync();
      if (!Notify.available()) document.getElementById('set-notif-grp').classList.add('set-group-dim');
      nt.addEventListener('click', () => {
        const next = !Notify.enabled();
        Notify.setEnabled(next); sync(); g.audio.play('click');
        if (next) Notify.ask();
      });
    }
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => { g.audio.play('click'); fn(); }); };
    on('set-privacy', () => this.showLegal(PRIVACY));
    on('set-kvkk', () => this.showLegal(KVKK));
    on('set-terms', () => this.showLegal(TERMS));
    on('set-support', () => {
      const body = encodeURIComponent('\n\n—\nOyuncu: ' + playerId() + '\nSürüm: ' + APP.version + ' (' + APP.build + ') · ' + platform());
      window.open('mailto:' + APP.supportMail + '?subject=' + encodeURIComponent('Shadowrend destek') + '&body=' + body, '_system');
    });
    on('set-wipe', () => this.confirmWipe());
    for (const b of document.querySelectorAll('#set-lang [data-lang]')) {
      b.classList.toggle('on', b.dataset.lang === LANG);
      b.addEventListener('click', () => { g.audio.play('click'); setLang(b.dataset.lang); });
    }
    const idEl = document.getElementById('set-pid');
    if (idEl) idEl.textContent = playerId();
    const vEl = document.getElementById('set-ver');
    if (vEl) vEl.textContent = 'v' + APP.version + ' · ' + APP.build;
    on('sh-close', () => this.closeSheet());
    const sh = document.getElementById('screen-sheet');
    if (sh) sh.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('[data-doc]');
      if (a) { e.preventDefault(); g.audio.play('click'); this._openDocFromSheet(a.getAttribute('data-doc')); return; }
      if (e.target === sh) this.closeSheet();
    });
  }

  /* ═══════════ v44 · ORTAK SAYFA ═══════════
     Yasal metinler, sandık olasılıkları, yaş seçimi, ebeveyn onayı,
     güncelleme ve veri silme TEK bileşeni paylaşır (#screen-sheet).
     `locked`: kapatma düğmesi yok, geri tuşu ve zemin dokunuşu yutulur
     (yaş seçimi ve zorunlu güncelleme atlanamaz). */
  openSheet({ eyebrow = '', title = '', html = '', actions = [], locked = false, cls = '' }) {
    const scr = document.getElementById('screen-sheet');
    if (!scr) return;
    scr.className = 'screen overlay sheet-scene' + (cls ? ' ' + cls : '');
    scr.dataset.locked = locked ? '1' : '';
    document.getElementById('sh-eyebrow').textContent = eyebrow;
    document.getElementById('sh-title').textContent = title;
    const body = document.getElementById('sh-body');
    body.innerHTML = html;
    body.scrollTop = 0;
    document.getElementById('sh-close').classList.toggle('hidden', !!locked);
    const act = document.getElementById('sh-actions');
    act.innerHTML = '';
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn-rune ' + (a.primary ? 'btn-primary' : 'btn-ghost');
      b.textContent = a.label;
      if (a.id) b.id = a.id;
      if (a.disabled) b.disabled = true;
      b.onclick = () => { this.game.audio.play('click'); if (a.onClick) a.onClick(b); else this.closeSheet(); };
      act.appendChild(b);
    }
    act.classList.toggle('hidden', !actions.length);
    this._sheetOnClose = null;
  }
  closeSheet(force) {
    const scr = document.getElementById('screen-sheet');
    if (!scr || scr.classList.contains('hidden')) return false;
    if (scr.dataset.locked && !force) return true;
    scr.classList.add('hidden');
    const cb = this._sheetOnClose;
    this._sheetOnClose = null;
    if (cb) cb();
    return true;
  }
  sheetOpen() { const s = document.getElementById('screen-sheet'); return !!s && !s.classList.contains('hidden'); }

  showLegal(doc) {
    this.openSheet({ eyebrow: 'SHADOWREND', title: doc.title, html: '<div class="lg-doc">' + doc.body + '</div>', cls: 'sheet-doc' });
  }
  _openDocFromSheet(k) {
    const doc = k === 'kvkk' ? KVKK : k === 'terms' ? TERMS : PRIVACY;
    const back = this._ageCb ? () => this.ensureAgeGate(this._ageCb) : null;
    this.showLegal(doc);
    this._sheetOnClose = back;
  }

  /* ── YAŞ SEÇİMİ (ilk açılış, bir kez) ──
     Doğum tarihi SAKLANMAZ, yalnız aralık (u13 · 13-17 · 18+). Onay
     anahtarı açılmadan DEVAM kilitli. Metin bağlantısı yasal sayfayı
     açar ve kapanınca seçim kaldığı yerden döner (taslak bellekte). */
  ageBand() {
    try { const o = JSON.parse(localStorage.getItem('kh_age') || 'null'); return (o && o.band) || ''; } catch (e) { return ''; }
  }
  isMinor() { return this.ageBand() === 'u13'; }
  ensureAgeGate(cb) {
    if (this.ageBand()) { this._ageCb = null; if (cb) cb(); return; }
    this._ageCb = cb;
    const d = this._ageDraft || (this._ageDraft = { age: 16, ok: false });
    const html =
      '<p class="ag-lead">Sana uygun deneyimi sunabilmemiz için yaşını seç.</p>' +
      '<div class="ag-dial"><b id="ag-num">' + (d.age >= 60 ? '60+' : d.age) + '</b><em>YAŞ</em></div>' +
      '<input id="ag-range" class="set-range ag-range" type="range" min="4" max="60" step="1" value="' + d.age + '" aria-label="Yaş">' +
      '<div class="ag-scale"><span>4</span><span>60+</span></div>' +
      '<div class="ag-consent"><button id="ag-ok" type="button" class="set-toggle" role="switch" aria-checked="' + d.ok + '"><i></i></button>' +
      '<span><a href="#" data-doc="privacy">Gizlilik Politikası</a>, <a href="#" data-doc="kvkk">KVKK Aydınlatma Metni</a> ve ' +
      '<a href="#" data-doc="terms">Kullanım Koşulları</a>’nı okudum, kabul ediyorum.</span></div>';
    this.openSheet({
      eyebrow: 'HOŞ GELDİN', title: 'YAŞINI SEÇ', html, locked: true, cls: 'sheet-age',
      actions: [{ label: 'DEVAM ET', primary: true, id: 'ag-go', disabled: !d.ok, onClick: () => {
        if (!d.ok) return;
        const band = d.age < 13 ? 'u13' : d.age < 18 ? '13-17' : '18+';
        try { localStorage.setItem('kh_age', JSON.stringify({ band, at: Math.floor(Clock.now()), v: 1 })); } catch (e) { /* */ }
        this._ageDraft = null;
        const done = this._ageCb; this._ageCb = null;
        this.closeSheet(true);
        if (done) done();
      } }],
    });
    const rng = document.getElementById('ag-range'), num = document.getElementById('ag-num');
    const ok = document.getElementById('ag-ok'), go = document.getElementById('ag-go');
    rng.addEventListener('input', () => { d.age = +rng.value; num.textContent = d.age >= 60 ? '60+' : String(d.age); });
    ok.addEventListener('click', () => {
      d.ok = !d.ok; ok.setAttribute('aria-checked', d.ok ? 'true' : 'false'); go.disabled = !d.ok;
      this.game.audio.play('click');
    });
  }

  /* ── GÜNCELLEME ── */
  showUpdate(r) {
    const open = () => { if (r.store) window.open(r.store, '_system'); };
    if (r.state === 'force') {
      this.openSheet({
        eyebrow: 'YENİ SÜRÜM', title: 'GÜNCELLEME GEREKLİ', locked: true, cls: 'sheet-up',
        html: '<p class="ag-lead">Shadowrend’in yeni sürümü yayında. Oynamaya devam etmek için oyunu güncelle.</p>' +
              '<div class="up-ver"><span>YÜKLÜ</span><b>' + APP.version + '</b><span>GÜNCEL</span><b>' + (r.latest || '—') + '</b></div>',
        actions: [{ label: 'GÜNCELLE', primary: true, onClick: open }],
      });
      return;
    }
    let seen = '';
    try { seen = localStorage.getItem('kh_upd_seen') || ''; } catch (e) { /* */ }
    if (seen === r.latest) return;
    try { localStorage.setItem('kh_upd_seen', r.latest || ''); } catch (e) { /* */ }
    this.openSheet({
      eyebrow: 'YENİ SÜRÜM', title: 'GÜNCELLEME VAR', cls: 'sheet-up',
      html: '<p class="ag-lead">Shadowrend ' + (r.latest || '') + ' yayında: yeni içerik ve düzeltmeler.</p>',
      actions: [{ label: 'SONRA' }, { label: 'GÜNCELLE', primary: true, onClick: () => { open(); this.closeSheet(); } }],
    });
  }

  /* ── VERİLERİ SİL (Play veri silme yolu) ── */
  confirmWipe() {
    this.openSheet({
      eyebrow: 'KAYIT VE VERİ', title: 'TÜM VERİLERİ SİL', cls: 'sheet-wipe',
      html: '<p class="ag-lead">Bu cihazdaki tüm ilerlemen — kahramanlar, eşyalar, sandıklar, gem ve altın — kalıcı olarak silinir. <b>Geri alınamaz.</b></p>',
      actions: [{ label: 'VAZGEÇ' }, { label: 'SİL', primary: true, onClick: () => {
        try {
          const ks = [];
          for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && (k.startsWith('kh_') || k.startsWith('\u0001s:'))) ks.push(k); }
          ks.forEach((k) => localStorage.removeItem(k));
        } catch (e) { /* */ }
        try { indexedDB.deleteDatabase('shadowrend-vault'); } catch (e) { /* */ }
        setTimeout(() => location.reload(), 150);
      } }],
    });
  }

  /* ── SANDIK: garanti sayacı + olasılık bağlantısı ── */
  _chestMeta(el, t) {
    if (!el) return;
    const g = this.game;
    const n = g.chests.pityCount();
    el.innerHTML =
      '<div class="pity-row"><span class="pity-k">EFSANE GARANTİSİ</span>' +
      '<i class="pity-bar"><em style="width:' + Math.round(n / PITY_N * 100) + '%"></em></i>' +
      '<b class="pity-v">' + n + '/' + PITY_N + '</b></div>' +
      '<button type="button" class="odds-link">OLASILIKLAR<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5 L16 12 L9 19"/></svg></button>';
    el.querySelector('.odds-link').onclick = (e) => { e.stopPropagation(); g.audio.play('click'); this.showOdds(t); };
  }

  showOdds(t) {
    const g = this.game;
    const C = CHESTS[t];
    const o = g.chests.odds(t);
    const pc = (p) => (p <= 0 ? '—' : p < 0.001 ? '&lt;%0,1' : '%' + (p * 100).toFixed(p < 0.1 ? 1 : 0).replace('.', ','));
    const row = (k, v, sub, cls) => '<div class="od-row' + (cls ? ' ' + cls : '') + '"><span class="od-k">' + k + (sub ? '<em>' + sub + '</em>' : '') + '</span><b class="od-v">' + v + '</b></div>';
    let h = '<div class="od-sec">KESİN</div>';
    if (o.gold) h += row('Altın', '%100', o.gold[0] + '–' + o.gold[1]);
    h += '<div class="od-sec">EN İYİ ÖDÜL</div>';
    h += row('Efsane', pc(o.top.legend), '', 'r-leg') + row('Epik', pc(o.top.epic), '', 'r-epi') +
         row('Nadir', pc(o.top.rare), '', 'r-rar') + row('Yaygın', pc(o.top.common), '', 'r-com') +
         (o.top.none > 0 ? row('Yalnız altın', pc(o.top.none), 'eşya çıkmaz') : '');
    h += '<div class="od-sec">EK ÖDÜLLER</div>';
    h += row('Gem', pc(o.gem), o.gemRange ? o.gemRange[0] + '–' + o.gemRange[1] : '') +
         row('Kahraman kartı', pc(o.hero), o.heroLeg > 0 ? 'efsane kahraman ' + pc(o.heroLeg) : '') +
         (o.weapon > 0 ? row('Silah kilidi', pc(o.weapon)) : '');
    h += '<p class="od-pity"><b>EFSANE GARANTİSİ</b> Her sandık açılışı sayılır. Efsane çıkmadan geçen ' + PITY_N +
         '. açılış efsaneyi garanti eder. Şu an: <b>' + g.chests.pityCount() + '/' + PITY_N + '</b></p>';
    h += '<p class="od-note">Oranlar oyunun kendi ödül zarından ' + o.n.toLocaleString('tr-TR') + ' atışla ölçülür; koleksiyonuna göre küçük farklar gösterebilir. “En iyi ödül”, sandıktan çıkan en yüksek nadirliktir.</p>';
    this.openSheet({ eyebrow: 'OLASILIKLAR', title: C.name, html: '<div class="od-doc">' + h + '</div>', cls: 'sheet-odds' });
  }

  /* ═══════════ GERİ TUŞU ═══════════
     Android'de donanım geri tuşu, geçmişte giriş varsa `popstate` üretir;
     yoksa uygulamayı KAPATIR. Oyun tek sayfa olduğu için geçmiş boştu:
     oyuncu savaşın ortasında geri tuşuna basınca uygulama kapanıyordu.

     Çözüm bir "nöbetçi" geçmiş girişi: açılışta bir kez eklenir, her geri
     basışında tüketilir ve HEMEN yenisi konur — yani geçmiş asla tükenmez
     ve uygulama kazara kapanmaz. Kapanış YALNIZCA ana menünün kök
     sekmesinde, ikinci basışta olur (Android'de beklenen davranış).

     Sıra kasıtlıdır: en üstteki katman ilk kapanır. Bu bir yığın değil
     çünkü perdeler zaten birbirinin üstüne biniyor ve durum `game.state`
     ile ui sınıflarında yaşıyor — ikinci bir yığın tutmak iki doğruluk
     kaynağı demek olurdu (waveDuration dersi). */
  handleBack() {
    const g = this.game;
    if (this.sheetOpen()) return this.closeSheet();
    if (this.settingsOpen()) { this.hideSettings(); return true; }
    if (!this.screens.chardetail.classList.contains('hidden')) { this.closeCharDetail(); return true; }
    if (!this.screens.battlepass.classList.contains('hidden')) { this.hideBattlePass(); return true; }
    if (!this.screens.quests.classList.contains('hidden')) { this.hideQuests(); return true; }
    if (g.state === 'playing') { g.pauseGame(); return true; }
    if (g.state === 'paused') { g.resumeGame(); return true; }
    /* Menüdeyken: alt sayfadan kök sekmeye dön */
    if (!this.screens.menu.classList.contains('hidden')) {
      if (this._journeyMode === 'chapters') { this._journeyMode = 'worlds'; this.renderJourney(); return true; }
      if (this.page !== 'savas') { this.setPage('savas'); return true; }
    }
    return false;              // kök: uygulamanın kapanmasına izin ver
  }

  /* ═══════════ REKLAM İZLEME (simülasyon) ═══════════ */
  showAdWatch(seconds, onDone) {
    /* PAKETTE GERÇEK ÖDÜLLÜ REKLAM (AdMob); ödül yalnız tamamlanınca. */
    if (Backend.ads()) {
      Backend.rewarded().then((ok) => { if (ok) onDone(); else this.toast('REKLAM YÜKLENEMEDİ'); });
      return;
    }
    this.hideAllScreens();
    this.screens.adwatch.classList.remove('hidden');
    const CIRC = 119.4;
    let left = seconds;
    this.adWatchNum.textContent = left;
    this.adWatchArc.style.transition = 'none';
    this.adWatchArc.style.strokeDashoffset = CIRC;
    void this.adWatchArc.offsetWidth;
    this.adWatchArc.style.transition = 'stroke-dashoffset 1s linear';
    this.adWatchArc.style.strokeDashoffset = CIRC * (1 - 1 / seconds);
    clearInterval(this._adT);
    this._adT = setInterval(() => {
      left--;
      if (left <= 0) {
        clearInterval(this._adT);
        this.screens.adwatch.classList.add('hidden');
        onDone();
        return;
      }
      this.adWatchNum.textContent = left;
      this.adWatchArc.style.strokeDashoffset = CIRC * (1 - (seconds - left) / seconds);
    }, 1000);
  }

  /* ═══════════ GÖREV SONU ═══════════ */

  showMissionEnd(won, s) {
    { const na = this.game._achNew; this.game._achNew = null; if (na && na.length) { clearTimeout(this._achT); this._achT = setTimeout(() => this._achToast(na, 0), 2300); } }   // v61 M4
    this._veil();
    this.hideAllScreens();
    this.hud.classList.add('hidden');
    this.bossBar.classList.add('hidden');
    this.bannerEl.classList.add('hidden');
    this._mapKey = '';                       // ilerleme değişti → diyorama tazele

    const g = this.game;
    const wd = g.worldDef();

    this.meCard.classList.toggle('lost', !won);
    if (won) {
      this.meEyebrow.textContent = 'DÜNYA ' + g.worldId + ' · GÖREV ' + g.missionId + (s.firstClear ? ' · İLK GEÇİŞ' : ' · TEKRAR');
      this.meEyebrow.className = 'eyebrow gold';
      this.meTitle.textContent = s.bossDrop ? 'BOSS DÜŞTÜ' : 'GÖREV TAMAMLANDI';
    } else {
      this.meEyebrow.textContent = 'DÜNYA ' + g.worldId + ' · GÖREV ' + g.missionId;
      this.meEyebrow.className = 'eyebrow blood';
      this.meTitle.textContent = 'DÜŞTÜN';
    }

    /* üst şerit: istenen iki sayı büyük — SÜRE ve KIYIM. Dalga künyesi
       altta küçük satır: sayı yığını yerine okunur bir hiyerarşi. */
    this.meStats.innerHTML =
      '<div class="me-stat"><span class="ms-v">' + fmtTime(s.time) + '</span><span class="ms-l">SÜRE</span></div>' +
      '<i class="me-stat-sep"></i>' +
      '<div class="me-stat"><span class="ms-v">' + s.kills + '</span><span class="ms-l">KIYIM</span></div>';
    this.meWave.textContent = 'DALGA ' + s.wave + ' / ' + g.msn.waves + ' · SEVİYE ' + s.level;
    this._meSeal = s.seal || null;
    this._meTower = s.tower || null;
    this._meNm = s.nm || null;
    this._renderLedger(s.ledger, won);

    /* ganimet sahnesi: sandık, huzmeleri ve kaidesiyle ekranın merkezi */
    if (s.chest) {
      const C = CHESTS[s.chest];
      this.meLoot.className = 'me-loot';
      this.meLoot.style.setProperty('--cc', C.color);
      this.meLoot.style.setProperty('--cg', C.glow);
      this.meLoot.innerHTML =
        '<span class="me-loot-l">GANİMET</span>' +
        '<div class="me-chest-stage">' +
          '<span class="me-rays"></span><span class="me-aura"></span>' +
          '<div class="me-chest-art">' + chestSVG(s.chest) + '</div>' +
          '<span class="me-pedestal"></span>' +
        '</div>' +
        '<b class="me-chest-name">' + C.name + '</b>' +
        '<span class="me-chest-note">' +
          (s.bossDrop ? 'BOSS GANİMETİ · ANA EKRANDA BEKLİYOR' : 'ANA EKRANDA SENİ BEKLİYOR') +
        '</span>';
    } else if (s.chestFull) {
      this.meLoot.className = 'me-loot empty';
      this.meLoot.innerHTML =
        '<span class="me-warn">SANDIK YUVALARIN DOLU</span>' +
        '<span class="me-chest-note">ganimet yandı — ana ekranda yer aç</span>';
    } else {
      this.meLoot.className = 'me-loot empty';
      this.meLoot.innerHTML = won ? '' :
        '<span class="me-chest-note">GANİMET YOK — TIRPAN BOŞ DÖNDÜ</span>';
    }

    this.meRewards.innerHTML =
      '<div class="me-ruby"><span class="ruby"></span><b>+' + s.rubies + '</b><span class="me-ruby-l">ALTIN</span></div>';

    /* butonlar: ana menü birincil (tören burada biter), diğerleri ikincil */
    const nm = nextMission(g.progress);
    const showNext = won && (!!s.tower || !!s.nm || !(nm.w === g.worldId && nm.m === g.missionId));
    this.btnMeNext.classList.toggle('hidden', !showNext);
    if (showNext) {
      this.btnMeNext.textContent = s.tower ? 'KAT ' + s.tower.next + ' →' : s.nm ? 'SONRAKİ KABUS →'
        : (nm.w !== g.worldId) ? 'DÜNYA ' + nm.w + '\'E GEÇ' : 'SONRAKİ GÖREV';
    }
    this.btnMeRetry.textContent = won ? 'TEKRAR OYNA' : 'YENİDEN DENE';
    this.btnMeRetry.classList.toggle('hidden', won);
    this.btnMeRevive.classList.toggle('hidden', won || !s.canRevive);

    /* v56 C1 · EN YAKIN HEDEF + günlük hedef / rekor haberi — düğmelerin hemen üstünde tek satır */
    let gl = this._meGoal;
    if (!gl) { gl = document.createElement('div'); gl.className = 'me-goal'; const act = this.screens.missionend.querySelector('.me-actions'); act.parentElement.insertBefore(gl, act); this._meGoal = gl; }
    const J = g._journey || {}, G = nextGoal(g), news = [];
    if (J.daily && J.daily.fresh.length) news.push('GÜNLÜK ✓ ' + J.daily.fresh[0].toUpperCase() + (J.daily.chest ? ' · TAHTA SANDIK KAZANDIN' : ''));
    if (J.ghostRec) news.push('HAYALETİNİ GEÇTİN · YENİ EĞRİ KAYDEDİLDİ');
    gl.innerHTML = (news.length ? '<span class="mg-news">' + news.join(' · ') + '</span>' : '') + (G ? '<span class="mg-next"><i></i>SIRADAKİ · <b>' + G.txt + '</b></span>' : '');
    gl.classList.toggle('hidden', !G && !news.length);
    this.screens.missionend.classList.remove('hidden');
    this.screens.missionend.style.setProperty('--wc', wd.color);
    this._meSequence(s.rubies);
  }

  /** v54 E2: SONUÇ TEK HİKÂYE — sonuç → ganimet → altın sayacı → yıldız → ustalık →
      düğmeler, adım başı ~0,4 sn. Ekrana dokunmak hepsini anında oturtur.
      Görünürlük animasyona bağlı DEĞİL: 2,8 sn saat .seq-done ile animasyonu kaldırır. */
  _meSequence(rubies) {
    const scr = this.screens.missionend;
    const steps = [
      [this.meStats, 0], [this.meWave, 0.12], [this.meLoot, 0.4], [this.meRewards, 0.8],
      [this._meLedger && this._meLedger.querySelector('.mel-row1'), 1.15],
      [this._meLedger && this._meLedger.querySelector('.mel-chips'), 1.4],
      [this._meLedger && this._meLedger.querySelector('.mel-mas'), 1.6],
      [this._meGoal, 1.8],
      [scr.querySelector('.me-actions') || (this.btnMeRetry && this.btnMeRetry.parentElement), 1.95],
    ];
    for (const [el, d] of steps) if (el) { el.classList.add('sq'); el.style.setProperty('--sq', d + 's'); }
    const bar = this._meLedger && this._meLedger.querySelector('.mel-mas .hm-bar i');
    if (bar) bar.style.transitionDelay = '1.75s';
    scr.classList.remove('seq-done');
    scr.classList.remove('seq'); void scr.offsetWidth; scr.classList.add('seq');
    const num = this.meRewards && this.meRewards.querySelector('b');
    const g = this.game;
    let done = false, raf = 0;
    const finish = () => {
      if (done) return; done = true;
      cancelAnimationFrame(raf); clearTimeout(this._meSeqT); clearTimeout(this._meSeqC);
      scr.classList.add('seq-done');
      if (bar) bar.style.transitionDelay = '0s';
      if (num) num.textContent = '+' + rubies;
      scr.removeEventListener('pointerdown', finish, true);
    };
    if (num && rubies > 0) {
      num.textContent = '+0';
      this._meSeqC = setTimeout(() => {
        const t0 = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0) / 520);
          num.textContent = '+' + Math.round(rubies * (1 - Math.pow(1 - k, 3)));
          if (k < 1 && !done) raf = requestAnimationFrame(step);
          else if (g.audio) g.audio.play('tally');
        };
        raf = requestAnimationFrame(step);
      }, 820);
    }
    this._meSeqT = setTimeout(finish, 2800);
    scr.addEventListener('pointerdown', finish, true);
  }

  /* ═══════════ HUD ═══════════ */

  /** v53 D6 · D3 · D4: sonuç ekranı defter şeridi — yıldız damgası,
      rekor mührü, ustalık çubuğu. Yeni kazanılan yıldız sırayla vurulur. */
  _renderLedger(L, won) {
    let box = this._meLedger;
    if (!box) {
      box = document.createElement('div');
      box.className = 'me-ledger';
      this.meWave.insertAdjacentElement('afterend', box);
      this._meLedger = box;
    }
    if (!L) { box.innerHTML = ''; return; }
    const g = this.game;
    const totalMax = WORLDS.length * MISSIONS_PER_WORLD * 3;
    let stars = '';
    STAR_RULES.forEach((r, i) => {
      const on = (L.mask >> i) & 1, nw = (L.newMask >> i) & 1;
      stars += '<span class="mel-star' + (on ? ' on' : '') + (nw ? ' new' : '') + '" style="--i:' + i + '">' +
        '<span class="mel-sv">' + STAR_SVG + '</span><span class="mel-sl">' + r.label + '</span></span>';
    });
    const totalChip = '<span class="mel-chip">' + STAR_SVG + L.total + ' / ' + totalMax + '</span>';
    let chips = '';
    if (L.starGem) chips += '<span class="mel-chip gem"><span class="stone"></span>+' + L.starGem + '</span>';
    const SE = this._meSeal, TW = this._meTower;
    if (TW) {
      chips += '<span class="mel-rec tower">KAT ' + TW.k + (TW.won ? ' GEÇİLDİ' : ' · KAT ' + TW.next + '\'DEN DEVAM') + '</span>';
      if (TW.gem) chips += '<span class="mel-chip gem"><span class="stone"></span>+' + TW.gem + '</span>';
    } else if (this._meNm) {
      const N = this._meNm;
      chips += '<span class="mel-rec nm">KABUS D' + N.w + '-' + N.m + (N.won ? (N.first ? ' · İLK ZAFER' : ' · GEÇİLDİ') : '') + '</span>';
      if (N.gem) chips += '<span class="mel-chip gem"><span class="stone"></span>+' + N.gem + '</span>';
      if (N.frame) chips += '<span class="mel-chip nmf">KABUS ÇERÇEVESİ AÇILDI</span>';
    } else if (SE) {
      chips += '<span class="mel-rec seal">MÜHÜR ' + SE.score + (SE.isBest ? ' · EN İYİ' : '') + '</span>';
      for (const T of SE.fresh) chips += '<span class="mel-chip" style="color:' + T.col + '">' + T.name + '</span>';
    } else if (L.rec.isNew) chips += '<span class="mel-rec">YENİ REKOR · ' + L.rec.kills + ' KIYIM</span>';
    else if (L.rec.best > 0) chips += '<span class="mel-chip dim">EN İYİ ' + L.rec.best + '</span>';
    const M = L.mas, c = CHARACTERS[M.id];
    const up = M.ups.length > 0;
    const a = up ? 0 : M.before.frac, b = M.after.frac;
    let upLine = '';
    if (up) {
      const last = M.ups[M.ups.length - 1];
      upLine = '<span class="mm-up">USTALIK SV ' + last.lv + ' · +' + M.gold + ' ALTIN' + (M.gem ? ' · +' + M.gem + ' GEM' : '') + '</span>';
    }
    box.innerHTML =
      '<div class="mel-row1"><div class="mel-stars">' + stars + '</div>' + totalChip + '</div>' +
      '<div class="mel-chips">' + chips + '</div>' +
      '<div class="mel-mas' + (up ? ' up' : '') + '">' +
        '<span class="hm-medal"><b>' + M.after.lv + '</b></span>' +
        '<span class="hm-body"><span class="hm-k">' + (c ? c.name : '') + ' · USTALIK</span>' +
        '<span class="hm-bar"><i style="width:' + Math.round(a * 100) + '%"></i></span>' +
        (upLine || '<span class="hm-note">+' + M.gain + ' PUAN</span>') + '</span>' +
      '</div>';
    const bar = box.querySelector('.mel-mas .hm-bar i');
    requestAnimationFrame(() => requestAnimationFrame(() => { if (bar) bar.style.width = Math.round(b * 100) + '%'; }));
    if (L.newMask) setTimeout(() => g.audio && g.audio.play('star'), 1350);   // v54 E2: yıldız adımıyla
    if (L.starGem || M.gold || M.gem) this.refreshWallet();
  }

  updateHUD() {
    const g = this.game, p = g.player;

    const xpPct = Math.min(100, Math.floor((p.xp / p.xpNext) * 100));
    if (xpPct !== this.cXp) { this.cXp = xpPct; this.xpFill.style.transform = 'scaleX(' + (xpPct / 100) + ')'; }   // v73: width → scaleX

    if (p.level !== this.cLevel) { this.cLevel = p.level; this.hudLevel.textContent = p.level; }

    const waveStr = g.worldId + '-' + g.missionId + ' · DALGA ' + g.wave + '/' + g.msn.waves;
    if (waveStr !== this.cWave) { this.cWave = waveStr; this.hudWave.textContent = waveStr; }
    /* v56 D2 · HAYALET: aynı andaki rekor kıyıma göre fark (yalnız değişince yazılır) */
    const gd = Ghost.delta(g);
    if (gd !== this._gd) {
      this._gd = gd;
      let ge = this._ghostEl;
      if (!ge) { ge = document.createElement('span'); ge.className = 'hud-ghost'; this.hudWave.insertAdjacentElement('afterend', ge); this._ghostEl = ge; }
      ge.classList.toggle('hidden', gd == null);
      if (gd != null) { ge.textContent = (gd >= 0 ? '+' + gd : String(gd)) + ' REKOR'; ge.classList.toggle('ahead', gd >= 0); }
    }

    /* v61 süper halkası: yalnız değişince yazılır */
    if (this._ultBtn && g.ult) {
      const U = g.ult, pc = Math.round(U.charge / 80 * 100);
      if (pc !== this._ultPc) { this._ultPc = pc; this._ultBtn.style.setProperty('--p', pc); }
      const st = U.ready ? 2 : 1;
      if (st !== this._ultSt || U.rar !== this._ultRar) {
        this._ultSt = st; this._ultRar = U.rar;
        this._ultBtn.className = 'ult r' + U.rar + (U.ready ? ' ready' : '');
        this._ultBtn.style.setProperty('--uc', U.id.col);
      }
    }
    let tShow;
    /* v59 KATLİAM rozeti: ≥5 zincirde görünür; sayı değişince "vuruş" (iki ad arası geçiş = reflow yok) */
    {
      const n = g._cbN | 0, age = g.time - (g._cbT || -9);
      const live = n >= 5 && age < 1.4;
      let cb = this._cbEl;
      if (!cb && live) {
        cb = document.createElement('div'); cb.className = 'hcb'; cb.setAttribute('aria-hidden', 'true');
        cb.innerHTML = '<small></small><b></b><i><em></em></i>';
        this.hud.appendChild(cb); this._cbEl = cb;
        this._cbB = cb.querySelector('b'); this._cbS = cb.querySelector('small'); this._cbI = cb.querySelector('em');
      }
      if (cb) {
        if (live !== this._cbLive) { this._cbLive = live; cb.classList.toggle('on', live); }
        if (live) {
          if (n !== this._cbShown) {
            this._cbShown = n; this._cbB.textContent = '×' + n;
            this._cbFlip = !this._cbFlip; this._cbB.className = this._cbFlip ? 'ka' : 'kb';
          }
          const tier = g._cbTier | 0;
          if (tier !== this._cbTierShown) {
            this._cbTierShown = tier;
            this._cbS.textContent = ['ZİNCİR', 'KIYIM', 'KATLİAM', 'KIZIL HASAT'][tier];
            cb.className = 'hcb on t' + tier;
          }
          this._cbI.style.transform = 'scaleX(' + Math.max(0, 1 - age / 1.4).toFixed(3) + ')';
        } else if (this._cbShown) { this._cbShown = 0; this._cbTierShown = -1; }
      }
    }
    if (g.isBossWave(g.wave)) tShow = -1;
    else tShow = Math.ceil(g.waveTimer);
    if (tShow !== this.cTimer) {
      this.cTimer = tShow;
      this.hudTimer.textContent = tShow < 0 ? 'BOSS' : fmtTime(tShow);
      this.hudTimer.classList.toggle('danger', tShow >= 0 && tShow <= 5);
    }

    const money = Math.floor(p.money);
    if (money !== this.cMoney) { this.cMoney = money; this.hudMoney.textContent = money; }

    const boss = g.enemies.boss;
    if (boss) {
      const pct = Math.max(0, Math.round((boss.hp / boss.maxHp) * 200));
      if (pct !== this.cBoss) { this.cBoss = pct; this.bossFill.style.transform = 'scaleX(' + (pct / 200) + ')'; }   // v73: width → scaleX
    }

    /* Görev nesnesi: mini harita ve güç rozetleri onu okur. (Görev
       ŞERİDİ 2026-08-24'te kaldırıldı; bu tanım o blokla birlikte silinip
       aşağıdaki mini harita bölümünü kırdı — ReferenceError: O.) */
    const O = g.objectives;

    /* ── ETKİN GÜÇ ROZETLERİ ──
       Yalnız SÜRELİ güçler rozet açar: mıknatıs anında biter, rozeti
       yanıp söner ve hiçbir şey anlatmaz. Anahtar dizgisi tam sayı
       saniyeden üretilir, yani innerHTML saniyede bir kez yazılır. */
    const PW = g.powerups;
    if (PW) {
      const sh = Math.ceil(PW.shieldT), fr = Math.ceil(PW.freezeT), mg = Math.ceil(PW.magnetT);
      const key = sh + '|' + fr + '|' + mg;
      if (key !== this._puKey) {
        this._puKey = key;
        let h = '';
        if (sh > 0) h += '<span class="pu-badge' + (sh <= 2 ? ' ending' : '') + '" style="--pc:#ffd45a"><b>O</b>KALKAN ' + sh + '</span>';
        if (fr > 0) h += '<span class="pu-badge' + (fr <= 1 ? ' ending' : '') + '" style="--pc:#a8e8ff"><b>*</b>DONUK ' + fr + '</span>';
        /* MIKNATIS ROZETİ TEK SATIR. Önceki sürümde aynı `if (mg > 0)`
           bloğu İKİ KEZ yazılıydı (biri bozuk kodlamayla "UCEKIM"), yani
           mıknatıs alındığında HUD'da iki rozet birden çıkıyordu. */
        if (mg > 0) h += '<span class="pu-badge' + (mg <= 2 ? ' ending' : '') + '" style="--pc:#5ad2ff"><b>U</b>ÇEKİM ' + mg + '</span>';
        this.puRow.innerHTML = h;
      }
    }

    /* v49: MİNİ HARİTA KALDIRILDI (kullanıcı). Yönlendirme artık oyuncunun
       YANINDA duran görev okudur (main.renderObjectiveArrow). */
  }

  /** v53 C1: boss anları — ekranı KAPATMAYAN (pointer-events yok) ad plakası +
      renk perdesi. Görünürlük sınıfa bağlı, animasyon yalnız giriş vurgusu. */
  bossMoment(kind, name) {
    let el = this._bossMomentEl;
    if (!el) {
      el = document.createElement('div');
      el.className = 'boss-moment';
      el.innerHTML = '<i class="bm-veil"></i><div class="bm-plate"><span class="bm-k"></span><b class="bm-n"></b><span class="bm-l"></span></div>';
      (this.hud && this.hud.parentElement ? this.hud.parentElement : document.body).appendChild(el);
      this._bossMomentEl = el;
    }
    const M = {
      intro:  { k: 'BOSS UYANIYOR', l: 'ÖFKE %60 · SON ÇIRPINIŞ %30 · ARALARDA ZAYIF AN', ms: 2600 },
      phase1: { k: 'FAZ II', l: 'ZAYIF AN — HASAR ×1,5', ms: 1700 },
      phase2: { k: 'SON FAZ', l: 'ZAYIF AN — HASAR ×1,5', ms: 1700 },
      down:   { k: 'DEVRİLDİ', l: '', ms: 1500 },
      fall:   { k: 'YENİLGİ', l: '', ms: 1000 },            // v54 G1
      rise:   { k: 'RUH GERİ DÖNDÜ', l: '2,5 SN DOKUNULMAZ', ms: 1600 },
    }[kind];
    if (!M) return;
    el.className = 'boss-moment on ' + kind;
    document.documentElement.classList.add('bm-on');          // A3: duyuru bölgesi tek sahipli
    el.querySelector('.bm-k').textContent = M.k;
    el.querySelector('.bm-n').textContent = kind === 'phase1' ? 'ÖFKELENDİ' : kind === 'phase2' ? 'SON ÇIRPINIŞ' : (name || '');
    el.querySelector('.bm-l').textContent = M.l;
    clearTimeout(this._bmT);
    this._bmT = setTimeout(() => { el.className = 'boss-moment ' + kind; document.documentElement.classList.remove('bm-on'); }, M.ms);
  }

  showBossBar(name) {
    this.bossName.textContent = name;
    this.bossBar.classList.remove('hidden');
    this.cBoss = -1;
  }

  hideBossBar() { this.bossBar.classList.add('hidden'); }

  hurtFlash() {
    this.vignette.classList.add('flash');
    clearTimeout(this._vt);
    this._vt = setTimeout(() => this.vignette.classList.remove('flash'), 130);
  }
}

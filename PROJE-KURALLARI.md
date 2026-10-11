# Kızıl Hasat / Ultra Blade — Proje Kuralları

## DÖRT AJAN — ÇALIŞMA DÜZENİ (2026-09-05, kullanıcı kararı)

Her iş bu dört rolden GEÇER. Roller ayrı sohbet değil, tek turun içinde
sırayla giyilen şapkalardır — token tasarrufu için her rol EN FAZLA birkaç
satır konuşur, gerekçesini koda/CLAUDE.md'ye yazar.

| ajan | işi | çıktısı |
|---|---|---|
| **YAZILIMCI** | mimari, veri akışı, perf sözleşmesi (perf.js 5 kural), ölü kod | çalışan kod + tek kaynak |
| **TASARIMCI** | siluet, palet (gece siyahı·kor·gümüş), tipografi, kadraj, animasyon eğrisi | ekranda okunan şey |
| **TESTER** | ölçer: konsol · kutu ölçüsü · taşma · dar kabuk (281 px) · uzun metin | ÖLÇÜLMÜŞ tablo, geçti/kaldı |
| **KALİTE (A++)** | premiumluk · mobil uygunluk · optimizasyon; A++ değilse REVİZE ister | onay ya da ret gerekçesi |

Bağlayıcı kurallar:
1. **TESTER ÖLÇMEDEN KALİTE ONAY VERMEZ.** "Yazdım" ≠ "uygulandı" (bu
   dosyanın en pahalı dersi: v15'in dört büyütmesi ölü koddu).
2. **KALİTE RET VERİRSE İŞ BİTMEMİŞTİR.** Ret gerekçesi ölçülebilir olmak
   zorunda ("281 px'te 32 px taşma"), "hoş durmuyor" değil — ama 1:1
   ölçekte BAKMAK da zorunludur (bant içinde kalıp yanlış olabilir).
3. **TASARIMCI PALETİ İCAT ETMEZ**, config/style token'larından okur.
4. **YAZILIMCI SICAK DÖNGÜDE TAHSİS ETMEZ** ve yeni her efekt/varlık
   `Quality.budget()` üzerinden geçer.
5. Her tur sonunda ölçülen sayılar bu dosyaya yazılır; **eski sayı
   bırakılmaz** (ölçüm bloğu her turda yeniden ölçülerek yazılır).

## PERFORMANS SÖZLEŞMESİ (zorunlu)

### v76 — GÖREVLER 2.0 · ALT DOK 2.0 · PAZARDA İNCELEME (2026-09-30)
- **GÖREVLER (`.qx-*`, eski `.q-scene/.q-*` katmanlarından bağımsız):** afiş (hafta puanı · yenilenme · scaleX kuşak + 3 kademe, hazır kademe `<button>`) → günlük giriş 4 sütun (7. gün 2 sütun BÜYÜK ÖDÜL) → GÖREV DEFTERİ (tür simgesi, alınacak üstte / alınan dipte, AL düğmesinde ödül). id'ler aynı (q-close, q-claim-daily, q-pts…). Sonsuz animasyon yalnız AL/ÖDÜLÜ AL parıltısı (transform); satırlar `contain: layout paint`; giriş koreografisi yalnız `.q-enter`.
- **ALT DOK (`nav.dock` · `.dk-tab` · `.dk-battle` · `.dk-medal`):** gece siyahı levha + gümüş/kor kıl çizgi, ortada beşikli kor SAVAŞ sikkesi (pasifken gümüş-kömür), tek kayan gösterge `.dk-ind` (transform; savaşta `on-battle` gizler), SAVAŞ etiketi eklendi. Sonsuz animasyon YOK. JS/ftue seçicileri `.dock .dk-tab`. Eski `.bottom-nav/.nav-tab` CSS'i artık ölü (silinmedi — E2 bölmesinde temizlenebilir).
- **PAZAR:** kahraman/eşya kartında görsel/gövde dokunuşu SATIN ALMAZ → `openCharDetail` / `openGearDetail`; alım yalnız fiyat düğmesinden (`[data-c]`). Alınmış kart da incelenebilir.
- **SÜRÜM:** tüm modüller + style.css `?v=20260930m`. Android eşlendi.
- **v76b (verifier 279 px):** kademe hapı "20 P KALDI" 77/67 px, 7. gün "BÜYÜLÜ SANDIK" 97/69 px kesikti → ≤340 hap dolgusu 5 + 0,02em, fin kartı dikey + ad 2 satır. `style.css ?v=20260930n`. Dok 5 etiket, görev satırı, pazar incelemesi ÖLÇÜLDÜ: geçti.
- **AÇIK (ÖLÇÜLMEDİ):** 281 px'te dok etiketleri ("KAHRAMAN") ve görev satırı · EN çevirisi (GÖREV DEFTERİ, BÜYÜK ÖDÜL, P KALDI) — verifier'da.

### v75 — MOBİL SON KONTROL · KASMA AVI (2026-09-30)
- **ÖLÇÜLDÜ (önizleme, 6 menü sayfası):** `document.getAnimations()` taraması → görünür SONSUZ animasyonlarda transform/opacity DIŞI özellik **0** (v73 işi tutuyor).
- **Dünya seçimi:** 10 kart sanatı tek karede boyanıyordu → oynanan dünya hemen, kalanlar kare başına 1 (iptal jetonlu `_wselTok`). Sayfa çizimi ölçüldü **52 ms**. ≥400 px önizleme DPR 2 → 1,5; skyMap önbelleği 8 → 12 (10 kart LRU'da her açılışta yeniden boyanıyordu).
- **Sonsuz döngü sigortası:** `paintBiomeBack/Front` W/H < 2'de döner, `getClimbArt` ölçüyü ≥2'ye kıstırır (hills() adımı W/90 → 0 boyutta kilit).
- **saveMeta(force):** 'playing' sırasında yalnız kirli işaret, loop durum değişince BİR kez yazar; arka plana geçiş `saveMeta(true)`.
- **hurtDir:** her hasarda `clientWidth` (sim ortasında zorunlu layout) → pencere boyutuna göre önbellek; önceki WAAPI iptal.
- **Büyü küresi halesi:** mermi başına kare başı radyal gradyan → tek 64 px sprite (`orbHalo`).
- **Menü:** resize → harita 160 ms debounce; `visibilitychange` menü gizliyken önizleme BOYAMAZ (savaşa dönüşte kasma).
- **SÜRÜM:** tüm modüller + style.css `?v=20260930l`. Android eşlendi.
- **AÇIK (yalnız cihazda):** gerçek fps/p99 (`Ayarlar → Performans Raporu`) · seviye kartı box-shadow nefesleri (sim donukken) · music.js bar başı ~30 düğüm.

### v74 — ÜÇ HARİTA GÖRSELİ · YUMUŞAK ALT MENÜ · PARA UÇUŞU 2.0 (2026-09-30)
- **Dünya 6 GÖKÇE ADA → RÜZGÂR BAHÇESİ** (renk `#ff9ec4`): mor kristal + zincir dili kalktı → badem ağacı · servi · rüzgâr değirmeni · teraslar · bakır kubbe · çağlayan (`hang:'falls'`); gök = şafak + ışınlı güneş + çağlayanlı uzak adacıklar + pembe bulut denizi, önde yaprak.
- **Dünya 10 GÖK ÇARKI → YILDIZ DÖKÜMHANESİ** (renk `#7aa6ff`): pota · döküm akışı · yıldız kalıbı · bazalt sütun + pirinç vinç · kovan fırını · boss BÜYÜK DÖKÜMHANE (`hang:'basalt'`, halka yok); gök = pirinç zincirle asılı yıldızlar + ufukta baca silueti.
- **Tuz Tabanı yalnız boss adası (bölüm 10):** zigurat → karaya oturmuş kadirga (tuz kabuğu, halit küpleri, kıç feneri, ışık çatlakları).
- `id/floor` AYNI (kayıt/arena etkilenmez); ad worlds + arenaMaps'te (short BAHÇE / DÖKÜM).
- **Alt menü:** yaylı aşma kalktı — `.nav-ind` 560 ms `(.32,.72,0,1)`, sayfa 460 ms ±6 % + solma (gizleme 380→480 ms), simge `v74Rise`, dokunuş yumuşak halka.
- **flyCurrency 2.0:** 12 parça, saçılma 0,44 sn → asılı 0,1-0,2 → kendi yayında dönerek 0,86-1,1 sn süzülüş; kaynak parlaması + her varışta cüzdan halkası. Tek rAF.
- **SÜRÜM:** tüm modüller + style.css `?v=20260930k` (tek ek). Android kopyası eşlendi.
- **AÇIK (ÖLÇÜLMEDİ):** 281 px önizleme kartında yeni adaların okunurluğu · cihazda para uçuşu akıcılığı.

### v73d — YEREL KAYDIRMA · MENÜ NABIZLARI (2026-09-30)
- **YEREL KAYDIRMA (en büyük menü kazancı):** `.menu-page` `touch-action: none` + JS `scrollTop` (her pointermove, JS atalet) → `pan-y` + `overscroll-behavior: contain`; dokunmada dikey karar verilince JS bırakır (tarayıcı birleştiricide kaydırır). Yatay sayfa kaydırma JS'te aynen; fare eski yol.
- **Ay (`.moon`, 260 px, 200 px bulanık gölge):** box-shadow animasyonu → durağan gölge + opaklık/ölçek (`moonPulseT`).
- `.mnode.next` · `.bp-card.claimable` → `::after` parıltı opaklığı (`glowOp`; bp kartı overflow:hidden → iç parıltı) · `.bp-node.now` · `.aj-pip` → ölçek · `bpShine` left → transform.
- music.js incelendi: ileri bakışlı zamanlayıcı (140 ms setTimeout, bar ≤34 nota) — kare döngüsünde değil, dokunulmadı.
- **SÜRÜM:** `main · ui ?v=20260930h` · `style.css ?v=20260930h`.
- **v73e (verifier: perf.js 3 örnek yükleniyordu):** v73b betiği yalnız içe alım satırlarını yükseltti, içe alanların kendi eki eski kaldı → önbellekten eski kopya, eski perf URL'si = ayrı `Quality`. Artık **TÜM modüller + style.css tek ek `?v=20260930i`** (39 dosya, tek sürüm denetlendi). APK `LOAD_NO_CACHE`. KURAL: bundan sonra sürüm yükseltmesi HEP tüm dosyalarda tek ekle.
- **AÇIK:** kısa tören efektleri (cr-card hue/sheen, lv-card kahraman nefesleri, hu-foil, .cd-hero-img drop-shadow) · cihazda ölçüm.

### v73b — MOTOR SINIFI OPTİMİZASYON (2026-09-30)
- **SES BANKASI (audio.js):** `play` = kapı + `_bankPlay` → yoksa `_synth` (eski switch, aynen) + `_bakeLater`. Her ses/varyant OfflineAudioContext'te aynı sentez + aynı yankıyla (`this._ir`) BİR KEZ mono tampona pişer, sonra tek AudioBufferSourceNode → `this.dry` (DC + limiter + ses düzeyi canlı). Pişirme yalnız `audio._calm` (main.render: state ≠ playing) iken, tek tek. `_prebake` açılışta tüm savaş seslerinin k=0'ını kuyruğa alır. UI_SND + 'gem' pişmez; ulthit/ultfire/combo durum anahtarlı. Tavan 4 M örnek (deviceMemory ≤3 → 1,5 M). 2,4 sn'ye sığmayan → `_noBake`. Sık seslerde ±%1,2 perde.
- **ÇÖZÜNÜRLÜK ADIMI (perf.js):** iki aşağı adım arası ≥3 sn, yukarı ≥8 sn, 0,1'e kuantize (her adım tuvali yeniden ayırıyordu). **render3d.resize** aynı boyut+DPR'da erken döner (stres adımı iki kez setSize çağırıyordu).
- **2B üst katman DPR:** low 1,5 · mid 1,75 · high 2 (mid'de 3B 1,35'ken 2B 2,0'dı).
- **FİLTRE PİŞİRME:** hareketli + filtreli öğe = birleştiricide kare başı bulanıklık. Kalktı: menü göğü huzmeleri blur(3px, ~tam ekran) · #chest-rays blur (160vmax dönen; İKİ kural vardı, ikincisi blur(7px) ile eziyordu — v73c'de o da kalktı, `style.css ?v=20260930g`) · motes · evp-embers · ci-aura. Sandık SVG'leri (mağaza vc/dl/fb + ana sayfa yuvası) `.csw` sarmalayıcıda zıplar, drop-shadow durağan SVG'de (`freezeChestSVG(root, true)`).
- **APK:** `setOffscreenPreRaster(true)`. Mağaza görselleri `Shadowrend-Android/store/` (APK dışı).
- **SİLİNDİ:** ölü modüller `homeDiorama.js` · `worldDecor.js` (içe alım grafiğinden ulaşılmıyor, 67/70 modül canlı) · kök `tmp/` · Android kopyasından md/sw.js/mobil.html.
- **SÜRÜM:** `main · ui · render3d · audio · perf ?v=20260930f` (perf 14 içe alanın hepsinde tek sürüm) · `style.css ?v=20260930f`.
- **AÇIK (ÖLÇÜLMEDİ):** cihazda fps/ses · bankanın gerçek bellek kullanımı · seviye kartı kahraman madalyon filtreleri + blend katmanları (kısa ekran, dokunulmadı) · music.js prosedürel (her notada düğüm) — pişirilmedi.

### v73 — MOBİL OPTİMİZASYON · KİLİTLER KALKTI (2026-09-30)
- **Kilit yok:** `ftue.TAB_REQ` hepsi 0.
- **① SAHNE KAPISI (main.render):** `state==='menu'` → 3B+2B HİÇ çizilmez, `html.sr-menu` tuvalleri gizler (menü opak; kapı açılmadan beginWave 'playing' yazar). Kaplama durumları (paused/levelup/gameover/victory) 30 kare sonra DONAR (sarsıntı/zoom bitince); `render3d.resize` → `_needsFrame` bir tur daha çizdirir.
- **② backdrop-filter SIFIR** (.screen.overlay %84→%90 · dok ×2 · journey-head · chest-inspect · alu).
- **③ SMIL:** liste bağlamında sandık SVG'leri `freezeChestSVG` (t=1 sn, pauseAnimations): yuva · duo · vitrin · alu · yolculuk · bilet · etkinlik. Mağazada 9 sandık × çift drop-shadow her karede yeniden boyanıyordu. Odak ekranları canlı.
- **④ Boyayan sonsuz animasyonlar:** navActiveGlow KALDIRILDI (v59 `box-shadow:none` yazılmıştı, animasyon eziyordu) · chestReady kalktı · `left` süpürmeleri transform (bb/duo/lv/vc/xp-glint) · buyGlow filter→scale · pazar folyosu sözde öğe + translateX, blend yok · bannerIn/bmIn letter-spacing yok · #xp-fill/#boss-fill width→scaleX. banner() zorla reflow yok.
- **⑤ Kalkan:** mobilde halka 10→5 (+ pankart artık bileşik). **weapons.js createRadialGradient ÖLÜ KOD** (renderZones/render hiç çağrılmıyor) — teşhisteki ⑤ yanlıştı. Telefon varsayılanı zaten 'mid' (DPR 1,35, MSAA yok) → DPR'a dokunulmadı.
- **⑥ APK:** MainActivity panel 60 Hz kipine (90 Hz'de 90 fps hedefi ısınıp zıplıyordu) + `RENDERER_PRIORITY_IMPORTANT`.
- **SÜRÜM:** `main · ui · render3d · objectives · ftue ?v=20260930e` · `style.css ?v=20260930e`. Kopya `Shadowrend-Android/game/`.
- **AÇIK (ÖLÇÜLMEDİ):** cihazda fps · donmuş kaplamanın arkası (resize sonrası) · seviye kartı kahraman nefesleri (box-shadow, 5 kart) hâlâ boyuyor · sandık töreni kartları (crEpicPulse vb.) dokunulmadı.

### v72 — MAĞAZA SANDIKLARI BÜYÜDÜ (2026-09-30)
- Vitrin sanat kutusu 68-92 → 92-128 px (kart eninin %112'si), sandık 64-90 → 80-128 px (kral 84-134), kademe renginde çift gölge + kaide halkası, aura 96×68 → 132×104. Fırsat 74 → 96 px, ücretsiz/bonus 66 → 82 px; dar kabuk kuralları orantılı. `style.css ?v=20260930d`.
- **AÇIK:** 281 px'te vitrin kartı yüksekliği ve fiyat düğmesinin taşması — verifier'da.

### v71 — KALAN İŞLER: A2 · A4 · B2 · B4 · C1 · C3 · D2 (2026-09-30) — YOL HARİTASI v5 KAPANDI
- **A2** render3d ceset `p.fl` (ağır/kritik 64, diğer 28 birim, elit uçmaz), ilk 0,25 sn balistik kavis, aynı anda ≤12 (`_flyN`, `_releaseEnemyModels` sıfırlar).
- **A4** weapons.updateArrow: 45 ms'de bir havuzlu iz zerresi, parçacık tavanının ~%55'inde kesilir (mobil 250 / masaüstü 640), yalnız görüşte.
- **B2** `WEAPON_EVO` (imza dışı 8 silah; eş pasif = v70 B1 pasifleri + gazap): koşul silah elde + pasif ≥2 + Sv ≥9, koşu başı 1 (`wEvolved`, kahraman evriminden ayrı), ×1,18 · ×0,90 + kimlik. Keşif `evo_w_<silah>`.
- **D2** `ui.evoCinema` (`.evc-*`): eski ad çatlar, altın plaka iner, ışın + 2 halka + 10 kıvılcım; 1,6 sn, 0,65 sn sonra dokunuş atlatır; sim `_ldHold`; dönüşte `_returnPulse`. Ses `evocine` (UI_SND).
- **B4 SUNAK 2.0** worldEvents: bekleyiş sonrası `showBlessPick(list, cb, opt)` (kutsama kalıbı, sim donuk): KAN AHDİ (can −%25 → hasar +%12; `noHeal`/can ≤%35'te yok) · ŞİFA PINARI (can +%35 + mıknatıs; KAN KURUSU'nda hasar +%4) · MEYDAN (5 elit `duelTok`, 25 sn; devrilirse `fieldChests._reward`).
- **C3 ALTIN KAÇAK** (olay w3): ×5 can, hasarsız (`damagePlayer` artık raw ≤0'da döner), AV kaçışı, her %25 canda altın, ölünce ×3 altın, 20 sn'de "KAÇTI". `enemyManager.onDeath` → `events.onKill` (thief/duelTok, havuz reset'inde sıfır).
- **C1 KUŞATMA** missionTypes: yalnız D5/D10 boss dalgası (kule/mühür hariç), halka 1300→620 (5 sn), dışı 0,5 sn'de %4, boss halkaya kıstırılır.
- **SÜRÜM:** `render3d · worldEvents · missionTypes · i18n · combat · enemyManager · audio · weapons · ui · main ?v=20260930c` · `style.css ?v=20260930c`.
- **AÇIK (ÖLÇÜLMEDİ):** ceset kavisinin 1:1 görünümü (WebGL) · B2 denge _baltest · MEYDAN'ın 25 sn bandı · kuşatmada boss'un halka kenarına kıstırılınca takılması.

### v70 — OYNANIŞ HİSSİ: A1 · A6 · A7 · C4 · C5 · B1 · D4 DİZİLİMLER (2026-09-30)
- **Kullanıcı ÇIKARDI:** B3 · D5 · A3 · A8 · B5 · C2 · C6 · D3 (sonuç ekranı sade/premium, istatistik duvarı YOK) · İ5 (kahramanları kullanıcı ekler). C1 yalnız öneri: D5/D10 boss'unda kapanan alanda kuşatma.
- **A1:** yerel donma zaten vardı (FEEL). Artık süre geri tepmeden: knock ≥220 ×1,4 · ≤60 ×0,6; ağır/kritik vuruşta `e.stopMv` → donma boyunca hareket ×0,2 (hafif silah durdurmaz — denge).
- **A6:** `damagePlayer(game, raw, sx, sy)` (gövde/mermi/tehlike kaynak verir) → `ui.hurtDir` ekran kenarında `#hurt-dir .hdr-arc` (WAAPI 340 ms), tekme kaynaktan uzağa. Can ≤%30'da `heartbeat` sesi 1,05 sn.
- **A7** `main._levelRise` (banner anında sütun + `_returnPulse(null)` + `levelrise`). **C4** `_harvestSouls` (son dalga hariç waveTimer ≤0,9: tüm cevher pull; ≥4'te HASAT + `harvest`).
- **C5** `enemyManager.chainBlast` (patlayıcı ölüm + fitil): r = blastR×1,15, sıradan %40 / elit %15 maxHp, boss muaf, oyuncuya ek hasar yok, ≥3'te ZİNCİR ×N. Sesler: `chainboom · elitdown · shieldbreak`.
- **B1** weapons `EXTRA_PASSIVES` (8, PASSIVES'e eklenir, config'e dokunulmadı) + PAS_TAG + cardArt glifleri. Etiket kaynağı: KOR 4+KADİM · AYAZ 4 · RUH 3 · YILDIRIM 3 · ÇELİK 3. EN çevirisi YOK (i18n eksik listesi).
- **D4 DİZİLİMLER:** `meta.decks[cid] {a, l:[{n,g}×3]}`; canlı `charGear[cid]` = aktif dizilim (otomatik kayıt), `switchDeck` sahiplik+sınıf süzer, `renameDeck` 14 kr. UI `#kz-decks` Kuşanım başında.
- **ZATEN VARDI:** A5 ruh merdiveni · D1 saha sandığı madalyonu · düşük can vinyeti.
- **SÜRÜM:** `combat · enemyManager · main · ui · audio · weapons · cardArt ?v=20260930a` · `style.css ?v=20260930a`.
- **v70b (verifier 281 px):** dizilim çipinde ad sütunu 32 px (gereken 57), ✎ adın üstüne biniyordu, ad alanı 29 px; ad `toUpperCase` "DIZISI" yazıyordu →
  çip dikey (numara sağ üst rozet, ✎ sağ alt, ad tam en), varsayılan ad "DİZİ N", meta "4/6 · 120", `toLocaleUpperCase('tr-TR')` + `inp.lang='tr'`. `ui · style.css ?v=20260930b`.
- **AÇIK (ÖLÇÜLMEDİ):** hurtDir konumu · pasif dengesi _baltest'le · _levelRise invuln 0,6 sn her seviyede (küçük buff).

### v69 — YOL HARİTASI v5 (belge, kod değişmedi) (2026-09-30)
- `Yol Haritası v5.dc.html`: oynanış denetimi. Teşhis: global hitStop no-op (vuruş ağırlıksız) · 7 pasif, AYAZ kaynağı 2 (set ulaşılmaz) · 5 düşman ailesi, 2:30-4:00 "düzlük" · tek fiil (kaçınma yok).
- Sprint 1 (★): A1 hedef başına duraklama · A5 ruh merdiveni · A6 yönlü hasar · C4 hasat anı · D5 rekor anı · B3 kart sürgünü. Kararlar kullanıcıda: A8 atılma · A1 · C5 düşman patlaması düşmana · B4 sunak/KAN KURUSU.

### v68 — ETKİNLİK 2.0 · PAZAR EŞYA DÜĞMESİ (2026-09-29)
- **Etkinlik sayfası (kullanıcı: "çok karışık"):** 9 kart alt alta → BU HAFTA afişi (`#ev2-hero`) + 5 sekme `#ev2-tabs` (GÜNLÜK · MÜHÜR · KUPA · ZİRVE · ALBÜM) + tek görünen `.ev2-pane`. Kupa bölmesine index.html'deki statik afiş/yol/düğme DOM'la taşınır (id'ler aynı). Rozet: günlük kalan hedef, kupada toplanacak ödül. İlk açılış: ödül hazırsa KUPA, değilse günlük kalan varsa GÜNLÜK. Başarımlar ALBÜM'de açık gelir.
- **Pazar eşya düğmeleri:** fiyat satırı kartın tam eni, düğme ≥40 px, sayı 14 px.
- **SÜRÜM:** `ui · main ?v=20260929n` · `style.css ?v=20260929n`.
- **ÖLÇÜLDÜ (verifier 279 px):** 5 sekme sığıyor, eşya düğmeleri 93-95 × 44-56 px.
- **v68b:** kahraman kartında altın+gem yan yana 47-51 × 32-38 px, "600" kırpık → alt alta, ≥44 px, üç nokta yok; `.mk-hc` width 100% (2. kart 98/122 px'e büzülüyordu). `style.css ?v=20260929o`.

### v67 — PAZAR ÇOK PAHALI · GEM İLE ALIM · YENİ KAHRAMAN TÖRENİ · BİLET CTA (2026-09-29)
- Kahraman kart başı = max(taban [120/240/600/1200], fiyat × 0,2 × RAR_K [1/1,4/2,4/3,6] × (1 + 0,25·Sv)). Kara Kaptan Sv1 1 440/kart, Sv5 ×10 = 25 920; Seher Sv1 540.
- Gem fiyatı = altın / 12 × 1,15 (RUBY_EXCHANGE kuru ~12). Her teklifte altın + gem düğmesi (`.mk-pay`, `data-c`), `Market.buy(g, slot, cur)`.
- Yeni teklif `h3`: sahip olunmayan bir kahramanın AÇILIŞ kartı (günde bir), doğrudan fiyatın 2 × (1 + 0,25·nadirlik) katı. İlk açılışta `ui.showHeroUnlock` (`.hu`): kart karanlıktan döner, ışın, halka, kıvılcım, ad; 0,7 sn sonra dokunuş kapatır.
- Bilet "AÇ" çekmecede yazının üstüne biniyordu → `#daily-drawer .bp-banner` 3 sütun ızgara; ≤420 kabukta yalnız ok.
- M2 yeniden ÇALIŞTIRILMADI (kahraman kartı ~3-6× pahalı → pahalı kahramanda birikim artar; bilinçli, kullanıcı isteği).
- **SÜRÜM:** `market · ui · main ?v=20260929m` · `style.css ?v=20260929m`.

### v66c — KAHRAMAN KARTI DEĞERE BAĞLI (verifier: Sv1 kart 25 altındı) (2026-09-29)
- Kart başı = max(nadirlik tabanı [60/90/140/200], kahraman fiyatı × 0,12 × (1 + 0,25·Sv)). Örnek: okcu Sv1 ×1 = 90 · Sv5 ×10 = 900 · korsan Sv1 ×1 = 240 · Sv5 ×10 = 4 320.
- **M2 yeniden ölçüldü:** okcu (220) 1/3/6 koşu → aşan gün 3 / 14 / 12 · korsan (1600) → 3 / **26 / 26**. Cüzdan 0 gün hep 0.
  Kök: pazar GÜNLÜK ADETLE sınırlı (gereğin %20'si); pahalı kahramanda altın var ama alınacak kart yok → birikim geri döndü. Kullanıcı "kolay alınmasın" dedi: bilinçli ödünleşim. Açık seçenek: günde 2. kahraman alımı (fiyat ×1,5) ya da tekrar ödülü %42→%35.
- `.shop-sec em` üç nokta (281 px'te 60 px taşıyordu), metin "yenilenme 11 sa 32 dk". i18n: KART PAZARI · EŞYA KARTI · KAHRAMAN KARTI · ALINDI.
- **SÜRÜM:** `market · ui · main · i18n · legal ?v=20260929l` · `style.css ?v=20260929l`.

### v66b — PAZAR 2.0 (kullanıcı: kahraman pahalı, kart biçimli, göz alıcı alım) (2026-09-29)
- Kahraman teklifi: gereğin %20'si, kart başı seviye bedeli/gerek × **1,6** (≥25) — örnek Sv5→6 (300 altın/20 kart): 4 kart = 96 altın (önce 5 kart 40). Eşya aynı (%25, ×0,55).
- Kahraman DİKEY KART (3:4, nadirlik çerçevesi + folyo + ×N rozeti + ad plakası), eşya kare simgeli satır. Satın al düğmesi dövme altın + akan ışık + nefes; alımda kart sıçrar, ışın patlar, kartlar savrulur, 1,1 sn sonra ALINDI mührü.
- M2 sim yeniden ÇALIŞTIRILMADI (kahraman kartı pahalandı → birikim biraz artar).
- **SÜRÜM:** `market · ui · main ?v=20260929k` · `style.css ?v=20260929k`.

### v66 — GÜNLÜK KART PAZARI (M2 kararı: kullanıcı "kart pazarı, mağazada") (2026-09-29)
- `market.js`: günde 4 teklif (seçili kahraman · ikinci sahip olunan kahraman · en düşük 2 eşya), her biri günde bir kez. Adet = sonraki seviye kart gereğinin %25'i, kart başı fiyat = o seviyenin altın bedeli / gerek × 0,55 (≥6). `meta.mkt {d, got}`. Mağazada `#card-market` (GEM KESESİ'nin üstünde) + yenilenme süresi.
- **M2 yeniden ölçüldü (aynı sim + pazar, açgözlü alıcı):** 1/3/6 koşu → cüzdan 0 gün **0/0/0** · 5 günlük harcamayı aşan gün **0 / 0 / 12** (önce 26/26/26) · 30. gün cüzdan 104 / 2 390 / 19 061. **ÖLÇÜT (3 koşu) GEÇTİ.** 6 koşuda tavan (Sv9, eşya 6) → birikim kaçınılmaz.
  Yan etki: 1 koşuluk oyuncu 30. gün Sv5 (önce Sv6) — altın eşyaya da akıyor; bant içinde.
- **SÜRÜM:** `market · ui ?v=20260929j` · `main ?v=20260929j` · `style.css ?v=20260929j`.

### v65 — AV KAÇIŞI ENGELDE (2026-09-29)
- missionTypes AV: kaçış adımı `props.blocked` ise ±55°/±110° döndürülür (takılma giderildi). `missionTypes · main ?v=20260929i`.

### v64 — SÜPER 2.0 (kahraman sahneleri) · YENİDEN DAĞIT KOŞU BAŞI 3 · ÜST ŞERİT 2.0 (2026-09-29)
- **SÜPER (kullanıcı: "okçuda yalnız halka, çok basit"):** `ultimate.js` baştan — hasar vuruş İNDİĞİ an, vuruş alanında; düşman başına tek vuruş (`e._ultN`, havuz reset'inde 0).
  okcu hilal + ay okları · simsek zikzak yıldırım + dal · gokalev çapraz mavi göktaşı · korsan hayalet borda gülleleri · sapanci seken taş · kralice çapraz hilal kesik · sovalye 3 halka buz sivrisi · seher dönen 3 güneş kılıcı (dalga) · savasci çatlaklı şok dalgası. Çizim 2B üst tuvalde (`ult.render`), 'lighter', gradyan/tahsis yok, ≤48 vuruş. Ses `ulthit` (türe göre, 75 ms sınır). İncelemede `.hdu-d` tanım.
- **YENİDEN DAĞIT:** hak artık KOŞU başına 3 (enterLevelUp/openWaveBonus sıfırlamıyordu → kaldırıldı).
- **ÜST ŞERİT 2.0:** kalkan + XP HALKASI (`--xp`), para hapları esnek, "+" köşe rozeti, GÜNLÜK/dişli 40 px kare. ≤360 ana sayfa metinleri 2 satıra sarar (ölçülen 281 px: 4 satır kesikti).
- **v64b (verifier):** 281 px'te altın sayısı kesik (33/27) → ≤330 hap dolgusu 4, simge 16, yazı 11,5. settings.js eski enemyManager (29e) içe alıyordu → iki örnek, RENK KÖRLÜĞÜ ölü; settings 29g'yi alır, `settings ?v=20260929h`, `main ?v=20260929h`, `style.css ?v=20260929h`.
- **SÜRÜM:** `audio · enemyManager · ultimate · ui ?v=20260929g`.
- **AÇIK (ÖLÇÜLMEDİ):** süper sahnelerinin 1:1 görünümü ve fps'i (WebGL yakalanmıyor) · 390/430 kabukta üst şerit.

### v63 — ETİKET SİNERJİSİ (D1) · GÜNLÜK ÇEKMECESİ (M1) · GÖREV TÜRLERİ (İ4) · BOSS 2.0 (İ2) · EKONOMİ SİM (M2) (2026-09-29)
- **D1 (weapons `TAGS`):** KOR · AYAZ · YILDIRIM · RUH · ÇELİK; pasif kimliği `PAS_TAG`, imza/özel perk kahraman etiketi `HERO_TAG`, KADİM GÜÇ = KOR. 2/4/6 kartta bonus (`_addTag`, applyChoice'ta). Kartta `.lv-stag` çipi "KOR 3→4 / 4", eşik bir sonraki seçimdeyse nabız + bonus adı. Tam set ≈ 25 W puanı.
- **M1:** üst şeridin 2. satırı (bilet + görevler) `#daily-drawer .dd` çekmecesine taşındı; üst satırda `#tb-daily` (rozet = bekleyen görev + alınabilir bilet kademesi). Çekmecede ayrıca "GÜNLÜK HEDEFLER · MÜHÜR · KULE" → etkinlik sayfası. Eski id'ler aynı.
- **İ4 (`missionTypes.js`, `worlds.missionDef().type`):** sıra [H,S,H,A,H,K,S,A,K] + boss; D1-1/2 öğretici H. SAVUN totem (100 can, dibindeki düşman başına 1,6/sn, düşerse gameOver, dirilişte %50 döner) · AV (2. dalgada kaçan elit ×2,2 can, 700 birim içinde ×1,55 hızla kaçar; son dalgada ölmediyse UZATMA: durur + ok) · KAÇIŞ (son dalga: 900 birim ötede çıkış, 40 sn'de 1500→150 daralan halka, dışı 0,5 sn'de %5 can). endWave: `mode.canFinish()` false → waveTimer 30, spawn açık.
- **İ2:** SON ÇIRPINIŞ'ta lord hücum sonunda sekizgen patlama (r130, 0,7 sn uyarı); ejder inişte 10'lu halka salvo. Telegraf sözlüğü: sekizgen = patlama · ÇİZGİ = hücum yönü (windup'ta kızıl şerit, missionTypes.render) · halka = alan.
- **M2 (run_script, analitik 30 gün, gerçek mR/rR/HERO/GEAR tabloları, kart kazanımı TAHMİN):** 1/3/6 koşu: cüzdan 0 gün **0/0/0** · 5 günlük harcamayı aşan gün **26/26/26** → ÖLÇÜT KALDI. 30. gün cüzdan 3,4k / 14,7k / 25k altın. Kök: kart kapısı (seçili kahramana düşen kart az) altını bağlıyor. Öneri (kullanıcı kararı bekliyor): altınla günlük kart pazarı ya da tekrar ödülü %42 → %30.
- **v63b (verifier):** 281 px'te `#tb-level` taştı (scroll 54 / kutu 44, XP çubuğu altın hapının altında) → ≤360 GÜNLÜK 36 px simge, plaka `flex:1 1 auto; min-width:0`, `#tbl-txt` gizli (aria-label'da). `ui · main ?v=20260929f` · `style.css ?v=20260929f`.
- **İ5 YAPILMADI:** yeni kahraman/dünya 3B varlık ister (Tripo brifingleri kullanıcıda).
- **SÜRÜM:** `worlds · weapons · enemyManager · ui · main · missionTypes ?v=20260929e` · `style.css ?v=20260929e`.
- **AÇIK (ÖLÇÜLMEDİ):** görev türlerinin süre bandı (4-7 dk) · AV kaçışının engellere takılması · 281 px'te çekmece.

### v62 — KUTSAMADA SİM DONUK · LANETLİ KART (D2) · DÜNYA OLAYLARI + SUNAK (İ3/D3) (2026-09-29)
- **KUTSAMA DONMUYORDU (kullanıcı):** freeze 2,3 sn kare döngüsünde eriyordu, release yalnız sıfırlıyordu → seçim sürerken sim akıyordu.
  loop'ta `if (this.ui._ldHold) { this.last = now; render; return; }` — tutmayı yalnız dokunuş bırakır.
- **D2 LANETLİ KART (weapons `CURSES`, 5 adet):** Sv8+ %16, koşu başı ≤2, evrim/imza/FTUE kartının yerini almaz; KAN KURUSU'nda can bedelli çıkmaz. `kind:'curse'` → `applyMods`. Kart `.lv-card.curse` kızıl. Ses `curse`.
- **İ3/D3 `worldEvents.js`:** ~95-120 sn'de bir (boss dalgası/kule/mühür/FTUE hariç): SUNAK (420-560 birim ötede, 2,4 sn bekle → can %35 / hasar +%6 / mıknatıs, 30 sn ömür, ekran dışıysa altın ok) · RUH SELİ (18 sn XP +%50) · RÜZGÂR (14 sn hız +%18). Pankart `ui.eventBanner` `.ev-ban`. Düşman gücüne dokunmaz. Ses `event · altar`.
- **SÜRÜM:** `audio · weapons · ui · main · worldEvents ?v=20260929d` · `style.css ?v=20260929d`.
- **KALAN:** İ4 görev türleri · İ2 boss 2.0 · D1 etiket sinerjisi · M1 menü sadeleştirme · M2 ekonomi sim · İ5 sezon 2.
- **AÇIK (ÖLÇÜLMEDİ):** sunak halkası 2B tuvalde modellerin ÜSTÜNDE çiziliyor (zemin katmanı değil) · lanet dengesi _baltest ile ölçülmedi.

### v61 — SÜPER YETENEK (H5) · BAŞARIMLAR (M4) (2026-09-29)
- **SÜPER (`ultimate.js`, kullanıcı onayı):** kıyım 1 / elit 4 puan, 80'de dolar (~55-75 sn). Kahraman KART NADİRLİĞİ (1-4) gücü belirler (`ULT_TIER`):
  yarıçap 250/290/330/380 · sıradan %60/%80/öldürür/öldürür · elit %22/32/45/60 (öldürmez) · boss %3/4/5/6 · dokunulmaz 1,0-1,8 sn · can +0/5/10/15 %.
  Kahramana özgü ad + renk (`ULT_ID`). HUD `#btn-ult` sağ alt (pointerdown, joystick'e düşmez), Space/E. Kahraman incelemesinde `.hd-ult` satırı. Ses `ultready` · `ultfire` (nadirlikle katman).
- **BAŞARIMLAR (`achievements.js`):** 16 başarım, `meta.ach {s,d,title}`, koşu sonunda `Ach.onRun` (Ledger'dan ÖNCE — Ledger kaydeder). Güç vermez: altın/gem + unvan.
  Sonuç ekranında `.ach-pop` sırayla; etkinlik sayfasında katlanır `.wk-ach`.
- **H6 ZATEN VARDI:** sıradan hasar sayısı düşman başına birleşiyor (combat.js `e.txt`).
- **v61b (verifier):** `.hd-ult` bloğu kaydedilmemişti (betik sonda patladı) → yerel `hdUlt` ile yeniden eklendi. `ui ?v=20260929b` · `main ?v=20260929c` (main de yükseltilmeli — içe aldığı ui eki main'in önbelleğinde kalıyordu).
- **SÜRÜM:** `audio · enemyManager · main · ultimate · achievements ?v=20260929a` · `style.css ?v=20260929a`.
- **KALAN:** D2 lanetli kart · D3 sunak · İ4 görev türleri · M2 ekonomi sim · M1 menü sadeleştirme · D1 etiket sinerjisi · İ2 boss 2.0 · İ3 dünya olayları · İ5 sezon 2.
- **AÇIK (ÖLÇÜLMEDİ):** süper düğmesinin 281 px'te joystick/KATLİAM ile çakışması · boss süresine etkisi (hesap: 70 sn'de bir %3-6 → boss süresi ≈ −%4-8).

### v60 — KUTSAMA SAVAŞ ALANINDA · PREMIUM YÜKLEME · CİHAZ SINIFI (2026-09-28)
- **KUTSAMA (kullanıcı):** yükleme ekranından ÇIKTI. main.startRun kutsamayı önce yuvarlar, `ui._ldHold = true` → kapı açılır, arena görünür, sim donuk;
  `ui.showBlessPick` (`#bless-pick .bp2`): 3 dikey kart dağıtılır, seçilen yükselir, "SAVAŞ!" mührü, 0,75 sn sonra `applyBlessing` + `_ldHold=false` → release serbest bırakır. Süre sınırı YOK.
- **YÜKLEME:** `.ld-back` (dönen ışın + hale + 12 kor) · mühür çevresinde iki yörünge · `#loading-bar` (scaleX) + `#loading-pct` + `#loading-step` (4 aşama). Başlık/üst satır giriş animasyonu.
- **CİHAZ SINIFI (main ctor):** WEBGL_debug_renderer_info ile zayıf GPU (Mali-4xx/T6-8xx/G31/51/52, Adreno 3-4xx/50x-51x, PowerVR SGX/GE8, yazılım) → low; orta GPU high'ı mid'e indirir. Hiç YÜKSELTMEZ.
  **Öğrenilen kademe** `_learnTier`: koşunun ≥%40'ı stres ≥ 0,66'da geçerse (≥90 sn, gfx 'auto') otomatik kademe kalıcı bir basamak iner (`kh_learntier_v1`).
- **SÜRÜM:** `ui · main ?v=20260928z` · `style.css ?v=20260928z`.
- **KALAN YOL HARİTASI (sıra):** H4 eşya/hesap töreni · H6 hasar sayısı birleştirme · M4 başarımlar · D2 lanetli kart · D3 sunak · İ4 görev türleri · M2 ekonomi sim · M1 menü sadeleştirme · D1 etiket sinerjisi · İ2 boss 2.0 · İ3 dünya olayları · İ5 sezon 2. Cihaz/yayın işleri (Z1, Y1-Y4) kullanıcıda.
- **AÇIK (ÖLÇÜLMEDİ):** 281 px'te kutsama kartları · yükleme çubuğu kısa kabukta — verifier'da.

### v59 — SES DENETİMİ · KURTARMA OKU · MENÜ HAREKETİ · KATLİAM (2026-09-28)
- **SES (audio.js):** 90 çağrı tarandı, 17 ses çok olayda paylaşılıyordu → 41 yeni ses, her olay tek sese (tarama betiği: `.play('x')` → dosya:satır).
  Paylaşım YALNIZ seviye ailesi: `levelup` = koşu içi seviye · hesap seviyesi · eşya geliştirme; `heroup` = aynı `_lvArp` + 0,6 sn darbe (tören ile eş).
  Eski levelup (testere borazan + koro) ve `upgrade/carddeal/waveclear/whoosh/chestcreak` silindi. Yumuşatma: error kare→üçgen, thunder 0,7→0,45 sn
  vol −%33, bossroar −%33, hurt −%23, boom −%24, death −%29, simsekvur kare→üçgen. `click` (genel tuş) ve `error` bilinçli ortak. Menü sekmesi `tab`.
- **KURTARMA OKU (main.renderObjectiveArrow):** yalnız `phase === 'escort'` (kişiyi oyuncu kendi bulur). R 64 → 112 + yukarıda +38, merkez ayak hizası (p.y + 14).
- **MENÜ:** alt dokta tek kayan kor plaka `.nav-ind` (`ui._navInd`, v48 aktif plakası kapatıldı) · dokunuş halkası `.nav-rip` + `nt-tap` · aktif simge `v59Hop` → `v59Float`
  · dok ışığı 7 sn · giriş `.mn-in` (üst şerit sıralı düşüş, dok yükselir) · sikke dönüşü, elmas, artı nefesi, dişli, kalkan · akan parıltı `.v59-sh` (JS sarmal; üst öğenin taşması değişmez).
- **KATLİAM (`game.combo`, HUD `.hcb`):** 1,4 sn zincir; 12 KIYIM · 30 KATLİAM · 60 KIZIL HASAT; kademe sesi `combo` + titreşim. OYUNA ETKİSİ YOK.
- **Kutsama kartı** satır çakışması (`.ld-bless .lb-card > *` static/auto).
- **Yol Haritası v4:** İ1 (davranış düşmanı/arkadan vurma) · M3 (kozmetik) · M6 (hikâye) kaldırıldı, "yapılmayacaklar"a yazıldı; v59 bölümü eklendi.
- **SÜRÜM:** `audio · combat · weapons · objectives · enemyManager · fieldChest · arenaProps · powerups · chests · ui · main ?v=20260928y` · `style.css ?v=20260928y`.
- **AÇIK (ÖLÇÜLMEDİ):** seslerin 1:1 dinlenmesi (yalnız cihazda) · 281 px'te kayan plaka konumu · KATLİAM rozetinin sol HUD ile çakışması — verifier'da.

### v58 — SEVİYE TÖRENİ 2.0 · BİYOM HAVASI KALKTI · YOL HARİTASI v4 (2026-09-28)
- **Tören (`ui.playUpgradeFx`, CSS `.upx-*`, `.hd-inner` içine):** birikim 0-0,6 sn (5 kart çubuktan kahramana, 12 zerre içe, --rar mühür halkası + elmas, kahraman `upx-lift`)
  → patlama 0,6 (flaş, 2 şok halkası, dönen ışın, 18 kıvılcım, `.hd-card.upx-shake`, `Haptics 'crit'`) → madalyon sayısı eski→yeni yuvarlanır 0,98
  → kazanç çipleri `charLevelMods` farkından (CAN/HASAR/ATIŞ HIZI) 1,15+ → o seviyede açılan yetenek plakası 1,6. 0,65 sn sonra dokunuş atlatır,
  otomatik 2,9 sn (yetenekle 3,4); `closeCharDetail` töreni sessiz bitirir. Eski `.upfx` + `#cd-hero.punch` (id özgüllüğüyle `.hd-hero.punch`'ı eziyordu) silindi.
- **v54 G3 #weather KALKTI (kullanıcı):** `ui.setWeather`, main'deki 2 çağrı, style.css bloğu. Atmosfer dünyada kalır (yol haritası İ3).
- **`Yol Haritası v4.dc.html`:** 6 faz (Zemin · His · Derinlik · Yayın · Sezon 2 · Canlı Döngü), 31 madde, her birinde ölçüt; 4 karar kullanıcıda (ulti · anonim ölçüm · hikâye · sıra).
- **SÜRÜM:** `main · ui ?v=20260928x` · `style.css ?v=20260928x`.
- **AÇIK (ÖLÇÜLMEDİ):** 281×540'ta çekirdek (madalyon+çip+yetenek) `.hd-inner` içine sığıyor mu — JS `top`'u kıstırıyor, verifier'da.

### v57 — YOL HARİTASI v3 KALANLAR (2026-09-28)
- **B5 TEHLİKE BİÇİMİ:** patlama telegrafı (kind 0) SEKİZGEN halka + dolgu, yavaş döner; zehir gölü yuvarlak. Geometri `_hzGeo` paylaşılır, karede yalnız referans.
- **C4 EKONOMİ (analitik, worlds + chests + config):** tekrar ödülü %30 → **%42** (taban 8). D5 tekrar 143 → 179 altın (sandık ort. 40,5 dahil);
  beklenen kahraman Sv6 (700) **4,9 → 3,9 koşu** (bant 2-4) · D1 Sv4 1,6 koşu · D10 Sv8 (3000) 9,6 koşu → geç oyunda kule/kabus altını taşır.
- **E2 ÖLÇÜLDÜ:** ölü seçici taraması (67 js/html) → yalnız 4 seçici / 2 kural ölü (195 B). style.css'in 535 KB'ı CANLI stil; kazanç bölmede
  (ilk açılışta gerekmeyen ekranlar) — cihazda `PerfLog.boot` ölçmeden yapılmaz. Dinamik ad önekleri (`'on wx-'`, `'kc rk-'`, `'tier' +`) korundu.
- **E3 HAREKET DENETİMİ:** :active ölçeği 11 değer → 3 (kart 0,98 · düğme 0,96 · simge 0,92, 29 kural); yaylı eğri 6 kopya → `cubic-bezier(.2,1.6,.4,1)` (15 yer).
- **E1:** yalnız gerçek cihazda (Ayarlar → Gelişmiş → Performans Raporu).
- **SÜRÜM:** `main · ui · weapons · worlds · render3d · isleArt ?v=20260928u` · `style.css ?v=20260928v` (28u doğrulamaya gitti, yakıldı).
- **v57b (verifier):** 281×540'ta kapı perçin kuşağı ipucu satırının üstünden geçiyordu (18 px) → kuşak %2,5, ≤640 px yükseklikte gizli, orta içerik dolgusu 5% + 26 px, üst satır tek satır + üç nokta.

### v56 — YOL HARİTASI v3 UYGULAMA · SAVAŞ KAPISI (2026-09-28) · yeni `journey.js`
- **A5 KAYIT KAYBI (KRİTİK, bu turda bulundu):** `loadMeta` sabit alan listesi döndürüyordu → `ledger · ftue · tower · seal · evo`
  HER AÇILIŞTA siliniyordu (yıldız/ustalık/kule sıfır, haftalık mühür ödülü tekrar alınabiliyordu). Artık bilinmeyen anahtarlar taşınır.
- **SAVAŞ KAPISI:** bulut perdesi kalktı → iki demir kanat (0,72 sn) + kor mühür (dünya no, dolum halkası `--p`, kilit sarsıntısı) +
  görev hedefi + yıldızlar + ipucu; açılışta dikiş `--wc` ışığıyla yarılır. Kutsama varsa `ui._ldHold` sim'i donuk tutar (en çok 9 sn, sonra ilki).
- **A2/C1** `nextGoal` (en küçük kalan oran): menüde `#next-goal` hapı + sonuç ekranında `.me-goal`. **A3** ilk görevde Sv3+ imza kartı garanti.
  **A4** açılış tabanı 5 → 2,6 sn (ısıtma kapısı aynen). **B1** kritik ölüm kıymık + ruh, elit cevher fıskiyesi. **B2** kartlar nadirlik
  sırasıyla (110 ms adım, üst karttan önce +120 ms, `.lv-top`). **B3** öne bakan kamera (%8, rm/sarsıntı kapalı %4). **B4** karede ≤6 ses
  (`UI_SND` muaf), `Music.duck` boss/evrim. **C2** `Daily` günde 3 hedef → tahta sandık. **C3** `BLESSINGS` 6 kutsama (artı+eksi ≈ 0 W).
  **C5** `Gift` uzakta süre (tavan 8 sa, `awayT` saveMeta'da). **D1** ZİRVE şeridi · **D2** `Ghost` kıyım eğrisi + HUD `.hud-ghost` ·
  **D3** 6 bölümlük sezon satırı · **D4** albüm (dünya rozeti = tüm yıldız + boss).
- **YAPILMADI (bilinçli):** B5 tehlike biçimleri (render3d şader işi) · C4 ekonomi ölçümü (tezgah yok) · E1 cihaz ölçümü · E2 CSS bölme · E3 hareket denetimi.
- **SÜRÜM:** `main · ui · weapons ?v=20260928s` · `enemyManager · combat · audio · music · settings · journey · i18n · legal ?v=20260928r` · `style.css ?v=20260928t`.

### v55 — QA TURU · AYARLAR 2.0 · YOL HARİTASI v3 (2026-09-28) · kaynak `Yol Haritası v3.dc.html`
- **HESAP XP TAŞMASI (KRİTİK):** menüde "60/36" — kayıttaki eski `xpNext` okunuyordu, açılışta seviye işlenmiyordu.
  Artık `xpNext = accountXpToNext(level)` (eğri tek kaynak) + kurucuda `addAccountXp(0)` birikmiş seviyeyi ödülüyle işler.
- **AÇILIŞ:** `Warmup` iç etiketleri ("süs · rüzgâr · fx shaderları") ekrana yazılmıyor → `SPLASH_LINES` (5 temalı satır, T() ile EN).
- **SAVAŞ alt satırı** kesiliyordu → dünya adı çıkarıldı (üst çubukta var).
- **AYARLAR 2.0:** 17 grup → OYUN · ERİŞİM · HESAP sekmesi (`#set-tabs`, `ui._setTab`), satır = simge + ad + tek satır + denetim.
  Titreşim `#set-hap3` KAPALI/HAFİF/TAM = haptics + hsoft (Settings anahtarları AYNI, kayıt göçü yok). Perf/hata HESAP → GELİŞMİŞ (`details`).
  Kaydırak dolgusu `--p`. Tüm eski id'ler korundu. Ölü CSS `.set-group/.set-row-label/.set-label/.set-value/.set-hint` silindi.
- **SÜRÜM:** `main · ui · i18n · legal ?v=20260928p` · `style.css ?v=20260928q` (28p doğrulamaya gitti, yakıldı).
- **v55b (verifier):** 281 px'te metin sütunu 62 px, kalite düğmesi 37 px (YÜKSEK 51 px) → `@container shell (≤360)` dolgu 8/10, simge 28, anahtar 46, kalite 2×2.
- **AÇIK (ÖLÇÜLMEDİ):** 281/360 kabukta ayarlar taşması, kalite 4'lü satırı Cinzel'de sığıyor mu — verifier'da. Oyun içi his/fps önizlemede ölçülemiyor (WebGL yakalanmıyor).

### v54 — YOL HARİTASI v2 (2026-09-28) · kaynak `Yol Haritası v2.dc.html` (H1 kayıt yedeği, H3 kodeks KULLANICI İSTEMEDİ; H5 sonra)
- **ÖNCE:** inceleme 3B sandığı kesikti (paylaşılan tuval törenin translate(−50%) ortalamasını taşıyordu) → `.chest-canvas-3d.ci-canvas3d` sıfırlar.
  Saha sandığı ödülleri gümüş perçinli madalyon (mıknatıs · yakut kalp · kalkan · sikke · patlangaç), tür başına BİR KEZ ekran dışı tuvale pişer.
- **F5 `errlog.js`:** yakalanmayan hata/söz son 20, imza tekrarında sayaç; Ayarlar → HATA KAYDI (KOPYALA/TEMİZLE). Cihazdan veri çıkmaz.
- **F3 PİL MODU:** `Quality.capFps = 30` (sim 60 Hz sabit); 20 dk+ ve stress > 0,6'da oturum başı bir öneri. **E4:** RENK KÖRLÜĞÜ
  (ELITE_AFFIX renkleri Okabe-Ito'ya çalışma anında), BÜYÜK YAZI (`html.bigtxt` + hasar yazısı ×1,22), YUMUŞAK TİTREŞİM (`Haptics.k` 0,45).
  Joystick zaten "parmağın bastığı yerde doğar" — sol el ayarı gereksiz.
- **G1 DÜŞÜŞ ANI:** `gameOver` ilk çağrıda 0,9 sn ×0,25 ağır çekim + gri (`html.dying`) + YENİLGİ plakası, sonra pencere. Diriliş: `_returnPulse` + ruh sütunu.
  **G4:** `BOSS_DEATH` dünya başı son (ruh/kor/batak/ışık/hiçliğe çöküş/kristal/tuz/buz/kemik/çark), ağır çekimin ilk karesinde.
- **E2:** sonuç ekranı sırası (`_meSequence`): sonuç 0 → ganimet 0,4 → altın sayar 0,8 → yıldız 1,15 → ustalık 1,6 → düğmeler 1,95 sn; dokunuş atlatır, 2,8 sn saat `.seq-done`.
- **E1 `ftue.js`:** sekme kilidi temizlenen görevden türer (KUŞANIM 1 · KAHRAMAN 2 · ETKİNLİK 3; MAĞAZA açık), kaydırma da kilide uyar, yeni açılan sekmede YENİ rozeti.
  İlk görevde dokunmayı engellemeyen koç: yürü (260 birim) → otomatik saldırı (6 kıyım) → ilk kart → sandık ipucu; zaferde `meta.ftue`.
- **H2 `nightmare.js`:** D10 bitince KABUS DÖNGÜSÜ (etkinlik sayfası); en az D10 eğrisi × can 1,30 · hasar 1,20 · dünya başı +%6, her elit 2 değiştirici,
  altın ×2, ilk zafer 8 gem (boss 20), 10 zaferde kozmetik çerçeve (`html.nm-frame`). Yıldız defterine yazmaz.
- **H4 `gearSets.js`:** aynı kademe 2/4 parça: GEZGİN · TUNÇ · AYAZ · YILDIRIM · KOR (2p ≈ 6, 4p ≈ +10 W puanı, tavan içinde). Kuşanımda set şeridi.
- **G3 `#weather`:** biyom başı CSS desen katmanı (yalnız transform, merkez maskeli); düşük kademe/pil/hareketi azalt kapalı.
  **G2:** `ui._veil()` sonuç ve menüye dönüşte karanlıktan açılış. **E3:** zemin şaderine dokusuz makro leke (hücre ≈ 880 px, ±%9), low'da kapalı.
- **F4:** `_releaseEnemyModels` artık geometri + doku + pişmiş poz önbelleğini de atar (önceden yalnız materyal). **F2:** açılış süresi
  `kh_boot_v1` (son 10), Performans Raporu'nda. CSS zaten build'de küçültülüyor; asıl ölçüm cihazda.
- **E6:** sandık paleti tek kaynak `chestArt.CHEST_PAL` (chestModel3d içe alır). **E5:** 75 yeni EN karşılığı.
- **KUSUR (bu turda bulundu):** `replaceText` TÜM eşleşmeleri değiştirir → BOSS_DEATH 21 kopya olmuştu; ayrıca v53j'nin `PerfLog.begin` düzenlemesi
  yeniden doğuşta `_masK = 0` yazıyordu (çift sayım düzeltmesini iptal ediyordu). İkisi temizlendi; artık düzenlemeler tekil eşleşme şartıyla.
- **v54b (verifier):** sekme kilidi `nextMission`ten türüyordu; ilerleme sıralı değil (D5'teki kayıtta ETKİNLİK kilitli kaldı) → `cleared = Σ progress`. `ftue · ui · main ?v=20260928n` (28m doğrulamaya gitti, yakıldı).
- **SÜRÜM:** değişen tüm modüller `?v=20260928m` (modül başına TEK sürüm denetlendi: çakışma 0).
- **AÇIK:** çizmelerin detay turu (sanat) · G2'nin "düğüm haritaya büyür" / "sandık yuvaya uçar" kısmı · denge ve fps ölçümü cihazda.

### v53 — YOL HARİTASI PAKET 1 (ilk dilim): DEFTER · USTALIK · PERF DEFTERİ · HAREKET AYARLARI (2026-09-28)
- **Kaynak:** `Yol Haritası - Güncellemeler.dc.html` (kullanıcı onayı: A1 ve D8 HARİÇ hepsi; oyun %100 ÇEVRİMDIŞI —
  liderlik/klan yok, yerine Haftalık Mühür + Rekor Defteri + yerel etkinlik takvimi).
- **`ledger.js` (yeni):** `meta.ledger {st, rec, mas}`. Görev başına 3 yıldız (zafer · can hiç <%50 · ≥2 saha sandığı),
  yeni yıldız başı 2 gem; görev rekoru (kıyım, seviye); kahraman USTALIĞI 10 kademe (kıyım×0,6 + zafer 60/yenilgi 15 +
  boss 90), kademe ödülü altın 50+40·sv, SV5 15 gem, SV10 40 gem. **GÜÇ VERMEZ** (balance bütçesi dokunulmadı).
  `main.gameOver/missionComplete` → `Ledger.onRun` → `s.ledger` → `ui._renderLedger` (yıldız damgası, YENİ REKOR mührü,
  ustalık çubuğu). Kahraman incelemesinde `.hd-mastery`. Saha sandığı sayısı `_fc0` farkından (koşu başı okunur).
- **`perfLog.js` (yeni, B1):** önceden ayrılmış Float32Array halka (16384), koşu sonu p50/p95/p99/>50 ms/kademe/ölçek/stres,
  son 30 koşu `kh_perflog_v1`. Ayarlar → PERFORMANS RAPORU (GÖSTER / KOPYALA). Cihazdan veri çıkmaz.
- **A6:** EKRAN SARSINTISI anahtarı (`game.motionK` 1 / 0,3 → addShake · addKick · punch) · HAREKETİ AZALT (`html.rm`).
- **C6/B7:** `html.rm` tüm animasyon/geçişleri sıfırlar; sistem `prefers-reduced-motion` menüde döngüleri tek tura indirir;
  25 sn dokunuş yoksa `html.idle` → `#screen-menu` döngüleri durur.
- **C2:** `refreshWallet` artık sayarak günceller (`_tweenNum` 420 ms); `rewardFrom(el)` görev/kademe/bilet ödülünde
  kaynaktan cüzdana uçuş (`flyCurrency`, hedef görünmüyorsa düz tazeleme).
- **SÜRÜM:** `main · ui · settings · ledger · perfLog ?v=20260928a` · `style.css ?v=20260928a`.
- **SIRADAKİ DİLİMLER:** D5 elit değiştirici · D7 yerel takvim · D3 Haftalık Mühür · yıldızların yolculuk düğümünde görünmesi ·
  D1 evrim · D2 Sonsuz Kule · C1/C3/C4/C5 · A3/A4 · B2-B6 · A2/A5.
- **v53b (verifier):** defter kartı 196 px ekliyordu → `.me-rewards` 0 px, ikincil düğme kırpık. Ödül/düğme `flex-shrink:0`,
  kart `overflow-y:auto`, defter kompakt (yıldız 32 px, etiket yalnız ≥700 px kabukta, çipler nowrap). `style.css ?v=20260928b` (28a yakıldı).
- **v53c (verifier):** `@container shell (max-height)` HİÇ tetiklenmez (#app inline-size) → yükseklik kuralları `@media`.
  Yıldız toplamı yıldız satırına, çipler tek nowrap satır; ≤700 px yükseklikte sandık sahnesi 138→92 (≤600: 74) px.
  `style.css · main · ui ?v=20260928c` (28b yakıldı). 
- **v53d:** kök neden = üst üste iki tam genişlik düğme (113 px). ≤700 px yükseklikte düğmeler yan yana, `.me-orn` ve `.mm-up`
  gizli. `style.css ?v=20260928d` (28c yakıldı). AÇIK: 540/667/740 × sandık+rekor+ustalık artışı scrollHeight ≤ clientHeight.

- **v53e — D5 · D7 · D3 · yıldız düğümü (2026-09-28):**
  - **D5 elit değiştirici (`enemyManager` AFX/ELITE_AFFIX):** KALKANLI (maxHp×0,45 kalkan, hasarın %70'ini yutar, combat.applyHit) ·
    BÖLÜNEN (ölünce 2 küçük kopya) · ÇEVİK (hız ×1,38) · PATLAYAN (ölünce 0,6 sn telegraflı r96 tehlike) · YENİLENEN
    (1,6 sn vurulmazsa %5/sn) · ÖFKELİ (<%50 can: hız ×1,35 hasar ×1,3). D1-6 bir, D7+ iki; değiştirici başı +%20 XP.
    Elit can çubuğu her zaman görünür, değiştirici renginde, kalkan üstte ince şerit; doğumda ad yazısı.
  - **D7 + D3 (`calendar.js` yeni):** hafta numarasıyla dönen 4 etkinlik (KOR YAĞMURU ×1,5 · BOSS AVI boss ×2 · ELİT GECESİ
    elit ×1,6 · BİYOM HAFTASI seçili harita ×2) + hafta sonu ×1,25. HAFTALIK MÜHÜR: tohumdan dünya/görev/kural
    (CAM TOP · ELİT SELİ · HIZLI GECE · KAN KURUSU), skor = kıyım + dalga×45 + zafer 400 + süre, eşik 450/950/1500 →
    180 altın / 12 gem / 30 gem (hafta başı bir kez). `game.startSeal()` · `startRun(w,m,seal)` · `Calendar.applyWave` beginWave'de.
    Etkinlik sayfasının başında `.wk-event` + `.wk-seal`.
  - **Yıldız düğümü:** tamamlanan görev düğümünün altında `.cn-stars`.
  - **SÜRÜM:** enemyManager · combat · render3d · ui · calendar · ledger · perfLog · settings · main · style `?v=20260928e`.
  - **AÇIK:** _baltest ile değiştiricili D7-10 görev süresi yeniden ölçülmedi.
- **v53g — D1 · D2 · C1 · C3 · C4 · C5 (2026-09-28):**
  - **D1 EVRİM (weapons.EVOLUTIONS):** imza kademeleri toplamı ≥5 + eşli pasif ≥2 → tek EVRİM kartı (hasar ×1,18 ·
    bekleme ×0,90 + kimlik eki ≈ +%31). Evrim anı patlama + zoom; keşif meta.evo; kart ekranında .lv-evo-hint, incelemede .hd-evo.
  - **D2 SONSUZ KULE (tower.js):** on harita döner, her 5. kat boss; can ×(1+0,10·(k−1)), hasar ×(1+0,05·(k−1)).
    Kat başı altın 40+8k, her 10. kat 10+k gem (bir kez); yenilgide son 5 katına döner; progress'e yazmaz; sandık yalnız boss katında.
    Etkinlik sayfasında .wk-tower (Dünya 1 boss'u sonrası açık).
  - **C1:** boss girişi 1,8 sn (hareketsiz, hasar almaz), ad plakası ui.bossMoment (pointer-events yok); faz plakası + ZAYIF AN
    kıvılcımı; ölümde 1,1 sn ×0,3 ağır çekim (_bossOutro).
  - **C3:** görüşte doğan düşman toz + biyom kıvılcımı; her üç ölümden biri ruh sütunu. **C4:** kart dönüşü _returnPulse (r190
    hasarsız itme, 0,6 sn dokunulmazlık). **C5:** koşarken biyom tonlu adım tozu.
  - **ZATEN VARDI:** B4 içerik özetli paket (build.mjs) · B5 model ön yükleme (prepareWorldEnemies) · A4 düşman mermisi ayrı palet.
  - **SÜRÜM:** weapons · ui · enemyManager · combat · player · tower · main · style ?v=20260928g.
  - **AÇIK:** B2 VAT · B3 tek WebGL bağlamı · B6 KTX2 · A2 UI kiti · A3 HUD bölgeleri · A5 sanat rehberi; D1/D2 _baltest ölçümü.
- **v53h — B2 · B3 · B6 · A3 · A2 · A5 (2026-09-28) — YOL HARİTASI KAPANDI:**
  - **B3 TEK WebGL BAĞLAMI:** inceleme pop-up'ı kendi ChestScene3D'sini KURMAZ; törenin tuvali #chest-canvas-3d +
    chests.scene3d incelemeye TAŞINIR (ui._ciStart3d), kapanınca ve tören başlarken _ciReturnCanvas ile geri döner.
  - **B2 (VAT öncesi adım):** görüş dışı rig 8 karede bir çözülür (dt biriktirilir), Quality.stress > 0,5'te orta/uzak
    halka bir kademe seyrelir. Gerçek VAT (poz dokusu pişirme) AÇIK — rig başına pişirme aracı gerekir.
  - **B6:** build.mjs ④b — sharp varsa paketteki PNG/JPG aynı ad/biçimde yeniden kodlanır (yalnız küçülürse).
    KTX2 (GPU sıkıştırma) toktx gerektirir, AÇIK.
  - **A3 HUD BÖLGELERİ:** Z1-Z6 sözleşmesi style.css v53h; boss anı plakası %22, açıkken dalga pankartı gizli (html.bm-on)
    — ÖLÇÜLEN KUSUR: plaka %30 ile pankart %32 üst üste biniyordu.
  - **A2 + A5:** `UI Kiti ve Sanat Rehberi.dc.html` (palet · tipografi · 4 bileşen · HUD bölgeleri · hareket sözleşmesi · sanat kuralları).
  - **SÜRÜM:** ui · chests · render3d · main · style ?v=20260928h.
- **v53i — KALAN AÇIKLAR KAPANDI (2026-09-28):**
  - **B2 PİŞİRİLMİŞ POZ (render3d bakeClip/bindBake/sampleBake):** düşman klibi yüklemede 30 Hz'de Float32Array'e
    örneklenir (klip başına tek kopya, rig'ler paylaşır); LOD karesinde mixer.update YERİNE iki kare arası
    nlerp/lerp doğrudan kemiğe. Saat p.act.time (timeScale korunur, restT yolu aynı). Bağlanamayan rig mixer'da
    kalır (BakeStats.rigs / .mixer). Skinning GPU'da three.js yolu — tam GPU VAT'a geçiş gereksiz görüldü.
  - **B6 GLB DOKU → WebP (build.mjs ④c, optionalDependencies):** @gltf-transform + draco3dgltf + sharp varsa GLB
    içi dokular EXT_texture_webp, ≤2048 px, Draco korunur. **KTX2 BİLİNÇLİ OLARAK YOK:** loadDecimatedHero/Prop
    dokuyu tuvale çizip yeniden örnekler; GPU-sıkıştırılmış doku tuvale çizilemez.
  - **DENGE (analitik, balance.js formülleriyle):** evrim imza DPS ×1,311 → toplam DPS +%12-19 (imza payı %40-60),
    bant ≤ +%35 içinde · KALKANLI elit etkili can ×1,45 · **KULE KUSURU BULUNDU VE DÜZELDİ:** kat 10→11 can
    ×21,75 → ×2,00 düşüyordu (harita dönünce dünya eğrisi sıfırlanıyordu); artık ilk 10 kat dünya eğrisi, sonra
    D10 eğrisi × (1 + 0,07·(k−10)) can, × (1 + 0,04·(k−10)) hasar — kat 11 ×12,25 · 20 ×19,46 · 30 ×27,48.
    Maks meta güçte (×4,69) öldürme süresi kat 10 ×2,44 · kat 20 ×4,15.
  - **Mühür HIZLI GECE** artık dünya speedMul'unu ezmiyor (×1,2 üstüne, bir kez).
  - **SÜRÜM:** render3d · tower · calendar · main ?v=20260928i.
  - **AÇIK (yalnız cihazda):** gerçek telefon fps / 1:1 his; pişmiş pozun mixer'a göre kazancı ?perf=1 ile ölçülmeli.
- **v53j — YENİ SİSTEMLER KOD DENETİMİ, 3 KUSUR (2026-09-28):**
  - **KULE BOSS KATI ÖLÇEKSİZDİ:** Tower/Calendar.applyWave startWave'den SONRA çağrılıyordu, boss startWave İÇİNDE
    doğuyordu → kat 15/20/25… boss'u kat çarpanı almadan geliyordu. Artık `game.applyWaveMods()` startWave içinde, spawnBoss'tan önce.
  - **KAN KURUSU DELİNİYORDU:** regen/lifeSteal yalnız 1. dalgada sıfırlanıyordu; sonra alınan kart iyileştiriyordu →
    `player.noHeal` bayrağı (update regen + drain okur).
  - **YENİDEN DOĞUŞTA ÇİFT SAYIM:** yenilgi Ledger.onRun'u çağırıp sonra zafer yine çağırınca kıyım ustalığa iki kez
    yazılıyordu → `g._masK` (sayılmış kıyım). PerfLog yeniden doğuşta yeni satır açar (end sonrası ölçüm kapalı kalıyordu).
  - Denetlenip SORUNSUZ bulunan: BÖLÜNEN kopyası updateEach içinde güvenli (swap-remove, __pi) · değiştirici alanları
    havuz reset'inde sıfırlanıyor · elit şansı her dalga startWave'de yeniden yazıldığı için çarpan birikmiyor.
  - **SÜRÜM:** player · calendar · enemyManager · ledger · main ?v=20260928j.

### v52 — İNCELEMEDE 3B SANDIK · KİLİT ROZETİ YOK · YUVADA İRİ SANDIK (2026-09-27)
- **Pop-up:** yuvaya dokununca `ui._ciStart3d` kendi `ChestScene3D`'sini kurar (tuval `#ci-canvas3d`, `.has3d` SVG'yi gizler);
  sandık 130 birim aşağıdan 0,56 sn back-out ile yükselir (~%10 aşma) → 0,32 sn konma ezilmesi + 7 kıvılcım → nefes.
  Hazırda derz ışığı nabzı, çözülürken hafif. rAF yalnız pop-up açıkken; `closeChestInspect` durdurur. WebGL yoksa
  SVG glif aynı yönde (ciDrop artık alttan). `renderFrame` yeni isteğe bağlı `shadowK` (gölge/rün halkası sandıkla belirir).
- **Kilit rozeti (`.cs-lock`) kalktı** (kullanıcı). Kilitli sandık yalnız nefes alır.
- **Yuvada sandık:** `width 100%`, tavan `min(100%, 11,6vh)`, iç boşluk 3/2/6 px → sütunu doldurur, çerçeve aynı.
- **SÜRÜM:** `main · ui · chests · chestScene3d ?v=20260927i` · `style.css ?v=20260927i` (27h doğrulamaya gitti, yakıldı).
- **AÇIK (ÖLÇÜLMEDİ):** iki WebGL bağlamı (tören + inceleme) telefonda; kısa kabukta yuva satırı yüksekliği — verifier'da.

### v51 — DURAKLAT KONUMU · RÜN KARTI 3.0 · SANDIK YUVASI 2.0 · SANDIK AKIŞI · BÜYÜK TEMİZLİK (2026-09-27)
- **Duraklat:** `top: sat+66` (eskisi +44, MATERYAL değerini örtüyordu). Boss barı `max-width: calc(100% − 108px)` → düğmenin altına girmez.
- **Rün kartı:** ekranda DAİMA 3 kart (`showLevelUp` kimliğe göre tekilleştirir + 3'e keser; ızgara 3 sütun, 4. çocuk gizli).
  Metal gradyan çerçeve (padding-box/border-box), iç çizgi + elmas perçin (`.lv-frame`), kademe ışığı + prem'de dönen ışın
  (`.lv-bg`), gümüş/kademe madalyon halkası, uçları kesik kurdele etiket, süslü ayıraç (`.lv-orn`), açıklama panosu.
  Giriş `lvDeal51` yalnız transform. Kahraman kartları (seher/simsek/korsan/kralice/sovalye) kendi sanatını korur.
- **Sandık yuvası:** aura (`.cs-glow`), hazırda dönen ışın (`.cs-rays`), yükselen zerre, zemin gölgesi; kilitli = nefes +
  gümüş kilit rozeti, çözülüyor = "açılmaya çalışan" sallanma + kor ilerleme çubuğu (`.cs-prog`, saniyede tazelenir), hazır = zıplama + AÇ! nabzı.
- **Akış:** kilitli sandık pop-up'ında TEK buton **AÇ** (= çözmeyi başlat). Elmasla HEMEN AÇ + REKLAM +30 DK yalnız
  ÇÖZÜLÜRKEN (`canAdBoost` artık `unlocking` şartı). Yuvadaki elmas rozeti de yalnız çözülürken.
- **Elmas fiyatı (`chests.skipCost`):** tam fiyat = mağaza Gem fiyatı × 0,8; kalan oran r ile `ceil(full · r^0,8)`, en az 1.
  Tam: tahta 6 · gümüş 11 · altın 18 · büyülü 27 · buzul 60 · mistik 120 · ejderha 208 (yarı yolda ~%57). Pop-up fiyatı canlı düşer.
- **SİLİNDİ:** 45 tezgah/arşiv dosyası (`game/_*`) · kullanılmayan ada sprite'ları (yalnız açılışın kul_b/mezarlik_3/katedral_2
  kaldı; `isleArt.SPRITES=false`) · pfp/pfp2/pfp4 · *_bust · arena/ · splash/kadro · terrain kul_b/mezarlik_b · skeleton/ · nekro/
  (+ `enemyManager` içindeki çağrılmayan `loadSkeleton/loadNekro/blitAnim` ve iki ölü çizim dalı) · kök `screenshots/ scraps/ screens/`.
  `uploads/` (kullanıcı kaynakları) ve kök `assets/` (tasarım belgeleri kullanıyor) DOKUNULMADI.
- **ÖLÜ CSS:** seçicisi JS/HTML'de hiç geçmeyen 687 seçici / 654 kural / 13 keyframe silindi (`.ccard*`, `.char-card*`,
  `.rune-card*`, `.wmedal`, `.market*` …) → style.css **585 → 483 KB**, 11 621 → 9 770 satır. Dinamik ad önekleri ('rar-' + n) korundu.
- **TEZGAH YOK:** ölçüm artık verifier'ın canlı `index.html` ölçümüyle; gerekirse tezgah yeniden yazılır.
- **SÜRÜM:** `main · ui · chests · enemyManager ?v=20260927h` · `style.css ?v=20260927h`.
- **AÇIK (ÖLÇÜLMEDİ):** 281/360/430 kabukta kart/yuva taşması, konsol — verifier'da.

### v50 — KAHRAMAN KARTI · İNCELEME POP-UP · ALT MENÜ SİMGELERİ (2026-09-27)
- **Kart `.hc` (ızgara `.hero-grid`):** tek kalıp ADİ→DESTAN (nadirlik yalnız `--rar`): metal çerçeve, 4:5 sanat,
  seviye KALKANI (sol üst), nadirlik taşı + parıltı (sağ üst), folyo süpürmesi, isim plakası + gümüş kart çubuğu.
  **EFSANE ayrı siluet:** pahlı köşe (clip-path), dönen konik altın çerçeve, taç, kor zerresi, altın ad.
- **GELİŞTİR bildirimi:** eski üst-orta gri ▲ kalktı → sağ üstte kor madalyon (akan çift ok + yayılan halka + zıplama),
  kart kenarı kor nabız, çubuk "GELİŞTİR" + akan ışık. Seçili = gümüş halka + SEÇİLİ hapı.
- **Pop-up `.hero-detail` / `.hd-*`:** tam genişlik sanat sahnesi (Ken Burns, folyo, ışın, aura), seviye madalyonu, 5'li
  stat şeridi + imza karoları, sabit aksiyon: çubuk + GELİŞTİR (kor 3B, parlama) / SAVAŞA AL (gümüş) yan yana.
  Efsane: dönen altın çerçeve + zerre. ID'ler aynı (cd-*), JS seçicileri `.hd-select/.hd-selected/.hd-stage`.
- **Alt menü:** KUŞANIM = göğüslük, KAHRAMAN = kapüşonlu figür (parlayan göz), ETKİNLİK = kulplu kupa + yıldız.
- **ÖLÜ CSS (AÇIK):** `.ccard*`, `.char-card*`, `.char-detail`, `.char-grid` blokları artık hiçbir öğeye bağlı değil —
  silinmeli (dağınık, ~15 blok). `.cd-*` gear pop-up'ında HÂLÂ kullanılıyor, dokunma.
- **SÜRÜM:** `main.js · ui.js ?v=20260927e` · `style.css ?v=20260927g` (27e/27f yakıldı). v50c: ok animasyonu yalnız transform (opaklık 0 karesi rozeti boş gösteriyordu), stat şeridi dar kabukta sabit 3+2, sahne dibine dolu 3 px bant + sönüm −2 px taşar (Ken Burns kenarı çizgi bırakıyordu).
- **v50b (verifier ölçümü):** `@media` viewport'u ölçüyordu (önizleme 924 px → 4 sütun, kart 51 px) →
  tüm dar kurallar `@container shell`. Stat şeridi `auto-fit minmax(54px)`, GELİŞTİR etiket/fiyat üst üste,
  rozet koyu kor merkez (açık merkezde oklar görünmüyordu), başlık altı dikiş = iç zemin sahne sönümüyle aynı renk,
  yetenek yuvaları `.hd-abils` kapsamlı yeni stil (çift "SV" yazısı gizlendi).
- **AÇIK (ÖLÇÜLMEDİ):** 281/360/430 kabukta kart eni, stat şeridi taşması, konsol — verifier'da.

### v49 — SAHA TEMİZLİĞİ · BİYOM AĞAÇLARI · DÜZENLİ PLAN · GÜMÜŞ SAHA SANDIĞI · GÖREV OKU · DENGE TEMELİ (2026-09-27)
- **Eski saha nesneleri KALKTI** (kullanıcı): mezar, haç, dikilitaş, çit, lahit, duvar, şapel, ev, mahzen, heykel, fırın,
  odun, baca, kulübe, kayık, iskele, sıra, çan, taht, kemer, gemi, buz dikeni, kızak, kaburga, halka, yığın, sütun, sandık
  (33 model). Kalan: v43 premium seti (kupa · fener · kazan · plaka · kemik · tuzsutun · disli) + kafatası · totem + v49
  ağaçları. Arşiv `_propModels_v48.js` · `_arenaPlan_v48.js` (oyun import ETMEZ). Planda kalmış eski tür sessizce atlanır.
- **BİYOM AĞAÇLARI (`propModels` TREE_STYLE, harita × {agac iri, fidan küçük}):** söğüt+servi · kömürleşmiş ağaç+yanan kütük
  · batak selvisi+mangrov · saksı defne+mersin · kristal ağaç+fidan · rüzgâr çamı+çiçekli fidan · akasya+tuz çalısı ·
  karlı köknar+kırağılı fidan · kemik ağacı+kaburga filizi · pirinç saat ağacı+yıldız filizi. Taç TAŞIR (44° kamerada
  çubuk okunuyordu). Kırılmaz. Zemin gölgesi tacı okur (`T.crown`). Rüzgâr `khWind49`; oyuncunun ÖNÜNDEKİ taç Bayer
  discard ile seyrelir (≤%72, opak geçiş, sıralama yok).
- **PLANLAR YENİDEN (10 harita, `arenaPlan` props):** aley (yol/omurga boyunca karşılıklı), ızgara koru, halka, kapı çifti;
  her haritada ≥2 kazan/totem/kafatası = KURTARMA VARIŞI (`objectives._safeSpots`, göbeğe <600 elenir).
- **SAHA SANDIĞI (`fieldChest.js` + `fieldChest3d.js`):** mağazanın 3B GÜMÜŞ sandığı (tier 2, klon, envMap ×0,72).
  Haritada ≤3, rastgele (engel/kubbe/oyuncu/sandık payı), 84 birimde KENDİLİĞİNDEN açılır, 35-52 sn sonra başka yerde.
  Ödül: mıknatıs 22 · can 21 · kalkan 20 · patlangaç 18 · altın 19 (can doluysa kalkan, ≤2 düşmanda patlangaç → altın).
  Patlangaç r 420: sıradan öldürür, elit %65, boss %7. Eski `openChest` + sandık engeli silindi.
- **MİNİ HARİTA KALKTI;** ekran kenarı pusulası yerine oyuncunun YANINDA çift ok + mesafe (`main.renderObjectiveArrow`).
- **DENGE TEMELİ (`balance.js`, import etmez):** stat ağırlığı `W` (hasar %1 = 1 puan, can 1 = 0,5) · kahraman bütçesi
  nadirlik 1-4 → 10/16/24/32 · eşya sırası 1-5 → 6/11/16/23/30 × yuva (silah 1, diğer 0,75) · tavan (hız %10, kritik %8,
  can çalma %8, zırh 2, kaçınma %8). config yüklenirken `fitMods` ölçekler — yazılan sayı KİMLİK ORANIDIR; kahraman stat
  satırı `modsLine`dan türer. `fixed: true` = bütçe dışı. ui güç puanı `balance.W ×10` (ayrı tablo silindi).
- **DÜNYA EĞRİSİ BEKLENEN GÜÇTEN (`worldCurve`):** eski can ×48 (G10 ile ×100) beklenen meta gücün (×4,7) ~10 katıydı →
  can = güç × (1 + 0,16·(w−1)), hasar = dayanıklılık × (1 + 0,09·(w−1)), boss = güç × (1 + 0,10·(w−1)). worlds.js'teki elle
  yazılmış hpMul/dmgMul OKUNMAZ. Dalga başı süre +18 → +11 sn.
- **SÜRÜM:** değişen 26 modül + index `?v=20260927c`. **27b YAKILDI:** aynı tur içinde ilk doğrulamada 27b istenmişti;
  sonraki düzenlemeler aynı URL'e yazılınca tarayıcı ESKİ baytı sundu (config 24d, balance hiç istenmedi, propModels iki
  kopya, mezarlıkta 22 engel). Kural: doğrulamaya giden ek bir daha KULLANILMAZ — sonraki düzenleme yeni ek alır.
- Ölçülen (başsız `_baltest`, config+worlds+balance): kahraman sapması **−5,1…+5,3 %** (önce −4,5…+9,4) · L5/L1
  ×5,1-6,4 · bütçe dışı kayıt **0** (vampirel ilk koşuda tavana takılıp 8,2/17,3 kaldı → kimliğe hasar eklendi) ·
  görev **5,2-6,6 dk** (önce 6,9) · görev başı seviye **11-15**, G5 bandı 1 · beklenen güçle boss D1→D10 **40 → 77 sn**
  (önce D10 boss beklenen güce göre ~23 sn, sıradan düşman ×21 süngerdi) · düşman canı D10 ×11,45 (önce ×48).
- **AÇIK (ÖLÇÜLMEDİ):** tarayıcıda harita yükleme/konsol, ağaç üçgen bütçesi ve 1:1 görünüm, sandık 3B kurulum süresi,
  engel ≤ tavan (`_stagetest`) — verifier'da. Zemin boyamaları (mezar yatağı, çit izi, gemi enkazı lekesi) eski nesnelere
  göre çiziliyor; bazı haritalarda nesnesiz leke kalabilir. legal.js ve eski kahraman kaydı etkilenmez.

### v48 — ALT MENÜ PLAKASI · KİLİTLİ SİLUET · GÖREV HAREKETİ · SANDIKTA ESKİ FİGÜR YOK (2026-09-27)
- **Alt menü:** aktif sekme soluk gradyan + 3 px çizgi + köşesiz kutuydu ("yarısı turuncu"); SAVAŞ 70 px,
  diğerleri 55 px. Artık `align-items: stretch` (hepsi aynı boy, ölçüldü 59/59/59/59/59), aktif = dolu
  yuvarlak kor plaka (r 14), nabız yalnız `::before` opaklığı. `navActiveGlow` aktifte `animation:none`.
- **Kilitli kahraman:** '?' kalktı → `.ccard-sil` (vektör figür, `source-in` gri gradyan, opaklık 0,2). Ad soluk yazılır.
- **Sandık:** tören/tepsi `ui.cardPortrait()` null döndüğü için ilk dönemin VEKTÖR figürünü çiziyordu (kullanıcının
  gördüğü "basit karakterler"). Artık `ui.heroArtUrl(id)` = HERO_ART illüstrasyonu; vektör yalnız görseli olmayan id'de.
- **Görevler:** açılış koreografisi (`.q-enter` 1,4 sn, opaklıksız), BUGÜN şeridi + dönen ışın, hazır kademe/satır
  nabız halkası, ÖDÜLÜ AL nefes + parlama, AL dürtme, çubuklarda akan ışık, alınanda damga vuruşu (`_qFresh`),
  puan sayacı sayar, telafi metni kısaldı. Kabuk: 2 px kenar + 3-5 px dip dudağı, r 16-20.
- **SÜRÜM:** `style.css · main.js ?v=20260927a` · main içinde `ui · chests ?v=20260927a`.
- **AÇIK:** 281 px'de görev ekranı ve telefonda FPS ölçülmedi (verifier'da).

### v47 — HARİTA YERLEŞİMİ: YER · SAHNE · SÜS · YAŞAM (2026-09-25)
### `arenaMaps` (grup/süs/fx API) · `arenaPlan` (10 props()) · `decorModels.js` (yeni) · `render3d` · `propModels` · tezgah `_stagetest.html`

Kullanıcı: *"objeler saçma, dağınık; gerçek oyun tasarımcısı gibi düzenle; çok dolu değil, rahat dolaşılsın ama etrafta bir şeyler olsun; tatlı, premium, animasyonlu."*
- **KÖK NEDEN BÜTÇEYDİ, MODEL DEĞİL (1:1 oyun kamerasıyla, on harita).** Planlar 95-130 engel
  üretiyordu, `BUDGETS.props` 66/72/78; `thinProps` LİSTE SIRASIYLA kesiyordu → mezar sıraları yarım,
  halka ağaçları/fenerleri hiç doğmuyor, zemine boyalı yatak/gölge nesnesiz. Ekran (≈371×1118 dünya px)
  başına 0-3 tekil nesne = "dağınık". Tezgah yıllardır "adet 72" diyordu; ÖLÇÜT yoktu.
- **GRUP BÜTÇESİ:** her isteğe bağlı sahne `A.group(pri, fn)`; kırpma BÜTÜN grubu atar (gp yüksek,
  sonra ilan edilen önce). Çekirdek (grup 0 / gp 0) atılmaz. Kısmi kesim `partial` ölçülür → **0**.
- **SERPME YASAK (engelde), MÜKEMMEL HALKA YASAK:** `scatter`/r 0,46 halkaları kalktı; kenar KARE sınıra
  organik 1-2'li kümeler (`A.edge`, `sides` seçilebilir), plaka spam (hiçlik 52, çark ~48) kalktı.
  İskele kazıkları (32, ince, takıyordu) ÇARPIŞMASIZ süse taşındı.
- **SÜS KATMANI (`decorModels.js`, 14 tür):** ot · çiçek · çakıl · mum · mantar · saz · kazık · kristal ·
  kor · kemik/dişli parçası · yaprak · kar · nilüfer. Aynı Builder/ışık/lineer palet (`PROP_KIT`).
  API: `dress` (engelin dibine yaslar) · `patch` · `verge` (yol kenarı) · `decor` · `cover`.
  **ÖLÇEK 1:1'de bulundu:** model boyu (~15 birim) ekranda 9 px, AI karosunun kendi ot yaprakları
  60-100 px → süs kayboluyordu; `DECOR_SCALE` 1,35-2,4 (tutam ≈ kahramanın yarısı).
- **EKRAN HÜCRESİ KURALI (`cover`):** 8×8 hücre (500 px); içinde atılamaz (gp ≤ 1) engel ya da ≥3 süs
  yoksa süs öbeği düşer; yol/göbek üstü hücreye yalnız düz süs (çakıl). Aynı paso YETİMİ giydirir
  (dibinde 2 süsü olmayan engel). Seyreltme hücreyi 3 süsün ALTINA indirmez (`thinDecor`): ilk
  ölçümde düşük kademe kapsamı %47-60'a düşüyordu.
- **YAŞAM (kare başına CPU yok):** ağaç + ot/çiçek/saz/mantar RÜZGÂRDA (tek program `khWind47`,
  `project_vertex` yerine dünya uzayı, genlik yükseklik²); oyuncu otu YARAR (`uPlayer`). FX tek
  InstancedBufferGeometry + ShaderMaterial: fener/fırın/kazan/sunak HALESİ (titreşim), ATEŞBÖCEĞİ,
  KOR kıvılcımı, TOZ, SANDIK PARILTISI. POI'ye çivili; ateşböceği/kor/toz oyuncuya yaklaşınca SÖNER
  (kapatılan atmoPoints dersi). Renk ekran uzayında eklenen yoğunluk (v43). Adet `atmo` kademesi.
- **BÜTÇE perf.js'e DOKUNMADAN:** süs tavanı `max(240, particles×0,7)` (240/315/490), FX `atmo`
  (40/70/110) — perf.js değişseydi TÜM içe alanların etiketi değişmek zorundaydı (v31 ikinci-Quality).
- **MODEL DÜZELTMELERİ (1:1 okuma):** kazan içeriği düz ışıklı disk → koyu sıvı + ışıyan kabarcık
  (harita rengi) · kafatası "panda yüzü" → köşeli göz çukuru + kaş kemeri + iki boynuz + toprak
  örtüsü · kemik totemi "yangın musluğu" → kiremit kuşak kan-kahve · bataklık mantarı düz camgöbeği
  leke → gölgeli.
- **SÜRÜM:** `main ?v=20260926a` (index) · `render3d · propModels · shieldDome · decorModels ?v=20260926a`
  · `arenaMaps · arenaPlan ?v=20260925z`.
- Ölçülen (`_stagetest`, üç kademe × on harita = 30 satır): engel ≤ tavan **30/30** · kısmi kesim **0** ·
  kapsam **%100 (30/30)** · erişim **%100** · çıpa reddi **0** · pişirme 20-54 ms. High engel/süs/fx:
  mezar 68/417/29 · kül 64/440/54 · batak 51/473/26 · katedral 68/348/36 · hiçlik 51/365/25 · gökada
  58/413/19 · tuz 61/374/19 · buzul 78/459/23 · kemik 58/416/17 · çark 54/373/28. Yetim high: mezar 1
  (kapı feneri), diğerleri 0; mid/low 0-3 (koridor kenarı fenerleri — süs yolda yalnız çakıl olabilir).
  Hücre başı en çok engel 3-11 (11 = mezarlık aile parseli, bilinçli çevre).
- **AÇIK:** gerçek telefonda FX + süs (≤490 örnek, ~60 üçgen) fps'i yalnız kullanıcıda; kenar fenerlerinin
  yetimi; zemin AI karosunun kendi tekrar deseni hâlâ baskın (ayrı iş).

### v46 — 3B SANDIK = VİTRİN GLİFİNİN 3B'Sİ (2026-09-25)
### `game/chestModel3d.js` (yeni) · `chestScene3d.js` v7 · tezgah `_chest3dtest.html`

Kullanıcı: *"3B sandık modellerini mağazadaki sandık görsellerine çok benzeyen (mümkünse aynısı) yap."*
- **SÖZLEŞME 1 glif birimi = 1 dünya birimi** (X = x−32, Y = 54,2−y). Ön ortografik görünüş glifle
  çakışır; yüzey süsleri (kalas, pul, güneş, rün, damar) glifin KENDİ path dizeleriyle Path2D'den
  dokuya boyanır (UV = ön izdüşüm). Çıkıntılı her parça gerçek geometri: yastık kapak (glifin
  `Q10 11.5` eğrisi iki eksende çarpım), trapez gövde, pahlı bant halkası, etek, yüzeye oturan kabarık
  kuşaklar, kabaralar, kilit/kalkan/altıgen/halka, kristal, buz, diken, ejder başı (glif path → Shape).
- **Glifte kuşakların ÜSTÜNE çizilen süsler** (t4 damar, t5 buz yayı, t6 sızıntı/rün, t3 filigran)
  kuşağın önünde ayrı kabukta (additive/ink) — alta boyansa kuşak örterdi.
- **MÜREKKEP KONTUR:** grup başına TEK ters kabuk (konum paylaşan normallerin ortalaması boyunca 0,78).
  Parçalar materyal başına birleşir → t1 57 · t7 88 çizim (FX dahil).
- **METAL = ÇEVRE HARİTASI:** stüdyo PMREM (üst aydınlık/alt koyu + 4 yumuşak kutu) glifin metal
  gradyanını kendiliğinden verir; NeutralToneMapping, FX materyalleri `toneMapped:false`.
- **KAPAK TERS AÇILIYORDU:** v6 `rotation.x = +1,85` ön kenarı AŞAĞI, gövdenin içine döndürüyordu. v7 −1,85.
- Parıltı taraması (t2/t3) shader enjeksiyonu; t6 artık süzülmez (glifte zemin halkasına oturur).
- Palet `chestModel3d.PAL` = chestArt v8 gradyan duraklarının kopyası (AÇIK: tek kaynak için chestArt'tan export).
- **SÜRÜM:** `chestModel3d · chestScene3d · chests · ui · main ?v=20260925s`.
- Ölçülen (`_chest3dtest`, ön orto siluet IoU glif↔3B): v6 **0,76-0,88** → v7 **0,952-0,978** (t1-t3,t5
  0,978 · t4 0,952 · t6 0,953 · t7 0,971) · kurulum 54-122 ms (derleme dahil, doku ppu = texHero/46) ·
  kare 0,2-0,7 ms · 35-43k üçgen. `_chestScene3d_v6.js` YALNIZ tezgah kıyas kopyası.
- **AÇIK:** gerçek telefonda tören 1:1 bakış; kurulum ~100 ms törenin ilk karesine düşer.

### v45 — GÖREVLER + SAVAŞ BİLETİ PREMİUM · SATIN ALMADA SORU YOK (2026-09-25)
- **Ebeveyn matematik kapısı KALDIRILDI** (kullanıcı: "hiçbir şey sorma"). `parentGate` ölü kod, silindi.
  Denetim mağazanın işi (Play Family Link). `legal.js` 4. madde metni buna göre güncellenmeli.
- **GÖREVLER:** madalyon glif (`.qc-g`, `questChip` sarmalar) · takvimde BUGÜN kalkık kor kart,
  alınan gün gümüş damga · 7. gün ışınlı vitrin · kuşak çubuğunda kademe elmasları (`.q-notch`) ·
  görev satırı = ilerleme halkası (`.q-ring --p`) + ödül madalyonu · 3B kor düğme (ÖDÜLÜ AL/AL/bilet).
- **SAVAŞ BİLETİ:** kademe madalyonu · mor premium şerit (elmas + tarama) · dikey kartlar
  (44 px glif madalyonu, AL etiketi, kilit rozeti) · geçerli satır bandı · her 10. kademe elmas düğüm.
- Tüm stil `style.css` sonundaki v45 bloğunda; animasyon yalnız transform/opacity.
- **SÜRÜM:** `style.css · main · ui ?v=20260925a`. Ölçüm: verifier'da (281/360/430).

### v44 — YAYIN ALTYAPISI · SHADOWREND (2026-09-24)
### yeni: `vault · clock · release · legal · i18n · backend` · `backend/functions` · `build.mjs` · `BUILD.md`

- **AD:** Shadowrend (logo · başlık · manifest). Sezon adı "KIZIL AY".
- **KASA (vault.js):** korunan `kh_*` anahtarları imzalı + IndexedDB aynası +
  `storage.persist()`. Cüzdan artık TEK anahtar (eski `Math.max` göçü açıktı).
- **SAAT (clock.js):** tüm zaman `Clock.now()`: oturum monoton, yüksek su
  işareti (geri alınan saat sayaçları dondurur), `version.json` Date başlığıyla
  sunucu sapması düzeltilir.
- **NADİRLİK SIRASI HATASI DÜZELDİ:** RARITIES[5]=NADİR sandıkta EFSANE
  sayılıyordu ve havuzdan hiç çıkmıyordu. `chests.rk()` tek sıra kaynağı.
- **EFSANE GARANTİSİ:** `PITY_N = 40`, HER sandık açılışı sayar (`meta.pity`).
- **OLASILIKLAR:** `chests.odds()` oyunun KENDİ zarını 4000 kez atar → beyan
  kodla ayrışamaz. Koleksiyon değişince `invalidateOdds()`.
- **YAŞ + YASAL:** ilk açılış yaş çubuğu (yalnız aralık saklanır) + onay;
  u13 gerçek parada ebeveyn onayı. Ayarlar: dil · gizlilik · KVKK · koşullar ·
  destek · oyuncu kimliği · sürüm · veri silme. `legal.js` [..] alanları DOLMADAN yayın YOK.
- **GÜNCELLEME:** `version.json` min/latest → engelleyici / nazik.
- **BOSS FAZLARI:** %60 ÖFKE (salvo ×0,75 bekleme, +6 mermi) · %30 SON
  ÇIRPINIŞ (hücum/zıplama ×0,6, iki yardakçı). Her geçişte 1,6 sn ZAYIF AN
  (hasar ×1,5, combat.js). Ölçülmedi: boss süresi ~%8-12 kısalmalı.
- **DENGE:** Sapan L4/L5 hasar 43/60 → 48/70, L5 bekleme 0,44 → 0,42 (hesap:
  L5 ≈ +%22, L5/L1 ≈ ×5,2). `_baltest` ile YENİDEN ÖLÇÜLMEDİ. D7-10 boss
  süresi: `bossHpMul` üssü zaten 0,26 (yorum D10 88 sn diyor) → YAPILACAKLAR satırı bayat olabilir.
- **DÜŞÜK KADEME:** saha nesneleri pahsız (`setPropDetail`), iskelet LOD halkaları dar.
- **İNGİLİZCE (i18n.js):** sözlük + kalıp + BÜYÜK HARF kelime yedeği, DOM
  gözlemcisiyle; canvas yazıları `spawnText`te. Karşılıksız metin
  `__i18nMissing` → çevirmen. Lore/kart açıklamaları HENÜZ TR.
- **SUNUCU (backend.js + backend/functions):** anonim Firebase oturumu, makbuz
  doğrulama (idempotent), bulut kayıt (cüzdan deftere karşı sınanır), AdMob
  ödüllü reklam. `CFG.apiKey/fnBase` boşken HER ŞEY simülasyona düşer.
- **SÜRÜM:** tüm yerel modüller `?v=20260924d` · `sw.js` sr-cache-20260924c.
- **AÇIK:** gerçek cihaz · `npm run build` · Firebase projesi · Play ürünleri ·
  i18n eksik listesi · denge yeniden ölçümü · VAT (düşman rig'leri hâlâ tek tek).

### v43 — SAHA NESNELERİ PREMİUM + KALKAN KUBBESİ (2026-09-24)
### `propModels.js` · `shieldDome.js` (yeni) · `render3d.js` · `objectives.js` · tezgah `_propgallery.html`

Kullanıcı: *"haritadaki objeler çok kötü, premium yap, haritalara uygun
obje koy; kurtarma görevindeki yuvarlak beyaz kalkan çok basit."*

- **PAH HER KUTUDA:** `Builder.add` her `U.box/U.boxC`'yi GERÇEK ölçüde pahlı
  kutuya çevirir (44 üçgen, pah = min boy %19, tavan 3,8; <1,8 birim pahsız).
  Pah yüzü `edge` özniteliği taşır → en az `EDGE_LO`, ×`EDGE_K` 1,22 kenar
  ışığı. `addO` önce pahlar sonra yontar (top/bend dünya ölçüsüne çevrilir).
  Kırk iki arketipin satırına dokunmadan hepsi kenar kazandı.
- **DEĞER RAMPASI:** geo() sonunda nesnenin kendi boyuna göre dip 0,94 →
  tepe 1,07 (ışıklı parça hariç).
- **HARİTAYA GÖRE BİÇİM (`PID`):** yerleşim kodu DEĞİŞMEDİ; ortak arketipler
  pişirmede haritayı okur. Fener: demir sokak feneri (mezarlık · gökçe ada ·
  tuzla-ahşap direk · buzul-kar/buz sarkıtı) · MANGAL (kül) · DARAĞACI
  (bataklık) · ŞAMDAN (katedral) · kristal kandil (hiçlik) · BOYNUZ fener
  (kemik) · pirinç küre (çark). Küp: fıçı (bataklık yosun · buzul kar) ·
  kömür küfesi · emanet küpü · vazo · amfora · tuz çuvalı · kemik kavanoz ·
  pirinç kapsül. Ayak izi ve boy hepsinde aynı (görsel = çarpışma).
- **YENİDEN ÇİZİLEN:** sandık (derz · köşe sacı · 16 kenarlı tonoz · altın
  perçin/kenar · anahtar delikli ışıklı kilit · halka · ayak) · kemik (çift
  topuzlu kemik + çeneli kafatası) · plaka (oyma çerçeve + elmas mühür;
  hiçlik/çark'ta ışıklı) · tuz sütunu (kristal KÜME) · dişli (içi boş jant,
  kollar, 12 diş, küçük dişli) · kazan (dövme gövde, ağız, sap, kabarcık) ·
  escort NPC (cüppe, kemer, heybe, kapüşon, asa ucunda fener).
- **1:1 RETLER:** plaka rünü haç okundu → elmas mühür; kar 0xd8f0fb fıçıda
  beyaz disk (>165) → `SNOW` 0x96aab6; mangal ayakları koyu zeminde kayboldu
  → demir yuvası; dişli 1852 üçgen → 1572.
- **KALKAN KUBBESİ (`shieldDome.js`):** ikosfer panel kafes (240 panel, %13
  boşluk) + fresnel (sabit kamera yönü) + tabandan kayan tarama + seyrek
  parıltı · kenar perdesi · ışık havuzu · dönen RÜN halkası · dört yayıcı
  kaide (taş/gümüş/altın + ışıklı kristal) · tepe mücevheri. Kırılma:
  paneller normali boyunca saçılır, düşer, söner; kaideler gömülür.
- **ÖLÇÜLEN KUSUR (additive + sRGB):** harmanlama KODLANMIŞ değeri toplar;
  lineer 0,015 ekrana 0,10 düşüyor, dört katman kubbeyi yine DOLU camgöbeği
  yapıyordu. Yoğunluk ekran uzayında yazılır, köşeye `lin()` ile girer.
- **KUBBE PAYI:** `objectives._free` önce 150 birim açıklık arar (kubbe
  dikilitaş/lahdin içinden geçiyordu — oyunda görüldü), yoksa eski 60.
- **TEZGAH TAZE BAYT:** `?t=` sunucunun yetki parametresi (istek düşer);
  `_propgallery` modülleri `?fresh=` ile ister. `_propModels_v42.js`
  YALNIZ tezgahın kıyas kopyası (oyun import etmez).
- **SÜRÜM:** `propModels · shieldDome · render3d · objectives · main ?v=20260924b`.
- Ölçülen (`_propgallery` · `_proptest`): palet tezgahı **50/50 bantta** ·
  kubbe güncellemesi **0,05-0,06 ms/kare** (ilk sürüm köşe başına pow/exp ile
  0,6-2,9 ms → panel başına döngü) · harita üçgeni (adet × model) v42→v43:
  mezarlık 29,0→47,0k · kül 22,7→48,4k · bataklık 18,9→29,6k · katedral
  14,9→34,6k · hiçlik 9,9→27,4k · gökada 20,5→41,2k · tuzla 13,6→34,1k ·
  buzul 18,4→31,3k · kemik 25,1→46,4k · çark 16,5→55,1k (çizim çağrısı
  değişmedi: arketip başına bir) · canlı `index.html` konsol **0** · görevde
  `phase waiting` + kubbe görünür.
- **AÇIK:** gerçek telefonda nesne üçgeni (en çok 55k) ile 60 fps yalnız
  kullanıcıda ölçülebilir; darboğaz çıkarsa ilk aday dişlinin diş pahı.

### v42 — AÇILIŞ EKRANI: GÖK KALESİ · KIZIL AY · LOGO (2026-09-23)
### `index.html` (#splash) · `style.css` (v42 bloğu) · tezgah `_splash41.html`

Kullanıcı: *"açılış ekranı premium olsun"* → v41 (üç kemerli portre) **RET**:
*"çok kötü, Clash Royale kalitesinde olmalı; karakter ön planda olmak zorunda
değil."* Higgsfield kapalı (bakiye 0 · free plan).

- **CLASH DİLİNİN TAŞIYICILARI:** iri, kalın konturlu, kabartmalı LOGO + tek
  güçlü sahne + tombul parlak çubuk. Karakter portresi taşıyıcı DEĞİL.
- **LOGO GERİ GELDİ** ("KARANLIK / HASAT", Cinzel 800). v36'daki "logo yok"
  kararı bu turda Clash referansıyla çelişiyor; kullanıcı istemezse
  `.sp-logo` tek satırla kalkar, sahne yerinde kalır.
- **LOGO ÜÇ KATMAN:** span = koyu kontur (text-stroke 3,4 u) + ekstrüzyon
  gölgesi · ::after = kor gradyanı (background-clip:text) · ::before = üst
  parlama. Gradyan span'in kendisine konamaz (negatif z-index çocuk arka
  planın ÜSTÜNE boyar).
- **SAHNE = OYUNUN KENDİ AI ADALARI:** kul_b (kor kalesi) merkez, mezarlik_3 ·
  katedral_2 derinlikte (parlaklık 0,52-0,6). Yeni varlık yok, 223 KB, menü
  aynı dosyaları zaten ister. `.sp-world` boyut kapsayıcısı (cqh): ada boyu
  logo ile çubuk arasındaki paydan türer.
- **1:1 RETLER:** küre gölgeli ay "top" okundu → düz parlayan disk + kenar
  kararması; iki simetrik leke "yüz" okundu → tek asimetrik ton.
- **ANİMASYON DONARSA ZARAR YOK (ölçüldü):** önizleme çerçevesinde logo
  animasyonu `from` hâlinde (scale 1,16) takılı kaldı; o hâlde bile HASAT
  kenara **22 px** pay bırakıyor. Görünürlük hiçbir öğede animasyona bağlı değil.
- **ÖLÜ KOD/VARLIK:** v41 kemer/portre CSS'i ve `assets/splash/{okcu,simsek,
  kaptan}.webp` silindi. `kadro.webp` (v36) diskte geri dönüş için.
- **SÜRÜM:** `style.css ?v=20260923h`.
- Ölçülen (`_splash41`, dört kabuk, en uzun ipucu 88 kr.): taşma **0** ·
  HASAT kenar payı **25/22 · 32/29 · 34/31 · 38/34 px** · sahne dibi→ipucu
  **35 · 48 · 41 · 37 px** · merkez ada 592 px → 203-323 css (DPR 2'de
  ≤1,09× büyütme, DPR 3'te ≤1,64×) · canlı `index.html` konsol **0** · üç
  ada `on`.
- **AÇIK:** DPR 3 telefonda merkez ada hafif yumuşak olabilir (1,64×); AI
  kolu açılırsa yalnız logo + kale için 1080 px bir anahtar görsel yeter.

### v40 — KUŞANIM YENİDEN: KADEME BAŞINA SİLUET · KAHRAMAN SAHNESİ · ÇANTA (2026-09-23)
### `game/weaponArt.js` (yeni) · `gearArt.js` · `ui.js` · `index.html` · `style.css` · tezgahlar `_geartest.html` · `_loadouttest.html`

Kullanıcı: *"cephane/kuşanımdaki kılıç, yay, hançer görsellerini baştan, premium
yap; kuşanım kısmı daha güzel, daha kullanışlı olsun."*

- **TEŞHİS (silahlar):** v3'te her arketip beş kademede AYNI silueti taşıyordu,
  yalnız renk değişiyordu — kart ızgarasında "aynı kılıcın beş rengi".
  v4: her kademe kendi formu (paslı kısa kılıç → tunç yaprak ağız → buz
  kristalli uzun kılıç → ejder kanatlı yıldırım kılıcı → dalgalı alevli
  güneş kılıcı; hançer/balta/yay/asa aynı mantıkla). Element dili korundu
  (Nadir buz · Epik yıldırım · Efsanevi ateş).
- **AĞIZ İKİ YARI BOYANIR:** `blade()` profil dizisinden (uç→taban, sol/sağ
  yarı en, merkez kayması) aydınlık + gölge yarı, sırt çizgisi, kenar
  parlaması ve kontur üretir. Işık sol üstten, kontur tek renk (#0b0910).
  Palet v3 `gearArt` paletlerinin devamı (yeni renk icat edilmedi).
- **ÖLÜ KOD:** `gearArt.js`ten v3'ün 25 `w_*` çizimi + CY/YG/ND/EP/EF paletleri
  silindi (`Object.assign(GEAR_ART, WEAPON_ART)`); `style.css`ten eski
  `.loadout-split/.loadout-avatar/.eq-slot/.equip-slots/.gear-sec-head/.gear-grid/
  .gear-card/.gc-*` blokları + efsanevi pah yaması silindi (~12,3 KB). Karışık
  seçici listelerinde kalan `.gear-card` adları zararsız (eşleşmez).
- **KUŞANIM AKIŞI:** dört yuva portreyi çevreler (sol silah·eldiven, sağ
  zırh·çizme). **Yuvaya dokunmak artık ÇIKARMAZ** (eski davranış kazayla eşya
  söküyordu) — çantayı o yuvaya süzer. Karta ilk dokunuş SEÇER (KUŞAN/ÇIKAR +
  İNCELE tepsisi), ikinci dokunuş inceler; KUŞAN'da kart yuvaya uçar (WAAPI,
  bitişi ayrıca 720 ms saatle garanti — v36/v39 dersi). Rozetler: ✓ kuşanılı ·
  ↑ kuşanılandan güçlü · ▲ geliştirilebilir; yuva/sekmede kırmızı nokta =
  o yuvada daha güçlü ya da geliştirilebilir eşya var.
- **GÜÇ PUANI YALNIZ ARAYÜZDÜR** (`KZ_W` ağırlıkları, seviye çarpanı dahil):
  aynı yuvada kıyas ve toplam gösterimi için; oyun mantığı okumaz.
- **İNCELEMEDE KIYAS:** aynı yuvada başka eşya kuşanılıysa her stat satırı
  farkı taşır (▲/▼, seviye çarpanlı). Ölçüldü: Buz Rüzgârı Yayı Sv4 vs
  Güneş Alevi Kılıcı Sv2 → Saldırı Hızı **▲ +12%**, Hasar **▼ −24%** (elle
  hesapla aynı).
- **NADİRLİK SIRASI DİZİN DEĞİL:** RARITIES dizini 5=NADİR, 3=EPİK,
  4=EFSANEVİ. Kart dili `KZ_RANK` (1-5) ile kurulur; `rar-N` sınıfı yok.
- **GİRİŞ ANİMASYONU OPAKLIK TAŞIMAZ** (yalnız transform): görünmeyen belgede
  animasyon ilerlemezse kart görünmez kalmasın (v36).
- **TEZGAH EKRAN GÖRÜNTÜSÜ 44 KARTTA ZAMAN AŞIMINA DÜŞÜYOR** (DOM yeniden
  çizimi, SVG gradyan sayısı); `_loadouttest` `?cap=N` ile kartı kırpar,
  `?hide=kz-hero`, `?state=sel|all|detail&id=` ile durum kurar. Ölçüm
  satırları kırpmadan ÖNCE yazılır.
- **SÜRÜM:** `weaponArt · gearArt · ui · main ?v=20260923d` · `style.css ?v=20260923e`.
- Ölçülen (`_geartest`, 200×200 rasterize): 25 çizim · eksik **0** · kenar
  kırpması **0** (ef_balta 21 → 2 → 0 px, ölçekle kapandı) · opak kutu
  **73-94 %** · montaj 50 svg **3,6-10,6 ms**. (`_loadouttest`, üç kabuk):
  render (44 kart) **13-17 ms** · kart eni 281 **65 px ×3** / 360 **88 px ×3** /
  430 **80 px ×4** · yuva çerçevesi 60/66 px · sekme yüksekliği **40 px** ·
  KUŞAN **36 px** (offsetHeight) · yatay taşma sayfa/panel/sahne **0**
  (281'de "KAHRAMAN ⇄" ilk ölçümde 1 px taşıyordu → dar kabuk harf aralığı) ·
  ad ≤ 2 satır · uçuş sonrası kalan uçan kart **0** · konsol **0**.
- **v40b — ZIRH · ELDİVEN · ÇİZME DE YENİDEN (`game/armorArt.js`):** 19 çizim,
  weaponArt ile AYNI kit (`WA` dışa aktarımı — tek kaynak, kopya yardımcı yok).
  Gövde dolgu → iç ayrıntı → kırpılmış sağ/alt gölge → kontur (`part()`).
  Zırh: deri yelek (bağcık+kemer) · perçinli levha + eteklik lamları · tunç
  kenarlı kupa · katmanlı omuzluklu plaka · pullu ejder (göz kopça, şimşek) ·
  dikenli kara demir (kor çatlak, kan kalbi) · kanatlı altın muhafız (güneş,
  alev). Eldiven: parmaklar userSpace gradyanlı çizgi-kapsül (bbox'u 0 olan
  dikey çizgide objectBoundingBox gradyanı BOYAMAZ). Çizme: yandan, burun
  sağa; kürk konç / kanatlı topuk / sabaton / rüzgâr / kan tabanı.
  gearArt'tan v3 zırh/eldiven/çizme çizimleri + `gauntletBase/cuff` + kullanılmayan
  `LEATHER` silindi (~25 KB). Takma adlar (`zirh/cizme/el`) yeni çizime bağlanır.
- Ölçülen v40b (`_geartest?set=armor`, 200×200): eksik **0** · kenar kırpması
  **0** (19/19) · opak kutu **61-94 %** · 38 svg montaj **23,5 ms** · toplam
  **127 KB** kaynak. Kuşanım render (44 kart, beş koşu) **15,5-20,8 ms** ·
  KUŞAN 90×36 px · taşma 0 · konsol 0.
- **SÜRÜM (v40b):** `weaponArt · armorArt · gearArt · ui · main ?v=20260923f`.
- **AÇIK:** gerçek telefonda uçuş akıcılığı yalnız kullanıcıda; çizmeler
  kart boyunda diğer yuvalardan bir tık sade.
- **v40c — KIRMIZI NOKTA YALNIZ BOŞ YUVADA (kullanıcı):** nokta kuşanılı
  yuvada da "daha güçlü/geliştirilebilir" diye kalıyordu. `_kzSlotHint`
  artık: yuva boş VE giyilebilir sahipli eşya var. Güçlü/gelişim bilgisi
  kartlarda ↑ / ▲. `ui ?v=20260923j` · `main ?v=20260923j`.
- **v40d — DOLU YUVAYA DOKUNUŞ = ÇIKAR BALONU (kullanıcı):** dolu yuva artık
  çantayı süzmez; altında kor ÇIKAR hapı açar (ikinci dokunuş/dışarı dokunuş
  kapatır), hap `unequipSlot`. Boş yuva çantayı süzmeye devam eder. Balon
  sütuna kardeş eklenir (buton içinde buton geçersiz). `ui · main ?v=20260923k`
  · `style.css ?v=20260923k`.

### v39 — VURUŞ HİSSİ PASOSU: YEREL DONMA · YAYLI GÖVDE · KAMERA DİLİ (2026-09-23)
### `combat.js` (FEEL) · `main.js` · `render3d.js` · `enemyManager.js` · `style.css` · tezgah `_feeltest.html`

Kullanıcı: *"oynanış, animasyonlar, vuruş hissi, performans, efekt — premium
mobil oyun hissi, güzel dokunuşlar."*

- **KÜRESEL HIT-STOP GERİ GELMEDİ (2026-08-10 kararı doğru).** Yerine YEREL
  donma: yalnız VURULAN gövdenin poz saati 45 ms (kritik 85, boss 30) durur,
  ezilme tepede tutulur, sonra yayla bırakılır. Simülasyon (konum, hız,
  hasar) HİÇ durmaz — denge tezgahı etkilenmez. `stopCd` 0,22: sürekli ateş
  altında poz en çok **%21,5** donuk (ilk yazım 0,16 idi → %30, "tekleyen
  gövde" riski; ölçülüp düzeltildi).
- **EZİLME DOĞRUSAL DEĞİL YAYLI:** `cos(4,7u)·(1−u)²` — ezil → nötr → %2
  esneme → dur. Modelsiz (örnekli) düşmanlar da aldı; kalabalığın çoğu
  onlardı ve vuruşa hiç gövde tepkisi yoktu.
- **BİRLEŞEN SAYILAR:** aynı düşmana 0,42 sn içindeki sıradan vuruşlar tek
  yazıda toplanır ve yeniden zıplar (boy 13 → en çok 19). Kritik birleşmez.
  Sahip bağı `e.txt/owner` havuz yuvası dönünce sıfırlanır.
- **YAZI ÖLÇEĞİ FONTLA DEĞİL DÖNÜŞÜMLE:** pop-in bütün yazılara geldi; font
  dizgisi taban boyda kalır, büyüme `setTransform` ile. 60 yazı **0,17 ms**.
- **SARSINTI KARE HIZINDAN BAĞIMSIZ:** her karede `Math.random()` 120 Hz'de
  60 Hz'in iki katı sert görünüyordu. Yerine iki sinüs (≈6+14 Hz) + ≤0,7°
  yuvarlanma. Travma² ve FX tavanları AYNEN.
- **YÖNLÜ TEKME (`addKick`):** kritik darbe yönünde 2,6 px, oyuncu hasarı
  4,2 px; sönümlü yay (e^−9t·cos17t), 90 ms hız sınırı, 6 px tavan.
  **Önce oku, sonra ilerlet** — ters sırada ilk karede genliğin %17'si
  kayboluyordu (ölçüldü: 1,89 → 2,60 px).
- **ZOOM VURGUSU (`punch`) yalnız NADİR olay:** boss uyanışı 3,5 % · boss
  ölümü 6 % · elit/imza (fxImpact 3) 2,2 %. Eğrinin tepesi 0,61 çıktı →
  1,64 ile normalize (ölçüldü: hedef 7,5 → 7,4 %). 2B katman aynı oranla
  büyür, hasar yazıları 3B'den kaymaz.
- **CEVHER EMİLMESİ:** 70 ms geri sekme (3,5 px beklenti) + karesel hızlanma,
  tavan 1150 px/sn (adım 19 px < toplama yarıçapı 32).
- **TEHLİKE VİNYETİ:** can ≤ %30 (müziğin setDanger eşiğiyle AYNI) — kalp
  atışı ritminde yalnız opaklık; `prefers-reduced-motion` sabit.
- **TEZGAH rAF'A GÜVENMEZ:** önizleme çerçevesi görünür alan dışındayken rAF
  durdu ve ilk koşu "düşman doğmadı" dedi (oyun hatası DEĞİL). `_feeltest`
  döngüyü 16 ms'de bir ELLE adımlar; fps satırı bu yüzden yalnız bilgi.
- **SÜRÜM:** `combat · enemyManager · weapons · main ?v=20260923b` ·
  `render3d · style.css ?v=20260923a` (tezgahlar da `render3d ?v=20260923a`).
- Ölçülen (`_feeltest`, 32 ölçüt · **0 kırmızı**): tek URL altı modülde ·
  6 vuruş → 1 yazı, değer = toplam · donma 45 ms, ezilme tepede, sim konumu
  ilerliyor (1,6 px) · tekme 2,60 px, oturma 348 ms, 2 aşım · zoom 7,4 %,
  dönüş 686 ms, sonunda 0 · cevher 80 px 217 ms / 400 px 550 ms · 60 yazı
  0,17 ms · vinyet açılıp kapanıyor · konsol **0**.
- **AÇIK:** gerçek telefonda 60 fps ölçümü ve 1:1 his kontrolü yalnız
  kullanıcıda (`?perf=1`). Değerler `combat.FEEL`'de tek yerde.

### v38 — GÖK ADALARI YENİDEN: KIRK AYRI SİLUET (2026-09-22)
### `game/isleScene.js` (yeni) · `skyMap.js` · `isleArt.js` (SPRITES=false) · tezgahlar `_islescene.html` · `_biometest.html`

Kullanıcı: *"gök ada tasarımlarını değiştirmelisin, mantığa uygun güzel
tasarımlar olsun, birbirlerine benzemesinler."*

- **TEŞHİS:** v35'in kırk sprite'ı AYNI iso kare plaka + AYNI gri gotik
  yapıydı; kare plaka toprak parçası değil FAYANS okunuyordu ("mantıksız").
- **ADA = KOPARILMIŞ TOPRAK:** organik elips tepe (dünyanın zemini) · önde
  toprak dudağı · sivrilen kaya · kopan yerden SARKAN dünya imzası (kök ·
  lav · yosun · sarkıt · kristal · gömülü kemik · tuz tabakası · kırık
  parça · pirinç yörünge halkası).
- **KIRK ARKETİP, TEKRARSIZ:** mezar tarlası·türbe·çan kulesi·kızıl
  malikâne · yanık koru·demirci ocağı·kor kraterı·obsidyen hisar · kazıklı
  kulübe·dev mantarlar·gölet+söğüt·cadı ağacı · mum sunağı·gotik kule·yıkık
  nef·katedral · kırık sütunlar·rünlü dikilitaş·hiçliğe merdiven·taht+kara
  hale · zincirli kristal·tholos·yıldırım kulesi·kubbeli kale · tuz
  küpleri·karaya oturmuş gemi·boynuzlu kafatası+kemer·ziggurat · buz
  dikenleri·iglo·çam ormanı·buz sarayı · kemik ağacı·fildişi kemer·kafatası
  höyüğü·dev kafatası kalesi · gök küresi·dişli kule·gözlemevi·çark tapınağı.
- **SPRITE İNDİRMESİ KAPANDI:** `isleArt.SPRITES = false` → preload/thumb
  hiçbir webp istemez (ölçülmüş 1,21 MB indirme + ~17 MB tuval belleği
  artık 0). Tablo/yükleyici geri dönüş için yerinde. `isleDepthBelow`
  artık `ISLE_BOSS_DEPTH` (1,3) döner — madalyon kaydırması tek kaynaktan.
- **PAY DARSA ADA DA KÜÇÜLÜR:** yalnız yapıyı kısmak önizlemede boss'u dev
  platoda oyuncak kaleye çevirdi (1:1 bakışta). Plato ≤%40 daralır,
  merkez sabit (düğümler kaymaz).
- **1:1 RETLER:** sivri kenar saçağı "diş" → yuvarlak damla; yana açık uzun
  kemikler "bacak" → kısa, aşağı bakan gömülü kemik; hiçlik parçaları koyu
  zeminde görünmez "^" → dolu, dönük levha.
- **ÖLÜ KOD:** skyMap'ten prosedürel ada dalı + `grassPath · surfaceMark ·
  prop · structure · landmark · keep · bossShape · keepCastle · PAL`
  silindi (~41 KB → 16 KB).
- Ölçülen: ada başına **0,1-0,5 ms** (`_islescene`, rx 58) · önizleme
  boyaması 248×155 **1,1-3,4 ms** · konsol temiz.
- **BAYAT TEZGAH:** `_isletest.html` sprite yolunu ölçer; SPRITES=false iken
  anlamsız (hepsi `proc` okur). Yerine `_islescene` + `_biometest`.
- **REVİZYON (kullanıcı):** gök çarkı boss'u "dönme dolap", kemik bahçesi
  boss'u "gözlü bina" okundu → ikisi de yeniden: **fildişi sera** (kaburga
  iskeletli cam kubbe + cam kanatlar) ve **gök rasathanesi** (yıldız
  merdiveni + pirinç kubbeli kule + hilal). Aynı turda göz/çark taşıyan
  diğerleri de değişti: kafatası höyüğü → **ekili tarhlar**, gök küresi →
  **güneş saati**, dişli kule → **yıldız fenerleri**; ağaç dibindeki
  kafataları → kemik zambağı. `skull()` ve `gear()` ölü kod, silindi.
- **SÜRÜM:** `isleScene ?v=20260922h` · `skyMap/isleArt/ui/main ?v=20260922h`.

### v37 — HARİTA ÖNİZLEMESİ: DÜNYA BAŞINA BİYOM SAHNESİ (2026-09-22)
### `game/biomeSky.js` (yeni) · `skyMap.js` (yalnız `preview` dalı) · tezgah `_biometest.html`

Kullanıcı: *"haritaların önizleme resminin çok daha güzelini yapalım,
biomuna göre; her haritanınkini baştan düzenle."*

- **TEŞHİS: ON ÖNİZLEME AYNI GÖĞÜ PAYLAŞIYORDU.** Mor gece + aynı ay + aynı
  gri bulut; kimliği yalnız adanın ÜSTÜNDEKİ yapı taşıyordu ve o, 150×94
  kartta okunmuyor. Kimlik GÖK + UFUK + IŞIK katmanına taşındı.
- On sahne: mezarlık kızıl ay·çıplak ağaç·mezar taşı·kızıl yer sisi · kül
  duman ardında kor güneşi·tüten yanardağ·lav damarı · bataklık puslu ay·
  yosunlu ağaç·ayı yansıtan su·ateş böceği · katedral gül pencere·vitray
  huzmesi·gotik kule ormanı · hiçlik kara tutulma·ışık yarığı·kırık sütun ·
  gökada fırtına tavanı·yıldırım·ZİNCİR (lore)·bulut denizi · tuzla ufka
  batan güneş·aynalayan tuz kabuğu · buzul kuzey ışığı·buz dağı·donmuş göl·
  kar · kemik bahçesi soluk ay·dev kaburga · gök çarkı bulutsu·yıldız çarkı·
  takımyıldız.
- **ADA, YOL, BAYRAK, IŞIK SÜTUNU DOKUNULMADI;** dikey tırmanış (`tall`)
  eski göğünde kaldı. `biomeSky` yalnız ARKA ve ÖN katmanı boyar.
- **1:1 BAKIŞTA YAKALANAN ÜÇ RET:** ay önündeki dolu elips bulutlar "siyah
  çubuk" okundu → yumuşak yassı gölge; tuzlanın ışınsal ızgarası + güneş
  şeritleri "retro/synthwave" okundu → düzensiz çokgen kabuk; hiçlik yarığı
  tel çizgiyken yine "şimşek" okundu (v36 dersi) → ortada şişen dolu dudak.
  Kaburgalar sabit kalınlıkta "boru/çit" okundu → sivri hilal.
- **SÜRÜM:** `biomeSky ?v=20260922c` · `skyMap/ui/main ?v=20260922c`
  (v33c kuralı: içeriği değişen her modülün eki aynı turda artar).
- Ölçülen (`_biometest`, 248×155): boyama **1,0-4,4 ms**/dünya (buzul en
  pahalı: kuzey ışığı sütun gradyanları) · önbellekli, kare maliyeti **0**.
- **AÇIK:** bölüm seçimi (`tall`) hâlâ ortak mor gök; istenirse aynı sahneler
  dikey kadraja uyarlanabilir.

### v36 — AÇILIŞ EKRANI: TAM EKRAN KADRO GÖRSELİ (2026-09-21)
### `game/assets/splash/kadro.webp` (yeni) · `index.html` · `style.css` · `main.js` · tezgah `_splashtest.html`

Kullanıcı: *"oyunun ilk açılış ekranındaki tasarımı tamamiyle değiştirelim,
Clash Royale kalitesinde; karakterleri FOTOĞRAF olarak (model değil),
fütüristik şahane fantastik."* Form kararları: kadro **AY OKÇUSU · ŞİMŞEK ·
KARA KAPTAN** · yön **KOZMİK** (yıldız tozu + gök yarığı, mor-altın) · üçlü
dizilim · düzen: görsel tam ekran + çubuk dipte · kimlik serbest · ekranda
yalnız **çubuk + ipucu** · **LOGO YOK** (serbest not).

- **`get_cost` İZİN DEĞİL FİYAT SÖYLER.** Higgsfield preflight'ı "1 kredi"
  dönünce planın (v33b/v34'te kapalıydı) açıldığını sandım; üretim aynı
  modelde **"Requires basic plan or higher"**, yedek model `z_image` ise
  **"Out of credits"** verdi. Bir ölçüm, ölçtüğü şeyin ADINI taşımıyorsa
  kanıt değildir (maliyet ≠ yetki). 22 Eylül'de tekrar denendi: dört
  model de kapalı (`gpt_image_2_5` ve `recraft_v4_1` plan, `z_image`
  kredi, unlim `z_image`i kapsamıyor). Kadro bu yüzden KODLA pişirildi:
  mevcut AI portreleri (okcu_full · simsek_full · korsan_full) kozmik bir
  sahneye grade edilerek gömüldü. AI kolu açıldığında iş TEK DOSYA
  takasıdır (`assets/splash/kadro.webp` + `?v=` artışı).
- **KADRO ARTIK JS ÇİZİMİ DEĞİL PİŞMİŞ VARLIK.** Eski ekran üç vektör
  kahramanı HER AÇILIŞTA `drawHunter` ile çiziyordu — açılışın ilk
  saniyesi ana iş parçacığının EN MEŞGUL anıdır (modül grafiği + ısıtma).
  Şimdi tek `<img>` (1080×1920 webp, **277 KB**, `<link rel=preload>`) ve
  sıfır JS çizimi; `drawHunter` importu da silindi (ölü kod).
- **ERİME MODÜL GRAFİĞİNE BAĞLANMAZ (ölçülen kusur).** İlk yazımda `.on`
  sınıfını `runSplash()` ekliyordu; o metot three.js yüklendikten sonra
  çalışır. Ölçüldü: **dört kabukta da `on` HAYIR · opaklık 0.00** —
  yani açılışın ilk saniyeleri BOŞ GRADYANDI, üstelik görsel yüklüydü
  (`naturalWidth` 1080). Erime `index.html`de, görselin hemen ardındaki
  dört satırda. "Yazdım" ≠ "uygulandı" dersinin açılış hâli.
- **GÖRÜNÜRLÜK BİR CSS GEÇİŞİNE BAĞLANMAZ (ikinci ölçülen kusur).**
  Erime index.html'e taşındıktan SONRA da iki kabukta `on` **evet** ama
  hesaplanan opaklık **0.00** ölçüldü: geçiş hiç ilerlememişti (görünür
  alan dışındaki belgede render ötelenir). Yani ekran, görsel YÜKLİYKEN
  boş gradyandı. Taban opaklık **1** yapıldı: bir `<img>` zaten çözülene
  kadar hiçbir şey boyamaz — gizlemenin bedeli var, faydası yok. Arıza
  yönü GÖRÜNÜR tarafa düşmek zorundadır.
- **UYDURMA GEOMETRİ HER ZAMAN DÜZ KENAR ÜRETİR.** Büstlerin altına
  omuzdan bele inen bir "gövde silüeti" çizildi; 1:1 bakışta üçü de
  DİKDÖRTGEN LEVHA okundu (yanlarda ve altta sert kenar). Doğrusu
  çizmek değil UZATMAK: portrenin kendi alt bandı (%13) dikey gerilip
  %7 yanlara açılır, kademeli karartılır ve AYNI elips maskeden geçer —
  kumaş/zırh sürekli devam eder, düz kenar matematiksel olarak imkânsız.
  (Tek gerilmiş kopya kullanılır; çoklu kopya bantlaşma yapar.)
- **ARKA PLAN LEKESİ KARARTMAYLA DEĞİL MASKEYLE ÇÖZÜLÜR.** Yan
  portrelerin kendi arka planı (orman/güverte) %34 parlaklıkta hayatta
  kalıp DİKDÖRTGEN açık leke bırakıyordu. İlk çözüm karartma eğrisini
  dikleştirmekti (üs 2,2, taban 0,025) ve YANLIŞTI: aynı eğri yüzü de
  eziyor (ölçüldü: yüz k=**0,59**, gözler karanlıkta kayboldu). Doğrusu
  maskeyi daraltmak (yatay yarıçap 0,47 → **0,38**, eşik 0,50-1,0 →
  **0,42-0,92**, üst tenzil 0,08 → **0,20**): arka planın hüküm sürdüğü
  üst köşeler karartılmaz TAMAMEN AT ILIR, karartma eğrisi ise yüzü
  bozmayan değerinde kalır. Bir de kadraj daraldı (0,94 → 0,70 genişlik):
  en ucuz arka plan, hiç alınmayan arka plandır.
- **ÜÇ PORTRE YAN YANA GRADE OLMADAN KONAMAZ.** Kaynaklar kırmızı-yeşil
  orman · mavi kristal · zeytin gemi güvertesi. Boru hattı: doygunluk
  0,46-0,54'e kısılır → çekirdek dışı %8'e karartılır → mor gölge +
  altın parlaklık itilir → alttan altın anahtar ışığı (`source-atop`,
  yalnız opak pikselleri boyar). Kimlik MAKROda değil GRADE'de birleşir.
- **KESME YOK, ELİPS MASKE VAR.** İlk paso ayrılabilir (yatay×düşey)
  tüylenme kullanıyordu ve plakaların DİKDÖRTGEN kenarı 1:1 bakışta
  görünüyordu. Maske elips uzaklığından türeyince düz kenar matematiksel
  olarak imkânsız.
- **BİR YARIĞI KATI NESNE OLARAK ÇİZMEK ÜÇ KEZ ÇÖPE GİTTİ:** v1 "kaşık",
  v2 "solucan" (sinüs dalgalı şerit), v3 "gri şerit" (köşeli poligon).
  Doğrusu: yarık ışıktır — gövdesi değil HALESİ çizilir (iç içe dikey
  elips gradyanları) ve çatlak teli ÜST ÜSTE beş pasoda (13→1,1 px,
  alfa 0,045→0,72) çizilir. `shadowBlur` bu tuvalde hale üretmedi;
  bir efekt, çıktısı 1:1 görülmeden "parlıyor" sayılmaz. Dördüncü paso
  telin kendisini de kıstı (son alfa 0,72 → **0,34**, zikzak genişliği
  yarıya): tel baskın olduğunda yarık "şimşek" okunuyor, hale baskın
  olduğunda YIRTIK. Yanına iki koyu bulut dudağı (multiply) kondu —
  kontrastı ışık değil onun çevresindeki KARANLIK kurar.
- **object-position TELEFONDA ÖLÜ, GENİŞ KABUKTA BAĞLAYICI.** Ölçüldü:
  dört telefon kabuğunda düşey kırpma **0** (görsel 9:16, telefon daha
  uzun) — yani dikey hizalama yalnız masaüstü kabuğunda iş görür; orada
  %26 üç yüzün ikisini kesiyordu, **%40** üçünü de bantta tutuyor.
- **ARAYÜZ KONTRASTI GÖRSELE GÜVENMEZ.** Çubuğun arkasına ayrı bir dip
  karartması (`.sp-veil`, %40 yükseklik) kondu: görsel yarın AI ile
  değişse de yazının zemini değişmez.
- Ölçülen son durum (`_splashtest`, dört gerçek kabuk · üç faz):
  görsel 1080×1920 (**277 KB** — diskten ölçüldü; üretim günlüğünün
  bildirdiği 271 KB değil) · `on` **evet** · opaklık **1.00**
  (t=1200 ve t=4200, DÖRT kabukta da) · kırpma yan **11 · 14 · 42 · 47 px**
  / düşey **0** · ipucu kırpma **0** · durum satırı kırpma **0** · yatay
  taşma **0** · çubuk 247×26 · 293×27 · 344×31 · 379×34 · blok dibi
  **20 px** · ipucu↔çubuk **11 px** · konsol **temiz (0)**. En uzun ipucu
  (88 karakter) enjekte edilince: **3 satır** (281 px) / 2 satır
  (360-430), blok üstü 409 · 526 · 717 · 800 — blok her kabukta karartma
  bandının İÇİNDE kalıyor, yüzlerle çakışma yok.
- **TEZGAH, ÖLÇTÜĞÜ BELGENİN HAZIR OLMASINI BEKLEMEK ZORUNDA.** FAZ A
  (t=1200) son iframe'de "Cannot read properties" veriyordu; ölçüm artık
  `readyState === 'loading'` ise satırı "belge hazır değil" diye geçiyor
  — bir ölçüm aracının kendi yarış durumu, ölçtüğü kusur değildir.
- **AÇIK (kullanıcı kararı):** kadro, amaca çizilmiş tam boy bir dizilim
  değil; üç büst kozmik sahneye gömülü ve gövdeleri portrenin kendi
  dokusundan uzatılıp karanlığa eritiliyor. Merkezdeki ŞİMŞEK anime
  dilinde, yandaki ikisi resimsel — grade bunu yaklaştırır ama KAPATMAZ.
  Kredi/plan gelince istem `GOREV-higgsfield.md`de hazır; dosya adı
  sürümlenerek takas edilir.

### v35 — ON DÜNYANIN TAMAMI KOD İLE ÜRETİLDİ (2026-09-17)
### `game/_islegen.js` (arketip kiti + dekor) · `isleArt.js` TABLE · tezgah `_isletest.html`

Kullanıcı: *"senin yaptığın tasarımları beğendim, tüm haritalara uygulayalım."*
v34'te üç dünya kod üretimindeydi; kalan yedisi AI sprite'larındaydı.

- **YEDİ D&Uuml;NYA KOPYALANMADI, PARAMETRELEŞTİRİLDİ.** Ortak arketip kiti
  (şapel · kule · kapı · kubbe · dikilitaş · sütun sırası · kazıklı kulübe ·
  monolit · kristal · ocak · boss kalesi) + dünya başına MALZEME, AKSAN ve
  DEKOR. Aynı sayı iki yerde yaşamaz: siluet tavanı, pencere ritmi ve temas
  gölgesi her dünyada AYNI koddan çıkar.
- **HER DÜNYADA DÖRT AYRI SİLUET** (yatay · kapalı kütle · dikey · boss).
  Aynı arketipin üç tekrarı kart ızgarasında "konfeti" okunur (v29 kuralı).
  gokada ikinci adası bu yüzden çift sıra + alınlık aldı (hiclik'in yıkık
  sütun sırasıyla aynı siluete düşüyordu).
- **BİR NOKTANIN HANGİ UZAYDA OLDUĞU VARSAYILMAZ.** Kül dekorunun kor
  damarları bitiş noktasını (a,b) yerine EKRAN koordinatıyla kuruyordu:
  çizgiler adayı boydan boya geçip dışına taşıyordu (1:1 bakışta "çizik").
  Damar artık iki yakın (a,b) arasında, plato ile kırpılı.
- **DEKOR ZEMİN ÖĞESİDİR, YAPIDAN ÖNCE ÇİZİLİR.** Mezar taşı · saz · su
  birikintisi · kor damarı yapıdan SONRA çizilince binanın üstüne biniyordu.
  Sıra: kaya → etek → plato → DEKOR (plato ile kırpılı) → yapı → moloz.
- **DOLGU TONU YANLIŞ SEÇİLİRSE KUBBE "ÇUKUR" OKUNUR.** gokada kubbesi `lit`
  ile çizilmişti ve platodan KOYU kalıyordu; `hi` ile çizilince kütle
  yukarı çıktı. Tek ışık yönü yalnız gölge tarafını değil, TABAN tonunu da
  bağlar.
- **ADLANDIRMA GERİ DÖNÜŞÜ KORUR:** kod üretimi `_g1/_g2/_g3/_gb`, AI
  webp'leri (`mezarlik_1.webp` …) diskte KALIR. Geri dönmek = TABLE satırını
  eski ada çevirmek. Yeni ad = yeni URL, bayat bayt riski yok (v32/v33c).
- **ÇAPA DOĞRULAMASI TURUN SONUNDA TEKRARLANIR.** Dört dünya ikinci pasoda
  (kubbe · çift sıra · halkalar) yeniden pişti; boyut aynı kalıp ay/hw
  kayabilirdi. Ölçüldü: **40 satır · kayma 0** (eşik 0,004).
- **İLK İNDİRME İLE ÖNBELLEKTEN OKUMA AYNI SAYI DEĞİLDİR.** Tezgahın ilk
  koşusu dünya başına **2432-2809 ms** bildirdi ve bu bir regresyon gibi
  duruyordu; sebep 40 YENİ dosya adının hiç istenmemiş olmasıydı (ad
  değişti = yeni URL, v35 kuralı). Sayfa yenilenip ölçüm tekrarlandı:
  **73-134 ms**. Bir yükleme süresi, ölçüldüğü önbellek durumu yazılmadan
  tabloya girmez.
- Ölçülen son durum (`_isletest`, on dünya · 248×155 önizleme · 360×1180
  tırmanış · 150×94 kart): hepsi **ai** · plato örtme **0** · yatay taşma
  **0** · taç kesiği **0** (üst y = 1) · madalyon payı **+32…+42 px** ·
  örnek/px önizleme **1,64-1,82** · tırmanış **1,60-1,62** · kart
  **1,36-1,98** (on dünyada da 1,0-2,05 bandının içinde) · yükleme
  (önbellekten) **73-134 ms** · boyama önizleme 0-5 ms / tırmanış 1-4 ms ·
  BELLEK tam boy **12,29 MB** (KEEP=2) · thumb **5,32 MB** (on dünya) ·
  toplam **17,61 MB** · boşta `rev` artışı **0** · kırmızı hücre **0** ·
  konsol temiz.
- **KART YOLU EN DAR BANT.** On dünyanın kart örnek/px'i 1,36-1,98: tavana
  (2,05) en yakın olan yol hâlâ kart ızgarası, çünkü thumb tabanı DPR'den
  türer ve zincir 24'te biter. Yeni bir sprite eklenirse ölçülecek İLK
  sütun budur.
- Ölçülen: 40 webp · **1,21 MB** (24-40 KB/sprite; AI'nın 2,13 MB'ına karşı
  ~%43).

### v34 — SON ÜÇ DÜNYA KOD İLE ÜRETİLDİ (2026-09-17)
### `game/_islegen.js` (yeni) · `_islebake.js` (fırın) · `isleArt.js` · tezgah `_isletest.html`

Kullanıcı: *"sen kendin görsel üreterek higgsfield ile yapmaya çalıştığımıza
benzer harita önizlemelerini daha iyi hale getirebilir misin?"* buzul ·
kemikbahce · gokcark v33'te plan limiti yüzünden üretilememişti.

- **VARLIĞIN KAYNAĞI DEĞİŞİR, SÖZLEŞME DEĞİŞMEZ.** Üretici prosedürel ama
  çıktısı AI sprite'larıyla AYNI boru hattına girer: ölçülmüş `ax/ay/hw`
  çapası, kırpılmış webp, kimlik pişirmesi, mip zinciri, LRU + PİN.
  `skyMap`/`ui` tarafında BİR SATIR değişmedi — kompozisyon kodda kalır
  (v33 kuralı ①).
- **ÇAPA YİNE ÖLÇÜLÜR, BİLİNSE BİLE.** Fırın sprite'ı alfa kutusuna kırpar
  ve çapayı KIRPMA SONRASI koordinatta türetir; geometri bilindiği hâlde
  tasarım koordinatını doğrudan yazmak kırpma payını sessizce içeri alır.
- **"BÜYÜTME YOK" GİBİ, "KOYU YAZDIM" DA KANIT DEĞİL.** İkinci pasoda
  palet ~%22 koyulaştırıldı ve kontak sayfası BİREBİR AYNI göründü: aynı
  dosya adı, önbellekten eski bayt (v33c dersinin ajan tarafı). Ölçüm
  kapattı: yeni sprite'larda ortalama lüminans **0,212-0,228**, AI
  referansı mezarlik_1 **0,217** — aynı bantta. Kontak sayfası artık
  sürümlü adla yazılır (`_gen_c3.png`).
- **ZİNCİR NEREDE BİTERSE GRANÜLASYON ORADA BİTER.** Mip tabanı 40 px iken
  kart ızgarasında katedral **2,42 örnek/px** ölçüldü (dar sprite: 293 px
  tabanda zincir 36'da duruyor, kart ~15 px istiyor) — yani bandın ÜSTÜ,
  v33b'nin "lapa" kusuru. Taban 24'e indi (iki seviye daha, maliyet
  zincirin ~%1'i): katedral kart **2,42 → 1,68**.
- **KÜÇÜK ÖLÇEKTE FORMU PENCERE RİTMİ TAŞIR.** İlk paso "temiz low-poly"
  okunuyordu; düz taş yüzey 60-120 px'te kutu görünür. Gotik pencere
  sırası + tepe dikitleri + basamaklı (kademelere yuvarlanmış) kaya profili
  eklendikten sonra siluet "bina" okudu. Grain `source-atop` ile YALNIZ
  adanın üstüne düşer (şeffaf arka plana sızmaz).
- **1:1 BAKMADAN ONAY YOK (üç kalem burada yakalandı):** parlak beyaz kuyu
  diski ve kar yığını platoda "leke", eşit boy sarkıtlar "diş", ince uzun
  kemikler "anten"/"erişte" okunuyordu. Üçü de bantların içindeydi;
  yalnız bakışla görüldü.
- Ölçülen son durum (`_isletest`, on dünya): hepsi **ai** · plato örtme
  buzul/kemikbahce/gokcark **0** · yatay taşma **0** · taç kesiği **0** ·
  madalyon payı **+32…+34 px** · örnek/px önizleme **1,82-1,88** ·
  tırmanış **1,78-1,87** · kart **1,86-1,87** (on dünyada da 1,45-2,00,
  hepsi bantta) · yükleme (önbellekten) 23-42 ms · boyama 0-1 ms ·
  BELLEK tam boy **12,29 MB** (KEEP=2) · thumb **5,76 MB** (on dünya) ·
  toplam **18,05 MB** · boşta `rev` artışı **0** · konsol temiz.
- **İNDİRME BÜTÇESİ: 12 webp = 366 KB** (24-40 KB/sprite). AI'nın yedi
  dünyası 2,13 MB (28 webp, 42-138 KB); kod üretimi ~%80 daha hafif çünkü
  düz dolgu + faset webp'de çok iyi sıkışıyor.
- **AÇIK (kullanıcı kararı):** bu üç dünya AI yedisinin yanında daha
  GRAFİK/temiz okunuyor (foto-doku yok). Plan geri geldiğinde Higgsfield
  ile yeniden üretilebilir; `_islegen.js` + `_islebake.js` tezgahı yerinde
  kalır ve tabloda satırı olmayan dünya zaten sessizce prosedürele düşer.

### v33c — SÜRÜMLENMEYEN MODÜL OYUNCUYA HİÇ ULAŞMAZ (2026-09-12)

Kullanıcı: *"ana menüdeki harita önizlemeleri hâlâ eski hâlinde."*

- **KOD DEĞİŞTİ AMA URL DEĞİŞMEDİ → TARAYICI ESKİ BAYTI KULLANIR.**
  `index.html` `main.js?v=20260907e`, `main.js` da `ui.js?v=20260907e`
  yüklüyordu; ada kodu bu iki dosyaya girdiği hâlde sorgu eki
  artmadığı için oyuncunun sekmesi ÖNCEKİ modül grafiğini çalıştırmaya
  devam ediyordu. Ölçüldü (kullanıcının canlı sayfasında): `mainSrc`
  **`main.js?v=20260907e`** ve `isleStats().rev` **1234** — yani düzeltme
  öncesi çarkın kalıntısı hâlâ dönüyordu. `sw.js` suçlu DEĞİL
  (kapsam içi istekler networkFirst).
- **AİLE SABİT: İÇERİĞİ DEĞİŞEN HER MODÜLÜN EKİ AYNI TURDA ARTAR.**
  `isleArt.js` ve `skyMap.js` ilk yazımdan sonra da değişmişti ve ekleri
  sabit kalmıştı; dördü birden `?v=20260912i` yapıldı. (v32'nin
  "`force-cache` bayat bayt servis eder" dersinin modül hâli — o turda
  karo dosya adına ek koymuştuk, bu turda unutulan JS oldu.)
- **AJANIN ÖNZİZLEMESİ TAZE İNDİRİR, OYUNCUNUN SEKMESİ İNDİRMEZ.** Bu kusur
  bende hiç görünmedi: her `show_html` yeni bir belge kuruyor. "Bende
  çalışıyor" bir sürüm kanıtı değildir; şüphe varsa `eval_js_user_view`
  ile KULLANICININ yüklediği URL okunur.

### v33b — NETLİK: TEK ADIMDA 5-8 KAT KÜÇÜLTME LAPA YAPAR (2026-09-12)
### `game/isleArt.js` (mip zinciri) · `skyMap.js` · tezgah `_isletest.html`

Kullanıcı: *"görüntüleri net olmayanlar var, daha net göster."*

- **BÜYÜTME YOKTU AMA NET DE DEĞİLDİ.** İlk ölçüm "örnek/px 2,3-8,8"
  diyordu, yani sprite ekranda KÜÇÜLTÜLÜYORDU — ve kusur tam oradaydı:
  mip'i olmayan bir görüntüyü tek `drawImage` ile 5-8 kat küçültmek
  bilineer süzgece komşu pikselleri GÖSTERMEZ, aradan örnek atlar; sonuç
  hem yumuşak hem tırtıklı ("lapa"). **"Büyütme yok" netlik kanıtı
  DEĞİLDİR** — sözleşme bir BANTTIR: **1,0 ≤ örnek/px ≤ 2,05**. Tek uçlu
  bir ölçüt kusurun öbür ucunu görmez (dvh/clamp derslerinin netlik hâli).
- **ÇÖZÜM MİP ZİNCİRİ.** Yükleme anında her sprite yarıya inen seviyeler
  üretir (40 px'e kadar); çizimde ihtiyacı karşılayan EN KÜÇÜK seviye
  seçilir, yani küçültme hiçbir zaman 2 katı geçmez. Maliyet ~%33 bellek
  ve bir kerelik pişirme (ölçüldü: yükleme 74-162 ms).
- **SEÇİM CSS PİKSELİYLE YAPILMAZ.** Tuval DPR ile ölçekli (önizleme 2,
  tırmanış 1,6): CSS px ile seçmek retinada sprite'ı iki kat büyütmektir.
  İhtiyacın birimi CİHAZ PİKSELİDİR.
- **SABİT 0,49 VARSAYIMI %11 BÜYÜTME BIRAKIYORDU.** `hw` sprite'a göre
  0,44-0,494 arasında değişiyor; gerekli genişlik artık `rx / m.hw` ile
  sprite'ın KENDİ çapasından türer (ölçüldü: mezarlik önizleme 0,99 → 1,77).
- **SEVİYE ÇİZİM ÖLÇÜSÜNDEN SONRA SEÇİLİR.** İlk yazımda seviye `rx`ten
  seçiliyordu, oysa yükseklik tavanı (2,6·rx) ve taç kısması `dw`yi
  SONRADAN küçültüyor: seçilen seviye 2,5 kat fazla büyük kalıyordu
  (ölçüldü: katedral 2,51). `sp.lod(dw · DPR)` kesin ölçüden sonra çağırılır.
- **THUMB 128 → 320 px** (kart ızgarası DPR 2'de 128'i besleyemiyordu) ve
  tam boy yüklüyse HER ZAMAN o kullanılır — zaten bellekte, downscale bedava.
  (Taban sonradan DPR'ye bağlandı: bkz. bir alttaki madde.)
- **THUMB TABANI EKRANIN İHTİYACINDAN TÜRER, DEPOSU SINIRLIDIR (doğrulama
  bulgusu).** Thumb 128 → 320 px yapılıp üstüne mip zinciri eklenince
  thumb-only bir dünya **2,0-3,1 MB** tutmaya başladı ve `evict()` yalnız
  `full`a bakıyordu: on dünyalık kart ızgarası tek dokunuşta ~24 MB
  KALICI havuz kuruyordu (v32'nin "on karo 168 MB" dersinin thumb hâli).
  İki kapı: taban DPR'den türer (160; 320 ancak DPR ≥ 2,5'te çiziliyor —
  ölçüldü, DPR 1,25'te kart yolu 160'ı seçiyor) ve thumb deposu da LRU.
- **ÖNBELLEK TAVANI ÇALIŞMA KÜMESİNDEN KÜÇÜKSE ÖNBELLEK DEĞİL ÇARKTIR
  (ikinci doğrulama bulgusu).** THUMB_KEEP ilk yazımda 4'tü, oysa dünya
  seçimi ON kartı AYNI KAREDE çiziyor: her turda en az altı kart ıskalıyor →
  yüklüyor → `isles-ready` → dinleyici on kartı + ana haritaı yeniden
  boyuyor → yine ıskalıyor. Ölçüldü: **saniyede ~13 tur**, boşta bile,
  menüye dönüldükten sonra da (ağ değil CPU + GC: her tur 4 decode +
  tint + mip + on tuval). Tavan artık dünya sayısından türer
  (`max(6, WORLDS.length)`), üstelik olay TUR BAŞINA BİR KEZ yayınlanır
  (dört sprite = dört olay değil).
  Ölçüldü: tam boy **6,1 MB/dünya** (KEEP=2 → 12,23 MB), thumb
  **0,59 MB/dünya** (yedi dünya 4,15 MB; on dünya ≈5,9 MB), toplam
  **16,38 MB** · boşta `rev` artışı **0** (çark durdu) · örnek/px bantta
  (kart 1,83-1,97).
- Ölçülen son durum (`_isletest`): örnek/px önizleme **1,41-1,80** ·
  tırmanış **1,38-1,61** · kart **1,83-1,97** (hepsi bantta) · plato örtme
  0-18 px · taşma 0 · madalyon payı +16…+38 px · konsol temiz.
- **AÇIK: buzul · kemikbahce · gokcark HÂLÂ ÜRETİLEMEDİ** — bu turda engel
  kredi değil PLAN: üretim "Requires basic plan or higher" dönüyor.

### v33 — AI ADA VARLIKLARI · HARİTA ÖNİZLEMESİ + BÖLÜM ADACIKLARI (2026-09-09)
### `game/isleArt.js` (yeni) · `skyMap.js` · `ui.js` · `main.js` · tezgah `_isletest.html`

Kullanıcı: *"ana menüdeki haritaların önizlemelerini ve chapterdaki küçük
adacıkları premium olarak yeniden tasarlayalım."* Form kararları: ada **+
üstündeki yapı birlikte** · dünya başına **3 varyant + boss** · sanat dili
**karanlık gotik minyatür** · AI kendi rengini taşır, kod paletine hafifçe
çeker · on dünya · sprite başına ≤300 KB.

- **AI YALNIZ VARLIK ÜRETİR, KOMPOZİSYON KODDA KALIR** (zemin karosu
  dersinin ada hâli). `climbLayout`, düğüm yerleşimi, ilerleme okuması,
  bayrak ve ışık sütunu bir satır bile değişmedi; sprite yalnız prosedürel
  kaya+çim+yapı kütlesinin yerine geçer. Gök, ay, bulut, vinyet prosedürel.
- **ÇAPA ÖLÇÜLÜR, VARSAYILMAZ.** Sprite'ın plato hattı = alfa maskesinin EN
  GENİŞ SATIRI (kesimde ölçüldü, `ax/ay/hw` olarak 0..1 saklanır). Kırpma
  kutusunun ortasını çapa saymak yanlış olurdu: yapı yüksekliği sprite'tan
  sprite'a değişiyor, bbox merkezi plato ile ilgisiz.
- **`hw` YARI GENİŞLİKTİR — BİR DE 2 İLE ÇARPILDI VE ADALAR İKİ KAT ÇIKTI.**
  Ölçüldü: 248×155 önizleme kutusunda boss 236 px istiyordu (çerçeveyi
  yiyordu). Doğrusu `dw = rx / hw`. Bir normalize değerin hangi yarıyı
  temsil ettiği ÖLÇÜLMEDEN çarpan yazılmaz.
- **TAÇ KESİLMEZ.** Yerleşim yalnız plato hattını hizalarsa yapının tepesi
  tuvalin dışında kalabilir (ölçüldü: mezarlik −11, kul −6, katedral −15 px).
  Sprite yukarıda kalan pay kadar KISILIR; dikey tırmanışta tavan yapışkan
  başlığın örttüğü banttır (`climbLayout` ile aynı sözleşme), önizlemede
  tuvalin kendisi.
- **DERİNLİK İSTİFİ KUSUR DEĞİLDİR, PLATO ÖRTME KUSURDUR.** İlk ölçüt iki
  ada kutusunun kesişimini sayıyordu ve 56-160 px "bindirme" bildiriyordu —
  oysa alttaki adanın üsttekinin KAYA DİBİNİ kapatması sahnenin ta kendisi.
  Doğru ölçüt: alttaki sprite üsttekinin PLATO HATTINI (düğümün oturduğu
  yer) geçiyor mu? Ölçütü değiştirmek kusuru gizlemek değil, doğru ekseni
  bulmaktı — ve o eksende katedral gerçekten kaldı (73 px, 1:1 bakışta
  "yığın").
- **TAVAN SEÇİCİ OLMALI.** Dikey yapılar (çan kulesi 293×544) plato
  genişliğine göre ~3,8 kat boy istiyor; düğüm aralığı ise ~1,4·rx. Tavan
  3,6·rx → 2,6·rx yapıldı: normal ada zaten ~2·rx boyunda olduğu için
  ONLARA DOKUNMAZ, yalnız uzun silueti kısar. Ölçüldü: katedral 73 → 18,
  gokada 40 → 18, kul 5 → 0.
- **ON DÜNYA TAM BOY SPRITE TUTAMAZ.** 4 tuval × ~4,8 MB × 10 = 48 MB, üstelik
  dünya seçim ızgarası on kartı BİRDEN çizer. İki depo: `full` (LRU KEEP=2 +
  PİN) ve `thumbs` (128 px, kalıcı, ~0,25 MB/dünya). Kart thumb'dan, sahne
  tam boydan çizer; ikisi de AYNI normalize çapayı okur.
- **KİMLİK PİŞİRMEDE, BOYAMADA DEĞİL.** Ham sprite gri-gotik; dünya tonu
  yükleme anında bir kez `source-atop` ile işlenir (%7 dünya rengi + dipten
  %16 glow + %8 gece yıkaması). Kare başına ve boyama başına sıfır maliyet.
  İlk deneme %10 + %22 idi ve mezarlık "pembe" okunuyordu.
- **VARLIK GELDİĞİNDE SAHNE TAZELENMEK ZORUNDA.** `_mapKey` ve skyMap
  önbelleği aksi hâlde prosedürel boyamayı sonsuza dek geçerli sayar (v29b
  dersi). `isles-ready` olayı → `_mapKey` sıfırlanır + `_islesRepaint()`
  yalnız TUVALİ yeniden boyar (sayfa kurulmaz, kaydırma korunur). skyMap
  önbellek anahtarına `islesRev()` girer.
- **MAGENTA ANAHTAR: YARI ÖRTÜLÜ İNCE ÖĞE TAM ALFA ALIR.** Kesimin ilk
  sürümü despill'i `alfa < 0,99` kapısına bağlamıştı; %50 karışmış bir kök
  pikseli arka plandan 180 birim uzak olduğu için TAM ALFA alıp kapıdan
  kaçıyor ve mezarlık kökleri parlak mor kalıyordu (1:1 bakışta görüldü).
  Despill gücü ALFADAN değil MAGENTA FAZLASINDAN türer (fazla>55 → tam),
  böylece meşru mor taş (gokada, fazla ~35) dokunulmadan geçer.
- Ölçülen son durum (`_isletest`, 248×155 önizleme · 360×1180 tırmanış):
  yedi dünya **ai** · üçü **proc** (henüz üretilmedi) · yükleme 29-43 ms
  (önbellekten) · boyama önizleme 0-2 ms / tırmanış 0-2 ms · plato örtme
  0-18 px · yatay taşma **0** · taç üst y ≥ 0 (kesik yok) · PİN çalışıyor ·
  tam boy önbellek 2 dünyada duruyor · konsol temiz. Varlık toplamı
  **2,13 MB** (28 webp, 42-138 KB).
- **AÇIK: buzul · kemikbahce · gokcark ÜRETİLMEDİ** (Higgsfield kredisi
  bitti). Tabloda satırı olmayan dünya sessizce prosedürel yüzeye düşer
  (ölçüldü: üç satır `proc`, taşma 0, konsol temiz).
- **BOSS MADALYONU SPRITE'IN DERİNLİĞİNDEN TÜRER (doğrulama bulgusu).**
  `ui.js:1531`'deki 0,75·rx kaydırma prosedürel `rockPath` derinliğine
  (rx·1,0) göre ayarlanmıştı; AI adası %20 daha SIĞ (mezarlik_b 0,80·rx)
  ve madalyon adanın ucundan **24,7 px** taşıp havada asılı okunuyordu
  (ölçüldü: disk alt kenarı 287,8 · ada ucu 263,1). Çözüm sihirli sayıyı
  değiştirmek değil, kaynağını değiştirmekti: `isleDepthBelow()`
  `(1−ay)·(h/w)/hw` döner, kaydırma onun %40'ı; prosedürel dal 0,75·rx
  kalır. Tezgahta yeni ölçüt "madalyon payı" (disk alt kenarı ↔ ada ucu):
  yedi dünyada **+16…+38 px içeride**.
- **AÇIK (gerçek telefonda bakılacak):** boss düğümü `ui.js:1531`'de
  0,75·rx AŞAĞI kaydırılır (kaleyi örtmesin diye, prosedürel kütleye göre
  ayarlanmıştı). AI adasının piramidi o derinlikte ~%25 genişlikte olduğu
  için madalyon adanın ucuna yakın duruyor. Ölçülmüş bir regresyon DEĞİL
  (prosedürel kaya da aynı derinlikte inceliyordu), ama 1:1 telefonda
  bakılıp gerekirse AI dalında 0,45·rx'e çekilmeli. → KAPANDI (bkz. üstteki
  madalyon maddesi): kaydırma ölçülen derinliğe bağlandı.

### v32 — DÖRT YÜZEY YENİDEN · DÖŞENME PİPELINE'I DÜZELTİLDİ (2026-09-09)
### `game/assets/terrain/{katedral,buzul,tuzla,kemikbahce}.png` · tezgah `_aiwiretest.html`

Kullanıcı: *"kalan haritaları da higgsfield ile yeniden tasarlayalım."* On karo
zaten AI'dı; **kontak sayfası çıkarılıp 1:1 bakıldı** ve dördü kural ①'i
(FORM OPAKTIR) ihlal ediyordu: katedral pembe-mor bulanık leke, buzul iki
saç teli çizgi, tuzla formsuz soluk düzlük, kemikbahce kemik değil çamur.

- **KÖR ÜRETİM YOK: ÖNCE KONTAK SAYFASI.** On karonun 1:1 merkez kırpması tek
  görüntüde yan yana konmadan hangisinin zayıf olduğu bilinemez; "hepsi ai"
  diyen bir tablo malzemenin İYİ olduğunu söylemez (v31'in tabloları yeşildi).
- **İSTEM YASAK LİSTESİ ÇALIŞIYOR AMA YETMEZ — İKİ RET DAHA.** katedral ilk
  denemede ortasına **iri pirinç halka** koydu (döşenince 900 px'te bir aynı
  halka = duvar kâğıdı) ve plakaları tuğla dizisi yaptı; buzul yine **YUVARLAK
  HÜCRE** verdi. İkinci istemde işe yarayan iki cümle: *"no single large focal
  feature of any kind (uniform in interest across the whole frame, no
  landmark)"* ve *"long STRAIGHT fracture lines … no round cells, no oval
  cells, no closed rings, no lily pads"*. Bir dokuda İRİ TEK ÖĞE yasaktır —
  desen değil LANDMARK olur.
- **KAZANÇ IZGARASI VİNYET İÇİNDİR, İÇERİK İÇİN DEĞİL.** 32×32 hücre (64 px)
  bilineer uygulanınca yüzeyin kendi formunu düzlüyordu. Izgara AĞIR
  bulanıklaştırılır (3 paso, r=3) ve kelepçe 0,88-1,14; böylece yalnız geniş
  gradyan düzelir.
- **DİKİŞ ÖLÇÜTÜNÜN BÖLENİ TEK KOLONDAN OKUNMAZ.** İlk ölçüt iç gradyanı
  ORTA kolondan alıyordu; o kolon düz bir plakanın içine düşünce oran şişip
  2,0-2,5 bildiriyordu. Bölen 64 iç kolonun ortalamasıdır.
- **DİKİŞ KURULDUKTAN SONRA YENİDEN ÖLÇEKLEME DİKİŞİ BOZAR.** %13 bant
  geçişi N=W−B üretir ve N'yi 2048'e geri büyütmek oranı 1,45 → 2,00'a
  çıkarıyordu. Doğrusu: kaynağı ÖNCE 2354'e büyüt, bandı oradan al, kırpma
  **POT 2048'de bitsin** — geçişten sonra tek piksel bile yeniden
  örneklenmez.
- **DİKEY PASO YATAY SARMAYI EZİYORDU.** İki ayrı eksen pasosu köşede
  birbirini bozuyor; çapraz geçiş **4 köşeli tek adımda** (wA·wX·wY·wXY)
  yapılır.
- **ÇEYREK DÜZLEMESİ DİKİŞTEN SONRA YAPILIR VE KAZANÇ ALANI DA DÖŞENEBİLİR
  OLMAK ZORUNDA.** Dikişten önce düzlenen çeyrek boşa gider — kırpma sonrası
  çeyrekler BAŞKA pikselleri kapsar (ölçüldü: tuzla 3 paso ile 0,0343 → 0,0144
  indi, kırpmadan sonra **0,0306**, yani başladığı yerden kötü). Paso sıraya
  girdi (dikiş → sarmalı kazanç, ızgara bulanıklaştırması ve bilineer
  örnekleme modülo ile dolanır): tuzla **0,0047**.
- **TEZGAH ONU BİRDEN ÖNYÜKLEYEMEZ (ölçüldü).** `preloadAiDetail()` argümansız
  çağrılıp sonra on harita pişirilince `KEEP=2` LRU sekiz karoyu PİŞMEDEN
  atıyor ve tablo sekiz satırda `proc` okuyordu — tezgah AI yolunu hiç
  sınamadan "normal" görünüyordu. Karo artık O SATIRIN pişirmesinden hemen
  önce yüklenir (sahadaki koşul da bu: oyuncu tek harita görür).
- **ÖLÇÜM KENDİ TUTTUĞU REFERANSI KUSUR DİYE BİLDİRİYORDU.** Tablo
  `A.detail.width`i RAPOR anında okuyordu; tezgah on arenayı canlı tuttuğu
  için `KEEP=2` erken tuvalleri bırakmış ve sekiz satır `tuval 0²` / `örnek/px
  0` yazıyordu. Değer PİŞİRME anında yazılır (`r.wA`).
- Ölçülen dikiş (yatay/dikey) ve çeyrek sapması: katedral **0,97/0,69** ·
  0,0014 · buzul **0,76/1,55** · 0,0142 · tuzla **0,86/0,98** · 0,0047 ·
  kemikbahce **1,08/0,96** · 0,0064. Boyut 6,2 · 7,0 · 8,8 · 8,6 MB.
- **BUZUL ÇEYREK SAPMASI İÇERİKTİR (0,0142), VİNYET DEĞİL:** kelepçe yalnız
  açık su deliğinin bulunduğu hücrelerde bağlıyor; daha fazla kısmak değer
  yapısını (near-black su) düzler. Kabul edildi, yazılı bırakıldı.
- **`force-cache` BAYAT BAYT SERVİS EDER — DOSYA ADI SÜRÜMSÜZSE YENİ YÜZEY
  OYUNCUYA HİÇ ULAŞMAZ (doğrulama bulgusu).** Karo `fetch(url, { cache:
  'force-cache' })` ile inilir; bu, baytları yeniden DOĞRULAMADAN verir.
  Aynı tuzak ölçümü de yaladı: `_aiwiretest` dört yenilenen karonun ESKİ
  baytlarını okuyup yeni yüzeyi ölçtüğünü sanıyordu (mid katedral 0,038 ·
  buzul 0,21 · tuzla 0,303 · kemikbahce 0,144 — hepsi yanlış). `TABLE`'da
  değişen satıra `?v=20260909` eklendi; dokunulmayan altı yüzey yeniden
  indirilmez. Sürüm ekinden sonra ölçülen gerçek mid: katedral **0,032** ·
  buzul **0,157** · tuzla **0,348** · kemikbahce **0,276**.
- **BAYAT-BAYT ŞÜPHESİ ÖLÇÜLEREK KAPATILIR, VARSAYILARAK DEĞİL.** Aynı şüphe
  `_aitertest` için de vardı (o da kendi yolundan, sürümsüz okuyor). Tezgaha
  `?fresh=<RUN_ID>` eklendi — daha önce hiç istenmemiş URL, önbellekten gelmesi
  imkânsız — ve bileşik sayılar **birebir aynı** çıktı: o tablo zaten tazeydi.
  İki tezgahtan biri bayat, öbürü değil; "ikisi de şüpheli" diye ikisinin
  sayısını atmak da ölçmemek kadar yanlıştır.
- Ölçülen son durum (`_aiwiretest?tier=high`, sürüm ekli · taze indirme): on
  satırın **hepsi ai** · karo 900 · uDetailRep 4,76 · **2,28 örnek/px** · tuval
  2048² · pişirme AI **13-45 ms** / proc 47-104 ms (**onunda da AI ucuz**) ·
  ilk karo önyüklemesi 164 ms · yenilenen dört karonun ilk indirmesi 1465-2223
  ms (sonraki açılışlarda önbellekten) · konsol temiz.
  Bileşik bant (`_aitertest`, 1000 px kadraj · kroma 0,35 · `?fresh` ile
  doğrulandı), AI ort/doygunluk:
  mezarlik 49,2/0,209 · kul 37,6/0,174 · bataklik 35,9/0,147 · katedral
  44,8/0,301 · hiclik 43,8/0,237 · gokada 41,7/0,260 · tuzla 39,2/0,111 ·
  buzul 44,0/0,392 · kemikbahce 33,5/0,208 · gokcark 38,4/0,306 — **onu da
  26-52 bandında**, p95 56-91 (<150), doygunluk on yüzeyde de prosedürelin
  ALTINDA.
- **AÇIK RİSK (kullanıcı kararı bekliyor): buzul doygunluk 0,392** — bandın
  içinde (<0,42) ama on yüzeyin en yükseği ve prosedürelin (0,406) yalnız bir
  tık altında. Sebep kural ⑤'in mavi hâli: doygun mavi detay × doygun mavi
  makro. Temiz kol harita başına kroma ezmesi (`CHROMA_BY_ID = { buzul: ~0,22 }`);
  bu turda BİLEREK yazılmadı, çünkü "kroma 0,35 · makroda kalır" kullanıcı
  kararıydı.
- **SIRADAKİ (bu turda YAPILMADI):** gokcark (altıgen fayans tekrar riski) ve
  kul (asfalt grisi) ikinci dalga; gerçek telefonda 60 fps ve VRAM ölçümü
  (yalnız kullanıcı yapabilir: sol üst köşeye üç dokunuş / `?perf=1`).

### v31 — AI ZEMİN MALZEMESİ · PİLOT İKİ HARİTA (2026-09-08)
### `game/aiDetail.js` (yeni) · `arenaMaps.js` · `main.js` · tezgahlar `_aitertest.html` · `_aiwiretest.html`

Kullanıcı: *"Higgsfield ile bütün haritaları yeniden tasarla, A++ premium."*
Seçimler (form): yalnız **malzeme** (kompozisyon·yol·nesne kodda kalır) · CR eli ·
bant korunur · pilot mezarlık + kül · kalite öncelikli · kor MAKRODA kalır ·
karo 900 · kroma 0,35. Onaylanan adaylar: ikisinde de **A**.

- **PIPELINE'A EN AZ RİSKLİ YERDEN GİRİLİR.** AI görüntüsü yalnız DÖŞENEN
  detay karosudur; makro (kompozisyon·yol·plaka·nesne tabanları·kor) prosedürel
  kalır. Tek bir AI "arena resmi" yol ve nesne hizasını bozardı — oynanış
  verisi ile süs verisi aynı görüntüden gelemez.
- **DETAY KATMANI KROMA TAŞIMAZ (kural ⑤ — artık AI için de).** Ham karo kendi
  rengini taşıyor; kroma LİNEER uzayda 0,35'e kısılır (sRGB'de kısmak koyu
  pikselleri orantısız soldurur). Kimlik rengi MAKRODA yaşar, yoksa on harita
  tek bir "AI grisi" altında erir.
- **mid, KISMADAN SONRA ÖLÇÜLÜR.** Şader detayı kendi lineer ortalamasına
  böler; kroma kısması ortalamayı kaydırır. Ham karodan okunan mid yanlış
  parlaklık verir. Formül `arenaMaps.linearMean` ile BİREBİR aynı (iki farklı
  ortalama = prosedürel ve AI yüzeyler farklı parlaklıkta).
- **ÖRNEK/PX KADEMELER ARASI SABİTTİR — ÖLÇÜLDÜ VE İLK SEFER KAÇIRILDI.** "Kademe
  dokuyu yarıya indirir, karo boyu DEĞİŞMEZ" diye yazıldı; ölçüm 1024² dokuda
  900 px karo ile **1,14 örnek/px** verdi — prosedürel yolun 2,0'sının ALTI, yani
  "premium" diye eklenen doku düşük kademede eski yüzeyden DAHA bulanık çıkıyordu.
  Karo artık dokudan türer (`tile = S / 2,276`): 2048→900, 1024→450. Bir sabitin
  hangi ucunun bağladığı ÖLÇÜLMEDEN yazılmaz (clamp/cqw derslerinin tekrarı).
- **HAM AI GÖRÜNTÜSÜ DÖŞENEBİLİR DEĞİLDİR.** Ölçüldü: kenar/iç gradyan oranı
  2,2-5,0 (kesin dikiş) ve çeyrek parlaklık sapması 0,09 (modelin kendiliğinden
  koyduğu vinyet — "düz ışık, vinyet yok" istemine rağmen). İki pasoda kapandı:
  32×32 alçak frekans kazanç ızgarası (vinyet düzleştirme) + %13 bant çapraz
  geçişi. Sonuç: dikiş oranı **1,21·1,72·1,53·1,41**, çeyrek sapması **≤0,008**.
- **BANT BİR ÖLÇEĞE AİTTİR.** `_aitertest` yerel kontrastı 8×8 pencereyi 324 px'lik
  kırpmada okur; CLAUDE.md'deki 4-14 bandı `_terrtest` ölçeğine ait. İkisi
  karşılaştırılmaz — tezgahta geçerli olan PROSEDÜREL SÜTUNA GÖRE farktır (Δ).
- **AYNI YÜZEYİ İKİ KEZ ÜRETMEK BEDAVA DEĞİLDİR.** AI karosu varsa prosedürel
  detay HİÇ pişmez: ölçülen pişirme mezarlık 224 → **132 ms**, kül 180 → **70 ms**.
  Isıtma çağrısı bilerek `ai:false` ile prosedürel yolda kalır (perf kuralı 5:
  ısıtmanın amacı boyacı kitinin kod yollarını derletmek).
- **AĞDAN GELEN VARLIK SAVAŞTA BEKLEMEZ.** Karo yükleme + kroma kısması (ölçülen
  **762 ms**, iki karo) açılış çubuğuna taşındı (`Warmup` bir Promise dönerse
  bekler). Yüklenmeyen karo sessizce prosedürel yüzeye düşer — tabloda olmayan
  harita da (ölçüldü: `bataklik` → `proc`, karo 512, 2,0 örnek/px).
- **SW'YE LİSTE EKLENMEDİ:** `game/sw.js` kapsam içi istekleri networkFirst +
  önbellek yedeği ile geçiriyor, yani yeni PNG'ler ilk getirmede çevrimdışı
  pakete kendiliğinden giriyor (elle precache listesi YOK).
- Ölçülen ilk durum (`_aiwiretest`, tex=512 dalı): mezarlık **ai** · karo 450 ·
  uDetailRep 9,51 · 2,28 örnek/px · mid 0,030 (proc 0,037); kül **ai** · mid 0,029
  (proc 0,026); bataklik **proc** · 512 · 2,00; önyükleme 762 ms; konsol temiz.
  Bileşik bant (`_aitertest`, 1000 px kadraj · kroma 0,35): mezarlık ort 49,3 ·
  doy 0,208 · Δkontrast +10,2; kül ort 37,7 · doy 0,173 · Δ−5,2.
- **BİR MODÜLÜ İKİ FARKLI SORGUYLA İÇE ALMAK İKİNCİ BİR DÜNYA KURAR (doğrulama
  bulgusu).** `aiDetail.js` `perf.js?v=20260725p`, oyun ise `?v=20260901t`
  yazıyordu: farklı URL = farklı modül örneği = **init edilmemiş ikinci bir
  `Quality`**. Ölçüldü: kopya "mid · tex 512" derken oyun "high · tex 1024"
  idi, yani onaylanan 2048²/karo 900 sözleşmesi sahaya **1024²/karo 450**
  (rep 9,51) olarak iniyordu — hem yarı çözünürlük hem BAŞKA BİR DÜNYA ÖLÇEĞİ.
  "main.js kademeyi es geçiyordu" dersinin tekrarı; üstelik tezgah da aynı
  yanlış kopyayı okuduğu için kusuru "kademe tex=512" diye normal gösteriyordu.
- **TEZGAH KADEMEYİ KENDİ KURMAK ZORUNDA.** Sayfa oyunun açılışını koşturmadığı
  için `Quality` varsayılan 'mid'te kalıyor ve ölçüm sahadaki cihazı temsil
  etmiyordu (v29b'nin "yükseklik dalı simule edilmeden ölçülmez" dersinin
  kademe hâli). `_aiwiretest` artık `Quality.init(?tier=high|mid|low)` ile
  dalı seçer; varsayılan **high**.
- Ölçülen son durum (`_aiwiretest?tier=high`): mezarlık **ai** · karo **900** ·
  uDetailRep **4,76** · **2,28 örnek/px** · tuval **2048²** · mid 0,031 (proc 0,032) ·
  pişirme 143 ms (proc 442 — **−299 ms**); kül **ai** · mid 0,030 (proc 0,027) ·
  85 ms (proc 307 — **−222 ms**); bataklik **proc** · 640 · 3,20; önyükleme
  1246 ms (high, 2048² iki karo); konsol temiz. Canlı oyunda (doğrulayıcı):
  `detailSrc=ai`, `uDetailBreak 0,34`, PNG'ler 200.
- **ON HARİTA TAMAM (ikinci paso).** Kalan sekiz karo üretildi ve aynı iki
  pasodan (vinyet düzleme + %13 bant çapraz geçişi) geçti. İkisi REDDEDİLDİ
  ve yeniden üretildi: `hiclik` parlak mavi CAM FAYANS çıktı (satır-kolon
  kafesi + gloss; "tekrar anında okunuyor"), `buzul` YUVARLAK HÜCRE örgüsü
  ("çatlamış çamur / sürüngen derisi") okundu. İstemde YASAK LİSTESİ işe
  yaradı: "not a grid, not bathroom tiles" · "not round cells, not reptile
  skin". Bir istem ne İSTEDİĞİNİ kadar ne İSTEMEDİĞİNİ de yazmak zorunda.
- **TABAN 0,004 — 0,02 DEĞİL (ölçüldü).** `linearMean` tabanı bataklık
  karosunda BAĞLAYICI çıktı (gerçek ~0,015 &lt; taban 0,02): normalizasyonun
  böleni gerçek ortalamanın üstüne çıkınca zemin sessizce KARARIYOR. Taban
  yalnız sıfıra bölmeyi engeller, parlaklık politikası değildir — clamp
  dersinin (hangi uç bağlıyor?) dördüncü tekrarı.
- **ON KARO AÇILIŞA KONMAZ.** Ölçüldü: on karo önyüklemesi high kademede
  **8837 ms**. Oyuncu bir görevde TEK harita görür. Üç kapı: açılış çubuğu
  yalnız şu ANKİ dünyanın karosunu bekler · perde kapanırken kalanı
  `requestIdleCallback` ile gelir · `startRun` perde arkasında o karoyu
  BEKLER (1800 ms tavan). İndirilmiş karo iki kez indirilmez
  (`inflight` + `cache`).
- **BİR KANCA, HANGİ YOLDAN GEÇİLDİĞİ ÖLÇÜLMEDEN YAZILMAZ (doğrulama bulgusu).**
  Boş zaman önyüklemesi ilk sefer `quitToMenu()` içine kondu — o metot
  yalnız oyuncu SAVAŞTAN menüye dönerken çalışır. Taze açılışta menüye
  başka yoldan gelindiği için blok HİÇ çalışmıyordu (ölçüldü: menüde
  `_tilesPrefetched` undefined, /terrain/ isteklerinde yalnız mezarlik_a.png)
  ve `bakeArenaMap('katedral')` **proc** dönüyordu — yani 2-10. dünyalar eski
  yüzeyde açılıyordu. Çağrı artık açılış perdesinin kapanışına
  (`runSplash → finish → prefetchTiles`) bağlı; `quitToMenu`daki tekrar
  zararsız (cache + inflight).
- **KAPI KURULUMDAN ÖNCE AÇILIRSA PERDE BOŞA DÜŞER.** Karo beklemesi ilk
  yazımda yalnız `_startRunNow`ı geciktiriyordu; 2400 ms'lik perde saati ise
  hemen başlıyordu, yani perde kurulum bitmeden serbest bırakabilirdi.
  Kurulum ve perde tutması TEK bir `begin()` içinde, aynı sırada.
- Ölçülen son durum (`_aiwiretest?tier=high`, on harita): hepsi **ai** · karo
  **900** · uDetailRep 4,76 · **2,28 örnek/px** · tuval 2048²; pişirme (AI/proc):
  mezarlik 163/457 · kul 92/325 · bataklik 132/309 · katedral 204/284 · hiclik
  82/203 · gokada 127/324 · tuzla 131/292 · buzul 122/269 · kemikbahce 106/298 ·
  gokcark 203/284 ms — **on satirda da AI daha ucuz**. Bileşik bant
  (`_aitertest`, 1000 px kadraj · kroma 0,35), ort/doygunluk: mezarlik 49,3/0,208 ·
  kul 37,7/0,173 · bataklik 36,0/— · katedral 43,7/0,329 · hiclik 43,9/0,237 ·
  gokada 41,8/0,260 · tuzla 40,7/0,082 · buzul 48,9/0,264 — hepsi 26-52 bandında,
  doygunluk on yüzeyde de prosedürelin ALTINDA (kroma makroya bırakıldı).
- **HAZIR KARO SAYISI SINIRLI — YOKSA ON HARİTA 168 MB TUTAR (ölçüldü).**
  İlk yazımda `cache` her hazırlanan karoyu SÜRESİZ tutuyordu: 2048²×4 =
  16 MB × 10 = **168 MB** tuval destek deposu, üstelik boş zaman önyüklemesi
  onunu birden pişirdiği için bu tepe SAHADA gerçekleşiyordu. Oyuncu bir
  görevde TEK harita görür: `KEEP = 2` (şu anki + yedek), atılan karonun
  destek deposu `width = height = 0` ile ANINDA bırakılır (GC beklenmez —
  `_terrtest` dersinin tekrarı). Boş zaman artık yalnız BAYTLARI ısıtır
  (`warmAiDetailBytes`, fetch + HTTP/SW önbelleği), tuval kurmaz.
  Ölçüldü (`_aivramtest?tier=high`, on dünya sırayla): tepe **2 karo /
  32 MB**, on harita da **ai** · karo 900 · pişirme 16-50 ms.
- **DEKOD ANA İPLİKTE YAPILMAZ.** `new Image()` + `decoding:'sync'` ile karo
  hazırlama **1315-1688 ms** ölçüldü — perde kapısı 1800 ms, yani yavaş bir
  telefonda harita sessizce prosedürele düşerdi (kapı "var" ama işe yaramaz).
  `fetch` + `createImageBitmap` (ayrı iplikte çözme) ile aynı iş **165-218 ms**
  (ilk çağrı 487 ms, JIT). Bir zaman aşımı değeri, koruduğu işin gerçek
  süresi ölçülmeden "yeterli" sayılamaz.
- **BİR ÖNBELLEK, KAYITLARININ DIŞ DÜNYADA CANLI OLUP OLMADIĞINI BİLMEK
  ZORUNDA (doğrulama bulgusu).** `KEEP = 2` LRU'su hangi karonun KULLANIMDA
  olduğunu bilmiyordu: ölçüldü, oyun ortasında üç harita hazırlanınca
  `evict()` OYNANAN haritanın tuvalini boşaltıyor ve `game.arenaDetail`
  **[0,0]** oluyordu. Kusur SESSİZ (GPU'daki doku ekranda yaşamaya devam
  eder) ama bağlam kaybı kurtarması dokuyu yeniden yükleyince zemin detayı
  boş döner ve `_lastDetailCanvas` aynı boş tuvali gösterdiği için bir daha
  kurulmaz. Çözüm: KULLANIM = PİN — `aiDetail(id)` (bakeArenaMap'in tükettiği
  an) karoyu pinler, `evict()` pinliyi ASLA atmaz, pin değişinceye kadar.
- **TEST ETTİĞİ YOLU ÖNCE KURMAYAN TEST, GEÇTİĞİNİ KANITLAMAZ.** Bu pin
  regresyon testinin ilk yazımı on harita döngüsünden sonra doğrudan
  `bakeArenaMap('mezarlik')` çağırıyordu; mezarlık önbellekten çoktan
  atılmış olduğu için çağrı PROSEDÜRELE düşüyor ve test 2048² bir
  prosedürel tuvalle yeşil yanıyordu — AI yolunu hiç sınamadan.
  Test artık önce `preloadAiDetail('mezarlik')` çağırır ve
  `detailSrc === 'ai'` olduğunu doğrular.
- Pin ölçümü (`_aivramtest?tier=high`): kaynak **ai** · pin **mezarlik** ·
  üç karo daha hazırlandıktan sonra önbellek **[mezarlik, gokcark]** · canlı
  tuval **2048×2048 korundu** · tepe 2 karo / 32 MB · karo yükleme 144-404 ms ·
  pişirme 17-56 ms.
- **KARAR: PNG KALIYOR — İNDİRME BÜTÇESİ 84,8 MB** (on PNG, 6,7-9,4 MB;
  kullanıcı seçimi 2026-09-08). Gerekçe: karolar hepsi birden inmiyor —
  dünya başına ~8,5 MB, istendiğinde, ve SW önbelliğine giriyor. WebP
  çevrimi bilerek YAPILMADI (2048² kodlama tezgahta 30 sn sınırını aşıyor;
  ayrıca kullanıcı "kalite öncelikli" dedi). Play Store paketi bu boyutu
  taşıyacak — tekrar açılacaksa önce bu satır okunur.
- **KARAR: `tuzla` KİMLİK RENGİ MAKRODA KALIYOR** (kullanıcı seçimi). Bileşikte
  tuz düzlüğü tuzdan çok kül okunuyor (ort 40,7 · doygunluk 0,082, on
  yüzeyin en düşüğü) ve bu BİLEREK böyle: kroma makronun işi (kural ⑤).
  İstenirse `TONE.tuzla` ile açılır.
- **SIRADAKI (bu turda YAPILMADI):** gerçek telefonda 60 fps ve VRAM ölçümü
  yapılmadı — yalnız kullanıcı yapabilir (sol üst köşeye üç dokunuş / `?perf=1`).

### v30 — ETKİNLİK ALANI + ÜST ŞERİT İKİLİSİ (2026-09-07)
### `style.css` v30 · `ui.js` · `index.html` · tezgah `_v30test.html`

Kullanıcı: *"Etkinlik alanı daha şık olsun; görevler sekmesini ana menüde
savaş biletinin yanına koyalım, ayarlar da gemin hemen sağında olsun."*

- **YENİ BİR ÖĞE SATIRA GİRDİĞİNDE KOMŞUSUNUN BİLGİSİNİ YER.** Dişli
  (42 px) cüzdan satırına taşındı ve ÖLÇÜLDÜ (281 px kabuk): seviye
  çubuğu 49 → 30 px'e çöküyor, "20/86" 6 px kırpılıyor ve daha kötüsü
  BAKİYE SAYILARI kırpılıyor (altın 9 · gem 8 px) — çünkü `.tb-cur`
  esneme yasağı taşımıyor. Feda sırası: bakiye ve seviye SAYISI bilgidir,
  "+" pulu yalnız affordance'tır (pulun kendisi zaten dükkâna götürür).
  Dar kabukta (≤340 px kapsayıcı) pul düşer: 22 px/pul = 44 px kazanç,
  kırpma **0**. Eklenen her öğeden sonra komşuların kırpması ölçülür.
- **BİR PİKSEL KIRPMA DA ELLIPSIS DEMEKTİR.** İkili satırda `.tq-title`
  ve `.tq-sub` 1 px taşıyordu → "GÖREVLE…". Pay ikondan (25→22) ve harf
  aralığından alındı; bant zaten dokunulabilir olduğu için "AÇ" pulu
  (`.bpb-cta`, ~40 px) bu satırda gizlendi — pul süs, başlık bilgi.
- **MOR BU PALETTE GEM RENGİDİR, ETKİNLİK ONU ÖDÜNÇ ALMAZ.** Eski afiş
  #43356a/#c79bff bir paneldi; v16'nın gece siyahı · kor · gümüş dilinin
  yanında ikinci bir kimlik okunuyordu. Afiş kor rampasına geçti; ödülün
  KENDİ rengi (sandık/kahraman) yalnız madalyon ve kart kenarında yaşar.
- **BİLGİ SIRASI: OYUNCUNUN ARADIĞI SAYI EN İRİ NESNEDİR.** Toplam süre
  15 px'lik bir satırdaydı, iki satırlık açıklama ise afişin yarısını
  yiyordu. Yeni sıra: eyebrow → ad → 27 px SAYI + "14 DK KALDI" → ray.
  Kalan yazılır, GEREKEN değil (gereken zaten madalyonda).
- **RAY BİR YOLDUR: SABİT PARÇA İLE ÇİZİLMEZ.** Eski `.evs-seg` satır
  başına 40 px'lik kesik bir parçaydı (`top:-8px`); satır yüksekliği
  değişince duraklar arasında boşluk açılıp yol kopuyordu. Artık her
  durak kendi TAM yüksekliğinde parça çizer (ilk/son yarıdan) — ölçülen
  dikiş boşluğu sekiz durakta **0/0/0/0/0/0/0**.
- **ÜÇ FARKLI KART YÜKSEKLİĞİ TIRTIKLI KENAR OKUNUR.** İlk sürümde
  alınmış kart 45 · hazır 61 · kilitli 56 px'ti ve ray boyunca kenar
  zikzak yapıyordu. `min-height: 60` ile ritim tekleşti (ölçüldü:
  59/59/61/61/59/61/59/59). Şıklık burada tek şeydir: TEK RİTİM.
- **ETİKET SARMAZ.** `.evs-tag` ("SON ÖDÜL") `nowrap` almadığı için geniş
  metrikte iki satıra kırılıp değerin üstüne biniyordu.
- **ÖLÇÜLMÜŞ TEK SATIR SÖZLEŞMESİ:** etkinlik rıhtımındaki "HAYATTA KAL"
  279 px kabukta 171 px istiyor, kutu 169 — etiket iki satıra kırılıyordu
  (buton içinde 59 px'lik metin bloğu). Punto artık `clamp(16px, 6cqw,
  24px)` + `nowrap`: ölçülen 185×30, tek satır.
- **GÖREVLER HER SEKMEDEN AÇILIR OLDU → KAPANIŞ DA ÖYLE.** `hideQuests`
  sabit `setPage('etkinlik')` yapıyordu; mağazadan giren oyuncuyu başka
  bir sayfaya ışınlıyordu. Artık `this.page`e döner. Kart tazelemesi tek
  yerden geçer: `refreshQuestChip()` (setPage + renderQuests).
- **ÖLÜ KOD:** `renderHomeV3`in `#event-banner` ve `#btn-event-home`
  blokları HTML'de karşılığı olmayan öğeleri okuyordu → silindi. CSS'te
  eski `.event-hero`/`.em-*`/`.quest-teaser` aileleri de kaldırıldı
  (`.ev-chest`/`.ev-card-illu` KORUNDU — görevler ekranı onları okuyor).
- **YENİ TEZGAH `_v30test.html`:** dört gerçek kabukta (281×540 · 360×640
  · 390×844 · 430×932) üst şerit ikilisini ve etkinlik sekmesini ölçer;
  etkinliğe `ui.setPage` ile geçer ve geçiş DİNLENSİN diye bekler.
- Ölçülen son durum (279-430 kabuk): satır 1 taşma **0**, kırpma **0**
  (bar 49/101/63/103), dişli 38×32 (dar) · 42×38; satır 2 taşma **0**,
  bilet/görevler 133+118 → 214+187 px yan yana, başlık kırpma 0; etkinlik
  afişi 165 px, ray dikişi 0, kart 59-61 px, TOPLA 68×44, yatay taşma
  **0**, dip dolgu 18 px, beş sayfa dinlenmede (`transform: none ·
  opacity 1`), konsol temiz.

### v29 — SEKMELERDE ÖLÜ ALAN · GEÇİŞ ANİMASYONU · GİZLİ BELGE (2026-09-07)
### `style.css` v29 · `ui.js`

Dört ajan turu. TESTER dört sekmeyi ve geçiş makinesini ölçtü; KALİTE üç
kalemi reddetti, biri OYUNU BOŞ EKRANDA BIRAKAN bir arızaydı.

- **GİZLİ BELGEDE SAYFA GEÇİŞİ DONAR VE MENÜ TAMAMEN BOŞALIR.** Ölçüldü:
  `page-savas` üzerinde bekleyen İKİ CSS GEÇİŞİ (fill `backwards`, playState
  `running`, currentTime **0**) → hesaplanan `translateX(-378px)`,
  `opacity 0`. Görünen tek sayfa şeffaf ve ekran dışında, yani ekran boş.
  Gerçek senaryo sıradan: oyuncu 5 sn'lik açılış sırasında uygulamadan
  çıkıp geri dönüyor (`showMenu()` → `setPage()` tam o anda çalışır).
- **BİR GÜVENLİK AĞI, KURTARDIĞI ŞEYİN TİPİNİ VARSAYAMAZ.**
  `_settleStagger` bu ağı kurmuştu ama `a.animationName === 'riseIn'` diye
  bakıyordu — sayfa geçişi bir CSS GEÇİŞİDİR (`transition`), `animationName`
  alanı YOKTUR ve ağdan sessizce kaçıyordu. Yeni `_settlePages()` sayfadaki
  BÜTÜN `getAnimations()` girdilerini bitirir (tip ayırmadan).
- **DOĞRU DAVRANIŞ ANİMASYONU ATLAMAKTIR, SONRADAN ONARMAK DEĞİL.**
  `setPage` artık `document.hidden` (ve `prefers-reduced-motion`) durumunda
  geçişi HİÇ kurmaz: kurulmayan bir geçiş donamaz. Ayrıca `visibilitychange`
  → görünür olduğunda `_settlePages()` çağrılır (bazı tarayıcılar
  dondurulmuş geçişi sürdürmez).
- **ATLAMA YOLU DA YARIM KALMIŞ SINIFI TEMİZLEMEK ZORUNDA:** o dal
  `slide-*` sınıflarını ve bekleyen gizleme zamanlayıcısını silmiyordu;
  kalıntı sınıf sayfayı ekran dışında ve şeffaf hâlde "görünür" sayardı —
  ölçülen arızanın ta kendisi.
- **96 px'LİK DİP DOLGUSU AYNI HATANIN DÖRT KOPYASIYDI.** Ölçülen dip ölü
  alanı: mağaza 96 · cephane 95 · kahraman 80 · etkinlik 76 px. Dolgu alt
  gezinme çubuğunun üstüne binmemek içindi, ama çubuk AKIŞTA ve görüntü
  alanının ALTINDA (ölçüldü: `nav.top` 648 = `viewport.bottom` 648), yani
  binme fiziksel olarak imkânsız. Ev sayfasında bu dolgu v15'te tam bu
  gerekçeyle kaldırılmıştı — **ama yalnız ev sayfasında.** v28b dersinin
  tekrarı: aynı bildirimi okuyan BÜTÜN ekranlar taranır.
  Yeni değerler **18 · 18 · 58 · −3** ve kahraman sayfası artık HİÇ
  kaydırmıyor (562 → 0; 21 px'lik "kıpırdayan ama gitmeyen" kaydırma bitti).
- **GAP BİR TABANDIR, PAYIN KENDİSİ DEĞİL.** v27'nin `2.2vh` tabanı 730 px
  kabukta üç boşluğa 48 px istiyor ve ana ekran 6 px TAŞIYOR — sabit ev
  sözleşmesi bozulup sayfa kaydırmalı oluyordu. Payı dağıtan `space-between`;
  taban 1,1vh'ye indi (730'da 8 px). 844 px'te ölçülen 42/42/42 eşit dağıtım
  DEĞİŞMEDİ, çünkü orada pay space-between'den gelir. Kalan 6 px ev
  sayfasının kendi dip dolgusuydu; bu dalda 4 px'e indi → **taşma 0**.
- **TAM GENİŞLİK KAYMA "WEB KARUSELİ" OKUNUR.** Eski geçiş ±100% / 360 ms:
  sayfa ekranın öbür ucundan gelir, göz onu TAKİP EDER ve her sekme
  dokunuşu bir yolculuk gibi hissedilir. CR'de geçiş kısa ve snap: yol
  ±13%, süre 260 ms, giden sayfa 0,97'ye çekilir (derinlik). Yalnız
  transform + opacity — composite katmanda kalır, layout tetiklemez.
  Sekme ikonu bir kez zıplar (`navPop`, 320 ms); sürekli animasyon pil yer.
- **YATAY TAŞMA ÖLÇÜMÜ SÜS İLE İÇERİĞİ AYIRMAK ZORUNDA.** Ham tarama dört
  sekmede 24-180 px taşma bildiriyordu; metin taşıyan veya dokunulabilir
  öğelere süzülünce sonuç **sıfır** — taşanların hepsi kartından geniş
  parıltı/ışın süsü (`vc-sheen`, `dl-rays`, `bb-shine`) ve `overflow:hidden`
  ile bilerek kırpılıyor. Süzülmemiş bir taşma tablosu yanlış alarm üretir.
- **ANİMASYON KARESİNİ KUSUR SANMA:** ilk tarama dört sekmede birden +364 px
  okumuştu; sebep 450 ms sonra hâlâ uçuşta olan giriş geçişiydi. Ölçüm,
  ölçtüğü şeyin DİNLENME durumunu beklemek zorundadır.
- Ölçülen son durum (742×730 kabuk, gizli belge): ev kaydırma **0**,  boşluklar 8/8/8, çerçeve 208 px, SAVAŞ 75 px, `#chest-row.bottom` 644 ≤
  648; dört sekmede dip ölü alan 18/18/58/−3; beş sayfanın hepsi dinlenmede
  `transform: none · opacity: 1` (donmuş geçiş yok); içerikte yatay taşma 0;
  konsol temiz.

#### v29b — KORUMANIN KENDİSİ GİZLİ BELGEDE ÖLÜYORDU (doğrulama bulgusu)

- **BİR DERSİ KAPATMAK İÇİN YAZILAN KOD, O DERSİ İHLAL EDİYORDU.** v28c'nin
  "ölçülemeyen kutu henüz değildir" yeniden denemesi `requestAnimationFrame`
  kullanıyordu — oysa korumanın var olma sebebi tam olarak zamanın
  ilerlemediği belge. Gizli belgede rAF hiç ateşlenmez: zincir tek denemede
  ölüyor (`_mapTry === 1`), `_mapKey` boş kalıyor ve ana ekran haritası bir
  daha HİÇ boyanmıyordu (ölçüldü: tampon 300×150 = hiç atanmamış, dolu %0).
  Yeniden deneme `setTimeout` ile yapılır — zamanlayıcılar gizli belgede
  kısıtlanır ama ÇALIŞIR. `visibilitychange` de artık `_mapKey`i sıfırlayıp
  haritayı tazeliyor (son ağ).
- **BOYANMAMIŞ TUVAL ÖLÇÜLMÜŞ BİR SÖZLEŞMEYİ BOZUYOR GÖRÜNÜYORDU — AMA ASIL
  SORUN ÖLÇÜM ANIYDI.** Doğrulayıcı 540 px kabukta iki kez `#chest-row.bottom`
  479 > görüntü alanı 465 ve ev sayfası 30 px kaydırma bildirdi. Yeni kabuk
  tezgahı (`_shelltest.html`) aynı kabuğu BİREBİR kurup ölçtü — **sözleşme
  geçiyor**: chest-row 463 ≤ 465, ev kaydırma 0, kolon taşması 0, harita
  anahtarı doğrulayıcının okuduğunun aynısı (`10:0:248x75`). Aradaki fark
  ölçüm ANI: bildirilen tabloda çocukların toplamı (341) kolonun kendi
  yüksekliğine EŞİTTİ ama rect'ler 16 px aşağıda bitiyordu — bu, yerleşim
  otururken (harita boyanması + ResizeObserver yeniden akışı) alınmış bir
  ölçümün imzasıdır. **Toplamı kendi kutusuna eşit çıkan bir taşma tablosu,
  taşmayı değil REFLOW ANINI ölçüyordur.**
- **YENİ TEZGAH: `_shelltest.html`.** Yükseklik media query'leri PENCEREYİ
  okur, dolayısıyla `.menu-shell` yüksekliğini elle değiştirmek dalları
  simüle etmez (v27 · v29b dersi). Tezgah oyunu GERÇEK boyutlu iframe'lerde
  koşturur — dallar cihazdaki gibi değerlendirilir — ve altı kabuğu birden
  ölçer. Bir yükseklik sözleşmesi bundan sonra burada kapatılır.
- **YÜKSEKLİK SİMÜLASYONU MEDIA QUERY'Yİ SİMÜLE ETMEZ.** `.menu-shell`
  yüksekliğini 540'a çekmek pencereyi 730 bırakır: `min-height:700px` dalı
  AÇIK, `max-height:670px` compact dalları KAPALI kalır ve ölçüm 83 px taşma
  bildirir — dalları elle uygulamadıkça bu sayı yalandır.
- Ölçülen son durum (`_shelltest`, altı gerçek kabuk · gizli belge ·
  müdahalesiz açılış) — `chest-row` kırpması / ev kaydırması / kolon taşması:
  **281×540** −2/0/0 · **430×540** −2/0/0 · **924×540** −2/0/0 ·
  **360×640** −4/0/0 · **412×730** −4/0/0 · **390×844** −4/0/0.
  Harita altı kabukta da boyalı (`_mapTry` 0), konsol temiz.

### v27 — PREMİUM MOBİL PASO II: ANA EKRAN (2026-09-05) — `style.css` v27 · `index.html`

Kullanıcı: *"Clash Royale kalitesinde, tatlı ve NET grafikler, animasyon
A+++, tepeden tırnağa premium."* Dört ajan turu; TESTER ölçtü, KALİTE üç
kalemi reddetti.

- **ÖLÜ ALAN, EN BÜYÜK "PREMİUM DEĞİL" SİNYALİDİR.** Kullanıcının kendi
  görüntüsünde (≈279×1140 kabuk) sandık ikilisi ile harita arasında ~178 px,
  dünya şeridi ile SAVAŞ arasında ~177 px BOŞ bant vardı. Zincir: `.map-stage`
  `flex:1 1 auto` ile büyüyor, içindeki `.map-frame` `aspect-ratio:8/5 +
  flex:none` ile SABİT, stage `justify-content:center` → fazla yükseklik
  çerçevenin altında ve üstünde iki boşluk olarak görünüyor. Yani **ekran
  uzadıkça oyun daha da boş görünüyordu.**
- **BİR KUSURUN GÖRÜNMEMESİ YOKLUĞU DEĞİLDİR.** 540 px'lik test kabuğunda
  ölçülen boşluk 4 px'ti (kısa kabukta slack yok), yani bu kusur aylarca
  ölçümlerin arasından geçti. Ölçüm kabuğu da bir varsayımdır — v16c'nin
  "ölçüm GENİŞLİĞİ de bir varsayımdır" dersinin YÜKSEKLİK hâli.
- **KESİN YÜKSEKLİK ALAN FLEX ÖĞESİNDE aspect-ratio DEVRE DIŞI KALIR**, yani
  oran bir TABAN gibi davranır: `flex:1 1 auto` verilen çerçeve 8:5'ten uzun
  kutuda yükseklik kazanır, kısa kutuda eski sıkışma yolu (min-height 64-96)
  aynen korunur. Tek kural, yeni bir nesil yama değil.
- **ÖLÜ ALANI TAŞIMAK ONU KAPATMAK DEĞİLDİR.** İlk sürümde sahne sınırsız
  büyüdü: çerçeve 240 px'te tavana çarpıyor ama sahne 590 px kalıyor ve
  294 px boşluk kaidenin ALTINA, sahnenin İÇİNE gizleniyordu. Ölçüm sütunun
  boşluklarına baktığı için (4 px) bir an "düzeldi" görünüyordu. Sahneye de
  tavan kondu; artan pay SÜTUNA döner.
- **ARTAN PAY DİBE YIĞILMAZ, EŞİT DAĞITILIR.** Tavanlardan sonra 1000 px
  kabukta 290 px hava kolonun DİBİNDE toplanıyordu. `space-between` + taban
  `gap`: pay üç boşluğa bölünür, kartlar birbirine değmez.
- **KUTU ORANI BİR KISITTIR (üçüncü tekrar).** Çerçeveye tavan konmazsa
  1000 px kabukta H/W 2,13 oluyor; `climbLayout`ın önizleme dalı 0,28-0,62
  arasını yorumlar ve dört ada çok uzun kutuya yayılıp göğün yarısını boş
  bırakır. Tavan `cqw` ile yazılır (@media genişlik sorgusu yasak):
  `86cqw` → 279 px kabukta 240 px, H/W 0,96.
- **SAVAŞ BUTONU KOR OLMALI, ŞEFTALİ DEĞİL.** Ölçülen gradyan #d8a284 →
  #b87351 → #7f4130 ve mürekkep #f0eae4: ekranın EN AÇIK yüzeyi savaş
  butonuydu ve üst dudağında yazı ~2,4:1 okunuyordu. Buton artık açılış
  çubuğuyla AYNI kor rampasını kullanır (#ff8a5c → #d81f2c → #8d0f1a) —
  iki ekran aynı malzemeyi konuşur. **Bu blok yalnız BOYAR**: dolgu ve
  yükseklik değişmedi, yoksa v15b/v16c'nin ölçülmüş taşma sözleşmeleri
  sessizce bozulurdu.
- **MÜREKKEBİ BEYAZA ZORLAMAK YANLIŞTI (v27b, doğrulamada ölçüldü).** Bloğa
  yazılan `color:#fff` ÖLÜ KODDU — daha özgül `.bb-main` kuralı kazanıyor ve
  başlık #240705 çıkıyor. Ölçülen kontrast koyu mürekkeple ZATEN İYİ: üst
  dudakta 8,16:1, ortada 5,43:1; beyaz olsa üst dudakta 2,32:1 ile
  başarısız olurdu. Doğru düzeltme beyazı kazandırmak değil KALDIRMAKTI.
  (Bir bildirim yazıldığında kazanıp kazanmadığı ölçülür: özgüllük tuzağı.)
- **SEKMEDE ETİKET, YÜKSEKLİK BÜTÇESİNE BAĞLI BİR LÜKSTÜR.** Ölçülen sekme
  52×44 px, ikon 44×28, etiket YOK — parmak ölçüsünün tam tabanında ve
  "hangi sekme neydi" bilgisi 28 px'lik bir glifte. Etiket (MAĞAZA · KUŞANIM ·
  KAHRAMAN · ETKİNLİK) `min-height: 661px`'ten UZUN kabukta açılır: gerçek
  telefon 844+ px'tir, ama 540 px'lik test kabuğunda +12 px nav yüksekliği
  `#chest-row` taşma sözleşmesini bozardı. Feda sırası kasıtlı (v16c):
  dokunma hedefi ve taşma sözleşmesi ETİKETTEN önce gelir.
- **YÜKSEKLİK DALI AJAN KABUĞUNDA SİMÜLE EDİLEREK ÖLÇÜLÜR.** `@media
  (min-height:700px)` pencere yüksekliğini okur ve ajan kabuğu 540 px; dalın
  bildirimleri elle uygulanıp ölçüldü, sonra geri alındı. Ölçülmemiş bir dal
  "yazdım" demektir, "uygulandı" demez.
- Ölçülen son durum — **540 px kabuk:** boşluk 4/4/4, çerçeve 74 px,
  `#chest-row.bottom` 462 ≤ görüntü alanı 464, kolon taşması 0 (eski
  sözleşmeler bozulmadı). **844 px (simüle, gerçek telefon):** boşluk
  42/42/42 EŞİT, çerçeve 240 px (H/W 0,96), SAVAŞ butonu 71 px, sandık kartı
  76 px, `#chest-row.bottom` 766 ≤ 768, taşma 0.
- **SIRADAKİ (bu turda YAPILMADI):** mağaza · kuşanım · kahraman · etkinlik
  sayfaları aynı ölü-alan taramasından geçmedi (dördü de kaydırmalı, yani
  kusur farklı: kaydırma dibi ve kart yoğunluğu). Sekme geçiş animasyonu ve
  sayfa içi stagger da A+++ pasosunu bekliyor.

### AÇILIŞ YÜKLEME ÇUBUĞU (2026-09-05, v26 · v26b) — `index.html` · `style.css` · `main.js`

Kullanıcı isteği + referans görüntü (Clash Royale açılışı): dipte çubuk,
ortasında yüzde, %100'de oyuna giriş.

- **ÇUBUK YALAN SÖYLEMEZ.** İki kapı var (en az 5 sn + gerçek ısıtma) ve dolgu
  ikisinin DAHA GERİ olanını gösterir; %100 tam olarak oyuna girilebildiği
  anda dolar. Güvenlik zaman aşımı da çubuğu DOLDURUR — yarım dolu bir
  çubuktan oyuna atlamak, çubuğun az önce verdiği sözü bozar.
- **REFERANSTAN YAPI ALINIR, RENK ALINMAZ.** Referans mavi; palet gece
  siyahı · kor · gümüş (v16) ve mavi/teal aile v16e'de süpürülmüştü.
- **2026-08-10'DA BU ÇUBUK BİLEREK KALDIRILMIŞTI** ("oyuncu ona bakarak
  beklemeyi ÖLÇER"). Kullanıcı açıkça geri istedi: **ölçüm gerekçe sunar,
  kullanıcı kararının yerine geçmez.** İkisi de yazılı kalır.
- **BİR clamp YAZILDIĞINDA HANGİ UCUNUN KAZANDIĞI ÖLÇÜLÜR** (dvh/cqw
  derslerinin üçüncü tekrarı): ölçülen kabuk **249 px**, yani `6.4cqw` =
  15,9 px ve üç kural birden TABANA oturuyordu — bileşen gerçek cihazda her
  zaman kendi EN İNCE sürümü olarak çıkıyor, "premium" hedefi hiç devreye
  girmiyordu. Dar kabukta bağlayıcı olan TABAN değerdir; cqw payı yalnız
  geniş kabukta iş görür. Ray 20 → 26 px, yüzde 11 → 15 px.
- **ALFA İLE SOLDURULMUŞ MÜREKKEP KONTRASTI SESSİZCE KAYBETTİRİR:** durum
  yazısı 8 px + %62 alfa ile ~3,5:1 okunuyordu. Tam opak gümüş (#a8b0be),
  punto 10 px.
- **İKİ UCU YUVARLAK DOLGU, DÜŞÜK YÜZDEDE "TOP" OKUNUR.** %5-14 doluluk
  12-35 px'lik bir pill oluyor ve rayın solunda duran kırmızı bir top gibi
  görünüyordu — her açılışın ilk saniyesinde. Sol uç KARE; sol kenarı rayın
  kendi kavisi kırpar (`overflow: hidden`).
- Ölçülen son durum: %5→%76 monoton, ray dibe 14 px boşlukla oturuyor
  (bar.bottom 526 / splash.bottom 540), tüyo ile çakışma 0, konsol temiz.
Bu oyun 60 fps hedefiyle ve Google Play dağıtımı için kuruldu.
`game/perf.js` performans çekirdeğidir. **Eklenen her yeni sistem
buradan geçer.** Yeni kod yazarken şu 5 kuralı ihlal etmeyin:

### 1. Sıcak döngüde ASLA nesne tahsis etme
Her karede çalışan kodda `new THREE.Vector3/Matrix4/Color/Quaternion`,
`{}`, `[]`, `.clone()`, `.map/.filter`, string birleştirme, `for..of`
(iterator tahsisi) YASAK.

```js
import { TMP, AXIS_Y } from './perf.js?v=20260725p';
const m = TMP.m4, pos = TMP.v, col = TMP.col;   // paylaşılan geçiciler
```
TMP nesneleri **tek fonksiyon çağrısı** boyunca geçerlidir; kareler
arası değer saklanacaksa kendi kalıcı alanını tut (`this._sx` gibi).

Sebep: ortalama FPS 60 görünürken saniyede bir 5–20 ms GC duraklaması
olur. Oyuncunun "kasıyor" dediği şey neredeyse her zaman budur.

### 2. Renk stringi her karede ayrıştırılmaz
`col.set('#ff3b4e')` regex + isimli renk tablosu araması yapar.
```js
col.setHex(hexOf(e.color));   // hexOf önbellekli
```

### 3. InstancedMesh her zaman KISMİ yüklenir
`instanceMatrix.needsUpdate = true` tamponun TAMAMINI GPU'ya yükler
(480 örnek × 16 float = 30 KB), sahnede 3 nesne olsa bile.
```js
commitInstanced(mesh, count, /* renk var mı */ true);
uploadInstances(attr, count, stride);   // ham tampon için
```

### 4. Efekt/varlık adedi ASLA sabit yazılmaz
```js
const cap = Quality.budget('particles');   // partikül|modelEnemies|enemies|atmo
```
Bütçe tablosu ve esneklik (`FLEX`) perf.js'te. Cihaz zorlandığında
`Quality.stress` yükselir ve bütçeler kısılır. Yeni bir efekt sınıfı
eklerken BUDGETS + FLEX'e satır ekle.

**Feda sırası kasıtlıdır:** önce çözünürlük (netlik), sonra atmosfer
zerreleri, sonra partiküller, en son modelli düşmanlar. Bulanık ama
kalabalık sahne, keskin ama boş sahneden daha çok "oyun" gibi görünür.

### 5. İlk kullanımda derlenen hiçbir şey savaşta olmaz
Yeni materyal/shader/doku/ses eklediysen açılış ekranında ısıt:
```js
Warmup.add('yeni boss shaderı', () => precompileScene(renderer, scene, camera));
```

### Ölçme
Gerçek telefonda: **sol üst köşeye üç kez hızlı dokun** → HUD (fps,
sivri uç, ölçek, stres, çizim çağrısı, üçgen, yığın). Ya da `?perf=1`.
Yeni bir ağır sistem eklerken `Perf.section('adım')` ile bölümle.

### Kesin YASAKLAR (mobil GPU tiled çalışır — fillrate ölür)
- Post-processing / EffectComposer / UnrealBloom. Parlama = emissive.
- `shadowMap.enabled = true`. Gölge = zemine yumuşak siyah quad.
- Gerçek zamanlı ışık eklemek (mevcut 6 ışık üst sınırdır).
- Ekranın büyük bölümünü kaplayan yarı saydam katman (overdraw).
- Statik bir görüntüyü her karede canvas'a `drawImage` etmek —
  DOM katmanı yap, bileşikleştiriciye devret (bkz. `#vignette-layer`).
- Her karede `getBoundingClientRect()` / `getComputedStyle()`.

### Katman mimarisi
- `#game3d` — WebGL. **Dinamik çözünürlük YALNIZCA buna uygulanır.**
- `#vignette-layer` — statik vinyet, DOM, sıfır maliyet.
- `#game` — 2D üst katman (hasar yazıları + joystick). **Her zaman tam
  netlikte (DPR ≤ 2)**, asla ölçeklenmez: maliyeti ihmal edilebilir ama
  bulanıklaşması anında fark edilir.

### Kare tavanı
Mobilde 60 fps'e sabitlenir (`Quality.capFps`). Simülasyon 60 Hz sabit
adım olduğu için 120 Hz'de çizilen fazla kareler judder + termal
kısılma demektir. Atlanan karede `this.last` güncellenmez.

### Haptik
`Haptics.fire('crit'|'hurt'|'death'|'ui')`. Kısa (8–45 ms) ve seyrek.
Her vuruşta titretme — kolu yorar, pili yer.

---

### YAPISAL AĞ TEKRARI — YARIM KALDI (2026-09-02, açık iş)
`MIN_CELLS = 6` beş yüzeyde BAĞLAYICIYDI (mermer · solgun · yayla · buz ·
kül-iri hepsi tam 6 hücrede oturuyordu), yani köşeler `hash(i mod 6,
j mod 6)` ile her karoda birebir aynı 6×6 geometriyi veriyor ve düzenli
bir kafes okunuyordu. **Bir TABAN tekrarı kaldırmaz, yalnız yüzeyleri
tabanın üstüne oturtur.** Karo boyu, dikişsiz bir yapısal öğenin en
büyük boyunu fiziksel olarak sınırlar: 640 px karoda 190 px plaka
tekrarsız olamaz.

Bu turda yapılan: taban 8'e çıktı, jitter 0,10-0,24 → 0,34-0,44, ve
`netBuild(…, seed)` eklendi (aynı yüzeyde iki ağ yaşadığında ikisi de
tabana oturunca AYNI kafesi paylaşıyordu). Kalan iş ÖLÇÜLDÜ ve
kapanmadı: mermer döşenme panelinde soluk damar kafesi hâlâ ızgarada
okunuyor. Doğru çözüm muhtemelen tek ağı büyütmek değil, ASAL SAYIDA
hücreli İKİ ağı üst üste bindirmek (period lcm ile ekran dışına çıkar) —
sonraki turda ölçülerek yapılacak.

**PİŞİRME SÜTUNU BU TURDA GÜVENİLİR DEĞİL:** doğrulayıcı eşzamanlı
çalışırken bütün satırlar tek biçimli ~1,7 kat şişti (kemik 243 → 406,
hiç dokunulmadı). Makine yükü altında ölçülen tablo kodun maliyetini
göstermez; pişirme bandı BOŞ makinede yeniden okunmalı.

## ZEMİN DOKUSU — PREMİUM MOBİL PASO (2026-09-01) — `_terrtest.html`

Kullanıcının teşhisi: *"terrain dokusu düşük kaliteli, internet oyununa
benziyor."* Ölçüldü ve haklıydı. Sebep çözünürlük DEĞİLDİ (detay katmanı
zaten 2,0 örnek/px veriyordu): eski on yüzey ~10.000 **YARI SAYDAM**
(alfa 0,20-0,30) 1-2 px'lik çizgiden oluşuyordu. Üst üste binen saydam
gürültü ekranda ORTALANIR — hiçbir form kenarı kalmaz, doku "yeşil
kadife" okunur. Çözünürlüğü artırmak bunu düzeltmez, daha net gürültü
yapar.

### ÖLÇÜT YANLIŞTI — "bantta" denen on harita bantta değildi
Eski tezgahlar (`_hdtest`, `_10maptest`) bileşiği Canvas2D `'overlay'`
ile taklit ediyordu. Yeni tezgah oyunun GERÇEK şader matematiğini
hesaplar: `sRGB( lin(makro) × (1−k + k·lin(detay)/mid · maske) )`.
Aynı mezarlık: overlay ile 39 ortalama / 0,42 doygunluk, gerçek matematikle
**53 / 0,458**. Yani sevk edilen kod da bandın dışındaydı ve tezgah
bunu göremiyordu. **Bir ölçüt, ölçtüğü şeyin matematiğini birebir
kurmak zorundadır**; "yönü aynı" yaklaşım sessizce yalan söyler.

### BEŞ KURAL (yeni malzeme dili — `arenaSurf.js`)
① **FORM OPAKTIR.** Kenarı olan şey nettir; alfa yığını ortalanır.
② **İZOLE TEKRAR EDEN LEKE KONFETİ OKUNUR.** Serpilen aynı siluet:
   rozet → "yaprak", elips → "beyaz kapsül", basık çokgen → "cam
   kıymığı", kenara dizilmiş eşit leke → "inci kolyesi". Siluet her
   kopyada değişir (`blob`), süs formları birbirine BİNER.
③ **PARLAK İNCE ÇİZGİ AĞ OKUNUR.** Plaka kimliği DOLGU DEĞERİNDEN
   gelir; derz ince + KOYU, kenar ışığı hücrenin İÇİNE pah (`netBevel`).
④ **SÜS YAPIYA TUTUNUR, SERPİLMEZ.** Kar basınç sırtına yaslanır, kor
   kabuk derzinden sızar, kül derze dolar, çim taş plakasının arasında
   biter. Ağ BİR KEZ kurulur (`netBuild`) ve dolgu · derz · pah · süs
   AYNI köşe listesini okur — "yol verisi tek yerde yaşar" dersinin
   doku karşılığı. Kenarlar bir kez üretilir (her hücrenin yalnız üst +
   sol kenarı), yoksa kenara dizilen süs iki kez çizilip alfası katlanır.
⑤ **DETAY KATMANI KROMA TAŞIMAZ.** `mid` bir SKALER: detayın parlaklığı
   normalize edilir ama KANAL ORANLARI makronun tonuyla ÇARPILIR. Doygun
   yeşil detay + doygun yeşil makro = 0,50 doygunluk. Kroma MAKRODA
   yaşar; detay yalnız DEĞER (form + ışık) taşır.

Ek ölçüm dersleri: çim bıçağı, arasından görünen topraktan bir tık AÇIK
olmak zorunda (koyu bıçak = "toprağa serpilmiş saman"); tutam adedi
1500 → 3000 arası "serpme" ile "yüzey" ayrımıdır; kül birikintisi alfa
0,30'da "tebeşir karalaması" olur (kül kabuğun ÜSTÜNDE bir kat değil
derzin İÇİNDE bir birikintidir); kemik kıymığı 620 × 0,86 ile yerel
kontrastı 20,0'a çıkarıyordu (tavan 14).

### DOKU BÜTÇESİ — kullanıcı seçimi "üst kademede kalite öncelikli"
Makro **2048² KALIR**: POT olmayan doku bazı sürücülerde eğri mip
karartması veriyor (render3d dersi). Bütçe DETAYA harcanır — "HD" hissi
oradan gelir:

| kademe | makro | detay | karo | örnek/px | VRAM |
|---|---|---|---|---|---|
| high | 2048² | 2048² | 640 px | **3,20** | ~43 MB |
| mid | 2048² | 1024² | 512 px | 2,00 | ~28 MB |
| low | 1536² | 1024² | 512 px | 2,00 | ~19 MB |

**`main.js` KADEMEYİ ES GEÇİYORDU:** `bakeArenaMap(…, {pot: 2048,
detailPot: 1024})` sabit yazılıydı, yani `arenaMaps`in kademe mantığı
HİÇ çalışmıyordu ve en iyi telefon da 1024² detay alıyordu. Bir varsayılan
yazıldığında çağıranın onu ezip ezmediği kontrol edilir.

**TEKRAR MASKESİ (`uDetailBreak`, şaderde):** 640 px'lik karo ~400 px'lik
telefon ekranında bir buçuk ekranda bir tekrar eder ve göz bunu "duvar
kâğıdı" olarak yakalar. Aynı doku 0,383 ölçekte İKİNCİ kez okunur ve
yalnız düşük frekanslı bir çarpan olarak kullanılır: bileşik tekrar ~11
karoya çıkar. Yeni doku YOK, yeni düzlem YOK (overdraw yasağı) —
maliyet tek bir ek doku okuması.

**MASKE DEĞERİ KIRAR, FORMU KIRMAZ.** Yukarıdaki not doğrulamada
yarım kaldı: maske `khDetail *= mix(1, khBreak, …)` yani bir PARLAKLIK
çarpanı — silueti ve kenar geometrisini değiştirmez. Yapısal ağ karo
başına 3 hücreye düştüğünde (aşağıya bkz.) plakalar ızgara hâlinde
tekrar ediyordu ve maske bunu kapatamıyordu. Değer tekrarı ile FORM
tekrarı iki ayrı sorundur, iki ayrı araçla çözülür: değer maskeyle,
form hücre sayısıyla.

**YAPISAL ÖLÇEK KARO BOYUNA BAĞLANIR (`MIN_CELLS = 6`).** Ağ hücresi
dünya px olarak yazılır ama hücre SAYISI karo boyundan türer: karo
512 → 640 büyüdüğünde 230 px'lik hiçlik plakası karo başına 3 hücreye
düştü (mermer 190 ve buz 200 de aynı), yani aynı iri siluet her 640
dünya px'te geri geldi. Bir sabitin, karo boyu değişince sessizce
anlamını yitirmesi — bu dosyadaki texel-sabiti dersinin aynısı. Artık
karo başına en az altı hücre garanti (yapısal plakalar ~107 px).

### ÖLÇÜLMÜŞ TON DÜZELTMESİ — `arenaMaps.TONE`
Sapma on plan dosyasına dağılmış sihirli sayılarla değil TEK tablodan
kapatılır: `night` gece yıkamasına eklenir, `sat` plandaki kroma
kısmasıyla çarpılır. Hedef ortalama bandın üst-ortası (~48): daha koyu
hedef, yerel kontrastı (1−a ile ölçeklenir) bandın altına düşürüyor —
hiçlik (4,4) ve buz (6,6) gibi düşük kontrastlı yüzeylerde ölçüldü.

### Obje sıklığı: 100 → 78 (kullanıcı seçimi "daha seyrek")
`BUDGETS.props` 180/250/330 → **66/72/78**. Eski değerler hiç
bağlamıyordu (planlar ~100 üretiyor, cap 250'ydi). `thinProps` önceliğe
göre kırptığı için çıpalar (pri 0: 6-28 arası) korunur; ölçülen çıpa
reddi on haritada **0**.

### Ölçülen son durum (`_terrtest.html`, high kademe, 1:1)
On haritanın hepsi: engel 78 · çıpa reddi 0 · konsol temiz. Güncel ton ve
pişirme değerleri tezgahın tablosundan okunur (bantlar: ort 26-52 · p95
<150 · doy <0,42 · yerel kontrast 4-14 · pişirme <520 ms).

**KROMA HER ZAMAN `TONE.sat` İLE KISILIR.** Aynı hata iki tur üst üste
iki yüzeyde çıktı (katedral 0,429 → `sat` 0,68; kül 0,422 → `sat` 0,70):
gece yıkaması (`night`) ortalamayı düşürür, KROMAYA dokunmaz. Doygunluğu
taşan bir yüzeyde `night` ile oynamak yanlış eksendir. Yerel kontrast ise
form ADEDİ ve ışık kenarı ALFASI ile kısılır (kemik kıymığı 380 → 330,
kenar 0,20 → 0,16). Bir bandın dışındaki değer "sınırda" diye yazılmaz.

**KAÇAN IZGARA: KAPAK PASOSU KÜÇÜK ÇOKGENİ KUBBE YAPAR.** Külün kömür
kümeleri eşit boyda yuvarlak açık gri lekeler ("mantar başı / çakıl")
okunuyordu: `chunk`ın ışık pasosu 0,56 ölçekte merkeze yakın çizilir ve
çok açık bir `lite` ile küçük çokgeni kubbeye çevirir. Kömür artık iri
ağın derzine tutunur (kural ④) ve `lite` gövdeye yakın bir değerde.

**AYNI HATA BİR YÜZEY ÖTEDE YAŞIYORDU** (tuz kristali, `lite` #f6f0d8):
koyu plaka üzerinde ~50 eşit boyda beyaz nokta = "serpilmiş şeker".
Ölçülebilir hâle getirildi: 8×8 pencerede tepe >165 ve pencere ortalaması
<95 olan **izole parlak leke** sayısı — tuz 25, buz 0, kül 5 (kemik 45
ama orada kıymık yüzeyin KİMLİĞİ ve silueti değişken). Kristal artık
derze tutunur ve değeri plakaya yakın. Bir düzeltme yapıldığında AYNI
YARDIMCIYI (`chunk` + `cluster`) çağıran bütün yüzeyler taranır.

**DÜZELTİLEN DESEN BİR BAŞKA DESENİ DOĞURABİLİR (tuz kristali, iki tur).**
İlk hâli serpilmiş kümeydi → "serpilmiş şeker". Derze bağlanınca kenar
başına `nb` kopya EŞİT ARALIKLA dizildi ve kenar sayısı 4'e SABİTLENDİ
→ "inci kolyesi", yani kural ②'nin adıyla yazılı hatası. Doğrusu ikisinin
ortası: kenarların çoğunu ATLA, kalan kenarın RASTGELE BİR NOKTASINDA
birbirine BİNEN 2-3 parça, siluet SERBEST. Kömür çağrısında `sides`
verilmemiş olması tam bu yüzden doğruydu — sabit kenar sayısı = tekrar.

**ISITMA JIT PAYINI TAŞIR, ÇİZİM İŞİNİ TAŞIMAZ — TUTAM DAMGAYA ÇEVRİLDİ.**
Mezarlık, tamamen ısınmış hâlde de 726 ms okuyordu (medyan ~270, eşik
520): ~4900 tutam × 6-11 bıçak × 3 dolgu = 100-160 bin yol dolgusu. Bir
maliyeti `Warmup` ile "çözmek" ancak JIT için geçerlidir; gerçek iş
sahada da yapılır. Tutam artık aile başına 24 varyant olarak BİR KEZ
çizilip (`tuftSprites`) `drawImage` ile damgalanır: yol dolgusu ~1150'ye
iner. Siluet çeşitliliği 8 yön × 3 varyant ile korunur (kural ②).

**DAMGA ROTASYONU IŞIĞI DÖNDÜRÜR — YÖN SPRITE'IN İÇİNE PİŞİRİLİR.**
İlk damga sürümü AO'yu ve kenar ışığını sprite'a pişirip damgalarken
`rotate` uyguluyordu: her tutamın gölgesi ve parlak kenarı başka yöne
bakıyordu, yani bu dosyanın "tek ışık yönü" sözleşmesi bir optimizasyon
uğruna sessizce düşmüştü (damgadan ÖNCEKİ kod doğruydu). Sprite artık
YÖN BAŞINA pişirilir (bıçaklar sprite'ın içinde döner), damgalama
`rotate` kullanmaz; rüzgâr yönü en yakın yön varyantıyla karşılanır.
Bir hız düzeltmesi, düzelttiği şeyin sözleşmesini bozamaz.

**PİŞİRME AYRI PASODA ÖLÇÜLÜR.** Görsel pasoda ölçmek yanıltıyordu: her
satırın üç kırpma tuvali DOM'da canlı kaldığı için `bataklik` döngü
içinde 531 ms, izole tekrarda 344/347 ms (+%54) okudu. Sütun artık
hiçbir şey tutmayan bir önce-pasoda, harita başına İKİ ölçümün medyanı.

**CANVAS2D KOMUTLARI TEMBELDİR — FAZ ÖLÇÜMÜ FLUŞSUZ YALAN SÖYLER.**
Faz zamanlayıcıları (makro / detay / yerleşim) komut GÖNDERİMİNİ ölçüyordu:
mezarlık "makro 26 · detay 79 · yerleşim 6" okurken toplam 530 ms'ti ve
aradaki 419 ms hiçbir faza yazılmıyordu. Rasterleşme ilk `getImageData`ya
kadar ertelenir, yani maliyet o çağrıyı yapanın sırtına biner — bu yüzden
"suçlu makro plan" diye yanlış bir teşhis kuruldu. Her fazın sonunda tek
piksellik bir okuma (`flush`) kuyruğu boşaltır; ölçüm ancak o zaman fazın
kendi maliyetidir. Gerçek dağılım: mezarlıkta **detay 443 ms** (makro 89).

**FAZ SÜTUNLARININ TOPLAMI TOPLAMI TUTMAK ZORUNDA.** `flush` büyük
boşluğu (419 ms) kapattı ama ~75-100 ms hâlâ atfedilmemiş kalıyordu:
zamanlayıcıların DIŞINDA kalan iki kalem, iki adet 2048² tuvalin
tahsisi/sıfırlanması (~34 MB) ve `linearMean`in tam tuval geri okuması
(16 MB). Artık dördüncü bir sütun (tahsis+okuma, ~50-70 ms) olarak
ölçülür ve dört fazın toplamı pişirme sütununu birebir tutar. Bir
tezgahın "kodun maliyetini okursunuz" iddiası ancak bütün kalemler
görünürken doğrudur.

**HALIYI DAMGA DAMGA DOKUMA — ZEMİNİ HALI RENGİYLE KUR.** Çim tabanı
KAHVEYDİ, dolayısıyla yüzeyin tamamını tutamların kapatması gerekiyordu:
4864 damga, 2048² tuvalde ~8 kat overdraw, detay 443 ms. Taban olive
yapıldı ve adet İKİ TURDA indİ (1900 → 950 → **560**, tutam 10-18 px):
detay 443 → 324 → **195**, toplam **354 ms**. Ara değer (950) yeterli
DEĞİLDİ: detay 315-337 arasında salınıyor ve toplam 520 eşiğinin İKİ
YANINA birden düşüyordu — koşuların yarısı kırmızı. **Bir band "son
koşumda geçmişti" ile kapanmaz**; pay açılır. Görüntü de iyileşti:
tutam kaplama işçisi değil SİLUET kırıcısı.

**TEZGAH ISINMIŞ YOLU ÖLÇER.** İlk satır JIT payını yükleniyor ve 717 ms
okuyordu; bandın dışındaki gerekçesiz kırmızı hücre kabul edilemez.
Tabloya girmeyen bir ısınma pişirmesi (256², hemen bırakılır) döngüden
önce çalışır — sahada aynı işi açılış ekranındaki `Warmup` kaydı yapıyor,
yani tezgah artık sahadaki koşulu ölçüyor.

**PİŞİRME ÖLÇÜMÜ: SATIR SIRASI ÖLÇÜMÜ KİRLETİYORDU.** Tezgah her
satırın 2048² makro + 2048² detay tuvalini (satır başına ~33 MB destek
deposu) çalışma boyunca canlı tutuyordu; tahsis/GC baskısı monoton
arttığı için her SONRAKI pişirme daha kötü koşulda ölçülüyordu ve tablo
son satırlarda 1,7 sn'ye kadar çıkıyordu. Kanıt: `netBuild`i HİÇ
kullanmayan KEMİK satırı 358 → 1684 ms gitti — artış çizim işinden değil
SIRADAN geliyordu. Satır bitince tuvalin destek deposu `width = height =
0` ile ANINDA bırakılır (referansı düşürmek yetmez: GC'yi beklemek
ölçümün içine karışır). **Bir ölçüt, ölçtüğü şeyi izole etmek
zorundadır**; aksi hâlde tabloya bakan kişi kendi tezgahının bellek
profilini okur, kodun maliyetini değil.

Sahada bu yol görev başına BİR kez ve SOĞUK çalışır; perf kuralı 5
gereği açılış ekranına `Warmup.add('harita pişirme yolu', …)` eklendi
(256² küçük harita, tuval hemen bırakılır): amaç bellekte doku tutmak
değil boyacı kitinin kod yollarını (gradyan, desen, çokgen ağı)
derletmek. Isıtma harita başına maliyeti DÜŞÜRMEZ, yalnız JIT payını
açılış ekranına taşır.

**ÖLÇÜM BLOĞU HER TURDA YENİDEN ÖLÇÜLEREK YAZILIR.** Bu bloğa üst üste
iki tur eski sayılar yazıldı ("31-61 ms", "198-401 ms") ve ikisi de o anki
tabloyla uyuşmuyordu — dosyanın kendi "hesaplanan değer ölçülene kadar
hiçbir şey belli olmaz" dersinin ihlali.

### Sıradaki (kullanıcı onayı alındı, bu turda YAPILMADI)
Ambiyans katmanı (sekiz tür, harita başına iki: kor zerresi · sürünen
sis · savrulan kar · ruh ışığı · toz burgacı · yağmur + ıslaklık ·
uçuşan yaprak/kül · ışık huzmesi), objelerin iklime bire bir bağlanması
ve gerçek cihazda 60 fps ölçümü.

### BANT İÇİNDE KALIP YANLIŞ OLABİLİR — `frac`
Tuz tabanında `netBerm` ışığa dönük kenarların ~%90'ına SÜREKLİ parlak
şerit koyuyordu: ekran tek biçimli bir açık petek örgüsü, yani BASILI
DESEN okundu — ama yerel kontrast 12,0 ile bandin İÇİNDEYDİ. Ölçüt bir
sınırdır, tasarımın yerine geçmez; 1:1 kırpmaya BAKMAK zorunlu.
Gerçek bir basınç/tuz sırtı PARÇALIDIR: `frac` kenarın rastgele
konumlanmış bir bölümünü kaplar, sonra keser (`netJoints` de aynı
parametreyi alır).

**HÜCRE ÖLÇÜSÜ DEĞİŞİRSE ONA TUTUNAN SÜSÜN SABİTLERİ DE YENİDEN
ÖLÇÜLÜR.** `MIN_CELLS` beş yüzeyde yapısal ölçeği yarıya indirdi ama
süs sabitleri eski ölçekte kaldı: kül çukurlarında kor, 107 px'lik
düzgün örgünün uzun düz kirişleri boyunca akarak "neon boru / devre
şeması" okundu. Kor bir OLAYDIR: kısa, kesikli, seyrek (`frac` 0,34-0,46
+ düşük eşik), kabuk pah/derz alfası ve jitter da yeniden ayarlandı.

---

## KART PORTRELERİ — CR KESİM (2026-09-03) — `game/_pfpbake.js`

Kullanıcı: portreler Clash Royale gibi olsun — sıkı kadraj, doygun DÜZ zemin,
koyu kontur, üstte kenar ışığı. pfp2 turunda arka plan **bastırılıyordu**
(bulanıklık + ton) ve iki kusur kalmıştı: sahne artıkları ve parlak yerlerde
sert bir OVAL HALKA. Fırın (`_pfpbake.js`) çıktıyı `assets/portraits/pfp3/`
altına basar (9 karakter × parlak/derin), kadraj · kademe · kaplama · kesi
kalitesi tablosunu döker. Tezgâh: `Portre Seti - Kesik.dc.html` (kart ölçeği).

- **BASTIRMA DEĞİL KESME.** pfp2'nin koruyucu ovali, en kötü arka planın
  yaşadığı bölgeyi koruyordu: savasci'nin kale duvarı TAM KAFANIN ARKASINDA.
  Bir maske kendi hedefini koruyorsa hiçbir tolerans değeri onu düzeltmez —
  eksen yanlıştır. Zemin artık okunmuyor, KESİLİYOR ve sıfırdan sentezleniyor;
  böylece sızıntı da halka da yapısal olarak imkânsız.
- **AYIRAN SİNYAL NETLİKTİR (alan derinliği), ama TEK BAŞINA YETMEZ.** İki
  ipucu birbirinin körlüğünü kapatır: netlik GRİ ZIRHI gri duvardan ayırır
  (renk ayıramaz), arka planın renk modeline uzaklık PÜRÜZSÜZ CİLDİ ormandan
  ayırır (netlik ayıramaz — okcu'nun boyanmış yüzünde zemin renginde delik).
  Renk ipucu eklenince kesi kalitesi okcu'da 3,26 → 11,79.
- **EŞİK İKİ ÖLÇÜLEN REFERANSIN ARASINA KONUR.** Otsu yanlış yeri böldü:
  savasci'de netlik ortalaması zırh 15,0 · kafa 6,1 · duvar 2,1 ve Otsu iri
  kütleli ZIRHI geri kalandan ayırdı (9,97), yani kafa duvarla aynı tarafta
  kaldı ve ÜÇ AYRI YÖNTEMDE üst üste kesildi. Referanslar: üst şerit = arka
  plan (omuzlar alta/yana değer, tepeye değmez), merkez disk = özne (kadraj
  sözleşmesi). Mutlak eşik de ölü çıkar: bulanık zeminde yayılım ~0 olduğu
  için "yayılım × sabit" denemesinde fC 2,2/3,0/4,0 AYNI sonucu verdi.
- **JEODEZİK PASO SÖKÜLDÜ.** İki etiketli Dijkstra iki ayrı şekilde battı:
  (a) tohum yalnız alt-orta bantta olunca mekânsal maliyet kafaya 250 adım
  yüklerken üst köşeler 30 adımda varıyor ve KAFANIN ÜSTÜ arka etiketleniyor;
  (b) tohumlar düzeltilince de bandın içinde düz cilde dalıp yüz oyuyor
  (düşük gradyanlı yanaktan geçen yol arka tohum için de ucuzdur). Doğru
  mercii yol maliyeti değil ÇEKİRDEKTEN KOŞULLU GENİŞLEME: ince maskenin
  yoğun olması gerekmez, BAĞLI olması yeter. Ölçülmüş diz (kesi kalitesi):
  fA 0,6→2,17 · 0,8→3,63 · **1,0→4,06** · 1,25→4,01.
- **ÖLÇÜT, SINIRI TANIMLAYAN SİNYALLE KURULUR.** İlk ölçüt "mat sınırındaki
  renk gradyanı ÷ ortalama gradyan"dı ve gözle DOĞRU olan matı 0,45 okudu:
  bulanık zemine karşı silüetin renk kenarı yumuşaktır, öznenin zırh dokusu
  ise çok yüksek gradyanlıdır — bölen şişer. Ölçüt sınırın iç/dış şeridindeki
  NETLİK oranına çevrildi (bkz. terrain bölümündeki aynı ders).
- **DELİK DOLDURMA ONAYLI ZEMİNDEN TAŞAR.** "Kenara değen bölge dışarıdır"
  varsayımı yanlış: büst kadrajında kafa/şapka üst kenara DEĞER. Korsan'ın
  koyu tricorn şapkası kenardan sızan bir kanalla dışarı bağlanıp tamamen
  düşüyordu; taşma yalnız üst şerit tohumlarından yapılınca kaplama %53 → %63.
- **ÇENTİK ONARIMI BİÇİM BİLGİSİDİR, SİNYAL DEĞİL.** İki ipucunun da kör
  olduğu yerde (beyaz saç ↔ parlak zemin) medyan profil devreye girer: geniş
  gerçek basamağı korur, dar ısırığı siler. Dört yönde koşar — seher'in
  ısırığı üst kenardan değil YANDAN giriyordu.
- **ZEMİN TONU NADİRLİK MERDİVENİNDEN GELİR (sahibi config.js), İCAT EDİLMEZ.**
  İki tur da renk icat etti: (a) arka planın ortalama tonunu alıp kromayı
  zorla yükseltmek savasci'nin NÖTR GRİ duvarını CANLI PEMBE yaptı — "kroma
  zorlaması renk icat eder"; (b) kaynak tonuna %35 yaklaşmak EFSANE bakırı
  YEŞİL yaptı, yani kademe hiç okunmadı. Kimlik payı ±14° ile sınırlı.
- **GÖMME GENEL ÇÖZÜM DEĞİL, İSTİSNADIR — DÖRT PORTRE.** Matlamanın YAPISAL
  olarak çalışamadığı yerler: gokalev'in koyu mor şapkası koyu mor zeminde ve
  simsek'in avize dolu KESKİN sahnesi (arka netlik 5,0 · özne 13,1) — iki ipucu
  da kör. Korsan ve seher de ikinci turda buraya taşındı: kesik hat silüetten
  parça yiyordu (şapka siperi, saç tepesi) ve kullanıcı "yarım yamalak" dedi.
  Onlarda sahne kademe tonuna gömülür ('color' bileşimi + geniş yumuşak geçiş;
  pfp2'nin hatası bastırma değil SERT OVAL KENARdı). Dokuzun tamamına uygulanan
  bir deneme seti ÖLÇÜLDÜ ve elendi: savasci'nin kalesi, okcu'nun ormanı hâlâ
  okunuyordu (ortalama fark 17,6 ve 33,0).
- **KORUMA ALANI DAİRE DEĞİL ELİPS.** Daire kafayı sarıp GÖVDEYİ bırakıyordu:
  gömme gücü sahneyi silecek kadar yükseltildiğinde korsan'ın paltosu ve
  seher'in omuzları da eriyip "havada duran kafa" okundu (iki güç kademesinde
  ölçüldü). Büst kadrajında özne dikey bir kütledir; koruma da öyle olmak
  zorunda (rx 0,52 · ry 0,76, merkez y 0,52). Gücü artırmak yanlış eksendi —
  sorun maskenin BİÇİMİYDİ.
- **1:1 KART ÖLÇEĞİNDE BAKMAK ZORUNLU.** 117 px kartta (ölçülen vitrin kartı
  genişliği) seher'in saç ısırığı ve korsan'ın eksik şapka siperi neredeyse
  görünmüyor; 512 px'te kabul edilemez görünen iki kusur sevk edilebilir.
  Ölçüt bir sınırdır, tasarımın yerine geçmez.
- **BİLEŞEN FİLTRESİ TEK GEÇİŞLİ OLMAK ZORUNDA** (terrain dersinin tekrarı):
  "her bileşen için tüm görüntüyü tara" deseni ince maskede binlerce delik
  ürettiği için 30 sn bütçesini aştı. Karar bileşen başına bir kez verilir.
- **HATA VEREN BETİĞİN YAZMALARI GERİ ALINIR.** `eval` hatası olan bir
  run_script'in `saveFile`ları rollback edildi; sonraki bake ESKİ
  varsayılanlarla koştu ve tablo süpürmeyle uyuşmadı (%57 yerine %64).
  Bir düzeltme uygulandı sanılıyorsa dosyadan OKUNARAK doğrulanır.
- **GÖRÜNTÜ ÖNBELLEĞİ ÖLÇÜMÜ YALANLAR.** Aynı yola yazılan PNG görüntüleyicide
  eski hâliyle geliyor: üç ayrı bake sonrası birebir aynı kare görüldü.
  Teşhis montajı her turda TAZE bir yola basılır.

### v21 — PORTRELER DÖRT YERE BAĞLANDI (2026-09-03) — `ui.js` · `chests.js` · `style.css`

Kullanıcı onayı: dört yere de bağla · HER YERDE `derin` varyantı.

- **TABLO TEK YERDE YAŞAR.** `PORTRAIT_ART` (ui.js) pfp3'e çevrildi ve dokuz
  karakteri de kapsıyor (eskiden sekizdi, okcu yoktu). Tören `chests.js`ten
  `ui.cardPortrait(id)` ile okur — ikinci bir tablo kopyalanmadı.
- **KART SANATINDA SIRA TERSİNE ÇEVRİLDİ:** `charArt()` önce KART PORTRESİNİ
  verir, tam illüstrasyon yalnız portresi olmayan kahramanda yedektir. Eski
  sıra kartlara sahneli tam boy sanatı kırpıyordu — turun tüm sebebi buydu.
- **İNCELEME SAHNESİ: BÜST OLAN SANAT DEĞİŞİR, GERÇEK TAM BOY KORUNUR.**
  `HERO_ART_BUST` dokuzun sekizini içeriyor, yani "tam illüstrasyon" oralarda
  zaten bir büst kırpımıydı ve sahnesi kadraja giriyordu → portre kullanılır.
  sovalye'nin gerçek tam boy sanatı korunur: iri sahne, tam figürün yaşadığı
  tek yerdir.
- **CANVAS İLE IMG AYNI SINIFI PAYLAŞIRSA KUTU YENİDEN KURULUR.** Tören ödülü
  ve özet tepsisi vektör canvas çiziyordu; canvas kendi çizim kutusunu taşır,
  `<img>` taşımaz — `object-fit: cover` yazılmadan 512² kare 72/44 px'lik
  yuvaya sıkışıp yayılır (style.css v21). Kadraj gereği yüz üst üçte birde
  olduğu için `object-position` yukarı çekilir. Canvas'a düşen yol korundu:
  `querySelector('canvas.rw-portrait')` — etiket seçici olmadan bir `<img>`de
  `getContext` çağrılırdı.
- **TÖREN GİZLİ IFRAME'DE İLERLEMEZ** (üçüncü kez düşüldü, `document.hidden`
  → rAF yok): doğrulama töreni beklemek yerine BESLEYEN iki şeyi ölçtü —
  tablonun dokuz karakteri de dolu, ve törenin ürettiği birebir markup sahneye
  kurulup kutu/kırpma değerleri okundu (rw 72×72 cover %16 · tc 42×42 daire).
- Ölçülen son durum (v21): kahraman kartlarında 9/9 portre yüklü, inceleme
  sahnesi `is-bust`, kuşanım avatarı 74 px, tören markupu ölçüldü, konsol
  temiz. (Set v22'de dikey pfp4'e devredildi — aşağı bkz.)

### v22 — DİKEY 4:5 KADRAJ + PREMİUM ÇERÇEVE (2026-09-03) — `pfp4` · `style.css` v22

Kullanıcı: *"daha kaliteli, daha premium olmalı; fotoğraflar çok kırpılmış
duruyor, daha profesyonelce yap."* Teşhis ölçüldü ve haklıydı: art penceresi
KARE (`aspect-ratio: 1/1`) ve portre de kareydi, dolayısıyla `cover` figürü
kenarlardan yiyordu. CR referansındaki kart DİKEYDİR.

- **ORANLAR EŞİTLENİNCE KIRPMA SIFIRLANIR.** Pencere 4:5'e çevrildi ve portre
  de 4:5 pişirildi (512×640, `pfp4`): ölçülen pencere 114×142 (0,803) ↔ portre
  0,800, yani `cover` hiçbir şey kesmiyor. "Kırpılmış görünüyor" bir kırpma
  YÜZDESİ sorunu değil, KUTU ORANI sorunuydu — object-position ile telafi
  etmeye çalışmak yanlış eksendi (üç tur denendi).
- **ÖLÇEK OMUZ DEĞİL KAFA GENİŞLİĞİNDEN HESAPLANIR.** İlk dikey sürüm mat
  sınır kutusunu çerçeveye sığdırıyordu: kafa+omuz silüeti GENİŞTİR (en/boy
  ~1,5), 4:5 çerçeveye sığdırılınca figür üst yarıda küçülüyor ve alt yarı boş
  zemin oluyordu ("havada duruyor"). CR'de omuzlar çerçevenin YANLARINDAN
  TAŞAR, kafa tam içeride ve üstünde hava var. Ölçek artık kafa genişliğinden
  türer (`headW` 0,46), `headAir` 0,085 üst hava, ve figür dibi çerçeve dibine
  ULAŞMAK zorunda — üç kısıt birlikte çözülür.
- **YERLEŞİM MATTAN HESAPLANIR, KADRAJDAN DEĞİL.** Mat elimizde olduğu için
  figürün gerçek sınırları biliniyor; "kırp" diye bir adım yok, ölçek ve konum
  HESAPLANIR. Kafa arkası ışıması da hedef uzayında konumlanır (kaynak
  kadrajında değil), yoksa figür kaydıkça ışık arkada kalır.
- **MAT BİR PİKSEL İÇERİ ÇEKİLİR (choke).** Dikey kadrajda ölçek 1'in üstüne
  çıktığı için sınırdaki ~2 px tüy 4-5 px'e büyüyor ve kaynağın ZEMİN RENGİNİ
  sızdırıyordu (okcu'nun saç kenarında açık hale). Figür çekilmiş mattan
  (`m512s`) çizilir, kontur ve kenar ışığı GENİŞ mattan üretilmeye devam eder:
  altından ince koyu bir hat çıkar, ki CR dilinde istenen tam budur.
- **GÖMME YOLUNDA KAYNAK ÇERÇEVE BOYUNA OTURUR.** Genişliğe oturtmak üstte ve
  altta ton bandı bırakıyordu; iki gradyan şeritle kapatma denemesi de dikişi
  "kartona yapıştırılmış fotoğraf" gibi gösterdi. Boya oturtulunca yan taşma
  zaten gömülmüş çevrede olur, yüz merkezde kalır — telafi katmanı gerekmez.
- **PREMİUM = KATMAN, DOYGUNLUK DEĞİL.** Fırında üç ucuz katman (zemin gölgesi
  · tepe ışığı · köşe vinyeti) ve CSS'te üç kat çerçeve (koyu taş hat · gümüş
  hairline · kademe renginin ALT dudakta kütlesi). Zemin gölgesi figürün
  ARKASINA çizilir; büst havada durmaz, bir yere oturur. Ekranda ek maliyet
  yok — hepsi pişirmede tek dolgu.
- **BİR KIRPMA YÜZDESİ, KAYNAĞIN ORANI DEĞİŞİNCE YENİDEN HESAPLANIR (v22b).**
  İnceleme sahnesinin portre şeridi dar kabukta YATAYDIR (ölçüldü: 279 px
  kabukta 245×96, oran 2,55) ve oradaki `object-position` değerleri kare pfp3
  için ayarlanmıştı. Hesap: cover genişlikten sürer (245/512 → ölçekli boy
  306 px), 96 px şeridin görünür payı %31 ve pfp4'te yüz merkezi ~%22 →
  p·210 + 48 = 0,22·306, yani **%9**. Ölçülen band %6,2-37,2 ve pfp4 kafası
  %8,5-36: tam oturuyor. Aynı sebeple tören ödül kutusu da 76×95 (4:5) yapıldı
  — kare yuvada dikey portre yine kırpılırdı.
- Ölçülen son durum: kahraman kartlarında 9/9 pfp4 (natural 512×640, pencere
  0,803, kart/ızgara taşması 0), inceleme şeridi 245×95 @ %9, kuşanım avatarı
  74×74 @ %24, tören ödülü 76×95 oran 0,800, tepsi pulu 42×42 daire, konsol
  temiz.

## GÖK TIRMANIŞI — HARİTA ÖNİZLEMESİ + BÖLÜM SEÇİMİ (2026-09-04)
### `game/skyMap.js` (yeni) · `ui.js` · `style.css` v23 · tezgâh `_skytest.html`

Kullanıcı: *"harita önizlemesi çok daha iyi olabilir, referans Clash Royale,
premium, haritaları aşağıdan yukarıya yüksek seviye olarak görebilelim, uçan
adalar devam etsin, tatlı hoş grafikli mobil oyun görünümü; bölüm seçimi net
gözükmüyor, sığmıyor, hoş durmuyor."* Ölçüldü, teşhis doğruydu.

- **SAHNE BİR VİNYETTİ, HARİTA DEĞİLDİ.** Eski `mapArt.js` TEK yüzen ada
  boyuyordu: ilerleme okunmuyor, "tırmanış" hiç görünmüyordu. Yeni sahne bir
  ada ZİNCİRİ: görev 1 en altta, boss adası en tepede. Aynı düzen iki yerde
  kullanılır — ana ekran (sıkıştırılmış dört ada) ve bölüm seçimi (on ada).
- **YOL VERİSİ TEK YERDE YAŞAR** (`climbLayout`): DOM düğümleri boyanmış
  adaların TAM ÜSTÜNE oturur. Eski bölüm seçimi düğümleri ayrı bir sinüs
  eğrisine serpiyordu; sahneyle ilgisi yoktu, ±%29 ile kenara dayanıp
  etiketiyle kırpılıyordu — kullanıcının "sığmıyor" dediği şey buydu.
  Ölçülen yeni durum: 279 px kabukta on düğümün taşması **0**.
- **TATLI/PREMİUM = KALIN SİLUET + TEK IŞIK YÖNÜ.** Opak çim kapağı, sarkan
  fisto etek, koyu kontur, sol-üstten tek anahtar ışık, alttan dünya rengi
  sekme. Saydam gürültü yığmak (terrain dersi ①) burada da yanlış eksendi.
- **SİMETRİK KONİ ON ADADA AYNI DONDURMA KÜLAHIDIR** (kural ②). Kaya
  silueti asimetrik, çıkıntılı ve tabakalı; süs iki ayrı siluetten seçilir
  ve her adada yoktur — ilk turda on adaya on aynı mezar taşı düşüyordu.
- **KALE: TEK KÜTLE "SATRANÇ PİYONU" OKUNUR.** Siluet zenginliği kütle
  SAYISINDAN gelir (iki yan kule + ana burç), detaydan değil; küçük ölçekte
  detay zaten kaybolur.
- **KUTU ORANI BİR KISITTIR** (v22 dersinin tekrarı). Önizleme çerçevesi
  uzun kabukta 8:5 (ar 0,62) ama kısa kabukta **251×70** (ar 0,28): taç ada
  kalesiyle dikeyde ~2,2·r yer ister ve külah çerçevenin ÜSTÜNDEN taşıyordu.
  Tek düzen iki kutuya oturmaz; şerit ↔ standart düzen arasında SÜREKLİ
  geçiş yapılır. Kırpmayla telafi yanlış eksen.
- **`drawHomeMap` KUTUYU DEĞİL SABİTİ OKUYORDU:** `H = max(150, …)` yüzünden
  70 px'lik çerçeveye 150 px'lik tuval çiziliyor, `overflow:hidden` sahnenin
  ORTA BANDINI gösteriyordu (ölçüldü: 248×150 tuval / 251×70 kutu). Bir alt
  sınır, ölçtüğü kutudan büyükse ölçüm değil kırpma üretir.
- **VİNYET DE KUTU ORANINA BAĞLIDIR.** Merkezli radyal vinyet + dip
  karartması, 1120 px'lik dikey tırmanışta ALTTAKİ İLK ADALARI (görev 1-2)
  siyaha boyuyordu: oyuncunun BAŞLADIĞI yer en karanlık yerdi. Uzun tuvalde
  vinyet yalnız yan kenarlardan gelir, dibe de aşağıdaki dünyadan yükselen
  soluk bir ışık konur.
- **AYNI BİLGİYİ İKİ YERE YAZMAK ÇAKIŞMA ÜRETİR.** Sahnenin içinde yüzen
  dünya plaketi boss adasının kalesini kapatıyordu (ölçüldü: plaket 62-130 px,
  külah ~100 px). Bilgi zaten yapışkan başlıktaydı; plaket kaldırıldı, başlık
  iki satır oldu.
- **BOSS DÜĞÜMÜ ADANIN MERKEZİNE KONMAZ:** merkez kalenin yeri. Düğüm
  kayanın önüne, (ry + derinlik·0,35) kadar aşağı oturur.
- **SERPANTİN SİNÜSLE YAZILMAZ:** `sin(i·1,02+0,55)` 1. ve 3. adayı birebir
  aynı x'e düşürüyordu (ölçüldü: ikisi de 745 px) ve yol "tırmanış" değil
  rastgele okunuyordu. Düz zikzak + dörtlü genlik tablosu.
- **ON DÜNYA BEŞ ZEMİN SANATI PAYLAŞIYORDU:** 7-10. dünyalar birebir Dünya 1
  gibi görünüyordu. `PAL` tablosu on zemini de kapsar; yüzey işareti ve
  landmark da dünyaya bağlı. Kroma bilerek kısık (v20 dersi: gece göğünde
  yüksek doygunluk neon okunur) — tepedeki dünya-rengi ışık 0,30 → 0,16.
- Ölçülen son durum (279 px × 540 dvh kabuk): önizleme tuvali kutuya birebir
  (310×84 aygıt pikseli / 248×67 kutu), ortalama parlaklık 50, `#chest-row`
  alt 463 ≤ görünüm alt 465, `home-col` taşması 0, bölüm düğümlerinde taşma
  0, sıradaki göreve otomatik kaydırma çalışıyor (664/1220), konsol temiz.
  Pişirme: önizleme 1-4 ms, dikey tırmanış ~15 ms (tek sefer, önbellekli).
- **ÖLÜ KOD BIRAKILMADI:** `mapArt.js` ve onu okuyan iki tezgâh (`_maptest`,
  `_10maptest`) silindi. CSS tarafında da eski nesil süpürüldü: `.jnode` /
  `.jn-*` düğümleri, sahne içi `.jw-banner` / `.jwb-*` plaketi ve
  `.chsel .jw-banner` ayarı kaldırıldı; azaltılmış-hareket listesindeki
  `.jnode.next` yeni `.cnode.next .cn-disc`e çevrildi (yoksa erişilebilirlik
  sözleşmesi sessizce boşa düşerdi). `.jw-lock` KORUNDU — `.wsel-card.peek`
  hâlâ onu okuyor; bir seçici ölü sanılmadan önce grep edilir.

### v23b — ÖRTÜ PAYLARI SAHNENİN İÇİNE ALINDI (doğrulama düzeltmeleri)

- **SAYFA DOLGUSU BOYANMIŞ SAHNENİN ALTINDA ÖLÜ ŞERİT BIRAKIR.**
  `.page-journey`in 96 px dip dolgusu KART LİSTESİ içindi (kartlar alt
  gezinmenin üstünde boşluk ister); tam kanayan bir sahnenin altında ise
  oyuncu son adadan sonra ~96 px boşluğa kaydırıyordu — turun kapatmaya
  çalıştığı "hoş durmuyor" hissinin ta kendisi. Dolgu bölüm kipinde
  sıfırlanır (`.page-journey.is-chapters`, 0,2,0 — özgüllük dersi) ve o
  pay sahnenin KENDİ yüksekliğine eklenip BOYANIR.
- **ÖRTÜLEN BANDA HİÇBİR ŞEY KONMAZ.** Aynı hata tepede de vardı: 56 px'lik
  yapışkan başlık ayı ve boss kalesinin külahını kesiyordu — tırmanışın
  ÖDÜLÜ, ekran açılır açılmaz yarısı kesik duruyordu. `climbLayout` artık
  `pad {t, b}` alır: boya bantları doldurur, düzen o kadar içeri çekilir.
  Ay da `H·padT + mr·1,25` ile örtünün altına oturur.
- **"ORTA" ÖRTÜLERİ DÜŞTÜKTEN SONRA HESAPLANIR.** Otomatik kaydırma
  `clientHeight·0,55` kullanıyordu; görünür bant = kabuk − başlık − gezinme
  olduğu için "orta" dediğimiz yer gezinmenin arkasına düşebiliyordu.
- **ÖLÇÜLEMEYEN KUTUYA BOYA YAPILMAZ.** `drawHomeMap` ilk yerleşimde kutu
  0 iken taban değerlerle (160×56) çiziyor, `_mapKey` önbelleği yüzünden
  bir daha çağrılana kadar öyle KALIYORDU. Taban değerler kaldırıldı, yerine
  `if (!box.clientWidth) return;`. Bir varsayılan, ölçümün yerine geçmez.

### v28 — ON ADAYA ON AYRI YAPI (2026-09-06) — `skyMap.js` · tezgâh `_skytest.html`

Kullanıcı: *"tasarım güzel ancak birbirlerine benziyorlar; biri kaleyken
diğeri farklı bir şey olsun."* ÖLÇÜLDÜ, teşhis doğruydu ve sebep tekti:
yalnız BOSS adası bir yapı alıyordu (`keep`), diğer dokuzu üç varyantlı
küçük bir süs (`prop`) alıyordu — ve `prop` ZEMİNE göre seçildiği için bir
dünyanın dokuz adası birebir aynı mezar taşını çiziyordu. On ada = bir kale
+ dokuz aynı leke.

- **BU, KURAL ②'NİN HARİTA ÖLÇEĞİNDEKİ HÂLİ** (İZOLE TEKRAR EDEN LEKE
  KONFETİ OKUNUR). Çözüm süsü büyütmek değil, her adaya KENDİ YAPISINI
  vermek: gözetleme kulesi · yıkık kemer · dikilitaş · yel değirmeni ·
  şapel · maden kuyu başı · geçit kapısı · kamp · heykel (+ tepede kale).
- **SİLUET GÖREV İNDEKSİNE BAĞLANIR, RASTGELE DEĞİL.** "Üçüncü ada yel
  değirmeni" oyuncunun aklında bir YER İŞARETİ olur; rastgele atama her
  açılışta başka bir harita demekti (CR'de arenaların akılda kalması da
  böyle çalışır).
- **KİMLİK SİLUETTEN, TON PALETTEN GELİR.** Yapılar dünyanın kendi
  palettinden boyanır (P.rock/P.lip/P.hi/P.prop) — yoksa bu kez on DÜNYA
  birbirine benzemeye başlar, yani aynı kusur bir üst ölçekte geri gelir.
- **BİR KEMERİ KEMER YAPAN ŞEY ALTINDAKİ BOŞLUKTUR.** İlk sürümde bant
  ince, açıklık dardı: 1:1'de "iki taş kütük" okundu. Açıklık 0,52 → 0,68,
  bant kalınlaştı.
- **KOYU ÇİZGİ GECE GÖĞÜNDE KAYBOLUR.** Yel değirmeninin kanatları kontur
  rengiyle çiziliyordu ve zemine karışıp "antenli koni" okunuyordu. Kanat
  AÇIK ve KALIN çizilir, altına koyu bir kontur konur — terrain kuralı
  ①'in çizgi hâli: formun kenarı olmalı, ama form önce GÖRÜNMELİ.
- **DÜZGÜN DARALAN SİLUET 30 px'TE KONİ OKUNUR.** Heykelin pelerini yukarı
  düzgün daralıyordu ve ekranda "trafik konisi" görünüyordu (propModels'in
  "dönel koni vazo okunur" dersi bu ölçekte daha sert işliyor). Bir figürü
  figür yapan şey OMUZ ÇİZGİSİDİR: siluet daralır, omuzda GENİŞLER, boyunda
  yine daralır; baş da ölçeğe göre iri olmak zorunda (0,13 → 0,17).
- **KENDİ KURALIMI BİR ADANIN İÇİNDE İHLAL ETTİM.** Kamp ilk sürümde İKİ
  çadır koyuyordu ve yan yana iki eş üçgen "iki dağ" okundu — turun
  kapatmaya çalıştığı hatanın ta kendisi, bir ada içinde. Tek çadır +
  koyu kapı ağzı + sırık + odun yığını + ocak parıltısı.
- **EN FAZLA ÜÇ KÜTLE:** ölçülen en küçük ada 26 px; o ölçekte detay
  kaybolur, siluet zenginliği kütle SAYISINDAN gelir (`keep` dersi).
- Ölçülen son durum: on dünyanın hepsinde dokuz yapı 1:1'de ayırt
  edilebilir, pişirme **0-3 ms** (v23'teki 1-4 ms ile aynı bant — bozunum
  ve yapı çizimi kare maliyetine DOKUNMAZ, `_mapKey` önbelleklidir),
  konsol temiz.

#### v28b — ASIL SUÇLU TAÇ YAPIYDI (doğrulama bulgusu)

Doğrulayıcı ölçtü: v28 dokuz GÖREV adasını çeşitlendirdi ama kullanıcının
şikâyet ettiği ekranda (DÜNYA SEÇ) baskın öğe kartın ortasındaki İRİ
KALEYDİ ve `keep()` on dünyada birebir aynıydı — içinde `floor` dalı yok,
`pal()` hiç okunmuyor, 11 sabit yazılmış mor-gri hex var, yalnız külah
`wd.color` alıyor.

- **BİR KUSURU BENZER BİR YERDE DÜZELTMEK ONU DÜZELTMEK DEĞİLDİR.**
  "Kimlik siluetten, ton paletten gelir" kuralını yazdım ama yalnız küçük
  adalara uyguladım; ekranın ODAK NOKTASI kuralın dışında kaldı. Bir kural
  yazıldığında o ekrandaki EN BÜYÜK öğeden başlanır — göz oraya gider.
- `keep()` artık bir dağıtıcı: **mezarlık kale · kül dökümhane · bataklık
  batık gemi · katedral katedral · hiçlik ziggurat · gökada gök tapınağı ·
  tuzla tuz kulesi · buzul buz sarayı · kemik bahçesi kemik tahtı · gök
  çarkı dev çark.** Kalenin sabit hexleri de paletten okunan taş rampasına
  çevrildi (P.low → P.rock → P.lip), yani D1'in kalesi artık yeşil-gri taş.
- **SİLUET AİLESİ BİLİNÇLİ SEÇİLİR:** dokuz görev yapısı taş/ahşap ve
  dikeydir; taçlar bilerek başka ailelerden — YATAY kütle (dökümhane),
  EĞİK kütle (batık gemi), BOŞLUK baskın (gök tapınağı), DAİRE baskın (gök
  çarkı), ORGANİK (kemik tahtı). Aynı ekranda iki şey ayrışacaksa farkın
  bir EKSENİ olmalı.
- **BİR YARDIMCININ GİRDİ BİÇİMİ BİR SÖZLEŞMEDİR.** `softGlow`/`al` bir
  `rgba()` STRING'i bekler (`al` düz bir metin değişimidir: `/[\d.]+\)$/`).
  Dökümhaneye HEX verdim; üç durak da opak döndü ve D2 kartında ~130 px'lik
  SERT TURUNCU KARE çıktı — hata yok, konsol temiz, ama ekran bozuk. Tip
  taşımayan bir sözleşme yalnız GÖZLE yakalanır: 1:1 bakmak zorunlu.
- Ölçülen son durum: on kart, on ayrı taç silueti, pişirme 1-3 ms, konsol
  temiz.

#### v28c — ANA EKRAN HARİTASI BOŞ KUTUYDU (v27 regresyonu, doğrulamada yakalandı)

Doğrulayıcı ölçtü: ana ekranda harita önizlemesi HİÇ boyanmıyordu — tuval
tamponu 300×150 (HTML varsayılanı, yani hiç atanmamış), dolu piksel %0,
`ui._mapKey === ''`. Elle `drawHomeMap()` çağrılınca anında doğru boyanıyor,
yani çizim kodu değil TETİKLEME zinciri kırıktı.

- **BİR KAPI, KENDİSİNİ BESLEYEN TEK OLAYI YUTUYORSA KAPI YANLIŞTIR.**
  ResizeObserver'ın gövdesi `page==='savas' && !menu.hidden` ile kapılıydı.
  v27 `.map-frame`i `flex:none + aspect-ratio`tan `flex:1 1 auto`a çevirdi;
  yükseklik artık ilk yerleşimde değil FLEX DAĞITIMIYLA sonra çözülüyor ve
  o oturma AÇILIŞ EKRANI dururken (5 sn, menü hâlâ `hidden`) gerçekleşiyor.
  Tek boyama fırsatı kapıdan geri çevriliyor, boyut bir daha değişmediği
  için gözlemci bir daha ateşlenmiyordu. Gözlemci artık koşulsuz çizer:
  boyama `_mapKey` ile önbellekli, ölçülemeyen kutuda kendisi çıkıyor ve
  gizliyken boyamak sahneyi menü açıldığında HAZIR yapıyor.
- **ÖLÇÜLEMEYEN KUTU "YOK" DEĞİL "HENÜZ DEĞİL"DİR.** v23b'nin
  `if (!box.clientWidth) return;` koruması doğruydu ama vazgeçiyordu ve
  `_mapKey` boş kaldığı için bir daha denenmiyordu. Artık sonraki karede
  yeniden dener (en çok 30 kare ≈ 0,5 sn) — gözlemci yolu düşerse bu ikinci
  ağ yakalar. Bir koruma, korumadığı durumu da çözmek zorundadır.
- **BU SINIF HATA TEZGAHLA YAKALANAMAZ.** `_skytest.html` kendi
  ön-boyutlanmış tuvaline çizdiği için korumayı hiç çalıştırmıyor; v28/v28b
  yalnız tezgahta ölçülmüştü. Bir düzen (layout) hatası ancak GERÇEK
  KABUKTA ölçülür — tezgah çizimi doğrular, yerleşimi doğrulamaz.
- **ÖLÜ KOD BIRAKILMADI:** `.map-float` içinde `display:none` bir ikinci
  tuval (`#map-canvas`, eski 2D harita yolundan kalma) ve onu tutan
  `ui.mapCanvas` alanı ile CSS kuralı silindi.
- Ölçülen son durum (müdahalesiz açılış): `_mapKey` "8:0:247x70", tampon
  247×70 = CSS kutusu, dolu piksel **%100**, ortalama parlaklık **49,7**
  (v23 hedefi ~50), `_mapTry` 0, `.map-float` içinde tek tuval, konsol temiz.

Sıradaki (kullanıcı onayına bağlı): ada zincirinin hafif paralaks salınımı(yalnız bölüm seçimi sayfası, kaydırmaya bağlı — kare başına maliyet yok) ve
görev düğümüne dokununca açılan görev kartı (ödül · dalga · boss önizlemesi).

---

## PREMİUM MOBİL PASO — I. TUR (2026-08-31) — `style.css` v15 bloğu

Kullanıcının teşhisi: *"incecik internet oyunu gibi görünüyor; Clash
Royale menüsü gibi İRİ butonlar olmalı; mağazada sandıklar üç tane yan
yana ve göze çok hoş gelmeli."* Ölçüldü, teşhis doğruydu: alt gezinme
ikonu 25 px (≈4 mm — parmak 9-10 mm), para plaketi 13 px yazı, mağaza
yedi sandığı 54 px'lik glifli DİKEY liste satırı olarak diziyordu.

- **BÜYÜTME `dvh` İLE KLAMPLANIR, SABİT px İLE DEĞİL.** Ana ekranın
  dikey bütçesi sabittir (üst şerit + ikili + harita + savaş + sandık
  şeridi + gezinme). Sabit px ile büyütmek 540 dvh'lik kabukta kolonu
  taşırıyordu; `clamp(58px, 8.4dvh, 74px)` biçimi 540'ta 58, 800'de 67
  verir. Kabuk yüksekliği 100dvh olduğu için dvh burada GERÇEK ölçüdür
  (açılış ekranının vw dersi GENİŞLİK içindi). Ölçüm: 540 dvh · 400 px
  kabukta `home-col` taşması 0, harita 162 px.
- **GENİŞLİK ÖLÇÜSÜ `cqw`** (kabuk `container: shell / inline-size`):
  vitrin kartındaki sandık `clamp(64px, 19cqw, 90px)` — 400 px kabukta
  76 px. `@media` genişlik sorgusu YASAK (bkz. kabuk dersi).
- **MAĞAZA SIRASI DEĞİŞTİ:** sandık vitrini EN ÜSTTE, gem paketleri
  aşağıda. Oyuncu sandığı ister, gemi sandık için alır.
- **BİR SATIRDA ÜÇ SANDIK — dördüncü kolon ölçümle reddedildi:** 430 px
  kabukta kart 88 px'e düşüyor, sandık sanatı 60 px'in altına iner ve
  kademe kimliği (pul, kristal, ejder başı) okunmaz olur. Dar kabukta
  (≤340 px) da kolon sayısı DÜŞMEZ, kart küçülür — "üç yan yana" bir
  sözleşmedir.
- Kart yüksekliği satırda EŞİT olmak zorunda: sanat kutusu sabit
  yükseklik + fiyat plakası `margin-top: auto`. Rozet (`.vc-tag`) yalnız
  bazı kartlarda var; ızgara zaten gerdiği için hiza bozulmuyor
  (ölçüldü: altı kartın hepsi 117×211, ad/kademe/kanca tek satır).
- **IŞIK YELPAZESİ YALNIZ ÜÇ KRAL KARTINDA** (maskeli konik gradyan bir
  doldurma maliyetidir; altı kartta aynı anda çizilmez).
- **YAZDIM ≠ UYGULANDI — v15'in dört büyütmesi ÖLÜ KODDU.** Kurallar  dosyanın SONUNDA olmasına rağmen kazanan eski kurallar `.menu-shell …`
  önekliydi (0,3,0 > 0,2,0) ve sandık glifinde `.menu-shell
  .chest-duo.top .duo-glyph svg` (0,4,1) vardı. Hesaplanan değer
  ölçülene kadar hiçbir şey belli olmaz: madalyon 26×26 (istenen 46-56),
  gezinme dolgusu 6/8, glif 32×30, savaş butonu alt dudağı 2,4 px.
  Düzeltme kazanan seçicinin ÖZGÜLLÜĞÜNDE yazılır (v15b bloğu) —
  CLAUDE.md'nin özgüllük tuzağı dersinin aynen tekrarı.
- **SAVAŞ MADALYONU RIHTIMIN İÇİNDE BÜYÜR, YUKARI TAŞMAZ:**
  `.menu-shell .bottom-nav` `overflow: hidden` taşıyor (parıltı şeridi
  için), taşan disk kırpılırdı. Şerit yükselir, disk içinde oturur.
- **ÜST ŞERİT ÇAKIŞMASI:** `.tbl-bar` `flex:1` + `min-width:60px` ile
  40 px'e sıkışan `.tb-level`in DIŞINA taşıyor, "20/86" etiketi altın
  plakete biniyordu. Bar küçülebilir (`min-width:30px`), plaketler dar
  kabukta (`@container shell (max-width:372px)`) metriklerini kısar.
- **TAŞMA KOLONUN TOPLAMINDAN GELİR, TEK ÖĞEDEN DEĞİL:** dvh klampının
  alt sınırı yetmedi (540 dvh'de 10 px taşma, sandık şeridi alt menünün
  arkasında kırpık). Kısa kabukta (`@media (max-height: 660px)`) BÜTÜN
  büyütmeler birlikte geri alınır. Ölçüt: `#chest-row.bottom <=
  .page-viewport.bottom` (ölçülen 473 ≤ 475) ve `home-col` taşması 0.
- Ölçüm tuzağı: **`html-to-image` yakalaması kaydırma konumunu KAYBEDER**
  (DOM'u klonlar). Vitrinin ikinci satırını görüntülemek için elle
  `display:none` verilir; ayrıca menü diyoraması 60 fps sürerken yakalama
  7 sn'lik JS zaman aşımına takılıyor — `requestAnimationFrame` geçici
  olarak susturulur.

Sıradaki (kullanıcı onayına bağlı): sandık AÇILIŞ töreni, kahraman ·
cephane · etkinlik sayfaları ve görev sonu ekranı aynı kalın dile.

---

## GECE SİYAHI PALETİ (2026-08-31) — `style.css` v16 · v16b

Kullanıcı seçimi (form): **gece siyahı + kızıl kor + gümüş**; vitrin
kartı yorumu **B "KOR SUNAK"** (siyah taş gövde, arkada yanan kor
yarığı, yükselen kıvılcım, KIZIL fiyat plakası). Üç yorum
`game/_shoptest.html` tezgâhında gerçek ölçüde (400 px kabuk → 117 px
kart) ve gerçek `chestArt.js` sanatıyla çizilip seçildi.

**ÜÇ RENK, ÜÇ İŞ — karışmaz:** gece siyahı YÜZEY (sıcak siyah, nötr
değil), gümüş ÇERÇEVE + YAZI (hairline `inset 0 0 0 1px` ile içeriden;
kalın gümüş kenar ucuz görünür), kızıl kor TEK EYLEM VURGUSU (savaş
butonu, fiyat plakası, aktif sekme, hazır sandık). **Kor bir renk değil
bir İŞARETTİR:** her yerde kullanılırsa hiçbir yerde uyarmaz. ALTIN
KALDIRILDI — altın + lacivert bileşimi kullanıcının "incecik internet
oyunu" dediği şeyin ta kendisiydi. Yeşil de kalmadı: "HAZIR — AÇ!"
artık kor.

- **PALET MERKEZİ TOKEN'LARDADIR** (`:root` + eski `--cr-*` ailesi):
  dosyanın SONUNA yazılan tek bir `:root` bloğu (aynı özgüllük, sonra
  gelen kazanır) yüz küsur kuralı birden çevirir. `--gold` değişkeninin
  ADI korunup DEĞERİ gümüşe çevrildi — onu "vurgu" diye okuyan onlarca
  kural yeniden yazılmadan doğru rengi aldı.
- **TOKEN ÇEVİRMEK YETMEZ — SABİT YAZILMIŞ AİLELER ARANIR.** İlk tur
  sonrası ekran görüntüsünde savaş bileti bandı zeytin-altın, taç
  sandığı altın, seviye şeridi teal-mavi kaldı: `.bp-banner`/`.bpb-*`,
  `.duo-card.crown`, `.duo-card.ready-now`, `.tbl-bar i`, `.bp-xpbar i`
  hex'leri sabit yazılmıştı (v16b bloğu). Yeni bir palet dokunuşunda
  ölçüt: ekranda kalan HER sıcak sarı piksel aranır.
- **BU BLOK YALNIZ BOYAR, GEOMETRİYE DOKUNMAZ.** Ölçülmüş dikey
  bütçeler (ana ekran kolonu, inceleme kartı, kısa kabuk klampları)
  v15/v15b'de yaşıyor; v16'da tek bir yükseklik/dolgu değişmedi —
  yoksa ölçülmüş taşma sözleşmeleri sessizce bozulur.
- Tabakalar (`cd-card`, `gd-card`, `ci-card`, `set-sheet`, `me-card`)
  **ID düzeyinden** boyanır: bu ekranların önceki nesilleri ID
  özgüllüğünde yazılmıştı (özgüllük dersi, v15'te bir daha düşüldü).
- Ölçülen son durum (400 px kabuk): altı vitrin kartı **117×221**, kanca
  yükseklikleri 20 px'te eşit, kart başına 1 kor yarığı + 3 kıvılcım.
- **YAKALAMA TUZAĞI:** menü 3B diyoraması sürerken `html-to-image`
  7 sn'lik JS zaman aşımına takılıyor ve `save_screenshot` üst üste
  başarısız oluyor. `requestAnimationFrame`i sustur, `canvas`ları
  `display:none` yap; yine takılırsa doğrulama `eval_js` ile ÖLÇÜLEREK
  yapılır (hesaplanan stil + kutu ölçüsü), ekran görüntüsü beklenmez.

Sıradaki: sandık AÇILIŞ töreni (yerden yükselme · kilit kırılması ·
kapak patlaması · havada dönen ödüller · efsanede duran ekran) ve mağaza
kancaları (reklamlı bonus sandık · GÜNÜN FIRSATI · ilk alışverişe ×2).

### v16c — DOĞRULAMA DÜZELTMELERİ (üçü de kendi kurallarımızdan)

- **ÖLÇÜM GENİŞLİĞİ DE BİR VARSAYIMDIR.** v15b'nin "473 ≤ 475" sözleşmesi
  400 px kabukta ölçülmüştü; 281 px · 540 dvh'de kolon **32 px** taşıyor
  ve sandık şeridi alt menünün arkasında kırpılıyordu. Kısıt ölçüldü:
  daralamayan tek öğe `.page-home .map-stage` (`min-height: 138px`).
  Kısa kabukta harita tabanı 96 px'e iner — **feda sırası kasıtlı:**
  dokunma hedefleri (savaş butonu, gezinme, sandık kartları) KISILMAZ,
  parmak ölçüsü bu turun tüm sebebidir. Yeni ölçüm: iki genişlikte de
  (281 · 400) taşma 0, `#chest-row.bottom` 473 ≤ 475.
- **ÖZGÜLLÜK TUZAĞINA BU TURDA ÜÇÜNCÜ DÜŞÜŞ:** "HAZIR — AÇ!" yeşili
  `.menu-shell #free-chest .duo-state` (1,2,0) idi, v16b'nin sınıf
  zinciri (0,2,0) hiç uygulanmadı. Palet dokunuşunda kural yazmadan
  önce kazanan seçici ÖLÇÜLÜR — üç ekran üst üste aynı hatayı verdi.
- **SESSİZ KIRPMA KABUL EDİLEMEZ:** `white-space: nowrap` + buton
  `overflow: hidden` savaş butonunun alt satırını kelime ortasından
  kesiyordu (239 px metin, 22 px kırpık, üç nokta bile yok). Punto ve
  harf aralığı `@container shell` dallarında kısılır (372 → 8px,
  320 → 7,5px); `text-overflow: ellipsis` bir SİGORTADIR, tasarım
  değil. Ölçülen: 281 px'te metin 191 px / buton 252 px.

### v16e — PALET SÜPÜRGESİ + KİLİT TÖRENİ (2026-08-31)

- **414 SABİT HEX ÇEVRİLDİ.** Token çevirmek yetmiyordu (v16b dersinin
  büyük ölçekli tekrarı): rün kartları, etkinlik bandı, savaş bileti,
  seviye şeridi, seviye atlama şovu, nadirlik rozetleri ve bütün
  lacivert yüzeyler hex'lerini DOĞRUDAN taşıyordu. Aile aile eşlendi
  (altın→kor, teal/buz→gümüş, yeşil→kor, lacivert→gece taşı). Yeni bir
  palet turunda ölçüt: `grep` ile eski ailenin TEK bir hex'i kalmamalı.
- **SEVİYE KALKANI BİR SVG SİLUETİDİR:** v16'nın ilk turunda ona
  `background` gradyanı verilmişti ve kalkanın arkasına gri bir kare
  çiziyordu. Silüetin rengi `currentColor`dan gelir, arkasına kutu
  boyanmaz.
- **KİLİT TÖRENİ EK DOKUNUŞ İSTEMEZ.** Kademeye göre 1-3 kilit
  (`tier>=6` → 3, `>=3` → 2, yoksa 1) tek dokunuştan sonra SIRAYLA
  kendiliğinden kırılır — çoklu dokunuş daha önce açıkça reddedilmişti
  ("yumurta gibi 2-3 tık yok") ve törenin işi oyuncuyu çalıştırmak değil
  ödülü geciktirmektir. Sabırsız oyuncu dokununca sıradaki kilit ANINDA
  kırılır. Aralık 0,42 sn: 0,25'te üç kırılış tek gürültüye karışıyor,
  0,6'da bekleme hissi başlıyor.
- **KİLİT 2D KATMANDA ÇİZİLİR.** 3B sandık modeline kilit eklemek yeni
  geçit + materyal, dolayısıyla ısıtma kaydı demekti (perf kuralı 5);
  kilit bir saniye yaşayan bir OLAY, kalıcı varlık değil.
- **GİZLİ IFRAME'DE TÖREN İLERLEMEZ:** `document.hidden` iken tarayıcı
  `requestAnimationFrame`i hiç çağırmaz, faz makinesi donar. Ajan
  penceresinden "tören takıldı" görünen şey buydu — kod hatası değil.
  Zaman bağımlı sahneler görünür sekmede doğrulanır.
- **v16f — AYNI KIRPMA HATASI BİR EKRAN SONRA TEKRARLADI.** v16c ③  savaş butonu için yazılmıştı; ücretsiz sandık bandı aynı sınıf hatayı
  taşıyordu: 281 px kabukta orta kolona 79 px kalıyor, "ÜCRETSİZ" tek
  kelimesi 16px Cinzel'de 95 px ve kırılamadığı için hem kesiliyor hem
  AL butonunun 9 px içine giriyordu. Bir kırpma kuralı yazıldığında
  AYNI DESENDEKİ (sabit genişlikli yan öğe + esnek metin kolonu) bütün
  bileşenler taranır. Ölçülen (beş genişlik, hepsi geçti): scrollWidth =
  clientWidth ve metin sağ kenarı butonun soluna 4-11 px kalıyor.

Sıradaki: mağaza kancaları (reklamlı bonus sandık · GÜNÜN FIRSATI ·
ilk alışverişe ×2) ve tören ödül inişinin kademe rengine bağlanması.

### v16h — MAĞAZA KANCALARI (2026-08-31)

Kullanıcı seçimi: **reklamlı bonus sandık · GÜNÜN FIRSATI · ilk
alışverişe ×2 gem**. Ortak kural: bir kanca oyuncuya BİR ŞEY VERİR
(bedava sandık, indirim, iki katı gem); hiçbiri sayaç baskısıyla
korkutmaz — geri sayım bitince fırsat başka bir sandığa döner, oyuncu
bir şey KAYBETMEZ.

- **GÜNÜN FIRSATI GÜN İNDEKSİNDEN TÜRETİLİR, RASTGELE DEĞİL.** Sayfa
  her sekme geçişinde yeniden çiziliyor; rastgele bir fırsat her
  çizimde başka sandık gösterirdi. Havuz dört sandık, indirim kademeye
  göre %30-40, fiyat 5'e yuvarlanır, alım günlük olarak damgalanır
  (`kh_deal`).
- **KART YATAYDIR — vitrin ızgarasının ritmini KIRAR**, göz önce ona
  takılır. Tek ışık yelpazesi bu kartta (kral kartlarındaki maliyet
  kuralı burada da geçerli).
- **YEŞİL AİLE v16e SÜPÜRGESİNİN ATLADIĞI AİLEYDİ:** 38 sabit hex
  (birincil butonlar, hazır/sahip durumları, dolum çubukları) hâlâ
  yeşildi. Bir palet süpürgesinde eşleme tablosu ailelerin LİSTESİDİR;
  eksik aile = sessizce hayatta kalan eski palet.
- **IZGARA İÇİNDEKİ BANNER RAYINI AÇIKÇA İSTER.** `.x2-note` tam
  genişlik diye tasarlanmıştı ama `.stone-shop` bir ızgara ve
  `grid-column` verilmediği için bir GEM PAKETİ yuvasını işgal edip
  başlığı üç satıra sarıyordu (ölçülen 128×127 px hücre). `grid-column:
  1 / -1` şart.
- **BASAMAKLI DARALMA YETMEZSE ÖLÇÜ SÜREKLİ OLMALI:** fırsat kartının
  adı üç `@container` basamağına rağmen iki genişlikte (281 · 372)
  sınırın 4-16 px üstünde kalıyordu. `clamp(9.5px, 3.5cqw, 15px)` tek
  satırda çözdü. Ölçülen: beş genişlik × üç ad (ALTIN/BUZUL/MİSTİK
  SANDIĞI) — hepsinde `scrollWidth = clientWidth`, buton boşluğu 8-11 px.

Sıradaki: tören ödül inişinin kademe rengine bağlanması.

### v17 — İKİ ADIMLI AÇILIŞ · KİLİT KALDIRILDI · HD DOKU (2026-09-01)

Kullanıcı: *"mağazadan sandık alırken tek dokunuşta açılmasın — sandık
ekrana zıplasın, altta SANDIĞI AÇ butonu olsun; kilit efektini beğenmedim;
3B sandık önizlemeye tıpatıp benzemeli, doku çok daha HD olmalı."*

- **SATIN ALMA İKİ ADIM, PARA İKİNCİ ADIMDA GİDER.** Kart dokunuşu artık
  yalnız sandığı sahneye çağırır; `spendStones` `ceremony(…, {onConfirm})`
  geri çağrısında, yani "SANDIĞI AÇ"a basılınca çalışır. Tek dokunuşla
  para gitmesi hem yanlış dokunuşu cezalandırıyor hem de sandığı
  gösteren anı atlıyordu. Aynı sözleşme GÜNÜN FIRSATI kartında da geçerli
  (`_markDealBought` de onaya bağlı — iptal edilen fırsat günü yakmaz).
- **BUTON İNİŞ ANINDA GELİR.** Sandık havadayken görünürse oyuncu inişi
  izlemeden basıyor ve zıplayış — turun tüm sebebi — hiç görülmüyor.
  Bekleme fazında sahneye dokunmak sandığı yalnız SİLKELER (merak
  dürtüsü); açma kararı hep butondadır.
- **KİLİT TÖRENİ SÖKÜLDÜ** (v16e'de eklenmişti, kullanıcı beğenmedi):
  `LOCKS`, `drawLocks`, `breakLock`, `'locks'` fazı ve 2D kilit çizimi
  tamamen kaldırıldı — ölü bayrak bırakılmadı.
- **HD DOKU PASOSU — `_hd()` + `_fin()`.** Yüzey dokuları 128²'den
  geliyor ama ekranda 60-260 px çiziliyordu (texel başına ~0,5 ekran
  pikseli = bulanık). `_hd(w,h,s)` tuvali s katı büyütür ve `ctx.scale`
  ile ÇİZİM KOORDİNATLARINI KORUR — sanat aynı, kenar keskin: ahşap ·
  ejder pulu · dövülmüş metal 512², rün çemberi · güneş oyması · glif
  şeridi · filigran · ağız · yıldız iki kat. `_fin()` hepsine sRGB +
  mipmap + anizotropi 8 verir (44° eğik bakış). Ölçülen: 4 yüzey dokusu
  512² ani8, konsol temiz.
- **İKİ FREKANS BANDI KURALI BURADA DA GEÇERLİ** (bkz. HD harita dersi):
  çözünürlüğü büyütmek tek başına "HD" yapmaz — ahşaba 0,25 px lif
  bandı + kalas pahı, pula üst kenar ışığı + dip gölgesi, metale 260
  ince çekiç izi eklendi. Kaba band mip zincirinde yaşar, ince band
  yakın planda okunur.
- **SİLÜET EŞLEŞMESİ: GÖVDE TRAPEZDİR.** Vitrin glifinde gövde üstte 41
  altta 36 birim (0,878); 3B'de düz kutuydu, yani aynı sandık iki yerde
  iki ayrı nesne gibi duruyordu. `_taper(geo, 0.878)` vertex düzeyinde
  daraltır — yeni geometri tipi, yeni çizim çağrısı yok.
- **"AYNI GÖRÜNMÜYOR" ŞİKÂYETİNİN ASIL SEBEBİ DOKU DEĞİL KAPAK TAŞMASIYDI.**
  2D'de kapak gövdeyi kenar başına 1,5 birim (%7,3) aşar; 3B'de taşma
  +10 birimdi (%23,8) ve kapak bir MANTAR ŞAPKASI gibi duruyordu.
  `LW = BW + 3`, `LD = BD + 3`. Görünmeyen eksende (derinlik) de aynı
  oran kullanılır, yoksa kapak eğik bakışta eğri okunur. Kapak
  YÜKSEKLİĞİNE dokunulmadı: ölçülen toplam (slab 5,5 + kubbe 10) / gövde
  20 = 0,775, 2D'nin 17,5/22 = 0,795'iyle %3 içinde.
- **`_rbox` ÖLÇÜLERİ 2r KADAR ŞİŞİRİR** (bevel her iki yanda r ekler):
  ölçüm yaparken `LW+1.6` istenen bir plakanın bbox'ı 49,4 okunur.
  Sabitin uygulandığını doğrulamak için ham bbox değil TÜRETİLMİŞ ölçü
  karşılaştırılır (kubbe genişliği `LW-3` = 42 ✓).
- **WEBGL KANVASI EKRAN GÖRÜNTÜSÜNE GELMEZ** (`preserveDrawingBuffer`
  yok → `html-to-image` boş okur). 3B silüet doğrulaması ÖLÇÜMLE
  yapılır: geometri bbox'ları + `scale.y`, oranlar 2D glifin
  sayılarıyla karşılaştırılır.

Sıradaki: kalan kademelerin (t3 altın · t5 buzul · t6 mistik) 3B
aksesuarlarını 2D glifle bire bir eşlemek.

### v18 — ONAY POP-UP'A TAŞINDI, TÖREN YALNIZ AÇILIŞ (2026-09-01)

Kullanıcı: *"mağazada sandık satın almadaki inceleme ekranı biraz sandık
AÇILIŞ ekranı gibi olmuş; çok daha hızlı animasyon ile küçük popup'ta
gözükmeli."* Doğru teşhis: v17'nin iki adımı DOĞRU fikirdi ama ikisi de
AYNI sahnede geçiyordu (tam ekran, 560 px gökten iniş, 1,6 sn zıplama, 3B
sandık) — iki farklı işi olan iki ekran ayırt edilemiyordu.

- **BİR EKRAN, BİR İŞ:** `#screen-chestbuy` (`ui.openChestBuy`) yalnız
  "hangi sandık · ne kadar · cebinde ne var" der; ödül/patlama/ışın
  yelpazesi AÇILIŞ dilidir ve tören onları tek başına taşır. Gem YALNIZ
  bu kartın kor butonunda harcanır (mağaza kartı + GÜNÜN FIRSATI).
- **HIZ BİR ÖLÇÜDÜR:** kart 150 ms, sandık 200 ms (törenin inişi 1,6 sn).
  Sandık yerinde zıplar, GÖKTEN DÜŞMEZ — düşüş açılışın imzasıdır.
- **`onConfirm`/`costLabel` VE VAZGEÇ SÖKÜLDÜ** (v17c'de eklenmişti):
  törene giren her sandığın ücreti artık ödenmiştir, iptal edilecek bir
  şey yok. Escape/iptal pop-up'a taşındı (kapatmanın üç yolu: ✕ · zemine
  dokunma · Escape). `.chest-abort-btn` CSS'i de silindi — ölü kural yok.
- **`.btn-rune` TABANI `min-width: 240px` TAŞIYOR:** 279 px kabukta kart
  208, buton yuvası 176 px — buton kartın `overflow: hidden`ı içinde
  48 px SESSİZCE kırpılıyordu (v16c ③ ve v16f'nin üçüncü tekrarı). Yuvası
  dar olan bir butonda min-width sıfırlanır, punto basamakla kısılır.
- Geometri ve animasyon ID düzeyinden yazılır: `.ci-card`ın 320 ms `ciPop`
  animasyonu (0,1,0) sınıf zinciriyle ezilemez (özgüllük dersi). Yeniden
  tetikleme `animation: none` + `.pop` sınıfı çiftiyle yapılır.
- Backdrop blur bu overlay'de KAPALI: tam ekran blur bir dolgu maliyeti
  ve 150 ms'lik bir kartın açılışını hissedilir şekilde geciktirir.
- Ölçülen (279 px kabuk): kart 208 px, buton kırpması 0, kart/overlay
  yatay taşması 0, satın alma 2836 → 2822 gem, pop-up kapanıp tören
  açılıyor, GÜNÜN FIRSATI kartında üstü çizili fiyat + %40 rozeti taşmıyor,
  tören dört ödülü gösterip temiz kapanıyor, konsol temiz.

### v20 — KOR SÖNDÜRÜLDÜ: NEON TURUNCU → DÖVME BAKIR (2026-09-01)

Kullanıcı: *"turuncular aşırı parlıyor, göz yormayan premium bir renk ile
devam edelim."* Ölçüldü: vurgu `#ff5a2c` ≈ oklch(0.68 **0.20** 38) — hue
38'de gösterilebilir en yüksek doygunluğa yakın, üstelik gece siyahı
zemin üzerinde. **Parlamanın sebebi HUE değil KROMAYDI**, o yüzden kimlik
(sıcak kor) korunup doygunluk yarıya indirildi:
`--ember-hi #ff9a5c→#d8a284` · `--ember #ff4a26→#b06a49` ·
`vurgu #ff5a2c→#b87351` · `--ember-lo #c81f14→#7f4130`. Üçü bir
MERDİVENDİR (aynı hue, üç aydınlık): gradyanlar tek ailede kalır.

- **İKİ AŞAMALI SÜPÜRGE** (v16b/v16e dersinin ölçekli tekrarı): ① adlı
  aile 324 sabit hex/rgba olarak eşlendi; ② kalan uzun kuyruk (kehribar
  parıltılar, sıcak vurgu çizgileri — 202 değer) ELLE DEĞİL ÖLÇÜLEREK
  dönüştürüldü: kroma %45 azaltıldı, luma 140 üstünde %12'ye kadar
  kısıldı. Elle eşleme bu ölçekte mutlaka aile atlar.
- **AYIRAN ÖLÇÜT `g > b`:** turuncu ailesinde yeşil maviden büyüktür, kan
  kırmızısında (`--blood` #ff3b4e) küçüktür. Bu tek karşılaştırma, can/
  hasar dilini süpürgenin dışında tuttu — kan bir UYARI rengidir ve
  sönükleştirilmez.
- **SÖNÜKLEŞTİRME TEK BAŞINA YETMEZ, KOYULAŞTIRMA DA GEREKİR:** ilk turda
  SAVAŞ butonu soluk somon okundu (büyük yüzeyde düşük kroma = zayıf
  kütle). Merdiven bir kademe koyulaştırıldı (`#ca664d→#a85838`,
  `#9a4a34→#5f2f20`, 19 değer). Ölçüt: CTA gövdesi ≤ 0.62 aydınlık.
- Ölçülen son durum: tüm sekme tint'leri `#b87351`, birincil buton
  `#d8a284 → #b87351 → #7f4130`, canlı arayüzde neon sıcak piksel yok
  (tarama: r>200 ∧ r−b>95 ∧ g>b → yalnız sönük bakır/kum tonları),
  konsol temiz.
- 3B savaş sahnesi (ateş, isabet flaşı, patlama) BİLEREK dokunulmadı:
  kullanıcı "arayüz için" dedi ve oyun içi kor bir okunabilirlik aracıdır.

### v19 — AÇILIŞ BUTONU VE SANDIK BAŞLIĞI SÖKÜLDÜ (2026-09-01)

Kullanıcı: *"'SANDIĞI AÇ' butonu ve 'BUZUL SANDIK' ismi kaldırılmalı,
ekrana tıklayarak açılsın, butonlara gerek yok."*

- **ONAY POP-UP'I BUTONU GEREKSİZ KILDI.** v17'nin butonu "mağazada tek
  dokunuşla para gitmesi" sorununu çözmek için gelmişti; o iş v18'de
  pop-up'a taşındı. Törene giren sandığın ücreti ödenmiştir — oyuncuyu
  bir düğmeye daha bastırmak boş bir adımdır ve buton sahnenin en iri
  nesnesi olarak sandığın önüne geçiyordu. Ad da pop-up'ta okunmuştur;
  kimliği modelin kendisi taşır. İkisi de kaldırıldı, CSS'leri
  (`.chest-open-btn`, `.cob-l/.cob-s`, `chestOpenPop/Breathe`,
  `.chest-title` × 3) SİLİNDİ — ölü kural bırakılmaz.
- **DAVET İNİŞ ANINDA GELİR** (butonun sözleşmesi ipucuna devredildi):
  sandık havadayken görünürse oyuncu zıplayışı izlemeden dokunuyor.
  İpucu artık sahnenin TEK daveti olduğu için 11 → 13 px ve nefes alır,
  ama gümüş kalır (kor TEK eylem vurgusudur).
- **"MERAK SİLKELEMESİ" DE GİTTİ:** bekleme fazında dokunmak artık
  doğrudan açar; iki farklı dokunma anlamı (silkele / aç) aynı sahnede
  yaşayamaz.
- **DEVRALINAN `flex-wrap: wrap` BİR KOLONU ÇOK KOLONA ÇEVİRİR.**
  Ölçümde çıktı: `.chest-rewards` (eski nesil) wrap taşıyor, `#chest-rewards`
  ise yalnız `column` yazıyordu — yükseklik dolunca kolon SARIYOR, "devam"
  ipucu kabuğun 108 px sağına düşüyor ve tören ekranı 123 px yatay kayıyordu
  (v17d'nin kapattığı çıkmazın kaydırmalı hâli). Bir yön kuralı yazılırken
  wrap AÇIKÇA kapatılır. Ölçülen: nowrap, idle taşma 0.
- Ölçülen akış: mağaza kartı → pop-up → 3469→3455 gem → tören açılıyor,
  ipucu "AÇMAK İÇİN EKRANA DOKUN" (13 px), ekrana dokunuş açılışı
  başlatıyor, dört ödül çiziliyor, `#chest-open`/`#chest-name` DOM'da yok.
- Hatırlatma (yine düşüldü): **gizli iframe'de tören ilerlemez**
  (`document.hidden` → rAF yok). Faz ölçümü görünür sekmede yapılır.

### v17c — İKİ ADIMLI AKIŞIN ÇIKIŞI OLMAK ZORUNDA (2026-09-01)

- **BİR ONAY EKRANI İPTAL EDİLEBİLİR OLMALIDIR.** Önizleme fazında
  sahnedeki tek etkileşimli öğe "SANDIĞI AÇ"tı: geri yok, Escape yok,
  overlay alt gezinmeyi kapatıyor — mağazada yanlışlıkla karta dokunan
  oyuncunun ödemekten başka çıkışı yoktu. Bu, iki adımlı akışın kendi
  gerekçesini ("yanlış dokunuşu cezalandırma") tersine çeviriyordu.
- **İPTAL YALNIZ PARASI GİTMEMİŞ ÖNİZLEMEDE ÇİZİLİR** (`opts.onConfirm`
  varsa: mağaza kartı · GÜNÜN FIRSATI). Ücretsiz/reklam/zafer
  sandıklarında ödül ceremony'den ÖNCE alınır (`claimFree()`), orada bir
  iptal düğmesi sandığı ÖDÜLSÜZ YAKAR — bu yüzden hiç çizilmez ve
  Escape de bağlanmaz. Ölçüldü: ücretsiz sandıkta düğme gizli, Escape
  etkisiz; mağaza sandığında VAZGEÇ 130×46, iptalden sonra gem 2937
  sabit, `ceremonyActive` false, alt gezinme yeniden tıklanabilir.
- `abort()` `finish()` DEĞİLDİR: `applyRewards` çağrılmaz, `slotIdx`
  tüketilmez, dinleyiciler ve 3B kanvas temizlenir.
- Kor İKİNCİL eylemde kullanılmaz: VAZGEÇ demir gövdeli sessiz bir
  düğmedir, sahnedeki tek kor nesne "AÇ" olarak kalır.

### v17d — DEKORATİF TAŞMA BİR ÇIKMAZ ÜRETİR (2026-09-01)

Tören overlay'i YATAY kayıyordu (`scrollWidth − clientWidth` = 548;
281 px kabukta 607) ve tek bir kaydırma hareketi "SANDIĞI AÇ" ile
"VAZGEÇ"i ekran dışına süpürüyordu — v17c'de kaldırılan çıkmazın
kaydırmayla geri gelmiş hâli. Üç ayrı sebep, üçü de ölçüldü:

- **`overflow-x: hidden` KAYDIRMAYI ENGELLEMEZ:** hidden bir kutu hâlâ
  kaydırma kapsayıcısıdır; `scrollLeft = 400` atandığında buton yine
  gitti. `clip` bunu düzeltir ama taşmanın KENDİSİNİ bitirmez.
- **MUTLAK KONUMLU DEV DEKOR, KAYDIRMA ALANINI BÜYÜTÜR.** 160vmax'lık
  `#chest-rays` (görünmez, `pointer-events: none`) overlay'in doğrudan
  çocuğuydu. Çözüm KIRPMA KABUĞU (`.chest-fx-clip`, `inset: 0`,
  `overflow: hidden`): kutu içeride kırpar, dışarıya sıfır genişlik
  bildirir. Dekoratif katman asla kaydırma kapsayıcısının çocuğu olmaz.
- **BUTON GENİŞLİĞİ `vw` İLE VERİLMEZ** (kabuk dersi, bir kez daha):
  `min(78vw, 300px)` viewport'u ölçüyordu, kabuğu değil; 279 px kabukta
  buton 300 px kalıyordu. `min(86%, 300px)` kabuktan türer.
- **JS'TE SABİT PİKSELLE KURULAN KANVAS DA TAŞAR:** `#chest-canvas`
  (340) ve `#chest-canvas-3d` (350) 279 px kabukta 35 px taşıyordu;
  `max-width: 100%` çizim koordinatlarına dokunmadan sığdırır.

Ölçülen son durum (281 · 320 · 400 px): `scrollWidth − clientWidth = 0`,
`scrollLeft` atanınca buton KIMILDAMIYOR, buton 187/219/270 px, VAZGEÇ
46 px, 3B kanvas 231/270/350 px, konsol temiz.

### v17b — DOĞRULAMA: PLAKAYA OTURAN HER PARÇA GÖMÜLÜYDU (2026-09-01)

- **BİR ÖLÇÜYÜ TÜRETMEK ONU TAHMİN ETMEK DEĞİLDİR.** `_rbox`'ın bevel
  şişmesi r'den doğrudan hesaplanamıyor (r=2,4 için ölçülen derinlik
  5,4 = 2,6 + 2·**1,4**, yani 2r değil). İlk düzeltmede 2r varsayıldı ve
  anahtar deliği plakanın 1,7 birim ÖNÜNDE havada durdu. Doğrusu değeri
  plakanın KENDİ bbox'ından okumak: `_plateProbe.boundingBox.max.z`.
  Ölçülen son durum: plaka ön yüzü 19,0 · delik ön yüzü 19,7 (0,7 proud)
  · koni 21,6 — delik artık görünür, hem de plakaya oturuyor.
- **AYNI HATA DÖRT KADEMEDE BİRDEN YAŞIYORDU** (t1 · t2 · t6 · t7): delik,
  koni, dört perçin, kâhin gözü, göz bebeği, kor hale ve elmas mühür
  hepsi `BD/2 + 2.6`da sabit yazılıydı, yani plakanın 1,6 birim içinde.
  2D glifin İMZA detayı (koyu anahtar deliği) hiç görünmüyordu. Bir
  konum sabiti, oturduğu yüzeyden TÜRETİLİR.
- **KÖŞE DİREĞİ GÖVDEYİ AŞMAZ, AHŞABI KAPATMAZ.** t2'de 3,6 kalınlık ×
  (BH+2,4) dört direk + plaka + iki kuşak birleşince bal meşesi gövde
  kayboluyor, 3B "boyalı metal kutu" okunuyordu — `_plankTex` HD
  pasosunun kazancı görünmez oluyordu. 2D'de köşede yalnız 2,2 kalınlık
  bir mahmuz var. Ölçülen: 1,7 × 18,8, tepe 21,8 ≤ gövde tepesi 23.
- **TÜRKÇE: `-ı` İYELİK EKİ YALNIZ AD+AD BİRLEŞİĞİNDE.** GÜNÜN FIRSATI
  başlığı "BÜYÜLÜ SANDIĞI" basıyordu; sıfatla "BÜYÜLÜ SANDIK" olur.
  Kısaltılmış ad + elle eklenen ek yerine `CHESTS[t].name` kullanılır —
  tören başlığı zaten oradan doğru okuyordu.

### v16i — SÜPÜRGE KENARI, PARILTIYI VE JS'İ DE KAPSAR

Doğrulayıcı "arayüzde tek yeşil/altın piksel yok" iddiasını ÖLÇÜMLE
çürüttü; üç sızıntı da bu dosyada zaten yazılı derslerin tekrarıydı:

- **DOLGU ÇEVİRMEK YETMEZ — `border` VE `box-shadow` DA ÇEVRİLİR.**
  v16h yalnız `background`ları taramıştı: kor "TOPLA" butonunun
  etrafında yeşil halka (`#2c6e24`, yedi kural) ve yeşil dış parıltı
  (`rgba(80,180,60,…)`) duruyordu. Bir palet süpürgesinde taranacak
  özellik listesi: background · border · box-shadow · outline · fill ·
  stroke · accent-color.
- **NADİRLİK RENKLERİ JS'TEN SATIR İÇİ GELİYOR** (`--rar`,
  `config.js` `RARITIES`/`CHAR_RARITIES`): hiçbir CSS süpürgesi onları
  göremez — `--tc` dersinin birebir tekrarı. Merdiven kendi dili olarak
  KORUNUR (gri → bronz → mavi → mor) ama TEPESİ kordur: efsanevi
  oyunun en arzu edilen nesnesidir ve bu palette arzu = kor. Yeşil
  YAYGIN bronza (`#c98a5a`), altın EFSANEVİ kora (`#ff7a2c`) döndü.
- **İSTİSNA (bilerek): eşya glif tablosu** (`ui.js` ikon tint'leri —
  `coin`, `tac`, `yuzuk`, `zar`) altın kalır. Orada altın bir arayüz
  vurgusu değil NESNENİN KENDİ RENGİDİR; altın parayı gümüş çizmek
  nesneyi tanınmaz yapar.
- **EŞYA ADI KIRPILMAZ:** cephane kartında tek satır + üç nokta "Buz
  Kristali Asası"nı "Buz Kri…" yapıyordu. Ad, eşyanın kimliğidir: iki
  satır (`-webkit-line-clamp: 2`), dar kabukta üç. Punto 8 px'in altına
  inmez — okunabilirlik tabanı satır sayısından önce gelir. Ölçülen:
  üç genişlikte 44 adın 44'ü tam, kart hizası ızgaradan geliyor.

### v16g — YER GEZİNMEDEN DEĞİL DİYORAMADAN ALINIR

Kısa kabuk dalı (`max-height: 660px`) v15b'de dikey yer açmak için
gezinmeyi de kısıyordu: 540 dvh · 281 px'lik gerçek küçük telefonda
sekmeler **35 px** (≈5,5 mm) oluyordu — yani turun TÜM SEBEBİ olan
"İRİ dokunma hedefleri" isteği tam da en dar cihazda geri alınıyordu.
v16c'nin feda sırası burada da geçerlidir ve artık istisnasız: **dokunma
hedefi kısılmaz.** Gereken 10-12 px, dokunma hedefi OLMAYAN harita
çerçevesi (82 → 70) ve kaidesinden (54 → 52) alındı.

Ölçülen (540 dvh · 281 px): beş sekme **52×44**, SAVAŞ 52×59, madalyon
46×46, `home-col` taşması 0, `#chest-row.bottom` 462 ≤ 464.
**Bir bütçe kuralı yazarken hangi öğenin dokunulmaz olduğu ÖNCE
belirlenir**, yoksa "yer aç" talimatı en değerli pikselleri yer.

### v16d — SEKME VURGUSU: İKİ YENİ SESSİZ SAHİP

- **SATIR İÇİ STİL HİÇBİR SEÇİCİYLE EZİLEMEZ.** Beş sekmenin tint'i
  (`--tc`) index.html'de satır içi veriliyordu — mağaza YEŞİL
  (`#4fd48a`), savaş ALTIN (`#f5c044`) — yani "yeşil kalmadı" denen
  arayüzde aktif sekmenin parıltısı yeşil çiziliyordu. CSS'ten
  çevrilemez; beşi de HTML'de kora çevrildi.
- **BİR RENGİ ARARKEN `@keyframes` DE ARANIR.** Aktif sekmenin gerçek
  sahibi `navActiveGlow` animasyonuydu: `box-shadow`u her karede yazıyor
  ve animasyon bildirimi normal sıralamayı YENER, yani kuralın rengi ne
  olursa olsun ekranda keyframe'in rengi görünür (ölçülen: gümüş
  `rgb(230,236,246)` — keyframe `var(--cr-gold)` okuyordu). Keyframe
  özgüllükle ezilmez, aynı ADLA yeniden tanımlanır. Ölçülen son durum:
  `inset 0 3px 0 rgb(255,90,44)`.
- **GİRİŞ ANİMASYONU SÜRERKEN TAŞMA ÖLÇÜLMEZ:** `riseIn` çalışırken
  `transform` kaydırma taşmasına sayılıyor ve `.home-col` 32 px taşıyor
  görünüyor; animasyon oturduktan sonra 0. Ölçüm animasyon bitince
  yapılır (doğrulayıcı da aynı tuzağa düştü ve ikinci ölçümde düzeltti).

---

## PET/YOLDAŞ SİSTEMİ KALDIRILDI (2026-08-18)

Yumurta · kuluçka · yoldaş · besleme ekonomisi **komple söküldü** (ürün
kararı: bütçe ve zaman ayrılamıyor). Silinen dosyalar: `pets.js` ·
`petUI.js` · `petArt.js` · `petBird.js` · `eggScene3d.js` ·
`dragonModel.js` · `dragonAnim.js` · `flame.js` (FlameJet yalnız ejder
rigi tarafından kullanılıyordu) · `_eggtest.html` · `_rigtest.html` ·
`assets/pet/` (2 GLB). Ayrıca ~1.290 satır CSS ve `render3d`'de 273
satırlık yoldaş bölümü.

Bilinmesi gerekenler:
- `meta.pets` alanı artık `loadMeta`'da **hiç üretilmiyor**; eski
  kayıtlardaki alan ilk kaydetmede sessizce düşer. Geri dönüş yok.
- Görev sonu ödül tablosu tek paraya (yakut) + garanti sandığa indi;
  `rollEggDrop`, `eggFull`, `.me-egg` ve alt sekme rozeti (`.nt-badge`)
  gitti. Alt gezinme **beş** sekme (mağaza · cephane · SAVAŞ · kahraman ·
  etkinlik) — `tabOrder`/`order` dizileri ui.js'te iki yerde yaşar.
- `pBullets` havuzundaki `isPet` bayrağı da kalktı.
- Yeni bir yardımcı-yaratık isteği gelirse sıfırdan yazılır; eski kodu
  geri getirmeye çalışmak (çift iskelet, IndexedDB önbellek formatı,
  4 nesil ölü CSS) yeni yazmaktan pahalıdır.

---

## DENGE REVİZYONU (2026-08-18) — ÖLÇÜM TEZGAHI `_baltest.html`

Kullanıcının teşhisi "bazı kahramanlar/kartlar diğerlerini eziyor"du.
Gözle bakılarak çözülmez: dokuz kahraman × iki mesafe sınıfı × dört
nadirlik. Tezgah (`game/_baltest.html`) config.js'i **canlı** okur,
hiçbir şey kaydetmez, oyunu başlatmaz.

### Ölçüt: BİLEŞİK GÜÇ PUANI (tek hedef dps ölçüt DEĞİLDİR)
Savaşın çoğu kalabalıkta geçer: 2,4 radyanlık bir kılıç üç düşmana
değerken tek hedefli bir top birine değer. Bu yüzden

```
puan   = 0,40 × tek hedef dps + 0,60 × kalabalık dps
hedef  = kadro tabanı × nadirlik(1 · 1,12 · 1,25 · 1,45) × stil
stil   = yakın ×1,08 (mesafe kapatır, temas yer) · menzil ×0,94
```

Kalabalık payı mermili silahlarda **delmeden türetilir** (`1 + 0,7·p`,
tavan 3,0) — elle yazılmış tablo, delme değişince sessizce yalan söyler.

### Ölçülen bozukluklar ve düzeltmeler
| ne | önce | sonra |
|---|---|---|
| Sapancı (adi, menzil) | −55% | −5,8% |
| Ay Okçusu (nadir) | −38% | +0,9% |
| Ayaz (nadir) destanı geçiyordu | +11% | +3,1% |
| Kara Kaptan (efsane) | +61% | +5,2% |
| Gökalev (efsane) | +31% | +3,5% |
| L5/L1 büyümesi (Gökalev · Kaptan · Okçu) | ×18,8 · ×16,7 · ×13,0 | ×5,6 · ×5,4 · ×5,7 |
| D6 boss süresi (destan L5, kuşanımsız) | 258 sn | ~97 sn |
| normal görev süresi | 1,9-5,7 dk (ort 4,0) | 2,9-6,2 dk (ort 4,8) |

**ÇİFT ATIŞ İMZA SİLAHLARINDAN KALDIRILDI.** L5'te `volley: 2` hasarı
ikiye katlıyor, aynı seviyede artan delme de kalabalık payını %76
büyütüyordu: çarpımsal olarak menzilli efsane kahramanlar geç koşuda
yakın dövüşün iki katı oluyordu. İmza silahlarında tek mermi kalır
(`descUp` metinleri de değişti); çift atış imza OLMAYAN silahlarda
(ok/küre/tabanca/saçma) duruyor.

### `waveDuration` ÖLÜ KODLA ÇARPIŞIYORDU
Dalga süresi İKİ yerde yazılıydı: `config.waveTime` (kimse okumuyordu)
ve `main.waveDuration` (`min(60, 16+4w)` — gerçek olan). Görev süresini
config'ten ayarlayan biri hiçbir şey değiştirmemiş oluyordu; ölçüm
tezgahı bile yanlış fonksiyonu okudu ve "hedefe ulaştık" dedi. Artık
`waveDuration` yalnızca `waveTime`'ı çağırır. **Süre ayarı tek yerde.**

Sonraki denge dokunuşunda: tezgahın ① ve ② tablolarında sapma ±%10
bandını, ③'te 3,6-6,5 dk bandını, ⑤'te boss süresini kontrol et. Bir
silahın sayısını değiştirdikten sonra ölçmemek, bu dosyadaki her denge
notunun defalarca düştüğü tuzaktır.

### Pasif kart bandı
`gazap` havuzun en iyi kartıydı (+%12 hasar **ve** tek başına 5 kademe;
toplam +%60, ikinci en iyinin iki katı). Artık 4 kademe × +%11; çabukluk
+%9 → +%10, mıknatıs +%45 → +%55, kalp +20 → +22 can. Yeni pasif
eklerken ölçüt: bir kart ~+%10 dps **ya da** ~+%20 efektif can.

---

## İSABET + İMZA KATMANI (2026-08-19) — `render3d._buildImpactFx`

Vuruşun 3B'de HİÇ izi yoktu (yalnız 2D kan spreyi + hasar yazısı), yani
sahnede iyi görünen tek şey üç imza yeteneğiydi. Tek ORTAK katman geldi:
her silah, her kahraman buradan geçer.

| kademe | ne | nereden |
|---|---|---|
| 0 | sıradan vuruş — sıcak beyaz flaş + yön kesiği | `combat.applyHit` |
| 1 | kritik — altın, + basık şok halkası | `combat.applyHit` |
| 2 | ağır: ölüm (koyu kızıl) · alan hasarı (kehribar) | `enemyManager.onDeath` · `main.explode` |
| 3 | **imza anı** — yerden yükselen sütun + geniş zemin mührü | `weapons` (5 tetik) |

Kademe 3'ün rengi yeteneğin kendi dilinden gelir: Ayaz cam göğü · Kraliçe
menekşe · Kaptan barut kehribarı · Seher/diğer kor. Tetikler: girdap
(360° savuruş) · Gök Kılıcı · yan ateş · Ayaz Kabuğu. **Sık tekrarlanan
olay imza DEĞİLDİR** — nova ve kasırga bilerek bağlanmadı (her atışta
tetiklenirdi, "imza" olmaktan çıkar; sarsıntı politikasıyla aynı mantık).

- Üç mevcut quad mesh paylaşılır: **yeni doku/mesh/çizim çağrısı YOK.**
- `BUDGETS.impacts` (14/22/30) + `FLEX 0.30` — esnekliği partikülden
  DÜŞÜK: isabet flaşı süs değil geri bildirimdir. Son ÜÇ yuva kademe 3'e
  ayrılmıştır, kalabalıkta imza anı yuvasını kaptırmaz.
- Sahnede isabet yokken tampon **hiç yüklenmez** (`_impPrev` kapısı):
  `commitInstanced(mesh, 0)` bile GPU trafiğidir ve bu katman tüm
  kahramanlarda yaşıyor.
- Sarsıntı EKLENMEZ (rutin olay kamerayı sarsmaz).
- **Görüş alanı kapısı zorunlu** (`combat` ve `onDeath` ikisinde de):
  kalabalık dalgada ekran dışında onlarca isabet olur ve her biri halka
  tamponundan yuva alır — oyuncunun GÖRDÜĞÜ vuruş, görmediği vuruş
  tarafından tampondan atılır. Ölçüt çizim maliyeti değil, geri
  bildirimin doğruluğu.
- Isıtma kaydı ZORUNLUYDU: üç materyal `visible = false` doğuyor ve
  `precompileScene` sahneyi görünür düğümler üzerinden geziyor, yani ilk
  vuruşta shader derlenip tek karelik takılma oluyordu
  (`Warmup.add('isabet katmanı shaderı', …)` üçünü bir kare görünür yapar).
- Görsel doğrulama: `game/_firetest.html` dört kademeyi de çizer. O tezgahta
  sahte oyun nesnesinin `pools.zones/rings/bombs` ve `enemies.pool` alanları
  ZORUNLU — eksikken `_updateFireHits` sessiz TypeError atıyordu (WebGL
  kanvası boş kalmadığı için hata yalnız günlükte görünür).

---

## KABUK GENİŞLİĞİ @media İLE ÖLÇÜLMEZ (2026-08-19)

Oyun kabuğu (`#app`) ekranın ortasında dar bir kolon: `max-width:
min(100vw, 100dvh × 0.52)`. Buna rağmen CSS'te **14 tane
`@media (max-width: …)`** kuralı vardı ve hepsi tarayıcı viewport'unu
ölçüyordu. Ölçülen: 1024×768 tablette kabuk 399 px genişliğinde ama
`(max-width: 420px)` hiç tetiklenmiyor — yani dar kabuk için yazılmış
her sıkıştırma kuralı **yalnız gerçek telefonda** çalışıyor, tablet,
masaüstü ve emülatörde (MEmu/Nox 1280×720) ölü kalıyordu.

`#app` artık `container: shell / inline-size` ve o on dört sorgu
`@container shell (max-width: …)` oldu. **Yükseklik sorgularına
dokunulmadı** — kabuk yüksekliği viewport yüksekliğine eşit, onlar
zaten doğru ölçüyordu. Karışık OR sorgusu (`max-width VEYA max-height`)
iki kurala bölündü.

İki tuzak (ikisine de düşüldü):
- **Bir kapsayıcı KENDİ sorgusuyla biçimlenemez.** `container` inceleme
  kartının üzerindeyken `@container` bloğu kartın `grid-template-columns`
  unu hiç değiştirmedi ama çocuklarını tek kolona taşıdı: kart 40/60
  kalırken içerik %40'a sıkıştı. Kapsayıcı ÜST öğe olur.
- Global bir regex ile çeviri yaparken **kendi yorum metnini de** değiştirir.

Yeni bir kırılma yazarken: genişlik → `@container shell`, yükseklik →
`@media`. vw/vh hiçbir zaman (açılış ekranı dersi).

---

## KAHRAMAN İNCELEME v4 — BÖLÜNMÜŞ DÜZEN (2026-08-19)

Eski kart DİKEY akıyordu: üstte 176 px'lik sahne, altında kaydırmalı
sayfa. Kullanıcının teşhisi "uygun bir banner bulamıyoruz" idi — doğru
cevap banner ARAMAK değildi: elimizdeki portreler DİKEY, o yüzden sol
kolonun TAMAMI portre paneli oldu (`object-fit: cover`, nişan üstten
%18 — yüz orada). Yeni görsel üretmek gerekmiyor.

- Izgara: `40% 1fr` iki kolon, iki satır. Sahne sol/üst, bilgi sağ/üst,
  **aksiyon barı iki kolonu da kaplar** (`grid-column: 1 / -1`).
- Aksiyon barı sağ kolonda DURAMAZ: `#cd-action` yalnız bir buton değil —
  seviye şeridi + GELİŞTİR + SAVAŞA AL birlikte yaşıyor; 200 px'lik
  kolonda yatay kaydırma çubuğu çıkıp buton kırpılıyordu (ölçüldü).
- Portre görselinin **nefes animasyonu kapatılır** (`animation: none`):
  keyframe her karede `translate(-50%,-50%)` yazıyor ve inset ile
  yerleştirilmiş bir görseli köşeye fırlatıyor. Hareket halede yaşar.
- Dil "temiz premium": istatistik kutuları → hairline satır, dolgulu pul
  → düz tipografi, çerçeve → tek hairline + geniş gölge.
- **Dikey bütçe ÖLÇÜLÜR, tahmin edilmez.** Kart yüksekliği sabit: portre +
  bilgi + aksiyon. Bir bölümü büyüten her dokunuş başka bir bölümden çalar;
  ölçüt `.cd-sheet.scrollHeight <= clientHeight` ve yetenek şeridinin alt
  kenarının panel içinde kalması. Dar dalda lore gizlenir (o boyutta zaten
  okunmuyordu), portre şeridi 96px.
- **Izgara rayı içerikten gerilir.** Bir ızgara öğesinin otomatik en küçük
  boyutu içeriğinden gelir: tam genişlikteki yetenek şeridi iki `1fr` rayı
  126px e geriyordu, yani sağ istatistik kolonu panelin dışına çıkıp
  kırpılıyordu. `minmax(0, 1fr)` + öğede `min-width: 0` şart —
  `overflow-x: auto` gerilmeyi ENGELLEMEZ.
- **Dar kabukta uzun etiket bir kontrolle aynı satırı PAYLAŞMAZ.** 250px lik
  bir satırda "SEVİYE İLE AÇILAN YETENEKLER" 134px yiyor ve yanındaki pul
  satırı kartın dışında kalıyor; aynı hata GELİŞTİR butonunu "ELİŞTİR" e
  düşürdü. Sayı ayarıyla çözülmez (ikisi aynı %100 ü paylaşıyor) — dizilim
  değişir: etiket üstte, kontrol altta tam genişlikte. Aynı sebeple
  istatistik hücresinde etiket değerin ÜSTÜNDE durur (yan yana dururken
  "İMZA SİLAHI" değere 32px bırakıyordu).
- **Devralınan özellik yeni kuralı sessizce iptal eder.** "Tek satır, kendi
  içinde yatay kayar" diye yazılan pul şeridi eski kuraldan
  `flex-wrap: wrap` devralıyor ve alt satıra sarıp şeridi 51 → 132px
  yapıyordu. `overflow-x: auto` ancak `nowrap` ile anlam kazanır.
- **Özgüllük tuzağı:** önceki üç nesil kural ID düzeyinde
  (`#screen-chardetail …`) yazılmış; sınıf zinciriyle ezilemiyor. Sahne
  yüksekliği ve büst boyu bu yüzden ID düzeyinden yazıldı. Yeni bir
  dokunuşta önce mevcut kuralın özgüllüğünü ölç.

---

## YERLEŞİM SÖZLEŞMESİ (2026-08-30) — `_placetest.html`

Kullanıcının teşhisi: *"objelerin yerleşim düzeni mantıklı olmalı; mezarlık
çitleri düzgün dizilmeli, bir giriş bir çıkış olmalı; yolun ortasında direk
durmamalı; evin etrafında mantıklı şeyler olmalı; sıklık azaltılmalı."*
Hiçbiri model hatası değildi — dördü de KOMPOZİSYON hatasıydı ve dördü de
ölçülmüyordu: `_hdtest` adet + erişilebilirlik, `_proptest` renk + siluet
ölçüyordu, ikisi de YEŞİLDİ.

### YOL VERİSİ İKİ YERDE YAŞIYORDU
`floor()` yolu boyuyor, `props()` nesneyi diziyordu ve **birbirlerini hiç
görmüyorlardı**: kervan izinin ortasında kilometre taşı, iskele kalasının
TAM ÜSTÜNDE direk (direkler ±0,020, kalas yarı genişliği 0,013), gök çarkının
sekiz kolunda dişli, katedralin üç kapısı kendi kemeriyle tıkalı.

Her plan artık ilk iş olarak koridorlarını **`floor()`un okuduğu AYNI `L`
sabitlerinden** bildirir: `A.path` · `A.ringPath` · `A.spokePath` · `A.area` ·
`A.zone`. `add()` koridora giren nesneyi reddeder. Kasıtlı istisna elle
yazılır (`onPath: true`): kemer kapı yolun üstünde durur, çünkü kapı odur.

- **`A.path` boyacının EĞRİSİNİ örnekler.** Boyacı nokta listesini düz çizgi
  çizmez, orta noktalardan geçen quadratic eğri çizer; düz kırık çizgi olarak
  kaydeden ilk sürümde koridor keskin dönüşlerde boyalı yoldan sapıyordu
  (panelde görüldü, tabloda görünmedi).
- **Kutu × koridor testi ÜÇ kez yanlış yazıldı.** Çevrel daire (evi yol
  kenarından kovar), genişletilmiş AABB (köşede yalancı çarpma: mezarlığın
  şapeli ve kemikhanesi sessizce reddediliyordu). Doğrusu kutuya en yakın
  nokta ile örnek arası uzaklık < r.
- **Koridor SIRALIDIR.** Kapı ağzı koridoru, o kapıyı kuran çitten ve
  avludaki evden SONRA kaydedilir; geriye dönük denetim onları yalancı ihlal
  sayıyordu. Prop ve koridor aynı sayaçla damgalanır.

### ÇİT BİR ÇEVREDİR — `A.enclosure`
Eski `rect` dört kenarda `(gate+s)%n` indeksini atlıyordu: ne giriş ne çıkış,
sadece delikli bir çit. `enclosure` segmentleri uç uca ve DİK dizer, kapılı
kenarda segment sayısını TEK'e yuvarlar (kapı tam ortaya gelsin), yalnız
`entry` + `exit` kenarında ağız açar, iki yanına söve koyar ve ağzı koridor
olarak korur. Ağız yarıçapı ölçümle 0,54w → 0,40w: 0,54w koridoru kilit komşu
segmentlere taşıyıp her kapıda iki yalancı ihlal üretiyordu.

ÇEVRE ÇİTİ RADYAL BİR BANDDA YAŞAMAZ — mezarlıkta üç band ölçüldü, üçü de
yetersiz: eksene hizalı bir kare 45°'lik bir noktada köşeleriyle
0,707·(a+b) kadar radyal taşar ve kapı ağzını 96 px'in üstüne çıkaran bir
kenar (≥ 0,072) şapel bandında (0,320-0,393) halka yolu keser, anıt
halkası ile halka yol arasında (0,196-0,268) kenar 0,051'e iner (ağız
68 px), çeperde (0,435-0,478) daha da incedir. Bu yüzden aile parseli
KUTSANMIŞ DAİRENİN DIŞINA, kuzeybatı köşesine kuruldu: orada geometri
serbest (halka yol 0,408, kollar 0,478'de biter ve köşegen kolsuzdur).
Koru ağaçları parselden SONRA konur, çakışanlar reddedilir — açıklığı
parselin kendisi açar. **IŞINSAL DİLİM AYIRICISI ÇEVRE DEĞİLDİR** (kapısı
yok, kapattığı alan yok) — ikisini aynı cümlede saymak "bir giriş bir
çıkış" ölçütünü yalancı yapar.

KAPI YAKLAŞMA KORİDORU SİMETRİK DEĞİLDİR: dışarı 1,60w, içeri 0,55w.
İlk sürüm iki yöne de 1,5w uzatıyordu ve karşılıklı iki kapının
koridorları birleşip parselin içini boydan boya 86 px'lik yasak bir şeride
çeviriyordu: aile parseli BİR BOŞ AĞIL olarak sevk edildi (dört mezarın
dördü de sessizce reddedilmiş).

**İKİ YENİ ÖLÇÜT, İKİSİ DE O SEVKİYATTAN:** çevre İÇİNDEKİ nesne sayısı
≥ 1 (boş çit "neden var" sorusunu sordurur; gökada avlusu da bu ölçütle
yakalandı) ve doğrudan çağrı (`A.add`) reddi TÜM türler için raporlanır.
Eski ölçüt yalnız pri 0'ı saydığı için `mezar` gibi bir türün tamamının
kaybolması tabloda YEŞİL okunuyordu — bu dosyanın uyardığı sessiz-ret
tuzağının aynen tekrarı.

**±3° SALLANTI ARTIK YALNIZ SÜSTE.** Koşulsuz rastgele dönüş, uç uca dizilmiş
çit zincirini testere dişine çeviriyordu (segment başına ~2°, on segmentte göz
bunu "eğri çit" okur). Yapılmış olan şey dik durur: `exact` ya da tip
tablosunda `built` (ev, mahzen, şapel, fırın, baca, mihrap, kulübe). Sallantı
moloza, fıçıya, kemiğe kalır.

### BİR YAPI TEK BAŞINA KONMAZ — `A.homestead`
Ev konuyor, odun/fıçı/kızak ±0,05 ötede rastgele bir yöne düşüyordu: kapının
önüne, çatının altına, komşunun avlusuna. `homestead` kapı yönünü (`face`),
kapı önü sahanlığını (KORİDOR — boş kalır), servis nesnelerinin duvara yaslı
yerlerini ve kapı fenerini (eşiğin YANINDA) birlikte kurar; `yard` verilirse
avlu çiti tek giriş/tek çıkışla kurulur. Sahanlık eşikten 0,026 birim ileride
başlar — 0,014'te başlayan ilk sürüm evin KENDİSİNİ yol üstünde gösteriyordu.

`A.wayside` nesneyi yolun İÇİNE değil KENARINA dizer: yolun kendi eğrisinden
örneklenir, dik doğrultuda itilir, taraf dönüşümlüdür (aynı tarafta sıralanan
direkler "çit" okunur, yol kenarı değil).

### GÖRSEL = ÇARPIŞMA — SPAN TÜRLERİNDE İKİ SESSİZ HATA
Kullanıcı: *"boş alan olmasına rağmen ilerleyemiyorum."* Sebep tek değil ikiydi
ve ikisi de yalnız OYUNDA görünüyordu:

1. **Kutu aralıktan türetiliyor, görsel model boyunda çiziliyordu.** `A.line`
   span türlerinde (çit · duvar · iskele) yarı uzunluğu aralıktan türetiyor,
   renderer ise örneği her zaman `TMP.vb.set(1, sy, 1)` ile çiziyordu: blok
   başına ~230 px çarpışma, ~150 px görsel — bloklar arasındaki boşluk
   GÖRÜNMEZ DUVARDI. Ölçek artık MODEL uzayında saklanır (`p.sx/p.sz`,
   dönüşten etkilenmez) ve renderer onu uygular.
2. **Kalınlık sabit `8` yazılıydı** — o `cit`in kalınlığıydı (hz 8) ve bütün
   span türlerine gidiyordu: `duvar` (hz 29) çarpışmada 8, görselde 0,28
   ölçekle, yani harap istinat duvarı KÂĞIT GİBİ İNCE çiziliyordu.

**GERİLME ÖLÇÜLÜR (`< 1,9`) VE SINIRI YÜKSELTMEK ÇÖZÜM DEĞİLDİR:** üst sınır
bir sigortadır (gren dünya konumundan pişer, 2× gerilme görünür), ama sigorta
BAĞLARSA kutu kısalır ve zincirde boşluk açılır — oyuncu çitin arasından sızıp
"bir giriş bir çıkış" kuralını boşa çıkarır. Kül haritası 1,90'da çakılı kaldı
ve segmenti elle 3→4 yapmak DEĞİŞTİRMEDİ (teras çizgileri 1164 px). Çözüm:
`skip` verilmemişse segment sayısı UZUNLUKTAN türetilir (`len / (2·hx·1,35)`);
`skip`li çağrılarda dokunulmaz (o indeksler kapı yeridir) ve gerilme denetler.

### SIKLIK: ~208 → ~95 NESNE/HARİTA
Çeper halkaları yarıya, serpme kümeleri üçte bire indi; tuzlanın **90 alçak
duvarlık** havuz ızgarası (dokuz havuzun her biri `rect` ile çevriliydi — tek
ızgara harita bütçesinin yarısından fazlasını yiyordu) üç sırta indi, setlerin
çizimi zemine pişer. **ALT SINIR ÖLÇÜLDÜ:** ilk seyreltme turu 56-92'ye düştü
ve bu "boş" okunuyor — 90 engel / 16 M px² = engel başına ~410×410 px, yani
ekranın her üçte birinde bir siper. Engel süs değil TOPOGRAFYADIR: arkasına
saklanılır. Bant 85-165.

### KEMER KAPI GEÇİLEBİLİR OLDU (`pass: true`)
Bir kemerin çarpışması İKİ AYAKTIR; eksene hizalı TEK kutu bunu ifade edemez
ve hx 62 ile konan kemer 124 birimlik bir DUVAR olup tam da geçit olması
gereken yeri kapatıyordu (mezarlık liç kapısı, katedral narteksi + iki yan
kapı, çarkın dört yıldız kapısı, pelvis kapısı: yedisi de tıkalıydı). "Görsel
= çarpışma"dan bilerek sapılıyor: ayakların arasından yürümek doğru davranış.
Kapı zaten kırılmaz (hp 0), yani mermi/hasar yolu bir şey kaybetmiyor.

### DOKU: 256² → 512², İKİ FREKANS BANDI, ORTALAMA KİLİTLİ
Nesneler ekranda 30-200 px çizilir ve gren 58 dünya birimi başına bir kez
tekrar eder: 256² dokuda yakın plandaki mahzen duvarı texel başına ~0,7 ekran
pikseli alıyordu, yani BULANIKTI. Şimdi ince band (1-2 px, malzeme dokusu) +
kaba band (2-9 px, mip zincirinde hayatta kalan) + yönlü lif/çatlak.
Anizotropi 4 → 8 (44° eğik bakış). VRAM 0,35 → 1,4 MB.

- **ORTALAMA ARTIK ÖLÇÜLÜP 242'ye NORMALİZE EDİLİR.** Önceki sürümde ortalama
  çizim sabitlerinden UMULUYORDU: leke sayısını ya da alfayı değiştiren biri
  bütün paleti (45-95 fark bandına ayarlı) fark etmeden kaydırırdı. Artık gren
  zenginleştirilebilir, palet kaymaz.
- **UV ÜÇ DÜZLEMLİ OLDU — eski `((x+z)/58, y/58)` kullanıcının gördüğü "doku
  bozukluğu"nun kaynağıydı.** ÜST yüzlerde ikinci koordinat sabit kalıyor (o
  yüzey boyunca y değişmez), yani gren tek eksende sonsuza uzuyordu: mezar
  taşının, lahit kapağının, çatının üstünde doku "taranmış çizgiler" halinde
  akıyordu. Normali (1,0,1) doğrultusundaki yan yüzlerde aynı hata 90° dönmüş
  halde tekrar ediyordu. Artık yüz başına baskın normale göre TEK düzlem
  seçilir: üç satır, pişirme anında, çizim maliyeti sıfır, gren ölçeği aynı.

### MOR HÖYÜKLER KALDIRILDI (kullanıcı isteği)
`yuva` görev varlığı sahada mor bir kubbe olarak duruyordu. Yerleştirme TEK
YERDEN kapatıldı (`arenaMaps.nest()` boş gövde), on planın içinden tek tek
silinmedi: koordinatlar (`plan.nests`) ve `PROP_TYPES.yuva` yerinde kalır, yani
başka bir görsel dille (kırık sunak, kemik yığını) geri getirmek tek satırdır.
`objectives.js` yuva görevini hiç kurmaz (`byKind.yuva` boş → sayaç ve
"YUVALAR SUSTU" ödülü tetiklenmez); saha görevi **escort** olarak yaşar.

### Ölçülen son durum (`game/_placetest.html` — elli ölçütün tamamı bantta)

| harita | adet | koridor | çıpa reddi | adlı ret | içerik | ağız | gerilme | erişim % |
|---|---|---|---|---|---|---|---|---|
| mezarlık | 115 | 0 | 0 | 0 | 4 | 107 | 1,00 | 100,0 |
| kül | 112 | 0 | 0 | 0 | — | — | 1,22 | 100,0 |
| bataklık | 102 | 0 | 0 | 0 | — | — | 1,42 | 100,0 |
| katedral | 88 | 0 | 0 | 0 | — | — | 1,29 | 100,0 |
| hiçlik | 88 | 0 | 0 | 0 | — | — | 1,00 | 100,0 |
| gökada | 111 | 0 | 0 | 0 | 5 | 144 | 1,07 | 100,0 |
| tuzla | 94 | 0 | 0 | 0 | — | — | 1,57 | 100,0 |
| buzul | 105 | 0 | 0 | 0 | 4 | 122 | 1,03 | 100,0 |
| kemik | 93 | 0 | 0 | 0 | 12 | 114 | 1,00 | 100,0 |
| çark | 98 | 0 | 0 | 0 | — | — | 1,00 | 100,0 |

Kapı ağzı ölçütü ≥ 96 px (oyuncu çapı 38); "—" o haritada çevre çiti yok.
Ortalama 101 nesne/harita (öncesi ~208). Pişirme 80-153 ms.

### ELLE KONAN NESNE KAYBOLMAZ — ÜÇ KADEMELİ SPİRAL
`A.add` bir KARARDIR ("şu evin sağ duvarında odun, şu kapının yanında
fener"), reddedilmesi tasarım değil KAYIPTIR. Yeni ölçüt (adlı ret: pri 0
OLMAYAN doğrudan çağrılar da sayılır) ilk turda on haritada **14 nesne**
yakaladı — odun, kazan, fener, küp, sıra, yığın, kayık; hiçbiri pri 0
olmadığı için eski tabloda YEŞİL okunuyordu. Yarıçap nesnenin ne
olduğundan türetilir: sandık 0,070 (ödül "o bölgede" olsun yeter) · süs
0,030 ("şu yapının yanında" korunur) · span HİÇ (zincirin hizası anlamın
kendisidir; kaydırılan panel "düzgün çit" ölçütünü bozar). Kaydırma
denemeleri sessizdir; spiral de başarısız olursa GERÇEK kayıp sayılır ve
kırmızı yanar — o zaman sorun koordinat değil KOMPOZİSYONdur. Buzulun
kayığı tam bu şekilde ayrıştı: 120 px arandı, çıkmadı, çünkü bir kayık
iskelenin ÜSTÜNDE değil YANINDA bağlı durur.

**SÖVE ÇİT HATTININ ÜZERİNE KONMAZ — DIŞ NORMALE KAYAR.** Söve kenar
doğrultusunda 0,62w öteye konduğunda komşu panelin iç kenarı ağız
merkezinden 56 px'te bitiyor ve söve (66±11 px) panelle HER ZAMAN çakışıyor:
dört çevrenin dördünde de kapı lambası yoktu (deterministik — "bazen
olmuyor" değil HİÇ olmuyordu). Aynı sınıf hata gök çarkında da vardı:
yıldız kapılarının sekiz lambası `onPath` taşımadığı için kol koridoruna
düşüp siliniyordu, yani haritanın tek ışıklı öğesi KARANLIK sevk edildi.
Bir kapının yanındaki fener tanım gereği ağızdadır (kemerle aynı istisna).

**TEZGAHIN KENDİSİ İKİ KEZ YALAN SÖYLEDİ, İKİSİ DE DOKTRİN:**
① `nest()` spiral araması her başarısız denemeyi `rej`e sayıyordu ve tek başına
"yuva×31 reddedildi" okunup GERÇEK çıpa hatalarını (mahzen, şapel) gürültüye
boğdu — arama denemesi kayıp değildir (`quiet` sayacı).
② Kapı ağzı eşiği 160 yazılmıştı ama o sayı İKİ KUTU ARASI MERKEZ ARALIĞI
ölçütünden kopyalanmıştı (mezar dizilimi), boşluk ölçüsü değil.
**Bir ölçütün kendisi de gerekçelendirilir; kopyalanan eşik ölçüm değildir.**

### Sıradaki
`_placetest` panelinde koridor bildirimi camgöbeği, nesne kutusu beyaz çizilir:
şerit boyalı yolun üstünde durmuyorsa hatalı olan BİLDİRİMDİR, ölçüm değil.
Yeni harita eklerken sıra: koridor bildirimi → `A.nest()` → çıpalar (yapı,
kemer, gemi, totem) → çevre çitleri → yol kenarı → süs; sonra tezgahın altı
kolonu.

---

## HD HARİTA REVİZYONU (2026-08-23) — `_hdtest.html`

Kullanıcının teşhisi "dokular çok daha HD olmalı, saha büyük olmalı, harita
içinde çarpılabilir şeyler ve kısa görevler olmalı"ydı. Bu üç istek bu
dosyadaki ÜÇ kuralı birden iptal ediyor; hepsi bilerek değiştirildi.

### SAHA 1900 → 4000 (alan ×4,4)
1900'de harita ekranın ~2,3 katıydı, yani "harita" diye bir şey yoktu — tek
bir dövüş göbeği vardı. 4000'de oyuncu haritanın **~%8'ini** görür: avlular
ayrı yerler olur, escort mesafe kazanır, kaçış gerçek bir karar olur.

### TEK GERİLEN DOKU "HD" ÜRETEMEZ — ÇİFT KATMAN ZORUNLU
2048² doku 4280 px'e gerildiğinde dünya pikseli başına **0,48 örnek** kalır:
"HD" istenen yerde çözünürlük YARIYA düşer. `bakeArenaMap` iki katman verir:

| katman | boyut | nasıl | örnek/px | ne taşır |
|---|---|---|---|---|
| `macro` | 2048² | arenaya GERİLİR | 0,48 | kompozisyon, yollar, avlular, eşik şeridi, dünya tonu, engel gölgeleri |
| `detail` | 1024² | DÖŞENİR (512 dünya px) | **2,0** | çim tutamı, gren, karo dikişi |

İkisi zeminde **tek materyalde** çarpılır (`onBeforeCompile`): iki doku
okuması, TEK çizim çağrısı. İkinci bir düzlem yasak (overdraw). VRAM 28 MB.

**`uDetailMid` OLMADAN ZEMİN YARIYA KARARIR.** Tezgah pişmiş tuvali sRGB
piksel okuyup "ortalama 128 → nötr çarpan" diyordu; shader dokuyu
sRGB → **LİNEER** çözerek örnekler (sRGB 128 ≈ lineer 0,216), yani
`1-k + k·2·detail` 1,0 yerine ~0,49 veriyor. Oyunda zemin tezgahın yarısı
kadar parlaktı ve tezgah bunu GÖREMEDİ. Çarpan artık dokunun kendi lineer
ortalamasına bölünür (`linearMean`, pişirmede ölçülür) — elle ayarlanmış
sihirli sayı yok, her yeni harita kendini normalize eder.

**Diğer ölçüm dersleri (hepsi tezgahta yakalandı):**
- **Yerel kontrast tane SAYISINDAN değil tane BOYUNDAN gelir.** 2 texel/px
  ile örneklenen 1-2 texellik gren ekranda ortalanıp kaybolur; ilk sürüm
  `tek` 1,2 okudu (hedef 4-14). Taban öğe ≥ 4 texel olmalı.
- **Eşit boyda yuvarlak leke "yosun beneği" okunur.** Çim tutamı YÖNLÜDÜR ve
  yönü yerel olarak ortaktır (açı kaba bir alan fonksiyonundan gelir), yoksa
  doku kamuflaja benzer. Makro katmanda da leke yerine fırça darbesi.
- **Doygunluk yalnız GÖRÜNEN pikselde ölçülür** (`lum > 24`): (12,18,10) gibi
  bir gölge pikselinin bağıl doygunluğu 0,44'tür ama göz onu siyah görür.
  **AMA mezarlıkta bu kapı pratikte NO-OP'tur** ve tezgah bunu açıkça basar
  (ham · kapılı · kapılan piksel sayısı yan yana): 133-253 piksel kapılanıyor
  ama değer üç ondalık basamakta aynı kalıyor. Başlangıçtaki 0,39 okumasını
  düzelten şey kapı DEĞİL, `night` 0,14 → 0,06 ve palet nötrüydü; kapı sonraki
  haritalar (donmuş göl, gök çarkı — gerçek koyu gölge) için duruyor.
  **Ders: bir ölçüt değişikliğinin ETKİSİ de ölçülür**, yoksa doktrin
  dosyasına kendisi yanlış olan bir "ölçüm dersi" girer.
- **Wrap geri çağrısında `rnd()` ÇAĞIRMAK DİKİŞİ BOZAR**: karşı kenara çizilen
  kopya farklı kalınlıkta çıkıyordu — "64 kez tekrarlanan çizgi" tuzağının
  sessiz hali. Rastgele değerler ve çizgi durumu (`strokeStyle`/`lineWidth`/
  `lineCap`) wrap DIŞINA çıktı: dikiş düzeldi ve pişirme 363 → 313 ms düştü
  (Canvas2D'de durum ataması bedava değil).
- **Doygunluk suçlusu zemin değil TINT'ti**: `night` ay yıkaması 0,14 iken
  tepe noktasına denk gelen köşe 0,39 okudu. 0,06'ya indi, dünya kimliği
  korundu.

### PİŞİRME EŞİĞİ 260 → 520 ms (yeniden gerekçelendirildi)
260 ms tek-tuval sözleşmesinden kalmıştı; çift katman iki tuval + iki grade
geçişi pişiriyor ve saha alanı ×4,4 büyüdü. Gerçek kısıt oynanış değil
**giriş perdesi**: bulutlar 2,3 sn kapalı ve pişirme o pencerede, ısıtmadan
ÖNCE bitmek zorunda. 520 ms perdenin ~%23'ü; kare başına maliyet SIFIR (görev
başına bir kez). Eşik aşılırsa çözüm çözünürlük DEĞİL katman adedi düşürmek.

Ölçülen son durum (`game/_hdtest.html`, mezarlık — **shipped koddan okundu**):

| bölge | ort (26-52) | p95 (<150) | doy (<0,30) | tek (4-14) |
|---|---|---|---|---|
| göbek | 38,8 | 50 | 0,210 | 4,5 |
| NW avlu | 38,9 | 54 | 0,268 | 5,1 |
| doğu kenar | 41,9 | 62 | 0,179 | 5,5 |

Pişirme **313 ms** (tezgah) · oyunda ~340 ms — fark `props` ızgara kurulumu
(`KH.arenaBakeMs` bu ikinci maliyeti de sayar; ölçerken hangisini okuduğunu
bil) · detay örnek yoğunluğu 2,00 · detay ortalaması 114 · VRAM 26,8 MB ·
dikiş X/Y 2,3/3,9 (iç referans 4,3) · engel adedi **208**.

**GÖBEK BANDIN DİBİNDEYDİ** (`tek` 4,4 — alt sınır 4): "merkez sakin" kuralı
göbeği boş tutuyor ama tamamen düz alan "boş duvar" gibi okunur. Çözüm
çiğnenmiş çim lekeleri + kırık döşeme mozaiği; öğeler 14-84 px, yani düşman
siluetinin (~30 px) ÜSTÜNDE — kural 3 (düşman ölçeğinde titreyen desen yok)
ve kural 2 (göbekte hacımlı engel yok; bunlar yalnız boya) korunur.

### OYUN ALANININ İÇİ ARTIK DÜZ DEĞİL — `arenaProps.js`
Eski kural 1 ("içi tamamen düzdür, hacimli hiçbir şey yok") 1900 px'de
doğruydu: o alanda tek bir mezar taşı kaçış yolunu kapatır. 4000 px'te engel
tuzak değil **TOPOGRAFYADIR**. Tek `InstancedMesh` (kutu), 13 tip, **208
örnek** (bütçe 330; çakışma reddi dizilimi burada oturtuyor), **tek çizim
çağrısı**.

- **Çarpışma kutusu eksene hizalı**, görsel dönüş ±0,05 rad. Döndürülmüş kutu
  karekök + köşe titremesi getirir.
- **Görsel = çarpışma, tek liste**: gölge ve moloz lekesi haritanın makro
  dokusuna PİŞER (statik → sıfır maliyet) ve çarpıştığımız listeden üretilir.
- **Kapalı çevre YASAK.** Çitli avlular kenar başına 2 segmentlik kapı
  bırakır; tezgah taşma-doldurma ile ölçer (erişilebilir alan > %97, dört
  avlunun göbeği 4/4). İlk dizilim 6 kolon × 106 px mezar koydu: göz güzel,
  ölçüm ULAŞILAMAZ (mezar 31 + oyuncu 19 = aradan geçmek için ≥160 px gerek).
- **Çakışma reddi zorunlu** (`fits`): iki kutu birbirine geçince daire-AABB
  itmesi oyuncuyu iki kez iter, hareket zıplar.
- `BUDGETS.props` **FLEX = 0**: diğer bütçeler streste kısılır, bu KISILMAZ.
  Koşu ortasında yok olan duvar, arkasına saklanılan şeyin buharlaşmasıdır.
- **Düşman itilir, yol bulmaz** (250 düşman × 60 Hz'te gerçek yol bulma tüm
  kare bütçesini yer). **Boss itilmez, EZER** — 150 birimlik lord bir mezar
  taşına çarpıp durursa silueti anlamsızlaşır.
- Kırma yolu ORTAK: mermi (durur), yakın dövüş savuruşu, alan hasarı. Yakın
  dövüş eksikken taze haritada yakın dövüş kahramanları mahsur kalıyordu.

**MATERYAL UNLIT OLMAK ZORUNDA.** İlk sürüm Lambert kullandı: sahnenin altı
ışığı kahramana + kızıl aya ayarlı olduğu için yatay ve düşey yüzler aynı
parlaklığı aldı ve engeller **PEMBE DÜZ dikdörtgenler** olarak okundu. Nötr
gri albedo pembe, maviye kaydırılmış albedo MENEKŞE verdi (ikisi de ölçüldü).
Yeni ışık eklemek yasak → aydınlatma **geometriye pişer** (`khBoxGeo`, vertex
renkleri: üst ×1,20 · yanlar ×0,62±0,22 · alt ×0,26) ve materyal
`MeshBasicMaterial` olur; palet ÖN-AYDINLATILMIŞ albedodur. Bonus: Lambert'in
per-fragment ışık hesabı da gider.

**PARLAKLIK DA ÖLÇÜLÜR:** ön-aydınlatmanın ilk turunda taşlar 0xb4-0xc6
seçildi ve beyaz mermer bloklar gibi patlayıp düşman siluetiyle yarıştı. Taş
üst yüzü zeminin ~2,6 katı (~90-105), yan yüzler ~48-58.

### SAHA İÇİ KISA GÖREVLER — `objectives.js`
Kullanıcı seçimi: **escort** (NPC'yi güvenli noktaya götür) + **yuva yık**.
İki dalgada bir, dönüşümlü (rastgele olsaydı üç escort üst üste gelebilirdi),
boss dalgasında hiç.

- **Görev dalgayı KESMEZ**: sayaç işler, düşman akar. Başarısızlık koşuyu
  bitirmez, ödülü iptal eder.
- **Ödül kart seçimidir** (+ hedefin yanına yakut yağmuru) ve dalga arasını
  BEKLEMEZ — 40 saniye sonra gelen kart görevin ödülü gibi okunmaz.
  `_objCard` bayrağı şart: ayrımı yapmayan ilk sürüm ödülü alan oyuncunun
  dalgasını atlıyordu.
- **NPC oyuncuyu TAKİP EDER, yol bulmaz.** Engelli sahada takılan NPC bütün
  görevi bozar; takip modeli oyuncuyu ÖNDER yapar — escort'un asıl duygusu.
  Leash 300: uzaklaşınca durur, oyuncu geri dönmek zorunda.
- **Yuva AYNI engel sisteminden geçer** (`PropField.addDynamic`). İkinci bir
  "hasar alabilen nesne" yolu `waveDuration` tuzağının aynısı olurdu.
- Yuva doğuşu `enemies.canSpawn()` kapısından geçer, yoksa üç yuva + dalga
  akışı canlı bütçesini ikiye katlar.
- Doğuş noktaları `_clampFree` spiral taramasından geçer: kapalı avluda doğan
  NPC "duvara yapıştı" okunur.

### MİNİ HARİTA ZORUNLU HALE GELDİ
Oyuncu haritanın %8'ini görüyor. Zemin **bir kez** 132² canvas'a çizilir
(engeller yapı olarak üstüne basılır, yoksa mini harita bulanık yeşil bir
kare olur); noktalar DOM'da yalnız `transform` ile taşınır — her karede
canvas'a çizim YOK (statik görüntüyü her karede drawImage etmek yasak).
HUD ile aynı 20 Hz'te sürülür.

### DÜŞEN GÜÇLER — `powerups.js`
Kullanıcı seçimi: **mıknatıs · can · kalkan · dondurma**. Hepsi ANINDA
etkili (envanter/tuş yok).
- **Dondurma simülasyonu DURDURMAZ**, düşmanı durdurur. Oyunun `freeze` alanı
  kare döngüsünü dondurur ve girdiyi de öldürür; oyuncu "oyun kilitlendi"
  sanar. Zaman durması oyuncunun HAREKET ETTİĞİ andır. Doğuş da durur.
- **Can tam doluyken can düşmez** (kalkana çevrilir): yerde duran ve hiçbir
  işe yaramayan ödül, ödül sisteminin kendisini değersizleştirir.
- Kalkan hasarı TAMAMEN yutar (kısmi azaltma ekranda okunmaz) ama
  dokunulmazlık penceresi AÇMAZ — açsaydı tek kalkan bir dalgayı bedava
  geçirirdi. Sıyrılmadan sonra, dokunulmazlıktan önce sorulur.
- Ağırlıklar eşit DEĞİL: can %34 (en az güç, en çok nefes), dondurma %18
  (en güçlü etki). Sahada en fazla 7 tane; `life` 40 sn çünkü 4000 px'lik
  sahada güce gitmek bir KARAR olmalı.

### KART EKRANI: 3 ÜCRETSİZ YENİDEN DAĞITMA
Hak **koşu başına** verilir, kart ekranı başına DEĞİL: ekran başına olsaydı
her seviyede üç kez çevirip istediğini garanti alan oyuncu için seçim bir
karar olmaktan çıkar ve pasif kart bandı ölçümleri çöker. Hak bitince buton
kaybolmaz, ÖLÜR (kaybolan kontrol "ben mi yanlış hatırlıyorum" hissi verir).

### Banner metni KISA olmak zorunda
`.banner-main` 44 px'e kadar büyüyen görüntü fontuyla çizilir; iki kelimelik
"KAÇKINI GÖTÜR" 420 px'lik kabuğu yatay olarak aşıp kırpıldı. Uzun ad görev
ŞERİDİNDE yaşar, banner'da tek kelime.

### Sıradaki
Kalan 9 harita bu iskelete dökülecek (10 dünya tablosu + kilit rozetli
harita seçimi). Yeni harita eklerken: `detail` + `floor` + `edge` + `props`
dörtlüsü ve `_hdtest` bantları; `props` ekleyince erişilebilirlik ve çakışma
ölçümü ZORUNLU.

---

## NESNE PALETİ HARİTAYA BAĞLANDI (2026-08-26) — `propModels.js`, `_proptest.html`

Kullanıcının teşhisi: *"haritanın içindeki objeler (kayık, sütun vs.)
birbirine benziyor ve renkleri hep aynı soluk gri."* İki ayrı sebebi vardı
ve **birincisi bir renk uzayı hatasıydı** — palet ne yazılırsa yazılsın
ekranda griye kayıyordu, yani on ayrı palet yazmak tek başına çözmezdi.

### ① VERTEX RENGİ LİNEERDİR — hex'i ÇÖZMEDEN yazmak paleti öldürür
`rgb()` hex'i 255'e bölüp doğrudan vertex rengine yazıyordu. Ama renderer
`outputColorSpace = SRGBColorSpace` ile çalışıyor ve three vertex renklerini
**lineer** kabul eder: yazılan 0x6a7568 (parlaklık 112) ekranda sRGB olarak
kodlanıp **177** çıkıyordu. İki sonucu vardı, ikisi de kullanıcının gördüğü şey:
- her şey zeminin **4,4 katı** parlaklıkta çıktı (hedef fark 45-95), nesneler
  zeminden kopup "soluk" okundu;
- sRGB kodlaması düşük değerleri yükseklerden çok kaldırdığı için kanallar
  arası fark EZİLDİ: %39'luk bir değer farkı ekranda %16'ya, doygunluk üçte
  bire düştü. **Malzeme kimliği matematiksel olarak siliniyordu.**

Artık hex sRGB olarak çözülür, ışık çarpımı lineer uzayda olur (fiziksel
doğrusu da bu), çıkışta yeniden kodlanır: **yazılan renk ekranda görülen
renktir** (üst yüz ≈ hex parlaklığı × 0,99). Yeni bir sabit renk yazan
herkes bunu bilmek zorunda — `rgb()` dışında ham `/255` YASAK.

### ② PALET ARTIK VERİ: harita başına 19 malzeme yuvası
Tek sabit `C` tablosu on haritayı besliyordu; buz gölünde ve tuz tabanında
sütun BİREBİR aynı renkti. Şimdi `PAL_HEX[mapId]` var ve geometri o palete
göre pişer (`propGeometries(palId)`, LRU 2 set). **Yuva ADI anlamdır, rengi
değil:** `demir` yuvası kemik bahçesinde BOYNUZ, tuzlada PAS (tuz demiri
yer), gök çarkında PİRİNÇ'tir — aynı çit üç yerde üç farklı şey olur.

- **Shader uniform tablosu (`uPal[matId]`) BİLEREK seçilmedi:** daha az
  bellek ama yeni bir shader programı = ısıtma kaydı (kural 5) + dinamik
  indeksli uniform dizisi + mobil sürücü riski. Bu yol hiçbir shader'a
  dokunmuyor; maliyeti görev başına **22-115 ms** (perde arkasında) ve kare
  başına SIFIR. LRU 2 çünkü on palet ~40 MB tampon demekti.
- **Üç renk hiç değişmez** (`SHARED_HEX`): altın (sandık), mor + koyu mor
  (görev yuvası). Bunlar malzeme değil İŞARET; rengi haritaya göre kayan bir
  işaret öğrenilemez. Escort NPC de (`insan`) paletten bağımsızdır.
- **Örnek başına ±%8 ton kırılması** (`_updateProps`, konumdan türetilir —
  deterministik, tahsissiz). Aynı arketipin 20 kopyası birebir aynı renkte
  olduğunda göz onları nesne değil "kopyala-yapıştır" okur.

### ÖLÇÜT ORAN DEĞİL **FARK** (eski 2,0-2,6 kuralı geçersiz)
Eski kural "taş üst yüzü zeminin 2-2,6 katı" idi ve o oran **yanlış bir üst
yüz değerinden** hesaplanmıştı (112 sanılıyordu, gerçek 177). Ayrıca zemin
ortalaması haritaya göre **21-49** arası değişiyor: sabit oran dayatmak kül
çukurlarında (zemin 21,6) taşı 52 parlaklığına, yani okunmaz koyuya
düşürürdü. Gözün silueti ayırması FARKA bakar:

| ölçüt | bant | neden |
|---|---|---|
| `taş üst − zemin` | **45-95** | altında zemine karışır, üstünde düşman siluetiyle yarışır |
| taş üst (mutlak) | 80-126 | aşırı parlamayı ayrıca kapatır |
| mermer/kemik üst | **< 165** | 180-200 "beyaz kutu"dur (mahzen dersi) |
| doygunluk | 0,10-0,45 | tabanı nötr griyi, tavanı "şeker"i yasaklar |
| harita ayrımı | ≥ 22 | dört paylaşılan yuvanın en yakın harita çifti |

Ölçülen son durum (`game/_proptest.html`, elli ölçütün tamamı bantta):

| harita | zemin | taş üst | fark | en parlak | doyg. | ayrım |
|---|---|---|---|---|---|---|
| mezarlık | 40,3 | 105 | 65 | 155 | 0,318 | 24,5 |
| kül | 25,0 | 95 | 70 | 149 | 0,373 | 27,2 |
| bataklık | 27,6 | 94 | 66 | 146 | 0,347 | 30,0 |
| katedral | 38,4 | 98 | 60 | 154 | 0,264 | 24,5 |
| hiçlik | 34,8 | 108 | 74 | 154 | 0,181 | 30,0 |
| gökada | 38,7 | 114 | 76 | 155 | 0,441 | 30,7 |
| tuzla | 48,8 | 101 | 52 | 161 | 0,363 | 42,7 |
| buzul | 42,8 | 98 | 55 | 156 | 0,297 | 30,0 |
| kemik | 30,9 | 81 | 50 | 158 | 0,372 | 30,1 |
| çark | 26,5 | 110 | 84 | 154 | 0,362 | 30,3 |

Kemik bahçesinde taş bilerek en koyudur (81): kemik o haritada parlayan tek
malzeme olmalı. Gökada bir tur 0,48 doygunlukla döndü (ahşap 0,61) — "canlı
renk" tavanı da olan bir banttır.

**AYRIM EŞİĞİ BİR KEZ SESSİZCE YUVARLANDI — tam bu dosyanın uyardığı hata.**
İlk turda mezarlık↔bataklık **21,73** çıktı (eşik ≥22, yani tezgah o iki
hücreyi KIRMIZI çiziyordu) ama tabloya "22" yazılıp altına "elli ölçütün
tamamı bantta" cümlesi kondu. Suçlu `kemik` yuvasıydı: 0x9d9f86 ile 0x9aa080
pratikte aynı renk (slot uzaklığı **6,7**) ve çift DÜNYA 1'İ içeriyor, yani
oyuncunun en çok gördüğü harita. Sazlıkta kemik yosun tutar: bataklık
kemiği 0x87996e (yeşil + koyu), taş bir tık yeşile. Ayrım 30,0'a çıktı, en
yakın çift artık mezarlık↔katedral 24,5. **Bir ölçütün sınırına değen değer
yuvarlanmaz; ya düzeltilir ya eşik ölçümle gerekçelendirilir.**

### KELİME DAĞARCIĞI: bir nesne YERİN dilinden gelir
Ölçüm `heykel`i 7, `mihrap`ı 6 haritada buldu. Bunlar mezarlığın/katedralin
dili; sazlıkta ve pirinç saat mekanizmasında "başka oyundan gelmiş" okunuyor.
İki yeni arketip + beş takas:
- **`totem`** (oyulmuş kazık, geniş baş) → bataklık ve kemik bahçesindeki
  `heykel`in yerine. Silueti sütundan/dikilitaştan GENİŞ BAŞIYLA ayrılır.
- **`yigin`** (tuz yığını) → tuzladaki klasik sütunların yerine. Silueti
  DİKEY olmayan tek nesne; bir tuzlanın hacmi hasat edilmiş yığındır.
- gemi direği artık `iskele` (kazık), sütun değil — tuzla + buzul.
- tuzlada `mihrap` → `kazan` (çalışan tuzlada sunak değil kazan olur),
  bataklıkta `mihrap` → `kazan` (adak/zift), çarkta `heykel`/`mihrap` →
  `disli`/`halka`.

### ÇIPA SESSİZCE REDDEDİLİYORDU — `layout` artık İKİ KOVAYA sayıyor
`add()` çakışma ya da sınır yüzünden **null döner ve bunu kimseye
söylemez**. Buzulda gemi enkazı (haritanın çıpası) basınç sırtlarından SONRA
konuyordu ve tam sırtın üstüne düşüyor: bir buz dikeni yeri kapmış, gemi hiç
doğmuyordu. Nesne sayısı doğru göründüğü için tezgah bile yakalamadı.

**AMA TÜRE GÖRE SAYMAK YANLIŞ ALARM ÜRETİR** — ilk sürüm bunu yaptı ve dört
"hata" bildirdi, biri gerçek değildi. Aynı tür hem çıpa hem süs olur: kül
çukurlarında `baca` bir kez ismiyle konur (çöken ocak) ve bir kez altılı
kenar halkasında geçer. `ringN`/`scatter`/`line`/`grid` **çakışma reddiyle
çalışır**: altı baca istenip dördünün sığması tasarımın kendisidir. Bu yüzden
ret iki kovada: `rej` (doğrudan `A.add` — isimle konmuş, tek yeri olan nesne)
ve `rejFill` (üreticiler, bilgi amaçlı). **Ölçüt: `rej` içinde pri 0 bir tür
varsa HATA.** Ayrım olmadan ölçüt ya yanlış alarm verir ya susturulur.

Bulunan üç gerçek hata ve dersleri:
- **Katedralin ÖN KAPISI hiç doğmuyordu.** Üçüncü görev yuvası (0,500 ·
  0,960) tam narteks kemerinin üzerindeydi ve `A.nest()` her şeyden ÖNCE
  çalışıyor. Yuva doğru davranıyordu; hatalı olan KOORDİNATTI — bir görev
  hedefi de kapı ağzında doğmamalı. **`A.nest()` her zaman kazanır: yeni bir
  mimari çıpa yazarken yuva koordinatlarını KONTROL ET.**
- Sunak sandığı ilk sıra bloğunun 24 px yanındaydı (apsis koluna taşındı).
- Gökada fener sandığı plaka halkasının (r 0,086) tam üstündeydi — halkanın
  içine, direk dibine alındı. **Bir halkanın yarıçapına elle nesne koymak
  çakışma demektir.**
- **ÇIPA HER ZAMAN SÜSTEN ÖNCE KONUR.** Yapı, kemer, gemi, totem `props()`
  içinde dekorasyondan önce gelmeli.

Ölçülen son durum: **on haritada çıpa reddi 0**. Kalan retler kasıtlı —
`iskele` (span, uç uca dizilir), `plaka`/`kupa` (pri 1-2, süs).

**MODÜL SÜRÜM ETİKETİ YÜKSELTİLMEDEN ÖLÇÜM YAPILMAZ.** `arenaPlan.js`
düzeltildikten sonra tezgah aynı sayıları döndürdü: `arenaMaps.js?r=51` taze
URL'di ama o dosya planı KENDİ etiketiyle (`arenaPlan.js?v=…`) çağırıyor ve
etiket değişmediği için modül önbelleğinden ESKİ plan geldi. "Düzelttim ama
ölçüm değişmedi" görüldüğünde ilk şüpheli budur (servis çalışanı dersinin
kardeşi). Bu turda hepsi `20260826b` + `sw.js` önbellek adı.

### Tezgah: `game/_proptest.html` — **YAVAŞ, kilitlenmiş sanma**
On harita için pişirme + zemin ölçümü + 50 şerit render'ı + 10 tam görünüm
yapar: **~90-120 sn**. Panel ② aynı beş arketipi (fener, kupa, sutunk, duvar,
sandik) on paletin altında ve her haritanın ÖLÇÜLEN zemin tonu üzerinde yan
yana çizer — "hepsi aynı soluk gri" iddiasının doğrudan cevabı. Panel ③ gerçek
dizilimi oyunun kamerasıyla (44°, 1 birim ≈ 1 px) gösterir.
İki tuzak: çalışırken ekran görüntüsü almak sayfayı açlığa sokup ölçümü
durduruyor (60 tuvali serileştiriyor); ve tuval tamponları elle bırakılmazsa
(`release()`, `width=1`) sekizinci haritada kilitleniyor.

**PANEL ②'NİN ÇERÇEVESİ NESNE BOYUNDAN TÜRETİLİR.** İlk sürüm sabit katsayı
kullandı (`h×1,9 + 30`) ve kısa nesnelerde kamerayı çok yakına koydu: fıçı ve
kısa sütun çerçeveden TAŞIYORDU. Renk kolonu doğru göründüğü için kusur
gözden kaçtı — oysa panelin İKİNCİ amacı (silüet zeminden kopmadan okunuyor
mu) ölçülemez haldeydi. FOV 28'de görünen yükseklik ≈ 0,498·d, yani nesnenin
en büyük boyutunun 1,45 katını sığdırmak için `d ≥ 2,9·boy`. **Bir ölçüm
panelinin kendi çerçevesi de ölçütün parçasıdır.**

---

## BÜYÜCÜ ATIŞTA 360° DÖNÜYORDU (2026-08-26) — `render3d._poseCaster`

Kullanıcı: *"büyücü iskelet büyü atarken 360 ileriye doğru dönüyor."*
Sebep three.js'in belgelenmemiş ama kaynakta açık bir davranışı:
**`PropertyMixer.apply` kemiğe yalnız DEĞER DEĞİŞTİYSE yazar**
("value has changed -> update scene graph"). Büyücü ateş ederken YERİNDE
DURUR, yani klip zamanı `restT`ye kilitli ve `mixer.update(0)` hiçbir
bağlamayı değiştirmiyor → kemiğe TEK BİR YAZMA olmuyor. Poz her karede
`quaternion.multiply(delta)` yaptığı için delta o karelerde sıfırlanmıyor,
üst üste biniyor: 0,55 sn'lik atışta kol ~2,3 tur atıyordu.

Önceki savunma (klibin hangi kemiği sürdüğünü ÖLÇÜP sürülene delta çarpmak,
`*Drv`/`*Q0`) doğruydu ama yetmiyordu: sürülen bir kemiğe de mixer her karede
yazmıyor. Çözüm ölçmek değil **POZU GERİ ALMAK** — poz uygulanmadan önceki
kuaterniyon slotta saklanır (`bones.*S`) ve her karede mixer'dan ÖNCE geri
yazılır (`_unposeCaster`). Kemiğin sürülüp sürülmediği artık hiç sorulmaz;
o soru her yeni klipte yeniden yanlış cevaplanabilirdi. Sıra:
**geri al → mixer → sakla → delta çarp**, üçü de aynı blokta (LOD karesinde
mixer yazmaz).

---

## SAVAŞ ALANI HARİTALARI (2026-08-14) — `arenaMaps.js`

Eski `main.bakeArena` (~15 KB, gotik mezarlık: kırık taş döşeme + demir
parmaklık + köşe kuleleri, altı dünya için tek palet tablosu) SİLİNDİ.
Yerine beş harita geldi; `bakeArena` artık yalnız bir sözleşmedir:

```js
paintArenaMap(worldMapId(this.worldId), {
  play: A.play, border: A.border, res: 1.15, world: this.worldDef(),
})
```

| dünya | harita | id |
|---|---|---|
| 1 SOLGUN MEZARLIK | Kızıl Hasat Tarlası | `tarla` |
| 2 KÜL ÇUKURLARI | Han Avlusu | `han` |
| 3 ZEHİR BATAKLIĞI | Tuz Tabanı | `tuz` |
| 4 KAN KATEDRALİ | Donmuş Göl | `buz` |
| 5 HİÇLİK TAHTI | Gök Çarkı | `carki` |
| 6 GÖKÇE ADA | Gök Çarkı | `carki` |

Altı dünya, beş harita: **paylaşım kasıtlı olarak 5-6 arasındadır** —
ikisi de "hiçliğin üzerinde yüzen taş" dünyasıdır, yani aynı zeminin iki
paleti olarak okunur. Komşu dünyaları oyuncu üst üste oynar; paylaşımı
başka bir çifte koymak anında fark edilirdi.

### Beş tasarım kuralı (yeni harita eklerken hepsi geçerli)
1. **Oyun alanının içi tamamen DÜZDÜR.** Hacimli hiçbir şey yok; ağaç,
   sütun, kaya yalnız çitin DIŞINDA (`edge`) yaşar. İçerideki her şey
   zemine gömülü/yatık boyanır. `worldDecor.js` zaten devre dışı
   (`render3d` satır ~649) — o grubu geri açmak bu kuralı bozar.
2. **Merkez sakin.** Makro öğeler `E.spot(minK)` ile r > P·0.16 halkasına
   konur. Oyuncunun döndüğü göbek okunur kalmalı.
3. **Düşman ölçeğinde (~30 px) yüksek frekanslı desen YOK** — o ölçekte
   titreyen doku silueti yutar. Detay ya mikro (grain) ya belirgin makro.
4. **Sınır uzaktan okunur:** iç kenarda açık `threshold` şeridi tam
   `play/2`ye oturur. Görsel = çarpışma kuralı. O şeridi kaldırma.
5. **Zemin koyu ve düşük doygunlukta.** Mavi alev, kesik, kritik ve hasar
   yazısı zeminden ayrışmak zorundadır.

### Ölçüm — göz yanıltır, `_maptest.html` yanıltmaz
Ekran görüntüsünün tonu kaydığı için "koyu mu" sorusu gözle çözülmez.
Tezgah oynanabilir kareden 96² ızgara örnekler:

| ölçü | hedef | neden |
|---|---|---|
| `ort` | 26-52 | koyu ama siyah değil |
| `p95` | < 150 | efekt (200+) ayrışsın |
| `doy` | < 0.30 | renkli zemin efekti yutar |
| `tek` | 4-14 | 4 altı "boş duvar", 14 üstü düşmanla yarışan gürültü |

**`doy` BANDI 0,30 → 0,42: ÖLÇÜMLE GEREKÇELENDİRİLDİ (2026-08-26).**
`_10maptest` `doy<0,42` ile denetliyor ve on haritanın yedisi 0,38-0,41'de
oturuyor — eski 0,30 bandıyla yedi harita kırmızı olurdu. İlk bakışta bu
"bant, haritalar ayarlanmak yerine genişletilmiş" görünüyor. Ölçüm tersini
söyledi: **doygunluk bir VEKİLDİ**, gerçek ölçüt "efekt zeminden ayrışıyor
mu" ve o ayrışma ağırlıklı olarak DEĞERDEN gelir, kromadan değil. Altı efekt
rengi (kan · kritik · ruh · alev · küre · kemik yazısı) her haritanın zemin
ortalamasına karşı ölçüldüğünde **en zayıf çift bile ×1,87 parlaktır**:

| en zayıf eşleşme | zemin lum | oran | hueΔ |
|---|---|---|---|
| buzul × mavi alev | 57,8 | ×2,62 | **4°** |
| tuzla × kan | 64,0 | **×1,87** | 58° |
| hiçlik × mavi alev | 49,4 | ×3,06 | 20° |
| katedral × küre | 49,4 | ×3,63 | 2° |

Yani 0,42 doğru tavandır; 0,30 gereğinden sıkı bir vekildi. **AMA İKİ ÇİFT
İZLENİR:** buzulda mavi alev zeminle AYNI HUE'da (4°) ve yalnız değerle
ayrılıyor — buz zemini parlatılamaz; tuzla en parlak zemindir (64) ve kanın
oranı bandın dibi. Yeni bir harita ya da yeni bir efekt rengi eklerken
ölçüt şudur: **oran ≥ 1,8 VE (hueΔ ≥ 20° ya da oran ≥ 2,5)**. Zemin
ortalaması 64'ü geçerse kan okunmaz olur.

Üç harita ilk sürümde `doy` 0.41-0.44 çıktı. Çözüm her boyacının içinde
renk kısmak DEĞİL (o, boyacının kendi koyu/açık dengesini de bozar):
parlaklığı aynen koruyup yalnız kromayı çeken tek geçiş — `grade()`.

**ÖLÇÜM SIRASI ÖNEMLİ: `night` veya `grade` değiştiyse `tek` YENİDEN
OKUNUR.** İkisi de yerel kontrastı düzleştirir ve leke katmanları onlardan
ÖNCE çizilir. Bu bir kez atlandı: doygunluk düzeltmesinden sonra tarla 3.6 ·
han 3.8 · tuz 3.8'e düşmüştü ("boş duvar" bandı) ve fark edilmedi, çünkü
ölçüm o değişikliklerden önce alınmıştı. Çözüm makro leke katmanlarını
güçlendirmekti (tarlada alaca adedi 150→260 ve alfa, hanm plaka-içi aşınması
2→3 leke, tuzda plaka gövde alfa aralığı 0.10-0.23 → 0.06-0.40) — hiçbiri
yüksek frekanslı gürültü eklemeden, kural 3 korunarak.

Ölçülen son durum (yirmi değerin tamamı bantta):

| harita | ort | p95 | doy | tek | pişirme |
|---|---|---|---|---|---|
| tarla | 35,6 | 54 | 0,24 | 4,2 | 7 ms |
| han | 32,1 | 52 | 0,21 | 4,9 | 11 ms |
| tuz | 46,8 | 64 | 0,09 | 5,3 | 2 ms |
| buz | 46,8 | 69 | 0,27 | 4,3 | 5 ms |
| carki | 31,4 | 49 | 0,28 | 5,2 | 2 ms |

Üst sınırlar DIŞLAYICI (`v < hi`): hedef "doy < 0.30" yazılıyken denetim
`v <= hi` olduğu için tam 0.30 çıkan çark yeşil görünüyordu.

### Üç tuzak (hepsine bir kez düşüldü)
1. **Kenar boyacısı `evenodd` ile kırpılmak ZORUNDA.** `edge()` dış
   boşluğu tam tuval olarak doldurur; kırpma olmadan zemini siler
   (göbek simsiyah çıktı, teşhisi uzun sürdü).
2. **`grade()` piksel döngüsüyle YAZILMAZ.** İlk sürüm JS'te piksel
   piksel geziyordu: pişirme 11 ms → **329 ms** (3,6 M piksel × 4 kanal),
   altı dünyada altı kez ödenir. Şimdi yerel tuval filtresi
   (`saturate()`), iki blit, ~13 ms.
3. **Tezgah `game/` kapsamındaki modülleri fetch ETMEMELİ.** İstek servis
   çalışanından geçer ve önbellekteki ESKİ dosyayı döndürür — main.js
   doğruyken metin denetimi altı kırmızı ✗ verdi. Ayrıca
   `await import('./main.js')` yasak: modülü başlatır ve oyun
   localStorage'a yazar, yani kullanıcının kaydına dokunur.

Görsel doğrulama: **`game/_maptest.html`** — beş haritanın kuşbakışı +
göbek 1:1 + kenar 1:1 kesitleri, dört ölçüm, ve altı dünyanın oyundaki
gerçek çağrıyla pişmiş hâli. `_firetest` / `_eggtest` / `_herotest` ile
aynı amaca hizmet eder.

Demo sayfası (onay öncesi gezinti): `Savaş Alanı Haritaları.dc.html`.

### ZEMİN DOKUSU 2'NİN KUVVETİ OLMAK ZORUNDA (`pot: 2048`)
Zemin 44° eğik bakılır ve ekranda küçültülür: 2438² doku ~1000 px'e
sığdığında her ekran pikseli dokudan ~2,4 örnek atlar. Kamera kıpırdadıkça
hangi örneğin okunduğu değişir ve zemin **TİTRER** (minifikasyon aliasing'i).
Tek çözümü mipmap'tir — ama mipmap bir süre KAPALIYDI, çünkü POT olmayan
dokuda mip zinciri tam bölünmez ve bazı sürücüler geçişleri eğri bir
karartma sınırı gibi çizer. İkisi ancak birlikte çözülür:

`paintArenaMap(..., { pot: 2048 })` + `generateMipmaps = true` +
`LinearMipmapLinearFilter` + `anisotropy = min(8, max)`.

Anizotropi eğik zeminde şart: izotropik mip uzağı gereğinden fazla
bulanıklaştırır. VRAM 2048² RGBA + mip ≈ **22,4 MB** (öncesi 2438² mipsiz
23,8 MB) — titreme düzelirken bellek de düştü. Serbest `res` ile
PIŞİRMEYİN; `res` yalnız tezgah/önizleme içindir. `_maptest` boyutu ölçer.

---

## JOYSTICK TAKILMASI (2026-08-14) — `input.js`

Oyuncu "hareket çubuğu takılıyor" dediğinde sebep neredeyse her zaman
**kaçan bir `pointerup`**tır. Eski kod iki yerde kırılgandı:

1. `onUp` yalnız `e.pointerId === this.id` iken bırakıyordu,
2. `onDown` koşulsuz `if (this.active) return` diyordu.

İkisi birleşince tek bir kayıp olay **KALICI** kilit üretiyordu: `active`
true kalıyor, sonraki her dokunuş 2. satırdan geri dönüyor, oyuncu bir daha
hiç hareket edemiyordu.

### Dört kapatılan kaçak yol
| yol | çözüm |
|---|---|
| tarayıcı jesti devralır (kaydırma, geri) | `setPointerCapture` + `lostpointercapture` |
| üstteki HTML katmanı pointerup'ı yutar | yakalama olayı kanvasa yönlendirir |
| uygulama arka plana düşer | `blur` + `visibilitychange` |
| duraklatma/seviye kartı parmak basılıyken açılır | `sample()` içinde merkezi koruma |

Tüm çıkışlar **tek** `_release()` yolundan geçer — "yarı bırakılmış" durum
kalmaz ve idempotenttir. `onDown` artık canlılık testi yapar
(`hasPointerCapture`): yakalama bizde değilse o parmak yok, yeni dokunuş
DEVRALIR. Yani kilit oluşsa bile bir sonraki dokunuşta kendini onarır.

Merkezi koruma `sample()`tedir, geçiş noktalarında değil: yeni bir durum
(yeni perde, yeni menü) eklendiğinde unutulacak yer olmaz.

---

## DÜŞMAN MODELİ SADELEŞTİRME (2026-08-23) — `_lodtest.html`

Düşman modelleri HAM yükleniyordu: muhafız 10.208 · büyücü 10.633 üçgen,
oysa bu dosyanın kendi ölçütü "düşman için 2–4k yeterli" diyordu. Kalabalık
modeli (hortlak, 3.060) bandın içindeydi, pahalı ikisi 2,5-3,5 katı.
`heroModel.loadDecimatedHero` boru hattı hazırdı ama **düşman yolunda hiç
kullanılmamıştı** — kayıt `WORLD_ENEMY_MODELS[*].decimate` ile açıldı.

| | üçgen | slot | oyundaki pay | doku |
|---|---|---|---|---|
| hortlak | 3060 → 3060 | 21 | 64k → 64k | 8,0 → 1,0 MB |
| muhafiz | 10208 → **3866** | 7 | 71k → **27k** | 8,0 → 1,0 MB |
| buyucu | 10633 → **4392** | 6 | 64k → **26k** | 4,0 → 1,0 MB |
| **toplam** | | 34 | **200k → 118k (−41%)** | **20 → 3 MB (−85%)** |

Doku kazancı üçgenden ÖNEMLİDİR: 2 GB'lık telefonlarda WebView'i ~350 MB'ta
öldüren şey buydu. Hortlakta üçgen hiç düşmez (kümeleme `srcTris <=
target*1.25` ile atlanır) ama kayıt yine AÇIK — doku küçültme ve IndexedDB
önbelleği o yoldan geçiyor (SAPANCI kaydıyla aynı gerekçe), yani ikinci
açılışta ne ağ isteği ne Draco çözümlemesi olur.

### MESAFE LOD'U BU OYUNDA YAZILMAZ
Kamera tepeden bakar: ekrandaki her düşman kameradan neredeyse AYNI
uzaklıktadır. "Uzaktakini kaba çiz" hiçbir şey kazandırmaz — kazanç TABAN
üçgen sayısını düşürmekten gelir ve her düşman için her karede ödenir.
İki LOD kademesi yerine tek, doğru ölçülmüş kademe.

### SADELEŞTİRME EMISSIVE KANALINI SESSİZCE DÜŞÜRÜR
Ham GLB'ler iki doku taşıyor (baseColor + emissive); `heroModel` yalnız
baseColor'ı pişirir. Sonuç: figür karanlık zeminde **koyulaşır** —
üçgen sayısı harika görünürken okunurluk kaybedilir. Çözüm yeni ışık DEĞİL
(yasak), projenin kendi kalıbı: dokunun KENDİSİ `emissiveMap` olur (`lift`).
Değerler tezgahta ÖLÇÜLDÜ, gözle seçilmedi — hortlak **0,54** (×0,90) ·
muhafız **0,46** (×0,89) · büyücü 0,42 (×0,94). Ölçüt "aynı görünsün" değil
(lift çarpımsal maske, düz emissive değil), okunurluğun kaybolmaması:
sadeleştirilmiş / ham parlaklık oranı **0,88–1,35** bandında.

### Tezgah üç şeyi BİRLİKTE ölçer, yoksa yeşil ama yanlış verir
① üçgen + doku · ② aynı ekran boyunda yan yana siluet (gözle) · ③ klip 90
kare sürülürken kemik yayılımı / gövde boyu (< 0,75). ③ olmadan bozulan
deri fark edilmez: hata yalnız HAREKET ederken görünür, duran karede değil.

**Tezgahın kendi tuzağı — bir kez düşüldü:** heroModel'in ÖNBELLEK yolu
dokuyu `new Image()` + `onload → needsUpdate` ile kurar (oyunda doğru: perde
arkasında yüklenir). Tezgah beklemeden çizerse doku 0×0 olur, figür SİYAH
çıkar ve ölçüm "koyulaştı, lift yükselt" der — var olmayan bir hataya doğru
görünen bir teşhis (ölçülen oran ×0,11 idi; gerçek ×0,77). İlk çalıştırmada
görülmez (doku tuvalden gelir), ikincisinde ortaya çıkar. `awaitTextures()`
zorunlu.

---

## PROSEDÜREL MÜZİK v2 (2026-08-23) — `music.js`, `_musictest.html`

Ses **efektleri** v3 ile bitmişti ama MÜZİK yoktu. Motor partisyonu çalarken
yazar: akor ilerleyişi sabit (kimlik), ezgi ve ritim her barda yeniden kurulur.
Üç durum: menü · savaş · boss. `setState` bar sınırında geçer, boss anında girer.

**Zamanlayıcı KARE DÖNGÜSÜNDE DEĞİLDİR** — `setTimeout` ~140 ms'de bir
uyanıp sonraki ~0,9 sn'yi Web Audio saatine yazar. Sıcak döngüde hiç
çalışmaz, yani perf sözleşmesi kural 1 ihlal edilemez. Ses yolu SFX ile
ORTAK limiter/yankıyı kullanır: patlamada müzik kendiliğinden geri çekilir.

### v1 REDDEDİLDİ — ve tezgah bunu yakalayamadı
v1 Sol minördeydi: menü ağıt tempolu (64 BPM, vurmalı YOK), ezgi lavtada,
boss frigian. Kullanıcı "beğenmedim" dedi ve tezgahın yirmi ölçümü yeşildi.
Sebep tezgahın ölçüt SETİndeydi, ölçümünde değil (bkz. aşağı).

### Bb MAJÖR — audio.js'e DOKUNMADAN aydınlatma
**Bb majör, Sol aeolian ile AYNI YEDİ NOTAYI kullanır** (ilgili majör).
Bütün fanfarlar Sol minörde yazılıydı; ton merkezini Bb'ye taşımak müziği
baştan sona aydınlatırken zafer fanfarının müziğin ÜSTÜNE düşmesini korur —
audio.js'te **tek satır değişmedi**. Akor şekilleri dosyada zaten vardı,
yalnızca sıra değişti.
  · menü  104 BPM  I–V–vi–IV  · marimba + yürüyen bas + hafif tef
  · savaş 128 BPM  I–IV–vi–V · korno vuruşları + sekizlik ostinato
  · boss   78 BPM  Sol minör + **D MAJÖR dominant** (frigian bII BIRAKILDI:
    o aralık "epik" değil "rahatsız" duyuluyordu)

### SABİT TEMA + PROSEDÜREL VARYASYON
v1'in ezgisi tamamen prosedüreldi ve TAM BU yüzden akılda kalmıyordu:
rastgele ezgi her zaman "kütüphane müziği" duyulur, asla nakarat olmaz.
Tersi de tuzak: tamamen sabit döngü yirmi dakikada ezberlenir. Çözüm gerçek
film/oyun müziği pratiği — elle yazılmış tema (`THEMES`) + her tekrarda
varyasyon (oktav taşıma · süsleme · seyreltme · harmoni · kadans).

Varyasyon kademeleri **döngüsel değil ARTIMLIDIR**: tanıdık → süslü → seyrek
→ tam. Rastgele sıra "her tekrar başka şarkı" duyulur.

**`tail` (değişen kadans) yalnız müzikal bir tercih değil ÖLÇÜM ŞARTIDIR:**
tema sabit olduğu için oktav/süsleme varyasyonları perde dizisini hiç
değiştirmiyordu ve tezgah "varyasyon çalışmıyor" diyemiyordu.

### "RAHATSIZ ETMESİN" BİR MİKS AYARI DEĞİL
Sesi kısmak yormayı çözmez; yoran şey ARALIKSIZ ezgidir. Nefes temanın
İÇİNE yazılıdır. İlk yazılan menü teması 16 vuruşun **%78'ini** doluyordu —
kulağa "neşeli" gelen ama beş dakikada yoran yoğunluk tam olarak bu.
Seyreltildi: menü %60 · savaş %45 · boss %71. Altta marimba yatağı sürer
(temannın SUSTUĞU yeri doldurur), yani sessizlik "müzik kesildi" okunmaz.

### TEZGAHIN ÖLÇÜT SETİ İKİ YERDE YALAN SÖYLÜYORDU
1. **Tekrar ölçütü tek yanlıydı** (`rep < 8`). v1'in akılda kalmayan ezgisi
   bu yüzden yeşil veriyordu. v2'de İKİ YANLI: alt sınır tema TANINIYOR mu,
   üst sınır varyasyon ÇALIŞIYOR mu (hedef 5–26 nota).
2. **Tiz bantta yalnız TABAN vardı** (`tiz > 2`), yani cırtlak bir miks de
   testi geçerdi — oysa "rahatsız etmesin"in ses tarafındaki karşılığı tam
   olarak tiz enerjisinin TAVANIDIR (artık 2–22%).
Yeni ölçüt: **ezgi doluluk oranı** (%30–%72) — alt sınır da şart, neredeyse
hiç çalmayan ezgi "müzik yok" diye okunur. RMS bandı −28…−18 dBFS.

### BAS 58 Hz'TE DURUYORDU — duyulmayan ama limiter'i kapatan enerji
İlk sürümde `bassOct: -1` (temel ~58 Hz) ve oktav ikizi 0,34'te kısıktı:
dört durumda da enerjinin **%68-77'si** 200 Hz altına gidiyordu. Telefon
hoparlörü orayı çalmaz, yani duyulmadan limiter'i kapatıp savaş efektlerini
boğuyordu — CLAUDE.md'deki boss `padOct` dersinin aynen tekrarı.
Düzeltme: temel bir oktav yukarı (`bassOct: 0`, ~117 Hz), oktav ikizi 0,85,
timpani `-1 → 0`. Marimba da neredeyse saf sinüstü (üst kısımlar 0,17/0,045)
ve tiz bant %1,4'te kalıyordu: **kulağa "yumuşak" gelen ayar cihazda "yok"
demek** — kısımlar 0,30/0,14, ahşap tık f×6 → f×9.

Ölçülen son durum (otuz iki değerin tamamı bantta):

| durum | tepe | RMS | doluluk | tekrar | alt/orta/tiz |
|---|---|---|---|---|---|
| menü | −4,5 | −20,9 | %60 | 10 | 48,2 / 49,4 / 2,5 |
| savaş erken | −5,5 | −23,5 | %45 | 11 | 48,1 / 48,5 / 3,4 |
| savaş son | −5,0 | −22,2 | %45 | 18 | 52,4 / 44,6 / 2,9 |
| boss | −6,0 | −21,7 | %71 | 7 | 57,5 / 40,2 / 2,3 |

### OYUNA BAĞLI (v1'de bağlı DEĞİLDİ)
- Durum dalgadan **TÜRETİLİR** (`beginWave`), ayrı yerde tutulmaz: ikinci bir
  durum kaynağı `waveDuration` tuzağının aynen tekrarı olurdu. Yoğunluk =
  dalganın görevdeki oranı. Boss durumu ANINDA girer (bar sınırını beklemez).
- Ölümde müzik **SUSAR**, kısılmaz: yenilgi perdesi altında neşeli marimba
  anın duygusunu yok eder — sessizlik burada bir efekt.
- `setDanger`/`setThin` **HUD ile aynı 20 Hz'te** sürülür, her karede değil.
- **İlk dokunuşta başlar**, "görev başlat"ta değil: menü müziğin en çok
  duyulduğu yer. `once: true` KULLANILMAZ ve dönen değere bakılmaz — ses yolu
  ASENKRON açılır, gerçek cihazda ilk dokunuşta `ctx.state` hâlâ 'suspended'
  olabilir ve tek şansını harcayan dinleyici müziği ikinci dokunuşa (bazen
  hiç) bırakır. Müzik hemen kurulur, `statechange` açıldığı anı yakalar ve
  `resync()` zamanlayıcıyı ŞU ANA hizalar — hizalamadan biriken barların
  hepsi aynı ana yazılıp gürültü patlaması olurdu.
- Ayar panelinde müzik **efektten AYRI**: oyuncuların çoğu müziği kapatıp
  efekti açık bırakmak ister, tek kaydırak bu seçimi imkânsız kılar. Müzik
  kaydırağında tık sesi ÇALINMAZ (müziğin kendisi zaten önizleme).

---

## AYARLAR · GERİ TUŞU · ARKA PLAN (2026-08-23) — `settings.js`

Üç eksik birlikte kapatıldı; üçü de "gerçek uygulama" hissinin parçası.

### Ayar paneli (`#screen-settings`)
Üç ayar, üç yere uygulanır, hiçbiri kendi kopyasını tutmaz:
`gfx → Quality` · `sfx → AudioFX.setVolume` · `haptics → Haptics.enabled`.
Menüdeki dişli (`.tb-gear`) ve duraklatma perdesinden açılır. Panel
duraklatma perdesinin **ÜSTÜNE biner** (`hideAllScreens` çağrılmaz) — perdeyi
kapatmak "DEVAM ET"i yok eder ve oyuncu savaşa dönemez.

**Grafik: otomatik varsayılan + elle geçersiz kılma.** Cihaz tahmini
(`deviceMemory`/`hardwareConcurrency`) BAZEN YANILIR: bazı üreticiler
`deviceMemory` vermez (varsayılan 4 → güçlü cihaza 'low' damgası), bazı
emülatörler 8 çekirdek bildirir ama GPU zayıftır. Varsayılan `'auto'` kalır
(ayara hiç girmeyen çoğunluk doğru kademeyi alır) ve panel `'auto'` seçiliyken
hangi kademeye düştüğünü GÖSTERİR — yoksa oyuncu neyin çalıştığını bilemez.
Kademe TABANI belirler, tavanı değil: `Quality.stress` uyarlanabilir kısmayı
her kademede sürdürür, yani "yüksek" diyen oyuncunun telefonu ısındığında
oyun yine kendini korur. Kademe değişince `Quality.init` yeniden çağrılır
(bütçe + çözünürlük tabanı + kare tavanı hep oradan); anında görünen etki
çözünürlüktür, efekt/düşman ADETLERİ havuzdan geldiği için sonraki görevde
tam oturur.

Kaydırak: `input`ta ses uygulanır ama **`change`te kaydedilir** — her piksel
hareketinde localStorage'a yazmak gereksiz.

### Geri tuşu — NÖBETÇİ GEÇMİŞ GİRİŞİ
Android donanım geri tuşu, geçmişte giriş varsa `popstate` üretir; yoksa
**uygulamayı KAPATIR**. Oyun tek sayfa olduğu için geçmiş boştu: savaşın
ortasında geri tuşu oyunu kapatıyordu. Çözüm açılışta konan bir nöbetçi
giriş: her basışta tüketilir ve `handleBack()` bir şey kapattıysa HEMEN
yenilenir. `handleBack()` false dönerse (kök menü) nöbetçi yenilenmez —
ikinci basış kapatır, Android'de beklenen davranış.

Sıra en üstteki katmandan aşağı: ayarlar → kahraman kartı → savaş bileti →
oynanışta duraklat → duraklamada devam → alt sayfadan kök sekme.
**İkinci bir ekran yığını TUTULMAZ**: durum `game.state` ve ui sınıflarında
zaten yaşıyor, ikinci kaynak `waveDuration` tuzağının aynısı olurdu.

### Arka plana düşünce sesi askıya al
`AudioContext` arka planda çalışmaya devam eder: zamanlayıcılar döner,
limiter/yankı düğümleri işlenir, pil yanar. Cebe konan telefonda hâlâ ses
üreten oyun "web sitesi" gibi davranır. `visibilitychange`'de `suspend()`,
dönüşte `resume()` — **elle**, çünkü tarayıcı suspend'den sonra kendiliğinden
devam ettirmez ve oyun sessiz kalır.

### Panelde ölçülen üç düzeltme (hiçbiri tahminle bulunmazdı)
- `.screen` içeriği dikey ORTALAR; dört grup taşınca başlık ekranın üstünden
  kesiliyordu ve kaydırma yoktu — **paneli kapatmanın yolu kalmıyordu**.
  Panel yukarıdan başlar, kendi içinde kaydırılır.
- `.screen-title` 44 px'e kadar büyüyor ve esnek küçülmüyor: kapatma (X)
  butonunu panelin dışına sürüyordu. `flex:1 1 auto; min-width:0` + küçük
  punto.
- Büyük başlık + harf aralığı yatay kaydırma çubuğu çıkarıyordu; görünür
  kaydırma çubuğu `nativeShell`in kapattığı belirtilerle aynı sınıf, ikisi de
  gizlendi (`overflow-x:hidden` + `scrollbar-width:none`).
- "GÖRÜNTÜ KALİTESİ" + "OTOMATİK · YÜKSEK" dar kabukta ikisi de iki satıra
  sarıyordu → etiket üstte, değer altta (`.set-row-label.stack`), CLAUDE.md'nin
  kahraman inceleme kartındaki dersinin aynısı.

**Müzik ayarı EKLENDİ** (v2, müzik oyuna bağlandı) — efektten ayrı kaydırak.

---

## GOOGLE PLAY İÇİN KALAN ZORUNLULUKLAR

1. **three.js ve fontlar yerele indirilmeli.** Şu an `index.html`
   unpkg CDN + Google Fonts kullanıyor. Uygulama uçak modunda
   açılmıyorsa Play "minimum functionality" politikasına takılır ve
   ilk açılış CDN gecikmesine bağlı olur. `assets/vendor/three.module.js`
   + yerel `@font-face` şart. **Komutlar `game/OFFLINE.md`'de hazır;
   dosyalar `assets/vendor/` altına gelince kod tarafındaki dört düzenleme
   (importmap · Draco yolu · `@font-face` · ısıtma) yapılacak.**
2. **Model bütçesi.** ~~Meshy çıktıları 20–60k üçgen gelir; düşman için
   2–4k yeterli.~~ **MEZARLIK KADROSU İÇİN YAPILDI** (bkz. "DÜŞMAN MODELİ
   SADELEŞTİRME"): 200k → 118k üçgen, doku 20 → 3 MB. Yeni dünya/düşman
   eklerken `decimate` kaydı ZORUNLU, `lift` değeri `_lodtest`te ölçülür.
   KTX2/Basis hâlâ yapılmadı — WebP dosyada küçülür ama GPU belleğinde ham
   kalır; şu anki 3 MB o yüzden gerçek GPU maliyetinin altındadır.
3. **VAT / instancing.** İskeletli düşmanları tek draw call'a indirmek
   (animasyonu doku olarak bake et) en büyük kalan teknik kazanç.
4. AAB, güncel target API, 64-bit; yaş derecelendirmesinde şiddet/kan
   beyanı; veri güvenliği formu.
5. **Mağaza varlıkları HAZIR** (2026-08-23) — `game/store/`:
   `ikon-tac-512.png` · `ikon-kurukafa-512.png` (32-bit PNG, alfa kanallı) ·
   `one-cikan-1024x500.jpg`. Sunum: `Mağaza Varlıkları — Google Play.dc.html`
   (mağaza metni, ekran görüntüsü çekim listesi, derecelendirme beyanı).
   **Öne çıkan görselde ALFA KANALI OLAMAZ** — `snapshot_element` 32-bit PNG
   üretir ve Play Console her piksel opak olsa bile reddeder; opak zemine
   düzleştirip JPEG yazılır (708 KB → 98 KB). İkonda ise alfa BEKLENİR.
   İkon tuvalde piksel piksel üretilir, ekran yakalamayla DEĞİL: karıştırma
   modları (`mix-blend-mode`) hem yakalamada hem dışa aktarımda güvenilmez.
6. **İç satın alma (gem · sandık) kabuk gerektirir.** Tarayıcıdan Play
   Billing çağrılamaz; yol TWA + Digital Goods API (`manifest.json` + ikon
   seti + Bubblewrap). Ayrıca **satın almanın geri yüklenmesi zorunlu** —
   kayıt şu an yalnız localStorage'da, uygulama silinince gemler gider.
7. Gizlilik politikası URL'i (barındırılmış sayfa) + geliştirici hesabı
   doğrulaması + oyundan çekilmiş 6 ekran görüntüsü.

---

## MESHY MODELİ EKLEME BORU HATTI (her yeni düşman için aynı)

Meshy ihraç ayarları: **glb**, **Tek dosya AÇIK**, animasyon "Tüm Eklendi",
hedef poligon 4–6k, doku 1024².

Gelen dosya HER ZAMAN şu üç sorunu taşır — kontrol etmeden ekleme:

1. **Doku 2048² PNG ve iki kopya** (baseColor + emissive ayrı ayrı 6.6 MB).
   1024² WebP'ye çevir: 14 MB → 1.15 MB dosya, ~44 MB → ~11 MB GPU belleği.
2. **`doubleSided: true`** — mobil GPU'da her üçgen iki kez rasterize
   edilir (fillrate ×2), kapalı gövdede sıfır görsel fark.
   `mt.side = THREE.FrontSide` (düşman yükleyicisinde zaten uygulanıyor).
3. **Metre ölçeği** — model ~1.7 birim gelir, `height` alanı ile
   ölçeklenir. Ölçek doğruysa dünya kutusu `minY ≈ 0` olmalıdır
   (ayaklar zemine basar); değilse `rig.position.y = -box.min.y` çalışmıyor.

Kayıt: `render3d.js` → `WORLD_ENEMY_MODELS[floor]` **dizisine** satır ekle.
Dünya başına çok model desteklenir; her grubun kendi slot havuzu, boyu,
klibi ve `share` bütçe payı vardır. `share` toplamı 1'i geçmesin.

Pahalı model (>6k üçgen) küçük `share` alır — 10k üçgenlik bir düşman
52 slotta 530k üçgen eder.

### Boy hiyerarşisi (siluetten tanınırlık)
kahraman 60 · Hortlak / İskelet Savaşçı 76 · Mezar Muhafızı 104 · boss ayrı.
Oyuncu tehdidi can barını okuyarak değil siluetten tanımalı.

### Mezarlık model kadrosu (`WORLD_ENEMY_MODELS.mezarlik`)
| id | tip | üçgen | share | slot (high) | klip |
|---|---|---|---|---|---|
| hortlak | zombi | 3060 | 0.62 | 21 | Running |
| muhafiz | muhafiz | 10208 | 0.20 | 7 | Walking |
| buyucu | atici | 10633 | 0.18 | 6 | NlaTrack |

`share` toplamı 1.00. Pay eklenirken KALABALIK gruptan alınır (hortlak
0.75 → 0.62), seyrek gruplardan değil: 21 slot sahneyi doldurmaya yeter,
7 slot muhafız için zaten fazladır. **Kalabalık grup dizide ÖNCE gelir:**
bütçe daralınca son gruptan kesilir, yani sahneyi dolduran hortlak modelli
kalır, seyrek görülen muhafız/büyücü kapsüle döner. Tersi "boş ama keskin"
sahne demektir.

Klip seçimi hıza bağlıdır: hızlı düşman `Running`, yavaş düşman `Walking`.
Yanlış eşleşme ayakların yerde kaymasına yol açar.

---

## İSKELET BÜYÜCÜ + HASAT LORDU (2026-08-22) — `bossMotion.js`, `_bosstest.html`

İlk haritaya iki model girdi: menzilli rolün 3B karşılığı ve oyunun
**boss sanatı**. İkisi de Tripo ihracı, ikisi de aynı boru hattından
geçti (1024² WebP · FrontSide · lift · ölçülen boy).

| ne | dosya | üçgen | iskelet | boy | ad |
|---|---|---|---|---|---|
| menzilli düşman | `assets/mezarlik/buyucu.glb` | 10 633 | 41 kemik, 1 klip | 82 | İSKELET BÜYÜCÜ |
| boss | `assets/mezarlik/hasat_lordu.glb` | 10 460 | **YOK** | 150 | KADİM HASATÇI |

`ENEMY_TYPES.atici.name` 'Nekro Efendisi' → **'İskelet Büyücü'**: ad 2D
kare setinden kalmıştı, artık tipi canlandıran şey modeldir.

### Boss: iskeletsiz model, prosedürel süzülme (`bossMotion.js`)
Model klipsiz gelir ve bu bir eksik DEĞİL, karardır: lord yürümez, havada
süzülür — yürüme klibi olsa ayakları yerde kayardı. Hareketin tamamı tek
**saf fonksiyondur** (`bossPose(out, t, atkT, state, stateT)`, tahsis yok,
çıkış nesnesi çağıranın): iki frekanslı süzülme + eğim/yatış salınımı,
üç olay pozu ve bir gölge ölçeği.

| olay | sıklık | poz | imza mührü |
|---|---|---|---|
| tükürme (12 mermi) | 3 sn | topla → savur → toparla, +7 ileri atılış | **YOK** (sık olay) |
| hücum telegrafı (`windup`) | 6 sn | yükselir, geriye yaslanır, titrer, ısınır | **kademe 3, koyu kızıl** |
| dalış (`charge`) | 0,7 sn | öne eğilir, zemine yakınsar | — |

Poz matematiği **ayrı dosyada** çünkü tezgah da onu okur: tezgah kendi
kopyasını yazsaydı poz değiştiğinde sessizce yalan söylerdi (`waveDuration`
tuzağının aynısı). `BOSS_ATK` sabiti `enemyManager`'daki `e.atkAnim` ile
ORTAK — iki yere yazılsa poz yarıda kesilirdi.

**"Uçtuğu anlaşılsın, uçuşa gitmesin" ölçülebilir bir kuraldır:** süzülme
boşluğu gövde boyunun **%4-12** bandında (12 / 150 = %8). Uçtuğunu söyleyen
şey yükseklik değil, zemindeki yuvarlak gölgeyle arasındaki boşluktur —
gölge yükseldikçe küçülür (taban 0,55: gölge asla kaybolmaz, yoksa lordun
zeminle bağı kopar). Gölge **düşmanların instanced gölge mesh'inde tek
yuvadır**: yeni mesh, yeni çizim çağrısı yok.

### İki kanal, iki iş — ışıma ayrışmak ZORUNDA
Boss'un tek ışıma kanalı var (`emissiveIntensity`) ve iki şey anlatıyor:
hücum telegrafı ile vurulma parlaması. İlk sürümde ikisi de ~3,4'e
çıkıyordu, yani **telegraf sırasında vurmak sessiz kalıyordu** (tezgah
ölçtü: 1,00 → 3,39 → 3,39). Telegraf tavanı 2,9'a indi, isabet 3,8'e
çıktı. Yeni ışık eklenmedi (yasak): ışıma dokunun kendi `emissiveMap`inden
gelir (`lift` — lord 0,26, büyücü 0,42; ölçülen doku parlaklığı 87/%42 ve
79/%58).

### Can barı tepesi ÖLÇÜLÜR
Eski kod `108 * (radius/47)` yazıyordu — yer tutucu kapsülün boyu. 150
birimlik lordun göğsüne düşüyordu. `_driveBoss` her karede
`_bossTopY = (poz.y + 150) * ölçek` yazar, bar onu okur (ölçülen 162 → bar 178).

### Yer tutucu SİLİNMEDİ
Kapsül+boynuz mesh'i `bossFallback` olarak duruyor ve model yüklenene
kadar (ilk savaşta ~1 sn) çizilir; yüklenince gizlenir ve bir daha
çizilmez. Boss dalgası ortasında 750 KB indirmemek için yükleme savaş
perdesi kapalıyken başlar (`prepareWorldEnemies`). Shader ısıtması
ZORUNLUYDU: boss grubu `visible = false` doğar, yani `precompileScene` onu
gezmez ve shader ilk göründüğü karede — tam boss uyanışında — derlenir.
Yükleyici bir kare görünür yapıp `compileAsync` çağırır.

### "BÜYÜCÜ BANA DOĞRU GELİYOR" — İKİ AYRI SEBEP (2026-08-22 düzeltmesi)
Model doğru tipteydi (`types: ['atici']`) ama davranış onu yakın dövüşçü
gibi okutuyordu. İkisi de sayı hatasıydı, sanat hatası değil:

1. **DURMA MESAFESİ EKRANDAN TÜRETİLİR, SABİT YAZILMAZ.** Önce `range`
   (265) idi: kabuk ~420 px, yarı genişlik ~210 → büyücü ekran DIŞINDA
   duruyor, ateş kapısı (`inView`) kapalı olduğu için hiç atmıyordu. Sabit
   195'e çekmek de yanlıştı — geniş kabukta gereğinden çok yaklaşıyordu
   ("aşırı yaklaşıyor"). Doğru ölçü oyuncudan GÖRÜŞ KENARINA, büyücünün
   geldiği yöndeki mesafedir: `min(yarıW/|ux|, yarıH/|uy|) × 0,86`
   (viewL/R/T/B'deki 140 birimlik PAD çıkarılır), `[150, range−25]`
   aralığına kırpılır. Ekranın kenarında durur: hem uzak, hem GÖRÜNÜR,
   hem ateş kapısı açık. `backRange 120` = geri çekilme bandı.
   **Duran büyücü mutlaka atıyordur** — kimlik hareketten okunur.
   **Hedef mesafe YUMUŞATILIR + ÖLÜ BANT (2026-08-22b).** Kenar mesafesi
   yöne bağlıdır (köşeye ~240, kenara dik ~170) ve oyuncu hareket ettikçe
   yön sürekli değişir: ham hedefe uyan büyücü her karede farklı mesafe
   isteyip ileri geri sallanıyordu — ekranda "bir anda geriye ışınlanma"
   olarak okunuyordu. Hedef `e.standD`'de saklanır (obtain'de sıfırlanır)
   ve saniyede ~1,6 katıyla yaklaşır; yaklaşma eşiği `stand × 1,06`,
   çekilme eşiği `stand × 0,72` — arası ölü bant, hiç hareket yok.
2. **Dururken yürüme klibi tam hızda dönüyordu.** Animasyon hızı `e.speed`
   den türetiliyor, gerçek harekete bakmıyordu; yerinde adımlayan figür
   "bana geliyor" diye okunur. `def.idleRate 0.14`: `e.mvAmt < 6` iken klip
   %14 hıza düşer, üstüne prosedürel duruş biner. Yeni klip yok.
   Ölçüldü: aynı dt'de 0,061 sn → 0,008 sn.

**DURUŞ = DİNLENME KARESİ, YAVAŞLATILMIŞ KLİP DEĞİL.** Klibi yavaşlatmak
figürü nerede durduysa orada — çoğu zaman bir bacak havadayken — asılı
bırakıyordu ("animasyon yarıda kalmış" görüntüsü). Klip zamanı artık
`sp.restT`'ye en kısa yoldan kaydırılıp orada tutulur.

`restT` yüklemede ölçülür ve **ÖLÇÜT İKİ KADEMELİDİR**: ① önce iki ayağın
da zeminde olduğu kareler ayıklanır, ② sonra o küme içinde ayakların yatay
açıklığı küçültülür. Yalnız yatay mesafeye bakmak — ilk sürümün yaptığı —
her zaman GEÇİŞ karesini seçer: bir bacak diğerinin yanından geçerken
havadadır, yani metrik olabilecek en kötü duruşu bulur.

**EŞİK ORANLIDIR, MUTLAK DEĞİL.** Ölçüm model-YEREL uzayda yapılır (bu
rigde ölçek ~48×, ayak yükseklik bandı 0,01–0,11): mutlak bir band
(`minHi + 0.5`) tüm kareleri içine alıp birinci kademeyi sessizce no-op
yapar ve ölçüt düzeltilmek istenen "yalnız açıklık" haline geri döner —
tam bu olmuştu. Band artık klibin kendi ayak genliğine oranlı
(`minHi + 0.15 × (maxHi − minHi)`). **Kök hareketi söküldükten sonra
YENİDEN ölçülür** (kayan klipten seçilen kare yalan söyler): ölçülen
**t = 1,88 sn** (en yüksek ayak 1,75 · band 1,09–9,56 · ayak farkı 2,70).
Tezgah denetimi de "restT yazıldı mı" değil, seçilen karenin gerçekten
ayakta durduğunu ölçer — yoksa yalancı yeşil verir (bir kez verdi).

### KÖK HAREKETİ DÜŞMAN YOLUNDA DA SÖKÜLÜR (koşulsuz)
Kullanıcının "gölgesi arkada, kendisi önde" ve "bir anda geriye ışınlanıyor"
şikayetlerinin GERÇEK sebebi buydu — durma mesafesi titremesi (standD) yalnız
ikinci bileşendi. Tripo/Meshy NLA ihraçları yürüyüşü **kalça track'ine**
yazar: ölçüldü, `buyucu.glb` kalçası 2,38 sn'lik klipte **~108 dünya birimi**
(1,3 gövde boyu) ileri kayıyor ve klip başa sarınca aniden geri sıçrıyor.
Düşmanın dünya konumu her zaman oyun mantığından gelir, instanced gölge de
`e.x/e.y`ye çizilir → figür gölgesinin önünde yürür ve her sarışta ışınlanır.

Kahraman yolunda bu çözülmüştü (`CHARACTER_MODELS[...].stripRoot`, savasci +
gokalev) ama **düşman yolunda hiç uygulanmamıştı**. `_ensureEnemyModels`
artık her düşman klibini `stripRootMotion` ile geçirir ve bu **opt-in
DEĞİLDİR**: yerinde oynanmayan bir düşman klibi yok, yani bayrak
unutulduğunda hata sessizce geri gelir.

Tezgah denetimi (`_bosstest`): klip 48 fazda taranır, gövde kemiğinin
(`Hip`/`Pelvis`/`Spine01`) **klip içi XZ açıklığı** gövde boyunun %10'unu
geçmemeli — ölçülen 0,3 birim (sınır 8,2). Ölçüt holder'a MUTLAK uzaklık
değildir: bir kemiğin bind konumu rig merkezinden sabit miktarda kayık
olabilir (ağ sınır kutusu merkezine göre ortalanıyor, kalçaya göre değil) ve
sabit kayıklık ne gölge ayrışması ne ışınlanma üretir — belirtiyi üreten şey
kemiğin klip boyunca YOL ALMASIDIR. İlk sürüm mutlak uzaklığı ölçtü ve
doğru koda kırmızı yaktı (12,2 birim sabit kayıklık).

### POZ RIG'İ HAVAYA KALDIRMAZ — KEMİĞE YAZILIR (`_poseCaster`)
İlk sürüm atış pozunu `rig.rotation.x` + `rig.position.y += 4` ile
uyguluyordu ve büyücü her atışta **ZIPLIYORDU**. Gövdeyi tümden döndürmek
ya da kaldırmak asla poz değildir; poz eklemlerde yaşar. Şimdi üç kemik
sürülür (`R_Upperarm` · `R_Forearm` · `Spine01` + `Head`), dikey hareket
SIFIR, gövdeye yalnız 0,05 rad geri tepme yatışı kalır.

- **Delta, mutlak değerin üstüne çarpılır** ve bu yüzden `_poseCaster`
  `mixer.update()` ile AYNI blokta çağrılır. LOD karesinde mixer yazmaz;
  poz ayrı çağrılsaydı delta ikinci kez çarpılıp kol tur atarak sürüklenirdi.
- **Delta YALNIZ klibin GERÇEKTEN sürdüğü kemikte güvenlidir ve bu ÖLÇÜLÜR.**
  Bu modelde klipte `Head.quaternion` track'i VAR ama mixer o bağlamayı
  uygulamıyor (poz kapalıyken baş kuaterniyonu saniyelerce birebir sabit) —
  yani track adına bakan test yanlış pozitif verir ve delta üst üste binip
  kafayı tur attırır, ağı dağıtır. Yükleyici klibi iki ayrı ana kurup
  (`t=0` ve `t=süre/2`, `mixer.update(0)`) kemik değerini karşılaştırır;
  değişmiyorsa bind quaternion'u saklanır ve her karede MUTLAK yazılır
  (`bones.<k>Drv` / `<k>Q0`). Ölçüm: arm/fore/spine delta, **head mutlak**.
  Projenin kendi kuralı: ad hiçbir şey söylemez, ölçüm söyler.
- **Sürüklenme denetimi görsel döngünün AYNISI olmalı.** İlk sürüm
  `_driveModelGroup`i arka arkaya çağırıyordu; LOD atlamaları birikimi
  taklit etmediği için sahnede kafa tur atarken denetim yeşil veriyordu.
  Şimdi `{mixer.update(dt); _poseCaster()}` 600 kare sürülür ve ölçüt
  "nötr poz klibi bozmuyor" (< 0,02 rad) — kemiği 600 kare öncesiyle
  karşılaştırmak yanlıştır, sürülen kemik zaten yürüyor.
- Klip yokluğunun iki açığı da burada kapanır: atış (kırbaç zamanlaması —
  kol `f²` ile ani savrulur, yavaş geri gelir) ve **duruş** (nefes + ağırlık
  aktarma, genlik 0,03 rad; daha büyüğü sarhoş okunur).
- `castAxis` rig'e göre değişir ve **tahmin edilemez** — `_bosstest`in
  donmuş atış pozu slotunda gözle seçilir (`propAlign`daki `flip` mantığı).
- Kemik adları bulunamazsa poz sessizce atlanır: model değişirse çökmez.

### DÜŞMAN MERMİSİ KÜRE DEĞİL YALIMDIR
"Yeşil küçük top" 5 birimlik düz küreydi. Artık oyuncunun kor topuyla
**aynı `addFire` yolundan** geçer (kuyruklu alev: sıcak çekirdek + hale +
üç savrulan yalım + saçak); yeni mesh/doku YOK, kimlik yalnız `FIRE_PAL`
paletinden gelir — büyücü **nekro yeşili**, boss **hasat kızılı**.
Görsel ölçek ×1,45, çarpışma yarıçapı (`b.r`) DEĞİŞMEDİ.

`hue` alanı `pBullets`taki dersle aynı sebepten **obtain'de sıfırlanır**:
geri dönüşen bir mermi eski sahibinin rengini taşırsa büyücünün asasından
boss güllesi çıkar. Yeşil seçimi zemin ölçümünden: mezarlık paleti kızıl-
turuncu ailesinde (ort. parlaklık 35, doygunluk 0,24), yeşil orada en çok
ayrışan renktir.

Atışın iki ucu da ortak isabet katmanından işaretlenir: **asa ucunda**
kademe 0 flaş (gövdenin 20 birim önünde — mermi de oradan doğar, yoksa
paralaks olur) ve **oyuncuya çarpınca** kademe 1, merminin kendi renginde,
yani hangi düşmanın vurduğu ekrandan okunur. Asa flaşı kademe 1 DEĞİL:
2,5 sn'de bir tekrarlanan olay kritik sayılmaz (imza/sarsıntı politikası).

### Menzilli düşmanda atış pozu (`def.cast`)Büyücünün dosyasında TEK klip var (`NlaTrack`, 2,38 sn) ve tezgah onu
**yürüyüş** olarak teşhis etti (ayak genliği gövdenin %12,3'ü, kalça
salınımı 1,8 — duruş klibinde bu değer ~0 olurdu; ad hiçbir şey söylemez,
ölçüm söyler). Atışın kendi klibi olmadığı için poz prosedüreldir: gövde
`sin(πa)` eğrisiyle geriye yaslanır + 4 birim yükselir, sıçramasız girer
ve çıkar. Poz **rig'in üstünden** çarpar, mixer'a hiç dokunmaz.

### Tezgah: `game/_bosstest.html`
Dört slot × iki sıra (önden + yandan; **süzülme boşluğuna önden bakılarak
karar verilemez**), ardından **17 entegrasyon denetimi** gerçek
`Renderer3D` yolu üzerinde (`Object.create` + yalnız gereken alt sistem,
`_firetest` deseni): gölge yuvası, bar tepesi, ışıma ayrımı, FrontSide,
lift, grup adetleri, share toplamı, atış pozu.

İki tuzak (ikisine de düşüldü):
- **Ölçeklenmiş sahnenin klonu ikinci kez ölçeklenir.** `place()` kaynağı
  ölçekler; klon ondan alınırsa yeni ölçek 150/150 = 1 olur ve figür
  1 birime düşer (iskeletsiz modelde görünmez oldu). İskeletli modelde
  daha sinsi: klon ORİJİNALİN kemiklerine bağlı kalıp doğru boyda
  görünür, yani hata gizlenir. Kopya pristin kaynaktan alınır,
  iskeletlide `skeletonClone` ile.
- **`_driveModelGroup` renderer'ın KENDİ `this.game`'ini okur** (inView /
  cam / player), `_driveBoss` ise parametreyi. Tezgahta ikisi ayrı
  nesneyse tezgah oyunda olmayan bir hata "bulur".

---

## KAHRAMAN KADROSU (2026-07-29 revizyonu)

Kadro İKİ kahramana indirildi; `CHARACTERS` içinde yalnız bunlar var:

| id | ad | nadirlik | imza silahı | model |
|---|---|---|---|---|
| okcu | AY OKÇUSU | 2 · nadir | yay (Ay Yayı) | `assets/okcu/okcu_walk.glb` |
| seher | SEHER | 3 · destan | kilic (Seher Kılıcı) | `assets/seher/seher.glb` + `heroModel.js` |

Silinen kahramanların (kurt/hasatci/gulyabani/yigit/kolcu/kasap/cellat/
barutcu/azrail/cadi/tilki) varlıkları da silindi. `drawHunter` içindeki
çizim dalları BİLEREK bırakıldı (ölü ama zararsız; o fonksiyonu budamak
kalan iki kahramanı da riske atar). Sahipsiz kalan imza silahları
(`ok/kure/bicak/sacma/kor/yildirim/tabanca`) **nötre** çevrildi — aksi
halde hiçbir koşuda kart havuzuna girmezlerdi.

### heroModel.js — iskeletli model sadeleştirme
Tripo/Meshy kahraman ihraçları ham hâlde oyuna GİRMEZ (Seher: 390k üçgen,
41 kemik, 2048² doku, Draco). `loadDecimatedHero()`:
1. deri koruyan iki kademeli köşe kümeleme → ~20k üçgen
   (kademe 1 konum: hücre + **baskın kemik** · kademe 2 öznitelik: + UV kovası;
   tek kademede UV'yi konuma katmak modelde siyah çatlaklar üretiyordu),
2. kök hareketini söker (klip karakteri ileri taşıyorsa model oyuncunun
   altından kayar),
3. sadeleşmiş geometri + kemik ağacı + bind matrisleri + klipleri
   IndexedDB'ye yazar → ikinci açılışta ağ ve Draco YOK,
4. ham veri GPU'ya hiç yüklenmez.

`FORMAT` sabitini sadeleştirme parametreleri değişince ARTIR (önbellek
geçersizleşir). Yeni ağır kahraman eklerken `CHARACTER_MODELS[id].decimate`
kaydı aç — kayıt yoksa model ham yüklenir.

**Not:** `mesh.computeBoundingBox()` bind'den sonra bir kez çağrılır;
çağrılmazsa `Box3.setFromObject` ham geometri kutusunu döndürür ve
karakter havada yüzer.

### Seher'in süzülen kılıcı
`assets/seher/kilic.glb` (20k üçgen). Kılıç elde değil: `render3d`
`_buildSword`/`_updateSword` içinde prosedürel. `weapons.swingKind`
dört koreografi seçer: `normal` · `spin` (girdap, 360°) · `twin` (ikiz) ·
`echo` (kılıç yerinde, menekşe hayalet iz). Kart sayaçları
`WEAPONS.kilic` içinde tanımlıdır (`spin/twin/wave/echo/critAdd`) —
`applySpecial` yalnızca ZATEN SAYI olan alanlara ekleme yapar, alan
tanımlı değilse kart sessizce hiçbir şey yapmaz.

Kartlar: `SIGNATURES.seher` (6 temel + 5 seviye kilitli). `seher: true`
bayrağı kartı premium çerçeveyle çizer (`style.css` → `.lv-card.seher`).

- Yeni dosya eklerken import query string sürümünü (`?v=…`) güncelle.
- Büyük revizyonlarda dosyayı kopyala, kopyayı düzenle (eski sürüm kalsın).

---

## KADRO GENİŞLEMESİ (2026-08-04) — KARA KAPTAN + GECE KRALİÇESİ

| id | ad | nadirlik | imza silahı | model |
|---|---|---|---|---|
| korsan | KARA KAPTAN | 4 · efsane | topatar (Kaptan Topu) | `assets/korsan/korsan.glb` |
| kralice | GECE KRALİÇESİ | 3 · destan | tackilic (Taç Kılıcı) | `assets/kralice/kralice.glb` |

Bu ikisiyle birlikte üç altyapı parçası eklendi; yeni kahraman eklerken
ÜÇÜNÜ de bil:

### 1. `heroModel.js` — ÇOK PARÇALI iskeletli kahraman
Tripo bazı modelleri tek ağ değil, her biri kendi materyal/dokusunu taşıyan
ONLARCA iskeletli ağ olarak verir (KRALİÇE: **13 parça**, 785k üçgen, 13 doku).
Eski yükleyici yalnız İLK ağı alıyordu — o modelde karakterin sadece bir
parçası görünürdü. Artık:
- tüm `isSkinnedMesh` düğümleri toplanır, `parts[]` olarak önbelleklenir,
- üçgen bütçesi parçanın KAYNAK ORANINA göre bölünür (taban 400),
- her parçanın `skinIndex` değerleri ORTAK kemik sırasına çevrilir (parçaların
  kendi Skeleton nesneleri farklı sırada olabilir; çevirmezsen kol başın
  kemiğine bağlanır),
- tüm parçalar TEK iskelete bağlanır (kemik dokusu bir kez yüklenir).

Maliyeti çizim çağrısıdır: 13 parça = 13 draw call. **`skeletonClone` TEK
İSKELETİ BOZAR** — SkeletonUtils klonu her SkinnedMesh için ayrı bir Skeleton
kurar, yani kare başına 1 yerine 13 kemik dokusu bağlanır. `render3d.
_loadCharacterModel` klondan sonra tüm parçaları ilk parçanın iskeletine
YENİDEN BAĞLAR (kemik ağacı klonda zaten ortak, skinIndex sırası da ortak —
bkz. yukarıdaki çeviri adımı). Doğrulaması: sahnedeki benzersiz `skeleton`
nesnesi sayısı 1 olmalı. Tek ağlı kahramanlarda no-op.

Ölçülen (51 düşmanlı kalabalık, Kraliçe + Üçlü Kesik + Gök Kılıcı):
**90 çizim çağrısı / 171k üçgen tepe**. Yeni çok parçalı kahraman eklenirse
bu pay yeniden ölçülmeli.

`fitCluster()`: hedef üçgene √(hedef/20) tahminiyle başlar, sonuç 0.8×–1.6×
bandının dışındaysa ızgarayı büyütüp küçülterek ≤5 denemede yakınsar. Eski
sabit liste (34→118) çok parçalı modelde her parçanın payını kat kat aşıyordu
(30k hedeflenen model 88k çıkıyordu). **`FORMAT`'ı sadeleştirme parametreleri
değişince ARTIR** (şu an 11).

### 2. `propAlign.js` — süzülen silah hizalayıcı
Prop ihraçları eksene hizalı GELMEZ: taç kılıcı model uzayında ÇAPRAZ durur
(birincil eksen 0.02, 0.55, −0.83). Sınır kutusunun en uzun kenarını seçen eski
yöntem böyle bir modelde yanlış eksen bulur ve bıçak savuruşta yana yatar.
`alignLongAxisToX()` köşe bulutunun birincil eksenini (PCA + power iteration)
+X'e döndürür, hedef uzunluğa ölçekler, orijine ortalar.

Eksenin İŞARETİ anlamsızdır (power iteration'ın başlangıç vektörüne bağlı) —
iş ucunu `flip` ile AÇIKÇA söylersin ve **görsel olarak doğrularsın**
(`_weapontest.html` iki modeli kırmızı=+X / mavi=−X küreleriyle çizer).
Ölçülen değerler: `kilic` flip:false · `tackilic` flip:true · `topatar` flip:true.

**Süzülen silahın nişanı KENDİ konumundan ölçülür**, oyuncu merkezinden değil:
mermi silahtan çıkıyorsa (yay, top) namlu/kiriş oyuncu→hedef doğrultusunu
gösterirken mermi silah→hedef doğrultusunda uçar ve arada PARALAKS açısı
kalır (top gövdeden 105 birim uzakta süzülüyor; 220 birimlik hedefte ~11°
ölçüldü, düşman yaklaştıkça büyüyor). `_updateBow`, `_updateCannon` ve
(2026-08-04 revizyonundan sonra) `_updateFlame` doğru örnektir — mavi alevin
namlusu artık gövdesi değil hedefe bakan UCU (bkz. "MAVİ ALEV / ŞİMŞEK
EFEKT REVİZYONU").

### 3. Tek kılıç rigi, iki palet (`SWORD_SPECS`)
Seher ile Gece Kraliçesi AYNI rigi paylaşır (`_buildSword`/`_updateSword`):
yay-sönüm süzülme, savuruş koreografisi, iz, hale, yankı, şok dalgası, hilal
kesikler. Fark yalnız model + renk dilidir. Rig KARAKTER YÜKLENİRKEN kurulur
(`loadCharacter` → `_disposeSword` + `_buildSword(spec)`); kılıcı olmayan
kahramanda hiç kurulmaz. **`_disposeSword` dokuları BİLEREK bırakır** —
iz/hale dokuları tüm efektlerde paylaşılır.

### `lift` — koyu Tripo dokusunu okunur yapma
Kaptan'ın yeşil-siyah ceketi ve Kraliçenin mor zırhı karanlık mezarlıkta
silueti okunmuyordu. Çözüm YENİ IŞIK DEĞİL (yasak): dokunun kendisi
`emissiveMap` olur, yani her piksel KENDİ rengini az miktarda yayar
(`CHARACTER_MODELS[id].lift` — Kaptan 0.80, Kraliçe 0.62). Düz emissive rengi
siyahları birlikte kaldırıp her şeyi grileştirir; çarpımsal maskede olmaz.

### Yeni oynanış sayaçları
`applySpecial` scalarAdd/mulMap tablolarına eklendi:
`splitAdd→split` (gülle parçalanması, `spawnSplit`) · `broadsideAdd→broadside`
(yedi gülleli yan ateş, `updateBroadside`) · `fanAdd→fan` (üçlü/beşli kesik) ·
`judgeAdd→judge` (Gök Kılıcı, `fireJudgement` + `spawnJudgement`) ·
`waveR`/`waveLife` (kesik yarıçapı / uçuş süresi çarpanları).

`pBullets` havuzu kimlik alanlarını (`split/frag/smoke/metal/isPet/fireball`)
ARTIK OBTAIN'DE sıfırlıyor — geri dönüşen bir mermi eski sahibinin bayrağını
taşırsa yay okundan gülle parçaları saçılır.

### `metallic` — ışımayan mermi (ikinci mermi mesh'i)
Ortak mermi materyalinde `emissive: 0x333333` düz katkısı var: kor topu ve
ruh mermisi için doğru (kendi ışığını yayarlar), DÖKÜM DEMİR gülle için
yanlış — düz katkı gölgeyi düzleştirip küreyi plastiğe çevirir. Gülle
`bulletMetalMesh`'e gider (metalness 0.95 · roughness 0.34 · öz-ışık yok);
`WEAPONS.<id>.metallic` bayrağı `b.metal`'i açar. Maliyet tek çizim çağrısı,
yalnız sahnede metal mermi varken. Ölçülen: gövde ort. parlaklık 61, tepe
parlama 255 — karanlık zeminde koyu gövde + keskin metal parıltısı.

### Kart bayrağı iki yerde yaşar (unutulan yer = ölü kart sanatı)
Karaktere özel premium kart çerçevesi ancak bayrak İKİ noktadan da geçerse
görünür: `config.js → SIGNATURES[<id>]` kaydındaki `korsan:true` ve
`weapons.js → rollChoices()` içindeki teklif nesnesi (`korsan: !!sp.korsan`).
İkincisi atlanırsa kart sessizce jenerik turuncu `myth` çerçevesine düşer ve
`style.css`'e yazılan ~180 satırlık kart sanatı hiç çalışmaz. Yeni kahraman
eklerken her iki satırı da güncelle; doğrulaması `rollChoices` çıktısında
bayrağı okumaktır.

### Denge notu — neden Kraliçe'nin taban hasarı düşük
`tackilic.wave` TABANDA 1'dir: her savuruş bir kesik fırlatır ve yakındaki
düşman hem yaydan hem kesikten vurulur. Kesik katsayısı **0.60** (eskiden
0.85), yani ×1,60 — tabandır, kart gerektirmez.

## AYAZ — NADİR ŞÖVALYE (2026-08-10)

| id | ad | nadirlik | imza silahı | model |
|---|---|---|---|---|
| sovalye | AYAZ | 2 · nadir | yemin (Yemin Kılıcı) | `assets/sovalye/sovalye.glb` + `yeminkilic.glb` |

Kadronun ilk NADİR yakın dövüşçüsü. Ok Okçusu (nadir, kırılgan-hızlı, can
−10) ile KASITLI zıt kutup: dayanıklı-ağır (can +12, zırh +1).

### Kimlik: taban sayaç
Süzülen kılıç rigini (`_buildSword`/`_updateSword`) Seher ve Kraliçe ile
paylaşır; ayrı motor YOK. Üçü TABAN SAYACIYLA ayrışır:

| kahraman | taban | ne öğretir |
|---|---|---|
| Seher | — | saf savuruş |
| Gece Kraliçesi | `wave: 1` | menzil — kesik ileri fırlar |
| **Ayaz** | **`shock: 1`** | temas — darbe noktası çatlar |

Taban sayaç kart gerektirmez, ilk koşuda görünür. `echo` (Seher) ve
`fan`/`judge` (Kraliçe) BİLEREK tanımlı değil — alan yoksa `applySpecial`
sessizce dokunmaz.

### signaturePower TABLOSU İNDİSİ NADİRLİKTİR
`[1, 1, 1.12, 1.25, 1.45]` → adi ×1,00 · **nadir ×1,12** · destan ×1,25 ·
efsane ×1,45. İlk sürümde ×1,00 sanılmıştı ve `yemin` 17 tabanla yazıldı;
koşuda 21,6 dps çıkıp destan kılıcın (%97) neredeyse eşiti oluyordu —
üstelik BEDAVA alan hasarıyla. Taban 16'ya indi.

L1 tek hedef dps (imza çarpanı + kahraman modu dahil):
pala (adi) **19,3** · **YEMİN (nadir) 21,8** · kilic (destan) **24,9** —
aralıklar ~%13, merdiven eşit. Kalabalıkta taban şok onu palanın belirgin
üstüne çıkarır, tek hedefte kasıtlı olarak çıkarmaz.

Geri tepme sınıfın en yükseği (300→450): şövalye hattı tutar. Nadir
kademede hasar vermeden değer üreten araç budur.

### Kartlar
6 temel (adım ~%18 — okçunun %10'u ile destanın %22-25'i arasında) +
5 seviye kilitli (`sig_v7…v11`, minLvl 1/1/2/3/4). Kritik kartı bir kademe
zayıf: 0,12/0,45 (destan 0,15/0,60).

**`sig_v8` ÇİFTE YEMİN SİLİNDİ (2026-08-10).** `twin` Seher'de zaten vardı
ve Gece Kraliçesi'nin yelpazesiyle ekranda neredeyse aynı okunuyordu — üç
kılıç kahramanının ayrışması gerekiyor. Yerine **AYAZ KABUĞU** (`carapace`)
geldi: kadronun **tek TEPKİSEL** mekaniği. Oyuncu hasar aldığında çevresinde
ayaz patlar (alan hasarı + geri tepme ×1,5, r 96+16·kademe, bekleme
6,4−0,9·kademe sn, en az 3,4). Saldırı temposuyla ilgisi yoktur.

Kademe HASARI değil YARIÇAPI ve beklemeyi iyileştirir: amaç kalabalıkta
nefes açmak, dps eklemek değil — nadir kademede dengeyi bozmadan
"dayanmak" ödüllendirilir. Tetikleyici hasar yolunu HİÇ değiştirmez;
`updateSword` her karede oyuncunun canını izler (tek sayı karşılaştırması,
tahsis yok) ve kaynağı ne olursa olsun düşüşü yakalar. `g.explode`
KULLANILMAZ (turuncu köz + sarsıntı = Ayaz'ın dili değil); iki farklı hızda
buz halkası çizer. `twin` alanı `WEAPONS.yemin`'den de kaldırıldı, yani
tanımsız — `applySpecial` ona sessizce dokunmaz. `sovalye` bayrağı İKİ yerde yaşar —
`SIGNATURES` kaydı ve `weapons.rollChoices` teklif nesnesi; biri atlanırsa
kart jenerik turuncu myth çerçevesine düşer.

Kart sanatı `.lv-card.sovalye` (style.css): kadronun tek DÜŞEN zerre kümesi
(kırağı) ve en yavaş hareketleri (5-7 sn). Seher'in korları ve Kraliçenin
taç zerreleri YÜKSELİR — yön farkı kartı okumadan kahramanı söyler.
Glifler `SOVALYE_GLYPHS`: dili düz hat + kırık buz (bir yemin köşelidir),
Kraliçenin hilalleriyle ve Seher'in sarmallarıyla karışmaz.

### Model notları
- 140k üçgen, TEK ağ, 41 kemik, 'NlaTrack' — Kraliçe'nin 13 parçalı
  ihracının aksine basit yoldan geçer, **tek çizim çağrısı**.
  `targetTris 26000` → ölçülen 36,3k (fitCluster bandı içinde), sahnede
  hero+kılıç 49k üçgen / 6 çizim çağrısı.
- `lift` YOK ve olmamalı: baseColor ortalama parlaklık **107**, koyu piksel
  %24 — kadronun EN parlağı (Seher 98/%42, Kraliçe 86/%55, Kaptan 51/%71).
  emissiveMap eklemek gümüş plakayı grileştirirdi.
- Kılıç `flip: true` (`_weapontest.html` ile görsel olarak ölçüldü),
  len 75. Palet buz: Kraliçe MOR'a kaçan gece mavisi, Ayaz doygunluğu düşük
  CAM GÖĞÜ + beyaz çekirdek.

## KAHRAMAN BOYU: `height` BİR HEDEF BOY DEĞİL, HAM ÖLÇEKTİR

`_loadCharacterModel` boyu `scale = height / Math.max(1, size.y)` ile
uydurur. İskeletli ihraçlarda `Box3.setFromObject` DÜĞÜM kutusunu ölçer
(köşeleri kemikler taşır), gelen değer ~1 birimdir ve `max(1, …)` bölmeyi
tamamen yutar. Yani pratikte **scale === height** ve tablo, modellerin
kendi iç ölçeğine bağlı olarak yalan söyler.

Okçu tam bu yüzden kadronun ~%60 üstünde duruyordu: ağı bir Armature
düğümünün (yerel ölçek 0.01) altında ve `height: 60` ham çarpan olarak
uygulanıyordu. Ölçülen iskelet açıklığı: **okçu 100,6** · Seher 58,8 ·
Kraliçe 63,3 · Savaşçı 63,7 · Şimşek 64,1 · Gökalev 59,1. `height` 60 → **37**
(60 × 61,8/100,6) ile 62,0'a indi.

**Yeni kahraman eklerken boyu TABLODAN OKUMA, ÖLÇ.** Tek güvenilir ölçü
iskelet açıklığıdır (köşeler değil): hedef bant **~59-64**.
Aracı **`game/_herotest.html`** — kahramanları yan yana aynı ölçekte çizer,
76 birimlik kırmızı referans çizgisi koyar, açıklığı yazar ve süzülen imza
kılıcını gövdenin yanında gösterir. `_firetest` (efektler) / `_weapontest`
(silah ekseni) / `_eggtest` (yumurta) ile aynı amaca hizmet eder.

Diğer kahramanların değerlerine DOKUNMA: onlarda da bölme kırpılıyor ama
hepsi ~0,98 birimlik Tripo ağı olduğu için 76 zaten çalışan ham ölçektir.

## YUMURTA EKONOMİSİ (2026-08-10) — ENVANTER KALDIRILDI

Kazanılan yumurta artık **doğrudan boş bir kuluçka yuvasına oturur**
(`pets._seat`) ve saati o an başlar. Yuva yoksa yumurta **hiç kazanılmaz**.

### Neden envanter gitti
"Elinde 3 yumurta var ama hiçbiri ısınmıyor" ölü bir kaynak yığınıydı:
oyuncu kuluçkayı ziyaret etmeyi unutuyor, sonra dördünü aynı anda koyup
dört gün hiçbir şey yapmıyordu. Yuva sayısı artık gerçek bir **darboğaz** —
dolu yuva yumurta musluğunu KAPATIR, yani çatlatmak ve 4. yuvayı açmak
anlamlı hale gelir.

### API sözleşmesi
| çağrı | döner | not |
|---|---|---|
| `addEgg(id, n)` | oturan son yuva indisi · **−1 = yer yok** | envantere yazmaz |
| `canBuyEgg(id)` | `'ok'` · `'full'` · `'funds'` | **para harcamadan önce** sorulur |
| `buyEgg(id)` | oturduğu yuva indisi · −1 | doğrudan oturur, bekleme yok |
| `freeNestCount()` / `hasNestSpace()` | — | musluk açık mı |

`data.eggs` alanı **yalnız eski kayıtlar** için duruyor; `_drainLegacy`
ilk `data` erişiminde onları yuvalara boşaltır (tek seferlik, `_drained`).
Yer yetmezse fazlası envanterde bekler ve petUI'daki "BEKLEYEN" şeridinden
konur — o yol (`_quickIncubate`) bu yüzden KORUNDU. Normal oyunda şerit
her zaman boştur (`:empty` → `display:none`).

### Görev sonu zarı: şans BİLEREK düşük
Eskiden normal görevde %28+dünya ve **boss'ta garanti**ydi; kuluçka 4-16
saat sürdüğü ve yalnız 3-4 yuva olduğu için musluk talebi kat kat aşıyordu.
Yeni oranlar (`main.rollEggDrop`, ölçüldü):

| | normal | boss |
|---|---|---|
| Dünya 1 | **%10,4** | %23,3 |
| Dünya 6 | **%14,7** | %31,3 |

Boss artık garanti DEĞİL — garanti düşüş, düşüşü olay olmaktan çıkarıyordu.
Nadirlik payı D6'da: sıradan %24,9 · nadir %49,9 · epik %19,9 ·
**efsanevi %5,3** → görev başına ~%0,8. Oyuncu onu gördüğünde gerçekten
bir şey olmuş olur.

### Dolu yuva = sandıkla AYNI dil
Görev sonunda yumurta düşer ama yer yoksa **yanar** ve ekran bunu söyler
(`eggFull` → "YUMURTA YANDI / YUVA YOK"), tıpkı `chestFull`'un "ganimet
yandı — ana ekranda yer aç" dediği gibi. Aynı ders iki kez öğretilmez.

Pazarda musluk kapalıysa uyarı kartların **ÖNÜNDE** durur (`.eo-gate`),
tüm butonlar `.off`, kartlar `.shut` ile sönük ama okunur (fiyat ve
ihtimal tablosu hâlâ bilgi taşır). Tıklama parayı harcamadan reddeder ve
dikkati rıhtıma çeker (`.nudge`). Rıhtım sayacı `×N BOŞ` / `DOLU` der.

Satın alınan yumurta pazar kartından yuvaya **UÇAR** (`_flyEgg`, uçuş
sürerken hedef yuva `_flyHide` ile çizilmez) — mağazadan alınan sandığın
anında açılmasıyla aynı sözleşme: satın alınan şey satın alındığı AN
çalışmaya başlar.

## OYUN HİSSİ REVİZYONU (2026-08-10)

### HIT-STOP TAMAMEN KALDIRILDI
`FX.hitStopMs / critStopMs / bossHitStopMs` üçü de **0** ve
`main.hitStop()` artık **no-op**. Dünyayı birkaç kare dondurmak konsolda
"vuruş hissi" verir; dokunmatik mobil oyunda oyuncu bunu **kare kaybı**
olarak okur — kullanıcının teşhisi tam olarak "efektte oyun anlık
takılıyor". Üstelik kayıp gerçektir: donan karede simülasyon ilerlemez
ama girdi birikir, yani kontrol de gecikir.

Çağrı yerleri (boss uyanışı, patlama, kritik — 12 dosya) **bilerek
bırakıldı**: imza korunduğu için hepsi zararsız no-op'a düşer, silmek
kazançsız bir dokunuş dalgası olurdu. Vuruşun geri bildirimi artık yalnız
hasar yazısı + parçacık + sestir (sarsıntı politikasıyla aynı mantık).

**Karıştırma:** `main.js:1549`'daki `freeze = 2.3` hit-stop DEĞİLDİR —
bulut perdesi açılırken simülasyonu tutar ki oyuncu perde arkasında hasar
yemesin. O kalır.

### MENZİL KAPISI — boşa saldırı yok
Yakın dövüş (`updateSword`) eskiden KOŞULSUZ savuruyordu: sahada tek
düşman yokken de kahraman durup dururken kılıç sallıyor, her savuruşta
girdap/kesik/şok efektlerini bedavaya tetikleyip sahneyi kirletiyordu.
Menzilli silahlar (`updateGun`) ise yalnız "düşman VAR MI" diye bakıyor,
NEREDE olduğuna bakmıyordu — sahanın öbür ucundaki tek düşman için havaya
ateş ediliyordu.

Artık ikisi de kapıdan geçer:
- yakın dövüş: `W.range[L] + 34` (pay = düşman yarıçapı + o karedeki
  yaklaşma; kaldırırsan savuruş sınırda bir kare geç kalır)
- menzilli: `(W.range?.[L] ?? 640) + 40`

**Bekleme süresi TÜKETİLMEZ** — kapı kapalıysa 0,1/0,14 sn sonra yeniden
bakılır, yani düşman menzile girdiği an vuruş hazırdır ve kapıda beklerken
güç de birikmez. Aynı desen `updateSimsek`'te zaten vardı.

Ölçüldü: düşman 335 px'te, yemin erişimi 154 → 2,6 sn boyunca **0
savuruş**. Yeni bir silah sınıfı eklerken bu kapıyı da ekle.

### AÇILIŞ: İLERLEME ÇUBUĞU YOK, TÜYOLAR GERÇEK
Çubuk ve yüzde silindi (`#splash-bar`, `#splash-fill`, `#splash-pct` ve
onları süren `step()` aritmetiği). Oyuncu çubuğa bakarak beklemeyi ÖLÇER,
yani bekleyiş uzar. **Bekleme süresi (en az 5 sn) ve ısıtma kapısı aynen
duruyor** — kapanış hâlâ `Warmup.run()`'ın bitmesini bekler; sadece
görünmez oldu.

Tüyolar atmosfer cümlelerinden ("Kızıl ay yükseliyor…") **oyunun gerçek
kurallarına** çevrildi ve her satırın kaynağı yorumda yazılı
(`signaturePower`, `WEAPONS.yemin.shock`, `tackilic.wave`, menzil kapısı,
çevrimdışı kuluçka…). Beklerken okunacak tek yazı odur; bir mekanik
değişirse o listeyi de güncelle.

### AÇILIŞ EKRANINDA vw/vh YASAK — KAPSAYICI BİRİMİ KULLAN
Açılış kilidi dar kabukta kırpılıyordu ("ARANLI / HASAT", taç tamamen
ekran dışında; `#splash` `overflow:hidden` olduğu için sessizce kesiliyor).
Sebep `clamp(30px, 11vw, 54px)` gibi kurallardı: **vw viewport'u ölçer,
oyun kabuğunu değil.** 380px'lik bir pencerede 279px'lik kabuğun içinde
11vw = 42px ve başlık 440px'e açılıyordu.

Çözüm `#splash` üzerinde `container-type: inline-size` + tüm ölçülerin
`cqw`/yüzde ile verilmesi (başlık, alt başlık, taç boyu ve tepe ofseti,
dikey dolgu, kadro tuvalinin görüntülenen genişliği). Kadro tuvali de aynı
hatanın kurbanıydı: `width: min(96vw, 480px)` 279px'lik kabukta 480px'e
açılıp oyuncuya kadronun yalnız ortasını gösteriyordu → `min(100% - 24px,
480px)`.

**Taç ofsetle değil ÇAPAyla konumlanır.** İki kez yanlış kuruldu: `right:
-6px` dar kabukta 90px ekran dışına taşıyordu, sonra `right:0` + `top:
max(-22px,-4cqw)` tacı kilidin içine çekip son "K"nin üzerine oturttu
(taç 30,6px, başlık 22,3px — süs, adını verdiği kelimeden uzundu).
Doğrusu `bottom: 100%`: tacın ALT kenarı kilidin ÜST kenarına yapışır,
yani taç ne kadar büyürse büyüsün yazıyla ÖRTÜŞEMEZ. `top` YAZILMAZ —
ikisi birlikte verilirse top kazanır ve çapa bozulur. Boy başlık
puntosunun ~0,6 katıdır (`clamp(15px, 5.6cqw, 34px)`).

**Kadro tuvali AKIŞTA durur, absolute DEĞİL.** `position:absolute;
bottom:92px` iken akışta hiç yer ayırmıyordu; tüyo ise `margin-top:auto`
ile akıştaydı. Tek satırlık atmosfer cümleleri 92px'in altında kalıyordu,
ama gerçek kurallara çevrilen tüyolar 2-3 satıra sarılıp YUKARI büyüdü ve
daha yüksek z-index'iyle yazı kadronun üstüne basıldı (279px kabukta 22px
çakışma ölçüldü). Doğrusu SIRA: tuval DOM'da tüyodan ÖNCE ve
`margin: auto auto 0` ile akışta — tüyo ne kadar uzarsa uzasın tuvali
YUKARI İTER, çakışma matematiksel olarak imkânsız. `margin-top:auto`
tüyodan tuvale taşındı; aradaki 10px `margin-top` ile verilir.

### Açılış ekranı doğrulama ölçütü (ÜÇÜ birlikte)
1. **taşma yok** — `#splash.scrollWidth === clientWidth`
2. **sınır içindelik** — başlık · alt başlık · taç · kadro · tüyo hepsi
   kabuk dikdörtgeninin içinde
3. **tüyo ile kadro tuvali ÇAKIŞMAMALI** — ve bu, listedeki EN UZUN tüyo
   ile ölçülür (varsayılan markup metniyle değil; o tek satırlıktır ve
   sorunu gizler). Genel kural: `#splash` `overflow:hidden` olduğu için
   hiçbir hata gürültü çıkarmaz — öğe-öğe çakışmayı elle sormak gerekir.

İlk iki ölçüt tek başına bu hatayı GEÇİRDİ; üçüncüsü o yüzden var.

Ölçülen (279×540 kabuk, 11 tüyonun tamamı): taşma yok · beş öğe sınır
içinde · taç 52,4–69,9 ve başlık 72,1 → çakışma yok · tüyo-kadro boşluğu
her uzunlukta tam **10px** (3 satırlık tüyoda tuval dibi 424, tüyo tepesi
434; 2 satırlıkta 444 / 454 — tuval yukarı kayıyor).

Yeni bir öğe eklerken vw/vh yazma; kabuk ölçeklenmiş bir çerçevenin
içinde yaşıyor. `.splash-tip`'in `max-width`i de bu yüzden
`min(100% - 8px, 420px)` (eskiden `86vw`).

### ARENA BÜYÜDÜ: PLAY 1500 → 1900
1500'de oyuncu hızıyla bir kenardan diğerine ~4 sn'de geçiliyordu: kaçma
alanı yoktu ve menzilli kahramanlar avantajını hiç kullanamıyordu. Alan
**+%60** (2,25M → 3,61M px²). Tüm dünyalar aynı sabitten türer; kamera
kısıtı, spawn kırpması, oyuncu/düşman duvarları hepsi `game.arena`'dan
okuduğu için tek satır yeter.

VRAM: pişen doku `(PLAY + 2·BORDER)·RES` = 2120·1,15 ≈ **2438² RGBA ≈
23,8 MB** (öncesi 15,6 MB) — ~350 MB WebView tavanının çok altında.
Daha büyütülecekse önce `RES` düşürülmeli.

## DENGE REVİZYONU (2026-08-04)

### Ekran sarsıntısı politikası — rutin olay ASLA sarsmaz
Eski değerler baş döndürüyordu: `shakeHit 0.07` her vuruşta travma
ekliyordu ve saniyede 5-10 vuruşta travma hiç sıfıra dönmüyordu — kamera
sürekli titriyordu. Yeni kural:

| olay sınıfı | travma |
|---|---|
| normal vuruş, her savuruş, her atış, kart alımı | **0** |
| kritik | 0.09 |
| nadir imza (girdap, gök kılıcı, bordo, fırtına, patlama) | 0.12-0.16 |
| oyuncu hasar aldı | 0.26 |
| boss uyandı / öldü | 0.40-0.45 |

`maxShakePx` 16 → **7**, `shakeDecay` 2.6 → **3.6**. travma² eğrisiyle
birlikte ölçüldü: tepe ofset **1,4 px** (eskiden 16'ya kadar). Yeni bir efekt
eklerken `addShake` ÇAĞIRMA — vuruşun geri bildirimi hasar yazısı, parçacık
ve sestir; kamera değil. Yalnız SANİYEDE BİRDEN AZ olan olaylar sarsabilir.

### Kraliçe nerf'i (destan, EFSANE'yi geçiyordu)
L1 yakın mesafe DPS'i 28 çıkıyordu; efsane Seher Kılıcı 17,8. İndirilenler:
hasar `[13,18,24,32,43]` → `[11,15,20,27,35]` · bekleme +%9 · kesik katsayısı
0.85 → 0.60 · yelpaze yan kesikleri 0.70 → 0.52 · Gök Kılıcı çarpanı
(2.0+0.3/kademe) → (1.5+0.25/kademe) · mods dmgPct 0.10→0.06, atkPct
0.08→0.05, crit 0.03→0.02. Sonuç: yakında Seher'le baş baş, menzilde
belirgin zayıf, kalabalıkta üstün — kimlik korundu.

### Kaptan buff'ı (efsane, aynı kademedeki Alev'in altındaydı)
"Yavaş ama yıkıcı" sayılara yansımamıştı: L1 DPS 22,6 vs Mavi Alev 24, delmesi
da az, mermisi de yavaş — yavaş VE zayıf. Hasar `[26,36,48,63,83]` →
`[32,44,58,75,98]` · delme `[1,1,2,2,3]` → `[1,2,2,3,3]` · bekleme ~%6 kısa ·
mods dmgPct 0.13→0.15, atkPct 0.07→0.08. L1 DPS 27,8 (Alev'in %16 üstü);
farkı yavaş mermi (400 vs 445) ve tabanda takip/yağmur olmaması dengeliyor.

### Saçılan Gülle — İLK İSABETTE bölünür
Bölme `b.pierce < 0` dalındaydı, yani delme hakkı TÜKENDİĞİNDE. L1'de pierce 1
olduğu için güllenin bölünmesi İKİ düşmana isabet gerektiriyordu — tek
düşmana atışta kart hiç çalışmıyor gibi görünüyordu (kart metni de
"isabette" diyor). Artık `applyHit`'in hemen ardından tetiklenir ve
`b.split = 0` ile bir kez çalışır (yoksa her delme zincirleme parça üretir).
Güvenilir tetiklendiği için parça hasarı %40 → **%34**. Ölçüldü: 7 atış →
21 parça (atış başına tam 3), tek düşmanlı sahnede.

## MAVİ ALEV / ŞİMŞEK EFEKT REVİZYONU (2026-08-04)

Ortak dil: **"bloom" = üç boyutta toplayıcı parıltı katmanının toplamıdır.**
Post-processing/UnrealBloom yasak (yukarı bkz.), ama gerçek bloom'un yaptığı
şey zaten budur: dar+parlak çekirdek · orta gövde · geniş sönük hale, HER
BİRİ FARKLI frekansta titrer. Eşit titreşen katmanlar "yanıp sönen ampul",
farklı frekanslı katmanlar "yanan şey" okunur.

Yeni ortak yardımcı: **`_bb(mesh, i, x,y,z, sx,sy, spin, r,g,b)`** — kameraya
bakan tek instanced quad. Toplayıcı karışımda örnek başına materyal opacity'si
YOKTUR, o yüzden alfa rengin kendisine çarpılır (ton + şiddet tek yerden).
Tahsis yok (TMP + modül düzeyinde `AXIS_Z`).

İki yeni doku (açılışta bir kez, beyaz; ton instanceColor'dan gelir):
`_glowTexture()` (dik çekirdek + uzun kuyruklu radyal düşüş) ve
`_flameSpriteTexture()` (tabanı geniş, ucu ince, içinde düzensiz diller olan
DİKEY yalım — küre değil yalım okunur).

### Kor topu KUYRUKLU ATEŞ TOPU (`WEAPONS.alev.fireball`)
Eskiden `addBullet` ile tek örnekli emissive küreydi: hacimsiz, hareketsiz,
"top gibi". İlk revizyon yalımları EKRANDA DİKEY çiziyordu — mermi uçuyor ama
alev yukarı bakıyordu, yani "mum alevi" okunuyordu. Doğrusu ateş sembolünün
silueti: ÖNDE beyaz-sıcak yuvarlak baş + ARKAYA savrulan yırtık yalım kuyruğu
(3 azalan yalım + baştan kopan 2 saçak).

Kuyruğun açısı EKRAN uzayında hesaplanır: kamera yaw'ı sabit olduğu için
`spin = atan2(vx, vz·cos(TILT))` yeter — dikey bileşeni cos(TILT) ile
kısaltmazsan kuyruk ekranda hızın yönünden sapar (dünya açısı ≠ ekran açısı). Türbülans mermi başına
**faz** ile ayrışır (`b.ph`, fireGun'da atanır) — yoksa yan yana iki alev
aynı kareyi gösterir ve kopyala-yapıştır okunur. Uçuş yüksekliği 11 → **44**
(göğüs hizası): eskiden mermi yerde sürünüyordu.

Feda sırası kasıtlı: `Quality.stress > 0.55` olunca ilk kuyruk tutamları
düşer, çekirdek flaşı EN SON — cihaz zorlanınca alev incelir, vuruş hissi
kaybolmaz.

### İsabet (`spawnFlameImpact(x, y, ang)`)
Vuruş hissini veren şey süre değil EĞRİdir: 0,30 sn'lik tek olay =
2 karede tepeye çıkan beyaz çekirdek flaşı + arkasında geniş mavi hale +
geliş yönüne ±110° yelpazede saçılan yalımlar + ömrün ilk %55'inde yaşayan
BASIK şok halkası (dikeyde 0,58× — kabarcık değil disk okunsun). Uzun
sönümlü halka "duman" gibi duruyordu, ilk denemede fazla iriydi (92 → 66).
**Sarsıntı YOK** — vuruş saniyede birden sık bir olaydır (bkz. sarsıntı
politikası).

### İmza alevi: yanan şey, parlayan model değil
`_buildFlameAura(H)` üç parça ekler, hepsi SAHNE düzeyinde (pivot hedefe
döndüğü için kameraya bakan quad'lar onun altında yaşayamaz — yaw ile
eğrilirdi): `flameGlow` (4 örnek: 3 bloom katmanı + namlu flaşı) ·
`flameTongues` (7 yalım, tabandan doğup yükselirken sönen; fazlar KASITLI
düzensiz) · `flameSpill` (zeminde ışık lekesi — gerçek ışık yasak, ışığın
DÜŞTÜĞÜ yeri boyamak bedava).

Bloom ilk denemede modeli yutuyordu (çekirdek H×0.95, beyaza yakın): siluet
karanlık bir lekeye dönüşüyordu. Katmanlar **H×0.80 / 1.70 / 3.10** ve
şiddetleri ~%25 kısıldı — model artık en parlak şey.

**Namlu:** kor topu gövdeden değil, hedefe bakan UÇTAN çıkar. Nokta analitik
hesaplanır (pivot `rotation.y = -aimDir` olduğu için yerel +X nişan
doğrultusudur): `mx = _flX + 18cos(_flYaw)`, `mz = _flZ − 18sin(_flYaw)`.
`W.flamePos` buraya yazılır — `fireGun` atış AÇISINI da aynı noktadan ölçtüğü
için paralaks yoktur. Ateş anında o noktada namlu flaşı yanar; "alev oradan
fırlatılıyor" okumasının anahtarı budur.

### Şimşek kırığı: çatırdayan elektrik
`_buildShardAura()`: `shardGlow` (4 örnek, aynı bloom deseni) + `shardArcs`
(6 yuva, ZATEN VAR OLAN `_boltZigzagTexture` — yeni doku = yeni yükleme) +
zemin lekesi. Titreşim **basamaklı rastgele** (40-90 ms'de bir yeni değer),
sinüs değil: elektrik düzgün nefes almaz.

Her kavis yuvası kendi ömrünü yaşar (50-130 ms) ve ardından **ölü zaman**
gelir — sürekli çizilen kavis "neon tüp" gibi duruyor. Atış anında hepsi
birden, daha uzun ve parlak doğar (boşalma). Kavis MERKEZİ dışa ötelenir
(`rad` 9-32) ve dönüşü kendi açısına göre teğet/radyal seçilir: ilk sürümde
hepsi çekirdekten çıkıyordu ve şekil "yıldız ikonu" gibi simetrik okunuyordu.
Kıvılcım yalnız boşalma anında, adet `Quality.budget('particles')`'tan.

### Maliyet
Kor topu + isabet ÜÇ çizim çağrısı (yalım/parıltı/halka) ve sahnede hiçbiri
yokken tampon yüklemesi bile yapılmaz (count 0'da `needsUpdate` yine küçük bir
GPU trafiğidir — diğer kahramanlarda bedava olmalı). İmza alevi 3, şimşek
kırığı 3. Ölçülen: Gökalev + 6 düşman + uçan kor topları = **27 çizim
çağrısı**.

Görsel doğrulama: **`game/_firetest.html`** — Renderer3D'nin GERÇEK
metodlarını sahte bir oyun nesnesiyle çalıştırır (oyunu başlatmadan kor topu,
isabet, imza alevi ve kırık çatırtısı). Yeni bir efekt eklerken buraya bir
satır ekle; `_weapontest.html` (silah ekseni) ile aynı amaca hizmet eder.

### Mavi Kor birikintisi (sig_a7) — kartın gerçekten çalışması
Kart yalnız jenerik `flame` sayacını artırıyordu; o sayacın tek etkisi
turuncu iz zerreleriydi ve kor topu dalında o dal ZATEN atlanıyordu — yani
kart hiçbir şey yapmıyor gibi görünüyordu. Artık kor topu İLK isabette
zemine 2,5 sn yanan mavi bir birikinti bırakır (`weapons.spawnFireZone`):
Kor Çemberi'nin havuzunu ve yarım saniyelik DoT tikini aynen kullanır, fark
`z.blue` bayrağıdır (mavi zerre + 3B'de disk sönük, asıl gösteri
`render3d._pushFireZones` yalımları). Mermi başına TEK birikinti
(`b.burned`) — yoksa delme hakkı 3 olan bir alev üç üst üste alan açardı.
Havuz 8 slot ve PAYLAŞIMLI: doluysa yeni birikinti açılmaz.

dps = mermi hasarı × (0.42 + 0.16·kademe) → L1'de ~14-20 dps × 2,5 sn.

`sig_a8` (Alev Patlaması) minLvl 2 → **1**: Gökalev tek mekanikle
başladığı için zayıf görünüyordu; Kaptan (k7/k8) ve Kraliçe (q7/q8) ile
aynı desen — iki temel imza ilk koşudan itibaren havuzda.

## GÖKALEV İMZA REVİZYONU (2026-08-04) — NOVA + KASIRGA

Eski `sig_a7` (Mavi Kor: yanan zemin) ve `sig_a8` (Alev Patlaması: delme
bitince patlama) SİLİNDİ. İkisi de zayıftı ve nedeni yapısaldı:

- Mavi Kor tek başına ~14 dps'lik bir leke bırakıyordu — silahın kendi
  hasarının yarısından azı, üstelik düşman lekeden çıkabiliyordu.
- Alev Patlaması yalnız `b.pierce < 0` dalında, yani delme hakkı TÜKENDİĞİNDE
  çalışıyordu. L1'de pierce 1 olduğu için tek düşmana atışta hiç görünmüyordu
  (Saçılan Gülle'de aynı hatayı düzeltmiştik — bkz. yukarı).

Yerlerine GÖKALEV'in iki boşluğunu dolduran iki mekanik geldi. Bölüşme
kasıtlı: **Nova = menzil, Kasırga = yakın mesafe.**

### MAVİ NOVA (`sig_a7`, sayaç `nova`)
Kor topu İLK isabette patlar: r = 82+12·kademe alan hasarı
(mermi hasarı × (0.80+0.15·kademe)) + patlama yerinde 1.8+0.25·kademe sn
yanan mavi zemin (`spawnFireZone` artık r/ömür/dps parametresi alır).
`b.burned` bir kez çalışmasını garanti eder.

**`g.explode` KULLANILMAZ** — turuncu köz renkleri saçar, sarı halka çizer
ve 0.16 sarsıntı ekler; saniyede bir olan bir olayda bu sarsıntı politikasını
ihlal eder. `weapons.fireNova` kendi mavi sürümünü yazar: sorgu + applyHit +
mavi zerreler + `spawnFlameImpact(x, y, ang, 2.3+0.22·kademe)`.

Görsel: isabet flaşının ÖLÇEKLİ varyantı (ayrı sistem değil — aynı dil).
`sc > 1.4` olunca ömür ×1.55 (büyük bir olay 0.30 sn'de biterse göz onu
"büyük" değil "kaçırılmış" okur), yelpaze TAM ÇEMBER olur (mermi durmuştur,
patlama her yöne) ve İKİNCİ, daha yavaş açılan geniş bir çeper eklenir —
tek halka "ok" der, iki farklı hızda halka "şok dalgası".
Nova varken küçük isabet flaşı ATLANIR (aynı karede aynı noktada iki flaş
büyüğün çekirdeğini yıkar).

### KOR KASIRGASI (`sig_a8`, sayaç `cyclone`)
Kahramanın çevresinde 2+kademe (en çok 6) mavi alev küresi döner
(R = 66+8·kademe, 2.15 rad/sn). Hasar TIKLIDIR — 0.4 sn'de bir küre başına
mermi hasarı × (0.30+0.06·kademe); her karede vurmak küçük dt'de devasa dps
ve ekranı dolduran hasar yazısı demektir.

Neden bu tasarım: Gökalev menzilli ve kırılgandı, yakınına gireni cezalandıran
hiçbir aracı yoktu. Kasırga SÜREKLİ çalışır — periyodik bir büyü değil, yani
kart alındığı anda ve her saniye görünür.

Küreler `cycloneOrbs` (önceden tahsisli 6 yuva, `{x,y,a}`) üzerinden
render3d'ye geçer; `_pushCyclone` her küreyi kor topuyla AYNI üç katman +
çekirdek parıltısı + geriye düşen iki iz tutamı olarak çizer (iz olmadan
küreler dönmüyor, "kaydırılıyor" gibi okunuyor — iz yönü yörünge teğetidir).

### Maliyet ve ölçüm
Ateş mesh'leri (yalım/parıltı/halka) kor topu · isabet · yanan zemin ·
kasırga arasında PAYLAŞILIR; commit tek yerde (`_updateFireHits` sonu).
Ölçülen: Gökalev + 5 düşman + iki imza açık = **27 çizim çağrısı / 13,4k
üçgen**, 111 yalım örneği. `_fireRingMax` 10 → **18** (nova iki halka
kullanıyor, altı eşzamanlı novada tavana çarpıyordu).

Kart glifleri: `cardArt.js → GOKALEV_GLYPHS.nova` (alev + iki genişleyen
çeper) ve `.kasirga` (kesikli yörünge + üç küre). Eski `mavikor`/
`alevpatlama` glifleri BIRAKILDI (ölü ama zararsız; başka kart eklenirse
yeniden kullanılabilir).

## ZIRHLI EJDER YUMURTASI (2026-08-05) — eggScene3d.js v2

Referans: `uploads/pasted-1785910818533-0.png`. v1'in boynuz / taç /
pençe / metal kuşak / tepe mührü **tamamen silindi**. Ejder yumurtası
bir tılsım değil: silueti tertemiz bir yumurta, bütün karakteri
**gövdeyi kaplayan bindirmeli pullardan** gelir.

### Beş taşıyıcı karar
1. **Pul gerçek geometridir** — ~150 kalkan pulu tek InstancedMesh'te
   (`scaleGeo` + `placeScale`). Dokuyla boyanmış pul siluetin kenarında
   diş vermez; oyuncu "zırhlı" okumasını oradan alır.
2. **Gövde koyu, pul açık.** Aradaki karanlık çizgi "kontur" işi görür.
   Gövde ayrıca emissive taşır → pul aralarından ışık sızar.
   `shellTex` sonunda %42 karartma geçilir: bu satır KALDIRILIRSA
   pullar söküldüğünde altından parlak plastik bir balon çıkar.
3. **Yaş parlaklık `envTex()` ile gelir** — 128×64 tuval equirect
   yansıma haritası. Işık eklemek yasak (CLAUDE.md), yansıma bedava.
4. **Nadirlik MADDE değiştirir:** obsidyen · safir · yanardöner menekşe ·
   magma geodu. Aynı rig, dört palet (`EGG_LOOK`).
5. **Tören pulları söker** — kabuk "opaklığı açılan" bir doku değil.

### Ölçülerek bulunan ve DEĞİŞTİRİLMEMESİ gereken sayılar
- **Sarım yönü.** `scaleGeo` indeksleri `(a,d,cc, a,b,d)`. `(a,cc,d)`
  sırası normali gövdenin İÇİNE bakar; `FrontSide` kırpması bütün
  pulları yok eder ve yalnız siluet kenarında görünürler. Bir kez bu
  tuzağa düşüldü, teşhisi yarım saat aldı.
- **Aşağı teğet.** `placeScale` `B_T`'yi ters kurar (pulun ucu AŞAĞI).
  Yukarı bakan pul kozalak/diken okunuyordu; referanstaki pul kiremit
  gibi aşağı bakar ve ucu YUVARLAKtır (`hw` son %30'da çember yayı —
  `(1-t^k)^m` aile eğrileri uçta sivri bitiyordu).
- **Profil üssü** `0.50 + 0.085·max(0,y)`. 0.5→0.67 aralığı su damlası
  veriyordu.
- **Pul boyu gövde BOYUNA oranlıdır** (`target = h·0.34`), çevreye
  değil: yumurta küçülse de pul adedi sabit kalır. Yuva kipinde
  `h·0.55` + 7 sıra — 46 px'te 14 sıra ince desen gürültüye döner.
- **Uca yakın sıralarda `wideK` 1'e çekilir.** Yoksa pul çevreden geniş
  olur ve soytarı tacı gibi dışa savrulur. Apeks ayrı bir rozetle
  (5 pul, v=0.99) TAMAMEN kapatılır: çıplak apeks parlak kel leke.
- **`emissiveIntensity` tavanı ≈ 0.2.** 2.7'ye çıkarılmıştı: kabuk düz
  pembe bir balona dönüyor, pulların kabartısı ve rengi kayboluyordu.
  Işık YOĞUN ÇİZGİLERDE olmalı — `fissureTex` siyah zeminde ince
  çatlak ağı taşır, hale geçişi w×1.25 / alfa 0.13 (w×2.4 / 0.26 dokuyu
  neredeyse tamamen beyaza boyuyordu).

### Çatlama töreni koreografisi (`EggScene3D`)
`renderFrame({dt, enter, shake, crack, glow, reveal})` — zamanı petUI
yönetir, sahne yalnız çizer.

| evre | süre | ne olur |
|---|---|---|
| enter | 0.62 sn | yumurta yukarıdan dönerek süzülüp gelir |
| bekleme | — | yavaş dönüş + nefes + ara ara silkeleme |
| crack | 1.35 sn | ilk %22 yalnız BASKI (sarsıntı + ışık), sonra pullar dalga hâlinde ekvatordan yukarı sökülür |
| burst | anlık | kabuk İKİYE ayrılır; üst yarı takla atarak uçar |
| reveal | 0.9 sn | alt yarı **pullu kâse** olarak kadrajda kalır, ışık sütunu + iki hızda şok halkası |

- **Alt yarının pulları HİÇ sökülmez** (`order = 9`, eşik `v < 0.46`
  ± tohum kırıntısı). Hepsi uçarken geriye düz parlak plastik bir
  yumurta kalıyordu; kâse pullu kalınca "zırhı yarılmış yumurta" okunur.
- Üst yarı parabolü `62s − 26s²`. Eski `34s − 46s²` 0.37 sn'de tepeye
  çıkıp geri düşüyordu, yani kapak yerinde duruyor gibi görünüyordu.
- Şok halkaları kâsenin **ALTINDA** (y≈−2): yumurta hizasındaki yatay
  halka "tabaka" okunuyor. Halka dokusu `ringTex()` — ortası BOŞ;
  `radialTex` ortada dolu leke veriyor ve halka değil tabak okunuyordu.
- `_popScale` uçan pulu serbest cisme çevirir; `St.age` ile 0.7 sn sonra
  küçülerek yok olur (yoksa çıkış anında kadrajda çöp gibi takılı kalır).
- Pul matrisi yalnız TÖREN kipinde dinamiktir (`DynamicDrawUsage` +
  kısmi `addUpdateRange`). Yuva/küçük resim kipinde tek yükleme
  (`StaticDrawUsage`) — CLAUDE.md kural 3.
- `new EggScene3D(canvas, {capture:true})` → `preserveDrawingBuffer`.
  YALNIZ tezgâh için; üretimde kapalı.

### Yoldaşın çıkışı (`style.css → .hatch-pet.emerge`)
Eski `hPop` tek bir "0.4→1 ölçek" sıçramasıydı: yoldaş yumurtanın
ÖNÜNDE beliriyordu, içinden çıkmıyordu. Yeni eğri beş beyte ayrılır
(baş yükselir → gövde fırlar ve dikeyde UZAR → havada frenler ve
yatayda YAYILIR → geri sekme → yerine oturur), sonra `hHover`
sonsuz süzülmeye devreder. Uçuş yüksekliği −14 px: 3B kâsenin ağzı
sahnenin ortasında olduğu için yoldaş ondan biraz YUKARIDA durmalı.

### Görsel doğrulama
**`game/_eggtest.html`** — dört ön-render küçük resim, canlı döner
vitrinler, **yuva boyu (46 px) şeridi** ve **tören kareleri** (töreni
sabit dt ile simüle edip PNG döker; canlı WebGL tuvali dışa
aktarılamıyor). Yeni bir palet ya da evre eklerken buraya satır ekle.
`_firetest.html` / `_weapontest.html` ile aynı amaca hizmet eder.

## PET SAYFASI v9 (2026-08-08) — "SUNAK"

v8 ("Ruh Mahzeni") de reddedildi: *"yazılar üzerine kurulu bir yer
olmuş."* Teşhis: beş bölüm alt alta basılan TEK bir kaydırmaydı, yani
ekranın büyük kısmı her zaman yazıydı; yoldaş figürü küçük bir künye
resmine düşmüştü; kuluçka sayfanın ORTASINDAydı — oyuncunun sandık
yuvalarından öğrendiği "yuvalar sayfanın DİBİNDE" alışkanlığıyla
çelişiyordu.

**v9 evin (`page-home`) mimarisini alır**, çünkü o düzen çalışıyor:
ortada büyük bir SAHNE (evde harita diyoraması), dipte SABİT yuva
sırası (evde sandık yuvaları), aradaki içerik değişir.

| kat | ne | davranış |
|---|---|---|
| ① `#pet-altar` | SUNAK — bağlı yoldaş | sabit, asla kaydırılmaz |
| ② `#pet-tabs` | yoldaşlar · pazar · yem | kayan pul (`--i`) |
| ③ `#pet-deck` | seçilen panel | tek kaydıran katman |
| ④ `.vt-dock` | kuluçka yuvaları | sabit, sayfanın dibi |

### Beş taşıyıcı karar
1. **Kuluçka = sandık yuvası — benzetme değil, AYNI kural.** Yuva
   `.cs-plus` · `.cs-state` · `.cs-skip` SINIFLARINI kullanır (kopya
   bildirim değil, evdekiyle aynı bildirim) ve iskeleti
   `.menu-shell .chest-slot` ile bire bir eşleşir: **13 px yarıçap ·
   1 px kenar + 2 px dip kenar · aynı üçlü gölge yığını
   (`inset 0 1px 0 rgba(255,255,255,.07)`, `inset 0 0 0 1.5px
   rgba(255,255,255,.03)`, `0 6px 12px -7px rgba(0,0,0,.9)`) ·
   `gap: clamp(6px,1.7vw,9px)` · `min-height: clamp(94px,13.5vh,118px)`
   ve aynı kısa-ekran eşikleri (720/670)**. Boş yuvanın artısı da
   çıplak glif değil, evdeki gibi ALTIGEN KABARIK PLAKA. Yalnız TON
   yerel: ev kızıl kabuk, mahzen mor taş.

   Bu yüzden mahzende **rıhtım bir KAİDE olarak açılır**
   (`.vt-dock` kendi paneli): evde yuvalar aydınlık kabuk üstünde
   durduğu için `rgba(16,13,20,.5)` dolgu okunuyor; mahzen duvarı
   (#0b0910) üstünde aynı dolgu görünmez oluyordu.

   Yuvada İLERLEME ÇUBUĞU YOK — sandık yuvasında da yok. Kalan süre
   `.cs-state.timer`, hızlandırma `.cs-skip` rozetidir.
2. **Sunak sahnedir, künye değil.** Işık huzmesi (`.alt-shaft`,
   nadirlik renginde), yükselen zerreler, nefes alan hale ve figür
   yükselirken KÜÇÜLEN yer gölgesi. "Uçuyor" okuması bu iki zıt
   hareketten gelir; gölge sabit kalırsa figür kayıyor görünür.
3. **Kısa ekranda sunak SAHNE olmayı bırakır.** Yükseklik çerçeveye
   oranlıdır (`clamp(96px, 34%, 200px)`), ama aritmetik acımasız:
   540 px'lik bir ekranda çerçeveye 353 px kalır ve sunak sahne
   kalırsa desteye 80 px düşer — pazar kartının FİYAT BUTONU bile
   görünmez. `max-height: 700px` altında sunak **yatay künyeye**
   döner (figür solda 96 px, ad/aura/çubuk sağda, huzme ve hale
   figürün üstünde kalır).

   Ama sunağı sıkıştırmak TEK BAŞINA yetmedi — asıl açlık RIHTIMDAN
   geliyordu (bkz. madde 6).

   `.vt-deck` `overflow:hidden` OLMALI — panelleri absolute, aksi
   halde rıhtımın üstüne taşarlar.
4. **Geçişin yönü sınıf hesabı gerektirmez.** Üç panel de DOM'da
   durur; etkinin SOLUNDA kalanlar `translateX(-14px)`, sağında
   kalanlar `+14px`, etkin olan 0. `_syncTabs` yalnız `.on`/`.back`
   atar, yön kendiliğinden doğru çıkar.
5. **İhtimal tablosu YAZI DEĞİL.** Pazar kartında her olası yoldaş
   için nadirlik renginde bir nokta; çapı olasılığa oranlı
   (%40+ → 9 px · %20+ → 7 px · %8+ → 5,5 px · altı → 4 px). Tam
   tablo zaten yuva vitrininde duruyor.

### Sunağın BOŞ hâli de yataydır (≤700 px)
Dolu sunak yatay künyeye çevrildiğinde boş hâl dikey yığın olarak
bırakılmıştı: hayalet 42 + başlık 16 + düğme 27 + boşluklar + dolgu =
**109 px**, kutu 62. `align-content:center` taşmayı iki uca birden
sızdırır, `overflow:hidden` ikisini de keser — yani kesilen şey
ÇAĞRI DÜĞMESİYDİ, sayfanın birincil eylemi. Artık boş hâl de dolu
hâlle aynı iki sütundur (hayalet solda, başlık + düğme sağda) ve
şerit varken sütun 76 px'e, hayalet 38 px'e iner.

Ölçülen (540 px): şeritli 60/60 · şeritsiz 84/84 — `scrollHeight ===
clientHeight`, düğme tamamen sunağın içinde. Sunak yüksekliğini
değiştiren her kural bu eşitliği İKİ HÂLDE de doğrulamalı (dolu künye
de sınırda: 62 px'te aura satırı bilerek düşürülür).

### Elindeki yumurta şeridi KENDİ SATIRINDADIR
Şerit önce başlık satırına konuldu; olmadı. Satır orn 7 + etiket 58 +
kılcal çizgi + şerit + sayaç 65 + dört boşluk ister: 245 px'lik
başlığa tek yumurta türünde bile 268 px'lik içerik giriyordu. Flex
önce `.mz-rule`'u 0'a indirdi (tasarımın her bölüm başlığında olan
altın kılcal çizgi hiç çizilmedi), sonra pulu ortadan kesti — ve
kesilen şey ADETTİ, yani şeridin bütün anlamı. Dört yumurta türünde
~400 px gerekiyordu.

Şimdi şerit `.vt-dock-h`'nin ALTINDA kendi satırında (22 px) ve pul
yalnız yumurta + adet taşır; nadirlik ADI silindi (pulun kenar rengi
ve yumurtanın kendisi zaten onu söylüyor). Ölçülen: dört pul 163 px,
245 px'lik satıra kaydırmasız sığıyor.

O 22 px **desteden değil SUNAKTAN** çıkar
(`.vt-frame:has(.vt-hand:not(:empty)) .vt-altar { height: 62px }`):
deste zaten en dar yer ve pazar kartı oradan taşar. `:empty` sayesinde
şerit yalnız yerleştirilecek bir yumurta varken yer kaplar.

6. **≤670 px'te yuvaya AÇIK yükseklik verilir (50 px).**
   `min-height: 0` yetmez: yükseklik İÇERİK güdümlü kalır ve yuva
   84 px çıkar (yumurta 36 + durum + hızlandırma rozeti + dolgu).
   O da rıhtımı 141 px yapıp desteye 95 px bırakıyordu — pazar kartı
   96 px olduğu için **fiyat butonu ekranın 77 px altında** kalıyor,
   yani sayfanın birincil eylemi görünmüyordu. İki yapısal düzeltme:

   • **Hızlandırma rozeti akıştan çıkar** (`.cs-skip` → absolute köşe
     rozeti, özgün `.mz-rush` yerleşimi). Akışta ~15 px yiyordu ve
     taşmanın yarısı buydu.
   • **Yuvaya `height: 50px`.** Ev sandık yuvasıyla BİÇİM paritesi
     (yarıçap, kenar, gölge yığını, durum dili, `.cs-*` sınıfları)
     korunur; **BOY bilerek ayrılır**, çünkü pet sayfası evin
     taşımadığı iki sabit katı (sunak + sekme) aynı çerçevede
     taşıyor. Parite BİÇİMDEDİR, piksel değil.

   Kapalı musluk uyarısı da (`.eo-gate`) bu boyda TEK SATIRA iner
   (54 → 24 px): kart biçiminde kaldığında altındaki gerçek pazar
   kartının fiyat butonunu ekran dışına itiyordu. Açıklama cümlesi
   satın almaya basınca toast olarak zaten çıkıyor.

### Kısa ekran ölçüm tablosu (279×540 kabuk, EN KÖTÜ HÂL)
En kötü hâl = yuvalar dolu (musluk kapalı → `.eo-gate` var) **ve**
BEKLEYEN şeridi dolu (eski kayıt artığı).

| kat | px |
|---|---|
| sunak | 62 |
| sekme | 37 |
| **deste** | **131** |
| rıhtım | 105 (başlık 12 + şerit 20 + yuva 50 + dolgu) |

| sekme | içerik | dip | deste dibi 353 |
|---|---|---|---|
| pazar (dolu) | uyarı 24 + kart 92 | buton 339 | ✓ |
| pazar (boş) | kart 86 | buton 321 | ✓ |
| yem | banka 40 + paket 70 | paket 339 | ✓ |
| yoldaşlar | kart 78 | 301 | ✓ |

**Doğrulama ÜÇ sekmede birden yapılır.** Koleksiyon kartı en kısadır
(78 px) ve tek başına ölçülürse sorunu gizler — bu hata tam böyle
kaçtı. Yeni bir panel eklerken tabloyu YENİDEN ÖLÇ ve buraya yaz:
önceki iki turda buraya yazılan sayılar (deste 130, yuva 49) ölçüm
değil TAHMİNDİ ve ikisi de yanlıştı.

### Sabit iskelette GİRİŞ ANİMASYONU YOK
`.vt-altar` ve `.mz-nest` bir zamanlar `animation: mzIn … both`
taşıyordu. `both` dolgusu gecikme boyunca `opacity: 0` tutar; belge
zaman çizelgesi durursa (sekme arkada, kare atlandı, ölçüm anı)
sayfanın ÇAPASI görünmez kalır — ölçümde tam olarak bu görüldü
(`document.timeline.currentTime === 0`, 55 animasyon 0'da donmuş,
yuvalar simsiyah). Geçici içerik (kartlar, satırlar) animasyonlu
girebilir; sabit iskelet giremez.

### Sekme rozetleri = "burada yapılacak iş var"
Sayı değil kor damlası: pazar rozeti YALNIZCA boş yuva VARKEN ve
alınabilecek bir yumurta varken yanar; yem rozeti beslenebilir bir
yoldaş varken. Koleksiyon rozeti yok (orada acil iş olmaz).

### Korunanlar
`.hatch-*` (çatlama töreni) · `.ns6-*` (yuva vitrini) · `.pd6-*`
(yoldaş inceleme) · `.pet-fly/.pfly/.pspark/.pfloat` · `.nt-badge` ·
`paFloat/paSwap/pdHot` hareketleri. Yuva seçicileri
(`#pet-nests .mz-nest[data-i]`, `.nr-left`, `.mz-bar`, `.mz-rush`)
de KORUNDU: saniyelik sayaç ve uçan yumurta bunlara bağlı.

Silinenler: `.mz-scroll/.mz-h/.mz-slab/.mz-bound*/.mzo*/.fr6-*/.fp6-*`
ve `#pet-scroll`. `openPetView` artık kaydırmaz, SEKME değiştirir —
bu yüzden `scrollIntoView` sorunu da ortadan kalktı.

### Dış kancalar (ui.js çağırır — imzayı bozma)
`renderPets` · `refreshPetBadge` · `_tickPets` (1 Hz) ·
`stopPetScene`/`_syncPetScene` (boş; 3B yok) · `openPetView(kind)`
(artık sekme değiştirir) · `renderPetView(kind)`.

---

## KALABALIK PAYI GEOMETRİ OLDU (2026-08-29) — `_baltest.html` ① ②

Kullanıcı: *"Gökalev ile donmuş haritada neredeyse hiç hasar atamıyorum."*
**Tezgah onu +%12,3 FAZLA GÜÇLÜ ölçüyordu.** Oyuncu ile ölçüm çeliştiğinde
şüpheli önce ÖLÇÜMDÜR — ve buradaki hata, bu dosyanın kendi uyardığı
tuzağın ikinci nesliydi.

### Hatanın anatomisi: düzeltmenin kendisi ölçülmemişti
Bir önceki tur "elle yazılmış tablo delme değişince yalan söyler" diye
tabloyu formüle çevirdi: `1 + 0,7·delme`, tavan 3,0. **Formülün KENDİSİ
hiç oyuna karşı doğrulanmadı.** Sonucu: delme 4'lük bir kor topu "bir
kılıç yayı kadar kalabalık siliyor" sayılıyordu. Sahada öyle değil —
yay 2,4 radyanlık KONİDEKİ herkesi keser, delen mermi yalnız **aynı ışın
üzerinde sıralanmış** düşmanlara değer ve 4000 px'lik sahada o hizalanma
nadirdir. *Elle yazılmış sabiti formülle değiştirmek, formül ölçülmediyse
aynı hatadır.*

### Yeni model: bulut üretilir, etki alanı SORGULANIR
Düşman bulutu oyunun kendi kurallarından türetilir (ekran dışı halkada
doğar → oyuncuya yürür → `separate()` ~30 px arayla tutar → yakınsayan,
mesafeyle seyrelen sürü). Görünen alan sahanın ~%8'i, kabuk dikey →
~816 × 1570 dünya px; sahnedeki adet `onScreenCap(dalga)`, yani doğuş
tavanının kendisi. Deterministik PRNG (`mulberry`) — `Math.random` ile
ölçüm yapmak "düzelttim ama ölçüm değişmedi" belirsizliğinin kaynağıdır.

Üç sorgu aynı bulutu okur, yani fark GEOMETRİDEN gelir:
`hitsArc` (koni: yarıçap+açı içindeki HERKES) · `hitsRay` (koridor:
genişlik = mermi r + düşman r, uzunluk = min(range, hız×ömür), en yakın
delme+1 hedef) · `hitsChain` (en yakın komşuya atlama, falloff^k).
Otomatik nişan en yakını hedeflediği için her silah ≥1 isabet garantili;
ölçülen şey o hedefin ÜSTÜNE gelen fazladan isabettir.

**Ölçülen kalabalık payı:** yakın dövüş 3,3-3,9 · mermili 1,7-2,1 ·
zincir 2,4. Eski model mermiliye 3,0'a kadar veriyordu — Gökalev'in
puanı bu tek sayıdan geliyordu.

### KESİNTİYİ DOĞRU YERE YAP (bu turda bir kez ters yapıldı)
Yakın dövüşün fazlalığı KALABALIKTA idi; ilk düzeltme HASARDAN kesti ve
**boss süreleri 112 → 247 sn'ye çıktı** — boss tek hedeftir. Bileşik puan
yeşil görünürken oyun bozulmuştu.
> Kalabalık fazlalığı **yay/menzilden** kesilir, tek hedef fazlalığı
> **hasardan**. Bileşik puan ikisini de gizler.

### Yakın dövüş kademesi artık menzil değil HASAR satın alır
`range` ve `arc` birlikte büyüdüğünde kalabalık payı ÇARPIMSAL büyüyor
(L5/L1 ×9,2 — bant 3,0-6,5). Yay ve menzil kademeyle SABİT; kademe hasar
ve tempo verir. **Yayı kademeyle DARALTMAK yasak:** oyuncuya yükselttikçe
kötüleşen bir sayı gösterilmez.

**SESSİZ KORUMA "DÜZELTTİM" YANILGISI ÜRETİR.** Aynı turda dört `descUp`
metni "Yay genişler, hasar +11" derken yay sabitlenmişti; düzeltme
`if (c.includes(a))` korumasıyla yazıldığı için eşleşme bulunamadı,
script **hiçbir uyarı basmadan geçti** ve bu satırın kendisi doktrin
dosyasına yanlış bir ölçüm notu olarak girdi (dosyanın kendi kuralı:
"bir ölçüt değişikliğinin ETKİSİ de ölçülür"). Toplu düzenlemede eşleşme
yoksa GÜRÜLTÜ çıkar — `if (!c.includes(a)) log('!! yok')`. Metinler
sonradan gerçek `dmg` dizisinden türetilerek yazıldı; delta elle
tahmin edilmez.

Az hedefe değen silah vuruş başına daha çok verir: alev 52→83 ·
topatar 55→100 · yay 59→101 · sapan 34→60; yakın dövüş düştü.

| ölçüt | önce | sonra | bant |
|---|---|---|---|
| L1 sapma yayılımı | −28,2% … +33,0% | **−4,5% … +9,4%** | ±%10 |
| L5 sapma yayılımı | −53,3% … +65,2% | **−2,1% … +9,7%** | ±%10 |
| L5/L1 | ×3,70 … ×9,18 | **×4,71 … ×6,39** | 3,0-6,5 |
| Gökalev L1 / L5 | +12,3% / −46,8% | **−2,3% / +2,6%** | ±%10 |

### ⑤ TEK ARKETİPLE ÖLÇÜLMEZ
Dünya eğrisi panelinin ölçüm çubuğu destan YAKIN DÖVÜŞ kahramanıydı.
Yakın dövüşün tek hedef gücü tasarım gereği en düşüktür, yani panel dünya
eğrisini değil "en kötü arketipin boss süresini" ölçüyordu ve **her**
dengelemede kırmızı kalmaya mahkûmdu. Artık kadro MEDYANI + en hızlı/en
yavaş: eğri mi bozuk, arketip yayılımı mı geniş — ayrımı panel yapar.

### ÇIPLAK DİZİ LİTERALİYLE TOPLU DÜZENLEME YAPILMAZ
Hasar dizilerini metin değiştirmeyle güncellerken `yemin` bir tur boyunca
`tabanca` ile BİREBİR aynı diziye sahip oldu ([11,15,20,26,34]); sonraki
iki tur çıplak literalle eşleştiği için **ikisini birden** değiştirdi ve
dükkân tabancası hiç ölçülmeden %32 güçlendi. Hiçbir panel kırmızı
çıkmadı: tezgah yalnız İMZA silahlarını okuyordu. "Global regex kendi
yorum metnini de değiştirir" dersinin kardeşi — düzeltme silah id'sini
içeren BLOK eşleşmesi (`/\n  <id>: \{[\s\S]*?dmg:\s*\[/`).

Tezgaha iki kalıcı denetim girdi: **⑧ dükkân silahları** (ölçüt: dükkân
silahı imza medyanını aşmaz, ≤ ×1,00 — ikincil silah çeşitlilik sunar,
üstünlük sunmaz) ve **⑨ aynı hasar dizisini paylaşan silahlar**.

⑧ hemen bir şey de buldu: kure/tabanca/sacma L5'te medyanın ×1,47-1,89
üstündeydi (dokunulmamış eski değerler). Sebep, imza silahlarından
2026-08-18'de kaldırılan **çift atışın dükkânda kalması** — o gün doğruydu
çünkü imza hasarları düşüktü; imzalar yükselince aynı sayı "her kahramanın
satın alabildiği tabanca efsane imzayı geçiyor" oldu. **Bir silah grubunu
dengelerken diğer grubun bağıl konumu da kayar; ölçüm dışı bırakılan grup
sessizce en güçlüsü olur.** L5 kuyruğu kısıldı (70→37 · 34→22 · 22→15),
L1'e dokunulmadı (orada oran 0,47-0,73 sağlıklıydı).

Tezgahın kendi tuzağı: dükkân silahlarının üçü farklı tempo alanı kullanıyor
(`hitCd` yörünge bıçakları, `spawnCd` alan silahları). Hepsinde
`cooldown`/`spawnCd` varsayan ilk sürüm TypeError atıp **boş sayfa**
verdi — hata yalnız günlükte görünür (`_firetest` dersinin aynısı).

### Modelde hâlâ elle yazılı üç sayı (görünür yerde tutuluyor)
`RIDERS`: ayaz halkası ×0,30 · mavi kesik ×0,60 (yarıçap/ömürleri config'te
değil weapons.js'te yaşıyor) ve sapanın `bounceLv` sekmesi hiç modellenmedi
— **SAPANCI'nın L5'teki −%18,6'sının bir kısmı bu boşluktur, hasar
yükseltmek yanlış düzeltme olur.** Geometriye çevrilecek sıradaki üç sayı.

---

## GİRİŞ EĞRİSİ + DİNAMİK ZORLUK (2026-08-29) — `_baltest.html` ⑥ ⑦

Kullanıcının teşhisi *"haritalar dengesiz, erken çok düşman"*dı. Gözle
çözülemezdi: doğum baskısı ÜÇ kaldıraçtan çarpımsal olarak doğuyor ve
üçüncüsü hiç kimsenin baktığı yerde değildi.

### PARA BİRİMİ ADLARI: Kan Taşı → **Gem** · Kan Yakutu → **Altın**
63 kullanıcı görünür metin + yorum çevrildi (config · main · ui · chests ·
style · index). Değişken adları (`stones`, `rubies`) ve kayıt anahtarları
(`kh_rubies`, `kh_bloodstone`) BİLEREK aynı kaldı: yeniden adlandırma kayıt
göçü gerektirir, görünür hiçbir kazanç sağlamaz. Yeni metin yazarken oyun
içi para **ALTIN**, premium para **GEM**'dir; "yakut/taş" yalnız eski
yorumlarda kalmış olabilir.

### KARIŞIM KAYDIRMASI BASKIYI SÜRÜYORDU — asıl hata buydu
`enemyManager.startWave` `eff = wave + msn.mixOffset` değerini ÜÇ yere
veriyordu: düşman karışımı, doğum aralığı ve grup boyu. `mixOffset` ise
`(w-1)*2 + floor((m-1)/2)`, yani 10. dünyanın 5. görevinde **20**:
BİRİNCİ dalga 21. dalga gibi doğuyor, eğrinin tabanına (0,34 sn · 10'lu
grup) çarpı dünya yoğunluğu 1,82 → **ilk 60 saniyede 609 düşman**. Nefes
penceresi orada matematiksel olarak yoktu.

Ayrıldı: `waveWeights(eff)` (karışım baştan sert kalır) · aralık ve grup
YALNIZ dalga numarasından. Baskı artık dünya **yoğunluğu** (density
1,00→1,82) ve **canlı tavanı** (110→340) ile büyür. *"Daha çok düşman"
ile "daha zor düşman" iki ayrı kaldıraçtır; bir sayı ikisini birden
sürüyorsa biri sessizce yanlıştır.*

### ÜÇ KALDIRAÇ, ÜÇÜ AYRI (config.js)
| kaldıraç | nerede | ne yapar |
|---|---|---|
| dalga eğrisi | `waveInterval` · `waveBatch` | dalga numarasına göre baskı |
| nefes penceresi | `RAMP.breath*` · `RAMP.waveEase*` | ko\u015funun/dalganın ilk saniyeleri |
| dinamik pay | `DYN` + `meta.dyn` | oyuncunun ölüm/zafer geçmişi |

- **Erken dalgalar ELLE yazılır** (`w ≤ 3`), formül geç dalgaları sürer.
  Tek üsle iki ucu ayarlamak denenip bırakıldı: üssü büyütmek girişi
  yumuşatırken finali tehditsiz bırakıyor, küçültmek tersini yapıyor.
- **Nefes penceresi 50 sn** (ko\u015fu zamanı) + her dalgada 6 sn yumuşama;
  çarpanlar ÇARPILIR (ilk karede 0,60 × 0,55 = 0,33). Boş görünen o
  pencere kasıtlıdır ve ölçütü vardır.
- **Doğuş yayması** (`RAMP.spread` 0,09 sn): grup aynı KAREDE doğmaz. Altı
  düşmanın tek karede belirmesi "yığılma", yarım saniyeye yayılması "akın"
  okunur. **Tavan doluysa kuyruk SİLİNİR** — biriken borç yer açıldığı anda
  yirmi düşmanı tek karede boşaltır, yani çözmeye çalıştığımız yığılmanın
  kendisi.
- **Görüş alanı tavanı** (`onScreenCap` 22→64, dalgayla büyür): canlı üst
  sınırı 4000 px'lik sahanın TAMAMI için geçerli, oysa oyuncu haritanın
  ~%8'ini görür. Sayım ızgara döngüsüyle AYNI geçişte yapılır (250 düşmanda
  ikinci döngü bedava değil).

### PRESSURE İKİ KALDIRACA **KAREKÖKLE** UYGULANIR
İlk sürüm çarpanı hem gruba hem aralığa TAM uyguladı; etkisi KARELİ oldu ve
0,78–1,06'lık dinamik pay sahada **%46** fark üretti (ölçüldü) — "görünmez
ince ayar" gizli bir zorluk seçicisine dönüşmüştü. Çözüm tek kaldıraca
inmek DEĞİL (yalnız aralığı uzatmak "tek tek gelen düşman" duygusu verir):
`spawnGap` ve `spawnBatch` çarpanın KAREKÖKÜNÜ kullanır, çarpım tam
doğrusal kalır. Ölçülen bant genişliği **%25,7** (ölçüt %6–%35).

### DİNAMİK ZORLUK: dar bant, YALNIZ doğum baskısı
`DYN` 0,78–1,06 · ölümde −0,06 · zaferde +0,035 (hasarsızsa +0,06) ·
kalıcı (`meta.dyn`) çünkü koşu içinde değişen zorluk fark edilir. **Düşman
canına/hasarına ASLA dokunmaz**: o, oyuncunun vuruşunu yalanlar ("aynı
kılıçla dün üç vuruşta ölüyordu") ve denge tezgahını geçersiz kılar.
`_baltest` payı GÖRMEZ — kadro puanı hep ×1,00 ile ölçülür. Ölçüt
`hpFloor` (koşuda görülen en düşük can oranı): "hiç ölmedi" yetmez, son
canıyla geçen oyuncu da zorlanmıştır.

### Ölçülen son durum (`_baltest.html` ⑥ ⑦, dünya 1 · görev 5)
| ölçüt | önce | sonra | bant |
|---|---|---|---|
| ilk 60 sn'de doğan düşman | 84 | **33** | 14–34 |
| 1. dalga doğum hızı | — | 0,39 /sn | 0,25–0,95 |
| son dalga doğum hızı | — | 5,50 /sn | ≥ 3,0 |
| giriş/final oranı | — | ×14,0 | ≥ ×3,5 |
| dinamik bant genişliği | %46,2 | **%25,7** | %6–%35 |
| en büyük dünya→dünya sıçraması | ×2,84 | **×2,07** | < ×2,4 |
| nefes penceresi tutarlılığı (10 dünya) | ×18,5 | **×1,79** | < ×2,0 |

Canlı doğrulama: oyunda 1. dalga `interval` 2,24 sn · `batch` 1 ·
`pressure` 0,717 (t=14,6 sn) ve dalga sonunda 9 düşman — tezgahın 10
tahminiyle uyumlu. **Tezgah ile oyun aynı fonksiyonları çağırır**
(`pressureAt` · `spawnGap` · `spawnBatch` config'te); ikinci bir kopya
`waveDuration` tuzağının tekrarı olurdu.

**HARİTALAR ARASI ÖLÇÜT "EŞİT OLSUN" DEĞİL "KOMŞUSUNDAN SIÇRAMASIN".**
İlk sürüm mutlak baskı puanını kampanya ortalamasıyla karşılaştırdı ve on
dünyanın dokuzunu KIRMIZI çizdi — oyuncu 1. dünyayı 10. dünyayla yan yana
oynamaz, komşusuyla oynar; hpMul eğrisi (1,5 → 71) zaten kasıtlı bir
tırmanıştır. Yanlış ölçüt ya susturulur ya yalan söyler.

---

## SES VARYANT HAVUZU + ZAFER MÜZİĞİ (2026-08-29)

### `AudioFX.pick(name, n)` — rastgele, ARDIL TEKRAR YOK
Eski `rr` sıralı round-robin'di: üç tetikte bir A-B-C deseni kuruyordu ve
kulak deseni öğrenince varyant olmanın anlamı kalmıyordu. Saf rastgele ise
aynı varyantı üst üste çalıp "tek ses" duyulur (3 varyantta her tetikte
1/3). İkisinin arası: rastgele + son çalan yasak. `k` okuyan TÜM sesler
(vuruş · kritik · savuruş · atış · sandık) bundan beslenir.

**ZAFER üç varyantlı** (yükselen fanfar · çan öncüllü plagal kapanış ·
davul çağrısı). Üçü de AYNI tonda, aynı uzunlukta ve aynı YÜKSEKLİKTE:
varyasyon KARAKTERDE olur, seviyede olursa "ses hatası" duyulur. Çekirdek
de ortaktır (alt davul + koro yatağı + çan takibi). Sandık açılışının çan
yağmuru üç ayrı DİZİLİŞTEN seçilir — perdeler aynı akorun içinden, değişen
şey yön (çıkan · zikzak · geniş atlamalı).

### `STATES.victory` — görev sonu perdesinin altı
Önceden zafer doğrudan MENÜ temasına geçiyordu: oyuncu boss'u devirdikten
iki saniye sonra ana ekranın müziğini duyuyordu, yani koşunun doruk noktası
ile menü aynı sesi taşıyordu. Yeni durum aynı tonda (Bb) ama parlak;
geçiş ANINDA (bar sınırını beklemek fanfarın üstüne biner) ve `duck`
fanfar boyunca müziği geri çeker.

**YENİLGİ İÇİN DURUM YOK ve bu kasıtlı:** ölümde müzik `fadeOut` ile
SUSAR. Yenilgi perdesinin altında çalan her şey — ne kadar hüzünlü
yazılsa da — anın sessizliğini bozar; sessizlik burada bir efekttir.

Tema **tek cümle** ve tonikte uzun bir notayla kapanır (kapanmayan zafer
"devam edecek" duyulur). Doluluk %63 — bandın (%30–%72) üst yarısı,
çünkü perde 10-20 sn açık kalır, iki tekrarı ancak duyulur. Ölçüm
(`_musictest.html`, beşinci durum): tepe −5,4 dBFS · RMS −21,6 · doluluk
%63 · tekrar 6 nota · bant 42,7/53,2/4,1. **Beş durumun tamamı bantta.**
Ölçüm SÜRESİ de ölçütün parçası: zafer 16 sn render edilir, 26 sn onun
gerçekte hiç duyulmayan dördüncü tekrarını da bantlara sokardı.

---

## GÜNLÜK GİRİŞ + HAFTALIK GÖREVLER (2026-08-29) — `dailies.js`

Kullanıcı isteği "premium hissettiren, sıradan liste OLMAYAN" iki sistem.
Takvim mantığı savaş kodundan AYRI dosyada: `dailies.js` hiçbir DOM'a ve
sese dokunmaz, yalnız `meta.quests` dilimini okur/yazar ve ödül TANIMINI
döndürür; ödülü VEREN taraf `main.grantQuestReward` (cüzdan ve sandık
orada yaşıyor).

### Beş taşıyıcı karar
1. **Gün ilerlemesi ödül ALINDIĞINDA olur, gün değiştiğinde değil.** Oyunu
   açıp ödülü almayan oyuncunun yuvası kaybolmaz. Takvim "gün sayacı"
   değil "alınmış ödül sayacı"dır.
2. **Telafi hakkı (hafta başına 1).** Streak sistemlerinin oyuncuyu
   kaybettiği yer 7 günün 6'sını yapıp 7'yi kaçırmaktır; ceza orada kaybı
   ikiye katlar. Hak kullanıldığında oyuncuya YAZILI olarak söylenir —
   görünmeyen bir hak "ben mi yanlış hatırlıyorum" hissi verir.
3. **Beş görev, beş AYRI oynayış ekseni** (öldürme · görev · boss · saha
   görevi · dalga). Aynı ekseni ölçen iki görev, tek görevin iki kez
   sayılmasıdır. Hedefler SABİT: dinamik hedef ("geçen haftanın %120'si")
   iyi oynayanı cezalandırır ve haftalar karşılaştırılamaz olur.
4. **Görev ödülü + VİTRİN ayrı.** Görev ödülü "yaptım" der, üç kademeli
   vitrin "haftayı bitirdim" der; ikisi ayrılmadan sistem bir yapılacaklar
   listesine benziyor.
5. **İlerleme KOŞU SONUNDA yazılır** (`main.saveRecord` — ölümde de,
   zaferde de). Sıcak döngüde localStorage'a yazmak yasak; saha görevi
   sayacı ise `grantObjectiveCard`'dan, yani TÜM saha görevlerinin tek
   ortak başarı yolundan beslenir (iki yerden saymak yeni bir görev türü
   eklendiğinde sessizce yanlış olur).

Tamamlanmış görevin sayacı büyümez: 400/400 gösterip 812 yazmak "fazla
oynadım, boşa gitti" duygusu verir. Sandık ödülü yuva doluysa YANMAZ,
altına çevrilir ("yuva açılınca gel" demek ödülü geri almak gibi okunur).

### Arayüz dersleri (üçü de ÖLÇÜLDÜ, tahmin değil)
- **`.btn-rune` 240 px taban genişlik taşıyor.** `width:100%` yetmez,
  `min-width: 0` şart: 217 px'lik panelde buton kabuğun dışına çıkıp
  yatay kaydırma çubuğu üretti. *Devralınan özellik yeni kuralı sessizce
  iptal eder.*
- **Telafi metni + ÖDÜLÜ AL butonu aynı satırı PAYLAŞAMAZ** (kahraman
  inceleme dersinin aynısı): 250 px'lik satırda metin dokuz satıra sarıp
  butonu dışarı itti. Etiket üstte, kontrol altta tam genişlikte.
- **Geri sayım başlığın ALTINDA, satır içinde durur.** Sağ üste mutlak
  konumlandığında dar kabukta iki satıra sarılan eyebrow ile çakışıp
  başlık bloğunu 22 px büyütüyordu.

Genişlik kırılmaları `@container shell` ile (viewport DEĞİL). Kaydırılan
tek katman `.q-body`; başlık ve ödül butonu sabit. Rozet (`#quest-open`)
YALNIZ alınmayı bekleyen bir şey varken yanar — sürekli yanan rozet iki
günde öğrenilir ve görünmez olur.


---

## BEŞ BİOMUN DÜŞMAN KADROSU (2026-08-29) — `_newenemytest.html`, `_facetest.html`

On dört Tripo modeli beş haritaya girdi. Üç yeni oynanış tipi (`agir` ·
`patlayici` · `kral`), dünyaya bağlı kadro tablosu, düşmanın YER HASARI
altyapısı, yürümeyen bir boss ve ölüm patlamasının yerine gelen çöküş.

| dünya | kalabalık | tank | ağır | menzil | özel |
|---|---|---|---|---|---|
| mezarlık | hortlak | muhafız | — | büyücü | **İSKELET KRAL** (kral) |
| kül | alev delisi | kor lordu | — | mum büyücüsü | — |
| bataklık | batak yaratığı | batak devi | — | **YOK** | boss: BATAK EJDERİ |
| tuzla | tuz böceği | tuz pençesi | — | **YOK** | **KOŞUCU** (patlayici) |
| buzul | buz kurdu | buz ayısı | **yeti** | kar tilkisi | — |

### KADRO D Ü N Y A N I N V E R İ S İ D İ R
`waveWeights` içindeki if'ler yerine `worlds.js → roster` (tip → çarpan, 0 =
o dünyada YOK) + `config.TYPE_CURVES` (dalga ilerledikçe sıklık). Kadroyu
değiştiren biri config'te if aramaz. **Modeli olmayan bir tipi bir dünyaya
açmak o dünyada KAPSÜL çizmek demektir** — önce model kaydı yazılır.

### ① OFFLINE BORU HATTI: 33,2 MB → 14,8 MB
Tripo ihraçları HAM kullanılamaz. Sekiz Draco'suz model burada (tarayıcıda,
oyuna girmeden) kümeleme ile sadeleştirildi: **2,8-4,9k üçgen, 325-518 KB**.
Altı model **KHR_draco** ile geldi (370-660 bin üçgen!) ve Draco burada
çözülemiyor: geometrileri korunup **kullanılmayan normal + metalik/pürüz
dokuları söküldü** (tek başına ~11 MB) ve baseColor 512²'ye indi; oyunda
`decimate` kaydıyla çalışma anında sadeleştirilip IndexedDB'ye yazılıyorlar.
**Ölçülen ilk-kez maliyeti: ejder 1,63 sn · yeti/kral/yaratık ~1-2 sn, cihaz
başına BİR KEZ.** `decKey` tezgahla ORTAK: aynı model iki anahtarla iki kez
sadeleştirilmez.

**Kalan iş:** o beş modeli Tripo'dan 4-6k hedef poligonla YENİDEN İHRAÇ
etmek ilk-kez maliyetini ve ~10 MB'ı tamamen siler. Boru hattı ikisiyle de
çalışır; bu bir optimizasyon borcu, hata değil.

### ② KÖŞE AYIKLAMA OLMADAN SADELEŞTİRME DOSYAYI ŞİŞİRİR
Dejenere üçgen atıldıktan sonra hiçbir üçgende geçmeyen köşeler dosyada
KALIYOR: 3,1k üçgenlik model **7.470** köşe taşıyordu (56 bayt/köşe →
573 KB). Compaction sonrası 5.269 köşe / 452 KB. Üçgen sayısı doğru
görünürken dosyanın yarısı ölü veriydi.

### ③ ALBEDO: `lift` KOYU DOKUYU KURTARMAZ
Tezgah figür ve ZEMİN parlaklığını ayrı ölçer; ölçüt **oran 1,8-4,5**.
Dokuz modelin oranı 0,80-1,68 çıktı — karanlık zeminde siluet kayboluyor.
Sebep `lift` değil: **Tripo gölgeyi/AO'yu baseColor'a PİŞİRİYOR**, yani doku
oyun-hazır albedo değil aydınlatılmış bir render. lift çarpımsal maske
olduğu için koyu albedoda hiçbir şeyi kurtarmaz (propModels dersinin aynısı).
Çözüm yeni ışık DEĞİL (yasak): dokunun midtonları offline gamma ile kaldırıldı
ve **gamma elle seçilmedi**, dokunun ölçülen ortalamasından çözüldü
(`g = 1/(1 + ln(hedef)/ln(ort))`, tavan 2,4 — çarpmaktan farkı parlak uçların
KIRPILMAMASI). Ort. 35-77 → 73-117; oranlar 1,76-2,86'ya çıktı. Bandın
dibine değen üç model (kor lordu · böcek · koşucu, ×1,76-1,77) ayrıca lift ile
düzeltildi — *sınıra değen değer yuvarlanmaz.*

### ④ YÖN (`yawFix`) — KEMİK ÖLÇÜMÜ YANILDI, DÖRT-YAW PANELİ YANILMADI
Oyun holder yaw'ını `atan2(px-ex, py-ey)` ile sürer: yaw=0'da modelin YEREL
+Z'si oyuncuya bakmak ZORUNDA, yoksa düşman **yan yürür**.
- bbox uzun ekseni yalnız ipuçtur: kolları açık insansıda "X" der (yanlış).
- `Head` − `Root` kemik farkı da yanıldı: kurtta −38° dedi (gerçek 0°),
  tuz pençesinde 76° dedi (gerçek 0°) — Tripo'da `Root` gövde ucunda,
  `Head` de yüzde olmayabilir. **Metrik yönü değil kemik düzenini ölçüyordu.**
- Karar veren: **`_facetest.html` aynı modeli dört yaw ile yan yana çizer**,
  cepheye bakan seçilir (propAlign'daki `flip` mantığı). Ölçülen: buz ayısı
  **+90°**, batak ejderi **+90°**, kalan on iki model 0°.
- Dört ayaklı Tripo rigi için `rootBones` kaydı ZORUNLU ve **iki yazımı da**
  içerir: three.js bone adlarını sanitize eder, `tripo::Root` → `tripo__Root`.
  Yalnız `::` yazılırsa kök hareketi SÖKÜLMEZ ve figür gölgesinin önünde yürür.

### ⑤ TEHLİKE ALANLARI (`main.pools.hazards`) — tek altyapı
`zones` oyuncunun kor birikintisidir (düşmana vurur); tersi hiç yoktu.
kind 0 = telegraf → bir kez patlar · kind 1 = kalıcı zehir (0,5 sn tik).
Kral nabzı, ejderin zehir salvosu ve zıplama alanı ÜÇÜ de buradan geçer —
ikinci bir yol `waveDuration` tuzağının tekrarı olurdu. Hasarı **yalnız alan**
verir, düşman değil.
- **UYARISIZ ALAN HASARI YASAK**: her kind 0 alanın telegrafı var (0,55-0,85 sn
  ≈ tepki süresinin iki katı). Uyarısız hasar "sebepsiz can gitti" diye okunur.
- Görsel: **dolgu disk DEĞİL, nişan halkası + çok soluk dolan iç**. İlk sürüm
  264 px'lik opak katkısal disk çiziyordu: ekranda "kırmızı halı", üstündeki
  düşman silueti yutuluyor, overdraw beş katı. Bilgi HALKADA, zamanlama içte.
- Sekiz yuva, alan yokken `visible=false` → çizim çağrısı YOK. Isıtma kaydı
  ZORUNLUYDU (kural 5): materyal ilk alan çıktığında derlenirdi, yani tam
  kralın ilk nabzında tek karelik donma.

### ⑥ İSKELET KRAL — "boss gibi ama boss DEĞİL" ölçülebilir bir tariftir
hp 560 (muhafızın 6,4×'i, boss'un yalnız %14'ü) · speed 20 (kadronun en
yavaşı — **kaçılabilir olması adalettir**: alan hasarı veren bir düşmana bir de
yakalayamadığın hız verilmez) · auraCd 3,1 sn + 0,62 sn telegraf · auraR 132
(yarıçapının ~4×'i → dövüş "gir-çık" ritmine oturur) · boy **126** (hiyerarşi:
kahraman 60 · hortlak 76 · büyücü 82 · muhafız 104 · KRAL 126 · lord 150).
Doğum eğrisi 6. dalgada açılır ve ~%2,7'de kalır: **en güçlü düşman bir OLAY
olmalı, rutin bir doğum değil.** Pay KALABALIK gruptan alındı (hortlak
0,62 → 0,54).

### ⑦ PATLAYICI KOŞUCU — fitil yanınca DURUR
Temas hasarı YOK (dmg 0): bedeli patlama ödetir, yoksa aynı düşman iki kez
vurmuş olur ve "neden öldüm" okunmaz. Fitil 0,55 sn ve o sürede **durur** —
hızı oyuncudan yüksek (78), koşarak patlasa kaçış imkânı olmazdı; durması
telegrafın kendisi. **Öldürülürse patlamaz** (refleks ödülü) ve **ganimet
vermez** (öldürmediğin düşmandan yakut almak tipi tehdit olmaktan çıkarır).

### ⑧ BATAK EJDERİ — YÜRÜME KLİBİ YOK, O YÜZDEN YÜRÜMEZ
Model iskeletsiz + klipsiz. Hasat Lordu'yla aynı kısıt, farklı cevap: lord
süzülür, ejder YERDE durur, döner ve ZIPLAR — yer değiştirmesinin tek yolu
zıplamadır, yani her konum değişikliği önceden bildirilen bir olaydır
("ayakları yerde kayıyor" hatası klip uydurarak değil TASARIMLA kapatılır).
Poz `bossMotion.dragonPose` (tezgah aynı fonksiyonu okur) ve **telegraf/havada
kalma süreleri config.DRAGON'dan OKUNUR, ikinci kez yazılmaz.**
- perch: nefes + gövde salınımı (duran gövde heykel olmamalı) · tell: çömelir,
  gerilir · leap: `sin(πk)` yayı, tepe gövde boyunun ~%30'u (44/150) — daha
  alçağı "kayıyor", daha yükseği ejderi uçan yaratığa çevirir.
- Salvo: üç alan, yan açıklık 96 (oyuncu yarıçapının ~5×'i) — "üçe ayrılmış"
  okunur ama **aradan geçilebilir. Kaçış yolu BIRAKILIR.**
- Zıplama alanının patlama anı İNİŞLE ÇAKIŞIR (tell + leapTime).
- Yerinde dönüş hızı sınırlı (2,2 rad/sn): yürümeyen bir gövdenin bir karede
  180° dönmesi "ışınlandı" gibi okunur (lord süzüldüğü için ona gerekmiyordu).
- **Boss modeli artık dünyaya bağlı** (`BOSS_MODELS`): tek `bossRig` alanı
  vardı, bataklıkta lord çıkıyordu. Yüklenen rigler GLB yoluna göre saklanır,
  dünya arası yeniden indirme yok. **İskeletsiz model `loadDecimatedProp`
  ile yüklenir** — `loadDecimatedHero` "modelde iskeletli ağ yok" diye
  reddeder (tezgahta ölçüldü).

### ⑨ ÖLÜM ARTIK PATLAMA DEĞİL, ÇÖKÜŞ
Kullanıcı teşhisi: *"hangi karakter olursa olsun ölünce patlama efekti oluyor,
iyi durmuyor."* Doğruydu: ölüm mührü ortak isabet katmanının **kademe 2**'siydi
(`spawnHit tier 2`) — kritik vuruş ve alan hasarıyla AYNI dili konuşan geniş
katkısal halka. Her ölümde çakması onu olay olmaktan çıkarıp gürültüye
çeviriyordu, üstelik ölen şeyin nereye gittiğini anlatmıyordu. Yerine:
- **CESET ÇÖKÜŞÜ** (`render3d.enemyDeath`): model slotu düşmandan KOPAR ama
  0,5 sn daha yaşar; gövde darbenin geldiği yöne devrilir, ezilir ve zemine
  gömülerek kaybolur. Görünmezliği sağlayan şey solma DEĞİL (şeffaflık =
  sıralama sorunu + fillrate), **opak zemin düzlemi onu keser.** Yeni mesh,
  materyal, çizim çağrısı YOK.
- Devrilme yönü GÖVDEYE GÖRE hesaplanır (`hurtAng − yaw`), yoksa yandan gelen
  vuruşta ceset öne devrilir. `hurtAng` daha önce hiç YAZILMIYORDU — ölüm
  mührü her zaman açı 0 ile çiziliyordu, "vuruş nereden geldi" sessizce kayıp.
- **Ceset OYNANIŞA DOKUNMAZ**: düşman nesnesi havuza döndü. "Ölen düşman biraz
  daha yaşasın" diye oyun mantığına ölüm durumu eklemek hedefleme, çarpışma,
  ganimet, canlı tavanı ve dalga akışını birden kirletirdi.
- **EKRAN DIŞINDA ÇÖKÜŞ YOK** ve **patlayarak ölen ceset bırakmaz**: görünmeyen
  ceset yarım saniye model slotu ve gölge yuvası tutar, yani oyuncunun GÖRDÜĞÜ
  düşmanlar kapsüle düşer (isabet katmanının görüş kapısıyla aynı gerekçe).
- Ömür 0,5 sn ÖLÇÜLMÜŞ takas: altında hareket okunmuyor, üstünde kalabalıkta
  cesetler yaşayan düşmanların modelini çalıyor.
- Partikül: 15 → 9 ve additive olan yalnız 5'i (yukarı süzülen ruh zerresi).
  **Patlama dışa savurur, ölüm YUKARI süzülür** — fark tam olarak bu.

### ⑩ VURUŞ HİSSİ: IŞIK YETMEZ, KÜTLE GEREKİR
Vuruşun 3B'de yalnız ışık karşılığı vardı (flaş + kesik + halka), gövde hiç
tepki vermiyordu. İki kanal eklendi, ikisi de bedava (matris zaten her karede
yazılıyor): **ezilme** (dikeyde %14 sıkışma + yatayda %8 genişleme — sadece
küçülmek "uzaklaşıyor" gibi görünür) ve **geri tepme** (darbe yönünde 5 birim).
Süre 0,13-0,18 sn: daha uzunu hızlı silahlarda sürekli titreyen "lastik" gövde
üretir. Ayrıca darbe doğrultusunda 2-3 **kıvılcım çipi** (dairesel değil YÖNLÜ
— patlama ile karışmaz).

### Sıradaki
Kalan beş dünya (katedral · hiçlik · gökada · kemik bahçesi · gök çarkı) hâlâ
kapsül çiziyor; kadro tablosu ve boru hattı hazır. Yeni model eklerken sıra:
offline sadeleştirme → `_newenemytest` (üçgen · doku · parlaklık oranı) →
`_facetest` (yawFix) → kayıt → roster.


---

## MODEL ÖLÇÜSÜ: BOY · ZEMİN · MERKEZ (2026-08-30) — `_fittest.html`

Kullanıcı teşhisi: *"bazı karakterler orantısız, ayakları yere tam basmıyor,
tuzla mapinde koşucular orantısız koşuyor, hitbox'ları apayrı ilerliyor."*
Dört ayrı belirti, **tek kök hata: ölçüler BİND POZUNDAN okunuyordu.**

`Box3.setFromObject` deri çözdürmeyi (skinning) UYGULAMAZ — geometrinin bind
kutusunu döndürür. Tripo ihraçlarının bind pozu bir duruş değildir (kollar
açık, dört ayaklılar geriş), yani o kutudan türetilen her sayı yanlıştı:

| belirti | sebep | çözüm |
|---|---|---|
| orantısız boy | boy bind kutusundan bölünüyordu | boy klibin 12 karesinden ölçülür |
| ayak havada / gömülü | kutunun altı ayak tabanı değil | minY = ayağın döngüde indiği en alçak nokta |
| **hitbox apayrı ilerliyor** | **XZ HİÇ merkezlenmiyordu** | süpürülen hacmin XZ merkezi sıfıra alınır |
| yerinde durmuyor | kök hareketi sökülmüyordu | iskelet kökü ÖLÇÜLEREK bulunur |

`SkinnedMesh.computeBoundingBox()` kemik dönüşümünü uygular; ölçüm yalnız İLK
slotta yapılır (diğerleri kopyası) ve tüm slotlara yazılır — **kare başına
maliyet SIFIR**. Ölçülen sonuç: on altı modelde `minY = 0,00` ve merkez
kayması `0,00`, boy hedefle birebir.

**XZ merkezlemesi boss yükleyicisinde VARDI, düşman yükleyicisinde YOKTU.**
Aynı işi yapan iki yol ayrı yazıldığında biri sessizce eksik kalır.

### KÖK KEMİĞİN ADI SORULMAZ, YERİ SORULUR
`rootBones` elle yazılmış bir ad listesiydi ve Tripo kökü `tripo::Root`
diyor; three.js düğüm adlarını sanitize ediyor (`tripo__Root`), yani listenin
İKİ yazımı da içermesi gerekiyordu ve kadronun yarısında unutulmuştu — o
modellerde kök hareketi hiç sökülmedi. Artık **bone ebeveyni bone OLMAYAN her
kemik kök sayılır**, adı ne olursa olsun; liste yalnız yedek.

### ÖLÇÜTÜN KENDİSİ DE ÖLÇÜLÜR
İlk oran ölçütü **boy ÷ yarıçap** (bant 3,2-5,6) idi ve iki yönde de yanıldı:
ince büyücüleri kırmızı yaptı (uzun ama daireye oturuyorlar) ve kullanıcının
ŞİKÂYET ETTİĞİ tuz koşucusunu **yeşil verdi**. Orantısızlık boydan değil
**TABANDAN** gelir. Yeni ölçüt `taban ÷ çarpışma çapı`, bant **1,15-2,45** ve
bant ölçümle gerekçeli: shipped mezarlık kadrosu 1,21-2,36 ve kullanıcı onu
kabul etti. O ölçütle dört model dışarıda çıktı:
koşucu **2,97** · buz ayısı 2,67 · batak yaratığı 2,60 · batak devi 2,55.

**HITBOX MODELE UYDURULUR, MODEL HITBOX'A KÜÇÜLTÜLMEZ.** Koşucunun tek
düzeltmesi boyu kesmek olsaydı tuz böceğinin (46) hemen üstüne düşüp "en hızlı"
silueti silinirdi; `patlayici` yarıçapı 15 → **19** yükseltildi (o tip yalnız
tuzlada yaşıyor, yani başka dünyanın dengesine dokunmaz) ve boy 72 → 66.
Büyüyen hedef patlayıcıyı vurup durdurmayı KOLAYLAŞTIRIR — adalet yönünde.
Paylaşılan tipler (`zombi`/`muhafiz`, beş dünyada ortak) yarıçapla
ayarlanamaz; onlarda tek kol boydur: batak yaratığı 80→74 · batak devi
114→106 (gölge 17→19) · buz ayısı 86→76 (gölge 18→21).

### Tuzak: kaçış dizisi düz metin olarak yazılırsa yorum satırı dosyayı kırar
Bir düzenlemede `\n` kaçışı çözülmeden dosyaya girdi; `*/` kapanışından
SONRA kalan `\n` metni `Invalid or unexpected token` verdi ve **tüm oyun
açılmadı**. Yorum içindeki kaçış dizileri zararsız görünür — kapanıştan sonraki
tek bir tanesi modülü tamamen öldürür.


---

## TEHLİKE ALANI: İKİ DÜZELTME (2026-08-30)

### `Pool` TAVANI YUMUŞAKTIR — ÖLÇÜLDÜ, VARSAYILMADI
Tehlike alanı havuzu 12 tavanla kuruldu ve "fazlası sessizce düşer, görünmeyen
alan hasar da vermez" diye yorumlandı. **Yanlış:** `Pool` dolduğunda yeni
nesne üretip BÜYÜYOR (ölçüm: 20 istek → 16 aktif). Görsel mesh sayısı sabit
olduğu için tavanı aşan alan **GÖRÜNMEDEN hasar veriyordu** — projenin kendi
"uyarısız alan hasarı yasak" kuralının ihlali, hem de o kuralı yazan turda.

Artık tek kapı var (`main.spawnHazard`): doluysa YENİ istek reddedilir, eski
alan İPTAL EDİLMEZ — telegrafı çizilmiş, oyuncunun kaçmaya başladığı bir alanı
yenisi için söndürmek okunan sözü bozmaktır. Ölçüm: 20 istek → 12 kabul, 12
aktif, 12 görünür, **görünmeyen hasar veren 0**.

`HAZARD_CAP` (config) havuz tavanını VE mesh sayısını birlikte türetir. İkisi
ayrı yazılıydı ve ayrıştı (14 havuz / 8 mesh) — `waveDuration` tuzağının
birebir aynısı.

### ZEHİR GÖLÜ İKİNCİ YUVA AÇMAZ: AYNI ALAN İKİ FAZLI YAŞAR
`obtain` iki argümanı (`poisonDur`/`poisonDmg`) sessizce düşürüyordu: reset
imzası onları almıyordu, dolayısıyla `kind === 1` dalı ve yeşil gölet görseli
**ulaşılamaz ölü koddu** — ejderin bombası patlıyor ama arkasında zehir
kalmıyordu.

Çözüm ikinci bir alan doğurmak DEĞİL: patlamadan sonra aynı yuva `kind 1`'e
geçer (saat sıfırlanır, hasar `pdmg`'ye, süre `pdur`'a döner). İki sebeple:
iterasyon sırasında aynı havuza `obtain` etmek kırılgandır, ve üç bombalık
salvo yuva ihtiyacını ikiye katlardı. Ölçülen akış: `k0 d26` (telegraf) →
0,85 sn'de patlama → `k1 dur3,4 d9` (yarım saniyelik tik).

### Havuz nesnesinin ALANLARI FABRİKADA tanımlanır
Ceset çöküşü `dead`/`deadAng`/`_hs` alanlarını ilk ölümde ekliyordu: her
karede gezilen (`if (!(p.dead > 0)) continue`) nesnelerin hidden class'ı koşu
ortasında değişir — `isPet` dersinin aynısı. Üçü de slot literaline taşındı.

---

## YERLEŞİM REVİZYONU (2026-08-30) — `_placetest.html`

Kullanıcının teşhisi dört maddeydi: *"yolun ortasında ışıklandırma direği /
sütun durmasın", "mezarlık çitleri düzgün düzenli olsun, bir giriş bir çıkış
olsun", "bir evin etrafında mantıklı şeyler dursun", "objelerin sıklığı
azalsın"*. Dördü de MODEL hatası değil KOMPOZİSYON hatasıydı ve dördü de
mevcut iki tezgahta (`_hdtest` adet+erişim, `_proptest` renk+siluet) YEŞİL
görünüyordu — ölçüm doğruydu, ÖLÇÜT yoktu.

### ① YOL VERİSİ ARTIK PAYLAŞILIYOR (koridor kaydı)
`floor()` yolu boyuyor, `props()` nesneyi diziyordu ve **ikisi birbirini hiç
görmüyordu**. Sonuç ölçülebilir hâle gelince görüldü: kervan izinin ortasında
kilometre taşı, iskele kalasının ÜSTÜNDE direk (direk ±0,020 birimde, kalas
yarı genişliği 0,013), gök çarkının sekiz kolunun tamamında dişli.

Her plan artık ilk iş olarak koridorlarını bildirir — `A.path` · `A.ringPath`
· `A.spokePath` · `A.area` · `A.zone` — ve değerler `floor()`un okuduğu AYNI
`L` sabitlerinden gelir. `add()` koridora giren nesneyi reddeder.
- **`A.path` boyacının EĞRİSİNİ örnekler.** `K.road` düz kırık çizgi çizmez;
  ara noktaları kontrol noktası yapıp orta noktalardan geçen quadratic eğri
  çizer. İlk sürüm düz kiriş kaydetti ve panelde kül çukurlarının zikzak
  yolunda koridor boyalı yoldan saptı.
- **İstisna elle yazılır** (`onPath: true`): kemer kapı yolun üstünde durur —
  kapı odur. Bu yüzden `PROP_TYPES.kemerkapi.pass = true` (çarpışmasız üst
  yapı): hx 62 ile konan kemer 124 birimlik bir DUVAR olur ve tam geçit olması
  gereken yeri kapatır. Dört haritada giriş kapısı fiilen tıkalıydı. "Görsel =
  çarpışma" kuralından bilerek sapıldı; eksene hizalı TEK kutu bir kemerin İKİ
  AYAĞINI ifade edemez.
- **Kutu × koridor testi kutu-DAİREDİR.** Çevrel daire (hypot(hx,hz)) yol
  kenarındaki EVİ yasaklıyordu; genişletilmiş AABB ise köşelerde yalancı çarpma
  üretip mezarlığın şapelini ve kemikhanesini sessizce siliyordu (haritanın iki
  işaret yapısı hiç doğmuyordu). Doğrusu: kutuya en yakın nokta ile koridor
  örneği arası uzaklık < r.
- **SIRA DAMGASI zorunlu.** Koridor SONRAKİ yerleşimleri kısıtlar. Kapı ağzı
  koridoru çitten ve avludaki evden sonra kaydedilir; geriye dönük denetim
  bunları "yol üstünde" sayıp yalancı ihlal üretti (ev×1, çit×4). Prop ve
  koridor aynı sayaçla damgalanır.

### ② ÇİT BİR ÇEVREDİR — `A.enclosure`
Eski `rect`, `gates:[1,2]` ile DÖRT kenarda `(gate+s)%n` indeksini atlıyordu:
ne giriş ne çıkış, sadece delikli bir çit. Yeni yol segmentleri uç uca ve DİK
dizer, yalnız `entry` + `exit` kenarında birer ağız açar (segment sayısı o
kenarda TEK'e yuvarlanır ki kapı ortaya gelsin), ağzın iki yanına söve koyar ve
ağzı koridor olarak korur.
- **Kapı ağzı koridoru 0,54w değil 0,40w.** 0,54w koridoru kapının kilit komşu
  segmentlerine taşıyor ve her kapıda iki yalancı ihlal üretiyordu.
- **±3° rastgele sallantı artık yalnız SÜSTE.** Koşulsuz sallantı, uç uca
  dizilmiş çit zincirini testere dişine çeviriyordu (segment başına ~2°; on
  segmentte göz bunu "eğri çit" okur). Yapılmış olan şey `exact` ya da tip
  tablosunda `built` ile dik durur; sallantı moloza, fıçıya, kemiğe kalır.
- **Ağız ölçütü 96 px** (oyuncu çapı 38). İlk yazılan 160, İKİ KUTU arası
  merkez aralığı ölçütünden kopyalanmıştı — boşluk ölçüsü değil.

### ③ BİR YAPI TEK BAŞINA KONMAZ — `A.homestead`
Ev konuyor, odun/fıçı/kızak ise ±0,05 birim ötede rastgele bir yöne
düşüyordu: kapının önüne, çatının altına, komşunun avlusuna. Artık kapı yönü
(`face`), kapı önü sahanlığı (KORİDOR, boş kalır), servis nesnelerinin duvara
yaslı yerleri ve kapı feneri birlikte kurulur; avlu çiti istenirse tek
giriş/tek çıkışla gelir.

### ④ SIKLIK 208 → 97 (ortalama), ama 90'ın ALTI da hata
İlk seyreltme turu 56-92'ye düştü ve bu "boş" okunur: engel bir süs değil
TOPOGRAFYADIR. Alt sınır ölçümle gerekçelendirildi: ~90 engel / 16 M px² saha
= engel başına ~410×410 px, yani ekranın her üçte birinde bir siper. Bant
85-165. Kaldırılan en büyük yığın tuzlanın havuz ızgarasıydı: dokuz havuzu tek
tek `rect` ile çevirmek 90 alçak duvar demekti (haritanın yarısı) ve tuzlanın
kendisi görünmüyordu — setlerin çizimi zemine pişer, hacim üç sırtta yaşar.

### ÖDÜL VE HEDEF KAYBOLMAZ (spiral kaydırma)
`sandik` ve `yuva` doğrudan çağrıda reddedilirse küçük bir spiralle kaydırılır
(sandık 0,070 · yuva 0,264 birim). Sebep: kutunun içinden kart/mıknatıs/can
çıkıyor, yuva ise görevin kendisi. Üreticilerin (`ringN`/`scatter`) reddi
kurtarılmaz — o ret dizilimi oturtan mekanizmadır.
**Ölçüm dersi:** ilk sürüm İLK denemeyi de rej'e sayıyordu ve tezgah "yuva×31
reddedildi" diye kırmızı yanıyordu; üç yuva da doğmuştu, yalnız kaydırılmıştı.
Kurtarma denemesi kayıp DEĞİLDİR.

### DOKU: ÜÇ DÜZLEMLİ UV + ORTALAMASI KİLİTLİ GREN
Kullanıcı "bazı objelerde doku bozuklukları var" dedi ve haklıydı: UV
`((x+z)/58, y/58)` idi, yani ÜST yüzlerde ikinci koordinat sabit kalıyor
(o yüzey boyunca y değişmez) ve gren tek eksende SONSUZA UZUYORDU — mezar
taşının, lahit kapağının, çatının üstünde doku "taranmış çizgiler" halinde
akıyordu; normali (1,0,1) doğrultusundaki yan yüzlerde aynı sıvanma 90° dönmüş
halde tekrar ediyordu. Artık yüz başına BASKIN NORMALE göre tek düzlem seçilir
(pişirme anında, çizim maliyeti sıfır, gren ölçeği aynı).
Gren dokusu 256² → 512² ve iki frekans bandı (1-2 px konfeti + 4-9 px leke +
lif): yakın planda 0,7 texel/px ile bulanık kalıyordu. **Ortalama artık
ölçülüp 242'ye kilitleniyor** — önceki sürümde çizim sabitlerinden UMULUYORDU,
yani leke sayısını değiştiren biri bütün paleti (`_proptest`te 45-95 farkı
bandı) sessizce kaydırırdı. Anizotropi 4 → 8 (44° eğik bakış).

### Tezgah: `game/_placetest.html` (~60-90 sn)
Beş ölçüt: adet 85-165 · koridor ihlali = 0 · pri 0 çıpa reddi = 0 · her
çevrenin TAM İKİ ağzı + ağız ≥ 96 px · erişilebilirlik ≥ %97.
**② kendi kendini doğrulamaz, panel bu yüzden var:** koridor listesi
yerleşimin kendi bildirimidir, ölçüm yalnız "reddetme çalışıyor mu" der.
Bildirimin BOYALI yola oturduğu göz işidir — panel makro dokuyu çizer,
koridorları camgöbeği, nesne kutularını beyaz, çit ağızlarını sarı gösterir.

Ölçülen son durum (on haritanın tamamı bantta): adet 89-104 (ort 97) ·
koridor ihlali 0 · çıpa reddi 0 · erişim %100 · koridorun kapladığı alan
%5,6-28,7 (çark ve mezarlık bilerek yol ağırlıklı) · pişirme 16-36 ms.


---

## KADRO ÖLÇEĞİ + PREMİUM MALZEME (2026-09-02) — `charLook.js` · `_charlooktest.html`

Kullanıcının teşhisi: *"karakter modelleri internet oyunu gibi, minimalist
duruyor; daha büyük ve daha telefon oyunu gibi olmalı, dokusu da."* Ölçüldü,
teşhis doğruydu ve iki ayrı sebebi vardı (ölçek + malzeme). Tezgah:
`game/_charlooktest.html` — oyunun KENDİ kamerası (FOV 28, 44° eğim, merkezde
1 birim ≈ 1 px), KENDİ altı ışığı ve KENDİ yükleme yolu.

**EKRAN ORANI BOYDAN OKUNMAZ — cos(TILT) İLE OKUNUR.** İlk hesap "76 birim /
720 px = %10,5" diyordu; kamera 44° eğik olduğu için dikey dünya ekseni ekrana
**cos44° = 0,72** ile düşer, yani gerçek oran **%7,4** (ölçülen 55 px). Bir
oran, izdüşümü hesaba katmadan yazılamaz — tahmin %40 yanılmıştı.
`CHAR_SCALE = 1.20`: kahraman 76 → 91 birim, 55 → 66 px (%9,2).

**ÇARPAN TEK YERDE DURUR, TABLOLARA ELLE DOKUNULMAZ.** `scaleCharTable` dört
tabloyu (kahraman · dünya düşmanları · iki boss kaydı) yüklenme anında çevirir;
türetilmiş her ölçü (can barı `__mdlTop`, batma derinliği, `_bossTopY`, gölge
yarıçapı) tablodan okuduğu için kendiliğinden hizalanır. Otuz küsur sayıya elle
dokunmak boy HİYERARŞİSİNİ (kahraman < hortlak < büyücü < muhafız < kral <
boss) her yeni düşmanda yeniden bozar. **Çarpışma yarıçapları
(`ENEMY_TYPES.radius`) DEĞİŞMEZ:** bu paso görseldir, dengeye dokunmaz.

**BOSS'A AYRI ÇARPAN YAZMAK HİYERARŞİYİ ÇÖKERTİYORDU.** İlk denemede boss 1.07
alıyordu ("ekranı yutmasın"): İSKELET KRAL 126 → 151, boss 150 → 160, yani
oyuncunun can barı okumadan tehdit ayırt etmesinin tek yolu olan boy farkı
9 birime iniyordu. Tek çarpan (1.20) oranları birebir korur.

**MALZEME: KENAR IŞIĞI BİR SHADER SATIRIDIR, YENİ IŞIK DEĞİL.** Tripo ihraçları
roughness 0,9 ile gelir ve sahnede env map YOK → formu tanımlayan hiç parlama
olmaz, figür koyu zeminde YASSI okunur. Paso: pürüz kelepçesi 0,48 · fresnel
kenar ışığı (`onBeforeCompile`, tek materyal, ek doku okuması bile yok) ·
anizotropi 8 (44° eğik bakış — v17'nin sandık dersi). Post-processing yok,
gölge haritası yok, yeni ışık yok.
Ölçülen figür/zemin: sapancı 0,75 → 1,13 · Seher 1,05 → 1,43 · Kaptan
1,38 → 1,76. Ortalama parlaklık +17.

**`onBeforeCompile` PROGRAM ANAHTARINA GİRMEZ.** three, shader'a elle yapılan
değişikliği program önbelleği anahtarına KATMAZ: `customProgramCacheKey`
yazılmazsa aynı parametreli başka bir materyalin derlenmiş programı yeniden
kullanılır ve kenar ışığı bazı modellerde HİÇ görünmez.

**ALBEDO PASOSU PARLAKLIĞI ÖDEMEZ (ölçüldü, varsayılmadı).** `punchAlbedo`
pişirme anında çalışır (heroModel → IndexedDB, sahada kare başına maliyet
sıfır): değer netleştirme + kroma + orta ton S eğrisi + derin gölge. İlk sürüm
SAPANCI dokusunun ortalamasını **63 → 56** düşürüyordu, yani kontrast
kazanılırken okunurluk kaybediliyor ve kadronun karanlıkta ayrışması için var
olan `lift` sistemine ters çalışıyordu. Paso artık kendi ortalamasını kaynakla
eşitliyor (kelepçe 0,92-1,25): **ort. 63 → 63 · doygunluk 0,453 → 0,488 ·
yerel kontrast 37,4 → 49,0.** Önbellek sürümü paso PARAMETRESİ değişince de
artar (FORMAT 11 → 13), yoksa ara sürümle pişmiş doku cihazda sessizce kalır.

### TEZGAHIN İKİ YANLIŞ POZİTİFİ (ikisi de bu dosyada zaten yazılıydı)
- **`SkeletonUtils.clone` MATERYALİ KLONLAMAZ, PAYLAŞIR.** İki paneli aynı
  modelden kurup birine eski birine yeni ayarı uygulamak İKİSİNİ DE yeni yapar:
  tablo "eski = yeni" okuyordu ve paso çalışmıyor sanıldı. Tezgah artık
  materyalleri açıkça klonluyor. Oyunda sorun değil — kahraman materyali
  önbellekteki modelde bir kez pasodan geçer, düşman havuzu klonladıktan SONRA
  uygular.
- **DOKU ÇÖZÜMLENMEDEN ÇİZİLEN FİGÜR SİYAHTIR** (`_lodtest` dersinin tekrarı):
  önbellek yolu dokuyu `new Image()` + `onload` ile kurar; beklemeyen tezgah
  yarışın sonucunu ölçer, kodun değil.
- **GÖRECELİ ÖLÇÜT YANILTIR:** "kenar ışığı kaplaması" gövde ortalamasına göre
  eşiklendiği için paso gövdeyi de aydınlattığında kolon DÜŞÜYORDU. Pasonun
  uygulandığının kanıtı `mat.__rimApplied` + parlaklık/figür-zemin artışı.

### Sıradaki (kullanıcı onayına bağlı, YAPILMADI)
Kahramana (yalnız kahraman + yalnız `high` kademe) albedodan pişirilmiş
**detay normal haritası**: modellerin hiç normal haritası yok, "yassı" hissin
kalan yarısı bu. Bedeli tek ekstra doku okuması ve ~1 MB VRAM; modelli
düşmanlara AÇILMAZ (aynı anda 52 tanesi çizilir, mobil fillrate).

---

## PROFİL FOTOĞRAFLARI — OYUNSU PORTRE PASOSU (2026-09-02, ONAY BEKLİYOR)

Kullanıcı: *"karakterler sekmesindeki profil fotoğraflarından yola çıkarak
biraz daha Clash Royale gibi oyunumsu olmalı, ama şu anki kalitede; şekiller
ile birleştirilmiş karakter görünümleri istemiyorum."*

- **KAYNAK SANATTA ALFA YOK** (ölçüldü: dokuz portrenin hepsi tam opak, arka
  planları birer SAHNE — orman, kale, kristal salon). Yani "kes-yapıştır"
  yolu kapalı; kesme denemesi şapka/taç/saç kaybettirir. Paso bu yüzden
  BASTIRIR, KESMEZ: kenardan bölge büyütme (flood) + oval kapı + yumuşatma
  ile bir AĞIRLIK maskesi üretilir, arka plan o ağırlıkla bulanıklaştırılıp
  koyulaştırılır ve nadirlik gradyanına karıştırılır. Maske figürün içine
  sızarsa sonuç koyulaşır, DELİK AÇILMAZ.
- **KADRAJ + IZGARA TEK BAŞINA YETMEZ, SET TUTARLILIĞI GEREKİR:** dokuz sanat
  üç ayrı üslupta (anime · gerçekçi · 3B render). Portreleri "oyun kadrosu"
  yapan şey üslup değil ORTAK SUNUM: aynı büst kadrajı, aynı ayrık ton
  (gölge soğuk / ışık sıcak), aynı nadirlik ışığı, aynı vinyet, siluette aynı
  koyu kontur + üst kenar ışığı.
- Kartlar zaten `HERO_ART` (tam boy) okuyordu, `PORTRAIT_ART` büstleri
  görmezden geliyordu — pişmiş portre bu ikiliği de bitirir (tek dosya,
  `assets/portraits/pfp/<id>_<yorum>.png`).
- Üç yorum gerçek kart ölçüsünde basıldı (`game/_pfp_sade|toon|madalyon.html`)
  ve ONAY İÇİN SUNULDU: ① sahne söndü ② oyun boyası (ışık bantları + kalın
  kontur) ③ gümüş madalyon. Seçilen yorum `ui.js` PORTRAIT_ART/HERO_ART
  tablolarına yazılacak; `drawCharPortrait` vektör yolu (kullanıcının
  "şekillerle birleştirilmiş" dediği şey) o zaman tamamen ölür.

---

## PORTRE PASOLARI GERİ ALINDI (2026-09-04, v24)

Kullanıcı: *"karakter profil fotoğrafı tasarımlarını hiç beğenmedim, çok kötü
oldular, kırpılmış kaldılar; en eski haline döndürelim."* pfp · pfp2 · pfp3 ·
pfp4 turlarının tamamı ekrandan çekildi: `ui.cardPortrait()` artık tek satırda
`null` döner, `charArt()` yine kaynak illüstrasyonu (`HERO_ART`) verir, v21 ·
v22 · v22b CSS blokları silindi.

- **BİR TUR GERİ ALINIRKEN O TURUN BÜTÜN KALEMLERİ ARANIR.** Yalnız görsel
  KAYNAĞINI eski hâline döndürmek yarım geri alma üretir: v22 kart penceresini
  4:5 yapmış, inceleme şeridinin `object-position` yüzdelerini dikey portreye
  göre yeniden hesaplamış, tören ödül kutusunu 76×95'e çevirmişti. Kare sanat
  o geometriye girince yine kırpılırdı — yani "eski hâl" geometriyi de kapsar.
- Pişmiş setler (`assets/portraits/pfp*`) diskte duruyor, hiçbir yerden
  okunmuyor. Dört tur emeğin dersi ölçülebilir tek cümlede: **kaynak sanatın
  sahnesi varsa onu kesmek/gömmek bir SUNUM sorunu değil, KAYNAK sorunudur** —
  doğru çözüm sanatı sahnesiz istemektir, dokuz kaynağı dokuz kez onarmak
  değil.

---

## SAHA NESNELERİ — "ŞEKİLLER YAPIŞTIRILMIŞ" PASOSU (2026-09-05, v25)
### `game/propModels.js` · yeni tezgâh `game/_treetest.html`

Kullanıcı: *"haritalar içerisindeki ağaçlar vs. çok amatörce duruyor, şekilleri
birleştirmişiz gibi."* Ekran görüntüsü GÖNDERİLDİ ve suçlu birebir bulundu:
`dikilitas`. Gövde `cone4` ile kuruluydu, yani **104 birimde bir NOKTAYA
yakınsıyor**, sonra 124'te İKİNCİ bir sivri uç (piramidyon) onun üstüne
konuyordu. Ekranda görülen "çubuğa yapıştırılmış külah" tam olarak bu.

- **DOĞRU SORU "KAÇ POLİGON" DEĞİL, "SİLUET VE BİRLEŞİM".** Üç kusur birlikte
  "yapıştırılmış" hissini üretir: ① makine kusursuz profil (düz kenar, tam
  simetri), ② çap değişiminde uç uca gelen SERT ÇEMBER, ③ parça başına tek düz
  değer. Üçü de doku çözünürlüğüyle, renkle veya üçgen sayısıyla düzelmez.
- **ÜÇ KURAL (`organic` bloğu, propModels.js):** hiçbir parçanın silueti
  bozulmamış primitif olamaz · birleşim BİNDİRİLİR ve bir bilezik/korniş ile
  kapatılır · değer dipten tepeye rampalanır. Bozunum açıya ve yüksekliğe
  bağlı iki sinüsten gelir; **açısal frekans TAM SAYI olmak zorunda** (0 ile 2π
  aynı değeri vermeli), yoksa dikişte yarık açılır. Yer değiştirme köşenin
  KENDİ konumundan hesaplandığı için `toNonIndexed` sonrası aynı noktadaki
  kopyalar aynı ofseti alır — hiçbir üçgen kenarı ayrılmaz.
- **MALİYET SIFIR (perf sözleşmesi).** Bozunum pişirme anında, palet başına bir
  kez çalışır; üçgen sayısı, çizim çağrısı ve kare maliyeti DEĞİŞMEZ.
  `computeVertexNormals` non-indexed ağda YÜZ normali verir, yani gölgeleme
  fasetli çıkar — yontulmuş taş / kalın oyun dili tam olarak budur.
- **KONİ DEĞİL KESİK KONİ.** Bir dikilitaşın gövdesi tepede DÜZ biter ve
  piramidyon o düzlükle AYNI genişlikte başlar: siluetin tek kırılma noktası
  vardır, iki değil.
- **BİRLEŞİMİ KAPATTIKTAN SONRA MALZEME SIÇRAMASI AYNI HİSSİ GERİ GETİRİR.**
  Piramidyon `mermer` ile çizilince (parlaklık farkı ~2 kat) tepe "taşın
  üstüne oturtulmuş kristal külah" okundu. Değer rampası AİLE İÇİNDE kalır:
  aynı hex, bir tık açık (`t * 1.24`).
- **BİR UÇ TAHMİN EDİLMEZ, SORULUR (`tipOf`).** Dalcıklar dalın ucuna
  `cos(ang)*len*0.6` ile konuyordu; eğik dallarda tezgâhta HAVADA ASILI
  görüldüler. Dönüşün kendisi (`Euler → Quaternion → (0,len,0)`) sorulur.
- **AYNI SİLUETİ ÜST ÜSTE DİZMEK YAPI DEĞİL DESEN OKUNUR** (terrain
  bölümündeki kural ②'nin 3B karşılığı): çam dört temiz koniyle "üç dondurma
  külahı"ydı. Şimdi beş kat, her katta karşı yöne kaçan ikinci bir öbek,
  katlar %45 binişik, tepe güneş alır.
- **YENİ TEZGÂH `_treetest.html`:** her arketip oyunun kamera açısıyla (44°)
  ÜÇ dönüşte + zeminle çizilir, üçgen ve yükseklik tablodan okunur. Tek dönüş
  yalan söylüyordu: dalcıkların havada olduğu yalnız 137°'de görünüyordu.
- Ölçülen son durum: `agac` 452 üçgen · h158, `cam` 208 · h211, `selvi` 200 ·
  h198, `dikilitas` 92 · h144, `hac` 148 · h82, `mezar` 148 · h75, `cit` 236 ·
  h52, `duvar` 144 · h49, `kupa` 288 · h45 (hepsi 520 bütçesinin altında),
  konsol temiz.

#### İKİNCİ PARTİ — kalabalık arketipler (aynı turda, ölçülerek)

- **HAÇ EN KÖTÜ ÖRNEKTİ** ve iki kere düzeltildi. Kol artık tek parça ve
  gövdenin İÇİNDEN geçiyor; kesişim iri bir göbekle kapanıyor; kol uçlarında
  tabla var. İki ders çıktı:
  · **KESİŞİM NOKTASI HESAPLANIR, GÖZLE KONMAZ.** Gövde LN kadar yatık ve
    kendi TABANI etrafında döndüğü için u yüksekliğindeki merkezi
    (−u·sin LN, 15 + u·cos LN)'e kayar. İlk sürüm bunu atladı, kol havada
    asılı kaldı — `tipOf` dersinin aynısı bir tur sonra tekrar etti.
  · **`rz = π/2` İLE BİRLİKTE `ry = π/4` VERİLEMEZ.** Euler XYZ sırasında
    ikisi bileşince kol eksenden 45° sapıyor; tezgahta çapraz duran çubuk
    buydu. Bir profil dönüşü (kare kesiti elmas yapmak) yatay bir parçada
    KENDİ ekseni etrafında olmak zorunda, dünya Y'sinde değil.
- **DEMİRDE KUSURSUZ DÜZLÜK DOĞRUDUR, KUSURSUZ TEKRAR DEĞİLDİR** (`cit`).
  Dört parmaklık birebir aynı olduğu için çit "kopyala-yapıştır" okunuyordu;
  malzemeyi bozmak yanlış eksendi. Şimdi her parmaklık kendi açısında, biri
  eğilmiş, birinin mızrak ucu kırık — hasar hikâyesi tekrarı kırar.
- **HER BLOK KENDİ YONTUSUNU TAŞIR** (`duvar`): aynı kutu beş kez dizilince
  yıkıntı değil TUĞLA DUVAR okunuyordu. Dip molozu da eklendi — yıkılmış bir
  duvarın taşları bir yere GİDER.
- **BİR MEZAR TAŞI TAM DİK DURMAZ** (`mezar`): eğim gövdeye verilince kemer,
  yazıt ve tabla da o eğik yüzeye TAŞINMAK zorunda (aynı x-kayması hesabı).
- **FIÇI DUVARI TAHTADANDIR** (`kupa`): lathe profiline açısal frekans =
  kenar sayısı (12) ile amp 0,04 verildi; fıçı "dönel kütle" olmaktan çıkıp
  duvarı tahtalı okunuyor.
- **KIRIK KESİT DÜZ OLAMAZ** (`sutunk`): kutu kapak "testereyle kesilmiş"
  okunuyordu; yerine iki eğik bozunmuş parça + dip molozu.
- **KALAN İŞ (sonraki tur):** `ev`, `sapel`, `mahzen`, `heykel`, `lahit`,
  `mihrap`, `plaka`, `kizak`, `buzdiken`, `iskele`, `kayik`, `gemi`, `taht`.
  Yapılar (ev/şapel/mahzen) en görünür olanlar; çatı-gövde birleşimi ve
  saçak (kural ②) oradaki asıl iş.

### ONAYLANMIŞ DENGE PARAMETRELERİ (kullanıcı formu, 2026-09-05)

Bu turda UYGULANMADI, sıradaki denge turunun girdisi:
**zorluk → daha kolay · görev başına 12-15 seviye · görev süresi 5-7 dk ·
efekt dili → DAHA GÖSTERİŞLİ (bol parlama, iz, sarsıntı; Clash Royale şovu).**
Sıra (kullanıcı hepsini seçti, liste sırası korunur): ① saha nesneleri ②
vuruş + skill efektleri ③ denge/exp ④ harita dokusu ⑤ optimizasyon ⑥ ses.
Dikkat: "daha gösterişli" ile perf sözleşmesi çelişmez — parlama emissive ile,
adet `Quality.budget()` ile; post-processing ve gerçek ışık YASAĞI sürüyor.

### v25 — İKİNCİ PARTİ NESNE + GÖSTERİ KATMANI + DENGE (2026-09-05)

#### Nesneler — üçüncü parti (yapılar, tören, kristal, ocak)
`organic` dili kalan bütün arketiplere uygulandı: mezar · lahit · heykel ·
mihrap · taht · kemerkapı · plaka · kütük · fırın · baca · kulübe · totem ·
tuz sütunu · buz dikeni · tuz yığını · ev · şapel · mahzen. Ölçülen dersler:

- **YAPILARDA KUSURSUZ DÜZLÜK DOĞRUDUR** (`cit` dersinin genellemesi): ev,
  şapel ve mahzenin duvarına bozunum UYGULANMADI. Amatör gösteren şey düzlük
  değil, iki kütlenin ARADA HİÇBİR ŞEY OLMADAN buluşmasıydı. Çözüm SAÇAK:
  çatı yüzeyinin altına koyu bir alın tahtası + duvarın tepesine gölge
  kuşağı. Çatı kalınlık kazanır ve gövdeye OTURUR; maliyet iki kutu.
- **KONİ ÖLÇEĞİ YARIÇAPTIR, KUTU ÖLÇEĞİ TAM GENİŞLİKTİR.** İki sözleşme aynı
  çağrıda karışınca mahzenin çatısı 276 birim çıkıyordu (gövde 172, korniş
  192): tezgahta yapı tamamen kayboluyor, ekranda kocaman bir kırmızı piramit
  duruyordu. Bir ölçek biriminin ne anlama geldiği ÇAĞRI BAŞINA kontrol edilir.
- **BİR DÜZELTME TERS UÇA KAÇABİLİR** (`plaka`): amp 0,12 pahlı kutuyu
  yuvarlayıp "şişme yatak" yaptı. Taşın kimliği KESKİN kenardır; bozunum
  yalnız düzlüğü kırar (0,05). Ölçüt 1:1 bakmaktır, parametrenin büyüklüğü değil.
- **AYNI SİLUETİ ÜST ÜSTE DİZMEK DESEN OKUNUR — kristalde de** (`tuzsutun`,
  `buzdiken`): dört eş prizma "plastik oyuncak"tı. Faset korunur (düz yüz
  kristalin kimliği), TEKRAR kırılır: her katta açısal frekans değişir, her
  kat kendi açısında eğik, katlar 2 birim binişik.
- **YONTULAN ŞEY YONTULUR** (`heykel`): düzgün dönel koni "vazo" okunuyordu.
  Pelerin dalgalı, gövde öne eğik. Ayrıca **kollar AŞAĞI düşer, İLERİ
  uzanmaz**: rx 1,15 figürün önünde iki beyaz ÇUBUK üretiyordu (137°'de
  ölçüldü) — ağıt duruşu kolları gövdeye yaklaştırır.
- **PARLAYAN MALZEME KOYU BİR AĞIZ İSTER** (`mihrap`): kor diski kâsenin
  ağzından taşıyordu ve sunağa konmuş bir PUL gibi okunuyordu. Kor artık
  kâsenin İÇİNDE, çevresinde koyu bir halka var.
- **KIRIK, DİKEY DEĞİL DİYAGONALDİR** (`sutunk`): ilk onarım iki dikey koni
  koydu ve tepe "taç yaprağı" okundu (kural ②'nin adıyla yazılı hâli).
  Gerçek kırık yatıktır, bir yanı yüksek, parçalar birbirine biner.
- Ölçülen son durum (`_treetest.html`, 44° · üç dönüş · 1:1): haç 148 · mezar
  148 · lahit 152 · heykel 364 · ev 276 · şapel 296 · mahzen 340 · plaka 32
  üçgen; hepsi 520 bütçesinin altında, konsol temiz.

#### Gösteri katmanı (`main.fxImpact` / `main.fxMuzzle`)
Kullanıcı seçimi: "daha GÖSTERİŞLİ — bol parlama, iz, sarsıntı".

- **GÖSTERİ TEK YERDEN ÇIKAR.** Dokuz karakterin dokuz vuruş efektini ayrı
  ayrı süslemek, aynı oyunda dokuz farklı geri bildirim dili demekti. Tek
  çağrı noktası `combat.applyHit` (kritik yıldızı + halka) ve `weapons.fireGun`
  (namlu alevi) — bir karakter yeni silah kazandığında gösteri kendiliğinden
  gelir.
- **SIKLIK ARTTIKÇA GÖSTERİ AZALIR.** Vuruş saniyede onlarca, ölüm daha
  seyrek, kritik en seyrek. Halka + sarsıntı yalnız seyrek olayda; aksi hâlde
  "bol parlama" değil BEYAZ EKRAN olur.
- **"DAHA GÖSTERİŞLİ" ÖLÇÜLMÜŞ BİR KARARI GEÇERSİZ KILMAZ.** Sıradan ölümün
  patlaması bir önceki turda BİLEREK sökülmüştü (her ölümde çakınca gürültü
  oluyordu). İkisi çelişmez: gösteri sıradan ölüme değil ELİT/BOSS ölümüne
  verildi. Sıklık düştüğü için aynı efekt artık gürültü değil ÖDÜL okunur.
- **NAMLU KONUMU ATIŞIN KENDİ DEĞERİDİR.** İlk sürüm alevi oyuncunun
  merkezine koydu; doğrusu `ox/oy/ang` (topta namlunun ucu) — yoksa alev
  silahın yanında bir yerde patlar.

#### Kaptan topu sesi — `orb` BAYRAĞI SES SEÇİYORDU
- Sebep bir yan bayraktı: `topatar` tanımında `orb: true` var ve weapons.js
  `W.sfx || (W.orb ? 'thunder' : 'shoot')` dalına düşüyordu — Kaptan'ın topu
  ŞİMŞEK'in gök gürültüsünü çalıyordu (0,7 sn testere dişli bas, saniyede
  birkaç kez). **Bir yan bayrağın ses seçmesi kazadır; ses KİMLİKTİR ve açıkça
  yazılır** (`sfx: 'cannon'`). Yeni ses: sivri bileşen yok, tık yok (atk 6 ms),
  700 Hz'de kesilen barut püfü, kuyruk 0,26 sn — üç atış birbirine binmez.
  Yan ateş de aynı sesi çalar; yükü SARSINTI taşır.

#### DENGE — hedefler ilk kez ÖLÇÜLDÜ (`_baltest` ⑧, yeni bölüm)
Kullanıcı onayı: daha kolay · görev başına 12-15 seviye · görev 5-7 dk.

- **YAZILI HEDEF, ÖLÇÜLMEYEN HEDEFTİR.** "12-15 seviye" ve "5-7 dk" bu
  dosyada hedef olarak duruyordu ama hiçbir yerde ölçülmüyordu. Yeni bölüm
  doğum simülasyonunu (⑥) kadro ağırlıklarıyla çarpıp `xpToNext`
  merdiveninde yürüyor. İlk okuma: **seviye 8 → 32, süre 2,7 → 5,0 dk.**
- **PARA ÇARPANI İLERLEME ÇARPANI DEĞİLDİR.** Suçlu bulundu: `collectGem`
  tek değer alıyordu ve çağıran ona `gemMul`ı ÇARPARAK veriyordu. gemMul
  1,00 → 35,42 büyüdüğü için geç dünyalarda koşu XP'si de 35 kat şişiyordu,
  yani oyuncunun build DERİNLİĞİ haritaya göre değişiyordu. Artık iki ayrı
  sayı: para gemMul ile, XP görevin `xpMul`ı ile.
- **NORMALİZASYON KATSAYISI İCAT EDİLMEZ, ÖLÇÜLENİN TERSİ ALINIR.** Para
  ayıklandıktan sonra seviyeyi kaydıran tek değişken düşman ARZIydı
  (density 1,00 → 1,82) ve ölçülen sapma tam bu orandı: `xpMul = 1/density`.
  Aynı sayı iki yerde yaşamaz.
- **DALGA SÜRESİNİ BÜYÜTMEK YANLIŞ EKSENDİ (iki tur).** Sabiti iki kez
  büyüttüm (22+3,4w → 30+4,2w) ve band ikisinde de bağlamadı: dalga SAYISI
  5→9 arasında 1,8 kat değiştiği için dalga başına süre sabit tutulduğunda
  TOPLAM da 1,8 kat değişir — hangi sabit seçilirse seçilsin. Doğrusu hedefi
  ÖNCE yazmak: `waveTime(w, waves)` toplam süreyi (300 + 18·(n−5) sn)
  hedefler ve yükselen ağırlıkla dalgalara böler. Ölçülen: **10 görevin
  hepsi 5,2 – 6,9 dk** (önce 3,8 – 8,0).
- **BİR FONKSİYONUN İMZASI DEĞİŞTİĞİNDE ÇAĞIRAN HER YER GEÇİLİR.**
  `waveTime` artık dalga sayısını ister; `main.waveDuration` ve tezgahın iki
  yeri güncellendi. Geçmemek "5-7 dk" sözleşmesini sessizce eski eğriye
  düşürürdü — bu dosyanın `waveDuration` tuzağı dersinin aynısı.
- **"DAHA KOLAY" İKİ KOLDAN GELİR ve ikisi de ölçülebilir:** dalga başına can
  0,30 → 0,25 (son dalgada ×3,7 → ×2,75), hasar 0,10 → 0,085; ve XP eğrisi
  yumuşatıldı (13·1,26^n → 11·1,235^n) — daha fazla seviye = daha fazla kart
  = hem daha kolay hem daha derin build. **İki istek AYNI kolla karşılanır.**
- **BOSS ÜSSÜ İKİ KADEMEDE ÖLÇÜLDÜ.** `bossHpMul` üssü 0,34 → 0,28 → 0,26:
  düello D1'de 33 sn, D10'da 125 sn (önce 46 / 170). 0,26 ile sayı, o
  fonksiyonun ÜSTÜNDEKİ orijinal tasarım notuna ("D1'de ~33 sn") ölçülerek
  geri geldi.
- **ÖLÇÜT KARŞILAŞTIRILABİLİR ŞEYLERİ KARŞILAŞTIRIR** (⑦ dersinin tekrarı):
  ilk band "bütün görevlerin seviye sayısı eşit olsun" diyordu ve 5 dalgalı
  giriş görevini 8 dalgalı boss göreviyle yan yana koyup kırmızı çiziyordu.
  Bağlayıcı ölçüt AYNI görev indeksinin dünyalar arası bandıdır.
- Ölçülen son durum: G5 seviye bandı **1** (dünyalar arası), tüm kampanya
  bandı 4, görev süreleri 5,2-6,9 dk, seviye 11-15.
- **KAPANMAYAN KIRMIZILAR (ölçüldü, sonraki tura):** ② SAPANCI L5/L1 ×4,71
  (bant 3,0-6,5 ama hedefinden −%18,6 sapıyor) · ④ SAVAŞÇI 1,22 sn ve AYAZ
  1,18 sn tek hedef TTK'sı (iki yakın dövüş kahramanı kadronun en yavaşı) ·
  ⑤ D9-D10 boss düellosu 113/125 sn. Son ikisi aynı kökten geliyor:
  kampanyanın can eğrisi (hpMul 2 → 100) oyuncu gücünün büyümesinden çok
  daha dik ve boss üssü bunun üstüne konan bir yamadır. Bu kökü kesmek
  kullanıcı kararı ister ("10. dünya ne kadar zor olmalı?").

#### v25b — DOĞRULAMA DÜZELTMELERİ (ikisi de kendi derslerimizden)

- **BİR ANA YOL DÜZELTİLDİĞİNDE AYNI FONKSİYONU ÇAĞIRAN YEDEK YOLLAR
  TARANIR.** `collectGem`in normalize edilmiş çağrısı yalnız cevher TOPLAMA
  yoluna yazılmıştı; `spawnGem`in HAVUZ TAŞMA dalı (`g.count > 380` →
  doğrudan `collectGem(value)`) çarpansız kalmıştı, yani bu turda kapatılan
  hata sessizce geri açılmıştı: tavan aşıldığı anda her öldürme 1/xpMul kat
  (10. dünyada ×1,82) fazla XP veriyor ve "seviye bandı = 1" sözleşmesi
  kayıyordu. Tavan tam da acıttığı yerde aşılıyor — tezgah D10·G10'da 1840
  düşman ölçtü. Bu, terrain bölümündeki "aynı yardımcıyı çağıran bütün
  yüzeyler taranır" dersinin mantık karşılığı.
  Taşma yolunda PARA da artık `gemMul` ile çarpılır: taşma oyuncunun hatası
  değil bizim tampon sınırımızdır, ödülü kısmak onu cezalandırmak olurdu.
- **BANDI AŞAN SATIR "AZ AŞMIŞ" DİYE GEÇİLMEZ** (`odun`): bu turda hiç
  dokunulmayan arketip 576 üçgenle 520 bandının üstündeydi. Kütük gövdesi ve
  kesit diski 8 → 6 kenara indi (yatık silindirin üst çizgisi 44°'den zaten
  3-4 faset gösteriyor, sekiz kenarın ikisi hiç görünmüyordu): 432 üçgen,
  on paletin hepsinde bandı aşan satır kalmadı (ölçüldü).
- Not: `spawnGem`in gövdesi bu turda bir imza satırına çökmüş hâlde kalmıştı
  (hatalı bir düzenleme kalıntısı) — geçerli JS ama okunmaz; düzeltildi.

### KAPTAN TOPU SESİ — `orb` BAYRAĞI SES SEÇİYORDU (audio.js · config.js)

Kullanıcı: *"korsanın vuruş efekti çok kötü, silahından şu anki gibi bir ses
çıkmasın; daha yumuşak, rahatsız etmeyen, ama top ile sıktığı belli olsun."*

- **SEBEP BİR YAN BAYRAKTI:** `topatar` tanımında `orb: true` var ve
  `weapons.js` şu dala düşüyordu — `W.sfx || (W.orb ? 'thunder' : 'shoot')`.
  Yani Kaptan'ın topu ŞİMŞEK'in gök gürültüsünü çalıyordu: 0,7 sn testere
  dişli bas + geniş bantlı gürültü, saniyede birkaç kez. **Bir yan bayrağın
  ses seçmesi kazadır; ses KİMLİKTİR ve açıkça yazılır** (`sfx: 'cannon'`).
- Yeni ses (`case 'cannon'`): sivri hiçbir bileşen yok — yumuşak ataklı
  yuvarlak alt darbe (tık YOK, atk 6 ms) + 700 Hz'de kesilen barut püfü +
  namlunun ahşap/demir tokluğu. Kuyruk 0,26 sn: art arda üç atış birbirine
  binmez. Yan ateş (broadside) de aynı sesi çalar — aynı silahın iki atışı
  iki farklı malzeme gibi duyulamaz; yükü SARSINTI taşır.


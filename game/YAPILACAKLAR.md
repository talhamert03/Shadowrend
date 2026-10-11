# Yapılacaklar / Backlog

Durum: **2026-08-29 turunda uygulanan işler ✓ ile işaretli.** Ölçüm
sonuçları CLAUDE.md'nin ilgili bölümlerinde; bantların dışına çıkan
değerler aşağıda "ÖLÇÜLEN AÇIK NOKTALAR" başlığında.

## 1. İsimlendirme ✓ UYGULANDI
- [x] "Kan Taşı" → **"Gem"** · "Kan Yakutu" → **"Altın"**.
      config.js · main.js · ui.js · chests.js · style.css · index.html'deki
      TÜM kullanıcı görünür metinler + ilgili yorumlar çevrildi (63 yer).
      İkon/renk/mekanik aynı; kod içi değişken adları (`stones`, `rubies`)
      bilerek DEĞİŞMEDİ — kayıt anahtarları (`kh_rubies`, `kh_bloodstone`)
      onlara bağlı, yeniden adlandırma kayıt göçü gerektirir ve görünür
      hiçbir kazanç sağlamaz.

## 2. Denge / Zorluk Eğrisi ✓ UYGULANDI (ölçüm: `_baltest.html` ⑥ ⑦)
- [x] Erken dalgalarda doğum sayısı/hızı düşürüldü: 1-3. dalga eğrisi ELLE
      yazıldı (`waveInterval` · `waveBatch`), formül geç dalgaları sürüyor.
- [x] "Nefes penceresi": `RAMP.breathSec` 50 sn + her dalga başında 6 sn
      yumuşama. İlk 60 sn'de doğan düşman **84 → 33** (bant 14-34).
- [x] Dalga içi yığılma: grup aynı karede doğmuyor (`RAMP.spread` 0,09 sn)
      ve GÖRÜŞ ALANI tavanı geldi (`onScreenCap` 22→64, dalgayla büyür).
      Tavan doluyken kuyruk SİLİNİR (biriken borç yığılmanın kendisidir).
- [x] Haritalar arası tutarlılık ölçüldü ve **bir hata bulundu**: `mixOffset`
      yalnız düşman KARIŞIMINI sürmeliyken doğum aralığını + grup boyunu da
      sürüyordu. 10. dünyanın 5. görevinde ilk dalga 21. dalga gibi doğuyor,
      ilk 60 saniyede **609** düşman geliyordu (nefes penceresi orada
      matematiksel olarak yoktu). Ayrıldı → aynı ölçüm **59**.
      Nefes penceresi tutarlılığı (en büyük/en küçük) ×1,79 (bant < ×2,0).
- [x] Dünya→dünya sıçraması ölçütü "eşit olsun"dan "komşusundan sıçramasın"a
      çevrildi; en büyük sıçrama ×2,07 (bant < ×2,4).
- [x] Dinamik zorluk (§4d ile birlikte) — aşağıda.

## 3. Yeni Özellik Fikirleri
- [x] Zafer için ayrı müzik state'i (`music.js` → `STATES.victory`,
      Bb majör, 112 BPM, tonikte kapanır). Ölçüm: `_musictest.html`
      beşinci durum, yirmi ölçütün tamamı bantta.
      **Yenilgi için state EKLENMEDİ ve bu kasıtlı**: ölümde müzik susar;
      yenilgi perdesinin altında çalan her şey anın sessizliğini bozar
      (gerekçe main.gameOver ve STATES.victory yorumunda).
- [ ] Günlük/haftalık görevler → **§4b'de yapıldı** (bu madde onunla aynı iş).
- [ ] Kahraman/silah ustalık (mastery) ilerlemesi.
- [ ] Kayıtlı loadout/build presetleri.
- [ ] Sezonluk skor tablosu / liderlik.
- [ ] Boss mekanik çeşitliliği — zayıf nokta/faz.
- [ ] Harita başına koleksiyon eşyası / başarı rozetleri.
- [ ] İkinci kahraman "yardımcı" sinerjisi.
- [ ] Haftalık rotasyonlu "meydan okuma" modu (sabit tohum + sabit ekipman).

## 4. Oyuncu İlgisi / Retention
- [x] Günlük giriş ödülü (streak) — §4b.
- [ ] Enerji/bilet hatırlatma bildirimi. **Bloke**: WebView'de bildirim
      izni + servis çalışanı push akışı gerekiyor; Play paketi (Faz 05)
      olmadan test edilemez.
- [ ] İlk 10 dakikalık onboarding akışı. Nefes penceresi bunun yarısını
      çözdü (ölçülen: ilk 60 sn 33 düşman); kalan iş METİN/yönlendirme —
      ilk koşuda savuruş menzili · imza silahı · kart seçimi ipuçları.
- [ ] Hafif sosyal kanıt (gerçek veriye dayalı).

## 4b. Premium Görünümlü Etkileşim Sistemleri ✓ UYGULANDI
- [x] **Haftalık görev sistemi** — `dailies.js` + `#screen-quests`.
      Beş görev, beş AYRI oynayış ekseni (öldürme · görev · boss · saha
      görevi · dalga); her görev puan verir, puan üç kademeli **VİTRİN**
      rafını açar (sandık → gem → mistik sandık). Sunum sıradan liste
      değil: kuşak çubuğu + kademe rafı + nadirlik çerçeveleri.
- [x] **Günlük giriş ödülü** — 7 günlük takvim, artan eğri, 7. gün tam
      genişlikte vitrin hücresi. **Telafi hakkı (hafta başına 1)**: bir gün
      kaçırılırsa seri sıfırlanmaz, hak yenir ve oyuncuya YAZILI olarak
      söylenir. Gün ilerlemesi ödül ALINDIĞINDA olur, gün değiştiğinde
      değil — açtığı ama oynamadığı gün oyuncuyu cezalandırmaz.
- [x] Alt giriş: Etkinlikler sayfasının başında `#quest-open` şeridi;
      rozet YALNIZ alınmayı bekleyen bir şey varken yanar.

## 4c. Ses Çeşitliliği ✓ UYGULANDI
- [x] Zafer sesi 3 varyantlı havuz: yükselen fanfar · çan öncüllü plagal
      kapanış · davul çağrısı. Üçü de aynı tonda, aynı uzunlukta, aynı
      YÜKSEKLİKTE — varyasyon karakterde, seviyede değil.
- [x] Genel kural: varyant seçimi artık **rastgele + ardıl tekrar yok**
      (`AudioFX.pick`). Eski sıralı round-robin üç tetikte bir A-B-C deseni
      kuruyordu; kulak deseni öğrenince varyant olmaktan çıkıyor. Bu seçim
      `k` okuyan TÜM sesleri kapsar (vuruş · kritik · savuruş · atış …).
      Sandık açılışının çan yağmuru da üç ayrı dizilişten seçiliyor.

## 4d. Dinamik Zorluk ✓ UYGULANDI
- [x] `config.DYN` — bant 0,78-1,06, ölümde −0,06, zaferde +0,035
      (hasarsız zaferde +0,06). Kalıcı (`meta.dyn`), görünmez, YALNIZ
      doğum baskısına dokunur: düşman canına/hasarına dokunmak oyuncunun
      vuruşunu yalanlar ve denge tezgahını geçersiz kılar.
- [x] **Ölçülen ve düzeltilen tuzak**: çarpan hem gruba hem aralığa TAM
      uygulanınca etkisi KARELİ oluyordu (%36'lık bant sahada %46 fark
      üretti). Karekök paylaşımı geldi (`spawnGap` · `spawnBatch`), bant
      genişliği **%25,7** (ölçüt %6-%35).

## ÖLÇÜLEN AÇIK NOKTALAR (bu turda BULUNDU, düzeltilmedi)
`_baltest.html` hâlâ dokuz hücreyi kırmızı çiziyor ve hepsi bu turdan
ÖNCE de kırmızıydı — sayı değiştirmek yeni bir denge turu ve yeniden
ölçüm demek, o yüzden bilerek dokunulmadı:
- ② Sapancı L5 puanı hedefin **%22,6 altında** (bant ±%9). L5/L1 ×4,24 —
  yani sapan yükseltmek diğer kahramanlar kadar kazandırmıyor.
- ② Ay Okçusu +%12,2 · Gökalev +%12,3 · Kara Kaptan +%9,5 (üçü de üstte).
- ④ Sapancı'nın boss süresi 123 sn (tavan 110).
- ⑤ 7-10. dünyalarda boss süresi 111-163 sn (tavan 110) — kampanyanın
  sonu "hp süngeri" bandında.
Bir sonraki denge turunun gündemi bu beş satırdır.

## 6. KAHRAMAN DENGESİ ✓ UYGULANDI (2026-08-29)

Kullanıcı teşhisi: *"Gökalev ile donmuş (buzul) haritada neredeyse hiç
hasar atamıyorum; nadirliğe göre dengeleyelim."* **Kullanıcı haklıydı,
tezgah yanlıştı.** Eski model Gökalev'i +%12,3 fazla güçlü ölçüyordu;
geometrik model **−%16,2** dedi (L5'te −%46,8).

### Ne değişti (ölçüm: `_baltest.html` ① ② ④ ⑤)
1. **Kalabalık payı tahmin tablosundan GEOMETRİYE çevrildi.** Silah başına
   elle yazılmış tek bir sayı kalmadı; koni/koridor/zincir sorguları
   `arc`/`range`/`pierce`/`speed`/`bulletLife`/`chains` değerlerini
   config'ten okur. Ölçülen: yakın dövüş 3,3-3,9 hedef · mermili 1,7-2,1 ·
   zincir 2,4. Eski model mermiliye 3,0'a kadar veriyordu.
2. **Yakın dövüş kademesi artık MENZİL/YAY değil HASAR satın alıyor.**
   Yay ve menzil kademeyle sabit (küçük menzil artışı kalır). Sebep:
   `range` ve `arc` birlikte büyüyünce kalabalık payı ÇARPIMSAL büyüyordu
   (L5/L1 ×9,2 — bant 3,0-6,5). Yayı kademeyle DARALTMAK yasak sayıldı:
   oyuncuya yükselttikçe kötüleşen bir sayı gösterilmez.
3. **Dokuz imza silahının vuruş hasarı nadirlik merdivenine oturtuldu**
   (adi 1,00 · nadir 1,12 · destan 1,25 · efsane 1,45 + stil primi).
   Az hedefe değen silah vuruş başına daha çok verir — menzilli hasar
   yükseldi (alev 52→83, topatar 55→100, yay 59→101, sapan 34→60),
   yakın dövüş düştü ama yayı daraldığı için bileşik puan korundu.
4. **Dükkân silahlarının L5 kuyruğu kısıldı** (kure 70→37 · tabanca 34→22 ·
   sacma 22→15). Bunlar dokunulmamış ESKİ değerlerdi ama imza hasarları
   yükselince bağıl konumları kaydı: ⑧ paneli üçünü imza medyanının
   ×1,47-1,89 üstünde ölçtü. Sebep, imza silahlarından 2026-08-18'de
   kaldırılan ÇİFT ATIŞIN dükkânda kalması — o gün doğruydu, bugün
   "her kahramanın satın alabildiği tabanca efsane imzayı geçiyor"
   demek oluyordu, yani nadirlik merdivenini kökünden çürütüyordu.
   Şimdi hepsi ×1,00-1,03.
5. **⑤ panelinin ölçüm çubuğu düzeltildi.** Dünya eğrisini destan YAKIN
   DÖVÜŞ kahramanıyla ölçüyordu — yakın dövüşün tek hedef gücü tasarım
   gereği en düşüktür, yani panel dünya eğrisini değil "en kötü arketipin
   boss süresini" ölçüyordu ve her dengelemede kırmızı kalmaya mahkûmdu.
   Artık kadro MEDYANI, yanında en hızlı/en yavaş.

### Ölçülen son durum
| ölçüt | önce | sonra | bant |
|---|---|---|---|
| L1 sapma yayılımı | −28,2% … +33,0% | **−4,5% … +9,4%** | ±%10 |
| L5 sapma yayılımı | −53,3% … +65,2% | **−2,1% … +9,7%** | ±%10 |
| L5/L1 büyümesi | ×3,70 … ×9,18 | **×4,71 … ×6,39** | 3,0-6,5 |
| Gökalev L1 / L5 | +12,3% / −46,8% | **−2,3% / +2,6%** | ±%10 |
| boss süresi (kadro medyanı, D1) | — | 46 sn | < 110 |

### HÂLÂ AÇIK (ölçüldü, bilerek dokunulmadı)
- **SAPANCI L5 −%18,6.** Sebebin bir kısmı MODEL BOŞLUĞU: sapanın
  `bounceLv` (L5'te 2 sekme) geometriye girmedi, yani gerçek kalabalık
  payı ölçülenden yüksek. Hasarı yükseltmek yanlış düzeltme olur —
  sıradaki iş sekmeyi modellemek (riderlarla aynı kuyruk: ayaz halkası
  ×0,30 ve mavi kesik ×0,60 de hâlâ elle yazılı).
- **④ Savaşçı 102 sn · Ayaz 98 sn boss süresi** (tavan 95). Yakın dövüşün
  boss düellosu tasarım gereği en yavaşı; iki değer tavanın hemen üstünde.
- **⑤ Dünya 7-10 boss süresi 116-170 sn** (tavan 110). Bu turdan ÖNCE de
  kırmızıydı ve kahraman dengesinden bağımsız: `bossHpMul` eğrisi geç
  dünyalarda çok dik. Ayrı bir tur — görev süresi (③) ile birlikte
  ölçülmeli, yoksa boss'u kısaltıp görevi uzatmış olursun.

### İKİ YENİ DENETİM (ikisi de gerçek defekt yakaladığı için kalıcı)
- **⑧ DÜKKÂN SİLAHLARI** (+ L5/L1 sütunu). Tezgah yalnız imza silahlarını okuyordu; bu
  turda imza hasarları %20-80 yükseldiği için dükkânın konumu ölçüm
  DIŞINDA kaydı. Ölçüt: dükkân silahı imza medyanını AŞMAZ (≤ ×1,00);
  eşit olması gerekmez — ikincil silah çeşitlilik sunar, üstünlük sunmaz.
- **⑨ AYNI HASAR DİZİSİNİ PAYLAŞAN SİLAHLAR.** Toplu düzenlemede çıplak
  bir dizi literali BİRDEN FAZLA silahla eşleşir. Bu turda oldu: Yemin
  Kılıcı bir tur boyunca Kemik Tabanca ile aynı diziye sahip oldu, sonraki
  iki tur ikisini birden değiştirdi ve dükkân tabancası hiç ölçülmeden
  %32 güçlendi — hiçbir panel kırmızı çıkmadı, çünkü imza olmadığı için
  okunmuyordu bile. **Toplu sayı düzenlemesinde silah id'sini içeren blok
  eşleşmesi kullan, çıplak dizi literali kullanma.**

### AÇIK KARAR: L5/L1 bandı dükkân silahlarına da uygulanacak mı?
⑧ ölçtü: **kure ×8,29 · tabanca ×13,2 · sacma ×9,5** — imza silahları için
"kart bulana kadar acı çek" diye kırmızıya boyanan 3,0-6,5 bandının çok
üstünde. Panelde SARI gösteriliyor (kırmızı değil): karar verilmedi.

Üç seçenek ve bedelleri:
- **(a) Band uygulanır.** Tabancanın ×13'ü hasar eğrisinden gelmiyor —
  bekleme 0,55→0,28 (×1,96) ile L5 **çift atışının** çarpımı. Düzeltmek
  ya çift atışı kaldırmak (imza silahlarından 2026-08-18'de kaldırılmıştı;
  dükkânda bilerek bırakılmıştı) ya bekleme eğrisini düzleştirmek demek —
  ikisi de silahın kimliğine dokunur, ayrı bir tur.
- **(b) Band yalnız imzalara uygulanır.** Gerekçe: dükkân silahı seçim
  değil TAKVİYE; oyuncu onu erken almaz, geç oyunda takar. O zaman düşük
  L1 değeri bir kusur değil, kimliktir.
- **(c) Bandın dükkân sürümü gevşer** (örn. 3,0-9,0), çünkü dükkân silahı
  kart yerine ALTINLA yükseltilir ve altın akışı karttan öngörülebilir.

Karar verilmeden sayı değiştirilmemeli: (a) yolunda çift atışı kaldırmak
üç silahın L5 kalabalık payını da düşürür ve ⑧ oranları ×1,00'dan aşağı
kayar, yani bu turda oturtulan denge yeniden ölçülmek zorunda kalır.

### Sıradaki denge turu için kural
Bir silahın sayısını değiştirdikten sonra ① ② ④ ⑤ birlikte okunur.
**Kesintiyi doğru yere yap:** kalabalık fazlalığı YAY/MENZİL'den kesilir,
tek hedef fazlalığı HASAR'dan. Bu turda bir kez ters yapıldı (hasar
kesildi) ve boss süreleri 112→247 sn'ye çıktı — bileşik puan yeşil
görünürken oyun bozulmuştu.

## 5. Ölçüm Kuralı (mevcut proje disiplini)
- Her denge değişikliğinden sonra `_baltest.html` (① ② ③ ④ ⑤ **⑥ ⑦**).
- Her harita zorluk ayarından sonra `_maptest.html`/`_10maptest.html`.
- Ses/müzik değişikliğinden sonra `_musictest.html` (beş durum).
- "Düzelttim ama ölçüm aynı" → önce modül/cache sürüm etiketi
  (bu turda hepsi `?v=20260829c` + `sw.js` önbellek adı).

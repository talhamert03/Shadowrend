# Shadowrend — Tripo düşman prompt listesi (16 eksik düşman)

Her dünyada üç düşman türü var:

- **Sürü:** Küçük ve hızlı, yakın dövüşçü. Oyunda koşar.
- **Atıcı:** Orta boy, uzaktan saldırır. Oyunda yürür.
- **Muhafız:** İri ve yavaş, dayanıklı. Oyunda yürür.

Bu listede yalnız **eksik** olanlar var. Diğer dünyalardaki modeller zaten hazır.

---

## Adım adım (Tripo web sitesinde, her düşman için)

1. **Text to 3D** sekmesini aç.
2. **Prompt** kutusuna düşmanın İngilizce promptunu yapıştır. Sonuna aşağıdaki **ORTAK EK**'i de ekle.
3. **Negative prompt** kutusu varsa **ORTAK NEGATİF**'i yapıştır.
4. **Model sürümü:** en yenisini seç. **Doku (texture):** açık. **HD doku:** kapalı; kredi harcatır, gerek yok.
5. **Generate** de. Çıkan varyasyonları döndürüp kontrol et:
   - Önden ve arkadan bak. Kol ve bacaklar gövdeye yapışmamış olmalı.
   - Silah ya da asa ele bitişik olmalı, havada ayrı parça kalmamalı.
   - Beğenmezsen aynı promptla bir kez daha üret.
6. Beğendiğinde **Rig / Animate** → **Auto Rig** de.
   - İki ayaklılar için **Biped / Humanoid** seç.
   - "Dört ayaklı" diye işaretlediklerim için **Quadruped** seç.
7. **Animasyon:**
   - **Sürü** düşmanlarına **Run** (koşu).
   - **Atıcı** ve **Muhafız** düşmanlarına **Walk** (yürüme).
   - Tek animasyon yeterli. Saldırı ve ölümü oyun kendisi çiziyor.
8. **Export:**
   - Biçim **GLB**, animasyon dahil.
   - Doku boyutu seçeneği varsa **1024** ya da **2048**.
   - Dosyayı aşağıda verdiğim **dosya adıyla** kaydet (örn. `katedral_cirak.glb`).
9. GLB'leri bu sohbete yükle. Gerisini ben yaparım:
   - Mobil için üçgen azaltma ve doku küçültme.
   - Boyut ve yürüyüş düzeltmesi.
   - Çizgi roman gölgelendirme ve mürekkep kontur.
   - Dünyaya yerleştirme.

İpucu: Bir dünyanın üç düşmanını bitirip birlikte gönderirsen o dünyayı tek seferde oyuna eklerim.

---

## ORTAK EK (her promptun sonuna)

```
full body, standing in a relaxed A-pose with arms slightly away from the body and legs apart, single character, centered, no base, no background, stylized cartoon game character, hand-painted texture, bold saturated flat colors, chunky exaggerated proportions, big readable silhouette from a top-down camera, clean simple shapes, mobile game enemy
```

## ORTAK NEGATİF

```
realistic, photorealistic, multiple characters, pedestal, base, ground plane, floating separate objects, loose particles, smoke, thin wires, transparent parts, cloth tails dragging on ground, text, logo, blurry texture, extra limbs
```

---

## 3 · ZEHİR BATAKLIĞI (renk: zehir turkuazı #59e3c8) — 1 eksik

### Atıcı — Zehir Kurbağası Şamanı · `batak_saman.glb` · iki ayaklı · Walk
```
A hunched swamp toad shaman, humanoid frog creature with a huge bloated throat sac, wide grin and bulging yellow eyes, warty teal and murky green skin, wearing a ragged moss cloak and a necklace of small bones, holding a gnarled wooden staff topped with a glowing toxic green bulb
```

## 4 · KAN KATEDRALİ (renk: vitray moru #9b6cff + koyu kan kırmızısı) — 3 eksik

### Sürü — Kanlı Çırak · `katedral_cirak.glb` · iki ayaklı · Run
```
A gaunt hunched cultist acolyte in a tattered crimson hooded robe, pale grey skin, stitched mouth, glowing violet eyes under the hood, long bony fingers, bare feet, a small rusty iron censer chained to the belt, aggressive forward lean
```

### Atıcı — Vitray Rahibesi · `katedral_rahibe.glb` · iki ayaklı · Walk
```
A tall gothic cathedral priestess in a long dark purple and blood-red habit, face hidden behind a stained-glass mask, a halo made of colorful stained-glass shards attached behind her head, holding an ornate golden censer on a short chain in one hand
```

### Muhafız — Katedral Gargoyle'ü · `katedral_gargoyle.glb` · iki ayaklı · Walk
```
A massive stone gargoyle knight, bulky hunched body of cracked grey cathedral stone, small folded bat wings on its back, horned demonic face, glowing purple runes carved into the chest, carrying a heavy slab-shaped stone shield shaped like a church door
```

## 5 · HİÇLİK TAHTI (renk: soluk fildişi #e8e4d8 + kapkara boşluk) — 2 eksik

### Atıcı — Hiçlik Habercisi · `hiclik_haberci.glb` · iki ayaklı · Walk
```
A tall thin faceless herald in flowing pale ivory robes with gold trim, a smooth black void where the face should be, a crown of jagged black crystal shards attached to the head, holding a long golden scepter topped with a black orb
```

### Muhafız — Taht Muhafızı · `hiclik_muhafiz.glb` · iki ayaklı · Walk
```
A hollow armored knight guardian, heavy pale ivory plate armor with gold edges, the open helmet shows only pitch black emptiness with two small white glowing eyes, broad shoulders, holding a huge tower shield decorated with a throne emblem
```

## 6 · RÜZGÂR BAHÇESİ (renk: badem çiçeği pembesi #ff9ec4 + taze yeşil) — 3 eksik

### Sürü — Bahçe Kuklası · `bahce_kukla.glb` · iki ayaklı · Run
```
A lanky animated garden scarecrow made of twisted almond tree branches and woven twigs, a round clay pot for a head with a carved mischievous grin, pink almond blossoms sprouting from its shoulders and head, long thin arms with twig fingers
```

### Atıcı — Tohum Cücesi · `bahce_cuce.glb` · iki ayaklı · Walk
```
A chubby mischievous garden gnome gardener, oversized pointed hat made of pink flower petals, big white beard, green apron with a bulging seed satchel, holding a glowing seed pod ready to throw, rosy cheeks
```

### Muhafız — Teras Golemi · `bahce_golem.glb` · iki ayaklı · Walk
```
A hulking terrace stone golem made of mossy carved garden stones, a small blossoming pink almond tree growing out of its back, vines wrapped around its massive arms, glowing soft green eyes, heavy boulder fists
```

## 7 · TUZ TABANI (renk: tuz sarısı #ffd68c + beyaz kristal) — 1 eksik

### Atıcı — Tuz Kâhini · `tuz_kahin.glb` · iki ayaklı · Walk
```
A desert nomad mystic wrapped in sand-colored bandages crusted with white salt, large jagged salt crystals growing from the shoulders and back, glowing amber eyes behind a face wrap, holding a staff topped with a big white salt crystal
```

## 9 · KEMİK BAHÇESİ (renk: fildişi sarısı #ffe296 + kemik beyazı) — 3 eksik

### Sürü — Kemik Filizi · `kemik_filiz.glb` · iki ayaklı · Run
```
A small feral skeleton creature sprouting from roots, ribcage wrapped in green vines, tiny yellow flowers growing out of the skull eye sockets, root-like toes, long bony claws, hunched and fast-looking
```

### Atıcı — Kemik Budayıcı · `kemik_budayici.glb` · iki ayaklı · Walk
```
A skeleton gardener wearing a wide frayed straw hat and a patched brown apron, carrying a wicker basket full of small skulls on its back, holding big rusty pruning shears in one hand, grinning skull face
```

### Muhafız — Fildişi Bekçi · `kemik_bekci.glb` · iki ayaklı · Walk
```
A giant guardian built from fused ivory bones, thick bone armor plates on the chest and shoulders, a crown of curved bone antlers, glowing yellow eyes in a large skull head, holding a huge club made of a femur bone
```

## 10 · YILDIZ DÖKÜMHANESİ (renk: yıldız mavisi #7aa6ff + pirinç sarısı) — 3 eksik

### Sürü — Döküm Çırağı · `dokum_cirak.glb` · iki ayaklı · Run
```
A small clockwork automaton, round brass body with rivets, a glowing blue star core visible in the chest, gear joints at the elbows and knees, a single big round glowing lens eye, short stubby legs and long arms
```

### Atıcı — Yıldız Dökümcüsü · `dokum_dokumcu.glb` · iki ayaklı · Walk
```
A cosmic blacksmith in a dark blue hooded robe embroidered with golden constellations, thick leather forge apron, face hidden in shadow with two star-like glowing eyes, holding a large iron ladle filled with glowing blue molten starlight
```

### Muhafız — Çark Muhafızı · `dokum_cark.glb` · iki ayaklı · Walk
```
A bulky brass and dark steel foundry golem, a huge gear embedded in its torso, glowing blue forge heat leaking from chest vents, anvil-shaped fists, small head with a visor slit glowing blue, heavy stomping legs
```

---

## Kredi hesabı (Tripo web)

Web sitesinin kredileri API'den ayrıdır; o yüzden fiyatları web arayüzünde ayrıca kontrol et. Aynı işlem API'de düşman başına yaklaşık 55 kredi tutar: model 20 + iskelet 25 + 1 animasyon 10. 16 düşman yaklaşık 880 kredi eder.

Bütçe yetmezse şu sırayla ilerle:

1. Kan Katedrali
2. Kemik Bahçesi
3. Yıldız Dökümhanesi
4. Rüzgâr Bahçesi
5. Tek eksikli dünyalar

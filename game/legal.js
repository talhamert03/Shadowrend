/* ═══════════════════════════════════════════════════════════
   legal.js — GİZLİLİK POLİTİKASI · KVKK AYDINLATMA METNİ (v44)

   ⚠ Bu metinler yayıncı bilgileri ([…] alanları) doldurulup bir hukukçuya
   okutulmadan YAYINLANMAMALIDIR. Play Console aynı metni herkese açık bir
   URL'de de ister — `APP.privacyUrl` o adrese bağlanır.
   Metin, oyunun BUGÜN yaptığı veri işleme ile birebir tutarlı yazıldı:
   hesap yok, sunucu yok, analitik yok. Reklam/analitik/ödeme eklendiğinde
   ilgili bölüm GÜNCELLENMEK ZORUNDADIR.
   ═══════════════════════════════════════════════════════════ */

export const LEGAL_UPDATED = '24 Eylül 2026';
const PUB = '[Yayıncı unvanı]';
const ADDR = '[Adres]';
const MAIL = 'destek@shadowrend.game';

import { LANG } from './i18n.js?v=20260930m';

const PRIVACY_TR = {
  title: 'GİZLİLİK POLİTİKASI',
  body: `
<p>Shadowrend ("Oyun") ${PUB} tarafından yayımlanır. Bu politika Oyun'un hangi verileri işlediğini, neden işlediğini ve haklarınızı açıklar.</p>
<h4>1. Topladığımız veriler</h4>
<p><b>Oyun ilerlemesi:</b> seviye, kahramanlar, eşyalar, sandıklar, oyun içi para birimleri ve ayarlar. Bu veriler <b>yalnız cihazınızda</b> saklanır.</p>
<p><b>Yaş aralığı:</b> ilk açılışta seçtiğiniz yaş aralığı; yaşa uygun içerik ve satın alma korumaları için cihazınızda tutulur. Doğum tarihiniz saklanmaz.</p>
<p><b>Cihaz kimliği:</b> kayıt bütünlüğünü korumak için rastgele üretilen, kişiyle ilişkilendirilemeyen bir tanımlayıcı. Destek taleplerinde size "Oyuncu Kimliği" olarak gösterilir.</p>
<p><b>Sürüm denetimi:</b> Oyun açılırken güncel sürüm bilgisini sunucumuzdan ister. Bu istek sırasında sunucu kayıtlarında IP adresiniz teknik olarak geçici görülebilir; profil oluşturulmaz.</p>
<h4>2. Toplamadığımız veriler</h4>
<p>Ad, e-posta, telefon, konum, rehber, fotoğraf ve mikrofon verisine erişmeyiz. Reklam kimliğinizi kullanmayız.</p>
<h4>3. Satın almalar</h4>
<p>Uygulama içi satın almalar Google Play / App Store tarafından işlenir; ödeme bilgilerinizi görmeyiz.</p>
<h4>4. Çocuklar</h4>
<p>13 yaş altındaki oyuncular için satın alma ekranları ek onay ister ve kişiselleştirilmiş içerik gösterilmez.</p>
<h4>5. Verilerin silinmesi</h4>
<p>Tüm oyun verileriniz cihazınızdadır; Ayarlar → Kayıt ve Veri bölümünden ya da uygulamayı kaldırarak silebilirsiniz.</p>
<h4>6. İletişim</h4>
<p>${PUB} · ${ADDR} · ${MAIL}</p>
<p class="lg-date">Son güncelleme: ${LEGAL_UPDATED}</p>`,
};

const KVKK_TR = {
  title: 'KVKK AYDINLATMA METNİ',
  body: `
<p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca veri sorumlusu sıfatıyla ${PUB} olarak sizi bilgilendiririz.</p>
<h4>İşlenen veriler ve amaç</h4>
<p><b>Yaş aralığı</b> — yaşa uygun hizmet sunmak ve reşit olmayanları korumak (KVKK m.5/2-ç, hukuki yükümlülük). <b>Rastgele cihaz tanımlayıcısı</b> — hile önleme ve kayıt bütünlüğü (m.5/2-f, meşru menfaat). <b>Teknik bağlantı verisi (IP)</b> — sürüm denetimi ve hizmet güvenliği (m.5/2-f).</p>
<h4>Aktarım</h4>
<p>Veriler yurt içine veya yurt dışına aktarılmaz. Satın almalar uygulama mağazası tarafından kendi aydınlatma metni kapsamında işlenir.</p>
<h4>Saklama süresi</h4>
<p>Oyun verisi cihazınızda, siz silene kadar; sunucu teknik kayıtları en fazla 30 gün tutulur.</p>
<h4>Haklarınız (KVKK m.11)</h4>
<p>Verinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme, itiraz ve zararın giderilmesini isteme haklarına sahipsiniz. Başvurularınızı ${MAIL} adresine "KVKK Başvurusu" konusuyla iletebilirsiniz; en geç 30 gün içinde yanıtlanır.</p>
<p class="lg-date">Son güncelleme: ${LEGAL_UPDATED}</p>`,
};

const TERMS_TR = {
  title: 'KULLANIM KOŞULLARI',
  body: `
<p>Oyunu indirerek bu koşulları kabul etmiş sayılırsınız.</p>
<h4>Oyun içi öğeler</h4>
<p>Gem, altın, sandık ve eşyalar gerçek para karşılığı olmayan, devredilemeyen lisanslardır; nakde çevrilemez.</p>
<h4>Rastgele ödüller</h4>
<p>Sandıkların içerik olasılıkları her sandığın satın alma ekranındaki <b>OLASILIKLAR</b> bölümünde yazılıdır. Her sandık açılışı Efsane Garantisi sayacını ilerletir.</p>
<h4>Adil oyun</h4>
<p>Kayıt dosyasını değiştirmek, saat ayarıyla süreleri atlatmak veya hile yazılımı kullanmak yasaktır; tespit edilen değişiklikler geri alınır.</p>
<p class="lg-date">Son güncelleme: ${LEGAL_UPDATED}</p>`,
};

/* ── ENGLISH (global store listing) ── */
const PRIVACY_EN = {
  title: 'PRIVACY POLICY',
  body: `
<p>Shadowrend (the "Game") is published by ${PUB}. This policy explains what data the Game processes, why, and your rights.</p>
<h4>1. Data we process</h4>
<p><b>Game progress</b> — levels, heroes, items, chests, in-game currencies and settings — is stored <b>only on your device</b>.</p>
<p><b>Age range</b> selected on first launch, used for age-appropriate features and purchase safeguards. Your birth date is not stored.</p>
<p><b>Device identifier</b>: a random, non-personal ID used to protect save integrity, shown as your "Player ID" for support.</p>
<p><b>Version check</b>: on launch the Game requests the latest version info; your IP address may appear transiently in server logs. No profile is built.</p>
<h4>2. Data we do not collect</h4>
<p>No name, email, phone, location, contacts, photos or microphone. We do not use your advertising ID.</p>
<h4>3. Purchases</h4>
<p>In-app purchases are processed by Google Play / the App Store; we never see your payment details.</p>
<h4>4. Children</h4>
<p>Players under 13 must pass a parental check before real-money purchases and see no personalised content.</p>
<h4>5. Deleting your data</h4>
<p>All data is on your device; delete it from Settings → Save &amp; Data, or by uninstalling.</p>
<h4>6. Contact</h4>
<p>${PUB} · ${ADDR} · ${MAIL}</p>
<p class="lg-date">Last updated: September 24, 2026</p>`,
};
const TERMS_EN = {
  title: 'TERMS OF USE',
  body: `
<p>By downloading the Game you accept these terms.</p>
<h4>In-game items</h4>
<p>Gems, gold, chests and items are non-transferable licences with no cash value.</p>
<h4>Random rewards</h4>
<p>Chest drop rates are listed under <b>DROP RATES</b> on every chest's purchase screen. Every chest opened advances the Legendary Guarantee counter.</p>
<h4>Fair play</h4>
<p>Editing save data, changing the device clock to skip timers, or using cheat software is prohibited; detected changes are reverted.</p>
<p class="lg-date">Last updated: September 24, 2026</p>`,
};
const EN = LANG === 'en';
export const PRIVACY = EN ? PRIVACY_EN : PRIVACY_TR;
export const KVKK = KVKK_TR;          // Türk hukuku metni: yalnız Türkçe geçerli
export const TERMS = EN ? TERMS_EN : TERMS_TR;

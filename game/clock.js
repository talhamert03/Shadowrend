/* ═══════════════════════════════════════════════════════════
   clock.js — GÜVENİLİR SAAT (v44)

   Sandık kilidi, ücretsiz sandık, reklam sandığı, günlük giriş ve
   haftalık kuşak `Date.now()` okuyordu: cihaz saatini ileri almak her
   bekleme süresini sıfırlıyordu. Tüm zaman okumaları artık `Clock.now()`.

   ÜÇ KİLİT:
   ① MONOTON OTURUM. Uygulama açıkken zaman `performance.now()` ile
      ilerler; oyun içindeyken saati değiştirmek HİÇBİR ŞEY yapmaz.
   ② YÜKSEK SU İŞARETİ. Görülen en büyük güvenilir zaman kasaya yazılır.
      Saat geriye alınırsa zaman işaret NOKTASINDA DURUR: "ileri al, sandığı
      aç, geri al" hilesi bir kez kazandırır, sonra gerçek saat hileli
      saate yetişene dek tüm sayaçlar donar — hile kendi cezasını öder.
   ③ SUNUCU SAATİ. Ağ varken `version.json` yanıtının HTTP `Date`
      başlığı okunur (saniye çözünürlüğü yeter) → cihaz saati 2 dk'dan
      fazla ilerideyse sapma düzeltilir. Ayrı bir sunucu gerekmez.
   ═══════════════════════════════════════════════════════════ */

const KEY = 'kh_clock';
const SKEW_OK = 2 * 60 * 1000;

let offset = 0;             // sunucu − cihaz (ms)
let base = 0, perf0 = 0;    // oturum çapası
let hw = 0;                 // yüksek su işareti
let rolledBack = false;
let saveT = 0;

function readHw() {
  try { const v = Number(localStorage.getItem(KEY)); return Number.isFinite(v) ? v : 0; } catch (e) { return 0; }
}
function writeHw() {
  try { localStorage.setItem(KEY, String(Math.floor(hw))); } catch (e) { /* */ }
}
function anchor() {
  const wall = Date.now() + offset;
  const cur = base ? base + (performance.now() - perf0) : 0;
  if (wall + 60000 < hw) rolledBack = true;
  base = Math.max(wall, hw, cur);
  perf0 = performance.now();
  hw = base;
  writeHw();
}

export const Clock = {
  now() {
    const t = base + (performance.now() - perf0);
    if (t > hw) { hw = t; if (!saveT) saveT = setTimeout(() => { saveT = 0; writeHw(); }, 15000); }
    return t;
  },
  date() { return new Date(this.now()); },
  get rolledBack() { return rolledBack; },
  get offset() { return offset; },

  boot() {
    hw = readHw();
    anchor();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { hw = Math.max(hw, this.now()); writeHw(); }
      else anchor();                 // arka planda geçen süre duvar saatinden
    });
  },

  /** Sunucu yanıtının Date başlığıyla sapmayı düzelt. */
  syncFrom(res) {
    try {
      const d = res && res.headers && res.headers.get('date');
      if (!d) return false;
      const srv = Date.parse(d);
      if (!Number.isFinite(srv)) return false;
      const skew = srv - Date.now();
      /* Yalnız ANLAMLI sapma düzeltilir; küçük fark ağ gecikmesidir. */
      offset = Math.abs(skew) > SKEW_OK ? skew : 0;
      if (offset) {
        /* İleri alınmış saat: çapayı sunucuya çek. İşaret de geri çekilir
           (yalnız bu oturumda şişirilmişse) — dürüst oyuncu cezalanmaz. */
        const srvNow = Date.now() + offset;
        if (hw > srvNow + SKEW_OK && hw - srvNow < 7 * 86400000) hw = srvNow;
        base = 0; anchor();
      }
      return true;
    } catch (e) { return false; }
  },
};

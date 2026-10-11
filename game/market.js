/* ═══════════════════════════════════════════════════════════
   v66 · GÜNLÜK KART PAZARI (M2 kararı, kullanıcı) — biriken altını ilerlemeye çevirir.
   Her gün (yerel gün anahtarı) 4 teklif, günde bir kez her biri:
     1 · seçili kahraman kartı ×N   2 · sahip olunan ikinci kahraman kartı ×N
     3-4 · kuşanılmış (yoksa sahip olunan) eşya kartı ×N
   Adet ve fiyat bir sonraki seviyenin kart gereğine bağlı: gereğin ~%25'i, kart başı fiyat
   = o seviyenin altın bedeli / kart gereği × 0,55 (en az 6). Böylece pazar kart KAPISINI
   hızlandırır ama altın bedelini atlamaz. Hiç teklif yoksa (tavan) ADİ kart yerine altın vermez — satır gizlenir.
   Ölçülen etki (M2 sim, aynı tohum): 5 günlük harcamayı aşan gün 26 → bkz. CLAUDE.md v66.
   ═══════════════════════════════════════════════════════════ */
import { CHARACTERS, CHAR_CARD_REQ, CHAR_GOLD_COST, CHAR_MAX_LEVEL, GEAR_CARD_REQ, GEAR_GOLD_COST, GEAR_MAX_LEVEL } from './config.js?v=20260930m';

const day = () => { const d = new Date(); return d.getFullYear() * 1000 + (d.getMonth() + 1) * 40 + d.getDate(); };

/* v66b (kullanıcı): kahraman kartı PAHALI olmalı — kolay alınmasın. Kahraman: gereğin %20'si, kart başı
   seviye bedeli/gerek × 1,6 (en az 25). Eşya: %25, × 0,55 (en az 6) — eşya pazarın rahat kısmı. */
/* v66c (verifier ölçümü: Sv1 kahraman kartı 25 altındı, cüzdanın %0,2'si): kahraman kartı fiyatı artık
   KAHRAMANIN DEĞERİNE bağlı — kart başı = max(nadirlik tabanı, satın alma fiyatı × 0,12 × (1 + 0,25·Sv)).
   Örnek KARA KAPTAN (1600): Sv1 240 · Sv5 432/kart. */
/* v67 (kullanıcı: "çok daha pahalı, özellikle DESTANSI/EFSANE"): kart başı =
   max(taban, fiyat × 0,2 × RAR_K × (1 + 0,25·Sv)). RAR_K 1 / 1,4 / 2,4 / 3,6 · taban 120 / 240 / 600 / 1200.
   KARA KAPTAN (1600, efsane) Sv1 1 440/kart · Sv5 ×10 = 25 920. GEM = altın / 12 × 1,15 (kur RUBY_EXCHANGE ~12). */
const HERO_FLOOR = [0, 120, 240, 600, 1200], RAR_K = [0, 1, 1.4, 2.4, 3.6];
const toGem = (gold) => Math.max(2, Math.ceil(gold / 12 * 1.15));
function offer(req, cost, hero, cdef, L) {
  const n = Math.max(1, Math.round(req * (hero ? 0.2 : 0.25)));
  const r = (cdef && cdef.rarity) | 0 || 1;
  const each = hero
    ? Math.max(HERO_FLOOR[r], Math.round(((cdef && cdef.price) || 200) * 0.2 * RAR_K[r] * (1 + 0.25 * (L | 0))))
    : Math.max(6, Math.round(cost / Math.max(1, req) * 0.55));
  return { n, price: n * each, gem: toGem(n * each) };
}

export const Market = {
  book(g) {
    const m = g.meta;
    if (!m.mkt || m.mkt.d !== day()) m.mkt = { d: day(), got: [] };
    return m.mkt;
  },
  offers(g) {
    const B = this.book(g), out = [];
    const cid = g.meta.selectedChar;
    const heroOffer = (id, slot) => {
      const L = g.charLevel(id);
      if (L >= CHAR_MAX_LEVEL) return null;
      const o = offer(CHAR_CARD_REQ[L + 1], CHAR_GOLD_COST[L + 1], true, CHARACTERS[id], L);
      return { slot, kind: 'char', id, rar: CHARACTERS[id].rarity || 1, name: CHARACTERS[id].name, n: o.n, price: o.price, gem: o.gem, got: B.got.includes(slot) };
    };
    const h1 = heroOffer(cid, 'h1'); if (h1) out.push(h1);
    const others = (g.meta.charsOwned || []).filter((x) => x !== cid && CHARACTERS[x] && g.charLevel(x) < CHAR_MAX_LEVEL);
    if (others.length) { const id = others[B.d % others.length]; const h2 = heroOffer(id, 'h2'); if (h2) out.push(h2); }
    /* v67: sahip olunmayan bir kahramanın AÇILIŞ kartı — günde bir, doğrudan satın almanın 2 katı + nadirlik payı */
    const locked = Object.keys(CHARACTERS).filter((x) => !g.ownsChar(x));
    if (locked.length) {
      const id = locked[B.d % locked.length], C = CHARACTERS[id], r = C.rarity || 1;
      const k = 2 * (1 + 0.25 * r);
      const price = Math.round((C.price || 300) * k), gem = Math.round((C.stonePrice || toGem(price)) * k);
      out.push({ slot: 'h3', kind: 'char', unlock: true, id, rar: r, name: C.name, n: 1, price, gem, got: B.got.includes('h3') });
    }
    const worn = Object.values(g.charGearMap() || {}).filter(Boolean);
    const pool = worn.length ? worn : (g.meta.owned || []).filter((id) => g.gearById(id));
    const gl = (id) => g.gearLevel(id);
    const gs = pool.filter((id) => gl(id) < GEAR_MAX_LEVEL).sort((a, b) => gl(a) - gl(b));
    for (let i = 0; i < Math.min(2, gs.length); i++) {
      const id = gs[(i + B.d) % gs.length], L = gl(id), it = g.gearById(id);
      if (out.some((o) => o.id === id)) continue;
      const o = offer(GEAR_CARD_REQ[L + 1], GEAR_GOLD_COST[L + 1]);
      out.push({ slot: 'g' + (i + 1), kind: 'gear', id, rar: it.rarity || 1, name: it.name, icon: it.icon, n: o.n, price: o.price, gem: o.gem, got: B.got.includes('g' + (i + 1)) });
    }
    return out;
  },
  /** cur: 'gem' → gem, aksi altın. Dönen nesnede first = kahraman İLK KEZ açıldı. */
  buy(g, slot, cur) {
    const B = this.book(g);
    const o = this.offers(g).find((x) => x.slot === slot);
    if (!o || o.got) return null;
    const ok = cur === 'gem' ? g.spendStones(o.gem) : g.spendRubies(o.price);
    if (!ok) return null;
    o.cur = cur === 'gem' ? 'gem' : 'gold';
    if (o.kind === 'char') o.first = g.addCharCards(o.id, o.n); else g.addGearCards(o.id, o.n);
    B.got.push(slot);
    g.saveMeta();
    return o;
  },
  msLeft() { const d = new Date(); const n = new Date(d); n.setHours(24, 0, 0, 0); return n - d; },
};

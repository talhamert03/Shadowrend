/* KATMAN YAKALAMA — bir DOM bileşenini Godot'da yeniden kurulabilir katmanlara ayırır.
   Her düğüm (eleman, ::before, ::after) için:
     • kendi boyaması (arka plan, kenarlık, gölge, svg/img) — çocuklar, yazı ve öbür
       sözde elemanlar gizli, ataların dönüşüm/opaklık/kırpma etkisi kaldırılmış
       şeffaf PNG (3×), sonradan saydam kenarları kırpılır (trim.py)
     • yerleşim kutusu (dönüşümsüz; ebeveyn kutusuna göre), transform-origin,
       durağan dönüşüm (translate · rotate · scale · transform sırası), opaklık,
       karışım kipi, z sırası, overflow kırpması (köşe yarıçaplarıyla)
     • WAAPI animasyonları: anahtar kareler (transform → birim çözülmüş fonksiyon
       listesi, opaklık), kare başı zamanlama eğrisi, süre/gecikme/tekrar/yön/dolgu
     • doğrudan metin: içerik + hesaplanmış yazı stili + satır kutuları
   Çıktı: <out>/<name>.json + <out>/img/<sha>.png (paylaşımlı, içerik adresli) */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';

const BROWSER = String.raw`
window.__lyr = (() => {
  const CSS = document.createElement('style');
  CSS.textContent = [
    '.lyr-freeze, .lyr-freeze *, .lyr-freeze::before, .lyr-freeze::after, .lyr-freeze *::before, .lyr-freeze *::after { animation: none !important; transition: none !important; }',
    '.lyr-flat, .lyr-flat *, .lyr-flat::before, .lyr-flat::after, .lyr-flat *::before, .lyr-flat *::after { transform: none !important; rotate: none !important; scale: none !important; translate: none !important; }',
    '.lyr-anc { transform: none !important; rotate: none !important; scale: none !important; translate: none !important; opacity: 1 !important; filter: none !important; overflow: visible !important; clip-path: none !important; -webkit-mask: none !important; mask: none !important; animation: none !important; transition: none !important; background: none !important; border-color: transparent !important; box-shadow: none !important; outline: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }',
    '.lyr-anc::before, .lyr-anc::after { visibility: hidden !important; }',
    '.lyr-hid { visibility: hidden !important; }',
    '.lyr-show { visibility: visible !important; opacity: 1 !important; }',
    '.lyr-notext { text-shadow: none !important; -webkit-text-stroke: 0 !important; -webkit-text-fill-color: transparent !important; text-decoration-color: transparent !important; caret-color: transparent !important; }',
    '.lyr-nob::before { visibility: hidden !important; } .lyr-noa::after { visibility: hidden !important; }',
    '.lyr-ownoff { background: none !important; border-color: transparent !important; box-shadow: none !important; outline: none !important; overflow: visible !important; clip-path: none !important; }',
    '.lyr-ownoff > svg, .lyr-ownoff > img { visibility: hidden !important; }',
    '.lyr-pb::before, .lyr-pa::after { opacity: 1 !important; visibility: visible !important; }',
    'html.lyr-clear, html.lyr-clear body { background: transparent !important; }',
    'html.lyr-clear canvas { visibility: hidden !important; }',
    '.lyr-out { visibility: hidden !important; }',
    '.lyr-bgbox { -webkit-background-clip: border-box !important; background-clip: border-box !important; -webkit-text-fill-color: transparent !important; }',
  ].join('\n');
  document.head.appendChild(CSS);
  const ATOMIC = new Set(['svg', 'img', 'canvas', 'video', 'input', 'select', 'textarea']);
  let nodes = [], byId = {}, root = null;

  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  /* tek fonksiyonun matrisi (yüzde/calc çözülür): elemanla aynı boyutta sonda */
  let probe = null;
  function matOf(fn, w, h) {
    if (!probe) { probe = document.createElement('div'); probe.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none'; document.body.appendChild(probe); }
    probe.style.width = w + 'px'; probe.style.height = h + 'px';
    probe.style.transform = fn;
    const m = getComputedStyle(probe).transform;
    probe.style.transform = '';
    if (!m || m === 'none') return [1, 0, 0, 1, 0, 0];
    const a = m.slice(m.indexOf('(') + 1, -1).split(',').map(Number);
    if (m.startsWith('matrix3d')) return [a[0], a[1], a[4], a[5], a[12], a[13]];
    return a;
  }
  const ANG = (s) => { s = String(s).trim(); const v = parseFloat(s);
    if (s.endsWith('turn')) return v * Math.PI * 2; if (s.endsWith('grad')) return v * Math.PI / 200;
    if (s.endsWith('rad')) return v; return v * Math.PI / 180; };
  /* transform dizesi → [[ad, ...sayılar]] (px, rad) */
  function parseTf(str, w, h) {
    const out = [];
    if (!str || str === 'none') return out;
    const re = /([a-zA-Z0-9]+)\(((?:[^()]|\([^()]*\))*)\)/g; let m;
    while ((m = re.exec(str))) {
      const fn = m[1], raw = m[2], args = raw.split(/,(?![^(]*\))/).map((s) => s.trim());
      if (fn === 'matrix') { out.push(['matrix', ...args.map(Number)]); continue; }
      if (fn === 'matrix3d') { const a = args.map(Number); out.push(['matrix', a[0], a[1], a[4], a[5], a[12], a[13]]); continue; }
      if (fn.startsWith('translate')) { const M = matOf(m[0], w, h); out.push(['translate', M[4], M[5]]); continue; }
      if (fn === 'scale' || fn === 'scale3d') { const sx = parseFloat(args[0]), sy = args.length > 1 ? parseFloat(args[1]) : sx; out.push(['scale', sx, sy]); continue; }
      if (fn === 'scaleX') { out.push(['scale', parseFloat(args[0]), 1]); continue; }
      if (fn === 'scaleY') { out.push(['scale', 1, parseFloat(args[0])]); continue; }
      if (fn === 'scaleZ') continue;
      if (fn === 'rotate' || fn === 'rotateZ') { out.push(['rotate', ANG(args[0])]); continue; }
      if (fn === 'rotate3d') { out.push(['rotate', ANG(args[3]) * Math.sign(parseFloat(args[2]) || 0)]); continue; }
      /* 3B döndürmeler ortografik yaklaşım: eksen boyunca cos ölçeği */
      if (fn === 'rotateX') { out.push(['flipy', ANG(args[0])]); continue; }
      if (fn === 'rotateY') { out.push(['flipx', ANG(args[0])]); continue; }
      if (fn === 'skew') { out.push(['skew', ANG(args[0]), args.length > 1 ? ANG(args[1]) : 0]); continue; }
      if (fn === 'skewX') { out.push(['skew', ANG(args[0]), 0]); continue; }
      if (fn === 'skewY') { out.push(['skew', 0, ANG(args[0])]); continue; }
      if (fn === 'perspective' || fn === 'translateZ') continue;
      out.push(['unknown', m[0]]);
    }
    return out;
  }
  /* bireysel özellikler (translate/rotate/scale) → fonksiyon listesi */
  function indiv(tr, ro, sc, w, h) {
    const out = [];
    if (tr && tr !== 'none') { const p = tr.split(/\s+(?![^(]*\))/); out.push(...parseTf('translate(' + p[0] + ',' + (p[1] || '0px') + ')', w, h)); }
    if (ro && ro !== 'none') { const p = ro.trim().split(/\s+/); out.push(['rotate', ANG(p[p.length - 1])]); }
    if (sc && sc !== 'none') { const p = sc.trim().split(/\s+/); out.push(['scale', parseFloat(p[0]), parseFloat(p[1] || p[0])]); }
    return out;
  }
  const sideOf = (cs) => ({ bl: num(cs.borderLeftWidth), bt: num(cs.borderTopWidth), br: num(cs.borderRightWidth), bb: num(cs.borderBottomWidth) });
  function radii(cs, w, h) {
    const r = (v, ref) => { const s = String(v).split(' ')[0]; return s.endsWith('%') ? parseFloat(s) / 100 * ref : num(s); };
    return [r(cs.borderTopLeftRadius, w), r(cs.borderTopRightRadius, w), r(cs.borderBottomRightRadius, w), r(cs.borderBottomLeftRadius, w)];
  }
  function paints(el, cs, pseudo) {
    if (pseudo) return true;
    if (ATOMIC.has(el.tagName.toLowerCase())) return true;
    if (cs.backgroundImage !== 'none') return true;
    if (!/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) return true;
    if (cs.boxShadow !== 'none') return true;
    const s = sideOf(cs);
    if ((s.bl + s.bt + s.br + s.bb) > 0 && ['Top', 'Left', 'Right', 'Bottom'].some((k) => num(cs['border' + k + 'Width']) > 0 && cs['border' + k + 'Style'] !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(cs['border' + k + 'Color']))) return true;
    if (cs.outlineStyle !== 'none' && num(cs.outlineWidth) > 0) return true;
    if (cs.listStyleType !== 'none' && cs.display === 'list-item') return true;
    return false;
  }
  function keyOf(el) {
    const c = el.getAttribute('class'); const cls = c ? c.trim().split(/\s+/).filter((x) => !x.startsWith('lyr-') && !x.startsWith('uicap')) : [];
    return (el.id ? '#' + el.id : '') + (cls.length ? '.' + cls.join('.') : '') || el.tagName.toLowerCase();
  }
  function easeOf(e) { return e || 'linear'; }

  /* ① animasyonları topla (dondurmadan ÖNCE) */
  function collectAnims(rootEl) {
    const map = new Map();
    for (const a of document.getAnimations()) {
      const ef = a.effect; if (!ef || !ef.target) continue;
      if (!(ef.target === rootEl || rootEl.contains(ef.target))) continue;
      const key = ef.target.getAttribute('data-lyr') + (ef.pseudoElement || '');
      const t = ef.getTiming(), ct = ef.getComputedTiming();
      const kfs = ef.getKeyframes().map((k) => { const o = {}; for (const p in k) o[p] = k[p]; return o; });
      const list = map.get(key) || []; list.push({ name: a.animationName || a.id || '', kfs, dur: num(t.duration), delay: num(t.delay), endDelay: num(t.endDelay), iter: t.iterations === Infinity ? -1 : t.iterations, dir: t.direction, fill: t.fill, easing: t.easing, cur: num(a.currentTime), start: num(a.startTime), state: a.playState, local: ct.localTime });
      map.set(key, list);
    }
    return map;
  }

  function scan(sel, opt) {
    opt = opt || {};
    root = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!root) return null;
    nodes = []; byId = {};
    let id = 0;
    const skip = (opt.skip || []);
    const isSkip = (e) => skip.some((k) => keyOf(e).includes(k));
    /* atlanan / display:none ataların alt ağacı hiç taranmaz (yalnız atlanan kökün kutusu kalır) */
    const els = [root, ...root.querySelectorAll('*')].filter((e) => {
      for (let p = e.parentElement; p && p !== root.parentElement; p = p.parentElement) {
        if (ATOMIC.has(p.tagName.toLowerCase())) return false;
        if (p !== root && (isSkip(p) || getComputedStyle(p).display === 'none')) return false;
      }
      return true;
    });
    for (const e of els) e.setAttribute('data-lyr', String(id++));
    const anims = collectAnims(root);
    /* ② dondur: durağan stiller */
    root.classList.add('lyr-freeze');
    for (let a = root.parentElement; a; a = a.parentElement) a.classList.add('lyr-anc');
    const statics = new Map();
    for (const e of els) {
      for (const ps of ['', '::before', '::after']) {
        const cs = getComputedStyle(e, ps || null);
        if (ps && (cs.content === 'none' || cs.content === 'normal' || cs.display === 'none')) continue;
        /* kapalı <details>: summary dışındaki içerik görünmez */
        const det = e.closest('details');
        const closedDet = det && det !== e && !det.open && !e.closest('summary');
        statics.set(e.getAttribute('data-lyr') + ps, { closedDet, trProp: cs.transitionProperty, trDur: cs.transitionDuration, trDelay: cs.transitionDelay, trEase: cs.transitionTimingFunction, color: cs.color, tf: cs.transform, tr: cs.translate, ro: cs.rotate, sc: cs.scale, origin: cs.transformOrigin, opacity: num(cs.opacity), blend: cs.mixBlendMode, vis: cs.visibility, display: cs.display, filter: cs.filter, clipPath: cs.clipPath, mask: cs.webkitMaskImage || cs.maskImage });
      }
    }
    /* ③ dönüşümsüz yerleşim */
    root.classList.add('lyr-flat');
    const R0 = root.getBoundingClientRect();
    const rectOf = (e) => { const r = e.getBoundingClientRect(); return [r.left - R0.left, r.top - R0.top, r.width, r.height]; };
    for (const e of els) {
      const lid = e.getAttribute('data-lyr');
      const cs = getComputedStyle(e);
      const st = statics.get(lid);
      const pe = e === root ? null : e.parentElement.getAttribute('data-lyr');
      const box = rectOf(e);
      if (st.closedDet) st.display = 'none';
      const n = { id: lid, parent: pe, kind: 'el', tag: e.tagName.toLowerCase(), key: keyOf(e), abs: box, w: box[2], h: box[3],
        paint: paints(e, cs, false) && st.vis !== 'hidden' && st.display !== 'none', static: st, z: cs.zIndex === 'auto' ? 0 : +cs.zIndex,
        positioned: cs.position !== 'static', pos: cs.position, clip: (cs.overflow !== 'visible' || cs.overflowX !== 'visible') && cs.overflow !== 'clip visible' ? radii(cs, box[2], box[3]) : null,
        border: sideOf(cs), anims: anims.get(lid) || [], atomic: ATOMIC.has(e.tagName.toLowerCase()) };
      if (n.clip) n.clipBox = [n.border.bl, n.border.bt, box[2] - n.border.bl - n.border.br, box[3] - n.border.bt - n.border.bb];
      /* kaydırma kapsayıcısı: içerik yüksekliği / görünür yükseklik */
      if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1) n.scroll = { h: e.scrollHeight, ch: e.clientHeight, top: e.scrollTop };
      /* doğrudan metin */
      const tn = [...e.childNodes].filter((c) => c.nodeType === 3 && c.textContent.trim());
      if (tn.length && !n.atomic) {
        const lines = [];
        for (const t of tn) { const rg = document.createRange(); rg.selectNodeContents(t); for (const r of rg.getClientRects()) lines.push([r.left - R0.left, r.top - R0.top, r.width, r.height]); }
        n.text = { str: tn.map((t) => t.textContent).join(''), inner: e.innerText, font: cs.fontFamily, weight: +cs.fontWeight || 400, size: num(cs.fontSize), color: cs.color, ls: cs.letterSpacing === 'normal' ? 0 : num(cs.letterSpacing), tt: cs.textTransform, shadow: cs.textShadow, align: cs.textAlign, lh: cs.lineHeight === 'normal' ? 0 : num(cs.lineHeight), ws: cs.whiteSpace, stroke: [num(cs.webkitTextStrokeWidth), cs.webkitTextStrokeColor], fill: cs.webkitTextFillColor, bgclip: cs.webkitBackgroundClip || cs.backgroundClip, bgimg: cs.backgroundImage, style: cs.fontStyle, clamp: cs.webkitLineClamp, lines,
          content: [box[0] + n.border.bl + num(cs.paddingLeft), box[1] + n.border.bt + num(cs.paddingTop), box[2] - n.border.bl - n.border.br - num(cs.paddingLeft) - num(cs.paddingRight), box[3] - n.border.bt - n.border.bb - num(cs.paddingTop) - num(cs.paddingBottom)] };
      }
      if (n.text && /text/.test(n.text.bgclip || "")) n.fill = true;
      nodes.push(n); byId[lid] = n;
      /* sözde elemanlar */
      for (const ps of ['::before', '::after']) {
        const pst = statics.get(lid + ps); if (!pst) continue;
        const pc = getComputedStyle(e, ps);
        let pb;
        if (pc.position === 'absolute' || pc.position === 'fixed') {
          let cb = e;
          if (pc.position === 'fixed') cb = null;
          else while (cb && cb !== document.documentElement && getComputedStyle(cb).position === 'static' && getComputedStyle(cb).transform === 'none') cb = cb.parentElement;
          let cr;
          if (!cb || cb === document.documentElement) cr = [-R0.left, -R0.top, innerWidth, innerHeight];
          else { const r = cb.getBoundingClientRect(), c2 = getComputedStyle(cb); cr = [r.left - R0.left + num(c2.borderLeftWidth), r.top - R0.top + num(c2.borderTopWidth), r.width - num(c2.borderLeftWidth) - num(c2.borderRightWidth), r.height - num(c2.borderTopWidth) - num(c2.borderBottomWidth)]; }
          const w = num(pc.width), h = num(pc.height);
          const L = pc.left !== 'auto' ? num(pc.left) + num(pc.marginLeft) : cr[2] - num(pc.right) - w - num(pc.marginRight);
          const T = pc.top !== 'auto' ? num(pc.top) + num(pc.marginTop) : cr[3] - num(pc.bottom) - h - num(pc.marginBottom);
          pb = [cr[0] + L, cr[1] + T, w, h];
        } else {
          pb = [box[0], box[1], num(pc.width) || box[2], num(pc.height) || box[3]];
        }
        const pn = { id: lid + ps, parent: lid, kind: ps.slice(2), key: n.key + ps, abs: pb, w: pb[2], h: pb[3], paint: pst.vis !== 'hidden', static: pst, z: pc.zIndex === 'auto' ? 0 : +pc.zIndex, positioned: pc.position !== 'static', pos: pc.position,
          clip: null, anims: anims.get(lid + ps) || [], inflow: !(pc.position === 'absolute' || pc.position === 'fixed') };
        if (pc.content && pc.content !== 'none' && pc.content !== '""' && pc.content !== "''" && !pc.content.startsWith('url(')) pn.ptext = pc.content;
        nodes.push(pn); byId[pn.id] = pn;
      }
    }
    /* ③b esneme çıkarımı: kök d px uzatılınca (min-height) her düğümün mutlak kayması/büyümesi
       (birim başına) → Godot'da yükseklik değişince aynı flex/konum davranışı */
    if (opt.stretch) {
      const d = opt.stretch;
      const before = measureAll(els, R0);
      const old = root.style.minHeight;
      root.style.setProperty('min-height', (R0.height + d) + 'px', 'important');
      const after = measureAll(els, root.getBoundingClientRect());
      root.style.minHeight = old;
      for (const n of nodes) {
        const a = before[n.id], b = after[n.id]; if (!a || !b) continue;
        n.vy = Math.round((b[1] - a[1]) / d * 1000) / 1000;
        n.vh = Math.round((b[3] - a[3]) / d * 1000) / 1000;
      }
    }
    /* ④ dönüşüm/animasyon değerlerini çöz */
    for (const n of nodes) {
      const st = n.static;
      n.tf = [...indiv(st.tr, st.ro, st.sc, n.w, n.h), ...parseTf(st.tf, n.w, n.h)];
      const o = String(st.origin).split(' ').map(num); n.origin = [o[0] || 0, o[1] || 0];
      n.opacity = st.opacity;
      n.blend = st.blend === 'normal' ? '' : st.blend;
      for (const A of n.anims) {
        A.props = new Set();
        A.kfs = A.kfs.map((k) => {
          const o = { off: k.computedOffset != null ? k.computedOffset : k.offset, ease: easeOf(k.easing) };
          if (k.transform != null) { o.tf = parseTf(k.transform, n.w, n.h); A.props.add('transform'); }
          if (k.translate != null || k.rotate != null || k.scale != null) { o.tfi = indiv(k.translate, k.rotate, k.scale, n.w, n.h); A.props.add('indiv'); }
          if (k.opacity != null) { o.op = num(k.opacity); A.props.add('opacity'); }
          const other = {};
          for (const p in k) if (!['offset', 'computedOffset', 'easing', 'composite', 'transform', 'opacity', 'translate', 'rotate', 'scale'].includes(p)) other[p] = k[p];
          if (Object.keys(other).length) { o.other = other; for (const p in other) A.props.add(p); }
          return o;
        });
        A.props = [...A.props];
      }
      delete n.static.tr; delete n.static.ro; delete n.static.sc;
      /* ebeveyn kutusuna göre */
      const P = n.parent != null ? byId[n.parent] : null;
      n.box = P ? [n.abs[0] - P.abs[0], n.abs[1] - P.abs[1], n.w, n.h] : [0, 0, n.w, n.h];
    }
    root.classList.remove('lyr-flat');
    return { root: keyOf(root), rect: [R0.left, R0.top, R0.width, R0.height], vw: innerWidth, vh: innerHeight, nodes };
  }

  /* tüm düğümlerin (sözde dahil) köke göre mutlak dönüşümsüz kutuları */
  function measureAll(els, R0) {
    const out = {};
    for (const e of els) {
      const lid = e.getAttribute('data-lyr');
      const r = e.getBoundingClientRect();
      const box = [r.left - R0.left, r.top - R0.top, r.width, r.height];
      out[lid] = box;
      for (const ps of ['::before', '::after']) {
        const pc = getComputedStyle(e, ps);
        if (pc.content === 'none' || pc.content === 'normal' || pc.display === 'none') continue;
        if (pc.position === 'absolute') {
          let cb = e;
          while (cb && cb !== document.documentElement && getComputedStyle(cb).position === 'static' && getComputedStyle(cb).transform === 'none') cb = cb.parentElement;
          const q = cb.getBoundingClientRect(), c2 = getComputedStyle(cb);
          const cr = [q.left - R0.left + num(c2.borderLeftWidth), q.top - R0.top + num(c2.borderTopWidth), q.width - num(c2.borderLeftWidth) - num(c2.borderRightWidth), q.height - num(c2.borderTopWidth) - num(c2.borderBottomWidth)];
          const w = num(pc.width), h = num(pc.height);
          const L = pc.left !== 'auto' ? num(pc.left) + num(pc.marginLeft) : cr[2] - num(pc.right) - w - num(pc.marginRight);
          const T = pc.top !== 'auto' ? num(pc.top) + num(pc.marginTop) : cr[3] - num(pc.bottom) - h - num(pc.marginBottom);
          out[lid + ps] = [cr[0] + L, cr[1] + T, w, h];
        } else out[lid + ps] = [box[0], box[1], num(pc.width) || box[2], num(pc.height) || box[3]];
      }
    }
    return out;
  }

  /* ⑤ tek düğümü yalıt (yalnız kendi boyaması) */
  function isolate(nid) {
    const n = byId[nid];
    document.documentElement.classList.add('lyr-clear');
    root.classList.add('lyr-freeze', 'lyr-flat');
    const all = document.querySelectorAll('body *');
    const anc = new Set(); for (let a = root.parentElement; a; a = a.parentElement) anc.add(a);
    for (const x of all) { if (!anc.has(x) && !root.contains(x) && x !== root) x.classList.add('lyr-out'); }
    const sub = [root, ...root.querySelectorAll('*')];
    const elId = n.kind === 'el' ? nid : n.parent;
    const el = root.parentElement.querySelector('[data-lyr="' + elId + '"]');
    const atomic = !!(byId[elId] && byId[elId].atomic);
    for (const x of sub) {
      if (x === el) continue;
      if (atomic && el.contains(x)) continue;
      x.classList.add('lyr-hid');
      if (x.contains(el)) x.classList.add('lyr-anc');
    }
    el.classList.add('lyr-show', 'lyr-nob', 'lyr-noa');
    if (!atomic) el.classList.add('lyr-notext');
    /* metin içi gradyan (background-clip:text): dolgu kutusunu yakala, metin Godot'da maskeler */
    if (n.kind === 'el' && n.fill) el.classList.add('lyr-bgbox');
    if (n.kind === 'el') { if (!byId[nid].atomic) for (const c of el.children) c.classList.add('lyr-hid'); }
    else {
      el.classList.add('lyr-ownoff');
      el.classList.remove(n.kind === 'before' ? 'lyr-nob' : 'lyr-noa');
      el.classList.add(n.kind === 'before' ? 'lyr-pb' : 'lyr-pa');
      for (const c of el.children) c.classList.add('lyr-hid');
    }
    const r = root.getBoundingClientRect();
    return [r.left, r.top];
  }
  function reset() {
    document.documentElement.classList.remove('lyr-clear');
    for (const c of ['lyr-bgbox', 'lyr-out', 'lyr-hid', 'lyr-anc', 'lyr-show', 'lyr-nob', 'lyr-noa', 'lyr-notext', 'lyr-ownoff', 'lyr-pb', 'lyr-pa', 'lyr-flat']) for (const x of document.querySelectorAll('.' + c)) x.classList.remove(c);
    if (root) for (let a = root.parentElement; a; a = a.parentElement) a.classList.add('lyr-anc');
  }
  function done() {
    for (const c of ['lyr-freeze', 'lyr-anc']) for (const x of document.querySelectorAll('.' + c)) x.classList.remove(c);
    reset();
    for (const c of ['lyr-anc']) for (const x of document.querySelectorAll('.' + c)) x.classList.remove(c);
    for (const x of document.querySelectorAll('[data-lyr]')) x.removeAttribute('data-lyr');
  }
  /* yakalama için düğümü kaydır (yalnız kendi translate'i; yerleşim değişmez) */
  let shiftCss = null;
  function shift(nid, dx, dy) {
    const n = byId[nid];
    const elId = n.kind === 'el' ? nid : n.parent;
    const el = document.querySelector('[data-lyr="' + elId + '"]');
    if (!shiftCss) { shiftCss = document.createElement('style'); document.head.appendChild(shiftCss); }
    if (dx == null) { shiftCss.textContent = ''; el.style.removeProperty('transform'); return; }
    const tf = 'translate(' + dx + 'px,' + dy + 'px)';
    /* sözde öğe: SAHİBİ kaydırılır (kendi boyaması lyr-ownoff ile gizli) — sözdeyi kendi
       translate'iyle kaydırmak, sahibin overflow:hidden kırpmasından dışarı iterdi (köşe perçinleri) */
    el.style.setProperty('transform', tf, 'important');
    shiftCss.textContent = n.kind === 'el' ? '' : '[data-lyr="' + elId + '"]::' + n.kind + ' { transform: none !important; translate: none !important; rotate: none !important; scale: none !important; }';
  }
  return { scan, isolate, reset, done, shift };
})();
`;

/** Kökü katmanlara ayır. o = { sel, name, out, pad=40, skip:[anahtar parçaları] } */
export async function captureLayers(A, o) {
  const p = A.page;
  const pad = o.pad == null ? 40 : o.pad;
  if (!(await p.evaluate(() => !!window.__lyr))) await p.addScriptTag({ content: BROWSER });
  const S = await p.evaluate(([sel, opt]) => window.__lyr.scan(sel, opt), [o.sel, { stretch: o.stretch || 0, skip: o.skip || [] }]);
  if (!S) { console.log('KATMAN: kök yok', o.sel); return null; }
  const dir = path.join(o.out, 'img');
  fs.mkdirSync(dir, { recursive: true });
  const DPR = 3;
  let shots = 0;
  for (const n of S.nodes) {
    if (!n.paint) continue;
    if (o.skip && o.skip.some((k) => n.key.includes(k))) { n.paint = false; continue; }
    await p.evaluate(([id]) => window.__lyr.isolate(id), [n.id]);
    /* bölge (sayfa koordinatı) — düğüm kendi translate'iyle kaydırılarak görüş alanına
       döşeme döşeme getirilir: ekran dışına taşan / görüş alanından büyük katmanlar da tam yakalanır */
    const ax = S.rect[0] + n.abs[0], ay = S.rect[1] + n.abs[1];
    const x0 = Math.floor(ax - pad), y0 = Math.floor(ay - pad);
    const x1 = Math.ceil(ax + n.w + pad), y1 = Math.ceil(ay + n.h + pad);
    const tiles = [];
    for (let ty = y0; ty < y1; ty += S.vh) for (let tx = x0; tx < x1; tx += S.vw) {
      const tw = Math.min(S.vw, x1 - tx), th = Math.min(S.vh, y1 - ty);
      await p.evaluate(([id, dx, dy]) => window.__lyr.shift(id, dx, dy), [n.id, -tx, -ty]);
      const buf = await p.screenshot({ clip: { x: 0, y: 0, width: tw, height: th }, omitBackground: true });
      const h = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
      const f = 't_' + h + '.png';
      if (!fs.existsSync(path.join(dir, f))) fs.writeFileSync(path.join(dir, f), buf);
      tiles.push({ file: f, x: tx - x0, y: ty - y0 });
    }
    await p.evaluate(([id]) => window.__lyr.shift(id, null), [n.id]);
    await p.evaluate(() => window.__lyr.reset());
    /* görüntü ofseti: düğüm kutusunun sol üstüne göre (mantıksal px) — trim.py birleştirir/kırpar */
    n.img = { tiles, ox: x0 - ax, oy: y0 - ay, w: x1 - x0, h: y1 - y0, dpr: DPR };
    shots++;
  }
  await p.evaluate(() => window.__lyr.done());
  for (const n of S.nodes) delete n.abs;
  const J = { name: o.name, ...S };
  fs.writeFileSync(path.join(o.out, o.name + '.json'), JSON.stringify(J));
  console.log('katman', o.name, S.nodes.length, 'düğüm', shots, 'görüntü');
  return J;
}

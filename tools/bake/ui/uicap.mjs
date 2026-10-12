/* ARAYÜZ YAKALAMA — web oyununun DOM arayüzünü Godot'ya taşımak için.
   Her yakalama hedefi için:
     • "shell"  : elemanın KENDİ boyaması (arka plan, kenarlık, gölge, ::before/::after),
                  yazı ve alt elemanlar gizli → şeffaf PNG (3× çözünürlük)
     • "full"   : eleman alt ağacıyla birlikte, olduğu gibi
     • "text"   : görüntü yok, yalnız hesaplanmış yazı stili
   Ayrıca her hedefin dikdörtgeni ve hesaplanmış stilleri JSON'a yazılır.
   Kullanım: node uicap.mjs <senaryo.mjs> */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { captureLayers } from './layers.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/usr/local/lib/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = path.join(ROOT, 'godot/assets/ui');
const scenario = (await import(pathToFileURL(path.resolve(process.argv[2])).href)).default;
const DPR = 3;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '0.0.0.0', r));
const HOST = '192.0.2.2', port = server.address().port;
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: HOST } : undefined;
const b = await chromium.launch({ proxy, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR, ignoreHTTPSErrors: true, locale: scenario.locale || 'tr-TR' });
/* yaş kapısı yalnız onu yakalayan senaryoda görünsün */
if (!scenario.ageGate) await ctx.addInitScript(() => { try { localStorage.setItem('kh_age', JSON.stringify({ band: '18+', at: 0, v: 1 })); } catch (e) {} });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 200)));
await p.goto(`http://${HOST}:${port}/game/index.html`, { waitUntil: 'load', timeout: 90000 });
await p.waitForFunction(() => window.__game && window.__game.ui, null, { timeout: 90000 });
await p.waitForTimeout(3500);
await p.addStyleTag({ content: `
  .uicap-off { visibility: hidden !important; }
  .uicap-anc { background: none !important; box-shadow: none !important; border-color: transparent !important; outline: none !important; filter: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
  .uicap-anc::before, .uicap-anc::after { display: none !important; }
  .uicap-notext { color: transparent !important; text-shadow: none !important; -webkit-text-stroke: 0 !important; -webkit-text-fill-color: transparent !important; caret-color: transparent !important; }
  .uicap-noanim, .uicap-noanim *, .uicap-noanim::before, .uicap-noanim::after { animation-play-state: paused !important; transition: none !important; }
  html.uicap-clear, html.uicap-clear body { background: transparent !important; }
  html.uicap-clear canvas { visibility: hidden !important; }
`});
const meta = fs.existsSync(path.join(OUT, 'ui_meta.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'ui_meta.json'), 'utf8')) : {};
fs.mkdirSync(OUT, { recursive: true });
const api = {
  page: p,
  wait: (ms) => p.waitForTimeout(ms),
  eval: (fn, arg) => p.evaluate(fn, arg),
  /* katman yakalama → godot/assets/ui/lyr/<name>.json + <name>/*.png */
  layers: (o) => captureLayers({ page: p }, { out: path.join(OUT, 'lyr'), ...o }),
  /* hedef yakala: { sel, name, mode: shell|full|text, pad, keepText, children:[sel...] (shell'de görünür kalacak alt elemanlar) } */
  async cap(o) {
    const pad = o.pad == null ? 16 : o.pad;
    const info = await p.evaluate((o) => {
      const el = typeof o.sel === 'string' ? document.querySelector(o.sel) : null;
      if (!el) return null;
      const all = [...document.querySelectorAll('body *')];
      const anc = new Set(); for (let a = el.parentElement; a; a = a.parentElement) anc.add(a);
      const keep = new Set((o.children || []).flatMap((s) => [...el.querySelectorAll(s)]));
      document.documentElement.classList.add('uicap-clear');
      for (const x of all) {
        if (x === el) continue;
        if (anc.has(x)) { x.classList.add('uicap-anc'); continue; }
        if (el.contains(x)) {
          if (o.mode === 'shell' && ![...keep].some((k) => k === x || k.contains(x) || x.contains(k))) x.classList.add('uicap-off');
          if (o.mode === 'shell' && !o.keepText) x.classList.add('uicap-notext');
          continue;
        }
        x.classList.add('uicap-off');
      }
      if (o.mode === 'shell' && !o.keepText) el.classList.add('uicap-notext');
      if (o.still) el.classList.add('uicap-noanim');
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const txt = (n) => { const c = getComputedStyle(n); return { text: n.innerText, font: c.fontFamily, weight: c.fontWeight, size: parseFloat(c.fontSize), color: c.color, ls: c.letterSpacing, tt: c.textTransform, shadow: c.textShadow, align: c.textAlign, lh: c.lineHeight, stroke: c.webkitTextStrokeWidth + ' ' + c.webkitTextStrokeColor, fill: c.webkitTextFillColor, bgclip: c.webkitBackgroundClip || c.backgroundClip, bgimg: c.backgroundImage, style: c.fontStyle }; };
      const texts = [];
      for (const n of [el, ...el.querySelectorAll('*')]) {
        if (![...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
        const rr = n.getBoundingClientRect();
        texts.push(Object.assign({ sel: n.id ? '#' + n.id : (n.className && n.className.baseVal == null ? '.' + String(n.className).trim().split(/\s+/).filter((c) => !c.startsWith('uicap')).join('.') : n.tagName.toLowerCase()), x: rr.left - r.left, y: rr.top - r.top, w: rr.width, h: rr.height }, txt(n)));
      }
      return { x: r.left, y: r.top, w: r.width, h: r.height, radius: cs.borderRadius, opacity: cs.opacity, texts };
    }, o);
    if (!info) { console.log('YOK', o.sel); await this.reset(); return null; }
    if (o.mode !== 'text') {
      const clip = { x: Math.max(0, info.x - pad), y: Math.max(0, info.y - pad), width: info.w + pad * 2, height: info.h + pad * 2 };
      await p.screenshot({ path: path.join(OUT, o.name + '.png'), clip, omitBackground: true, animations: o.still ? 'disabled' : 'allow' });
      info.pad = pad; info.img = o.name + '.png'; info.dpr = DPR;
      info.ox = clip.x - info.x; info.oy = clip.y - info.y;
    }
    meta[o.name] = info;
    await this.reset();
    console.log('ok', o.name, Math.round(info.w) + 'x' + Math.round(info.h));
    return info;
  },
  async reset() {
    await p.evaluate(() => {
      document.documentElement.classList.remove('uicap-clear');
      for (const c of ['uicap-off', 'uicap-anc', 'uicap-notext', 'uicap-noanim']) for (const x of document.querySelectorAll('.' + c)) x.classList.remove(c);
    });
  },
  /* bir SVG/HTML parçasını şeffaf PNG'ye çiz (svg dizesi, CSS boyutu) */
  async svg(name, markup, w, h, css) {
    await p.evaluate(([m, w, h, css]) => {
      let d = document.getElementById('uicap-svg');
      if (!d) { d = document.createElement('div'); d.id = 'uicap-svg'; document.body.appendChild(d); }
      d.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;width:' + w + 'px;height:' + h + 'px;display:grid;place-items:center;' + (css || '');
      d.innerHTML = m;
      const s = d.querySelector('svg'); if (s) { s.style.width = '100%'; s.style.height = '100%'; }
    }, [markup, w, h, css]);
    await p.evaluate(() => { document.documentElement.classList.add('uicap-clear'); for (const x of document.querySelectorAll('body > *')) if (x.id !== 'uicap-svg') x.classList.add('uicap-off'); });
    await p.screenshot({ path: path.join(OUT, name + '.png'), clip: { x: 0, y: 0, width: w, height: h }, omitBackground: true });
    await p.evaluate(() => { const d = document.getElementById('uicap-svg'); if (d) d.remove(); });
    await this.reset();
    if (!name.startsWith('lyr/')) meta[name] = { svg: true, w, h, img: name + '.png', dpr: DPR };
  },
};
try { await scenario.run(api); } catch (e) { console.log('HATA', e.stack); }
fs.writeFileSync(path.join(OUT, 'ui_meta.json'), JSON.stringify(meta, null, 1));
await b.close(); server.close();

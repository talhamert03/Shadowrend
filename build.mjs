/* ═══════════════════════════════════════════════════════════
   build.mjs — ÜRETİM PAKETİ (v44)   ·   npm install && npm run build

   Çıktı: dist/  (Capacitor webDir) — ağa HİÇ dokunmayan, küçültülmüş paket.
   ① JS: game/main.js'ten tek grafik; three.js node_modules'tan gömülür
      (importmap + unpkg biter). `?v=` ekleri silinir, çıktı adı İÇERİK
      ÖZETİ taşır → "sürüm eki artırmayı unuttum" hatası (v33c) imkânsız.
   ② CSS: küçültülür, fontlar yerel @font-face (fontsource woff2).
   ③ Draco çözücü: three'nin kendi kopyası dist/vendor/draco/.
   ④ Varlıklar: game/assets · store · manifest · version.json · sw.js.
      `_` ile başlayan tezgah dosyaları PAKETE GİRMEZ.
   ═══════════════════════════════════════════════════════════ */
import * as esbuild from 'esbuild';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'game', OUT = 'dist';
const rm = (p) => fs.rmSync(p, { recursive: true, force: true });
const mk = (p) => fs.mkdirSync(p, { recursive: true });
const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);
const kb = (n) => (n / 1024).toFixed(0) + ' KB';

function copyDir(src, dst, skip = () => false) {
  if (!fs.existsSync(src)) return 0;
  mk(dst);
  let n = 0;
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name.startsWith('_') || e.name.startsWith('.') || skip(e.name)) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) n += copyDir(s, d, skip);
    else { fs.copyFileSync(s, d); n += fs.statSync(s).size; }
  }
  return n;
}

/* `./x.js?v=20260924c` → `./x.js` */
const stripQuery = {
  name: 'strip-query',
  setup(b) {
    b.onResolve({ filter: /\?/ }, (a) => {
      const clean = a.path.replace(/\?.*$/, '');
      return { path: path.resolve(a.resolveDir, clean) };
    });
  },
};

rm(OUT); mk(OUT);

/* ① JS */
const js = await esbuild.build({
  entryPoints: [path.join(SRC, 'main.js')],
  bundle: true, splitting: true, format: 'esm', target: ['es2020', 'chrome90', 'safari15'],
  minify: true, sourcemap: false, legalComments: 'none',
  outdir: path.join(OUT, 'js'), entryNames: 'app-[hash]', chunkNames: 'c-[hash]',
  plugins: [stripQuery], metafile: true, logLevel: 'warning',
  drop: ['debugger'],
});
const entry = Object.keys(js.metafile.outputs).find((k) => js.metafile.outputs[k].entryPoint);
const jsName = path.relative(OUT, entry).split(path.sep).join('/');
const jsSize = Object.keys(js.metafile.outputs).reduce((s, k) => s + js.metafile.outputs[k].bytes, 0);

/* ② CSS + fontlar */
mk(path.join(OUT, 'fonts'));
const FONTS = [
  ['Cinzel', 600, '@fontsource/cinzel/files/cinzel-latin-ext-600-normal.woff2', '@fontsource/cinzel/files/cinzel-latin-600-normal.woff2'],
  ['Cinzel', 800, '@fontsource/cinzel/files/cinzel-latin-ext-800-normal.woff2', '@fontsource/cinzel/files/cinzel-latin-800-normal.woff2'],
  ['Chakra Petch', 400, '@fontsource/chakra-petch/files/chakra-petch-latin-ext-400-normal.woff2', '@fontsource/chakra-petch/files/chakra-petch-latin-400-normal.woff2'],
  ['Chakra Petch', 600, '@fontsource/chakra-petch/files/chakra-petch-latin-ext-600-normal.woff2', '@fontsource/chakra-petch/files/chakra-petch-latin-600-normal.woff2'],
  ['Chakra Petch', 700, '@fontsource/chakra-petch/files/chakra-petch-latin-ext-700-normal.woff2', '@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2'],
];
let face = '';
for (const [fam, w, ext, lat] of FONTS) {
  /* Türkçe (ş ğ ı İ) latin-ext alt kümesinde; ikisi birden yüklenir. */
  for (const [f, range] of [[lat, 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
                            [ext, 'U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF']]) {
    const src = path.join('node_modules', f);
    if (!fs.existsSync(src)) { console.warn('font yok:', f); continue; }
    const name = path.basename(f);
    fs.copyFileSync(src, path.join(OUT, 'fonts', name));
    face += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:block;src:url(../fonts/${name}) format('woff2');unicode-range:${range}}`;
  }
}
const cssRaw = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8')
  .replace(/url\((['"]?)(?!data:|https?:|\.\.\/)([^'")]+)\1\)/g, (m, q, u) => `url(${q}../${u}${q})`);
const css = (await esbuild.transform(face + cssRaw, { loader: 'css', minify: true })).code;
mk(path.join(OUT, 'css'));
const cssName = `css/style-${hash(css)}.css`;
fs.writeFileSync(path.join(OUT, cssName), css);

/* ③ Draco */
const dracoN = copyDir(path.join('node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf'), path.join(OUT, 'vendor', 'draco'));

/* ④ Varlıklar */
const assetsN = copyDir(path.join(SRC, 'assets'), path.join(OUT, 'assets'));
copyDir(path.join(SRC, 'store'), path.join(OUT, 'store'));

/* ④b v53 B6 — DOKU SIKIŞTIRMA (isteğe bağlı, `npm i -D sharp`): paketteki
   PNG/JPG AYNI AD ve AYNI biçimde yeniden kodlanır (PNG paletli q90,
   JPG mozjpeg q82), yalnız küçülürse yazılır — hiçbir referans değişmez.
   sharp yoksa adım sessizce atlanır. KTX2 (GPU sıkıştırma) için `toktx`
   gerekir; bkz. BUILD.md. */
let texSaved = 0, texN = 0;
try {
  const sharp = (await import('sharp')).default;
  const walk = async (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f), st = fs.statSync(p);
      if (st.isDirectory()) { await walk(p); continue; }
      if (st.size < 48 * 1024 || !/\.(png|jpe?g)$/i.test(f)) continue;
      const png = /\.png$/i.test(f);
      const buf = png
        ? await sharp(p).png({ palette: true, quality: 90, compressionLevel: 9, effort: 8 }).toBuffer()
        : await sharp(p).jpeg({ mozjpeg: true, quality: 82 }).toBuffer();
      if (buf.length < st.size * 0.95) { fs.writeFileSync(p, buf); texSaved += st.size - buf.length; texN++; }
    }
  };
  await walk(path.join(OUT, 'assets'));
} catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') console.warn('doku sıkıştırma atlandı:', e.message); }

/* ④c v53 B6 — GLB İÇİ DOKULAR → WebP (isteğe bağlı: `npm i -D @gltf-transform/core
   @gltf-transform/extensions @gltf-transform/functions draco3dgltf sharp`).
   GLB'lerin gömülü PNG/JPG dokuları EXT_texture_webp ile WebP'ye çevrilir
   (three r169 GLTFLoader yerel destekler), ≤2048 px'e kırpılır, Draco korunur.
   NEDEN KTX2 DEĞİL: loadDecimatedHero/Prop dokuyu tuvale ÇİZİP yeniden
   örnekler; GPU-sıkıştırılmış KTX2 tuvale çizilemez → sadeleştirme kırılırdı.
   GPU belleği zaten budgetTextures ile kademeye göre kısılıyor. */
let glbSaved = 0, glbN = 0;
try {
  const { NodeIO } = await import('@gltf-transform/core');
  const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
  const { textureCompress, resample, prune } = await import('@gltf-transform/functions');
  const draco3d = (await import('draco3dgltf')).default;
  const sharp = (await import('sharp')).default;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  });
  const walkG = async (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f), st = fs.statSync(p);
      if (st.isDirectory()) { await walkG(p); continue; }
      if (!/\.glb$/i.test(f) || st.size < 128 * 1024) continue;
      const doc = await io.read(p);
      await doc.transform(resample(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 88 }));
      const out = await io.writeBinary(doc);
      if (out.byteLength < st.size * 0.95) { fs.writeFileSync(p, out); glbSaved += st.size - out.byteLength; glbN++; }
    }
  };
  await walkG(path.join(OUT, 'assets'));
} catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') console.warn('GLB doku sıkıştırma atlandı:', e.message); }
for (const f of ['manifest.webmanifest', 'version.json', 'sw.js']) fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));

/* ⑤ index.html */
let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
html = html
  .replace(/<link rel="preconnect"[^>]*>\s*/g, '')
  .replace(/<link rel="modulepreload"[^>]*>\s*/g, '')
  .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '')
  .replace(/<!-- three\.js ve Draco[\s\S]*?-->\s*/g, '')
  .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, `<script>window.__SR_DRACO='./vendor/draco/';</script>\n`)
  .replace(/<link rel="stylesheet" href="style\.css[^"]*">/, `<link rel="stylesheet" href="${cssName}">`)
  .replace(/<script type="module" src="main\.js[^"]*"><\/script>/, `<script type="module" src="${jsName}"></script>`)
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\n\s*\n+/g, '\n');
fs.writeFileSync(path.join(OUT, 'index.html'), html);

/* ⑥ Denetim: pakette dış kaynak kalmamalı */
const leaks = [];
for (const f of [path.join(OUT, 'index.html'), path.join(OUT, cssName)]) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/https?:\/\/(unpkg\.com|fonts\.g\w+\.com|www\.gstatic\.com)[^\s"')]*/g)) leaks.push(path.basename(f) + ': ' + m[0]);
}
console.log('\n SHADOWREND — üretim paketi');
console.log(' js     ', kb(jsSize), ' →', jsName);
console.log(' css    ', kb(css.length), ' →', cssName, `(kaynak ${kb(cssRaw.length)})`);
console.log(' draco  ', kb(dracoN));
console.log(' varlık ', kb(assetsN));
console.log(' glb    ', glbN ? glbN + ' dosya, ' + kb(glbSaved) + ' kazanç' : 'atlandı (@gltf-transform yok)');
console.log(' doku   ', texN ? texN + ' dosya, ' + kb(texSaved) + ' kazanç' : 'atlandı (sharp yok)');
console.log(leaks.length ? ' ⚠ DIŞ KAYNAK KALDI:\n  ' + leaks.join('\n  ') : ' ✓ dış kaynak yok (çevrimdışı)');

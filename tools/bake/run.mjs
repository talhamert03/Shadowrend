/* Pişirme koşucusu: web oyununun KENDİ kodunu başsız Chromium'da çalıştırıp
   ürettiklerini (GLB, PNG, JSON) Godot projesine yazar.
   Kullanım: node tools/bake/run.mjs <sayfa.html> [zamanAşımıSn]
   Sayfa, window.__save(yol, base64) ile dosya yazar; bitince window.__done = true. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/usr/local/lib/node_modules/playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'godot');
const page = process.argv[2];
const timeoutS = +(process.argv[3] || 900);
const HOST = process.env.BAKE_HOST || '192.0.2.2';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.wasm': 'application/wasm', '.svg': 'image/svg+xml',
};
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '0.0.0.0', r));
const port = server.address().port;

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: HOST } : undefined;
const browser = await chromium.launch({
  proxy,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 1024, height: 1024 }, ignoreHTTPSErrors: true });
const p = await ctx.newPage();
p.on('console', (m) => console.log('[' + m.type() + ']', m.text().slice(0, 400)));
p.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 400)));
let written = 0;
await p.exposeFunction('__save', (rel, b64) => {
  const dst = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, Buffer.from(b64, 'base64'));
  written++;
  console.log('  yazıldı', rel, (fs.statSync(dst).size / 1024).toFixed(0) + ' KB');
});
await p.goto(`http://${HOST}:${port}/tools/bake/pages/${page}`, { waitUntil: 'load', timeout: 120000 });
const t0 = Date.now();
while (!(await p.evaluate(() => window.__done === true))) {
  if (Date.now() - t0 > timeoutS * 1000) { console.log('ZAMAN AŞIMI'); break; }
  await new Promise((r) => setTimeout(r, 500));
}
const err = await p.evaluate(() => window.__err || null);
await browser.close();
server.close();
console.log(`bitti: ${written} dosya` + (err ? ' · HATA: ' + err : ''));
process.exit(err ? 1 : 0);

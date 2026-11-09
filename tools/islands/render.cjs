// SVG → saydam PNG (2x). Kullanım: node render.js in.svg out.png [ölçek]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [inp, out, sc] = process.argv.slice(2);
  const svg = fs.readFileSync(inp, 'utf8');
  const m = svg.match(/width="(\d+)" height="(\d+)"/);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +m[1], height: +m[2] }, deviceScaleFactor: +(sc || 2) });
  await p.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
  await p.screenshot({ path: out, omitBackground: true });
  await b.close();
})();

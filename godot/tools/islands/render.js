const { chromium } = require('playwright');
(async () => {
  const dir = process.argv[2];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 1000 } });
  for (let i = 1; i <= 10; i++) {  // w<i>.svg → w<i>.png (saydam)
    await p.goto('file://' + dir + '/w' + i + '.svg');
    await p.screenshot({ path: dir + '/w' + i + '.png', omitBackground: true });
  }
  await b.close();
})();

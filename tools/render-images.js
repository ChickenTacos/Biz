/* Renders the raster images from the SVG logo and the OG card template.
   Needs Node and Playwright (npm i -D playwright && npx playwright install chromium).
     node tools/render-images.js
   Writes: assets/img/og-image.png, apple-touch-icon.png, icon-192.png, icon-512.png,
           and tools/.favicon-{16,32,48}.png (then run tools/make_favicon.py for favicon.ico). */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const url = (p) => 'file://' + path.join(ROOT, p);
const MARK = fs.readFileSync(path.join(ROOT, 'assets/brand/mark-on-dark.svg'), 'utf8')
  .replace(/<\?xml[^>]*>/, '').replace(/<title>.*?<\/title>/, '');

function iconPage(size, markScale, radius) {
  const m = Math.round(size * markScale);
  return `<!doctype html><html><head><style>
    html,body{margin:0;background:transparent}
    .i{width:${size}px;height:${size}px;background:#1f2bff;border-radius:${radius}px;display:grid;place-items:center}
    .i svg{width:${m}px;height:${m}px}
  </style></head><body><div class="i">${MARK.replace(/width="64" height="64"/, '')}</div></body></html>`;
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

  // Open Graph card
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await og.goto(url('tools/og-card.html'));
  const ok = await og.evaluate(() => window.ogReady);
  await og.waitForTimeout(300);
  await og.screenshot({ path: path.join(ROOT, 'assets/img/og-image.png') });
  console.log('og-image.png', ok ? '(with ASCII render)' : '(no WebGL, text only)');

  // App icons: full-bleed squares (iOS and Android round them themselves)
  const icons = [
    ['apple-touch-icon.png', 180, 0.7, 0],
    ['icon-192.png', 192, 0.6, 0],
    ['icon-512.png', 512, 0.6, 0],
    ['tools/.favicon-16.png', 16, 0.94, 3],
    ['tools/.favicon-32.png', 32, 0.9, 7],
    ['tools/.favicon-48.png', 48, 0.9, 10],
  ];
  for (const [file, size, scale, radius] of icons) {
    const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await p.setContent(iconPage(size, scale, radius));
    await p.screenshot({ path: path.join(ROOT, file), omitBackground: true });
    await p.close();
    console.log(file);
  }
  await browser.close();
})();

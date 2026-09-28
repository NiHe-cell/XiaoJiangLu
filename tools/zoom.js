/** 局部放大截图：把关键边缘区域裁出来看，用于肉眼复核探针结论 */
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', 'build', 'web-mobile'); const PORT = 8128;
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.bin': 'application/octet-stream', '.css': 'text/css' };
const serve = () => new Promise((r) => { const s = http.createServer((q, res) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f)) { res.writeHead(404); res.end('nf'); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }); s.listen(PORT, () => r(s)); });
(async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(6000);
  const sc = 844 / 1280, sx = (d) => 195 + d * sc, sy = (d) => (640 - d) * sc;
  await page.mouse.click(sx(0), sy(20)); await page.waitForTimeout(1200);
  await page.mouse.click(sx(-148), sy(300)); await page.waitForTimeout(3500);
  await page.screenshot({ path: path.resolve(__dirname, 'zoom-topbar.png'), clip: { x: 0, y: 0, width: 390, height: 60 } });
  await page.screenshot({ path: path.resolve(__dirname, 'zoom-bottombar.png'), clip: { x: 0, y: 700, width: 390, height: 144 } });
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(2); });

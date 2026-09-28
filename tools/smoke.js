/**
 * 运行时冒烟（Phase 3 验收闸）：
 *   1) 构建 web-mobile
 *   2) 起本地静态服务
 *   3) Playwright + SwiftShader 打开页面，抓 console error / pageerror
 *   4) 截图到 tools/smoke-*.png
 *
 * 用法：node tools/smoke.js
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'build', 'web-mobile');
const PORT = 8123;

const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream',
    '.css': 'text/css', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
};

function serve () {
    return new Promise((resolve) => {
        const s = http.createServer((req, res) => {
            let p = decodeURIComponent(req.url.split('?')[0]);
            if (p === '/') p = '/index.html';
            const f = path.join(ROOT, p);
            if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
            res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
            fs.createReadStream(f).pipe(res);
        });
        s.listen(PORT, () => resolve(s));
    });
}

(async () => {
    if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
        console.error('❌ 未找到构建产物，请先构建 web-mobile');
        process.exit(1);
    }
    const server = await serve();
    const browser = await chromium.launch({
        args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

    const errors = [];
    const logs = [];
    page.on('console', (m) => {
        const t = m.type();
        const s = m.text();
        logs.push(`[${t}] ${s}`);
        if (t === 'error') errors.push(s);
    });
    page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e && e.message ? e.message : String(e))));

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(6000);

    await page.screenshot({ path: path.resolve(__dirname, 'smoke-home.png') });

    // 点一次「出征」（大按钮在中部偏下）
    await page.mouse.click(195, 460);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.resolve(__dirname, 'smoke-stage.png') });

    // 点第一关
    await page.mouse.click(195, 172);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.resolve(__dirname, 'smoke-battle.png') });

    await page.waitForTimeout(6000);
    await page.screenshot({ path: path.resolve(__dirname, 'smoke-battle2.png') });

    console.log('---- console (tail 40) ----');
    console.log(logs.slice(-40).join('\n'));
    console.log('---- errors ----');
    console.log(errors.length ? errors.join('\n') : '(无)');

    await browser.close();
    server.close();
    process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

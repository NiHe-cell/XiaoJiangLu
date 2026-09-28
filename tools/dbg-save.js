/** 一次性诊断：为什么打完一场后 localStorage 里没有存档 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', 'build', 'web-mobile');
const PORT = 8130;
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.bin': 'application/octet-stream', '.css': 'text/css' };
const serve = () => new Promise((r) => {
    const s = http.createServer((q, res) => {
        let p = decodeURIComponent(q.url.split('?')[0]);
        if (p === '/') p = '/index.html';
        const f = path.join(ROOT, p);
        if (!fs.existsSync(f)) { res.writeHead(404); res.end('nf'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
        fs.createReadStream(f).pipe(res);
    });
    s.listen(PORT, () => r(s));
});

(async () => {
    const server = await serve();
    const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const msgs = [];
    page.on('console', (m) => msgs.push('[' + m.type() + '] ' + m.text()));
    page.on('pageerror', (e) => msgs.push('PAGEERROR ' + String(e && e.message)));
    await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(6000);

    console.log('--- 环境探测 ---');
    console.log(await page.evaluate(() => {
        const cc = window.cc || window.CC;
        const out = {};
        out.hasCCsys = !!(cc && cc.sys);
        out.sysStorageType = cc && cc.sys ? typeof cc.sys.localStorage : 'n/a';
        out.hasInitFn = !!(cc && cc.sys && cc.sys.localStorage && typeof cc.sys.localStorage.init === 'function');
        out.rawLocalStorage = typeof window.localStorage;
        try { window.localStorage.setItem('__probe__', '1'); out.directWrite = window.localStorage.getItem('__probe__'); } catch (e) { out.directWrite = 'ERR ' + e.message; }
        try { cc.sys.localStorage.setItem('__probe2__', '2'); out.sysWrite = cc.sys.localStorage.getItem('__probe2__'); } catch (e) { out.sysWrite = 'ERR ' + e.message; }
        out.keys = Object.keys(window.localStorage);
        return out;
    }));

    const sc = 844 / 1280;
    const sx = (d) => 195 + d * sc;
    const sy = (d) => (640 - d) * sc;
    await page.mouse.click(sx(0), sy(20));
    await page.waitForTimeout(1200);
    await page.mouse.click(sx(-148), sy(300));
    for (const t of [5000, 5000, 5000, 5000, 5000]) {
        await page.waitForTimeout(t);
        const st = await page.evaluate(() => {
            const cc = window.cc || window.CC;
            const canvas = cc.director.getScene().getChildByName('Canvas');
            const root = canvas.getChildByName('UIRoot');
            return { panels: root.children.filter((c) => c.activeInHierarchy).map((c) => c.name), keys: Object.keys(window.localStorage) };
        });
        console.log(`  t+${t}ms 可见面板=[${st.panels.join(',')}] localStorage=${JSON.stringify(st.keys)}`);
    }

    console.log('\n--- 打完之后 ---');
    console.log(await page.evaluate(() => ({ keys: Object.keys(window.localStorage), size: window.localStorage.length })));

    console.log('\n--- 所有 console 消息 ---');
    console.log(msgs.filter((m) => m.indexOf('[timeEnd]') < 0).join('\n') || '(无)');
    await browser.close();
    server.close();
})().catch((e) => { console.error(e); process.exit(2); });

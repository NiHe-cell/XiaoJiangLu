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

    // 安全区参考线：设计分辨率 720×1280 fitHeight，视口 390×844
    //   scale = 844/1280 = 0.6594；可见设计宽度 = 390/0.6594 = 591.4 → 半宽 295.7
    //   规范安全半宽 SAFE_X = 290 → 屏幕像素 195 ± 290*0.6594 = [3.8, 386.2]
    const drawGuide = async () => {
        await page.evaluate(() => {
            document.querySelectorAll('.safe-guide').forEach((n) => n.remove());
            const w = window.innerWidth, h = window.innerHeight;
            const scale = h / 1280;
            const px = (w / 2) + 290 * scale;
            const mk = (left) => {
                const d = document.createElement('div');
                d.className = 'safe-guide';
                d.style.cssText = `position:fixed;top:0;bottom:0;width:1px;background:rgba(255,0,80,.9);z-index:99999;left:${left}px;pointer-events:none`;
                document.body.appendChild(d);
            };
            mk(w / 2 - 290 * scale); mk(px);
            const t = document.createElement('div');
            t.className = 'safe-guide';
            t.style.cssText = `position:fixed;top:0;left:0;right:0;height:18px;background:rgba(255,0,80,.18);z-index:99999;pointer-events:none`;
            document.body.appendChild(t);
        });
    };
    const scale = 844 / 1280;
    const sx = (dx) => 195 + dx * scale;   // 设计 x → 屏幕 x
    const sy = (dy) => (640 - dy) * scale; // 设计 y → 屏幕 y

    // ---- 底部导航巡检：阵容 / 武将 / 招募 / 背包，逐个截图查安全区 ----
    // nav 中心 design y=-566，5 个页签 design x = [-240,-120,0,120,240]
    const navY = sy(-566);
    for (const [key, dx] of [['lineup', -120], ['hero', 0], ['recruit', 120], ['bag', 240]]) {
        await page.mouse.click(sx(dx), navY);
        await page.waitForTimeout(1200);
        await drawGuide();
        await page.screenshot({ path: path.resolve(__dirname, `smoke-${key}.png`) });
    }
    await page.mouse.click(sx(-240), navY); // 回主城
    await page.waitForTimeout(1200);

    await drawGuide();
    await page.screenshot({ path: path.resolve(__dirname, 'smoke-home.png') });

    // 点「出征」大按钮：中心 design(0, 20)，不能用屏幕像素硬编码 ——
    // 旧值 (195,460) 换算成 design y ≈ -58，落在出征按钮与快捷入口之间的空白，
    // 实际会点到主城的武将卡，于是「战斗截图」拍的是武将详情。
    await page.mouse.click(sx(0), sy(20));
    await page.waitForTimeout(1500);
    await drawGuide();
    await page.screenshot({ path: path.resolve(__dirname, 'smoke-stage.png') });

    // 点第一关
    await page.mouse.click(sx(-148), sy(300)); // 第一关关卡卡中心 design(-148,300)
    await page.waitForTimeout(4000);
    await drawGuide();
    await page.screenshot({ path: path.resolve(__dirname, 'smoke-battle.png') });

    await page.waitForTimeout(6000);
    await drawGuide();
    await page.screenshot({ path: path.resolve(__dirname, 'smoke-battle2.png') });

    // 打完后应是结算面板：再等一会并截图，验证战斗 → 结算整条链路
    await page.waitForTimeout(8000);
    await drawGuide();
    await page.screenshot({ path: path.resolve(__dirname, 'smoke-result.png') });
    const panels = await page.evaluate(() => {
        const cc = window.cc || window.CC;
        const canvas = cc.director.getScene().getChildByName('Canvas');
        const root = canvas.getChildByName('UIRoot');
        return root.children.filter((c) => c.activeInHierarchy).map((c) => c.name);
    });
    console.log('---- 打完后的可见面板 ----');
    console.log(panels.join(', '));

    console.log('---- console (tail 40) ----');
    console.log(logs.slice(-40).join('\n'));
    console.log('---- errors ----');
    console.log(errors.length ? errors.join('\n') : '(无)');

    await browser.close();
    server.close();
    process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

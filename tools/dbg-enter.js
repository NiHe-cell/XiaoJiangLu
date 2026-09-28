/** 一次性调试：为什么点关卡卡没有进入战斗面板 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'build', 'web-mobile');
const PORT = 8127;
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream', '.css': 'text/css' };
function serve () {
    return new Promise((r) => {
        const s = http.createServer((req, res) => {
            let p = decodeURIComponent(req.url.split('?')[0]);
            if (p === '/') p = '/index.html';
            const f = path.join(ROOT, p);
            if (!fs.existsSync(f)) { res.writeHead(404); res.end('nf'); return; }
            res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
            fs.createReadStream(f).pipe(res);
        });
        s.listen(PORT, () => r(s));
    });
}

(async () => {
    const server = await serve();
    const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errs = [];
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e && e.message)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(6000);

    const sc = 844 / 1280;
    const sx = (d) => 195 + d * sc;
    const sy = (d) => (640 - d) * sc;

    const dump = async (tag) => {
        const r = await page.evaluate(() => {
            const cc = window.cc || window.CC;
            const canvas = cc.director.getScene().getChildByName('Canvas');
            const root = canvas.getChildByName('UIRoot');
            const UT = 'cc.UITransform';
            const cUT = canvas.getComponent(UT);
            const cx0 = cUT.contentSize.width / 2, cy0 = cUT.contentSize.height / 2;
            const out = [];
            const walk = (n, d) => {
                const ut = n.getComponent(UT);
                if (ut) {
                    const p = n.getWorldPosition();
                    const lb = n.getComponent('cc.Label');
                    out.push({ d, name: n.name, cx: Math.round(p.x - cx0), cy: Math.round(p.y - cy0),
                        w: Math.round(ut.contentSize.width), h: Math.round(ut.contentSize.height),
                        act: n.activeInHierarchy, txt: lb ? lb.string : '' });
                }
                n.children.forEach((c) => walk(c, d + 1));
            };
            walk(root, 0);
            return { panels: root.children.map((c) => c.name + (c.activeInHierarchy ? '' : '[hidden]')), out };
        });
        console.log(`\n---- ${tag} ----`);
        console.log('UIRoot 子面板:', r.panels.join(', '));
        // 打印在关卡列表区域（design y 200~400）内的可点节点
        const near = r.out.filter((x) => x.cy > 180 && x.cy < 420 && x.w > 100);
        console.log('design y∈(180,420) 的宽节点:');
        near.forEach((x) => console.log(`   d${x.d} ${x.name} c=(${x.cx},${x.cy}) ${x.w}×${x.h} act=${x.act} "${(x.txt || '').slice(0, 24)}"`));
    };

    await page.mouse.click(sx(0), sy(20)); // 出征
    await page.waitForTimeout(1500);
    await dump('推图面板');

    console.log(`\n点击关卡卡 design(-148,300) => 屏幕(${Math.round(sx(-148))},${Math.round(sy(300))})`);
    await page.mouse.click(sx(-148), sy(300));
    await page.waitForTimeout(2500);
    await dump('点击后');

    console.log('\n错误:', errs.length ? errs.join('\n') : '(无)');
    await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(2); });

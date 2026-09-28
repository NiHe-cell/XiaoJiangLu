/**
 * 一次性诊断：Fx.confirm 的按钮到底量到了哪个节点
 *
 * 起因：sweep-test.js 报「扫荡」按钮尺寸 56×43，而 Fx.ts:52 明明是 nd('btnYes', 200, 76)。
 * 位置 (-110,-66) 又和 yes.setPosition(-110,-66) 完全一致 —— 说明爬到的确实是 btnYes，
 * 尺寸却对不上。要么是我测量代码爬错了节点，要么真有尺寸被改的地方。
 *
 * 做法：直接造一个「101 三星」存档（不用真打一场，省 26 秒），点开关卡弹确认框，
 * 然后把所有带 Label 的节点的【名字 / 尺寸 / 世界坐标 / 是否有 touch 监听 / 父链】全打出来。
 *
 * 用法：NODE_PATH=<managed node_modules> node tools/dbg-confirm.js
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'build', 'web-mobile');
const PORT = 8131;
const SAVE_KEY = 'xxl_save_v1';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream', '.css': 'text/css' };

function serve () {
    return new Promise((r) => {
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
}

const DUMP_FN = () => {
    const cc = window.cc || window.CC;
    const canvas = cc.director.getScene().getChildByName('Canvas');
    const UT = 'cc.UITransform', LB = 'cc.Label';
    const cUT = canvas.getComponent(UT);
    const cx0 = cUT.contentSize.width / 2, cy0 = cUT.contentSize.height / 2;
    const chain = (n) => { const a = []; let p = n; while (p) { a.push(p.name); p = p.parent; } return a.join('/'); };
    const out = [];
    const walk = (n) => {
        if (!n.activeInHierarchy) return;
        const lb = n.getComponent(LB);
        const ut = n.getComponent(UT);
        if (lb) {
            out.push({
                chain: chain(n),
                text: (lb.string || '').slice(0, 12),
                size: ut ? `${Math.round(ut.contentSize.width)}×${Math.round(ut.contentSize.height)}` : '(no UT)',
                pos: (() => { const w = n.getWorldPosition(); return `${Math.round(w.x - cx0)},${Math.round(w.y - cy0)}`; })(),
                touchEnd: n.hasEventListener('touch-end'),
                firstTouchAncestor: (() => {
                    let p = n;
                    while (p && !p.hasEventListener('touch-end')) p = p.parent;
                    if (!p) return '(无)';
                    const t = p.getComponent(UT);
                    return `${p.name}[${Math.round(t.contentSize.width)}×${Math.round(t.contentSize.height)}]`;
                })(),
            });
        }
        n.children.forEach(walk);
    };
    canvas.children.forEach(walk);
    return out;
};

(async () => {
    const server = await serve();
    const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errs = [];
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e && e.message)));

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000);

    // 造「101 三星」档：只需 heroes/lineup 非空就能通过 migrate 校验，其余字段走 defaultData。
    // 注意 HeroState.equip 是五个槽位的对象，缺了它 Home 的战力估算会读 hero.equip.weapon 直接崩
    // （第一版合成档就栽在这：PAGEERROR Cannot read properties of undefined (reading 'weapon')）
    await page.evaluate((k) => {
        localStorage.setItem(k, JSON.stringify({
            heroes: {
                1000: { confId: 1000, level: 1, exp: 0, star: 1, adv: 0, equip: { weapon: 0, armor: 0, helmet: 0, necklace: 0, treasure: 0 } },
                1001: { confId: 1001, level: 1, exp: 0, star: 1, adv: 0, equip: { weapon: 0, armor: 0, helmet: 0, necklace: 0, treasure: 0 } },
            },
            lineup: [1000, 1001],
            stageStars: { 101: 3 },
            maxStageId: 101,
            stamina: 120,
        }));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(5000);

    const sc = 844 / 1280;
    const sx = (d) => 195 + d * sc;
    const sy = (d) => (640 - d) * sc;

    await page.mouse.click(sx(0), sy(20));    // 出征
    await page.waitForTimeout(1500);
    await page.mouse.click(sx(-148), sy(300)); // 关卡 101
    await page.waitForTimeout(1500);

    const rows = await page.evaluate(DUMP_FN);
    console.log('—— 此刻所有带 Label 的节点 ——');
    rows.forEach((r) => {
        console.log(`  ${r.size.padEnd(10)} pos(${r.pos.padEnd(9)}) touchEnd=${String(r.touchEnd).padEnd(5)} 首个touch祖先=${r.firstTouchAncestor.padEnd(22)} "${r.text}"`);
        console.log(`      链: ${r.chain}`);
    });
    console.log('\n—— 只含「扫荡」/「再想想」的 ——');
    rows.filter((r) => /扫荡|再想想/.test(r.text)).forEach((r) => {
        console.log(`  "${r.text}" 自身 ${r.size}  爬到的祖先 ${r.firstTouchAncestor}\n      链: ${r.chain}`);
    });
    await page.screenshot({ path: path.resolve(__dirname, 'dbg-confirm.png') });
    console.log('\n运行时错误：', errs.length ? [...new Set(errs)].join(' | ') : '(无)');

    await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(2); });

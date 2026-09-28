/**
 * 扫荡链路端到端测试
 *
 * 为什么单独写：扫荡的前置是「该关已达三星」，而旧星级规则（零阵亡 且 ≤4 回合）
 * 让三星率恒为 0%，所以这条路径从来没被真正跑通过 —— 只能靠人工构造三星存档来验。
 *
 * 手法：先打一场让游戏把存档写进 localStorage，再把 stageStars[101] 改成 3 并重载，
 * 然后点这一关 —— 应当出现「扫荡 / 再想想」确认框，而不是直接进战斗。
 * 点「扫荡」后校验：体力确实被扣、且出现扫荡结算反馈。
 *
 * 用法：NODE_PATH=<managed node_modules> node tools/sweep-test.js
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'build', 'web-mobile');
const PORT = 8129;
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

/** 读当前场景里所有可见 Label 的文字，用来断言界面反馈 */
const LABELS_FN = () => {
    const cc = window.cc || window.CC;
    const canvas = cc.director.getScene().getChildByName('Canvas');
    const root = canvas.getChildByName('UIRoot');
    const out = [];
    const walk = (n) => {
        if (n.activeInHierarchy) {
            const lb = n.getComponent('cc.Label');
            if (lb && lb.string) out.push(lb.string);
            n.children.forEach(walk);
        }
    };
    walk(root);
    return out;
};

(async () => {
    const server = await serve();
    const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errs = [];
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e && e.message)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

    const sc = 844 / 1280;
    const sx = (d) => 195 + d * sc;
    const sy = (d) => (640 - d) * sc;

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(6000);

    // 打一场，逼游戏写出存档。
    // 注意：1 倍速下一场 2 回合战斗实测要 15-20 秒（事件间隔 0.34s/个，双方约 11 个单位各出手一次），
    // 等 10 秒是等不到的 —— 存档只在打赢那一刻写，等短了会误判成「游戏不落盘」。
    await page.mouse.click(sx(0), sy(20));
    await page.waitForTimeout(1200);
    await page.mouse.click(sx(-148), sy(300));
    await page.waitForTimeout(26000);

    let save = await page.evaluate((k) => {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : null;
    }, SAVE_KEY);
    console.log('步骤1 打完一场后存档：', save ? `存在，体力=${save.stamina} maxStageId=${save.maxStageId}` : '❌ 不存在（游戏没有落盘）');
    if (!save) { console.log('❌ 无法继续：游戏未写存档'); await browser.close(); server.close(); process.exit(1); }

    // 造一个「101 已三星」的存档
    save.stageStars = save.stageStars || {};
    save.stageStars[101] = 3;
    save.stamina = 120;
    const beforeStamina = save.stamina;
    await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [SAVE_KEY, save]);

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(6000);

    // 进推图 → 点 101
    await page.mouse.click(sx(0), sy(20));
    await page.waitForTimeout(1200);
    const stageLabels = await page.evaluate(LABELS_FN);
    console.log('步骤2 推图面板上 101 的星级标记应为三星；可见文本含「扫荡」=', stageLabels.some((s) => s.includes('扫荡')));

    await page.mouse.click(sx(-148), sy(300));
    await page.waitForTimeout(1200);
    let labels = await page.evaluate(LABELS_FN);
    const hasConfirm = labels.some((s) => s.includes('扫荡'));
    const hasCancel = labels.some((s) => s.includes('再想想'));
    console.log('步骤3 点三星关卡 → 应出现扫荡确认框');
    console.log('   「扫荡」按钮 =', hasConfirm, '  「再想想」按钮 =', hasCancel);
    console.log('   当前可见文本：', labels.filter((s) => s.length < 30).slice(-10).join(' | '));

    if (!hasConfirm) {
        console.log('❌ 未出现扫荡确认框 —— 那条路径不通（或该关不是三星）');
        await page.screenshot({ path: path.resolve(__dirname, 'sweep-fail.png') });
        console.log('错误：', errs.length ? [...new Set(errs)].join(' | ') : '(无)');
        await browser.close(); server.close(); process.exit(1);
    }

    // 点「扫荡」按钮：确认框按钮在屏幕中心偏下，用文本定位更稳 —— 这里按 Fx.confirm 的布局取右侧按钮
    // 先截图留档，再用坐标点。Fx.confirm 的确认按钮通常在弹窗下半部。
    const btn = await page.evaluate(() => {
        const cc = window.cc || window.CC;
        const canvas = cc.director.getScene().getChildByName('Canvas');
        const root = canvas.getChildByName('UIRoot');
        const UT = 'cc.UITransform';
        const cUT = canvas.getComponent(UT);
        const cx0 = cUT.contentSize.width / 2, cy0 = cUT.contentSize.height / 2;
        let hit = null;
        const walk = (n) => {
            const lb = n.getComponent('cc.Label');
            if (lb && lb.string === '扫荡' && n.activeInHierarchy) {
                // 挂在按钮节点上，或按钮是父节点
                let p = n;
                while (p && !p.hasEventListener('touch-end')) p = p.parent;
                if (p) {
                    const t = p.getComponent(UT);
                    const wp = p.getWorldPosition();
                    hit = { x: wp.x - cx0, y: wp.y - cy0, w: t.contentSize.width, h: t.contentSize.height };
                }
            }
            n.children.forEach(walk);
        };
        walk(root);
        return hit;
    });
    if (!btn) { console.log('❌ 找不到可点的「扫荡」按钮'); await browser.close(); server.close(); process.exit(1); }
    console.log(`步骤4 点「扫荡」（design ${Math.round(btn.x)},${Math.round(btn.y)} 尺寸 ${Math.round(btn.w)}×${Math.round(btn.h)}）`);
    await page.mouse.click(sx(btn.x), sy(btn.y));
    await page.waitForTimeout(2500);

    const after = await page.evaluate((k) => {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : null;
    }, SAVE_KEY);
    const labels2 = await page.evaluate(LABELS_FN);
    console.log('步骤5 扫荡后：');
    console.log(`   体力 ${beforeStamina} → ${after ? after.stamina : '?'}（应扣 6）`);
    console.log('   可见反馈：', labels2.filter((s) => s.includes('扫荡') || s.includes('获得') || s.includes('战力')).slice(0, 6).join(' | ') || '(未捕获到结算文案)');
    await page.screenshot({ path: path.resolve(__dirname, 'sweep-ok.png') });

    const ok = after && after.stamina === beforeStamina - 6;
    console.log(ok ? '✅ 扫荡链路可跑通：体力正确扣除' : '❌ 扫荡链路异常：体力未按预期扣除');
    console.log('运行时错误：', errs.length ? [...new Set(errs)].join(' | ') : '(无)');

    await browser.close(); server.close();
    process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });

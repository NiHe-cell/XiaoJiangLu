/**
 * 布局探针（安全区 / 裁字 验收闸）
 *
 * 在真实运行页里遍历 UIRoot，把每个节点换算成「设计坐标」（原点居中、y 向上），三级判定：
 *
 *   [硬失败 · 可点] 挂了 touch 监听的节点左右边缘 ∉ [-290, 290]，或尺寸 < 44×44
 *                   依据：docs/UI视觉规格-温绘.md §6 R2
 *
 *   [硬失败 · 截字] cc.Label 用 Overflow.CLAMP 且不换行 —— 文字比文本框宽就被切掉。
 *                   用浏览器 canvas 以同字号量出真实字宽，> 框宽即判失败。
 *
 *   [硬失败 · 出屏] 文字实际渲染范围（按对齐方式算）超出真机可视设计半宽 295.7。
 *                   注意：只报告「字的范围」越界，不报告「框的范围」越界 ——
 *                   居中短文本即使框很宽，字仍在屏内，不算缺陷（避免误报噪声）。
 *
 *   白名单：宽度 ≥ 700 的整条铺底（topBar / resBar / nav / fullBg / layer），越界是出血设计。
 *
 * 用法：NODE_PATH=<managed node_modules> node tools/probe.js
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'build', 'web-mobile');
const PORT = 8124;
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream', '.css': 'text/css' };

const SAFE_X = 290;      // 可点击元素硬边界
const VISIBLE_X = 295.7; // 真机可视设计半宽（9:19.5）
const HIT_MIN = 44;
const BLEED_NAMES = new Set(['UIRoot', 'toastLayer', 'bg', 'mask', 'topBar', 'resBar', 'nav']);

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

const PROBE_FN = () => {
    const VIS = 295.7; // 真机可视设计半宽，页面内无法引用模块作用域常量，故就近定义
    const cc = window.cc || window.CC;
    const scene = cc.director.getScene();
    const canvas = scene.getChildByName('Canvas');
    const root = canvas && canvas.getChildByName('UIRoot');
    if (!root) return { err: 'no UIRoot', canvasKids: canvas ? canvas.children.map((c) => c.name) : [] };

    // 只用字符串查组件：构建产物里 cc.UITransform / cc.Label 是 undefined，
    // 传 nil 进去引擎会喷 "Error 3804 getComponent: Type must be non-nil"
    const UT = 'cc.UITransform', LB = 'cc.Label', GFX = 'cc.Graphics', SP = 'cc.Sprite';
    const cUT = canvas.getComponent(UT);
    const cx0 = cUT ? cUT.contentSize.width / 2 : 360;
    const cy0 = cUT ? cUT.contentSize.height / 2 : 640;

    // 用 canvas 2D 量字宽：Cocos Web 端同样走浏览器字体度量
    const mctx = document.createElement('canvas').getContext('2d');
    const measure = (str, size) => {
        mctx.font = `${size}px Arial`;
        return mctx.measureText(str).width;
    };

    const rows = [];
    const walk = (n, panel, active) => {
        const ut = n.getComponent(UT);
        const name = n.name;
        const isPanelRoot = panel === '<none>' && n.parent === root;
        const cur = isPanelRoot ? name : panel;
        const act = active && n.activeInHierarchy;
        if (ut && ut.contentSize.width > 0) {
            const p = n.getWorldPosition();
            const w = ut.contentSize.width, h = ut.contentSize.height;
            const dx = p.x - cx0, dy = p.y - cy0;
            const lb = n.getComponent(LB);
            const row = {
                panel: cur, name, active: act,
                x0: Math.round(dx - ut.anchorX * w), x1: Math.round(dx + (1 - ut.anchorX) * w),
                y0: Math.round(dy - ut.anchorY * h), y1: Math.round(dy + (1 - ut.anchorY) * h),
                w: Math.round(w), h: Math.round(h),
                clickable: n.hasEventListener('touch-end') || n.hasEventListener('touch-start'),
                draw: !!(n.getComponent(GFX) || lb || n.getComponent(SP)),
            };
            if (lb) {
                const gw = measure(lb.string, lb.fontSize);
                const align = lb.horizontalAlign; // 0=LEFT 1=CENTER 2=RIGHT
                const boxL = dx - ut.anchorX * w, boxR = dx + (1 - ut.anchorX) * w;
                row.text = lb.string;
                row.glyphW = Math.round(gw);
                const wrap = !!lb.enableWrapText;
                // 开了自动换行是「折行」不是「截断」，不能按截断判失败
                row.truncated = !wrap && gw > w + 1;
                if (wrap) {
                    // 折行标签每行字宽必然 ≤ 框宽，可见范围就是框范围
                    row.vL = boxL; row.vR = boxR;
                } else {
                    const gL = align === 1 ? dx - gw / 2 : align === 0 ? boxL : boxR - gw;
                    const gR = align === 1 ? dx + gw / 2 : align === 0 ? boxL + gw : boxR;
                    // CLAMP 会把超出文本框的部分切掉，所以可见范围 = 字范围 ∩ 框范围
                    row.vL = row.truncated ? Math.max(gL, boxL) : gL;
                    row.vR = row.truncated ? Math.min(gR, boxR) : gR;
                }
                row.offScreen = row.vL < -VIS || row.vR > VIS;
            } else {
                row.vL = row.x0; row.vR = row.x1;
            }
            row.isLabel = !!lb;
            rows.push(row);
        }
        n.children.forEach((ch) => walk(ch, cur, act));
    };
    walk(root, '<none>', true);
    return { rows, panels: root.children.map((c) => c.name) };
};

(async () => {
    const server = await serve();
    const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push('PAGEERROR ' + String(e && e.message)));
    page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(6000);
    pageErrors.length = 0;

    const sc = 844 / 1280;
    const sx = (dx) => 195 + dx * sc;
    const sy = (dy) => (640 - dy) * sc;

    let hard = 0;
    const hardList = [];
    const softList = [];

    const run = async (label) => {
        await page.waitForTimeout(900);
        const r = await page.evaluate(PROBE_FN);
        if (r.err) { console.log(`  ❌ ${label}: ${r.err} canvasKids=${(r.canvasKids || []).join(',')}`); return; }
        // 只看当前可见的层（activeInHierarchy 由子孙继承，隐藏的栈内面板不计）
        const rows = r.rows.filter((x) => x.active && !BLEED_NAMES.has(x.name) && x.w < 700);

        const over = rows.filter((x) => x.clickable && (x.x0 < -SAFE_X || x.x1 > SAFE_X));
        const tiny = rows.filter((x) => x.clickable && (x.w < HIT_MIN || x.h < HIT_MIN));
        const trunc = rows.filter((x) => x.truncated);
        const off = rows.filter((x) => x.offScreen);
        // 不变量：任何「有绘制」的元素都得待在 ±290 内 ——
        // 否则它会戳出所属面板的边框（探针原本看不到这一类）。
        // Label 按「可见字范围」记账，Graphics/Sprite 才按盒范围。
        const drawOut = rows.filter((x) => {
            if (!x.draw) return false;
            if (x.isLabel) return (x.vL !== undefined) && (x.vL < -SAFE_X || x.vR > SAFE_X);
            return x.x0 < -SAFE_X || x.x1 > SAFE_X;
        });

        const n0 = over.length + tiny.length + trunc.length + off.length + drawOut.length;
        console.log(`  ${label}  面板=[${r.panels.join(',')}]  硬失败 ${n0}`);
        over.forEach((x) => { const s = `${label} ${x.panel}/${x.name} 可点出安全区 x:[${x.x0},${x.x1}]`; console.log('     ❌ ' + s); hardList.push(s); hard++; });
        tiny.forEach((x) => { const s = `${label} ${x.panel}/${x.name} 热区过小 ${x.w}×${x.h}`; console.log('     ❌ ' + s); hardList.push(s); hard++; });
        trunc.forEach((x) => { const s = `${label} ${x.panel}/${x.name} 文本被截断 字宽${x.glyphW}>框宽${x.w} "${x.text}"`; console.log('     ❌ ' + s); hardList.push(s); hard++; });
        off.forEach((x) => { const s = `${label} ${x.panel}/${x.name} 文字出屏 字范围[${Math.round(x.gL)},${Math.round(x.gR)}] "${x.text}"`; console.log('     ❌ ' + s); hardList.push(s); hard++; });
        drawOut.forEach((x) => { const s = `${label} ${x.panel}/${x.name} 绘制越界(戳出面板边框) x:[${x.x0},${x.x1}]`; console.log('     ❌ ' + s); hardList.push(s); hard++; });
    };

    console.log('== 主城 ==');
    await run('home');

    const navY = sy(-566);
    console.log('== 底部导航 ==');
    for (const [k, dx] of [['lineup', -120], ['hero', 0], ['recruit', 120], ['bag', 240]]) {
        await page.mouse.click(sx(dx), navY);
        await run(k);
    }
    console.log('== 武将详情 ==');
    await page.mouse.click(sx(0), navY);
    await page.waitForTimeout(900);
    await page.mouse.click(sx(-165), sy(372));
    await run('heroDetail');
    await page.mouse.click(sx(0), navY);
    await page.waitForTimeout(900);

    console.log('== 推图 ==');
    await page.mouse.click(sx(-240), navY); // 先回主城，保证在 Home 上点出征
    await page.waitForTimeout(900);
    await page.mouse.click(sx(0), sy(20));  // 出征按钮中心 design(0,20)
    await run('stage-c1');
    // 章节描述是动态文本，必须逐章巡检（tab 中心 design x=[-230,-138,-46,46,138,230] y=462）
    for (let i = 1; i < 6; i++) {
        await page.mouse.click(sx([-230, -138, -46, 46, 138, 230][i]), sy(462));
        await run(`stage-c${i + 1}`);
    }
    await page.mouse.click(sx(-230), sy(462));
    await page.waitForTimeout(600);
    await page.mouse.click(sx(-148), sy(300)); // 第一关关卡卡中心 design(-148,300)
    await page.waitForTimeout(4500);
    console.log('== 战斗 ==');
    await run('battle');

    console.log('');
    console.log(`硬失败合计 ${hard} 项 | 仅框越界 ${softList.length} 项`);
    if (hardList.length) { console.log('—— 硬失败清单 ——'); hardList.forEach((s) => console.log('  ' + s)); }
    console.log('运行时错误：', pageErrors.length ? [...new Set(pageErrors)].join(' | ') : '(无)');

    await browser.close();
    server.close();
    process.exit(hard || pageErrors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

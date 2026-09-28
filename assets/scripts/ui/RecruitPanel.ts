/** 招募（酒馆）：纯玩法货币「将玉」，无付费入口 */
import { Node, Color, Graphics } from 'cc';
import { nd, box, boxAdd, boxAddLine, txt, mask, fullBg } from '../core/Ui';
import { C, FS, qualityColor, QUALITY_NAME, CAMP_NAME } from '../core/Theme';
import { Store, newHeroState } from '../core/Store';
import { Router } from '../core/Router';
import { Fx } from '../core/Fx';
import { topBar, resBar, bottomNav, heroCard, NavKey, hexColor } from './Common';
import { HERO_CONF, getHeroConf } from '../data/HeroConf';
import { ITEM_CONF } from '../data/ItemConf';

const COST_ONE = 100;
const COST_TEN = 900;

/** 按品质权重抽一名武将（主角不进池） */
function rollHero (): number {
    const pool = HERO_CONF.filter((h) => h.id !== HERO_CONF[0].id);
    const w: { [q: number]: number } = { 1: 56, 2: 28, 3: 12, 4: 4 };
    let total = 0;
    for (const h of pool) total += w[h.quality] || 1;
    let r = Math.random() * total;
    for (const h of pool) {
        r -= w[h.quality] || 1;
        if (r <= 0) return h.id;
    }
    return pool[0].id;
}

export function buildRecruitPanel (parent: Node): Node {
    const root = nd('Recruit', 720, 1280, parent);
    root.setPosition(0, 0);
    fullBg(root, C.bg);
    const res = resBar(root);
    topBar(root, '招募', () => Router.reset('home'));

    // 招贤台
    const stage = nd('stage', 660, 380, root);
    stage.setPosition(0, 300);
    box(stage, 16, C.panel, C.goldDim, 2);
    const g = stage.addComponent(Graphics)!;
    g.fillColor = new Color(60, 44, 30);
    g.moveTo(-220, -170); g.lineTo(-90, -60); g.lineTo(90, -60); g.lineTo(220, -170);
    g.lineTo(220, -190); g.lineTo(-220, -190); g.close(); g.fill();
    txt(stage, '招 贤 台', FS.title, C.gold, 400, 50, 0, 100);
    txt(stage, '天下英雄，尽入麾下', FS.small, C.textSub, 500, 34, 0, 44);
    // 品质概率条
    const probs: { q: number; p: string }[] = [
        { q: 4, p: '红 4%' }, { q: 3, p: '橙 12%' }, { q: 2, p: '紫 28%' }, { q: 1, p: '蓝 56%' },
    ];
    probs.forEach((p, i) => {
        const b = nd('p' + i, 150, 54, stage);
        b.setPosition(-225 + i * 150, -40);
        box(b, 10, qualityColor(p.q), C.textDark, 2);
        txt(b, p.p, FS.small, C.textDark, 150, 40);
    });
    txt(stage, '十连必出紫色及以上武将', FS.small, C.green, 600, 34, 0, -110);
    txt(stage, `将玉余额 ${Store.data.jade}`, FS.small, C.q3, 600, 34, 0, -150);

    // 按钮
    const one = nd('one', 320, 96, root);
    one.setPosition(0, 20);
    box(one, 16, C.btn, C.gold, 3);
    txt(one, '招募一次', FS.h1, C.textDark, 320, 40, 0, 12);
    txt(one, `消耗将玉 ${COST_ONE}`, FS.small, new Color(255, 230, 190), 320, 32, 0, -22);
    one.on(Node.EventType.TOUCH_END, () => {
        if (Store.data.jade < COST_ONE) { Fx.toast('将玉不足，可通过推图与日常获取'); return; }
        Store.addJade(-COST_ONE);
        Store.data.recruited += 1;
        const ids = [rollHero()];
        const got = grant(ids);
        Store.save();
        res.refresh();
        showResult(root, ids, got, res.refresh);
    });

    const ten = nd('ten', 320, 96, root);
    ten.setPosition(0, -96);
    box(ten, 16, C.btnPrimary, C.gold, 3);
    txt(ten, '招募十次', FS.h1, C.text, 320, 40, 0, 12);
    txt(ten, `消耗将玉 ${COST_TEN}（省 100）`, FS.small, new Color(255, 230, 190), 320, 32, 0, -22);
    ten.on(Node.EventType.TOUCH_END, () => {
        if (Store.data.jade < COST_TEN) { Fx.toast('将玉不足，可通过推图与日常获取'); return; }
        Store.addJade(-COST_TEN);
        Store.data.recruited += 10;
        const ids: number[] = [];
        for (let i = 0; i < 10; i++) ids.push(rollHero());
        // 保底：无紫及以上则把最后一个替换为紫/橙
        if (!ids.some((id) => getHeroConf(id).quality >= 2)) {
            const up = HERO_CONF.filter((h) => h.quality === 2 || h.quality === 3);
            ids[9] = up[Math.floor(Math.random() * up.length)].id;
        }
        const got = grant(ids);
        Store.save();
        res.refresh();
        showResult(root, ids, got, res.refresh);
    });

    txt(root, '本作无付费入口，将玉全部通过推图、日常与排名产出', FS.tiny, C.textWeak, 660, 32, 0, -200);

    const pity = nd('pity', 660, 90, root);
    pity.setPosition(0, -320);
    box(pity, 12, new Color(34, 26, 19, 230), C.panelLine, 2);
    txt(pity, `累计招募 ${Store.data.recruited} 次`, FS.small, C.textSub, 400, 34, -110, 18);
    txt(pity, '重复武将自动转化为对应碎片，用于升星', FS.tiny, C.textWeak, 620, 30, 0, -20);

    bottomNav(root, 'recruit', (k: NavKey) => Router.reset(k));
    return root;
}

/** 发放武将：已有转碎片，无碎片道具转银币 */
function grant (ids: number[]): string[] {
    const out: string[] = [];
    for (const id of ids) {
        const c = getHeroConf(id);
        if (!Store.has(id)) {
            Store.data.heroes[id] = newHeroState(id, 1);
            out.push(`新武将 ${c.name}`);
        } else {
            const frag = ITEM_CONF.find((i: any) => (i as any).heroId === id);
            if (frag) { Store.addItem(frag.id, 5); out.push(`${c.name} 碎片 ×5`); }
            else { Store.addSilver(500); out.push(`${c.name} → 银币 +500`); }
        }
    }
    return out;
}

function showResult (root: Node, ids: number[], got: string[], refresh: () => void): void {
    const m = mask(root, 200);
    m.setSiblingIndex(9000);
    const p = nd('result', 660, 720, m);
    p.setPosition(0, 60);
    box(p, 18, C.panel, C.gold, 3);
    txt(p, '招募结果', FS.title, C.gold, 400, 44, 0, 310);

    const xs = [-240, -120, 0, 120, 240];
    ids.forEach((id, i) => {
        const x = xs[i % 5];
        const y = 200 - Math.floor(i / 5) * 150;
        heroCard(p, { confId: id, x, y, w: 104, h: 138, showLevel: false, showStar: false, compact: true });
        txt(p, got[i] || '', 15, C.green, 140, 40, x, y - 80);
    });

    const b = nd('ok', 260, 76, p);
    b.setPosition(0, -290);
    box(b, 14, C.btn, C.gold, 2);
    txt(b, '知道了', FS.h2, C.text, 260, 44);
    b.on(Node.EventType.TOUCH_END, () => { m.destroy(); refresh(); });
}

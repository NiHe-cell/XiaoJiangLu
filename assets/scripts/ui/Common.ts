/** 通用 UI 零件：顶部资源条 / 底部导航 / 武将卡 / 类型纹样 */
import { Node, Color, Graphics, Label, HorizontalTextAlignment, VerticalTextAlignment } from 'cc';
import { nd, box, boxAdd, boxAddLine, circleAdd, triAdd, lineAdd, txt, gfx } from '../core/Ui';
import { C, FS, qualityColor, campColor, QUALITY_NAME, CAMP_NAME, ROLE_NAME } from '../core/Theme';
import { Store } from '../core/Store';
import { getHeroConf } from '../data/HeroConf';

/** 顶部条：返回 + 标题 + 主公等级；返回 refresh() */
export function topBar (parent: Node, title: string, back?: () => void): { node: Node; refresh: () => void } {
    const n = nd('topBar', 700, 76, parent);
    n.setPosition(0, 596);

    if (back) {
        const b = nd('back', 76, 60, n);
        b.setPosition(-250, 0);
        box(b, 10, C.btnGhost, C.panelLine, 2);
        txt(b, '返回', FS.small, C.textSub, 76, 60);
        b.on(Node.EventType.TOUCH_END, back);
    }

    const t = txt(n, title, FS.h1, C.gold, 340, 60, back ? 10 : 0, 0);

    const pill = nd('lvPill', 150, 52, n);
    // 150 宽 + 中心 214 → 右缘 289，压在安全区 ±290 内侧。
    // 原值 240 会让右缘到 315，主公药丸的圆角框在 9:19.5 上被真机切掉。
    pill.setPosition(back ? 190 : 214, 0);
    box(pill, 26, C.panelLight, C.goldDim, 2);
    const lv = txt(pill, '', FS.small, C.text, 130, 44, 0, 0);

    const refresh = () => { lv.string = `主公 Lv.${Store.data.level}`; };
    refresh();
    return { node: n, refresh };
}

/** 资源条：银币 / 将玉 / 体力 */
export function resBar (parent: Node, y = 534): { node: Node; refresh: () => void } {
    const n = nd('resBar', 700, 52, parent);
    n.setPosition(0, y);
    const mk = (x: number, key: string, col: Color) => {
        const p = nd(key, 170, 44, n);
        p.setPosition(x, 0);
        box(p, 22, new Color(30, 22, 16, 230), C.panelLine, 2);
        const l = txt(p, '', FS.small, col, 150, 36, 0, 0);
        return l;
    };
    const l1 = mk(-190, 'silver', C.gold);
    const l2 = mk(0, 'jade', C.q3);
    const l3 = mk(190, 'stamina', C.cyan);
    const refresh = () => {
        l1.string = `银币 ${Store.data.silver}`;
        l2.string = `将玉 ${Store.data.jade}`;
        l3.string = `体力 ${Store.data.stamina}/200`;
    };
    refresh();
    return { node: n, refresh };
}

export type NavKey = 'home' | 'lineup' | 'hero' | 'recruit' | 'bag' | 'shop';

/** 底部导航（拇指热区） */
export function bottomNav (parent: Node, current: NavKey, onNav: (k: NavKey) => void): Node {
    const n = nd('nav', 700, 96, parent);
    n.setPosition(0, -566);
    box(n, 14, new Color(24, 18, 13, 235), C.panelLine, 2);

    const items: { k: NavKey; t: string }[] = [
        { k: 'home', t: '主城' },
        { k: 'lineup', t: '阵容' },
        { k: 'hero', t: '武将' },
        { k: 'recruit', t: '招募' },
        { k: 'bag', t: '背包' },
    ];
    const xs = [-240, -120, 0, 120, 240];
    items.forEach((it, i) => {
        const b = nd(it.k, 96, 76, n);
        b.setPosition(xs[i], 0);
        const on = current === it.k;
        box(b, 10, on ? C.btn : C.btnGhost, on ? C.gold : C.panelLine, 2);
        txt(b, it.t, FS.small, on ? C.textDark : C.textSub, 96, 40, 0, 8);
        if (on) boxAdd(b, -16, -28, 32, 4, 2, C.gold);
        b.on(Node.EventType.TOUCH_END, () => onNav(it.k));
    });
    return n;
}

/** 类型纹样（Graphics 可画） */
export function roleGlyph (g: Graphics, role: number, cx: number, cy: number, s: number, col: Color): void {
    g.lineWidth = 3;
    g.strokeColor = col;
    g.fillColor = col;
    if (role === 1) { // 物攻：剑
        g.moveTo(cx - s * 0.5, cy - s * 0.5); g.lineTo(cx + s * 0.45, cy + s * 0.45); g.stroke();
        g.moveTo(cx - s * 0.15, cy + s * 0.35); g.lineTo(cx + s * 0.35, cy - s * 0.15); g.stroke();
    } else if (role === 2) { // 法攻：环 + 核
        g.circle(cx, cy, s * 0.52); g.stroke();
        g.circle(cx, cy, s * 0.16); g.fill();
        g.moveTo(cx - s * 0.62, cy + s * 0.36); g.lineTo(cx - s * 0.36, cy + s * 0.62); g.stroke();
        g.moveTo(cx + s * 0.62, cy - s * 0.36); g.lineTo(cx + s * 0.36, cy - s * 0.62); g.stroke();
    } else if (role === 3) { // 辅助：十字
        g.moveTo(cx - s * 0.5, cy); g.lineTo(cx + s * 0.5, cy); g.stroke();
        g.moveTo(cx, cy - s * 0.5); g.lineTo(cx, cy + s * 0.5); g.stroke();
        g.circle(cx, cy, s * 0.2); g.fill();
    } else { // 防御：盾
        g.moveTo(cx - s * 0.45, cy - s * 0.45);
        g.lineTo(cx + s * 0.45, cy - s * 0.45);
        g.lineTo(cx + s * 0.45, cy + s * 0.1);
        g.lineTo(cx, cy + s * 0.55);
        g.lineTo(cx - s * 0.45, cy + s * 0.1);
        g.close();
        g.stroke();
    }
}

export interface CardOpts {
    confId: number; x: number; y: number; w?: number; h?: number;
    onClick?: () => void; showLevel?: boolean; showStar?: boolean; compact?: boolean;
}

/** 武将占位卡（零资源：色块 + 阵营纹样 + 类型纹样 + 文字） */
export function heroCard (parent: Node, o: CardOpts): Node {
    const w = o.w ?? 112;
    const h = o.h ?? 146;
    const n = nd('card', w, h, parent);
    n.setPosition(o.x, o.y);
    const c = getHeroConf(o.confId);
    const st = Store.data.heroes[o.confId];
    const qc = qualityColor(c.quality);

    box(n, 12, C.panel, qc, 3);
    // 头像区：武将个人主色（同阵营也能一眼区分）
    const ih = h - 46;
    const ax = -w / 2 + 8;
    const ay = 46 - h / 2 + (h - 46 - ih) / 2;
    boxAdd(n, ax, ay, w - 16, ih - 8, 8, hexColor(c.avatarColor));
    // 阵营角标（左上三角：色 + 形状双编码，与品质色永不同处一位）
    triAdd(n, ax + 2, ay + ih - 10, 22, campColor(c.camp), 'br');
    // 类型纹样
    roleGlyph(gfx(n), c.role, 0, 46 - h / 2 + ih / 2 - 2, Math.min(w, ih) * 0.4, new Color(255, 255, 255, 220));
    // 名字（品质色 100%）
    txt(n, c.name, o.compact ? FS.tiny : FS.small, qc, w - 8, 26, 0, -h / 2 + 26);
    // 品质角标
    boxAdd(n, w / 2 - 8 - 30, h / 2 - 8 - 22, 30, 22, 6, qc);
    txt(n, QUALITY_NAME[c.quality], FS.tiny, C.textDark, 30, 22, w / 2 - 8 - 15, h / 2 - 8 - 11);
    // 等级 / 星级
    if (o.showLevel !== false && st) {
        boxAdd(n, -w / 2 + 6, -h / 2 + 2, 44, 22, 6, new Color(20, 15, 11, 220));
        txt(n, `Lv${st.level}`, FS.tiny, C.gold, 44, 22, -w / 2 + 6 + 22, -h / 2 + 13);
    }
    if (o.showStar && st) {
        txt(n, starStr(st.star), FS.tiny, C.gold, w - 56, 22, w / 2 - 8 - (w - 56) / 2 - 26, -h / 2 + 13);
    }

    if (o.onClick) n.on(Node.EventType.TOUCH_END, o.onClick);
    return n;
}

export function starStr (n: number): string {
    let s = '';
    for (let i = 0; i < n; i++) s += '★';
    return s;
}

export function hexColor (hex: string): Color {
    const h = hex.replace('#', '');
    return new Color(parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16), 255);
}

/** 空态提示 */
export function emptyTip (parent: Node, msg: string, y = 0): Node {
    const n = nd('empty', 560, 60, parent);
    n.setPosition(0, y);
    txt(n, msg, FS.body, C.textWeak, 560, 60);
    return n;
}

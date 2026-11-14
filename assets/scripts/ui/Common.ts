/** 通用 UI 零件：顶部资源条 / 底部导航 / 武将卡 / 类型纹样 */
import { Node, Color, Graphics, Label, HorizontalTextAlignment, VerticalTextAlignment } from 'cc';
import { nd, box, boxAdd, boxAddLine, circleAdd, triAdd, lineAdd, txt, gfx } from '../core/Ui';
import { paintPixel } from '../core/Art';
import { C, FS, qualityColor, campColor, QUALITY_NAME, CAMP_NAME, ROLE_NAME } from '../core/Theme';
import { Store } from '../core/Store';
import { getHeroConf } from '../data/HeroConf';
import { artForRole, NAV_ART } from '../data/PixelArtConf';
import { TXT } from '../data/TextConf';

/** 顶部条：返回 + 标题 + 主公等级；返回 refresh() */
export function topBar (parent: Node, title: string, back?: () => void): { node: Node; refresh: () => void } {
    const n = nd('topBar', 700, 76, parent);
    n.setPosition(0, 596);

    if (back) {
        const b = nd('back', 76, 60, n);
        b.setPosition(-250, 0);
        box(b, 10, C.btnGhost, C.panelLine, 2);
        txt(b, TXT.common.back, FS.small, C.textSub, 76, 60);
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
    const mk = (x: number, key: string, art: 'coin' | 'jade' | 'peach', col: Color) => {
        const p = nd(key, 170, 44, n);
        p.setPosition(x, 0);
        box(p, 22, new Color(30, 22, 16, 230), C.panelLine, 2);
        paintPixel(p, art, -66, 0, 22, 22, (host) => {
            const g = gfx(host);
            g.fillColor = col;
            g.circle(0, 0, 7);
            g.fill();
        });
        const l = txt(p, '', FS.tiny, col, 126, 36, 16, 0);
        return l;
    };
    const l1 = mk(-190, 'silver', 'coin', C.gold);
    const l2 = mk(0, 'jade', 'jade', C.q3);
    const l3 = mk(190, 'stamina', 'peach', C.cyan);
    const refresh = () => {
        l1.string = `${TXT.home.silver} ${Store.data.silver}`;
        l2.string = `${TXT.home.jade} ${Store.data.jade}`;
        l3.string = `${TXT.home.stamina} ${Store.data.stamina}/200`;
    };
    refresh();
    return { node: n, refresh };
}

export type NavKey = 'home' | 'lineup' | 'hero' | 'recruit' | 'bag' | 'shop';

/** 底部导航（拇指热区） */
export function bottomNav (parent: Node, current: NavKey, onNav: (k: NavKey) => void, y = -566): Node {
    const n = nd('nav', 700, 96, parent);
    n.setPosition(0, y);
    box(n, 14, new Color(24, 18, 13, 235), C.panelLine, 2);

    const items: { k: NavKey; t: string }[] = [
        { k: 'home', t: TXT.common.home },
        { k: 'lineup', t: TXT.lineup.title },
        { k: 'hero', t: TXT.hero.title },
        { k: 'recruit', t: TXT.recruit.title },
        { k: 'bag', t: TXT.bag.title },
    ];
    const xs = [-240, -120, 0, 120, 240];
    items.forEach((it, i) => {
        const b = nd(it.k, 96, 76, n);
        b.setPosition(xs[i], 0);
        const on = current === it.k;
        box(b, 10, on ? C.btn : C.btnGhost, on ? C.gold : C.panelLine, 2);
        paintPixel(b, NAV_ART[it.k], 0, 14, 26, 26, (host) => softMark(host, on ? C.textDark : C.goldDim), on ? C.textDark : C.goldLight);
        txt(b, it.t, FS.small, on ? C.textDark : C.textSub, 96, 24, 0, -16);
        if (on) boxAdd(b, -20, -36, 40, 4, 2, C.gold);
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

/** 武将卡。色块、阵营角标和类型纹样一直在；像素职业替身只有加载成功才盖上去。 */
export function heroCard (parent: Node, o: CardOpts): Node {
    const w = o.w ?? 112;
    const h = o.h ?? 146;
    const n = nd('card', w, h, parent);
    n.setPosition(o.x, o.y);
    const c = getHeroConf(o.confId);
    const st = Store.data.heroes[o.confId];
    const qc = qualityColor(c.quality);

    box(n, 12, C.panel, qc, 3);
    // 头像区：个人主色垫底。像素替身盖在上面，缺图时露出色块和类型纹样。
    const ih = h - 46;
    const ax = -w / 2 + 8;
    const ay = 46 - h / 2;
    const pw = w - 16;
    const ph = ih - 8;
    const pcx = ax + pw / 2;
    const pcy = ay + ph / 2;
    const plate = nd('plate', pw, ph, n);
    plate.setPosition(pcx, pcy);
    box(plate, 8, hexColor(c.avatarColor));
    const side = Math.min(pw, ph) * 0.78;
    paintPixel(n, artForRole(c.role), pcx, pcy, side, side, (host) => {
        roleGlyph(gfx(host), c.role, 0, 0, side * 0.42, new Color(255, 255, 255, 220));
    });
    // 阵营角标画在替身之后，避免被精灵挡住。
    const camp = nd('camp', w, h, n);
    triAdd(camp, ax + 2, ay + ih - 10, 22, campColor(c.camp), 'br');
    txt(n, c.name, o.compact ? FS.tiny : FS.small, qc, w - 8, 26, 0, -h / 2 + 26);
    const qn = nd('q', 30, 22, n);
    qn.setPosition(w / 2 - 23, h / 2 - 19);
    box(qn, 6, qc);
    txt(qn, QUALITY_NAME[c.quality], FS.tiny, C.textDark, 30, 22);
    if (o.showLevel !== false && st) {
        const lv = nd('lv', 44, 22, n);
        lv.setPosition(-w / 2 + 28, -h / 2 + 13);
        box(lv, 6, new Color(20, 15, 11, 220));
        txt(lv, `Lv${st.level}`, FS.tiny, C.gold, 44, 22);
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

/** 图标还没加载到时的小色块，避免导航上留一个空白。 */
export function softMark (host: Node, col: Color): void {
    const g = gfx(host);
    g.fillColor = col;
    g.roundRect(-7, -7, 14, 14, 3);
    g.fill();
}

/** 空态提示 */
export function emptyTip (parent: Node, msg: string, y = 0): Node {
    const n = nd('empty', 560, 60, parent);
    n.setPosition(0, y);
    txt(n, msg, FS.body, C.textWeak, 560, 60);
    return n;
}

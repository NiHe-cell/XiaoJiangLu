/**
 * UI 建造工具（零资源 · 全程序化绘制）
 * 所有节点均挂在 UI_2D 层；坐标一律相对屏幕中心（0,0 = 屏幕中心）。
 */
import {
    Node, UITransform, Graphics, Label, Color, Layers, Vec3, UIOpacity,
    BlockInputEvents, HorizontalTextAlignment, VerticalTextAlignment, tween, Widget,
} from 'cc';

/** 建节点 */
export function nd (name: string, w: number, h: number, parent?: Node): Node {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    const t = n.addComponent(UITransform)!;
    t.setContentSize(w, h);
    if (parent) n.parent = parent;
    return n;
}

/** 取/建 Graphics */
export function gfx (n: Node): Graphics {
    return n.getComponent(Graphics) || n.addComponent(Graphics)!;
}

/** 清空并以节点尺寸画圆角矩形（fill / stroke 可选） */
export function box (n: Node, r: number, fill?: Color, stroke?: Color, lw = 2, w?: number, h?: number): void {
    const t = n.getComponent(UITransform)!;
    const cw = w ?? t.width;
    const ch = h ?? t.height;
    const g = gfx(n);
    g.clear();
    if (fill) {
        g.fillColor = fill;
        g.roundRect(-cw / 2, -ch / 2, cw, ch, r);
        g.fill();
    }
    if (stroke) {
        g.lineWidth = lw;
        g.strokeColor = stroke;
        g.roundRect(-cw / 2, -ch / 2, cw, ch, r);
        g.stroke();
    }
}

/** 在原节点 Graphics 上追加实心圆角矩形（不 clear，用于叠加绘制） */
export function boxAdd (n: Node, x: number, y: number, w: number, h: number, r: number, fill: Color): void {
    const g = gfx(n);
    g.fillColor = fill;
    g.roundRect(x, y, w, h, r);
    g.fill();
}

/** 追加描边圆角矩形 */
export function boxAddLine (n: Node, x: number, y: number, w: number, h: number, r: number, stroke: Color, lw = 2): void {
    const g = gfx(n);
    g.lineWidth = lw;
    g.strokeColor = stroke;
    g.roundRect(x, y, w, h, r);
    g.stroke();
}

/** 追加三角形（阵营角标：色 + 形状双编码，色盲友好） */
export function triAdd (n: Node, x: number, y: number, r: number, fill: Color, dir: 'br' | 'bl' = 'br'): void {
    const g = gfx(n);
    g.fillColor = fill;
    if (dir === 'br') {
        g.moveTo(x, y);
        g.lineTo(x + r, y);
        g.lineTo(x, y - r);
    } else {
        g.moveTo(x, y);
        g.lineTo(x - r, y);
        g.lineTo(x, y - r);
    }
    g.close();
    g.fill();
}

/** 追加圆 */
export function circleAdd (n: Node, x: number, y: number, r: number, fill: Color): void {
    const g = gfx(n);
    g.fillColor = fill;
    g.circle(x, y, r);
    g.fill();
}

/** 追加线段 */
export function lineAdd (n: Node, x1: number, y1: number, x2: number, y2: number, c: Color, lw = 2): void {
    const g = gfx(n);
    g.lineWidth = lw;
    g.strokeColor = c;
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
}

/** 文本 */
export function txt (
    parent: Node, str: string, size: number, color: Color,
    w: number, h: number, x = 0, y = 0,
    align: HorizontalTextAlignment = HorizontalTextAlignment.CENTER,
    wrap = false,
): Label {
    const n = nd('txt', w, h, parent);
    n.setPosition(x, y);
    const l = n.addComponent(Label)!;
    l.string = str;
    l.fontSize = size;
    l.lineHeight = size + 6;
    l.color = color;
    l.horizontalAlign = align;
    l.verticalAlign = VerticalTextAlignment.CENTER;
    l.overflow = Label.Overflow.CLAMP;
    l.enableWrapText = wrap;
    return l;
}

/** 富文本式：一行标题 + 可选描边 */
export function title (parent: Node, str: string, size: number, color: Color, x: number, y: number, w = 400): Label {
    const l = txt(parent, str, size, color, w, size + 10, x, y);
    return l;
}

export interface BtnOpts {
    x?: number; y?: number; w: number; h: number;
    text: string; fontSize?: number;
    fill?: Color; textColor?: Color; radius?: number;
    stroke?: Color;
    onClick?: () => void;
    enabled?: boolean;
}

/** 按钮：返回节点，可后续 setEnabled / setText */
export function btn (parent: Node, o: BtnOpts): Node {
    const n = nd('btn', o.w, o.h, parent);
    n.setPosition(o.x ?? 0, o.y ?? 0);
    box(n, o.radius ?? 10, o.fill, o.stroke, 2);
    const l = txt(n, o.text, o.fontSize ?? 24, o.textColor, o.w, o.h, 0, 0);

    const press = () => { n.setScale(0.94, 0.94, 1); };
    const release = () => { n.setScale(1, 1, 1); };
    let on = o.enabled !== false;

    n.on(Node.EventType.TOUCH_START, () => { if (on) press(); });
    n.on(Node.EventType.TOUCH_CANCEL, () => release());
    n.on(Node.EventType.TOUCH_END, () => {
        release();
        if (on && o.onClick) o.onClick();
    });

    (n as any)._setText = (s: string) => { l.string = s; };
    (n as any)._setEnabled = (v: boolean) => {
        on = v;
        box(n, o.radius ?? 10, v ? (o.fill) : (new Color(74, 64, 56)), o.stroke, 2);
        l.color = v ? (o.textColor ?? new Color(245, 233, 208)) : new Color(140, 130, 115);
    };
    if (o.enabled === false) (n as any)._setEnabled(false);
    return n;
}

export function setBtnText (n: Node, s: string): void { (n as any)._setText(s); }
export function setBtnEnabled (n: Node, v: boolean): void { (n as any)._setEnabled(v); }

/** 进度条（血条/怒气条）：返回 setValue(0-1) */
export function bar (
    parent: Node, x: number, y: number, w: number, h: number, fill: Color, back: Color, radius = 4,
): (v: number) => void {
    const n = nd('bar', w, h, parent);
    n.setPosition(x, y);
    box(n, radius, back);
    const inner = nd('fill', w, h, n);
    inner.setPosition(0, 0);
    const ui = inner.getComponent(UIOpacity) || inner.addComponent(UIOpacity)!;
    let last = 1;
    return (v: number) => {
        const r = Math.max(0, Math.min(1, v));
        if (Math.abs(r - last) < 0.001 && r !== 0) return;
        last = r;
        const g = gfx(inner);
        g.clear();
        g.fillColor = fill;
        if (r > 0) {
            g.roundRect(-w / 2, -h / 2, Math.max(h, w * r), h, radius);
            g.fill();
        }
        ui.opacity = 255;
    };
}

/** 全屏遮罩（点击不穿透） */
export function mask (parent: Node, alpha = 170): Node {
    const n = nd('mask', 1600, 1600, parent);
    n.addComponent(BlockInputEvents);
    const g = gfx(n);
    g.fillColor = new Color(0, 0, 0, alpha);
    g.rect(-800, -800, 1600, 1600);
    g.fill();
    return n;
}

/** 铺满屏幕的底（用 Widget 四边对齐，适配任意可见宽） */
export function fullBg (parent: Node, color: Color): Node {
    const n = nd('bg', 720, 1280, parent);
    n.setSiblingIndex(0);
    const w = n.addComponent(Widget)!;
    w.isAlignLeft = true; w.isAlignRight = true; w.isAlignTop = true; w.isAlignBottom = true;
    w.left = 0; w.right = 0; w.top = 0; w.bottom = 0;
    const g = gfx(n);
    g.fillColor = color;
    g.rect(-800, -800, 1600, 1600);
    g.fill();
    return n;
}

/** 弹入动画（面板入场） */
export function popIn (n: Node, fromY = -40, dur = 0.22): void {
    const o = n.getComponent(UIOpacity) || n.addComponent(UIOpacity)!;
    o.opacity = 0;
    const y = n.position.y;
    n.setPosition(n.position.x, y + fromY);
    tween(o).to(dur, { opacity: 255 }).start();
    tween(n).to(dur, { position: new Vec3(n.position.x, y, 0) }).start();
}

/** 淡出销毁 */
export function fadeOutDestroy (n: Node, dur = 0.15): void {
    const o = n.getComponent(UIOpacity) || n.addComponent(UIOpacity)!;
    tween(o).to(dur, { opacity: 0 }).call(() => { n.destroy(); }).start();
}

/** 标准头部：返回容器节点 */
export interface HeadOpts { title: string; onBack?: () => void; }
export function head (parent: Node, o: HeadOpts, topY: number): Node {
    const n = nd('head', 700, 84, parent);
    n.setPosition(0, topY);
    return n;
}

/** 反馈层：Toast / 确认弹窗 / 飘字 / 震屏 */
import { Node, Color, Vec3, UIOpacity, tween, Label, HorizontalTextAlignment, VerticalTextAlignment } from 'cc';
import { nd, txt, box, gfx, mask } from './Ui';
import { C, FS } from './Theme';

class FxClass {
    private root: Node | null = null;
    private toastLayer: Node | null = null;

    init (root: Node): void {
        this.root = root;
        this.toastLayer = nd('toastLayer', 720, 1280, root);
        this.toastLayer.setSiblingIndex(9999);
    }

    /** 轻提示（2 秒消失，多条纵向堆叠） */
    toast (msg: string, color: Color = C.text): void {
        if (!this.toastLayer) return;
        const n = nd('toast', 520, 56, this.toastLayer);
        n.setPosition(0, 120);
        box(n, 12, new Color(20, 15, 11, 235), C.goldDim, 2);
        const l = n.addComponent(Label)!;
        l.string = msg;
        l.fontSize = FS.body;
        l.lineHeight = FS.body + 6;
        l.color = color;
        l.horizontalAlign = HorizontalTextAlignment.CENTER;
        l.verticalAlign = VerticalTextAlignment.CENTER;
        l.overflow = Label.Overflow.CLAMP;
        const o = n.getComponent(UIOpacity) || n.addComponent(UIOpacity)!;
        o.opacity = 0;
        tween(o).to(0.14, { opacity: 255 })
            .delay(1.1)
            .to(0.3, { opacity: 0 })
            .call(() => n.destroy())
            .start();
        tween(n).by(0.14, { position: new Vec3(0, 26, 0) })
            .delay(1.1)
            .by(0.3, { position: new Vec3(0, 30, 0) })
            .start();
    }

    /** 确认弹窗 */
    confirm (msg: string, onYes: () => void, yesText = '确定', noText = '取消'): void {
        if (!this.root) return;
        const m = mask(this.root, 180);
        m.setSiblingIndex(9000);
        const p = nd('confirm', 520, 300, m);
        p.setPosition(0, 0);
        box(p, 16, C.panel, C.gold, 3);
        txt(p, msg, FS.h2, C.text, 460, 130, 0, 44, HorizontalTextAlignment.CENTER, true);
        const yes = nd('btnYes', 200, 76, p);
        yes.setPosition(-110, -66);
        box(yes, 12, C.btnPrimary, C.gold, 2);
        const ly = yes.addComponent(Label)!;
        ly.string = yesText; ly.fontSize = FS.h2; ly.lineHeight = FS.h2 + 6; ly.color = C.text;
        ly.horizontalAlign = HorizontalTextAlignment.CENTER; ly.verticalAlign = VerticalTextAlignment.CENTER;
        yes.on(Node.EventType.TOUCH_END, () => { m.destroy(); onYes(); });

        const no = nd('btnNo', 200, 76, p);
        no.setPosition(110, -66);
        box(no, 12, C.btnGhost, C.panelLine, 2);
        const ln = no.addComponent(Label)!;
        ln.string = noText; ln.fontSize = FS.h2; ln.lineHeight = FS.h2 + 6; ln.color = C.textSub;
        ln.horizontalAlign = HorizontalTextAlignment.CENTER; ln.verticalAlign = VerticalTextAlignment.CENTER;
        no.on(Node.EventType.TOUCH_END, () => { m.destroy(); });
    }

    /** 飘字（伤害/治疗/暴击） */
    floatText (parent: Node, x: number, y: number, str: string, color: Color, size = FS.h1, rise = 70): void {
        const n = nd('ft', 260, size + 12, parent);
        n.setPosition(x, y);
        const l = n.addComponent(Label)!;
        l.string = str;
        l.fontSize = size;
        l.lineHeight = size + 8;
        l.color = color;
        l.horizontalAlign = HorizontalTextAlignment.CENTER;
        l.verticalAlign = VerticalTextAlignment.CENTER;
        l.overflow = Label.Overflow.NONE;
        const o = n.getComponent(UIOpacity) || n.addComponent(UIOpacity)!;
        o.opacity = 255;
        tween(n).by(0.5, { position: new Vec3(0, rise, 0) }).start();
        tween(o).delay(0.25).to(0.25, { opacity: 0 }).call(() => n.destroy()).start();
    }

    /** 震屏 */
    shake (node: Node, d = 8, dur = 0.05): void {
        const p = node.position.clone();
        tween(node)
            .to(dur, { position: new Vec3(p.x + d, p.y - d * 0.5, 0) })
            .to(dur, { position: new Vec3(p.x - d, p.y + d * 0.5, 0) })
            .to(dur, { position: new Vec3(p.x + d * 0.4, p.y, 0) })
            .to(dur, { position: new Vec3(p.x, p.y, 0) })
            .start();
    }

    /** 受击闪烁：叠一层独立色块节点，淡出后自毁（不污染原节点 Graphics） */
    hitFlash (parent: Node, x: number, y: number, w: number, h: number, color: Color): void {
        const n = nd('flash', w, h, parent);
        n.setPosition(x, y);
        const g = gfx(n);
        g.fillColor = new Color(color.r, color.g, color.b, 170);
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.fill();
        const o = n.getComponent(UIOpacity) || n.addComponent(UIOpacity)!;
        o.opacity = 255;
        tween(o).to(0.2, { opacity: 0 }).call(() => n.destroy()).start();
    }
}

export const Fx = new FxClass();

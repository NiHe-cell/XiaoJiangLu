/** 界面栈：go / back，面板即用即建、离开即销毁 */
import { Node } from 'cc';

export type PanelBuilder = (parent: Node, param?: any) => Node;

interface Frame { name: string; node: Node; param?: any; }

class RouterClass {
    private root: Node | null = null;
    private builders: { [k: string]: PanelBuilder } = {};
    private stack: Frame[] = [];
    private listener: ((name: string) => void) | null = null;

    /** 面板切换后通知（用于 Banner 只留在主城，避免盖住核心操作区） */
    setListener (fn: (name: string) => void): void {
        this.listener = fn;
    }

    private emit (): void {
        if (!this.listener) return;
        try { this.listener(this.current); } catch (e) { console.warn('[Router] listener 异常', e); }
    }

    init (root: Node): void {
        this.root = root;
    }

    register (name: string, b: PanelBuilder): void {
        this.builders[name] = b;
    }

    get current (): string {
        return this.stack.length ? this.stack[this.stack.length - 1].name : '';
    }

    /** 当前栈深度。用于「有上一层就 back()，没有才 reset()」这类返回逻辑，
     *  避免用 go() 兜底导致栈无限增长、旧面板永不销毁。 */
    get depth (): number {
        return this.stack.length;
    }

    go (name: string, param?: any, replace = false): void {
        if (!this.root) return;
        if (!this.builders[name]) {
            console.error('[Router] 未注册面板:', name);
            return;
        }
        if (replace && this.stack.length) {
            const f = this.stack.pop()!;
            f.node.destroy();
        } else if (this.stack.length) {
            const cur = this.stack[this.stack.length - 1];
            cur.node.active = false;
        }
        const node = this.builders[name](this.root, param);
        this.stack.push({ name, node, param });
        this.emit();
    }

    /** 返回上一界面（重建） */
    back (): void {
        if (this.stack.length <= 1) return;
        const cur = this.stack.pop()!;
        cur.node.destroy();
        const prev = this.stack[this.stack.length - 1];
        const node = this.builders[prev.name](this.root!, prev.param);
        prev.node = node;
        this.emit();
    }

    /** 回到指定界面（清空其上的栈） */
    backTo (name: string): void {
        while (this.stack.length > 1 && this.stack[this.stack.length - 1].name !== name) {
            const f = this.stack.pop()!;
            f.node.destroy();
        }
        if (!this.stack.length) return;
        const top = this.stack[this.stack.length - 1];
        if (top.name !== name) return;
        top.node.destroy();
        const node = this.builders[name](this.root!, top.param);
        top.node = node;
        this.emit();
    }

    /** 清空全部栈并重建（回主界面用） */
    reset (name: string, param?: any): void {
        while (this.stack.length) {
            const f = this.stack.pop()!;
            f.node.destroy();
        }
        this.go(name, param);
    }
}

export const Router = new RouterClass();

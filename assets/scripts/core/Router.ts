/** 界面栈：go / back，面板即用即建、离开即销毁 */
import { Node } from 'cc';

export type PanelBuilder = (parent: Node, param?: any) => Node;

interface Frame { name: string; node: Node; param?: any; }

class RouterClass {
    private root: Node | null = null;
    private builders: { [k: string]: PanelBuilder } = {};
    private stack: Frame[] = [];

    init (root: Node): void {
        this.root = root;
    }

    register (name: string, b: PanelBuilder): void {
        this.builders[name] = b;
    }

    get current (): string {
        return this.stack.length ? this.stack[this.stack.length - 1].name : '';
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
    }

    /** 返回上一界面（重建） */
    back (): void {
        if (this.stack.length <= 1) return;
        const cur = this.stack.pop()!;
        cur.node.destroy();
        const prev = this.stack[this.stack.length - 1];
        const node = this.builders[prev.name](this.root!, prev.param);
        prev.node = node;
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

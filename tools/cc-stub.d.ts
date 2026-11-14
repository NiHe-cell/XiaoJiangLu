// 给 tsc 用的 cc 声明桩。云端没有 Cocos Creator，不能走 temp/tsconfig.cocos.json。
// 只覆盖工程里实际用到的符号，字段尽量宽松，避免桩本身变成第二套引擎。

declare module 'cc' {
    export class Vec3 {
        x: number;
        y: number;
        z: number;
        constructor(x?: number, y?: number, z?: number);
        clone(): Vec3;
    }

    export class Color {
        r: number;
        g: number;
        b: number;
        a: number;
        constructor(r?: number, g?: number, b?: number, a?: number);
    }

    export class Component {
        node: Node;
        scheduleOnce(callback: () => void, delay?: number): void;
    }

    export class Node {
        name: string;
        active: boolean;
        layer: number;
        parent: Node | null;
        position: Vec3;
        children: Node[];
        static EventType: {
            TOUCH_START: string;
            TOUCH_END: string;
            TOUCH_CANCEL: string;
        };
        constructor(name?: string);
        addComponent<T>(type: new (...args: any[]) => T): T;
        getComponent<T>(type: new (...args: any[]) => T): T | null;
        getChildByName(name: string): Node | null;
        setPosition(x: number, y?: number, z?: number): void;
        setScale(x: number, y?: number, z?: number): void;
        setSiblingIndex(index: number): void;
        on(type: string, callback: (...args: any[]) => void, target?: any): void;
        destroy(): void;
        destroyAllChildren(): void;
        removeFromParent(): void;
    }

    export class UITransform extends Component {
        width: number;
        height: number;
        setContentSize(w: number, h: number): void;
        hitTest(screenPoint: any, windowId?: number): boolean;
    }

    export class Graphics extends Component {
        fillColor: Color;
        strokeColor: Color;
        lineWidth: number;
        clear(): void;
        fill(): void;
        stroke(): void;
        close(): void;
        rect(x: number, y: number, w: number, h: number): void;
        roundRect(x: number, y: number, w: number, h: number, r: number): void;
        circle(cx: number, cy: number, r: number): void;
        moveTo(x: number, y: number): void;
        lineTo(x: number, y: number): void;
    }

    export enum HorizontalTextAlignment { LEFT, CENTER, RIGHT }
    export enum VerticalTextAlignment { TOP, CENTER, BOTTOM }

    export class Label extends Component {
        string: string;
        fontSize: number;
        lineHeight: number;
        color: Color;
        horizontalAlign: HorizontalTextAlignment;
        verticalAlign: VerticalTextAlignment;
        overflow: number;
        enableWrapText: boolean;
        static Overflow: { NONE: number; CLAMP: number; SHRINK: number; RESIZE_HEIGHT: number };
    }

    export class UIOpacity extends Component {
        opacity: number;
    }

    export class Widget extends Component {
        isAlignLeft: boolean;
        isAlignRight: boolean;
        isAlignTop: boolean;
        isAlignBottom: boolean;
        left: number;
        right: number;
        top: number;
        bottom: number;
    }

    export class BlockInputEvents extends Component {}

    export const Layers: { Enum: { UI_2D: number } };

    export function tween(target: any): any;

    export const sys: {
        localStorage: {
            getItem(key: string): string | null;
            setItem(key: string, value: string): void;
        };
    };

    export class Director {
        static EVENT_AFTER_SCENE_LAUNCH: string;
    }

    export const director: {
        on(event: string, callback: () => void): void;
        getScene(): Node | null;
    };

    export const _decorator: {
        ccclass(name?: string): ClassDecorator;
    };
}

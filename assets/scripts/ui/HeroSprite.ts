/**
 * 把 Ninja Adventure 像素图贴到现有程序化头像上。
 * 贴图没到位或加载失败时什么都不画，底下的 Graphics 色块 / 纹样原样留着。
 * 品质色只作为外框（卡片描边），这里不给精灵染色。
 */
import {
    Node, Sprite, SpriteFrame, Texture2D, Rect, Size, Vec2, Color,
    UITransform, resources, Component, _decorator,
} from 'cc';
import { nd } from '../core/Ui';
import { Store } from '../core/Store';
import { heroAssetKey } from '../data/HeroVisuals';

const { ccclass } = _decorator;

/** 像素核对后的列序：下、上、左、右。不是按行分方向。 */
type SheetDir = 'down' | 'up' | 'left' | 'right';

const CELL = 16;

function dirIndex (dir: SheetDir): number {
    switch (dir) {
        case 'down': return 0;
        case 'up': return 1;
        case 'left': return 2;
        case 'right': return 3;
        default: {
            const unknown: never = dir;
            return unknown;
        }
    }
}

/** 整数倍放大，避免最近邻采样把像素拉成不均匀的宽窄条。 */
function fitPixels (srcW: number, srcH: number, boxW: number, boxH: number): { w: number; h: number } {
    const s = Math.max(1, Math.floor(Math.min(boxW / srcW, boxH / srcH)));
    return { w: srcW * s, h: srcH * s };
}

function forceNearest (sf: SpriteFrame): void {
    const tex = sf.texture as Texture2D | null;
    if (!tex || !tex.setFilters) return;
    const filter = Texture2D.Filter;
    const wrap = Texture2D.WrapMode;
    if (filter) {
        const nearest = filter.NEAREST != null ? filter.NEAREST : 1;
        tex.setFilters(nearest, nearest);
        if (tex.setMipFilter) {
            const none = filter.NONE != null ? filter.NONE : 0;
            tex.setMipFilter(none);
        }
    }
    if (wrap && tex.setWrapMode && wrap.CLAMP_TO_EDGE != null) {
        tex.setWrapMode(wrap.CLAMP_TO_EDGE, wrap.CLAMP_TO_EDGE);
    }
}

function slice (base: SpriteFrame, x: number, y: number, w: number, h: number): SpriteFrame {
    const sf = new SpriteFrame();
    sf.reset({
        texture: base.texture,
        rect: new Rect(x, y, w, h),
        originalSize: new Size(w, h),
        offset: new Vec2(0, 0),
    });
    sf.packable = false;
    return sf;
}

const frameCache: { [path: string]: SpriteFrame | null } = {};
const frameWait: { [path: string]: ((sf: SpriteFrame | null) => void)[] } = {};

function loadFrame (path: string, cb: (sf: SpriteFrame | null) => void): void {
    if (Object.prototype.hasOwnProperty.call(frameCache, path)) {
        cb(frameCache[path]);
        return;
    }
    if (frameWait[path]) {
        frameWait[path].push(cb);
        return;
    }
    frameWait[path] = [cb];
    resources.load(path, SpriteFrame, (err, asset) => {
        const sf = !err && asset ? asset : null;
        if (sf) forceNearest(sf);
        else console.warn('[HeroSprite] 贴图缺失，保留程序化头像', path);
        frameCache[path] = sf;
        const list = frameWait[path] || [];
        delete frameWait[path];
        for (const fn of list) fn(sf);
    });
}

function sheetPath (key: string, name: string): string {
    return `textures/heroes/${key}/${name}/spriteFrame`;
}

interface ActorSheets {
    stand: (SpriteFrame | null)[];
    walk: SpriteFrame[][];
    attack: (SpriteFrame | null)[];
}

const packCache: { [key: string]: ActorSheets | null } = {};
const packWait: { [key: string]: ((pack: ActorSheets | null) => void)[] } = {};

function cellsOf (sf: SpriteFrame | null, rows: number): SpriteFrame[][] | null {
    if (!sf || !sf.texture) return null;
    const origin = sf.rect;
    const grid: SpriteFrame[][] = [];
    for (let r = 0; r < rows; r++) {
        const line: SpriteFrame[] = [];
        for (let c = 0; c < 4; c++) {
            line.push(slice(sf, origin.x + c * CELL, origin.y + r * CELL, CELL, CELL));
        }
        grid.push(line);
    }
    return grid;
}

function loadSheets (key: string, cb: (pack: ActorSheets | null) => void): void {
    if (Object.prototype.hasOwnProperty.call(packCache, key)) {
        cb(packCache[key]);
        return;
    }
    if (packWait[key]) {
        packWait[key].push(cb);
        return;
    }
    packWait[key] = [cb];
    const names = ['idle', 'walk', 'attack', 'unit'];
    const got: { [name: string]: SpriteFrame | null } = {};
    let left = names.length;
    const done = () => {
        left--;
        if (left > 0) return;
        const idle = cellsOf(got.idle, 1);
        const walk = cellsOf(got.walk, 4);
        const attack = cellsOf(got.attack, 1);
        const stand: (SpriteFrame | null)[] = [null, null, null, null];
        const walkDirs: SpriteFrame[][] = [[], [], [], []];
        const atk: (SpriteFrame | null)[] = [null, null, null, null];
        for (let d = 0; d < 4; d++) {
            if (idle) stand[d] = idle[0][d];
            if (attack) atk[d] = attack[0][d];
            if (walk) {
                const frames: SpriteFrame[] = [];
                for (let r = 0; r < walk.length; r++) frames.push(walk[r][d]);
                walkDirs[d] = frames;
            }
        }
        // unit.png 是面朝下的站立帧，idle 失败时至少能站住这一面
        if (!stand[0] && got.unit) stand[0] = got.unit;
        const useful = !!(stand[0] || walkDirs[0].length || atk[0]);
        const pack: ActorSheets | null = useful ? { stand, walk: walkDirs, attack: atk } : null;
        packCache[key] = pack;
        const list = packWait[key] || [];
        delete packWait[key];
        for (const fn of list) fn(pack);
    };
    for (const name of names) loadFrame(sheetPath(key, name), (sf) => { got[name] = sf; done(); });
}

function makeSprite (parent: Node, w: number, h: number, x: number, y: number): { node: Node; sprite: Sprite } {
    const host = nd('pixel', w, h, parent);
    host.setPosition(x, y);
    // 头像只是画在卡片上的一层，点击仍交给原来的卡片 / 技能按钮。
    const ui = host.getComponent(UITransform);
    if (ui) ui.hitTest = () => false;
    const sp = host.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    sp.trim = false;
    sp.color = new Color(255, 255, 255, 255);
    return { node: host, sprite: sp };
}

/** 头像（faceset）。返回的节点在父节点子节点列表末尾，调用方可视需要把它沉到最底层。 */
export function mountHeroPortrait (parent: Node, heroId: number, cx: number, cy: number, boxW: number, boxH: number): Node | null {
    const key = heroAssetKey(heroId, Store.data.gender);
    if (!key || boxW < 8 || boxH < 8) return null;
    const view = makeSprite(parent, 0, 0, cx, cy);
    loadFrame(sheetPath(key, 'faceset'), (sf) => {
        if (!sf || !view.node.isValid) return;
        const rect = sf.rect;
        const fit = fitPixels(rect.width, rect.height, boxW, boxH);
        const ui = view.node.getComponent(UITransform);
        if (ui) ui.setContentSize(fit.w, fit.h);
        view.sprite.spriteFrame = sf;
    });
    return view.node;
}

export interface BattleActor {
    node: Node;
    /** 前半段走当前朝向的 walk 行，后半段切到 attack 同方向那一格，然后回到站立。 */
    playStrike (speed: number): void;
    playStand (): void;
}

@ccclass('HeroPixelActor')
class HeroPixelActor extends Component {
    private sprite: Sprite | null = null;
    private dir = 0;
    private mode: 'stand' | 'strike' = 'stand';
    private t = 0;
    private speed = 1;
    private ready = false;
    private stand: (SpriteFrame | null)[] = [null, null, null, null];
    private walk: SpriteFrame[][] = [[], [], [], []];
    private attack: (SpriteFrame | null)[] = [null, null, null, null];

    bind (sprite: Sprite, dir: SheetDir): void {
        this.sprite = sprite;
        this.dir = dirIndex(dir);
    }

    useSheets (pack: ActorSheets): void {
        this.stand = pack.stand;
        this.walk = pack.walk;
        this.attack = pack.attack;
        this.ready = true;
        this.applyFrame();
    }

    playStrike (speed: number): void {
        this.mode = 'strike';
        this.t = 0;
        this.speed = speed > 0 ? speed : 1;
        if (this.ready) this.applyFrame();
    }

    playStand (): void {
        this.mode = 'stand';
        this.t = 0;
        if (this.ready) this.applyFrame();
    }

    update (dt: number): void {
        if (this.mode !== 'strike') return;
        this.t += dt;
        const dur = 0.28 / this.speed;
        if (this.t >= dur) {
            this.mode = 'stand';
            this.t = 0;
        }
        if (this.ready) this.applyFrame();
    }

    private applyFrame (): void {
        if (!this.sprite || !this.sprite.isValid) return;
        const sf = this.pick();
        if (sf) this.sprite.spriteFrame = sf;
    }

    private pick (): SpriteFrame | null {
        if (this.mode === 'strike') {
            const dur = 0.28 / this.speed;
            if (this.t < dur * 0.5) {
                const frames = this.walk[this.dir];
                if (frames && frames.length) {
                    const i = Math.min(frames.length - 1, Math.floor((this.t / (dur * 0.5)) * frames.length));
                    return frames[i];
                }
            }
            if (this.attack[this.dir]) return this.attack[this.dir];
        }
        return this.stand[this.dir] || this.stand[0];
    }
}

/**
 * 战斗小人。我方在画面下方，朝上面对敌阵；敌方在画面上方，朝下。
 * 站立用 idle 对应列（unit.png 只是朝下的那一格）。
 */
export function mountBattleActor (
    parent: Node, heroId: number, cx: number, cy: number, boxW: number, boxH: number, facing: SheetDir,
): BattleActor | null {
    const key = heroAssetKey(heroId, Store.data.gender);
    if (!key) return null;
    const fit = fitPixels(CELL, CELL, boxW, boxH);
    const view = makeSprite(parent, fit.w, fit.h, cx, cy);
    const actor = view.node.addComponent(HeroPixelActor);
    actor.bind(view.sprite, facing);
    loadSheets(key, (pack) => {
        if (!pack || !view.node.isValid) return;
        actor.useSheets(pack);
    });
    return {
        node: view.node,
        playStrike: (speed: number) => { if (view.node.isValid) actor.playStrike(speed); },
        playStand: () => { if (view.node.isValid) actor.playStand(); },
    };
}

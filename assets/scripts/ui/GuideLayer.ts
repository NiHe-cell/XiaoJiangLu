/**
 * 首启 5 步引导：遮罩 + 高亮当前目标 + 短文案。
 * 只有点中目标才前进。点别的地方会被遮罩吃掉。
 * 战斗中不挂遮罩，避免把第一场战斗卡死。
 */
import { BlockInputEvents, Color, Node } from 'cc';
import { BAL } from '../data/Balance';
import {
    GUIDE_DONE,
    GUIDE_STAGE_ID,
    HERO_ACK,
    HitRect,
    HOME_ADJUST,
    HOME_GO,
    HOME_RECRUIT,
    LINEUP_ACT,
    RECRUIT_ONCE,
    RESULT_TRAIN,
    TOP_BACK,
    guideTipY,
    navHit,
} from '../data/RetentionConf';
import { TXT } from '../data/TextConf';
import { guideAdvance } from '../core/Retention';
import { Fx } from '../core/Fx';
import { Router } from '../core/Router';
import { Store } from '../core/Store';
import { C, FS } from '../core/Theme';
import { box, gfx, nd, txt } from '../core/Ui';

export type GuidePanel = 'home' | 'stage' | 'lineup' | 'battle' | 'result' | 'hero' | 'heroDetail' | 'recruit' | 'daily';

interface Spot {
    hole: HitRect;
    tip: string;
    onHit: () => void;
}

let lockAt = 0;

function lock (): boolean {
    const now = Date.now();
    if (now - lockAt < 400) return false;
    lockAt = now;
    return true;
}

function step (): number {
    return Store.data.guideStep;
}

export function guideActive (): boolean {
    return step() < GUIDE_DONE;
}

/** 引导进行中时，底部导航只放行当前这一步，避免绕开目标。 */
export function interceptNav (key: string): boolean {
    if (!guideActive()) return false;
    const s = step();
    if (key === 'lineup' && s === 1) { openLineup(true); return true; }
    if (key === 'lineup' && s === 2) { openLineup(false); return true; }
    if (key === 'hero' && s === 3) { doTrain(); return true; }
    if (key === 'recruit' && s === 4) { doRecruit(); return true; }
    return true;
}

export function doMarch (): void {
    if (!lock()) return;
    if (step() === 0) guideAdvance(Store.data);
    Store.save();
    Router.go('stage');
}

export function goStage (): void {
    if (!lock()) return;
    Router.go('stage');
}

export function goLineup (): void {
    if (!lock()) return;
    Router.go('lineup');
}

export function openLineup (advance: boolean): void {
    if (!lock()) return;
    if (advance && step() === 1) guideAdvance(Store.data);
    Store.save();
    Router.go('lineup');
}

export function confirmLineup (): void {
    if (!lock()) return;
    if (step() === 1) guideAdvance(Store.data);
    Store.save();
    Router.go('lineup', undefined, true);
}

export function doFight (): void {
    if (!lock()) return;
    if (Store.data.stamina < BAL.staminaPerStage) {
        Fx.toast(TXT.toast.noStamina);
        return;
    }
    if (step() === 2) guideAdvance(Store.data);
    Store.save();
    Router.go('battle', { stageId: GUIDE_STAGE_ID });
}

export function doTrain (): void {
    if (!lock()) return;
    if (step() === 3) guideAdvance(Store.data);
    Store.save();
    Router.reset('hero');
}

export function doRecruit (): void {
    if (!lock()) return;
    const before = step();
    if (before === 4) guideAdvance(Store.data);
    Store.save();
    if (before === 4) Fx.toast(TXT.guide.done);
    Router.reset('recruit');
}

export function ackTrain (): void {
    if (!lock()) return;
    if (step() === 3) guideAdvance(Store.data);
    Store.save();
    Router.go('hero', undefined, true);
}

export function backFromDetail (): void {
    if (!lock()) return;
    if (Router.depth > 1) Router.back();
    else Router.reset('hero');
}

export function finishOnRecruit (): void {
    if (!lock()) return;
    if (step() === 4) guideAdvance(Store.data);
    Store.save();
    Fx.toast(TXT.guide.done);
    Router.go('recruit', undefined, true);
}

function spotFor (panel: GuidePanel): Spot | null {
    const s = step();
    if (s >= GUIDE_DONE) return null;
    switch (panel) {
        case 'home':
            if (s === 0) return { hole: HOME_GO, tip: TXT.guide.march, onHit: doMarch };
            if (s === 1) return { hole: HOME_GO, tip: TXT.guide.resumeMarch, onHit: goStage };
            if (s === 2) return { hole: HOME_ADJUST, tip: TXT.guide.resumeFight, onHit: goLineup };
            if (s === 3) return { hole: navHit('hero'), tip: TXT.guide.resumeTrain, onHit: doTrain };
            return { hole: HOME_RECRUIT, tip: TXT.guide.resumeRecruit, onHit: doRecruit };
        case 'stage':
            if (s === 1) return { hole: navHit('lineup'), tip: TXT.guide.lineup, onHit: () => openLineup(true) };
            if (s === 2) return { hole: navHit('lineup'), tip: TXT.guide.resumeFight, onHit: () => openLineup(false) };
            if (s === 3) return { hole: navHit('hero'), tip: TXT.guide.resumeTrain, onHit: doTrain };
            if (s === 4) return { hole: navHit('recruit'), tip: TXT.guide.resumeRecruit, onHit: doRecruit };
            return { hole: TOP_BACK, tip: TXT.guide.resumeMarch, onHit: () => { if (lock()) Router.back(); } };
        case 'lineup':
            if (s === 1) return { hole: LINEUP_ACT, tip: TXT.guide.confirmTip, onHit: confirmLineup };
            if (s === 2) return { hole: LINEUP_ACT, tip: TXT.guide.fight, onHit: doFight };
            if (s === 3) return { hole: navHit('hero'), tip: TXT.guide.resumeTrain, onHit: doTrain };
            if (s === 4) return { hole: navHit('recruit'), tip: TXT.guide.resumeRecruit, onHit: doRecruit };
            return { hole: TOP_BACK, tip: TXT.guide.resumeMarch, onHit: () => { if (lock()) Router.back(); } };
        case 'result':
            if (s === 3) return { hole: RESULT_TRAIN, tip: TXT.guide.train, onHit: doTrain };
            return null;
        case 'hero':
            if (s === 3) return { hole: HERO_ACK, tip: TXT.guide.train, onHit: ackTrain };
            if (s === 4) return { hole: navHit('recruit'), tip: TXT.guide.recruit, onHit: doRecruit };
            return null;
        case 'heroDetail':
            if (s === 3 || s === 4) return { hole: TOP_BACK, tip: s === 3 ? TXT.guide.train : TXT.guide.resumeRecruit, onHit: backFromDetail };
            return null;
        case 'recruit':
            if (s === 4) return { hole: RECRUIT_ONCE, tip: TXT.guide.recruit, onHit: finishOnRecruit };
            return null;
        case 'battle':
        case 'daily':
            return null;
        default: {
            const neverPanel: never = panel;
            void neverPanel;
            return null;
        }
    }
}

function blocker (parent: Node, x: number, y: number, w: number, h: number): void {
    if (w <= 1 || h <= 1) return;
    const n = nd('gblock', w, h, parent);
    n.setPosition(x, y);
    const g = gfx(n);
    g.fillColor = new Color(0, 0, 0, 168);
    g.rect(-w / 2, -h / 2, w, h);
    g.fill();
    n.addComponent(BlockInputEvents);
}

/** 遮罩留出孔，孔上的透明热区负责前进。底下的原按钮再点一次会被 400ms 锁吃掉。 */
export function maybeGuide (parent: Node, panel: GuidePanel): void {
    const spot = spotFor(panel);
    if (!spot) return;
    const layer = nd('guide', 720, 1280, parent);
    layer.setPosition(0, 0);
    layer.setSiblingIndex(8000);

    const hole = spot.hole;
    const ext = 900;
    const left = hole.x - hole.w / 2;
    const right = hole.x + hole.w / 2;
    const bottom = hole.y - hole.h / 2;
    const top = hole.y + hole.h / 2;
    blocker(layer, 0, (top + ext) / 2, ext * 2, ext - top);
    blocker(layer, 0, (-ext + bottom) / 2, ext * 2, bottom + ext);
    blocker(layer, (-ext + left) / 2, hole.y, left + ext, hole.h);
    blocker(layer, (right + ext) / 2, hole.y, ext - right, hole.h);

    const hit = nd('guideHit', hole.w, hole.h, layer);
    hit.setPosition(hole.x, hole.y);
    box(hit, 12, undefined, C.gold, 4);
    hit.on(Node.EventType.TOUCH_END, () => spot.onHit());

    const tip = nd('guideTip', 480, 64, layer);
    tip.setPosition(0, guideTipY(hole.y, hole.h));
    box(tip, 12, C.panel, C.gold, 2);
    txt(tip, spot.tip, FS.body, C.gold, 460, 52);
    tip.addComponent(BlockInputEvents);
}

/**
 * 日常：签到 / 七日任务 / 三类副本。从主城「日常」进入。
 */
import { Node } from 'cc';
import { showRewarded } from '../core/Ad';
import { Fx } from '../core/Fx';
import { Router } from '../core/Router';
import { Store } from '../core/Store';
import { C, FS } from '../core/Theme';
import { box, fullBg, nd, txt } from '../core/Ui';
import {
    DAILY_CLAIM_H,
    DAILY_CLAIM_W,
    DAILY_CLAIM_X,
    DAILY_ROW0_Y,
    DAILY_ROW_H,
    DAILY_ROW_STEP,
    DAILY_ROW_W,
    DAILY_TAB_H,
    DAILY_TAB_W,
    DAILY_TAB_XS,
    DAILY_TAB_Y,
    DUNGEON_BTN_H,
    DUNGEON_BTN_W,
    DUNGEON_BTN_XS,
    DUNGEON_BTN_Y,
    DUNGEON_CARD_H,
    DUNGEON_CARD_W,
    DUNGEON_BASE,
    DUNGEON_CARD_YS,
    DUNGEON_ORDER,
    DungeonKind,
    SIGN_REWARDS,
    WEEK_TASKS,
} from '../data/RetentionConf';
import { TXT } from '../data/TextConf';
import {
    canDungeon,
    claimSign,
    claimWeek,
    describeGrant,
    dungeonQuota,
    dungeonTitle,
    grantDungeonExtra,
    signView,
    syncDaily,
    weekReady,
    weekValue,
} from '../core/Retention';
import { bottomNav, NavKey, resBar, topBar } from './Common';
import { guideActive, interceptNav } from './GuideLayer';

type Tab = 'sign' | 'week' | 'dungeon';

export function buildDailyPanel (parent: Node): Node {
    const root = nd('Daily', 720, 1280, parent);
    root.setPosition(0, 0);
    fullBg(root, C.bg);
    const res = resBar(root);
    topBar(root, TXT.daily.title, () => {
        if (Router.depth > 1) Router.back();
        else Router.reset('home');
    });

    if (syncDaily(Store.data, Date.now())) Store.save();

    let tab: Tab = 'sign';
    const tabBar = nd('tabBar', 700, 80, root);
    tabBar.setPosition(0, 0);
    const body = nd('body', 700, 860, root);
    body.setPosition(0, 0);

    const paintTabs = () => {
        tabBar.destroyAllChildren();
        const tabs: { id: Tab; label: string }[] = [
            { id: 'sign', label: TXT.daily.sign },
            { id: 'week', label: TXT.daily.week },
            { id: 'dungeon', label: TXT.daily.dungeon },
        ];
        for (let i = 0; i < tabs.length; i++) {
            const t = tabs[i];
            const b = nd('tab' + t.id, DAILY_TAB_W, DAILY_TAB_H, tabBar);
            b.setPosition(DAILY_TAB_XS[i], DAILY_TAB_Y);
            const on = tab === t.id;
            box(b, 10, on ? C.btn : C.btnGhost, on ? C.gold : C.panelLine, 2);
            txt(b, t.label, FS.h2, on ? C.textDark : C.text, DAILY_TAB_W, DAILY_TAB_H);
            b.on(Node.EventType.TOUCH_END, () => {
                if (tab === t.id) return;
                tab = t.id;
                rebuild();
            });
        }
    };

    const rowBtn = (row: Node, label: string, primary: boolean, fn: () => void): void => {
        const b = nd('act', DAILY_CLAIM_W, DAILY_CLAIM_H, row);
        b.setPosition(DAILY_CLAIM_X, 0);
        box(b, 10, primary ? C.btn : C.btnGhost, primary ? C.gold : C.panelLine, 2);
        txt(b, label, FS.small, primary ? C.textDark : C.textSub, DAILY_CLAIM_W, DAILY_CLAIM_H);
        b.on(Node.EventType.TOUCH_END, fn);
    };

    const paintSign = (): void => {
        const now = Date.now();
        const view = signView(Store.data, now);
        for (let i = 0; i < SIGN_REWARDS.length; i++) {
            const row = nd('day' + i, DAILY_ROW_W, DAILY_ROW_H, body);
            row.setPosition(0, DAILY_ROW0_Y - i * DAILY_ROW_STEP);
            const hot = view.can && view.next === i;
            box(row, 12, hot ? C.panelLight : C.panel, hot ? C.gold : C.panelLine, 2);
            txt(row, TXT.daily.dayN.replace('{n}', String(i + 1)), FS.small, C.gold, 140, 40, -190, 0);
            txt(row, describeGrant(SIGN_REWARDS[i]), FS.tiny, C.textSub, 240, 40, -10, 0);
            if (view.claimed[i]) {
                txt(row, TXT.daily.claimed, FS.small, C.green, DAILY_CLAIM_W, 40, DAILY_CLAIM_X, 0);
            } else if (hot) {
                rowBtn(row, TXT.daily.claim, true, () => {
                    const r = claimSign(Store.data, Date.now());
                    if (!r.ok) { Fx.toast(TXT.toast.claimedToday); return; }
                    Store.save();
                    res.refresh();
                    Fx.toast(TXT.daily.signOk);
                    rebuild();
                });
            } else {
                txt(row, TXT.daily.lockedDay, FS.small, C.textWeak, DAILY_CLAIM_W, 40, DAILY_CLAIM_X, 0);
            }
        }
    };

    const paintWeek = (): void => {
        for (let i = 0; i < WEEK_TASKS.length; i++) {
            const task = WEEK_TASKS[i];
            const row = nd('week' + i, DAILY_ROW_W, DAILY_ROW_H, body);
            row.setPosition(0, DAILY_ROW0_Y - i * DAILY_ROW_STEP);
            const got = (Store.data.weekClaimed & (1 << i)) !== 0;
            const ready = weekReady(Store.data, i);
            box(row, 12, ready ? C.panelLight : C.panel, ready ? C.gold : C.panelLine, 2);
            txt(row, TXT.weekTask[i], FS.small, C.text, 220, 32, -150, 12);
            const cur = Math.min(weekValue(Store.data, i), task.goal);
            txt(row, TXT.daily.progress.replace('{a}', String(cur)).replace('{b}', String(task.goal))
                + '  ' + describeGrant(task.reward), FS.tiny, C.textSub, 300, 28, -110, -16);
            if (got) {
                txt(row, TXT.daily.claimed, FS.small, C.green, DAILY_CLAIM_W, 40, DAILY_CLAIM_X, 0);
            } else if (ready) {
                rowBtn(row, TXT.daily.claim, true, () => {
                    const r = claimWeek(Store.data, i);
                    if (!r.ok) { Fx.toast(TXT.daily.already); return; }
                    Store.save();
                    res.refresh();
                    Fx.toast(TXT.toast.claimOk);
                    rebuild();
                });
            } else {
                rowBtn(row, TXT.daily.go, false, () => goWeek(i));
            }
        }
    };

    const paintDungeon = (): void => {
        const now = Date.now();
        for (let i = 0; i < DUNGEON_ORDER.length; i++) {
            const kind = DUNGEON_ORDER[i];
            const card = nd('dg' + kind, DUNGEON_CARD_W, DUNGEON_CARD_H, body);
            card.setPosition(0, DUNGEON_CARD_YS[i]);
            box(card, 14, C.panel, C.goldDim, 2);
            const q = dungeonQuota(Store.data, kind, now);
            txt(card, dungeonTitle(kind), FS.h2, C.gold, 240, 36, -140, 52);
            txt(card, TXT.daily.left.replace('{n}', String(q.left)), FS.small, C.text, 160, 32, 160, 52);
            txt(card, describeGrant(DUNGEON_BASE[kind]), FS.small, C.textSub, 500, 32, 0, 8);
            const go = nd('go', DUNGEON_BTN_W, DUNGEON_BTN_H, card);
            go.setPosition(DUNGEON_BTN_XS[0], DUNGEON_BTN_Y);
            const open = q.left > 0;
            box(go, 12, open ? C.btnPrimary : C.btnGhost, open ? C.gold : C.panelLine, 2);
            txt(go, TXT.daily.challenge, FS.h2, open ? C.text : C.textWeak, DUNGEON_BTN_W, DUNGEON_BTN_H);
            go.on(Node.EventType.TOUCH_END, () => enterDungeon(kind));
            if (!q.extra) {
                const ex = nd('ex', DUNGEON_BTN_W, DUNGEON_BTN_H, card);
                ex.setPosition(DUNGEON_BTN_XS[1], DUNGEON_BTN_Y);
                box(ex, 12, C.btn, C.gold, 2);
                txt(ex, TXT.daily.extra, FS.h2, C.textDark, DUNGEON_BTN_W, DUNGEON_BTN_H);
                ex.on(Node.EventType.TOUCH_END, () => askExtra(kind, () => { res.refresh(); rebuild(); }));
            }
        }
    };

    const rebuild = (): void => {
        body.destroyAllChildren();
        paintTabs();
        if (tab === 'sign') paintSign();
        else if (tab === 'week') paintWeek();
        else paintDungeon();
    };

    bottomNav(root, 'home', (k: NavKey) => {
        if (k === 'home') {
            if (guideActive()) return;
            Router.reset('home');
            return;
        }
        if (interceptNav(k)) return;
        Router.reset(k);
    });

    rebuild();
    return root;
}

function enterDungeon (kind: DungeonKind): void {
    if (!canDungeon(Store.data, kind, Date.now())) {
        Fx.toast(TXT.daily.noAttempt);
        return;
    }
    Router.go('battle', { dungeon: kind });
}

function askExtra (kind: DungeonKind, done: () => void): void {
    // 广告未配置 / 失败 / 不可用时 Ad 会回调成功。这里不论布尔值都尝试加 1 次。
    showRewarded(() => {
        const ok = grantDungeonExtra(Store.data, kind, Date.now());
        if (!ok) { Fx.toast(TXT.daily.noAttempt); return; }
        Store.save();
        Fx.toast(TXT.daily.extraOk);
        done();
    }, 'dungeon_extra');
}

function goWeek (index: number): void {
    if (index === 0 || index === 4 || index === 6) { Router.go('stage'); return; }
    if (index === 1) { Router.go('lineup'); return; }
    if (index === 2 || index === 5) { Router.go('recruit'); return; }
    if (index === 3) { Router.go('hero'); return; }
}

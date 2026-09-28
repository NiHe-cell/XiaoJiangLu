/** 出征：章节 + 关卡列表 + 扫荡 */
import { Node, Color } from 'cc';
import { nd, box, boxAdd, txt, fullBg } from '../core/Ui';
import { C, FS } from '../core/Theme';
import { Store } from '../core/Store';
import { Router } from '../core/Router';
import { Fx } from '../core/Fx';
import { topBar, resBar, bottomNav, NavKey } from './Common';
import { CHAPTER_CONF, STAGE_CONF, StageConf } from '../data/StageConf';

const STAMINA_COST = 6;

export function buildStagePanel (parent: Node, param?: any): Node {
    const root = nd('Stage', 720, 1280, parent);
    root.setPosition(0, 0);
    fullBg(root, C.bg);
    const res = resBar(root);
    topBar(root, '出征', () => Router.back());

    let curChapter = param && param.chapter ? param.chapter : CHAPTER_CONF[0].id;

    // 章节 tab
    const tabBar = nd('tabs', 700, 60, root);
    tabBar.setPosition(0, 462);
    const tabXs = [-230, -138, -46, 46, 138, 230];
    const rebuildTabs = () => {
        tabBar.destroyAllChildren();
        CHAPTER_CONF.forEach((ch, i) => {
            const b = nd('tab' + ch.id, 92, 56, tabBar);
            b.setPosition(tabXs[i] ?? 0, 0);
            const on = ch.id === curChapter;
            box(b, 10, on ? C.btn : C.btnGhost, on ? C.gold : C.panelLine, 2);
            txt(b, ch.name.split('·')[0] || ch.name, 17, on ? C.text : C.textSub, 88, 32, 0, 0);
            b.on(Node.EventType.TOUCH_END, () => {
                if (curChapter === ch.id) return;
                curChapter = ch.id;
                rebuildTabs(); rebuildList();
            });
        });
    };

    const desc = txt(root, '', FS.small, C.textSub, 660, 34, 0, 404);

    const listLayer = nd('list', 700, 460, root);
    listLayer.setPosition(0, 0);

    const rebuildList = () => {
        const ch = CHAPTER_CONF.find((c) => c.id === curChapter) || CHAPTER_CONF[0];
        desc.string = `${ch.name} · ${ch.desc}（推荐战力 ${ch.recommendPower}）`;
        listLayer.destroyAllChildren();
        const stages = STAGE_CONF.filter((s) => s.chapter === curChapter);
        const xs = [-148, 148];
        const ys = [300, 172, 44, -84];
        stages.forEach((s, i) => {
            const x = xs[i % 2];
            const y = ys[Math.floor(i / 2)];
            const unlocked = s.id <= Store.data.maxStageId + 1;
            const stars = Store.data.stageStars[s.id] || 0;
            const card = nd('st' + s.id, 280, 112, listLayer);
            card.setPosition(x, y);
            box(card, 12, unlocked ? C.panel : new Color(38, 32, 27), unlocked ? C.goldDim : C.panelLine, 2);
            txt(card, s.name, FS.h2, unlocked ? C.text : C.textWeak, 190, 34, -38, 26);
            // 星级
            for (let k = 0; k < 3; k++) {
                const st = nd('s' + k, 22, 22, card);
                st.setPosition(-118 + k * 26, -20);
                const g = k < stars ? C.gold : new Color(90, 78, 62);
                boxAdd(st, -10, -10, 20, 20, 4, g);
            }
            txt(card, `战力 ${estimatePower(s)}`, FS.tiny, C.textSub, 130, 26, 20, -20);
            txt(card, `体力 ${STAMINA_COST}`, FS.tiny, C.cyan, 130, 26, 92, -20);
            if (!unlocked) txt(card, '未解锁', FS.small, C.textWeak, 280, 30, 0, 0);

            card.on(Node.EventType.TOUCH_END, () => guardEnter(() => {
                if (!unlocked) { Fx.toast('请先通关上一关'); return; }
                if (Store.data.stamina < STAMINA_COST) { Fx.toast('体力不足，可去商城购买体力丹'); return; }
                if (stars >= 3) {
                    Fx.confirm(`${s.name}\n三星关卡可扫荡，消耗 ${STAMINA_COST} 体力直接领奖`, () => {
                        doSweep(s, () => { res.refresh(); refreshTip(); });
                    }, '扫荡', '再想想');
                    return;
                }
                Router.go('battle', { stageId: s.id });
            }));
        });
    };

    // 连点保护（温绘 §6 Map M05：400ms 内忽略二次点击，否则连跳两场战斗）
    let entering = false;
    const guardEnter = (fn: () => void): void => {
        if (entering) return;
        entering = true;
        fn();
        setTimeout(() => { entering = false; }, 400);
    };

    const tip = txt(root, '', FS.small, C.textWeak, 660, 30, 0, -230);
    const refreshTip = () => {
        const id = Store.data.maxStageId;
        const s = STAGE_CONF.find((x) => x.id === id);
        tip.string = s ? `最新进度：${s.name}（${Store.data.stageStars[id] || 0} 星）` : '尚未出征，先打第一关吧';
    };

    // 剧情回顾
    const story = nd('story', 660, 110, root);
    story.setPosition(0, -320);
    box(story, 12, new Color(34, 26, 19, 230), C.panelLine, 2);
    txt(story, '战报', FS.small, C.gold, 160, 30, -240, 32);
    const storyTxt = txt(story, '选择关卡出征，胜利后可获得经验、银币与武将碎片', FS.tiny, C.textSub, 620, 56, 0, -14);

    // 一键扫荡本章
    const sweepAll = nd('sweepAll', 240, 64, root);
    sweepAll.setPosition(0, -430);
    box(sweepAll, 12, C.btn, C.gold, 2);
    txt(sweepAll, '一键扫荡本章', FS.h2, C.textDark, 240, 44);
    sweepAll.on(Node.EventType.TOUCH_END, () => {
        const stages = STAGE_CONF.filter((s) => s.chapter === curChapter && (Store.data.stageStars[s.id] || 0) >= 3);
        if (!stages.length) { Fx.toast('本章暂无三星关卡可扫荡'); return; }
        let n = 0;
        let silver = 0; let exp = 0;
        for (const s of stages) {
            if (Store.data.stamina < STAMINA_COST) break;
            Store.addStamina(-STAMINA_COST);
            const r = rewardOf(s);
            silver += r.silver; exp += r.exp;
            applyReward(r);
            n++;
        }
        Store.save();
        res.refresh(); refreshTip();
        Fx.toast(`扫荡 ${n} 关：银币 +${silver}，经验 +${exp}`);
    });

    bottomNav(root, 'home', (k: NavKey) => {
        if (k === 'home') { Router.reset('home'); return; }
        Router.reset(k);
    });

    rebuildTabs(); rebuildList(); refreshTip();
    return root;
}

function estimatePower (s: StageConf): number {
    let p = 0;
    for (const id of s.enemyIds) {
        const a = enemyAttr(id, s.enemyLevel);
        p += Math.floor(a.hp * 0.5 + a.atk * 4 + a.pdef * 2.5 + a.mdef * 2.5);
    }
    return p;
}

function enemyAttr (confId: number, level: number): { hp: number; atk: number; pdef: number; mdef: number } {
    // 由战斗层复用；此处用 Store 的属性公式（敌方不入存档）
    const anyStore = Store as any;
    return anyStore.enemyAttr ? anyStore.enemyAttr(confId, level) : { hp: 1000, atk: 100, pdef: 50, mdef: 50 };
}

function rewardOf (s: StageConf): { exp: number; silver: number; items: { id: number; n: number }[] } {
    const lv = s.enemyLevel;
    return {
        exp: 40 + lv * 12,
        silver: 120 + lv * 40,
        items: [],
    };
}

function applyReward (r: { exp: number; silver: number; items: { id: number; n: number }[] }): void {
    Store.addPlayerExp(r.exp);
    Store.addSilver(r.silver);
    for (const it of r.items) Store.addItem(it.id, it.n);
}

function doSweep (s: StageConf, refresh?: () => void): void {
    Store.addStamina(-STAMINA_COST);
    const r = rewardOf(s);
    applyReward(r);
    Store.save();
    if (refresh) refresh();
    Fx.toast(`扫荡完成：银币 +${r.silver}，经验 +${r.exp}`);
}

export { STAMINA_COST, rewardOf, applyReward };

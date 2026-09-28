/** 主城界面 */
import { Node, Color, Graphics } from 'cc';
import { nd, box, boxAdd, boxAddLine, lineAdd, txt, fullBg } from '../core/Ui';
import { C, FS } from '../core/Theme';
import { Store } from '../core/Store';
import { Router } from '../core/Router';
import { Fx } from '../core/Fx';
import { topBar, resBar, bottomNav, heroCard, NavKey } from './Common';
import { TXT } from '../data/TextConf';

export function buildHomePanel (parent: Node): Node {
    const root = nd('Home', 720, 1280, parent);
    root.setPosition(0, 0);

    const bg = fullBg(root, C.bg);
    drawHomeBg(bg);

    topBar(root, TXT.appName);
    resBar(root);

    // 战力条
    const pw = nd('powerBar', 580, 62, root);
    pw.setPosition(0, 462);
    box(pw, 12, C.panel, C.goldDim, 2);
    txt(pw, TXT.lineup.power, FS.small, C.textSub, 140, 44, -215, 0);
    txt(pw, String(Store.totalPower()), FS.h1, C.gold, 240, 44, -40, 0);
    const pwBtn = nd('pwBtn', 130, 44, pw);
    pwBtn.setPosition(205, 0);
    box(pwBtn, 10, C.btn, C.gold, 2);
    txt(pwBtn, TXT.home.adjust, FS.small, C.textDark, 130, 44);
    pwBtn.on(Node.EventType.TOUCH_END, () => Router.go('lineup'));

    // 上阵武将（3×2）
    const line = Store.data.lineup;
    const xs = [-118, 0, 118];
    const ys = [332, 172];
    for (let i = 0; i < 6; i++) {
        const x = xs[i % 3];
        const y = ys[Math.floor(i / 3)];
        if (i < line.length) {
            heroCard(root, {
                confId: line[i], x, y, w: 108, h: 142, showLevel: true, showStar: true,
                onClick: () => Router.go('hero', { confId: line[i] }),
            });
        } else {
            const s = nd('slot', 108, 142, root);
            s.setPosition(x, y);
            box(s, 12, new Color(40, 31, 23, 220), C.panelLine, 2);
            boxAddLine(s, -34, -34, 68, 68, 8, C.panelLine, 3);
            lineAdd(s, -18, 0, 18, 0, C.panelLine, 4);
            lineAdd(s, 0, -18, 0, 18, C.panelLine, 4);
            txt(s, TXT.common.emptySlot, 16, C.textWeak, 100, 24, 0, 0);
        }
    }

    // 出征
    const goBtn = nd('go', 360, 104, root);
    goBtn.setPosition(0, 20);
    box(goBtn, 18, C.btnPrimary, C.gold, 3);
    txt(goBtn, TXT.home.btnStory, FS.title, C.text, 360, 50, 0, 10);
    txt(goBtn, `第 ${Math.max(1, chapterOf(Store.data.maxStageId))} 章 · 继续推图`, FS.small, new Color(255, 220, 200), 360, 34, 0, -24);
    goBtn.on(Node.EventType.TOUCH_START, () => goBtn.setScale(0.96, 0.96, 1));
    goBtn.on(Node.EventType.TOUCH_END, () => { goBtn.setScale(1, 1, 1); Router.go('stage'); });
    goBtn.on(Node.EventType.TOUCH_CANCEL, () => goBtn.setScale(1, 1, 1));

    // 三个快捷入口
    const quick: { t: string; k: string }[] = [
        { t: TXT.home.btnRecruit, k: 'recruit' },
        { t: TXT.home.btnShop, k: 'shop' },
        { t: TXT.home.btnDaily, k: 'daily' },
    ];
    const qx = [-196, 0, 196];
    quick.forEach((q, i) => {
        const b = nd(q.k, 176, 78, root);
        b.setPosition(qx[i], -122);
        box(b, 12, C.panelLight, C.goldDim, 2);
        txt(b, q.t, FS.h2, C.text, 176, 44, 0, 6);
        b.on(Node.EventType.TOUCH_END, () => {
            if (q.k === 'daily') { Fx.toast(TXT.toast.comingSoon); return; }
            Router.go(q.k);
        });
    });

    // 今日目标
    const goal = nd('goal', 580, 96, root);
    goal.setPosition(0, -270);
    box(goal, 12, new Color(34, 26, 19, 230), C.panelLine, 2);
    txt(goal, TXT.home.todayGoal, FS.small, C.gold, 200, 34, -222, 24);
    txt(goal, TXT.home.goalBody, FS.small, C.textSub, 520, 34, 20, -10);
    boxAdd(goal, -276, -26, 552, 6, 3, new Color(60, 46, 33));
    boxAdd(goal, -276, -26, 184, 6, 3, C.green);

    txt(root, TXT.home.hint, FS.small, C.textWeak, 580, 36, 0, -420);

    bottomNav(root, 'home', (k: NavKey) => {
        if (k === 'home') return;
        Router.go(k);
    });

    return root;
}

/** 关卡 id → 章号。id 形如 101/208/605：(id-100)/100 + 1。
 *  注意 maxStageId 的哨兵值是 100（= 第一章第一关的前一关），
 *  用旧的 id/100 会把 100 算成第 2 章。 */
function chapterOf (stageId: number): number {
    return Math.max(1, Math.floor((stageId - 100) / 100) + 1);
}

function drawHomeBg (bg: Node): void {
    const g = bg.getComponent(Graphics)!;
    g.clear();
    g.fillColor = C.bg;
    g.rect(-800, -800, 1600, 1600);
    g.fill();
    g.fillColor = new Color(38, 29, 22);
    g.moveTo(-800, 120);
    g.lineTo(-420, 300); g.lineTo(-150, 160); g.lineTo(120, 330);
    g.lineTo(430, 150); g.lineTo(800, 260); g.lineTo(800, 120);
    g.close(); g.fill();
    g.fillColor = new Color(46, 35, 25);
    g.rect(-800, -800, 1600, 940);
    g.fill();
    g.fillColor = new Color(70, 50, 32);
    g.moveTo(-360, 640); g.lineTo(-160, 700); g.lineTo(160, 700); g.lineTo(360, 640);
    g.lineTo(360, 610); g.lineTo(-360, 610); g.close(); g.fill();
}

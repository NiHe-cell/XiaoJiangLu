/** 战斗结算 */
import { Node, Color, Graphics } from 'cc';
import { nd, box, boxAdd, txt, fullBg } from '../core/Ui';
import { C, FS } from '../core/Theme';
import { Store } from '../core/Store';
import { Router } from '../core/Router';
import { Fx } from '../core/Fx';
import { getStageConf, STAGE_CONF } from '../data/StageConf';
import { getItemConf } from '../data/ItemConf';

export function buildResultPanel (parent: Node, param?: any): Node {
    const root = nd('Result', 720, 1280, parent);
    root.setPosition(0, 0);
    fullBg(root, C.bgDeep);

    const win = param ? param.win : false;
    const stars = param ? param.stars : 0;
    const reward = param ? param.reward : { exp: 0, silver: 0, items: [] };
    const bonus = param ? param.bonus : { exp: 0, silver: 0, jade: 0 };
    const first = param ? param.first : false;
    const rounds = param ? param.rounds : 0;
    const stageId = param ? param.stageId : 1;
    const s = getStageConf(stageId);

    txt(root, win ? '大获全胜' : '败走麦城', 44, win ? C.gold : C.red, 580, 60, 0, 470);
    txt(root, s ? s.name : '', FS.h2, C.textSub, 580, 40, 0, 412);
    txt(root, `耗时 ${rounds} 回合`, FS.small, C.textWeak, 580, 32, 0, 360);

    // 星级
    for (let i = 0; i < 3; i++) {
        const n = nd('star' + i, 80, 80, root);
        n.setPosition(-110 + i * 110, 270);
        drawStar(n, i < stars ? C.gold : new Color(80, 68, 54));
    }
    txt(root, stars === 3 ? '完美通关，可扫荡' : (stars > 0 ? '通关成功' : '再接再厉'), FS.small, C.textSub, 580, 32, 0, 200);

    // 奖励
    const box1 = nd('reward', 580, 260, root);
    box1.setPosition(0, 40);
    box(box1, 14, C.panel, C.goldDim, 2);
    txt(box1, '战斗奖励', FS.small, C.gold, 200, 30, -220, 100);
    const lines: string[] = [
        `经验 +${reward.exp}`,
        `银币 +${reward.silver}`,
    ];
    if (bonus.jade) lines.push(`将玉 +${bonus.jade}`);
    for (const it of reward.items) lines.push(`${getItemConf(it.id).name} ×${it.n}`);
    if (first) lines.push('首通额外奖励已发放');
    lines.forEach((l, i) => {
        txt(box1, l, FS.small, C.text, 560, 32, 0, 52 - i * 38);
    });

    // 剧情
    if (s && win) {
        const st = nd('story', 580, 90, root);
        st.setPosition(0, -160);
        box(st, 12, new Color(34, 26, 19, 230), C.panelLine, 2);
        txt(st, s.storyAfter || '捷报传回，三军振奋。', FS.small, C.textSub, 620, 56, 0, 0, undefined, true);
    }

    // 按钮
    const btns: { t: string; fn: () => void; primary?: boolean }[] = [];
    if (win) {
        const nextId = stageId + 1;
        const next = STAGE_CONF.find((x) => x.id === nextId);
        if (next) btns.push({ t: '下一关', fn: () => Router.go('battle', { stageId: nextId }), primary: true });
        btns.push({ t: '再打一次', fn: () => Router.go('battle', { stageId }) });
    } else {
        btns.push({ t: '再挑战', fn: () => Router.go('battle', { stageId }), primary: true });
        btns.push({ t: '去养成', fn: () => Router.reset('hero') });
    }
    btns.push({ t: '返回主城', fn: () => Router.reset('home') });

    btns.forEach((b, i) => {
        const n = nd('rb' + i, 360, 84, root);
        n.setPosition(0, -300 - i * 100);
        box(n, 14, b.primary ? C.btnPrimary : C.btnGhost, b.primary ? C.gold : C.panelLine, 2);
        txt(n, b.t, FS.h1, b.primary ? C.text : C.textSub, 360, 44);
        n.on(Node.EventType.TOUCH_END, b.fn);
    });

    if (win && stars === 3) Fx.toast('三星达成，可在出征界面扫荡');
    return root;
}

function drawStar (n: Node, color: Color): void {
    const g = n.addComponent(Graphics)!;
    g.clear();
    g.fillColor = color;
    const R = 34; const r = 15;
    g.moveTo(0, R);
    for (let i = 1; i <= 10; i++) {
        const a = Math.PI / 2 + (i * Math.PI * 2) / 10;
        const rr = i % 2 === 0 ? R : r;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.close();
    g.fill();
}

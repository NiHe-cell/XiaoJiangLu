/** 战斗结算 */
import { Node, Color, Graphics } from 'cc';
import { nd, box, boxAdd, txt, fullBg } from '../core/Ui';
import { C, FS } from '../core/Theme';
import { Store } from '../core/Store';
import { Router } from '../core/Router';
import { Fx } from '../core/Fx';
import { getStageConf, STAGE_CONF } from '../data/StageConf';
import { getItemConf } from '../data/ItemConf';
import { TXT } from '../data/TextConf';
import { DungeonKind, RESULT_TRAIN } from '../data/RetentionConf';
import { canDungeon, dungeonTitle } from '../core/Retention';
import { doTrain, guideActive, maybeGuide } from './GuideLayer';

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
    const dungeon: DungeonKind | '' = param && (param.dungeon === 'exp' || param.dungeon === 'silver' || param.dungeon === 'adv')
        ? param.dungeon : '';
    const s = dungeon ? null : getStageConf(stageId);

    txt(root, win ? TXT.result.win : TXT.result.lose, 44, win ? C.gold : C.red, 580, 60, 0, 470);
    txt(root, dungeon ? dungeonTitle(dungeon) : (s ? s.name : ''), FS.h2, C.textSub, 580, 40, 0, 412);
    txt(root, `耗时 ${rounds} 回合`, FS.small, C.textWeak, 580, 32, 0, 360);

    // 星级
    for (let i = 0; i < 3; i++) {
        const n = nd('star' + i, 80, 80, root);
        n.setPosition(-110 + i * 110, 270);
        drawStar(n, i < stars ? C.gold : new Color(80, 68, 54));
    }
    txt(root, stars === 3 ? TXT.result.perfect : (stars > 0 ? TXT.result.pass : TXT.result.keepGoing), FS.small, C.textSub, 580, 32, 0, 200);

    // 奖励
    const box1 = nd('reward', 580, 260, root);
    box1.setPosition(0, 40);
    box(box1, 14, C.panel, C.goldDim, 2);
    txt(box1, TXT.result.reward, FS.small, C.gold, 200, 30, -220, 100);
    const lines: string[] = [];
    if (dungeon && !win) {
        lines.push(TXT.daily.failKeep);
    } else if (dungeon) {
        if (reward.silver) lines.push(`${TXT.home.silver} +${reward.silver}`);
        if (bonus.jade) lines.push(`${TXT.home.jade} +${bonus.jade}`);
        for (const it of reward.items) lines.push(`${getItemConf(it.id).name} ×${it.n}`);
        if (!lines.length) lines.push(TXT.daily.failKeep);
    } else {
        lines.push(`经验 +${reward.exp}`);
        lines.push(`银币 +${reward.silver}`);
        if (bonus.jade) lines.push(`将玉 +${bonus.jade}`);
        for (const it of reward.items) lines.push(`${getItemConf(it.id).name} ×${it.n}`);
        if (first) lines.push(TXT.result.firstBonus);
    }
    lines.forEach((l, i) => {
        txt(box1, l, FS.small, C.text, 560, 32, 0, 52 - i * 38);
    });

    // 剧情
    if (s && win) {
        const st = nd('story', 580, 90, root);
        st.setPosition(0, -160);
        box(st, 12, new Color(34, 26, 19, 230), C.panelLine, 2);
        txt(st, s.storyAfter || TXT.result.defaultStory, FS.small, C.textSub, 620, 56, 0, 0, undefined, true);
    }

    // 按钮。引导进行中只让「去养成」能把流程送走，其它钮先按住。
    const guided = guideActive() && Store.data.guideStep === 3;
    const btns: { t: string; fn: () => void; primary?: boolean; y?: number }[] = [];
    if (guided) {
        btns.push({ t: TXT.common.train, fn: () => doTrain(), primary: true, y: RESULT_TRAIN.y });
    }
    if (dungeon) {
        const again = () => Router.go('battle', { dungeon });
        if (canDungeon(Store.data, dungeon, Date.now())) {
            btns.push({ t: TXT.daily.challenge, fn: () => { if (guided) return; again(); }, primary: !guided });
        }
        btns.push({ t: TXT.common.back, fn: () => { if (guided) return; backDaily(); } });
    } else if (win) {
        const nextId = stageId + 1;
        const next = STAGE_CONF.find((x) => x.id === nextId);
        if (next) btns.push({ t: TXT.result.next, fn: () => { if (guided) return; Router.go('battle', { stageId: nextId }); }, primary: !guided });
        btns.push({ t: TXT.result.again, fn: () => { if (guided) return; Router.go('battle', { stageId }); } });
        btns.push({ t: TXT.result.backHome, fn: () => { if (guided) return; Router.reset('home'); } });
    } else {
        btns.push({ t: TXT.common.retry, fn: () => { if (guided) return; Router.go('battle', { stageId }); }, primary: !guided });
        if (!guided) btns.push({ t: TXT.common.train, fn: () => Router.reset('hero') });
        btns.push({ t: TXT.result.backHome, fn: () => { if (guided) return; Router.reset('home'); } });
    }

    let extra = guided ? 1 : 0;
    btns.forEach((b, i) => {
        const n = nd('rb' + i, 360, 84, root);
        const y = b.y !== undefined ? b.y : (-300 - extra * (guided ? 96 : 100));
        if (b.y === undefined) extra += 1;
        n.setPosition(0, y);
        box(n, 14, b.primary ? C.btnPrimary : C.btnGhost, b.primary ? C.gold : C.panelLine, 2);
        txt(n, b.t, FS.h1, b.primary ? C.text : C.textSub, 360, 44);
        n.on(Node.EventType.TOUCH_END, b.fn);
    });

    if (win && stars === 3 && !dungeon) Fx.toast(TXT.result.perfect);
    if (guided) maybeGuide(root, 'result');
    return root;
}

function backDaily (): void {
    Router.backTo('daily');
    if (Router.current !== 'daily') Router.reset('daily');
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

/** 招募（酒馆）：纯玩法货币「将玉」，无付费入口 */
import { Node, Color, Graphics } from 'cc';
import { nd, box, boxAdd, boxAddLine, txt, mask, fullBg } from '../core/Ui';
import { paintPixel } from '../core/Art';
import { C, FS, qualityColor, QUALITY_NAME, CAMP_NAME } from '../core/Theme';
import { Store, newHeroState } from '../core/Store';
import { Router } from '../core/Router';
import { Fx } from '../core/Fx';
import { topBar, resBar, bottomNav, heroCard, NavKey, hexColor } from './Common';
import { getHeroConf } from '../data/HeroConf';
import { ITEM_CONF } from '../data/ItemConf';
import { TXT } from '../data/TextConf';
import { showRewarded } from '../core/Ad';
import {
    RECRUIT_COST_ONE,
    RECRUIT_COST_TEN,
    formatRatePercent,
    qualityRates,
    rollPityHero,
    rollRecruitHero,
} from '../data/RecruitConf';

export function buildRecruitPanel (parent: Node): Node {
    const root = nd('Recruit', 720, 1280, parent);
    root.setPosition(0, 0);
    fullBg(root, C.bg);
    const res = resBar(root);
    topBar(root, TXT.recruit.title, () => Router.reset('home'));

    // 招贤台
    const stage = nd('stage', 580, 380, root);
    stage.setPosition(0, 300);
    box(stage, 16, C.panel, C.goldDim, 2);
    const g = stage.addComponent(Graphics)!;
    g.fillColor = new Color(60, 44, 30);
    g.moveTo(-220, -170); g.lineTo(-90, -60); g.lineTo(90, -60); g.lineTo(220, -170);
    g.lineTo(220, -190); g.lineTo(-220, -190); g.close(); g.fill();
    txt(stage, TXT.recruit.stage, FS.title, C.gold, 400, 50, 0, 100);
    txt(stage, TXT.recruit.slogan, FS.small, C.textSub, 500, 34, 0, 44);
    paintPixel(stage, 'flower', -150, 158, 36, 36, null);
    paintPixel(stage, 'jade', 0, 158, 36, 36, null);
    paintPixel(stage, 'scroll', 150, 158, 36, 36, null);
    // 品质概率由「在池武将 × 品质权重」现算，不手填百分比。
    const rated = qualityRates();
    const labels = formatRatePercent(rated.rates);
    rated.rates.forEach((p, i) => {
        // 4 枚芯片按「宽140 + 步长146」排：总跨度 578，边缘 ±289 落在安全区 ±290 内。
        const b = nd('p' + i, 140, 54, stage);
        b.setPosition(-219 + i * 146, -20);
        box(b, 10, qualityColor(p.quality), C.textDark, 2);
        txt(b, QUALITY_NAME[p.quality], FS.tiny, C.textDark, 130, 22, 0, 10);
        txt(b, labels[i], FS.tiny, C.textDark, 130, 22, 0, -12);
    });
    txt(stage, TXT.recruit.rateNote, FS.tiny, C.textWeak, 540, 28, 0, -62);
    txt(stage, TXT.recruit.tenTip, FS.small, C.green, 560, 34, 0, -100);
    const jadeL = txt(stage, '', FS.small, C.q3, 560, 34, 0, -140);
    const refreshJade = (): void => {
        jadeL.string = TXT.recruit.jadeLeft.replace('{n}', String(Store.data.jade));
    };
    refreshJade();

    // 按钮
    const one = nd('one', 320, 96, root);
    one.setPosition(0, 20);
    box(one, 16, C.btn, C.gold, 3);
    txt(one, TXT.recruit.onceLong, FS.h1, C.textDark, 320, 40, 0, 12);
    txt(one, `消耗将玉 ${RECRUIT_COST_ONE}`, FS.small, new Color(255, 230, 190), 320, 32, 0, -22);
    const refreshAll = (): void => { res.refresh(); refreshJade(); };
    one.on(Node.EventType.TOUCH_END, () => {
        if (Store.data.jade < RECRUIT_COST_ONE) { Fx.toast(TXT.toast.noJadeHint); return; }
        Store.addJade(-RECRUIT_COST_ONE);
        Store.data.recruited += 1;
        const ids = [rollRecruitHero()];
        const got = grant(ids);
        Store.save();
        refreshAll();
        showResult(root, ids, got, refreshAll);
    });

    const ten = nd('ten', 320, 96, root);
    ten.setPosition(0, -96);
    box(ten, 16, C.btnPrimary, C.gold, 3);
    txt(ten, TXT.recruit.tenLong, FS.h1, C.text, 320, 40, 0, 12);
    txt(ten, `消耗将玉 ${RECRUIT_COST_TEN}（省 100）`, FS.small, new Color(255, 230, 190), 320, 32, 0, -22);
    ten.on(Node.EventType.TOUCH_END, () => {
        if (Store.data.jade < RECRUIT_COST_TEN) { Fx.toast(TXT.toast.noJadeHint); return; }
        Store.addJade(-RECRUIT_COST_TEN);
        Store.data.recruited += 10;
        const ids: number[] = [];
        for (let i = 0; i < 10; i++) ids.push(rollRecruitHero());
        // 保底不计入上面的单次概率：十连若无紫及以上，末位改为紫或橙。
        if (!ids.some((id) => getHeroConf(id).quality >= 2)) ids[9] = rollPityHero();
        const got = grant(ids);
        Store.save();
        refreshAll();
        showResult(root, ids, got, refreshAll);
    });

    const extra = nd('extra', 320, 64, root);
    extra.setPosition(0, -200);
    box(extra, 12, C.panelLight, C.goldDim, 2);
    txt(extra, TXT.recruit.extra, FS.h2, C.text, 320, 32, 0, 10);
    txt(extra, TXT.recruit.extraSub, FS.tiny, C.textSub, 320, 24, 0, -16);
    extra.on(Node.EventType.TOUCH_END, () => {
        showRewarded(() => {
            const id = rollRecruitHero();
            if (!id) { Fx.toast(TXT.toast.comingSoon); return; }
            Store.data.recruited += 1;
            const got = grant([id]);
            Store.save();
            refreshAll();
            showResult(root, [id], got, refreshAll);
        }, 'extra_recruit');
    });

    txt(root, TXT.recruit.noPay, FS.tiny, C.textWeak, 580, 32, 0, -260);

    const pity = nd('pity', 580, 90, root);
    pity.setPosition(0, -380);
    box(pity, 12, new Color(34, 26, 19, 230), C.panelLine, 2);
    txt(pity, `累计招募 ${Store.data.recruited} 次`, FS.small, C.textSub, 400, 34, -110, 18);
    txt(pity, TXT.recruit.repeatLong, FS.tiny, C.textWeak, 620, 30, 0, -20);

    bottomNav(root, 'recruit', (k: NavKey) => Router.reset(k));
    return root;
}

/** 发放武将：已有转碎片，无碎片道具转银币 */
function grant (ids: number[]): string[] {
    const out: string[] = [];
    for (const id of ids) {
        const c = getHeroConf(id);
        if (!Store.has(id)) {
            Store.data.heroes[id] = newHeroState(id, 1);
            out.push(`新武将 ${c.name}`);
        } else {
            const frag = ITEM_CONF.find((i: any) => (i as any).heroId === id);
            if (frag) { Store.addItem(frag.id, 5); out.push(`${c.name} 碎片 ×5`); }
            else { Store.addSilver(500); out.push(`${c.name} → 银币 +500`); }
        }
    }
    return out;
}

function showResult (root: Node, ids: number[], got: string[], refresh: () => void): void {
    const m = mask(root, 200);
    m.setSiblingIndex(9000);
    const p = nd('result', 580, 720, m);
    p.setPosition(0, 60);
    box(p, 18, C.panel, C.gold, 3);
    txt(p, TXT.recruit.result, FS.title, C.gold, 400, 44, 0, 310);

    const xs = [-240, -120, 0, 120, 240];
    ids.forEach((id, i) => {
        const x = xs[i % 5];
        const y = 200 - Math.floor(i / 5) * 150;
        heroCard(p, { confId: id, x, y, w: 104, h: 138, showLevel: false, showStar: false, compact: true });
        txt(p, got[i] || '', 15, C.green, 140, 40, x, y - 80);
    });

    const b = nd('ok', 260, 76, p);
    b.setPosition(0, -290);
    box(b, 14, C.btn, C.gold, 2);
    txt(b, TXT.common.gotIt, FS.h2, C.text, 260, 44);
    b.on(Node.EventType.TOUCH_END, () => { m.destroy(); refresh(); });
}

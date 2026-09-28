/** 武将：列表 + 详情（升级 / 进阶 / 升星 / 一键装备） */
import { Node, Color } from 'cc';
import { nd, box, boxAdd, txt, fullBg } from '../core/Ui';
import { C, FS, qualityColor, campColor, QUALITY_NAME, CAMP_NAME, ROLE_NAME } from '../core/Theme';
import { Store } from '../core/Store';
import { Router } from '../core/Router';
import { Fx } from '../core/Fx';
import { topBar, resBar, bottomNav, heroCard, NavKey, starStr, hexColor } from './Common';
import { getHeroConf, HERO_CONF } from '../data/HeroConf';
import { getSkillConf } from '../data/SkillConf';
import { BOND_CONF } from '../data/BondConf';
import { ITEM_CONF, EquipSlot } from '../data/ItemConf';

const PER_PAGE = 20;

export function buildHeroPanel (parent: Node, param?: any): Node {
    if (param && param.confId) return buildDetail(parent, param.confId);
    return buildList(parent);
}

// ---------------- 列表 ----------------
function buildList (parent: Node): Node {
    const root = nd('HeroList', 720, 1280, parent);
    root.setPosition(0, 0);
    fullBg(root, C.bg);
    topBar(root, '武将', () => Router.reset('home'));
    resBar(root);

    let page = 0;
    const layer = nd('layer', 700, 620, root);
    layer.setPosition(0, 0);

    txt(root, `已拥有 ${Store.heroList().length} / 全图鉴 ${HERO_CONF.length}`, FS.small, C.textSub, 580, 32, 0, 462);

    const rebuild = () => {
        layer.destroyAllChildren();
        const all = Store.heroList();
        const total = Math.max(1, Math.ceil(all.length / PER_PAGE));
        if (page >= total) page = total - 1;
        if (page < 0) page = 0;
        const list = all.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
        const xs = [-165, -55, 55, 165];
        list.forEach((h, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const x = xs[col];
            const y = 372 - row * 136;
            heroCard(layer, {
                confId: h.confId, x, y, w: 96, h: 126, showLevel: true, showStar: true, compact: true,
                onClick: () => Router.go('hero', { confId: h.confId }),
            });
            if (Store.inLineup(h.confId)) {
                boxAdd(layer, x - 48, y + 63 - 22, 96, 22, 6, C.green);
                txt(layer, '上阵中', 15, C.textDark, 96, 22, x, y + 63 - 11);
            }
        });
        if (!list.length) txt(layer, '还没有武将，去招募吧', FS.body, C.textWeak, 580, 60, 0, 0);

        if (total > 1) {
            const pv = nd('prev', 130, 52, layer);
            pv.setPosition(-190, -300);
            box(pv, 10, C.btnGhost, C.panelLine, 2);
            txt(pv, '上一页', FS.small, C.textSub, 130, 40);
            pv.on(Node.EventType.TOUCH_END, () => { page--; rebuild(); });
            const nx = nd('next', 130, 52, layer);
            nx.setPosition(190, -300);
            box(nx, 10, C.btnGhost, C.panelLine, 2);
            txt(nx, '下一页', FS.small, C.textSub, 130, 40);
            nx.on(Node.EventType.TOUCH_END, () => { page++; rebuild(); });
            txt(layer, `${page + 1}/${total}`, FS.small, C.textSub, 160, 40, 0, -300);
        }
    };
    rebuild();

    bottomNav(root, 'hero', (k: NavKey) => Router.reset(k));
    return root;
}

// ---------------- 详情 ----------------
function buildDetail (parent: Node, confId: number): Node {
    const root = nd('HeroDetail', 720, 1280, parent);
    root.setPosition(0, 0);
    fullBg(root, C.bg);
    const res = resBar(root);
    const c = getHeroConf(confId);
    // 返回上一界面：有上一层就 back()（销毁本层），只有本层时才 reset。
    // 用 Router.go('hero') 兜底会让每次返回都往栈里再压一个 HeroList。
    topBar(root, c.name, () => { if (Router.depth > 1) Router.back(); else Router.reset('hero'); });

    const refreshAll: (() => void)[] = [];

    // 大卡
    const big = nd('big', 580, 220, root);
    big.setPosition(0, 396);
    box(big, 14, C.panel, qualityColor(c.quality), 3);
    heroCard(big, { confId, x: -212, y: 0, w: 150, h: 190, showLevel: false, showStar: false });
    const st = Store.data.heroes[confId];
    txt(big, c.name, FS.title, C.text, 200, 40, -70, 66);
    txt(big, `${QUALITY_NAME[c.quality]} · ${CAMP_NAME[c.camp]} · ${ROLE_NAME[c.role]}`, FS.small, C.textSub, 380, 30, 55, 34);
    const starL = txt(big, starStr(st ? st.star : c.star), FS.h2, C.gold, 200, 30, -100, 4);
    const lvL = txt(big, '', FS.h2, C.text, 200, 30, 60, 4);
    const advL = txt(big, '', FS.small, C.cyan, 320, 28, 20, -34);
    const pwL = txt(big, '', FS.h2, C.gold, 380, 32, 120, -70);

    // 属性
    const attr = nd('attr', 580, 150, root);
    attr.setPosition(0, 200);
    box(attr, 12, new Color(34, 26, 19, 230), C.panelLine, 2);
    const rows: { k: string; get: () => number }[] = [
        { k: '生命', get: () => Store.attrOf(confId).hp },
        { k: '攻击', get: () => Store.attrOf(confId).atk },
        { k: '物防', get: () => Store.attrOf(confId).pdef },
        { k: '法防', get: () => Store.attrOf(confId).mdef },
        { k: '速度', get: () => Store.attrOf(confId).speed },
    ];
    const valLabels: any[] = [];
    rows.forEach((r, i) => {
        // 三列中心 -193 / 0 / 193，列内「名左值右」；边缘 ±285 落在安全区 ±290 内。
        // 原写法 x+100 是错的：第三列值标签中心会跑到 design x=340，整块出屏。
        const cx = -193 + (i % 3) * 193;
        const cy = 40 - Math.floor(i / 3) * 62;
        txt(attr, r.k, FS.small, C.textSub, 88, 34, cx - 50, cy);
        const v = txt(attr, '', FS.h2, C.text, 92, 34, cx + 46, cy);
        valLabels.push(v);
    });

    // 养成按钮
    const expItem = ITEM_CONF.find((i) => i.type === 'exp');
    const acts: { t: string; sub: string; fn: () => void }[] = [
        {
            t: '升级', sub: expItem ? `消耗 ${expItem.name}` : '消耗经验丹',
            fn: () => {
                if (!expItem) { Fx.toast('暂无经验道具'); return; }
                if (Store.itemCount(expItem.id) <= 0) { Fx.toast('经验道具不足'); return; }
                if (!st) return;
                if (st.level >= Store.data.level) { Fx.toast('不可超过主公等级'); return; }
                Store.addItem(expItem.id, -1);
                const lv = Store.levelUp(confId, expItem.expValue || 100);
                Store.save();
                Fx.toast(`升级成功 → Lv.${lv}`);
                refresh();
            },
        },
        {
            t: '进阶', sub: '进阶丹+银币',
            fn: () => {
                const r = Store.canAdvance(confId);
                if (!r.ok) { Fx.toast(r.reason); return; }
                Store.advance(confId);
                Store.save();
                Fx.toast(`进阶成功 → +${Store.data.heroes[confId].adv}`);
                refresh();
            },
        },
        {
            t: '升星', sub: '消耗武将碎片',
            fn: () => {
                const r = Store.canStarUp(confId);
                if (!r.ok) { Fx.toast(r.reason); return; }
                Store.starUp(confId);
                Store.save();
                Fx.toast(`升星成功 → ${starStr(Store.data.heroes[confId].star)}`);
                refresh();
            },
        },
        {
            t: '一键装备', sub: '自动穿最优',
            fn: () => {
                if (!st) return;
                const slots: EquipSlot[] = ['weapon', 'armor', 'helmet', 'necklace', 'treasure'];
                let n = 0;
                for (const sl of slots) {
                    const best = ITEM_CONF.filter((i) => i.type === 'equip' && i.slot === sl && Store.itemCount(i.id) > 0)
                        .sort((a, b) => ((b.atk || 0) + (b.hp || 0) + (b.pdef || 0) + (b.mdef || 0)) - ((a.atk || 0) + (a.hp || 0) + (a.pdef || 0) + (a.mdef || 0)))[0];
                    if (best) { Store.equip(confId, sl, best.id); n++; }
                }
                Store.save();
                Fx.toast(n ? `已装备 ${n} 件` : '背包中暂无可用装备');
                refresh();
            },
        },
    ];
    acts.forEach((a, i) => {
        // 284 宽 + 中心 ±148 → 边缘 ±290，正好压在安全区线上（原 320/±166 会到 ±326）
        const b = nd('act' + i, 284, 76, root);
        b.setPosition(i % 2 === 0 ? -148 : 148, 76 - Math.floor(i / 2) * 92);
        box(b, 12, C.btnGhost, C.goldDim, 2);
        txt(b, a.t, FS.h2, C.text, 156, 34, -58, 8);
        txt(b, a.sub, FS.tiny, C.textSub, 128, 26, 56, -14);
        b.on(Node.EventType.TOUCH_END, a.fn);
    });

    // 技能
    const sk = nd('skill', 580, 150, root);
    sk.setPosition(0, -160);
    box(sk, 12, new Color(34, 26, 19, 230), C.panelLine, 2);
    const rage = getSkillConf(c.skillId);
    txt(sk, '怒气技', FS.small, C.gold, 160, 28, -240, 50);
    txt(sk, rage ? `${rage.name}：${rage.desc}` : '—', FS.small, C.text, 500, 34, 60, 50);
    const tal = getSkillConf(c.talentId);
    txt(sk, '天赋', FS.small, C.gold, 160, 28, -240, 6);
    txt(sk, tal ? `${tal.name}：${tal.desc}（进阶+6 解锁）` : '—', FS.small, C.textSub, 500, 34, 60, 6);
    txt(sk, c.desc, FS.tiny, C.textWeak, 620, 40, 0, -42);

    // 羁绊
    const bd = nd('bond', 580, 150, root);
    bd.setPosition(0, -340);
    box(bd, 12, new Color(34, 26, 19, 230), C.panelLine, 2);
    txt(bd, '相关羁绊', FS.small, C.gold, 200, 28, -222, 50);
    const mine = BOND_CONF.filter((b) => b.heroIds.indexOf(confId) >= 0);
    if (!mine.length) txt(bd, '暂无关联羁绊', FS.tiny, C.textWeak, 620, 30, 0, 10);
    mine.forEach((b, i) => {
        const on = Store.activeBonds().indexOf(b) >= 0;
        const names = b.heroIds.map((h) => getHeroConf(h).name).join('+');
        txt(bd, `${b.name}（${names}）`, FS.tiny, on ? C.green : C.textSub, 380, 28, -110, 20 - i * 30);
        txt(bd, on ? '已激活' : '未激活', FS.tiny, on ? C.green : C.textWeak, 120, 28, 250, 20 - i * 30);
    });

    const refresh = () => {
        if (!st) return;
        lvL.string = `Lv.${st.level}`;
        // 只显示进阶数：战力在下一行 pwL 已经显示，此处重复会让同一数字出现两遍
        advL.string = `进阶 +${st.adv}`;
        pwL.string = `战力 ${Store.powerOf(confId)}`;
        starL.string = starStr(st.star);
        rows.forEach((r, i) => { valLabels[i].string = String(r.get()); });
        res.refresh();
    };
    refresh();
    refreshAll.push(refresh);

    bottomNav(root, 'hero', (k: NavKey) => Router.reset(k));
    return root;
}


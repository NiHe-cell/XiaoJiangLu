/** 阵容界面：上阵 6 人（主角不可下阵），点卡上/下阵 */
import { Node, Color } from 'cc';
import { nd, box, boxAdd, boxAddLine, lineAdd, txt, fullBg } from '../core/Ui';
import { C, FS, campColor, CAMP_NAME } from '../core/Theme';
import { Store } from '../core/Store';
import { Router } from '../core/Router';
import { Fx } from '../core/Fx';
import { topBar, resBar, bottomNav, heroCard, NavKey, starStr } from './Common';
import { getHeroConf } from '../data/HeroConf';
import { BOND_CONF } from '../data/BondConf';

const PAGE_SIZE = 12;

export function buildLineupPanel (parent: Node): Node {
    const root = nd('Lineup', 720, 1280, parent);
    root.setPosition(0, 0);
    fullBg(root, C.bg);
    topBar(root, '阵容', () => Router.back());
    resBar(root);

    let page = 0;

    // ---- 上阵区 ----
    txt(root, '上阵武将（点击下阵）', FS.small, C.textSub, 660, 34, 0, 470);
    const slotXs = [-110, 0, 110];
    const slotYs = [392, 250];
    const lineupLayer = nd('lineupLayer', 700, 300, root);
    lineupLayer.setPosition(0, 0);

    const rebuild = () => {
        lineupLayer.destroyAllChildren();
        for (let i = 0; i < 6; i++) {
            const x = slotXs[i % 3];
            const y = slotYs[Math.floor(i / 3)];
            const id = Store.data.lineup[i];
            if (id !== undefined && id > 0) {
                const isMain = i === 0;
                heroCard(lineupLayer, {
                    confId: id, x, y, w: 104, h: 138, showLevel: true, showStar: true,
                    onClick: () => {
                        if (isMain) { Fx.toast('主公不可下阵'); return; }
                        const arr = Store.data.lineup.slice();
                        arr.splice(i, 1);
                        Store.setLineup(arr);
                        Fx.toast(`${getHeroConf(id).name} 已下阵`);
                        rebuild();
                        refreshBonds();
                        pwVal.string = String(Store.totalPower());
                    },
                });
                if (isMain) {
                    const tag = nd('mainTag', 104, 138, lineupLayer);
                    tag.setPosition(x, y);
                    boxAddLine(tag, -52, -69, 104, 138, 12, C.gold, 3);
                    txt(tag, '主公', 15, C.gold, 60, 22, 0, 69 - 12);
                }
            } else {
                const s = nd('slot', 104, 138, lineupLayer);
                s.setPosition(x, y);
                box(s, 12, new Color(40, 31, 23, 220), C.panelLine, 2);
                boxAddLine(s, -32, -32, 64, 64, 8, C.panelLine, 3);
                lineAdd(s, -16, 0, 16, 0, C.panelLine, 4);
                lineAdd(s, 0, -16, 0, 16, C.panelLine, 4);
                txt(s, '空位', 16, C.textWeak, 100, 24, 0, 0);
            }
        }
    };

    // ---- 战力 ----
    const pwBar = nd('pw', 660, 56, root);
    pwBar.setPosition(0, 138);
    box(pwBar, 12, C.panel, C.goldDim, 2);
    txt(pwBar, '阵容战力', FS.small, C.textSub, 160, 40, -240, 0);
    const pwVal = txt(pwBar, String(Store.totalPower()), FS.h1, C.gold, 200, 40, -60, 0);
    const cb = Store.campBonus();
    txt(pwBar, cb.camp ? `${CAMP_NAME[cb.camp]}阵营光环 +${Math.round(cb.atkPct * 100)}% 攻/+${Math.round(cb.hpPct * 100)}% 血` : '同阵营 2 人起激活光环',
        FS.small, cb.camp ? C.green : C.textWeak, 460, 40, 150, 0);

    // ---- 未上阵 ----
    txt(root, '未上阵武将（点击上阵）', FS.small, C.textSub, 660, 34, 0, 84);
    const poolLayer = nd('pool', 700, 420, root);
    poolLayer.setPosition(0, 0);

    const rebuildPool = () => {
        poolLayer.destroyAllChildren();
        const all = Store.heroList().filter((h) => !Store.inLineup(h.confId));
        const total = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
        if (page >= total) page = total - 1;
        if (page < 0) page = 0;
        const list = all.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
        const pxs = [-165, -55, 55, 165];
        const pys = [4, -136];
        list.forEach((h, i) => {
            const x = pxs[i % 4];
            const y = pys[Math.floor(i / 4)];
            heroCard(poolLayer, {
                confId: h.confId, x, y, w: 96, h: 126, showLevel: true, showStar: true, compact: true,
                onClick: () => {
                    if (Store.data.lineup.length >= 6) { Fx.toast('上阵已满 6 人'); return; }
                    const arr = Store.data.lineup.slice();
                    arr.push(h.confId);
                    Store.setLineup(arr);
                    Fx.toast(`${getHeroConf(h.confId).name} 已上阵`);
                    rebuild();
                    rebuildPool();
                    refreshBonds();
                    pwVal.string = String(Store.totalPower());
                },
            });
        });
        if (!list.length) txt(poolLayer, '暂无可上阵武将，去招募更多吧', FS.body, C.textWeak, 660, 60, 0, -60);

        // 翻页
        if (total > 1) {
            const pv = nd('prev', 130, 52, poolLayer);
            pv.setPosition(-190, -230);
            box(pv, 10, C.btnGhost, C.panelLine, 2);
            txt(pv, '上一页', FS.small, C.textSub, 130, 40);
            pv.on(Node.EventType.TOUCH_END, () => { page--; rebuildPool(); });
            const nx = nd('next', 130, 52, poolLayer);
            nx.setPosition(190, -230);
            box(nx, 10, C.btnGhost, C.panelLine, 2);
            txt(nx, '下一页', FS.small, C.textSub, 130, 40);
            nx.on(Node.EventType.TOUCH_END, () => { page++; rebuildPool(); });
            txt(poolLayer, `${page + 1}/${total}`, FS.small, C.textSub, 160, 40, 0, -230);
        }
    };

    // ---- 羁绊 ----
    const bondLayer = nd('bond', 660, 96, root);
    bondLayer.setPosition(0, -380);
    const refreshBonds = () => {
        bondLayer.destroyAllChildren();
        box(bondLayer, 12, new Color(34, 26, 19, 230), C.panelLine, 2);
        txt(bondLayer, '已激活羁绊', FS.small, C.gold, 200, 30, -222, 28);
        const act = Store.activeBonds();
        if (!act.length) {
            txt(bondLayer, '将有关联的武将同时上阵即可激活（如桃园结义：刘备+关羽+张飞）', FS.tiny, C.textWeak, 620, 30, 0, -12);
        } else {
            const names = act.map((b) => b.name).join(' · ');
            txt(bondLayer, names, FS.small, C.green, 620, 30, 0, -12);
            const all = BOND_CONF.length;
            txt(bondLayer, `${act.length}/${all}`, FS.tiny, C.textSub, 120, 26, 250, 28);
        }
    };

    rebuild();
    rebuildPool();
    refreshBonds();

    bottomNav(root, 'lineup', (k: NavKey) => {
        if (k === 'lineup') return;
        Router.reset(k === 'home' ? 'home' : k);
    });

    return root;
}

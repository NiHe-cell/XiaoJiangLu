/** 背包：道具列表 + 使用 */
import { Node, Color } from 'cc';
import { nd, box, boxAdd, txt, mask, fullBg } from '../core/Ui';
import { C, FS, qualityColor, QUALITY_NAME } from '../core/Theme';
import { Store } from '../core/Store';
import { Router } from '../core/Router';
import { Fx } from '../core/Fx';
import { topBar, resBar, bottomNav, heroCard, NavKey } from './Common';
import { ITEM_CONF, getItemConf } from '../data/ItemConf';
import { getHeroConf } from '../data/HeroConf';

export function buildBagPanel (parent: Node): Node {
    const root = nd('Bag', 720, 1280, parent);
    root.setPosition(0, 0);
    fullBg(root, C.bg);
    const res = resBar(root);
    topBar(root, '背包', () => Router.reset('home'));

    let page = 0;
    const layer = nd('layer', 700, 700, root);
    layer.setPosition(0, 0);
    const PER = 16;

    const rebuild = () => {
        layer.destroyAllChildren();
        const owned = ITEM_CONF.filter((i) => Store.itemCount(i.id) > 0);
        const total = Math.max(1, Math.ceil(owned.length / PER));
        if (page >= total) page = total - 1;
        if (page < 0) page = 0;
        const list = owned.slice(page * PER, page * PER + PER);
        const xs = [-165, -55, 55, 165];
        list.forEach((it, i) => {
            const x = xs[i % 4];
            const y = 400 - Math.floor(i / 4) * 118;
            const card = nd('it' + it.id, 96, 108, layer);
            card.setPosition(x, y);
            box(card, 10, C.panel, qualityColor(it.quality), 2);
            boxAdd(card, -38, -8, 76, 62, 8, qualityColor(it.quality));
            txt(card, it.name, 15, C.text, 92, 26, 0, 34);
            txt(card, `×${Store.itemCount(it.id)}`, 15, C.gold, 92, 24, 0, -36);
            card.on(Node.EventType.TOUCH_END, () => showItem(root, it.id, () => { rebuild(); res.refresh(); }));
        });
        if (!list.length) txt(layer, '背包空空如也，去推图或商城看看吧', FS.body, C.textWeak, 580, 60, 0, 200);

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

    bottomNav(root, 'bag', (k: NavKey) => Router.reset(k));
    return root;
}

function showItem (root: Node, itemId: number, onChange: () => void): void {
    const it = getItemConf(itemId);
    const m = mask(root, 200);
    m.setSiblingIndex(9000);
    const panel = nd('itemPop', 600, 460, m);
    panel.setPosition(0, 40);
    box(panel, 16, C.panel, C.gold, 3);
    txt(panel, it.name, FS.title, qualityColor(it.quality), 520, 44, 0, 170);
    txt(panel, it.desc, FS.small, C.textSub, 520, 60, 0, 108);
    txt(panel, `拥有 ${Store.itemCount(itemId)}`, FS.small, C.gold, 520, 34, 0, 56);

    if (it.type === 'exp') {
        txt(panel, '选择要培养的武将', FS.small, C.textSub, 520, 30, 0, 10);
        const line = Store.data.lineup;
        line.forEach((id, i) => {
            const c = nd('pick' + i, 92, 116, panel);
            c.setPosition(-220 + i * 88, -80);
            heroCard(c, { confId: id, x: 0, y: 0, w: 88, h: 116, showLevel: true, showStar: false, compact: true });
            c.on(Node.EventType.TOUCH_END, () => {
                const st = Store.data.heroes[id];
                if (!st) return;
                if (st.level >= Store.data.level) { Fx.toast('不可超过主公等级'); return; }
                Store.addItem(itemId, -1);
                const lv = Store.levelUp(id, it.expValue || 100);
                Store.save();
                Fx.toast(`${getHeroConf(id).name} → Lv.${lv}`);
                m.destroy();
                onChange();
            });
        });
    } else if (it.type === 'consumable') {
        const b = nd('use', 240, 68, panel);
        b.setPosition(0, -60);
        box(b, 12, C.btn, C.gold, 2);
        txt(b, '使用', FS.h2, C.textDark, 240, 44);
        b.on(Node.EventType.TOUCH_END, () => {
            if (it.name.indexOf('体力') >= 0) {
                Store.addItem(itemId, -1);
                Store.addStamina(30);
                Store.save();
                Fx.toast('体力 +30');
            } else {
                Fx.toast('该道具暂不可直接使用');
            }
            m.destroy();
            onChange();
        });
    } else {
        txt(panel, '材料类道具在武将养成时自动消耗', FS.small, C.textWeak, 520, 34, 0, -20);
    }

    const close = nd('close', 200, 64, panel);
    close.setPosition(0, -180);
    box(close, 12, C.btnGhost, C.panelLine, 2);
    txt(close, '关闭', FS.h2, C.textSub, 200, 44);
    close.on(Node.EventType.TOUCH_END, () => m.destroy());
}

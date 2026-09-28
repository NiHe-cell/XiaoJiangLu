/** 商城：银币/将玉货架，限量 + 刷新（无付费入口） */
import { Node, Color } from 'cc';
import { nd, box, boxAdd, txt, fullBg } from '../core/Ui';
import { C, FS, qualityColor, QUALITY_NAME } from '../core/Theme';
import { Store } from '../core/Store';
import { Router } from '../core/Router';
import { Fx } from '../core/Fx';
import { topBar, resBar, bottomNav, NavKey } from './Common';
import { ITEM_CONF } from '../data/ItemConf';
import { TXT } from '../data/TextConf';

const SLOTS = 6;
const REFRESH_COST = 50;

interface Shelf { itemId: number; stock: number; max: number; currency: 'silver' | 'jade'; price: number; }

function makeShelf (): Shelf[] {
    const pool = ITEM_CONF.filter((i) => i.silverPrice || i.jadePrice);
    const out: Shelf[] = [];
    for (let i = 0; i < SLOTS && pool.length; i++) {
        const it = pool[Math.floor(Math.random() * pool.length)];
        const max = 1 + Math.floor(Math.random() * 4);
        const currency = it.jadePrice ? 'jade' : 'silver';
        out.push({ itemId: it.id, stock: max, max, currency, price: currency === 'jade' ? (it.jadePrice || 50) : (it.silverPrice || 500) });
    }
    return out;
}

export function buildShopPanel (parent: Node): Node {
    const root = nd('Shop', 720, 1280, parent);
    root.setPosition(0, 0);
    fullBg(root, C.bg);
    const res = resBar(root);
    topBar(root, TXT.shop.title, () => Router.reset('home'));

    let shelf = makeShelf();
    const layer = nd('layer', 700, 520, root);
    layer.setPosition(0, 0);

    txt(root, TXT.shop.shelfTip, FS.tiny, C.textWeak, 580, 30, 0, 462);

    const rebuild = () => {
        layer.destroyAllChildren();
        const xs = [-166, 0, 166];
        const ys = [340, 190];
        shelf.forEach((s, i) => {
            const it = ITEM_CONF.find((x) => x.id === s.itemId)!;
            const x = xs[i % 3];
            const y = ys[Math.floor(i / 3)];
            const card = nd('sl' + i, 210, 130, layer);
            card.setPosition(x, y);
            box(card, 12, C.panel, qualityColor(it.quality), 2);
            boxAdd(card, -80, 8, 160, 54, 8, qualityColor(it.quality));
            txt(card, it.name, 17, C.text, 200, 28, 0, 34);
            txt(card, `${s.currency === 'jade' ? TXT.home.jade : TXT.home.silver} ${s.price}`, FS.small, s.currency === 'jade' ? C.q3 : C.gold, 200, 28, 0, -18);
            txt(card, `库存 ${s.stock}/${s.max}`, 15, s.stock > 0 ? C.textSub : C.textWeak, 200, 24, 0, -50);
            if (s.stock <= 0) {
                boxAdd(card, -80, -60, 160, 130, 12, new Color(0, 0, 0, 150));
                txt(card, TXT.shop.soldOut, FS.small, C.textWeak, 200, 30, 0, 0);
            }
            card.on(Node.EventType.TOUCH_END, () => {
                if (s.stock <= 0) { Fx.toast(TXT.shop.soldOutTip); return; }
                if (s.currency === 'silver' && Store.data.silver < s.price) { Fx.toast(TXT.toast.noSilver); return; }
                if (s.currency === 'jade' && Store.data.jade < s.price) { Fx.toast(TXT.toast.noJade); return; }
                if (s.currency === 'silver') Store.addSilver(-s.price); else Store.addJade(-s.price);
                Store.addItem(s.itemId, 1);
                s.stock -= 1;
                Store.save();
                res.refresh();
                Fx.toast(`购入 ${it.name} ×1`);
                rebuild();
            });
        });
    };
    rebuild();

    const rf = nd('refresh', 300, 72, root);
    rf.setPosition(0, -30);
    box(rf, 12, C.btnGhost, C.goldDim, 2);
    txt(rf, `刷新货架（将玉 ${REFRESH_COST}）`, FS.small, C.textSub, 300, 40);
    rf.on(Node.EventType.TOUCH_END, () => {
        if (Store.data.jade < REFRESH_COST) { Fx.toast(TXT.toast.noJade); return; }
        Store.addJade(-REFRESH_COST);
        shelf = makeShelf();
        Store.save();
        res.refresh();
        rebuild();
        Fx.toast(TXT.toast.refreshOk);
    });

    const tip = nd('tip', 580, 120, root);
    tip.setPosition(0, -200);
    box(tip, 12, new Color(34, 26, 19, 230), C.panelLine, 2);
    txt(tip, TXT.shop.noPayTitle, FS.small, C.gold, 200, 30, -222, 34);
    txt(tip, TXT.shop.noPayBody,
        FS.tiny, C.textSub, 620, 56, 0, -14);

    bottomNav(root, 'home', (k: NavKey) => Router.reset(k));
    return root;
}

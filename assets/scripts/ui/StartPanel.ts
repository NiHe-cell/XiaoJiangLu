/** 开始页：游戏名、12+、健康游戏忠告。进入游戏前先看到这三样。 */
import { Node } from 'cc';
import { box, fullBg, nd, txt } from '../core/Ui';
import { C, FS } from '../core/Theme';
import { Router } from '../core/Router';
import { TXT } from '../data/TextConf';
import { ageBadge, ageHint, healthBlock } from './AgeMark';

export function buildStartPanel (parent: Node): Node {
    const root = nd('Start', 720, 1280, parent);
    root.setPosition(0, 0);
    fullBg(root, C.bg);

    txt(root, TXT.appName, FS.title, C.gold, 560, 56, 0, 430);
    ageHint(root, 0, 330, 560);
    healthBlock(root, 0, 240, 560);
    ageBadge(root, 200, 36);

    const enter = nd('enter', 360, 88, root);
    enter.setPosition(0, -140);
    box(enter, 16, C.btnPrimary, C.gold, 3);
    txt(enter, TXT.tapStart, FS.h1, C.text, 360, 88);
    enter.on(Node.EventType.TOUCH_END, () => Router.reset('home'));

    const settings = nd('settings', 220, 64, root);
    settings.setPosition(0, -250);
    box(settings, 12, C.btnGhost, C.panelLine, 2);
    txt(settings, TXT.settings.title, FS.h2, C.textSub, 220, 64);
    settings.on(Node.EventType.TOUCH_END, () => Router.go('settings'));

    return root;
}

/** 隐私授权弹窗。同意与拒绝都来自点击，不默认勾选。 */
import { Node } from 'cc';
import { box, mask, nd, txt } from '../core/Ui';
import { C, FS } from '../core/Theme';
import { Fx } from '../core/Fx';
import { setPrivacyPresenter, PrivacyPrompt, viewPrivacyContract } from '../core/Privacy';
import { TXT } from '../data/TextConf';

export function installPrivacyDialog (): void {
    setPrivacyPresenter((prompt) => {
        const host = Fx.overlay();
        if (!host) {
            prompt.onDisagree();
            return;
        }
        showPrivacyDialog(host, prompt);
    });
}

function showPrivacyDialog (host: Node, prompt: PrivacyPrompt): void {
    const curtain = mask(host, 180);
    curtain.setSiblingIndex(9800);
    const panel = nd('privacy', 560, 620, curtain);
    panel.setPosition(0, 20);
    box(panel, 16, C.panel, C.gold, 3);
    txt(panel, TXT.privacy.title, FS.h1, C.gold, 500, 48, 0, 260);
    txt(panel, prompt.contractName || TXT.privacy.contract, FS.small, C.textSub, 500, 36, 0, 210);
    txt(panel, TXT.privacy.body, FS.small, C.text, 500, 180, 0, 100, undefined, true);
    txt(panel, TXT.privacy.denyHint, FS.tiny, C.textWeak, 500, 64, 0, -10, undefined, true);

    const link = nd('contract', 420, 56, panel);
    link.setPosition(0, -80);
    box(link, 10, C.btnGhost, C.panelLine, 2);
    txt(link, TXT.privacy.view, FS.small, C.textLink, 420, 56);
    link.on(Node.EventType.TOUCH_END, () => {
        viewPrivacyContract((ok) => {
            if (!ok) Fx.toast(TXT.privacy.contractMiss);
        });
    });

    const agree = nd('agree', 220, 72, panel);
    agree.setPosition(-130, -180);
    box(agree, 12, C.btn, C.gold, 2);
    txt(agree, TXT.privacy.agree, FS.h2, C.textDark, 220, 72);
    agree.on(Node.EventType.TOUCH_END, () => {
        curtain.destroy();
        prompt.onAgree();
    });

    const deny = nd('deny', 220, 72, panel);
    deny.setPosition(130, -180);
    box(deny, 12, C.btnGhost, C.panelLine, 2);
    txt(deny, TXT.privacy.deny, FS.small, C.textSub, 220, 72);
    deny.on(Node.EventType.TOUCH_END, () => {
        curtain.destroy();
        prompt.onDisagree();
    });

    prompt.onShown();
}

/** 设置：适龄与健康忠告、意见反馈、隐私政策、用户协议、清档。 */
import { HorizontalTextAlignment, Node } from 'cc';
import { box, fullBg, mask, nd, txt } from '../core/Ui';
import { C, FS } from '../core/Theme';
import { Router } from '../core/Router';
import { Fx } from '../core/Fx';
import { Store } from '../core/Store';
import { ensurePrivacy, viewPrivacyContract } from '../core/Privacy';
import { setClipboardData } from '../core/WxApi';
import { topBar } from './Common';
import { ageBadge, ageHint, healthBlock } from './AgeMark';
import { TXT } from '../data/TextConf';
import { MINOR_TIP } from '../data/ComplianceConf';
import { AGREEMENT_PAGES, PRIVACY_SUMMARY, contactEmail, contactStatusLines } from '../data/LegalConf';

export function buildSettingsPanel (parent: Node): Node {
    const root = nd('Settings', 720, 1280, parent);
    root.setPosition(0, 0);
    fullBg(root, C.bg);
    topBar(root, TXT.settings.title, () => {
        if (Router.depth > 1) Router.back();
        else Router.reset('start');
    });

    ageBadge(root, -220, 470);
    txt(root, TXT.appName, FS.h2, C.gold, 360, 40, 40, 492);
    ageHint(root, 40, 440, 400);
    healthBlock(root, 0, 340, 560);

    const minor = nd('minor', 560, 120, root);
    minor.setPosition(0, 70);
    box(minor, 12, C.panel, C.panelLine, 2);
    txt(minor, MINOR_TIP, FS.tiny, C.textSub, 520, 100, 0, 0, HorizontalTextAlignment.CENTER, true);

    const buttons: { text: string; onClick: () => void }[] = [
        { text: TXT.settings.privacy, onClick: () => openPrivacy(root) },
        { text: TXT.settings.agreement, onClick: () => showPages(root, TXT.settings.agreement, AGREEMENT_PAGES) },
        { text: TXT.settings.feedback, onClick: () => showFeedback(root) },
        { text: TXT.settings.clear, onClick: () => confirmClear() },
    ];
    for (let i = 0; i < buttons.length; i++) {
        const item = buttons[i];
        const button = nd('set' + i, 420, 64, root);
        button.setPosition(0, -70 - i * 78);
        box(button, 12, i === 3 ? C.btnGhost : C.panelLight, C.goldDim, 2);
        txt(button, item.text, FS.h2, i === 3 ? C.textSub : C.text, 420, 64);
        button.on(Node.EventType.TOUCH_END, item.onClick);
    }

    return root;
}

function openPrivacy (root: Node): void {
    viewPrivacyContract((ok) => {
        if (ok) Fx.toast(TXT.settings.opened);
        else showPages(root, TXT.settings.privacy, PRIVACY_SUMMARY);
    });
}

function confirmClear (): void {
    Fx.confirm(TXT.settings.clearAsk, () => {
        Store.reset();
        Fx.toast(TXT.toast.saveCleared);
        Router.reset('start');
    }, TXT.settings.clear, TXT.common.cancel);
}

function showFeedback (root: Node): void {
    const lines = contactStatusLines();
    const email = contactEmail();
    const curtain = mask(root, 180);
    curtain.setSiblingIndex(9000);
    const panel = nd('feedback', 560, 640, curtain);
    panel.setPosition(0, 20);
    box(panel, 16, C.panel, C.gold, 3);
    txt(panel, TXT.settings.feedback, FS.h1, C.gold, 500, 48, 0, 270);
    for (let i = 0; i < lines.length; i++) {
        txt(panel, lines[i], FS.small, C.text, 500, 36, 0, 190 - i * 40, HorizontalTextAlignment.CENTER, true);
    }
    txt(panel, email ? TXT.settings.copyHint : TXT.settings.emailEmpty, FS.tiny, C.textWeak, 500, 56, 0, -40, undefined, true);

    const copy = nd('copy', 220, 64, panel);
    copy.setPosition(-120, -140);
    box(copy, 12, email ? C.btn : C.btnDisable, C.goldDim, 2);
    txt(copy, email ? TXT.settings.copy : TXT.settings.pending, FS.small, email ? C.textDark : C.textWeak, 220, 64);
    if (email) {
        copy.on(Node.EventType.TOUCH_END, () => {
            ensurePrivacy((ok) => {
                if (!ok) { Fx.toast(TXT.settings.copyDenied); return; }
                setClipboardData(email, (copied) => {
                    Fx.toast(copied ? TXT.toast.copyOk : TXT.settings.copyFail);
                });
            });
        });
    }

    const close = nd('close', 220, 64, panel);
    close.setPosition(120, -140);
    box(close, 12, C.btnGhost, C.panelLine, 2);
    txt(close, TXT.common.close, FS.h2, C.textSub, 220, 64);
    close.on(Node.EventType.TOUCH_END, () => curtain.destroy());
}

function showPages (root: Node, title: string, pages: string[]): void {
    const curtain = mask(root, 180);
    curtain.setSiblingIndex(9000);
    const panel = nd('pages', 560, 720, curtain);
    panel.setPosition(0, 10);
    box(panel, 16, C.panel, C.gold, 3);
    txt(panel, title, FS.h1, C.gold, 500, 48, 0, 310);
    const body = txt(panel, '', FS.small, C.text, 500, 420, 0, 60, HorizontalTextAlignment.CENTER, true);
    body.lineHeight = 30;
    let index = 0;
    const pageLabel = txt(panel, '', FS.tiny, C.textWeak, 200, 28, 0, -180);
    const render = (): void => {
        body.string = pages[index] || '';
        pageLabel.string = (index + 1) + '/' + pages.length;
    };
    render();

    const prev = nd('prev', 160, 60, panel);
    prev.setPosition(-170, -250);
    box(prev, 10, C.btnGhost, C.panelLine, 2);
    txt(prev, TXT.common.pagePrev, FS.small, C.textSub, 160, 60);
    prev.on(Node.EventType.TOUCH_END, () => {
        if (index <= 0) { Fx.toast(TXT.settings.firstPage); return; }
        index -= 1;
        render();
    });

    const next = nd('next', 160, 60, panel);
    next.setPosition(0, -250);
    box(next, 10, C.btnGhost, C.panelLine, 2);
    txt(next, TXT.common.pageNext, FS.small, C.textSub, 160, 60);
    next.on(Node.EventType.TOUCH_END, () => {
        if (index >= pages.length - 1) { Fx.toast(TXT.settings.lastPage); return; }
        index += 1;
        render();
    });

    const close = nd('close', 160, 60, panel);
    close.setPosition(170, -250);
    box(close, 10, C.btn, C.gold, 2);
    txt(close, TXT.common.close, FS.small, C.textDark, 160, 60);
    close.on(Node.EventType.TOUCH_END, () => curtain.destroy());
}

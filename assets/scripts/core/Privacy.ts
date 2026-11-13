/**
 * 隐私授权流程。wx 调用只走 WxApi。
 * 同一会话拒绝满 2 次后不再弹，广告降级，游戏继续。
 */
import {
    getPrivacySetting,
    isWx,
    onNeedPrivacyAuthorization,
    openPrivacyContract,
    requirePrivacyAuthorize,
    PrivacyResolve,
} from './WxApi';

const MAX_PROMPTS = 2;

export interface PrivacyPrompt {
    contractName: string;
    onShown: () => void;
    onAgree: () => void;
    onDisagree: () => void;
}

type Presenter = (prompt: PrivacyPrompt) => void;

interface Pending {
    resolve: PrivacyResolve;
    exposed: boolean;
}

let presenter: Presenter | null = null;
let contractName = '《用户隐私保护指引》';
let agreed = false;
let denyCount = 0;
let listenerReady = false;
let showing = false;
const queue: Pending[] = [];

export function setPrivacyPresenter (p: Presenter): void {
    presenter = p;
    if (queue.length && !showing) openDialog();
}

export function privacyAgreed (): boolean {
    return agreed;
}

/**
 * 已经拒绝过一次。插屏和 Banner 不再追着问。
 * 激励视频按钮仍可再问一次（同一会话合计最多 2 次），满 2 次后 ensurePrivacy 直接返回 false。
 */
export function privacyBlocksAds (): boolean {
    return isWx() && !agreed && denyCount >= 1;
}

export function currentContractName (): string {
    return contractName;
}

function safeResolve (resolve: PrivacyResolve, event: 'agree' | 'disagree' | 'exposureAuthorization'): void {
    try {
        if (event === 'exposureAuthorization') resolve({ event: 'exposureAuthorization' });
        else if (event === 'agree') resolve({ event: 'agree' });
        else resolve({ event: 'disagree' });
    } catch (e) {
        console.warn('[Privacy] resolve 失败', e);
    }
}

function flush (event: 'agree' | 'disagree'): void {
    const all = queue.splice(0, queue.length);
    showing = false;
    if (event === 'agree') agreed = true;
    else denyCount += 1;
    for (let i = 0; i < all.length; i++) {
        if (!all[i].exposed) safeResolve(all[i].resolve, 'exposureAuthorization');
        safeResolve(all[i].resolve, event);
    }
}

function openDialog (): void {
    if (showing || queue.length === 0) return;
    if (agreed) { flush('agree'); return; }
    if (denyCount >= MAX_PROMPTS) { flush('disagree'); return; }
    if (!presenter) return;
    showing = true;
    try {
        presenter({
            contractName,
            onShown: () => {
                for (let i = 0; i < queue.length; i++) {
                    if (!queue[i].exposed) {
                        queue[i].exposed = true;
                        safeResolve(queue[i].resolve, 'exposureAuthorization');
                    }
                }
            },
            onAgree: () => flush('agree'),
            onDisagree: () => flush('disagree'),
        });
    } catch (e) {
        console.warn('[Privacy] 弹窗失败，按拒绝降级', e);
        flush('disagree');
    }
}

function handleNeed (resolve: PrivacyResolve): void {
    if (agreed) { safeResolve(resolve, 'agree'); return; }
    if (denyCount >= MAX_PROMPTS) { safeResolve(resolve, 'disagree'); return; }
    queue.push({ resolve, exposed: false });
    openDialog();
}

export function installPrivacyListener (): void {
    if (listenerReady) return;
    listenerReady = true;
    onNeedPrivacyAuthorization((resolve) => handleNeed(resolve));
}

/** 广告与复制等隐私相关动作的统一闸门。拒绝时回调 false，不抛错。 */
export function ensurePrivacy (cb: (ok: boolean) => void): void {
    const done = (ok: boolean): void => {
        try { cb(ok); } catch (e) { console.warn('[Privacy] 回调异常', e); }
    };
    installPrivacyListener();
    if (!isWx()) { done(true); return; }
    if (agreed) { done(true); return; }
    if (denyCount >= MAX_PROMPTS) { done(false); return; }
    requirePrivacyAuthorize((ok) => {
        if (ok) agreed = true;
        done(ok);
    });
}

/** 启动时查询。不在这里卡住进入游戏；需要授权时才弹窗。 */
export function bootPrivacy (cb: (ok: boolean) => void): void {
    const done = (ok: boolean): void => {
        try { cb(ok); } catch (e) { console.warn('[Privacy] 启动回调异常', e); }
    };
    installPrivacyListener();
    getPrivacySetting((need, name) => {
        if (name) contractName = name;
        if (!isWx()) { done(true); return; }
        if (!need) {
            agreed = true;
            done(true);
            return;
        }
        ensurePrivacy(done);
    });
}

export function viewPrivacyContract (cb: (ok: boolean) => void): void {
    openPrivacyContract(cb);
}

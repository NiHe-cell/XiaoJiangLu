/**
 * 广告封装：激励视频 / 插屏 / Banner
 *
 * 依赖：./WxApi（唯一 wx 出入口）  ../data/AdConf（广告位配置）
 *
 * ★ 降级铁律（用户拍板，不可改）：
 *   激励视频在「广告不可用 / 未配置 ID / 创建失败 / 加载失败 / 播放失败 / 用户提前退出」
 *   **一律按成功发放奖励**（cb(true)）。
 *   理由：本项目无服务端做发放校验，卡住玩家流程的代价 >> 白送一份奖励的代价。
 *
 * ★ 所有 wx 调用只走 `getWx()`，本文件不直接引用 `wx` 标识符（避免重复 declare 与未定义崩溃）。
 */
import { sys } from 'cc';
import { getWx, getWindowInfo } from './WxApi';
import {
    AD_ENABLED,
    REWARDED_CONF,
    INTERSTITIAL_CONF,
    BANNER_CONF,
    getRewardedConf,
} from '../data/AdConf';

// ───────────────────────── 每日计数持久化 ─────────────────────────

const AD_DAY_KEY = 'xxl_ad_day_v1';

interface DayCounter { day: string; interstitial: number; }

function todayStr (): string {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function loadCounter (): DayCounter {
    try {
        const raw = sys.localStorage.getItem(AD_DAY_KEY);
        if (raw) {
            const c = JSON.parse(raw) as DayCounter;
            if (c && c.day) return c;
        }
    } catch (e) {
        // 读失败按新计数处理
    }
    return { day: '', interstitial: 0 };
}

function saveCounter (c: DayCounter): void {
    try {
        sys.localStorage.setItem(AD_DAY_KEY, JSON.stringify(c));
    } catch (e) {
        // 存失败不影响广告逻辑，仅当天计数会在重启后重置（保守方向：宁可少弹）
    }
}

/** 取今日插屏已展示次数（跨自然日自动清零） */
function todayInterstitialCount (): number {
    const c = loadCounter();
    const t = todayStr();
    if (c.day !== t) return 0;
    return c.interstitial || 0;
}

function bumpInterstitialCount (): void {
    const t = todayStr();
    const c = loadCounter();
    if (c.day !== t) saveCounter({ day: t, interstitial: 1 });
    else saveCounter({ day: t, interstitial: (c.interstitial || 0) + 1 });
}

// ───────────────────────── 激励视频 ─────────────────────────

interface RewardedSlot {
    ad: any;
    /** 本次播放的结算回调（onClose 时消费），保证一次播放只结算一次 */
    pending: ((ok: boolean) => void) | null;
}

const rewardedSlots: { [key: string]: RewardedSlot } = {};

/** 结算守卫超时（毫秒）：广告异常不回调时兜底发放，避免玩家卡死在「等待广告」 */
const REWARD_TIMEOUT_MS = 60000;

function createRewardedSlot (key: string, adUnitId: string): RewardedSlot | null {
    const w = getWx();
    if (!w || typeof w.createRewardedVideoAd !== 'function') return null;
    const ad = w.createRewardedVideoAd({ adUnitId });
    if (!ad) return null;
    const slot: RewardedSlot = { ad, pending: null };

    try {
        if (typeof ad.onError === 'function') {
            ad.onError((err: any) => {
                console.warn('[Ad] 激励视频 onError（' + key + '）', err);
                // 播放中的错误：立即按成功结算，绝不让玩家等一个不会回调的广告
                const f = slot.pending;
                slot.pending = null;
                if (f) f(true);
            });
        }
    } catch (e) { console.warn('[Ad] 激励视频 onError 注册失败', e); }

    try {
        if (typeof ad.onClose === 'function') {
            ad.onClose((res: any) => {
                // ★ 无论 res.isEnded 真假都按成功发放（用户拍板：无服务端校验，宁可白送）
                const f = slot.pending;
                slot.pending = null;
                if (f) f(true);
            });
        }
    } catch (e) { console.warn('[Ad] 激励视频 onClose 注册失败', e); }

    rewardedSlots[key] = slot;
    return slot;
}

function settleOnce (slot: RewardedSlot, ok: boolean): void {
    const f = slot.pending;
    slot.pending = null;
    if (f) f(ok);
}

/**
 * 播放激励视频。
 * @param cb 结算回调。**当前实现恒以 true 回调**（降级铁律），保留 boolean 形参供后续接入服务端校验。
 * @param key 场景 key（AdConf.REWARDED_CONF[].key：sweep_double / battle_revive / extra_recruit）。
 *            不传取配置表第一项。
 */
export function showRewarded (cb: (ok: boolean) => void, key?: string): void {
    const done = (ok: boolean): void => {
        if (!cb) return;
        try { cb(ok); } catch (e) { console.warn('[Ad] showRewarded 回调异常', e); }
    };

    const conf = getRewardedConf(key);
    // 降级点 1：总开关关闭 / 场景未配置 / 广告位 ID 为空 → 直接发放
    if (!AD_ENABLED || !conf || !conf.adUnitId) {
        console.log('[Ad] 激励视频未配置或已关闭 → 按成功发放（key=' + (key || 'default') + '）');
        done(true);
        return;
    }
    // 降级点 2：非 wx 环境 → 直接发放
    if (!getWx()) { done(true); return; }

    let slot: RewardedSlot | null = null;
    try {
        slot = rewardedSlots[conf.key] || createRewardedSlot(conf.key, conf.adUnitId);
    } catch (e) {
        // 降级点 3：创建失败 → 直接发放
        console.warn('[Ad] 激励视频创建失败 → 按成功发放', e);
        done(true);
        return;
    }
    if (!slot) { done(true); return; }

    // 上一次还没结算（异常残留），先把它按成功清掉，避免回调丢失
    settleOnce(slot, true);

    let settled = false;
    slot.pending = (ok: boolean) => {
        if (settled) return;
        settled = true;
        done(ok);
    };
    // 兜底超时：广告侧迟迟不回调也要把奖励发给玩家
    const timer = setTimeout(() => {
        if (settled) return;
        console.warn('[Ad] 激励视频结算超时 → 按成功发放');
        settled = true;
        const f = slot!.pending;
        slot!.pending = null;
        if (f) f(true);
    }, REWARD_TIMEOUT_MS);

    const clearTimerOnSettle = slot.pending;
    slot.pending = (ok: boolean) => {
        clearTimeout(timer);
        clearTimerOnSettle(ok);
    };

    const play = (): void => {
        try {
            const p = slot!.ad.show();
            if (p && typeof p.catch === 'function') {
                // 降级点 4：show 失败（未加载完成）→ 先 load 再 show，仍失败则直接发放
                p.catch(() => {
                    try {
                        const lp = slot!.ad.load();
                        if (lp && typeof lp.then === 'function') {
                            lp.then(() => slot!.ad.show())
                                .catch(() => { if (!settled) { settled = true; slot!.pending = null; done(true); } });
                        } else {
                            if (!settled) { settled = true; slot!.pending = null; done(true); }
                        }
                    } catch (e2) {
                        if (!settled) { settled = true; slot!.pending = null; done(true); }
                    }
                });
            }
        } catch (e) {
            console.warn('[Ad] 激励视频 show 异常 → 按成功发放', e);
            if (!settled) { settled = true; slot!.pending = null; done(true); }
        }
    };

    try {
        const lp = slot.ad.load();
        if (lp && typeof lp.then === 'function') {
            lp.then(() => play()).catch(() => play());
        } else {
            play();
        }
    } catch (e) {
        play();
    }
}

// ───────────────────────── 插屏 ─────────────────────────

let interstitialAd: any = null;
let lastInterstitialTs = 0;

/**
 * 展示插屏广告（带冷却 + 每日上限，超出直接跳过，返回 false）。
 * 调用方不需要处理失败：插屏本就是可跳过的变现位。
 */
export function showInterstitial (): boolean {
    if (!AD_ENABLED || !INTERSTITIAL_CONF.adUnitId) return false;
    if (!getWx()) return false;

    const now = Date.now();
    if (now - lastInterstitialTs < INTERSTITIAL_CONF.cooldownSec * 1000) return false;
    if (todayInterstitialCount() >= INTERSTITIAL_CONF.maxPerDay) return false;

    try {
        const w = getWx();
        if (!w || typeof w.createInterstitialAd !== 'function') return false;
        if (!interstitialAd) {
            interstitialAd = w.createInterstitialAd({ adUnitId: INTERSTITIAL_CONF.adUnitId });
            if (!interstitialAd) return false;
            if (typeof interstitialAd.onError === 'function') {
                interstitialAd.onError((err: any) => console.warn('[Ad] 插屏 onError（已跳过）', err));
            }
            if (typeof interstitialAd.onClose === 'function') {
                interstitialAd.onClose(() => { /* 仅计数，无后续动作 */ });
            }
        }
        const p = interstitialAd.show();
        if (p && typeof p.catch === 'function') {
            p.catch((err: any) => {
                console.warn('[Ad] 插屏 show 失败（已跳过，不计冷却与次数）', err);
            });
        }
        lastInterstitialTs = now;
        bumpInterstitialCount();
        return true;
    } catch (e) {
        console.warn('[Ad] 插屏异常（已跳过）', e);
        return false;
    }
}

// ───────────────────────── Banner ─────────────────────────

let bannerAd: any = null;

/** Banner 贴底适配：按真实窗口宽度居中，并抬到安全区之上（避开底部小黑条/胶囊） */
function layoutBanner (h?: number): void {
    if (!bannerAd) return;
    try {
        const info = getWindowInfo();
        const winW = info.windowWidth || info.screenWidth;
        const winH = info.windowHeight || info.screenHeight;
        const width = Math.min(BANNER_CONF.style.width || 360, Math.max(300, winW));
        const left = Math.floor((winW - width) / 2);
        const height = (typeof h === 'number' && h > 0) ? h : 100;
        const bottomGap = Math.max(0, info.screenHeight - (info.safeArea.bottom || info.screenHeight));
        const top = Math.max(0, winH - height - bottomGap);
        bannerAd.style.left = left;
        bannerAd.style.top = top;
        bannerAd.style.width = width;
    } catch (e) {
        console.warn('[Ad] Banner 布局适配失败', e);
    }
}

/** 展示 Banner。未配置/非 wx/创建失败一律静默（Banner 不是流程节点，失败不提示）。 */
export function showBanner (): void {
    if (!AD_ENABLED || !BANNER_CONF.adUnitId) return;
    if (!getWx()) return;
    try {
        const w = getWx();
        if (!w || typeof w.createBannerAd !== 'function') return;
        if (!bannerAd) {
            bannerAd = w.createBannerAd({
                adUnitId: BANNER_CONF.adUnitId,
                style: {
                    left: BANNER_CONF.style.left,
                    top: BANNER_CONF.style.top,
                    width: BANNER_CONF.style.width,
                },
            });
            if (!bannerAd) return;
            // onResize 拿真实高度后再贴底，避免 Banner 压住底部按钮
            if (typeof bannerAd.onResize === 'function') {
                bannerAd.onResize((res: any) => layoutBanner(res && res.height));
            }
            if (typeof bannerAd.onError === 'function') {
                bannerAd.onError((err: any) => {
                    console.warn('[Ad] Banner onError（已隐藏）', err);
                    hideBanner();
                });
            }
        }
        layoutBanner();
        const p = bannerAd.show();
        if (p && typeof p.catch === 'function') {
            p.catch((err: any) => console.warn('[Ad] Banner show 失败（已忽略）', err));
        }
    } catch (e) {
        console.warn('[Ad] Banner 异常（已忽略）', e);
    }
}

/** 隐藏 Banner（不销毁，便于复用；切场景/进战斗时调用） */
export function hideBanner (): void {
    if (!bannerAd) return;
    try {
        const p = bannerAd.hide();
        if (p && typeof p.catch === 'function') p.catch(() => { /* 忽略 */ });
    } catch (e) {
        // 静默
    }
}

/** 彻底销毁 Banner（换广告位或退到无 Banner 界面时用） */
export function destroyBanner (): void {
    if (!bannerAd) return;
    try {
        if (typeof bannerAd.destroy === 'function') bannerAd.destroy();
    } catch (e) { /* 静默 */ }
    bannerAd = null;
}

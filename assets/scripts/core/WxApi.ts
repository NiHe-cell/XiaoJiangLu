/**
 * 微信小游戏 API 统一封装（上架冲刺 · Wave 1 平台接入层）
 *
 * ★ 三条硬约束
 *  1. 非 wx 环境（浏览器预览 / 编辑器 / 桌面调试）必须**安全降级**，任何 API 都不得抛错中断游戏。
 *  2. 所有 wx 调用一律包 try/catch；环境检测统一用 `typeof wx !== 'undefined'`，
 *     禁止直接引用（未声明全局会抛 ReferenceError，try/catch 拦不住标识符未定义的语法级查找，
 *     但 typeof 守卫可以确保安全）。
 *  3. Cocos 工程内 `wx` 无类型声明（tsc 会报 `Cannot find name 'wx'`）。
 *     本文件用 `declare const wx: any` 就地声明（模块级），**其他文件一律通过 `getWx()` 访问**，
 *     禁止各自重复 declare —— 重复声明易在合包后产生二义与维护分叉。
 *
 * 业务口径（GAME.md 第 7.1 节，用户已拍板）：
 *  - 个人主体测试 AppID + 无服务端 → 登录只做 `wx.login` 静默取 code，
 *    **不弹授权、不调 getUserProfile**（个人主体拿不到头像昵称；getUserProfile 必须由用户点击触发，
 *    且滥用会触发审核驳回）。
 *  - 分享走 `wx.shareAppMessage` / `wx.onShareAppMessage`，文案保持中性，
 *    避免"分享即得"式强诱导（提审红线 5：无诱导分享、无强制分享）。
 *
 * 依赖：无（有意不 import cc，保证纯数据层/任意环境可复用）。
 */

declare const wx: any;

/** 设计分辨率（唯一来源 = GAME.md 第 2 节；本文件只读取，禁止在此定义新口径） */
export const DESIGN_W = 720;
export const DESIGN_H = 1280;
/** 9:19.5 机型可见设计宽度约 591，半宽 ≈295 → 可点击元素必须落在 x ∈ [-290, 290] */
export const SAFE_HALF_W = 290;

export type WxCallback = (...args: any[]) => void;

// ───────────────────────── 环境与通用守卫 ─────────────────────────

/**
 * 安全取 wx 全局对象：非 wx 环境返回 null。
 * 所有 wx 访问都必须经由此函数，不得直接写 `wx.xxx`。
 */
export function getWx (): any {
    try {
        if (typeof wx === 'undefined' || !wx) return null;
        return wx;
    } catch (e) {
        return null;
    }
}

/** 是否运行在微信小游戏环境 */
export function isWx (): boolean {
    return !!getWx();
}

/** 回调派发：单个回调抛错不影响其余回调（生命周期链上挂了存档逻辑，不能被一个坏回调带崩） */
function emit (list: WxCallback[], arg: any): void {
    for (let i = 0; i < list.length; i++) {
        try {
            list[i](arg);
        } catch (e) {
            console.warn('[WxApi] 生命周期回调异常（已跳过）', e);
        }
    }
}

// ───────────────────────── 登录（静默，无服务端） ─────────────────────────

export interface LoginResult {
    ok: boolean;
    code: string;
    errMsg: string;
}

let lastCode = '';

/** 最近一次 wx.login 拿到的 code（无服务端，仅本地留档/调试用；拿不到为空串） */
export function lastLoginCode (): string {
    return lastCode;
}

/**
 * 静默登录：只取 code，不弹任何授权框。
 * 非 wx 环境或失败时回调 `{ ok:false }`，**不影响游戏流程**。
 */
export function login (cb?: (r: LoginResult) => void): void {
    const done = (r: LoginResult): void => {
        if (!cb) return;
        try { cb(r); } catch (e) { console.warn('[WxApi] login 回调异常', e); }
    };
    try {
        const w = getWx();
        if (!w || typeof w.login !== 'function') {
            done({ ok: false, code: '', errMsg: 'not wx env' });
            return;
        }
        w.login({
            success: (res: any) => {
                lastCode = (res && res.code) ? String(res.code) : '';
                done({ ok: !!lastCode, code: lastCode, errMsg: '' });
            },
            fail: (res: any) => {
                console.warn('[WxApi] wx.login 失败（静默，继续游戏）', res);
                done({ ok: false, code: '', errMsg: (res && res.errMsg) ? String(res.errMsg) : 'login fail' });
            },
        });
    } catch (e) {
        console.warn('[WxApi] wx.login 异常（静默，继续游戏）', e);
        done({ ok: false, code: '', errMsg: 'exception' });
    }
}

// ───────────────────────── 生命周期（onShow / onHide） ─────────────────────────

const showCbs: WxCallback[] = [];
const hideCbs: WxCallback[] = [];
let lifecycleBound = false;

/**
 * 向微信注册生命周期监听。
 * 只注册**一次**代理，业务回调走本模块数组 —— 避免多次调用 wx.onShow/onHide 覆盖彼此
 * （微信侧对重复注册不保证叠加，自建数组是确定行为）。
 */
function bindLifecycle (): boolean {
    if (lifecycleBound) return true;
    const w = getWx();
    if (!w) return false;
    try {
        if (typeof w.onShow === 'function') {
            w.onShow((res: any) => emit(showCbs, res));
        }
        if (typeof w.onHide === 'function') {
            w.onHide((res: any) => emit(hideCbs, res));
        }
        lifecycleBound = true;
        return true;
    } catch (e) {
        console.warn('[WxApi] 生命周期注册失败（已降级）', e);
        return false;
    }
}

/** 注册切前台回调（可用于刷新每日任务/签到重置判定） */
export function onShow (cb: WxCallback): void {
    if (!cb) return;
    showCbs.push(cb);
    bindLifecycle();
}

/** 注册切后台回调（**存档时机**） */
export function onHide (cb: WxCallback): void {
    if (!cb) return;
    hideCbs.push(cb);
    bindLifecycle();
}

/**
 * 自动存档钩子：切后台（onHide）即落盘。
 * 浏览器预览无 onHide，额外挂 visibilitychange/pagehide 兜底（wx 环境无 document，已做 typeof 守卫）。
 */
export function bindAutoSave (saveFn: () => void): void {
    if (!saveFn) return;
    onHide(() => {
        try { saveFn(); } catch (e) { console.warn('[WxApi] onHide 存档失败', e); }
    });
    try {
        if (typeof document !== 'undefined' && document && typeof document.addEventListener === 'function') {
            const onVis = (): void => {
                try {
                    if ((document as any).hidden) saveFn();
                } catch (e) { console.warn('[WxApi] visibilitychange 存档失败', e); }
            };
            document.addEventListener('visibilitychange', onVis);
            document.addEventListener('pagehide', onVis);
        }
    } catch (e) {
        // 浏览器兜底失败不影响主流程
    }
}

// ───────────────────────── 窗口 / 机型信息 ─────────────────────────

export interface WxSafeArea {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

export type DeviceTier = 'low' | 'mid' | 'high';

export interface WindowInfo {
    /** 安全区（逻辑像素）；取不到时回落整屏 */
    safeArea: WxSafeArea;
    /** 屏幕尺寸（逻辑像素） */
    screenWidth: number;
    screenHeight: number;
    /** 可视窗口尺寸（逻辑像素） */
    windowWidth: number;
    windowHeight: number;
    /** 设备像素比 */
    pixelRatio: number;
    /** 机型档位：按物理像素总量粗分，供特效降级（低端机关震屏/粒子）使用 */
    tier: DeviceTier;
    /** fitHeight 换算后、可见区域对应的**设计坐标半宽**，已按 SAFE_HALF_W(290) 收口，可直接用于布局 */
    designSafeHalfW: number;
}

/** 优先 getWindowInfo（官方推荐，2.20.1+），回落 getSystemInfoSync */
function readSystemInfo (): any {
    const w = getWx();
    if (!w) return null;
    if (typeof w.getWindowInfo === 'function') {
        try { return w.getWindowInfo(); } catch (e) {
            console.warn('[WxApi] getWindowInfo 失败，回落 getSystemInfoSync', e);
        }
    }
    if (typeof w.getSystemInfoSync === 'function') {
        try { return w.getSystemInfoSync(); } catch (e) {
            console.warn('[WxApi] getSystemInfoSync 失败', e);
        }
    }
    return null;
}

/** 机型档位：物理像素总量近似（w × h × dpr）粗分 */
function calcTier (w: number, h: number, dpr: number): DeviceTier {
    const px = w * h * dpr;
    if (px >= 4.2e6) return 'high';
    if (px >= 2.0e6) return 'mid';
    return 'low';
}

/**
 * 取窗口/机型信息。**非 wx 环境返回按设计分辨率构造的安全默认值**，绝不返回 null。
 */
export function getWindowInfo (): WindowInfo {
    const info = readSystemInfo();
    const dpr = info && typeof info.pixelRatio === 'number' && info.pixelRatio > 0 ? info.pixelRatio : 2;
    const screenWidth = info && info.screenWidth ? Number(info.screenWidth) : DESIGN_W;
    const screenHeight = info && info.screenHeight ? Number(info.screenHeight) : DESIGN_H;
    const windowWidth = info && info.windowWidth ? Number(info.windowWidth) : screenWidth;
    const windowHeight = info && info.windowHeight ? Number(info.windowHeight) : screenHeight;

    // 安全区：getWindowInfo 返回 safeArea；老接口可能没有 → 用整屏兜底
    let sa: WxSafeArea = { left: 0, top: 0, right: windowWidth, bottom: windowHeight, width: windowWidth, height: windowHeight };
    if (info && info.safeArea && typeof info.safeArea === 'object') {
        const r = info.safeArea;
        const w2 = (typeof r.width === 'number' && r.width > 0) ? r.width : (r.right - r.left);
        const h2 = (typeof r.height === 'number' && r.height > 0) ? r.height : (r.bottom - r.top);
        if (w2 > 0 && h2 > 0) {
            sa = {
                left: Number(r.left) || 0,
                top: Number(r.top) || 0,
                right: Number(r.right) || w2,
                bottom: Number(r.bottom) || h2,
                width: Number(w2),
                height: Number(h2),
            };
        }
    }

    // fitHeight 下可见设计宽 = 设计高 × (窗口宽/窗口高)，再按 GAME.md 硬约束收口到 ±290
    let designW = windowHeight > 0 ? (windowWidth / windowHeight) * DESIGN_H : DESIGN_W;
    if (!isFinite(designW) || designW <= 0) designW = DESIGN_W;
    let half = designW / 2;
    if (!isFinite(half) || half <= 0) half = SAFE_HALF_W;
    half = Math.min(half, SAFE_HALF_W);

    return {
        safeArea: sa,
        screenWidth,
        screenHeight,
        windowWidth,
        windowHeight,
        pixelRatio: dpr,
        tier: calcTier(screenWidth, screenHeight, dpr),
        designSafeHalfW: half,
    };
}

/** 可点击区域的设计坐标半宽（布局直接读这个，别再手写 -290/290） */
export function safeHalfWidth (): number {
    return getWindowInfo().designSafeHalfW;
}

// ───────────────────────── 震动 ─────────────────────────

/** 短震（15ms）。失败静默。 */
export function vibrateShort (): void {
    try {
        const w = getWx();
        if (!w || typeof w.vibrateShort !== 'function') return;
        w.vibrateShort({ type: 'medium' });
    } catch (e) {
        // 静默
    }
}

/** 长震（400ms）。失败静默。 */
export function vibrateLong (): void {
    try {
        const w = getWx();
        if (!w || typeof w.vibrateLong !== 'function') return;
        w.vibrateLong({});
    } catch (e) {
        // 静默
    }
}

// ───────────────────────── 分享 ─────────────────────────

export interface ShareOpts {
    title?: string;
    imageUrl?: string;
    query?: string;
}

/** 默认分享文案：中性表述，规避"分享即得奖励"式强诱导（提审红线 5） */
const DEFAULT_SHARE: ShareOpts = {
    title: '骁将录 — 排兵布阵，收服三国名将',
    query: '',
};

let customShare: ShareOpts = {};
let lastShareTicket = '';

/** 由业务层设置默认分享文案（如带上当前章节） */
export function setDefaultShare (o: ShareOpts): void {
    customShare = o || {};
}

function mergeShare (o?: ShareOpts): ShareOpts {
    const r: ShareOpts = {};
    r.title = (o && o.title) || customShare.title || DEFAULT_SHARE.title;
    r.imageUrl = (o && o.imageUrl) || customShare.imageUrl || '';
    r.query = (o && o.query) || customShare.query || DEFAULT_SHARE.query;
    return r;
}

/** 最近一次带 shareTicket 分享拿到的票据（开放数据域排行/群排行后续用） */
export function getLastShareTicket (): string {
    return lastShareTicket;
}

/**
 * 主动分享（玩家点游戏内按钮）。
 * cb(ok)：是否分享成功。**失败一律不阻断流程**（提审红线 5：不得强制分享）。
 */
export function shareAppMessage (opts?: ShareOpts, cb?: (ok: boolean) => void): void {
    const done = (ok: boolean): void => {
        if (!cb) return;
        try { cb(ok); } catch (e) { console.warn('[WxApi] share 回调异常', e); }
    };
    try {
        const w = getWx();
        if (!w || typeof w.shareAppMessage !== 'function') { done(false); return; }
        const s = mergeShare(opts);
        const arg: any = { title: s.title, query: s.query || '', withShareTicket: true };
        if (s.imageUrl) arg.imageUrl = s.imageUrl;
        arg.success = (res: any) => {
            const tickets = res && res.shareTickets;
            if (tickets && tickets.length > 0) lastShareTicket = String(tickets[0]);
            done(true);
        };
        arg.fail = (res: any) => {
            console.warn('[WxApi] shareAppMessage 失败（不阻断）', res);
            done(false);
        };
        w.shareAppMessage(arg);
    } catch (e) {
        console.warn('[WxApi] shareAppMessage 异常（不阻断）', e);
        done(false);
    }
}

/**
 * 被动分享（右上角「...」菜单）。
 * 同时开启 shareMenu(withShareTicket)，便于后续做群排行。
 */
export function onShareAppMessage (opts?: ShareOpts): void {
    try {
        const w = getWx();
        if (!w) return;
        if (typeof w.showShareMenu === 'function') {
            try { w.showShareMenu({ withShareTicket: true }); } catch (e) {
                console.warn('[WxApi] showShareMenu 失败（不阻断）', e);
            }
        }
        if (typeof w.onShareAppMessage !== 'function') return;
        w.onShareAppMessage(() => {
            const s = mergeShare(opts);
            const r: any = { title: s.title, query: s.query || '' };
            if (s.imageUrl) r.imageUrl = s.imageUrl;
            return r;
        });
    } catch (e) {
        console.warn('[WxApi] onShareAppMessage 注册失败（不阻断）', e);
    }
}

// ───────────────────────── 托管数据（排行榜预留） ─────────────────────────

export interface KVData { key: string; value: string; }

/**
 * 上报托管数据（开放数据域排行榜用）。
 * 本批**只留签名与静默降级**：个人主体/未开通托管数据时 wx 侧会失败，此处一律静默，不影响游戏。
 * 后续排行榜接入时只改调用方，不改本函数。
 */
export function setUserCloudStorage (kv: KVData[], cb?: (ok: boolean) => void): void {
    const done = (ok: boolean): void => {
        if (!cb) return;
        try { cb(ok); } catch (e) { console.warn('[WxApi] setUserCloudStorage 回调异常', e); }
    };
    try {
        const w = getWx();
        if (!w || typeof w.setUserCloudStorage !== 'function') { done(false); return; }
        w.setUserCloudStorage({
            KVDataList: kv || [],
            success: () => done(true),
            fail: (res: any) => {
                console.warn('[WxApi] setUserCloudStorage 失败（静默）', res);
                done(false);
            },
        });
    } catch (e) {
        console.warn('[WxApi] setUserCloudStorage 异常（静默）', e);
        done(false);
    }
}

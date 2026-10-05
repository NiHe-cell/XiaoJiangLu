/**
 * 广告位配置表（纯数据层，禁止 import cc）
 *
 * ★ 当前状态：**全部为占位空串**，尚未拿到真实流量主 ID。
 *   上线前必须把下面每个 `adUnitId` 替换为微信流量主后台申请的**真实广告位 ID**。
 *   替换方式：只改本文件，不改 core/Ad.ts（Ad.ts 已做完整降级，空 ID 时激励视频直接发放奖励）。
 *
 * ★ 提审/自测开关：把 `AD_ENABLED` 置 false 即可一键全局关闭广告（不创建任何广告实例）。
 *
 * 变现口径（GAME.md 第 7.1 节，用户拍板）：
 *  - 纯 IAA：激励视频 + 插屏 + Banner，无内购、无充值入口。
 *  - 广告不可用/未配置时**直接发放奖励、不阻断流程**（无服务端做发放校验，宁可白送）。
 */

/** 广告总开关：false = 全局关闭（提审自测/玩家体验调优时用） */
export const AD_ENABLED = true;

/** 激励视频单条配置 */
export interface RewardedAdConf {
    /** 场景 key，业务侧按 key 取用，禁止硬编码 adUnitId */
    key: string;
    /** 微信广告位 ID。空串 = 未配置 → 走「直接发放奖励」降级 */
    adUnitId: string;
    /** 场景说明（仅注释/调试用，不参与逻辑） */
    desc: string;
}

/**
 * 激励视频广告位（按场景分）。
 * TODO(上线前)：替换为真实流量主 ID，形如 'adunit-xxxxxxxxxxxxxxxx'。
 */
export const REWARDED_CONF: RewardedAdConf[] = [
    // 扫荡双倍：看广告把本次扫荡收益翻倍
    { key: 'sweep_double', adUnitId: '', desc: '扫荡双倍奖励' },
    // 战斗复活：战败后看广告原地复活，保留当前敌方血量
    { key: 'battle_revive', adUnitId: '', desc: '战斗复活' },
    // 额外招募：招募冷却/次数用尽后看广告追加一次
    { key: 'extra_recruit', adUnitId: '', desc: '额外招募' },
];

/** 插屏广告配置 */
export interface InterstitialAdConf {
    /** 微信广告位 ID。空串 = 未配置 → 直接跳过，不展示 */
    adUnitId: string;
    /** 两次插屏之间的最小间隔（秒），防频控投诉 */
    cooldownSec: number;
    /** 每日展示上限，超出当天不再弹 */
    maxPerDay: number;
}

export const INTERSTITIAL_CONF: InterstitialAdConf = {
    // TODO(上线前)：替换为真实流量主 ID
    adUnitId: '',
    cooldownSec: 90,
    maxPerDay: 5,
};

/** Banner 广告配置 */
export interface BannerAdConf {
    /** 微信广告位 ID。空串 = 未配置 → 不创建 */
    adUnitId: string;
    /**
     * 样式（**逻辑像素**坐标系，非设计分辨率）。
     * Ad.ts 会按真实窗口宽度做二次适配并把 Banner 贴到底部安全区之上，
     * 这里的 width 只作为期望宽度上限。
     */
    style: { left: number; top: number; width: number };
}

export const BANNER_CONF: BannerAdConf = {
    // TODO(上线前)：替换为真实流量主 ID
    adUnitId: '',
    style: { left: 0, top: 0, width: 360 },
};

/** 按场景 key 取激励视频配置；未找到返回 null（调用方按「未配置」降级处理） */
export function getRewardedConf (key?: string): RewardedAdConf | null {
    if (!key) return REWARDED_CONF.length > 0 ? REWARDED_CONF[0] : null;
    for (let i = 0; i < REWARDED_CONF.length; i++) {
        if (REWARDED_CONF[i].key === key) return REWARDED_CONF[i];
    }
    return null;
}

/** 广告是否可用（总开关 + 至少一个有效广告位）。仅用于 UI 判断是否展示广告按钮。 */
export function hasAnyAdUnit (): boolean {
    if (!AD_ENABLED) return false;
    for (let i = 0; i < REWARDED_CONF.length; i++) {
        if (REWARDED_CONF[i].adUnitId) return true;
    }
    return !!(INTERSTITIAL_CONF.adUnitId || BANNER_CONF.adUnitId);
}

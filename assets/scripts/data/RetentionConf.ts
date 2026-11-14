/**
 * 留存配置：引导拍点、签到、七日任务、今日目标、日常副本。
 * 纯数据，禁止 import cc。奖励数值以这里为准，UI 只负责展示。
 */

export const GUIDE_DONE = 5;
/** 引导开战固定打第一章第一关，走现有关卡进战，不另写一套战斗。 */
export const GUIDE_STAGE_ID = 101;

export const SIGN_CYCLE = 7;

export interface Grant {
    silver?: number;
    jade?: number;
    items?: { id: number; n: number }[];
}

/** 7 天一轮。下标 0 是第 1 天。漏签不重置，领完第 7 天回到下标 0。 */
export const SIGN_REWARDS: Grant[] = [
    { silver: 2000 },
    { items: [{ id: 5001, n: 5 }] },
    { jade: 50 },
    { items: [{ id: 5103, n: 2 }] },
    { items: [{ id: 5002, n: 3 }] },
    { jade: 80, silver: 5000 },
    { jade: 150, items: [{ id: 5103, n: 5 }] },
];

/** 与 TextConf.weekTask 一一对应。goal 是完成线。 */
export const WEEK_TASKS: { goal: number; reward: Grant }[] = [
    { goal: 1, reward: { silver: 3000 } },
    { goal: 3, reward: { items: [{ id: 5001, n: 10 }] } },
    { goal: 1, reward: { jade: 30 } },
    { goal: 1, reward: { items: [{ id: 5002, n: 2 }] } },
    { goal: 1, reward: { items: [{ id: 5103, n: 2 }] } },
    { goal: 3, reward: { jade: 80 } },
    { goal: 1, reward: { jade: 100, items: [{ id: 5002, n: 3 }] } },
];

export const WEEK_STAGE_CLEAR = [101, 0, 0, 0, 103, 0, 106];

export const GOAL_NEED = { stage: 3, recruit: 1, upgrade: 1 };
export const GOAL_REWARD: Grant = { silver: 1500, items: [{ id: 5001, n: 3 }] };

export type DungeonKind = 'exp' | 'silver' | 'adv';

export const DUNGEON_ORDER: DungeonKind[] = ['exp', 'silver', 'adv'];
export const DUNGEON_FREE = 2;
export const DUNGEON_EXTRA = 1;

/** 敌人只引用现有武将 id。人数仍走 Balance.stageEnemyCountFor，不在这里写新公式。 */
export const DUNGEON_POOLS: { [K in DungeonKind]: number[] } = {
    exp: [1034, 1035, 1033],
    silver: [1035, 1034, 1036],
    adv: [1033, 1036, 1034],
};

export const DUNGEON_BASE: { [K in DungeonKind]: Grant } = {
    exp: { items: [{ id: 5002, n: 6 }, { id: 5001, n: 4 }] },
    silver: { silver: 8000 },
    adv: { items: [{ id: 5103, n: 3 }] },
};

export interface HitRect { x: number; y: number; w: number; h: number; }

/** 引导高亮与日常面板可点区域。右缘 x+w/2、左缘 x-w/2 必须落在 ±290。 */
export const HOME_GO: HitRect = { x: 0, y: 20, w: 360, h: 104 };
export const HOME_ADJUST: HitRect = { x: 205, y: 462, w: 130, h: 44 };
export const HOME_QUICK_Y = -122;
export const HOME_QUICK_W = 176;
export const HOME_QUICK_H = 78;
export const HOME_QUICK_XS = [-196, 0, 196];
export const HOME_RECRUIT: HitRect = { x: HOME_QUICK_XS[0], y: HOME_QUICK_Y, w: HOME_QUICK_W, h: HOME_QUICK_H };
export const HOME_GOAL_CLAIM: HitRect = { x: 200, y: -270, w: 110, h: 44 };

export const NAV_Y = -566;
export const NAV_W = 96;
export const NAV_H = 76;
export const NAV_XS = { home: -240, lineup: -120, hero: 0, recruit: 120, bag: 240 };

export const LINEUP_ACT: HitRect = { x: 0, y: -473, w: 280, h: 64 };
export const RESULT_TRAIN: HitRect = { x: 0, y: -300, w: 360, h: 84 };
export const TOP_BACK: HitRect = { x: -250, y: 596, w: 76, h: 60 };
export const HERO_ACK: HitRect = { x: 0, y: -40, w: 280, h: 72 };
export const RECRUIT_ONCE: HitRect = { x: 0, y: 20, w: 320, h: 96 };

export const DAILY_TAB_Y = 460;
export const DAILY_TAB_XS = [-180, 0, 180];
export const DAILY_TAB_W = 168;
export const DAILY_TAB_H = 56;
export const DAILY_ROW_W = 560;
export const DAILY_ROW_H = 66;
export const DAILY_ROW0_Y = 348;
export const DAILY_ROW_STEP = 74;
export const DAILY_CLAIM_X = 200;
export const DAILY_CLAIM_W = 112;
export const DAILY_CLAIM_H = 48;
export const DUNGEON_CARD_YS = [240, 40, -160];
export const DUNGEON_CARD_W = 560;
export const DUNGEON_CARD_H = 176;
export const DUNGEON_BTN_XS = [-100, 100];
export const DUNGEON_BTN_Y = -48;
export const DUNGEON_BTN_W = 150;
export const DUNGEON_BTN_H = 56;

export function navHit (key: keyof typeof NAV_XS): HitRect {
    return { x: NAV_XS[key], y: NAV_Y, w: NAV_W, h: NAV_H };
}

/** 教学条避开高亮孔。优先靠下，重叠就换下一个空位。 */
export function guideTipY (holeY: number, holeH: number): number {
    const th = 64;
    const candidates = [-420, -265, 160, 330];
    const holeTop = holeY + holeH / 2;
    const holeBot = holeY - holeH / 2;
    for (let i = 0; i < candidates.length; i++) {
        const y = candidates[i];
        const tipTop = y + th / 2;
        const tipBot = y - th / 2;
        if (tipBot >= holeTop + 8 || tipTop <= holeBot - 8) return y;
    }
    return holeY > 0 ? -420 : 330;
}

/**
 * 留存规则（签到 / 七日任务 / 今日目标 / 日常副本 / 引导进度）。
 * 不 import cc，方便用脚本直接驱动存档。UI 与 Store 只负责调用和落盘。
 */
import { BAL } from '../data/Balance';
import { getItemConf } from '../data/ItemConf';
import { TXT } from '../data/TextConf';
import {
    DUNGEON_BASE,
    DUNGEON_EXTRA,
    DUNGEON_FREE,
    DUNGEON_ORDER,
    DUNGEON_POOLS,
    DungeonKind,
    GOAL_NEED,
    GOAL_REWARD,
    GUIDE_DONE,
    Grant,
    SIGN_REWARDS,
    WEEK_STAGE_CLEAR,
    WEEK_TASKS,
} from '../data/RetentionConf';

export interface RetentionPlayer {
    level: number;
    silver: number;
    jade: number;
    items: { [itemId: number]: number };
    lineup: number[];
    recruited: number;
    maxStageId: number;
    stageStars: { [stageId: number]: number };
    loginDay: number;
    lastLoginTs: number;
    levelUps: number;
    guideStep: number;
    goalDay: string;
    goalStage: number;
    goalRecruit: number;
    goalUpgrade: number;
    goalClaimed: boolean;
    weekClaimed: number;
    dungeonDay: string;
    dungeonUsed: number[];
    dungeonExtra: number[];
}

export function newRetentionState (): Pick<RetentionPlayer,
    'levelUps' | 'guideStep' | 'goalDay' | 'goalStage' | 'goalRecruit' | 'goalUpgrade' |
    'goalClaimed' | 'weekClaimed' | 'dungeonDay' | 'dungeonUsed' | 'dungeonExtra'> {
    return {
        levelUps: 0,
        guideStep: 0,
        goalDay: '',
        goalStage: 0,
        goalRecruit: 0,
        goalUpgrade: 0,
        goalClaimed: false,
        weekClaimed: 0,
        dungeonDay: '',
        dungeonUsed: [0, 0, 0],
        dungeonExtra: [0, 0, 0],
    };
}

function assertNever (x: never): never {
    throw new Error('未处理的分支 ' + String(x));
}

function clampInt (v: any, min: number, max: number): number {
    const n = Math.floor(Number(v));
    if (!isFinite(n)) return min;
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

/** 本地日历天。同一天的任意时刻得到同一串。 */
export function localDay (ts: number): string {
    const d = new Date(ts);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

/**
 * 老档补字段。
 * 没有 guideStep 的档视为引导已完成，避免老玩家被重新按住。
 * 显式写了 guideStep（含 0）则原样保留。
 */
export function migrateOnto (p: RetentionPlayer, raw: any): void {
    const hadGuide = !!(raw && typeof raw.guideStep === 'number');
    const hadLevelUps = !!(raw && typeof raw.levelUps === 'number');
    if (!hadGuide) p.guideStep = GUIDE_DONE;
    else p.guideStep = clampInt(p.guideStep, 0, GUIDE_DONE);

    if (!hadLevelUps) {
        let n = 0;
        const heroes = raw && raw.heroes ? raw.heroes : {};
        const keys = Object.keys(heroes);
        for (let i = 0; i < keys.length; i++) {
            const h = heroes[keys[i]];
            const lv = h && typeof h.level === 'number' ? h.level : 1;
            n += Math.max(0, lv - 1);
        }
        p.levelUps = n;
    } else {
        p.levelUps = clampInt(p.levelUps, 0, 1000000);
    }

    p.loginDay = clampInt(p.loginDay, 0, 100000) % 7;
    p.lastLoginTs = clampInt(p.lastLoginTs, 0, 9000000000000);
    p.weekClaimed = clampInt(p.weekClaimed, 0, 0x7f);
    if (typeof p.goalDay !== 'string') p.goalDay = '';
    if (typeof p.dungeonDay !== 'string') p.dungeonDay = '';
    p.goalStage = clampInt(p.goalStage, 0, 9999);
    p.goalRecruit = clampInt(p.goalRecruit, 0, 9999);
    p.goalUpgrade = clampInt(p.goalUpgrade, 0, 9999);
    p.goalClaimed = !!p.goalClaimed;
    p.dungeonUsed = norm3(p.dungeonUsed);
    p.dungeonExtra = norm3(p.dungeonExtra);
}

function norm3 (arr: any): number[] {
    const out = [0, 0, 0];
    if (!arr || typeof arr.length !== 'number') return out;
    for (let i = 0; i < 3; i++) out[i] = clampInt(arr[i], 0, 99);
    return out;
}

export function applyGrant (p: RetentionPlayer, g: Grant): void {
    if (g.silver) p.silver = Math.max(0, p.silver + g.silver);
    if (g.jade) p.jade = Math.max(0, p.jade + g.jade);
    if (!g.items) return;
    for (let i = 0; i < g.items.length; i++) {
        const it = g.items[i];
        if (!it.n) continue;
        p.items[it.id] = (p.items[it.id] || 0) + it.n;
    }
}

export function describeGrant (g: Grant): string {
    const parts: string[] = [];
    if (g.silver) parts.push(TXT.home.silver + ' ' + g.silver);
    if (g.jade) parts.push(TXT.home.jade + ' ' + g.jade);
    if (g.items) {
        for (let i = 0; i < g.items.length; i++) {
            const it = g.items[i];
            parts.push(getItemConf(it.id).name + '×' + it.n);
        }
    }
    return parts.join(' + ');
}

// ───────────────────────── 引导 ─────────────────────────

export function guideOpen (p: { guideStep: number }): boolean {
    return p.guideStep < GUIDE_DONE;
}

export function guideAdvance (p: { guideStep: number }): boolean {
    if (p.guideStep >= GUIDE_DONE) return false;
    p.guideStep += 1;
    return true;
}

// ───────────────────────── 签到 ─────────────────────────

export interface SignView {
    /** 今天可领的下标；今天已领完则为 -1 */
    next: number;
    can: boolean;
    claimed: boolean[];
}

export function signView (p: RetentionPlayer, now: number): SignView {
    const next = ((p.loginDay % 7) + 7) % 7;
    const can = p.lastLoginTs <= 0 || localDay(p.lastLoginTs) !== localDay(now);
    const claimed = [false, false, false, false, false, false, false];
    // 领完第 7 天后 loginDay 回到 0。当天还要能看出 7 格都领过。
    if (!can && next === 0 && p.lastLoginTs > 0) {
        for (let i = 0; i < 7; i++) claimed[i] = true;
        return { next: -1, can: false, claimed };
    }
    for (let i = 0; i < next; i++) claimed[i] = true;
    return { next, can, claimed };
}

export function claimSign (p: RetentionPlayer, now: number): { ok: boolean; index: number; reward: Grant | null } {
    const view = signView(p, now);
    if (!view.can || view.next < 0) return { ok: false, index: -1, reward: null };
    const reward = SIGN_REWARDS[view.next];
    applyGrant(p, reward);
    p.loginDay = (view.next + 1) % 7;
    p.lastLoginTs = now;
    return { ok: true, index: view.next, reward };
}

// ───────────────────────── 七日任务 ─────────────────────────

export function weekValue (p: RetentionPlayer, index: number): number {
    if (index < 0 || index >= WEEK_TASKS.length) return 0;
    const stageId = WEEK_STAGE_CLEAR[index];
    if (stageId > 0) {
        const cleared = p.maxStageId >= stageId || (p.stageStars[stageId] || 0) > 0;
        return cleared ? 1 : 0;
    }
    if (index === 1) return p.lineup.length;
    if (index === 2 || index === 5) return p.recruited;
    if (index === 3) return p.levelUps;
    return 0;
}

export function weekReady (p: RetentionPlayer, index: number): boolean {
    if (index < 0 || index >= WEEK_TASKS.length) return false;
    if ((p.weekClaimed & (1 << index)) !== 0) return false;
    return weekValue(p, index) >= WEEK_TASKS[index].goal;
}

export function claimWeek (p: RetentionPlayer, index: number): { ok: boolean; reward: Grant | null } {
    if (index < 0 || index >= WEEK_TASKS.length) return { ok: false, reward: null };
    if ((p.weekClaimed & (1 << index)) !== 0) return { ok: false, reward: null };
    if (weekValue(p, index) < WEEK_TASKS[index].goal) return { ok: false, reward: null };
    const reward = WEEK_TASKS[index].reward;
    p.weekClaimed = p.weekClaimed | (1 << index);
    applyGrant(p, reward);
    return { ok: true, reward };
}

// ───────────────────────── 今日目标 ─────────────────────────

export function syncGoal (p: RetentionPlayer, now: number): boolean {
    const day = localDay(now);
    if (p.goalDay === day) return false;
    p.goalDay = day;
    p.goalStage = 0;
    p.goalRecruit = 0;
    p.goalUpgrade = 0;
    p.goalClaimed = false;
    return true;
}

export function noteStage (p: RetentionPlayer, now: number): void {
    syncGoal(p, now);
    p.goalStage += 1;
}

export function noteRecruit (p: RetentionPlayer, n: number, now: number): void {
    syncGoal(p, now);
    if (n > 0) p.goalRecruit += n;
}

export function noteUpgrade (p: RetentionPlayer, n: number, now: number): void {
    syncGoal(p, now);
    if (n > 0) {
        p.levelUps += n;
        p.goalUpgrade += n;
    }
}

export function goalReady (p: RetentionPlayer, now: number): boolean {
    syncGoal(p, now);
    return !p.goalClaimed
        && p.goalStage >= GOAL_NEED.stage
        && p.goalRecruit >= GOAL_NEED.recruit
        && p.goalUpgrade >= GOAL_NEED.upgrade;
}

export function claimGoal (p: RetentionPlayer, now: number): boolean {
    if (!goalReady(p, now)) return false;
    applyGrant(p, GOAL_REWARD);
    p.goalClaimed = true;
    return true;
}

// ───────────────────────── 日常副本 ─────────────────────────

export function dungeonIndex (kind: DungeonKind): number {
    switch (kind) {
        case 'exp': return 0;
        case 'silver': return 1;
        case 'adv': return 2;
        default: return assertNever(kind);
    }
}

export function syncDungeon (p: RetentionPlayer, now: number): boolean {
    const day = localDay(now);
    if (p.dungeonDay === day) return false;
    p.dungeonDay = day;
    p.dungeonUsed = [0, 0, 0];
    p.dungeonExtra = [0, 0, 0];
    return true;
}

export interface DungeonQuota {
    used: number;
    cap: number;
    extra: boolean;
    left: number;
}

export function dungeonQuota (p: RetentionPlayer, kind: DungeonKind, now: number): DungeonQuota {
    syncDungeon(p, now);
    const i = dungeonIndex(kind);
    const extra = p.dungeonExtra[i] > 0;
    const cap = DUNGEON_FREE + (extra ? DUNGEON_EXTRA : 0);
    const used = p.dungeonUsed[i];
    return { used, cap, extra, left: Math.max(0, cap - used) };
}

export function canDungeon (p: RetentionPlayer, kind: DungeonKind, now: number): boolean {
    return dungeonQuota(p, kind, now).left > 0;
}

/** 激励视频降级成功后调用。每天每类最多加 1 次，使上限变成 3。 */
export function grantDungeonExtra (p: RetentionPlayer, kind: DungeonKind, now: number): boolean {
    syncDungeon(p, now);
    const i = dungeonIndex(kind);
    if (p.dungeonExtra[i]) return false;
    p.dungeonExtra[i] = 1;
    return true;
}

function scaleCount (base: number, level: number): number {
    const lv = Math.max(1, Math.floor(level || 1));
    return Math.max(base, Math.round(base * (1 + (lv - 1) * 0.02)));
}

export function dungeonReward (kind: DungeonKind, level: number): Grant {
    const base = DUNGEON_BASE[kind];
    const out: Grant = {};
    if (base.silver) out.silver = scaleCount(base.silver, level);
    if (base.jade) out.jade = scaleCount(base.jade, level);
    if (base.items) {
        out.items = [];
        for (let i = 0; i < base.items.length; i++) {
            const it = base.items[i];
            out.items.push({ id: it.id, n: scaleCount(it.n, level) });
        }
    }
    return out;
}

/**
 * 胜利扣 1 次并发奖。失败不改次数、不发奖。
 * 次数不够时胜利也不发，避免重复结算。
 */
export function settleDungeon (p: RetentionPlayer, kind: DungeonKind, win: boolean, now: number, level: number): Grant | null {
    syncDungeon(p, now);
    if (!win) return null;
    const i = dungeonIndex(kind);
    const extra = p.dungeonExtra[i] > 0;
    const cap = DUNGEON_FREE + (extra ? DUNGEON_EXTRA : 0);
    if (p.dungeonUsed[i] >= cap) return null;
    p.dungeonUsed[i] += 1;
    const reward = dungeonReward(kind, level);
    applyGrant(p, reward);
    return reward;
}

/** 敌将 id 来自现有配置；人数复用第 1 章的 stageEnemyCountFor，等级由调用方传主公等级。 */
export function dungeonEnemyIds (kind: DungeonKind, lineupLen: number): number[] {
    const n = BAL.stageEnemyCountFor(1, 0, Math.max(1, Math.floor(lineupLen || 1)));
    const pool = DUNGEON_POOLS[kind];
    const ids: number[] = [];
    for (let i = 0; i < n; i++) ids.push(pool[i % pool.length]);
    return ids;
}

export function dungeonTitle (kind: DungeonKind): string {
    switch (kind) {
        case 'exp': return TXT.daily.expName;
        case 'silver': return TXT.daily.silverName;
        case 'adv': return TXT.daily.advName;
        default: return assertNever(kind);
    }
}

export function syncDaily (p: RetentionPlayer, now: number): boolean {
    const a = syncGoal(p, now);
    const b = syncDungeon(p, now);
    return a || b;
}

export { DUNGEON_ORDER, GOAL_NEED, GUIDE_DONE };

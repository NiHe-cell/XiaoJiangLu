/**
 * 留存规则脚本验收。不启动 Cocos，直接驱动 Retention。
 * 运行：npx esbuild tools/retention-check.ts --bundle --platform=node --format=cjs --outfile=/tmp/retention-check.cjs && node /tmp/retention-check.cjs
 */
import * as fs from 'fs';
import * as path from 'path';
import { BAL } from '../assets/scripts/data/Balance';
import { HERO_CONF } from '../assets/scripts/data/HeroConf';
import { REWARDED_CONF, INTERSTITIAL_CONF, BANNER_CONF } from '../assets/scripts/data/AdConf';
import {
    DAILY_CLAIM_H,
    DAILY_CLAIM_W,
    DAILY_CLAIM_X,
    DAILY_ROW0_Y,
    DAILY_ROW_STEP,
    DAILY_TAB_H,
    DAILY_TAB_W,
    DAILY_TAB_XS,
    DAILY_TAB_Y,
    DUNGEON_BASE,
    DUNGEON_BTN_H,
    DUNGEON_BTN_W,
    DUNGEON_BTN_XS,
    DUNGEON_BTN_Y,
    DUNGEON_CARD_YS,
    DUNGEON_ORDER,
    GOAL_NEED,
    GUIDE_DONE,
    GUIDE_STAGE_ID,
    HERO_ACK,
    HitRect,
    HOME_ADJUST,
    HOME_GO,
    HOME_GOAL_CLAIM,
    HOME_RECRUIT,
    LINEUP_ACT,
    RECRUIT_ONCE,
    RESULT_TRAIN,
    SIGN_REWARDS,
    TOP_BACK,
    WEEK_TASKS,
    guideTipY,
    navHit,
} from '../assets/scripts/data/RetentionConf';
import { TXT } from '../assets/scripts/data/TextConf';
import {
    RetentionPlayer,
    canDungeon,
    claimGoal,
    claimSign,
    claimWeek,
    dungeonEnemyIds,
    dungeonQuota,
    dungeonReward,
    grantDungeonExtra,
    guideAdvance,
    guideOpen,
    localDay,
    migrateOnto,
    newRetentionState,
    noteRecruit,
    noteStage,
    noteUpgrade,
    settleDungeon,
    signView,
    weekReady,
} from '../assets/scripts/core/Retention';

function findRoot (): string {
    let dir = process.cwd();
    for (let i = 0; i < 6; i++) {
        if (fs.existsSync(path.join(dir, 'GAME.md')) && fs.existsSync(path.join(dir, 'assets/scripts/core/Retention.ts'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    throw new Error('找不到工程根');
}

const root = findRoot();
let failed = 0;

function eq (actual: any, expected: any, label: string): void {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
        failed += 1;
        console.error('FAIL', label, 'got', a, 'want', e);
    }
}

function ok (cond: boolean, label: string): void {
    if (!cond) {
        failed += 1;
        console.error('FAIL', label);
    }
}

function chars (s: string): number {
    return Array.from(s).length;
}

function blank (): RetentionPlayer {
    return {
        level: 1,
        silver: 0,
        jade: 0,
        items: {},
        lineup: [1000, 1001, 1002],
        recruited: 0,
        maxStageId: 100,
        stageStars: {},
        loginDay: 0,
        lastLoginTs: 0,
        ...newRetentionState(),
    };
}

function day (y: number, m: number, d: number, h = 12): number {
    return new Date(y, m - 1, d, h, 0, 0).getTime();
}

function item (p: RetentionPlayer, id: number): number {
    return p.items[id] || 0;
}

// ── 引导：新档走完 5 步并持久化；已完成 / 老档不再强制 ──
{
    const p = blank();
    ok(guideOpen(p), '新档要出现引导');
    eq(p.guideStep, 0, '新档从第 0 步开始');
    for (let i = 0; i < 5; i++) ok(guideAdvance(p), '第 ' + (i + 1) + ' 步能前进');
    ok(!guideAdvance(p), '走完不再前进');
    eq(p.guideStep, GUIDE_DONE, '五步之后是完成态');
    ok(!guideOpen(p), '完成后不再强制引导');
    const saved = JSON.parse(JSON.stringify(p));
    const loaded = blank();
    Object.assign(loaded, saved);
    migrateOnto(loaded, saved);
    eq(loaded.guideStep, GUIDE_DONE, '读档后引导进度还在');
    ok(!guideOpen(loaded), '读回的完成档不再强制引导');
}

{
    const raw: any = {
        heroes: { 1000: { level: 4 }, 1001: { level: 2 } },
        lineup: [1000, 1001, 1002],
        loginDay: 3,
        lastLoginTs: 12345,
        silver: 9,
        jade: 8,
        items: { 5001: 2 },
        stageStars: {},
        maxStageId: 102,
        recruited: 1,
        level: 5,
    };
    const p = blank();
    Object.assign(p, raw);
    migrateOnto(p, raw);
    eq(p.guideStep, GUIDE_DONE, '老档没有 guideStep 视为已完成');
    ok(!guideOpen(p), '老档不再强制引导');
    eq(p.levelUps, 4, '老档用武将等级差补升级次数');
    eq(p.loginDay, 3, '老档签到进度保留');
    eq(p.lastLoginTs, 12345, '老档上次签到时间保留');
    eq(p.silver, 9, '老档银币不被重置');
}

{
    const raw: any = { guideStep: 2, heroes: {}, lineup: [], loginDay: 0, lastLoginTs: 0 };
    const p = blank();
    Object.assign(p, raw);
    migrateOnto(p, raw);
    eq(p.guideStep, 2, '写明了引导进度的档按进度续');
    ok(guideOpen(p), '没走完的档继续引导');
}

// ── 签到 ──
{
    const p = blank();
    const d1 = day(2026, 11, 14, 9);
    const d1late = day(2026, 11, 14, 21);
    const d2 = day(2026, 11, 15);
    ok(localDay(d1) === localDay(d1late), '同一本地日');
    ok(localDay(d1) !== localDay(d2), '跨日本地日不同');

    const silver0 = p.silver;
    const jade0 = p.jade;
    const first = claimSign(p, d1);
    ok(first.ok && first.index === 0, '第 1 天可领');
    eq(p.silver, silver0 + 2000, '第 1 天银币 2000');
    const again = claimSign(p, d1late);
    ok(!again.ok, '同一天不能领两次');
    eq(p.silver, silver0 + 2000, '重复领取不加银币');

    const second = claimSign(p, d2);
    ok(second.ok && second.index === 1, '跨天领下一格');
    eq(item(p, 5001), 5, '第 2 天小还丹×5');

    // 漏一天，进度不重置，领的是第 3 格而不是第 1 格
    const skipped = claimSign(p, day(2026, 11, 17));
    ok(skipped.ok && skipped.index === 2, '漏签不重置');
    eq(p.jade, jade0 + 50, '第 3 天将玉 50');

    ok(claimSign(p, day(2026, 11, 18)).index === 3, '第 4 天');
    eq(item(p, 5103), 2, '第 4 天进阶丹×2');
    ok(claimSign(p, day(2026, 11, 19)).index === 4, '第 5 天');
    eq(item(p, 5002), 3, '第 5 天培元丹×3');
    const silverBefore6 = p.silver;
    const jadeBefore6 = p.jade;
    ok(claimSign(p, day(2026, 11, 20)).index === 5, '第 6 天');
    eq(p.jade, jadeBefore6 + 80, '第 6 天将玉 80');
    eq(p.silver, silverBefore6 + 5000, '第 6 天银币 5000');
    const jadeBefore7 = p.jade;
    const danBefore7 = item(p, 5103);
    const seventh = claimSign(p, day(2026, 11, 21));
    ok(seventh.ok && seventh.index === 6, '第 7 天');
    eq(p.jade, jadeBefore7 + 150, '第 7 天将玉 150');
    eq(item(p, 5103), danBefore7 + 5, '第 7 天进阶丹×5');
    eq(p.loginDay, 0, '领完第 7 天回到第 1 格');
    const view = signView(p, day(2026, 11, 21, 20));
    ok(!view.can && view.claimed.every((v) => v), '当天 7 格都显示已领');
    ok(!claimSign(p, day(2026, 11, 21, 22)).ok, '第 7 天当天不能再领');

    const silverBeforeNext = p.silver;
    const eighth = claimSign(p, day(2026, 11, 22));
    ok(eighth.ok && eighth.index === 0, '下一轮从第 1 天再开');
    eq(p.silver, silverBeforeNext + 2000, '新一轮第 1 天仍是银币 2000');
}

// ── 七日任务 ──
{
    const p = blank();
    ok(!weekReady(p, 0), '没通第 1 关不能领');
    p.maxStageId = 101;
    ok(weekReady(p, 0), '通关 101 可领');
    const silver0 = p.silver;
    ok(claimWeek(p, 0).ok, '任务 1 发放');
    eq(p.silver, silver0 + 3000, '任务 1 银币 3000');
    ok(!claimWeek(p, 0).ok, '任务 1 不重复发放');
    eq(p.silver, silver0 + 3000, '重复领取不加银币');

    p.lineup = [1];
    ok(!weekReady(p, 1), '上阵不足 3 人');
    p.lineup = [1, 2, 3];
    ok(weekReady(p, 1), '上阵满 3 人');
    ok(claimWeek(p, 1).ok, '任务 2 发放');
    eq(item(p, 5001), 10, '任务 2 小还丹×10');
    ok(!claimWeek(p, 1).ok, '任务 2 不重复');

    ok(!weekReady(p, 2), '还没招募');
    p.recruited = 1;
    ok(weekReady(p, 2), '招募 1 次可领');
    const jade0 = p.jade;
    ok(claimWeek(p, 2).ok, '任务 3 发放');
    eq(p.jade, jade0 + 30, '任务 3 将玉 30');

    ok(!weekReady(p, 3), '还没升级');
    noteUpgrade(p, 1, day(2026, 11, 14));
    ok(weekReady(p, 3), '升级 1 次可领');
    ok(claimWeek(p, 3).ok, '任务 4 发放');
    eq(item(p, 5002), 2, '任务 4 培元丹×2');

    ok(!weekReady(p, 4), '没通第 3 关');
    p.maxStageId = 103;
    ok(claimWeek(p, 4).ok, '任务 5 发放');
    eq(item(p, 5103), 2, '任务 5 进阶丹×2');

    ok(!weekReady(p, 5), '招募还没到 3 次');
    noteRecruit(p, 2, day(2026, 11, 14));
    p.recruited = 3;
    ok(weekReady(p, 5), '累计招募 3 次');
    const jade1 = p.jade;
    ok(claimWeek(p, 5).ok, '任务 6 发放');
    eq(p.jade, jade1 + 80, '任务 6 将玉 80');

    ok(!weekReady(p, 6), '没通第 6 关');
    p.stageStars[106] = 1;
    const jade2 = p.jade;
    const dan = item(p, 5002);
    ok(claimWeek(p, 6).ok, '任务 7 发放');
    eq(p.jade, jade2 + 100, '任务 7 将玉 100');
    eq(item(p, 5002), dan + 3, '任务 7 培元丹×3');
    ok(!claimWeek(p, 6).ok, '任务 7 不重复');
}

// ── 今日目标 ──
{
    const p = blank();
    const t1 = day(2026, 11, 14);
    const t2 = day(2026, 11, 15);
    noteStage(p, t1);
    noteStage(p, t1);
    ok(!claimGoal(p, t1), '没做完不能领');
    noteStage(p, t1);
    noteRecruit(p, 1, t1);
    noteUpgrade(p, 1, t1);
    eq(p.goalStage, GOAL_NEED.stage, '推图累计到 3');
    eq(p.goalRecruit, 1, '招募累计到 1');
    eq(p.goalUpgrade, 1, '强化累计到 1');
    const silver0 = p.silver;
    ok(claimGoal(p, t1), '今日目标可领');
    eq(p.silver, silver0 + 1500, '今日目标银币 1500');
    eq(item(p, 5001), 3, '今日目标小还丹×3');
    ok(!claimGoal(p, t1), '今日目标不重复领');
    eq(p.silver, silver0 + 1500, '重复领取不加银币');
    noteStage(p, t2);
    eq(p.goalStage, 1, '跨日进度清零后重新累计');
    eq(p.goalClaimed, false, '跨日可再领');
}

// ── 副本次数 ──
{
    const p = blank();
    const t1 = day(2026, 11, 14, 10);
    const t2 = day(2026, 11, 15, 10);
    const kinds = DUNGEON_ORDER;
    for (let k = 0; k < kinds.length; k++) {
        const kind = kinds[k];
        const beforeSilver = p.silver;
        const beforeItems = JSON.stringify(p.items);
        const lose = settleDungeon(p, kind, false, t1, 1);
        eq(lose, null, kind + ' 失败不发奖');
        eq(dungeonQuota(p, kind, t1).used, 0, kind + ' 失败不扣次数');
        eq(p.silver, beforeSilver, kind + ' 失败不加银币');
        eq(JSON.stringify(p.items), beforeItems, kind + ' 失败不加道具');
        ok(canDungeon(p, kind, t1), kind + ' 失败后仍能打');

        const win1 = settleDungeon(p, kind, true, t1, 1);
        ok(!!win1, kind + ' 第 1 次胜利发奖');
        const win2 = settleDungeon(p, kind, true, t1, 1);
        ok(!!win2, kind + ' 第 2 次免费胜利');
        eq(dungeonQuota(p, kind, t1).left, 0, kind + ' 免费 2 次用完');
        ok(!canDungeon(p, kind, t1), kind + ' 没有额外次数时不能再进');
        eq(settleDungeon(p, kind, true, t1, 1), null, kind + ' 超额胜利不发奖');
        eq(dungeonQuota(p, kind, t1).used, 2, kind + ' 超额不把次数打穿');

        ok(grantDungeonExtra(p, kind, t1), kind + ' 可以加 1 次');
        ok(!grantDungeonExtra(p, kind, t1), kind + ' 额外次数不能加两次');
        eq(dungeonQuota(p, kind, t1).cap, 3, kind + ' 上限变成 3');
        ok(!!settleDungeon(p, kind, true, t1, 1), kind + ' 第 3 次胜利');
        eq(settleDungeon(p, kind, false, t1, 1), null, kind + ' 用完后失败仍不扣');
        eq(dungeonQuota(p, kind, t1).used, 3, kind + ' 每天最多 3 次');
        ok(!canDungeon(p, kind, t1), kind + ' 3 次后不能再进');

        eq(dungeonQuota(p, kind, t2).used, 0, kind + ' 跨天次数重置');
        eq(dungeonQuota(p, kind, t2).cap, 2, kind + ' 跨天额外次数也重置');
        ok(canDungeon(p, kind, t2), kind + ' 第二天又能打');
    }

    const exp = dungeonReward('exp', 1);
    eq(exp.items, DUNGEON_BASE.exp.items, '1 级经验副本就是基础数量');
    eq(dungeonReward('silver', 1).silver, 8000, '1 级银币副本 8000');
    eq(dungeonReward('adv', 1).items, DUNGEON_BASE.adv.items, '1 级进阶丹副本基础数量');
    eq(dungeonReward('silver', 11).silver, 9600, '等级只做小幅系数');

    const ids = dungeonEnemyIds('exp', 3);
    eq(ids.length, BAL.stageEnemyCountFor(1, 0, 3), '副本人数走现有封顶');
    const known = HERO_CONF.map((h) => h.id);
    for (let i = 0; i < DUNGEON_ORDER.length; i++) {
        const list = dungeonEnemyIds(DUNGEON_ORDER[i], 3);
        for (let j = 0; j < list.length; j++) ok(known.indexOf(list[j]) >= 0, '敌将 id 来自现有配置 ' + list[j]);
    }
    eq(GUIDE_STAGE_ID, 101, '引导开战打第一关');
}

// ── 文案长度、安全区、分辨率、广告位、uuid ──
{
    const tips = [
        TXT.guide.march, TXT.guide.lineup, TXT.guide.fight, TXT.guide.train, TXT.guide.recruit,
        TXT.guide.resumeMarch, TXT.guide.resumeFight, TXT.guide.resumeTrain, TXT.guide.resumeRecruit,
        TXT.guide.confirmTip,
    ];
    for (let i = 0; i < tips.length; i++) ok(chars(tips[i]) <= 14, '教学不超过 14 字: ' + tips[i]);
    const buttons = [
        TXT.guide.fightBtn, TXT.daily.sign, TXT.daily.week, TXT.daily.dungeon, TXT.daily.claim,
        TXT.daily.claimed, TXT.daily.challenge, TXT.daily.extra, TXT.daily.go, TXT.daily.done,
        TXT.common.confirm, TXT.common.train, TXT.common.gotIt, TXT.common.back,
    ];
    for (let i = 0; i < buttons.length; i++) ok(chars(buttons[i]) <= 4, '按钮不超过 4 字: ' + buttons[i]);
    const toasts = [
        TXT.guide.done, TXT.daily.signOk, TXT.daily.notDone, TXT.daily.already, TXT.daily.goalOk,
        TXT.daily.extraOk, TXT.daily.noAttempt, TXT.daily.failKeep, TXT.daily.giveUpAsk,
        TXT.daily.lockedDay, TXT.toast.claimedToday, TXT.toast.noStamina, TXT.toast.claimOk,
    ];
    for (let i = 0; i < toasts.length; i++) ok(chars(toasts[i]) <= 12, '提示不超过 12 字: ' + toasts[i]);
    eq(TXT.weekTask.length, WEEK_TASKS.length, '七日任务文案和奖励表对齐');
    eq(SIGN_REWARDS.length, 7, '签到一轮 7 天');
    ok(chars(TXT.home.goalProg) > 0, '今日目标文案在表里');
}

function edgeOk (r: HitRect, label: string): void {
    const left = r.x - r.w / 2;
    const right = r.x + r.w / 2;
    ok(left >= -290 && right <= 290, label + ' 落在安全宽度内 ' + left + '..' + right);
    const y = guideTipY(r.y, r.h);
    const tipTop = y + 32;
    const tipBot = y - 32;
    const holeTop = r.y + r.h / 2;
    const holeBot = r.y - r.h / 2;
    ok(tipBot >= holeTop + 8 || tipTop <= holeBot - 8, label + ' 教学条不挡高亮');
    ok(y > -620 && y < 620, label + ' 教学条在屏内');
}

{
    const hits: { name: string; rect: HitRect }[] = [
        { name: '出征', rect: HOME_GO },
        { name: '调整阵容', rect: HOME_ADJUST },
        { name: '招募快捷', rect: HOME_RECRUIT },
        { name: '今日目标领取', rect: HOME_GOAL_CLAIM },
        { name: '布阵确认', rect: LINEUP_ACT },
        { name: '去养成', rect: RESULT_TRAIN },
        { name: '返回', rect: TOP_BACK },
        { name: '知道了', rect: HERO_ACK },
        { name: '招募一次', rect: RECRUIT_ONCE },
        { name: '阵容导航', rect: navHit('lineup') },
        { name: '武将导航', rect: navHit('hero') },
        { name: '招募导航', rect: navHit('recruit') },
    ];
    for (let i = 0; i < DAILY_TAB_XS.length; i++) {
        hits.push({ name: '日常页签' + i, rect: { x: DAILY_TAB_XS[i], y: DAILY_TAB_Y, w: DAILY_TAB_W, h: DAILY_TAB_H } });
    }
    for (let i = 0; i < 7; i++) {
        hits.push({
            name: '日常行按钮' + i,
            rect: { x: DAILY_CLAIM_X, y: DAILY_ROW0_Y - i * DAILY_ROW_STEP, w: DAILY_CLAIM_W, h: DAILY_CLAIM_H },
        });
    }
    for (let i = 0; i < DUNGEON_CARD_YS.length; i++) {
        for (let j = 0; j < DUNGEON_BTN_XS.length; j++) {
            hits.push({
                name: '副本按钮' + i + '-' + j,
                rect: {
                    x: DUNGEON_BTN_XS[j],
                    y: DUNGEON_CARD_YS[i] + DUNGEON_BTN_Y,
                    w: DUNGEON_BTN_W,
                    h: DUNGEON_BTN_H,
                },
            });
        }
    }
    for (let i = 0; i < hits.length; i++) edgeOk(hits[i].rect, hits[i].name);
}

{
    const project = JSON.parse(fs.readFileSync(path.join(root, 'settings/v2/packages/project.json'), 'utf8'));
    eq(project.general.designResolution.width, 720, '设计宽 720');
    eq(project.general.designResolution.height, 1280, '设计高 1280');
    const theme = fs.readFileSync(path.join(root, 'assets/scripts/core/Theme.ts'), 'utf8');
    ok(theme.indexOf('SAFE_X: 290') >= 0, 'SAFE_X 仍是 290');
    ok(theme.indexOf('export const DESIGN_W = 720') >= 0, 'DESIGN_W 720');
    ok(theme.indexOf('export const DESIGN_H = 1280') >= 0, 'DESIGN_H 1280');
    const common = fs.readFileSync(path.join(root, 'assets/scripts/ui/Common.ts'), 'utf8');
    ok(common.indexOf('n.setPosition(0, -566)') >= 0, '底部导航纵坐标没改');
    ok(common.indexOf('const xs = [-240, -120, 0, 120, 240]') >= 0, '底部导航横坐标没改');
    ok(common.indexOf('nd(it.k, 96, 76') >= 0, '导航热区尺寸没改');
    const wx = JSON.parse(fs.readFileSync(path.join(root, 'build-templates/wechatgame/project.config.json'), 'utf8'));
    eq(wx.appid, '', '模板 appid 仍为空');
    for (let i = 0; i < REWARDED_CONF.length; i++) eq(REWARDED_CONF[i].adUnitId, '', '激励视频位仍是空 ID ' + REWARDED_CONF[i].key);
    eq(INTERSTITIAL_CONF.adUnitId, '', '插屏位仍是空 ID');
    eq(BANNER_CONF.adUnitId, '', 'Banner 位仍是空 ID');
    const storeSrc = fs.readFileSync(path.join(root, 'assets/scripts/core/Store.ts'), 'utf8');
    ok(storeSrc.indexOf('const k = 1 + g * 0.035;') >= 0, '敌方属性系数没改');
    const battleSrc = fs.readFileSync(path.join(root, 'assets/scripts/ui/BattlePanel.ts'), 'utf8');
    const finishAt = battleSrc.indexOf('private finish ()');
    const dungeonAt = battleSrc.indexOf('this.finishDungeon()', finishAt);
    const staminaAt = battleSrc.indexOf('Store.addStamina(-BAL.staminaPerStage)', finishAt);
    ok(dungeonAt > finishAt && staminaAt > dungeonAt, '副本结算在扣体力之前返回');
    ok(battleSrc.indexOf('private finishDungeon') >= 0, '副本结算单独走');
    const battleCore = fs.readFileSync(path.join(root, 'assets/scripts/model/BattleCore.ts'), 'utf8');
    ok(battleCore.indexOf('DMG_SCALE') < 0, 'BattleCore 继续不写伤害系数');
}

{
    const uuids: { [id: string]: string } = {};
    const stack = [path.join(root, 'assets')];
    while (stack.length) {
        const dir = stack.pop() as string;
        const names = fs.readdirSync(dir);
        for (let i = 0; i < names.length; i++) {
            const full = path.join(dir, names[i]);
            const st = fs.statSync(full);
            if (st.isDirectory()) stack.push(full);
            else if (names[i].endsWith('.meta')) {
                const meta = JSON.parse(fs.readFileSync(full, 'utf8'));
                if (!meta.uuid) continue;
                ok(!uuids[meta.uuid], 'uuid 冲突 ' + meta.uuid + ' ' + full);
                uuids[meta.uuid] = full;
            }
        }
    }
    const fresh = [
        'assets/scripts/data/RetentionConf.ts.meta',
        'assets/scripts/core/Retention.ts.meta',
        'assets/scripts/ui/GuideLayer.ts.meta',
        'assets/scripts/ui/DailyPanel.ts.meta',
    ];
    for (let i = 0; i < fresh.length; i++) {
        const meta = JSON.parse(fs.readFileSync(path.join(root, fresh[i]), 'utf8'));
        eq(meta.importer, 'typescript', fresh[i] + ' importer');
        eq(meta.ver, '4.0.24', fresh[i] + ' ver');
        ok(!!uuids[meta.uuid], fresh[i] + ' 已计入全库');
    }
}

if (failed) {
    console.error('retention-check FAILED', failed);
    process.exit(1);
}
console.log('retention-check OK');

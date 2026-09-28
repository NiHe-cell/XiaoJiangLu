/**
 * 战斗模拟器（Node 直接跑，不依赖 cc）
 * 目的：给 docs/战斗规格-裴策.md 提供实证数据
 *   ① 不死循环 ② 胜负分布合理 ③ 平均回合数 3-8 ④ 无 NaN / 负血
 *
 * 用法：
 *   node tools/sim.js           全 48 关，每关 40 局
 *   node tools/sim.js 20 brief  每关 20 局 + 只打汇总行
 * 依赖：tools/.sim（先把 assets/scripts 下纯逻辑层编译过去，见 tools/build-sim.sh）
 */
const path = require('path');
const D = path.join(__dirname, '.sim');
const { HERO_MAP } = require(path.join(D, 'data/HeroConf'));
const { BAL } = require(path.join(D, 'data/Balance'));
const { STAGE_CONF } = require(path.join(D, 'data/StageConf'));
const { BOND_CONF } = require(path.join(D, 'data/BondConf'));
const { BattleCore, autoBattle } = require(path.join(D, 'model/BattleCore'));

// ── 复刻 Store 的属性公式（保证模拟与线上同口径）──
function playerAttr (confId, level, star, adv) {
    const c = HERO_MAP[confId]; const g = Math.max(0, level - 1);
    const starMul = 1 + (star - 1) * 0.12; const advMul = 1 + adv * 0.09;
    return {
        hp: Math.floor((c.baseHp + c.growHp * g) * starMul * advMul),
        atk: Math.floor((c.baseAtk + c.growAtk * g) * starMul * advMul),
        pdef: Math.floor((c.basePdef + c.growPdef * g) * starMul * advMul),
        mdef: Math.floor((c.baseMdef + c.growMdef * g) * starMul * advMul),
        speed: c.baseSpeed,
    };
}
// 默认值必须跟 Store.enemyAttr 保持一致（运行时已是 0.035）。
// 之前默认 0.06 而运行时 0.035，不带 ENEMY_K 跑出来的胜率会凭空低 25 个百分点，
// 很容易被误读成"改坏了"。仍可用环境变量覆盖做对照实验。
const ENEMY_K_COEF = Number(process.env.ENEMY_K || 0.035);
function enemyAttr (confId, level) {
    const c = HERO_MAP[confId]; const g = Math.max(0, level - 1); const k = 1 + g * ENEMY_K_COEF;
    return {
        hp: Math.floor((c.baseHp + c.growHp * g) * k), atk: Math.floor((c.baseAtk + c.growAtk * g) * k),
        pdef: Math.floor((c.basePdef + c.growPdef * g) * k), mdef: Math.floor((c.baseMdef + c.growMdef * g) * k), speed: c.baseSpeed,
    };
}

// ── 玩家进度假设 [待数值验证] ──
let LV_DELTA = Number(process.env.LV_DELTA || 0);
function rosterOf (chapter) {
    switch (chapter) {
        case 1: return { ids: [1000, 1001, 1002], star: 1, adv: 0, lvUp: 0 };                      // 开局默认阵容
        case 2: return { ids: [1000, 1001, 1002, 1036], star: 2, adv: 0, lvUp: 2 };
        case 3: return { ids: [1000, 1011, 1012, 1013, 1036], star: 3, adv: 2, lvUp: 3 };          // 桃园结义 + 刮骨疗毒
        case 4: return { ids: [1000, 1011, 1012, 1013, 1014], star: 4, adv: 4, lvUp: 3 };
        case 5: return { ids: [1000, 1011, 1012, 1013, 1014, 1015], star: 5, adv: 5, lvUp: 4 };     // 五虎齐鸣
        default: return { ids: [1000, 1012, 1013, 1014, 1015, 1016], star: 5, adv: 6, lvUp: 5 };    // 五虎齐鸣（成型）
    }
}

/** 按 role 排站位：坦/物攻前排，法/辅后排（模拟真人会怎么摆，避免全是前排被顺劈） */
function assignSlots (ids) {
    const order = [4, 1, 3, 2]; // Tank, Phys, Support, Magic
    const seat = {};
    let f = 0; let b = 3;
    const sorted = ids.slice().sort((a, x) => order.indexOf(HERO_MAP[a].role) - order.indexOf(HERO_MAP[x].role));
    for (const id of sorted) {
        const r = HERO_MAP[id].role;
        const wantFront = r === 4 || r === 1;
        if (wantFront) {
            if (f < 3) { seat[id] = f++; } else if (b < 6) { seat[id] = b++; } else { seat[id] = -1; }
        } else {
            if (b < 6) { seat[id] = b++; } else if (f < 3) { seat[id] = f++; } else { seat[id] = -1; }
        }
    }
    return (i, id) => (seat[id] >= 0 ? seat[id] : i);
}

function enemyCount (chapter, index0, allyN) {
    const base = BAL.stageEnemyCount(chapter, index0);
    let cap = allyN;
    if (chapter >= 3) cap = allyN + 1;
    if (chapter >= 5) cap = allyN + 2;
    return Math.max(1, Math.min(6, Math.min(base, cap)));
}

function buildUnits (stage) {
    const line = rosterOf(stage.chapter);
    const lv = BAL.stageEnemyLevel(stage.chapter, stage.index - 1);
    const plv = Math.max(1, lv + line.lvUp + LV_DELTA);
    const units = [];
    let uid = 1;
    const mySlot = assignSlots(line.ids);
    line.ids.forEach((confId, i) => {
        const a = playerAttr(confId, plv, line.star, line.adv); const c = HERO_MAP[confId];
        let comboSkillId = 0; let bondId = 0;
        for (const b of BOND_CONF) {
            if (b.heroIds.indexOf(confId) >= 0 && b.heroIds.every((h) => line.ids.indexOf(h) >= 0)) {
                comboSkillId = b.comboSkillId; bondId = b.id; break;
            }
        }
        units.push({
            uid: uid++, side: 0, confId, slot: mySlot(i, confId), hp: a.hp, maxHp: a.hp, atk: a.atk,
            pdef: a.pdef, mdef: a.mdef, speed: a.speed, rage: BAL.rageInit,
            role: c.role, skillId: c.skillId, comboSkillId, bondId, alive: true, buffs: [],
        });
    });
    const rawCount = enemyCount(stage.chapter, stage.index - 1, line.ids.length);
    const eCount = Math.min(rawCount, Math.max(1, stage.enemyIds.length * 2)); // 同武将最多复刻一次
    const eIds = [];
    for (let i = 0; i < eCount; i++) eIds.push(stage.enemyIds[i % stage.enemyIds.length]);
    const eSlot = assignSlots(eIds);
    eIds.forEach((confId, i) => {
        const a = enemyAttr(confId, lv); const c = HERO_MAP[confId];
        units.push({
            uid: uid++, side: 1, confId, slot: eSlot(i, confId), hp: a.hp, maxHp: a.hp, atk: a.atk,
            pdef: a.pdef, mdef: a.mdef, speed: a.speed, rage: BAL.rageInit,
            role: c.role, skillId: c.skillId, comboSkillId: 0, bondId: 0, alive: true, buffs: [],
        });
    });
    return { units, lv, plv, eCount };
}

function runOne (stage, seed) {
    const built = buildUnits(stage);
    const core = new BattleCore(built.units, seed);
    const log = autoBattle(core, true);
    let bad = '';
    for (const u of core.units) {
        if (!isFinite(u.hp) || !isFinite(u.atk) || !isFinite(u.rage)) bad += `NaN:${u.uid} `;
        if (u.hp < 0) bad += `负血:${u.uid} `;
        if (u.hp > u.maxHp) bad += `超血:${u.uid} `;
        if (u.rage < 0 || u.rage > BAL.rageMax) bad += `怒气越界:${u.uid} `;
    }
    for (const e of log) {
        if (e.k === 'atk' && (!isFinite(e.dmg) || e.dmg <= 0)) bad += `伤害异常 `;
        if (e.k === 'skill' || e.k === 'combo') {
            for (let i = 0; i < e.dmg.length; i++) {
                if (!isFinite(e.dmg[i]) || e.dmg[i] < 0) bad += `技能伤害异常 `;
            }
        }
        if (e.k === 'heal' && (!isFinite(e.val) || e.val < 0)) bad += `治疗异常 `;
    }
    let comboN = 0; let skillN = 0; let hitPct = 0; let hitN = 0;
    for (const e of log) {
        if (e.k === 'combo') comboN++;
        if (e.k === 'skill') skillN++;
        if (e.k === 'atk') { const t = core.get(e.to); if (t && t.maxHp > 0) { hitPct += e.dmg / t.maxHp; hitN++; } }
    }
    const dead = core.units.filter((u) => u.side === 0 && !u.alive).length;
    return {
        win: core.winner() === 0 ? 1 : 0, rounds: core.round, dead,
        stars: core.winner() === 0 ? BAL.calcStars(core.round, dead) : 0,
        steps: log.length, comboN, skillN, bad, hitPct: hitN ? hitPct / hitN : 0, timeout: core.round >= BAL.maxRound ? 1 : 0,
    };
}

const N = Number(process.argv[2] || 40);
const BRIEF = process.argv.indexOf('brief') >= 0;
const MODE = process.argv.indexOf('asis') >= 0 ? 'asis' : 'capped';

if (!BRIEF) console.log(`模式=${MODE}  每组 ${N} 局  DMG_SCALE 见 tools/.sim/data/Balance.js`);
if (!BRIEF) console.log('关卡   敌 我方(星/进/级)   胜率    回合(均/中/最大) 阵亡 三星 合击/必杀 异常');
let allBad = 0; let allRounds = 0; let allWin = 0; let allSteps = 0; let cnt = 0; let allS3 = 0; let allDead = 0; let allHit = 0; let allTO = 0;
const roundBuckets = {};
for (const st of STAGE_CONF) {
    const built = buildUnits(st);
    const line = rosterOf(st.chapter);
    let w = 0; const rs = []; let dead = 0; let s3 = 0; let combo = 0; let skill = 0; let bad = 0; let steps = 0; let sumHit = 0; let timeouts = 0;
    for (let s = 0; s < N; s++) {
        const r = runOne(st, s * 7919 + 13 + st.id);
        w += r.win; rs.push(r.rounds); dead += r.dead; if (r.stars === 3) s3++;
        combo += r.comboN; skill += r.skillN; steps += r.steps; sumHit += r.hitPct; timeouts += r.timeout;
        if (r.bad) { bad++; if (!BRIEF) console.log(`  !! 关卡 ${st.id} seed${s}: ${r.bad}`); }
    }
    rs.sort((a, b) => a - b);
    const avg = rs.reduce((a, b) => a + b, 0) / rs.length;
    const mid = rs[Math.floor(rs.length / 2)];
    if (!BRIEF) {
        console.log(
            `${String(st.id).padEnd(6)} ${String(built.eCount).padEnd(2)} ${line.star}/${line.adv}/${built.plv}`.padEnd(21) +
            `${(w / N * 100).toFixed(0).padStart(4)}%  ${avg.toFixed(1)}/${mid}/${rs[rs.length - 1]}`.padEnd(22) +
            `${(dead / N).toFixed(1)}  ${(s3 / N * 100).toFixed(0)}%  ${(combo / N).toFixed(1)}/${(skill / N).toFixed(1)}  ${bad}`
        );
    }
    allTO += timeouts / N; allHit += sumHit / N; allBad += bad; allRounds += avg; allWin += w / N; allSteps += steps / N; allS3 += s3 / N; allDead += dead / N; cnt++;
    rs.forEach((r) => { roundBuckets[r] = (roundBuckets[r] || 0) + 1; });
}
console.log('---- 分章汇总 ----');
for (const ch of [1,2,3,4,5,6]) {
    const sts = STAGE_CONF.filter((s) => s.chapter === ch);
    let w=0, r=0, d=0, s3=0, to=0, n=0;
    for (const st of sts) for (let i=0;i<N;i++) {
        const rr = runOne(st, i*7919+13+st.id);
        w+=rr.win; r+=rr.rounds; d+=rr.dead; if(rr.stars===3) s3++; to+=rr.timeout; n++;
    }
    console.log(`第${ch}章 胜率 ${(w/n*100).toFixed(0)}%  平均回合 ${(r/n).toFixed(1)}  场均阵亡 ${(d/n).toFixed(2)}  三星率 ${(s3/n*100).toFixed(0)}%  超时率 ${(to/n*100).toFixed(1)}%`);
}
console.log('---- 汇总 ----');
console.log(`ENEMY_K=${ENEMY_K_COEF} DMG_SCALE=3.0 LV_DELTA=${LV_DELTA} 平均胜率 ${(allWin / cnt * 100).toFixed(1)}%  平均回合 ${(allRounds / cnt).toFixed(2)}  3星率 ${(allS3 / cnt * 100).toFixed(0)}%  场均阵亡 ${(allDead / cnt).toFixed(2)}  普攻平均占目标最大生命 ${(allHit / cnt * 100).toFixed(1)}%  超时率 ${(allTO / cnt * 100).toFixed(1)}%  异常 ${allBad}`);
console.log('回合分布：', Object.keys(roundBuckets).sort((a, b) => a - b).map((k) => `${k}R×${roundBuckets[k]}`).join(' '));

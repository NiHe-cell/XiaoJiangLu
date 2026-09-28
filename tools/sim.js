/** 战斗内核模拟验证（node 直跑，无需引擎） */
const path = require('path');
const { BattleCore } = require(path.join(__dirname, '.sim', 'model', 'BattleCore.js'));
const { BAL } = require(path.join(__dirname, '.sim', 'data', 'Balance.js'));
const { HERO_CONF } = require(path.join(__dirname, '.sim', 'data', 'HeroConf.js'));

function mkUnit (confId, side, slot, uid, lv) {
    const c = HERO_CONF.find((h) => h.id === confId) || HERO_CONF[0];
    const g = Math.max(0, lv - 1);
    const k = 1 + g * 0.06;
    const hp = Math.floor((c.baseHp + c.growHp * g) * k);
    return {
        uid, side, confId, slot, hp, maxHp: hp,
        atk: Math.floor((c.baseAtk + c.growAtk * g) * k),
        pdef: Math.floor((c.basePdef + c.growPdef * g) * k),
        mdef: Math.floor((c.baseMdef + c.growMdef * g) * k),
        speed: c.baseSpeed, rage: 0, role: c.role, skillId: c.skillId,
        comboSkillId: 0, bondId: 0, alive: true, buffs: [],
    };
}

let wins0 = 0, wins1 = 0, totalRound = 0, maxSeen = 0, nan = 0, neg = 0;
const N = 200;
for (let n = 0; n < N; n++) {
    const units = [];
    let uid = 1;
    // 我方：主角 + 前 5 名
    for (let i = 0; i < 4; i++) units.push(mkUnit(HERO_CONF[i].id, 0, i, uid++, 10 + n % 5));
    // 敌方
    for (let i = 0; i < 4; i++) units.push(mkUnit(HERO_CONF[4 + (i % 15)].id, 1, i, uid++, 10 + n % 5));
    const core = new BattleCore(units, n * 7919 + 13);
    let guard = 0;
    while (!core.isEnd() && guard++ < 3000) {
        const id = core.next();
        if (id < 0) break;
        core.act(id, true);
    }
    if (guard >= 3000) { console.error('❌ 死循环！seed', n); process.exit(1); }
    const w = core.winner();
    if (w === 0) wins0++; else wins1++;
    totalRound += core.round;
    maxSeen = Math.max(maxSeen, core.round);
    for (const u of core.units) {
        if (!isFinite(u.hp) || isNaN(u.hp)) nan++;
        if (u.hp < 0) neg++;
    }
}

console.log(`模拟 ${N} 场：我方胜 ${wins0} / 敌方胜 ${wins1}`);
console.log(`平均回合 ${(totalRound / N).toFixed(2)}，最长 ${maxSeen} 回合（上限 ${BAL.maxRound}）`);
console.log(`NaN 血量 ${nan}，负血量 ${neg}`);
const ok = nan === 0 && neg === 0 && maxSeen <= BAL.maxRound + 1;
console.log(ok ? '✅ 战斗内核模拟通过' : '❌ 战斗内核存在异常');
process.exit(ok ? 0 : 1);

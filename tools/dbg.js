/** 单场战斗逐事件打印，用于定位数值异常 */
const path = require('path');
const D = path.join(__dirname, '.sim');
const { HERO_MAP } = require(path.join(D, 'data/HeroConf'));
const { BAL } = require(path.join(D, 'data/Balance'));
const { BattleCore, autoBattle } = require(path.join(D, 'model/BattleCore'));

function pA (id, lv, star, adv) {
    const c = HERO_MAP[id]; const g = lv - 1;
    const sm = 1 + (star - 1) * 0.12; const am = 1 + adv * 0.09;
    return {
        hp: Math.floor((c.baseHp + c.growHp * g) * sm * am), atk: Math.floor((c.baseAtk + c.growAtk * g) * sm * am),
        pdef: Math.floor((c.basePdef + c.growPdef * g) * sm * am), mdef: Math.floor((c.baseMdef + c.growMdef * g) * sm * am), speed: c.baseSpeed,
    };
}
function eA (id, lv) {
    const c = HERO_MAP[id]; const g = Math.max(0, lv - 1); const k = 1 + g * 0.06;
    return {
        hp: Math.floor((c.baseHp + c.growHp * g) * k), atk: Math.floor((c.baseAtk + c.growAtk * g) * k),
        pdef: Math.floor((c.basePdef + c.growPdef * g) * k), mdef: Math.floor((c.baseMdef + c.growMdef * g) * k), speed: c.baseSpeed,
    };
}

const ids0 = (process.argv[2] || '1000,1001,1002').split(',').map(Number);
const ids1 = (process.argv[3] || '1033,1034,1035,1036').split(',').map(Number);
const plv = Number(process.argv[4] || 7);
const lv = Number(process.argv[5] || 7);
const star = Number(process.argv[6] || 1);
const adv = Number(process.argv[7] || 0);

const units = []; let uid = 1;
const mk = (list, side, lv, fn) => list.forEach((id, i) => {
    const a = fn(id, lv); const c = HERO_MAP[id];
    units.push({
        uid: uid++, side, confId: id, slot: i, hp: a.hp, maxHp: a.hp, atk: a.atk, pdef: a.pdef,
        mdef: a.mdef, speed: a.speed, rage: BAL.rageInit, role: c.role, skillId: c.skillId,
        comboSkillId: 0, bondId: 0, alive: true, buffs: [],
    });
});
mk(ids0, 0, plv, (id, l) => pA(id, l, star, adv));
mk(ids1, 1, lv, eA);

console.log('我方 vs 敌方');
for (const u of units) {
    console.log(` ${u.side ? '敌' : '我'} ${HERO_MAP[u.confId].name}\thp=${u.hp} atk=${u.atk} pdef=${u.pdef} mdef=${u.mdef} spd=${u.speed} role=${u.role} skill=${u.skillId}`);
}
const core = new BattleCore(units, Number(process.argv[8] || 999));
const log = autoBattle(core, true);
console.log('--- 战斗日志 ---');
for (const e of log) {
    const nm = (u) => (core.get(u) ? HERO_MAP[core.get(u).confId].name : '?');
    if (e.k === 'turn') console.log(`R${e.round} ▶ ${nm(e.uid)}`);
    else if (e.k === 'atk') console.log(`   普攻 ${nm(e.from)} → ${nm(e.to)}  ${e.dmg}${e.crit ? '(暴)' : ''}`);
    else if (e.k === 'skill') console.log(`   必杀 ${nm(e.from)}  ${JSON.stringify(e.to.map((t, i) => nm(t) + ':' + e.dmg[i] + (e.heal[i] ? '/+' + e.heal[i] : '')))}`);
    else if (e.k === 'combo') console.log(`   ★合击 ${nm(e.from)} bond=${e.bondId} ${JSON.stringify(e.to.map((t, i) => nm(t) + ':' + e.dmg[i]))}`);
    else if (e.k === 'heal') console.log(`   治疗 ${nm(e.from)} → ${nm(e.to)} +${e.val}`);
    else if (e.k === 'buff') console.log(`   buff ${nm(e.from)} → ${nm(e.to)} ${e.stat}${e.value} t${e.turns}`);
    else if (e.k === 'rage') console.log(`   怒气 ${nm(e.uid)}=${e.val}`);
    else if (e.k === 'die') console.log(`   ✝ ${nm(e.uid)} 阵亡`);
    else if (e.k === 'end') console.log(`=== 结束 winner=${e.winner === 0 ? '我方' : '敌方'} ===`);
}
console.log(`回合数=${core.round} 胜方=${core.winner() === 0 ? '我方' : '敌方'} 我方阵亡=${core.units.filter((u) => u.side === 0 && !u.alive).length}`);

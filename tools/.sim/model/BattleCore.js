"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleCore = void 0;
const SkillConf_1 = require("../data/SkillConf");
const Balance_1 = require("../data/Balance");
/** 可复现随机（mulberry32） */
class Rng {
    constructor(seed) { this.s = seed >>> 0 || 1; }
    next() {
        this.s = (this.s + 0x6D2B79F5) >>> 0;
        let t = this.s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}
class BattleCore {
    constructor(units, seed) {
        this.round = 1;
        this.tickInRound = 0;
        this.ended = false;
        this.winnerSide = 1;
        this.units = units.map((u) => ({ ...u, buffs: [] }));
        this.rng = new Rng(seed);
    }
    // ---------- 查询 ----------
    get(uid) {
        const u = this.units.find((x) => x.uid === uid);
        if (u)
            return u;
        return this.units[0];
    }
    aliveOf(side) {
        return this.units.filter((u) => u.side === side && u.alive);
    }
    isEnd() {
        return this.ended || !this.aliveOf(0).length || !this.aliveOf(1).length;
    }
    winner() {
        if (!this.aliveOf(0).length)
            return 1;
        if (!this.aliveOf(1).length)
            return 0;
        return this.winnerSide;
    }
    /** 出手顺序：速度降序，同速按 slot 升序 */
    order() {
        return this.units
            .filter((u) => u.alive)
            .sort((a, b) => {
            const sa = this.effSpeed(a);
            const sb = this.effSpeed(b);
            if (sb !== sa)
                return sb - sa;
            if (a.side !== b.side)
                return a.side - b.side;
            return a.slot - b.slot;
        })
            .map((u) => u.uid);
    }
    /** 下一个应行动者；-1 表示结束 */
    next() {
        if (this.isEnd())
            return -1;
        const ord = this.order();
        if (!ord.length)
            return -1;
        const i = Math.min(this.tickInRound, ord.length - 1);
        return ord[i];
    }
    // ---------- 行动 ----------
    act(uid, useSkill) {
        const evs = [];
        const u = this.get(uid);
        if (this.ended || !u.alive)
            return evs;
        evs.push({ k: 'turn', uid, round: this.round });
        const useRage = useSkill && u.rage >= Balance_1.BAL.rageMax;
        if (useRage) {
            this.castSkill(u, u.skillId, evs, false);
            u.rage = Balance_1.BAL.rageOnSkill;
            evs.push({ k: 'rage', uid, val: u.rage });
        }
        else {
            this.basicAttack(u, evs);
        }
        this.afterAct(evs);
        return evs;
    }
    /** 羁绊合击：成员全部存活且满怒才可触发 */
    readyCombos() {
        const out = [];
        const seen = {};
        for (const u of this.aliveOf(0)) {
            if (!u.bondId || seen[u.bondId])
                continue;
            seen[u.bondId] = true;
            const members = this.units.filter((m) => m.bondId === u.bondId && m.side === 0);
            if (!members.length)
                continue;
            const ok = members.every((m) => m.alive) && members.some((m) => m.rage >= Balance_1.BAL.rageMax);
            if (ok)
                out.push(u.bondId);
        }
        return out;
    }
    tryCombo(bondId) {
        if (this.ended)
            return null;
        const members = this.units.filter((m) => m.bondId === bondId && m.side === 0);
        if (!members.length)
            return null;
        if (!members.every((m) => m.alive))
            return null;
        if (!members.some((m) => m.rage >= Balance_1.BAL.rageMax))
            return null;
        const caster = members.find((m) => m.rage >= Balance_1.BAL.rageMax) || members[0];
        const evs = [];
        evs.push({ k: 'turn', uid: caster.uid, round: this.round });
        const targets = this.aliveOf(1);
        const dmg = [];
        const to = [];
        const atk = this.effAtk(caster);
        for (const t of targets) {
            const crit = this.rollCrit(caster, 0.15);
            const def = this.effDef(t, caster.role === 2);
            const ratio = 1.6 / Math.max(1, targets.length) * 1.6;
            const d = Balance_1.BAL.calcDamage(atk, def, ratio, crit, this.rng.next());
            t.hp -= d;
            to.push(t.uid);
            dmg.push(d);
        }
        evs.push({ k: 'combo', from: caster.uid, bondId, skillId: caster.comboSkillId, to, dmg });
        for (const m of members) {
            m.rage = 0;
            evs.push({ k: 'rage', uid: m.uid, val: 0 });
        }
        this.resolveDeaths(evs);
        this.afterAct(evs);
        return evs;
    }
    // ---------- 内部 ----------
    basicAttack(u, evs) {
        const foes = this.aliveOf(u.side === 0 ? 1 : 0);
        if (!foes.length)
            return;
        const front = foes.filter((f) => f.slot < 3);
        const pool = front.length ? front : foes;
        let target = pool[0];
        for (const p of pool)
            if (p.hp < target.hp)
                target = p;
        const crit = this.rollCrit(u, 0);
        const def = this.effDef(target, u.role === 2);
        const counter = Balance_1.BAL.typeCounter(u.role, target.role);
        const dmg = Balance_1.BAL.calcDamage(this.effAtk(u), def, 1.0 * counter, crit, this.rng.next());
        target.hp -= dmg;
        evs.push({ k: 'atk', from: u.uid, to: target.uid, dmg, crit });
        this.gainRage(u, Balance_1.BAL.rageOnAttack, evs);
        this.gainRage(target, Balance_1.BAL.rageOnHurt, evs);
        if (target.hp <= 0)
            this.gainRage(u, Balance_1.BAL.rageOnKill, evs);
        this.resolveDeaths(evs);
    }
    castSkill(u, skillId, evs, isCombo) {
        const sk = (0, SkillConf_1.getSkillConf)(skillId);
        const allies = this.aliveOf(u.side);
        const foes = this.aliveOf(u.side === 0 ? 1 : 0);
        let targets = [];
        if (!sk) {
            targets = foes.slice(0, 1);
        }
        else if (sk.target === 'enemyFront') {
            const front = foes.filter((f) => f.slot < 3);
            targets = front.length ? front : foes.slice(0, 1);
        }
        else if (sk.target === 'enemyAll') {
            targets = foes.slice();
        }
        else if (sk.target === 'enemySingleLow') {
            let low = foes[0];
            for (const f of foes)
                if (f.hp / f.maxHp < low.hp / low.maxHp)
                    low = f;
            targets = low ? [low] : [];
        }
        else if (sk.target === 'allyLowest') {
            let low = allies[0];
            for (const a of allies)
                if (a.hp / a.maxHp < low.hp / low.maxHp)
                    low = a;
            targets = low ? [low] : [];
        }
        else if (sk.target === 'allyAll') {
            targets = allies.slice();
        }
        else {
            targets = [u];
        }
        if (!targets.length)
            targets = foes.slice(0, 1);
        if (!targets.length)
            return;
        const hits = sk && sk.hitCount > 1 ? sk.hitCount : 1;
        // 多段总系数与单段对齐，避免多段技能碾压
        const perHit = (sk ? sk.atkRatio : 1.2) / hits * (isCombo ? 1.4 : 1);
        const healRatio = sk ? sk.healRatio : 0;
        const to = [];
        const dmgArr = [];
        const healArr = [];
        const critArr = [];
        for (const t of targets) {
            let total = 0;
            let healed = 0;
            let anyCrit = false;
            for (let h = 0; h < hits; h++) {
                const crit = this.rollCrit(u, sk ? sk.critBonus : 0);
                if (crit)
                    anyCrit = true;
                if (healRatio > 0) {
                    const v = Balance_1.BAL.calcHeal(this.effAtk(u), healRatio / hits, this.rng.next());
                    t.hp = Math.min(t.maxHp, t.hp + v);
                    healed += v;
                }
                if ((sk ? sk.atkRatio : 1) > 0 && t.side !== u.side) {
                    const def = this.effDef(t, u.role === 2);
                    const counter = Balance_1.BAL.typeCounter(u.role, t.role);
                    const d = Balance_1.BAL.calcDamage(this.effAtk(u), def, perHit * counter, crit, this.rng.next());
                    t.hp -= d;
                    total += d;
                }
            }
            to.push(t.uid);
            dmgArr.push(total);
            healArr.push(healed);
            critArr.push(anyCrit);
            if (healed > 0)
                evs.push({ k: 'heal', from: u.uid, to: t.uid, val: healed });
            if (sk && sk.buffs) {
                for (const b of sk.buffs) {
                    if (t.side !== u.side && b.value < 0) {
                        t.buffs.push({ stat: b.stat, value: b.value, turns: b.turns, isPct: b.isPct });
                        evs.push({ k: 'buff', from: u.uid, to: t.uid, stat: b.stat, value: b.value, turns: b.turns });
                    }
                    else if (t.side === u.side && b.value > 0) {
                        t.buffs.push({ stat: b.stat, value: b.value, turns: b.turns, isPct: b.isPct });
                        evs.push({ k: 'buff', from: u.uid, to: t.uid, stat: b.stat, value: b.value, turns: b.turns });
                    }
                }
            }
        }
        evs.push({
            k: 'skill', from: u.uid, skillId, to, dmg: dmgArr, heal: healArr, crit: critArr,
        });
        this.resolveDeaths(evs);
    }
    afterAct(evs) {
        this.tickInRound++;
        const ord = this.order();
        if (this.tickInRound >= Math.max(1, ord.length)) {
            this.tickInRound = 0;
            this.round++;
            this.tickBuffs(evs);
        }
        if (this.round > Balance_1.BAL.maxRound && !this.ended) {
            this.forceEnd(evs);
        }
        this.checkEnd(evs);
    }
    tickBuffs(evs) {
        for (const u of this.units) {
            if (!u.alive || !u.buffs.length)
                continue;
            u.buffs = u.buffs.filter((b) => {
                b.turns -= 1;
                return b.turns > 0;
            });
        }
    }
    forceEnd(evs) {
        const hpOf = (side) => {
            const alive = this.aliveOf(side);
            if (!alive.length)
                return 0;
            let cur = 0;
            let max = 0;
            for (const u of alive) {
                cur += u.hp;
                max += u.maxHp;
            }
            return max ? cur / max : 0;
        };
        this.winnerSide = hpOf(0) >= hpOf(1) ? 0 : 1;
        this.ended = true;
        evs.push({ k: 'end', winner: this.winnerSide });
    }
    checkEnd(evs) {
        if (this.ended)
            return;
        if (!this.aliveOf(0).length || !this.aliveOf(1).length) {
            this.winnerSide = this.aliveOf(0).length ? 0 : 1;
            this.ended = true;
            evs.push({ k: 'end', winner: this.winnerSide });
        }
    }
    resolveDeaths(evs) {
        for (const u of this.units) {
            if (u.alive && u.hp <= 0) {
                u.hp = 0;
                u.alive = false;
                u.buffs.length = 0;
                evs.push({ k: 'die', uid: u.uid });
            }
        }
    }
    gainRage(u, v, evs) {
        if (!u.alive || v <= 0)
            return;
        u.rage = Math.min(Balance_1.BAL.rageMax, u.rage + v);
        evs.push({ k: 'rage', uid: u.uid, val: u.rage });
    }
    rollCrit(u, bonus) {
        let c = Balance_1.BAL.critBase + bonus;
        for (const b of u.buffs)
            if (b.stat === 'crit')
                c += b.isPct ? 0 : b.value;
        return this.rng.next() < c;
    }
    applyBuff(u, stat, base, isPct) {
        let v = base;
        for (const b of u.buffs) {
            if (b.stat !== stat)
                continue;
            v += b.isPct ? v * b.value : b.value;
        }
        return v;
    }
    effAtk(u) { return Math.max(1, this.applyBuff(u, 'atk', u.atk, false)); }
    effSpeed(u) { return Math.max(1, this.applyBuff(u, 'speed', u.speed, false)); }
    effDef(u, magic) {
        const base = magic ? u.mdef : u.pdef;
        return Math.max(0, this.applyBuff(u, magic ? 'mdef' : 'pdef', base, false));
    }
}
exports.BattleCore = BattleCore;

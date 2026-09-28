"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoBattle = exports.BattleCore = void 0;
/**
 * 战斗解算器 ·《骁将录：三国志》
 *
 * 纯逻辑层：**禁止 import 任何 cc 模块**，可在 node 下直接编译跑模拟验证。
 * 表现层（BattlePanel）只消费导出的 BattleCore / Ev / Unit。
 *
 * ── 机制（对齐策划大纲） ──
 *  1) 出手序由「速度」决定：降序，同速按 slot 升序；阵容同炸效果好，站位号决定稳定次序。
 *     → 顺序在**每回合开始时**算一次并锁定（回合中速度 buff/debuff 不改已排好的序，
 *       否则会出现「同一单位连动两次」或「被跳过」的经典回合制 bug）。
 *  2) 普攻优先打敌方前排（slot < 3 为前排，前排全灭则打后排），一排内优先打当前血量最低者（集火）。
 *  3) 怒气：每次出手自身 +rageOnAttack；受到伤害的目标 +rageOnHurt（每次行动对同一目标只 +1 次）；
 *     击杀 +rageOnKill。满怒后由表现层决定何时放（手动点头像 / 自动战斗）。
 *  4) 怒气技：按 SkillConf.target 选目标，atkRatio 伤害 / healRatio 治疗 / hitCount 多段 / buffs 增减益。
 *     伤害类型按武将 role：role=2（法攻）打 mdef，其余打 pdef。
 *     多段的总系数与单段对齐（perHit = atkRatio / hitCount）——SkillConf 注释写明「多段用于手感」，
 *     所以多段改变的是表现与方差，不是数值总量，避免多段技能无脑碾压单段技能。
 *  5) 合击：羁绊成员全部存活且全部满怒 → 释放 comboSkillId。攻击力 = 成员有效攻击之和 × COMBO_ATK_SCALE，
 *     仇恨/秒 School 由这是参与成员中攻击最高的「主攻手」role 决定。
 *     合击**不消耗回合**（与已集成的 BattlePanel 行为一致），代价是所有成员怒气清零。
 *  6) buff：apply 到目标身上，每回合结束统一 -1 回合（turns=0 为永久，不减）。属性 buff 影响后续伤害。
 *  7) 死亡：hp ≤ 0 → alive=false，发 die。
 *  8) 结束：一方全灭发 end；超过 maxRound 按剩余血量百分比判定，平局判守方（敌方）胜，防互奶死循环。
 *
 * ── 事件约定（给表现层） ──
 *  · act() 返回的事件按发生顺序排列：[turn, (atk | skill), heal?, buff..., rage..., die..., end?]
 *  · skill 事件里 to/dmg/heal/crit 三个数组**并行且按目标聚合**：一个目标一条，不是一「段」一条。
 *    需要多段飘字时，用 getSkillConf(e.skillId).hitCount 把该目标的伤害拆成 N 段播。
 *  · combo 事件只有 dmg 数组（接口固定），**治疗型合击的回复用独立的 heal 事件表达**，dmg 填 0。
 *  · rage 事件的 val 是「变化后的怒气值」，不是增量。
 *  · 传入的 Unit 是**初始值模板**，BattleCore 内部会复制一份；战斗过程中请一律读 core.get(uid)。
 */
const Balance_1 = require("../data/Balance");
const SkillConf_1 = require("../data/SkillConf");
const BondConf_1 = require("../data/BondConf");
/** 可复现随机数（mulberry32）：同 seed 同操作序列 → 同战斗结果，方便回归与录像复盘 */
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
        this.map = {};
        this.orderCache = [];
        this.orderDirty = true;
        this.ptr = 0;
        this.acted = {};
        this.ended = false;
        this.winnerSide = 1;
        this.pending = [];
        this.rng = new Rng(seed);
        const list = [];
        for (const src of units) {
            const maxHp = Math.max(1, Math.round(Balance_1.BAL.fin(src.maxHp > 0 ? src.maxHp : src.hp)));
            const hp = Math.max(0, Math.min(maxHp, Math.round(Balance_1.BAL.fin(src.hp > 0 ? src.hp : maxHp))));
            const u = {
                uid: Math.round(Balance_1.BAL.fin(src.uid)),
                side: src.side === 1 ? 1 : 0,
                confId: Math.round(Balance_1.BAL.fin(src.confId)),
                slot: Math.max(0, Math.round(Balance_1.BAL.fin(src.slot))),
                hp, maxHp,
                atk: Math.max(0, Math.round(Balance_1.BAL.fin(src.atk))),
                pdef: Math.max(0, Math.round(Balance_1.BAL.fin(src.pdef))),
                mdef: Math.max(0, Math.round(Balance_1.BAL.fin(src.mdef))),
                speed: Math.max(1, Math.round(Balance_1.BAL.fin(src.speed))),
                rage: Math.max(0, Math.min(Balance_1.BAL.rageMax, Math.round(Balance_1.BAL.fin(src.rage)))),
                role: Math.round(Balance_1.BAL.fin(src.role)),
                skillId: Math.round(Balance_1.BAL.fin(src.skillId)),
                comboSkillId: Math.round(Balance_1.BAL.fin(src.comboSkillId)),
                bondId: Math.round(Balance_1.BAL.fin(src.bondId)),
                alive: hp > 0,
                buffs: [],
            };
            if (this.map[u.uid]) {
                // uid 必须唯一；打架时至少保证内部状态不崩
                let nuid = u.uid + 1;
                while (this.map[nuid])
                    nuid++;
                u.uid = nuid;
            }
            list.push(u);
            this.map[u.uid] = u;
        }
        this.units = list;
        if (!this.aliveOf(0).length || !this.aliveOf(1).length) {
            this.settleEnd([]);
        }
    }
    // ───────────────────── 查询 ─────────────────────
    get(uid) {
        const u = this.map[uid];
        return u ? u : this.units[0];
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
    /** 出手顺序：速度降序，同速按 slot 升序；只含存活单位 */
    order() {
        return this.units
            .filter((u) => u.alive)
            .sort((a, b) => {
            const sa = this.effSpeed(a);
            const sb = this.effSpeed(b);
            if (sb !== sa)
                return sb - sa;
            if (a.slot !== b.slot)
                return a.slot - b.slot;
            if (a.side !== b.side)
                return a.side - b.side;
            return a.uid - b.uid;
        })
            .map((u) => u.uid);
    }
    /** 当前可合击的羁绊 id 列表（我方） */
    readyCombos() {
        const out = [];
        for (const b of BondConf_1.BOND_CONF) {
            const members = this.bondMembers(b, 0);
            if (!members)
                continue;
            let ok = true;
            for (const m of members) {
                if (!m.alive || m.rage < Balance_1.BAL.rageMax) {
                    ok = false;
                    break;
                }
            }
            if (ok)
                out.push(b.id);
        }
        return out;
    }
    /** 取走因超时等原因没能随 act 返回的尾事件（含 end）。正常流程也要调一次保险 */
    pendingEvents() {
        const out = this.pending;
        this.pending = [];
        return out;
    }
    /** 暴露随机源：给模拟/自动战斗用，保持同一颗种子走同一条随机序列 */
    rnd() { return this.rng.next(); }
    // ───────────────────── 推进 ─────────────────────
    /** 下一个该行动的 uid；-1 表示战斗结束 */
    next() {
        if (this.ended)
            return -1;
        for (let guard = 0; guard < 4096; guard++) {
            if (this.orderDirty) {
                this.orderCache = this.order();
                this.orderDirty = false;
                this.ptr = 0;
            }
            while (this.ptr < this.orderCache.length) {
                const uid = this.orderCache[this.ptr];
                const u = this.map[uid];
                if (!u || !u.alive || this.acted[uid]) {
                    this.ptr++;
                    continue;
                }
                if (!this.aliveOf(0).length || !this.aliveOf(1).length)
                    return -1;
                return uid;
            }
            // 本回合所有单位都行动过（或已阵亡）→ 进入下一回合
            if (this.round >= Balance_1.BAL.maxRound) {
                if (!this.ended)
                    this.forceEnd();
                return -1;
            }
            this.round++;
            this.tickBuffs();
            this.acted = {};
            this.orderDirty = true;
        }
        // 理论上到不了（guard 兜底），保险起见按超时收尾
        if (!this.ended)
            this.forceEnd();
        return -1;
    }
    /** 执行一次行动。useSkill=true 且怒气满则放怒气技，否则普攻。返回事件序列（按发生顺序） */
    act(uid, useSkill) {
        const evs = [];
        const tail = this.pendingEvents();
        for (const e of tail)
            evs.push(e);
        if (this.ended)
            return evs;
        const u = this.map[uid];
        if (!u || !u.alive)
            return evs;
        if (!this.aliveOf(0).length || !this.aliveOf(1).length) {
            this.settleEnd(evs);
            return evs;
        }
        evs.push({ k: 'turn', uid, round: this.round });
        if (this.ptr < this.orderCache.length && this.orderCache[this.ptr] === uid)
            this.ptr++;
        this.acted[uid] = true;
        const conf = SkillConf_1.SKILL_MAP[u.skillId];
        if (useSkill && u.rage >= Balance_1.BAL.rageMax && conf) {
            this.addRage(u, -Balance_1.BAL.rageMax, evs);
            this.runSkill(u, conf, this.effAtk(u), u.role === 2, 'skill', 0, evs);
            if (conf.rageGainSelf > 0)
                this.addRage(u, conf.rageGainSelf, evs);
        }
        else {
            this.basicAttack(u, evs);
        }
        this.addRage(u, Balance_1.BAL.rageOnAttack, evs);
        this.settleEnd(evs);
        return evs;
    }
    /** 合击：该羁绊全员存活且均满怒时可触发，返回事件；不可触发返回 null */
    tryCombo(bondId) {
        if (this.ended)
            return null;
        const bond = BondConf_1.BOND_MAP[bondId];
        if (!bond)
            return null;
        const members = this.bondMembers(bond, 0);
        if (!members)
            return null;
        for (const m of members) {
            if (!m.alive || m.rage < Balance_1.BAL.rageMax)
                return null;
        }
        const conf = SkillConf_1.SKILL_MAP[bond.comboSkillId];
        if (!conf)
            return null;
        const evs = [];
        // 主攻手 = 攻击最高的成员：决定合击的伤害类型（法/物）
        let striker = members[0];
        for (const m of members) {
            if (this.effAtk(m) > this.effAtk(striker))
                striker = m;
        }
        let power = 0;
        for (const m of members)
            power += this.effAtk(m);
        power = Math.round(power * Balance_1.BAL.comboAtkScale);
        for (const m of members)
            this.addRage(m, -Balance_1.BAL.rageMax, evs);
        this.runSkill(striker, conf, power, striker.role === 2, 'combo', bondId, evs);
        this.settleEnd(evs);
        return evs;
    }
    // ───────────────────── 内部：行动 ─────────────────────
    basicAttack(u, evs) {
        const targets = this.pickTargets(u, 'enemyFront');
        const t = targets.length ? targets[0] : null;
        if (!t)
            return;
        const isMagic = u.role === 2;
        const def = isMagic ? this.effMdef(t) : this.effPdef(t);
        const crit = this.rollCrit(u, 0);
        let dmg = Balance_1.BAL.calcDamage(this.effAtk(u), def, 1, crit, this.rng.next());
        dmg = Math.round(dmg * Balance_1.BAL.typeCounter(u.role, t.role));
        if (dmg < Balance_1.BAL.minDamage)
            dmg = Balance_1.BAL.minDamage;
        if (!isFinite(dmg) || dmg < 0)
            dmg = Balance_1.BAL.minDamage;
        evs.push({ k: 'atk', from: u.uid, to: t.uid, dmg, crit });
        this.hurt(u, t, dmg, evs);
    }
    /**
     * 走一次技能/合击的完整结算：选目标 → 多段 → 治疗 → buff → 发事件。
     * @param src   演出上的生产者（合击传主攻手）
     * @param power 攻击基数（合击传成员攻击之和 × 系数，普通技能传自己的有效攻击）
     */
    runSkill(src, conf, power, isMagic, kind, bondId, evs) {
        const hits = Math.max(1, Math.round(Balance_1.BAL.fin(conf.hitCount)));
        const perHit = Math.max(0, Balance_1.BAL.fin(conf.atkRatio)) / hits;
        const healPerHit = Math.max(0, Balance_1.BAL.fin(conf.healRatio)) / hits;
        const to = [];
        const dmgArr = [];
        const healArr = [];
        const critArr = [];
        const after = [];
        const idx = {}; // 目标 → 在数组中的下标（聚合多段）
        const hurtOnce = {};
        for (let h = 0; h < hits; h++) {
            const targets = this.pickTargets(src, conf.target);
            if (!targets.length)
                break;
            const list = this.isAoe(conf.target) ? targets : [targets[0]];
            for (const t of list) {
                if (!t.alive)
                    continue;
                let i = Object.prototype.hasOwnProperty.call(idx, t.uid) ? idx[t.uid] : -1;
                if (i < 0) {
                    i = to.length;
                    idx[t.uid] = i;
                    to.push(t.uid);
                    dmgArr.push(0);
                    healArr.push(0);
                    critArr.push(false);
                }
                if (perHit > 0 && t.side !== src.side) {
                    const crit = this.rollCrit(src, conf.critBonus);
                    const def = isMagic ? this.effMdef(t) : this.effPdef(t);
                    let d = Balance_1.BAL.calcDamage(power, def, perHit, crit, this.rng.next());
                    d = Math.round(d * Balance_1.BAL.typeCounter(src.role, t.role));
                    if (!isFinite(d) || d < Balance_1.BAL.minDamage)
                        d = Balance_1.BAL.minDamage;
                    if (crit)
                        critArr[i] = true;
                    dmgArr[i] = dmgArr[i] + d;
                    this.hurt(src, t, d, after, hurtOnce);
                }
                else if (healPerHit > 0 && t.side === src.side) {
                    // 治疗以「目标最大生命」为主词条：HEAL_HP_K 见 Balance 注释
                    const raw = Balance_1.BAL.calcHeal(power, healPerHit, this.rng.next(), t.maxHp);
                    const real = Math.max(0, Math.min(raw, t.maxHp - t.hp));
                    if (real > 0) {
                        t.hp += real;
                        healArr[i] = healArr[i] + real;
                        if (kind === 'combo')
                            after.push({ k: 'heal', from: src.uid, to: t.uid, val: real });
                    }
                }
            }
            if (conf.target === 'self')
                break; // 自身目标不需要多段重算
        }
        // buff：对当前仍存活的目标生效（敌方向减益 / 己方向增益）
        const bts = this.pickTargets(src, conf.target);
        const blist = this.isAoe(conf.target) ? bts : (bts.length ? [bts[0]] : []);
        for (const t of blist) {
            if (!t.alive)
                continue;
            for (const b of conf.buffs)
                this.applyBuff(src, t, b, after);
        }
        if (kind === 'skill') {
            evs.push({ k: 'skill', from: src.uid, skillId: conf.id, to, dmg: dmgArr, heal: healArr, crit: critArr });
        }
        else {
            evs.push({ k: 'combo', from: src.uid, bondId, skillId: conf.id, to, dmg: dmgArr });
        }
        for (const e of after)
            evs.push(e);
        this.resolveDeaths(evs);
    }
    /** 扣血 + 受击回怒 + 死亡判定；hurtOnce 保证同一目标在一次行动内只回一次受击怒 */
    hurt(src, dst, dmg, evs, hurtOnce) {
        dst.hp -= dmg;
        if (!hurtOnce || !hurtOnce[dst.uid]) {
            if (hurtOnce)
                hurtOnce[dst.uid] = true;
            if (dst.hp > 0)
                this.addRage(dst, Balance_1.BAL.rageOnHurt, evs);
        }
        if (dst.hp <= 0) {
            dst.hp = 0;
            this.addRage(src, Balance_1.BAL.rageOnKill, evs);
        }
        this.resolveDeaths(evs);
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
    addRage(u, delta, evs) {
        if (!u.alive)
            return;
        const before = u.rage;
        let v = before + delta;
        if (!isFinite(v))
            v = before;
        if (v < 0)
            v = 0;
        if (v > Balance_1.BAL.rageMax)
            v = Balance_1.BAL.rageMax;
        v = Math.round(v);
        if (v === before)
            return;
        u.rage = v;
        evs.push({ k: 'rage', uid: u.uid, val: v });
    }
    applyBuff(src, t, b, evs) {
        if (b.stat === 'rage') {
            this.addRage(t, Math.round(Balance_1.BAL.fin(b.value)), evs);
            return;
        }
        const isEnemy = t.side !== src.side;
        // 对自己的技能：目标是敌人时只吃减益，目标是自己人时只吃增益
        if (isEnemy && b.value > 0)
            return;
        if (!isEnemy && t !== src && b.value < 0)
            return;
        // 同属性覆盖刷新（取更长的回合数），不叠加，避免减益叠到 0 防甚至负数
        let slot = -1;
        for (let i = 0; i < t.buffs.length; i++) {
            if (t.buffs[i].stat === b.stat) {
                slot = i;
                break;
            }
        }
        const nb = { stat: b.stat, value: Balance_1.BAL.fin(b.value), turns: Math.max(0, Math.round(Balance_1.BAL.fin(b.turns))), isPct: !!b.isPct };
        if (slot >= 0) {
            if (Math.abs(nb.value) >= Math.abs(t.buffs[slot].value))
                t.buffs[slot] = nb;
            else
                t.buffs[slot].turns = Math.max(t.buffs[slot].turns, nb.turns);
        }
        else {
            t.buffs.push(nb);
        }
        evs.push({ k: 'buff', from: src.uid, to: t.uid, stat: b.stat, value: nb.value, turns: nb.turns });
    }
    tickBuffs() {
        for (const u of this.units) {
            if (!u.buffs.length)
                continue;
            const keep = [];
            for (const b of u.buffs) {
                if (b.turns <= 0) {
                    keep.push(b);
                    continue;
                } // 0 = 永久
                b.turns -= 1;
                if (b.turns > 0)
                    keep.push(b);
            }
            u.buffs = keep;
        }
    }
    // ───────────────────── 内部：目标选择 ─────────────────────
    isAoe(r) {
        return r === 'enemyAll' || r === 'allyAll';
    }
    /**
     * 目标列表（有序，下标 0 = 主目标）。每次调用都按当前战场重算，
     * 于是多段技能在某段打死目标后会自动转火到下一个目标。
     */
    pickTargets(src, r) {
        const foes = this.aliveOf(src.side === 0 ? 1 : 0);
        const allies = this.aliveOf(src.side);
        switch (r) {
            case 'enemyFront': {
                const front = foes.filter((f) => f.slot < 3).sort((a, b) => a.slot - b.slot);
                const pool = front.length ? front : foes.slice().sort((a, b) => a.slot - b.slot);
                // 前排内优先打当前血量最低者（集火，缩短回合数）
                const sorted = pool.slice().sort((a, b) => (a.hp - b.hp) || (a.slot - b.slot));
                return sorted;
            }
            case 'enemySingleLow': {
                return foes.slice().sort((a, b) => {
                    const ra = a.maxHp > 0 ? a.hp / a.maxHp : 1;
                    const rb = b.maxHp > 0 ? b.hp / b.maxHp : 1;
                    return (ra - rb) || (a.slot - b.slot);
                });
            }
            case 'enemyAll':
                return foes.slice().sort((a, b) => a.slot - b.slot);
            case 'allyLowest': {
                return allies.slice().sort((a, b) => {
                    const ra = a.maxHp > 0 ? a.hp / a.maxHp : 1;
                    const rb = b.maxHp > 0 ? b.hp / b.maxHp : 1;
                    return (ra - rb) || (a.slot - b.slot);
                });
            }
            case 'allyAll':
                return allies.slice().sort((a, b) => a.slot - b.slot);
            case 'self':
            default:
                return src.alive ? [src] : [];
        }
    }
    bondMembers(bond, side) {
        const out = [];
        for (const hid of bond.heroIds) {
            let found = null;
            for (const u of this.units) {
                if (u.side === side && u.confId === hid) {
                    found = u;
                    break;
                }
            }
            if (!found)
                return null; // 羁绊成员没上阵 → 该羁绊不存在
            out.push(found);
        }
        return out;
    }
    // ───────────────────── 内部：属性与结束 ─────────────────────
    sumBuff(u, stat) {
        let pct = 0;
        let flat = 0;
        for (const b of u.buffs) {
            if (b.stat !== stat)
                continue;
            if (b.isPct)
                pct += b.value;
            else
                flat += b.value;
        }
        return { pct, flat };
    }
    effStat(u, base, stat) {
        const s = this.sumBuff(u, stat);
        const v = base * (1 + s.pct) + s.flat;
        return isFinite(v) ? v : base;
    }
    effAtk(u) { return Math.max(0, this.effStat(u, u.atk, 'atk')); }
    effPdef(u) { return Math.max(0, this.effStat(u, u.pdef, 'pdef')); }
    effMdef(u) { return Math.max(0, this.effStat(u, u.mdef, 'mdef')); }
    effSpeed(u) { return Math.max(1, this.effStat(u, u.speed, 'speed')); }
    rollCrit(u, bonus) {
        const s = this.sumBuff(u, 'crit');
        let c = Balance_1.BAL.critBase + Balance_1.BAL.fin(bonus) + s.pct + s.flat;
        if (!isFinite(c))
            c = Balance_1.BAL.critBase;
        if (c < 0)
            c = 0;
        if (c > Balance_1.BAL.critCap)
            c = Balance_1.BAL.critCap;
        return this.rng.next() < c;
    }
    hpRatio(side) {
        let cur = 0;
        let max = 0;
        for (const u of this.units) {
            if (u.side !== side)
                continue;
            max += u.maxHp;
            if (u.alive)
                cur += u.hp;
        }
        return max > 0 ? cur / max : 0;
    }
    settleEnd(evs) {
        if (this.ended)
            return;
        if (!this.aliveOf(0).length || !this.aliveOf(1).length) {
            this.winnerSide = this.aliveOf(0).length > 0 ? 0 : 1;
            this.ended = true;
            evs.push({ k: 'end', winner: this.winnerSide });
        }
    }
    /** 回合上限：按剩余血量百分比判胜，平局判守方（= 敌方）胜 */
    forceEnd() {
        if (this.ended)
            return;
        const r0 = this.hpRatio(0);
        const r1 = this.hpRatio(1);
        this.winnerSide = r0 > r1 + 1e-6 ? 0 : (r1 > r0 + 1e-6 ? 1 : 1);
        this.ended = true;
        this.pending.push({ k: 'end', winner: this.winnerSide });
    }
}
exports.BattleCore = BattleCore;
/**
 * 自动战斗（可作为离线推演 / 扫荡结算 / 模拟验证的公共策略）。
 * @param useCombo 满怒羁绊是否自动放合击
 * @param maxSteps 步数硬上限，防止任何意外情况下的长循环
 */
function autoBattle(core, useCombo = true, maxSteps = 4096) {
    const log = [];
    for (let step = 0; step < maxSteps; step++) {
        if (core.isEnd())
            break;
        if (useCombo) {
            const ready = core.readyCombos();
            if (ready.length) {
                const evs = core.tryCombo(ready[0]);
                if (evs) {
                    for (const e of evs)
                        log.push(e);
                    continue;
                }
            }
        }
        const uid = core.next();
        if (uid < 0)
            break;
        const u = core.get(uid);
        let useSkill = u.rage >= Balance_1.BAL.rageMax;
        if (useSkill) {
            // 纯治疗技在没人受伤超过 18% 时先攒着不浪费
            const conf = SkillConf_1.SKILL_MAP[u.skillId];
            if (conf && conf.atkRatio <= 0 && conf.healRatio > 0) {
                let worst = 1;
                for (const a of core.aliveOf(u.side)) {
                    const r = a.maxHp > 0 ? a.hp / a.maxHp : 1;
                    if (r < worst)
                        worst = r;
                }
                if (worst > 0.82)
                    useSkill = false;
            }
        }
        const evs = core.act(uid, useSkill);
        for (const e of evs)
            log.push(e);
    }
    const tail = core.pendingEvents();
    for (const e of tail)
        log.push(e);
    return log;
}
exports.autoBattle = autoBattle;
exports.default = BattleCore;

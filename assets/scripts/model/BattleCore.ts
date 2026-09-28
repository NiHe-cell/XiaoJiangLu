/**
 * 战斗解算器（纯逻辑，不依赖 cc，可在 node 下直接跑模拟验证）
 *
 * 机制：
 *  - 出手序由「速度」决定（降序，同速按 slot 升序）
 *  - 普攻打敌方前排（slot < 3）；前排全灭则打后排
 *  - 怒气：攻击 / 受击 / 击杀 获得，满怒由玩家手动点击释放（表现层决定时机）
 *  - 怒气技 / 羁绊合击：按 SkillConf 的 target 选目标，多段、暴击、buff
 *  - 回合上限保护：maxRound 后按剩余血量百分比判定，防互奶死循环
 */
import { getHeroConf } from '../data/HeroConf';
import { getSkillConf } from '../data/SkillConf';
import { BAL } from '../data/Balance';

export interface Buff {
    stat: 'atk' | 'pdef' | 'mdef' | 'speed' | 'crit' | 'rage';
    value: number;
    turns: number;
    isPct: boolean;
}

export interface Unit {
    uid: number;
    side: 0 | 1;
    confId: number;
    slot: number;
    hp: number;
    maxHp: number;
    atk: number;
    pdef: number;
    mdef: number;
    speed: number;
    rage: number;
    role: number;
    skillId: number;
    comboSkillId: number;
    bondId: number;
    alive: boolean;
    buffs: Buff[];
}

export type Ev =
    | { k: 'turn'; uid: number; round: number }
    | { k: 'atk'; from: number; to: number; dmg: number; crit: boolean }
    | { k: 'skill'; from: number; skillId: number; to: number[]; dmg: number[]; heal: number[]; crit: boolean[] }
    | { k: 'combo'; from: number; bondId: number; skillId: number; to: number[]; dmg: number[] }
    | { k: 'heal'; from: number; to: number; val: number }
    | { k: 'buff'; from: number; to: number; stat: string; value: number; turns: number }
    | { k: 'rage'; uid: number; val: number }
    | { k: 'die'; uid: number }
    | { k: 'end'; winner: 0 | 1 };

/** 可复现随机（mulberry32） */
class Rng {
    private s: number;
    constructor (seed: number) { this.s = seed >>> 0 || 1; }
    next (): number {
        this.s = (this.s + 0x6D2B79F5) >>> 0;
        let t = this.s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export class BattleCore {
    readonly units: Unit[];
    round = 1;

    private rng: Rng;
    private tickInRound = 0;
    private ended = false;
    private winnerSide: 0 | 1 = 1;

    constructor (units: Unit[], seed: number) {
        this.units = units.map((u) => ({ ...u, buffs: [] as Buff[] }));
        this.rng = new Rng(seed);
    }

    // ---------- 查询 ----------
    get (uid: number): Unit {
        const u = this.units.find((x) => x.uid === uid);
        if (u) return u;
        return this.units[0];
    }

    aliveOf (side: 0 | 1): Unit[] {
        return this.units.filter((u) => u.side === side && u.alive);
    }

    isEnd (): boolean {
        return this.ended || !this.aliveOf(0).length || !this.aliveOf(1).length;
    }

    winner (): 0 | 1 {
        if (!this.aliveOf(0).length) return 1;
        if (!this.aliveOf(1).length) return 0;
        return this.winnerSide;
    }

    /** 出手顺序：速度降序，同速按 slot 升序 */
    order (): number[] {
        return this.units
            .filter((u) => u.alive)
            .sort((a, b) => {
                const sa = this.effSpeed(a); const sb = this.effSpeed(b);
                if (sb !== sa) return sb - sa;
                if (a.side !== b.side) return a.side - b.side;
                return a.slot - b.slot;
            })
            .map((u) => u.uid);
    }

    /** 下一个应行动者；-1 表示结束 */
    next (): number {
        if (this.isEnd()) return -1;
        const ord = this.order();
        if (!ord.length) return -1;
        const i = Math.min(this.tickInRound, ord.length - 1);
        return ord[i];
    }

    // ---------- 行动 ----------
    act (uid: number, useSkill: boolean): Ev[] {
        const evs: Ev[] = [];
        const u = this.get(uid);
        if (this.ended || !u.alive) return evs;

        evs.push({ k: 'turn', uid, round: this.round });

        const useRage = useSkill && u.rage >= BAL.rageMax;
        if (useRage) {
            this.castSkill(u, u.skillId, evs, false);
            u.rage = BAL.rageOnSkill;
            evs.push({ k: 'rage', uid, val: u.rage });
        } else {
            this.basicAttack(u, evs);
        }

        this.afterAct(evs);
        return evs;
    }

    /** 羁绊合击：成员全部存活且满怒才可触发 */
    readyCombos (): number[] {
        const out: number[] = [];
        const seen: { [id: number]: boolean } = {};
        for (const u of this.aliveOf(0)) {
            if (!u.bondId || seen[u.bondId]) continue;
            seen[u.bondId] = true;
            const members = this.units.filter((m) => m.bondId === u.bondId && m.side === 0);
            if (!members.length) continue;
            const ok = members.every((m) => m.alive) && members.some((m) => m.rage >= BAL.rageMax);
            if (ok) out.push(u.bondId);
        }
        return out;
    }

    tryCombo (bondId: number): Ev[] | null {
        if (this.ended) return null;
        const members = this.units.filter((m) => m.bondId === bondId && m.side === 0);
        if (!members.length) return null;
        if (!members.every((m) => m.alive)) return null;
        if (!members.some((m) => m.rage >= BAL.rageMax)) return null;
        const caster = members.find((m) => m.rage >= BAL.rageMax) || members[0];

        const evs: Ev[] = [];
        evs.push({ k: 'turn', uid: caster.uid, round: this.round });
        const targets = this.aliveOf(1);
        const dmg: number[] = [];
        const to: number[] = [];
        const atk = this.effAtk(caster);
        for (const t of targets) {
            const crit = this.rollCrit(caster, 0.15);
            const def = this.effDef(t, caster.role === 2);
            const ratio = 1.6 / Math.max(1, targets.length) * 1.6;
            const d = BAL.calcDamage(atk, def, ratio, crit, this.rng.next());
            t.hp -= d;
            to.push(t.uid); dmg.push(d);
        }
        evs.push({ k: 'combo', from: caster.uid, bondId, skillId: caster.comboSkillId, to, dmg });
        for (const m of members) { m.rage = 0; evs.push({ k: 'rage', uid: m.uid, val: 0 }); }
        this.resolveDeaths(evs);
        this.afterAct(evs);
        return evs;
    }

    // ---------- 内部 ----------
    private basicAttack (u: Unit, evs: Ev[]): void {
        const foes = this.aliveOf(u.side === 0 ? 1 : 0);
        if (!foes.length) return;
        const front = foes.filter((f) => f.slot < 3);
        const pool = front.length ? front : foes;
        let target = pool[0];
        for (const p of pool) if (p.hp < target.hp) target = p;

        const crit = this.rollCrit(u, 0);
        const def = this.effDef(target, u.role === 2);
        const counter = BAL.typeCounter(u.role, target.role);
        const dmg = BAL.calcDamage(this.effAtk(u), def, 1.0 * counter, crit, this.rng.next());

        target.hp -= dmg;
        evs.push({ k: 'atk', from: u.uid, to: target.uid, dmg, crit });

        this.gainRage(u, BAL.rageOnAttack, evs);
        this.gainRage(target, BAL.rageOnHurt, evs);
        if (target.hp <= 0) this.gainRage(u, BAL.rageOnKill, evs);
        this.resolveDeaths(evs);
    }

    private castSkill (u: Unit, skillId: number, evs: Ev[], isCombo: boolean): void {
        const sk = getSkillConf(skillId);
        const allies = this.aliveOf(u.side);
        const foes = this.aliveOf(u.side === 0 ? 1 : 0);

        let targets: Unit[] = [];
        if (!sk) {
            targets = foes.slice(0, 1);
        } else if (sk.target === 'enemyFront') {
            const front = foes.filter((f) => f.slot < 3);
            targets = front.length ? front : foes.slice(0, 1);
        } else if (sk.target === 'enemyAll') {
            targets = foes.slice();
        } else if (sk.target === 'enemySingleLow') {
            let low = foes[0];
            for (const f of foes) if (f.hp / f.maxHp < low.hp / low.maxHp) low = f;
            targets = low ? [low] : [];
        } else if (sk.target === 'allyLowest') {
            let low = allies[0];
            for (const a of allies) if (a.hp / a.maxHp < low.hp / low.maxHp) low = a;
            targets = low ? [low] : [];
        } else if (sk.target === 'allyAll') {
            targets = allies.slice();
        } else {
            targets = [u];
        }
        if (!targets.length) targets = foes.slice(0, 1);
        if (!targets.length) return;

        const hits = sk && sk.hitCount > 1 ? sk.hitCount : 1;
        // 多段总系数与单段对齐，避免多段技能碾压
        const perHit = (sk ? sk.atkRatio : 1.2) / hits * (isCombo ? 1.4 : 1);
        const healRatio = sk ? sk.healRatio : 0;

        const to: number[] = [];
        const dmgArr: number[] = [];
        const healArr: number[] = [];
        const critArr: boolean[] = [];

        for (const t of targets) {
            let total = 0;
            let healed = 0;
            let anyCrit = false;
            for (let h = 0; h < hits; h++) {
                const crit = this.rollCrit(u, sk ? sk.critBonus : 0);
                if (crit) anyCrit = true;
                if (healRatio > 0) {
                    const v = BAL.calcHeal(this.effAtk(u), healRatio / hits, this.rng.next());
                    t.hp = Math.min(t.maxHp, t.hp + v);
                    healed += v;
                }
                if ((sk ? sk.atkRatio : 1) > 0 && t.side !== u.side) {
                    const def = this.effDef(t, u.role === 2);
                    const counter = BAL.typeCounter(u.role, t.role);
                    const d = BAL.calcDamage(this.effAtk(u), def, perHit * counter, crit, this.rng.next());
                    t.hp -= d;
                    total += d;
                }
            }
            to.push(t.uid); dmgArr.push(total); healArr.push(healed); critArr.push(anyCrit);
            if (healed > 0) evs.push({ k: 'heal', from: u.uid, to: t.uid, val: healed });
            if (sk && sk.buffs) {
                for (const b of sk.buffs) {
                    if (t.side !== u.side && b.value < 0) {
                        t.buffs.push({ stat: b.stat, value: b.value, turns: b.turns, isPct: b.isPct });
                        evs.push({ k: 'buff', from: u.uid, to: t.uid, stat: b.stat, value: b.value, turns: b.turns });
                    } else if (t.side === u.side && b.value > 0) {
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

    private afterAct (evs: Ev[]): void {
        this.tickInRound++;
        const ord = this.order();
        if (this.tickInRound >= Math.max(1, ord.length)) {
            this.tickInRound = 0;
            this.round++;
            this.tickBuffs(evs);
        }
        if (this.round > BAL.maxRound && !this.ended) {
            this.forceEnd(evs);
        }
        this.checkEnd(evs);
    }

    private tickBuffs (evs: Ev[]): void {
        for (const u of this.units) {
            if (!u.alive || !u.buffs.length) continue;
            u.buffs = u.buffs.filter((b) => {
                b.turns -= 1;
                return b.turns > 0;
            });
        }
    }

    private forceEnd (evs: Ev[]): void {
        const hpOf = (side: 0 | 1): number => {
            const alive = this.aliveOf(side);
            if (!alive.length) return 0;
            let cur = 0; let max = 0;
            for (const u of alive) { cur += u.hp; max += u.maxHp; }
            return max ? cur / max : 0;
        };
        this.winnerSide = hpOf(0) >= hpOf(1) ? 0 : 1;
        this.ended = true;
        evs.push({ k: 'end', winner: this.winnerSide });
    }

    private checkEnd (evs: Ev[]): void {
        if (this.ended) return;
        if (!this.aliveOf(0).length || !this.aliveOf(1).length) {
            this.winnerSide = this.aliveOf(0).length ? 0 : 1;
            this.ended = true;
            evs.push({ k: 'end', winner: this.winnerSide });
        }
    }

    private resolveDeaths (evs: Ev[]): void {
        for (const u of this.units) {
            if (u.alive && u.hp <= 0) {
                u.hp = 0;
                u.alive = false;
                u.buffs.length = 0;
                evs.push({ k: 'die', uid: u.uid });
            }
        }
    }

    private gainRage (u: Unit, v: number, evs: Ev[]): void {
        if (!u.alive || v <= 0) return;
        u.rage = Math.min(BAL.rageMax, u.rage + v);
        evs.push({ k: 'rage', uid: u.uid, val: u.rage });
    }

    private rollCrit (u: Unit, bonus: number): boolean {
        let c = BAL.critBase + bonus;
        for (const b of u.buffs) if (b.stat === 'crit') c += b.isPct ? 0 : b.value;
        return this.rng.next() < c;
    }

    private applyBuff (u: Unit, stat: string, base: number, isPct: boolean): number {
        let v = base;
        for (const b of u.buffs) {
            if (b.stat !== stat) continue;
            v += b.isPct ? v * b.value : b.value;
        }
        return v;
    }

    private effAtk (u: Unit): number { return Math.max(1, this.applyBuff(u, 'atk', u.atk, false)); }
    private effSpeed (u: Unit): number { return Math.max(1, this.applyBuff(u, 'speed', u.speed, false)); }
    private effDef (u: Unit, magic: boolean): number {
        const base = magic ? u.mdef : u.pdef;
        return Math.max(0, this.applyBuff(u, magic ? 'mdef' : 'pdef', base, false));
    }
}

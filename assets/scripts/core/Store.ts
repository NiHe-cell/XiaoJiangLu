/**
 * 存档与玩家状态（全局唯一）
 * 依赖数据层：../data/HeroConf  ../data/ItemConf  ../data/BondConf
 */
import { sys } from 'cc';
import { HERO_CONF, HERO_MAP, getHeroConf, Quality } from '../data/HeroConf';
import { ITEM_CONF, getItemConf, EquipSlot } from '../data/ItemConf';
import { BOND_CONF } from '../data/BondConf';

const SAVE_KEY = 'xxl_save_v1';

export interface HeroState {
    confId: number;
    level: number;
    exp: number;
    star: number;   // 1-5
    adv: number;    // 进阶等级 0-10
    equip: { weapon: number; armor: number; helmet: number; necklace: number; treasure: number };
}

export interface PlayerData {
    name: string;
    gender: 0 | 1;        // 0 男 1 女
    level: number;        // 主公等级
    exp: number;
    silver: number;
    jade: number;
    stamina: number;
    heroes: { [confId: number]: HeroState };
    lineup: number[];     // 上阵 confId，最多 6，首位为主角
    items: { [itemId: number]: number };
    stageStars: { [stageId: number]: number };
    maxStageId: number;
    autoBattle: boolean;
    speed: number;        // 1 / 2 / 3
    recruited: number;    // 累计招募次数
    loginDay: number;     // 已签到天数
    lastLoginTs: number;
}

function defaultEquip (): HeroState['equip'] {
    return { weapon: 0, armor: 0, helmet: 0, necklace: 0, treasure: 0 };
}

export function newHeroState (confId: number, star?: number): HeroState {
    const c = getHeroConf(confId);
    return {
        confId, level: 1, exp: 0, star: star ?? c.star, adv: 0, equip: defaultEquip(),
    };
}

function defaultData (): PlayerData {
    const d: PlayerData = {
        name: '主公', gender: 0, level: 1, exp: 0,
        silver: 5000, jade: 300, stamina: 120,
        // maxStageId = 已通关的最高关卡 id。初始值必须是 100 而不是 0：
        // 关卡 id 从 101 起（章节号×100 + 章内序号），解锁判定是 s.id <= maxStageId + 1，
        // 初值 0 会让 101 <= 1 恒为假 —— 48 关全部锁死，新建档根本进不去战斗。
        // 100 是「第一章第一关的前一关」哨兵值。
        heroes: {}, lineup: [], items: {}, stageStars: {}, maxStageId: 100,
        autoBattle: false, speed: 1, recruited: 0, loginDay: 0, lastLoginTs: 0,
    };
    // 初始阵容：主角 + 两名初始武将（取数据表中前两名非主角武将）
    const mainId = HERO_CONF[0] ? HERO_CONF[0].id : 1000;
    d.heroes[mainId] = newHeroState(mainId);
    d.lineup.push(mainId);
    const others = HERO_CONF.filter((h) => h.id !== mainId).slice(0, 2);
    for (const h of others) {
        d.heroes[h.id] = newHeroState(h.id, 1);
        d.lineup.push(h.id);
    }
    // 初始物资
    const expItem = ITEM_CONF.find((i) => i.type === 'exp');
    if (expItem) d.items[expItem.id] = 20;
    return d;
}

class StoreClass {
    data: PlayerData = defaultData();

    load (): void {
        try {
            const raw = sys.localStorage.getItem(SAVE_KEY);
            if (raw) {
                const d = JSON.parse(raw) as PlayerData;
                if (d && d.heroes && d.lineup) {
                    this.data = this.migrate(d);
                    return;
                }
            }
        } catch (e) {
            console.warn('[Store] 读档失败，使用新档', e);
        }
        this.data = defaultData();
    }

    /** 老档兼容：补齐新增字段 */
    private migrate (d: PlayerData): PlayerData {
        const base = defaultData();
        const r = Object.assign(base, d);
        if (!r.items) r.items = {};
        if (!r.stageStars) r.stageStars = {};
        if (!r.heroes) r.heroes = {};
        if (!r.lineup) r.lineup = [];
        if (typeof r.stamina !== 'number') r.stamina = 120;
        return r;
    }

    save (): void {
        try {
            sys.localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('[Store] 存档失败', e);
        }
    }

    reset (): void {
        this.data = defaultData();
        this.save();
    }

    // ---------- 查询 ----------
    heroList (): HeroState[] {
        return Object.keys(this.data.heroes)
            .map((k) => this.data.heroes[Number(k)])
            .sort((a, b) => {
                const ca = getHeroConf(a.confId); const cb = getHeroConf(b.confId);
                if (cb.quality !== ca.quality) return cb.quality - ca.quality;
                return cb.id - ca.id;
            });
    }

    has (confId: number): boolean {
        return !!this.data.heroes[confId];
    }

    itemCount (itemId: number): number {
        return this.data.items[itemId] || 0;
    }

    addItem (itemId: number, n: number): void {
        this.data.items[itemId] = (this.data.items[itemId] || 0) + n;
        if (this.data.items[itemId] <= 0) delete this.data.items[itemId];
    }

    addSilver (n: number): void {
        this.data.silver = Math.max(0, this.data.silver + n);
    }

    addJade (n: number): void {
        this.data.jade = Math.max(0, this.data.jade + n);
    }

    addStamina (n: number): void {
        this.data.stamina = Math.max(0, Math.min(200, this.data.stamina + n));
    }

    // ---------- 阵容 ----------
    setLineup (ids: number[]): void {
        this.data.lineup = ids.slice(0, 6);
        this.save();
    }

    inLineup (confId: number): boolean {
        return this.data.lineup.indexOf(confId) >= 0;
    }

    // ---------- 战力 ----------
    powerOf (confId: number): number {
        const s = this.attrOf(confId);
        return Math.floor(s.hp * 0.5 + s.atk * 4 + s.pdef * 2.5 + s.mdef * 2.5 + s.speed * 1.5);
    }

    totalPower (): number {
        let p = 0;
        for (const id of this.data.lineup) p += this.powerOf(id);
        return p;
    }

    // ---------- 属性 ----------
    /** 已激活羁绊（阵容内羁绊武将全部上阵才生效） */
    activeBonds (): typeof BOND_CONF {
        const line = this.data.lineup;
        return BOND_CONF.filter((b) => b.heroIds.every((h) => line.indexOf(h) >= 0));
    }

    /** 阵营光环：同阵营人数≥2 生效（按人数最多阵营） */
    campBonus (): { camp: number; atkPct: number; hpPct: number } {
        const line = this.data.lineup;
        const cnt: { [c: number]: number } = {};
        for (const id of line) {
            const c = getHeroConf(id).camp;
            cnt[c] = (cnt[c] || 0) + 1;
        }
        let best = 0; let bestN = 0;
        for (const k of Object.keys(cnt)) {
            if (cnt[Number(k)] > bestN) { bestN = cnt[Number(k)]; best = Number(k); }
        }
        if (bestN < 2) return { camp: 0, atkPct: 0, hpPct: 0 };
        const n = Math.min(bestN, 6);
        return { camp: best, atkPct: (n - 1) * 0.04, hpPct: (n - 1) * 0.04 };
    }

    /** 综合属性 */
    attrOf (confId: number): { hp: number; atk: number; pdef: number; mdef: number; speed: number } {
        const c = getHeroConf(confId);
        const s = this.data.heroes[confId] || newHeroState(confId);
        const lv = Math.max(1, s.level);
        const g = lv - 1;
        const starMul = 1 + (s.star - 1) * 0.12;
        const advMul = 1 + s.adv * 0.09;

        let hp = (c.baseHp + c.growHp * g) * starMul * advMul;
        let atk = (c.baseAtk + c.growAtk * g) * starMul * advMul;
        let pdef = (c.basePdef + c.growPdef * g) * starMul * advMul;
        let mdef = (c.baseMdef + c.growMdef * g) * starMul * advMul;
        let speed = c.baseSpeed;

        // 装备
        const slots: EquipSlot[] = ['weapon', 'armor', 'helmet', 'necklace', 'treasure'];
        for (const sl of slots) {
            const iid = s.equip[sl];
            if (!iid) continue;
            const it = getItemConf(iid);
            hp += it.hp || 0; atk += it.atk || 0; pdef += it.pdef || 0; mdef += it.mdef || 0;
        }

        // 羁绊
        const bonds = this.activeBonds();
        let bp = { atkPct: 0, hpPct: 0, pdefPct: 0, mdefPct: 0 };
        for (const b of bonds) {
            bp.atkPct += b.atkPct; bp.hpPct += b.hpPct; bp.pdefPct += b.pdefPct; bp.mdefPct += b.mdefPct;
        }
        const cb = this.campBonus();
        bp.atkPct += cb.atkPct; bp.hpPct += cb.hpPct;

        return {
            hp: Math.floor(hp * (1 + bp.hpPct)),
            atk: Math.floor(atk * (1 + bp.atkPct)),
            pdef: Math.floor(pdef * (1 + bp.pdefPct)),
            mdef: Math.floor(mdef * (1 + bp.mdefPct)),
            speed: Math.floor(speed),
        };
    }

    /** 敌方属性（不入存档，按关卡等级直接算） */
    enemyAttr (confId: number, level: number): { hp: number; atk: number; pdef: number; mdef: number; speed: number } {
        const c = getHeroConf(confId);
        const g = Math.max(0, level - 1);
        // 等级系数：原 0.06 是「等级成长 + 额外乘数」的二次增长，敌方同时吃两份，
        // 玩家只有 star/adv 一份 → 同级对比 26 级敌方 2.5× vs 玩家 1.46×，胜率上不去的唯一根因。
        // 裴策 1920 场实测：0.06 → 53.1% 胜率 / 第6章 23%；0.035 → 78.5% / 64%；0.025 → 84.8% / 88%。
        const k = 1 + g * 0.035;
        return {
            hp: Math.floor((c.baseHp + c.growHp * g) * k),
            atk: Math.floor((c.baseAtk + c.growAtk * g) * k),
            pdef: Math.floor((c.basePdef + c.growPdef * g) * k),
            mdef: Math.floor((c.baseMdef + c.growMdef * g) * k),
            speed: c.baseSpeed,
        };
    }

    // ---------- 养成 ----------
    /** 升级所需经验 */
    expNeed (level: number): number {
        return Math.floor(120 * Math.pow(level, 1.35));
    }

    /** 使用经验道具升级武将，返回实际升到的等级 */
    levelUp (confId: number, exp: number): number {
        const s = this.data.heroes[confId];
        if (!s) return 0;
        s.exp += exp;
        let guard = 0;
        while (s.exp >= this.expNeed(s.level) && s.level < this.data.level && guard++ < 200) {
            s.exp -= this.expNeed(s.level);
            s.level += 1;
        }
        if (s.exp >= this.expNeed(s.level)) s.exp = this.expNeed(s.level) - 1;
        return s.level;
    }

    /** 主公经验 */
    addPlayerExp (n: number): number {
        this.data.exp += n;
        let up = 0;
        let guard = 0;
        while (this.data.exp >= this.expNeed(this.data.level) && guard++ < 200) {
            this.data.exp -= this.expNeed(this.data.level);
            this.data.level += 1;
            up += 1;
            this.addStamina(20);
        }
        return up;
    }

    /** 进阶：消耗进阶丹 + 银币 */
    canAdvance (confId: number): { ok: boolean; reason: string } {
        const s = this.data.heroes[confId];
        if (!s) return { ok: false, reason: '未拥有该武将' };
        if (s.adv >= 10) return { ok: false, reason: '已达最高进阶' };
        const c = getHeroConf(confId);
        if (s.level < 10 + s.adv * 5) return { ok: false, reason: `需武将等级 ${10 + s.adv * 5}` };
        const dan = ITEM_CONF.find((i) => i.name.indexOf('进阶丹') >= 0);
        if (dan && this.itemCount(dan.id) < 1) return { ok: false, reason: '进阶丹不足' };
        const need = 2000 + s.adv * 1500;
        if (this.data.silver < need) return { ok: false, reason: '银币不足' };
        return { ok: true, reason: '' };
    }

    advance (confId: number): boolean {
        const r = this.canAdvance(confId);
        if (!r.ok) return false;
        const s = this.data.heroes[confId]!;
        const dan = ITEM_CONF.find((i) => i.name.indexOf('进阶丹') >= 0);
        if (dan) this.addItem(dan.id, -1);
        this.addSilver(-(2000 + s.adv * 1500));
        s.adv += 1;
        return true;
    }

    /** 升星：消耗武将碎片 */
    fragmentIdOf (confId: number): number {
        const it = ITEM_CONF.find((i) => (i as any).heroId === confId);
        return it ? it.id : 0;
    }

    starUpNeed (star: number): number {
        return [0, 10, 20, 40, 80][Math.max(0, Math.min(4, star))] || 999;
    }

    canStarUp (confId: number): { ok: boolean; reason: string } {
        const s = this.data.heroes[confId];
        if (!s) return { ok: false, reason: '未拥有该武将' };
        if (s.star >= 5) return { ok: false, reason: '已满星' };
        const fid = this.fragmentIdOf(confId);
        const need = this.starUpNeed(s.star);
        if (!fid || this.itemCount(fid) < need) return { ok: false, reason: `碎片不足（需 ${need}）` };
        return { ok: true, reason: '' };
    }

    starUp (confId: number): boolean {
        if (!this.canStarUp(confId).ok) return false;
        const s = this.data.heroes[confId]!;
        const fid = this.fragmentIdOf(confId);
        this.addItem(fid, -this.starUpNeed(s.star));
        s.star += 1;
        return true;
    }

    equip (confId: number, slot: EquipSlot, itemId: number): void {
        const s = this.data.heroes[confId];
        if (!s) return;
        const old = s.equip[slot];
        if (old) this.addItem(old, 1); else this.addItem(itemId, -1);
        if (old && old !== itemId) this.addItem(itemId, -1);
        s.equip[slot] = itemId;
    }

    unequip (confId: number, slot: EquipSlot): void {
        const s = this.data.heroes[confId];
        if (!s || !s.equip[slot]) return;
        this.addItem(s.equip[slot], 1);
        s.equip[slot] = 0;
    }
}

export const Store = new StoreClass();
export { HERO_MAP, getHeroConf, Quality };

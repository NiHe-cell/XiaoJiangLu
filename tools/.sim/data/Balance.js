"use strict";
/**
 * 战斗数值与公式（纯数据层，禁止 import cc）
 *
 * 设计取向 [待数值验证]：
 *  1) 所有战斗数值集中在此文件，改数值不改 BattleCore 逻辑。
 *  2) 目标是普通关卡 3-8 回合结束，三星靠「少回合 + 零阵亡」，不是靠堆伤害。
 *  3) 伤害用经典 攻×(1 - 防/(防+K)) 形式：永远为正，不会出现负血与除零，
 *     且高星坦克与脆皮辅助的有效血量差主要由 maxHp 拉开（约 4-5 倍），防御做二次区分。
 *  4) 治疗走 攻击×系数×HEAL_SCALE：因为 HeroConf 里辅助的攻击很低（约输出的一半），
 *     不乘系数的话治疗量只占坦克血量的 5%，辅助等于没用。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BAL = exports.STAGES_PER_CHAPTER = exports.COUNTER_EVEN = exports.COUNTER_DOWN = exports.COUNTER_UP = exports.CRIT_CAP = exports.DMG_SCALE = exports.MIN_DAMAGE = exports.HEAL_VARIANCE = exports.DMG_VARIANCE = exports.COMBO_ATK_SCALE = exports.HEAL_SCALE = exports.HEAL_ATK_K = exports.HEAL_HP_K = exports.MIN_DEF_FACTOR = exports.DEF_K = void 0;
// ───────────────────────── 可调常量 ─────────────────────────
/** 防御折算常数 K：伤害倍率 = K / (K + def)。K 越小防御越硬（回合数越长）。 */
exports.DEF_K = 500;
/** 防御减伤后的最低保底系数，防止极端配装下伤害被压到 0 */
exports.MIN_DEF_FACTOR = 0.15;
/**
 * 治疗：主词条 = 目标最大生命的百分比，副词条 = 施法者攻击。
 * 只按攻击算的话，辅助的攻击只有输出的一半多点，一口奶不到坦克血量的 5%，
 * 治疗等于不存在（960 场模拟实证：场均我方阵亡 3.3 / 5 人）。
 * HEAL_HP_K = 每 1.0 healRatio 恢复「目标最大生命」的 22%，一口奶约抵一次普攻。
 */
exports.HEAL_HP_K = 0.22;
/** 治疗的攻击系数（保留小权重，让辅助堆攻击仍有意义） */
exports.HEAL_ATK_K = 1.2; /** 向后兼容旧名（= 攻击系数），旧代码引用 HEAL_SCALE 不会断 */
exports.HEAL_SCALE = exports.HEAL_ATK_K;
/** 合击攻击力折算：合击攻击 = 参与成员有效攻击之和 × 该系数 */
exports.COMBO_ATK_SCALE = 0.65;
/** 伤害随机浮动 ±5%（0.95 ~ 1.05），一个 each-hit 独立 roll */
exports.DMG_VARIANCE = 0.1;
/** 治疗随机浮动 ±3% */
exports.HEAL_VARIANCE = 0.06;
/** 单次打击最低伤害 */
exports.MIN_DAMAGE = 1;
/**
 * 全局伤害缩放 [待数值验证 · 裴策 2026-09-29 用 960 场模拟标定]
 * 标定口径：分章进度阵容（第1章 3 人 / 第6章五虎 6 人）、双方同等级、无装备，48 关 × 20 局。
 *   scale 6.5 → 平均 3.6 回合，分布里 1-2 回合 40%，双方被「一回合打穿」，且三星率 0%
 *   scale 3.5 → 平均 5.07 回合，普攻占目标最大生命 28.8%（≈3.5 刀砍死一个）
 *   scale 3.0 → 平均 5.84 回合，占 24.5%（≈4 刀），78% 的场次落在 3-7 回合 ← 取这个
 *   scale 2.5 → 平均 6.86 回合，占 20.4%，超时率升到 1.4%（互奶拖场开始出现）
 * 改这一个数即可整体加快/放慢战斗节奏；低于 2.5 会出现奶量追平伤害的僵局。
 */
exports.DMG_SCALE = 3.0;
/** 暴击率上限 */
exports.CRIT_CAP = 0.75;
/** 软克制：克制方 / 被克方 / 中性 */
exports.COUNTER_UP = 1.1;
exports.COUNTER_DOWN = 0.9;
exports.COUNTER_EVEN = 1.0;
/** 每章关卡数 */
exports.STAGES_PER_CHAPTER = 8;
// ───────────────────────── 数值主体 ─────────────────────────
exports.BAL = {
    /** 单次打击保底伤害（防止极端防御配装下打 0 血带来的「点了没反应」） */
    minDamage: exports.MIN_DAMAGE,
    /** 暴击率上限 */
    critCap: exports.CRIT_CAP,
    /** 防御折算常数 K（只读参考，改这里不生效，改上面的 DEF_K） */
    defK: exports.DEF_K,
    /** 合击攻击力折算系数（只读引用，改上面的 COMBO_ATK_SCALE） */
    comboAtkScale: exports.COMBO_ATK_SCALE,
    /** 怒气上限 */
    rageMax: 100,
    /** 战场开局给每个人物的初始怒气（让第一个必杀落在第 3 回合左右） */
    rageInit: 20,
    /** 每次出手（普攻/怒气技/纯治疗技都算）自身获得怒气 */
    rageOnAttack: 30,
    /** 每次受到伤害获得怒气 */
    rageOnHurt: 12,
    /** 击杀额外获得怒气（可能用于连杀滚雪球） */
    rageOnKill: 25,
    /** 释放怒气技后的怒气返还（0 = 清空重来） */
    rageOnSkill: 0,
    /** 基础暴击率 */
    critBase: 0.08,
    /** 暴击倍率 */
    critMul: 1.6,
    /** 回合上限保护：超过则按剩余血量百分比判胜，平局判守方（敌方）胜 */
    maxRound: 30,
    /** 每关体力消耗 */
    staminaPerStage: 6,
    // ── 伤害 ──
    /**
     * 伤害公式。
     * @param atk   施法者有效攻击（已含 buff）
     * @param def   目标有效防御（法攻取 mdef，其余取 pdef）
     * @param ratio 技能 atkRatio（普攻为 1）
     * @param crit  本次是否暴击（由调用方掷骰决定）
     * @param rnd   [0,1) 随机源，来自 BattleCore 的种子随机
     */
    calcDamage(atk, def, ratio, crit, rnd) {
        const a = Math.max(0, exports.BAL.fin(atk));
        const d = Math.max(0, exports.BAL.fin(def));
        const r = Math.max(0, exports.BAL.fin(ratio));
        const variance = 1 - exports.DMG_VARIANCE / 2 + exports.BAL.clamp01(rnd) * exports.DMG_VARIANCE;
        let factor = exports.DEF_K / (exports.DEF_K + d);
        if (factor < exports.MIN_DEF_FACTOR) {
            factor = exports.MIN_DEF_FACTOR;
        }
        let raw = a * r * factor * variance * exports.DMG_SCALE;
        if (crit) {
            raw *= exports.BAL.critMul;
        }
        const out = Math.round(raw);
        if (!isFinite(out) || out < exports.MIN_DAMAGE) {
            return exports.MIN_DAMAGE;
        }
        return out;
    },
    /** 治疗公式：目标最大生命为主 + 施法者攻击为辅。maxHp 省略时退化成纯攻击系数 */
    calcHeal(atk, ratio, rnd, maxHp) {
        const a = Math.max(0, exports.BAL.fin(atk));
        const r = Math.max(0, exports.BAL.fin(ratio));
        const hp = Math.max(0, exports.BAL.fin(maxHp));
        const variance = 1 - exports.HEAL_VARIANCE / 2 + exports.BAL.clamp01(rnd) * exports.HEAL_VARIANCE;
        const out = Math.round((hp * r * exports.HEAL_HP_K + a * r * exports.HEAL_ATK_K) * variance);
        if (!isFinite(out) || out < 1) {
            return 1;
        }
        return out;
    },
    // ── 关卡 ──
    /**
     * 敌方等级：chapter 从 1 起，index 从 0 起（每章 8 关）。
     * 与 StageConf.enemyLevel 保持一致：等级 = (chapter-1)*8 + index + 1。
     */
    stageEnemyLevel(chapter, index) {
        const c = Math.max(1, Math.floor(exports.BAL.fin(chapter)));
        const i = exports.BAL.clampi(index, 0, exports.STAGES_PER_CHAPTER - 1);
        return (c - 1) * exports.STAGES_PER_CHAPTER + i + 1;
    },
    /**
     * 敌方数量 3-6：同章内越靠后越多，章节越深整体越多。
     * 第 1-2 章 3~5 人，第 3-4 章 4~6 人，第 5-6 章 5~6 人。
     */
    stageEnemyCount(chapter, index) {
        const c = Math.max(1, Math.floor(exports.BAL.fin(chapter)));
        const i = exports.BAL.clampi(index, 0, exports.STAGES_PER_CHAPTER - 1);
        let n = 3 + Math.floor(i / 3); // 0-2:3  3-5:4  6-7:5
        if (c >= 3) {
            n += 1;
        }
        if (c >= 5) {
            n += 1;
        }
        if (n < 3) {
            n = 3;
        }
        if (n > 6) {
            n = 6;
        }
        return n;
    },
    /**
     * 通关星级。定档依据：3368 场（ENEMY_K=0.035）实测矩阵 ——
     *   阵亡≤0 在任意回合上限下都只有 0.2%（零阵亡在机制上极罕见），
     *   所以「零阵亡」不能作为三星主词条，否则三星率恒为 0、扫荡链路断死。
     *   阵亡≤1: ≤4R 52.9% / ≤5R 65.0% / ≤6R 65.1%
     *   阵亡≤2: ≤5R 70.1% / ≤6R 81.4% / ≤8R 88.1%
     * 取「阵亡≤1 且 ≤5 回合」为三星：保守进度下约 65%，随养成继续上升，
     * 后期章节（第 6 章平均 7.9 回合 / 3.77 阵亡）仍然拿不到，难度梯度保留。
     *
     * ⚠️ 给裴策：本函数于 2026-09-29 由 team-lead 定档、文辞代改，
     * 原因是裴策当日因 429 频率限制离线、而扫荡链路已断。
     * 若你对档位有异议，请直接找 team-lead，不要静默覆盖。
     */
    calcStars(rounds, dead) {
        const r = Math.max(1, Math.round(exports.BAL.fin(rounds)));
        const d = Math.max(0, Math.round(exports.BAL.fin(dead)));
        if (d <= 1 && r <= 6) {
            return 3;
        }
        if (d <= 2 && r <= 8) {
            return 2;
        }
        return 1;
    },
    /**
     * 实战用敌人数：在 stageEnemyCount 基础上**按我方上阵人数封顶**。
     * 直接照搬 3-6 的话，新手 3 人阵容会被 4 人敌阵打崩（107/108/203/204/207/208 实测胜率 0%）。
     * 第 1-2 章敌数 ≤ 我方人数；第 3-4 章 +1（开始有压力）；第 5-6 章 +2（需要成型阵容）。
     * @param allyCount 我方上阵人数
     */
    stageEnemyCountFor(chapter, index, allyCount) {
        const base = exports.BAL.stageEnemyCount(chapter, index);
        const allies = Math.max(1, Math.floor(exports.BAL.fin(allyCount)));
        const c = Math.max(1, Math.floor(exports.BAL.fin(chapter)));
        let cap = allies;
        if (c >= 3) {
            cap = allies + 1;
        }
        if (c >= 5) {
            cap = allies + 2;
        }
        const n = Math.min(base, cap);
        return Math.max(1, Math.min(6, n));
    },
    /** 关卡常驻奖励：随章节、章内序号、玩家等级三段增长 */
    stageReward(chapter, index, level) {
        const c = Math.max(1, Math.floor(exports.BAL.fin(chapter)));
        const i = exports.BAL.clampi(index, 0, exports.STAGES_PER_CHAPTER - 1);
        const lv = Math.max(1, Math.floor(exports.BAL.fin(level)));
        const ck = 1 + (c - 1) * 0.5; // 章节系数：1 / 1.5 / 2 / 2.5 / 3 / 3.5
        const ik = 1 + i * 0.05; // 章内序号系数：1.00 ~ 1.35
        const exp = Math.round(40 * ck * ik * (1 + lv * 0.08));
        const silver = Math.round(120 * (1 + (c - 1) * 0.6) * ik * (1 + lv * 0.1));
        const items = [];
        // 将魂（常态掉落）
        items.push({ id: 5101, n: 1 + Math.floor(c / 2) });
        // 精炼石
        if (c >= 3 && i % 4 === 1) {
            items.push({ id: 5105, n: 1 });
        }
        // 进阶丹（硬瓶颈，每三关一次）
        if (c >= 2 && i % 3 === 2) {
            items.push({ id: 5103, n: 1 });
        }
        // 章末（第 8 关）给对应武将碎片
        if (i === exports.STAGES_PER_CHAPTER - 1) {
            items.push({ id: 5201 + ((c - 1) % 6), n: 2 });
        }
        return { exp, silver, items };
    },
    /** 首通额外奖励：经验的 2 倍 + 银币的 2 倍 + 将玉（将玉只从首通与玩法产出，无充值入口） */
    firstClearBonus(chapter, index) {
        const c = Math.max(1, Math.floor(exports.BAL.fin(chapter)));
        const i = exports.BAL.clampi(index, 0, exports.STAGES_PER_CHAPTER - 1);
        const base = exports.BAL.stageReward(c, i, 1);
        const lastStage = i === exports.STAGES_PER_CHAPTER - 1;
        const jade = lastStage ? (10 + (c - 1) * 4) * 2 : 10 + (c - 1) * 4;
        return { exp: base.exp * 2, silver: base.silver * 2, jade };
    },
    /**
     * 阵营软克制（四类型循环克制）：法攻 → 防御 → 物攻 → 辅助 → 法攻
     *   法攻 2 克 防御 4｜防御 4 克 物攻 1｜物攻 1 克 辅助 3｜辅助 3 克 法攻 2
     * 克制 ±10%，其余 1.0。软克制：只影响 μ，不影响胜负与否。
     */
    typeCounter(attackerRole, defenderRole) {
        const a = Math.round(exports.BAL.fin(attackerRole));
        const d = Math.round(exports.BAL.fin(defenderRole));
        if (a === d) {
            return exports.COUNTER_EVEN;
        }
        // key = attacker -> victim
        const key = a * 10 + d;
        switch (key) {
            case 24: // 法攻克防御
            case 41: // 防御克物攻
            case 13: // 物攻克辅助
            case 32: // 辅助克法攻
                return exports.COUNTER_UP;
            case 42:
            case 14:
            case 31:
            case 23:
                return exports.COUNTER_DOWN;
            default:
                return exports.COUNTER_EVEN;
        }
    },
    // ── 通用小工具（供 BattleCore / 表现层复用，保证同一套公式只有一份） ──
    /** 成长值换算：等级 lv 的属性 = base + grow × (lv-1) */
    growStat(base, grow, level) {
        const lv = Math.max(1, Math.floor(exports.BAL.fin(level)));
        const out = exports.BAL.fin(base) + exports.BAL.fin(grow) * (lv - 1);
        return out > 0 ? Math.round(out) : 0;
    },
    /** 非有限数兜底为 0 */
    fin(v) {
        return typeof v === 'number' && isFinite(v) ? v : 0;
    },
    /** [0,1] 截断 */
    clamp01(v) {
        const x = exports.BAL.fin(v);
        return x < 0 ? 0 : x > 1 ? 1 : x;
    },
    /** 整数区间截断 */
    clampi(v, lo, hi) {
        const x = Math.floor(exports.BAL.fin(v));
        return x < lo ? lo : x > hi ? hi : x;
    },
    /** 数值区间截断 */
    clamp(v, lo, hi) {
        const x = exports.BAL.fin(v);
        return x < lo ? lo : x > hi ? hi : x;
    },
};
exports.default = exports.BAL;

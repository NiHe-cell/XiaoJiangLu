/**
 * 技能静态配置表
 * id 规则：怒气技 2001-2036（= 武将 id + 1000）｜天赋 3001-3036（= 武将 id + 2000）｜羁绊合击 4001-4013
 * 约定：
 *  1) buffs 作用于「技能目标」：目标是敌人时填负值即为减益，目标是自身/友方时填正值即为增益。
 *  2) turns = 0 表示持续到战斗结束（天赋类常用）。
 *  3) atkRatio / healRatio 为 0 表示不具备该效果，不要靠 hitCount 判断。
 *  4) cast 用于战斗飘字，控制在 12 字以内。
 */
import { Quality } from './HeroConf';

export type SkillTarget = 'enemyFront' | 'enemySingleLow' | 'enemyAll' | 'allyLowest' | 'allyAll' | 'self';

export interface BuffEffect {
  /** 影响的战斗属性 */
  stat: 'atk' | 'pdef' | 'mdef' | 'speed' | 'crit' | 'rage';
  /** 变化量，isPct 为真时是百分比（0.2 = +20%），否则是数值点 */
  value: number;
  /** 持续回合，0 = 持续到战斗结束 */
  turns: number;
  isPct: boolean;
}

export interface SkillConf {
  id: number;
  name: string;
  ownerHeroId: number;
  kind: 'rage' | 'talent' | 'bond';
  target: SkillTarget;
  /** 伤害系数（×武将攻击） */
  atkRatio: number;
  /** 治疗系数（×武将攻击） */
  healRatio: number;
  /** 段数，多段用于手感 */
  hitCount: number;
  /** 额外暴击率 0-1 */
  critBonus: number;
  /** 释放后自身获怒 */
  rageGainSelf: number;
  buffs: BuffEffect[];
  /** 技能描述，≤30 字，写清楚打谁干什么 */
  desc: string;
  /** 释放喊话，≤12 字 */
  cast: string;
}

export const SKILL_CONF: SkillConf[] = [
  // ─────────── 怒气技（24） ───────────
  { id: 2000, name: '奋起一击', ownerHeroId: 1000, kind: 'rage', target: 'enemyFront',
    atkRatio: 1.6, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 15,
    buffs: [], desc: '直取敌阵前排，战后回怒', cast: '随我冲！' },
  { id: 2001, name: '魏武挥鞭', ownerHeroId: 1001, kind: 'rage', target: 'enemyAll',
    atkRatio: 1.35, healRatio: 0, hitCount: 1, critBonus: 0.05, rageGainSelf: 0,
    buffs: [{ stat: 'mdef', value: -0.15, turns: 2, isPct: true }],
    desc: '横扫敌军全体，法防降两回合', cast: '天下英雄，唯孤！' },
  { id: 2002, name: '拔矢啖睛', ownerHeroId: 1002, kind: 'rage', target: 'enemyFront',
    atkRatio: 1.7, healRatio: 0, hitCount: 1, critBonus: 0.05, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: -0.18, turns: 2, isPct: true }],
    desc: '猛击前排，削其攻击两回合', cast: '父精母血，啖之！' },
  { id: 2003, name: '威震逍遥津', ownerHeroId: 1003, kind: 'rage', target: 'enemyFront',
    atkRatio: 0.75, healRatio: 0, hitCount: 3, critBonus: 0.1, rageGainSelf: 0,
    buffs: [], desc: '三段直冲敌阵前排', cast: '吴人胆寒！' },
  { id: 2004, name: '虎痴怒吼', ownerHeroId: 1004, kind: 'rage', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'pdef', value: 0.35, turns: 2, isPct: true }, { stat: 'mdef', value: 0.35, turns: 2, isPct: true }],
    desc: '赤膊上阵，双防大涨两回合', cast: '虎痴在此！' },
  { id: 2005, name: '十胜十败', ownerHeroId: 1005, kind: 'rage', target: 'allyAll',
    atkRatio: 0, healRatio: 0.55, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'rage', value: 20, turns: 0, isPct: false }],
    desc: '全队回血，并各回二十点怒气', cast: '此计，十胜。' },
  { id: 2006, name: '长驱直入', ownerHeroId: 1006, kind: 'rage', target: 'enemyFront',
    atkRatio: 0.9, healRatio: 0, hitCount: 2, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'speed', value: -0.2, turns: 2, isPct: true }],
    desc: '两击破敌前排，削其速度', cast: '军令如山，进！' },
  { id: 2011, name: '仁德之护', ownerHeroId: 1011, kind: 'rage', target: 'allyLowest',
    atkRatio: 0, healRatio: 1.2, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'pdef', value: 0.2, turns: 2, isPct: true }, { stat: 'mdef', value: 0.2, turns: 2, isPct: true }],
    desc: '救治最危一人，护住其双防', cast: '备，在此。' },
  { id: 2012, name: '青龙偃月', ownerHeroId: 1012, kind: 'rage', target: 'enemyFront',
    atkRatio: 2.6, healRatio: 0, hitCount: 1, critBonus: 0.2, rageGainSelf: 0,
    buffs: [], desc: '单刀劈前排，暴击率大增', cast: '青龙偃月，斩！' },
  { id: 2013, name: '当阳怒吼', ownerHeroId: 1013, kind: 'rage', target: 'enemyAll',
    atkRatio: 1.5, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: -0.25, turns: 2, isPct: true }],
    desc: '一吼震全场，削敌军攻击', cast: '燕人张翼德！' },
  { id: 2014, name: '七进七出', ownerHeroId: 1014, kind: 'rage', target: 'enemySingleLow',
    atkRatio: 0.35, healRatio: 0, hitCount: 4, critBonus: 0.15, rageGainSelf: 0,
    buffs: [], desc: '四连突刺，专挑残血追击', cast: '常山赵子龙！' },
  { id: 2015, name: '铁骑冲阵', ownerHeroId: 1015, kind: 'rage', target: 'enemyFront',
    atkRatio: 1.0, healRatio: 0, hitCount: 2, critBonus: 0.05, rageGainSelf: 0,
    buffs: [{ stat: 'pdef', value: -0.2, turns: 2, isPct: true }],
    desc: '西凉铁骑冲阵，破敌物防', cast: '西凉铁骑，冲！' },
  { id: 2016, name: '百步穿杨', ownerHeroId: 1016, kind: 'rage', target: 'enemySingleLow',
    atkRatio: 2.4, healRatio: 0, hitCount: 1, critBonus: 0.25, rageGainSelf: 0,
    buffs: [], desc: '一箭取敌最弱者，极易暴击', cast: '老将开弓。' },
  { id: 2017, name: '八阵图', ownerHeroId: 1017, kind: 'rage', target: 'enemyAll',
    atkRatio: 0.9, healRatio: 0, hitCount: 2, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'speed', value: -0.25, turns: 2, isPct: true }],
    desc: '八阵困敌全体，行动变迟缓', cast: '八阵既成。' },
  { id: 2021, name: '霸王枪', ownerHeroId: 1021, kind: 'rage', target: 'enemyFront',
    atkRatio: 1.1, healRatio: 0, hitCount: 2, critBonus: 0.1, rageGainSelf: 0,
    buffs: [{ stat: 'pdef', value: -0.15, turns: 2, isPct: true }],
    desc: '双段猛击前排，附带破防', cast: '江东小霸王！' },
  { id: 2022, name: '烈焰焚江', ownerHeroId: 1022, kind: 'rage', target: 'enemyAll',
    atkRatio: 1.9, healRatio: 0, hitCount: 1, critBonus: 0.05, rageGainSelf: 0,
    buffs: [{ stat: 'mdef', value: -0.2, turns: 2, isPct: true }],
    desc: '烈焰焚敌全体，法防大损', cast: '这一把火，烧！' },
  { id: 2023, name: '琴心', ownerHeroId: 1023, kind: 'rage', target: 'allyAll',
    atkRatio: 0, healRatio: 0.5, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'mdef', value: 0.2, turns: 2, isPct: true }],
    desc: '抚琴安神，全队回血加法防', cast: '且听一曲。' },
  { id: 2024, name: '战前奉茶', ownerHeroId: 1024, kind: 'rage', target: 'allyLowest',
    atkRatio: 0, healRatio: 1.5, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'rage', value: 15, turns: 0, isPct: false }],
    desc: '为最危一人奉茶，回血回怒', cast: '将军，请用茶。' },
  { id: 2031, name: '辕门射戟', ownerHeroId: 1031, kind: 'rage', target: 'enemyAll',
    atkRatio: 2.3, healRatio: 0, hitCount: 1, critBonus: 0.15, rageGainSelf: 0,
    buffs: [], desc: '一箭贯穿敌阵，全员重创', cast: '方天画戟，来！' },
  { id: 2032, name: '离间', ownerHeroId: 1032, kind: 'rage', target: 'enemyAll',
    atkRatio: 0.9, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: -0.3, turns: 2, isPct: true }],
    desc: '挑拨敌阵，全员攻击大跌', cast: '将军莫怪妾身。' },
  { id: 2033, name: '酒池肉林', ownerHeroId: 1033, kind: 'rage', target: 'self',
    atkRatio: 0, healRatio: 0.35, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'pdef', value: 0.3, turns: 2, isPct: true }],
    desc: '贪食自补，回血并固守', cast: '谁敢拦我！' },
  { id: 2034, name: '河北上将', ownerHeroId: 1034, kind: 'rage', target: 'enemyFront',
    atkRatio: 1.9, healRatio: 0, hitCount: 1, critBonus: 0.05, rageGainSelf: 0,
    buffs: [], desc: '大力劈砍敌阵前排', cast: '来将通名！' },
  { id: 2035, name: '横刀立马', ownerHeroId: 1035, kind: 'rage', target: 'enemyFront',
    atkRatio: 0.8, healRatio: 0, hitCount: 2, critBonus: 0, rageGainSelf: 0,
    buffs: [], desc: '连斩敌阵前排两刀', cast: '挡我者死。' },
  { id: 2036, name: '青囊书', ownerHeroId: 1036, kind: 'rage', target: 'allyAll',
    atkRatio: 0, healRatio: 0.75, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.12, turns: 2, isPct: true }],
    desc: '全队疗伤，并略微提振攻势', cast: '麻沸散，服下。' },

  // ─────────── 天赋（24，进阶 +6 解锁） ───────────
  { id: 3000, name: '骁勇', ownerHeroId: 1000, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.1, turns: 0, isPct: true }],
    desc: '自身攻击永久提升一成', cast: '' },
  { id: 3001, name: '奸雄之志', ownerHeroId: 1001, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'crit', value: 0.08, turns: 0, isPct: true }],
    desc: '暴击率永久提升八点', cast: '孤，从不认输。' },
  { id: 3002, name: '刚烈', ownerHeroId: 1002, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'pdef', value: 0.15, turns: 0, isPct: true }],
    desc: '物防永久提升一成五', cast: '独目也能战。' },
  { id: 3003, name: '陷阵', ownerHeroId: 1003, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.12, turns: 0, isPct: true }, { stat: 'speed', value: 0.05, turns: 0, isPct: true }],
    desc: '攻击与速度永久提升', cast: '陷阵之志。' },
  { id: 3004, name: '虎卫', ownerHeroId: 1004, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'pdef', value: 0.12, turns: 0, isPct: true }, { stat: 'mdef', value: 0.12, turns: 0, isPct: true }],
    desc: '双防各永久提升一成二', cast: '有我守着。' },
  { id: 3005, name: '鬼才', ownerHeroId: 1005, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 10,
    buffs: [{ stat: 'speed', value: 0.1, turns: 0, isPct: true }],
    desc: '速度永久提升一成，开局回怒', cast: '料敌于先。' },
  { id: 3006, name: '周亚夫之风', ownerHeroId: 1006, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'pdef', value: 0.1, turns: 0, isPct: true }],
    desc: '物防永久提升一成', cast: '军令如山。' },
  { id: 3011, name: '仁德', ownerHeroId: 1011, kind: 'talent', target: 'allyAll',
    atkRatio: 0, healRatio: 0.25, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.08, turns: 2, isPct: true }],
    desc: '每回合为全队少量回血', cast: '百姓何辜。' },
  { id: 3012, name: '武圣', ownerHeroId: 1012, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'crit', value: 0.12, turns: 0, isPct: true }],
    desc: '暴击率永久提升十二点', cast: '义不负心。' },
  { id: 3013, name: '咆哮', ownerHeroId: 1013, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.14, turns: 0, isPct: true }, { stat: 'pdef', value: -0.05, turns: 0, isPct: true }],
    desc: '攻击大涨，物防略降', cast: '喝一声！' },
  { id: 3014, name: '一身是胆', ownerHeroId: 1014, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'speed', value: 0.12, turns: 0, isPct: true }, { stat: 'crit', value: 0.06, turns: 0, isPct: true }],
    desc: '速度与暴击永久提升', cast: '浑身是胆。' },
  { id: 3015, name: '西凉血', ownerHeroId: 1015, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.15, turns: 0, isPct: true }],
    desc: '攻击永久提升一成五', cast: '西凉男儿。' },
  { id: 3016, name: '老而弥坚', ownerHeroId: 1016, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'crit', value: 0.15, turns: 0, isPct: true }],
    desc: '暴击率永久提升十五点', cast: '老将未老。' },
  { id: 3017, name: '卧龙', ownerHeroId: 1017, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.12, turns: 0, isPct: true }, { stat: 'mdef', value: 0.1, turns: 0, isPct: true }],
    desc: '攻击与法防永久提升', cast: '鞠躬尽瘁。' },
  { id: 3021, name: '霸王之姿', ownerHeroId: 1021, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.13, turns: 0, isPct: true }, { stat: 'speed', value: 0.06, turns: 0, isPct: true }],
    desc: '攻击与速度永久提升', cast: '江东我说了算。' },
  { id: 3022, name: '雄姿英发', ownerHeroId: 1022, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'crit', value: 0.1, turns: 0, isPct: true }],
    desc: '暴击率永久提升十点', cast: '雄姿英发。' },
  { id: 3023, name: '国色', ownerHeroId: 1023, kind: 'talent', target: 'allyAll',
    atkRatio: 0, healRatio: 0.2, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'mdef', value: 0.1, turns: 0, isPct: true }],
    desc: '全队法防提升，并持续回血', cast: '妾身陪着。' },
  { id: 3024, name: '天香', ownerHeroId: 1024, kind: 'talent', target: 'allyLowest',
    atkRatio: 0, healRatio: 0.6, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'rage', value: 10, turns: 0, isPct: false }],
    desc: '持续为最危一人回血回怒', cast: '将军莫慌。' },
  { id: 3031, name: '无双', ownerHeroId: 1031, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.2, turns: 0, isPct: true }, { stat: 'pdef', value: -0.08, turns: 0, isPct: true }],
    desc: '攻击暴涨，物防下降', cast: '还有谁！' },
  { id: 3032, name: '闭月', ownerHeroId: 1032, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'speed', value: 0.08, turns: 0, isPct: true }, { stat: 'mdef', value: 0.12, turns: 0, isPct: true }],
    desc: '速度与法防永久提升', cast: '月，也闭了。' },
  { id: 3033, name: '暴虐', ownerHeroId: 1033, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.1, turns: 0, isPct: true }, { stat: 'crit', value: 0.05, turns: 0, isPct: true }],
    desc: '攻击与暴击小幅提升', cast: '顺我者昌。' },
  { id: 3034, name: '河北雄风', ownerHeroId: 1034, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.1, turns: 0, isPct: true }],
    desc: '攻击永久提升一成', cast: '河北颜良。' },
  { id: 3035, name: '双雄之勇', ownerHeroId: 1035, kind: 'talent', target: 'self',
    atkRatio: 0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'pdef', value: 0.12, turns: 0, isPct: true }, { stat: 'atk', value: 0.06, turns: 0, isPct: true }],
    desc: '物防与攻击永久提升', cast: '与兄同去。' },
  { id: 3036, name: '麻沸散', ownerHeroId: 1036, kind: 'talent', target: 'allyAll',
    atkRatio: 0, healRatio: 0.3, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [], desc: '每回合为全队持续疗伤', cast: '医者仁心。' },

  // ─────────── 羁绊合击技（13） ───────────
  { id: 4001, name: '桃园结义', ownerHeroId: 0, kind: 'bond', target: 'enemyAll',
    atkRatio: 2.6, healRatio: 0, hitCount: 1, critBonus: 0.1, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: -0.2, turns: 2, isPct: true }],
    desc: '三兄弟齐出，重创敌全体', cast: '不求同生，但求同死！' },
  { id: 4002, name: '五虎齐鸣', ownerHeroId: 0, kind: 'bond', target: 'enemyAll',
    atkRatio: 0.65, healRatio: 0, hitCount: 5, critBonus: 0.1, rageGainSelf: 0,
    buffs: [{ stat: 'pdef', value: -0.3, turns: 2, isPct: true }],
    desc: '五虎连击全场，物防尽破', cast: '五虎上将，在此！' },
  { id: 4003, name: '隆中对', ownerHeroId: 0, kind: 'bond', target: 'allyAll',
    atkRatio: 0, healRatio: 0.9, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.25, turns: 2, isPct: true }, { stat: 'rage', value: 25, turns: 0, isPct: false }],
    desc: '全队大回血，攻势与怒气齐涨', cast: '三分天下，定矣。' },
  { id: 4004, name: '双姝', ownerHeroId: 0, kind: 'bond', target: 'allyAll',
    atkRatio: 0, healRatio: 1.0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'mdef', value: 0.25, turns: 2, isPct: true }],
    desc: '双姝同台，全队回血固防', cast: '姐妹同心。' },
  { id: 4005, name: '双璧交辉', ownerHeroId: 0, kind: 'bond', target: 'enemyAll',
    atkRatio: 1.2, healRatio: 0, hitCount: 2, critBonus: 0.05, rageGainSelf: 0,
    buffs: [{ stat: 'speed', value: -0.3, turns: 2, isPct: true }],
    desc: '火烧连营，敌全体行动迟滞', cast: '江东双璧，战！' },
  { id: 4006, name: '人中吕布', ownerHeroId: 0, kind: 'bond', target: 'enemySingleLow',
    atkRatio: 3.2, healRatio: 0, hitCount: 1, critBonus: 0.3, rageGainSelf: 0,
    buffs: [], desc: '一箭取敌最弱，务求一击毙命', cast: '人中吕布，马中赤兔！' },
  { id: 4007, name: '并进', ownerHeroId: 0, kind: 'bond', target: 'enemyFront',
    atkRatio: 1.3, healRatio: 0, hitCount: 2, critBonus: 0.05, rageGainSelf: 0,
    buffs: [{ stat: 'pdef', value: -0.25, turns: 2, isPct: true }],
    desc: '双雄并进，破敌前排物防', cast: '河北双雄，上！' },
  { id: 4008, name: '五子破阵', ownerHeroId: 0, kind: 'bond', target: 'enemyFront',
    atkRatio: 1.0, healRatio: 0, hitCount: 3, critBonus: 0.05, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: -0.25, turns: 2, isPct: true }],
    desc: '三连突袭前排，削其攻击', cast: '五子良将，破阵！' },
  { id: 4009, name: '谋定后动', ownerHeroId: 0, kind: 'bond', target: 'enemyAll',
    atkRatio: 0.8, healRatio: 0, hitCount: 2, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'mdef', value: -0.3, turns: 2, isPct: true }, { stat: 'atk', value: -0.15, turns: 2, isPct: true }],
    desc: '谋定后动，敌全体攻防皆损', cast: '吾知绍之败也。' },
  { id: 4010, name: '虎卫护主', ownerHeroId: 0, kind: 'bond', target: 'self',
    atkRatio: 0, healRatio: 0.3, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'pdef', value: 0.4, turns: 2, isPct: true }, { stat: 'mdef', value: 0.4, turns: 2, isPct: true }],
    desc: '虎卫列阵，双防大涨并回血', cast: '主公勿忧！' },
  { id: 4011, name: '刮骨疗毒', ownerHeroId: 0, kind: 'bond', target: 'allyAll',
    atkRatio: 0, healRatio: 1.2, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: 0.15, turns: 2, isPct: true }],
    desc: '刮骨疗毒，全队回血且战意更盛', cast: '此毒，非刮不可。' },
  { id: 4012, name: '火烧赤壁', ownerHeroId: 0, kind: 'bond', target: 'enemyAll',
    atkRatio: 1.7, healRatio: 0, hitCount: 2, critBonus: 0.15, rageGainSelf: 0,
    buffs: [{ stat: 'mdef', value: -0.3, turns: 2, isPct: true }],
    desc: '联军纵火，敌全体大损法防尽失', cast: '万事俱备，只欠东风！' },
  { id: 4013, name: '连环', ownerHeroId: 0, kind: 'bond', target: 'enemyAll',
    atkRatio: 2.0, healRatio: 0, hitCount: 1, critBonus: 0, rageGainSelf: 0,
    buffs: [{ stat: 'atk', value: -0.35, turns: 2, isPct: true }, { stat: 'speed', value: -0.2, turns: 2, isPct: true }],
    desc: '离间敌阵，攻势与行动双双受挫', cast: '一环扣一环。' },
];

/** 技能 id -> 配置，便于 O(1) 查询 */
export const SKILL_MAP: { [id: number]: SkillConf } = (() => {
  const m: { [id: number]: SkillConf } = {};
  for (const s of SKILL_CONF) {
    m[s.id] = s;
  }
  return m;
})();

/** 查技能配置，查不到时兜底返回第一条（主角怒气技） */
export function getSkillConf(id: number): SkillConf {
  const s = SKILL_MAP[id];
  return s ? s : SKILL_CONF[0];
}

/** 取某武将的怒气技（id = heroId + 1000） */
export function getRageSkill(heroId: number): SkillConf {
  return getSkillConf(heroId + 1000);
}

/** 取某武将的天赋（id = heroId + 2000，进阶 +6 解锁） */
export function getTalentSkill(heroId: number): SkillConf {
  return getSkillConf(heroId + 2000);
}

/**
 * 技能描述里用于展示的品质色号占位（与 ItemConf 共用 Quality 枚举）。
 * 仅给 UI 用，数据层不依赖引擎。
 */
export const QUALITY_LABEL: { [q: number]: string } = {
  [Quality.Green]: '绿',
  [Quality.Blue]: '蓝',
  [Quality.Purple]: '紫',
  [Quality.Orange]: '橙',
  [Quality.Red]: '红',
};

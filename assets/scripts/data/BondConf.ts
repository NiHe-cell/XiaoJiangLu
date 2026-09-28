/**
 * 羁绊静态配置表
 * 规则：
 *  1) 羁绊内武将「同时上阵」才生效属性加成（atkPct 0.12 = 攻击 +12%）。
 *  2) 羁绊内武将「全部满怒」时可释放 comboSkillId 指向的合击技（SKILL_CONF 中 kind='bond'）。
 *  3) 人数越多，单体加成越高但越难凑齐：2 人约 +6%~14%，3 人约 +10%~14%，5 人约 +10%~20%。
 */
import { SkillConf, getSkillConf } from './SkillConf';

export interface BondConf {
  id: number;
  name: string;
  /** 参与武将 2-3 名（五虎为 5 名特例） */
  heroIds: number[];
  /** 全员满怒可放的合击技 id */
  comboSkillId: number;
  /** 同时上阵的属性加成百分比 */
  atkPct: number;
  hpPct: number;
  pdefPct: number;
  mdefPct: number;
  /** 羁绊典故，≤40 字 */
  desc: string;
}

export const BOND_CONF: BondConf[] = [
  { id: 1, name: '桃园结义', heroIds: [1011, 1012, 1013], comboSkillId: 4001,
    atkPct: 0.12, hpPct: 0.14, pdefPct: 0.08, mdefPct: 0.08,
    desc: '桃园花开，三人结拜。不求同年同月生，只求同死。' },
  { id: 2, name: '五虎上将', heroIds: [1012, 1013, 1014, 1015, 1016], comboSkillId: 4002,
    atkPct: 0.2, hpPct: 0.18, pdefPct: 0.12, mdefPct: 0.1,
    desc: '关张赵马黄，蜀汉五虎。一人当关，五人倾国。' },
  { id: 3, name: '三顾茅庐', heroIds: [1011, 1017], comboSkillId: 4003,
    atkPct: 0.1, hpPct: 0.08, pdefPct: 0.05, mdefPct: 0.08,
    desc: '大雪三顾，草堂一席话，先取荆益，再图中原。' },
  { id: 4, name: '江东二乔', heroIds: [1023, 1024], comboSkillId: 4004,
    atkPct: 0.06, hpPct: 0.1, pdefPct: 0.06, mdefPct: 0.1,
    desc: '乔公二女，一嫁孙策一嫁周瑜。铜雀未成，东风先至。' },
  { id: 5, name: '江东双璧', heroIds: [1021, 1022], comboSkillId: 4005,
    atkPct: 0.12, hpPct: 0.08, pdefPct: 0.06, mdefPct: 0.06,
    desc: '总角之交，同娶二乔。一个开江东，一个烧赤壁。' },
  { id: 6, name: '人中吕布', heroIds: [1031, 1032], comboSkillId: 4006,
    atkPct: 0.14, hpPct: 0.08, pdefPct: 0.04, mdefPct: 0.05,
    desc: '人中吕布，马中赤兔。方天画戟之下，无人敢争锋。' },
  { id: 7, name: '河北双雄', heroIds: [1034, 1035], comboSkillId: 4007,
    atkPct: 0.1, hpPct: 0.1, pdefPct: 0.08, mdefPct: 0.04,
    desc: '颜良文丑，袁绍帐下两杆枪。白马延津，皆折于关羽。' },
  { id: 8, name: '五子良将', heroIds: [1003, 1006], comboSkillId: 4008,
    atkPct: 0.11, hpPct: 0.08, pdefPct: 0.08, mdefPct: 0.05,
    desc: '张辽徐晃，同列曹魏五子。异姓为将，战功却最盛。' },
  { id: 9, name: '魏武谋臣', heroIds: [1001, 1005], comboSkillId: 4009,
    atkPct: 0.1, hpPct: 0.06, pdefPct: 0.04, mdefPct: 0.1,
    desc: '郭嘉论十胜十败，曹操横槊而听。官渡之胜，先胜于此。' },
  { id: 10, name: '曹营虎卫', heroIds: [1002, 1004], comboSkillId: 4010,
    atkPct: 0.05, hpPct: 0.14, pdefPct: 0.12, mdefPct: 0.1,
    desc: '夏侯惇守前，许褚护后。曹操睡得着的日子，靠这两人。' },
  { id: 11, name: '刮骨疗毒', heroIds: [1012, 1036], comboSkillId: 4011,
    atkPct: 0.06, hpPct: 0.12, pdefPct: 0.06, mdefPct: 0.06,
    desc: '臂中毒箭，刮骨下棋。关羽谈笑自若，华佗手不抖。' },
  { id: 12, name: '赤壁之火', heroIds: [1017, 1022], comboSkillId: 4012,
    atkPct: 0.13, hpPct: 0.06, pdefPct: 0.03, mdefPct: 0.1,
    desc: '周瑜放火，孔明借风。一夜烧尽曹操八十万人的梦。' },
  { id: 13, name: '连环计', heroIds: [1033, 1032, 1031], comboSkillId: 4013,
    atkPct: 0.12, hpPct: 0.1, pdefPct: 0.06, mdefPct: 0.08,
    desc: '凤仪亭前一哭，父子反目。戟下亡的，是董卓。' },
];

/** 羁绊 id -> 配置，便于 O(1) 查询 */
export const BOND_MAP: { [id: number]: BondConf } = (() => {
  const m: { [id: number]: BondConf } = {};
  for (const b of BOND_CONF) {
    m[b.id] = b;
  }
  return m;
})();

/** 查羁绊配置，查不到时兜底返回第一条 */
export function getBondConf(id: number): BondConf {
  const b = BOND_MAP[id];
  return b ? b : BOND_CONF[0];
}

/** 取某武将参与的全部羁绊 */
export function getBondsByHero(heroId: number): BondConf[] {
  const list: BondConf[] = [];
  for (const b of BOND_CONF) {
    if (b.heroIds.indexOf(heroId) >= 0) {
      list.push(b);
    }
  }
  return list;
}

/**
 * 判断上阵阵容是否激活某羁绊（要求羁绊内武将全部在场）。
 * @param lineup 上阵武将 id 列表
 */
export function isBondActive(bondId: number, lineup: number[]): boolean {
  const b = BOND_MAP[bondId];
  if (!b) {
    return false;
  }
  for (const hid of b.heroIds) {
    if (lineup.indexOf(hid) < 0) {
      return false;
    }
  }
  return true;
}

/** 取羁绊合击技配置（走 getSkillConf，id 写错时不会崩） */
export function getBondComboSkill(bondId: number): SkillConf {
  const b = BOND_MAP[bondId];
  return getSkillConf(b ? b.comboSkillId : 4001);
}

/**
 * 武将静态配置表
 * 数值规则：
 *  1) 纯品质系数 蓝1.00 / 紫1.35 / 橙1.75 / 红2.20（红 = 蓝的 2.2 倍）；
 *     再叠加星级系数 1+(star-1)*0.05，故红 5 星约为蓝 1 星的 2.6 倍（如物攻系 baseHp 900 -> 2376）
 *  2) 类型模板：Tank 高血高双防低速 / Phys 高物攻中速 / Magic 高攻低防 / Support 中血高速低防
 *  3) speed 决定出手顺序，取值 80-160，同类型武将刻意错开（如 Phys 108-136、Support 122-140）
 *  4) skillId = id + 1000（怒气技），talentId = id + 2000（天赋，进阶 +6 解锁）
 *
 * 视觉字段（由美术侧 HeroPalette 使用，纯展示，不参与战斗结算）：
 *  - visualIdx 0-23 互不重复，对应 HeroPalette.HUES[24]（黄金角 137.508° 铺 24 色相）；
 *    分配方式：黄金角下索引差 Δ∈{21,13,8} 会分别收敛到 7.66°/12.40°/20.06°，故把这三个差值当作
 *    禁边、以「阵营容量 Shu8/Wei6/Qun6/Wu4」做图着色精确求解。实测同阵营两两色相间距：
 *    蜀 32.46° / 魏 32.46° / 吴 64.92° / 群 52.52°，全局最差 32.46° ≥ 30° 目标。
 *    阵营内再按「品质降序 × 索引首尾交替」落位，让红将彼此隔得最开。
 *  - headwear H1-H6：兜鍪 / 羽扇冠 / 文士巾 / 凤翅盔 / 帅盔 / 道冠；主角强制 H5 帅盔 + 金色王冠符号
 *  - gender / featureTag 供 UnitView 画发式与五官标记；featureTag 三值封死，不加第四种
 *  - avatarColor 已降级 @deprecated：卡面主色最终由 visualIdx->HUES 派生（待 UI 侧 4 处引用切换后删除）
 */

/** 阵营 */
export enum Camp {
  Wei = 1,
  Shu = 2,
  Wu = 3,
  Qun = 4,
}

/** 武将类型：物攻 / 法攻 / 辅助 / 防御 */
export enum RoleType {
  Phys = 1,
  Magic = 2,
  Support = 3,
  Tank = 4,
}

/** 品质：绿 < 蓝 < 紫 < 橙 < 红 */
export enum Quality {
  Green = 0,
  Blue = 1,
  Purple = 2,
  Orange = 3,
  Red = 4,
}

/** 性别。注意：主角（1000）开局可选男女，表中的值只是默认，UI 须用存档值覆盖 */
export type HeroGender = 'male' | 'female';

/** 五官特征标记，三值封死，不得开成开放字符串（否则每个特例都会变成 UnitView 里的一条 if） */
export type HeroFeatureTag = 'none' | 'beard' | 'eyepatch';

/** 头饰：H1 兜鍪 / H2 羽扇冠 / H3 文士巾 / H4 凤翅盔 / H5 帅盔 / H6 道冠 */
export type HeroHeadwear = 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6';

export interface HeroConf {
  id: number;
  name: string;
  camp: Camp;
  role: RoleType;
  quality: Quality;
  star: number;
  baseHp: number;
  baseAtk: number;
  basePdef: number;
  baseMdef: number;
  baseSpeed: number;
  growHp: number;
  growAtk: number;
  growPdef: number;
  growMdef: number;
  skillId: number;
  talentId: number;
  bondIds: number[];
  /**
   * @deprecated 卡面主色一律由 visualIdx -> HeroPalette.HUES 派生，此字段仅剩历史占位用途。
   * UI 侧残留引用：BattlePanel.ts:171 / BattlePanel.ts:216 / BattlePanel.ts:272 / Common.ts:132。
   * 待上述 4 处切到 heroMainColor(id) 后，本字段连同 24 处数据一并删除。
   */
  avatarColor: string;
  /** 取色索引 0-23，互不重复，指向 HeroPalette.HUES */
  visualIdx: number;
  headwear: HeroHeadwear;
  /** 性别，决定发式与默认头饰走向 */
  gender: HeroGender;
  /** 五官特征标记，仅 none / beard / eyepatch 三值 */
  featureTag: HeroFeatureTag;
  desc: string;
}

export const HERO_CONF: HeroConf[] = [
  {
    id: 1000,
    name: '主公',
    camp: Camp.Shu,
    role: RoleType.Phys,
    quality: Quality.Blue,
    star: 1,
    baseHp: 900,
    baseAtk: 132,
    basePdef: 46,
    baseMdef: 38,
    baseSpeed: 120,
    growHp: 46,
    growAtk: 7,
    growPdef: 2.4,
    growMdef: 2,
    skillId: 2000,
    talentId: 3000,
    bondIds: [],
    avatarColor: '#59B88C',
    visualIdx: 7,
    headwear: 'H5',
    gender: 'male',
    featureTag: 'none',
    desc: '陈留起兵，白手聚义。这一仗，从你开始。',
  },
  {
    id: 1001,
    name: '曹操',
    camp: Camp.Wei,
    role: RoleType.Magic,
    quality: Quality.Orange,
    star: 4,
    baseHp: 1570,
    baseAtk: 302,
    basePdef: 68,
    baseMdef: 109,
    baseSpeed: 110,
    growHp: 80.5,
    growAtk: 16.3,
    growPdef: 3.6,
    growMdef: 5.8,
    skillId: 2001,
    talentId: 3001,
    bondIds: [9],
    avatarColor: '#3E6FA8',
    visualIdx: 0,
    headwear: 'H5',
    gender: 'male',
    featureTag: 'none',
    desc: '挟天子以令诸侯。横槊赋诗，也是真豪杰。',
  },
  {
    id: 1002,
    name: '夏侯惇',
    camp: Camp.Wei,
    role: RoleType.Tank,
    quality: Quality.Purple,
    star: 3,
    baseHp: 1960,
    baseAtk: 122,
    basePdef: 116,
    baseMdef: 101,
    baseSpeed: 92,
    growHp: 101,
    growAtk: 6.5,
    growPdef: 6.2,
    growMdef: 5.3,
    skillId: 2002,
    talentId: 3002,
    bondIds: [10],
    avatarColor: '#2F5A8C',
    visualIdx: 15,
    headwear: 'H1',
    gender: 'male',
    featureTag: 'eyepatch',
    desc: '拔矢啖睛，独目犹战。曹营头号硬骨头。',
  },
  {
    id: 1003,
    name: '张辽',
    camp: Camp.Wei,
    role: RoleType.Phys,
    quality: Quality.Orange,
    star: 4,
    baseHp: 1811,
    baseAtk: 266,
    basePdef: 93,
    baseMdef: 76,
    baseSpeed: 126,
    growHp: 92.6,
    growAtk: 14.1,
    growPdef: 4.8,
    growMdef: 4,
    skillId: 2003,
    talentId: 3003,
    bondIds: [8],
    avatarColor: '#4E86C6',
    visualIdx: 17,
    headwear: 'H4',
    gender: 'male',
    featureTag: 'none',
    desc: '威震逍遥津。八百步卒，踏碎江东十万兵。',
  },
  {
    id: 1004,
    name: '许褚',
    camp: Camp.Wei,
    role: RoleType.Tank,
    quality: Quality.Purple,
    star: 3,
    baseHp: 1960,
    baseAtk: 122,
    basePdef: 116,
    baseMdef: 101,
    baseSpeed: 86,
    growHp: 101,
    growAtk: 6.5,
    growPdef: 6.2,
    growMdef: 5.3,
    skillId: 2004,
    talentId: 3004,
    bondIds: [10],
    avatarColor: '#335F93',
    visualIdx: 11,
    headwear: 'H1',
    gender: 'male',
    featureTag: 'none',
    desc: '裸衣战马超，虎痴名不虚。主公身前那面盾。',
  },
  {
    id: 1005,
    name: '郭嘉',
    camp: Camp.Wei,
    role: RoleType.Support,
    quality: Quality.Orange,
    star: 4,
    baseHp: 1771,
    baseAtk: 193,
    basePdef: 80,
    baseMdef: 93,
    baseSpeed: 128,
    growHp: 90.6,
    growAtk: 10.5,
    growPdef: 4.2,
    growMdef: 5,
    skillId: 2005,
    talentId: 3005,
    bondIds: [9],
    avatarColor: '#5C97D6',
    visualIdx: 10,
    headwear: 'H3',
    gender: 'male',
    featureTag: 'none',
    desc: '鬼才善断，十胜十败。惜乎早逝，赤壁无人。',
  },
  {
    id: 1006,
    name: '徐晃',
    camp: Camp.Wei,
    role: RoleType.Phys,
    quality: Quality.Blue,
    star: 2,
    baseHp: 945,
    baseAtk: 139,
    basePdef: 48,
    baseMdef: 40,
    baseSpeed: 112,
    growHp: 48.3,
    growAtk: 7.4,
    growPdef: 2.5,
    growMdef: 2.1,
    skillId: 2006,
    talentId: 3006,
    bondIds: [8],
    avatarColor: '#3A6BA0',
    visualIdx: 14,
    headwear: 'H1',
    gender: 'male',
    featureTag: 'none',
    desc: '治军严整，长驱直入。樊城城下，解了那围。',
  },
  {
    id: 1011,
    name: '刘备',
    camp: Camp.Shu,
    role: RoleType.Support,
    quality: Quality.Orange,
    star: 4,
    baseHp: 1771,
    baseAtk: 193,
    basePdef: 80,
    baseMdef: 93,
    baseSpeed: 126,
    growHp: 90.6,
    growAtk: 10.5,
    growPdef: 4.2,
    growMdef: 5,
    skillId: 2011,
    talentId: 3011,
    bondIds: [1, 3],
    avatarColor: '#2E7D5B',
    visualIdx: 4,
    headwear: 'H5',
    gender: 'male',
    featureTag: 'none',
    desc: '织席贩履起身，三顾得卧龙。仁德不软，是能忍。',
  },
  {
    id: 1012,
    name: '关羽',
    camp: Camp.Shu,
    role: RoleType.Phys,
    quality: Quality.Red,
    star: 5,
    baseHp: 2376,
    baseAtk: 348,
    basePdef: 121,
    baseMdef: 100,
    baseSpeed: 124,
    growHp: 121.4,
    growAtk: 18.5,
    growPdef: 6.3,
    growMdef: 5.3,
    skillId: 2012,
    talentId: 3012,
    bondIds: [1, 2, 11],
    avatarColor: '#276B4B',
    visualIdx: 2,
    headwear: 'H5',
    gender: 'male',
    featureTag: 'beard',
    desc: '温酒斩华雄，千里走单骑。义字压过生死。',
  },
  {
    id: 1013,
    name: '张飞',
    camp: Camp.Shu,
    role: RoleType.Tank,
    quality: Quality.Red,
    star: 5,
    baseHp: 3485,
    baseAtk: 216,
    basePdef: 206,
    baseMdef: 180,
    baseSpeed: 96,
    growHp: 179.5,
    growAtk: 11.6,
    growPdef: 11.1,
    growMdef: 9.5,
    skillId: 2013,
    talentId: 3013,
    bondIds: [1, 2],
    avatarColor: '#1F5E42',
    visualIdx: 22,
    headwear: 'H1',
    gender: 'male',
    featureTag: 'none',
    desc: '万人敌。当阳桥上一声吼，河水都退了三分。',
  },
  {
    id: 1014,
    name: '赵云',
    camp: Camp.Shu,
    role: RoleType.Phys,
    quality: Quality.Red,
    star: 5,
    baseHp: 2376,
    baseAtk: 348,
    basePdef: 121,
    baseMdef: 100,
    baseSpeed: 132,
    growHp: 121.4,
    growAtk: 18.5,
    growPdef: 6.3,
    growMdef: 5.3,
    skillId: 2014,
    talentId: 3014,
    bondIds: [2],
    avatarColor: '#3A9C6E',
    visualIdx: 3,
    headwear: 'H4',
    gender: 'male',
    featureTag: 'none',
    desc: '长坂坡七进七出，怀抱幼主，白袍不带血。',
  },
  {
    id: 1015,
    name: '马超',
    camp: Camp.Shu,
    role: RoleType.Phys,
    quality: Quality.Orange,
    star: 4,
    baseHp: 1811,
    baseAtk: 266,
    basePdef: 93,
    baseMdef: 76,
    baseSpeed: 130,
    growHp: 92.6,
    growAtk: 14.1,
    growPdef: 4.8,
    growMdef: 4,
    skillId: 2015,
    talentId: 3015,
    bondIds: [2],
    avatarColor: '#4FB27F',
    visualIdx: 19,
    headwear: 'H4',
    gender: 'male',
    featureTag: 'none',
    desc: '锦马超，西凉铁骑。渭水追得曹操割须弃袍。',
  },
  {
    id: 1016,
    name: '黄忠',
    camp: Camp.Shu,
    role: RoleType.Phys,
    quality: Quality.Purple,
    star: 3,
    baseHp: 1337,
    baseAtk: 196,
    basePdef: 68,
    baseMdef: 56,
    baseSpeed: 108,
    growHp: 68.3,
    growAtk: 10.4,
    growPdef: 3.6,
    growMdef: 3,
    skillId: 2016,
    talentId: 3016,
    bondIds: [2],
    avatarColor: '#357A55',
    visualIdx: 5,
    headwear: 'H4',
    gender: 'male',
    featureTag: 'none',
    desc: '老当益壮。定军山一刀，斩了夏侯渊。',
  },
  {
    id: 1017,
    name: '诸葛亮',
    camp: Camp.Shu,
    role: RoleType.Magic,
    quality: Quality.Red,
    star: 5,
    baseHp: 2059,
    baseAtk: 396,
    basePdef: 90,
    baseMdef: 143,
    baseSpeed: 116,
    growHp: 105.6,
    growAtk: 21.4,
    growPdef: 4.8,
    growMdef: 7.7,
    skillId: 2017,
    talentId: 3017,
    bondIds: [3, 12],
    avatarColor: '#63C08F',
    visualIdx: 21,
    headwear: 'H2',
    gender: 'male',
    featureTag: 'none',
    desc: '羽扇纶巾，六出祁山。星落五丈原，出师未捷。',
  },
  {
    id: 1021,
    name: '孙策',
    camp: Camp.Wu,
    role: RoleType.Phys,
    quality: Quality.Orange,
    star: 4,
    baseHp: 1811,
    baseAtk: 266,
    basePdef: 93,
    baseMdef: 76,
    baseSpeed: 128,
    growHp: 92.6,
    growAtk: 14.1,
    growPdef: 4.8,
    growMdef: 4,
    skillId: 2021,
    talentId: 3021,
    bondIds: [5],
    avatarColor: '#B5462F',
    visualIdx: 1,
    headwear: 'H5',
    gender: 'male',
    featureTag: 'none',
    desc: '小霸王。匹马定江东，二十六岁止于一场猎。',
  },
  {
    id: 1022,
    name: '周瑜',
    camp: Camp.Wu,
    role: RoleType.Magic,
    quality: Quality.Orange,
    star: 4,
    baseHp: 1570,
    baseAtk: 302,
    basePdef: 68,
    baseMdef: 109,
    baseSpeed: 118,
    growHp: 80.5,
    growAtk: 16.3,
    growPdef: 3.6,
    growMdef: 5.8,
    skillId: 2022,
    talentId: 3022,
    bondIds: [5, 12],
    avatarColor: '#C75B3E',
    visualIdx: 18,
    headwear: 'H2',
    gender: 'male',
    featureTag: 'none',
    desc: '羽扇一挥，赤壁火起。曲有误，周郎顾。',
  },
  {
    id: 1023,
    name: '大乔',
    camp: Camp.Wu,
    role: RoleType.Support,
    quality: Quality.Purple,
    star: 3,
    baseHp: 1307,
    baseAtk: 143,
    basePdef: 59,
    baseMdef: 68,
    baseSpeed: 138,
    growHp: 66.8,
    growAtk: 7.7,
    growPdef: 3.1,
    growMdef: 3.7,
    skillId: 2023,
    talentId: 3023,
    bondIds: [4],
    avatarColor: '#D9705A',
    visualIdx: 8,
    headwear: 'H6',
    gender: 'female',
    featureTag: 'none',
    desc: '江东乔氏长女。琴声慢，压得住刀兵声。',
  },
  {
    id: 1024,
    name: '小乔',
    camp: Camp.Wu,
    role: RoleType.Support,
    quality: Quality.Purple,
    star: 3,
    baseHp: 1307,
    baseAtk: 143,
    basePdef: 59,
    baseMdef: 68,
    baseSpeed: 140,
    growHp: 66.8,
    growAtk: 7.7,
    growPdef: 3.1,
    growMdef: 3.7,
    skillId: 2024,
    talentId: 3024,
    bondIds: [4],
    avatarColor: '#E0856F',
    visualIdx: 12,
    headwear: 'H6',
    gender: 'female',
    featureTag: 'none',
    desc: '战前奉茶，战后抚琴。东风若不来，她也不急。',
  },
  {
    id: 1031,
    name: '吕布',
    camp: Camp.Qun,
    role: RoleType.Phys,
    quality: Quality.Red,
    star: 5,
    baseHp: 2376,
    baseAtk: 348,
    basePdef: 121,
    baseMdef: 100,
    baseSpeed: 136,
    growHp: 121.4,
    growAtk: 18.5,
    growPdef: 6.3,
    growMdef: 5.3,
    skillId: 2031,
    talentId: 3031,
    bondIds: [6, 13],
    avatarColor: '#6B4A8C',
    visualIdx: 6,
    headwear: 'H5',
    gender: 'male',
    featureTag: 'none',
    desc: '人中吕布，马中赤兔。辕门一箭，无人敢动。',
  },
  {
    id: 1032,
    name: '貂蝉',
    camp: Camp.Qun,
    role: RoleType.Support,
    quality: Quality.Orange,
    star: 4,
    baseHp: 1771,
    baseAtk: 193,
    basePdef: 80,
    baseMdef: 93,
    baseSpeed: 134,
    growHp: 90.6,
    growAtk: 10.5,
    growPdef: 4.2,
    growMdef: 5,
    skillId: 2032,
    talentId: 3032,
    bondIds: [6, 13],
    avatarColor: '#8A5FA8',
    visualIdx: 23,
    headwear: 'H6',
    gender: 'female',
    featureTag: 'none',
    desc: '连环计里的一枚棋子。凤仪亭下，哭也当戏演。',
  },
  {
    id: 1033,
    name: '董卓',
    camp: Camp.Qun,
    role: RoleType.Tank,
    quality: Quality.Purple,
    star: 3,
    baseHp: 1960,
    baseAtk: 122,
    basePdef: 116,
    baseMdef: 101,
    baseSpeed: 82,
    growHp: 101,
    growAtk: 6.5,
    growPdef: 6.2,
    growMdef: 5.3,
    skillId: 2033,
    talentId: 3033,
    bondIds: [13],
    avatarColor: '#5A3E72',
    visualIdx: 9,
    headwear: 'H1',
    gender: 'male',
    featureTag: 'none',
    desc: '一把火烧了洛阳。肚里那点油，点了三天灯。',
  },
  {
    id: 1034,
    name: '颜良',
    camp: Camp.Qun,
    role: RoleType.Phys,
    quality: Quality.Blue,
    star: 2,
    baseHp: 945,
    baseAtk: 139,
    basePdef: 48,
    baseMdef: 40,
    baseSpeed: 114,
    growHp: 48.3,
    growAtk: 7.4,
    growPdef: 2.5,
    growMdef: 2.1,
    skillId: 2034,
    talentId: 3034,
    bondIds: [7],
    avatarColor: '#7A55A0',
    visualIdx: 13,
    headwear: 'H4',
    gender: 'male',
    featureTag: 'none',
    desc: '河北上将。白马坡前，一刀未出便落了马。',
  },
  {
    id: 1035,
    name: '文丑',
    camp: Camp.Qun,
    role: RoleType.Tank,
    quality: Quality.Blue,
    star: 2,
    baseHp: 1386,
    baseAtk: 86,
    basePdef: 82,
    baseMdef: 71,
    baseSpeed: 88,
    growHp: 71.4,
    growAtk: 4.6,
    growPdef: 4.4,
    growMdef: 3.8,
    skillId: 2035,
    talentId: 3035,
    bondIds: [7],
    avatarColor: '#66468A',
    visualIdx: 16,
    headwear: 'H1',
    gender: 'male',
    featureTag: 'none',
    desc: '与颜良并称河北双雄。延津渡口，亡于乱箭。',
  },
  {
    id: 1036,
    name: '华佗',
    camp: Camp.Qun,
    role: RoleType.Support,
    quality: Quality.Purple,
    star: 3,
    baseHp: 1307,
    baseAtk: 143,
    basePdef: 59,
    baseMdef: 68,
    baseSpeed: 122,
    growHp: 66.8,
    growAtk: 7.7,
    growPdef: 3.1,
    growMdef: 3.7,
    skillId: 2036,
    talentId: 3036,
    bondIds: [11],
    avatarColor: '#9B7BB8',
    visualIdx: 20,
    headwear: 'H6',
    gender: 'male',
    featureTag: 'none',
    desc: '刮骨疗毒，麻沸散。医得人身，医不了天下。',
  },
];

/** 武将 id -> 配置，便于 O(1) 查询 */
export const HERO_MAP: { [id: number]: HeroConf } = (() => {
  const m: { [id: number]: HeroConf } = {};
  for (const h of HERO_CONF) {
    m[h.id] = h;
  }
  return m;
})();

/** 查武将配置，查不到时兜底返回主角（id 1000）配置 */
export function getHeroConf(id: number): HeroConf {
  const c = HERO_MAP[id];
  return c ? c : HERO_CONF[0];
}

// ── 以下为 UI 侧取用值与兜底规则 ──

/** 主角 id，卡顶有金色王冠符号，headwear 强制 H5 */
export const MAIN_HERO_ID = 1000;

/** 阵营 key，供美术资源按名字索引（Camp 枚举是数字，这里给字符串别名） */
export const CAMP_KEY: { [c: number]: string } = {
  [Camp.Wei]: 'wei',
  [Camp.Shu]: 'shu',
  [Camp.Wu]: 'wu',
  [Camp.Qun]: 'qun',
};

/** 类型 key：phy 物攻 / mag 法攻 / sup 辅助 / def 防御 */
export const ROLE_KEY: { [r: number]: string } = {
  [RoleType.Phys]: 'phy',
  [RoleType.Magic]: 'mag',
  [RoleType.Support]: 'sup',
  [RoleType.Tank]: 'def',
};

/** 品质 key */
export const QUALITY_KEY: { [q: number]: string } = {
  [Quality.Green]: 'green',
  [Quality.Blue]: 'blue',
  [Quality.Purple]: 'purple',
  [Quality.Orange]: 'orange',
  [Quality.Red]: 'red',
};

/** 头饰显示名 */
export const HEADWEAR_LABEL: { [h: string]: string } = {
  H1: '兜鍪',
  H2: '羽扇冠',
  H3: '文士巾',
  H4: '凤翅盔',
  H5: '帅盔',
  H6: '道冠',
};

/** 未配 headwear 时的兜底规则：防御→H1，法攻→H2，辅助→H6，其余→H4 */
export function getDefaultHeadwear(role: RoleType): HeroHeadwear {
  switch (role) {
    case RoleType.Tank: return 'H1';
    case RoleType.Magic: return 'H2';
    case RoleType.Support: return 'H6';
    default: return 'H4';
  }
}

/** 取头饰，取不到按类型兜底（主角强制 H5 帅盔） */
export function getHeadwear(id: number): HeroHeadwear {
  const c = HERO_MAP[id];
  if (!c) return 'H5';
  if (c.id === MAIN_HERO_ID) return 'H5';
  return c.headwear || getDefaultHeadwear(c.role);
}

/** 取取色索引，主角不走通用逻辑（UI 用其强制蓝品质色 + H5） */
export function getVisualIdx(id: number): number {
  const c = HERO_MAP[id];
  return c ? c.visualIdx : 0;
}

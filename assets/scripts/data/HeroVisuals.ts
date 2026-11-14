/**
 * 武将过渡像素外观：Ninja Adventure（CC0）头像与战斗小人。
 * 只做展示映射，不参与战斗结算。许可账本见 docs/licenses/ATTRIBUTION.md。
 *
 * 图集朝向是按像素核对过的，不要改回「行 = 方向」：
 *  idle.png / attack.png 从左到右 4 格 = 下、上、左、右 各一帧。
 *  walk.png 列序相同；行 0→3 才是该朝向的行走帧。
 *  unit.png = idle 第 0 格 = 面朝下的站立帧。
 * 主公（1000）的性别以存档 Store.data.gender 为准：0 → 1000_male，1 → 1000_female。
 */
import { MAIN_HERO_ID } from './HeroConf';

export interface HeroVisualRow {
  heroId: number;
  name: string;
  quality: string;
  gender: 'male' | 'female';
  packFolder: string;
  assetKey: string;
  note: string;
}

/** 25 套外观：24 名武将 + 女主公。男主公与其余武将按 heroId 索引，女主公只在存档性别为女时取用。 */
export const HERO_VISUAL_ROWS: HeroVisualRow[] = [
  {
    heroId: 1000,
    name: '主公',
    quality: '蓝',
    gender: 'male',
    packFolder: 'NinjaBlue',
    assetKey: '1000_male',
    note: '默认男主，包内主角蓝忍',
  },
  {
    heroId: 1000,
    name: '主公',
    quality: '蓝',
    gender: 'female',
    packFolder: 'Woman',
    assetKey: '1000_female',
    note: '女主公，存档覆写性别时使用',
  },
  {
    heroId: 1001,
    name: '曹操',
    quality: '橙',
    gender: 'male',
    packFolder: 'Noble',
    assetKey: '1001',
    note: '官帽正装，丞相感',
  },
  {
    heroId: 1002,
    name: '夏侯惇',
    quality: '紫',
    gender: 'male',
    packFolder: 'NinjaMasked',
    assetKey: '1002',
    note: '覆面，最接近独眼/蒙面',
  },
  {
    heroId: 1003,
    name: '张辽',
    quality: '橙',
    gender: 'male',
    packFolder: 'GladiatorBlue',
    assetKey: '1003',
    note: '蓝盔武将',
  },
  {
    heroId: 1004,
    name: '许褚',
    quality: '紫',
    gender: 'male',
    packFolder: 'Caveman2',
    assetKey: '1004',
    note: '光头壮汉',
  },
  {
    heroId: 1005,
    name: '郭嘉',
    quality: '橙',
    gender: 'male',
    packFolder: 'Inspector',
    assetKey: '1005',
    note: '精干谋士感',
  },
  {
    heroId: 1006,
    name: '徐晃',
    quality: '蓝',
    gender: 'male',
    packFolder: 'Knight',
    assetKey: '1006',
    note: '闭面盔，偏防御',
  },
  {
    heroId: 1011,
    name: '刘备',
    quality: '橙',
    gender: 'male',
    packFolder: 'SamuraiBlue',
    assetKey: '1011',
    note: '蓝笠武将，面善',
  },
  {
    heroId: 1012,
    name: '关羽',
    quality: '红',
    gender: 'male',
    packFolder: 'SamuraiRed',
    assetKey: '1012',
    note: '红衣、须面、斗笠',
  },
  {
    heroId: 1013,
    name: '张飞',
    quality: '红',
    gender: 'male',
    packFolder: 'FighterRed',
    assetKey: '1013',
    note: '红发怒目',
  },
  {
    heroId: 1014,
    name: '赵云',
    quality: '红',
    gender: 'male',
    packFolder: 'FighterWhite',
    assetKey: '1014',
    note: '白衣白发',
  },
  {
    heroId: 1015,
    name: '马超',
    quality: '橙',
    gender: 'male',
    packFolder: 'Hunter',
    assetKey: '1015',
    note: '兜帽西凉猎手感',
  },
  {
    heroId: 1016,
    name: '黄忠',
    quality: '紫',
    gender: 'male',
    packFolder: 'OldMan',
    assetKey: '1016',
    note: '白发老将',
  },
  {
    heroId: 1017,
    name: '诸葛亮',
    quality: '红',
    gender: 'male',
    packFolder: 'OldMan3',
    assetKey: '1017',
    note: '斗笠白须谋士',
  },
  {
    heroId: 1021,
    name: '孙策',
    quality: '橙',
    gender: 'male',
    packFolder: 'Boy',
    assetKey: '1021',
    note: '少年气',
  },
  {
    heroId: 1022,
    name: '周瑜',
    quality: '橙',
    gender: 'male',
    packFolder: 'SorcererOrange',
    assetKey: '1022',
    note: '红发儒将/风雅',
  },
  {
    heroId: 1023,
    name: '大乔',
    quality: '紫',
    gender: 'female',
    packFolder: 'Cavegirl',
    assetKey: '1023',
    note: '绿发少女，与小乔成对',
  },
  {
    heroId: 1024,
    name: '小乔',
    quality: '紫',
    gender: 'female',
    packFolder: 'Cavegirl2',
    assetKey: '1024',
    note: '褐发少女，与大乔成对',
  },
  {
    heroId: 1031,
    name: '吕布',
    quality: '红',
    gender: 'male',
    packFolder: 'KnightGold',
    assetKey: '1031',
    note: '金盔华贵',
  },
  {
    heroId: 1032,
    name: '貂蝉',
    quality: '橙',
    gender: 'female',
    packFolder: 'Princess',
    assetKey: '1032',
    note: '饰花女角',
  },
  {
    heroId: 1033,
    name: '董卓',
    quality: '紫',
    gender: 'male',
    packFolder: 'Sultan2',
    assetKey: '1033',
    note: '体态厚重、气势骄矜',
  },
  {
    heroId: 1034,
    name: '颜良',
    quality: '蓝',
    gender: 'male',
    packFolder: 'NinjaRed',
    assetKey: '1034',
    note: '红忍武将，与文丑成对',
  },
  {
    heroId: 1035,
    name: '文丑',
    quality: '蓝',
    gender: 'male',
    packFolder: 'RedNinja3',
    assetKey: '1035',
    note: '红忍变体，与颜良成对',
  },
  {
    heroId: 1036,
    name: '华佗',
    quality: '紫',
    gender: 'male',
    packFolder: 'Monk2',
    assetKey: '1036',
    note: '僧衣沉静，作医者过渡',
  },
];

const BY_ID: { [id: number]: HeroVisualRow } = {};
for (const row of HERO_VISUAL_ROWS) {
  if (row.heroId === MAIN_HERO_ID && row.gender === 'female') continue;
  BY_ID[row.heroId] = row;
}

const FEMALE_LORD = HERO_VISUAL_ROWS.find((r) => r.heroId === MAIN_HERO_ID && r.gender === 'female');

/** 资源目录名。主公看存档性别（0 男 / 1 女），其余武将忽略该参数。没有映射时返回空串，调用方保留程序化头像。 */
export function heroAssetKey (heroId: number, playerGender: 0 | 1): string {
  if (heroId === MAIN_HERO_ID) {
    if (playerGender === 1 && FEMALE_LORD) return FEMALE_LORD.assetKey;
    const lord = BY_ID[MAIN_HERO_ID];
    return lord ? lord.assetKey : '';
  }
  const row = BY_ID[heroId];
  return row ? row.assetKey : '';
}

export function heroVisualRow (heroId: number, playerGender: 0 | 1): HeroVisualRow | null {
  const key = heroAssetKey(heroId, playerGender);
  if (!key) return null;
  for (const row of HERO_VISUAL_ROWS) {
    if (row.assetKey === key) return row;
  }
  return null;
}

/**
 * CC0 像素占位目录。
 * 这些图是 Q 版立绘到位前的临时道具 / 导航 / 职业替身，不满足立绘规格。
 * 许可与裁切说明见 docs/像素占位素材-许可.md。
 * 面板不要直接写死路径，走 artForItem / artForRole / NAV_ART，再交给 core/Art.ts。
 */

export type PixelCreditId = 'pixel-archer' | 'owlish' | 'kenney';

export interface PixelArt {
  /** assets/resources 下的路径，不含扩展名 */
  path: string;
  creditId: PixelCreditId;
  /** 白剪影可以乘色；彩色原图乘色会脏，保持 false */
  tintable: boolean;
  /** 出现在哪，避免图进了包却没有界面用它 */
  where: string;
}

export interface ArtCredit {
  id: PixelCreditId;
  author: string;
  title: string;
  url: string;
  license: 'CC0-1.0';
  attributionRequired: boolean;
  aiNote: string;
  usedFor: string;
}

export const ART_CREDITS: ArtCredit[] = [
  {
    id: 'pixel-archer',
    author: 'Pixel Archer',
    title: 'Chinese Icons',
    url: 'https://opengameart.org/content/chinese-icons',
    license: 'CC0-1.0',
    attributionRequired: false,
    aiNote: '来源页没有写是否用了生成式 AI。',
    usedFor: '铜钱、宝玉、元宝、桃花、寿桃、太极和卷轴，用在资源条、招募台和部分道具上。',
  },
  {
    id: 'owlish',
    author: 'OwlishMedia',
    title: 'RPG UI Icons',
    url: 'https://opengameart.org/content/rpg-ui-icons',
    license: 'CC0-1.0',
    attributionRequired: false,
    aiNote: '2018 年发布，来源页没有写生成式 AI。',
    usedFor: '白剪影图标，用在底栏、出征、日常，以及武器、护甲、药瓶、碎片这些道具上。',
  },
  {
    id: 'kenney',
    author: 'Kenney',
    title: 'Tiny Dungeon',
    url: 'https://kenney.nl/assets/tiny-dungeon',
    license: 'CC0-1.0',
    attributionRequired: false,
    aiNote: '作者在 itch 页写明没有使用生成式 AI。',
    usedFor: '职业替身和敌方替身。同一职业共用一只，敌方共用红色替身，不是关羽、吕布或其他武将的肖像。',
  },
];

function defineArt (entry: PixelArt): PixelArt {
  return entry;
}

export const PIXEL_ART = {
  coin: defineArt({ path: 'pixel/coin', creditId: 'pixel-archer', tintable: false, where: '资源条银币' }),
  jade: defineArt({ path: 'pixel/jade', creditId: 'pixel-archer', tintable: false, where: '资源条将玉；招募台' }),
  ingot: defineArt({ path: 'pixel/ingot', creditId: 'pixel-archer', tintable: false, where: '主城商城' }),
  flower: defineArt({ path: 'pixel/flower', creditId: 'pixel-archer', tintable: false, where: '底栏招募；主城招募；招募台' }),
  peach: defineArt({ path: 'pixel/peach', creditId: 'pixel-archer', tintable: false, where: '资源条体力；体力丹' }),
  yinyang: defineArt({ path: 'pixel/yinyang', creditId: 'pixel-archer', tintable: false, where: '材料' }),
  scroll: defineArt({ path: 'pixel/scroll', creditId: 'pixel-archer', tintable: false, where: '宝物；招募台' }),
  sword: defineArt({ path: 'pixel/sword', creditId: 'owlish', tintable: true, where: '武器' }),
  armor: defineArt({ path: 'pixel/armor', creditId: 'owlish', tintable: true, where: '护甲' }),
  helm: defineArt({ path: 'pixel/helm', creditId: 'owlish', tintable: true, where: '底栏武将；头盔' }),
  relic: defineArt({ path: 'pixel/relic', creditId: 'owlish', tintable: true, where: '项链' }),
  pouch: defineArt({ path: 'pixel/pouch', creditId: 'owlish', tintable: true, where: '底栏背包' }),
  potion: defineArt({ path: 'pixel/potion', creditId: 'owlish', tintable: true, where: '蓝色经验丹' }),
  elixir: defineArt({ path: 'pixel/elixir', creditId: 'owlish', tintable: true, where: '紫橙经验丹' }),
  medicine: defineArt({ path: 'pixel/medicine', creditId: 'owlish', tintable: true, where: '精力丹' }),
  token: defineArt({ path: 'pixel/token', creditId: 'owlish', tintable: true, where: '武将碎片' }),
  battle: defineArt({ path: 'pixel/battle', creditId: 'owlish', tintable: true, where: '主城出征；扫荡令' }),
  shield: defineArt({ path: 'pixel/shield', creditId: 'owlish', tintable: true, where: '底栏阵容' }),
  door: defineArt({ path: 'pixel/door', creditId: 'owlish', tintable: true, where: '底栏主城' }),
  clock: defineArt({ path: 'pixel/clock', creditId: 'owlish', tintable: true, where: '主城日常' }),
  paper: defineArt({ path: 'pixel/paper', creditId: 'owlish', tintable: true, where: '重生符' }),
  'role-atk': defineArt({ path: 'pixel/role-atk', creditId: 'kenney', tintable: false, where: '物攻卡面和战斗替身' }),
  'role-magic': defineArt({ path: 'pixel/role-magic', creditId: 'kenney', tintable: false, where: '法攻替身' }),
  'role-support': defineArt({ path: 'pixel/role-support', creditId: 'kenney', tintable: false, where: '辅助替身' }),
  'role-guard': defineArt({ path: 'pixel/role-guard', creditId: 'kenney', tintable: false, where: '防御替身' }),
  foe: defineArt({ path: 'pixel/foe', creditId: 'kenney', tintable: false, where: '敌方共用替身' }),
};

export type PixelArtId = keyof typeof PIXEL_ART;

export type ArtPresent = 'sprite' | 'fallback';

/** 道具映射用的最小字段，避免和 ItemConf 互相引用。 */
export interface ArtItemRef {
  id: number;
  type: 'exp' | 'material' | 'fragment' | 'consumable' | 'equip';
  quality: number;
  slot?: 'weapon' | 'armor' | 'helmet' | 'necklace' | 'treasure';
}

export const NAV_ART: { [key: string]: PixelArtId } = {
  home: 'door',
  lineup: 'shield',
  hero: 'helm',
  recruit: 'flower',
  bag: 'pouch',
  shop: 'ingot',
};

/**
 * 图在不在，决定画精灵还是留着程序绘制。
 * fileExists 由调用方提供：运行时看 resources.load 是否成功，测试里可以假装某个文件被删了。
 */
export function resolveArt (id: string, fileExists: (resourcesPath: string) => boolean): ArtPresent {
  const spec = PIXEL_ART[id as PixelArtId];
  if (!spec) return 'fallback';
  if (!fileExists(spec.path)) return 'fallback';
  return 'sprite';
}

export function artForRole (role: number): PixelArtId {
  if (role === 2) return 'role-magic';
  if (role === 3) return 'role-support';
  if (role === 4) return 'role-guard';
  return 'role-atk';
}

export function artForUnit (side: number, role: number): PixelArtId {
  if (side === 1) return 'foe';
  return artForRole(role);
}

export function artForItem (it: ArtItemRef): PixelArtId {
  switch (it.type) {
    case 'exp':
      return it.quality >= 2 ? 'elixir' : 'potion';
    case 'material':
      return 'yinyang';
    case 'fragment':
      return 'token';
    case 'consumable':
      if (it.id === 5301) return 'peach';
      if (it.id === 5303) return 'battle';
      if (it.id === 5304) return 'paper';
      return 'medicine';
    case 'equip':
      switch (it.slot) {
        case 'weapon': return 'sword';
        case 'armor': return 'armor';
        case 'helmet': return 'helm';
        case 'necklace': return 'relic';
        case 'treasure': return 'scroll';
        case undefined: return 'sword';
        default: {
          const unknown: never = it.slot;
          throw new Error('未知装备槽 ' + String(unknown));
        }
      }
    default: {
      const unknown: never = it.type;
      throw new Error('未知道具类型 ' + String(unknown));
    }
  }
}

/** 设置页「署名」用。事实以 ART_CREDITS 为准，不要在界面里再写一套。 */
export function creditPages (): string[] {
  const pages = [
    '这里是临时像素占位的作者和许可。它们不是 Q 版武将立绘，也不表示立绘规格已经做完。许可都是 CC0，法律上可以不署名，这里仍然写上作者。图丢了就继续用色块和文字，不会出现空图。',
  ];
  for (let i = 0; i < ART_CREDITS.length; i++) {
    const c = ART_CREDITS[i];
    const attr = c.attributionRequired ? '使用时必须署名。' : '署名不是必须。';
    pages.push(`${c.usedFor}${c.author}，《${c.title}》。许可 ${c.license}，${attr}${c.aiNote} ${c.url}`);
  }
  return pages;
}

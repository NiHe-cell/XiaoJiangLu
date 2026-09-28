/**
 * 道具静态配置表
 * 规则：
 *  1) id 分段：经验丹 500x｜材料 510x｜武将碎片 520x｜消耗品 530x｜装备 600x。
 *  2) 装备固定 5 槽 × 2 档（蓝/紫）：weapon 主攻、armor/helmet 主双防、necklace 主血、treasure 攻血兼有。
 *  3) 无付费货币：只用银币（silverPrice）与将玉（jadePrice），将玉仅由玩法产出。
 *  4) desc ≤ 20 字。
 */
import { Quality } from './HeroConf';

export type ItemType = 'exp' | 'material' | 'fragment' | 'consumable' | 'equip';
export type EquipSlot = 'weapon' | 'armor' | 'helmet' | 'necklace' | 'treasure';

export interface ItemConf {
  id: number;
  name: string;
  type: ItemType;
  quality: Quality;
  /** 仅 equip */
  slot?: EquipSlot;
  /** 仅 equip 基础属性 */
  atk?: number;
  hp?: number;
  pdef?: number;
  mdef?: number;
  /** 仅 exp 道具：提供的经验值 */
  expValue?: number;
  desc: string;
  /** 商店售价，二选一或都有 */
  silverPrice?: number;
  jadePrice?: number;
}

export const ITEM_CONF: ItemConf[] = [
  // ── 经验丹 3 档 ──
  { id: 5001, name: '小还丹', type: 'exp', quality: Quality.Blue,
    expValue: 100, desc: '喂一颗，长一点经验', silverPrice: 800 },
  { id: 5002, name: '培元丹', type: 'exp', quality: Quality.Purple,
    expValue: 500, desc: '武将升级前的口粮', silverPrice: 3000 },
  { id: 5003, name: '九转金丹', type: 'exp', quality: Quality.Orange,
    expValue: 2000, desc: '一颗顶十颗，别乱喂', silverPrice: 9000 },

  // ── 材料 6 种 ──
  { id: 5101, name: '将魂', type: 'material', quality: Quality.Blue,
    desc: '武将强化要用，越多越好', silverPrice: 500 },
  { id: 5102, name: '魂玉', type: 'material', quality: Quality.Purple,
    desc: '神秘商店只认这个', silverPrice: 1500 },
  { id: 5103, name: '进阶丹', type: 'material', quality: Quality.Purple,
    desc: '进阶的硬门槛，卡在这', silverPrice: 2000 },
  { id: 5104, name: '转生丹', type: 'material', quality: Quality.Orange,
    desc: '限定武将才吃得起', jadePrice: 200 },
  { id: 5105, name: '精炼石', type: 'material', quality: Quality.Blue,
    desc: '装备精炼，一件一块', silverPrice: 600 },
  { id: 5106, name: '天命石', type: 'material', quality: Quality.Purple,
    desc: '点亮天命星宿用得上', jadePrice: 80 },

  // ── 武将碎片 6 种 ──
  { id: 5201, name: '关羽碎片', type: 'fragment', quality: Quality.Red,
    desc: '集满三十片，可唤关羽', jadePrice: 120 },
  { id: 5202, name: '张飞碎片', type: 'fragment', quality: Quality.Red,
    desc: '集满三十片，可唤张飞', jadePrice: 120 },
  { id: 5203, name: '赵云碎片', type: 'fragment', quality: Quality.Red,
    desc: '集满三十片，可唤赵云', jadePrice: 120 },
  { id: 5204, name: '孔明碎片', type: 'fragment', quality: Quality.Red,
    desc: '集满三十片，可唤孔明', jadePrice: 120 },
  { id: 5205, name: '吕布碎片', type: 'fragment', quality: Quality.Red,
    desc: '集满三十片，可唤吕布', jadePrice: 120 },
  { id: 5206, name: '周瑜碎片', type: 'fragment', quality: Quality.Orange,
    desc: '集满三十片，可唤周瑜', jadePrice: 90 },

  // ── 消耗品 4 种 ──
  { id: 5301, name: '体力丹', type: 'consumable', quality: Quality.Blue,
    desc: '回三十点体力，继续推', jadePrice: 50 },
  { id: 5302, name: '精力丹', type: 'consumable', quality: Quality.Blue,
    desc: '竞技场专用，回精力', jadePrice: 50 },
  { id: 5303, name: '扫荡令', type: 'consumable', quality: Quality.Blue,
    desc: '一关一次，省下时间', silverPrice: 1000 },
  { id: 5304, name: '重生符', type: 'consumable', quality: Quality.Purple,
    desc: '还你养过的那些材料', jadePrice: 150 },

  // ── 装备 10 件（5 槽 × 2 档） ──
  { id: 6001, name: '青钢剑', type: 'equip', quality: Quality.Blue, slot: 'weapon',
    atk: 120, desc: '曹操佩剑，锋利趁手', silverPrice: 2400 },
  { id: 6002, name: '古锭刀', type: 'equip', quality: Quality.Purple, slot: 'weapon',
    atk: 268, desc: '孙坚旧刀，砍过华雄', silverPrice: 7200 },
  { id: 6003, name: '皮甲', type: 'equip', quality: Quality.Blue, slot: 'armor',
    pdef: 62, mdef: 40, desc: '新兵发的，挡得住箭', silverPrice: 2200 },
  { id: 6004, name: '玄铁铠', type: 'equip', quality: Quality.Purple, slot: 'armor',
    pdef: 134, mdef: 92, desc: '重是重了点，命值钱', silverPrice: 6800 },
  { id: 6005, name: '皮盔', type: 'equip', quality: Quality.Blue, slot: 'helmet',
    pdef: 46, mdef: 30, desc: '扎得紧，不容易掉', silverPrice: 2000 },
  { id: 6006, name: '明光盔', type: 'equip', quality: Quality.Purple, slot: 'helmet',
    pdef: 100, mdef: 70, desc: '日头一照，晃人眼', silverPrice: 6200 },
  { id: 6007, name: '铜项链', type: 'equip', quality: Quality.Blue, slot: 'necklace',
    hp: 820, desc: '不值钱，戴着安心', silverPrice: 2100 },
  { id: 6008, name: '玉珠链', type: 'equip', quality: Quality.Purple, slot: 'necklace',
    hp: 1900, desc: '江东乔家流出来的', silverPrice: 6500 },
  { id: 6009, name: '兵书残卷', type: 'equip', quality: Quality.Blue, slot: 'treasure',
    atk: 62, hp: 420, desc: '缺了几页，照样能用', silverPrice: 2600 },
  { id: 6010, name: '青囊经', type: 'equip', quality: Quality.Purple, slot: 'treasure',
    atk: 142, hp: 1020, desc: '华佗留下的那本', silverPrice: 7800 },
];

/** 道具 id -> 配置 */
export const ITEM_MAP: { [id: number]: ItemConf } = (() => {
  const m: { [id: number]: ItemConf } = {};
  for (const it of ITEM_CONF) {
    m[it.id] = it;
  }
  return m;
})();

/** 查道具配置，查不到时兜底返回第一条 */
export function getItemConf(id: number): ItemConf {
  const it = ITEM_MAP[id];
  return it ? it : ITEM_CONF[0];
}

/** 装备槽位显示名 */
export const SLOT_LABEL: { [slot: string]: string } = {
  weapon: '武器',
  armor: '护甲',
  helmet: '头盔',
  necklace: '项链',
  treasure: '宝物',
};

/** 取某槽位、某品质及以下的所有装备（供背包筛选与一键穿戴） */
export function getEquipsOfSlot(slot: EquipSlot): ItemConf[] {
  const list: ItemConf[] = [];
  for (const it of ITEM_CONF) {
    if (it.type === 'equip' && it.slot === slot) {
      list.push(it);
    }
  }
  return list;
}

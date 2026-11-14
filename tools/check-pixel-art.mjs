/**
 * 像素占位的许可、文件和缺图回退契约。
 * 不启动 Cocos。运行：node --experimental-strip-types tools/check-pixel-art.mjs
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ART_CREDITS,
  PIXEL_ART,
  artForItem,
  artForRole,
  artForUnit,
  resolveArt,
} from '../assets/scripts/data/PixelArtConf.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail (msg) {
  console.error('FAIL', msg);
  process.exitCode = 1;
}

function read (rel) {
  return readFileSync(path.join(root, rel), 'utf8');
}

function exists (resourcesPath) {
  return statSafe(path.join(root, 'assets/resources', resourcesPath + '.png'));
}

function statSafe (file) {
  try {
    return statSync(file).isFile();
  } catch (e) {
    return false;
  }
}

const ids = Object.keys(PIXEL_ART);
const creditIds = {};
for (const c of ART_CREDITS) creditIds[c.id] = c;

let pngBytes = 0;
const pixelDir = path.join(root, 'assets/resources/pixel');
const pngNames = readdirSync(pixelDir).filter((name) => name.endsWith('.png'));

if (pngNames.length !== ids.length) {
  fail('PNG 数量 ' + pngNames.length + ' 和目录 ' + ids.length + ' 不一致');
}

for (const id of ids) {
  const spec = PIXEL_ART[id];
  if (!spec.where) fail(id + ' 没有写出现位置');
  if (!creditIds[spec.creditId]) fail(id + ' 的许可 id 不存在');
  const file = path.join(root, 'assets/resources', spec.path + '.png');
  if (!exists(spec.path)) fail('缺少 ' + spec.path + '.png');
  pngBytes += statSync(file).size;
  const meta = read('assets/resources/' + spec.path + '.png.meta');
  if (!meta.includes('"minfilter": "nearest"')) fail(spec.path + ' 不是 nearest');
  if (!meta.includes('"magfilter": "nearest"')) fail(spec.path + ' magfilter 不是 nearest');
  if (!meta.includes('"packable": false')) fail(spec.path + ' 仍会打进图集');
  if (resolveArt(id, exists) !== 'sprite') fail(id + ' 文件在磁盘上却被判成缺图');
  if (resolveArt(id, () => false) !== 'fallback') fail(id + ' 缺文件时必须回退');
}

if (pngBytes > 16 * 1024) fail('PNG 合计 ' + pngBytes + ' 超过 16KB');

const coinPath = PIXEL_ART.coin.path;
if (resolveArt('coin', (p) => exists(p) && p !== coinPath) !== 'fallback') {
  fail('拿掉铜钱后仍要回退，不能留空图');
}
if (resolveArt('not-a-real-art', () => true) !== 'fallback') fail('未知 id 必须回退');

if (artForUnit(1, 1) !== 'foe') fail('敌方应使用共用替身');
if (artForUnit(0, 2) !== 'role-magic') fail('法攻替身映射错了');
for (const role of [0, 1, 2, 3, 4, 9]) {
  if (!PIXEL_ART[artForRole(role)]) fail('职业 ' + role + ' 没有替身');
}

const itemSrc = read('assets/scripts/data/ItemConf.ts');
const itemBody = itemSrc.slice(itemSrc.indexOf('export const ITEM_CONF'), itemSrc.indexOf('export const ITEM_MAP'));
const quality = { Green: 0, Blue: 1, Purple: 2, Orange: 3, Red: 4 };
const items = itemBody.split(/\{\s*id:/).slice(1).map((part) => {
  const id = Number(part.match(/^\s*(\d+)/)[1]);
  const type = part.match(/type:\s*'(\w+)'/)[1];
  const slotMatch = part.match(/slot:\s*'(\w+)'/);
  const qName = part.match(/quality:\s*Quality\.(\w+)/)[1];
  return { id, type, quality: quality[qName], slot: slotMatch ? slotMatch[1] : undefined };
});
if (items.length !== 29) fail('道具表解析到 ' + items.length + ' 条，预期 29');
for (const it of items) {
  const artId = artForItem(it);
  if (!PIXEL_ART[artId]) fail('道具 ' + it.id + ' 映射到未知图 ' + artId);
}

const common = read('assets/scripts/ui/Common.ts');
const home = read('assets/scripts/ui/HomePanel.ts');
const bag = read('assets/scripts/ui/BagPanel.ts');
const shop = read('assets/scripts/ui/ShopPanel.ts');
const battle = read('assets/scripts/ui/BattlePanel.ts');
const recruit = read('assets/scripts/ui/RecruitPanel.ts');
const main = read('assets/scripts/Main.ts');
const settings = read('assets/scripts/ui/SettingsPanel.ts');
const artSrc = read('assets/scripts/core/Art.ts');
const game = read('GAME.md');
const doc = read('docs/像素占位素材-许可.md');
const portrait = read('docs/骁将录-四人紫将统一立绘规格-v3.0.md');

function need (text, needle, label) {
  if (!text.includes(needle)) fail(label + ' 缺少 ' + needle);
}

need(common, 'NAV_ART', '底栏');
need(common, "'coin'", '资源条');
need(common, "'jade'", '资源条');
need(common, "'peach'", '资源条');
need(common, 'artForRole', '武将卡');
need(home, "'flower'", '主城');
need(home, "'ingot'", '主城');
need(home, "'clock'", '主城');
need(home, "'battle'", '主城');
need(bag, 'artForItem', '背包');
need(shop, 'artForItem', '商店');
need(battle, 'artForUnit', '战斗');
need(recruit, "'flower'", '招募');
need(recruit, "'jade'", '招募');
need(recruit, "'scroll'", '招募');
need(main, 'preloadPixelArt', '启动');
need(settings, 'creditPages', '设置');
need(game, 'docs/像素占位素材-许可.md', 'GAME.md');
need(game, '4MB', 'GAME.md');
need(game, '720×1280', 'GAME.md');
need(game, '[-290, 290]', 'GAME.md');
need(portrait, '像素占位不是本规格', '立绘规格');
need(doc, '不是 Q 版立绘', '许可文档');
need(doc, '16KB', '许可文档');

const paint = artSrc.slice(artSrc.indexOf('export function paintPixel'));
const decideAt = paint.indexOf('resolveArt(');
const assignAt = paint.indexOf('spriteFrame = sf');
if (decideAt < 0 || assignAt < 0 || decideAt > assignAt) {
  fail('paintPixel 必须先 resolveArt，再挂 Sprite');
}

for (const c of ART_CREDITS) {
  if (c.license !== 'CC0-1.0') fail(c.author + ' 不是 CC0');
  if (c.attributionRequired) fail(c.author + ' 标成了必须署名，设置页文案要一起改');
  if (!c.aiNote) fail(c.author + ' 没有 AI 说明');
  need(doc, c.author, '许可文档');
  need(doc, c.url, '许可文档');
}
for (const id of ids) need(doc, PIXEL_ART[id].path, '许可文档');

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log('pixel art ok, png bytes ' + pngBytes + ', items ' + items.length + ', credits ' + ART_CREDITS.length);

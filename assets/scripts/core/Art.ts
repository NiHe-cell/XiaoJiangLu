/**
 * 按 id 取像素占位图。
 * 文件在 assets/resources/pixel，进 resources 包，默认打进微信主包，所以只能放这一小批。
 * 加载失败、id 不存在、或 resolveArt 判定缺文件时，保留调用方已经画好的 Graphics / Label。
 */
import {
  Color, ImageAsset, Node, Rect, resources, Sprite, SpriteFrame, Texture2D, UITransform,
} from 'cc';
import { nd } from './Ui';
import { PIXEL_ART, PixelArtId, resolveArt } from '../data/PixelArtConf';

const cache = new Map<string, SpriteFrame | null>();
const waiters = new Map<string, Array<(sf: SpriteFrame | null) => void>>();

function pinPixel (sf: SpriteFrame): SpriteFrame {
  try {
    sf.packable = false;
    const tex = sf.texture as Texture2D | null;
    if (tex && tex.setFilters) {
      tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
    }
    if (tex && tex.setMipFilter) {
      tex.setMipFilter(Texture2D.Filter.NONE);
    }
  } catch (e) {
    // 过滤设失败也保留这张图，不要因此变成空图。
  }
  return sf;
}

function frameFromImage (image: ImageAsset): SpriteFrame {
  const tex = new Texture2D();
  tex.image = image;
  const sf = new SpriteFrame();
  sf.texture = tex;
  const w = image.width || tex.width;
  const h = image.height || tex.height;
  if (w > 0 && h > 0) sf.rect = new Rect(0, 0, w, h);
  return pinPixel(sf);
}

function requestSprite (path: string, cb: (sf: SpriteFrame | null) => void): void {
  if (cache.has(path)) {
    cb(cache.get(path) || null);
    return;
  }
  const pending = waiters.get(path);
  if (pending) {
    pending.push(cb);
    return;
  }
  waiters.set(path, [cb]);
  const finish = (sf: SpriteFrame | null): void => {
    cache.set(path, sf);
    const list = waiters.get(path) || [];
    waiters.delete(path);
    for (let i = 0; i < list.length; i++) list[i](sf);
  };
  try {
    resources.load(path + '/spriteFrame', SpriteFrame, (err, sf) => {
      if (!err && sf) {
        finish(pinPixel(sf));
        return;
      }
      resources.load(path, ImageAsset, (err2, image) => {
        if (err2 || !image) {
          finish(null);
          return;
        }
        finish(frameFromImage(image));
      });
    });
  } catch (e) {
    finish(null);
  }
}

/** 场景起来后先把这一小批图请求一遍。失败只影响有没有精灵，不影响进游戏。 */
export function preloadPixelArt (): void {
  try {
    const seen: { [path: string]: boolean } = {};
    const ids = Object.keys(PIXEL_ART) as PixelArtId[];
    for (let i = 0; i < ids.length; i++) {
      const path = PIXEL_ART[ids[i]].path;
      if (seen[path]) continue;
      seen[path] = true;
      requestSprite(path, () => undefined);
    }
  } catch (e) {
    // 资源系统还没好就保持程序绘制。
  }
}

/**
 * 在 parent 上放一张占位图。
 * fallback 会立刻画上；只有 resolveArt 确认这张图加载成功时才关掉它并挂上 Sprite。
 * fallback 传 null 表示父节点上原有的 Graphics / Label 就是缺图时的样子。
 */
export function paintPixel (
  parent: Node,
  artId: PixelArtId,
  x: number,
  y: number,
  w: number,
  h: number,
  fallback: ((host: Node) => void) | null,
  tint?: Color | null,
): Node {
  const host = nd('px-' + artId, w, h, parent);
  host.setPosition(x, y);
  const spec = PIXEL_ART[artId];
  let fb: Node | null = null;
  if (fallback) {
    fb = nd('fb', w, h, host);
    fallback(fb);
  }
  if (!spec) return host;
  const color = tint || null;
  requestSprite(spec.path, (sf) => {
    if (!host.isValid) return;
    const show = resolveArt(artId, (p) => p === spec.path && !!sf);
    if (show !== 'sprite' || !sf) return;
    try {
      const icon = nd('img', w, h, host);
      const sp = icon.addComponent(Sprite);
      sp.sizeMode = Sprite.SizeMode.CUSTOM;
      sp.type = Sprite.Type.SIMPLE;
      sp.trim = false;
      sp.spriteFrame = sf;
      if (color && spec.tintable) sp.color = color;
      const ui = icon.getComponent(UITransform);
      if (ui) ui.setContentSize(w, h);
      if (fb && fb.isValid) fb.active = false;
    } catch (e) {
      const img = host.getChildByName('img');
      if (img && img.isValid) img.destroy();
      if (fb && fb.isValid) fb.active = true;
    }
  });
  return host;
}

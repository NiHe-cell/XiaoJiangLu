/**
 * 引导入口（不依赖场景挂载）
 *
 * 坑记 P1：Cocos Creator 3.8 会在重新导入场景时剔除「手工写进 .scene 的脚本组件」，
 * 且脚本类只有在其模块被 SystemJS 执行后才注册（getClassById 才查得到）。
 * 因此放弃「改场景挂组件」这条路，改为：模块自身被 bundle 执行时注册
 * Director.EVENT_AFTER_SCENE_LAUNCH，场景就绪后自建 UI 根；
 * 若模块执行晚于场景加载，则用 director.getScene() 兜底补一次。
 */
import { director, Director, Node } from 'cc';
import { nd } from './core/Ui';
import { Store } from './core/Store';
import { Router } from './core/Router';
import { Fx } from './core/Fx';
import { buildHomePanel } from './ui/HomePanel';
import { buildStagePanel } from './ui/StagePanel';
import { buildLineupPanel } from './ui/LineupPanel';
import { buildHeroPanel } from './ui/HeroPanel';
import { buildRecruitPanel } from './ui/RecruitPanel';
import { buildBagPanel } from './ui/BagPanel';
import { buildShopPanel } from './ui/ShopPanel';
import { buildBattlePanel } from './ui/BattlePanel';
import { buildResultPanel } from './ui/ResultPanel';

let booted = false;

function onSceneReady (): void {
    if (booted) return;
    const scene = director.getScene();
    if (!scene) return;
    const canvas = scene.getChildByName('Canvas');
    if (!canvas) return;
    booted = true;

    // 隐藏模板自带的占位 Splash
    const cam = canvas.getChildByName('Camera');
    const sp = cam ? cam.getChildByName('SpriteSplash') : null;
    if (sp) sp.active = false;

    Store.load();

    const root = nd('UIRoot', 720, 1280, canvas);
    root.setPosition(0, 0);

    Fx.init(root);
    Router.init(root);

    Router.register('home', buildHomePanel);
    Router.register('stage', buildStagePanel);
    Router.register('lineup', buildLineupPanel);
    Router.register('hero', buildHeroPanel);
    Router.register('recruit', buildRecruitPanel);
    Router.register('bag', buildBagPanel);
    Router.register('shop', buildShopPanel);
    Router.register('battle', buildBattlePanel);
    Router.register('result', buildResultPanel);

    Router.go('home');
}

// 场景稍后加载：等事件
director.on(Director.EVENT_AFTER_SCENE_LAUNCH, onSceneReady);
// 场景已就绪（脚本晚于场景执行）：立即补一次
if (director.getScene()) onSceneReady();

/** 供外部（如热更新/调试）手动重引导 */
export function reboot (): void {
    booted = false;
    onSceneReady();
}

export type { Node };

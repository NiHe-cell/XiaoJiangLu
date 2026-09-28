/** 入口组件：唯一挂载在场景 Canvas 上的脚本 */
import { _decorator, Component, find } from 'cc';
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

const { ccclass } = _decorator;

@ccclass('Main')
export class Main extends Component {
    start (): void {
        // 隐藏模板自带的占位 Splash
        const sp = find('Canvas/Camera/SpriteSplash');
        if (sp) sp.active = false;

        Store.load();

        const root = nd('UIRoot', 720, 1280, this.node);
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
}

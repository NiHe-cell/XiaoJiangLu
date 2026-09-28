# 《骁将录：三国志》— 项目上下文（成员启动先读后写）

> 本文件是项目唯一事实源。任何成员开工前先读本文件，再读自己的任务书。

## 1. 项目定位
- 游戏名：《骁将录：三国志》
- 类型：2D 竖屏卡牌 + 回合制 RPG + 养成
- 平台：**微信小游戏**（Cocos Creator **3.8.8**）
- 美术风格：Q 版/半 Q 版萌系三国（对标《放开那三国》）
- 核心特色：竖屏单手操作、低养成压力、武将羁绊联动
- 经济：全免费，无付费墙，无充值入口（将玉 = 纯玩法货币）

## 2. 工程事实（已验证）
- 工程根：`E:/Projects/XiaoJiangLu/NewProject`（**独立 git 仓库**，toplevel 自检通过）
- 设计分辨率：**720 × 1280**，fitHeight；Canvas `_alignCanvasWithScreen = true`，Canvas 上有 Widget 四边对齐
- 启动场景：`db://assets/scenes/scene-2d.scene`
- 场景现状：Canvas(720×1280) → Camera(正交, orthoHeight 640) → SpriteSplash
- **可用安全宽度**：9:19.5 机型可见设计宽度约 **591**，半宽 ≈ 295。所有可点击元素必须落在 **x ∈ [-290, 290]**，背景层可用 Widget 左右拉伸铺满。
- 入口组件：`assets/scripts/Main.ts`，`@ccclass('Main')`，手工挂到场景 Canvas 节点（scene JSON 中 `__type__: "Main"`，已确认 3.x 按 ccclass 名反序列化）
- **素材策略**：零外部美术资源。全部 UI 用 `Graphics` + `Label`（系统字体）程序化绘制，杜绝资源缺失导致的空图。
- git：仓库已 init 但**尚无 commit**。每完成一个可验证步骤立即 commit（单 commit 粒度）。

## 3. 构建 / 校验命令（主理人已验证可用）
```bash
# 微信小游戏构建（15s 左右）
cd E:/Projects/XiaoJiangLu/NewProject
env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS \
  "E:/ProgramData/cocos/editors/Creator/3.8.8/CocosCreator.exe" \
  --no-sandbox --disable-gpu-sandbox --use-gl=swiftshader \
  --project "E:/Projects/XiaoJiangLu/NewProject" \
  --build "platform=wechatgame;debug=false;md5=false"

# TypeScript 编译闸（noEmit，仅类型检查）
"C:/Users/95383/.workbuddy/binaries/node/workspace/node_modules/.bin/tsc.cmd" -p tsconfig.json
```
> 坑记 R1：本机环境注入了 `ELECTRON_RUN_AS_NODE=1`，导致 CocosCreator.exe 被当成 node 启动报 `bad option: --project`，必须先 `env -u` 清掉。
> 坑记 R2：不加 `--no-sandbox --use-gl=swiftshader` 时 GPU 进程崩溃（exit -1073741819）导致编辑器 FATAL 退出。
> 坑记 R3：`--disable-gpu` 会触发 Sentry gpu-context 未捕获异常，不要用它。

## 4. 目录契约
```
assets/scripts/
  Main.ts                 入口（唯一挂场景的组件）
  core/                   框架层：Ui/Theme/EventBus/Save/Toast/Router
  data/                   静态配置表（文辞产出）
  model/                  运行时模型：属性计算、战斗解算
  ui/                     各界面面板
```

## 5. 进度
- [x] Phase -1 立项（用户已提供完整策划大纲，直接采纳）
- [x] Phase 0 脚手架：构建链路打通、GAME.md 落盘、目录契约
- [ ] Phase 1 核心循环：数据层 + 战斗 + 主界面/阵容/推图
- [ ] Phase 2 内容与质感：养成/招募/背包/商城 + 视觉规格落地
- [ ] Phase 3 验收发布：四轴验收 + 构建冒烟

## 6. 禁用操作
- 禁止改动 `settings/v2/packages/project.json` 的设计分辨率。
- 禁止引入需要外部贴图/字体/音频的资源依赖。
- 禁止在 `assets/` 之外放源码。
- 禁止 `git clean`（多窗口/多 Agent 协作场景）。

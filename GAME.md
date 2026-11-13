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
- git：仓库已有提交历史（「尚无 commit」是早期脚手架时的说法，已过时）。每完成一个可验证步骤立即 commit。公开仓库不写入真实 AppID。

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
- [x] Phase 1 核心循环：数据层 + 战斗 + 主城/阵容/推图
- [x] Phase 2 内容：养成/招募/背包/商城（日常副本按钮仍是「还没开」占位）
- [ ] Phase 3 验收发布：代码侧提审缺口已补一轮；提审仍要等个体工商户主体、新 AppID、备案、隐私指引审核、客服邮箱与执照信息、软著，以及真机重新构建后的包体实测

## 6. 禁用操作
- 禁止改动 `settings/v2/packages/project.json` 的设计分辨率。
- 禁止引入需要外部贴图/字体/音频的资源依赖。（2026-10-02 修订：允许接入 `docs/art-samples` 已生成的 Q 版立绘，但必须压缩后入包，且需有资源缺失时的程序化兜底）
- 禁止在 `assets/` 之外放源码。
- 禁止 `git clean`（多窗口/多 Agent 协作场景）。

## 7. 上架目标与合规约束（2026-10-02 用户拍板）

> 本轮目标：把 Demo 打磨为**符合微信小游戏提审标准**的完整小游戏。

### 7.1 已拍板决策
| 项 | 决策 |
|---|---|
| 正式名称 | **《骁将录》**（去掉"三国志"副标题——"三国志"为日本光荣注册商标，且名称唯一性审核难过）。界面标题已改为「骁将录」 |
| 主体与类目 | **已拍板：先注册个体工商户，再用新的小游戏账号按二级类目「角色」提审。** 不改玩法，不包装成休闲。个人主体不能选「角色类」，所以不走个人主体上架。当前 `profiles/v2/packages/wechatgame.json`（gitignore，不入库）里若仍是个人主体测试 AppID，只用于真机调试。正式 AppID 等个体户账号注册并认证后，同步改该文件的 `options.wechatgame.appid` 与 `taskOptionsMap.*` 两处，然后重新构建。公开仓库保持模板 `appid` 为空 |
| 变现 | **纯 IAA**：激励视频 + 插屏 + Banner。无内购、无充值、无虚拟支付。个体工商户路径也不在本项目加内购 |
| 广告位 | 配置表里的广告位 ID **仍是空串**（不是已填好的测试 ID）。空 ID、未授权、播放失败都按降级发奖，不打断流程。上线前只换 ID |
| 登录 | 本地存档 + 隐私同意后 `wx.login` 静默（不弹昵称头像授权）+ `wx.onShareAppMessage` 右上角分享。**无服务端**，分享不设「不分享不能玩」 |
| 美术 | 程序化绘制为主 + `docs/art-samples` 已生成 Q 版立绘点缀（武将详情 / 招募演出） |

### 7.2 本轮新增系统
- **新手引导**：首启 5 步（出征 → 布阵 → 开战 → 养成 → 招募），保障前 30 秒零门槛
- **每日签到 + 七日任务**：标准留存骨架
- **日常副本**：经验 / 银币 / 进阶丹 三类，每日次数限制，解决"卡关无事可做"

### 7.3 提审红线（代码侧现状，2026-11-13）
1. 隐私：`WxApi` 已封装 `getPrivacySetting` / `requirePrivacyAuthorize` / `openPrivacyContract` / `onNeedPrivacyAuthorization`，并接到启动、广告前、设置页。拒绝后广告降级，游戏继续。**不要**往 `game.json` 写 `__usePrivacyCheck__`（那是小程序 `app.json` 字段）。mp 后台《用户隐私保护指引》仍要等新 AppID 后提交审核。
2. 设置页已有意见反馈、隐私政策、用户协议。客服邮箱、个体工商户字号、统一社会信用代码、联系地址在 `assets/scripts/data/ContactConf.ts` 留空。空着时界面写「待填写 / 暂无法联系」，禁止编造。
3. 开始页与设置页已用 Graphics + Label 画 12+ 和出版署《健康游戏忠告》（一字未改）。
4. 首包仍要在重新构建后实测 ≤ 4MB。本轮已关闭未使用的 Spine、DragonBones、Video、WebView、TiledMap。3D 物理原本就是关的。Audio 保留（要不要做音频还没定）。设计分辨率未改。
5. 无诱导分享、无强制分享、无外链跳转。`game.json` 不写 `navigateToMiniProgramAppIdList`、`permission`、`workers`。
6. 无充值、无内购、无虚拟支付。

### 7.4 主体路径（已拍板，不再二选一）

用户已决定：**先办个体工商户，认证后用新的小游戏账号，按二级类目「角色」提审。**

下一步在用户侧，不在代码侧：

1. 注册个体工商户并完成微信主体认证。
2. 用该主体新建小游戏账号，类目选「角色」。不要改成休闲，也不要为了过审去改卡牌和回合制。
3. 把新 AppID 写入本地 `profiles/v2/packages/wechatgame.json` 的两处（`options.wechatgame.appid` 与 `taskOptionsMap` 里对应任务），重新构建。不要把这个 AppID 提交进公开仓库。
4. 用营业执照上的字号填写 `ContactConf.ts`、用户协议落款和自审报告。执照号、邮箱、地址继续由用户本人填写。
5. 备案、mp 后台隐私指引审核、软著（建议）仍按 `docs/提审材料/7-审核红线与整改清单.md` 办理。

「游戏类目仅对企业主体开放」这句已经过时。个人主体可以注册并发布小游戏，但不能选「文化互动」「角色类」「牌类」。本品是卡牌 + 回合制 RPG，类目就是「角色」，所以走个体工商户，而不是改玩法。

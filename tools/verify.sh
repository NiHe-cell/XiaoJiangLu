#!/usr/bin/env bash
# 双闸校验：① TypeScript 编译闸 ② 微信小游戏构建闸
# 用法：bash tools/verify.sh
set -e

PROJECT="E:/Projects/XiaoJiangLu/NewProject"
CREATOR="E:/ProgramData/cocos/editors/Creator/3.8.8/CocosCreator.exe"
TSC="C:/Users/95383/.workbuddy/binaries/node/workspace/node_modules/.bin/tsc.cmd"

cd "$PROJECT"

echo "== 闸 1/2  TypeScript 编译（仅校验 assets 下源码）=="
ERRORS=$("$TSC" -p tsconfig.json --skipLibCheck --noEmit 2>&1 | grep -E "^assets/" || true)
if [ -n "$ERRORS" ]; then
  echo "$ERRORS"
  echo "❌ 编译闸未通过"
  exit 1
fi
echo "✅ 编译闸通过"

echo "== 闸 2/2  微信小游戏构建 =="
env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS \
  "$CREATOR" --no-sandbox --disable-gpu-sandbox --use-gl=swiftshader \
  --project "$PROJECT" --build "platform=wechatgame;debug=false;md5=false" 2>&1 \
  | grep -E "build Task|error|Error|✗|失败" | tail -12

if [ -f "$PROJECT/build/wechatgame/game.js" ]; then
  echo "✅ 构建闸通过，产物：$PROJECT/build/wechatgame"
else
  echo "❌ 构建闸未通过"
  exit 1
fi

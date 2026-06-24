# Recordly Custom Release Process

这个文件用于约束“什么时候更新安装版”、“什么时候推 GitHub”、“什么时候发 Release”。

## 三个版本层级

### 1. 工作区版本

- 位置：`D:\Users\10549\Documents\录屏工具RE改造`
- 用途：继续改造、验证、记录脚本和文档

### 2. 安装版版本

- 位置：`C:\Users\10549\AppData\Local\Programs\recordly\resources\app.asar`
- 用途：当前电脑上真实正在运行的版本

### 3. GitHub / Release 版本

- 用途：公开保存源码状态和稳定安装包

## 推荐发布流程

1. 在工作区修改 `asar-inspect/`、`scripts/` 或 `docs/`
2. 执行基础检查
   ```powershell
   node --check asar-inspect/dist-electron/main.cjs
   node --check asar-inspect/dist-electron/preload.mjs
   ```
3. 如果本次改动有对应验证脚本，也一并执行
4. 重新打包新的 `app.asar`
5. 先备份安装目录当前 `app.asar`
6. 替换安装目录 `app.asar`
7. 真实手测
   - 启动 Recordly
   - 打开录制条
   - 测试摄像头或手机摄像头
   - 录制一小段
   - 导出并检查视频与声音
8. 手测通过后，再同步 GitHub 源码和文档
9. 只有在“可以给别人下载安装”时，才更新 GitHub Release

## 什么时候只更新 GitHub，不发 Release

- 只改了 README 或 `docs/`
- 只补了脚本或维护记录
- 功能仍在实验中
- 本地已测试，但还不想对外给别人下载安装

## 什么时候可以发新 Release

- 安装版已经替换成功
- 关键功能已手测通过
- README 已和当前安装版一致
- 回退路径明确
- 安装包已经重新整理好

## 发布前最少检查清单

1. `main.cjs` 语法检查通过
2. `preload.mjs` 语法检查通过
3. 关键录制流程可用
4. 导出视频可播放
5. 导出声音正常
6. 文档没有沿用旧版本描述

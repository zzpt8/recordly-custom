# Recordly Custom

基于 Recordly 改造的 Windows 录屏工具，当前公开版本已经对齐本机实际可用安装版，适合直接下载安装使用。

## 下载安装

- Release 页面：https://github.com/zzpt8/recordly-custom/releases/tag/v1.0.1-custom
- Windows 安装包直链：https://github.com/zzpt8/recordly-custom/releases/download/v1.0.1-custom/Recordly-Custom-1.0.1-Windows-x64.exe

## 核心功能

- 支持桌面录屏，并保留麦克风等最近一次录制配置。
- 支持录制时显示摄像头画面，并把摄像头画面合成进最终导出视频。
- 摄像头画面支持移动、缩放，并保存上一次的位置和大小。
- 支持“手机作为摄像头（本地连接）”接入，会弹出二维码窗口接入现有摄像头预览与录制链路。
- 手机摄像头预览里的文字方向已经修正为正向显示。
- 录制条不会出现在最终导出视频里。
- 导出视频声音已经验证正常。

## 适合谁

- 想直接下载一个可用 Windows 安装版来录屏的人。
- 想要同时录桌面和摄像头画面的人。
- 想把手机临时当作本地摄像头接入录屏流程的人。
- 想基于当前可用版本继续二次改造的人。

## 已知说明

- 当前主要录屏流程不依赖 Whisper 模型；自动字幕相关入口仍保留，但默认使用时不必先下载模型。
- 这个仓库保存的是当前可用安装版对应的解包与改造内容，不是最理想的“原始上游源码仓库”结构。
- 安装包建议继续通过 GitHub Release 附件发布，不直接把大体积安装文件提交进源码仓库。

## 源码与维护入口

- `asar-inspect/`：当前安装版应用包解出的主要内容，是这份仓库里最核心的改造基础。
- `asar-inspect/dist-electron/`：Electron 主进程和 preload 打包文件。
- `asar-inspect/dist/assets/`：前端渲染层打包资源。
- `scripts/`：补丁脚本、验证脚本和实验脚本。
- `docs/`：功能说明和改造记录。
- `docs/maintenance-notes.md`：长期维护记录、当前维护基线和改造记录模板。
- `docs/release-process.md`：工作区、安装版、GitHub Release 三者之间的发布流程。
- `docs/maintenance-checklist.md`：以后每次继续改造时可直接照着执行的固定清单。

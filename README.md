# Recordly Custom

这是一个基于 Recordly 调整后的 Windows 录屏工具仓库。

如果你只是想下载安装使用，看下面的下载入口即可；如果你想看这个版本改了什么、源码内容放在哪里，后面也有对应说明。

## 下载安装

- Release 页面：https://github.com/zzpt8/recordly-custom/releases/tag/v1.0.0-custom
- Windows 安装包直链：https://github.com/zzpt8/recordly-custom/releases/download/v1.0.0-custom/Recordly-Custom-1.0.0-Windows-x64.exe

## 这个版本能做什么

- 支持录制时显示摄像头画面，并把摄像头画面合成进导出成片。
- 摄像头画面支持移动、缩放，并保存上一次的位置和大小。
- 麦克风等录制配置会保存最近一次选择。
- 录制条只负责录制过程控制，不会出现在最终导出视频里。
- 导出视频声音已经验证正常。
- 当前主要录屏流程不依赖 Whisper 模型；自动字幕相关入口仍保留，但默认使用时不必先下载模型。

## 这个改造版改了什么

- 调整了摄像头录制与导出链路，让摄像头叠加更稳定。
- 增强了摄像头位置、缩放和布局相关行为。
- 支持“手机作为摄像头（本地连接）”接入，会弹出二维码窗口并接入现有摄像头预览与录制链路。
- 保留了当前已经验证可用的安装版内容，方便继续维护和回退。

## 适合谁

- 想直接下载一个可用 Windows 安装版来录屏的人。
- 想基于当前可用版本继续二次改造的人。
- 想查看这个版本具体改动点和脚本记录的人。

## 源码和改造记录在哪里

- `asar-inspect/`：当前安装版应用包解出的主要内容，是这份仓库里最核心的改造基础。
- `asar-inspect/dist-electron/`：Electron 主进程和 preload 打包文件。
- `asar-inspect/dist/assets/`：前端渲染层打包资源。
- `scripts/`：补丁脚本、验证脚本和实验脚本。
- `docs/`：功能说明和改造记录。
- `docs/maintenance-notes.md`：长期维护记录、当前维护基线和改造记录模板。
- `docs/release-process.md`：工作区、安装版、GitHub Release 三者之间的发布流程。
- `docs/maintenance-checklist.md`：以后每次继续改造时可直接照着执行的固定清单。

## 已知说明

- 这个仓库保存的是当前可用安装版对应的解包与改造内容，不是最理想的“原始上游源码仓库”结构。
- 如果后续找回原始 Recordly 源码，建议再单独建立更标准的源码仓库。
- 安装包建议继续通过 GitHub Release 附件发布，不直接把大体积安装文件提交进源码仓库。

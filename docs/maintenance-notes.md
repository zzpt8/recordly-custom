# Recordly Custom Maintenance Notes

这个文件用于记录当前稳定版本、每次改造内容、验证结果和回退点。

## 当前维护基线

- 当前实际安装目录：`C:\Users\10549\AppData\Local\Programs\recordly\resources\`
- 当前工作区目录：`D:\Users\10549\Documents\录屏工具RE改造`
- 当前 GitHub 仓库：`https://github.com/zzpt8/recordly-custom`
- 当前公开 Release：`v1.0.1-custom`

## 长期维护规则

1. 当前实际运行版本以安装目录中的 `app.asar` 为准。
2. 后续改造以工作区 `asar-inspect/` 为准，不直接把安装目录当源码目录改。
3. README 和 `docs/` 里的功能描述，必须和当前实际安装版一致。
4. 每次替换安装目录前，先创建带时间戳的 `app.asar` 备份。
5. 每次改造完成后，至少执行语法检查和一次真实录制测试。
6. GitHub `main` 保存当前可公开查看的源码与文档状态。
7. GitHub Release 只用于保存已经确认可下载安装的稳定版本。

## 每次改造记录模板

### YYYY-MM-DD - 改动标题

- 改动目标：
- 影响文件：
- 是否重新打包 `app.asar`：是 / 否
- 安装目录备份名：
- 验证步骤：
- 验证结果：
- 是否同步 GitHub：是 / 否
- 备注：

## 当前已知维护重点

- 摄像头预览、位置、缩放、布局相关行为
- 手机摄像头（本地连接）接入链路
- 导出视频声音正常性
- README 与当前安装版实际行为保持一致

# Recordly Custom Maintenance Checklist

以后每次继续改造这个工具，建议直接照着这份清单执行。

## 改造前

1. 确认这次要改的是工作区，不是直接改安装目录
2. 确认当前安装版可以正常打开
3. 记录当前安装目录 `app.asar` 的备份名
4. 明确这次改动目标

## 改造中

1. 优先修改 `asar-inspect/`
2. 能沉淀成脚本的动作尽量写进 `scripts/`
3. 需要说明的行为变化写进 `docs/`
4. 如果功能说明变了，同步更新 `README.md`

## 打包前检查

1. 执行：
   ```powershell
   node --check asar-inspect/dist-electron/main.cjs
   node --check asar-inspect/dist-electron/preload.mjs
   ```
2. 执行相关验证脚本
3. 检查 README 是否仍和当前实际版本一致

## 替换安装版

1. 先备份：
   `C:\Users\10549\AppData\Local\Programs\recordly\resources\app.asar`
2. 再替换新的 `app.asar`
3. 不要在没有备份的情况下覆盖安装目录

## 手动验收

1. 打开 Recordly
2. 打开录制条
3. 测试关键入口
4. 录制一段短视频
5. 导出视频
6. 检查画面
7. 检查声音
8. 关闭并重新打开，检查设置是否符合预期

## 同步 GitHub

1. 功能稳定后再同步源码
2. 文档描述必须和当前安装版一致
3. Release 只放稳定版安装包

## 出问题时怎么退回

1. 停止继续覆盖安装目录
2. 取回上一个 `app.asar` 备份
3. 替回安装目录
4. 重新打开 Recordly 验证
5. 在维护记录里写清这次失败点

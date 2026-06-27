# Recordly Phone Camera MVP

## 目标

在录制条的摄像头菜单里增加 `手机摄像头（本地连接）` 入口。选择后，Recordly 启动一个本地手机接入服务，手机打开连接地址并授权摄像头，画面会被包装成现有 webcam `MediaStream`，继续走原来的摄像头预览、sidecar 录制和编辑器叠加链路。

## 当前实现

- 主进程新增 `recordly-phone-camera:start`、`recordly-phone-camera:get-frame`、`recordly-phone-camera:stop` IPC。
- Windows 上启动手机连接时，会在用户数据目录生成本地 HTTPS 自签证书。
- 选择手机摄像头后，会自动弹出一个独立二维码窗口，并把连接地址复制到剪贴板。
- 手机连接页由 Recordly 本地服务提供，手机端通过摄像头采集画面，并以 JPEG 帧 POST 回电脑。
- 渲染层轮询最新手机帧，绘制到 canvas，并通过 `canvas.captureStream(30)` 生成可录制视频流。
- 录制条摄像头列表固定追加 `手机摄像头（本地连接）`。
- 录制条和预览层现在不会再把手机摄像头画面强制镜像，界面里的文字会保持正向显示。

## 使用方式

1. 电脑和手机连接到同一个 Wi-Fi。
2. 打开 Recordly 录制条。
3. 点击摄像头按钮。
4. 选择 `手机摄像头（本地连接）`。
5. Recordly 会弹出二维码窗口，并自动复制连接地址到剪贴板。
6. 手机上点击 `开始摄像头` 并授权摄像头。
7. 电脑录制条中出现手机画面后，开始录制。

## 限制

- 当前通过本地二维码窗口和剪贴板地址引导连接；如果二维码生成失败，则回退为手动复制地址打开。
- 需要手机能访问电脑的局域网 IP；Windows 防火墙可能弹出放行提示。
- HTTPS 使用本地自签证书，手机首次打开可能需要手动继续访问。
- 当前只传视频画面，不采集手机麦克风。
- 当前帧传输是 JPEG 轮询/上传方案，适合作为 MVP；后续若追求低延迟和高帧率，应升级为 WebRTC。
- 如果看到文字方向异常，优先确认是不是浏览器缓存了旧版页面；当前安装版和打包资源已修正为正向预览。

## 验证

```powershell
node --check asar-inspect/dist-electron/main.cjs
node --check asar-inspect/dist-electron/preload.mjs
node --check asar-inspect/dist/assets/index-webcam-layout-20260621182027.js
node scripts/verify-phone-camera.js
```

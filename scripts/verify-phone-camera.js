const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "asar-inspect", "dist");
const assetsDir = path.join(distDir, "assets");
const htmlPath = path.join(distDir, "index.html");
const mainPath = path.join(root, "asar-inspect", "dist-electron", "main.cjs");
const preloadPath = path.join(root, "asar-inspect", "dist-electron", "preload.mjs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function activeRendererPath() {
  const html = read(htmlPath);
  const match = html.match(/\.\/assets\/([^"]+\.js)/);
  if (!match) {
    throw new Error("dist/index.html missing renderer script");
  }
  return path.join(assetsDir, match[1]);
}

function assertIncludes(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) {
    throw new Error(`${path.relative(root, file)} missing ${label}`);
  }
}

function assertNotIncludes(file, needle, label) {
  const text = read(file);
  if (text.includes(needle)) {
    throw new Error(`${path.relative(root, file)} still contains ${label}`);
  }
}

const rendererPath = activeRendererPath();
const modernExporterPath = path.join(path.dirname(rendererPath), read(rendererPath).match(/"(\.\/modernVideoExporter-[^"]+\.js)"/)[1].replace(/^\.\//, ""));

assertIncludes(mainPath, 'recordly-phone-camera:start', "phone camera start IPC handler");
assertIncludes(mainPath, 'recordly-phone-camera:get-frame', "phone camera frame IPC handler");
assertIncludes(mainPath, 'recordlyPhoneCameraHtml', "mobile capture page");
assertIncludes(mainPath, "recordlyPhoneCameraLoadSavedState", "persistent phone camera session load");
assertIncludes(mainPath, "recordlyPhoneCameraSaveState(address.port)", "persistent phone camera session save");
assertIncludes(mainPath, 'CertificateRequest', "Windows HTTPS certificate generation");
assertIncludes(mainPath, "{ timeout: 45000, windowsHide: true }", "longer HTTPS certificate generation timeout");
assertIncludes(mainPath, "手机摄像头需要 HTTPS", "Windows phone camera refuses insecure HTTP fallback");
assertIncludes(mainPath, "recordlyPhoneCameraGetUserMediaFallback", "mobile camera getUserMedia fallback");
assertIncludes(mainPath, "当前页面不是 HTTPS 安全连接", "mobile camera insecure context hint");
assertIncludes(mainPath, "recordlyPhoneCameraShowConnectInfo", "system connect prompt");
assertIncludes(mainPath, "m.clipboard.writeText(info.url)", "connect URL clipboard copy");
assertIncludes(mainPath, 'require("qrcode")', "local QR code dependency");
assertIncludes(mainPath, "recordlyPhoneCameraQrHtml", "QR connect window HTML");
assertNotIncludes(mainPath, "旋转画面", "mobile phone-side rotate control");
assertIncludes(mainPath, 'title: "Recordly 手机摄像头"', "QR connect window title");
assertIncludes(mainPath, "win.loadURL", "QR connect window load");
assertIncludes(mainPath, "recordlyPhoneCameraState.qrWindow.close()", "QR window auto closes after phone connects");

assertIncludes(preloadPath, "phoneCameraStart", "preload phoneCameraStart API");
assertIncludes(preloadPath, "phoneCameraGetFrame", "preload phoneCameraGetFrame API");
assertIncludes(preloadPath, "phoneCameraStop", "preload phoneCameraStop API");

assertIncludes(rendererPath, 'recordlyPhoneCameraDeviceId = "recordly-phone-camera"', "phone camera pseudo device id");
assertIncludes(rendererPath, 'label:"手机摄像头（本地连接）"', "record bar phone camera menu item");
assertIncludes(rendererPath, "recordlyPhoneCameraCreateStream", "phone camera stream factory");
assertIncludes(rendererPath, "requestCanvasFrame", "phone camera canvas frame refresh");
assertIncludes(mainPath, "frameBuffer: recordlyPhoneCameraState.frame.buffer.slice", "binary phone camera frame IPC");
assertIncludes(mainPath, "maxEdge=720", "lighter mobile frame upload");
assertIncludes(rendererPath, "pendingFrame", "latest-only phone frame queue");
assertIncludes(rendererPath, "createImageBitmap", "fast phone frame decode");
assertIncludes(rendererPath, "canvas.height > canvas.width", "phone camera portrait canvas handling");
assertIncludes(rendererPath, "recordlyWebcamRotation", "desktop webcam preview rotation");
assertIncludes(rendererPath, "旋转摄像头方向", "recording HUD webcam rotate button");
assertIncludes(rendererPath, "recordingWebcamPreviewRotation", "recording HUD webcam rotation state");
assertIncludes(modernExporterPath, "webcamRootContainer.rotation", "export webcam rotation");
assertIncludes(rendererPath, "recordlyWebcamRotation", "desktop webcam preview rotation");
assertIncludes(rendererPath, "旋转摄像头方向", "recording HUD webcam rotate button");
assertIncludes(rendererPath, "recordingWebcamPreviewRotation", "recording HUD webcam rotation state");
assertIncludes(rendererPath, "applyRecordedPlacement:!0", "editor applies recorded webcam placement");
assertIncludes(rendererPath, "recordedRect:t", "recording session saves exact webcam rect");
assertIncludes(rendererPath, "recordlyRecordedWebcamRect", "editor preview uses recorded webcam rect");
assertIncludes(rendererPath, "recordlyNormalizeRecordedViewport", "editor preserves recorded viewport");
assertIncludes(mainPath, "recordedViewport", "main preserves recorded webcam viewport");
assertIncludes(modernExporterPath, "recordlyModernRecordedWebcamRect", "export uses recorded webcam rect");
assertIncludes(rendererPath, "rotation:Tka(P.rotation)", "editor preserves webcam rotation state");
assertIncludes(rendererPath, "recordlyFallbackWebcamRotation", "2D fallback webcam rotation");
assertIncludes(mainPath, "layoutKeyframes=t.layoutKeyframes", "main preserves webcam overlay keyframes");
assertIncludes(mainPath, "r.rotation=", "main preserves webcam overlay rotation");
assertIncludes(rendererPath, "applyRecordedPlacement:!0", "editor applies recorded webcam placement");
assertIncludes(rendererPath, "rotation:Tka(P.rotation)", "editor preserves webcam rotation state");
assertIncludes(mainPath, "layoutKeyframes=t.layoutKeyframes", "main preserves webcam overlay keyframes");
assertIncludes(mainPath, "r.rotation=", "main preserves webcam overlay rotation");
assertIncludes(modernExporterPath, "webcamRootContainer.rotation", "export webcam rotation");
assertIncludes(rendererPath, "recordlyWebcamRotation", "desktop webcam preview rotation");
assertIncludes(modernExporterPath, "webcamRootContainer.rotation", "export webcam rotation");
assertIncludes(rendererPath, 'recordlyPhoneCameraPanelSet(info, "请在弹出的二维码窗口扫码连接")', "HUD panel disabled in favor of QR window");
assertIncludes(rendererPath, "N.current=recordlyIsPhoneCameraDevice(E)?await recordlyPhoneCameraCreateStream({showConnectInfo:!1})", "recording phone camera uses live stream without connect dialog");
assertIncludes(rendererPath, "recordlyIsPhoneCameraDevice(t)?await recordlyPhoneCameraCreateStream()", "preview stream override");
assertIncludes(rendererPath, "recordlyPhoneCameraCreateStream({showConnectInfo:!1})", "recording phone camera suppresses connect dialog");
assertNotIncludes(rendererPath, "Webcam full screen for selected clip", "editor selected clip webcam fullscreen button");
assertNotIncludes(rendererPath, "recordlyFullscreenWebcamClip", "editor selected clip webcam fullscreen action");
assertNotIncludes(rendererPath, "onWebcamChange:recordlySetWebcamAtCurrentTime", "editor webcam time-segment writer prop");
assertNotIncludes(rendererPath, "recordlyRotateWebcamClip", "editor webcam rotate action");
assertNotIncludes(rendererPath, "Rotate webcam frame 90 degrees", "editor webcam ROT toolbar button");
assertIncludes(rendererPath, "recordlyRecordedWebcamRect(e,a,t,n=1)", "recorded webcam rect reacts to zoom");
assertIncludes(rendererPath, "recordlyWebcamFullCrop", "settings webcam preview keeps full crop");
assertIncludes(rendererPath, "object-contain bg-black", "settings webcam preview does not crop");
assertIncludes(rendererPath, "recordlyWebcamFreeCrop", "settings webcam crop can resize freely");
assertIncludes(rendererPath, "recordlyPhoneWebcamContain", "editor phone camera preview uses contain");
assertIncludes(rendererPath, "recordlyWebcamEffectiveAspect", "editor webcam layout follows crop aspect");
assertIncludes(mainPath, "recordlyCropRegion", "main preserves webcam crop region");
assertIncludes(modernExporterPath, "recordlyModernWebcamEffectiveAspect", "export webcam layout follows crop aspect");
assertIncludes(rendererPath, "recordlyCurrentAspect", "recording HUD uses dynamic phone camera aspect");
assertIncludes(rendererPath, "eRa(a,.25,4)", "renderer allows portrait webcam aspect");
assertIncludes(mainPath, "t.aspectRatio:16/9,.25,4", "main allows portrait webcam aspect");
assertIncludes(modernExporterPath, "Math.max(.25,t)", "export allows portrait webcam aspect");
assertIncludes(modernExporterPath, 'contain:"phone-camera"===t.sourceKind', "export phone camera uses contain");
assertIncludes(rendererPath, "Added 1 automatic zoom suggestion", "suggest zoom fallback creates a zoom");
assertIncludes(modernExporterPath, "recordlyModernRecordedWebcamRect(e,t,i,a=1)", "export recorded webcam rect reacts to zoom");
assertIncludes(mainPath, "options.showConnectInfo !== false", "main respects silent phone camera start");
assertNotIncludes(mainPath, "手机连接地址已复制", "blocking phone camera fallback dialog");
assertIncludes(rendererPath, 'sourceKind:r?"phone-camera":void 0,mirror:r?!1:c.mirror??e.mirror', "phone camera HUD preview disables mirror");
assertIncludes(rendererPath, 'mirror:"phone-camera"===P.sourceKind?!1:"boolean"==typeof P.mirror?P.mirror:YCa.mirror', "phone camera saved overlay disables mirror");
assertIncludes(rendererPath, 'style:{transform:f===recordlyPhoneCameraDeviceId?void 0:"scaleX(-1)"}', "recording HUD preview keeps desktop mirror but not phone camera");
assertIncludes(rendererPath, 'cropRegion:r?o:c.cropRegion??e.cropRegion', "phone camera editor no crop override");
assertIncludes(mainPath, 'webcamSourceKind:t.webcamSourceKind==="phone-camera"', "main session keeps phone camera source kind");

console.log(`phone camera patch verified: ${path.basename(rendererPath)}`);

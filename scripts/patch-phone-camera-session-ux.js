const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const mainPath = path.join(root, "asar-inspect", "dist-electron", "main.cjs");
const phonePatchPath = path.join(root, "scripts", "patch-phone-camera.js");
const verifyPath = path.join(root, "scripts", "verify-phone-camera.js");
const htmlPath = path.join(root, "asar-inspect", "dist", "index.html");
const assetsDir = path.join(root, "asar-inspect", "dist", "assets");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

function activeRendererPath() {
  const html = read(htmlPath);
  const match = html.match(/\.\/assets\/([^"]+\.js)/);
  if (!match) throw new Error("Could not find renderer script in dist/index.html");
  return path.join(assetsDir, match[1]);
}

function replaceOnce(text, search, replace, label, file) {
  if (!text.includes(search)) {
    if (text.includes(replace)) return { text, changed: false };
    throw new Error(`${path.relative(root, file)} missing ${label}`);
  }
  return { text: text.replace(search, replace), changed: true };
}

function replaceRange(text, startNeedle, endNeedle, replacement, label, file) {
  const start = text.indexOf(startNeedle);
  if (start < 0) {
    if (text.includes(replacement)) return { text, changed: false };
    throw new Error(`${path.relative(root, file)} missing ${label} start`);
  }
  const end = text.indexOf(endNeedle, start);
  if (end < 0) throw new Error(`${path.relative(root, file)} missing ${label} end`);
  return {
    text: text.slice(0, start) + replacement + "\n\n" + text.slice(end),
    changed: true,
  };
}

function replacementRecordlyPhoneCameraCreateServer(certificate) {
  const server = certificate ? xv.createServer(certificate, recordlyPhoneCameraHandle) : fm.createServer(recordlyPhoneCameraHandle);
  if (certificate) {
    server.on("tlsClientError", (error, socket) => {
      const target = recordlyPhoneCameraState.displayUrl;
      if (!target || !socket || socket.destroyed) return;
      try {
        const body = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recordly 手机摄像头</title><meta http-equiv="refresh" content="0;url=${recordlyPhoneCameraEscapeHtml(target)}"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;line-height:1.6"><h1 style="font-size:20px">正在打开安全连接</h1><p>手机摄像头需要 HTTPS。若没有自动跳转，请打开：</p><p style="word-break:break-all">${recordlyPhoneCameraEscapeHtml(target)}</p></body></html>`;
        socket.end([
          "HTTP/1.1 308 Permanent Redirect",
          `Location: ${target}`,
          "Content-Type: text/html; charset=utf-8",
          `Content-Length: ${Buffer.byteLength(body)}`,
          "Connection: close",
          "",
          body,
        ].join("\r\n"));
      } catch {
        try {
          socket.destroy();
        } catch {}
      }
    });
  }
  return server;
}

async function replacementRecordlyPhoneCameraStart() {
  if (recordlyPhoneCameraState.baseUrl) {
    const info = {
      success: true,
      url: recordlyPhoneCameraState.displayUrl,
      localUrl: recordlyPhoneCameraState.baseUrl,
      statusUrl: recordlyPhoneCameraState.statusUrl,
      secure: recordlyPhoneCameraState.secure,
      token: recordlyPhoneCameraState.token,
    };
    recordlyPhoneCameraShowConnectInfo(info);
    return info;
  }
  if (recordlyPhoneCameraState.starting) {
    return recordlyPhoneCameraState.starting;
  }
  recordlyPhoneCameraState.starting = new Promise((resolve) => {
    const host = recordlyPhoneCameraLanAddress();
    const certificate = recordlyPhoneCameraEnsureCertificate(host);
    const saved = recordlyPhoneCameraLoadSavedState();
    recordlyPhoneCameraState.token = saved.token || dm.randomBytes(18).toString("hex");
    recordlyPhoneCameraState.savedPort = saved.port || null;
    let server = recordlyPhoneCameraCreateServer(certificate);
    let triedRandomPort = false;
    const listen = (port) => {
      server.once("error", (error) => {
        if (port && !triedRandomPort) {
          triedRandomPort = true;
          console.warn("[phone-camera] Saved port unavailable; retrying on a random port.", error);
          try {
            server.close();
          } catch {}
          server = recordlyPhoneCameraCreateServer(certificate);
          listen(0);
          return;
        }
        resolve({ success: false, error: String((error && error.message) || error) });
      });
      server.listen(port || 0, "0.0.0.0", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          server.close();
          resolve({ success: false, error: "Phone camera server did not expose a TCP address" });
          return;
        }
        const protocol = certificate ? "https" : "http";
        recordlyPhoneCameraState.server = server;
        recordlyPhoneCameraState.secure = Boolean(certificate);
        recordlyPhoneCameraState.savedPort = address.port;
        recordlyPhoneCameraState.baseUrl = `${protocol}://127.0.0.1:${address.port}`;
        recordlyPhoneCameraState.displayUrl = `${protocol}://${host}:${address.port}/phone-camera?token=${encodeURIComponent(recordlyPhoneCameraState.token)}`;
        recordlyPhoneCameraState.statusUrl = `${protocol}://${host}:${address.port}/phone-camera/status`;
        recordlyPhoneCameraSaveState(address.port);
        console.log(`[phone-camera] Listening at ${recordlyPhoneCameraState.displayUrl}`);
        const info = {
          success: true,
          url: recordlyPhoneCameraState.displayUrl,
          localUrl: recordlyPhoneCameraState.baseUrl,
          statusUrl: recordlyPhoneCameraState.statusUrl,
          secure: Boolean(certificate),
          token: recordlyPhoneCameraState.token,
        };
        recordlyPhoneCameraShowConnectInfo(info);
        resolve(info);
      });
    };
    listen(recordlyPhoneCameraState.savedPort || 0);
  }).finally(() => {
    recordlyPhoneCameraState.starting = null;
  });
  return recordlyPhoneCameraState.starting;
}

const stateBlock = `const recordlyPhoneCameraState = {
    server: null,
    baseUrl: null,
    displayUrl: null,
    statusUrl: null,
    token: null,
    secure: false,
    serial: 0,
    frame: null,
    mime: "image/jpeg",
    updatedAt: 0,
    width: 0,
    height: 0,
    starting: null,
    lastPromptAt: 0,
    qrWindow: null,
  };`;

const stateBlockPatched = `const recordlyPhoneCameraState = {
    server: null,
    baseUrl: null,
    displayUrl: null,
    statusUrl: null,
    token: null,
    secure: false,
    serial: 0,
    frame: null,
    mime: "image/jpeg",
    updatedAt: 0,
    width: 0,
    height: 0,
    starting: null,
    lastPromptAt: 0,
    qrWindow: null,
    savedPort: null,
  };

  function recordlyPhoneCameraStatePath() {
    return S.join(bt, "phone-camera-session.json");
  }

  function recordlyPhoneCameraLoadSavedState() {
    try {
      const data = JSON.parse(Q.readFileSync(recordlyPhoneCameraStatePath(), "utf8"));
      const token = typeof data.token === "string" && /^[a-f0-9]{24,80}$/i.test(data.token) ? data.token : null;
      const port = Number.isInteger(data.port) && data.port > 1024 && data.port < 65535 ? data.port : null;
      return { token, port };
    } catch {
      return { token: null, port: null };
    }
  }

  function recordlyPhoneCameraSaveState(port) {
    try {
      Q.mkdirSync(S.dirname(recordlyPhoneCameraStatePath()), { recursive: true });
      Q.writeFileSync(recordlyPhoneCameraStatePath(), JSON.stringify({
        version: 1,
        token: recordlyPhoneCameraState.token,
        port,
        updatedAt: Date.now(),
      }, null, 2), "utf8");
    } catch (error) {
      console.warn("[phone-camera] Failed to save phone camera session.", error);
    }
  }`;

const createServerText = replacementRecordlyPhoneCameraCreateServer
  .toString()
  .replace("function replacementRecordlyPhoneCameraCreateServer", "function recordlyPhoneCameraCreateServer");
const startText = replacementRecordlyPhoneCameraStart
  .toString()
  .replace("async function replacementRecordlyPhoneCameraStart", "async function recordlyPhoneCameraStart");

function patchPhoneMainLikeFile(file) {
  let text = read(file);
  let changed = false;

  ({ text, changed } = replaceOnce(text, stateBlock, stateBlockPatched, "phone camera persisted state", file));

  const createServerInsertionPoint = "  async function recordlyPhoneCameraStart() {";
  if (!text.includes("function recordlyPhoneCameraCreateServer(certificate)")) {
    text = text.replace(createServerInsertionPoint, `  ${createServerText}\n\n${createServerInsertionPoint}`);
    changed = true;
  }

  const replacedStart = replaceRange(
    text,
    "  async function recordlyPhoneCameraStart() {",
    "  function recordlyPhoneCameraEscapeHtml(value) {",
    `  ${startText}`,
    "phone camera persistent start",
    file
  );
  text = replacedStart.text;
  changed = changed || replacedStart.changed;

  const frameNeedle = `          recordlyPhoneCameraState.updatedAt = Date.now();
          recordlyPhoneCameraState.serial += 1;
          recordlyPhoneCameraRespond(204, response, "");`;
  const frameReplace = `          recordlyPhoneCameraState.updatedAt = Date.now();
          recordlyPhoneCameraState.serial += 1;
          if (recordlyPhoneCameraState.qrWindow && !recordlyPhoneCameraState.qrWindow.isDestroyed()) {
            try {
              recordlyPhoneCameraState.qrWindow.close();
            } catch {}
          }
          recordlyPhoneCameraRespond(204, response, "");`;
  ({ text, changed } = replaceOnce(text, frameNeedle, frameReplace, "QR window auto close on first frame", file));

  ({ text, changed } = replaceOnce(
    text,
    `let stream=null,facing="user",busy=false,run=false,controlsTimer=null;`,
    `let stream=null,facing="user",busy=false,run=false,controlsTimer=null,autoStart=localStorage.getItem("recordly-phone-camera-autostart")==="1";`,
    "mobile page auto-start flag",
    file
  ));
  ({ text, changed } = replaceOnce(
    text,
    `run=true;document.body.classList.add("streaming");start.textContent="重启摄像头";`,
    `run=true;try{localStorage.setItem("recordly-phone-camera-autostart","1")}catch{}document.body.classList.add("streaming");start.textContent="重启摄像头";`,
    "mobile page remember camera start",
    file
  ));
  ({ text, changed } = replaceOnce(
    text,
    `sw.onclick=()=>{facing=facing==="user"?"environment":"user";open().catch(e=>{setStatus("切换失败："+(e&&e.message?e.message:String(e)));showControls()})};})();</script>`,
    `sw.onclick=()=>{facing=facing==="user"?"environment":"user";open().catch(e=>{setStatus("切换失败："+(e&&e.message?e.message:String(e)));showControls()})};if(autoStart)open().catch(e=>{setStatus("自动连接失败："+(e&&e.message?e.message:String(e)));showControls()});})();</script>`,
    "mobile page auto reconnect",
    file
  ));

  if (file.endsWith("main.cjs")) {
    ({ text, changed } = replaceOnce(
      text,
      `const i={version:2,videoFileName:S.basename(t),webcamFileName:S.basename(r),timeOffsetMs:Yl(e.timeOffsetMs),webcamOverlay:uo(e.webcamOverlay)};`,
      `const i={version:2,videoFileName:S.basename(t),webcamFileName:S.basename(r),timeOffsetMs:Yl(e.timeOffsetMs),webcamOverlay:uo(e.webcamOverlay),webcamSourceKind:e.webcamSourceKind==="phone-camera"?"phone-camera":void 0};`,
      "persist phone webcam source kind",
      file
    ));
    ({ text, changed } = replaceOnce(
      text,
      `return{videoPath:t,webcamPath:o?s:null,timeOffsetMs:Yl(i.timeOffsetMs),webcamOverlay:uo(i.webcamOverlay)}`,
      `return{videoPath:t,webcamPath:o?s:null,timeOffsetMs:Yl(i.timeOffsetMs),webcamOverlay:uo(i.webcamOverlay),webcamSourceKind:i.webcamSourceKind==="phone-camera"?"phone-camera":void 0}`,
      "load phone webcam source kind",
      file
    ));
    ({ text, changed } = replaceOnce(
      text,
      `na({videoPath:n,webcamPath:Ue(t.webcamPath??null),timeOffsetMs:CP(t.timeOffsetMs),webcamOverlay:uo(t.webcamOverlay),hideOverlayCursorByDefault:$c(t.hideOverlayCursorByDefault)})`,
      `na({videoPath:n,webcamPath:Ue(t.webcamPath??null),timeOffsetMs:CP(t.timeOffsetMs),webcamOverlay:uo(t.webcamOverlay),webcamSourceKind:t.webcamSourceKind==="phone-camera"?"phone-camera":void 0,hideOverlayCursorByDefault:$c(t.hideOverlayCursorByDefault)})`,
      "current recording session phone source kind",
      file
    ));
  }

  if (changed) write(file, text);
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

function patchRenderer(file) {
  let text = read(file);
  let changed = false;

  ({ text, changed } = replaceOnce(
    text,
    `webcam:{enabled:"boolean"==typeof P.enabled?P.enabled:YCa.enabled,sourcePath:T,mirror:"boolean"==typeof P.mirror?P.mirror:YCa.mirror,cropRegion:rRa(P.cropRegion),`,
    `webcam:{enabled:"boolean"==typeof P.enabled?P.enabled:YCa.enabled,sourcePath:T,sourceKind:"phone-camera"===P.sourceKind?"phone-camera":void 0,mirror:"boolean"==typeof P.mirror?P.mirror:YCa.mirror,cropRegion:"phone-camera"===P.sourceKind?{x:0,y:0,width:1,height:1}:rRa(P.cropRegion),`,
    "renderer phone webcam source kind normalization",
    file
  ));

  ({ text, changed } = replaceOnce(
    text,
    `function BUa(e,a,t={}){const n=a?.webcamPath??null,l=t.applyRecordedPlacement??!0;return{...e,enabled:Boolean(n),sourcePath:n,timeOffsetMs:n?a?.timeOffsetMs??e.timeOffsetMs:0,...l&&n&&a?.webcamOverlay?{...a.webcamOverlay,positionPreset:"custom"}:{}}}`,
    `function BUa(e,a,t={}){const n=a?.webcamPath??null,l=t.applyRecordedPlacement??!0,r=a?.webcamSourceKind==="phone-camera",o={x:0,y:0,width:1,height:1},c=l&&n&&a?.webcamOverlay?{...a.webcamOverlay,positionPreset:"custom"}:{};return{...e,enabled:Boolean(n),sourcePath:n,sourceKind:r?"phone-camera":void 0,timeOffsetMs:n?a?.timeOffsetMs??e.timeOffsetMs:0,...c,cropRegion:r?o:c.cropRegion??e.cropRegion}}`,
    "renderer phone webcam no crop in editor",
    file
  ));

  ({ text, changed } = replaceOnce(
    text,
    `Ea(a=>({...e.webcam,enabled:a.enabled,sourcePath:a.sourcePath,timeOffsetMs:a.timeOffsetMs}))`,
    `Ea(a=>({...e.webcam,enabled:a.enabled,sourcePath:a.sourcePath,sourceKind:a.sourceKind,timeOffsetMs:a.timeOffsetMs,cropRegion:a.sourceKind==="phone-camera"?{x:0,y:0,width:1,height:1}:a.cropRegion??e.webcam.cropRegion}))`,
    "renderer preserve phone webcam no-crop when loading project",
    file
  ));

  ({ text, changed } = replaceOnce(
    text,
    `window.electronAPI.setCurrentRecordingSession({videoPath:i,webcamPath:t,timeOffsetMs:j.current,webcamOverlay:F.current??void 0,hideOverlayCursorByDefault:He.current})`,
    `window.electronAPI.setCurrentRecordingSession({videoPath:i,webcamPath:t,timeOffsetMs:j.current,webcamOverlay:F.current??void 0,webcamSourceKind:recordlyIsPhoneCameraDevice(E)?"phone-camera":void 0,hideOverlayCursorByDefault:He.current})`,
    "native recording phone source kind",
    file
  ));

  ({ text, changed } = replaceOnce(
    text,
    `window.electronAPI.setCurrentRecordingSession({videoPath:e,webcamPath:t,timeOffsetMs:j.current,webcamOverlay:F.current??void 0,hideOverlayCursorByDefault:He.current})`,
    `window.electronAPI.setCurrentRecordingSession({videoPath:e,webcamPath:t,timeOffsetMs:j.current,webcamOverlay:F.current??void 0,webcamSourceKind:recordlyIsPhoneCameraDevice(E)?"phone-camera":void 0,hideOverlayCursorByDefault:He.current})`,
    "browser recording phone source kind",
    file
  ));

  if (changed) write(file, text);
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

function patchVerify(file) {
  let text = read(file);
  let changed = false;
  ({ text, changed } = replaceOnce(
    text,
    `assertIncludes(mainPath, 'server.listen(0, "0.0.0.0"', "LAN listener");`,
    `assertIncludes(mainPath, "recordlyPhoneCameraLoadSavedState", "persistent phone camera session load");\nassertIncludes(mainPath, "recordlyPhoneCameraSaveState(address.port)", "persistent phone camera session save");`,
    "verify persistent phone camera session",
    file
  ));
  const insertAfter = `assertIncludes(mainPath, "win.loadURL", "QR connect window load");`;
  const insert = `${insertAfter}\nassertIncludes(mainPath, "recordlyPhoneCameraState.qrWindow.close()", "QR window auto closes after phone connects");`;
  ({ text, changed } = replaceOnce(text, insertAfter, insert, "verify QR auto close", file));
  const tail = `assertIncludes(rendererPath, "recordlyIsPhoneCameraDevice(t)?await recordlyPhoneCameraCreateStream()", "preview stream override");`;
  const tailReplace = `${tail}\nassertIncludes(rendererPath, 'sourceKind:r?"phone-camera":void 0', "phone camera source kind reaches editor");\nassertIncludes(rendererPath, 'cropRegion:r?o:c.cropRegion??e.cropRegion', "phone camera editor no crop override");\nassertIncludes(mainPath, 'webcamSourceKind:t.webcamSourceKind==="phone-camera"', "main session keeps phone camera source kind");`;
  ({ text, changed } = replaceOnce(text, tail, tailReplace, "verify phone editor no-crop", file));
  if (changed) write(file, text);
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

patchPhoneMainLikeFile(mainPath);
patchPhoneMainLikeFile(phonePatchPath);
patchRenderer(activeRendererPath());
patchVerify(verifyPath);

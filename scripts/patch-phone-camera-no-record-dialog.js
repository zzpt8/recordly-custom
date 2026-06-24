const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const mainPath = path.join(root, "asar-inspect", "dist-electron", "main.cjs");
const preloadPath = path.join(root, "asar-inspect", "dist-electron", "preload.mjs");
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
  if (!match) throw new Error("Could not find active renderer script");
  return path.join(assetsDir, match[1]);
}

function replaceOnce(text, search, replace, label, file) {
  if (!text.includes(search)) {
    if (text.includes(replace)) return { text, changed: false };
    throw new Error(`${path.relative(root, file)} missing ${label}`);
  }
  return { text: text.replace(search, replace), changed: true };
}

function patchMainLike(file) {
  let text = read(file);
  let changed = false;
  const edits = [
    {
      label: "phone camera start options",
      search: "async function recordlyPhoneCameraStart() {",
      replace: "async function recordlyPhoneCameraStart(options = {}) {",
    },
    {
      label: "base URL prompt guard",
      search: "    recordlyPhoneCameraShowConnectInfo(info);\n    return info;",
      replace: "    if (options.showConnectInfo !== false) recordlyPhoneCameraShowConnectInfo(info);\n    return info;",
    },
    {
      label: "initial prompt guard",
      search: "        recordlyPhoneCameraShowConnectInfo(info);\n        resolve(info);",
      replace: "        if (options.showConnectInfo !== false) recordlyPhoneCameraShowConnectInfo(info);\n        resolve(info);",
    },
    {
      label: "start IPC options",
      search: 'm.ipcMain.handle("recordly-phone-camera:start", async () => recordlyPhoneCameraStart());',
      replace: 'm.ipcMain.handle("recordly-phone-camera:start", async (event, options = {}) => recordlyPhoneCameraStart(options));',
    },
    {
      label: "suppress fallback message box",
      search: `        try {
          const options = {
            type: "info",
            title: "Recordly 手机摄像头",
            message: "手机连接地址已复制",
            detail: \`在手机浏览器打开：\\n\${info.url}\`,
            buttons: ["知道了"],
            defaultId: 0,
            noLink: true,
          };
          const owner = m.BrowserWindow.getFocusedWindow();
          const promise = owner && !owner.isDestroyed() ? m.dialog.showMessageBox(owner, options) : m.dialog.showMessageBox(options);
          promise.catch(() => {});
        } catch {}`,
      replace: `        // Keep recording flow non-blocking; the URL is already copied to clipboard.
        return;`,
    },
  ];
  for (const edit of edits) {
    const result = replaceOnce(text, edit.search, edit.replace, edit.label, file);
    text = result.text;
    changed = changed || result.changed;
  }
  if (changed) write(file, text);
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

function patchPreload(file) {
  let text = read(file);
  const result = replaceOnce(
    text,
    'phoneCameraStart:()=>r.ipcRenderer.invoke("recordly-phone-camera:start"),',
    'phoneCameraStart:e=>r.ipcRenderer.invoke("recordly-phone-camera:start",e),',
    "preload phone camera start options",
    file
  );
  if (result.changed) write(file, result.text);
  console.log(`${result.changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

function patchRenderer(file) {
  let text = read(file);
  let changed = false;
  const edits = [
    {
      label: "phone stream options",
      search: "async function recordlyPhoneCameraCreateStream() {",
      replace: "async function recordlyPhoneCameraCreateStream(options={}) {",
    },
    {
      label: "phone start options",
      search: "const info = await window.electronAPI.phoneCameraStart();",
      replace: "const info = await window.electronAPI.phoneCameraStart(options);",
    },
    {
      label: "recording silent phone stream",
      search: "N.current=recordlyIsPhoneCameraDevice(E)?await recordlyPhoneCameraCreateStream():",
      replace: "N.current=recordlyIsPhoneCameraDevice(E)?await recordlyPhoneCameraCreateStream({showConnectInfo:!1}):",
    },
  ];
  for (const edit of edits) {
    const result = replaceOnce(text, edit.search, edit.replace, edit.label, file);
    text = result.text;
    changed = changed || result.changed;
  }
  if (changed) write(file, text);
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

function patchVerify(file) {
  let text = read(file);
  let changed = false;
  const anchor = 'assertIncludes(rendererPath, "recordlyIsPhoneCameraDevice(t)?await recordlyPhoneCameraCreateStream()", "preview stream override");';
  const replacement = `${anchor}
assertIncludes(rendererPath, "recordlyPhoneCameraCreateStream({showConnectInfo:!1})", "recording phone camera suppresses connect dialog");
assertIncludes(mainPath, "options.showConnectInfo !== false", "main respects silent phone camera start");
assertNotIncludes(mainPath, "手机连接地址已复制", "blocking phone camera fallback dialog");`;
  const result = replaceOnce(text, anchor, replacement, "verify no recording dialog", file);
  text = result.text;
  changed = result.changed;
  if (changed) write(file, text);
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

patchMainLike(mainPath);
patchMainLike(phonePatchPath);
patchPreload(preloadPath);
patchRenderer(activeRendererPath());
patchVerify(verifyPath);

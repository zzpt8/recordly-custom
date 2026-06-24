const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "asar-inspect", "dist");
const assetsDir = path.join(distDir, "assets");
const htmlPath = path.join(distDir, "index.html");
const phonePatchPath = path.join(root, "scripts", "patch-phone-camera.js");
const verifyPath = path.join(root, "scripts", "verify-phone-camera.js");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

function activeRendererPath() {
  const html = read(htmlPath);
  const match = html.match(/\.\/assets\/([^"]+\.js)/);
  if (!match) throw new Error("dist/index.html missing renderer script");
  return path.join(assetsDir, match[1]);
}

function replaceOnce(text, search, replace, label, file) {
  if (text.includes(replace)) return text;
  const index = text.indexOf(search);
  if (index < 0) throw new Error(`${path.relative(root, file)} missing ${label}`);
  return text.slice(0, index) + replace + text.slice(index + search.length);
}

function patchFile(file, patches) {
  let text = read(file);
  const before = text;
  for (const patch of patches) {
    text = replaceOnce(text, patch.search, patch.replace, patch.label, file);
  }
  if (text !== before) write(file, text);
  console.log(`${text === before ? "unchanged" : "patched"} ${path.relative(root, file)}`);
}

const oldRecordingStream =
  'N.current=function(e){const a=e?.getVideoTracks().filter(e=>"live"===e.readyState).map(e=>e.clone())??[];return a.length>0?new MediaStream(a):null}(k.current)??(recordlyIsPhoneCameraDevice(E)?await recordlyPhoneCameraCreateStream():await navigator.mediaDevices.getUserMedia({video:E?{deviceId:{exact:E},width:{ideal:vva},height:{ideal:720},frameRate:{ideal:30,max:30}}:{width:{ideal:vva},height:{ideal:720},frameRate:{ideal:30,max:30}},audio:!1})),w(N.current);';

const newRecordingStream =
  'N.current=recordlyIsPhoneCameraDevice(E)?await recordlyPhoneCameraCreateStream():function(e){const a=e?.getVideoTracks().filter(e=>"live"===e.readyState).map(e=>e.clone())??[];return a.length>0?new MediaStream(a):null}(k.current)??await navigator.mediaDevices.getUserMedia({video:E?{deviceId:{exact:E},width:{ideal:vva},height:{ideal:720},frameRate:{ideal:30,max:30}}:{width:{ideal:vva},height:{ideal:720},frameRate:{ideal:30,max:30}},audio:!1}),w(N.current);';

patchFile(activeRendererPath(), [
  {
    label: "recording phone camera uses live stream instead of preview clone",
    search: oldRecordingStream,
    replace: newRecordingStream,
  },
]);

patchFile(phonePatchPath, [
  {
    label: "patch script recording phone camera uses live stream instead of preview clone",
    search:
      "N.current=function(e){const a=e?.getVideoTracks().filter(e=>\"live\"===e.readyState).map(e=>e.clone())??[];return a.length>0?new MediaStream(a):null}(k.current)??(recordlyIsPhoneCameraDevice(E)?await recordlyPhoneCameraCreateStream():await navigator.mediaDevices.getUserMedia({video:E?{deviceId:{exact:E},width:{ideal:vva},height:{ideal:720},frameRate:{ideal:30,max:30}}:{width:{ideal:vva},height:{ideal:720},frameRate:{ideal:30,max:30}},audio:!1})),w(N.current);",
    replace:
      "N.current=recordlyIsPhoneCameraDevice(E)?await recordlyPhoneCameraCreateStream():function(e){const a=e?.getVideoTracks().filter(e=>\"live\"===e.readyState).map(e=>e.clone())??[];return a.length>0?new MediaStream(a):null}(k.current)??await navigator.mediaDevices.getUserMedia({video:E?{deviceId:{exact:E},width:{ideal:vva},height:{ideal:720},frameRate:{ideal:30,max:30}}:{width:{ideal:vva},height:{ideal:720},frameRate:{ideal:30,max:30}},audio:!1}),w(N.current);",
  },
]);

patchFile(verifyPath, [
  {
    label: "verify live phone recording stream",
    search: 'assertIncludes(rendererPath, "recordlyIsPhoneCameraDevice(E)?await recordlyPhoneCameraCreateStream()", "recording stream override");',
    replace:
      'assertIncludes(rendererPath, "N.current=recordlyIsPhoneCameraDevice(E)?await recordlyPhoneCameraCreateStream()", "recording phone camera uses live stream instead of preview clone");',
  },
]);

console.log("phone camera recording live stream patch applied");

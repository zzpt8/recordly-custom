const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "asar-inspect", "dist");
const assetsDir = path.join(distDir, "assets");
const htmlPath = path.join(distDir, "index.html");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

function activeRendererPath() {
  const html = read(htmlPath);
  const match = html.match(/\.\/assets\/([^"]+\.js)/);
  if (!match) {
    throw new Error("Could not find renderer script in dist/index.html");
  }
  return path.join(assetsDir, match[1]);
}

function replaceOnce(text, search, replacement, label, file) {
  if (text.includes(replacement)) {
    return { text, changed: false };
  }
  const count = text.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`${path.basename(file)}: expected 1 match for ${label}, found ${count}`);
  }
  return { text: text.replace(search, replacement), changed: true };
}

function patch(file) {
  let text = read(file);
  let changed = false;

  let result = replaceOnce(
    text,
    'n=e.deltaY<0,l={width:Math.max(1,t.width),height:Math.max(1,t.height)}',
    'n=e.deltaY<0||!recordlyPreviewFullscreen,l={width:Math.max(1,t.width),height:Math.max(1,t.height)}',
    "recording webcam first wheel enters fullscreen regardless of device direction",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    '[N,R,recordlyRecordingActive,recordlyRecordingElapsedSeconds]),recordlyWheelCaptureEffect=',
    '[N,R,recordlyRecordingActive,recordlyRecordingElapsedSeconds,recordlyPreviewFullscreen]),recordlyWheelCaptureEffect=',
    "recording webcam wheel callback tracks fullscreen state",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  if (changed) {
    write(file, text);
  }
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

const files = [activeRendererPath(), path.join(assetsDir, "index-Bg4OucLc.js")];
for (const file of Array.from(new Set(files))) {
  if (fs.existsSync(file)) {
    patch(file);
  }
}

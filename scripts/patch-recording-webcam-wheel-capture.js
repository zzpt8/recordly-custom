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

  const result = replaceOnce(
    text,
    '},[N,R,recordlyRecordingActive,recordlyRecordingElapsedSeconds]),W=e.useCallback',
    '},[N,R,recordlyRecordingActive,recordlyRecordingElapsedSeconds]),recordlyWheelCaptureEffect=e.useEffect(()=>{if(!w)return;const e=e=>{recordlyRecordingActive&&cLa(H,e.clientX,e.clientY)&&j(e)};return window.addEventListener("wheel",e,{capture:!0,passive:!1}),()=>window.removeEventListener("wheel",e,{capture:!0})},[w,j,recordlyRecordingActive]),W=e.useCallback',
    "window-level recording webcam wheel capture",
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

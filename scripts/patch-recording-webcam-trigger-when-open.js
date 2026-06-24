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
    'j=e.useCallback(e=>{if(recordlyRecordingActive&&!e.ctrlKey&&!e.shiftKey){',
    'j=e.useCallback(e=>{if(w&&!e.ctrlKey&&!e.shiftKey){',
    "recording webcam gesture triggers whenever webcam preview is open",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    '},[N,R,recordlyRecordingActive,recordlyRecordingElapsedSeconds,recordlyPreviewFullscreen]),recordlyWheelCaptureEffect=',
    '},[N,R,w,recordlyRecordingElapsedSeconds,recordlyPreviewFullscreen]),recordlyWheelCaptureEffect=',
    "recording webcam gesture callback dependencies",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'const e=e=>{recordlyRecordingActive&&cLa(H,e.clientX,e.clientY)&&j(e)};',
    'const e=e=>{cLa(H,e.clientX,e.clientY)&&j(e)};',
    "recording webcam window wheel capture while webcam is open",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    '},[w,j,recordlyRecordingActive]),W=e.useCallback',
    '},[w,j]),W=e.useCallback',
    "recording webcam wheel capture dependencies",
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

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

function replaceOnce(text, search, replace, label, file) {
  if (text.includes(replace)) {
    return { text, changed: false };
  }
  const count = text.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`${path.basename(file)}: expected 1 match for ${label}, found ${count}`);
  }
  return { text: text.replace(search, replace), changed: true };
}

function replaceAllExpected(text, search, replace, label, expected, file) {
  if (text.split(replace).length - 1 === expected) {
    return { text, changed: false };
  }
  const count = text.split(search).length - 1;
  if (count !== expected) {
    throw new Error(`${path.basename(file)}: expected ${expected} matches for ${label}, found ${count}`);
  }
  return { text: text.split(search).join(replace), changed: true };
}

function patch(file) {
  let text = read(file);
  let changed = false;

  const insertionSearch =
    'Ct=e.useCallback(e=>{Ge(!e?.hideOverlayCursorByDefault&&null),We(Boolean(e?.nativeCaptureUnavailable)),Xe(Boolean(e?.nativeCaptureUnavailable))},[]),xt=ze??He,[It,St]=e.useState(o.aspectRatio),';
  const insertionReplace =
    'Ct=e.useCallback(e=>{Ge(!e?.hideOverlayCursorByDefault&&null),We(Boolean(e?.nativeCaptureUnavailable)),Xe(Boolean(e?.nativeCaptureUnavailable))},[]),xt=ze??He,recordlySetWebcamAtCurrentTime=e.useCallback(a=>{Ea(t=>{const n=t??YCa,l=Math.max(0,Math.round(1e3*x)),r=recordlyWebcamLayoutAt(n,l),o="function"==typeof a?a(r):a;if(!o||"object"!=typeof o)return o;const c=["positionPreset","positionX","positionY","size","aspectRatio"],i=Array.isArray(o.layoutKeyframes)&&o.layoutKeyframes!==n.layoutKeyframes,m=c.some(e=>o[e]!==r?.[e]),s={...n,...o,layoutKeyframes:n.layoutKeyframes};for(const e of c)s[e]=n?.[e];if(i)s.layoutKeyframes=recordlyWebcamNormalizeLayoutKeyframes(o.layoutKeyframes);else if(m){const e=o.positionPreset??r?.positionPreset??"custom",a=aRa(e),t={positionPreset:"custom",positionX:"custom"===e?o.positionX??r?.positionX??1:a.x,positionY:"custom"===e?o.positionY??r?.positionY??1:a.y,size:o.size??r?.size??40,aspectRatio:o.aspectRatio??r?.aspectRatio??16/9};s.layoutKeyframes=recordlyWebcamUpsertLayoutKeyframe(n,l,t)}return s})},[x]),recordlyActiveEditorWebcam=e.useMemo(()=>recordlyWebcamLayoutAt(fa,1e3*x),[fa,x]),[It,St]=e.useState(o.aspectRatio),';
  let result = replaceOnce(text, insertionSearch, insertionReplace, "webcam settings keyframe wrapper", file);
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'borderRadius:ua,onBorderRadiusChange:Za,webcam:fa,webcamPreviewSrc:fa.sourcePath?va:null,webcamPreviewCurrentTime:x,webcamPreviewPlaying:b,onWebcamChange:Ea,onUploadWebcam:Kl,onClearWebcam:Jl,',
    'borderRadius:ua,onBorderRadiusChange:Za,webcam:recordlyActiveEditorWebcam,webcamPreviewSrc:fa.sourcePath?va:null,webcamPreviewCurrentTime:x,webcamPreviewPlaying:b,onWebcamChange:recordlySetWebcamAtCurrentTime,onUploadWebcam:Kl,onClearWebcam:Jl,',
    "settings panel active webcam layout",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'webcam:fa,webcamVideoPath:fa.sourcePath?va:null,onWebcamChange:Ea,trimRegions:Ra,',
    'webcam:fa,webcamVideoPath:fa.sourcePath?va:null,onWebcamChange:recordlySetWebcamAtCurrentTime,trimRegions:Ra,',
    "preview webcam keyframe setter",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  if (changed) {
    write(file, text);
  }
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

patch(path.join(assetsDir, "index-Bg4OucLc.js"));
patch(activeRendererPath());

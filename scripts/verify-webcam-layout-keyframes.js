const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "asar-inspect", "dist");
const assetsDir = path.join(distDir, "assets");
const htmlPath = path.join(distDir, "index.html");

const html = fs.readFileSync(htmlPath, "utf8");
const indexMatch = html.match(/\.\/assets\/([^"]+\.js)/);
if (!indexMatch) {
  throw new Error("dist/index.html missing renderer script");
}

const indexName = indexMatch[1];
const indexPath = path.join(assetsDir, indexName);
const indexText = fs.readFileSync(indexPath, "utf8");
const modernMatch = indexText.match(/modernVideoExporter[^"'`]+\.js/);
if (!modernMatch) {
  throw new Error(`${indexName} missing modern exporter import`);
}

const modernName = modernMatch[0];
const modernPath = path.join(assetsDir, modernName);

function assertIncludes(file, needle, label) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    throw new Error(`${path.basename(file)} missing ${label}`);
  }
}

assertIncludes(indexPath, "function recordlyWebcamLayoutAt", "webcam time-based layout helper");
assertIncludes(indexPath, "function recordlyWebcamFrameSize", "horizontal webcam frame helper");
assertIncludes(indexPath, "layoutKeyframes:recordlyWebcamNormalizeLayoutKeyframes", "project persistence for webcam layout keyframes");
assertIncludes(indexPath, "data-recordly-webcam-handle", "direct resize handle");
assertIncludes(indexPath, 'ref:Ye,src:D,className:"pointer-events-none absolute inset-0 block h-full w-full object-cover"', "editor webcam preview preserves aspect ratio");
assertIncludes(indexPath, "aspectRatio:{ideal:16/9}", "horizontal recording webcam preview request");
assertIncludes(indexPath, "recordlyWebcamUpsertLayoutKeyframe", "time-point layout writer");
assertIncludes(indexPath, "recordlySetWebcamAtCurrentTime", "preview writes webcam layout keyframes at current time");
assertIncludes(indexPath, "webcam:fa,webcamPreviewSrc:fa.sourcePath?va:null", "settings panel uses global webcam controls");
assertIncludes(indexPath, "recordlyFullscreenWebcamClip", "selected clip webcam fullscreen action");
assertIncludes(indexPath, "Webcam full screen for selected clip", "toolbar button for selected clip webcam fullscreen");
assertIncludes(indexPath, "Number.isFinite(t.margin)&&(n.margin", "webcam keyframes preserve fullscreen margin");
assertIncludes(indexPath, "recordlyRecordingActive", "recording webcam wheel receives recording state");
assertIncludes(indexPath, "recordlySetLayoutKeyframes", "recording webcam wheel stores layout keyframes");
assertIncludes(indexPath, "recordingElapsedSeconds:C", "recording elapsed time is passed to webcam wheel gesture");
assertIncludes(indexPath, "recordlyPreviewFullscreen", "recording webcam wheel keeps a stable fullscreen preview state");
assertIncludes(indexPath, 'transform:recordlyRecordingWebcamFullscreen?"none"', "recording webcam fullscreen preview ignores HUD offset");
assertIncludes(indexPath, "recordingWebcamPreviewFullscreen:recordlyPreviewFullscreen", "recording webcam fullscreen flag is exposed to HUD render");
assertIncludes(indexPath, 'window.addEventListener("wheel",e,{capture:!0,passive:!1})', "recording webcam wheel is captured at HUD window level");
assertIncludes(indexPath, "n=e.deltaY<0||!recordlyPreviewFullscreen", "recording webcam first wheel enters fullscreen regardless of device direction");
assertIncludes(indexPath, "j=e.useCallback(e=>{if(w&&!e.ctrlKey&&!e.shiftKey)", "recording webcam gesture triggers whenever the webcam preview is open");
assertIncludes(indexPath, "recordlySwipeTimeMs", "recording webcam pointer swipe toggles fullscreen");
assertIncludes(indexPath, 'style:{pointerEvents:"none",zIndex:2}', "preview interaction layer z-index");
assertIncludes(indexPath, "if(!i)return ge.current=!1,e", "browser capture keeps webcam sidecar when not cropping");
assertIncludes(indexPath, "!1&&c&&h.readyState", "browser fallback does not bake webcam into screen capture");
assertIncludes(indexPath, "ge.current=!1,A},[V])", "cropped browser capture keeps webcam sidecar");
assertIncludes(indexPath, "await ke(i,t)", "native editor opens after webcam sidecar is ready");
assertIncludes(indexPath, "await ke(e,t)", "browser editor opens after webcam sidecar is ready");
if (!indexName.includes("webcam-layout")) {
  throw new Error(`active renderer file was not cache-busted: ${indexName}`);
}

assertIncludes(modernPath, "function recordlyModernWebcamLayoutAt", "modern exporter time-based layout helper");
assertIncludes(modernPath, "recordlyModernWebcamFrameSize", "modern exporter horizontal webcam helper");
assertIncludes(modernPath, "Ye(this.webcamSprite,e.sourceWidth,e.sourceHeight,e.width,e.height", "modern exporter horizontal sprite layout");
assertIncludes(modernPath, "unsupported-webcam-aspect-ratio", "native static export skip for horizontal webcam");
assertIncludes(modernPath, "unsupported-webcam-layout-keyframes", "native static export skip for webcam keyframes");
assertIncludes(modernPath, `./${indexName}`, "modern exporter imports active renderer bundle");

console.log(`webcam layout keyframe patch verified: ${indexName}, ${modernName}`);

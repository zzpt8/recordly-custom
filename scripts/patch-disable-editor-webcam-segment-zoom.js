const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "asar-inspect", "dist");
const assetsDir = path.join(distDir, "assets");
const htmlPath = path.join(distDir, "index.html");
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

function replaceOnce(text, search, replace, label) {
  if (replace && text.includes(replace) && !text.includes(search)) return text;
  const count = text.split(search).length - 1;
  if (count !== 1) throw new Error(`Expected 1 match for ${label}, found ${count}`);
  return text.replace(search, replace);
}

function patchRenderer(file) {
  let text = read(file);

  text = replaceOnce(
    text,
    ',recordlyFullscreenWebcamClip=e.useCallback(()=>{if(!fa?.sourcePath)return void JEa.warning("No webcam footage in this recording.");const e=Ta?ka.find(e=>e.id===Ta):ka.find(e=>{const a=Math.round(1e3*Vr);return a>=e.startMs&&a<e.endMs});if(!e)return void JEa.warning("Select or split a clip first.");const a=Math.max(0,Math.round(e.startMs)),t=Math.max(a+100,Math.round(e.endMs)),n=recordlyWebcamLayoutAt(fa,Math.max(0,a-1))??fa,l=recordlyWebcamNormalizeLayoutKeyframes(fa.layoutKeyframes).filter(e=>e.timeMs<a-250||e.timeMs>t+250),r=xka(It,16/9),o={timeMs:a,positionPreset:"custom",positionX:0,positionY:0,size:100,aspectRatio:r,margin:0,cornerRadius:0,shadow:0,rotation:n.rotation??0},c={timeMs:t+1,positionPreset:"custom",positionX:n.positionX??1,positionY:n.positionY??1,size:n.size??40,aspectRatio:n.aspectRatio??16/9,margin:n.margin??24,cornerRadius:n.cornerRadius??18,shadow:n.shadow??UCa,rotation:n.rotation??0};Ea(e=>({...e,enabled:!0,layoutKeyframes:recordlyWebcamNormalizeLayoutKeyframes([...l,o,c])})),JEa.success("Webcam fills the selected clip.")},[fa,Ta,ka,Vr,It]),recordlyRotateWebcamClip=',
    ',recordlyRotateWebcamClip=',
    "selected clip webcam fullscreen action",
  );

  text = replaceOnce(
    text,
    'W.jsx(Jva,{onClick:recordlyFullscreenWebcamClip,variant:"ghost",size:"icon",className:"h-7 w-7 rounded-full text-muted-foreground transition-all hover:bg-[#2563EB]/10 hover:text-[#2563EB]",title:"Webcam full screen for selected clip",children:W.jsx("span",{className:"text-[9px] font-bold leading-none",children:"CAM"})}),',
    "",
    "selected clip webcam fullscreen toolbar button",
  );

  text = replaceOnce(
    text,
    'webcam:fa,webcamVideoPath:fa.sourcePath?va:null,onWebcamChange:recordlySetWebcamAtCurrentTime,trimRegions:Ra,',
    'webcam:fa,webcamVideoPath:fa.sourcePath?va:null,trimRegions:Ra,',
    "editor preview webcam keyframe writer prop",
  );

  text = replaceOnce(
    text,
    'pointerEvents:u?"none":"auto",cursor:u?"default":"move",outline:u?"none":"1.5px solid rgba(37,99,235,.85)"',
    'pointerEvents:u||!recordlyPreviewWebcamChange?"none":"auto",cursor:u||!recordlyPreviewWebcamChange?"default":"move",outline:u||!recordlyPreviewWebcamChange?"none":"1.5px solid rgba(37,99,235,.85)"',
    "editor preview webcam edit affordance",
  );

  text = replaceOnce(
    text,
    'u?null:W.jsx("div",{"data-recordly-webcam-handle":"resize"',
    'u||!recordlyPreviewWebcamChange?null:W.jsx("div",{"data-recordly-webcam-handle":"resize"',
    "editor preview webcam resize handle",
  );

  write(file, text);
}

function patchVerify(file) {
  let text = read(file);
  const marker = 'assertNotIncludes(rendererPath, "Webcam full screen for selected clip", "editor selected clip webcam fullscreen button");';
  if (!text.includes(marker)) {
    text = text.replace(
      'assertIncludes(rendererPath, "recordlyPhoneCameraCreateStream({showConnectInfo:!1})", "recording phone camera suppresses connect dialog");',
      'assertIncludes(rendererPath, "recordlyPhoneCameraCreateStream({showConnectInfo:!1})", "recording phone camera suppresses connect dialog");\nassertNotIncludes(rendererPath, "Webcam full screen for selected clip", "editor selected clip webcam fullscreen button");\nassertNotIncludes(rendererPath, "recordlyFullscreenWebcamClip", "editor selected clip webcam fullscreen action");\nassertNotIncludes(rendererPath, "onWebcamChange:recordlySetWebcamAtCurrentTime", "editor webcam time-segment writer prop");',
    );
    write(file, text);
  }
}

const rendererPath = activeRendererPath();
patchRenderer(rendererPath);
patchVerify(verifyPath);

console.log(`editor webcam segment zoom disabled: ${path.basename(rendererPath)}`);

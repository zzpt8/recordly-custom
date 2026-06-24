const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const mainPath = path.join(root, "asar-inspect", "dist-electron", "main.cjs");
const htmlPath = path.join(root, "asar-inspect", "dist", "index.html");
const assetsDir = path.join(root, "asar-inspect", "dist", "assets");
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
  if (text.includes(replace)) return text;
  const index = text.indexOf(search);
  if (index < 0) throw new Error(`Missing ${label}`);
  return text.slice(0, index) + replace + text.slice(index + search.length);
}

function patchMain(file) {
  let text = read(file);
  text = replaceOnce(
    text,
    'function uo(e){if(!e||typeof e!="object")return;const t=e;if(!(typeof t.positionX!="number"||typeof t.positionY!="number"||typeof t.size!="number"))return{positionX:Nc(Number.isFinite(t.positionX)?t.positionX:1,0,1),positionY:Nc(Number.isFinite(t.positionY)?t.positionY:1,0,1),size:Nc(Number.isFinite(t.size)?t.size:40,10,100)}}',
    'function uo(e){if(!e||typeof e!="object")return;const t=e,r={};typeof t.positionPreset=="string"&&(r.positionPreset=t.positionPreset),typeof t.positionX=="number"&&(r.positionX=Nc(Number.isFinite(t.positionX)?t.positionX:1,0,1)),typeof t.positionY=="number"&&(r.positionY=Nc(Number.isFinite(t.positionY)?t.positionY:1,0,1)),typeof t.size=="number"&&(r.size=Nc(Number.isFinite(t.size)?t.size:40,10,100)),typeof t.aspectRatio=="number"&&(r.aspectRatio=Nc(Number.isFinite(t.aspectRatio)?t.aspectRatio:16/9,1,4)),typeof t.margin=="number"&&(r.margin=Nc(Number.isFinite(t.margin)?t.margin:24,0,96)),typeof t.cornerRadius=="number"&&(r.cornerRadius=Nc(Number.isFinite(t.cornerRadius)?t.cornerRadius:18,0,180)),typeof t.shadow=="number"&&(r.shadow=Nc(Number.isFinite(t.shadow)?t.shadow:.67,0,1)),typeof t.rotation=="number"&&(r.rotation=(Number.isFinite(t.rotation)?(t.rotation%360+360)%360:0));const n=a=>{if(!a||typeof a!="object")return null;const s={},o=a;return typeof o.timeMs=="number"&&(s.timeMs=Math.max(0,Yl(o.timeMs))),typeof o.positionPreset=="string"&&(s.positionPreset=o.positionPreset),typeof o.positionX=="number"&&(s.positionX=Nc(Number.isFinite(o.positionX)?o.positionX:1,0,1)),typeof o.positionY=="number"&&(s.positionY=Nc(Number.isFinite(o.positionY)?o.positionY:1,0,1)),typeof o.size=="number"&&(s.size=Nc(Number.isFinite(o.size)?o.size:40,10,100)),typeof o.aspectRatio=="number"&&(s.aspectRatio=Nc(Number.isFinite(o.aspectRatio)?o.aspectRatio:16/9,1,4)),typeof o.margin=="number"&&(s.margin=Nc(Number.isFinite(o.margin)?o.margin:24,0,96)),typeof o.cornerRadius=="number"&&(s.cornerRadius=Nc(Number.isFinite(o.cornerRadius)?o.cornerRadius:18,0,180)),typeof o.shadow=="number"&&(s.shadow=Nc(Number.isFinite(o.shadow)?o.shadow:.67,0,1)),typeof o.rotation=="number"&&(s.rotation=(Number.isFinite(o.rotation)?(o.rotation%360+360)%360:0)),Object.keys(s).length?s:null};return Array.isArray(t.layoutKeyframes)&&(r.layoutKeyframes=t.layoutKeyframes.map(n).filter(Boolean).sort((e,t)=>(e.timeMs??0)-(t.timeMs??0)).slice(-200)),Object.keys(r).length?r:void 0}',
    "main webcam overlay sanitizer",
  );
  write(file, text);
}

function patchRenderer(file) {
  let text = read(file);
  text = replaceOnce(
    text,
    'aspectRatio:Tka(P.aspectRatio)?Dka(P.aspectRatio,1,4):16/9,layoutKeyframes:recordlyWebcamNormalizeLayoutKeyframes(P.layoutKeyframes)}',
    'aspectRatio:Tka(P.aspectRatio)?Dka(P.aspectRatio,1,4):16/9,rotation:Tka(P.rotation)?((P.rotation%360)+360)%360:0,layoutKeyframes:recordlyWebcamNormalizeLayoutKeyframes(P.layoutKeyframes)}',
    "editor webcam rotation state normalization",
  );
  text = replaceOnce(
    text,
    'Ea(e=>BUa(e,a.session,{applyRecordedPlacement:!1}))',
    'Ea(e=>BUa(e,a.session,{applyRecordedPlacement:!0}))',
    "initial editor session applies recorded webcam placement",
  );
  text = replaceOnce(
    text,
    'Ea(a=>BUa(a,{...e,webcamPath:t},{applyRecordedPlacement:!1}))',
    'Ea(a=>BUa(a,{...e,webcamPath:t},{applyRecordedPlacement:!0}))',
    "session change applies recorded webcam placement",
  );
  text = replaceOnce(
    text,
    'F=(m.height-y)/2;if(p.save(),wSa(p,{x:0,y:0,width:m.width,height:m.height,radius:h})',
    'F=(m.height-y)/2,recordlyFallbackWebcamRotation=Tka(n.rotation)?((n.rotation%360)+360)%360:0;if(p.save(),wSa(p,{x:0,y:0,width:m.width,height:m.height,radius:h})',
    "2D fallback webcam rotation value",
  );
  text = replaceOnce(
    text,
    'return e.save(),e.filter=`drop-shadow(0 ${Math.round(.06*m.height)}px ${Math.round(.22*m.height)}px rgba(0,0,0,${a}))`,e.drawImage(u,s,d,m.width,m.height),void e.restore()}e.drawImage(u,s,d,m.width,m.height)}',
    'return e.save(),e.filter=`drop-shadow(0 ${Math.round(.06*m.height)}px ${Math.round(.22*m.height)}px rgba(0,0,0,${a}))`,e.translate(s+m.width/2,d+m.height/2),e.rotate(recordlyFallbackWebcamRotation*Math.PI/180),e.drawImage(u,-m.width/2,-m.height/2,m.width,m.height),void e.restore()}e.save(),e.translate(s+m.width/2,d+m.height/2),e.rotate(recordlyFallbackWebcamRotation*Math.PI/180),e.drawImage(u,-m.width/2,-m.height/2,m.width,m.height),e.restore()}',
    "2D fallback webcam rotated draw",
  );
  write(file, text);
}

function patchVerify(file) {
  let text = read(file);
  text = replaceOnce(
    text,
    'assertIncludes(rendererPath, "recordingWebcamPreviewRotation", "recording HUD webcam rotation state");',
    'assertIncludes(rendererPath, "recordingWebcamPreviewRotation", "recording HUD webcam rotation state");\nassertIncludes(rendererPath, "applyRecordedPlacement:!0", "editor applies recorded webcam placement");\nassertIncludes(rendererPath, "rotation:Tka(P.rotation)", "editor preserves webcam rotation state");\nassertIncludes(rendererPath, "recordlyFallbackWebcamRotation", "2D fallback webcam rotation");\nassertIncludes(mainPath, "layoutKeyframes=t.layoutKeyframes", "main preserves webcam overlay keyframes");\nassertIncludes(mainPath, "r.rotation=", "main preserves webcam overlay rotation");',
    "verify recording/editor consistency",
  );
  write(file, text);
}

patchMain(mainPath);
patchRenderer(activeRendererPath());
patchVerify(verifyPath);

console.log("webcam recording/editor consistency patch applied");

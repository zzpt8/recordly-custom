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
    'Number.isFinite(t.aspectRatio)&&(n.aspectRatio=eRa(t.aspectRatio,1,4)),"custom"===t.positionPreset&&(n.positionPreset="custom"),a.push(n)}return a.sort',
    'Number.isFinite(t.aspectRatio)&&(n.aspectRatio=eRa(t.aspectRatio,1,4)),Number.isFinite(t.margin)&&(n.margin=eRa(t.margin,0,96)),Number.isFinite(t.cornerRadius)&&(n.cornerRadius=eRa(t.cornerRadius,0,180)),Number.isFinite(t.shadow)&&(n.shadow=eRa(t.shadow,0,1)),"custom"===t.positionPreset&&(n.positionPreset="custom"),a.push(n)}return a.sort',
    "webcam keyframes persist fullscreen fields",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'const n=recordlyWebcamNormalizeLayoutKeyframes(e?.layoutKeyframes).filter(e=>Math.abs(e.timeMs-a)>250),l={timeMs:Math.max(0,Math.round(a)),positionPreset:"custom",positionX:eRa(t.positionX,0,1),positionY:eRa(t.positionY,0,1),size:eRa(t.size,10,100),aspectRatio:recordlyWebcamAspectRatio(t)};return recordlyWebcamNormalizeLayoutKeyframes([...n,l])}',
    'const n=recordlyWebcamNormalizeLayoutKeyframes(e?.layoutKeyframes).filter(e=>Math.abs(e.timeMs-a)>250),l={timeMs:Math.max(0,Math.round(a)),positionPreset:"custom",positionX:eRa(t.positionX,0,1),positionY:eRa(t.positionY,0,1),size:eRa(t.size,10,100),aspectRatio:recordlyWebcamAspectRatio(t)};return Number.isFinite(t.margin)&&(l.margin=eRa(t.margin,0,96)),Number.isFinite(t.cornerRadius)&&(l.cornerRadius=eRa(t.cornerRadius,0,180)),Number.isFinite(t.shadow)&&(l.shadow=eRa(t.shadow,0,1)),recordlyWebcamNormalizeLayoutKeyframes([...n,l])}',
    "webcam upsert supports fullscreen fields",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'webcam:recordlyActiveEditorWebcam,webcamPreviewSrc:fa.sourcePath?va:null,webcamPreviewCurrentTime:x,webcamPreviewPlaying:b,onWebcamChange:recordlySetWebcamAtCurrentTime,onUploadWebcam:Kl,onClearWebcam:Jl,',
    'webcam:fa,webcamPreviewSrc:fa.sourcePath?va:null,webcamPreviewCurrentTime:x,webcamPreviewPlaying:b,onWebcamChange:Ea,onUploadWebcam:Kl,onClearWebcam:Jl,',
    "restore settings panel to global webcam controls",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'Or=e.useCallback(e=>{const a=ka.find(a=>a.id===e);if(Pa(a=>a.filter(a=>a.id!==e)),a){const{startMs:e,endMs:t}=a;ya(a=>a.filter(a=>a.endMs<=e||a.startMs>=t)),Wa(a=>a.filter(a=>a.endMs<=e||a.startMs>=t)),Ga(a=>a.filter(a=>a.endMs<=e||a.startMs>=t)),Oa(a=>a.filter(a=>a.endMs<=e||a.startMs>=t))}Ta===e&&Da(null)},[ka,Ta]),Yr=e.useCallback',
    'Or=e.useCallback(e=>{const a=ka.find(a=>a.id===e);if(Pa(a=>a.filter(a=>a.id!==e)),a){const{startMs:e,endMs:t}=a;ya(a=>a.filter(a=>a.endMs<=e||a.startMs>=t)),Wa(a=>a.filter(a=>a.endMs<=e||a.startMs>=t)),Ga(a=>a.filter(a=>a.endMs<=e||a.startMs>=t)),Oa(a=>a.filter(a=>a.endMs<=e||a.startMs>=t))}Ta===e&&Da(null)},[ka,Ta]),recordlyFullscreenWebcamClip=e.useCallback(()=>{if(!fa?.sourcePath)return void JEa.warning("No webcam footage in this recording.");const e=Ta?ka.find(e=>e.id===Ta):ka.find(e=>{const a=Math.round(1e3*Vr);return a>=e.startMs&&a<e.endMs});if(!e)return void JEa.warning("Select or split a clip first.");const a=Math.max(0,Math.round(e.startMs)),t=Math.max(a+100,Math.round(e.endMs)),n=recordlyWebcamLayoutAt(fa,Math.max(0,a-1))??fa,l=recordlyWebcamNormalizeLayoutKeyframes(fa.layoutKeyframes).filter(e=>e.timeMs<a-250||e.timeMs>t+250),r=xka(It,16/9),o={timeMs:a,positionPreset:"custom",positionX:0,positionY:0,size:100,aspectRatio:r,margin:0,cornerRadius:0,shadow:0},c={timeMs:t+1,positionPreset:"custom",positionX:n.positionX??1,positionY:n.positionY??1,size:n.size??40,aspectRatio:n.aspectRatio??16/9,margin:n.margin??24,cornerRadius:n.cornerRadius??18,shadow:n.shadow??UCa};Ea(e=>({...e,enabled:!0,layoutKeyframes:recordlyWebcamNormalizeLayoutKeyframes([...l,o,c])})),JEa.success("Webcam fills the selected clip.")},[fa,Ta,ka,Vr,It]),Yr=e.useCallback',
    "add selected clip webcam fullscreen action",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'W.jsx(Jva,{onClick:()=>tl.current?.suggestZooms(),variant:"ghost",size:"icon",className:"h-7 w-7 rounded-full text-muted-foreground transition-all hover:bg-[#2563EB]/10 hover:text-[#2563EB]",title:a("timeline.zoom.suggestZooms"),children:W.jsx(sqe,{className:"w-4 h-4"})}),W.jsx(Jva,{onClick:()=>tl.current?.splitClip(),variant:"ghost",size:"icon",className:"h-7 w-7 rounded-full text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground",title:a("editor.toolbar.splitClip"),children:W.jsx(q7e,{className:"w-4 h-4"})})',
    'W.jsx(Jva,{onClick:()=>tl.current?.suggestZooms(),variant:"ghost",size:"icon",className:"h-7 w-7 rounded-full text-muted-foreground transition-all hover:bg-[#2563EB]/10 hover:text-[#2563EB]",title:a("timeline.zoom.suggestZooms"),children:W.jsx(sqe,{className:"w-4 h-4"})}),W.jsx(Jva,{onClick:recordlyFullscreenWebcamClip,variant:"ghost",size:"icon",className:"h-7 w-7 rounded-full text-muted-foreground transition-all hover:bg-[#2563EB]/10 hover:text-[#2563EB]",title:"Webcam full screen for selected clip",children:W.jsx("span",{className:"text-[9px] font-bold leading-none",children:"CAM"})}),W.jsx(Jva,{onClick:()=>tl.current?.splitClip(),variant:"ghost",size:"icon",className:"h-7 w-7 rounded-full text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground",title:a("editor.toolbar.splitClip"),children:W.jsx(q7e,{className:"w-4 h-4"})})',
    "add webcam fullscreen toolbar button",
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

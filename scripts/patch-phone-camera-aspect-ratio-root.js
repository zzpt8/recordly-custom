const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "asar-inspect", "dist");
const assetsDir = path.join(distDir, "assets");
const htmlPath = path.join(distDir, "index.html");
const mainPath = path.join(root, "asar-inspect", "dist-electron", "main.cjs");
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

function activeModernExporterPath(rendererPath) {
  const renderer = read(rendererPath);
  const match = renderer.match(/"(\.\/modernVideoExporter-[^"]+\.js)"/);
  if (!match) throw new Error("renderer missing modern exporter import");
  return path.join(path.dirname(rendererPath), match[1].replace(/^\.\//, ""));
}

function replaceOnce(text, search, replace, label) {
  if (text.includes(replace)) return text;
  const count = text.split(search).length - 1;
  if (count !== 1) throw new Error(`Expected 1 match for ${label}, found ${count}`);
  return text.replace(search, replace);
}

function replaceAll(text, search, replace, label) {
  if (!text.includes(search)) {
    if (text.includes(replace)) return text;
    throw new Error(`Missing ${label}`);
  }
  return text.split(search).join(replace);
}

function patchMain() {
  let text = read(mainPath);
  text = replaceOnce(
    text,
    "typeof t.aspectRatio==\"number\"&&(r.aspectRatio=Nc(Number.isFinite(t.aspectRatio)?t.aspectRatio:16/9,1,4))",
    "typeof t.aspectRatio==\"number\"&&(r.aspectRatio=Nc(Number.isFinite(t.aspectRatio)?t.aspectRatio:16/9,.25,4))",
    "main allows portrait webcam aspect ratio",
  );
  text = replaceOnce(
    text,
    "typeof o.aspectRatio==\"number\"&&(s.aspectRatio=Nc(Number.isFinite(o.aspectRatio)?o.aspectRatio:16/9,1,4))",
    "typeof o.aspectRatio==\"number\"&&(s.aspectRatio=Nc(Number.isFinite(o.aspectRatio)?o.aspectRatio:16/9,.25,4))",
    "main allows portrait webcam keyframe aspect ratio",
  );
  write(mainPath, text);
}

function patchRenderer(file) {
  let text = read(file);

  text = replaceOnce(
    text,
    "function oLa(e,a){const t=Math.max(96,Math.min(360,a.width/16*9,a.height)),n=nLa(e.size,96,t);return{size:n,left:nLa(e.left,0,Math.max(0,a.width-n*16/9)),top:nLa(e.top,0,Math.max(0,a.height-n))}}",
    "function oLa(e,a,t=16/9){const l=Number.isFinite(t)&&t>0?t:16/9,r=Math.max(96,Math.min(360,a.width/l,a.height)),o=nLa(e.size,96,r);return{size:o,left:nLa(e.left,0,Math.max(0,a.width-o*l)),top:nLa(e.top,0,Math.max(0,a.height-o))}}",
    "recording webcam rect clamp uses dynamic aspect",
  );

  text = replaceOnce(
    text,
    "[recordlyPreviewRotation,recordlySetPreviewRotation]=e.useState(0),w=a&&c",
    "[recordlyPreviewRotation,recordlySetPreviewRotation]=e.useState(0),[recordlyPreviewAspect,recordlySetPreviewAspect]=e.useState(16/9),recordlyCurrentAspect=recordlyIsPhoneCameraDevice(t)?recordlyPreviewAspect:16/9,w=a&&c",
    "recording HUD stores phone camera aspect state",
  );

  text = replaceOnce(
    text,
    'e.useEffect(()=>(window.electronAPI?.hudOverlaySetWebcamPreviewActive?.(w),()=>{window.electronAPI?.hudOverlaySetWebcamPreviewActive?.(!1)}),[w]);const F=e.useMemo',
    'e.useEffect(()=>(window.electronAPI?.hudOverlaySetWebcamPreviewActive?.(w),()=>{window.electronAPI?.hudOverlaySetWebcamPreviewActive?.(!1)}),[w]);e.useEffect(()=>{if(!recordlyIsPhoneCameraDevice(t))return void recordlySetPreviewAspect(16/9);const e=n?.getVideoTracks?.()[0]?.getSettings?.(),a=Number.isFinite(e?.width)&&Number.isFinite(e?.height)&&e.height>0?e.width/e.height:recordlyPreviewAspect;recordlySetPreviewAspect(nLa(a,.25,4))},[t,n]);const F=e.useMemo',
    "recording HUD derives phone aspect from stream",
  );

  text = replaceOnce(
    text,
    'const F=e.useMemo(()=>{const a=lLa(),e=function(e,a){const t=Math.max(1,Math.min(a.width/16*9,a.height)),n=Math.max(1,a.width-e.size*16/9-48),l=Math.max(1,a.height-e.size-48);return{positionX:nLa((e.left-24)/n,0,1),positionY:nLa((e.top-24)/l,0,1),size:nLa(e.size/t*100,10,100),aspectRatio:16/9}}(d,a),t=recordlyPreviewFullscreen?{left:0,top:0,width:a.width,height:a.height}:{left:d.left,top:d.top,width:d.size*16/9,height:d.size};return{...e,recordedRect:t,recordedViewport:a,margin:24,cornerRadius:18,shadow:UCa,rotation:recordlyPreviewRotation,layoutKeyframes:recordlyLayoutKeyframes}},[d,recordlyLayoutKeyframes,recordlyPreviewFullscreen,recordlyPreviewRotation])',
    'const F=e.useMemo(()=>{const a=lLa(),e=function(e,a,t){const l=Number.isFinite(t)&&t>0?t:16/9,r=Math.max(1,Math.min(a.width/l,a.height)),o=Math.max(1,a.width-e.size*l-48),c=Math.max(1,a.height-e.size-48);return{positionX:nLa((e.left-24)/o,0,1),positionY:nLa((e.top-24)/c,0,1),size:nLa(e.size/r*100,10,100),aspectRatio:l}}(d,a,recordlyCurrentAspect),t=recordlyPreviewFullscreen?{left:0,top:0,width:a.width,height:a.height}:{left:d.left,top:d.top,width:d.size*recordlyCurrentAspect,height:d.size};return{...e,recordedRect:t,recordedViewport:a,margin:24,cornerRadius:18,shadow:UCa,rotation:recordlyPreviewRotation,layoutKeyframes:recordlyLayoutKeyframes}},[d,recordlyLayoutKeyframes,recordlyPreviewFullscreen,recordlyPreviewRotation,recordlyCurrentAspect])',
    "recording HUD saves dynamic aspect recorded rect",
  );

  text = replaceOnce(
    text,
    'C=e.useMemo(()=>recordlyPreviewFullscreen?(()=>{const e=lLa();return{left:"0px",top:"0px",width:`${Math.max(1,e.width)}px`,height:`${Math.max(1,e.height)}px`,borderRadius:"0px",border:"0px",boxShadow:"none",zIndex:2147483647,cursor:"default"}})():({left:`${d.left}px`,top:`${d.top}px`,width:`${d.size*16/9}px`,height:`${d.size}px`}),[d,recordlyPreviewFullscreen])',
    'C=e.useMemo(()=>recordlyPreviewFullscreen?(()=>{const e=lLa();return{left:"0px",top:"0px",width:`${Math.max(1,e.width)}px`,height:`${Math.max(1,e.height)}px`,borderRadius:"0px",border:"0px",boxShadow:"none",zIndex:2147483647,cursor:"default"}})():({left:`${d.left}px`,top:`${d.top}px`,width:`${d.size*recordlyCurrentAspect}px`,height:`${d.size}px`}),[d,recordlyPreviewFullscreen,recordlyCurrentAspect])',
    "recording HUD preview style uses dynamic aspect",
  );

  text = replaceOnce(
    text,
    'const N=e.useCallback((e,a)=>{const t=oLa(e,lLa());Z.current=t,H.current&&(H.current.style.left=`${t.left}px`,H.current.style.top=`${t.top}px`,H.current.style.width=`${t.size*16/9}px`,H.current.style.height=`${t.size}px`),a&&h(t)},[])',
    'const N=e.useCallback((e,a)=>{const t=oLa(e,lLa(),recordlyCurrentAspect);Z.current=t,H.current&&(H.current.style.left=`${t.left}px`,H.current.style.top=`${t.top}px`,H.current.style.width=`${t.size*recordlyCurrentAspect}px`,H.current.style.height=`${t.size}px`),a&&h(t)},[recordlyCurrentAspect])',
    "recording HUD drag clamp uses dynamic aspect",
  );

  text = replaceAll(
    text,
    "recordlySwipeBounds.width/16*9",
    "recordlySwipeBounds.width/recordlyCurrentAspect",
    "recording HUD swipe bounds aspect",
  );
  text = replaceAll(
    text,
    "recordlySwipeBounds.width-e.size*16/9-48",
    "recordlySwipeBounds.width-e.size*recordlyCurrentAspect-48",
    "recording HUD swipe position aspect",
  );
  text = replaceAll(
    text,
    "aspectRatio:16/9,margin:24,cornerRadius:18,shadow:UCa}};if(n<0)",
    "aspectRatio:recordlyCurrentAspect,margin:24,cornerRadius:18,shadow:UCa}};if(n<0)",
    "recording HUD swipe restore aspect",
  );
  text = replaceAll(
    text,
    "l.width/16*9",
    "l.width/recordlyCurrentAspect",
    "recording HUD wheel bounds aspect",
  );
  text = replaceAll(
    text,
    "l.width-e.size*16/9-48",
    "l.width-e.size*recordlyCurrentAspect-48",
    "recording HUD wheel position aspect",
  );
  text = replaceAll(
    text,
    "aspectRatio:16/9,margin:24,cornerRadius:18,shadow:UCa}};if(n){",
    "aspectRatio:recordlyCurrentAspect,margin:24,cornerRadius:18,shadow:UCa}};if(n){",
    "recording HUD wheel restore aspect",
  );

  text = replaceOnce(
    text,
    "function recordlyWebcamAspectRatio(e){const a=Number.isFinite(e?.aspectRatio)?e.aspectRatio:16/9;return eRa(a,1,4)}",
    "function recordlyWebcamAspectRatio(e){const a=Number.isFinite(e?.aspectRatio)?e.aspectRatio:16/9;return eRa(a,.25,4)}",
    "renderer allows portrait webcam aspect ratio",
  );
  text = replaceAll(
    text,
    "eRa(t.aspectRatio,1,4)",
    "eRa(t.aspectRatio,.25,4)",
    "renderer keyframes allow portrait aspect",
  );
  text = replaceAll(
    text,
    "Dka(P.aspectRatio,1,4)",
    "Dka(P.aspectRatio,.25,4)",
    "renderer session allows portrait aspect",
  );

  write(file, text);
}

function patchModernExporter(file) {
  let text = read(file);
  text = replaceOnce(
    text,
    "function recordlyModernWebcamAspectRatio(e){const t=Number.isFinite(e?.aspectRatio)?e.aspectRatio:16/9;return Math.min(4,Math.max(1,t))}",
    "function recordlyModernWebcamAspectRatio(e){const t=Number.isFinite(e?.aspectRatio)?e.aspectRatio:16/9;return Math.min(4,Math.max(.25,t))}",
    "modern exporter allows portrait webcam aspect ratio",
  );
  write(file, text);
}

function patchVerify(file) {
  let text = read(file);
  text = replaceOnce(
    text,
    'assertIncludes(rendererPath, "recordlyPhoneWebcamContain", "editor phone camera preview uses contain");',
    'assertIncludes(rendererPath, "recordlyPhoneWebcamContain", "editor phone camera preview uses contain");\nassertIncludes(rendererPath, "recordlyCurrentAspect", "recording HUD uses dynamic phone camera aspect");\nassertIncludes(rendererPath, "eRa(a,.25,4)", "renderer allows portrait webcam aspect");\nassertIncludes(mainPath, "t.aspectRatio:16/9,.25,4", "main allows portrait webcam aspect");\nassertIncludes(modernExporterPath, "Math.max(.25,t)", "export allows portrait webcam aspect");',
    "verify phone camera aspect ratio root fix",
  );
  write(file, text);
}

const rendererPath = activeRendererPath();
patchMain();
patchRenderer(rendererPath);
patchModernExporter(activeModernExporterPath(rendererPath));
patchVerify(verifyPath);

console.log("phone camera aspect ratio root patch applied");

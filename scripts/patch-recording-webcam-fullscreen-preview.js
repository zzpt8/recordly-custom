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
    '[recordlyLayoutKeyframes,recordlySetLayoutKeyframes]=e.useState([]),w=a&&c,y=w&&null!==n,b=a&&(w||r&&o);',
    '[recordlyLayoutKeyframes,recordlySetLayoutKeyframes]=e.useState([]),[recordlyPreviewFullscreen,recordlySetPreviewFullscreen]=e.useState(!1),w=a&&c,y=w&&null!==n,b=a&&(w||r&&o);',
    "recording webcam fullscreen preview state",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'C=e.useMemo(()=>({left:`${d.left}px`,top:`${d.top}px`,width:`${d.size*16/9}px`,height:`${d.size}px`}),[d]);e.useEffect(()=>{Z.current=d},[d]),e.useEffect(()=>{recordlyRecordingActive&&!recordlyWasRecording.current&&(recordlySetLayoutKeyframes([]),recordlySmallPreviewRect.current=null),recordlyWasRecording.current=recordlyRecordingActive},[recordlyRecordingActive]);',
    'C=e.useMemo(()=>recordlyPreviewFullscreen?(()=>{const e=lLa();return{left:"0px",top:"0px",width:`${Math.max(1,e.width)}px`,height:`${Math.max(1,e.height)}px`,borderRadius:"0px",border:"0px",boxShadow:"none",zIndex:2147483647,cursor:"default"}})():({left:`${d.left}px`,top:`${d.top}px`,width:`${d.size*16/9}px`,height:`${d.size}px`}),[d,recordlyPreviewFullscreen]);e.useEffect(()=>{Z.current=d},[d]),e.useEffect(()=>{recordlyRecordingActive&&!recordlyWasRecording.current&&(recordlySetLayoutKeyframes([]),recordlySmallPreviewRect.current=null,recordlySetPreviewFullscreen(!1)),recordlyWasRecording.current=recordlyRecordingActive},[recordlyRecordingActive]);',
    "recording webcam fullscreen preview style",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'e.useEffect(()=>{a||(u.current=tLa,s(tLa),E.current=null,v.current=null,L.current=!1,i(!0))},[a]),',
    'e.useEffect(()=>{a||(u.current=tLa,s(tLa),E.current=null,v.current=null,L.current=!1,recordlySetPreviewFullscreen(!1),recordlySmallPreviewRect.current=null,i(!0))},[a]),',
    "reset recording webcam fullscreen when webcam closes",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'if(n){recordlySmallPreviewRect.current||(recordlySmallPreviewRect.current=Z.current);const e=Math.max(96,Math.min(l.height,l.width*9/16));N({left:Math.max(0,(l.width-e*16/9)/2),top:Math.max(0,(l.height-e)/2),size:e},!0);const t={timeMs:a,positionPreset:"custom",positionX:0,positionY:0,size:100,aspectRatio:l.width/l.height,margin:0,cornerRadius:0,shadow:0};return void recordlySetLayoutKeyframes(e=>recordlyWebcamNormalizeLayoutKeyframes([...e.filter(e=>Math.abs(e.timeMs-a)>250),t]))}N(r,!0),recordlySmallPreviewRect.current=null;const c={timeMs:a,...o(r)};',
    'if(n){recordlySmallPreviewRect.current||(recordlySmallPreviewRect.current=Z.current),recordlySetPreviewFullscreen(!0);const t={timeMs:a,positionPreset:"custom",positionX:0,positionY:0,size:100,aspectRatio:l.width/l.height,margin:0,cornerRadius:0,shadow:0};return void recordlySetLayoutKeyframes(e=>recordlyWebcamNormalizeLayoutKeyframes([...e.filter(e=>Math.abs(e.timeMs-a)>250),t]))}recordlySetPreviewFullscreen(!1),N(r,!0),recordlySmallPreviewRect.current=null;const c={timeMs:a,...o(r)};',
    "wheel toggles stable recording webcam fullscreen preview",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'recordingWebcamPreviewStyle:C,recordingWebcamOverlaySettings:F,recordingWebcamPreviewContainerRef:H,',
    'recordingWebcamPreviewStyle:C,recordingWebcamPreviewFullscreen:recordlyPreviewFullscreen,recordingWebcamOverlaySettings:F,recordingWebcamPreviewContainerRef:H,',
    "return recording webcam fullscreen flag",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'recordingWebcamPreviewStyle:ie,recordingWebcamOverlaySettings:me,webcamPreviewDragStartRef:se,',
    'recordingWebcamPreviewStyle:ie,recordingWebcamPreviewFullscreen:recordlyRecordingWebcamFullscreen,recordingWebcamOverlaySettings:me,webcamPreviewDragStartRef:se,',
    "read recording webcam fullscreen flag",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'style:{...ie,transform:`translate(${re.x}px, ${re.y}px)`},onWheel:He,',
    'style:{...ie,transform:recordlyRecordingWebcamFullscreen?"none":`translate(${re.x}px, ${re.y}px)`},onWheel:He,',
    "disable hud offset while recording webcam is fullscreen",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'W.jsx("button",{type:"button",className:CLa,title:a("recording.resizeWebcamPreview","Resize webcam preview"),',
    'W.jsx("button",{type:"button",style:recordlyRecordingWebcamFullscreen?{display:"none"}:void 0,className:CLa,title:a("recording.resizeWebcamPreview","Resize webcam preview"),',
    "hide resize handle while recording webcam is fullscreen",
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

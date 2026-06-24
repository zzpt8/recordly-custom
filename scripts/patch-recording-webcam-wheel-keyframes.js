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
    'function iLa({webcamEnabled:a,webcamDeviceId:t,recordingWebcamStream:n,setPreviewWebcamStream:l,showWebcamControls:r,webcamPopoverOpen:o}){const[c,i]=e.useState(!0),',
    'function iLa({webcamEnabled:a,webcamDeviceId:t,recordingWebcamStream:n,setPreviewWebcamStream:l,showWebcamControls:r,webcamPopoverOpen:o,recordingActive:recordlyRecordingActive=!1,recordingElapsedSeconds:recordlyRecordingElapsedSeconds=0}){const[c,i]=e.useState(!0),',
    "recording webcam hook accepts recording state",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'V=e.useRef(null),f=e.useRef(null),E=e.useRef(null),v=e.useRef(null),L=e.useRef(!1),w=a&&c,y=w&&null!==n,b=a&&(w||r&&o);',
    'V=e.useRef(null),f=e.useRef(null),E=e.useRef(null),v=e.useRef(null),recordlySmallPreviewRect=e.useRef(null),recordlyWasRecording=e.useRef(!1),L=e.useRef(!1),[recordlyLayoutKeyframes,recordlySetLayoutKeyframes]=e.useState([]),w=a&&c,y=w&&null!==n,b=a&&(w||r&&o);',
    "recording webcam layout keyframe state",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'const F=e.useMemo(()=>function(e,a){const t=Math.max(1,Math.min(a.width/16*9,a.height)),n=Math.max(1,a.width-e.size*16/9-48),l=Math.max(1,a.height-e.size-48);return{positionX:nLa((e.left-24)/n,0,1),positionY:nLa((e.top-24)/l,0,1),size:nLa(e.size/t*100,10,100),aspectRatio:16/9}}(d,lLa()),[d]),C=e.useMemo(()=>({left:`${d.left}px`,top:`${d.top}px`,width:`${d.size*16/9}px`,height:`${d.size}px`}),[d]);e.useEffect(()=>{Z.current=d},[d]);',
    'const F=e.useMemo(()=>{const e=function(e,a){const t=Math.max(1,Math.min(a.width/16*9,a.height)),n=Math.max(1,a.width-e.size*16/9-48),l=Math.max(1,a.height-e.size-48);return{positionX:nLa((e.left-24)/n,0,1),positionY:nLa((e.top-24)/l,0,1),size:nLa(e.size/t*100,10,100),aspectRatio:16/9}}(d,lLa());return{...e,margin:24,cornerRadius:18,shadow:UCa,layoutKeyframes:recordlyLayoutKeyframes}},[d,recordlyLayoutKeyframes]),C=e.useMemo(()=>({left:`${d.left}px`,top:`${d.top}px`,width:`${d.size*16/9}px`,height:`${d.size}px`}),[d]);e.useEffect(()=>{Z.current=d},[d]),e.useEffect(()=>{recordlyRecordingActive&&!recordlyWasRecording.current&&(recordlySetLayoutKeyframes([]),recordlySmallPreviewRect.current=null),recordlyWasRecording.current=recordlyRecordingActive},[recordlyRecordingActive]);',
    "recording webcam overlay includes layout keyframes",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'j=e.useCallback(e=>{if(!e.ctrlKey&&!e.shiftKey)return;e.preventDefault();const a=Z.current;N({left:a.left,top:a.top,size:a.size+(e.deltaY<0?24:-24)},!0),R(Z.current)},[N,R]),W=e.useCallback',
    'j=e.useCallback(e=>{if(recordlyRecordingActive&&!e.ctrlKey&&!e.shiftKey){e.preventDefault(),e.stopPropagation();const a=Math.max(0,Math.round(1e3*(Number.isFinite(recordlyRecordingElapsedSeconds)?recordlyRecordingElapsedSeconds:0))),t=lLa(),n=e.deltaY<0,l={width:Math.max(1,t.width),height:Math.max(1,t.height)},r=recordlySmallPreviewRect.current??Z.current,o=e=>{const a=Math.max(1,Math.min(l.width/16*9,l.height)),t=Math.max(1,l.width-e.size*16/9-48),r=Math.max(1,l.height-e.size-48);return{positionPreset:"custom",positionX:nLa((e.left-24)/t,0,1),positionY:nLa((e.top-24)/r,0,1),size:nLa(e.size/a*100,10,100),aspectRatio:16/9,margin:24,cornerRadius:18,shadow:UCa}};if(n){recordlySmallPreviewRect.current||(recordlySmallPreviewRect.current=Z.current);const e=Math.max(96,Math.min(l.height,l.width*9/16));N({left:Math.max(0,(l.width-e*16/9)/2),top:Math.max(0,(l.height-e)/2),size:e},!0);const t={timeMs:a,positionPreset:"custom",positionX:0,positionY:0,size:100,aspectRatio:l.width/l.height,margin:0,cornerRadius:0,shadow:0};return void recordlySetLayoutKeyframes(e=>recordlyWebcamNormalizeLayoutKeyframes([...e.filter(e=>Math.abs(e.timeMs-a)>250),t]))}N(r,!0),recordlySmallPreviewRect.current=null;const c={timeMs:a,...o(r)};return void recordlySetLayoutKeyframes(e=>recordlyWebcamNormalizeLayoutKeyframes([...e.filter(e=>Math.abs(e.timeMs-a)>250),c]))}if(!e.ctrlKey&&!e.shiftKey)return;e.preventDefault();const a=Z.current;N({left:a.left,top:a.top,size:a.size+(e.deltaY<0?24:-24)},!0),R(Z.current)},[N,R,recordlyRecordingActive,recordlyRecordingElapsedSeconds]),W=e.useCallback',
    "recording webcam wheel writes layout keyframes",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    'webcamDeviceId:f,recordingWebcamStream:v,setPreviewWebcamStream:L,showWebcamControls:j,webcamPopoverOpen:"webcam"===t});',
    'webcamDeviceId:f,recordingWebcamStream:v,setPreviewWebcamStream:L,showWebcamControls:j,webcamPopoverOpen:"webcam"===t,recordingActive:r,recordingElapsedSeconds:C});',
    "pass recording state to webcam preview hook",
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

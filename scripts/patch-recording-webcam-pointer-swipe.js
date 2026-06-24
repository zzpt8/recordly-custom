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

const swipeBlock = 'if(w&&Math.abs(n)>48&&Math.abs(n)>1.15*Math.abs(t)){e.preventDefault(),e.stopPropagation(),E.current=null,L.current=!1,s(tLa),e.currentTarget.hasPointerCapture(e.pointerId)&&e.currentTarget.releasePointerCapture(e.pointerId);const recordlySwipeTimeMs=Math.max(0,Math.round(1e3*(Number.isFinite(recordlyRecordingElapsedSeconds)?recordlyRecordingElapsedSeconds:0))),recordlySwipeViewport=lLa(),recordlySwipeBounds={width:Math.max(1,recordlySwipeViewport.width),height:Math.max(1,recordlySwipeViewport.height)},recordlySwipeRestore=recordlySmallPreviewRect.current??Z.current,recordlySwipeToLayout=e=>{const a=Math.max(1,Math.min(recordlySwipeBounds.width/16*9,recordlySwipeBounds.height)),t=Math.max(1,recordlySwipeBounds.width-e.size*16/9-48),r=Math.max(1,recordlySwipeBounds.height-e.size-48);return{positionPreset:"custom",positionX:nLa((e.left-24)/t,0,1),positionY:nLa((e.top-24)/r,0,1),size:nLa(e.size/a*100,10,100),aspectRatio:16/9,margin:24,cornerRadius:18,shadow:UCa}};if(n<0){recordlySmallPreviewRect.current||(recordlySmallPreviewRect.current=Z.current),recordlySetPreviewFullscreen(!0);const e={timeMs:recordlySwipeTimeMs,positionPreset:"custom",positionX:0,positionY:0,size:100,aspectRatio:recordlySwipeBounds.width/recordlySwipeBounds.height,margin:0,cornerRadius:0,shadow:0};return void recordlySetLayoutKeyframes(a=>recordlyWebcamNormalizeLayoutKeyframes([...a.filter(e=>Math.abs(e.timeMs-recordlySwipeTimeMs)>250),e]))}if(recordlyPreviewFullscreen){recordlySetPreviewFullscreen(!1),N(recordlySwipeRestore,!0),recordlySmallPreviewRect.current=null;const e={timeMs:recordlySwipeTimeMs,...recordlySwipeToLayout(recordlySwipeRestore)};return void recordlySetLayoutKeyframes(a=>recordlyWebcamNormalizeLayoutKeyframes([...a.filter(e=>Math.abs(e.timeMs-recordlySwipeTimeMs)>250),e]))}return}';

function patch(file) {
  let text = read(file);
  let changed = false;

  let result = replaceOnce(
    text,
    'const t=e.clientX-a.startX,n=e.clientY-a.startY;!a.dragging&&Math.hypot(t,n)<6||',
    `const t=e.clientX-a.startX,n=e.clientY-a.startY;${swipeBlock}!a.dragging&&Math.hypot(t,n)<6||`,
    "recording webcam pointer swipe gesture",
    file
  );
  text = result.text;
  changed = changed || result.changed;

  result = replaceOnce(
    text,
    ')})))},[N]),T=e.useCallback',
    ')})))},[N,w,recordlyRecordingElapsedSeconds,recordlyPreviewFullscreen]),T=e.useCallback',
    "recording webcam pointer swipe dependencies",
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

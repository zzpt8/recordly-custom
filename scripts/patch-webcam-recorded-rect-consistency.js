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

function activeModernExporterPath(rendererPath) {
  const renderer = read(rendererPath);
  const match = renderer.match(/"(\.\/modernVideoExporter-[^"]+\.js)"/);
  if (!match) throw new Error("renderer missing modern exporter import");
  return path.join(path.dirname(rendererPath), match[1].replace(/^\.\//, ""));
}

function replaceOnce(text, search, replace, label) {
  if (text.includes(replace)) return text;
  const index = text.indexOf(search);
  if (index < 0) throw new Error(`Missing ${label}`);
  return text.slice(0, index) + replace + text.slice(index + search.length);
}

function patchMain() {
  let text = read(mainPath);
  text = replaceOnce(
    text,
    'typeof t.rotation=="number"&&(r.rotation=(Number.isFinite(t.rotation)?(t.rotation%360+360)%360:0));const n=a=>',
    'typeof t.rotation=="number"&&(r.rotation=(Number.isFinite(t.rotation)?(t.rotation%360+360)%360:0));const i=a=>{if(!a||typeof a!="object")return null;const s=a,o=Number.isFinite(s.left)?s.left:Number.isFinite(s.x)?s.x:NaN,c=Number.isFinite(s.top)?s.top:Number.isFinite(s.y)?s.y:NaN,l=Number.isFinite(s.width)?s.width:NaN,d=Number.isFinite(s.height)?s.height:NaN;return Number.isFinite(o)&&Number.isFinite(c)&&Number.isFinite(l)&&Number.isFinite(d)&&l>0&&d>0?{left:o,top:c,width:l,height:d}:null},a=s=>{if(!s||typeof s!="object")return null;const o=Number.isFinite(s.width)?s.width:NaN,c=Number.isFinite(s.height)?s.height:NaN;return Number.isFinite(o)&&Number.isFinite(c)&&o>0&&c>0?{width:o,height:c}:null},s=i(t.recordedRect),o=a(t.recordedViewport);s&&(r.recordedRect=s),o&&(r.recordedViewport=o);const n=a=>',
    "main webcam recorded rect sanitizer",
  );
  write(mainPath, text);
}

function patchRenderer(rendererPath) {
  let text = read(rendererPath);
  text = replaceOnce(
    text,
    'function recordlyWebcamFrameSize({containerWidth:e,containerHeight:a,sizePercent:t,margin:n,zoomScale:l,reactToZoom:r,aspectRatio:o}){const c=recordlyWebcamAspectRatio({aspectRatio:o}),i=Math.max(0,n),m=nRa({containerWidth:e,containerHeight:a,sizePercent:t,margin:i,zoomScale:l,reactToZoom:r}),s=Math.max(56,Math.min(Math.max(56,a-2*i),Math.max(56,(e-2*i)/c),m));return{width:s*c,height:s}}',
    'function recordlyWebcamFrameSize({containerWidth:e,containerHeight:a,sizePercent:t,margin:n,zoomScale:l,reactToZoom:r,aspectRatio:o}){const c=recordlyWebcamAspectRatio({aspectRatio:o}),i=Math.max(0,n),m=nRa({containerWidth:e,containerHeight:a,sizePercent:t,margin:i,zoomScale:l,reactToZoom:r}),s=Math.max(56,Math.min(Math.max(56,a-2*i),Math.max(56,(e-2*i)/c),m));return{width:s*c,height:s}}function recordlyNormalizeRecordedRect(e){if(!e||"object"!=typeof e)return;const a=Number.isFinite(e.left)?e.left:Number.isFinite(e.x)?e.x:NaN,t=Number.isFinite(e.top)?e.top:Number.isFinite(e.y)?e.y:NaN,n=Number.isFinite(e.width)?e.width:NaN,l=Number.isFinite(e.height)?e.height:NaN;return Number.isFinite(a)&&Number.isFinite(t)&&Number.isFinite(n)&&Number.isFinite(l)&&n>0&&l>0?{left:a,top:t,width:n,height:l}:void 0}function recordlyNormalizeRecordedViewport(e){if(!e||"object"!=typeof e)return;const a=Number.isFinite(e.width)?e.width:NaN,t=Number.isFinite(e.height)?e.height:NaN;return Number.isFinite(a)&&Number.isFinite(t)&&a>0&&t>0?{width:a,height:t}:void 0}function recordlyRecordedWebcamRect(e,a,t){const n=recordlyNormalizeRecordedRect(e?.recordedRect),l=recordlyNormalizeRecordedViewport(e?.recordedViewport);if(!n||!l)return null;const r=Math.max(1,a),o=Math.max(1,t),c=Math.min(r/l.width,o/l.height);if(!Number.isFinite(c)||c<=0)return null;const i=(r-l.width*c)/2,m=(o-l.height*c)/2,s=Math.max(1,n.width*c),d=Math.max(1,n.height*c);return{x:eRa(i+n.left*c,0,Math.max(0,r-s)),y:eRa(m+n.top*c,0,Math.max(0,o-d)),width:s,height:d}}',
    "renderer recorded webcam rect helpers",
  );
  text = replaceOnce(
    text,
    'const F=e.useMemo(()=>{const e=function(e,a){const t=Math.max(1,Math.min(a.width/16*9,a.height)),n=Math.max(1,a.width-e.size*16/9-48),l=Math.max(1,a.height-e.size-48);return{positionX:nLa((e.left-24)/n,0,1),positionY:nLa((e.top-24)/l,0,1),size:nLa(e.size/t*100,10,100),aspectRatio:16/9}}(d,lLa());return{...e,margin:24,cornerRadius:18,shadow:UCa,rotation:recordlyPreviewRotation,layoutKeyframes:recordlyLayoutKeyframes}},[d,recordlyLayoutKeyframes,recordlyPreviewRotation])',
    'const F=e.useMemo(()=>{const a=lLa(),e=function(e,a){const t=Math.max(1,Math.min(a.width/16*9,a.height)),n=Math.max(1,a.width-e.size*16/9-48),l=Math.max(1,a.height-e.size-48);return{positionX:nLa((e.left-24)/n,0,1),positionY:nLa((e.top-24)/l,0,1),size:nLa(e.size/t*100,10,100),aspectRatio:16/9}}(d,a),t=recordlyPreviewFullscreen?{left:0,top:0,width:a.width,height:a.height}:{left:d.left,top:d.top,width:d.size*16/9,height:d.size};return{...e,recordedRect:t,recordedViewport:a,margin:24,cornerRadius:18,shadow:UCa,rotation:recordlyPreviewRotation,layoutKeyframes:recordlyLayoutKeyframes}},[d,recordlyLayoutKeyframes,recordlyPreviewFullscreen,recordlyPreviewRotation])',
    "recording HUD saves exact webcam rect",
  );
  text = replaceOnce(
    text,
    'sourceKind:"phone-camera"===P.sourceKind?"phone-camera":void 0,mirror:"boolean"==typeof P.mirror?P.mirror:YCa.mirror',
    'sourceKind:"phone-camera"===P.sourceKind?"phone-camera":void 0,recordedRect:recordlyNormalizeRecordedRect(P.recordedRect),recordedViewport:recordlyNormalizeRecordedViewport(P.recordedViewport),mirror:"boolean"==typeof P.mirror?P.mirror:YCa.mirror',
    "project state preserves recorded webcam rect",
  );
  text = replaceOnce(
    text,
    'const i=n.margin??24,m=recordlyWebcamFrameSize({containerWidth:a,containerHeight:t,sizePercent:n.size??50,margin:i,zoomScale:this.animationState.appliedScale||1,reactToZoom:n.reactToZoom??!0,aspectRatio:n.aspectRatio}),{x:s,y:d}=lRa({containerWidth:a,containerHeight:t,size:m.height,width:m.width,height:m.height,margin:i,positionPreset:n.positionPreset??n.corner,positionX:n.positionX??1,positionY:n.positionY??1,legacyCorner:n.corner}),h=Math.max(0,n.cornerRadius??18)',
    'const i=n.margin??24,recordlyRecordedRect=recordlyRecordedWebcamRect(n,a,t),m=recordlyRecordedRect?{width:recordlyRecordedRect.width,height:recordlyRecordedRect.height}:recordlyWebcamFrameSize({containerWidth:a,containerHeight:t,sizePercent:n.size??50,margin:i,zoomScale:this.animationState.appliedScale||1,reactToZoom:n.reactToZoom??!0,aspectRatio:n.aspectRatio}),{x:s,y:d}=recordlyRecordedRect??lRa({containerWidth:a,containerHeight:t,size:m.height,width:m.width,height:m.height,margin:i,positionPreset:n.positionPreset??n.corner,positionX:n.positionX??1,positionY:n.positionY??1,legacyCorner:n.corner}),h=Math.max(0,n.cornerRadius??18)',
    "editor preview uses recorded webcam rect",
  );
  write(rendererPath, text);
}

function patchModernExporter(exporterPath) {
  let text = read(exporterPath);
  text = replaceOnce(
    text,
    'function recordlyModernWebcamFrameSize({containerWidth:e,containerHeight:t,sizePercent:i,margin:a,zoomScale:o,reactToZoom:n,aspectRatio:s}){const r=recordlyModernWebcamAspectRatio({aspectRatio:s}),c=Math.max(0,a),h=N({containerWidth:e,containerHeight:t,sizePercent:i,margin:c,zoomScale:o,reactToZoom:n}),d=Math.max(56,Math.min(Math.max(56,t-2*c),Math.max(56,(e-2*c)/r),h));return{width:d*r,height:d}}class _e',
    'function recordlyModernWebcamFrameSize({containerWidth:e,containerHeight:t,sizePercent:i,margin:a,zoomScale:o,reactToZoom:n,aspectRatio:s}){const r=recordlyModernWebcamAspectRatio({aspectRatio:s}),c=Math.max(0,a),h=N({containerWidth:e,containerHeight:t,sizePercent:i,margin:c,zoomScale:o,reactToZoom:n}),d=Math.max(56,Math.min(Math.max(56,t-2*c),Math.max(56,(e-2*c)/r),h));return{width:d*r,height:d}}function recordlyModernClamp(e,t,i){return Math.min(i,Math.max(t,e))}function recordlyModernRecordedWebcamRect(e,t,i){const a=e?.recordedRect,o=e?.recordedViewport;if(!a||!o)return null;const n=Number.isFinite(a.left)?a.left:Number.isFinite(a.x)?a.x:NaN,s=Number.isFinite(a.top)?a.top:Number.isFinite(a.y)?a.y:NaN,r=Number.isFinite(a.width)?a.width:NaN,c=Number.isFinite(a.height)?a.height:NaN,h=Number.isFinite(o.width)?o.width:NaN,d=Number.isFinite(o.height)?o.height:NaN;if(!Number.isFinite(n)||!Number.isFinite(s)||!Number.isFinite(r)||!Number.isFinite(c)||!Number.isFinite(h)||!Number.isFinite(d)||r<=0||c<=0||h<=0||d<=0)return null;const u=Math.max(1,t),l=Math.max(1,i),m=Math.min(u/h,l/d);if(!Number.isFinite(m)||m<=0)return null;const g=Math.max(1,r*m),p=Math.max(1,c*m),f=(u-h*m)/2,S=(l-d*m)/2;return{x:recordlyModernClamp(f+n*m,0,Math.max(0,u-g)),y:recordlyModernClamp(S+s*m,0,Math.max(0,l-p)),width:g,height:p}}class _e',
    "modern exporter recorded webcam rect helpers",
  );
  text = replaceOnce(
    text,
    'const d=t.margin??24,u=recordlyModernWebcamFrameSize({containerWidth:this.config.width,containerHeight:this.config.height,sizePercent:t.size??50,margin:d,zoomScale:this.animationState.appliedScale||1,reactToZoom:t.reactToZoom??!0,aspectRatio:t.aspectRatio}),l=z({containerWidth:this.config.width,containerHeight:this.config.height,size:u.height,width:u.width,height:u.height,margin:d,positionPreset:t.positionPreset??t.corner,positionX:t.positionX??1,positionY:t.positionY??1,legacyCorner:t.corner}),m=Math.max(0,t.cornerRadius??18)',
    'const d=t.margin??24,recordlyRecordedRect=recordlyModernRecordedWebcamRect(t,this.config.width,this.config.height),u=recordlyRecordedRect?{width:recordlyRecordedRect.width,height:recordlyRecordedRect.height}:recordlyModernWebcamFrameSize({containerWidth:this.config.width,containerHeight:this.config.height,sizePercent:t.size??50,margin:d,zoomScale:this.animationState.appliedScale||1,reactToZoom:t.reactToZoom??!0,aspectRatio:t.aspectRatio}),l=recordlyRecordedRect??z({containerWidth:this.config.width,containerHeight:this.config.height,size:u.height,width:u.width,height:u.height,margin:d,positionPreset:t.positionPreset??t.corner,positionX:t.positionX??1,positionY:t.positionY??1,legacyCorner:t.corner}),m=Math.max(0,t.cornerRadius??18)',
    "modern exporter uses recorded webcam rect",
  );
  write(exporterPath, text);
}

function patchVerify(rendererPath, exporterPath) {
  let text = read(verifyPath);
  const marker = 'assertIncludes(rendererPath, "recordlyRecordedWebcamRect", "editor preview uses recorded webcam rect");';
  if (!text.includes(marker)) {
    text = text.replace(
      'assertIncludes(rendererPath, "applyRecordedPlacement:!0", "editor applies recorded webcam placement");',
      'assertIncludes(rendererPath, "applyRecordedPlacement:!0", "editor applies recorded webcam placement");\nassertIncludes(rendererPath, "recordedRect:t", "recording session saves exact webcam rect");\nassertIncludes(rendererPath, "recordlyRecordedWebcamRect", "editor preview uses recorded webcam rect");\nassertIncludes(rendererPath, "recordlyNormalizeRecordedViewport", "editor preserves recorded viewport");\nassertIncludes(mainPath, "recordedViewport", "main preserves recorded webcam viewport");\nassertIncludes(modernExporterPath, "recordlyModernRecordedWebcamRect", "export uses recorded webcam rect");',
    );
  }
  write(verifyPath, text);
  if (!read(rendererPath).includes("recordlyRecordedWebcamRect")) throw new Error("renderer recorded rect patch missing");
  if (!read(exporterPath).includes("recordlyModernRecordedWebcamRect")) throw new Error("modern exporter recorded rect patch missing");
}

const rendererPath = activeRendererPath();
const exporterPath = activeModernExporterPath(rendererPath);

patchMain();
patchRenderer(rendererPath);
patchModernExporter(exporterPath);
patchVerify(rendererPath, exporterPath);

console.log(`webcam recorded rect consistency patch applied: ${path.basename(rendererPath)}`);

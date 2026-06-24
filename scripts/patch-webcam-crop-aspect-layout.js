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

function patchMain() {
  let text = read(mainPath);
  text = replaceOnce(
    text,
    'typeof t.rotation=="number"&&(r.rotation=(Number.isFinite(t.rotation)?(t.rotation%360+360)%360:0));const i=a=>',
    'typeof t.rotation=="number"&&(r.rotation=(Number.isFinite(t.rotation)?(t.rotation%360+360)%360:0));const recordlyCrop=e=>{if(!e||typeof e!="object")return null;const t=e,n=Number.isFinite(t.x)?Nc(t.x,0,.99):0,i=Number.isFinite(t.y)?Nc(t.y,0,.99):0,a=Number.isFinite(t.width)?Nc(t.width,.01,1-n):1-n,s=Number.isFinite(t.height)?Nc(t.height,.01,1-i):1-i;return{x:n,y:i,width:a,height:s}},recordlyCropRegion=recordlyCrop(t.cropRegion);recordlyCropRegion&&(r.cropRegion=recordlyCropRegion);const i=a=>',
    "main preserves webcam crop region",
  );
  write(mainPath, text);
}

function patchRenderer(file) {
  let text = read(file);
  text = replaceOnce(
    text,
    'function recordlyWebcamAspectRatio(e){const a=Number.isFinite(e?.aspectRatio)?e.aspectRatio:16/9;return eRa(a,.25,4)}function recordlyWebcamFrameSize',
    'function recordlyWebcamAspectRatio(e){const a=Number.isFinite(e?.aspectRatio)?e.aspectRatio:16/9;return eRa(a,.25,4)}function recordlyWebcamEffectiveAspect(e){const a=recordlyWebcamAspectRatio(e),t=rRa(e?.cropRegion);return oRa(t)?a:eRa(a*t.width/Math.max(.001,t.height),.25,4)}function recordlyWebcamFrameSize',
    "renderer computes crop effective webcam aspect",
  );

  text = replaceOnce(
    text,
    'function recordlyRecordedWebcamRect(e,a,t,n=1){const l=recordlyNormalizeRecordedRect(e?.recordedRect),r=recordlyNormalizeRecordedViewport(e?.recordedViewport);if(!l||!r)return null;const o=Math.max(1,a),c=Math.max(1,t),i=Math.min(o/r.width,c/r.height);if(!Number.isFinite(i)||i<=0)return null;const m=(o-r.width*i)/2,s=(c-r.height*i)/2,d=Number.isFinite(n)&&n>0?n:1,h=e?.reactToZoom??!0,u=h?1/d:1,Z=Math.max(1,l.width*i*u),p=Math.max(1,l.height*i*u),A=m+(l.left+l.width/2)*i-Z/2,H=s+(l.top+l.height/2)*i-p/2;return{x:eRa(A,0,Math.max(0,o-Z)),y:eRa(H,0,Math.max(0,c-p)),width:Z,height:p}}',
    'function recordlyRecordedWebcamRect(e,a,t,n=1){const l=recordlyNormalizeRecordedRect(e?.recordedRect),r=recordlyNormalizeRecordedViewport(e?.recordedViewport);if(!l||!r)return null;const o=Math.max(1,a),c=Math.max(1,t),i=Math.min(o/r.width,c/r.height);if(!Number.isFinite(i)||i<=0)return null;const m=(o-r.width*i)/2,s=(c-r.height*i)/2,d=Number.isFinite(n)&&n>0?n:1,h=e?.reactToZoom??!0,u=h?1/d:1;let Z=Math.max(1,l.width*i*u),p=Math.max(1,l.height*i*u);const recordlyCropAspect=recordlyWebcamEffectiveAspect(e);oRa(e?.cropRegion)||(p=Math.min(c,Math.max(1,Z/recordlyCropAspect)));const A=m+(l.left+l.width/2)*i-Z/2,H=s+(l.top+l.height/2)*i-p/2;return{x:eRa(A,0,Math.max(0,o-Z)),y:eRa(H,0,Math.max(0,c-p)),width:Z,height:p}}',
    "renderer recorded webcam rect follows crop aspect",
  );

  text = replaceOnce(
    text,
    'aspectRatio:n.aspectRatio}),{x:s,y:d}=recordlyRecordedRect??lRa',
    'aspectRatio:recordlyWebcamEffectiveAspect(n)}),{x:s,y:d}=recordlyRecordedRect??lRa',
    "renderer fallback webcam frame uses crop aspect",
  );

  text = replaceOnce(
    text,
    'recordlyActiveWebcam=recordlyWebcamLayoutAt(T,1e3*r),recordlyWebcamAspect=recordlyWebcamAspectRatio(recordlyActiveWebcam),Ht=',
    'recordlyActiveWebcam=recordlyWebcamLayoutAt(T,1e3*r),recordlyWebcamAspect=recordlyWebcamEffectiveAspect(recordlyActiveWebcam),Ht=',
    "editor DOM webcam overlay uses crop aspect",
  );

  write(file, text);
}

function patchModernExporter(file) {
  let text = read(file);
  text = replaceOnce(
    text,
    'function recordlyModernWebcamAspectRatio(e){const t=Number.isFinite(e?.aspectRatio)?e.aspectRatio:16/9;return Math.min(4,Math.max(.25,t))}function recordlyModernWebcamLayoutAt',
    'function recordlyModernWebcamAspectRatio(e){const t=Number.isFinite(e?.aspectRatio)?e.aspectRatio:16/9;return Math.min(4,Math.max(.25,t))}function recordlyModernWebcamEffectiveAspect(e){const t=recordlyModernWebcamAspectRatio(e);if(R(e?.cropRegion))return t;const i=T(e?.cropRegion,1e3*t,1e3);return Math.min(4,Math.max(.25,i.sw/Math.max(1,i.sh)))}function recordlyModernWebcamLayoutAt',
    "export computes crop effective webcam aspect",
  );

  text = replaceOnce(
    text,
    'function recordlyModernRecordedWebcamRect(e,t,i,a=1){const o=e?.recordedRect,n=e?.recordedViewport;if(!o||!n)return null;const s=Number.isFinite(o.left)?o.left:Number.isFinite(o.x)?o.x:NaN,r=Number.isFinite(o.top)?o.top:Number.isFinite(o.y)?o.y:NaN,c=Number.isFinite(o.width)?o.width:NaN,h=Number.isFinite(o.height)?o.height:NaN,d=Number.isFinite(n.width)?n.width:NaN,u=Number.isFinite(n.height)?n.height:NaN;if(!Number.isFinite(s)||!Number.isFinite(r)||!Number.isFinite(c)||!Number.isFinite(h)||!Number.isFinite(d)||!Number.isFinite(u)||c<=0||h<=0||d<=0||u<=0)return null;const l=Math.max(1,t),m=Math.max(1,i),g=Math.min(l/d,m/u);if(!Number.isFinite(g)||g<=0)return null;const p=Number.isFinite(a)&&a>0?a:1,f=e?.reactToZoom??!0,S=f?1/p:1,w=Math.max(1,c*g*S),v=Math.max(1,h*g*S),b=(l-d*g)/2,F=(m-u*g)/2,C=b+(s+c/2)*g-w/2,I=F+(r+h/2)*g-v/2;return{x:recordlyModernClamp(C,0,Math.max(0,l-w)),y:recordlyModernClamp(I,0,Math.max(0,m-v)),width:w,height:v}}',
    'function recordlyModernRecordedWebcamRect(e,t,i,a=1){const o=e?.recordedRect,n=e?.recordedViewport;if(!o||!n)return null;const s=Number.isFinite(o.left)?o.left:Number.isFinite(o.x)?o.x:NaN,r=Number.isFinite(o.top)?o.top:Number.isFinite(o.y)?o.y:NaN,c=Number.isFinite(o.width)?o.width:NaN,h=Number.isFinite(o.height)?o.height:NaN,d=Number.isFinite(n.width)?n.width:NaN,u=Number.isFinite(n.height)?n.height:NaN;if(!Number.isFinite(s)||!Number.isFinite(r)||!Number.isFinite(c)||!Number.isFinite(h)||!Number.isFinite(d)||!Number.isFinite(u)||c<=0||h<=0||d<=0||u<=0)return null;const l=Math.max(1,t),m=Math.max(1,i),g=Math.min(l/d,m/u);if(!Number.isFinite(g)||g<=0)return null;const p=Number.isFinite(a)&&a>0?a:1,f=e?.reactToZoom??!0,S=f?1/p:1;let w=Math.max(1,c*g*S),v=Math.max(1,h*g*S);const y=recordlyModernWebcamEffectiveAspect(e);R(e?.cropRegion)||(v=Math.min(m,Math.max(1,w/y)));const b=(l-d*g)/2,F=(m-u*g)/2,C=b+(s+c/2)*g-w/2,I=F+(r+h/2)*g-v/2;return{x:recordlyModernClamp(C,0,Math.max(0,l-w)),y:recordlyModernClamp(I,0,Math.max(0,m-v)),width:w,height:v}}',
    "export recorded webcam rect follows crop aspect",
  );

  text = replaceOnce(
    text,
    'aspectRatio:t.aspectRatio}),l=recordlyRecordedRect??z',
    'aspectRatio:recordlyModernWebcamEffectiveAspect(t)}),l=recordlyRecordedRect??z',
    "export fallback webcam frame uses crop aspect",
  );

  write(file, text);
}

function patchVerify(file) {
  let text = read(file);
  text = replaceOnce(
    text,
    'assertIncludes(rendererPath, "recordlyPhoneWebcamContain", "editor phone camera preview uses contain");',
    'assertIncludes(rendererPath, "recordlyPhoneWebcamContain", "editor phone camera preview uses contain");\nassertIncludes(rendererPath, "recordlyWebcamEffectiveAspect", "editor webcam layout follows crop aspect");\nassertIncludes(mainPath, "recordlyCropRegion", "main preserves webcam crop region");\nassertIncludes(modernExporterPath, "recordlyModernWebcamEffectiveAspect", "export webcam layout follows crop aspect");',
    "verify webcam crop aspect layout",
  );
  write(file, text);
}

const rendererPath = activeRendererPath();
patchMain();
patchRenderer(rendererPath);
patchModernExporter(activeModernExporterPath(rendererPath));
patchVerify(verifyPath);

console.log("webcam crop aspect layout patch applied");

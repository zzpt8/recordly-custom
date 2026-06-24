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

function activeModernExporterPath(rendererPath) {
  const renderer = read(rendererPath);
  const match = renderer.match(/"(\.\/modernVideoExporter-[^"]+\.js)"/);
  if (!match) throw new Error("renderer missing modern exporter import");
  return path.join(path.dirname(rendererPath), match[1].replace(/^\.\//, ""));
}

function replaceOnce(text, search, replace, label) {
  if (replace && text.includes(replace) && !text.includes(search)) return text;
  const count = text.split(search).length - 1;
  if (count !== 1) throw new Error(`Expected 1 match for ${label}, found ${count}`);
  return text.replace(search, replace);
}

function replaceAll(text, search, replace) {
  return text.split(search).join(replace);
}

function patchRenderer(file) {
  let text = read(file);

  text = replaceOnce(
    text,
    'function recordlyRecordedWebcamRect(e,a,t){const n=recordlyNormalizeRecordedRect(e?.recordedRect),l=recordlyNormalizeRecordedViewport(e?.recordedViewport);if(!n||!l)return null;const r=Math.max(1,a),o=Math.max(1,t),c=Math.min(r/l.width,o/l.height);if(!Number.isFinite(c)||c<=0)return null;const i=(r-l.width*c)/2,m=(o-l.height*c)/2,s=Math.max(1,n.width*c),d=Math.max(1,n.height*c);return{x:eRa(i+n.left*c,0,Math.max(0,r-s)),y:eRa(m+n.top*c,0,Math.max(0,o-d)),width:s,height:d}}',
    'function recordlyRecordedWebcamRect(e,a,t,n=1){const l=recordlyNormalizeRecordedRect(e?.recordedRect),r=recordlyNormalizeRecordedViewport(e?.recordedViewport);if(!l||!r)return null;const o=Math.max(1,a),c=Math.max(1,t),i=Math.min(o/r.width,c/r.height);if(!Number.isFinite(i)||i<=0)return null;const m=(o-r.width*i)/2,s=(c-r.height*i)/2,d=Number.isFinite(n)&&n>0?n:1,h=e?.reactToZoom??!0,u=h?1/d:1,Z=Math.max(1,l.width*i*u),p=Math.max(1,l.height*i*u),A=m+(l.left+l.width/2)*i-Z/2,H=s+(l.top+l.height/2)*i-p/2;return{x:eRa(A,0,Math.max(0,o-Z)),y:eRa(H,0,Math.max(0,c-p)),width:Z,height:p}}',
    "renderer recorded webcam rect reacts to zoom",
  );

  text = replaceOnce(
    text,
    'recordlyRecordedRect=recordlyRecordedWebcamRect(n,a,t),m=recordlyRecordedRect?{width:recordlyRecordedRect.width,height:recordlyRecordedRect.height}:recordlyWebcamFrameSize',
    'recordlyRecordedRect=recordlyRecordedWebcamRect(n,a,t,this.animationState.appliedScale||1),m=recordlyRecordedRect?{width:recordlyRecordedRect.width,height:recordlyRecordedRect.height}:recordlyWebcamFrameSize',
    "2D preview recorded rect uses current zoom scale",
  );

  text = replaceOnce(
    text,
    ',recordlyRotateWebcamClip=e.useCallback(()=>{if(!fa?.sourcePath)return void JEa.warning("No webcam footage in this recording.");const recordlyRotationTimeMs=Math.max(0,Math.round(1e3*x)),recordlyRotationLayout=recordlyWebcamLayoutAt(fa,recordlyRotationTimeMs)??fa,recordlyRotationCurrent=Number.isFinite(recordlyRotationLayout?.rotation)?recordlyRotationLayout.rotation:0,recordlyRotationNext=(recordlyRotationCurrent+90)%360,recordlyRotationPatch={positionPreset:recordlyRotationLayout?.positionPreset??"custom",positionX:recordlyRotationLayout?.positionX??1,positionY:recordlyRotationLayout?.positionY??1,size:recordlyRotationLayout?.size??40,aspectRatio:recordlyRotationLayout?.aspectRatio??16/9,margin:recordlyRotationLayout?.margin??24,cornerRadius:recordlyRotationLayout?.cornerRadius??18,shadow:recordlyRotationLayout?.shadow??UCa,rotation:recordlyRotationNext};Ea(e=>({...e,enabled:!0,rotation:recordlyRotationNext,layoutKeyframes:recordlyWebcamUpsertLayoutKeyframe(e,recordlyRotationTimeMs,recordlyRotationPatch)})),JEa.success("Webcam frame rotated.")},[fa,x,Ea]),Yr=e.useCallback',
    ',Yr=e.useCallback',
    "editor webcam rotate action",
  );

  text = replaceOnce(
    text,
    'W.jsx(Jva,{onClick:recordlyRotateWebcamClip,variant:"ghost",size:"icon",className:"h-7 w-7 rounded-full text-muted-foreground transition-all hover:bg-[#2563EB]/10 hover:text-[#2563EB]",title:"Rotate webcam frame 90 degrees",children:W.jsx("span",{className:"text-[9px] font-bold leading-none",children:"ROT"})}),',
    "",
    "editor webcam ROT toolbar button",
  );

  write(file, text);
}

function patchModernExporter(file) {
  let text = read(file);

  text = replaceOnce(
    text,
    'function recordlyModernRecordedWebcamRect(e,t,i){const a=e?.recordedRect,o=e?.recordedViewport;if(!a||!o)return null;const n=Number.isFinite(a.left)?a.left:Number.isFinite(a.x)?a.x:NaN,s=Number.isFinite(a.top)?a.top:Number.isFinite(a.y)?a.y:NaN,r=Number.isFinite(a.width)?a.width:NaN,c=Number.isFinite(a.height)?a.height:NaN,h=Number.isFinite(o.width)?o.width:NaN,d=Number.isFinite(o.height)?o.height:NaN;if(!Number.isFinite(n)||!Number.isFinite(s)||!Number.isFinite(r)||!Number.isFinite(c)||!Number.isFinite(h)||!Number.isFinite(d)||r<=0||c<=0||h<=0||d<=0)return null;const u=Math.max(1,t),l=Math.max(1,i),m=Math.min(u/h,l/d);if(!Number.isFinite(m)||m<=0)return null;const g=Math.max(1,r*m),p=Math.max(1,c*m),f=(u-h*m)/2,S=(l-d*m)/2;return{x:recordlyModernClamp(f+n*m,0,Math.max(0,u-g)),y:recordlyModernClamp(S+s*m,0,Math.max(0,l-p)),width:g,height:p}}',
    'function recordlyModernRecordedWebcamRect(e,t,i,a=1){const o=e?.recordedRect,n=e?.recordedViewport;if(!o||!n)return null;const s=Number.isFinite(o.left)?o.left:Number.isFinite(o.x)?o.x:NaN,r=Number.isFinite(o.top)?o.top:Number.isFinite(o.y)?o.y:NaN,c=Number.isFinite(o.width)?o.width:NaN,h=Number.isFinite(o.height)?o.height:NaN,d=Number.isFinite(n.width)?n.width:NaN,u=Number.isFinite(n.height)?n.height:NaN;if(!Number.isFinite(s)||!Number.isFinite(r)||!Number.isFinite(c)||!Number.isFinite(h)||!Number.isFinite(d)||!Number.isFinite(u)||c<=0||h<=0||d<=0||u<=0)return null;const l=Math.max(1,t),m=Math.max(1,i),g=Math.min(l/d,m/u);if(!Number.isFinite(g)||g<=0)return null;const p=Number.isFinite(a)&&a>0?a:1,f=e?.reactToZoom??!0,S=f?1/p:1,w=Math.max(1,c*g*S),v=Math.max(1,h*g*S),b=(l-d*g)/2,F=(m-u*g)/2,C=b+(s+c/2)*g-w/2,I=F+(r+h/2)*g-v/2;return{x:recordlyModernClamp(C,0,Math.max(0,l-w)),y:recordlyModernClamp(I,0,Math.max(0,m-v)),width:w,height:v}}',
    "modern exporter recorded webcam rect reacts to zoom",
  );

  text = replaceOnce(
    text,
    'recordlyRecordedRect=recordlyModernRecordedWebcamRect(t,this.config.width,this.config.height),u=recordlyRecordedRect?{width:recordlyRecordedRect.width,height:recordlyRecordedRect.height}:recordlyModernWebcamFrameSize',
    'recordlyRecordedRect=recordlyModernRecordedWebcamRect(t,this.config.width,this.config.height,this.animationState.appliedScale||1),u=recordlyRecordedRect?{width:recordlyRecordedRect.width,height:recordlyRecordedRect.height}:recordlyModernWebcamFrameSize',
    "modern exporter recorded rect uses current zoom scale",
  );

  write(file, text);
}

function patchVerify() {
  let text = read(verifyPath);

  text = replaceAll(text, 'assertIncludes(rendererPath, "recordlyRotateWebcamClip", "desktop webcam rotate action");\n', "");
  text = replaceAll(text, 'assertIncludes(rendererPath, "Rotate webcam frame 90 degrees", "desktop webcam rotate toolbar button");\n', "");

  const marker = 'assertNotIncludes(rendererPath, "Rotate webcam frame 90 degrees", "editor webcam ROT toolbar button");';
  if (!text.includes(marker)) {
    text = text.replace(
      'assertNotIncludes(rendererPath, "onWebcamChange:recordlySetWebcamAtCurrentTime", "editor webcam time-segment writer prop");',
      'assertNotIncludes(rendererPath, "onWebcamChange:recordlySetWebcamAtCurrentTime", "editor webcam time-segment writer prop");\nassertNotIncludes(rendererPath, "recordlyRotateWebcamClip", "editor webcam rotate action");\nassertNotIncludes(rendererPath, "Rotate webcam frame 90 degrees", "editor webcam ROT toolbar button");\nassertIncludes(rendererPath, "recordlyRecordedWebcamRect(e,a,t,n=1)", "recorded webcam rect reacts to zoom");\nassertIncludes(modernExporterPath, "recordlyModernRecordedWebcamRect(e,t,i,a=1)", "export recorded webcam rect reacts to zoom");',
    );
  }

  write(verifyPath, text);
}

const rendererPath = activeRendererPath();
const modernExporterPath = activeModernExporterPath(rendererPath);
patchRenderer(rendererPath);
patchModernExporter(modernExporterPath);
patchVerify();

console.log(`webcam react-to-zoom restored and editor ROT removed: ${path.basename(rendererPath)}`);

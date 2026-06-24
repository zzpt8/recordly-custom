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
  if (text.includes(replace)) return text;
  const count = text.split(search).length - 1;
  if (count !== 1) throw new Error(`Expected 1 match for ${label}, found ${count}`);
  return text.replace(search, replace);
}

function patchRenderer(file) {
  let text = read(file);
  text = replaceOnce(
    text,
    'const g=("displayWidth"in H?H.displayWidth:"videoWidth"in H?H.videoWidth:H.width)||m.width,M=("displayHeight"in H?H.displayHeight:"videoHeight"in H?H.videoHeight:H.height)||m.height,{sx:V,sy:f,sw:E,sh:v}=cRa(n.cropRegion,g,M),L=Math.max(m.width/E,m.height/v),w=E*L,y=v*L,b=(m.width-w)/2,F=(m.height-y)/2,recordlyFallbackWebcamRotation=Tka(n.rotation)?((n.rotation%360)+360)%360:0;',
    'const g=("displayWidth"in H?H.displayWidth:"videoWidth"in H?H.videoWidth:H.width)||m.width,M=("displayHeight"in H?H.displayHeight:"videoHeight"in H?H.videoHeight:H.height)||m.height,{sx:V,sy:f,sw:E,sh:v}=cRa(n.cropRegion,g,M),recordlyPhoneWebcamContain="phone-camera"===n.sourceKind,L=recordlyPhoneWebcamContain?Math.min(m.width/E,m.height/v):Math.max(m.width/E,m.height/v),w=E*L,y=v*L,b=(m.width-w)/2,F=(m.height-y)/2,recordlyFallbackWebcamRotation=Tka(n.rotation)?((n.rotation%360)+360)%360:0;',
    "editor phone camera webcam contain draw",
  );
  write(file, text);
}

function patchModernExporter(file) {
  let text = read(file);
  text = replaceOnce(
    text,
    'function Ye(e,t,i,a,o,n,s,r=!1){const c=Math.max(1,t),h=Math.max(1,i),d=Math.max(a/c,o/h);e.anchor.set(.5),e.position.set(n,s),e.scale.set(d*(r?-1:1),d)}',
    'function Ye(e,t,i,a,o,n,s,r=!1,c=!1){const h=Math.max(1,t),d=Math.max(1,i),u=c?Math.min(a/h,o/d):Math.max(a/h,o/d);e.anchor.set(.5),e.position.set(n,s),e.scale.set(u*(r?-1:1),u)}',
    "modern exporter fit helper supports contain",
  );
  text = replaceOnce(
    text,
    'Ye(this.webcamSprite,e.sourceWidth,e.sourceHeight,e.width,e.height,e.width/2,e.height/2,e.mirror),this.webcamMaskGraphics.clear()',
    'Ye(this.webcamSprite,e.sourceWidth,e.sourceHeight,e.width,e.height,e.width/2,e.height/2,e.mirror,e.contain),this.webcamMaskGraphics.clear()',
    "modern exporter applies webcam contain flag",
  );
  text = replaceOnce(
    text,
    'sourceWidth:h.width,sourceHeight:h.height,width:u.width,height:u.height,size:u.height,positionX:l.x,positionY:l.y,radius:m,shadowStrength:g,mirror:t.mirror,rotation:Number.isFinite(t.rotation)?((t.rotation%360)+360)%360:0',
    'sourceWidth:h.width,sourceHeight:h.height,width:u.width,height:u.height,size:u.height,positionX:l.x,positionY:l.y,radius:m,shadowStrength:g,mirror:t.mirror,contain:"phone-camera"===t.sourceKind,rotation:Number.isFinite(t.rotation)?((t.rotation%360)+360)%360:0',
    "modern exporter marks phone camera contain",
  );
  write(file, text);
}

function patchVerify(file) {
  let text = read(file);
  text = replaceOnce(
    text,
    'assertIncludes(rendererPath, "object-contain bg-black", "settings webcam preview does not crop");',
    'assertIncludes(rendererPath, "object-contain bg-black", "settings webcam preview does not crop");\nassertIncludes(rendererPath, "recordlyPhoneWebcamContain", "editor phone camera preview uses contain");\nassertIncludes(modernExporterPath, \'contain:"phone-camera"===t.sourceKind\', "export phone camera uses contain");',
    "verify phone camera contain preview/export",
  );
  write(file, text);
}

const rendererPath = activeRendererPath();
patchRenderer(rendererPath);
patchModernExporter(activeModernExporterPath(rendererPath));
patchVerify(verifyPath);

console.log("phone camera contain preview/export patch applied");

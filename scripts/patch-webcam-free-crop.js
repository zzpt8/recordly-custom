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

function replaceOnce(text, search, replace, label, file) {
  if (text.includes(replace)) return { text, changed: false };
  const count = text.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`${path.relative(root, file)}: expected 1 match for ${label}, found ${count}`);
  }
  return { text: text.replace(search, replace), changed: true };
}

function patchRenderer(file) {
  let text = read(file);
  let changed = false;

  const oldCropMath =
    'function pUa(e,a){const t=rRa(e),n=Number.isFinite(a)&&a>0?a:1,l=Math.min(1,1/n),r=Math.min(hUa,l),o=ZUa(Math.min(t.width,t.height/n),r,l),c=o*n,i=t.x+t.width/2,m=t.y+t.height/2;return{x:ZUa(i-o/2,0,1-o),y:ZUa(m-c/2,0,1-c),width:o,height:c}}function AUa(e,a){const t=pUa(e,a);return{...t,x:ZUa(1-t.x-t.width,0,1-t.width)}}function HUa(e,a,t,n,l){const r=Number.isFinite(l)&&l>0?l:1,o=pUa(e,r),c=Math.min(hUa,Math.min(1,1/r));if("move"===a)return pUa({...o,x:ZUa(o.x+t,0,1-o.width),y:ZUa(o.y+n,0,1-o.height)},r);let i=o.x,m=o.y,s=o.x+o.width,d=o.y+o.height;if("nw"===a){const e=Math.max(t,n/r),a=ZUa(o.width-e,c,Math.min(s,d/r));i=s-a,m=d-a*r}if("ne"===a){const e=Math.max(t,-n/r),a=ZUa(o.width+e,c,Math.min(1-i,d/r));s=i+a,m=d-a*r}if("sw"===a){const e=Math.max(-t,n/r),a=ZUa(o.width+e,c,Math.min(s,(1-m)/r));i=s-a,d=m+a*r}if("se"===a){const e=Math.max(t,n/r),a=ZUa(o.width+e,c,Math.min(1-i,(1-m)/r));s=i+a,d=m+a*r}return pUa({x:i,y:m,width:s-i,height:d-m},r)}';
  const newCropMath =
    'function recordlyWebcamFreeCrop(e){const a=rRa(e),t=ZUa(a.x,0,1-hUa),n=ZUa(a.y,0,1-hUa),l=ZUa(a.width,hUa,1-t),r=ZUa(a.height,hUa,1-n);return{x:t,y:n,width:l,height:r}}function pUa(e,a){return recordlyWebcamFreeCrop(e)}function AUa(e,a){const t=recordlyWebcamFreeCrop(e);return{...t,x:ZUa(1-t.x-t.width,0,1-t.width)}}function HUa(e,a,t,n,l){const r=recordlyWebcamFreeCrop(e);if("move"===a)return recordlyWebcamFreeCrop({...r,x:ZUa(r.x+t,0,1-r.width),y:ZUa(r.y+n,0,1-r.height)});let o=r.x,c=r.y,i=r.x+r.width,m=r.y+r.height;if("nw"===a)o=ZUa(r.x+t,0,i-hUa),c=ZUa(r.y+n,0,m-hUa);if("ne"===a)i=ZUa(r.x+r.width+t,o+hUa,1),c=ZUa(r.y+n,0,m-hUa);if("sw"===a)o=ZUa(r.x+t,0,i-hUa),m=ZUa(r.y+r.height+n,c+hUa,1);if("se"===a)i=ZUa(r.x+r.width+t,o+hUa,1),m=ZUa(r.y+r.height+n,c+hUa,1);return recordlyWebcamFreeCrop({x:o,y:c,width:i-o,height:m-c})}';
  ({ text, changed: changedNow } = replaceOnce(text, oldCropMath, newCropMath, "free webcam crop resize", file));
  changed = changed || changedNow;

  if (changed) write(file, text);
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

function patchVerify(file) {
  let text = read(file);
  let changed = false;
  const anchor = 'assertIncludes(rendererPath, "object-contain bg-black", "settings webcam preview does not crop");';
  const replacement =
    'assertIncludes(rendererPath, "object-contain bg-black", "settings webcam preview does not crop");\nassertIncludes(rendererPath, "recordlyWebcamFreeCrop", "settings webcam crop can resize freely");';
  ({ text, changed: changedNow } = replaceOnce(text, anchor, replacement, "verify free webcam crop", file));
  changed = changed || changedNow;
  if (changed) write(file, text);
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

let changedNow = false;
patchRenderer(activeRendererPath());
patchVerify(verifyPath);

console.log("webcam free crop patch applied");

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

function patch(file) {
  const search =
    'ref:Ye,src:D,className:"pointer-events-none absolute inset-0 block h-full w-full object-fill",muted:!0,playsInline:!0,preload:"auto","aria-hidden":"true",onLoadedMetadata:Gt,onLoadedData:Gt})})})}),u?null:W.jsx("div",{"data-recordly-webcam-handle":"resize"';
  const replace =
    'ref:Ye,src:D,className:"pointer-events-none absolute inset-0 block h-full w-full object-cover",muted:!0,playsInline:!0,preload:"auto","aria-hidden":"true",onLoadedMetadata:Gt,onLoadedData:Gt})})})}),u?null:W.jsx("div",{"data-recordly-webcam-handle":"resize"';

  const text = read(file);
  if (text.includes(replace)) {
    console.log(`unchanged ${path.relative(root, file)}`);
    return;
  }
  const count = text.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`${path.basename(file)}: expected 1 editor webcam object-fill match, found ${count}`);
  }
  write(file, text.replace(search, replace));
  console.log(`patched ${path.relative(root, file)}`);
}

patch(path.join(assetsDir, "index-Bg4OucLc.js"));
patch(activeRendererPath());

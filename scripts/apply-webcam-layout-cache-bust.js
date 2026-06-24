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

function replaceAll(text, search, replacement, label) {
  if (!text.includes(search)) {
    throw new Error(`Missing ${label}: ${search}`);
  }
  return text.split(search).join(replacement);
}

const html = read(htmlPath);
const indexMatch = html.match(/\.\/assets\/([^"]+\.js)/);
if (!indexMatch) {
  throw new Error("Could not find renderer script in dist/index.html");
}

const currentIndexName = indexMatch[1];
const currentIndexPath = path.join(assetsDir, currentIndexName);
const indexText = read(currentIndexPath);
const modernMatch = indexText.match(/modernVideoExporter[^"'`]+\.js/);
if (!modernMatch) {
  throw new Error(`Could not find modern exporter import in ${currentIndexName}`);
}

const currentModernName = modernMatch[0];
const currentModernPath = path.join(assetsDir, currentModernName);
const modernText = read(currentModernPath);
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const newIndexName = `index-webcam-layout-${stamp}.js`;
const newModernName = `modernVideoExporter-webcam-layout-${stamp}.js`;

const nextIndexText = replaceAll(
  indexText,
  currentModernName,
  newModernName,
  "modern exporter import"
);
const nextModernText = replaceAll(
  modernText,
  `./${currentIndexName}`,
  `./${newIndexName}`,
  "modern exporter main bundle import"
);
const nextHtml = replaceAll(
  html,
  `./assets/${currentIndexName}`,
  `./assets/${newIndexName}`,
  "renderer script"
);

write(path.join(assetsDir, newIndexName), nextIndexText);
write(path.join(assetsDir, newModernName), nextModernText);
write(htmlPath, nextHtml);

console.log(`renderer: ${currentIndexName} -> ${newIndexName}`);
console.log(`modern exporter: ${currentModernName} -> ${newModernName}`);

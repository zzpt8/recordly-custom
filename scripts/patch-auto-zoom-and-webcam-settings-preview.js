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
    'f=V&&g&&g.width>0&&g.height>0?g.width/g.height:1,E=pUa(a,f),v=t?AUa(E,f):E,L=A??v',
    'f=V&&g&&g.width>0&&g.height>0?g.width/g.height:1,recordlyWebcamFullCrop=a&&a.x<=.001&&a.y<=.001&&a.width>=.999&&a.height>=.999,E=recordlyWebcamFullCrop?rRa(a):pUa(a,f),v=t&&!recordlyWebcamFullCrop?AUa(E,f):E,L=A??v',
    "webcam settings preview keeps full crop",
  );

  text = replaceOnce(
    text,
    'const n=t?AUa(e,f):e;if(a)return C(),d.current=null,void c(n);d.current=n',
    'const n=t&&!(e&&e.x<=.001&&e.y<=.001&&e.width>=.999&&e.height>=.999)?AUa(e,f):e;if(a)return C(),d.current=null,void c(n);d.current=n',
    "webcam crop change keeps full crop when mirrored",
  );

  text = replaceOnce(
    text,
    'W.jsx("video",{ref:m,src:n,className:"pointer-events-none absolute inset-0 block h-full w-full object-fill"',
    'W.jsx("video",{ref:m,src:n,className:"pointer-events-none absolute inset-0 block h-full w-full object-contain bg-black"',
    "webcam settings preview uses contain",
  );

  text = replaceOnce(
    text,
    'W.jsx(gUa,{cropRegion:Lt,mirrored:ke?.mirror??!0,previewSrc:Pe,previewCurrentTime:Te,previewPlaying:De,previewTimeOffsetMs:ke?.timeOffsetMs,onCropChange:e=>Gt({cropRegion:e})})',
    'W.jsx(gUa,{cropRegion:"phone-camera"===ke?.sourceKind?lxa:Lt,mirrored:ke?.mirror??!0,previewSrc:Pe,previewCurrentTime:Te,previewPlaying:De,previewTimeOffsetMs:ke?.timeOffsetMs,onCropChange:e=>"phone-camera"===ke?.sourceKind?Gt({cropRegion:lxa}):Gt({cropRegion:e})})',
    "phone camera settings crop is locked to full frame",
  );

  text = replaceOnce(
    text,
    'g=e.useCallback(()=>{m&&0!==m&&0!==s&&H(d)},[m,s,d,H]),M=e.useCallback(()=>{if(!m||0===m||0===s)return;if(Z)return void OJa.info("Suggested zooms are unavailable while cursor looping is enabled.");if(!i)return void OJa.error("Zoom suggestion handler unavailable");if(n.length<2)return void OJa.info("No cursor telemetry available","Record a screencast first to generate cursor-based suggestions.");if(Math.min(p,s)<=0)return;const e=lQa({cursorTelemetry:n,totalMs:s,reservedSpans:h.map(e=>({start:e.startMs,end:e.endMs})).sort((e,a)=>e.start-a.start)});if("no-telemetry"!==e.status)if("no-interactions"!==e.status)if("no-slots"!==e.status&&0!==e.suggestions.length){for(const a of e.suggestions)i({start:a.start,end:a.end},a.focus);OJa.success(`Added ${e.suggestions.length} interaction-based zoom suggestion${1===e.suggestions.length?"":"s"}`)}else OJa.info("No auto-zoom slots available","Detected dwell points overlap existing zoom regions.");else OJa.info("No clear interaction moments found","Try a recording with pauses or clicks around important actions.");else OJa.info("No usable cursor telemetry","The recording does not include enough cursor movement data.")},[m,s,Z,i,n,p,h]);',
    'g=e.useCallback(()=>{m&&0!==m&&0!==s&&H(d)},[m,s,d,H]),V=e.useCallback(()=>{if(!m||0===m||0===s)return!1;const e=Math.min(p,s);if(e<=0)return!1;const a=Math.max(0,s-e),t=[d,.15*s,.3*s,.5*s,.7*s,.85*s,0].map(e=>Math.max(0,Math.min(e,a))).find(e=>A(e));return Number.isFinite(t)?(c({start:t,end:t+e}),OJa.success("Added 1 automatic zoom suggestion"),!0):(OJa.info("No auto-zoom slots available","The timeline is already full around the available zoom points."),!1)},[m,s,p,d,A,c]),M=e.useCallback(()=>{if(!m||0===m||0===s)return;if(Z)return void OJa.info("Suggested zooms are unavailable while cursor looping is enabled.");if(!i)return void OJa.error("Zoom suggestion handler unavailable");if(n.length<2)return void V();if(Math.min(p,s)<=0)return;const e=lQa({cursorTelemetry:n,totalMs:s,reservedSpans:h.map(e=>({start:e.startMs,end:e.endMs})).sort((e,a)=>e.start-a.start)});if("no-telemetry"!==e.status)if("no-interactions"!==e.status)if("no-slots"!==e.status&&0!==e.suggestions.length){for(const a of e.suggestions)i({start:a.start,end:a.end},a.focus);OJa.success(`Added ${e.suggestions.length} interaction-based zoom suggestion${1===e.suggestions.length?"":"s"}`)}else V();else V();else V()},[m,s,Z,i,n,p,h,V]);',
    "suggest zooms fallback when telemetry is unavailable",
  );

  write(file, text);
}

function patchVerify(file) {
  let text = read(file);
  text = replaceOnce(
    text,
    'assertIncludes(rendererPath, "recordlyRecordedWebcamRect(e,a,t,n=1)", "recorded webcam rect reacts to zoom");',
    'assertIncludes(rendererPath, "recordlyRecordedWebcamRect(e,a,t,n=1)", "recorded webcam rect reacts to zoom");\nassertIncludes(rendererPath, "recordlyWebcamFullCrop", "settings webcam preview keeps full crop");\nassertIncludes(rendererPath, "object-contain bg-black", "settings webcam preview does not crop");\nassertIncludes(rendererPath, "Added 1 automatic zoom suggestion", "suggest zoom fallback creates a zoom");',
    "verify auto zoom and settings webcam preview",
  );
  write(file, text);
}

patchRenderer(activeRendererPath());
patchVerify(verifyPath);

console.log("auto zoom and webcam settings preview patch applied");

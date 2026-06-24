const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "asar-inspect", "dist");
const assetsDir = path.join(distDir, "assets");
const htmlPath = path.join(distDir, "index.html");
const fixedRendererPath = path.join(assetsDir, "index-webcam-layout-20260621182027.js");

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

function replaceOnce(text, search, replace, label, file) {
  if (text.includes(replace) && !text.includes(search)) {
    return { text, changed: false };
  }
  const count = text.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`${path.basename(file)}: expected 1 match for ${label}, found ${count}`);
  }
  return { text: text.replace(search, replace), changed: true };
}

function patch(file) {
  let text = read(file);
  let changed = false;

  const replacements = [
    {
      label: "global defaults include zoomClassicMode",
      search:
        "cameraSpringMassMultiplier:tja.cameraSpringMassMultiplier,cursorMotionBlur:tja.cursorMotionBlur",
      replace:
        "cameraSpringMassMultiplier:tja.cameraSpringMassMultiplier,zoomClassicMode:tja.zoomClassicMode,cursorMotionBlur:tja.cursorMotionBlur",
    },
    {
      label: "global prefs normalizer input includes zoomClassicMode",
      search:
        "cameraSpringMassMultiplier:t.cameraSpringMassMultiplier??a.cameraSpringMassMultiplier,cursorMotionBlur:t.cursorMotionBlur??a.cursorMotionBlur",
      replace:
        "cameraSpringMassMultiplier:t.cameraSpringMassMultiplier??a.cameraSpringMassMultiplier,zoomClassicMode:t.zoomClassicMode??a.zoomClassicMode,cursorMotionBlur:t.cursorMotionBlur??a.cursorMotionBlur",
    },
    {
      label: "global prefs normalizer output includes zoomClassicMode",
      search:
        "cameraSpringMassMultiplier:n.cameraSpringMassMultiplier,cursorMotionBlur:n.cursorMotionBlur",
      replace:
        "cameraSpringMassMultiplier:n.cameraSpringMassMultiplier,zoomClassicMode:n.zoomClassicMode,cursorMotionBlur:n.cursorMotionBlur",
    },
    {
      label: "global save effect includes zoomClassicMode",
      search:
        "pja({wallpaper:N,shadowIntensity:P,backgroundBlur:D,zoomMotionBlur:G,zoomMotionBlurTuning:B,zoomTemporalMotionBlur:U,zoomMotionBlurSampleCount:Y,zoomMotionBlurShutterFraction:J,autoApplyFreshRecordingAutoZooms:_,connectZooms:$,zoomInDurationMs:ae,zoomInOverlapMs:ne,zoomOutDurationMs:re,connectedZoomGapMs:ce,connectedZoomDurationMs:me,zoomInEasing:de,zoomOutEasing:ue,connectedZoomEasing:pe,showCursor:He,loopCursor:Me,cursorStyle:fe,cursorSize:ve,cursorSmoothing:we,cursorSpringStiffnessMultiplier:be,cursorSpringDampingMultiplier:Ce,cursorSpringMassMultiplier:Ie,cameraSpringStiffnessMultiplier:Re,cameraSpringDampingMultiplier:ke,cameraSpringMassMultiplier:Te,cursorMotionBlur:Je,cursorClickEffect:_e,cursorClickEffectColor:$e,cursorClickEffectScale:aa,cursorClickEffectOpacity:na,cursorClickEffectDurationMs:ra,cursorClickBounce:ca,cursorClickBounceDuration:ma,cursorSway:da,borderRadius:ua,padding:pa,frame:Ha,webcam:fa,autoCaptionSettings:rt,aspectRatio:It,exportEncodingMode:Tt,exportBackendPreference:zt,exportPipelineModel:jt,exportQuality:kt,mp4FrameRate:Yt,exportFormat:Jt,gifFrameRate:_t,gifLoop:$t,gifSizePreset:an,whisperExecutablePath:ct,whisperModelPath:mt})",
      replace:
        "pja({wallpaper:N,shadowIntensity:P,backgroundBlur:D,zoomMotionBlur:G,zoomMotionBlurTuning:B,zoomTemporalMotionBlur:U,zoomMotionBlurSampleCount:Y,zoomMotionBlurShutterFraction:J,autoApplyFreshRecordingAutoZooms:_,connectZooms:$,zoomInDurationMs:ae,zoomInOverlapMs:ne,zoomOutDurationMs:re,connectedZoomGapMs:ce,connectedZoomDurationMs:me,zoomInEasing:de,zoomOutEasing:ue,connectedZoomEasing:pe,showCursor:He,loopCursor:Me,cursorStyle:fe,cursorSize:ve,cursorSmoothing:we,cursorSpringStiffnessMultiplier:be,cursorSpringDampingMultiplier:Ce,cursorSpringMassMultiplier:Ie,cameraSpringStiffnessMultiplier:Re,cameraSpringDampingMultiplier:ke,cameraSpringMassMultiplier:Te,zoomClassicMode:Ye,cursorMotionBlur:Je,cursorClickEffect:_e,cursorClickEffectColor:$e,cursorClickEffectScale:aa,cursorClickEffectOpacity:na,cursorClickEffectDurationMs:ra,cursorClickBounce:ca,cursorClickBounceDuration:ma,cursorSway:da,borderRadius:ua,padding:pa,frame:Ha,webcam:fa,autoCaptionSettings:rt,aspectRatio:It,exportEncodingMode:Tt,exportBackendPreference:zt,exportPipelineModel:jt,exportQuality:kt,mp4FrameRate:Yt,exportFormat:Jt,gifFrameRate:_t,gifLoop:$t,gifSizePreset:an,whisperExecutablePath:ct,whisperModelPath:mt})",
    },
  ];

  for (const item of replacements) {
    const result = replaceOnce(text, item.search, item.replace, item.label, file);
    text = result.text;
    changed = changed || result.changed;
  }

  if (changed) {
    write(file, text);
  }

  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

const targets = new Set([fixedRendererPath, activeRendererPath()]);
for (const file of targets) {
  patch(file);
}

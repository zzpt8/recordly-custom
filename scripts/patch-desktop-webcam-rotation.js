const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "asar-inspect", "dist");
const assetsDir = path.join(distDir, "assets");
const htmlPath = path.join(distDir, "index.html");
const mainPath = path.join(root, "asar-inspect", "dist-electron", "main.cjs");
const phonePatchPath = path.join(root, "scripts", "patch-phone-camera.js");
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
  if (!match) throw new Error("active renderer missing modern exporter dependency");
  return path.join(path.dirname(rendererPath), match[1].replace(/^\.\//, ""));
}

function replaceOnce(text, search, replace, label) {
  if (text.includes(replace)) return text;
  const index = text.indexOf(search);
  if (index < 0) throw new Error(`Missing ${label}`);
  return text.slice(0, index) + replace + text.slice(index + search.length);
}

function replaceAll(text, search, replace, label) {
  if (!text.includes(search)) {
    if (text.includes(replace)) return text;
    throw new Error(`Missing ${label}`);
  }
  return text.split(search).join(replace);
}

function removePhoneSideRotation(file) {
  let text = read(file);

  text = replaceAll(
    text,
    "grid-template-columns:repeat(3,minmax(0,1fr))",
    "grid-template-columns:1fr 1fr",
    `${file} mobile controls two columns`,
  );
  text = replaceAll(
    text,
    '<button id="rotate" class="secondary">旋转画面</button>',
    "",
    `${file} remove phone rotate button`,
  );
  text = replaceAll(
    text,
    ',rot=document.getElementById("rotate")',
    "",
    `${file} remove phone rotate element`,
  );
  text = replaceAll(
    text,
    ',rotation=0',
    "",
    `${file} remove phone rotation state`,
  );
  const rotatedPhoneDraw =
    'const vw=v.videoWidth||1280,vh=v.videoHeight||720,rotated=rotation%180!==0,baseW=rotated?vh:vw,baseH=rotated?vw:vh,scale=960/Math.max(baseW,baseH),w=Math.max(2,Math.round(baseW*scale)),h=Math.max(2,Math.round(baseH*scale));canvas.width=w;canvas.height=h;ctx.save();ctx.clearRect(0,0,w,h);if(rotation===90){ctx.translate(w,0);ctx.rotate(Math.PI/2);ctx.drawImage(v,0,0,h,w)}else if(rotation===180){ctx.translate(w,h);ctx.rotate(Math.PI);ctx.drawImage(v,0,0,w,h)}else if(rotation===270){ctx.translate(0,h);ctx.rotate(-Math.PI/2);ctx.drawImage(v,0,0,h,w)}else ctx.drawImage(v,0,0,w,h);ctx.restore();';
  const legacyPhoneDraw =
    'const vw=v.videoWidth||1280,vh=v.videoHeight||720,scale=960/Math.max(vw,vh),w=Math.max(2,Math.round(vw*scale)),h=Math.max(2,Math.round(vh*scale));canvas.width=w;canvas.height=h;ctx.drawImage(v,0,0,w,h);';
  const smoothPhoneDraw =
    'const vw=v.videoWidth||1280,vh=v.videoHeight||720,maxEdge=720,scale=Math.min(1,maxEdge/Math.max(vw,vh)),w=Math.max(2,Math.round(vw*scale)),h=Math.max(2,Math.round(vh*scale));if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;ctx.drawImage(v,0,0,w,h);';
  if (text.includes(rotatedPhoneDraw)) {
    text = text.split(rotatedPhoneDraw).join(legacyPhoneDraw);
  } else if (!text.includes(legacyPhoneDraw) && !text.includes(smoothPhoneDraw)) {
    throw new Error(`Missing ${file} restore phone frame draw`);
  }
  text = replaceAll(
    text,
    'rot.onclick=()=>{rotation=(rotation+90)%360;rot.textContent=rotation?"已转 "+rotation+"°":"旋转画面";setStatus(rotation?"已旋转 "+rotation+"°，正在传回 Recordly":"已恢复默认方向，正在传回 Recordly");showControls()};',
    "",
    `${file} remove phone rotate action`,
  );

  write(file, text);
}

function patchRenderer(file) {
  let text = read(file);

  text = replaceOnce(
    text,
    'Number.isFinite(t.shadow)&&(n.shadow=eRa(t.shadow,0,1)),"custom"===t.positionPreset&&(n.positionPreset="custom"),a.push(n)',
    'Number.isFinite(t.shadow)&&(n.shadow=eRa(t.shadow,0,1)),Number.isFinite(t.rotation)&&(n.rotation=((t.rotation%360)+360)%360),"custom"===t.positionPreset&&(n.positionPreset="custom"),a.push(n)',
    "webcam keyframe rotation normalization",
  );
  text = replaceOnce(
    text,
    'aspectRatio:recordlyWebcamAspectRatio(t)};return Number.isFinite(t.margin)&&(l.margin=eRa(t.margin,0,96)),Number.isFinite(t.cornerRadius)&&(l.cornerRadius=eRa(t.cornerRadius,0,180)),Number.isFinite(t.shadow)&&(l.shadow=eRa(t.shadow,0,1)),recordlyWebcamNormalizeLayoutKeyframes([...n,l])',
    'aspectRatio:recordlyWebcamAspectRatio(t)};return Number.isFinite(t.rotation)&&(l.rotation=((t.rotation%360)+360)%360),Number.isFinite(t.margin)&&(l.margin=eRa(t.margin,0,96)),Number.isFinite(t.cornerRadius)&&(l.cornerRadius=eRa(t.cornerRadius,0,180)),Number.isFinite(t.shadow)&&(l.shadow=eRa(t.shadow,0,1)),recordlyWebcamNormalizeLayoutKeyframes([...n,l])',
    "webcam keyframe rotation upsert",
  );
  text = replaceOnce(
    text,
    'const c=["positionPreset","positionX","positionY","size","aspectRatio"],',
    'const c=["positionPreset","positionX","positionY","size","aspectRatio","rotation"],',
    "webcam current-time rotation update field",
  );
  if (text.includes("recordlyFullscreenWebcamClip")) {
    text = replaceOnce(
      text,
      'shadow:0},c={timeMs:t+1,positionPreset:"custom",positionX:n.positionX??1,positionY:n.positionY??1,size:n.size??40,aspectRatio:n.aspectRatio??16/9,margin:n.margin??24,cornerRadius:n.cornerRadius??18,shadow:n.shadow??UCa};Ea',
      'shadow:0,rotation:n.rotation??0},c={timeMs:t+1,positionPreset:"custom",positionX:n.positionX??1,positionY:n.positionY??1,size:n.size??40,aspectRatio:n.aspectRatio??16/9,margin:n.margin??24,cornerRadius:n.cornerRadius??18,shadow:n.shadow??UCa,rotation:n.rotation??0};Ea',
      "preserve webcam rotation in full-screen clip keyframes",
    );
  }
  if (text.includes("recordlyFullscreenWebcamClip")) {
    text = replaceOnce(
      text,
      '},[fa,Ta,ka,Vr,It]),Yr=e.useCallback',
      '},[fa,Ta,ka,Vr,It]),recordlyRotateWebcamClip=e.useCallback(()=>{if(!fa?.sourcePath)return void JEa.warning("No webcam footage in this recording.");const recordlyRotationTimeMs=Math.max(0,Math.round(1e3*x)),recordlyRotationLayout=recordlyWebcamLayoutAt(fa,recordlyRotationTimeMs)??fa,recordlyRotationCurrent=Number.isFinite(recordlyRotationLayout?.rotation)?recordlyRotationLayout.rotation:0,recordlyRotationNext=(recordlyRotationCurrent+90)%360,recordlyRotationPatch={positionPreset:recordlyRotationLayout?.positionPreset??"custom",positionX:recordlyRotationLayout?.positionX??1,positionY:recordlyRotationLayout?.positionY??1,size:recordlyRotationLayout?.size??40,aspectRatio:recordlyRotationLayout?.aspectRatio??16/9,margin:recordlyRotationLayout?.margin??24,cornerRadius:recordlyRotationLayout?.cornerRadius??18,shadow:recordlyRotationLayout?.shadow??UCa,rotation:recordlyRotationNext};Ea(e=>({...e,enabled:!0,rotation:recordlyRotationNext,layoutKeyframes:recordlyWebcamUpsertLayoutKeyframe(e,recordlyRotationTimeMs,recordlyRotationPatch)})),JEa.success("Webcam frame rotated.")},[fa,x,Ea]),Yr=e.useCallback',
      "desktop webcam rotate action",
    );
    text = replaceOnce(
      text,
      'W.jsx(Jva,{onClick:recordlyFullscreenWebcamClip,variant:"ghost",size:"icon",className:"h-7 w-7 rounded-full text-muted-foreground transition-all hover:bg-[#2563EB]/10 hover:text-[#2563EB]",title:"Webcam full screen for selected clip",children:W.jsx("span",{className:"text-[9px] font-bold leading-none",children:"CAM"})}),W.jsx(Jva,{onClick:()=>tl.current?.splitClip()',
      'W.jsx(Jva,{onClick:recordlyFullscreenWebcamClip,variant:"ghost",size:"icon",className:"h-7 w-7 rounded-full text-muted-foreground transition-all hover:bg-[#2563EB]/10 hover:text-[#2563EB]",title:"Webcam full screen for selected clip",children:W.jsx("span",{className:"text-[9px] font-bold leading-none",children:"CAM"})}),W.jsx(Jva,{onClick:recordlyRotateWebcamClip,variant:"ghost",size:"icon",className:"h-7 w-7 rounded-full text-muted-foreground transition-all hover:bg-[#2563EB]/10 hover:text-[#2563EB]",title:"Rotate webcam frame 90 degrees",children:W.jsx("span",{className:"text-[9px] font-bold leading-none",children:"ROT"})}),W.jsx(Jva,{onClick:()=>tl.current?.splitClip()',
      "desktop webcam rotate toolbar button",
    );
  }
  text = replaceOnce(
    text,
    'yt=recordlyActiveWebcam?.shadow??UCa,bt=recordlyActiveWebcam?.timeOffsetMs',
    'yt=recordlyActiveWebcam?.shadow??UCa,recordlyWebcamRotation=Number.isFinite(recordlyActiveWebcam?.rotation)?((recordlyActiveWebcam.rotation%360)+360)%360:0,bt=recordlyActiveWebcam?.timeOffsetMs',
    "active webcam rotation value",
  );
  text = replaceOnce(
    text,
    'a.style.aspectRatio=`${l.width} / ${l.height}`;const c=LSa',
    'a.style.aspectRatio=`${l.width} / ${l.height}`,a.style.transform=`rotate(${recordlyWebcamRotation}deg)`,a.style.transformOrigin="center center";const c=LSa',
    "preview webcam rotation style",
  );
  text = replaceOnce(
    text,
    '[Lt,wt,Ht,gt,ft,Et,vt,Vt,yt,Mt,D,recordlyWebcamAspect]),St=',
    '[Lt,wt,Ht,gt,ft,Et,vt,Vt,yt,Mt,D,recordlyWebcamAspect,recordlyWebcamRotation]),St=',
    "preview layout rotation dependency",
  );
  text = replaceOnce(
    text,
    'outline:u?"none":"1.5px solid rgba(37,99,235,.85)",boxSizing:"border-box"}',
    'outline:u?"none":"1.5px solid rgba(37,99,235,.85)",boxSizing:"border-box",transform:`rotate(${recordlyWebcamRotation}deg)`,transformOrigin:"center center"}',
    "initial preview webcam rotation style",
  );
  text = replaceOnce(
    text,
    'left:n.left-l.left,top:n.top-l.top,width:n.width,height:n.height,containerWidth:l.width,containerHeight:l.height',
    'left:parseFloat(a.style.left)||n.left-l.left,top:parseFloat(a.style.top)||n.top-l.top,width:parseFloat(a.style.width)||n.width,height:parseFloat(a.style.height)||n.height,containerWidth:l.width,containerHeight:l.height',
    "rotation-safe preview drag metrics",
  );
  text = replaceOnce(
    text,
    'p={positionPreset:"custom",positionX:h,positionY:u,size:d,aspectRatio:recordlyWebcamAspect};recordlyPreviewWebcamChange',
    'p={positionPreset:"custom",positionX:h,positionY:u,size:d,aspectRatio:recordlyWebcamAspect,rotation:recordlyWebcamRotation};recordlyPreviewWebcamChange',
    "persist preview rotation while dragging",
  );
  text = replaceOnce(
    text,
    '[recordlyWebcamPointerMove,T,recordlyPreviewWebcamChange,gt,Vt,recordlyWebcamAspect]);e.useEffect',
    '[recordlyWebcamPointerMove,T,recordlyPreviewWebcamChange,gt,Vt,recordlyWebcamAspect,recordlyWebcamRotation]);e.useEffect',
    "preview drag rotation dependency",
  );
  text = replaceOnce(
    text,
    '[recordlyLayoutKeyframes,recordlySetLayoutKeyframes]=e.useState([]),[recordlyPreviewFullscreen,recordlySetPreviewFullscreen]=e.useState(!1),w=a&&c',
    '[recordlyLayoutKeyframes,recordlySetLayoutKeyframes]=e.useState([]),[recordlyPreviewFullscreen,recordlySetPreviewFullscreen]=e.useState(!1),[recordlyPreviewRotation,recordlySetPreviewRotation]=e.useState(0),w=a&&c',
    "recording webcam preview rotation state",
  );
  text = replaceOnce(
    text,
    'return{...e,margin:24,cornerRadius:18,shadow:UCa,layoutKeyframes:recordlyLayoutKeyframes}},[d,recordlyLayoutKeyframes]),C=e.useMemo',
    'return{...e,margin:24,cornerRadius:18,shadow:UCa,rotation:recordlyPreviewRotation,layoutKeyframes:recordlyLayoutKeyframes}},[d,recordlyLayoutKeyframes,recordlyPreviewRotation]),C=e.useMemo',
    "recording webcam overlay rotation setting",
  );
  text = replaceOnce(
    text,
    '}px`}),[d,recordlyPreviewFullscreen]);e.useEffect',
    '}px`}),[d,recordlyPreviewFullscreen]),recordlyRotatePreview=e.useCallback(e=>{e?.preventDefault?.(),e?.stopPropagation?.(),recordlySetPreviewRotation(e=>(e+90)%360)},[]);e.useEffect',
    "recording webcam rotate handler",
  );
  text = replaceOnce(
    text,
    'H.current&&(H.current.style.transform="translate(0px, 0px)")',
    'H.current&&(H.current.style.transform=`translate(0px, 0px) rotate(${recordlyPreviewRotation}deg)`,H.current.style.transformOrigin="center center")',
    "recording webcam drag preserves rotation",
  );
  text = replaceOnce(
    text,
    '[N,w,recordlyRecordingElapsedSeconds,recordlyPreviewFullscreen]),T=e.useCallback',
    '[N,w,recordlyRecordingElapsedSeconds,recordlyPreviewFullscreen,recordlyPreviewRotation]),T=e.useCallback',
    "recording webcam drag rotation dependency",
  );
  text = replaceOnce(
    text,
    'handleWebcamPreviewWheel:j,setWebcamPreviewNode:B,setRecordingWebcamPreviewNode:X,showRecordingWebcamPreview:w}}',
    'handleWebcamPreviewWheel:j,recordingWebcamPreviewRotation:recordlyPreviewRotation,handleWebcamPreviewRotate:recordlyRotatePreview,setWebcamPreviewNode:B,setRecordingWebcamPreviewNode:X,showRecordingWebcamPreview:w}}',
    "recording webcam rotate hook return",
  );
  text = replaceOnce(
    text,
    'recordingWebcamPreviewFullscreen:recordlyRecordingWebcamFullscreen,recordingWebcamOverlaySettings:me,webcamPreviewDragStartRef:se',
    'recordingWebcamPreviewFullscreen:recordlyRecordingWebcamFullscreen,recordingWebcamPreviewRotation:recordlyRecordingWebcamRotation,recordingWebcamOverlaySettings:me,webcamPreviewDragStartRef:se',
    "recording webcam rotate hook destructure",
  );
  text = replaceOnce(
    text,
    'handleWebcamPreviewWheel:He,setWebcamPreviewNode:ge,setRecordingWebcamPreviewNode:Me}=iLa',
    'handleWebcamPreviewWheel:He,handleWebcamPreviewRotate:recordlyRotateRecordingWebcam,setWebcamPreviewNode:ge,setRecordingWebcamPreviewNode:Me}=iLa',
    "recording webcam rotate handler destructure",
  );
  text = replaceOnce(
    text,
    'style:{...ie,transform:recordlyRecordingWebcamFullscreen?"none":`translate(${re.x}px, ${re.y}px)`}',
    'style:{...ie,transform:recordlyRecordingWebcamFullscreen?`rotate(${recordlyRecordingWebcamRotation}deg)`:`translate(${re.x}px, ${re.y}px) rotate(${recordlyRecordingWebcamRotation}deg)`,transformOrigin:"center center"}',
    "recording webcam preview rotation style",
  );
  text = replaceOnce(
    text,
    'style:{transform:"scaleX(-1)"}}),W.jsx("button",{type:"button",style:recordlyRecordingWebcamFullscreen?{display:"none"}:void 0,className:CLa',
    'style:{transform:"scaleX(-1)"}}),W.jsx("button",{type:"button",style:recordlyRecordingWebcamFullscreen?{display:"none"}:{position:"absolute",right:"8px",top:"8px",width:"28px",height:"28px",borderRadius:"999px",border:"1px solid rgba(255,255,255,.72)",background:"rgba(15,23,42,.78)",color:"#fff",boxShadow:"0 2px 8px rgba(0,0,0,.28)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",lineHeight:"1",cursor:"pointer",backdropFilter:"blur(8px)"},title:"旋转摄像头方向","aria-label":"旋转摄像头方向",onPointerDown:e=>{e.stopPropagation()},onClick:recordlyRotateRecordingWebcam,children:"↻"}),W.jsx("button",{type:"button",style:recordlyRecordingWebcamFullscreen?{display:"none"}:void 0,className:CLa',
    "recording webcam rotate button",
  );

  write(file, text);
}

function patchModernExporter(file) {
  let text = read(file);

  text = replaceOnce(
    text,
    "&&Xe(t.radius,e.radius)&&Xe(t.shadowStrength,e.shadowStrength))",
    "&&Xe(t.radius,e.radius)&&Xe(t.shadowStrength,e.shadowStrength)&&Xe(t.rotation,e.rotation))",
    "exporter webcam layout rotation cache",
  );
  text = replaceOnce(
    text,
    "this.webcamRootContainer.position.set(e.positionX,e.positionY),Ye(this.webcamSprite",
    "this.webcamRootContainer.pivot.set(e.width/2,e.height/2),this.webcamRootContainer.position.set(e.positionX+e.width/2,e.positionY+e.height/2),this.webcamRootContainer.rotation=(Number.isFinite(e.rotation)?e.rotation:0)*Math.PI/180,Ye(this.webcamSprite",
    "exporter webcam root rotation transform",
  );
  text = replaceOnce(
    text,
    "mirror:t.mirror};this.hasMatchingWebcamLayout(p)||this.applyWebcamLayout(p)",
    "mirror:t.mirror,rotation:Number.isFinite(t.rotation)?((t.rotation%360)+360)%360:0};this.hasMatchingWebcamLayout(p)||this.applyWebcamLayout(p)",
    "exporter webcam rotation layout field",
  );

  write(file, text);
}

function patchVerify(file) {
  let text = read(file);

  text = replaceOnce(
    text,
    `function assertIncludes(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) {
    throw new Error(\`${"${path.relative(root, file)}"} missing ${"${label}"}\`);
  }
}
`,
    `function assertIncludes(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) {
    throw new Error(\`${"${path.relative(root, file)}"} missing ${"${label}"}\`);
  }
}

function assertNotIncludes(file, needle, label) {
  const text = read(file);
  if (text.includes(needle)) {
    throw new Error(\`${"${path.relative(root, file)}"} still contains ${"${label}"}\`);
  }
}
`,
    "assertNotIncludes helper",
  );
  text = replaceOnce(
    text,
    'assertIncludes(mainPath, "旋转画面", "mobile phone camera rotate control");',
    'assertNotIncludes(mainPath, "旋转画面", "mobile phone-side rotate control");',
    "verify phone-side rotate removal",
  );
  text = replaceOnce(
    text,
    'const rendererPath = activeRendererPath();',
    'const rendererPath = activeRendererPath();\nconst modernExporterPath = path.join(path.dirname(rendererPath), read(rendererPath).match(/"(\\.\\/modernVideoExporter-[^"]+\\.js)"/)[1].replace(/^\\.\\//, ""));',
    "verify active modern exporter path",
  );
  text = replaceOnce(
    text,
    'assertIncludes(rendererPath, "canvas.height > canvas.width", "phone camera portrait canvas handling");',
    'assertIncludes(rendererPath, "canvas.height > canvas.width", "phone camera portrait canvas handling");\nassertIncludes(rendererPath, "recordlyRotateWebcamClip", "desktop webcam rotate action");\nassertIncludes(rendererPath, "recordlyWebcamRotation", "desktop webcam preview rotation");\nassertIncludes(rendererPath, "Rotate webcam frame 90 degrees", "desktop webcam rotate toolbar button");\nassertIncludes(rendererPath, "旋转摄像头方向", "recording HUD webcam rotate button");\nassertIncludes(rendererPath, "recordingWebcamPreviewRotation", "recording HUD webcam rotation state");\nassertIncludes(modernExporterPath, "webcamRootContainer.rotation", "export webcam rotation");',
    "verify desktop webcam rotation",
  );

  write(file, text);
}

removePhoneSideRotation(mainPath);
removePhoneSideRotation(phonePatchPath);

const rendererPath = activeRendererPath();
const modernExporterPath = activeModernExporterPath(rendererPath);
patchRenderer(rendererPath);
patchModernExporter(modernExporterPath);
patchVerify(verifyPath);

console.log("desktop webcam rotation patch applied");

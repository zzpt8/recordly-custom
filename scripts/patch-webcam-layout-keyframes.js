const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const assetsDir = path.join(root, "asar-inspect", "dist", "assets");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

function replaceOnce(text, search, replacement, label, file) {
  if (text.includes(replacement)) {
    return { text, changed: false, skipped: true };
  }
  const count = text.split(search).length - 1;
  const expected = arguments.length > 5 ? arguments[5] : 1;
  if (count !== expected) {
    throw new Error(`${path.basename(file)}: expected ${expected} match(es) for ${label}, found ${count}`);
  }
  return { text: text.split(search).join(replacement), changed: true, skipped: false };
}

function patchFile(file, patches) {
  let text = read(file);
  let changed = false;
  for (const patch of patches) {
    if (patch.skipIf && text.includes(patch.skipIf)) {
      continue;
    }
    const result = replaceOnce(text, patch.search, patch.replace, patch.label, file, patch.count ?? 1);
    text = result.text;
    changed = changed || result.changed;
  }
  if (changed) {
    write(file, text);
  }
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

const indexPatches = [
  {
    label: "webcam layout helpers",
    search: 'function nRa({containerWidth:e,containerHeight:a,sizePercent:t,margin:n,zoomScale:l,reactToZoom:r}){const o=Math.min(e,a),c=eRa(t,10,100),i=Math.max(0,n),m=Math.max(56,o-2*i),s=o*(c/100)*function(e,a){const t=Number.isFinite(e)&&e>0?e:1;return a?1/t:1}(l,r);return Math.min(m,Math.max(56,s))}function lRa({containerWidth:e,containerHeight:a,size:t,margin:n,positionPreset:l,positionX:r,positionY:o,legacyCorner:c}){const i=Math.max(0,n),m=Math.max(0,e-t-2*i),s=Math.max(0,a-t-2*i),d="custom"===l?{x:eRa(r,0,1),y:eRa(o,0,1)}:aRa(l||c);return{x:i+m*d.x,y:i+s*d.y}}function rRa(e){',
    replace: 'function nRa({containerWidth:e,containerHeight:a,sizePercent:t,margin:n,zoomScale:l,reactToZoom:r}){const o=Math.min(e,a),c=eRa(t,10,100),i=Math.max(0,n),m=Math.max(56,o-2*i),s=o*(c/100)*function(e,a){const t=Number.isFinite(e)&&e>0?e:1;return a?1/t:1}(l,r);return Math.min(m,Math.max(56,s))}function lRa({containerWidth:e,containerHeight:a,size:t,width:n,height:l,margin:r,positionPreset:o,positionX:c,positionY:i,legacyCorner:m}){const s=Math.max(0,r),d=Number.isFinite(n)?n:t,h=Number.isFinite(l)?l:t,u=Math.max(0,e-d-2*s),Z=Math.max(0,a-h-2*s),p="custom"===o?{x:eRa(c,0,1),y:eRa(i,0,1)}:aRa(o||m);return{x:s+u*p.x,y:s+Z*p.y}}function recordlyWebcamAspectRatio(e){const a=Number.isFinite(e?.aspectRatio)?e.aspectRatio:16/9;return eRa(a,1,4)}function recordlyWebcamFrameSize({containerWidth:e,containerHeight:a,sizePercent:t,margin:n,zoomScale:l,reactToZoom:r,aspectRatio:o}){const c=recordlyWebcamAspectRatio({aspectRatio:o}),i=Math.max(0,n),m=nRa({containerWidth:e,containerHeight:a,sizePercent:t,margin:i,zoomScale:l,reactToZoom:r}),s=Math.max(56,Math.min(Math.max(56,a-2*i),Math.max(56,(e-2*i)/c),m));return{width:s*c,height:s}}function recordlyWebcamLayoutAt(e,a){if(!e||"object"!=typeof e)return e;const t=Array.isArray(e.layoutKeyframes)?e.layoutKeyframes:null;if(!t||0===t.length)return e;const n=Number.isFinite(a)?Math.max(0,a):0;let l=null;for(const e of t)e&&Number.isFinite(e.timeMs)&&e.timeMs<=n+1&&(l=e);return l?{...e,...l,layoutKeyframes:t}:e}function recordlyWebcamNormalizeLayoutKeyframes(e){if(!Array.isArray(e))return[];const a=[];for(const t of e){if(!t||"object"!=typeof t)continue;const e=Number.isFinite(t.timeMs)?Math.max(0,Math.round(t.timeMs)):null;if(null===e)continue;const n={timeMs:e};Number.isFinite(t.size)&&(n.size=eRa(t.size,10,100)),Number.isFinite(t.positionX)&&(n.positionX=eRa(t.positionX,0,1)),Number.isFinite(t.positionY)&&(n.positionY=eRa(t.positionY,0,1)),Number.isFinite(t.aspectRatio)&&(n.aspectRatio=eRa(t.aspectRatio,1,4)),"custom"===t.positionPreset&&(n.positionPreset="custom"),a.push(n)}return a.sort((e,a)=>e.timeMs-a.timeMs).filter((e,t,n)=>t===n.findIndex(a=>Math.abs(a.timeMs-e.timeMs)<=250)).slice(-200)}function recordlyWebcamUpsertLayoutKeyframe(e,a,t){const n=recordlyWebcamNormalizeLayoutKeyframes(e?.layoutKeyframes).filter(e=>Math.abs(e.timeMs-a)>250),l={timeMs:Math.max(0,Math.round(a)),positionPreset:"custom",positionX:eRa(t.positionX,0,1),positionY:eRa(t.positionY,0,1),size:eRa(t.size,10,100),aspectRatio:recordlyWebcamAspectRatio(t)};return recordlyWebcamNormalizeLayoutKeyframes([...n,l])}function rRa(e){',
  },
  {
    label: "default webcam aspect and keyframes",
    search: 'YCa={enabled:!1,sourcePath:null,timeOffsetMs:0,mirror:!0,cropRegion:{x:0,y:0,width:1,height:1},corner:"bottom-right",positionPreset:OCa,positionX:1,positionY:1,size:40,reactToZoom:XCa,cornerRadius:90,shadow:UCa,margin:24};',
    replace: 'YCa={enabled:!1,sourcePath:null,timeOffsetMs:0,mirror:!0,cropRegion:{x:0,y:0,width:1,height:1},corner:"bottom-right",positionPreset:OCa,positionX:1,positionY:1,size:40,reactToZoom:XCa,cornerRadius:18,shadow:UCa,margin:24,aspectRatio:16/9,layoutKeyframes:[]};',
  },
  {
    label: "persist webcam aspect and keyframes",
    search: 'shadow:Tka(P.shadow)?Dka(P.shadow,0,1):UCa,timeOffsetMs:Tka(P.timeOffsetMs)?Math.round(P.timeOffsetMs):0,margin:Tka(P.margin)?Dka(P.margin,0,96):24},sourceAudioTrackSettingsByClip:',
    replace: 'shadow:Tka(P.shadow)?Dka(P.shadow,0,1):UCa,timeOffsetMs:Tka(P.timeOffsetMs)?Math.round(P.timeOffsetMs):0,margin:Tka(P.margin)?Dka(P.margin,0,96):24,aspectRatio:Tka(P.aspectRatio)?Dka(P.aspectRatio,1,4):16/9,layoutKeyframes:recordlyWebcamNormalizeLayoutKeyframes(P.layoutKeyframes)},sourceAudioTrackSettingsByClip:',
  },
  {
    label: "editor preview prop",
    search: 'webcam:T,webcamVideoPath:D,trimRegions:z=[]',
    replace: 'webcam:T,webcamVideoPath:D,onWebcamChange:recordlyPreviewWebcamChange,trimRegions:z=[]',
  },
  {
    label: "editor preview drag ref",
    search: 'Ye=e.useRef(null),Ke=e.useRef(null),Je=e.useRef(null),[Qe,_e]=e.useState(null)',
    replace: 'Ye=e.useRef(null),Ke=e.useRef(null),Je=e.useRef(null),recordlyWebcamDrag=e.useRef(null),[Qe,_e]=e.useState(null)',
  },
  {
    label: "active webcam layout and horizontal preview",
    search: 'const At=e.useRef({lastFrameTimeMs:0,prevCamX:0,prevCamY:0,prevCamScale:1,initialized:!1}),Ht=T?.enabled??!1,gt=T?.margin??24,Mt=T?.size??40,Vt=T?.reactToZoom??XCa,ft=T?.positionPreset??T?.corner??"bottom-right",Et=T?.positionX??1,vt=T?.positionY??1,Lt=T?.corner??"bottom-right",wt=T?.cornerRadius??90,yt=T?.shadow??UCa,bt=T?.timeOffsetMs,Ft=T?.cropRegion,Ct=T?.mirror??!1,xt=e.useMemo(()=>{if(!Qe)return{opacity:0};const{sx:e,sy:a,sw:t,sh:n}=cRa(Ft,Qe.width,Qe.height),l=Math.max(1/t,1/n);return{left:100*((1-t*l)/2-e*l)+"%",top:100*((1-n*l)/2-a*l)+"%",width:100*(Qe.width*l)+"%",height:100*(Qe.height*l)+"%",maxWidth:"none",willChange:"left, top, width, height"}},[Ft,Qe]),It=e.useCallback(e=>{const a=Ke.current,t=Je.current,n=Ue.current;if(!(a&&t&&n&&Ht&&D))return void(a&&(a.style.display="none"));const l=nRa({containerWidth:n.clientWidth,containerHeight:n.clientHeight,sizePercent:Mt,margin:gt,zoomScale:e,reactToZoom:Vt}),{x:r,y:o}=lRa({containerWidth:n.clientWidth,containerHeight:n.clientHeight,size:l,margin:gt,positionPreset:ft,positionX:Et,positionY:vt,legacyCorner:Lt});a.style.display="block",a.style.left=`${r}px`,a.style.top=`${o}px`,a.style.width=`${l}px`,a.style.height=`${l}px`,a.style.aspectRatio="1 / 1";const c=LSa({x:0,y:0,width:l,height:l,radius:wt});a.style.filter=`drop-shadow(0 ${Math.round(.06*l)}px ${Math.round(.22*l)}px rgba(0, 0, 0, ${yt}))`,a.style.borderRadius="0px",a.style.boxShadow="none",t.style.borderRadius="0px",t.style.overflow="hidden",t.style.contain="paint",t.style.clipPath=`path(\'${c}\')`,t.style.setProperty("-webkit-clip-path",`path(\'${c}\')`)},[Lt,wt,Ht,gt,ft,Et,vt,Vt,yt,Mt,D])',
    replace: 'const At=e.useRef({lastFrameTimeMs:0,prevCamX:0,prevCamY:0,prevCamScale:1,initialized:!1}),recordlyActiveWebcam=recordlyWebcamLayoutAt(T,1e3*r),recordlyWebcamAspect=recordlyWebcamAspectRatio(recordlyActiveWebcam),Ht=recordlyActiveWebcam?.enabled??!1,gt=recordlyActiveWebcam?.margin??24,Mt=recordlyActiveWebcam?.size??40,Vt=recordlyActiveWebcam?.reactToZoom??XCa,ft=recordlyActiveWebcam?.positionPreset??recordlyActiveWebcam?.corner??"bottom-right",Et=recordlyActiveWebcam?.positionX??1,vt=recordlyActiveWebcam?.positionY??1,Lt=recordlyActiveWebcam?.corner??"bottom-right",wt=recordlyActiveWebcam?.cornerRadius??18,yt=recordlyActiveWebcam?.shadow??UCa,bt=recordlyActiveWebcam?.timeOffsetMs,Ft=recordlyActiveWebcam?.cropRegion,Ct=recordlyActiveWebcam?.mirror??!1,xt=e.useMemo(()=>{if(!Qe)return{opacity:0};if(oRa(Ft))return{left:"0%",top:"0%",width:"100%",height:"100%",maxWidth:"none",willChange:"left, top, width, height"};const{sx:e,sy:a,sw:t,sh:n}=cRa(Ft,Qe.width,Qe.height),l=Math.max(1/t,1/n);return{left:100*((1-t*l)/2-e*l)+"%",top:100*((1-n*l)/2-a*l)+"%",width:100*(Qe.width*l)+"%",height:100*(Qe.height*l)+"%",maxWidth:"none",willChange:"left, top, width, height"}},[Ft,Qe]),It=e.useCallback(e=>{const a=Ke.current,t=Je.current,n=Ue.current;if(!(a&&t&&n&&Ht&&D))return void(a&&(a.style.display="none"));const l=recordlyWebcamFrameSize({containerWidth:n.clientWidth,containerHeight:n.clientHeight,sizePercent:Mt,margin:gt,zoomScale:e,reactToZoom:Vt,aspectRatio:recordlyWebcamAspect}),{x:r,y:o}=lRa({containerWidth:n.clientWidth,containerHeight:n.clientHeight,size:l.height,width:l.width,height:l.height,margin:gt,positionPreset:ft,positionX:Et,positionY:vt,legacyCorner:Lt});a.style.display="block",a.style.left=`${r}px`,a.style.top=`${o}px`,a.style.width=`${l.width}px`,a.style.height=`${l.height}px`,a.style.aspectRatio=`${l.width} / ${l.height}`;const c=LSa({x:0,y:0,width:l.width,height:l.height,radius:wt});a.style.filter=`drop-shadow(0 ${Math.round(.06*l.height)}px ${Math.round(.22*l.height)}px rgba(0, 0, 0, ${yt}))`,a.style.borderRadius="0px",a.style.boxShadow="none",t.style.borderRadius="0px",t.style.overflow="hidden",t.style.contain="paint",t.style.clipPath=`path(\'${c}\')`,t.style.setProperty("-webkit-clip-path",`path(\'${c}\')`)},[Lt,wt,Ht,gt,ft,Et,vt,Vt,yt,Mt,D,recordlyWebcamAspect])',
  },
  {
    label: "webcam drag handlers",
    skipIf: "recordlyWebcamPointerDown=e.useCallback",
    search: 'Gt=e.useCallback(e=>{const a=e.currentTarget;a.videoWidth>0&&a.videoHeight>0&&a.readyState>=2&&_e({width:a.videoWidth,height:a.videoHeight}),zt()},[zt]);e.useEffect(()=>{zt()},[zt])',
    replace: 'Gt=e.useCallback(e=>{const a=e.currentTarget;a.videoWidth>0&&a.videoHeight>0&&a.readyState>=2&&_e({width:a.videoWidth,height:a.videoHeight}),zt()},[zt]),recordlyWebcamPointerDown=e.useCallback(e=>{if(u||!recordlyPreviewWebcamChange)return;const a=Ke.current,t=Ue.current;if(!a||!t)return;e.stopPropagation(),e.preventDefault();const n=a.getBoundingClientRect(),l=t.getBoundingClientRect(),r=e.target instanceof HTMLElement&&"resize"===e.target.dataset.recordlyWebcamHandle;recordlyWebcamDrag.current={pointerId:e.pointerId,mode:r?"resize":"move",startX:e.clientX,startY:e.clientY,left:n.left-l.left,top:n.top-l.top,width:n.width,height:n.height,containerWidth:l.width,containerHeight:l.height},e.currentTarget.setPointerCapture?.(e.pointerId)},[u,recordlyPreviewWebcamChange]),recordlyWebcamPointerMove=e.useCallback(e=>{const a=recordlyWebcamDrag.current,t=Ke.current;if(!a||a.pointerId!==e.pointerId||!t)return;e.stopPropagation(),e.preventDefault();const n=e.clientX-a.startX,l=e.clientY-a.startY,r=Math.max(0,gt),o=recordlyWebcamAspect;let c=a.left,i=a.top,m=a.width,s=a.height;if("resize"===a.mode){const e=Math.max(n/o,l),t=Math.max(56,Math.min(a.containerHeight-2*r,(a.containerWidth-2*r)/o));s=eRa(a.height+e,56,t),m=s*o,c=eRa(a.left,r,Math.max(r,a.containerWidth-m-r)),i=eRa(a.top,r,Math.max(r,a.containerHeight-s-r))}else c=eRa(a.left+n,r,Math.max(r,a.containerWidth-a.width-r)),i=eRa(a.top+l,r,Math.max(r,a.containerHeight-a.height-r));t.style.left=`${c}px`,t.style.top=`${i}px`,t.style.width=`${m}px`,t.style.height=`${s}px`,t.style.aspectRatio=`${m} / ${s}`},[gt,recordlyWebcamAspect]),recordlyWebcamPointerUp=e.useCallback(e=>{const a=recordlyWebcamDrag.current,t=Ke.current,n=Ue.current;if(!a||a.pointerId!==e.pointerId)return;recordlyWebcamPointerMove(e),recordlyWebcamDrag.current=null,e.currentTarget.hasPointerCapture?.(e.pointerId)&&e.currentTarget.releasePointerCapture(e.pointerId);if(!t||!n||!T||!recordlyPreviewWebcamChange)return;const l=parseFloat(t.style.left)||0,r=parseFloat(t.style.top)||0,o=parseFloat(t.style.width)||t.offsetWidth,c=parseFloat(t.style.height)||t.offsetHeight,i=Math.max(0,gt),m=Math.max(1,Math.min(n.clientWidth,n.clientHeight)),s=ta.current.appliedScale||1,d=eRa(c/m*100*(Vt?s:1),10,100),h=eRa((l-i)/Math.max(1,n.clientWidth-o-2*i),0,1),u=eRa((r-i)/Math.max(1,n.clientHeight-c-2*i),0,1),Z=Math.max(0,Math.round(1e3*r)),p={positionPreset:"custom",positionX:h,positionY:u,size:d,aspectRatio:recordlyWebcamAspect};recordlyPreviewWebcamChange({...T,...p,layoutKeyframes:recordlyWebcamUpsertLayoutKeyframe(T,Z,p)})},[recordlyWebcamPointerMove,T,recordlyPreviewWebcamChange,gt,Vt,recordlyWebcamAspect]);e.useEffect(()=>{zt()},[zt])',
  },
  {
    label: "interactive webcam preview element",
    search: 'T&&D?W.jsx("div",{ref:Ke,className:"absolute",style:{display:T.enabled?"block":"none",pointerEvents:"none"},children:W.jsx("div",{ref:Je,className:"relative h-full w-full overflow-hidden",children:W.jsx("div",{className:"pointer-events-none absolute inset-0 overflow-hidden",style:{opacity:Qe?1:0,transform:Ct?"scaleX(-1)":void 0},children:W.jsx("div",{className:"pointer-events-none absolute",style:xt,children:W.jsx("video",{ref:Ye,src:D,className:"pointer-events-none absolute inset-0 block h-full w-full object-fill",muted:!0,playsInline:!0,preload:"auto","aria-hidden":"true",onLoadedMetadata:Gt,onLoadedData:Gt})})})})}):null',
    replace: 'recordlyActiveWebcam&&D?W.jsxs("div",{ref:Ke,className:"absolute",style:{display:recordlyActiveWebcam.enabled?"block":"none",pointerEvents:u?"none":"auto",cursor:u?"default":"move",outline:u?"none":"1.5px solid rgba(37,99,235,.85)",boxSizing:"border-box"},onPointerDown:recordlyWebcamPointerDown,onPointerMove:recordlyWebcamPointerMove,onPointerUp:recordlyWebcamPointerUp,onPointerCancel:recordlyWebcamPointerUp,children:[W.jsx("div",{ref:Je,className:"relative h-full w-full overflow-hidden",children:W.jsx("div",{className:"pointer-events-none absolute inset-0 overflow-hidden",style:{opacity:Qe?1:0,transform:Ct?"scaleX(-1)":void 0},children:W.jsx("div",{className:"pointer-events-none absolute",style:xt,children:W.jsx("video",{ref:Ye,src:D,className:"pointer-events-none absolute inset-0 block h-full w-full object-fill",muted:!0,playsInline:!0,preload:"auto","aria-hidden":"true",onLoadedMetadata:Gt,onLoadedData:Gt})})})}),u?null:W.jsx("div",{"data-recordly-webcam-handle":"resize",style:{position:"absolute",right:"-7px",bottom:"-7px",width:"14px",height:"14px",borderRadius:"999px",background:"#2563EB",border:"2px solid white",boxShadow:"0 2px 8px rgba(0,0,0,.28)",cursor:"nwse-resize"}})]}):null',
  },
  {
    label: "preview interaction layer above fallback canvas",
    search: 'ke&&Te&&W.jsxs("div",{ref:Ue,className:"absolute inset-0 select-none",style:{pointerEvents:"none"},',
    replace: 'ke&&Te&&W.jsxs("div",{ref:Ue,className:"absolute inset-0 select-none",style:{pointerEvents:"none",zIndex:2},',
  },
  {
    label: "editor webcam preview preserves aspect ratio",
    search: 'ref:Ye,src:D,className:"pointer-events-none absolute inset-0 block h-full w-full object-fill",muted:!0,playsInline:!0,preload:"auto","aria-hidden":"true",onLoadedMetadata:Gt,onLoadedData:Gt})})})}),u?null:W.jsx("div",{"data-recordly-webcam-handle":"resize"',
    replace: 'ref:Ye,src:D,className:"pointer-events-none absolute inset-0 block h-full w-full object-cover",muted:!0,playsInline:!0,preload:"auto","aria-hidden":"true",onLoadedMetadata:Gt,onLoadedData:Gt})})})}),u?null:W.jsx("div",{"data-recordly-webcam-handle":"resize"',
  },
  {
    label: "fix webcam keyframe time shadowing",
    search: 'const l=parseFloat(t.style.left)||0,r=parseFloat(t.style.top)||0,o=parseFloat(t.style.width)||t.offsetWidth,c=parseFloat(t.style.height)||t.offsetHeight,i=Math.max(0,gt),m=Math.max(1,Math.min(n.clientWidth,n.clientHeight)),s=ta.current.appliedScale||1,d=eRa(c/m*100*(Vt?s:1),10,100),h=eRa((l-i)/Math.max(1,n.clientWidth-o-2*i),0,1),u=eRa((r-i)/Math.max(1,n.clientHeight-c-2*i),0,1),Z=Math.max(0,Math.round(1e3*r)),p={positionPreset:"custom",positionX:h,positionY:u,size:d,aspectRatio:recordlyWebcamAspect};',
    replace: 'const l=parseFloat(t.style.left)||0,recordlyTop=parseFloat(t.style.top)||0,o=parseFloat(t.style.width)||t.offsetWidth,c=parseFloat(t.style.height)||t.offsetHeight,i=Math.max(0,gt),m=Math.max(1,Math.min(n.clientWidth,n.clientHeight)),s=ta.current.appliedScale||1,d=eRa(c/m*100*(Vt?s:1),10,100),h=eRa((l-i)/Math.max(1,n.clientWidth-o-2*i),0,1),u=eRa((recordlyTop-i)/Math.max(1,n.clientHeight-c-2*i),0,1),Z=Math.max(0,Math.round(1e3*r)),p={positionPreset:"custom",positionX:h,positionY:u,size:d,aspectRatio:recordlyWebcamAspect};',
  },
  {
    label: "pass preview webcam change callback",
    search: 'webcam:fa,webcamVideoPath:fa.sourcePath?va:null,trimRegions:Ra',
    replace: 'webcam:fa,webcamVideoPath:fa.sourcePath?va:null,onWebcamChange:Ea,trimRegions:Ra',
  },
  {
    label: "legacy export horizontal webcam",
    search: 'drawWebcamOverlay(e,a,t){const n=this.config.webcam,l=this.webcamDecodedFrame,r=this.webcamVideoElement;if(!n?.enabled||!l&&!r)return;const o=Boolean(this.webcamFrameCacheCanvas&&this.webcamFrameCacheCanvas.width>0&&this.webcamFrameCacheCanvas.height>0),c=l?l.displayWidth>0&&l.displayHeight>0:Boolean(r&&r.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA&&r.videoWidth>0&&r.videoHeight>0);if(!c&&!o)return;const i=n.margin??24,m=nRa({containerWidth:a,containerHeight:t,sizePercent:n.size??50,margin:i,zoomScale:this.animationState.appliedScale||1,reactToZoom:n.reactToZoom??!0}),{x:s,y:d}=lRa({containerWidth:a,containerHeight:t,size:m,margin:i,positionPreset:n.positionPreset??n.corner,positionX:n.positionX??1,positionY:n.positionY??1,legacyCorner:n.corner}),h=Math.max(0,n.cornerRadius??18),u=this.webcamBubbleCanvas??document.createElement("canvas"),Z=Math.max(1,Math.ceil(m));u.width===Z&&u.height===Z||(u.width=Z,u.height=Z),this.webcamBubbleCanvas=u;',
    replace: 'drawWebcamOverlay(e,a,t){const n=recordlyWebcamLayoutAt(this.config.webcam,1e3*this.currentVideoTime),l=this.webcamDecodedFrame,r=this.webcamVideoElement;if(!n?.enabled||!l&&!r)return;const o=Boolean(this.webcamFrameCacheCanvas&&this.webcamFrameCacheCanvas.width>0&&this.webcamFrameCacheCanvas.height>0),c=l?l.displayWidth>0&&l.displayHeight>0:Boolean(r&&r.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA&&r.videoWidth>0&&r.videoHeight>0);if(!c&&!o)return;const i=n.margin??24,m=recordlyWebcamFrameSize({containerWidth:a,containerHeight:t,sizePercent:n.size??50,margin:i,zoomScale:this.animationState.appliedScale||1,reactToZoom:n.reactToZoom??!0,aspectRatio:n.aspectRatio}),{x:s,y:d}=lRa({containerWidth:a,containerHeight:t,size:m.height,width:m.width,height:m.height,margin:i,positionPreset:n.positionPreset??n.corner,positionX:n.positionX??1,positionY:n.positionY??1,legacyCorner:n.corner}),h=Math.max(0,n.cornerRadius??18),u=this.webcamBubbleCanvas??document.createElement("canvas"),Z=Math.max(1,Math.ceil(m.width)),pZ=Math.max(1,Math.ceil(m.height));u.width===Z&&u.height===pZ||(u.width=Z,u.height=pZ),this.webcamBubbleCanvas=u;',
  },
  {
    label: "legacy export horizontal draw",
    search: 'const H=this.webcamFrameCacheCanvas??(c?l??r:null);if(!H)return;const g=("displayWidth"in H?H.displayWidth:"videoWidth"in H?H.videoWidth:H.width)||m,M=("displayHeight"in H?H.displayHeight:"videoHeight"in H?H.videoHeight:H.height)||m,{sx:V,sy:f,sw:E,sh:v}=cRa(n.cropRegion,g,M),L=Math.max(m/E,m/v),w=E*L,y=v*L,b=(m-w)/2,F=(m-y)/2;if(p.save(),wSa(p,{x:0,y:0,width:m,height:m,radius:h}),p.clip(),n.mirror?(p.save(),p.translate(m,0),p.scale(-1,1),p.drawImage(H,V,f,E,v,b,F,w,y),p.restore()):p.drawImage(H,V,f,E,v,b,F,w,y),p.restore(),(n.shadow??0)>0){const a=Math.max(0,Math.min(1,n.shadow));return e.save(),e.filter=`drop-shadow(0 ${Math.round(.06*m)}px ${Math.round(.22*m)}px rgba(0,0,0,${a}))`,e.drawImage(u,s,d,m,m),void e.restore()}e.drawImage(u,s,d,m,m)}',
    replace: 'const H=this.webcamFrameCacheCanvas??(c?l??r:null);if(!H)return;const g=("displayWidth"in H?H.displayWidth:"videoWidth"in H?H.videoWidth:H.width)||m.width,M=("displayHeight"in H?H.displayHeight:"videoHeight"in H?H.videoHeight:H.height)||m.height,{sx:V,sy:f,sw:E,sh:v}=cRa(n.cropRegion,g,M),L=Math.max(m.width/E,m.height/v),w=E*L,y=v*L,b=(m.width-w)/2,F=(m.height-y)/2;if(p.save(),wSa(p,{x:0,y:0,width:m.width,height:m.height,radius:h}),p.clip(),n.mirror?(p.save(),p.translate(m.width,0),p.scale(-1,1),p.drawImage(H,V,f,E,v,b,F,w,y),p.restore()):p.drawImage(H,V,f,E,v,b,F,w,y),p.restore(),(n.shadow??0)>0){const a=Math.max(0,Math.min(1,n.shadow));return e.save(),e.filter=`drop-shadow(0 ${Math.round(.06*m.height)}px ${Math.round(.22*m.height)}px rgba(0,0,0,${a}))`,e.drawImage(u,s,d,m.width,m.height),void e.restore()}e.drawImage(u,s,d,m.width,m.height)}',
  },
  {
    label: "recording preview horizontal geometry",
    search: 'function rLa(){if("undefined"==typeof window)return{left:0,top:0,size:288};const e=lLa(),a=Math.min(288,Math.max(128,Math.min(e.width,e.height)-32));return{left:Math.max(0,e.width-32-a),top:Math.max(0,e.height-120-a),size:a}}function oLa(e,a){const t=Math.max(128,Math.min(520,a.width,a.height)),n=nLa(e.size,128,t);return{size:n,left:nLa(e.left,0,Math.max(0,a.width-n)),top:nLa(e.top,0,Math.max(0,a.height-n))}}',
    replace: 'function rLa(){if("undefined"==typeof window)return{left:0,top:0,size:162};const e=lLa(),a=Math.min(216,Math.max(96,Math.min(e.width/16*9,e.height)-32));return{left:Math.max(0,e.width-32-a*16/9),top:Math.max(0,e.height-120-a),size:a}}function oLa(e,a){const t=Math.max(96,Math.min(360,a.width/16*9,a.height)),n=nLa(e.size,96,t);return{size:n,left:nLa(e.left,0,Math.max(0,a.width-n*16/9)),top:nLa(e.top,0,Math.max(0,a.height-n))}}',
  },
  {
    label: "recording preview horizontal settings",
    search: 'const F=e.useMemo(()=>function(e,a){const t=Math.max(1,Math.min(a.width,a.height)),n=Math.max(1,a.width-e.size-48),l=Math.max(1,a.height-e.size-48);return{positionX:nLa((e.left-24)/n,0,1),positionY:nLa((e.top-24)/l,0,1),size:nLa(e.size/t*100,10,100)}}(d,lLa()),[d]),C=e.useMemo(()=>({left:`${d.left}px`,top:`${d.top}px`,width:`${d.size}px`,height:`${d.size}px`}),[d]);',
    replace: 'const F=e.useMemo(()=>function(e,a){const t=Math.max(1,Math.min(a.width/16*9,a.height)),n=Math.max(1,a.width-e.size*16/9-48),l=Math.max(1,a.height-e.size-48);return{positionX:nLa((e.left-24)/n,0,1),positionY:nLa((e.top-24)/l,0,1),size:nLa(e.size/t*100,10,100),aspectRatio:16/9}}(d,lLa()),[d]),C=e.useMemo(()=>({left:`${d.left}px`,top:`${d.top}px`,width:`${d.size*16/9}px`,height:`${d.size}px`}),[d]);',
  },
  {
    label: "recording preview DOM update horizontal",
    search: 'H.current&&(H.current.style.left=`${t.left}px`,H.current.style.top=`${t.top}px`,H.current.style.width=`${t.size}px`,H.current.style.height=`${t.size}px`)',
    replace: 'H.current&&(H.current.style.left=`${t.left}px`,H.current.style.top=`${t.top}px`,H.current.style.width=`${t.size*16/9}px`,H.current.style.height=`${t.size}px`)',
  },
  {
    label: "recording preview getUserMedia horizontal",
    search: 'width:{ideal:320},height:{ideal:320},frameRate:{ideal:24,max:30}',
    replace: 'width:{ideal:640},height:{ideal:360},aspectRatio:{ideal:16/9},frameRate:{ideal:24,max:30}',
    count: 2,
  },
  {
    label: "record webcam as sidecar instead of baking into screen",
    search: 'const o=N.current?.getVideoTracks()[0],c=V&&Boolean(o),i=Boolean(r);if(!c&&!i)return ge.current=!1,e;',
    replace: 'const o=N.current?.getVideoTracks()[0],c=V&&Boolean(o),i=Boolean(r);if(!i)return ge.current=!1,e;',
  },
  {
    label: "disable browser fallback webcam bake-in draw",
    search: ')),c&&h.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA){const e=function',
    replace: ')),!1&&c&&h.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA){const e=function',
  },
  {
    label: "keep webcam sidecar after cropped browser capture",
    search: '},ge.current=c,A},[V])',
    replace: '},ge.current=!1,A},[V])',
  },
  {
    label: "open native editor after webcam sidecar ready",
    search: 'const i=c.path;await ke(i,null),(async()=>{try{const t=await r;await Ge(l,i,e,a),o&&await window.electronAPI.muxNativeWindowsRecording(n),await window.electronAPI.setCurrentRecordingSession({videoPath:i,webcamPath:t,timeOffsetMs:j.current,webcamOverlay:F.current??void 0,hideOverlayCursorByDefault:He.current})}catch(t){}finally{"function"==typeof window.electronAPI?.hudOverlayClose&&window.electronAPI.hudOverlayClose()}})()',
    replace: 'const i=c.path;(async()=>{try{const t=await r;await Ge(l,i,e,a),o&&await window.electronAPI.muxNativeWindowsRecording(n),await ke(i,t),await window.electronAPI.setCurrentRecordingSession({videoPath:i,webcamPath:t,timeOffsetMs:j.current,webcamOverlay:F.current??void 0,hideOverlayCursorByDefault:He.current})}catch(t){await ke(i,null)}finally{"function"==typeof window.electronAPI?.hudOverlayClose&&window.electronAPI.hudOverlayClose()}})()',
  },
  {
    label: "open browser editor after webcam sidecar ready",
    search: 'if(o.path){const e=o.path;await ke(e,null),(async()=>{const a=ge.current,t=a?null:J.current?await J.current:q.current;try{t&&await window.electronAPI.setCurrentRecordingSession({videoPath:e,webcamPath:t,timeOffsetMs:j.current,webcamOverlay:F.current??void 0,hideOverlayCursorByDefault:He.current})}finally{"function"==typeof window.electronAPI?.hudOverlayClose&&window.electronAPI.hudOverlayClose(),a&&(ge.current=!1)}})()}else',
    replace: 'if(o.path){const e=o.path,a=ge.current;let t=null;try{t=a?null:J.current?await J.current:q.current,await ke(e,t),t&&await window.electronAPI.setCurrentRecordingSession({videoPath:e,webcamPath:t,timeOffsetMs:j.current,webcamOverlay:F.current??void 0,hideOverlayCursorByDefault:He.current})}finally{"function"==typeof window.electronAPI?.hudOverlayClose&&window.electronAPI.hudOverlayClose(),a&&(ge.current=!1)}}else',
  },
];

const modernPatches = [
  {
    label: "modern webcam helper functions",
    search: 'function Xe(e,t,i=.01){return Math.abs(e-t)<=i}class _e{',
    replace: 'function Xe(e,t,i=.01){return Math.abs(e-t)<=i}function recordlyModernWebcamAspectRatio(e){const t=Number.isFinite(e?.aspectRatio)?e.aspectRatio:16/9;return Math.min(4,Math.max(1,t))}function recordlyModernWebcamLayoutAt(e,t){if(!e||"object"!=typeof e)return e;const i=Array.isArray(e.layoutKeyframes)?e.layoutKeyframes:null;if(!i||0===i.length)return e;const a=Number.isFinite(t)?Math.max(0,t):0;let o=null;for(const e of i)e&&Number.isFinite(e.timeMs)&&e.timeMs<=a+1&&(o=e);return o?{...e,...o,layoutKeyframes:i}:e}function recordlyModernWebcamFrameSize({containerWidth:e,containerHeight:t,sizePercent:i,margin:a,zoomScale:o,reactToZoom:n,aspectRatio:s}){const r=recordlyModernWebcamAspectRatio({aspectRatio:s}),c=Math.max(0,a),h=N({containerWidth:e,containerHeight:t,sizePercent:i,margin:c,zoomScale:o,reactToZoom:n}),d=Math.max(56,Math.min(Math.max(56,t-2*c),Math.max(56,(e-2*c)/r),h));return{width:d*r,height:d}}class _e{',
  },
  {
    label: "modern active webcam layout",
    search: 'updateWebcamOverlay(e=this.currentVideoTime){const t=this.config.webcam;if(!t?.enabled||!this.webcamRootContainer||!this.webcamMaskGraphics)return this.webcamRootContainer&&(this.webcamRootContainer.visible=!1),this.webcamLayoutCache=null,void this.setWebcamRenderMode("hidden");',
    replace: 'updateWebcamOverlay(e=this.currentVideoTime){const t=recordlyModernWebcamLayoutAt(this.config.webcam,1e3*e);if(!t?.enabled||!this.webcamRootContainer||!this.webcamMaskGraphics)return this.webcamRootContainer&&(this.webcamRootContainer.visible=!1),this.webcamLayoutCache=null,void this.setWebcamRenderMode("hidden");',
  },
  {
    label: "modern horizontal webcam layout",
    search: 'const d=t.margin??24,u=N({containerWidth:this.config.width,containerHeight:this.config.height,sizePercent:t.size??50,margin:d,zoomScale:this.animationState.appliedScale||1,reactToZoom:t.reactToZoom??!0}),l=z({containerWidth:this.config.width,containerHeight:this.config.height,size:u,margin:d,positionPreset:t.positionPreset??t.corner,positionX:t.positionX??1,positionY:t.positionY??1,legacyCorner:t.corner}),m=Math.max(0,t.cornerRadius??18),g=Qe(t.shadow??0);this.webcamRootContainer.visible=!0;const p={sourceWidth:h.width,sourceHeight:h.height,size:u,positionX:l.x,positionY:l.y,radius:m,shadowStrength:g,mirror:t.mirror};this.hasMatchingWebcamLayout(p)||this.applyWebcamLayout(p)}',
    replace: 'const d=t.margin??24,u=recordlyModernWebcamFrameSize({containerWidth:this.config.width,containerHeight:this.config.height,sizePercent:t.size??50,margin:d,zoomScale:this.animationState.appliedScale||1,reactToZoom:t.reactToZoom??!0,aspectRatio:t.aspectRatio}),l=z({containerWidth:this.config.width,containerHeight:this.config.height,size:u.height,width:u.width,height:u.height,margin:d,positionPreset:t.positionPreset??t.corner,positionX:t.positionX??1,positionY:t.positionY??1,legacyCorner:t.corner}),m=Math.max(0,t.cornerRadius??18),g=Qe(t.shadow??0);this.webcamRootContainer.visible=!0;const p={sourceWidth:h.width,sourceHeight:h.height,width:u.width,height:u.height,size:u.height,positionX:l.x,positionY:l.y,radius:m,shadowStrength:g,mirror:t.mirror};this.hasMatchingWebcamLayout(p)||this.applyWebcamLayout(p)}',
  },
  {
    label: "modern matching horizontal layout",
    search: 'hasMatchingWebcamLayout(e){const t=this.webcamLayoutCache;return!!t&&(t.mirror===e.mirror&&Xe(t.sourceWidth,e.sourceWidth)&&Xe(t.sourceHeight,e.sourceHeight)&&Xe(t.size,e.size)&&Xe(t.positionX,e.positionX)&&Xe(t.positionY,e.positionY)&&Xe(t.radius,e.radius)&&Xe(t.shadowStrength,e.shadowStrength))}',
    replace: 'hasMatchingWebcamLayout(e){const t=this.webcamLayoutCache;return!!t&&(t.mirror===e.mirror&&Xe(t.sourceWidth,e.sourceWidth)&&Xe(t.sourceHeight,e.sourceHeight)&&Xe(t.width,e.width)&&Xe(t.height,e.height)&&Xe(t.size,e.size)&&Xe(t.positionX,e.positionX)&&Xe(t.positionY,e.positionY)&&Xe(t.radius,e.radius)&&Xe(t.shadowStrength,e.shadowStrength))}',
  },
  {
    label: "modern apply horizontal layout",
    search: 'applyWebcamLayout(e){if(this.webcamRootContainer&&this.webcamSprite&&this.webcamMaskGraphics){this.webcamRootContainer.position.set(e.positionX,e.positionY),Ye(this.webcamSprite,e.sourceWidth,e.sourceHeight,e.size,e.size,e.size/2,e.size/2,e.mirror),this.webcamMaskGraphics.clear(),P(this.webcamMaskGraphics,{x:0,y:0,width:e.size,height:e.size,radius:e.radius}),this.webcamMaskGraphics.fill({color:16777215});for(const t of this.webcamShadowLayers){if(e.shadowStrength<=0){t.container.visible=!1;continue}const i=e.size*t.offsetScale*e.shadowStrength;this.rasterizeShadowLayer(t,{x:0,y:0,width:e.size,height:e.size,radius:e.radius,offsetY:i,alpha:t.alphaScale*e.shadowStrength,blur:Math.max(0,e.size*t.blurScale*e.shadowStrength)})}this.webcamLayoutCache={...e}}}',
    replace: 'applyWebcamLayout(e){if(this.webcamRootContainer&&this.webcamSprite&&this.webcamMaskGraphics){this.webcamRootContainer.position.set(e.positionX,e.positionY),Ye(this.webcamSprite,e.sourceWidth,e.sourceHeight,e.width,e.height,e.width/2,e.height/2,e.mirror),this.webcamMaskGraphics.clear(),P(this.webcamMaskGraphics,{x:0,y:0,width:e.width,height:e.height,radius:e.radius}),this.webcamMaskGraphics.fill({color:16777215});for(const t of this.webcamShadowLayers){if(e.shadowStrength<=0){t.container.visible=!1;continue}const i=e.height*t.offsetScale*e.shadowStrength;this.rasterizeShadowLayer(t,{x:0,y:0,width:e.width,height:e.height,radius:e.radius,offsetY:i,alpha:t.alphaScale*e.shadowStrength,blur:Math.max(0,e.height*t.blurScale*e.shadowStrength)})}this.webcamLayoutCache={...e}}}',
  },
  {
    label: "skip native static for dynamic horizontal webcam",
    search: 'this.config.webcam?.enabled&&!this.getNativeWebcamSourcePath()&&a.push("unsupported-webcam-source"),this.config.frame&&a.push("unsupported-frame-overlay");const h=this.config.cropRegion;',
    replace: 'this.config.webcam?.enabled&&!this.getNativeWebcamSourcePath()&&a.push("unsupported-webcam-source");const u=this.config.webcam;u?.enabled&&(Math.abs(recordlyModernWebcamAspectRatio(u)-1)>.01&&a.push("unsupported-webcam-aspect-ratio"),Array.isArray(u.layoutKeyframes)&&u.layoutKeyframes.length>1&&a.push("unsupported-webcam-layout-keyframes")),this.config.frame&&a.push("unsupported-frame-overlay");const h=this.config.cropRegion;',
  },
];

patchFile(path.join(assetsDir, "index-Bg4OucLc.js"), indexPatches);
patchFile(path.join(assetsDir, "modernVideoExporter-D7EVeSbo.js"), modernPatches);

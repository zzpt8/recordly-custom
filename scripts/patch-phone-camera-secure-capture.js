const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const files = [
  path.join(root, "asar-inspect", "dist-electron", "main.cjs"),
  path.join(root, "scripts", "patch-phone-camera.js"),
];

function replaceRequired(text, search, replacement, label, file) {
  if (text.includes(replacement)) {
    return { text, changed: false };
  }
  const count = text.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`${path.relative(root, file)}: expected 1 match for ${label}, found ${count}`);
  }
  return { text: text.replace(search, replacement), changed: true };
}

function patchFile(file) {
  let text = fs.readFileSync(file, "utf8");
  let changed = false;

  for (const [search, replacement, label] of [
    [
      "{ timeout: 12000, windowsHide: true }",
      "{ timeout: 45000, windowsHide: true }",
      "certificate generation timeout",
    ],
    [
      'console.warn("[phone-camera] Failed to generate HTTPS certificate; falling back to HTTP.", result.error || String(result.stderr || ""));',
      'console.warn("[phone-camera] Failed to generate HTTPS certificate. HTTPS is required for mobile camera access.", result.error || String(result.stderr || ""));',
      "certificate generation warning",
    ],
    [
      'console.warn("[phone-camera] Failed to prepare HTTPS certificate; falling back to HTTP.", error);',
      'console.warn("[phone-camera] Failed to prepare HTTPS certificate. HTTPS is required for mobile camera access.", error);',
      "certificate prepare warning",
    ],
  ]) {
    const result = replaceRequired(text, search, replacement, label, file);
    text = result.text;
    changed = changed || result.changed;
  }

  const certificateLine = "    const certificate = recordlyPhoneCameraEnsureCertificate(host);";
  const certificateGuard = `    const certificate = recordlyPhoneCameraEnsureCertificate(host);
    if (process.platform === "win32" && !certificate) {
      const error = "手机摄像头需要 HTTPS，但 Recordly 没能生成本机证书；请重启 Recordly，或检查 Windows PowerShell 是否可用。";
      console.warn("[phone-camera] " + error);
      resolve({ success: false, error });
      return;
    }`;
  {
    const result = replaceRequired(text, certificateLine, certificateGuard, "Windows HTTPS certificate guard", file);
    text = result.text;
    changed = changed || result.changed;
  }

  const oldOpen = 'async function open(){run=false;document.body.classList.remove("idle");if(stream)stream.getTracks().forEach(t=>t.stop());setStatus("正在请求摄像头权限...");try{await document.documentElement.requestFullscreen?.()}catch{}stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}},audio:false});v.srcObject=stream;await v.play();run=true;';
  const newOpen = 'function recordlyPhoneCameraGetUserMediaFallbackError(e){const name=e&&e.name?e.name:"Error",msg=e&&e.message?e.message:String(e||"未知错误");if(!window.isSecureContext)return"当前页面不是 HTTPS 安全连接，手机浏览器会禁止摄像头。请回到电脑端重新打开二维码，并确认地址以 https:// 开头。";if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return"当前浏览器不支持网页摄像头，请用系统相机扫码后在 Chrome 或 Safari 打开。";if(name==="NotAllowedError"||name==="PermissionDeniedError")return"摄像头权限被拒绝，请在浏览器设置里允许摄像头后重试。";if(name==="NotFoundError"||name==="DevicesNotFoundError")return"没有找到可用摄像头，请确认没有被系统禁用。";if(name==="NotReadableError"||name==="TrackStartError")return"摄像头被其他应用占用，请关闭相机、微信视频、会议软件后重试。";if(name==="OverconstrainedError"||name==="ConstraintNotSatisfiedError")return"当前摄像头不支持优先参数，已尝试降级仍失败："+msg;return name+": "+msg}async function recordlyPhoneCameraGetUserMediaFallback(){if(!window.isSecureContext)throw new Error("INSECURE_CONTEXT");if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error("GET_USER_MEDIA_UNAVAILABLE");const tries=[{video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}},audio:false},{video:{facingMode:{ideal:facing}},audio:false},{video:true,audio:false}];let last=null;for(const constraints of tries){try{return await navigator.mediaDevices.getUserMedia(constraints)}catch(e){last=e}}throw last||new Error("UNKNOWN_CAMERA_ERROR")}async function open(){run=false;document.body.classList.remove("idle");if(stream)stream.getTracks().forEach(t=>t.stop());setStatus("正在请求摄像头权限...");try{await document.documentElement.requestFullscreen?.()}catch{}stream=await recordlyPhoneCameraGetUserMediaFallback();v.srcObject=stream;await v.play();run=true;';
  {
    const result = replaceRequired(text, oldOpen, newOpen, "mobile getUserMedia fallback", file);
    text = result.text;
    changed = changed || result.changed;
  }

  for (const [search, replacement, label] of [
    [
      'start.onclick=()=>open().catch(e=>{setStatus("摄像头启动失败："+(e&&e.message?e.message:String(e)));showControls()});',
      'start.onclick=()=>open().catch(e=>{setStatus("摄像头启动失败："+recordlyPhoneCameraGetUserMediaFallbackError(e));showControls()});',
      "start error detail",
    ],
    [
      'open().catch(e=>{setStatus("切换失败："+(e&&e.message?e.message:String(e)));showControls()})',
      'open().catch(e=>{setStatus("切换失败："+recordlyPhoneCameraGetUserMediaFallbackError(e));showControls()})',
      "switch error detail",
    ],
    [
      'if(autoStart)open().catch(e=>{setStatus("自动连接失败："+(e&&e.message?e.message:String(e)));showControls()});',
      'if(autoStart)open().catch(e=>{setStatus("自动连接失败："+recordlyPhoneCameraGetUserMediaFallbackError(e));showControls()});',
      "autostart error detail",
    ],
  ]) {
    const result = replaceRequired(text, search, replacement, label, file);
    text = result.text;
    changed = changed || result.changed;
  }

  if (changed) {
    fs.writeFileSync(file, text, "utf8");
  }
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

for (const file of files) {
  patchFile(file);
}

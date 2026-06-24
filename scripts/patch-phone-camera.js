const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "asar-inspect", "dist");
const assetsDir = path.join(distDir, "assets");
const htmlPath = path.join(distDir, "index.html");
const mainPath = path.join(root, "asar-inspect", "dist-electron", "main.cjs");
const preloadPath = path.join(root, "asar-inspect", "dist-electron", "preload.mjs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

function functionBody(fn) {
  const text = fn.toString();
  return text.slice(text.indexOf("{") + 1, text.lastIndexOf("}"));
}

function replaceOnce(text, search, replacement, label, file) {
  if (text.includes(replacement)) {
    return { text, changed: false };
  }
  const count = text.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`${path.basename(file)}: expected 1 match for ${label}, found ${count}`);
  }
  return { text: text.replace(search, replacement), changed: true };
}

function patchFile(file, patches) {
  let text = read(file);
  let changed = false;
  for (const patch of patches) {
    if (patch.skipIf && text.includes(patch.skipIf)) {
      continue;
    }
    const result = replaceOnce(text, patch.search, patch.replace, patch.label, file);
    text = result.text;
    changed = changed || result.changed;
  }
  if (changed) {
    write(file, text);
  }
  console.log(`${changed ? "patched" : "unchanged"} ${path.relative(root, file)}`);
}

function activeRendererPath() {
  const html = read(htmlPath);
  const match = html.match(/\.\/assets\/([^"]+\.js)/);
  if (!match) {
    throw new Error("Could not find renderer script in dist/index.html");
  }
  return path.join(assetsDir, match[1]);
}

function recordlyPhoneCameraMainPatch() {
  const recordlyPhoneCameraState = {
    server: null,
    baseUrl: null,
    displayUrl: null,
    statusUrl: null,
    token: null,
    secure: false,
    serial: 0,
    frame: null,
    mime: "image/jpeg",
    updatedAt: 0,
    width: 0,
    height: 0,
    starting: null,
    lastPromptAt: 0,
    qrWindow: null,
    savedPort: null,
  };

  function recordlyPhoneCameraStatePath() {
    return S.join(bt, "phone-camera-session.json");
  }

  function recordlyPhoneCameraLoadSavedState() {
    try {
      const data = JSON.parse(Q.readFileSync(recordlyPhoneCameraStatePath(), "utf8"));
      const token = typeof data.token === "string" && /^[a-f0-9]{24,80}$/i.test(data.token) ? data.token : null;
      const port = Number.isInteger(data.port) && data.port > 1024 && data.port < 65535 ? data.port : null;
      return { token, port };
    } catch {
      return { token: null, port: null };
    }
  }

  function recordlyPhoneCameraSaveState(port) {
    try {
      Q.mkdirSync(S.dirname(recordlyPhoneCameraStatePath()), { recursive: true });
      Q.writeFileSync(recordlyPhoneCameraStatePath(), JSON.stringify({
        version: 1,
        token: recordlyPhoneCameraState.token,
        port,
        updatedAt: Date.now(),
      }, null, 2), "utf8");
    } catch (error) {
      console.warn("[phone-camera] Failed to save phone camera session.", error);
    }
  }

  function recordlyPhoneCameraLanAddress() {
    const interfaces = Mu.networkInterfaces();
    for (const entries of Object.values(interfaces)) {
      for (const entry of entries || []) {
        if (entry && entry.family === "IPv4" && !entry.internal && !/^169\.254\./.test(entry.address)) {
          return entry.address;
        }
      }
    }
    return "127.0.0.1";
  }

  function recordlyPhoneCameraPsQuote(value) {
    return String(value).replace(/'/g, "''");
  }

  function recordlyPhoneCameraEnsureCertificate(host) {
    if (process.platform !== "win32") {
      return null;
    }
    try {
      const certDir = S.join(bt, "phone-camera-certificates");
      const safeHost = host.replace(/[^\w.-]/g, "_");
      const certPath = S.join(certDir, `recordly-phone-camera-${safeHost}.crt`);
      const keyPath = S.join(certDir, `recordly-phone-camera-${safeHost}.key`);
      if (Q.existsSync(certPath) && Q.existsSync(keyPath)) {
        return { cert: Q.readFileSync(certPath), key: Q.readFileSync(keyPath) };
      }

      Q.mkdirSync(certDir, { recursive: true });
      const ips = Array.from(new Set(["127.0.0.1", host])).filter(Boolean);
      const ps = `$ErrorActionPreference = 'Stop'
$certPath = '${recordlyPhoneCameraPsQuote(certPath)}'
$keyPath = '${recordlyPhoneCameraPsQuote(keyPath)}'
$ips = @(${ips.map((ip) => `'${recordlyPhoneCameraPsQuote(ip)}'`).join(",")})
$rsa = [System.Security.Cryptography.RSA]::Create(2048)
$req = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=Recordly Phone Camera', $rsa, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
$san = [System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
$san.AddDnsName('localhost')
foreach ($ip in $ips) { try { $san.AddIpAddress([System.Net.IPAddress]::Parse($ip)) } catch {} }
$req.CertificateExtensions.Add($san.Build())
$req.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false, $false, 0, $false))
$req.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new([System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature -bor [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyEncipherment, $false))
$oids = [System.Security.Cryptography.OidCollection]::new()
[void]$oids.Add([System.Security.Cryptography.Oid]::new('1.3.6.1.5.5.7.3.1'))
$req.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($oids, $false))
$cert = $req.CreateSelfSigned([DateTimeOffset]::Now.AddDays(-1), [DateTimeOffset]::Now.AddYears(20))
[System.IO.File]::WriteAllText($certPath, $cert.ExportCertificatePem())
[System.IO.File]::WriteAllText($keyPath, $rsa.ExportPkcs8PrivateKeyPem())
`;
      const encoded = Buffer.from(ps, "utf16le").toString("base64");
      const result = Pe.spawnSync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
        { timeout: 45000, windowsHide: true }
      );
      if (result.error || result.status !== 0) {
        console.warn("[phone-camera] Failed to generate HTTPS certificate. HTTPS is required for mobile camera access.", result.error || String(result.stderr || ""));
        return null;
      }
      return { cert: Q.readFileSync(certPath), key: Q.readFileSync(keyPath) };
    } catch (error) {
      console.warn("[phone-camera] Failed to prepare HTTPS certificate. HTTPS is required for mobile camera access.", error);
      return null;
    }
  }

  function recordlyPhoneCameraHtml(token) {
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Recordly 手机摄像头</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#020617;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:manipulation}body{position:fixed;inset:0}.stage{position:fixed;inset:0;background:#020617;overflow:hidden}.video{position:absolute;inset:0;background:#020617}.video video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}.empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:28px;text-align:center;color:#cbd5e1;background:radial-gradient(circle at 50% 32%,rgba(37,99,235,.18),transparent 34%),#020617}.empty strong{display:block;margin-bottom:10px;font-size:22px;color:#f8fafc}.controls{position:fixed;left:max(14px,env(safe-area-inset-left));right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:3;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;padding:12px;border:1px solid rgba(226,232,240,.18);border-radius:20px;background:rgba(15,23,42,.72);box-shadow:0 18px 60px rgba(0,0,0,.38);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);transition:opacity .22s ease,transform .22s ease}.eyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#93c5fd;font-weight:800}.title{margin-top:3px;font-size:18px;font-weight:900;line-height:1.2}.intro{margin:6px 0 0;color:#cbd5e1;font-size:13px;line-height:1.45}.status{color:#bfdbfe;font-size:13px;line-height:1.35}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}button{min-width:0;border:0;border-radius:16px;padding:13px 10px;font-weight:900;background:#2563eb;color:white;font-size:15px;line-height:1.15}button.secondary{background:rgba(148,163,184,.2);color:#e2e8f0}.hint{color:#94a3b8;font-size:12px;line-height:1.4}.tap{position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));z-index:2;transform:translateX(-50%);padding:7px 10px;border-radius:999px;background:rgba(15,23,42,.55);color:#cbd5e1;font-size:12px;opacity:0;pointer-events:none;transition:opacity .2s ease}body.streaming .empty{display:none}body.streaming .intro,body.streaming .hint,body.streaming .eyebrow{display:none}body.streaming .controls{left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));padding:10px;border-radius:18px;background:rgba(15,23,42,.56)}body.streaming .title{font-size:15px}body.streaming.idle .controls{opacity:0;transform:translateY(18px);pointer-events:none}body.streaming.idle .tap{opacity:.78}@media (orientation:landscape){.controls{left:auto;width:min(390px,42vw);top:max(14px,env(safe-area-inset-top));bottom:auto}.actions{grid-template-columns:1fr 1fr}.tap{bottom:max(10px,env(safe-area-inset-bottom))}}</style></head><body><main id="stage" class="stage"><div class="video"><video id="v" playsinline muted autoplay></video></div><div id="empty" class="empty"><div><strong>Recordly 手机摄像头</strong><span>点开始后，手机画面会传回电脑。</span></div></div><section id="controls" class="controls"><div><div class="eyebrow">Recordly Phone Camera</div><div class="title">手机摄像头</div><p class="intro">授权摄像头后，取景画面会铺满屏幕。连接成功后按钮会自动隐藏，点屏幕可再次显示。</p></div><div id="status" class="status">等待开始</div><div class="actions"><button id="start">开始摄像头</button><button id="switch" class="secondary">切换前后</button></div><div class="hint">首次 HTTPS 证书提示时，选择继续访问。</div></section><div class="tap">点屏幕显示控制</div></main><script>(()=>{const token=${JSON.stringify(token)},stage=document.getElementById("stage"),controls=document.getElementById("controls"),v=document.getElementById("v"),status=document.getElementById("status"),start=document.getElementById("start"),sw=document.getElementById("switch"),canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{alpha:false});let stream=null,facing="user",busy=false,run=false,controlsTimer=null,autoStart=localStorage.getItem("recordly-phone-camera-autostart")==="1";function setStatus(t){status.textContent=t}function showControls(){document.body.classList.remove("idle");if(controlsTimer)clearTimeout(controlsTimer);if(run)controlsTimer=setTimeout(()=>document.body.classList.add("idle"),2200)}stage.addEventListener("pointerdown",showControls);controls.addEventListener("pointerdown",e=>e.stopPropagation());function recordlyPhoneCameraGetUserMediaFallbackError(e){const name=e&&e.name?e.name:"Error",msg=e&&e.message?e.message:String(e||"未知错误");if(!window.isSecureContext)return"当前页面不是 HTTPS 安全连接，手机浏览器会禁止摄像头。请回到电脑端重新打开二维码，并确认地址以 https:// 开头。";if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return"当前浏览器不支持网页摄像头，请用系统相机扫码后在 Chrome 或 Safari 打开。";if(name==="NotAllowedError"||name==="PermissionDeniedError")return"摄像头权限被拒绝，请在浏览器设置里允许摄像头后重试。";if(name==="NotFoundError"||name==="DevicesNotFoundError")return"没有找到可用摄像头，请确认没有被系统禁用。";if(name==="NotReadableError"||name==="TrackStartError")return"摄像头被其他应用占用，请关闭相机、微信视频、会议软件后重试。";if(name==="OverconstrainedError"||name==="ConstraintNotSatisfiedError")return"当前摄像头不支持优先参数，已尝试降级仍失败："+msg;return name+": "+msg}async function recordlyPhoneCameraGetUserMediaFallback(){if(!window.isSecureContext)throw new Error("INSECURE_CONTEXT");if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error("GET_USER_MEDIA_UNAVAILABLE");const tries=[{video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}},audio:false},{video:{facingMode:{ideal:facing}},audio:false},{video:true,audio:false}];let last=null;for(const constraints of tries){try{return await navigator.mediaDevices.getUserMedia(constraints)}catch(e){last=e}}throw last||new Error("UNKNOWN_CAMERA_ERROR")}async function open(){run=false;document.body.classList.remove("idle");if(stream)stream.getTracks().forEach(t=>t.stop());setStatus("正在请求摄像头权限...");try{await document.documentElement.requestFullscreen?.()}catch{}stream=await recordlyPhoneCameraGetUserMediaFallback();v.srcObject=stream;await v.play();run=true;try{localStorage.setItem("recordly-phone-camera-autostart","1")}catch{}document.body.classList.add("streaming");start.textContent="重启摄像头";setStatus("已连接，正在传回 Recordly");showControls();loop()}async function sendFrame(){if(!run||busy||v.readyState<2||!ctx)return;busy=true;try{const vw=v.videoWidth||1280,vh=v.videoHeight||720,maxEdge=720,scale=Math.min(1,maxEdge/Math.max(vw,vh)),w=Math.max(2,Math.round(vw*scale)),h=Math.max(2,Math.round(vh*scale));if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;ctx.drawImage(v,0,0,w,h);const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",.62));if(blob)await fetch("/phone-camera/frame?token="+encodeURIComponent(token),{method:"POST",headers:{"Content-Type":"image/jpeg","X-Recordly-Frame-Width":String(w),"X-Recordly-Frame-Height":String(h)},body:blob,cache:"no-store"})}catch(e){setStatus("传输中断，正在重试...");showControls()}finally{busy=false}}async function loop(){if(!run)return;await sendFrame();if(run)setTimeout(loop,45)}start.onclick=()=>open().catch(e=>{setStatus("摄像头启动失败："+recordlyPhoneCameraGetUserMediaFallbackError(e));showControls()});sw.onclick=()=>{facing=facing==="user"?"environment":"user";open().catch(e=>{setStatus("切换失败："+recordlyPhoneCameraGetUserMediaFallbackError(e));showControls()})};if(autoStart)open().catch(e=>{setStatus("自动连接失败："+recordlyPhoneCameraGetUserMediaFallbackError(e));showControls()});})();</script></body></html>`;
  }

  function recordlyPhoneCameraRespond(status, response, body, headers = {}) {
    const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
    response.writeHead(status, {
      "Content-Length": String(payload.length),
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Recordly-Frame-Width, X-Recordly-Frame-Height",
      ...headers,
    });
    response.end(payload);
  }

  function recordlyPhoneCameraHandle(request, response) {
    try {
      const url = new URL(request.url || "/", recordlyPhoneCameraState.baseUrl || "http://127.0.0.1");
      if (request.method === "OPTIONS") {
        recordlyPhoneCameraRespond(204, response, "");
        return;
      }
      if (url.pathname === "/phone-camera" && request.method === "GET") {
        if (url.searchParams.get("token") !== recordlyPhoneCameraState.token) {
          recordlyPhoneCameraRespond(403, response, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
          return;
        }
        recordlyPhoneCameraRespond(200, response, recordlyPhoneCameraHtml(recordlyPhoneCameraState.token), {
          "Content-Type": "text/html; charset=utf-8",
        });
        return;
      }
      if (url.pathname === "/phone-camera/frame" && request.method === "POST") {
        if (url.searchParams.get("token") !== recordlyPhoneCameraState.token) {
          recordlyPhoneCameraRespond(403, response, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
          return;
        }
        const chunks = [];
        let size = 0;
        request.on("data", (chunk) => {
          size += chunk.length;
          if (size > 5 * 1024 * 1024) {
            response.writeHead(413);
            response.end();
            request.destroy();
            return;
          }
          chunks.push(chunk);
        });
        request.on("end", () => {
          recordlyPhoneCameraState.frame = Buffer.concat(chunks);
          recordlyPhoneCameraState.mime = String(request.headers["content-type"] || "image/jpeg").split(";")[0] || "image/jpeg";
          recordlyPhoneCameraState.width = Number.parseInt(String(request.headers["x-recordly-frame-width"] || "0"), 10) || 0;
          recordlyPhoneCameraState.height = Number.parseInt(String(request.headers["x-recordly-frame-height"] || "0"), 10) || 0;
          recordlyPhoneCameraState.updatedAt = Date.now();
          recordlyPhoneCameraState.serial += 1;
          if (recordlyPhoneCameraState.qrWindow && !recordlyPhoneCameraState.qrWindow.isDestroyed()) {
            try {
              recordlyPhoneCameraState.qrWindow.close();
            } catch {}
          }
          recordlyPhoneCameraRespond(204, response, "");
        });
        return;
      }
      if (url.pathname === "/phone-camera/status") {
        recordlyPhoneCameraRespond(
          200,
          response,
          JSON.stringify({
            connected: Date.now() - recordlyPhoneCameraState.updatedAt < 2500,
            serial: recordlyPhoneCameraState.serial,
            updatedAt: recordlyPhoneCameraState.updatedAt,
          }),
          { "Content-Type": "application/json; charset=utf-8" }
        );
        return;
      }
      recordlyPhoneCameraRespond(404, response, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
    } catch (error) {
      console.error("[phone-camera] request failed", error);
      recordlyPhoneCameraRespond(500, response, "Internal Server Error", { "Content-Type": "text/plain; charset=utf-8" });
    }
  }

  function recordlyPhoneCameraCreateServer(certificate) {
  const server = certificate ? xv.createServer(certificate, recordlyPhoneCameraHandle) : fm.createServer(recordlyPhoneCameraHandle);
  if (certificate) {
    server.on("tlsClientError", (error, socket) => {
      const target = recordlyPhoneCameraState.displayUrl;
      if (!target || !socket || socket.destroyed) return;
      try {
        const body = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recordly 手机摄像头</title><meta http-equiv="refresh" content="0;url=${recordlyPhoneCameraEscapeHtml(target)}"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;line-height:1.6"><h1 style="font-size:20px">正在打开安全连接</h1><p>手机摄像头需要 HTTPS。若没有自动跳转，请打开：</p><p style="word-break:break-all">${recordlyPhoneCameraEscapeHtml(target)}</p></body></html>`;
        socket.end([
          "HTTP/1.1 308 Permanent Redirect",
          `Location: ${target}`,
          "Content-Type: text/html; charset=utf-8",
          `Content-Length: ${Buffer.byteLength(body)}`,
          "Connection: close",
          "",
          body,
        ].join("\r\n"));
      } catch {
        try {
          socket.destroy();
        } catch {}
      }
    });
  }
  return server;
}

  async function recordlyPhoneCameraStart(options = {}) {
  if (recordlyPhoneCameraState.baseUrl) {
    const info = {
      success: true,
      url: recordlyPhoneCameraState.displayUrl,
      localUrl: recordlyPhoneCameraState.baseUrl,
      statusUrl: recordlyPhoneCameraState.statusUrl,
      secure: recordlyPhoneCameraState.secure,
      token: recordlyPhoneCameraState.token,
    };
    if (options.showConnectInfo !== false) recordlyPhoneCameraShowConnectInfo(info);
    return info;
  }
  if (recordlyPhoneCameraState.starting) {
    return recordlyPhoneCameraState.starting;
  }
  recordlyPhoneCameraState.starting = new Promise((resolve) => {
    const host = recordlyPhoneCameraLanAddress();
    const certificate = recordlyPhoneCameraEnsureCertificate(host);
    if (process.platform === "win32" && !certificate) {
      const error = "手机摄像头需要 HTTPS，但 Recordly 没能生成本机证书；请重启 Recordly，或检查 Windows PowerShell 是否可用。";
      console.warn("[phone-camera] " + error);
      resolve({ success: false, error });
      return;
    }
    const saved = recordlyPhoneCameraLoadSavedState();
    recordlyPhoneCameraState.token = saved.token || dm.randomBytes(18).toString("hex");
    recordlyPhoneCameraState.savedPort = saved.port || null;
    let server = recordlyPhoneCameraCreateServer(certificate);
    let triedRandomPort = false;
    const listen = (port) => {
      server.once("error", (error) => {
        if (port && !triedRandomPort) {
          triedRandomPort = true;
          console.warn("[phone-camera] Saved port unavailable; retrying on a random port.", error);
          try {
            server.close();
          } catch {}
          server = recordlyPhoneCameraCreateServer(certificate);
          listen(0);
          return;
        }
        resolve({ success: false, error: String((error && error.message) || error) });
      });
      server.listen(port || 0, "0.0.0.0", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          server.close();
          resolve({ success: false, error: "Phone camera server did not expose a TCP address" });
          return;
        }
        const protocol = certificate ? "https" : "http";
        recordlyPhoneCameraState.server = server;
        recordlyPhoneCameraState.secure = Boolean(certificate);
        recordlyPhoneCameraState.savedPort = address.port;
        recordlyPhoneCameraState.baseUrl = `${protocol}://127.0.0.1:${address.port}`;
        recordlyPhoneCameraState.displayUrl = `${protocol}://${host}:${address.port}/phone-camera?token=${encodeURIComponent(recordlyPhoneCameraState.token)}`;
        recordlyPhoneCameraState.statusUrl = `${protocol}://${host}:${address.port}/phone-camera/status`;
        recordlyPhoneCameraSaveState(address.port);
        console.log(`[phone-camera] Listening at ${recordlyPhoneCameraState.displayUrl}`);
        const info = {
          success: true,
          url: recordlyPhoneCameraState.displayUrl,
          localUrl: recordlyPhoneCameraState.baseUrl,
          statusUrl: recordlyPhoneCameraState.statusUrl,
          secure: Boolean(certificate),
          token: recordlyPhoneCameraState.token,
        };
        if (options.showConnectInfo !== false) recordlyPhoneCameraShowConnectInfo(info);
        resolve(info);
      });
    };
    listen(recordlyPhoneCameraState.savedPort || 0);
  }).finally(() => {
    recordlyPhoneCameraState.starting = null;
  });
  return recordlyPhoneCameraState.starting;
}

  function recordlyPhoneCameraEscapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  async function recordlyPhoneCameraQrDataUrl(url) {
    try {
      const qrcode = require("qrcode");
      return await qrcode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 292,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
    } catch (error) {
      console.warn("[phone-camera] Failed to generate QR code.", error);
      return null;
    }
  }

  function recordlyPhoneCameraQrHtml(info, qrDataUrl) {
    const url = recordlyPhoneCameraEscapeHtml(info.url);
    const statusUrl = recordlyPhoneCameraEscapeHtml(info.statusUrl || "");
    const protocolLabel = info.secure ? "HTTPS 安全连接" : "HTTP 临时连接";
    const qr = qrDataUrl
      ? `<img src="${qrDataUrl}" alt="手机连接二维码" style="width:292px;height:292px;display:block;border-radius:18px;background:#fff;padding:12px;box-sizing:border-box">`
      : `<div style="width:292px;height:292px;border-radius:18px;background:#0f172a;color:#bfdbfe;display:flex;align-items:center;justify-content:center;text-align:center;padding:22px;box-sizing:border-box">二维码生成失败，请复制下方地址打开</div>`;
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recordly 手机摄像头</title></head><body style="margin:0;background:#08111f;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><main style="box-sizing:border-box;width:100%;min-height:100vh;padding:22px;display:flex;align-items:center;justify-content:center"><section style="width:384px;max-width:100%;border:1px solid rgba(148,163,184,.2);border-radius:24px;background:#0f172a;box-shadow:0 24px 80px rgba(0,0,0,.42);padding:20px;box-sizing:border-box"><div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#93c5fd;font-weight:800">Recordly Phone Camera</div><h1 style="font-size:22px;line-height:1.25;margin:8px 0 10px">手机扫码连接摄像头</h1><div style="display:inline-flex;margin:0 0 12px;padding:5px 9px;border-radius:999px;background:rgba(37,99,235,.16);color:#bfdbfe;font-size:12px;font-weight:800">${protocolLabel}</div><div style="display:flex;justify-content:center">${qr}</div><p style="margin:14px 0 0;color:#cbd5e1;font-size:13px;line-height:1.55">用手机系统相机、Chrome 或 Safari 扫码打开；不要用带 AI 搜索、云加速的浏览器内置扫码。打开后点“开始摄像头”并授权。</p><div style="margin-top:10px;padding:10px 11px;border-radius:12px;background:#020617;border:1px solid rgba(148,163,184,.16);color:#bfdbfe;font-size:12px;line-height:1.45;word-break:break-all">${url}</div>${statusUrl ? `<div style="margin-top:8px;color:#94a3b8;font-size:11px;line-height:1.45;word-break:break-all">网络测试：${statusUrl}</div>` : ""}<p style="margin:10px 0 0;color:#94a3b8;font-size:12px;line-height:1.5">地址已复制到剪贴板。首次 HTTPS 证书提示请选择继续访问；若手机仍显示网页无法访问，通常是路由器设备隔离或手机浏览器代理拦截。</p></section></main></body></html>`;
  }

  function recordlyPhoneCameraShowConnectInfo(info) {
    if (!info || !info.url) return;
    try {
      m.clipboard.writeText(info.url);
    } catch {}
    const now = Date.now();
    if (now - recordlyPhoneCameraState.lastPromptAt < 1500) return;
    recordlyPhoneCameraState.lastPromptAt = now;
    (async () => {
      const qrDataUrl = await recordlyPhoneCameraQrDataUrl(info.url);
      try {
        let win = recordlyPhoneCameraState.qrWindow;
        if (!win || win.isDestroyed()) {
          win = new m.BrowserWindow({
            width: 430,
            height: 575,
            resizable: false,
            maximizable: false,
            minimizable: true,
            alwaysOnTop: true,
            title: "Recordly 手机摄像头",
            autoHideMenuBar: true,
            backgroundColor: "#08111f",
            webPreferences: {
              contextIsolation: true,
              nodeIntegration: false,
              sandbox: true,
            },
          });
          recordlyPhoneCameraState.qrWindow = win;
          win.on("closed", () => {
            if (recordlyPhoneCameraState.qrWindow === win) recordlyPhoneCameraState.qrWindow = null;
          });
        }
        const html = recordlyPhoneCameraQrHtml(info, qrDataUrl);
        await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        win.show();
        win.focus();
      } catch (error) {
        console.warn("[phone-camera] Failed to show QR window.", error);
        // Keep recording flow non-blocking; the URL is already copied to clipboard.
        return;
      }
    })();
  }

  m.ipcMain.handle("recordly-phone-camera:start", async (event, options = {}) => recordlyPhoneCameraStart(options));
  m.ipcMain.handle("recordly-phone-camera:get-frame", (event, options = {}) => {
    const since = Number(options && options.since) || 0;
    const connected = Date.now() - recordlyPhoneCameraState.updatedAt < 2500;
    if (!recordlyPhoneCameraState.frame || recordlyPhoneCameraState.serial <= since) {
      return {
        success: true,
        connected,
        serial: recordlyPhoneCameraState.serial,
        updatedAt: recordlyPhoneCameraState.updatedAt,
        width: recordlyPhoneCameraState.width,
        height: recordlyPhoneCameraState.height,
      };
    }
    return {
      success: true,
      connected,
      serial: recordlyPhoneCameraState.serial,
      updatedAt: recordlyPhoneCameraState.updatedAt,
      width: recordlyPhoneCameraState.width,
      height: recordlyPhoneCameraState.height,
      mime: recordlyPhoneCameraState.mime,
      frameBuffer: recordlyPhoneCameraState.frame.buffer.slice(recordlyPhoneCameraState.frame.byteOffset, recordlyPhoneCameraState.frame.byteOffset + recordlyPhoneCameraState.frame.byteLength),
    };
  });
  m.ipcMain.handle("recordly-phone-camera:stop", () => {
    recordlyPhoneCameraState.frame = null;
    recordlyPhoneCameraState.serial += 1;
    recordlyPhoneCameraState.updatedAt = 0;
    return { success: true };
  });
  m.app.on("before-quit", () => {
    if (recordlyPhoneCameraState.server) {
      recordlyPhoneCameraState.server.close();
      recordlyPhoneCameraState.server = null;
    }
  });
}

function recordlyPhoneCameraRendererHelpers() {
  const recordlyPhoneCameraDeviceId = "recordly-phone-camera";
  function recordlyIsPhoneCameraDevice(deviceId) {
    return deviceId === recordlyPhoneCameraDeviceId;
  }
  let recordlyPhoneCameraPanel = null;

  function recordlyPhoneCameraPanelSet(info, status) {
    if (!recordlyPhoneCameraPanel) return;
    const url = recordlyPhoneCameraPanel.querySelector("[data-recordly-phone-url]");
    const statusNode = recordlyPhoneCameraPanel.querySelector("[data-recordly-phone-status]");
    const secureNode = recordlyPhoneCameraPanel.querySelector("[data-recordly-phone-secure]");
    if (url) url.textContent = (info && info.url) || "";
    if (statusNode) statusNode.textContent = status || "等待手机连接...";
    if (secureNode) {
      secureNode.textContent = info && info.secure ? "首次打开如出现证书提示，请选择继续访问。" : "当前为 HTTP 连接；如果手机浏览器拒绝摄像头，请改用 HTTPS 环境。";
    }
  }

  function recordlyPhoneCameraShowPanel(info) {
    if (typeof document === "undefined") return;
    if (!recordlyPhoneCameraPanel) {
      const panel = document.createElement("div");
      panel.id = "recordly-phone-camera-panel";
      panel.style.cssText =
        "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(2,6,23,.72);backdrop-filter:blur(10px);color:#f8fafc;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;pointer-events:auto";
      panel.innerHTML =
        '<div style="width:min(520px,92vw);border:1px solid rgba(148,163,184,.22);border-radius:22px;background:rgba(15,23,42,.96);box-shadow:0 24px 80px rgba(0,0,0,.42);padding:22px"><div style="display:flex;align-items:start;gap:14px"><div style="width:44px;height:44px;border-radius:16px;background:#2563eb;display:flex;align-items:center;justify-content:center;font-weight:900">CAM</div><div style="min-width:0;flex:1"><div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#93c5fd;font-weight:800">Recordly Phone Camera</div><div style="margin-top:5px;font-size:20px;font-weight:800;line-height:1.25">手机摄像头连接</div><div style="margin-top:8px;font-size:13px;line-height:1.55;color:#cbd5e1">在手机上打开下面地址，授权摄像头后画面会自动进入录制条。</div></div><button data-recordly-phone-close style="width:34px;height:34px;border:0;border-radius:12px;background:rgba(148,163,184,.14);color:#e2e8f0;font-size:18px;cursor:pointer">x</button></div><div data-recordly-phone-url style="margin-top:18px;padding:13px;border-radius:14px;background:#020617;color:#bfdbfe;font-size:13px;line-height:1.45;word-break:break-all;border:1px solid rgba(148,163,184,.16)"></div><div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap"><button data-recordly-phone-copy style="border:0;border-radius:13px;padding:10px 14px;background:#2563eb;color:white;font-weight:800;cursor:pointer">复制地址</button><span data-recordly-phone-status style="font-size:13px;color:#bfdbfe">等待手机连接...</span></div><div data-recordly-phone-secure style="margin-top:12px;font-size:12px;color:#94a3b8;line-height:1.5"></div></div>';
      document.body.appendChild(panel);
      panel.querySelector("[data-recordly-phone-close]")?.addEventListener("click", () => {
        panel.style.display = "none";
      });
      panel.querySelector("[data-recordly-phone-copy]")?.addEventListener("click", () => {
        const value = panel.querySelector("[data-recordly-phone-url]")?.textContent || "";
        navigator.clipboard?.writeText(value).catch(() => {});
      });
      recordlyPhoneCameraPanel = panel;
    }
    recordlyPhoneCameraPanel.style.display = "flex";
    recordlyPhoneCameraPanelSet(info);
  }

  function recordlyPhoneCameraHidePanel() {
    if (recordlyPhoneCameraPanel) {
      recordlyPhoneCameraPanel.style.display = "none";
    }
  }

  function recordlyPhoneCameraDrawCover(ctx, width, height, image) {
    const frameRatio = width / height;
    const imageRatio = image.width / image.height;
    let x = 0;
    let y = 0;
    let w = width;
    let h = height;
    if (frameRatio > imageRatio) {
      w = height * imageRatio;
      x = (width - w) / 2;
    } else {
      h = width / imageRatio;
      y = (height - h) / 2;
    }
    ctx.drawImage(image, x, y, w, h);
  }

  function recordlyPhoneCameraDrawPlaceholder(ctx, width, height, text) {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(0, 0, width, Math.max(8, Math.round(0.012 * height)));
    ctx.fillStyle = "#e2e8f0";
    ctx.font = `700 ${Math.max(26, Math.round(width * 0.034))}px system-ui,sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Recordly 手机摄像头", width / 2, height * 0.42);
    ctx.fillStyle = "#93c5fd";
    ctx.font = `500 ${Math.max(16, Math.round(width * 0.018))}px system-ui,sans-serif`;
    ctx.fillText(text, width / 2, height * 0.52);
  }

  async function recordlyPhoneCameraCreateStream() {
    if (!window.electronAPI?.phoneCameraStart || typeof document.createElement("canvas").captureStream !== "function") {
      throw new Error("Phone camera is not available in this build.");
    }
    const info = await window.electronAPI.phoneCameraStart();
    if (!info?.success) {
      throw new Error(info?.error || "Failed to start phone camera server.");
    }
    recordlyPhoneCameraPanelSet(info, "请在弹出的二维码窗口扫码连接");

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d", { alpha: false });
    recordlyPhoneCameraDrawPlaceholder(ctx, canvas.width, canvas.height, "等待手机打开连接地址");
    const stream = canvas.captureStream(30);
    const track = stream.getVideoTracks()[0];
    const requestCanvasFrame = () => {
      try {
        track?.requestFrame?.();
      } catch {}
    };
    requestCanvasFrame();
    let serial = 0;
    let busy = false;
    let rendering = false;
    let firstTimer = null;
    let lastFrameAt = 0;
    let timer = null;
    let pendingFrame = null;
    let latestBitmap = null;

    const decodeFallbackImage = (url) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = () => {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
          reject(new Error("Failed to decode phone camera frame."));
        };
        image.src = url;
      });

    const decodeFrame = async (frame) => {
      const bytes = frame?.frameBuffer;
      if (bytes) {
        const blob = new Blob([bytes], { type: frame.mime || "image/jpeg" });
        if (typeof createImageBitmap === "function") return createImageBitmap(blob);
        return decodeFallbackImage(URL.createObjectURL(blob));
      }
      if (frame?.frameDataUrl) {
        if (typeof createImageBitmap === "function") {
          const blob = await (await fetch(frame.frameDataUrl)).blob();
          return createImageBitmap(blob);
        }
        return decodeFallbackImage(frame.frameDataUrl);
      }
      return null;
    };

    const drawDecodedFrame = (bitmap, frame) => {
      const nextWidth = Math.max(2, Number(frame?.width) || bitmap.width || canvas.width);
      const nextHeight = Math.max(2, Number(frame?.height) || bitmap.height || canvas.height);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      recordlyPhoneCameraDrawCover(ctx, canvas.width, canvas.height, bitmap);
      requestCanvasFrame();
      lastFrameAt = Date.now();
      recordlyPhoneCameraPanelSet(info, canvas.height > canvas.width ? "手机画面已连接（竖屏）" : "手机画面已连接");
    };

    const renderLatestFrame = async () => {
      if (rendering) return;
      rendering = true;
      try {
        while (pendingFrame) {
          const frame = pendingFrame;
          pendingFrame = null;
          const bitmap = await decodeFrame(frame);
          if (!bitmap) continue;
          latestBitmap?.close?.();
          latestBitmap = bitmap;
          drawDecodedFrame(bitmap, frame);
        }
      } catch (error) {
        if (Date.now() - lastFrameAt > 1600) {
          recordlyPhoneCameraDrawPlaceholder(ctx, canvas.width, canvas.height, "画面解码中，正在重试...");
          requestCanvasFrame();
        }
      } finally {
        rendering = false;
        if (pendingFrame) void renderLatestFrame();
      }
    };

    const enqueueFrame = (frame) => {
      pendingFrame = frame;
      void renderLatestFrame();
    };

    const poll = async () => {
      if (busy) return;
      busy = true;
      try {
        const frame = await window.electronAPI.phoneCameraGetFrame?.({ since: serial });
        if (frame?.serial) serial = frame.serial;
        if (frame?.frameBuffer || frame?.frameDataUrl) {
          enqueueFrame(frame);
        } else if (Date.now() - lastFrameAt > 1600) {
          recordlyPhoneCameraDrawPlaceholder(ctx, canvas.width, canvas.height, frame?.connected ? "等待下一帧..." : "等待手机连接...");
          requestCanvasFrame();
        }
        if (frame?.connected) {
          recordlyPhoneCameraPanelSet(info, "手机画面已连接");
        }
      } catch (error) {
        if (Date.now() - lastFrameAt > 1600) {
          recordlyPhoneCameraDrawPlaceholder(ctx, canvas.width, canvas.height, "连接中断，正在重试...");
          requestCanvasFrame();
        }
      } finally {
        busy = false;
      }
    };

    timer = setInterval(poll, 70);
    firstTimer = setTimeout(poll, 20);
    const cleanup = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (firstTimer) {
        clearTimeout(firstTimer);
        firstTimer = null;
      }
      pendingFrame = null;
      latestBitmap?.close?.();
      latestBitmap = null;
      recordlyPhoneCameraHidePanel();
    };
    if (track) {
      const originalStop = track.stop.bind(track);
      track.stop = () => {
        cleanup();
        originalStop();
      };
    }
    return stream;
  }
}

const mainBlock = `;(${recordlyPhoneCameraMainPatch.toString()})();`;
const rendererHelper = `${functionBody(recordlyPhoneCameraRendererHelpers)}\n`;

const mainPatches = [
  {
    label: "phone camera main IPC and local server",
    skipIf: 'recordly-phone-camera:start',
    search: 'm.app.on("before-quit",()=>{vC(),Em(),VS(),uS()});',
    replace: `${mainBlock}m.app.on("before-quit",()=>{vC(),Em(),VS(),uS()});`,
  },
];

const preloadPatches = [
  {
    label: "phone camera preload API",
    skipIf: "phoneCameraStart",
    search: 'setRecordingPreferences:e=>r.ipcRenderer.invoke("set-recording-preferences",e),getCountdownDelay:()=>r.ipcRenderer.invoke("get-countdown-delay"),',
    replace:
      'setRecordingPreferences:e=>r.ipcRenderer.invoke("set-recording-preferences",e),phoneCameraStart:()=>r.ipcRenderer.invoke("recordly-phone-camera:start"),phoneCameraGetFrame:e=>r.ipcRenderer.invoke("recordly-phone-camera:get-frame",e),phoneCameraStop:()=>r.ipcRenderer.invoke("recordly-phone-camera:stop"),getCountdownDelay:()=>r.ipcRenderer.invoke("get-countdown-delay"),',
  },
];

const rendererPatches = [
  {
    label: "phone camera renderer helpers",
    skipIf: "recordlyPhoneCameraDeviceId",
    search: "const Sva=[/iphone/i",
    replace: `${rendererHelper}const Sva=[/iphone/i`,
  },
  {
    label: "phone camera pseudo device",
    search:
      "function kva(e){return[...e].filter(e=>!e.isMobileCamera).sort((e,a)=>e.label.localeCompare(a.label))}",
    replace:
      'function kva(e){return[...e].filter(e=>!e.isMobileCamera).sort((e,a)=>e.label.localeCompare(a.label)).concat([{deviceId:recordlyPhoneCameraDeviceId,label:"手机摄像头（本地连接）",groupId:"recordly-phone-camera",isMobileCamera:!0,isPhoneCamera:!0}])}',
  },
  {
    label: "recording phone camera stream",
    search:
      'N.current=function(e){const a=e?.getVideoTracks().filter(e=>"live"===e.readyState).map(e=>e.clone())??[];return a.length>0?new MediaStream(a):null}(k.current)??await navigator.mediaDevices.getUserMedia({video:E?{deviceId:{exact:E},width:{ideal:vva},height:{ideal:720},frameRate:{ideal:30,max:30}}:{width:{ideal:vva},height:{ideal:720},frameRate:{ideal:30,max:30}},audio:!1}),w(N.current);',
    replace:
      'N.current=recordlyIsPhoneCameraDevice(E)?await recordlyPhoneCameraCreateStream():function(e){const a=e?.getVideoTracks().filter(e=>"live"===e.readyState).map(e=>e.clone())??[];return a.length>0?new MediaStream(a):null}(k.current)??await navigator.mediaDevices.getUserMedia({video:E?{deviceId:{exact:E},width:{ideal:vva},height:{ideal:720},frameRate:{ideal:30,max:30}}:{width:{ideal:vva},height:{ideal:720},frameRate:{ideal:30,max:30}},audio:!1}),w(N.current);',
  },
  {
    label: "preview phone camera stream",
    search:
      'const a=await navigator.mediaDevices.getUserMedia({video:t?{deviceId:{exact:t},width:{ideal:640},height:{ideal:360},aspectRatio:{ideal:16/9},frameRate:{ideal:24,max:30}}:{width:{ideal:640},height:{ideal:360},aspectRatio:{ideal:16/9},frameRate:{ideal:24,max:30}},audio:!1});if(!e)return void a.getTracks().forEach(e=>e.stop());',
    replace:
      'const a=recordlyIsPhoneCameraDevice(t)?await recordlyPhoneCameraCreateStream():await navigator.mediaDevices.getUserMedia({video:t?{deviceId:{exact:t},width:{ideal:640},height:{ideal:360},aspectRatio:{ideal:16/9},frameRate:{ideal:24,max:30}}:{width:{ideal:640},height:{ideal:360},aspectRatio:{ideal:16/9},frameRate:{ideal:24,max:30}},audio:!1});if(!e)return void a.getTracks().forEach(e=>e.stop());',
  },
];

patchFile(mainPath, mainPatches);
patchFile(preloadPath, preloadPatches);
patchFile(activeRendererPath(), rendererPatches);

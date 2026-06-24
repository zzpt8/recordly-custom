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

function replaceOnce(text, search, replace, label, file) {
  if (text.includes(replace)) return text;
  const index = text.indexOf(search);
  if (index < 0) {
    throw new Error(`${path.relative(root, file)} missing ${label}`);
  }
  return text.slice(0, index) + replace + text.slice(index + search.length);
}

function patchFile(file, patches) {
  let text = read(file);
  const before = text;
  for (const patch of patches) {
    text = replaceOnce(text, patch.search, patch.replace, patch.label, file);
  }
  if (text !== before) write(file, text);
  console.log(`${text === before ? "unchanged" : "patched"} ${path.relative(root, file)}`);
}

const oldPhoneSender =
  'async function sendFrame(){if(!run||busy||v.readyState<2||!ctx)return;busy=true;try{const vw=v.videoWidth||1280,vh=v.videoHeight||720,scale=960/Math.max(vw,vh),w=Math.max(2,Math.round(vw*scale)),h=Math.max(2,Math.round(vh*scale));canvas.width=w;canvas.height=h;ctx.drawImage(v,0,0,w,h);const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",.72));if(blob)await fetch("/phone-camera/frame?token="+encodeURIComponent(token),{method:"POST",headers:{"Content-Type":"image/jpeg","X-Recordly-Frame-Width":String(w),"X-Recordly-Frame-Height":String(h)},body:blob,cache:"no-store"})}catch(e){setStatus("传输中断，正在重试...");showControls()}finally{busy=false}}function loop(){if(!run)return;sendFrame();setTimeout(loop,90)}';

const newPhoneSender =
  'async function sendFrame(){if(!run||busy||v.readyState<2||!ctx)return;busy=true;try{const vw=v.videoWidth||1280,vh=v.videoHeight||720,maxEdge=720,scale=Math.min(1,maxEdge/Math.max(vw,vh)),w=Math.max(2,Math.round(vw*scale)),h=Math.max(2,Math.round(vh*scale));if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;ctx.drawImage(v,0,0,w,h);const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",.62));if(blob)await fetch("/phone-camera/frame?token="+encodeURIComponent(token),{method:"POST",headers:{"Content-Type":"image/jpeg","X-Recordly-Frame-Width":String(w),"X-Recordly-Frame-Height":String(h)},body:blob,cache:"no-store"})}catch(e){setStatus("传输中断，正在重试...");showControls()}finally{busy=false}}async function loop(){if(!run)return;await sendFrame();if(run)setTimeout(loop,45)}';

const oldMainFrameReturn =
  'frameDataUrl: `data:${recordlyPhoneCameraState.mime};base64,${recordlyPhoneCameraState.frame.toString("base64")}`,';

const newMainFrameReturn =
  'mime: recordlyPhoneCameraState.mime,\n      frameBuffer: recordlyPhoneCameraState.frame.buffer.slice(recordlyPhoneCameraState.frame.byteOffset, recordlyPhoneCameraState.frame.byteOffset + recordlyPhoneCameraState.frame.byteLength),';

const oldRendererFramePump = `let serial = 0;
    let busy = false;
    let firstTimer = null;
    let lastFrameAt = 0;
    let timer = null;
    const image = new Image();

    let frameWidth = 0;
    let frameHeight = 0;

    image.onload = () => {
      const nextWidth = Math.max(2, Number(frameWidth) || image.naturalWidth || image.width || canvas.width);
      const nextHeight = Math.max(2, Number(frameHeight) || image.naturalHeight || image.height || canvas.height);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      recordlyPhoneCameraDrawCover(ctx, canvas.width, canvas.height, image);
      requestCanvasFrame();
      recordlyPhoneCameraPanelSet(info, canvas.height > canvas.width ? "手机画面已连接（竖屏）" : "手机画面已连接");
    };
    image.onerror = () => {};

    const poll = async () => {
      if (busy) return;
      busy = true;
      try {
        const frame = await window.electronAPI.phoneCameraGetFrame?.({ since: serial });
        if (frame?.serial) serial = frame.serial;
        if (frame?.frameDataUrl) {
          frameWidth = Number(frame.width) || 0;
          frameHeight = Number(frame.height) || 0;
          image.src = frame.frameDataUrl;
          lastFrameAt = Date.now();
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

    timer = setInterval(poll, 120);
    firstTimer = setTimeout(poll, 20);`;

const newRendererFramePump = `let serial = 0;
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
    firstTimer = setTimeout(poll, 20);`;

const oldCleanup = `      recordlyPhoneCameraHidePanel();
    };`;

const newCleanup = `      pendingFrame = null;
      latestBitmap?.close?.();
      latestBitmap = null;
      recordlyPhoneCameraHidePanel();
    };`;

patchFile(mainPath, [
  { label: "mobile sender adaptive frame loop", search: oldPhoneSender, replace: newPhoneSender },
  { label: "main binary phone frame IPC", search: oldMainFrameReturn, replace: newMainFrameReturn },
]);

patchFile(phonePatchPath, [
  { label: "patch script mobile sender adaptive frame loop", search: oldPhoneSender, replace: newPhoneSender },
  { label: "patch script main binary phone frame IPC", search: oldMainFrameReturn, replace: newMainFrameReturn },
  { label: "patch script renderer latest-frame decoder", search: oldRendererFramePump, replace: newRendererFramePump },
  { label: "patch script phone camera cleanup", search: oldCleanup, replace: newCleanup },
]);

patchFile(activeRendererPath(), [
  { label: "renderer latest-frame decoder", search: oldRendererFramePump, replace: newRendererFramePump },
  { label: "renderer phone camera cleanup", search: oldCleanup, replace: newCleanup },
]);

patchFile(verifyPath, [
  {
    label: "verify smooth phone camera stream",
    search: 'assertIncludes(rendererPath, "requestCanvasFrame", "phone camera canvas frame refresh");',
    replace:
      'assertIncludes(rendererPath, "requestCanvasFrame", "phone camera canvas frame refresh");\nassertIncludes(mainPath, "frameBuffer: recordlyPhoneCameraState.frame.buffer.slice", "binary phone camera frame IPC");\nassertIncludes(mainPath, "maxEdge=720", "lighter mobile frame upload");\nassertIncludes(rendererPath, "pendingFrame", "latest-only phone frame queue");\nassertIncludes(rendererPath, "createImageBitmap", "fast phone frame decode");',
  },
]);

console.log("phone camera smooth stream patch applied");

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

let video = null, logo = null;
let videoX = 0, videoY = 0, videoW = 0, videoH = 0;
let logoX = 0, logoY = 0, logoW = 150, logoH = 150;

let dragging = false, dragTarget = null, startX = 0, startY = 0, lastDist = null;

// ---- Dibujo de canvas ----
function drawEditor() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (video && video.readyState >= 2) ctx.drawImage(video, videoX, videoY, videoW, videoH);
  if (logo) ctx.drawImage(logo, logoX, logoY, logoW, logoH);
  requestAnimationFrame(drawEditor);
}
drawEditor();

// ---- Cargar video ----
document.getElementById("videoInput").addEventListener("change", e => {
  const file = e.target.files[0]; if (!file) return;
  video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.loop = true; video.muted = true; video.play();

  video.addEventListener("loadedmetadata", () => {
    const maxW = 1080, maxH = 1350;
    const ratio = Math.min(maxW / video.videoWidth, maxH / video.videoHeight);
    videoW = video.videoWidth * ratio;
    videoH = video.videoHeight * ratio;
    canvas.width = 1080;
    canvas.height = 1350;
    videoX = (canvas.width - videoW) / 2;
    videoY = (canvas.height - videoH) / 2;
    logoX = canvas.width - logoW - 20;
    logoY = canvas.height - logoH - 20;
  });
});

// ---- Cargar logo PNG ----
document.getElementById("logoInput").addEventListener("change", e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    logo = new Image();
    logo.src = ev.target.result;
    logo.onload = () => {
      logoH = logoW * (logo.height / logo.width);
      logoX = canvas.width - logoW - 20;
      logoY = canvas.height - logoH - 20;
    };
  };
  reader.readAsDataURL(file);
});

// ---- Drag & Pinch ----
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches) {
    return [
      (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
      (e.touches[0].clientY - rect.top) * (canvas.height / rect.height)
    ];
  } else {
    return [
      (e.clientX - rect.left) * (canvas.width / rect.width),
      (e.clientY - rect.top) * (canvas.height / rect.height)
    ];
  }
}

function startDrag(e) {
  const [x, y] = getPos(e);
  if (logo && x >= logoX && x <= logoX + logoW && y >= logoY && y <= logoY + logoH) dragTarget = "logo";
  else dragTarget = null;
  dragging = true; startX = x; startY = y;

  if (e.touches && e.touches.length === 2) {
    lastDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}

function moveDrag(e) {
  if (!dragging) return;
  const [x, y] = getPos(e);
  const dx = x - startX, dy = y - startY;

  if (e.touches && e.touches.length === 2 && lastDist) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const zoom = dist / lastDist;
    if (dragTarget === "logo") {
      const cx = logoX + logoW/2, cy = logoY + logoH/2;
      let newW = logoW * zoom;
      let newH = logoH * zoom;
      newW = Math.min(newW, canvas.width); // límite ancho
      newH = Math.min(newH, canvas.height); // límite alto
      logoW = newW; logoH = newH;
      logoX = Math.min(Math.max(0, cx - logoW/2), canvas.width - logoW);
      logoY = Math.min(Math.max(0, cy - logoH/2), canvas.height - logoH);
    }
    lastDist = dist;
  } else {
    if (dragTarget === "logo") {
      logoX = Math.min(Math.max(0, logoX + dx), canvas.width - logoW);
      logoY = Math.min(Math.max(0, logoY + dy), canvas.height - logoH);
    }
  }
  startX = x; startY = y;
}

function endDrag() { dragging = false; lastDist = null; }

canvas.addEventListener("mousedown", startDrag);
canvas.addEventListener("mousemove", moveDrag);
canvas.addEventListener("mouseup", endDrag);
canvas.addEventListener("mouseleave", endDrag);
canvas.addEventListener("touchstart", startDrag);
canvas.addEventListener("touchmove", moveDrag, { passive: false });
canvas.addEventListener("touchend", endDrag);
canvas.addEventListener("touchcancel", endDrag);

// ---- Exportar con ffmpeg.wasm ----
const { createFFmpeg, fetchFile } = FFmpeg; // UMD global
const ffmpeg = createFFmpeg({ log: true });

document.getElementById("exportBtn").addEventListener("click", async () => {
  if (!video || !logo) return alert("Subí video y logo primero.");

  document.getElementById("exportBtn").disabled = true;

  await ffmpeg.load();

  // Convertir video a mp4 y superponer logo
  const videoFile = document.getElementById("videoInput").files[0];
  const logoFile = document.getElementById("logoInput").files[0];

  ffmpeg.FS('writeFile', 'video.mp4', await fetchFile(videoFile));
  ffmpeg.FS('writeFile', 'logo.png', await fetchFile(logoFile));

  const overlayX = Math.round(logoX);
  const overlayY = Math.round(logoY);
  const overlayW = Math.round(logoW);
  const overlayH = Math.round(logoH);

  await ffmpeg.run(
    '-i', 'video.mp4',
    '-i', 'logo.png',
    '-filter_complex', `[1:v]scale=${overlayW}:${overlayH}[logo];[0:v][logo]overlay=${overlayX}:${overlayY}`,
    '-vf', 'scale=1080:1350:force_original_aspect_ratio=decrease,pad=1080:1350:(ow-iw)/2:(oh-ih)/2',
    '-c:a', 'copy',
    'output.mp4'
  );

  const data = ffmpeg.FS('readFile', 'output.mp4');
  const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

  const a = document.createElement('a');
  a.href = url;
  a.download = 'video_final.mp4';
  a.click();

  document.getElementById("exportBtn").disabled = false;
});

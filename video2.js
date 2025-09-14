// -------------------- VIDEO + LOGO EDITOR --------------------

// Usamos la versión UMD de FFmpeg
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

let video = null, logo = null;

let videoX = 0, videoY = 0, videoW = 0, videoH = 0;
let logoX = 0, logoY = 0, logoW = 100, logoH = 100;

let dragging = false, dragTarget = null, startX = 0, startY = 0, lastDist = null;

// -------------------- DIBUJAR CANVAS --------------------
function drawEditor() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (video && video.readyState >= 2) ctx.drawImage(video, videoX, videoY, videoW, videoH);
  if (logo) ctx.drawImage(logo, logoX, logoY, logoW, logoH);
  requestAnimationFrame(drawEditor);
}
drawEditor();

// -------------------- CARGA VIDEO --------------------
document.getElementById("videoInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.loop = true;
  video.muted = true;
  video.play();

  video.addEventListener("loadedmetadata", () => {
    const canvasRatio = 1080 / 1350; // export ratio fijo
    const videoRatio = video.videoWidth / video.videoHeight;

    if (videoRatio > canvasRatio) {
      videoW = 1080;
      videoH = 1080 / videoRatio;
    } else {
      videoH = 1350;
      videoW = 1350 * videoRatio;
    }

    canvas.width = 1080;
    canvas.height = 1350;

    videoX = (canvas.width - videoW) / 2;
    videoY = (canvas.height - videoH) / 2;

    logoX = videoX + videoW - 150;
    logoY = videoY + videoH - 150;
    logoW = 100;
    logoH = 100;
  });
});

// -------------------- CARGA LOGO --------------------
document.getElementById("logoInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    logo = new Image();
    logo.onload = () => {
      logoW = 100;
      logoH = logoW * (logo.height / logo.width);
      logoX = canvas.width - logoW - 10;
      logoY = canvas.height - logoH - 10;
    };
    logo.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// -------------------- DRAG & PINCH --------------------
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

  dragging = true;
  startX = x;
  startY = y;

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
  const dx = x - startX;
  const dy = y - startY;

  if (e.touches && e.touches.length === 2 && lastDist) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const zoom = dist / lastDist;
    if (dragTarget === "logo") {
      const cx = logoX + logoW / 2;
      const cy = logoY + logoH / 2;
      let newW = logoW * zoom;
      let newH = logoH * zoom;
      if (newW > videoW) { newW = videoW; newH = newW * (logo.height / logo.width); }
      if (newH > videoH) { newH = videoH; newW = newH * (logo.width / logo.height); }
      logoW = newW; logoH = newH;
      logoX = Math.min(Math.max(videoX, cx - logoW / 2), videoX + videoW - logoW);
      logoY = Math.min(Math.max(videoY, cy - logoH / 2), videoY + videoH - logoH);
    }
    lastDist = dist;
  } else {
    if (dragTarget === "logo") {
      logoX = Math.min(Math.max(videoX, logoX + dx), videoX + videoW - logoW);
      logoY = Math.min(Math.max(videoY, logoY + dy), videoY + videoH - logoH);
    }
  }

  startX = x;
  startY = y;
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

// -------------------- EXPORT --------------------
document.getElementById("exportBtn").addEventListener("click", async () => {
  if (!video) return alert("Subí primero un video.");
  if (!logo) return alert("Subí primero un logo.");

  if (!ffmpeg.isLoaded()) await ffmpeg.load();

  const outputFile = "video_final.mp4";

  // Traer archivos
  const videoFile = document.getElementById("videoInput").files[0];
  const logoFile = document.getElementById("logoInput").files[0];

  ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));
  ffmpeg.FS('writeFile', 'logo.png', await fetchFile(logoFile));

  // Overlay a 1080x1350, centrado video original
  const scaleFilter = `[0:v]scale=w=1080:h=1350:force_original_aspect_ratio=decrease,pad=1080:1350:(ow-iw)/2:(oh-ih)/2:black[vid];`;
  const overlayFilter = `[vid][1:v]overlay=${logoX}:${logoY}[out]`;

  await ffmpeg.run(
    '-i', 'input.mp4',
    '-i', 'logo.png',
    '-filter_complex', `${scaleFilter}${overlayFilter}`,
    '-map', '[out]',
    '-c:a', 'copy',
    outputFile
  );

  const data = ffmpeg.FS('readFile', outputFile);
  const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

  const a = document.createElement('a');
  a.href = url;
  a.download = outputFile;
  a.click();
});

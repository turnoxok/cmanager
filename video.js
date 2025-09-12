const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
const WIDTH = 1080, HEIGHT = 1350;
canvas.width = WIDTH;
canvas.height = HEIGHT;

let video = null, logo = null;

// Video
let videoX = 0, videoY = 0, videoW = WIDTH, videoH = HEIGHT, videoRatio = 1;

// Logo
let logoX = WIDTH - 270, logoY = HEIGHT - 270, logoW = 250, logoH = 250;

// Arrastre
let dragging = false, dragTarget = null, startX = 0, startY = 0, lastDist = null;

function drawEditor() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (video && video.readyState >= 2) ctx.drawImage(video, videoX, videoY, videoW, videoH);
  if (logo) ctx.drawImage(logo, logoX, logoY, logoW, logoH);
}
function loop() { drawEditor(); requestAnimationFrame(loop); }
loop();

// -------------------- Carga video --------------------
document.getElementById("videoInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.loop = true;
  video.muted = false;
  video.play();

  video.addEventListener("loadedmetadata", () => {
    videoRatio = video.videoWidth / video.videoHeight;
    if (videoRatio > WIDTH / HEIGHT) {
      videoH = HEIGHT;
      videoW = videoH * videoRatio;
      videoX = (WIDTH - videoW) / 2;
      videoY = 0;
    } else {
      videoW = WIDTH;
      videoH = videoW / videoRatio;
      videoX = 0;
      videoY = (HEIGHT - videoH) / 2;
    }
  });
});

// -------------------- Carga logo --------------------
document.getElementById("logoInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    logo = new Image();
    logo.onload = () => {
      logoW = 250;
      logoH = logoW * (logo.height / logo.width);
      logoX = WIDTH - logoW - 20;
      logoY = HEIGHT - logoH - 20;
    };
    logo.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// -------------------- Gestos --------------------
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches) {
    return [
      (e.touches[0].clientX - rect.left) * (WIDTH / rect.width),
      (e.touches[0].clientY - rect.top) * (HEIGHT / rect.height)
    ];
  } else {
    return [
      (e.clientX - rect.left) * (WIDTH / rect.width),
      (e.clientY - rect.top) * (HEIGHT / rect.height)
    ];
  }
}

function startDrag(e) {
  let [x, y] = getPos(e);
  if (logo && x >= logoX && x <= logoX + logoW && y >= logoY && y <= logoY + logoH) dragTarget = "logo";
  else dragTarget = "video";
  dragging = true;
  startX = x; startY = y;

  if (e.touches && e.touches.length === 2) {
    lastDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}

function moveDrag(e) {
  if (!dragging) return;
  let [x, y] = getPos(e);
  const dx = x - startX, dy = y - startY;

  if (e.touches && e.touches.length === 2 && lastDist) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const zoom = dist / lastDist;

    if (dragTarget === "logo") {
      const cx = logoX + logoW / 2, cy = logoY + logoH / 2;
      logoW *= zoom; logoH = logoW * (logo.height / logo.width);
      // Limitar dentro del canvas
      logoW = Math.min(logoW, WIDTH);
      logoH = Math.min(logoH, HEIGHT);
      logoX = Math.max(0, Math.min(cx - logoW / 2, WIDTH - logoW));
      logoY = Math.max(0, Math.min(cy - logoH / 2, HEIGHT - logoH));
    } else if (dragTarget === "video") {
      const cx = videoX + videoW / 2, cy = videoY + videoH / 2;
      videoW *= zoom; videoH = videoW / videoRatio;
      videoX = cx - videoW / 2; videoY = cy - videoH / 2;
    }

    lastDist = dist;
  } else {
    if (dragTarget === "logo") {
      logoX = Math.max(0, Math.min(logoX + dx, WIDTH - logoW));
      logoY = Math.max(0, Math.min(logoY + dy, HEIGHT - logoH));
    } else if (dragTarget === "video") {
      videoX += dx;
      videoY += dy;
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
canvas.addEventListener("touchmove", moveDrag);
canvas.addEventListener("touchend", endDrag);
canvas.addEventListener("touchcancel", endDrag);

// -------------------- Exportar --------------------
document.getElementById("exportBtn").addEventListener("click", async () => {
  if (!video || !logo) return alert("Subí video y logo primero.");

  const videoFile = document.getElementById("videoInput").files[0];
  const logoFile = document.getElementById("logoInput").files[0];

  const formData = new FormData();
  formData.append("video", videoFile);
  formData.append("logo", logoFile);

  formData.append("videoX", Math.round(videoX));
  formData.append("videoY", Math.round(videoY));
  formData.append("videoW", Math.round(videoW));
  formData.append("videoH", Math.round(videoH));

  formData.append("logoX", Math.round(logoX));
  formData.append("logoY", Math.round(logoY));
  formData.append("logoWidth", Math.round(logoW));
  formData.append("logoHeight", Math.round(logoH));

  try {
    const res = await fetch("https://imagenes-y-video-production.up.railway.app/convert", {
      method: "POST",
      body: formData
    });

    if (!res.ok) throw new Error(`Server error: ${res.statusText}`);

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "video_final.mp4";
    a.click();
  } catch (err) {
    console.error("Error al exportar:", err);
    alert("Error al exportar: " + err.message);
  }
});

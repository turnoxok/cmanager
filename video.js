const API_BASE = "http://localhost:3000"; // ⚠️ cambiar si deployás

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
let video = null, logo = null;

let videoX = 0, videoY = 0, videoW = 0, videoH = 0, videoRatio = 1;
let logoX = 0, logoY = 0, logoW = 100, logoH = 100;

let dragging = false, dragTarget = null, startX = 0, startY = 0, lastDist = null;

function drawEditor() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (video && video.readyState >= 2) ctx.drawImage(video, videoX, videoY, videoW, videoH);
  if (logo) ctx.drawImage(logo, logoX, logoY, logoW, logoH);
  requestAnimationFrame(drawEditor);
}
drawEditor();

// --- carga de video ---
document.getElementById("videoInput").addEventListener("change", e => {
  const file = e.target.files[0]; if (!file) return;
  video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.loop = true; video.muted = true; video.play();
  video.addEventListener("loadedmetadata", () => {
    videoRatio = video.videoWidth / video.videoHeight;
    videoW = video.videoWidth; videoH = video.videoHeight;
    canvas.width = videoW; canvas.height = videoH;
    videoX = 0; videoY = 0;
    logoX = videoW - 150; logoY = videoH - 150; logoW = 100; logoH = 100;
  });
});

// --- carga de logo ---
document.getElementById("logoInput").addEventListener("change", e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    logo = new Image();
    logo.onload = () => {
      logoW = 100;
      logoH = logoW * (logo.height / logo.width);
      logoX = videoW - logoW - 10;
      logoY = videoH - logoH - 10;
    };
    logo.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// --- drag & drop logo ---
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
      const cx = logoX + logoW / 2, cy = logoY + logoH / 2;
      let newW = logoW * zoom;
      let newH = logoH * zoom;
      if (newW > videoW) { newW = videoW; newH = newW * (logo.height / logo.width); }
      if (newH > videoH) { newH = videoH; newW = newH * (logo.width / logo.height); }
      logoW = newW; logoH = newH;
      logoX = Math.min(Math.max(0, cx - logoW / 2), videoW - logoW);
      logoY = Math.min(Math.max(0, cy - logoH / 2), videoH - logoH);
    }
    lastDist = dist;
  } else {
    if (dragTarget === "logo") {
      logoX = Math.min(Math.max(0, logoX + dx), videoW - logoW);
      logoY = Math.min(Math.max(0, logoY + dy), videoH - logoH);
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

// --- exportar con barra ---
document.getElementById("exportBtn").addEventListener("click", async () => {
  if (!video || !logo) return alert("Subí video y logo primero.");

  const videoFile = document.getElementById("videoInput").files[0];
  const logoFile = document.getElementById("logoInput").files[0];

  const formData = new FormData();
  formData.append("video", videoFile);
  formData.append("logo", logoFile);
  formData.append("logoX", Math.round(logoX));
  formData.append("logoY", Math.round(logoY));
  formData.append("logoWidth", Math.round(logoW));
  formData.append("logoHeight", Math.round(logoH));

  const res = await fetch(`${API_BASE}/convert`, { method: "POST", body: formData });
  const { jobId } = await res.json();

  const progressBar = document.getElementById("progressBar");
  progressBar.value = 0;

  const evtSource = new EventSource(`${API_BASE}/progress/${jobId}`);
  evtSource.onmessage = async (e) => {
    const data = JSON.parse(e.data);
    if (data.percent) {
      progressBar.value = Math.round(data.percent);
    }
    if (data.end) {
      progressBar.value = 100;
      evtSource.close();

      const dres = await fetch(`${API_BASE}/download/${jobId}`);
      const blob = await dres.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "video_final.mp4";
      a.click();
    }
  };
});

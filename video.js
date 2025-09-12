const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
const WIDTH = 1080, HEIGHT = 1350;
canvas.width = WIDTH;
canvas.height = HEIGHT;

let video = null, logo = null;
let videoX = 0, videoY = 0, videoW = WIDTH, videoH = HEIGHT, videoRatio = 1;
let logoX = WIDTH - 270, logoY = HEIGHT - 270, logoW = 250, logoH = 250;
let dragging = false, dragTarget = null, startX = 0, startY = 0, lastDist = null;

function drawEditor() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (video && video.readyState >= 2) ctx.drawImage(video, videoX, videoY, videoW, videoH);
  if (logo) ctx.drawImage(logo, logoX, logoY, logoW, logoH);
}
function loop() { drawEditor(); requestAnimationFrame(loop); }
loop();

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

canvas.addEventListener("mousedown", e => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (WIDTH / rect.width);
  const y = (e.clientY - rect.top) * (HEIGHT / rect.height);
  if (logo && x >= logoX && x <= logoX + logoW && y >= logoY && y <= logoY + logoH) dragTarget = "logo";
  else dragTarget = "video";
  dragging = true;
  startX = x; startY = y;
});
canvas.addEventListener("mousemove", e => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (WIDTH / rect.width);
  const y = (e.clientY - rect.top) * (HEIGHT / rect.height);
  const dx = x - startX, dy = y - startY;
  if (dragTarget === "logo") { logoX += dx; logoY += dy; }
  else if (dragTarget === "video") { videoX += dx; videoY += dy; }
  startX = x; startY = y;
});
canvas.addEventListener("mouseup", () => { dragging = false; });
canvas.addEventListener("mouseleave", () => { dragging = false; });

document.getElementById("exportBtn").addEventListener("click", async () => {
  if (!video) return alert("Subí un video primero.");
  const videoFile = document.getElementById("videoInput").files[0];
  const logoFile = document.getElementById("logoInput").files[0] || null;

  const formData = new FormData();
  formData.append("video", videoFile);
  if (logoFile) formData.append("logo", logoFile);

  formData.append("logoX", Math.round(logoX));
  formData.append("logoY", Math.round(logoY));
  formData.append("logoWidth", Math.round(logoW));
  formData.append("logoHeight", Math.round(logoH));

  const res = await fetch("https://imagenes-y-video-production.up.railway.app/convert", {
    method: "POST",
    body: formData
  });

  if (!res.ok) return alert("Error al exportar el video");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "video_final.mp4";
  a.click();
});

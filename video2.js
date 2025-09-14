const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
const videoInput = document.getElementById("videoInput");
const logoInput = document.getElementById("logoInput");
const recordBtn = document.getElementById("recordBtn");

let videoEl = null;
let logoImg = null;

// Logo interactividad
let logoX = 800, logoY = 1150, logoW = 200, logoH = 200;
let dragging = false, dragOffsetX = 0, dragOffsetY = 0;

videoInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  videoEl = document.createElement("video");
  videoEl.src = URL.createObjectURL(file);
  videoEl.loop = true;
  videoEl.muted = true;
  videoEl.play();
});

logoInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    logoImg = new Image();
    logoImg.src = ev.target.result;
    logoImg.onload = () => drawFrame();
  };
  reader.readAsDataURL(file);
});

// Drag logo
canvas.addEventListener("mousedown", e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (x >= logoX && x <= logoX + logoW && y >= logoY && y <= logoY + logoH) {
    dragging = true;
    dragOffsetX = x - logoX;
    dragOffsetY = y - logoY;
  }
});

canvas.addEventListener("mousemove", e => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  logoX = Math.min(Math.max(0, x - dragOffsetX), canvas.width - logoW);
  logoY = Math.min(Math.max(0, y - dragOffsetY), canvas.height - logoH);
});

canvas.addEventListener("mouseup", () => dragging = false);
canvas.addEventListener("mouseleave", () => dragging = false);

// Dibuja video + logo
function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (videoEl) {
    const ratio = videoEl.videoWidth / videoEl.videoHeight;
    let w = canvas.width;
    let h = w / ratio;
    if (h > canvas.height) {
      h = canvas.height;
      w = h * ratio;
    }
    ctx.drawImage(videoEl, (canvas.width - w)/2, (canvas.height - h)/2, w, h);
  }
  if (logoImg) ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
  requestAnimationFrame(drawFrame);
}

// Grabar canvas en video
recordBtn.addEventListener("click", async () => {
  const stream = canvas.captureStream(30); // 30 fps
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks = [];

  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = e => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "video_logo.webm";
    a.click();
  };

  recorder.start();
  alert("Grabando 5 segundos...");
  await new Promise(r => setTimeout(r, 5000));
  recorder.stop();
});

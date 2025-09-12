const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = 1080, HEIGHT = 1350;
canvas.width = WIDTH;
canvas.height = HEIGHT;

let video = null, logo = null;

// Estado logo
let logoX = WIDTH - 270, logoY = HEIGHT - 270, logoW = 250, logoH = 250;

// Estado video
let videoX = 0, videoY = 0, videoW = WIDTH, videoH = HEIGHT;
let videoRatio = 1; 

// Gestos
let dragging = false, dragTarget = null, startX = 0, startY = 0, lastDist = null;

// -------------------- Dibujo --------------------
function drawEditor() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (video && video.readyState >= 2) {
    ctx.drawImage(video, videoX, videoY, videoW, videoH);
  }

  if (logo) ctx.drawImage(logo, logoX, logoY, logoW, logoH);
}

function loop() {
  drawEditor();
  requestAnimationFrame(loop);
}
loop();

// -------------------- Carga video --------------------
document.getElementById('videoInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  video = document.createElement('video');
  video.src = URL.createObjectURL(file);
  video.loop = false;
  video.muted = false;
  video.pause(); // Pausamos para controlar cuando inicia
  video.currentTime = 0;

  video.addEventListener('loadedmetadata', () => {
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
document.getElementById('logoInput').addEventListener('change', e => {
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
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchEnd);

function handleTouchStart(e) { /* igual que antes */ }
function handleTouchMove(e) { /* igual que antes */ }
function handleTouchEnd(e) { /* igual que antes */ }

// -------------------- Export --------------------
document.getElementById('exportBtn').addEventListener('click', async () => {
  if (!video) return alert("Subí un video primero.");

  // Reiniciamos video
  video.pause();
  video.currentTime = 0;
  await video.play(); // para capturar desde inicio

  const canvasStream = canvas.captureStream(30); 
  const audioTracks = video.captureStream().getAudioTracks();
  audioTracks.forEach(track => canvasStream.addTrack(track));

  const mediaRecorder = new MediaRecorder(canvasStream, { mimeType: "video/webm;codecs=vp9" });
  const chunks = [];

  mediaRecorder.ondataavailable = e => chunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "video_final_con_logo.webm";
    a.click();
  };

  mediaRecorder.start();

  // Calculamos duración y agregamos frame extra final
  const duration = video.duration * 1000;
  setTimeout(() => {
    // último frame y cortar audio
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (logo) ctx.drawImage(logo, logoX, logoY, logoW, logoH);

    video.pause();
    mediaRecorder.stop();
  }, duration + 400);
});

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
let videoRatio = 1; // ancho / alto original

// Gestos
let dragging = false, dragTarget = null, startX = 0, startY = 0, lastDist = null;

// -------------------- Dibujo en canvas --------------------
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
  video.loop = true;
  video.muted = false;
  video.play();

  video.addEventListener('loadedmetadata', () => {
    videoRatio = video.videoWidth / video.videoHeight;

    if (videoRatio > WIDTH / HEIGHT) { // horizontal
      videoH = HEIGHT;
      videoW = videoH * videoRatio;
      videoX = (WIDTH - videoW) / 2;
      videoY = 0;
    } else { // vertical o cuadrado
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
canvas.addEventListener('touchstart', e => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.touches[0].clientX - rect.left) * (WIDTH / rect.width);
  const y = (e.touches[0].clientY - rect.top) * (HEIGHT / rect.height);

  if (e.touches.length === 1) {
    if (logo && x >= logoX && x <= logoX + logoW && y >= logoY && y <= logoY + logoH) {
      dragTarget = "logo";
    } else {
      dragTarget = "video";
    }
    dragging = true;
    startX = x;
    startY = y;
  } else if (e.touches.length === 2) {
    lastDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );

    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const midCanvasX = (midX - rect.left) * (WIDTH / rect.width);
    const midCanvasY = (midY - rect.top) * (HEIGHT / rect.height);

    if (logo && midCanvasX >= logoX && midCanvasX <= logoX + logoW && midCanvasY >= logoY && midCanvasY <= logoY + logoH) {
      dragTarget = "logo";
    } else {
      dragTarget = "video";
    }
  }
});

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = (e.touches[0].clientX - rect.left) * (WIDTH / rect.width);
  const y = (e.touches[0].clientY - rect.top) * (HEIGHT / rect.height);

  if (e.touches.length === 1 && dragging) {
    const dx = x - startX;
    const dy = y - startY;
    if (dragTarget === "logo") {
      logoX += dx;
      logoY += dy;
    } else if (dragTarget === "video") {
      videoX += dx;
      videoY += dy;
    }
    startX = x;
    startY = y;
  } else if (e.touches.length === 2 && lastDist) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const zoom = dist / lastDist;

    if (dragTarget === "logo") {
      const cx = logoX + logoW / 2;
      const cy = logoY + logoH / 2;
      logoW *= zoom;
      logoH = logoW * (logo.height / logo.width);
      logoX = cx - logoW / 2;
      logoY = cy - logoH / 2;
    } else if (dragTarget === "video") {
      const cx = videoX + videoW / 2;
      const cy = videoY + videoH / 2;
      videoW *= zoom;
      videoH = videoW / videoRatio;
      videoX = cx - videoW / 2;
      videoY = cy - videoH / 2;
    }

    lastDist = dist;
  }
});

canvas.addEventListener('touchend', e => {
  if (e.touches.length === 0) dragging = false;
  if (e.touches.length < 2) lastDist = null;
});

// -------------------- Export video completo con audio --------------------
document.getElementById('exportBtn').addEventListener('click', () => {
  if (!video) return alert("Subí un video primero.");

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
  alert("Grabando todo el video completo... Presiona OK y espera que termine.");

  // Espera a que termine el video y luego dibuja último frame + corta audio
  const duration = video.duration * 1000; // duración real en ms

  setTimeout(() => {
    // Dibujar último frame con logo
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (logo) ctx.drawImage(logo, logoX, logoY, logoW, logoH);

    // Cortar audio y detener grabación
    video.pause();
    video.currentTime = video.duration;
    video.volume = 1;

    mediaRecorder.stop();
  }, duration);
});

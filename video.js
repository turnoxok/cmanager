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

// -------------------- Overlay de grabación --------------------
const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.top = 0;
overlay.style.left = 0;
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
overlay.style.color = '#fff';
overlay.style.display = 'flex';
overlay.style.alignItems = 'center';
overlay.style.justifyContent = 'center';
overlay.style.fontSize = '2rem';
overlay.style.fontWeight = 'bold';
overlay.style.zIndex = 9999;
overlay.style.display = 'none';
overlay.innerText = 'Grabando video...';
document.body.appendChild(overlay);

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
  video.loop = false;
  video.muted = false;

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

    video.currentTime = 0;
    video.play();
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
    dragTarget = (logo && x >= logoX && x <= logoX + logoW && y >= logoY && y <= logoY + logoH) ? "logo" : "video";
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
    dragTarget = (logo && midCanvasX >= logoX && midCanvasX <= logoX + logoW && midCanvasY >= logoY && midCanvasY <= logoY + logoH) ? "logo" : "video";
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
      logoX += dx; logoY += dy;
    } else {
      videoX += dx; videoY += dy;
    }
    startX = x; startY = y;
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
    } else {
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

// -------------------- Exportar video --------------------
document.getElementById('exportBtn').addEventListener('click', () => {
  if (!video) return alert("Subí un video primero.");

  overlay.style.display = 'flex'; // mostrar overlay
  video.currentTime = 0;
  video.play();

  const canvasStream = canvas.captureStream(30);
  const audioTracks = video.captureStream().getAudioTracks();
  audioTracks.forEach(track => canvasStream.addTrack(track));

  const mediaRecorder = new MediaRecorder(canvasStream, { mimeType: "video/webm;codecs=vp9" });
  const chunks = [];

  mediaRecorder.ondataavailable = e => chunks.push(e.data);
  mediaRecorder.onstop = () => {
    overlay.style.display = 'none'; // quitar overlay
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "video_final_con_logo.webm";
    a.click();
  };

  mediaRecorder.start();

  // Detener grabación justo al final
  setTimeout(() => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0,WIDTH,HEIGHT);
    if (video.readyState >= 2) ctx.drawImage(video, videoX, videoY, videoW, videoH);
    if (logo) ctx.drawImage(logo, logoX, logoY, logoW, logoH);

    video.pause();
    mediaRecorder.stop();
  }, video.duration * 1000 + 200);
});

/* video.js */
const API_URL = "https://imagenes-y-video-production.up.railway.app/convert"; // <- pon tu URL si es otra

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
const WIDTH = 1080, HEIGHT = 1350;
canvas.width = WIDTH;
canvas.height = HEIGHT;

let video = null, logo = null;

// video estado (dentro del canvas)
let videoX = 0, videoY = 0, videoW = WIDTH, videoH = HEIGHT, videoRatio = 1;
// logo estado
let logoX = WIDTH - 270, logoY = HEIGHT - 270, logoW = 250, logoH = 250;

// gestos
let dragging = false, dragTarget = null, startX = 0, startY = 0, lastDist = null;

// dibujo
function drawEditor(){
  ctx.fillStyle = "#000";
  ctx.fillRect(0,0,WIDTH,HEIGHT);
  if (video && video.readyState >= 2) ctx.drawImage(video, videoX, videoY, videoW, videoH);
  if (logo) ctx.drawImage(logo, logoX, logoY, logoW, logoH);
}
function loop(){ drawEditor(); requestAnimationFrame(loop); }
loop();

// cargar video
document.getElementById("videoInput").addEventListener("change", e=>{
  const f = e.target.files[0];
  if (!f) return;
  video = document.createElement("video");
  video.src = URL.createObjectURL(f);
  video.loop = true;
  video.muted = false;
  video.play();
  video.addEventListener("loadedmetadata", () => {
    videoRatio = video.videoWidth / video.videoHeight;
    if (videoRatio > WIDTH/HEIGHT){
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

// cargar logo
document.getElementById("logoInput").addEventListener("change", e=>{
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev=>{
    logo = new Image();
    logo.onload = ()=>{
      logoW = 250;
      logoH = logoW * (logo.height / logo.width);
      logoX = WIDTH - logoW - 20;
      logoY = HEIGHT - logoH - 20;
    };
    logo.src = ev.target.result;
  };
  reader.readAsDataURL(f);
});

// util: obtener posición escala canvas <-> client
function getPos(e){
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

function startDrag(e){
  let [x,y] = getPos(e);
  if (logo && x >= logoX && x <= logoX + logoW && y >= logoY && y <= logoY + logoH) dragTarget = "logo";
  else dragTarget = "video";
  dragging = true; startX = x; startY = y;
  if (e.touches && e.touches.length === 2) {
    lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                          e.touches[0].clientY - e.touches[1].clientY);
  }
}
function moveDrag(e){
  if (!dragging) return;
  let [x,y] = getPos(e);
  const dx = x - startX, dy = y - startY;

  if (e.touches && e.touches.length === 2 && lastDist){
    const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY);
    const zoom = dist / lastDist;
    if (dragTarget === "logo") {
      const cx = logoX + logoW/2, cy = logoY + logoH/2;
      logoW *= zoom; logoH = logoW * (logo.height / logo.width);
      logoX = cx - logoW/2; logoY = cy - logoH/2;
    } else {
      const cx = videoX + videoW/2, cy = videoY + videoH/2;
      videoW *= zoom; videoH = videoW / videoRatio;
      videoX = cx - videoW/2; videoY = cy - videoH/2;
    }
    lastDist = dist;
  } else {
    if (dragTarget === "logo") { logoX += dx; logoY += dy; }
    else { videoX += dx; videoY += dy; }
  }

  // opcional: limitar que logo no salga completamente del canvas (ajustable)
  if (logo) {
    if (logoX + logoW < 10) logoX = 10 - logoW;
    if (logoY + logoH < 10) logoY = 10 - logoH;
    if (logoX > WIDTH - 10) logoX = WIDTH - 10;
    if (logoY > HEIGHT - 10) logoY = HEIGHT - 10;
  }

  startX = x; startY = y;
}
function endDrag(){ dragging = false; lastDist = null; }

canvas.addEventListener("mousedown", startDrag);
canvas.addEventListener("mousemove", moveDrag);
canvas.addEventListener("mouseup", endDrag);
canvas.addEventListener("mouseleave", endDrag);

canvas.addEventListener("touchstart", e => { startDrag(e); e.preventDefault(); }, {passive:false});
canvas.addEventListener("touchmove", e => { moveDrag(e); e.preventDefault(); }, {passive:false});
canvas.addEventListener("touchend", endDrag);
canvas.addEventListener("touchcancel", endDrag);

// exportar -> envia video original + logo file + coords al backend
document.getElementById("exportBtn").addEventListener("click", async () => {
  if (!video || !logo) return alert("Subí un video y un logo primero.");

  const videoFile = document.getElementById("videoInput").files[0];
  const logoFile = document.getElementById("logoInput").files[0];

  if (!videoFile || !logoFile) return alert("Video o logo ausente.");

  const form = new FormData();
  form.append("video", videoFile);
  form.append("logo", logoFile);
  form.append("logoX", Math.round(logoX));
  form.append("logoY", Math.round(logoY));
  form.append("logoWidth", Math.round(logoW));
  form.append("logoHeight", Math.round(logoH));

  try {
    const resp = await fetch(API_URL, { method: "POST", body: form });
    if (!resp.ok) {
      const txt = await resp.text().catch(()=>"");
      console.error("Server error:", resp.status, txt);
      return alert("Error en la conversión (server). Revisa logs en Railway.");
    }
    const blob = await resp.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "video_final.mp4";
    a.click();
  } catch (err) {
    console.error("Network error:", err);
    alert("Error de red al comunicarse con el servidor.");
  }
});

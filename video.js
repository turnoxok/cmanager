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


document.getElementById("videoInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.loop = true;
  video.muted = true; // dejamos inicializado en mute para autoplay
  video.play();

  // Intentar reproducir con sonido tras interacción del usuario
  const enableAudio = () => {
    video.muted = false;
    video.play().catch(() => console.log("Interacción requerida para audio"));
    document.removeEventListener("click", enableAudio);
    document.removeEventListener("touchstart", enableAudio);
  };
  document.addEventListener("click", enableAudio);
  document.addEventListener("touchstart", enableAudio);

  video.addEventListener("loadedmetadata", () => {
    videoRatio = video.videoWidth / video.videoHeight;
    videoW = video.videoWidth;
    videoH = video.videoHeight;
    canvas.width = videoW;
    canvas.height = videoH;
    videoX = 0;
    videoY = 0;
    logoX = videoW - 150;
    logoY = videoH - 150;
    logoW = 100;
    logoH = 100;
  });
});


function getPos(e){
  const rect = canvas.getBoundingClientRect();
  if(e.touches){
    return [(e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
            (e.touches[0].clientY - rect.top) * (canvas.height / rect.height)];
  } else return [(e.clientX - rect.left) * (canvas.width / rect.width),
                  (e.clientY - rect.top) * (canvas.height / rect.height)];
}

function startDrag(e){
  const [x, y] = getPos(e);
  if(logo && x >= logoX && x <= logoX+logoW && y >= logoY && y <= logoY+logoH) dragTarget = "logo";
  else dragTarget = null;
  dragging = true; startX = x; startY = y;

  if(e.touches && e.touches.length === 2){
    lastDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}

function moveDrag(e){
  if(!dragging) return;
  const [x, y] = getPos(e);
  const dx = x - startX, dy = y - startY;

  if(e.touches && e.touches.length === 2 && lastDist){
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const zoom = dist / lastDist;

    if(dragTarget === "logo"){
      const cx = logoX + logoW/2, cy = logoY + logoH/2;
      let newW = logoW * zoom;
      let newH = logoH * zoom;

      // limitar tamaño al video
      if(newW > videoW) { newW = videoW; newH = newW * (logo.height/logo.width); }
      if(newH > videoH) { newH = videoH; newW = newH * (logo.width/logo.height); }

      logoW = newW; logoH = newH;
      logoX = Math.min(Math.max(0, cx - logoW/2), videoW - logoW);
      logoY = Math.min(Math.max(0, cy - logoH/2), videoH - logoH);
    }
    lastDist = dist;
  } else {
    if(dragTarget === "logo"){
      logoX = Math.min(Math.max(0, logoX+dx), videoW - logoW);
      logoY = Math.min(Math.max(0, logoY+dy), videoH - logoH);
    }
  }

  startX = x; startY = y;
}

function endDrag(e){ dragging = false; lastDist = null; }

canvas.addEventListener("mousedown", startDrag);
canvas.addEventListener("mousemove", moveDrag);
canvas.addEventListener("mouseup", endDrag);
canvas.addEventListener("mouseleave", endDrag);
canvas.addEventListener("touchstart", startDrag);
canvas.addEventListener("touchmove", moveDrag);
canvas.addEventListener("touchend", endDrag);
canvas.addEventListener("touchcancel", endDrag);

document.getElementById("exportBtn").addEventListener("click", async () => {
  if(!video || !logo) return alert("Subí video y logo primero.");
  const videoFile = document.getElementById("videoInput").files[0];
  const logoFile = document.getElementById("logoInput").files[0];

  const formData = new FormData();
  formData.append("video", videoFile);
  formData.append("logo", logoFile);
  formData.append("logoX", Math.round(logoX));
  formData.append("logoY", Math.round(logoY));
  formData.append("logoWidth", Math.round(logoW));
  formData.append("logoHeight", Math.round(logoH));

  try{
    const res = await fetch("https://imagenes-y-video-production.up.railway.app/convert", { method:"POST", body: formData });
    if(!res.ok) throw new Error(`Server error: ${res.statusText}`);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "video_final.mp4";
    a.click();
  }catch(err){ alert("Error al exportar: " + err.message); console.error(err);}
});

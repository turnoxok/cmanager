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

// -------------------- Limitar logo al canvas --------------------
function clampLogo() {
  if (!logo) return;

  // Limitar ancho y alto
  if (logoW > WIDTH) logoW = WIDTH;
  if (logoH > HEIGHT) logoH = HEIGHT;

  // Limitar posición X
  if (logoX < 0) logoX = 0;
  if (logoX + logoW > WIDTH) logoX = WIDTH - logoW;

  // Limitar posición Y
  if (logoY < 0) logoY = 0;
  if (logoY + logoH > HEIGHT) logoY = HEIGHT - logoH;
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
      logoX = cx - logoW / 2; logoY = cy - logoH / 2;

      clampLogo(); // <--- aquí limitamos el logo
    } else if (dragTarget === "video") {
      const cx = videoX + videoW / 2, cy = videoY + videoH / 2;
      videoW *= zoom; videoH = videoW / videoRatio;
      videoX = cx - videoW / 2; videoY = cy - videoH / 2;
    }
    lastDist = dist;
  } else {
    if (dragTarget === "logo") { 
      logoX += dx; 
      logoY += dy; 
      clampLogo(); // <--- también aquí al mover
    }
    else if (dragTarget === "video") { 
      videoX += dx; 
      videoY += dy; 
    }
  }
  startX = x; startY = y;
}

function endDrag(e) {
  dragging = false;
  lastDist = null;
}

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

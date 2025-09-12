document.getElementById("videoInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.loop = true;
  video.muted = false; // aseguramos que el audio pueda sonar

  // Agregamos al DOM pero invisible para que el audio funcione
  video.style.display = "none";
  document.body.appendChild(video);

  // Reproducir audio con interacción de usuario
  const playVideo = () => {
    video.play().catch(() => {
      console.log("Se requiere interacción del usuario para reproducir audio");
    });
    document.removeEventListener("click", playVideo);
    document.removeEventListener("touchstart", playVideo);
  };
  document.addEventListener("click", playVideo);
  document.addEventListener("touchstart", playVideo);

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

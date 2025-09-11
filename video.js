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

  const duration = video.duration * 1000; // duración real
  const fadeDuration = 400; // ms fade audio
  const extraTime = 500; // ms para mostrar último frame

  // Preparar logo del editor (puede ser cualquier imagen que tengas cargada)
  const logoEditor = new Image();
  logoEditor.src = "logo-editor.png"; // reemplazar con tu logo del editor

  setTimeout(() => {
    const fadeStart = performance.now();
    const fadeInterval = setInterval(() => {
      const elapsed = performance.now() - fadeStart;
      const progress = Math.min(elapsed / fadeDuration, 1);

      // Dibujo último frame con logo del editor
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.drawImage(logoEditor, (WIDTH - 300) / 2, (HEIGHT - 300) / 2, 300, 300);

      // Fade audio
      video.volume = 1 - progress;

      if (progress >= 1) {
        clearInterval(fadeInterval);
        mediaRecorder.stop();
      }
    }, 30);
  }, duration); // empieza justo al final del video
});

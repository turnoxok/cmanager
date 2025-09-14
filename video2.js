// Asegurarse de que todo se ejecute después de que FFmpeg esté disponible
window.onload = async () => {
  const { createFFmpeg, fetchFile } = FFmpeg; // <-- FFmpeg ya está definido globalmente
  const ffmpeg = createFFmpeg({ log: true });

  await ffmpeg.load();

  const videoInput = document.getElementById("videoInput");
  const logoInput = document.getElementById("logoInput");
  const exportBtn = document.getElementById("exportBtn");
  const canvas = document.getElementById("editorCanvas");
  const ctx = canvas.getContext("2d");

  let videoEl = null;
  let logoImg = null;

  videoInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    videoEl = document.createElement("video");
    videoEl.src = URL.createObjectURL(file);
    videoEl.loop = true;
    videoEl.muted = true;
    videoEl.play();
    videoEl.onloadedmetadata = () => {
      canvas.width = 1080;
      canvas.height = 1350;
      drawCanvas();
    };
  });

  logoInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      logoImg = new Image();
      logoImg.src = ev.target.result;
      logoImg.onload = drawCanvas;
    };
    reader.readAsDataURL(file);
  });

  function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (videoEl) {
      // Mantener aspecto original
      const ratio = videoEl.videoWidth / videoEl.videoHeight;
      let w = canvas.width;
      let h = w / ratio;
      if (h > canvas.height) {
        h = canvas.height;
        w = h * ratio;
      }
      ctx.drawImage(videoEl, 0, 0, w, h);
    }
    if (logoImg) {
      const lw = 200; // ejemplo tamaño logo
      const lh = lw * (logoImg.height / logoImg.width);
      ctx.drawImage(logoImg, canvas.width - lw - 10, canvas.height - lh - 10, lw, lh);
    }
    requestAnimationFrame(drawCanvas);
  }

  exportBtn.addEventListener("click", async () => {
    if (!videoEl || !logoImg) return alert("Subí video y logo primero.");

    // Guardar archivos en ffmpeg.wasm
    ffmpeg.FS("writeFile", "video.mp4", await fetchFile(videoInput.files[0]));
    ffmpeg.FS("writeFile", "logo.png", await fetchFile(logoInput.files[0]));

    // Exportar video con overlay (1080x1350)
    await ffmpeg.run(
      "-i", "video.mp4",
      "-i", "logo.png",
      "-filter_complex", "overlay=W-w-10:H-h-10",
      "-vf", "scale=1080:1350:force_original_aspect_ratio=decrease,pad=1080:1350:(ow-iw)/2:(oh-ih)/2",
      "output.mp4"
    );

    const data = ffmpeg.FS("readFile", "output.mp4");
    const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "video_final.mp4";
    a.click();
  });
};

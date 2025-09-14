// ----- CONFIGURACIÓN -----
const MAX_MB = 50;   // máximo 50MB
const MAX_SECONDS = 60; // máximo 60s
let finalVideoFile = null; // el que usará video.js después

// Cargar ffmpeg.wasm
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

async function ensureFFmpegLoaded() {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }
}

document.getElementById("videoInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  console.log(`📹 Archivo cargado: ${file.name}, tamaño ${(file.size / 1024 / 1024).toFixed(2)} MB`);

  // Validar tamaño
  if (file.size > MAX_MB * 1024 * 1024) {
    alert(`El archivo supera ${MAX_MB}MB, se intentará comprimir antes de exportar.`);
    finalVideoFile = await compressVideo(file);
    return;
  }

  // Validar duración
  const duration = await getVideoDuration(file);
  if (duration > MAX_SECONDS) {
    alert(`El video dura más de ${MAX_SECONDS}s, se intentará recortar/comprimir.`);
    finalVideoFile = await compressVideo(file);
    return;
  }

  // Si pasa validaciones → lo dejamos como está
  finalVideoFile = file;
});

// Obtener duración
function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve(video.duration);
    };
    video.src = URL.createObjectURL(file);
  });
}

// Compresión básica
async function compressVideo(file) {
  await ensureFFmpegLoaded();

  ffmpeg.FS("writeFile", "input.mp4", await fetchFile(file));

  // 🔹 Preset más rápido + bitrate reducido
  await ffmpeg.run(
    "-i", "input.mp4",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "96k",
    "output.mp4"
  );

  const data = ffmpeg.FS("readFile", "output.mp4");
  return new File([data.buffer], "compressed.mp4", { type: "video/mp4" });
}

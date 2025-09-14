// video_safe.js

// Selector del input de video
const input = document.getElementById('videoInput');
const preview = document.createElement('video'); // video invisible para leer metadata
preview.style.display = 'none';
document.body.appendChild(preview);

input.addEventListener('change', () => {
  const file = input.files[0];
  if (!file) return;

  // Crear URL temporal para analizar el video
  preview.src = URL.createObjectURL(file);

  preview.onloadedmetadata = () => {
    const width = preview.videoWidth;
    const height = preview.videoHeight;
    const duration = preview.duration; // segundos
    const sizeMB = file.size / 1024 / 1024; // tamaño en MB

    console.log("Resolución:", width, "x", height);
    console.log("Duración:", duration.toFixed(2), "s");
    console.log("Tamaño:", sizeMB.toFixed(2), "MB");

    // Validación para no romper Railway
    const MAX_WIDTH = 1920;
    const MAX_HEIGHT = 1080;
    const MAX_SIZE_MB = 150;
    const MAX_DURATION_SEC = 600; // opcional, por ejemplo 10 minutos

    if (width > MAX_WIDTH || height > MAX_HEIGHT || sizeMB > MAX_SIZE_MB || duration > MAX_DURATION_SEC) {
      alert("El video es demasiado grande, largo o de alta resolución. No se subirá.");
      input.value = ""; // limpiar selección
    } else {
      alert("Video aceptado, listo para subir.");
      // Aquí podés llamar a tu función de upload si querés
    }

    URL.revokeObjectURL(preview.src); // liberar memoria
  };
});

document.getElementById("videoInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 50 * 1024 * 1024) { // >50 MB
    alert("El video es muy pesado, se comprimirá antes de subir...");
    const compressed = await compressVideo(file);
    console.log("Video comprimido:", compressed.size / 1024 / 1024, "MB");
    // ahora usás compressed en lugar de file para subirlo
  }
});

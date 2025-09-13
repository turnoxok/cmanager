// --- Tu código actual sin cambios arriba ---
// (canvas, video, logo, eventos de drag, etc...)

// -------------------- Exportar --------------------
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
    // 🔹 Paso 1: pedimos conversión → devuelve jobId
    const res = await fetch("https://imagenes-y-video-production.up.railway.app/convert", { 
      method:"POST", 
      body: formData 
    });

    if(!res.ok) throw new Error(`Server error: ${res.statusText}`);
    const { jobId } = await res.json();

    // 🔹 Paso 2: escuchamos progreso
    const progressBar = document.getElementById("progressBar");
    progressBar.style.display = "block";
    progressBar.value = 0;

    const evtSource = new EventSource(`https://imagenes-y-video-production.up.railway.app/progress/${jobId}`);
    evtSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.end) {
        progressBar.value = 100;
        evtSource.close();
      } else if (data.percent) {
        progressBar.value = Math.round(data.percent);
      }
    };
  }catch(err){ 
    alert("Error al exportar: " + err.message); 
    console.error(err);
  }
});

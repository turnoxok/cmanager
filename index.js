
// server/index.js
const express = require('express');
const multer  = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });
const app = express();
app.use(express.json());
app.use(express.static('public')); // Para servir frontend si quieres

// Asegúrate de que la carpeta outputs exista
if (!fs.existsSync('outputs')) fs.mkdirSync('outputs');

app.post('/procesar-video', upload.fields([{ name: 'video' }, { name: 'logo' }]), (req, res) => {
  const videoPath = req.files.video[0].path;
  const logoPath = req.files.logo[0].path;
  const { x, y, width, height } = req.body;

  const outputPath = path.join('outputs', Date.now() + '_final.mp4');

  // Comando ffmpeg para overlay
  const cmd = `ffmpeg -i ${videoPath} -i ${logoPath} -filter_complex "[1:v]scale=${width}:${height}[logo];[0:v][logo]overlay=${x}:${y}" -c:a copy ${outputPath}`;

  exec(cmd, (err, stdout, stderr) => {
    // Limpiar archivos temporales
    fs.unlinkSync(videoPath);
    fs.unlinkSync(logoPath);

    if(err) return res.status(500).send('Error al procesar video');
    res.download(outputPath, 'video_final.mp4', () => {
      // Opcional: borrar el archivo final después de descargar
      fs.unlinkSync(outputPath);
    });
  });
});

app.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));

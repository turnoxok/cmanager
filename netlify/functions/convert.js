// netlify/functions/convert.js
const { createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body);
    const webmBase64 = body.video;
    const buffer = Buffer.from(webmBase64, 'base64');

    const ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
    ffmpeg.FS('writeFile', 'input.webm', await fetchFile(buffer));
    await ffmpeg.run('-i','input.webm','-c:v','libx264','-c:a','aac','output.mp4');
    const data = ffmpeg.FS('readFile','output.mp4');
    const mp4Base64 = Buffer.from(data).toString('base64');

    return {
      statusCode: 200,
      body: JSON.stringify({ mp4: mp4Base64 })
    };
  } catch(e) {
    return { statusCode: 500, body: e.toString() };
  }
};

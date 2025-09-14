const { createFFmpeg, fetchFile } = FFmpeg; // UMD global
const ffmpeg = createFFmpeg({ log:true });

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
const progressBar = document.getElementById("progressBar");

let video = null, logo = null;
let videoX=0, videoY=0, videoW=0, videoH=0;
let logoX=0, logoY=0, logoW=0, logoH=0;
let dragging=false, dragTarget=null, startX=0, startY=0, lastDist=null;

// ----------- Render Canvas -----------
function drawEditor() {
  ctx.fillStyle="#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
  if(video && video.readyState>=2) ctx.drawImage(video,videoX,videoY,videoW,videoH);
  if(logo) ctx.drawImage(logo,logoX,logoY,logoW,logoH);
  requestAnimationFrame(drawEditor);
}
drawEditor();

// ----------- Cargar Video -----------
document.getElementById("videoInput").addEventListener("change",e=>{
  const file = e.target.files[0]; if(!file) return;
  video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.loop = true; video.muted = true; video.play();
  video.addEventListener("loadedmetadata", ()=>{
    const ratio = parseFloat(document.getElementById("ratioSelect").value);
    const maxW=1080, maxH=maxW/ratio;
    const scale = Math.min(maxW/video.videoWidth, maxH/video.videoHeight);
    videoW = video.videoWidth*scale;
    videoH = video.videoHeight*scale;
    canvas.width = 1080; canvas.height = maxH;
    videoX = (canvas.width-videoW)/2; videoY = (canvas.height-videoH)/2;
    logoX = canvas.width-150-10; logoY = canvas.height-150-10; logoW=150; logoH=150;
  });
});

// ----------- Cargar Logo -----------
document.getElementById("logoInput").addEventListener("change", e=>{
  const file=e.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    logo=new Image();
    logo.onload=()=>{
      logoW=150; logoH=logoW*(logo.height/logo.width);
      logoX=canvas.width-logoW-10; logoY=canvas.height-logoH-10;
    };
    logo.src=ev.target.result;
  };
  reader.readAsDataURL(file);
});

// ----------- Drag & Pinch -----------
function getPos(e){
  const rect=canvas.getBoundingClientRect();
  if(e.touches){
    return [(e.touches[0].clientX-rect.left)*(canvas.width/rect.width),
            (e.touches[0].clientY-rect.top)*(canvas.height/rect.height)];
  } else return [(e.clientX-rect.left)*(canvas.width/rect.width),(e.clientY-rect.top)*(canvas.height/rect.height)];
}

function startDrag(e){
  const [x,y]=getPos(e);
  if(logo && x>=logoX && x<=logoX+logoW && y>=logoY && y<=logoY+logoH) dragTarget="logo";
  else dragTarget=null;
  dragging=true; startX=x; startY=y;
  if(e.touches && e.touches.length===2){
    lastDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
  }
}

function moveDrag(e){
  if(!dragging) return;
  const [x,y]=getPos(e);
  const dx=x-startX, dy=y-startY;
  if(e.touches && e.touches.length===2 && lastDist){
    const dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    const zoom=dist/lastDist;
    if(dragTarget==="logo"){
      const cx=logoX+logoW/2, cy=logoY+logoH/2;
      logoW*=zoom; logoH*=zoom;
      logoX=cx-logoW/2; logoY=cy-logoH/2;
      logoX=Math.min(Math.max(0,logoX),canvas.width-logoW);
      logoY=Math.min(Math.max(0,logoY),canvas.height-logoH);
    }
    lastDist=dist;
  } else {
    if(dragTarget==="logo"){ logoX=Math.min(Math.max(0,logoX+dx),canvas.width-logoW); logoY=Math.min(Math.max(0,logoY+dy),canvas.height-logoH); }
  }
  startX=x; startY=y;
}

function endDrag(){ dragging=false; lastDist=null; }

canvas.addEventListener("mousedown",startDrag);
canvas.addEventListener("mousemove",moveDrag);
canvas.addEventListener("mouseup",endDrag);
canvas.addEventListener("mouseleave",endDrag);
canvas.addEventListener("touchstart",startDrag);
canvas.addEventListener("touchmove",moveDrag,{passive:false});
canvas.addEventListener("touchend",endDrag);
canvas.addEventListener("touchcancel",endDrag);

// ----------- Export Video -----------
document.getElementById("exportBtn").addEventListener("click", async ()=>{
  if(!video || !logo) return alert("Subí video y logo primero.");
  document.getElementById("exportBtn").disabled=true;
  progressBar.value=0;

  await ffmpeg.load();

  const videoFile=document.getElementById("videoInput").files[0];
  const logoFile=document.getElementById("logoInput").files[0];

  ffmpeg.FS('writeFile','video.mp4',await fetchFile(videoFile));
  ffmpeg.FS('writeFile','logo.png',await fetchFile(logoFile));

  const overlayX=Math.round(logoX);
  const overlayY=Math.round(logoY);
  const overlayW=Math.round(logoW);
  const overlayH=Math.round(logoH);
  const ratio=parseFloat(document.getElementById("ratioSelect").value);
  const outH=Math.round(1080/ratio);

  await ffmpeg.run(
    '-i','video.mp4',
    '-i','logo.png',
    '-filter_complex', `[1:v]scale=${overlayW}:${overlayH}[logo];[0:v][logo]overlay=${overlayX}:${overlayY}`,
    '-vf', `scale=1080:${outH}:force_original_aspect_ratio=decrease,pad=1080:${outH}:(ow-iw)/2:(oh-ih)/2`,
    '-c:a','copy','output.mp4'
  );

  const data=ffmpeg.FS('readFile','output.mp4');
  const url=URL.createObjectURL(new Blob([data.buffer],{type:'video/mp4'}));
  const a=document.createElement('a'); a.href=url; a.download='video_final.mp4'; a.click();

  document.getElementById("exportBtn").disabled=false;
});

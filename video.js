const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
let video=null, logo=null;

let videoX=0, videoY=0, videoW=0, videoH=0, videoRatio=1;
let logoX=0, logoY=0, logoW=100, logoH=100;

let dragging=false, dragTarget=null, startX=0, startY=0;

function drawEditor() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(video && video.readyState>=2) ctx.drawImage(video, videoX, videoY, videoW, videoH);
  if(logo) ctx.drawImage(logo, logoX, logoY, logoW, logoH);
  requestAnimationFrame(drawEditor);
}
drawEditor();

document.getElementById("videoInput").addEventListener("change", e=>{
  const file=e.target.files[0]; if(!file) return;
  video=document.createElement("video");
  video.src=URL.createObjectURL(file); video.loop=true; video.muted=true; video.play();
  video.addEventListener("loadedmetadata", ()=>{
    videoRatio=video.videoWidth/video.videoHeight;
    videoW=video.videoWidth; videoH=video.videoHeight;
    canvas.width=videoW; canvas.height=videoH;
    videoX=0; videoY=0;
    logoX=videoW-150; logoY=videoH-150; logoW=100; logoH=100;
  });
});

document.getElementById("logoInput").addEventListener("change", e=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    logo=new Image();
    logo.onload=()=>{ logoW=100; logoH=logoW*(logo.height/logo.width); logoX=videoW-logoW-10; logoY=videoH-logoH-10; };
    logo.src=ev.target.result;
  };
  reader.readAsDataURL(file);
});

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
}
function moveDrag(e){
  if(!dragging) return;
  const [x,y]=getPos(e);
  const dx=x-startX, dy=y-startY;
  if(dragTarget==="logo"){
    logoX=Math.min(Math.max(0,logoX+dx),videoW-logoW);
    logoY=Math.min(Math.max(0,logoY+dy),videoH-logoH);
  }
  startX=x; startY=y;
}
function endDrag(e){ dragging=false; dragTarget=null; }

canvas.addEventListener("mousedown",startDrag);
canvas.addEventListener("mousemove",moveDrag);
canvas.addEventListener("mouseup",endDrag);
canvas.addEventListener("mouseleave",endDrag);
canvas.addEventListener("touchstart",startDrag);
canvas.addEventListener("touchmove",moveDrag);
canvas.addEventListener("touchend",endDrag);

document.getElementById("exportBtn").addEventListener("click",async ()=>{
  if(!video || !logo) return alert("Subí video y logo primero.");
  const videoFile=document.getElementById("videoInput").files[0];
  const logoFile=document.getElementById("logoInput").files[0];
  const formData=new FormData();
  formData.append("video",videoFile);
  formData.append("logo",logoFile);
  formData.append("logoX",Math.round(logoX));
  formData.append("logoY",Math.round(logoY));
  formData.append("logoWidth",Math.round(logoW));
  formData.append("logoHeight",Math.round(logoH));

  try{
    const res=await fetch("https://imagenes-y-video-production.up.railway.app/convert",{method:"POST",body:formData});
    if(!res.ok) throw new Error(`Server error: ${res.statusText}`);
    const blob=await res.blob();
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download="video_final.mp4"; a.click();
  } catch(err){ alert("Error al exportar: "+err.message); console.error(err);}
});

import {clamp, getCoverGeometry, drawFrame, drawPhotoBrand, drawFaceEffect, EFFECTS, nextEffectIndex} from './renderer.js';
import {createFaceTracker} from './faces.js';
import {listPhotos, savePhoto} from './gallery.js';

const $=id=>document.getElementById(id);
const video=$('sourceVideo'), canvas=$('cameraCanvas'), ctx=canvas.getContext('2d',{alpha:false});
const stage=$('stage'), startup=$('startup'), startBtn=$('startBtn'), status=$('trackingStatus'), hint=$('hint');
const captureBtn=$('captureBtn'), flipBtn=$('flipBtn'), effectBtn=$('effectBtn'), flash=$('flash'), logo=new Image();
logo.src='./assets/team-logo.png';
const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
let faceLandmarker=null,stream=null,facingMode='user',lastVideoTime=-1,visibleSmile=false;
const faceTracker=createFaceTracker(3);
let latestGeometry=null, photoBlob=null,photoUrl=null,loading=false,raf=null,showCamera=false;
let toastHandle=null,lastScan=0,effectIndex=0,effectChangedAt=0;
const TRACK_INTERVAL_MS=115;
const MEDIA_VERSION='0.10.35';
const MEDIA_CDNS=[
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIA_VERSION}`,
  `https://unpkg.com/@mediapipe/tasks-vision@${MEDIA_VERSION}`
];
const MODEL='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

function showToast(message){
  const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastHandle);toastHandle=setTimeout(()=>el.classList.remove('visible'),3600);
}
function setStatus(message){status.textContent=message;}
function setLoading(message){$('loadMessage').textContent=message;}
function getResolution(){
  const bounds=stage.getBoundingClientRect();
  const w=Math.max(1,Math.round(bounds.width)),h=Math.max(1,Math.round(bounds.height));
  const pixelRatio=clamp(window.devicePixelRatio||1,1,2.3);
  const resolutionRatio=Math.min(pixelRatio,1080/w,1920/h);
  return{w,h,r:resolutionRatio};
}
function resize(){
  const {w,h,r}=getResolution();canvas.width=Math.floor(w*r);canvas.height=Math.floor(h*r);
  ctx.setTransform(r,0,0,r,0,0);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
}
function paintBackground(W,H){
  const grad=ctx.createRadialGradient(W/2,H*.38,40,W/2,H*.38,H*.95);
  grad.addColorStop(0,'#643c7c');grad.addColorStop(.46,'#2a143f');grad.addColorStop(1,'#080310');
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
}
function drawVideo(W,H){
  const geometry=getCoverGeometry(video.videoWidth,video.videoHeight,W,H,facingMode==='user');
  ctx.save();
  if(geometry.mirror){ctx.translate(W,0);ctx.scale(-1,1);}
  ctx.drawImage(video,geometry.offsetX,geometry.offsetY,geometry.drawWidth,geometry.drawHeight);
  ctx.restore();
  return geometry;
}
function render(now){
  const W=stage.clientWidth,H=stage.clientHeight;
  if(showCamera && video.readyState>=2 && video.videoWidth>0 && video.videoHeight>0){
    latestGeometry=drawVideo(W,H);
    if(faceLandmarker && now-lastScan>TRACK_INTERVAL_MS && video.currentTime!==lastVideoTime){
      lastScan=now;lastVideoTime=video.currentTime;
      try{
        const result=faceLandmarker.detectForVideo(video,now);
        const faces=faceTracker.update(result,now);
        visibleSmile=faces.some(face=>face.smiling);
        if(!faces.length)setStatus('Coloca tu rostro en el centro');
        else setStatus(faces.length+' '+(faces.length===1?'rostro detectado':'rostros detectados')+' · '+(visibleSmile?'¡Efecto activo!':'sonríe para activar'));
      }catch(error){console.warn('Tracking:',error);setStatus('Reintentando seguimiento facial');}
    }
    if(latestGeometry){
      const faces=faceTracker.getFaces(now);
      visibleSmile=faces.some(face=>face.smiling);
      for(const face of faces){
        if(face.smiling)drawFaceEffect(ctx,face.landmarks,latestGeometry,now,Math.max(face.smileAt??now,effectChangedAt),effectIndex);
      }
    }
  }else{paintBackground(W,H);latestGeometry=null;}
  drawFrame(ctx,W,H);
  const hintMessage=visibleSmile?'¡Somos Elegantísimos!':'Sonríe para activar el efecto';
  if(hint.textContent!==hintMessage)hint.textContent=hintMessage;
  raf=requestAnimationFrame(render);
}
function stopCamera(){
  if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
  video.pause();video.srcObject=null;showCamera=false;visibleSmile=false;faceTracker.reset();
}
async function startCamera(){
  if(!window.isSecureContext)throw new Error('La cámara requiere HTTPS o localhost. Usa GitHub Pages o Firebase Hosting.');
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Este navegador no permite acceder a la cámara. Prueba Safari o Chrome actualizado.');
  stopCamera();setStatus('Solicitando cámara…');
  const constraints={
    audio:false,
    video:{facingMode:{ideal:facingMode},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}}
  };
  let nextStream;
  try{nextStream=await navigator.mediaDevices.getUserMedia(constraints);}
  catch(error){
    if(error.name==='NotAllowedError'||error.name==='PermissionDeniedError')throw new Error('Permite el acceso a la cámara desde los ajustes de este navegador.');
    if(error.name==='NotFoundError')throw new Error('No se detectó ninguna cámara disponible.');
    throw error;
  }
  stream=nextStream;video.srcObject=stream;
  await new Promise((resolve,reject)=>{
    if(video.readyState>=1)return resolve();
    const timer=setTimeout(()=>reject(new Error('La cámara tardó demasiado en iniciar.')),12000);
    video.onloadedmetadata=()=>{clearTimeout(timer);resolve();};
  });
  await video.play();
  lastVideoTime=-1;lastScan=0;faceTracker.reset();showCamera=true;
  setStatus('Buscando rostro…');
}
async function loadModel(){
  if(faceLandmarker)return;
  let lastError=null;
  for(const base of MEDIA_CDNS){
    try{
      setLoading('Preparando seguimiento facial…');
      // Importar el bundle ESM real: /+esm fallaba en la versión antigua inexistente.
      const {FaceLandmarker,FilesetResolver}=await import(`${base}/vision_bundle.mjs`);
      const vision=await FilesetResolver.forVisionTasks(`${base}/wasm`);
      const opts={
        baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},
        runningMode:'VIDEO',numFaces:3,outputFaceBlendshapes:true,
        minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5
      };
      try{
        faceLandmarker=await FaceLandmarker.createFromOptions(vision,opts);
      }catch(gpuError){
        console.warn('GPU no disponible. Reintentando CPU:',gpuError);
        opts.baseOptions.delegate='CPU';
        faceLandmarker=await FaceLandmarker.createFromOptions(vision,opts);
      }
      return;
    }catch(error){
      lastError=error;
      console.warn('Error cargando MediaPipe desde '+base,error);
    }
  }
  console.error('No se pudo cargar MediaPipe desde ninguno de los CDN.',lastError);
  throw new Error('No se pudo cargar el seguimiento facial. Verifica tu conexión y vuelve a intentar.');
}
async function activate(){
  if(loading)return;loading=true;startBtn.disabled=true;
  setLoading('Pidiendo permiso para la cámara…');
  try{
    await startCamera();await loadModel();
    startup.classList.add('hidden');$('fallback').classList.add('hidden');
    captureBtn.disabled=false;flipBtn.disabled=false;setLoading('');setStatus('Buscando rostro…');
  }catch(error){console.error(error);setLoading(error.message||'No se pudo iniciar. Verifica conexión y permisos.');showToast('No se pudo activar la experiencia');stopCamera();}
  finally{loading=false;startBtn.disabled=false;}
}
async function flipCamera(){
  if(loading)return;loading=true;flipBtn.disabled=true;captureBtn.disabled=true;
  facingMode=facingMode==='user'?'environment':'user';
  try{await startCamera();showToast(facingMode==='user'?'Cámara frontal':'Cámara posterior');}
  catch(error){showToast(error.message||'No se pudo cambiar de cámara');facingMode=facingMode==='user'?'environment':'user';try{await startCamera();}catch{startup.classList.remove('hidden');}}
  finally{loading=false;captureBtn.disabled=!showCamera;flipBtn.disabled=!showCamera;}
}
function blobAsFile(blob){return new File([blob],`team-elegantisimos-${Date.now()}.png`,{type:'image/png'});}
function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function openDialog(name){$(`${name}Dialog`).classList.remove('hidden');}
function closeDialog(name){$(`${name}Dialog`).classList.add('hidden');}
function setPhoto(blob){
  if(photoUrl)URL.revokeObjectURL(photoUrl);
  photoBlob=blob;photoUrl=URL.createObjectURL(blob);
  $('photoPreview').src=photoUrl;
  $('saveBtn').textContent=ios?'Guardar / Ver imagen ↗':'Descargar foto ↓';
  $('photoHelp').textContent=ios?'En iPhone, usa «Compartir → Guardar imagen» cuando aparezca esa opción. También puedes mantener pulsada la foto y seleccionar «Guardar en Fotos».':'La foto se descargará en tu dispositivo. También puedes usar Compartir.';
  openDialog('photo');
}
function capture(){
  if(!showCamera)return;
  // Snapshot del canvas SIN logos de interfaz; el logo oficial se estampa solo en la foto.
  const snapshot=document.createElement('canvas');
  snapshot.width=canvas.width;snapshot.height=canvas.height;
  const photoCtx=snapshot.getContext('2d',{alpha:false});
  if(!photoCtx){showToast('No se pudo preparar la foto');return;}
  photoCtx.drawImage(canvas,0,0);
  photoCtx.setTransform(canvas.width/stage.clientWidth,0,0,canvas.height/stage.clientHeight,0,0);
  drawPhotoBrand(photoCtx,stage.clientWidth,stage.clientHeight,logo);
  flash.classList.remove('active');void flash.offsetWidth;flash.classList.add('active');
  snapshot.toBlob(async blob=>{
    if(!blob){showToast('No se pudo guardar la captura');return;}
    setPhoto(blob);
    try{await savePhoto(blob);}catch(error){console.warn('Galería local no disponible:',error);showToast('Guarda la foto en tu dispositivo; la galería local no está disponible.');}
  },'image/png');
}
async function shareBlob(blob){
  if(!blob)return;
  const file=blobAsFile(blob);
  try{
    if(navigator.canShare?.({files:[file]})){
      await navigator.share({files:[file],title:'Mi foto · Team Elegantísimos'});return;
    }
  }catch(error){if(error.name==='AbortError')return;console.warn('Compartir:',error);}
  if(ios){showToast('Mantén pulsada la foto y elige «Guardar en Fotos».');return;}
  downloadBlob(blob,file.name);showToast('Foto descargada');
}
async function saveCurrent(){
  if(!photoBlob)return;
  if(ios && navigator.canShare?.({files:[blobAsFile(photoBlob)]})){await shareBlob(photoBlob);return;}
  if(ios){$('photoPreview').scrollIntoView({behavior:'smooth',block:'center'});showToast('Mantén pulsada la imagen y toca «Guardar en Fotos».');return;}
  downloadBlob(photoBlob,`team-elegantisimos-${Date.now()}.png`);showToast('Foto descargada');
}
let galleryObjectUrls=[];
async function showGallery(){
  const grid=$('galleryGrid');grid.replaceChildren();
  galleryObjectUrls.forEach(URL.revokeObjectURL);galleryObjectUrls=[];
  try{
    const rows=await listPhotos();
    if(!rows.length){grid.innerHTML='<p class="empty-gallery">Todavía no tienes fotos. ¡Sonríe y toma la primera!</p>';}
    for(const row of rows){
      const thumb=document.createElement('button');thumb.className='gallery-item';thumb.type='button';
      const img=document.createElement('img');img.className='gallery-thumb';img.alt='Ver foto de Team Elegantísimos';
      const objectUrl=URL.createObjectURL(row.blob);galleryObjectUrls.push(objectUrl);img.src=objectUrl;
      const date=document.createElement('span');date.className='gallery-date';date.textContent=new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(row.createdAt);
      thumb.append(img,date);thumb.addEventListener('click',()=>{closeDialog('gallery');setPhoto(row.blob);});grid.appendChild(thumb);
    }
  }catch(error){console.warn('No se pudo abrir galería:',error);grid.innerHTML='<p class="empty-gallery">Galería local no disponible en este navegador.</p>';}
  openDialog('gallery');
}
async function copyLink(){
  const link=location.href.replace(/[?#].*$/,'');
  try{await navigator.clipboard.writeText(link);showToast('Enlace copiado. Ábrelo en Safari.');}
  catch{showToast('Copia esta dirección desde la barra del navegador.');}
}
function setup(){
  resize();window.addEventListener('resize',resize);
  if(window.visualViewport)window.visualViewport.addEventListener('resize',resize);
  startBtn.addEventListener('click',activate);
  const setEffectLabel=()=>{
    const item=EFFECTS[effectIndex];
    $('effectName').textContent=`${effectIndex+1} / ${EFFECTS.length} · ${item.name}`;
    effectBtn.setAttribute('aria-label','Cambiar efecto, actual: '+item.name);
    effectBtn.setAttribute('title','Siguiente efecto: '+EFFECTS[nextEffectIndex(effectIndex)].name);
  };
  setEffectLabel();
  effectBtn.addEventListener('click',()=>{
    effectIndex=nextEffectIndex(effectIndex);
    effectChangedAt=performance.now();
    setEffectLabel();
    showToast('Efecto '+(effectIndex+1)+' de '+EFFECTS.length+': '+EFFECTS[effectIndex].name);
  });
  flipBtn.addEventListener('click',flipCamera);
  captureBtn.addEventListener('click',capture);
  $('galleryBtn').addEventListener('click',showGallery);
  $('saveBtn').addEventListener('click',saveCurrent);
  $('shareBtn').addEventListener('click',()=>shareBlob(photoBlob));
  $('safariHelpBtn').addEventListener('click',()=>openDialog('safari'));
  $('copyLinkBtn').addEventListener('click',copyLink);
  document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>closeDialog(el.dataset.close)));
  window.addEventListener('pagehide',stopCamera);
  raf=requestAnimationFrame(render);
}
setup();

import {clamp, getCoverGeometry, drawFrame, drawPhotoBrand} from './renderer.js';
import {INSTRUCTORS,createShoulderTracker,drawCompanion,createHandLayer} from './companion.js?v=20261123-wrist-v4';
import {listPhotos, savePhoto} from './gallery.js';
import {createFaceTracker} from './faces.js';
import {LOGOS,drawLogoEffect} from './logo-effects.js';
import {maskHasForeground,drawMaskedUser} from './occlusion.js';

const $=id=>document.getElementById(id);
const video=$('sourceVideo'), canvas=$('cameraCanvas'), ctx=canvas.getContext('2d',{alpha:false});
const stage=$('stage'), startup=$('startup'), startBtn=$('startBtn'), status=$('trackingStatus'), hint=$('hint');
const captureBtn=$('captureBtn'), flipBtn=$('flipBtn'), effectBtn=$('effectBtn'), flash=$('flash'), logo=new Image();
logo.src='./assets/team-logo.png';
const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
let poseLandmarker=null,stream=null,facingMode='user',lastVideoTime=-1;
let faceLandmarker=null,effectMode='hug',logoIndex=0,switching=false;
const faceTracker=createFaceTracker(3);
const logoImages=LOGOS.map(item=>{const image=new Image();image.src=item.src;return image;});
const shoulderTracker=createShoulderTracker();
const instructorImages=INSTRUCTORS.map(item=>{const image=new Image();image.src=item.src;return image;});
const handLayers=[];
let instructorIndex=0,side=1,maskReady=false;
const maskCanvas=document.createElement('canvas'),maskCtx=maskCanvas.getContext('2d');
const maskGpuCanvas=document.createElement('canvas');maskGpuCanvas.width=256;maskGpuCanvas.height=256;
let maskDrawing=null;
const userCanvas=document.createElement('canvas');
let latestGeometry=null, photoBlob=null,photoUrl=null,loading=false,raf=null,showCamera=false;
let toastHandle=null,lastScan=0;
const TRACK_INTERVAL_MS=115;
const MEDIA_VERSION='0.10.35';
const MEDIA_CDNS=[
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIA_VERSION}`,
  `https://unpkg.com/@mediapipe/tasks-vision@${MEDIA_VERSION}`
];
const MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

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
  shoulderTracker.reset();faceTracker.reset();maskReady=false;
  const {w,h,r}=getResolution();canvas.width=Math.floor(w*r);canvas.height=Math.floor(h*r);
  ctx.setTransform(r,0,0,r,0,0);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
}
function paintBackground(W,H){
  const grad=ctx.createRadialGradient(W/2,H*.38,40,W/2,H*.38,H*.95);
  grad.addColorStop(0,'#643c7c');grad.addColorStop(.46,'#2a143f');grad.addColorStop(1,'#080310');
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
}
function drawVideo(W,H,target=ctx){
  const geometry=getCoverGeometry(video.videoWidth,video.videoHeight,W,H,facingMode==='user');
  target.save();
  if(geometry.mirror){target.translate(W,0);target.scale(-1,1);}
  target.drawImage(video,geometry.offsetX,geometry.offsetY,geometry.drawWidth,geometry.drawHeight);
  target.restore();
  return geometry;
}
function render(now){
  const W=stage.clientWidth,H=stage.clientHeight;
  if(showCamera && video.readyState>=2 && video.videoWidth>0 && video.videoHeight>0){
    latestGeometry=drawVideo(W,H);
    if(!switching&&effectMode!=='hug'&&faceLandmarker&&now-lastScan>TRACK_INTERVAL_MS&&video.currentTime!==lastVideoTime){
      lastScan=now;lastVideoTime=video.currentTime;
      try{faceTracker.update(faceLandmarker.detectForVideo(video,now),now);}
      catch(error){console.warn('Face tracking:',error);faceTracker.reset();}
    }
    if(!switching&&effectMode==='hug'&&poseLandmarker && now-lastScan>TRACK_INTERVAL_MS && video.currentTime!==lastVideoTime){
      lastScan=now;lastVideoTime=video.currentTime;
      try{
        // Render the mask directly in its shared GPU context. Reading float masks
        // back on this driver returns zeros even though the texture is valid.
        poseLandmarker.detectForVideo(video,now,result=>{
          shoulderTracker.update(result.landmarks?.[0],latestGeometry,now);
          maskReady=false;
          const mask=result.segmentationMasks?.[0];
          if(mask&&maskDrawing){
            maskDrawing.drawConfidenceMask(mask,[0,0,0,0],[255,255,255,255]);
            if(maskCanvas.width!==256||maskCanvas.height!==256){maskCanvas.width=256;maskCanvas.height=256;}
            maskCtx.clearRect(0,0,256,256);maskCtx.drawImage(maskGpuCanvas,0,0,256,256);
            maskReady=maskHasForeground(maskCtx.getImageData(0,0,256,256).data);
          }
        });
      }catch(error){
        console.warn('Tracking:',error);stopCamera();
        startup.classList.remove('hidden');
        setLoading('El seguimiento no pudo continuar. Actualiza el navegador y vuelve a activar la cámara.');
      }
    }
    if(!switching&&effectMode==='hug'&&latestGeometry){
      const anchor=shoulderTracker.get(now),image=instructorImages[instructorIndex],item=INSTRUCTORS[instructorIndex];
      const ready=anchor&&maskReady&&image.complete&&image.naturalWidth;
      captureBtn.disabled=!ready;
      setStatus(ready?'Abrazo listo · mira a la cámara':!image.naturalWidth?'Preparando instructor…':'Aléjate un poco: muestra ambos hombros');
      if(ready){
        drawCompanion(ctx,image,anchor,item.calibration,side);
        drawMaskedUser(ctx,video,latestGeometry,maskCanvas,userCanvas,W,H,canvas.width/W);
        drawCompanion(ctx,image,anchor,item.calibration,side,true,handLayers[instructorIndex]);
      }
    }
    if(!switching&&effectMode!=='hug'&&latestGeometry){
      const faces=faceTracker.getFaces(now),smiling=faces.filter(face=>face.smiling);
      for(const face of smiling)drawLogoEffect(ctx,face.landmarks,latestGeometry,logoImages[logoIndex],LOGOS[logoIndex],effectMode,now,face.smileAt);
      captureBtn.disabled=!smiling.length||!logoImages[logoIndex].naturalWidth;
      setStatus(!faces.length?'Coloca tu rostro en el encuadre':smiling.length?'¡Sonrisa detectada! · Efecto activo':'Sonríe para activar '+(effectMode==='crown'?'la corona':'los lentes'));
    }
    if(switching){captureBtn.disabled=true;setStatus('Preparando efecto…');}
  }else{paintBackground(W,H);latestGeometry=null;}
  drawFrame(ctx,W,H);
  const tracked=shoulderTracker.get(now);
  const needsSpace=tracked&&(side===1?tracked.x>W*.43:tracked.x<W*.57);
  const hintMessage=effectMode!=='hug'?'Sonríe y mantén la pose para tomar tu foto':needsSpace?'Colócate a la '+(side===1?'izquierda':'derecha')+' para dejar espacio al instructor':tracked?'Mira a la cámara y toma tu foto':'Encuadra tu cabeza y ambos hombros';
  if(hint.textContent!==hintMessage)hint.textContent=hintMessage;
  raf=requestAnimationFrame(render);
}
function stopCamera(){
  if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
  video.pause();video.srcObject=null;showCamera=false;maskReady=false;shoulderTracker.reset();faceTracker.reset();captureBtn.disabled=true;
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
  lastVideoTime=-1;lastScan=0;shoulderTracker.reset();showCamera=true;
  setStatus('Buscando hombros…');
}
async function loadModel(mode=effectMode){
  if(mode==='hug'?poseLandmarker:faceLandmarker)return;
  let lastError=null;
  for(const base of MEDIA_CDNS){
    try{
      setLoading(mode==='hug'?'Preparando seguimiento de hombros…':'Preparando detección de sonrisa…');
      // Importar el bundle ESM real: /+esm fallaba en la versión antigua inexistente.
      const {PoseLandmarker,FaceLandmarker,FilesetResolver,DrawingUtils}=await import(`${base}/vision_bundle.mjs`);
      const vision=await FilesetResolver.forVisionTasks(`${base}/wasm`);
      if(mode!=='hug'){
        const opts={baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numFaces:3,outputFaceBlendshapes:true,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5};
        try{faceLandmarker=await FaceLandmarker.createFromOptions(vision,opts);}
        catch{opts.baseOptions.delegate='CPU';faceLandmarker=await FaceLandmarker.createFromOptions(vision,opts);}
        return;
      }
      const opts={
        canvas:maskGpuCanvas,
        baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},
        runningMode:'VIDEO',numPoses:1,outputSegmentationMasks:true,
        minPoseDetectionConfidence:.6,minPosePresenceConfidence:.6,minTrackingConfidence:.6
      };
      // Float segmentation masks fail on the tested CPU path. Require GPU instead
      // of offering a fallback that starts but cannot produce the embrace.
      poseLandmarker=await PoseLandmarker.createFromOptions(vision,opts);
      maskDrawing=new DrawingUtils(maskGpuCanvas.getContext('webgl2'));
      return;
    }catch(error){
      lastError=error;
      console.warn('Error cargando MediaPipe desde '+base,error);
    }
  }
  console.error('No se pudo cargar MediaPipe desde ninguno de los CDN.',lastError);
  throw new Error('No se pudo cargar el seguimiento corporal. Usa Safari o Chrome actualizado con aceleración gráfica y verifica tu conexión.');
}
async function activate(){
  if(loading)return;loading=true;startBtn.disabled=true;
  setLoading('Pidiendo permiso para la cámara…');
  try{
    await Promise.all([...instructorImages,...logoImages].map(image=>image.decode()));
    instructorImages.forEach((image,index)=>{handLayers[index]??=createHandLayer(image,INSTRUCTORS[index].calibration);});
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
  if(!showCamera||captureBtn.disabled)return;
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
    if(!rows.length){grid.innerHTML='<p class="empty-gallery">Todavía no tienes fotos. ¡Elige instructor y toma la primera!</p>';}
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
    $('effectName').textContent=effectMode==='hug'?INSTRUCTORS[instructorIndex].name+' · Abrazo':(effectMode==='crown'?'Corona':'Lentes')+' · '+LOGOS[logoIndex].name;
    $('instructorPicker').hidden=effectMode!=='hug';
    $('logoPicker').hidden=effectMode==='hug';
    effectBtn.disabled=effectMode!=='hug';
    document.querySelectorAll('[data-mode]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.mode===effectMode));button.disabled=switching;});
    $('logoSelect').value=String(logoIndex);
    document.querySelectorAll('[data-instructor]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.instructor)===instructorIndex)));
  };
  setEffectLabel();
  document.querySelectorAll('[data-instructor]').forEach(button=>button.addEventListener('click',()=>{instructorIndex=Number(button.dataset.instructor);setEffectLabel();}));
  $('logoSelect').addEventListener('change',event=>{logoIndex=Number(event.target.value);setEffectLabel();});
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',async()=>{
    if(switching||loading||button.dataset.mode===effectMode)return;
    switching=true;captureBtn.disabled=true;setEffectLabel();
    try{
      if(showCamera)await loadModel(button.dataset.mode);
      effectMode=button.dataset.mode;faceTracker.reset();shoulderTracker.reset();maskReady=false;lastScan=0;lastVideoTime=-1;
    }catch(error){showToast(error.message||'No se pudo cargar el efecto');}
    finally{switching=false;setEffectLabel();setLoading('');}
  }));
  effectBtn.addEventListener('click',()=>{side*=-1;showToast('Instructor a tu '+(side===1?'derecha':'izquierda'));});
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

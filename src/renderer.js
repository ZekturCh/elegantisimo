/** Pure geometry and canvas illustration helpers. No user images leave the browser. */
export const PALETTE = Object.freeze({
  violet: '#bd94dc', violetDeep: '#281031', magenta: '#f45ffa', lime: '#d2ff39', cyan: '#17eff4', white: '#ffffff'
});
export const clamp = (number, lower, upper) => Math.max(lower, Math.min(upper, number));
export function getCoverGeometry(videoWidth, videoHeight, canvasWidth, canvasHeight, mirror = false) {
  const scale = Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;
  return {scale, drawWidth, drawHeight, offsetX: (canvasWidth - drawWidth) / 2, offsetY: (canvasHeight - drawHeight) / 2, mirror, canvasWidth};
}
export function projectLandmark(landmark, geometry) {
  let x = geometry.offsetX + landmark.x * geometry.drawWidth;
  if (geometry.mirror) x = geometry.canvasWidth - x;
  return {x, y: geometry.offsetY + landmark.y * geometry.drawHeight};
}
export function smileScore(categories) {
  if (!Array.isArray(categories)) return 0;
  const value = name => categories.find(c => c.categoryName === name)?.score ?? 0;
  return (value('mouthSmileLeft') + value('mouthSmileRight')) / 2;
}
export function makeSmileGate(on = .46, off = .29, minHoldMs = 170) {
  let active = false;
  let candidateSince = null;
  return {
    update(score, timestamp) {
      if (active) {
        if (score < off) { active = false; candidateSince = null; }
        return active;
      }
      if (score >= on) {
        if (candidateSince === null) candidateSince = timestamp;
        if (timestamp - candidateSince >= minHoldMs) active = true;
      } else candidateSince = null;
      return active;
    },
    reset() { active = false; candidateSince = null; },
    get active() { return active; }
  };
}
function softMist(ctx,x,y,r,opacity,color='#dab2f2') {
  if(r<=0||opacity<=0)return;
  const grad=ctx.createRadialGradient(x,y,0,x,y,r);
  grad.addColorStop(0,color);grad.addColorStop(.42,'#bc8de177');grad.addColorStop(1,'#bc8de100');
  ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
}

export const EFFECTS = Object.freeze([
  Object.freeze({id:'emblema',name:'Emblema lila'}),
  Object.freeze({id:'neblina',name:'Neblina elegante'}),
  Object.freeze({id:'tricolor',name:'Elegancia tricolor'})
]);
export const nextEffectIndex = index => (index + 1) % EFFECTS.length;

/** Apenas curvas y gradientes de Canvas: sin videos, imágenes ni motor 3D adicional. */
export function drawFrame(ctx,W,H) {
  const s=Math.min(W/390,H/680);
  ctx.save();
  const shade=ctx.createLinearGradient(0,0,0,H);
  shade.addColorStop(0,'#17091fa1');shade.addColorStop(.15,'#13071c00');
  shade.addColorStop(.72,'#13071c00');shade.addColorStop(1,'#190c27b6');
  ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  ctx.lineCap='round';
  for(const [sx,sy,flipX,flipY] of [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]]) {
    ctx.save();ctx.translate(sx,sy);ctx.scale(flipX,flipY);
    const grad=ctx.createLinearGradient(0,0,140*s,160*s);
    grad.addColorStop(0,'#e9cbf7ad');grad.addColorStop(.5,'#b48ad684');grad.addColorStop(1,'#a477e400');
    ctx.strokeStyle=grad;ctx.lineWidth=4.5*s;ctx.beginPath();
    ctx.moveTo(0,117*s);ctx.bezierCurveTo(39*s,89*s,18*s,28*s,134*s,0);ctx.stroke();
    ctx.strokeStyle='#f0d2f55c';ctx.lineWidth=1.2*s;ctx.beginPath();
    ctx.moveTo(0,135*s);ctx.bezierCurveTo(45*s,102*s,36*s,32*s,151*s,0);ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Sello oficial SOLO en la foto exportada; no es parte de la previsualización. */
export function drawPhotoBrand(ctx,W,H,logo) {
  const s=Math.min(W/390,H/680);
  const logoWidth=Math.min(W*.49,196*s);
  const ratio=logo?.naturalWidth&&logo?.naturalHeight ? logo.naturalHeight/logo.naturalWidth : 362/1421;
  const logoHeight=logoWidth*ratio;
  const centerX=W/2;
  const y=H-38*s-logoHeight;
  const pad=18*s;
  ctx.save();
  const g=ctx.createRadialGradient(centerX,y+logoHeight/2,5,centerX,y+logoHeight/2,logoWidth*.85);
  g.addColorStop(0,'#190d2ac9');g.addColorStop(1,'#190d2a00');
  ctx.fillStyle=g;ctx.fillRect(centerX-logoWidth*.85,y-23*s,logoWidth*1.7,logoHeight+56*s);
  if(logo?.complete&&logo?.naturalWidth){
    ctx.shadowColor='#2a0f43';ctx.shadowBlur=10*s;
    ctx.drawImage(logo,centerX-logoWidth/2,y,logoWidth,logoHeight);
    ctx.shadowBlur=0;
  }else{
    ctx.fillStyle='#fff7ff';ctx.font='900 '+(16*s)+'px system-ui,Arial';
    ctx.textAlign='center';ctx.fillText('TEAM ELEGANTÍSIMOS',centerX,y+logoHeight*.65);
  }
  ctx.font='800 '+Math.max(9,9*s)+'px system-ui,Arial';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f4dafa';
  ctx.fillText('TENDENCIA Y ELEGANCIA',centerX,y-9*s,logoWidth+pad);
  ctx.restore();
}

function ribbon(ctx,w,offset=0,color='#e5b9f5'){
  ctx.beginPath();
  ctx.moveTo(-w*.46,offset+w*.08);
  ctx.bezierCurveTo(-w*.28,offset-w*.11,-w*.12,offset-w*.02,0,offset-w*.16);
  ctx.bezierCurveTo(w*.14,offset-w*.02,w*.28,offset-w*.11,w*.46,offset+w*.08);
  ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,w*.017);ctx.lineCap='round';ctx.stroke();
}
function floatingTitle(ctx,title,w,py=0,fontRatio=.11){
  const fontSize=clamp(w*fontRatio,10,29);
  const textW=w*.94,barH=Math.max(25,fontSize*1.55);
  ctx.save();
  ctx.fillStyle='#311242df';ctx.strokeStyle='#dcb0eabc';ctx.lineWidth=1.3;
  ctx.beginPath();ctx.roundRect(-w*.49,py-barH*.5,w*.98,barH,barH*.5);
  ctx.fill();ctx.stroke();
  ctx.font='900 '+fontSize+'px system-ui,Arial';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff7ff';
  ctx.shadowColor='#d3a4e5';ctx.shadowBlur=5;ctx.fillText(title,0,py,textW);
  ctx.restore();
}

/** Tres variantes realmente distintas; cada rostro dibuja la seleccionada. */
export function drawFaceEffect(ctx,landmarks,geometry,now=0,smileAt=now,mode=0) {
  if(!landmarks?.[10]||!landmarks?.[33]||!landmarks?.[263])return;
  const top=projectLandmark(landmarks[10],geometry);
  const le=projectLandmark(landmarks[33],geometry),re=projectLandmark(landmarks[263],geometry);
  const eyeDistance=Math.hypot(re.x-le.x,re.y-le.y);
  const width=clamp(eyeDistance*2.25,68,260);
  let angle=Math.atan2(re.y-le.y,re.x-le.x);
  if(Math.cos(angle)<0)angle+=angle>0?-Math.PI:Math.PI;
  const elapsed=Math.max(0,now-(smileAt??now));
  const appear=clamp(elapsed/230,.15,1);
  ctx.save();
  ctx.translate(top.x,top.y-eyeDistance*.42);
  ctx.rotate(angle);
  ctx.globalAlpha=appear;
  if(mode===0){
    // Emblema lila: caligrafía suspendida y dos cintas, NO corona de puntas.
    const grad=ctx.createLinearGradient(-width*.5,0,width*.5,0);
    grad.addColorStop(0,'#9259b9');grad.addColorStop(.5,'#fff0ff');grad.addColorStop(1,'#9259b9');
    ctx.shadowColor='#d3a8f4';ctx.shadowBlur=width*.09;
    ribbon(ctx,width,-width*.14,grad);
    ribbon(ctx,width*.81,width*.16,'#eabaf4aa');
    ctx.shadowBlur=0;
    floatingTitle(ctx,'ELEGANTÍSIMOS',width,0,.112);
    softMist(ctx,-width*.42,-width*.1,width*.25,.23);
    softMist(ctx,width*.42,-width*.1,width*.25,.23);
  }else if(mode===1){
    // Neblina: columnas de vapor radial a ambos lados, texto minimalista.
    const pulse=1+Math.sin(now/630)*.07;
    softMist(ctx,-width*.37,0,width*.52*pulse,.30);
    softMist(ctx,width*.33,-width*.1,width*.55*pulse,.31);
    softMist(ctx,0,-width*.22,width*.44*pulse,.17);
    ctx.strokeStyle='#eac6f1a6';ctx.lineWidth=Math.max(1.5,width*.012);
    ctx.beginPath();ctx.moveTo(-width*.46,width*.10);
    ctx.bezierCurveTo(-width*.28,-width*.28,width*.18,width*.05,width*.46,-width*.20);ctx.stroke();
    floatingTitle(ctx,'SOMOS ELEGANTÍSIMOS',width*1.05,width*.09,.079);
  }else{
    // Tres cintas con los colores que el Team indicó: fucsia, turquesa y verde.
    const colors=['#ed78b8','#58d4cf','#a1d98c'];
    for(let i=0;i<3;i++){
      const w=width*(.94-i*.13);
      const dy=(-.25+i*.105)*width;
      ctx.shadowColor=colors[i];ctx.shadowBlur=width*.045;
      ctx.lineWidth=Math.max(2,width*.025);ctx.strokeStyle=colors[i];
      ctx.beginPath();ctx.moveTo(-w*.5,dy+width*.035);
      ctx.bezierCurveTo(-w*.22,dy-width*.17,w*.21,dy+width*.075,w*.49,dy-width*.035);
      ctx.stroke();
    }
    ctx.shadowBlur=0;
    floatingTitle(ctx,'TEAM ELEGANTÍSIMOS',width,0,.092);
  }
  // Entrada suave común a los tres diseños.
  if(elapsed<500){
    const fade=1-elapsed/500;
    softMist(ctx,0,-width*.04,width*.54,fade*.13);
  }
  ctx.restore();
}

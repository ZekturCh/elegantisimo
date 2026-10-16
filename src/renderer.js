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
export function drawFrame(ctx,W,H,logo) {
  ctx.save();
  const s=Math.min(W/390,H/680);
  const shade=ctx.createLinearGradient(0,0,0,H);
  shade.addColorStop(0,'#160922b8');shade.addColorStop(.17,'#17072408');shade.addColorStop(.70,'#16082100');shade.addColorStop(1,'#160722c8');
  ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  // Curving, lilac fabric-like shapes replace the original neon straight edges.
  ctx.lineCap='round';
  for(const [sx,sy,flipX,flipY] of [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]]) {
    ctx.save();ctx.translate(sx,sy);ctx.scale(flipX,flipY);
    const grad=ctx.createLinearGradient(0,0,115*s,158*s);
    grad.addColorStop(0,'#dcb9ecb0');grad.addColorStop(.5,'#b683e36b');grad.addColorStop(1,'#a477e400');
    ctx.strokeStyle=grad;ctx.lineWidth=6*s;ctx.beginPath();
    ctx.moveTo(0,116*s);ctx.bezierCurveTo(38*s,98*s,17*s,25*s,132*s,0);ctx.stroke();
    ctx.strokeStyle='#f0d2f573';ctx.lineWidth=1.4*s;ctx.beginPath();
    ctx.moveTo(0,135*s);ctx.bezierCurveTo(55*s,103*s,38*s,32*s,151*s,0);ctx.stroke();
    ctx.restore();
  }
  // Subtle accents from the team's secondary fuchsia, turquoise and green palette.
  for(const [x,y,color] of [[W*.14,H*.23,'#e967b6'],[W*.9,H*.43,'#67d2cb'],[W*.1,H*.68,'#9cda88']]){
    softMist(ctx,x,y,13*s,.20,color);
  }
  const titleY=Math.max(48*s,H*.055);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#2b0b47';ctx.shadowBlur=11*s;
  ctx.fillStyle='#f9edff';ctx.font='800 '+(11*s)+'px system-ui,Arial';
  ctx.fillText('TEAM ELEGANTÍSIMOS',W/2,titleY,Math.max(200*s,W*.76));
  ctx.shadowBlur=0;
  // Reduce the official logo rather than replacing it with invented branding.
  const logoWidth=Math.min(W*.40,170*s),logoHeight=logoWidth*(362/1421);
  const logoY=H-Math.max(70*s,H*.098)-logoHeight;
  if(logo?.complete&&logo.naturalWidth){
    ctx.shadowColor='#a975caaa';ctx.shadowBlur=7*s;
    ctx.drawImage(logo,(W-logoWidth)/2,logoY,logoWidth,logoHeight);ctx.shadowBlur=0;
  }else{
    ctx.font='800 '+(14*s)+'px system-ui,Arial';ctx.fillStyle='#efdbff';
    ctx.fillText('ELEGANTÍSIMOS',W/2,logoY+logoHeight*.7);
  }
  ctx.font='700 '+(9*s)+'px system-ui,Arial';ctx.fillStyle='#ebd4ff';
  ctx.fillText('TENDENCIA Y ELEGANCIA',W/2,logoY-14*s);
  ctx.restore();
}
/** Procedural 2D crown and one-shot mist: no extra model, video or particle framework. */
export function drawCrown(ctx,landmarks,geometry,now=0,smileAt=0) {
  if(!landmarks?.[10]||!landmarks?.[33]||!landmarks?.[263])return;
  const top=projectLandmark(landmarks[10],geometry);
  const left=projectLandmark(landmarks[33],geometry),right=projectLandmark(landmarks[263],geometry);
  const eyeDistance=Math.hypot(right.x-left.x,right.y-left.y);
  const width=clamp(eyeDistance*1.74,68,275),h=width*.36;
  let angle=Math.atan2(right.y-left.y,right.x-left.x);
  if(Math.cos(angle)<0)angle+=angle>0?-Math.PI:Math.PI;
  const elapsed=Math.max(0,now-(smileAt??now));
  const appear=clamp(elapsed/220,.15,1);
  ctx.save();ctx.translate(top.x,top.y-width*.24);ctx.rotate(angle);ctx.globalAlpha=appear;
  if(elapsed<780){
    const fade=1-elapsed/780;
    for(const [dx,dy,scale] of [[-.42,-.03,.28],[.34,-.08,.31],[-.04,-.24,.29]]){
      softMist(ctx,width*dx*(1+elapsed/900),h*dy-width*.02,width*scale*(1+elapsed/400),fade*.24);
    }
  }
  ctx.shadowColor='#b87ddc';ctx.shadowBlur=width*.085;
  const fill=ctx.createLinearGradient(0,-h*.7,0,h*.25);
  fill.addColorStop(0,'#f8e4fc');fill.addColorStop(.55,'#bd8de4');fill.addColorStop(1,'#815bb0');
  ctx.fillStyle=fill;ctx.strokeStyle='#f4d9fc';ctx.lineWidth=Math.max(1.5,width*.011);ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(-width*.44,h*.13);ctx.lineTo(-width*.43,-h*.34);
  ctx.lineTo(-width*.23,-h*.06);ctx.lineTo(0,-h*.73);
  ctx.lineTo(width*.23,-h*.06);ctx.lineTo(width*.43,-h*.34);
  ctx.lineTo(width*.44,h*.13);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;ctx.fillStyle='#4a2364dd';
  ctx.beginPath();ctx.roundRect(-width*.46,-h*.04,width*.92,h*.29,h*.095);ctx.fill();
  ctx.strokeStyle='#dfb8f5';ctx.lineWidth=Math.max(1,width*.007);ctx.stroke();
  ctx.fillStyle='#fff7ff';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='900 '+Math.max(9,width*.104)+'px system-ui,Arial';
  ctx.fillText('ELEGANTÍSIMOS',0,h*.107,width*.88);
  ctx.restore();
}
